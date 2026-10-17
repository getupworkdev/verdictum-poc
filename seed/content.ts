// Fictional sample data. Every company, person, address, bank account and case
// below is invented for this demo; any resemblance to real entities is
// coincidental.

export const DEMO_NOTICE = "Demo project built for Verdictum's proposal – sample data only";
export const DEMO_NOTICE_HU = 'KITALÁLT MINTADOKUMENTUM – bemutató célra, valós adatot nem tartalmaz.';

export type SeedDoc = {
  filename: string;
  kind: 'pdf' | 'docx';
  title: string;
  pages: string[][]; // pages -> paragraphs
};

export type SeedCase = {
  title: string;
  reference: string;
  facts: Record<string, string>;
  documents: SeedDoc[];
};

export type SeedFirm = {
  name: string;
  user: { email: string; fullName: string };
  cases: SeedCase[];
};

const supplyContract: SeedDoc = {
  filename: 'szallitasi-szerzodes-kitalalt.pdf',
  kind: 'pdf',
  title: 'Szállítási szerződés (kitalált)',
  pages: [
    [
      DEMO_NOTICE_HU,
      'SZÁLLÍTÁSI SZERZŐDÉS – SZ-2026/03',
      'amely létrejött egyrészről a Kitalált Építő Kft. (székhely: 1111 Budapest, Képzelet utca 1.; cégjegyzékszám: 00-00-000001; képviseli: Próbaképp Péter ügyvezető), mint Szállító, másrészről a Próba Kereskedelmi Bt. (székhely: 9999 Mintaváros, Teszt tér 2.; cégjegyzékszám: 00-00-000002; képviseli: Mintás Mária beltag), mint Vevő között az alább írt helyen és napon, a következő feltételekkel.',
      '1. A szerződés tárgya. A Szállító kötelezettséget vállal arra, hogy a Vevő részére 120 darab előregyártott betonelemet (típus: KÉ-40) szállít le a Vevő mintavárosi telephelyére. A termékek pontos műszaki jellemzőit a jelen szerződés 1. számú melléklete tartalmazza.',
      '2. A teljesítés határideje. A Szállító a termékeket legkésőbb 2026. július 15. napjáig köteles leszállítani. A teljesítés a szállítólevél Vevő általi aláírásával történik meg.',
      '3. A vételár. A felek a termékek vételárát összesen 4 850 000 Ft + ÁFA összegben határozzák meg, amely a szállítás és a lerakodás költségét is magában foglalja.',
      '4. Fizetési feltételek. A Vevő a vételárat a Szállító által a teljesítést követően kiállított számla kézhezvételétől számított 30 (harminc) napon belül köteles átutalással megfizetni a Szállító 00000000-11111111-22222222 számú bankszámlájára.',
    ],
    [
      '5. Késedelmes fizetés. Fizetési késedelem esetén a Vevő a Polgári Törvénykönyvről szóló 2013. évi V. törvény 6:155. §-a szerinti késedelmi kamatot köteles megfizetni. A szerződésben meghatározott fizetési határidő 15 napot meghaladó túllépése esetén a Szállító jogosult a további szállításokat felfüggeszteni.',
      '6. Minőségi kifogás. A Vevő a termékek átvételekor köteles azokat megvizsgálni, és az észlelt minőségi hibát az átvételtől számított 8 (nyolc) napon belül írásban közölni a Szállítóval. A határidőn túl közölt kifogás nem mentesít a vételár megfizetése alól, a jogszabályon alapuló szavatossági jogok érintetlenül hagyása mellett.',
      '7. Kötbér. Amennyiben a Szállító a 2. pontban meghatározott határidőt saját érdekkörében felmerült okból elmulasztja, minden késedelmes nap után a nettó vételár 0,5%-ának megfelelő késedelmi kötbért köteles fizetni, legfeljebb a nettó vételár 10%-áig.',
      '8. A szerződés megszüntetése. Bármelyik fél jogosult a szerződést azonnali hatállyal felmondani, ha a másik fél a szerződést súlyosan megszegi, és a szerződésszegést a felhívás kézhezvételétől számított 15 napon belül sem orvosolja. A szerződést csak írásban lehet módosítani.',
      '9. Vitarendezés. A felek a jelen szerződésből eredő vitáikat elsősorban tárgyalás útján rendezik. Ennek eredménytelensége esetén a hatáskörrel és illetékességgel rendelkező magyar bíróság jár el.',
      'Kelt: Budapest, 2026. március 2.',
      'Próbaképp Péter s.k. – Kitalált Építő Kft., Szállító          Mintás Mária s.k. – Próba Kereskedelmi Bt., Vevő',
    ],
  ],
};

