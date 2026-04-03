export interface Parameter {
  key: string;
  label: string;
}

export const SENSORY_PARAMS: Parameter[] = [
  { key: "appearance_texture", label: "Appearance / Texture" },
  { key: "taste", label: "Taste" },
  { key: "flavour", label: "Flavour" },
  { key: "odour", label: "Odour" },
  { key: "other", label: "Other" },
];

export const PHYSICAL_DATES_PARAMS: Parameter[] = [
  { key: "count", label: "Count" },
  { key: "infestation", label: "Infestation" },
  { key: "foreign_matter", label: "Foreign Matter" },
  { key: "damage", label: "Damage" },
  { key: "discolor", label: "Discolor" },
  { key: "dry", label: "Dry" },
  { key: "blemish", label: "Blemish" },
  { key: "sugar", label: "Sugar" },
  { key: "loose_skin", label: "Loose Skin" },
  { key: "rat_bite", label: "Rat Bite" },
  { key: "moldy_fruits", label: "Moldy Fruits" },
];

export const PHYSICAL_SEEDS_PARAMS: Parameter[] = [
  { key: "count", label: "Count" },
  { key: "infestation", label: "Infestation" },
  { key: "foreign_matter", label: "Foreign Matter" },
  { key: "discolor", label: "Discolor" },
  { key: "broken", label: "Broken" },
  { key: "split", label: "Split" },
  { key: "testa", label: "Testa" },
  { key: "tonch", label: "Tonch" },
  { key: "empty_shell", label: "Empty Shell" },
  { key: "kernel_pct", label: "Kernel %" },
  { key: "closed_shell", label: "Closed Shell" },
  { key: "cap_stem", label: "Cap Stem" },
  { key: "chipped_scratches", label: "Chipped / Scratches" },
  { key: "twins", label: "Twins" },
  { key: "doubles", label: "Doubles" },
  { key: "other", label: "Other" },
];

export const PHYSICAL_ALL_PARAMS: Parameter[] = [
  ...PHYSICAL_DATES_PARAMS,
  ...PHYSICAL_SEEDS_PARAMS.filter(
    (s) => !PHYSICAL_DATES_PARAMS.some((d) => d.key === s.key)
  ),
];

export const LABEL_CHECK_PARAMS: Parameter[] = [
  { key: "product_name", label: "Product Name" },
  { key: "net_weight", label: "Net Weight" },
  { key: "fssai_no", label: "FSSAI No." },
  { key: "storage_condition", label: "Storage Condition" },
  { key: "country_of_origin", label: "Country of Origin" },
  { key: "batch_no", label: "Batch No." },
  { key: "pkg_date", label: "Packaging Date" },
  { key: "exp_date", label: "Expiry Date" },
  { key: "packed_by_address", label: "Packed By Address" },
  { key: "marketed_by_address", label: "Marketed By Address" },
  { key: "imported_by_address", label: "Imported By Address" },
  { key: "allergen_information", label: "Allergen Information" },
  { key: "mrp_usp", label: "MRP & USP" },
  { key: "barcode_article_no", label: "Barcode / Article No." },
];

export function getPhysicalParams(category: string): Parameter[] {
  if (category === "dates") return PHYSICAL_DATES_PARAMS;
  if (category === "seeds") return PHYSICAL_SEEDS_PARAMS;
  return PHYSICAL_ALL_PARAMS;
}
