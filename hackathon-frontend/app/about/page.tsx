export const metadata = {
  title: "About & credits · AGOS",
  description: "Who built AGOS, where its data comes from, and the open-source tools it uses.",
};

type Credit = { name: string; href?: string; what: string; licence?: string };

const DATA: Credit[] = [
  {
    name: "Philippine Statistics Authority (PSA), 2020 Census of Population",
    href: "https://www.philatlas.com/visayas/r08/samar/catbalogan.html",
    what: "Population of all 57 barangays (106,440 people), compiled via PhilAtlas.",
  },
  {
    name: "PSA / NAMRIA barangay boundaries (PSGC Q4 2023)",
    href: "https://github.com/faeldon/philippines-json-maps",
    what: "Official barangay polygons on the map, prepared by faeldon/philippines-json-maps.",
    licence: "MIT",
  },
  {
    name: "OpenStreetMap contributors",
    href: "https://www.openstreetmap.org/copyright",
    what: "Base map tiles and barangay locations (via Nominatim).",
    licence: "ODbL",
  },
  {
    name: "Open-Meteo",
    href: "https://open-meteo.com/",
    what: "Monthly rainfall for Catbalogan and the live weather in the top bar.",
    licence: "CC BY 4.0",
  },
];

const CONTEXT: Credit[] = [
  { name: "Philippine Information Agency (PIA), July 8, 2026", what: "Report on the Catbalogan water rationing and class suspensions." },
  { name: "Daily Tribune, July 7, 2026", what: "Report on the turbid source and power outage." },
  { name: "Catbalogan Water District", what: "Water tariff used to price the value of reused and stored water." },
];

const SOFTWARE: Credit[] = [
  { name: "Next.js", href: "https://nextjs.org/", what: "Web app framework", licence: "MIT" },
  { name: "React", href: "https://react.dev/", what: "User interface", licence: "MIT" },
  { name: "Tailwind CSS", href: "https://tailwindcss.com/", what: "Styling", licence: "MIT" },
  { name: "Leaflet", href: "https://leafletjs.com/", what: "Interactive map", licence: "BSD-2-Clause" },
  { name: "React Leaflet", href: "https://react-leaflet.js.org/", what: "Leaflet for React", licence: "Hippocratic 2.1" },
  { name: "Manrope", href: "https://fonts.google.com/specimen/Manrope", what: "Typeface", licence: "OFL" },
  { name: "Laravel and Laravel Sanctum", href: "https://laravel.com/", what: "API and sign-in", licence: "MIT" },
  { name: "Pest", href: "https://pestphp.com/", what: "Automated tests", licence: "MIT" },
  { name: "PostgreSQL", href: "https://www.postgresql.org/", what: "Database", licence: "PostgreSQL" },
];

function CreditList({ items }: { items: Credit[] }) {
  return (
    <ul className="divide-y divide-black/5 rounded-2xl border border-black/10 bg-white">
      {items.map((c) => (
        <li key={c.name} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 py-3 text-sm">
          <div className="min-w-0">
            {c.href ? (
              <a href={c.href} target="_blank" rel="noopener noreferrer" className="font-bold text-brand hover:underline">
                {c.name}
              </a>
            ) : (
              <span className="font-bold">{c.name}</span>
            )}
            <p className="mt-0.5 text-[#5f6869]">{c.what}</p>
          </div>
          {c.licence && <span className="shrink-0 rounded-full bg-[#eaf7f8] px-2 py-0.5 text-[11px] font-bold text-[#137e88]">{c.licence}</span>}
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2.5 text-[11px] font-extrabold tracking-[0.16em] text-brand">{title}</h2>
      {children}
    </section>
  );
}

// Public: attribution required by the data and map licences, and by the hackathon rules.
export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <p className="text-[10px] font-extrabold tracking-[0.18em] text-brand">ABOUT AGOS</p>
      <h1 className="mt-1 text-3xl leading-tight font-extrabold tracking-[-0.035em]">About &amp; credits</h1>
      <p className="mt-2 text-[#5f6869]">
        AGOS, the Circular Water Network Planner, helps Catbalogan City see where shower, laundry and rain water can get a safe second use, and
        how long each barangay&apos;s stored water would last in an outage. Built by Team Eight Bit for the rSCENE 2026 Hackathon (Circular
        Economy in Water Resources).
      </p>

      <Section title="TEAM EIGHT BIT">
        <ul className="grid gap-2 sm:grid-cols-3">
          {["Mark Lawrence P. Lacdao", "Aldrin Rey N. Taberara", "Axyll Judd G. Picardal"].map((n) => (
            <li key={n} className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold">
              {n}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="REAL AND SIMULATED DATA">
        <div className="space-y-2 rounded-2xl border border-black/10 bg-white p-4 text-sm">
          <p>
            <strong>Real:</strong> barangay population, boundaries and locations, and rainfall.
          </p>
          <p>
            <strong>Simulated until a pilot:</strong> buildings, tanks, covered drums and the number of households reusing water. Barangay
            forms and a building survey replace them; every value on screen carries a Real, Assumed or Simulated tag.
          </p>
          <p>
            <strong>Assumed:</strong> about 90 L per person per day and how it splits between bathing, laundry, flushing and cleaning.
          </p>
        </div>
      </Section>

      <Section title="DATA SOURCES">
        <CreditList items={DATA} />
      </Section>

      <Section title="BACKGROUND REPORTS">
        <CreditList items={CONTEXT} />
      </Section>

      <Section title="OPEN-SOURCE SOFTWARE">
        <CreditList items={SOFTWARE} />
      </Section>

      <p className="mt-7 text-xs text-[#7d8789]">Hosted on Vercel (app) and Laravel Cloud (API). Map data © OpenStreetMap contributors.</p>
    </div>
  );
}
