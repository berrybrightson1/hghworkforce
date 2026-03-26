/**
 * Ghana commercial banks + common branches for payroll admin pickers.
 * Branches are suggestions; users can still type a branch not listed.
 */

export const GHANA_BANK_NAMES = [
  "GCB Bank PLC",
  "Ecobank Ghana PLC",
  "Absa Bank Ghana PLC",
  "Stanbic Bank Ghana",
  "Standard Chartered Bank Ghana Limited",
  "Fidelity Bank Ghana",
  "CalBank PLC",
  "Republic Bank Ghana",
  "Zenith Bank Ghana",
  "United Bank for Africa (Ghana) PLC",
  "Access Bank Ghana PLC",
  "Guaranty Trust Bank (Ghana) Limited",
  "Consolidated Bank Ghana Limited",
  "First National Bank Ghana",
  "Bank of Africa Ghana",
  "OmniBSIC Bank Ghana",
  "Prudential Bank Limited",
  "Agricultural Development Bank (ADB)",
  "Société Générale Ghana PLC",
  "ARB Apex Bank Limited",
  "Services Integrity Savings & Loans",
] as const;

export type GhanaBankName = (typeof GHANA_BANK_NAMES)[number];

/** Key matches GHANA_BANK_NAMES entries where possible; normalize lookup below. */
const BRANCHES: Record<string, string[]> = {
  "GCB Bank PLC": [
    "Accra — High Street",
    "Accra — Ridge",
    "Accra — Airport",
    "Accra — Tudu",
    "Accra — Osu",
    "Accra — Madina",
    "Tema — Main Harbour",
    "Tema — Community 1",
    "Kumasi — Central Market",
    "Kumasi — Adum",
    "Takoradi — Market Circle",
    "Tamale — Central",
    "Cape Coast — Kotokuraba",
    "Sunyani",
    "Ho — Civic Centre",
    "Koforidua — Central",
    "East Legon",
    "Spintex Road",
    "North Industrial Area — Accra",
  ],
  "Ecobank Ghana PLC": [
    "Accra — Liberation Road",
    "Accra — Ridge",
    "Tema",
    "Kumasi — Ahodwo",
    "Takoradi",
    "Tamale",
    "Burma Camp",
    "Osu Oxford Street",
    "West Hills Mall",
    "Achimota",
    "Dansoman",
    "Nungua",
    "Tema Community 2",
  ],
  "Absa Bank Ghana PLC": [
    "Accra — Main",
    "Accra — Ring Road Central",
    "Tema",
    "Kumasi",
    "Takoradi",
    "Tamale",
    "East Legon",
    "Airport Residential",
    "Tudu",
    "Sunyani",
    "Cape Coast",
    "Koforidua",
  ],
  "Stanbic Bank Ghana": [
    "Accra — Stanbic Heights",
    "Accra — Airport City",
    "Tema",
    "Kumasi",
    "Takoradi",
    "Tamale",
    "Cantonments — Accra",
    "Osu",
    "Spintex",
  ],
  "Standard Chartered Bank Ghana Limited": [
    "Accra — Head Office",
    "Accra — Airport",
    "Tema",
    "Kumasi",
    "Takoradi",
    "Tamale",
    "West Ridge",
  ],
  "Fidelity Bank Ghana": [
    "Accra — Ridge Tower",
    "Accra — North Ridge",
    "Tema",
    "Kumasi — Adum",
    "Takoradi",
    "Tamale",
    "Osu",
    "Legon",
    "Weija",
  ],
  "CalBank PLC": [
    "Accra — Head Office",
    "Accra — North Industrial Area",
    "Tema",
    "Kumasi",
    "Takoradi",
    "Sunyani",
    "Koforidua",
    "Ho",
    "Achimota",
  ],
  "Republic Bank Ghana": [
    "Accra — Head Office",
    "Tema",
    "Kumasi — Asokwa",
    "Takoradi",
    "Tamale",
    "Cape Coast",
  ],
  "Zenith Bank Ghana": [
    "Accra — Independence Avenue",
    "Tema",
    "Kumasi",
    "Takoradi",
    "Tamale",
    "East Legon",
    "Spintex",
  ],
  "United Bank for Africa (Ghana) PLC": [
    "Accra — High Street",
    "Accra — Ring Road",
    "Tema",
    "Kumasi",
    "Takoradi",
    "Tamale",
    "Cantonments",
  ],
  "Access Bank Ghana PLC": [
    "Accra — Head Office",
    "Tema",
    "Kumasi",
    "Takoradi",
    "Tamale",
    "East Legon",
    "Labone",
  ],
  "Guaranty Trust Bank (Ghana) Limited": [
    "Accra — Oxford Street",
    "Accra — Airport",
    "Tema",
    "Kumasi — Adum",
    "Takoradi",
    "Sunyani",
    "Spintex",
  ],
  "Consolidated Bank Ghana Limited": [
    "Accra — Head Office",
    "Tema",
    "Kumasi — Central",
    "Takoradi",
    "Tamale",
    "Ho",
    "Cape Coast",
    "Koforidua",
    "Oxford Street — Osu",
  ],
  "First National Bank Ghana": [
    "Accra — Cantonments",
    "Tema",
    "Kumasi",
    "Takoradi",
  ],
  "Bank of Africa Ghana": [
    "Accra — Liberation Link",
    "Tema",
    "Kumasi",
    "Takoradi",
  ],
  "OmniBSIC Bank Ghana": [
    "Accra — North Ridge",
    "Kumasi",
    "Takoradi",
    "Tamale",
  ],
  "Prudential Bank Limited": [
    "Accra — Ring Road East",
    "Tema",
    "Kumasi",
    "Sunyani",
  ],
  "Agricultural Development Bank (ADB)": [
    "Accra — Ridge",
    "Tema",
    "Kumasi — Asafo",
    "Tamale",
    "Bolgatanga",
    "Wa",
  ],
  "Société Générale Ghana PLC": [
    "Accra — Head Office",
    "Tema",
    "Kumasi",
    "Takoradi",
  ],
  "ARB Apex Bank Limited": ["Accra — Head Office"],
  "Services Integrity Savings & Loans": ["Accra"],
};

const GENERIC_BRANCHES = [
  "Accra — Main",
  "Kumasi — Main",
  "Tema",
  "Takoradi",
  "Tamale",
  "Cape Coast",
  "Sunyani",
  "Ho",
  "Koforidua",
  "Bolgatanga",
  "Wa",
];

export function branchesForBank(bankName: string): string[] {
  const trimmed = bankName.trim();
  if (!trimmed) return [];
  const direct = BRANCHES[trimmed];
  if (direct?.length) return direct;
  const lower = trimmed.toLowerCase();
  const key = Object.keys(BRANCHES).find((k) => k.toLowerCase() === lower);
  if (key) return BRANCHES[key] ?? [];
  return GENERIC_BRANCHES;
}

export function filterOptions(options: string[], query: string, limit = 50): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return options.slice(0, limit);
  return options.filter((o) => o.toLowerCase().includes(q)).slice(0, limit);
}
