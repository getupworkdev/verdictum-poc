-- Verdictum POC schema.
-- Demo project built for Verdictum's proposal – sample data only.
--
-- Every tenant-owned row carries firm_id. RLS compares it with the firm of the
-- signed-in user, and composite foreign keys (child.parent_id, child.firm_id)
-- stop a row from pointing at another firm's parent even if firm_id is forged.

create extension if not exists vector;

-- Tenants -------------------------------------------------------------------

create table public.firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  firm_id uuid not null references public.firms (id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

create index users_firm_id_idx on public.users (firm_id);

-- Firm of the signed-in user. SECURITY DEFINER so policies on public.users do
-- not recurse into themselves.
create or replace function public.current_firm_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select firm_id from public.users where id = auth.uid()
$$;

-- Case data -----------------------------------------------------------------

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  title text not null,
  reference text not null,
  facts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, firm_id)
);

create index cases_firm_id_idx on public.cases (firm_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  case_id uuid not null,
  filename text not null,
  mime_type text not null,
  storage_path text,
  page_count int not null default 0,
  passage_count int not null default 0,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, firm_id),
  foreign key (case_id, firm_id) references public.cases (id, firm_id) on delete cascade
);

create index documents_case_id_idx on public.documents (case_id);

-- One row per paragraph. page/para are 1-based and are what citations point at.
create table public.passages (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  case_id uuid not null,
  document_id uuid not null,
  page int not null,
  para int not null,
  text text not null,
  tsv tsvector generated always as (to_tsvector('hungarian', text)) stored,
  embedding vector(384),
  unique (document_id, page, para),
  foreign key (case_id, firm_id) references public.cases (id, firm_id) on delete cascade,
  foreign key (document_id, firm_id) references public.documents (id, firm_id) on delete cascade
);

create index passages_case_id_idx on public.passages (case_id);
create index passages_tsv_idx on public.passages using gin (tsv);
create index passages_embedding_idx on public.passages using hnsw (embedding vector_cosine_ops);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  case_id uuid not null,
  question text not null,
  answer jsonb not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (case_id, firm_id) references public.cases (id, firm_id) on delete cascade
);

create index analyses_case_id_idx on public.analyses (case_id);

create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  case_id uuid not null,
  template_key text not null,
  version int not null,
  title text not null,
  content text not null,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (case_id, template_key, version),
  foreign key (case_id, firm_id) references public.cases (id, firm_id) on delete cascade
);

-- Row level security ----------------------------------------------------------

alter table public.firms enable row level security;
alter table public.users enable row level security;
alter table public.cases enable row level security;
alter table public.documents enable row level security;
alter table public.passages enable row level security;
alter table public.analyses enable row level security;
alter table public.drafts enable row level security;

create policy firms_own on public.firms
  for select to authenticated
  using (id = public.current_firm_id());

create policy users_same_firm on public.users
  for select to authenticated
  using (firm_id = public.current_firm_id());

create policy cases_own_firm on public.cases
  for all to authenticated
  using (firm_id = public.current_firm_id())
  with check (firm_id = public.current_firm_id());

create policy documents_own_firm on public.documents
  for all to authenticated
  using (firm_id = public.current_firm_id())
  with check (firm_id = public.current_firm_id());

create policy passages_own_firm on public.passages
  for all to authenticated
  using (firm_id = public.current_firm_id())
  with check (firm_id = public.current_firm_id());

create policy analyses_own_firm on public.analyses
  for all to authenticated
  using (firm_id = public.current_firm_id())
  with check (firm_id = public.current_firm_id());

-- Drafts are versioned: insert new versions, never edit old ones.
create policy drafts_read_own_firm on public.drafts
  for select to authenticated
  using (firm_id = public.current_firm_id());

create policy drafts_insert_own_firm on public.drafts
  for insert to authenticated
  with check (firm_id = public.current_firm_id());

-- Hybrid search -------------------------------------------------------------
-- Full-text (Hungarian stemming) and vector similarity, fused with reciprocal
-- rank fusion. SECURITY INVOKER: RLS still applies, and every branch is
-- filtered by case_id as well.

create or replace function public.search_passages(
  p_case_id uuid,
  p_query text,
  p_embedding vector(384) default null,
  p_limit int default 8
)
returns table (
  id uuid,
  document_id uuid,
  filename text,
  page int,
  para int,
  text text,
  fts_rank real,
  vector_similarity real,
  score double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  with q as (
    -- Any matching term counts (OR); ranking rewards passages that match more.
    select nullif(replace(websearch_to_tsquery('hungarian', p_query)::text, ' & ', ' | '), '')::tsquery as tsq
  ),
  fts as (
    select p.id,
           ts_rank_cd(p.tsv, q.tsq) as rank,
           row_number() over (order by ts_rank_cd(p.tsv, q.tsq) desc) as r
    from public.passages p, q
    where p.case_id = p_case_id
      and q.tsq is not null
      and p.tsv @@ q.tsq
    order by rank desc
    limit 50
  ),
  vec as (
    select p.id,
           1 - (p.embedding <=> p_embedding) as sim,
           row_number() over (order by p.embedding <=> p_embedding) as r
    from public.passages p
    where p.case_id = p_case_id
      and p_embedding is not null
      and p.embedding is not null
    order by p.embedding <=> p_embedding
    limit 50
  ),
  fused as (
    select coalesce(f.id, v.id) as id,
           f.rank,
           v.sim,
           coalesce(1.0 / (60 + f.r), 0) + coalesce(1.0 / (60 + v.r), 0) as score
    from fts f
    full outer join vec v on v.id = f.id
  )
  select p.id, p.document_id, d.filename, p.page, p.para, p.text,
         fused.rank::real, fused.sim::real, fused.score::double precision
  from fused
  join public.passages p on p.id = fused.id
  join public.documents d on d.id = p.document_id
  where p.case_id = p_case_id
  order by fused.score desc, p.page, p.para
  limit greatest(1, least(p_limit, 20))
$$;

-- Cost reporting ------------------------------------------------------------

create view public.case_costs with (security_invoker = true) as
  select case_id,
         firm_id,
         count(*)::int as analyses,
         sum(input_tokens)::bigint as input_tokens,
         sum(output_tokens)::bigint as output_tokens,
         sum(cost_usd)::numeric(12, 6) as cost_usd
  from public.analyses
  group by case_id, firm_id;

create view public.firm_costs with (security_invoker = true) as
  select firm_id,
         count(*)::int as analyses,
         sum(input_tokens)::bigint as input_tokens,
         sum(output_tokens)::bigint as output_tokens,
         sum(cost_usd)::numeric(12, 6) as cost_usd
  from public.analyses
  group by firm_id;

-- Rate limiting -------------------------------------------------------------
-- Fixed windows per key (e.g. "ask:<ip>"). Only the server (service role)
-- may call it.

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;

create or replace function public.hit_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n int;
begin
  insert into public.rate_limits (key, window_start, hits)
  values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into n;

  delete from public.rate_limits where window_start < now() - interval '1 day';
  return n <= p_max;
end
$$;

revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;
