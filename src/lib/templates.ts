// Drafting templates. Placeholders look like {{key}} and are filled from the
// case's facts. Anything the case does not know stays visible as
// [[hiányzik: key]] so the lawyer cannot miss it.

export type CaseFacts = Record<string, string>;

export type Template = {
  key: string;
  title: string;
  description: string;
  body: string;
};

export const TEMPLATES: Template[] = [
  {
    key: 'fizetesi_felszolitas',
    title: 'Fizetési felszólítás',
    description: 'Ügyvédi felszólítás lejárt tartozás megfizetésére.',
    body: `{{iroda_nev}}
{{iroda_cim}}

Címzett: {{ellenfel}}
{{ellenfel_szekhely}}

Tárgy: Fizetési felszólítás – {{szamla_szam}} számú számla

Tisztelt Címzett!

Ügyfelünk, a(z) {{ugyfel}} ({{ugyfel_szekhely}}) megbízásából és képviseletében eljárva tájékoztatjuk, hogy a felek között {{szerzodes_datum}} napján létrejött, {{szerzodes_szam}} számú {{szerzodes_cim}} alapján kiállított {{szamla_szam}} számú számla {{osszeg}} összegű ellenértéke {{esedekesseg}} napján esedékessé vált, azonban az Önök részéről mindmáig nem került kiegyenlítésre.

Felszólítjuk, hogy a fenti tartozást, valamint annak a Polgári Törvénykönyv szerinti késedelmi kamatát a jelen levél kézhezvételétől számított {{fizetesi_hatarido}} ügyfelünk {{bankszamla}} számú bankszámlájára átutalással megfizetni szíveskedjenek.

Amennyiben a megadott határidőn belül a fizetés nem történik meg, ügyfelünk további értesítés nélkül megteszi a követelés érvényesítéséhez szükséges jogi lépéseket, amelynek költségei Önöket terhelik.

{{varos}}, {{datum}}

Tisztelettel:

{{ugyved}}
ügyvéd`,
  },
  {
    key: 'szerzodesmodositas',
    title: 'Szerződésmódosítás',
    description: 'Meglévő szerződés egy vagy több pontjának módosítása.',
    body: `SZERZŐDÉSMÓDOSÍTÁS

amely létrejött egyrészről a(z) {{ugyfel}} (székhely: {{ugyfel_szekhely}}), másrészről a(z) {{ellenfel}} (székhely: {{ellenfel_szekhely}}) között az alábbi feltételekkel.

1. A felek rögzítik, hogy közöttük {{szerzodes_datum}} napján {{szerzodes_szam}} számon {{szerzodes_cim}} jött létre (a továbbiakban: Szerződés).

2. A felek közös megegyezéssel a Szerződést akként módosítják, hogy {{modositas}}.

3. A jelen módosítás {{hatalybalepes}} napján lép hatályba.

4. A Szerződés jelen módosítással nem érintett rendelkezései változatlanul hatályban maradnak.

5. A jelen szerződésmódosítás {{peldanyszam}} egymással mindenben megegyező eredeti példányban készült, amelyet a felek elolvasás és értelmezés után mint akaratukkal mindenben egyezőt jóváhagyólag aláírtak.

{{varos}}, {{datum}}

…………………………………              …………………………………
{{ugyfel}}                                     {{ellenfel}}

Ellenjegyzem: {{ugyved}} ügyvéd, {{iroda_nev}}`,
  },
];

const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/g;

export function placeholders(body: string): string[] {
  return [...new Set([...body.matchAll(PLACEHOLDER)].map((m) => m[1]))];
}

export function fillTemplate(body: string, facts: CaseFacts): { text: string; missing: string[] } {
  const missing = new Set<string>();
  const text = body.replace(PLACEHOLDER, (_, key: string) => {
    const value = facts[key];
    if (value == null || String(value).trim() === '') {
      missing.add(key);
      return `[[hiányzik: ${key}]]`;
    }
    return String(value);
  });
  return { text, missing: [...missing] };
}

export function getTemplate(key: string): Template | undefined {
  return TEMPLATES.find((t) => t.key === key);
}

export function todayHu(date = new Date()): string {
  return new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}
