/**
 * Test method for each COA parameter.
 *
 * The method is a property of the PARAMETER, never of the customer or the
 * product — every physical parameter is tested on the same FSSAI basis whoever
 * the sheet is for. It therefore lives here as one lookup rather than being
 * duplicated onto each of the ~1000 values in `customer_tolerance`, where it
 * would only drift.
 *
 * Source: the METHOD column of the FINAL COA sheet
 * (`26)CFPLA.C5.F.26 Finished good chemical analysis 2026`, Sept 2026 revision).
 * The chemical methods are SOP codes in that revision; an older May export of
 * the same sheet had "Customer"/"FSSAI" there instead, and the SOP codes
 * supersede it.
 *
 * Why this exists at all: `customer_tolerance` stores every tolerance as a
 * plain string, not the `{tolerance, method}` object its schema allows, so
 * `extractTolerance` always yields an empty method and the COA's Method column
 * came out blank. This fills it.
 */

const SENSORY_METHOD = '(VISUAL & SENSORY BASIS)';
const PHYSICAL_METHOD = 'FSSAI (Physical Basis)';

/** Sensory parameters, all judged the same way. */
const SENSORY_PARAMS = [
  'Texture/Appearance',
  'Odour',
  'Taste & Flavour',
  'Colour',
];

/**
 * Physical parameters. All FSSAI (Physical Basis) except N2 %, which is
 * instrument-measured — see PHYSICAL_EXCEPTIONS below.
 *
 * 'Broken/Split %' is the legacy combined key: the current paper format splits
 * it into 'Broken %' and 'Split %', but existing customer_tolerance rows still
 * carry the combined one, so all three resolve.
 */
const PHYSICAL_PARAMS = [
  'Extraneous vegetable Matter(m/m)Stalks, Pieces of shells, pits, fiber, Peel',
  'Foreign matter',
  'Off flavour, mustiness, rancidity and evidence of fermentation',
  'Immature%',
  'Mould, living/ dead insects, insect fragments and rodent contamination',
  'Organic Extraneous Matter',
  'Inorganic Extraneous Matter',
  'Admixture / Added Additives',
  'Damaged/ Mechanical injury/Sunburn %',
  'Blemished %',
  'Infested/Insect Damage %',
  'Discoloured %',
  'Other Edible Seeds %',
  'Count (NOS)',
  'Moldy Fruits %',
  'Broken %',
  'Split %',
  'Broken/Split %',
  'Bulk Density (GM/L)',
  'Size',
  'Pits',
  'Dried%',
  'Loose Skin %',
  'Chipped & Scratches',
  'Scratched/Tonch nuts %',
  'Sugared Raisins (raisins with external or internal sugar crystals which are readily apparent and seriously affect the appearance of the raisins)',
  'Pieces of stem per kg',
  'Cap stem',
  'Inshell  Almonds,shell or skin fragments (m/m, percent)',
  'Gummy and Brown spot (m/m) %',
  'Doubles %',
  'Uniformity %',
  'Testa %',
  'Unopened shells',
  'Empty shells',
  'Split broken',
  'Dark stains',
  'Light stains',
  'Other edible grains',
  'Weevilled grains',
];

/** Physical parameters that are NOT tested on the FSSAI physical basis. */
const PHYSICAL_EXCEPTIONS: Record<string, string> = {
  'N2 %': 'Oximeter',
};

/** Chemical parameters, each with its own lab SOP. */
const CHEMICAL_METHODS: Record<string, string> = {
  'Moisture Content %': 'CFPLA.C5.SOP.L06',
  'Acid Value %': 'CFPLA.C5.SOP.L04',
  'Salt %': 'CFPLA.C5.SOP.L02',
  'FFA': 'CFPLA.C5.SOP.L04',
  'Peroxide Value (mg/kg)': 'CFPLA.C5.SOP.L05',
  'PH': 'PH METER',
  // Dropped from the current paper format but still present on older
  // customer_tolerance rows, so it still needs to resolve.
  'Fat/Oil Content %': 'FSSAI',
};

/**
 * Match the way `customer_tolerance` keys are actually written rather than how
 * they ought to be: they come from spreadsheet headers, so they carry stray
 * double spaces, a mojibake byte in the Inshell entry, and inconsistent case.
 * Folding everything to lowercase alphanumerics makes those variants agree.
 */
function normalise(label: string): string {
  return (label || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const METHOD_BY_PARAM: Record<string, string> = {};
for (const p of SENSORY_PARAMS) METHOD_BY_PARAM[normalise(p)] = SENSORY_METHOD;
for (const p of PHYSICAL_PARAMS) METHOD_BY_PARAM[normalise(p)] = PHYSICAL_METHOD;
for (const [p, m] of Object.entries(PHYSICAL_EXCEPTIONS)) METHOD_BY_PARAM[normalise(p)] = m;
for (const [p, m] of Object.entries(CHEMICAL_METHODS)) METHOD_BY_PARAM[normalise(p)] = m;

/**
 * The test method for a parameter, or "" when it is not one we know.
 *
 * Returns empty rather than guessing: a wrong method printed on a controlled
 * certificate is worse than a blank the analyst notices and fills in.
 */
export function methodFor(label: string): string {
  return METHOD_BY_PARAM[normalise(label)] ?? '';
}

export { SENSORY_METHOD, PHYSICAL_METHOD };