const reminderLetter: SeedDoc = {
  filename: 'fizetesi-emlekezteto-kitalalt.docx',
  kind: 'docx',
  title: 'Fizetési emlékeztető (kitalált)',
  pages: [
    [
      DEMO_NOTICE_HU,
      'Kitalált Építő Kft. – 1111 Budapest, Képzelet utca 1.',
      'Címzett: Próba Kereskedelmi Bt., Mintás Mária beltag részére, 9999 Mintaváros, Teszt tér 2.',
      'Tárgy: Fizetési emlékeztető – KÉ-2026/118 számú számla',
      'Tisztelt Mintás Mária!',
      'Tájékoztatjuk, hogy a 2026. július 14-én teljesített szállítás alapján 2026. július 16-án kiállított, és Önök által 2026. július 16-án átvett KÉ-2026/118 számú számla 4 850 000 Ft + ÁFA összegű ellenértéke a szállítási szerződés 4. pontja szerint 2026. augusztus 15. napján esedékessé vált.',
      'Nyilvántartásunk szerint a számla kiegyenlítése a mai napig nem történt meg. Kérjük, hogy a tartozást 8 napon belül szíveskedjenek átutalni.',
      'Amennyiben időközben a fizetés megtörtént, kérjük, levelünket tekintsék tárgytalannak.',
      'Budapest, 2026. szeptember 1.',
      'Tisztelettel: Próbaképp Péter ügyvezető',
    ],
  ],
};

const replyLetter: SeedDoc = {
  filename: 'valaszlevel-kitalalt.docx',
  kind: 'docx',
  title: 'Válaszlevél a fizetési emlékeztetőre (kitalált)',
  pages: [
    [
      DEMO_NOTICE_HU,
      'Próba Kereskedelmi Bt. – 9999 Mintaváros, Teszt tér 2.',
      'Címzett: Kitalált Építő Kft., Próbaképp Péter ügyvezető részére',
      'Tárgy: Válasz a 2026. szeptember 1-jei fizetési emlékeztetőre',
      'Tisztelt Ügyvezető Úr!',
      'Levelükre hivatkozva jelezzük, hogy a leszállított 120 darab betonelemből 9 darabon hajszálrepedést észleltünk, ezért a teljes vételár megfizetését jelenleg nem tartjuk indokoltnak.',
      'A hibát munkatársunk 2026. augusztus 20-án fényképekkel dokumentálta. Javasoljuk, hogy a hibás elemek arányában a vételárat csökkentsük, vagy a hibás elemeket cseréljék ki.',
      'A nem kifogásolt elemek ellenértékének megfizetésére 2026. október 31-ig terjedő fizetési haladékot kérünk, tekintettel átmeneti likviditási nehézségeinkre.',
      'Mintaváros, 2026. szeptember 9.',
      'Üdvözlettel: Mintás Mária beltag',
    ],
  ],
};

const leaseContract: SeedDoc = {
  filename: 'irodaberleti-szerzodes-kitalalt.pdf',
  kind: 'pdf',
  title: 'Irodabérleti szerződés (kitalált)',
  pages: [
    [
      DEMO_NOTICE_HU,
      'IRODABÉRLETI SZERZŐDÉS – B-2025/22',
      'amely létrejött egyrészről a Képzeletbeli Ingatlan Zrt. (székhely: 2222 Kitaláltfalva, Álom körút 5.), mint Bérbeadó, másrészről a Tesztelő Zrt. (székhely: 3333 Példaváros, Minta utca 7.), mint Bérlő között.',
      '1. A bérlemény. A Bérbeadó bérbe adja, a Bérlő bérbe veszi a 2222 Kitaláltfalva, Álom körút 5. szám alatti irodaház 3. emeletén található, 240 négyzetméter alapterületű irodahelyiséget.',
      '2. A bérleti díj. A havi bérleti díj 1 200 000 Ft + ÁFA, amelyet a Bérlő minden hónap 10. napjáig előre köteles megfizetni.',
      '3. Értékállandóság. A bérleti díj minden év január 1-jén a KSH által közzétett előző évi fogyasztói árindex mértékével emelkedik.',
      '4. A szerződés időtartama. A felek a szerződést 2025. szeptember 1-jétől 2028. augusztus 31-ig terjedő határozott időre kötik.',
      '5. Módosítás. A szerződés kizárólag a felek által aláírt írásbeli okirattal módosítható.',
      'Kelt: Kitaláltfalva, 2025. augusztus 20.',
    ],
  ],
};

export const FIRMS: SeedFirm[] = [
  {
    name: 'Iroda A – Kitalált és Társa Ügyvédi Iroda',
    user: { email: 'anna@iroda-a.example.com', fullName: 'dr. Teszt Anna' },
    cases: [
      {
        title: 'Kitalált Építő Kft. kontra Próba Kereskedelmi Bt. – késedelmes fizetés',
        reference: 'A-2026/014',
        facts: {
          iroda_nev: 'Kitalált és Társa Ügyvédi Iroda',
          iroda_cim: '1111 Budapest, Képzelet utca 10.',
          ugyfel: 'Kitalált Építő Kft.',
          ugyfel_szekhely: '1111 Budapest, Képzelet utca 1.',
          ellenfel: 'Próba Kereskedelmi Bt.',
          ellenfel_szekhely: '9999 Mintaváros, Teszt tér 2.',
          szerzodes_cim: 'szállítási szerződés',
          szerzodes_szam: 'SZ-2026/03',
          szerzodes_datum: '2026. március 2.',
          szamla_szam: 'KÉ-2026/118',
          osszeg: '4 850 000 Ft + ÁFA',
          esedekesseg: '2026. augusztus 15.',
          fizetesi_hatarido: '8 napon belül',
          bankszamla: '00000000-11111111-22222222',
          modositas: 'a 4. pontban meghatározott fizetési határidő 2026. október 31. napjára módosul',
          hatalybalepes: '2026. október 1.',
          peldanyszam: '2 (kettő)',
          varos: 'Budapest',
          ugyved: 'dr. Teszt Anna',
        },
        documents: [supplyContract, reminderLetter, replyLetter],
      },
    ],
  },
  {
    name: 'Iroda B – Minta Ügyvédi Iroda',
    user: { email: 'bela@iroda-b.example.com', fullName: 'dr. Minta Béla' },
    cases: [
      {
        title: 'Tesztelő Zrt. – irodabérleti szerződés módosítása',
        reference: 'B-2026/007',
        facts: {
          iroda_nev: 'Minta Ügyvédi Iroda',
          iroda_cim: '3333 Példaváros, Minta utca 1.',
          ugyfel: 'Tesztelő Zrt.',
          ugyfel_szekhely: '3333 Példaváros, Minta utca 7.',
          ellenfel: 'Képzeletbeli Ingatlan Zrt.',
          ellenfel_szekhely: '2222 Kitaláltfalva, Álom körút 5.',
          szerzodes_cim: 'irodabérleti szerződés',
          szerzodes_szam: 'B-2025/22',
          szerzodes_datum: '2025. augusztus 20.',
          modositas:
            'a 2. pontban meghatározott havi bérleti díj 2027. január 1-jétől 1 260 000 Ft + ÁFA összegre módosul, és a 3. pont szerinti indexálás 2027-ben nem alkalmazandó',
          hatalybalepes: '2027. január 1.',
          peldanyszam: '3 (három)',
          varos: 'Példaváros',
          ugyved: 'dr. Minta Béla',
        },
        documents: [leaseContract],
      },
    ],
  },
];
