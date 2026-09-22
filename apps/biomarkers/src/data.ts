/* Every lab result, transcribed from the reports in public/pdfs. */

export type SourceId = "function" | "quest" | "labcorp" | "kaiser"
export type CategoryId =
  | "heart"
  | "liver"
  | "kidney"
  | "blood"
  | "metab"
  | "hormone"
  | "vit"
  | "omega"
  | "gut"
  | "immune"
  | "infect"
  | "cancer"
/** [value, "YYYY-MM-DD", source, lo, hi, unit], or [text, date, source] for qualitative results */
export type Row = [number, string, SourceId, number, number, string] | [string, string, SourceId]

export const SOURCES: Record<SourceId, { label: string; color: string }> = {
  function: { label: "Function Health", color: "#0a0a0a" },
  quest: { label: "Quest Diagnostics", color: "#005e9c" },
  labcorp: { label: "Labcorp", color: "#41a8e0" },
  kaiser: { label: "Kaiser Permanente", color: "#006fb9" }
}
/** `source|date` → [PDF path, title] */
export const PDFS: Record<string, [string, string]> = {
  "function|2025-12-18": ["/pdfs/function-2025-12-18.pdf", "Function · Baseline panel"],
  "function|2025-12-19": ["/pdfs/function-2025-12-19.pdf", "Function · Micronutrient + allergy"],
  "function|2026-05-28": ["/pdfs/function-2026-05-28.pdf", "Function · 6-month follow-up"],
  "labcorp|2024-04-05": ["/pdfs/labcorp-2024-04-10.pdf", "Labcorp · Annual physical"],
  "quest|2025-04-11": ["/pdfs/quest-2025-04-11.pdf", "Quest · STI screen"],
  "quest|2025-04-14": ["/pdfs/quest-2025-04-14.pdf", "Quest · Comprehensive panel"],
  "quest|2026-03-03": ["/pdfs/quest-2026-03-03.pdf", "Quest · Comprehensive panel"],
  "labcorp|2026-06-11": ["/pdfs/labcorp-2026-06-11.pdf", "Labcorp · Calprotectin + CRP"],
  "kaiser|2023-04-05": ["/pdfs/kaiser-summary.pdf", "Kaiser · Initial workup"],
  "kaiser|2023-04-19": ["/pdfs/kaiser-summary.pdf", "Kaiser · Stool panel"],
  "kaiser|2024-02-01": ["/pdfs/kaiser-summary.pdf", "Kaiser · Lipid + allergens"]
}

/* ============ CATEGORIES ============ */
export const CATS: Record<CategoryId, { name: string; desc: string; letter: string }> = {
  heart: { name: "Heart", desc: "Lipids, ApoB, hs-CRP, LDL subfractions", letter: "H" },
  liver: { name: "Liver", desc: "AST, ALT, bilirubin, proteins, GGT", letter: "L" },
  kidney: { name: "Kidney", desc: "BUN, creatinine, eGFR, uric acid", letter: "K" },
  blood: { name: "Blood", desc: "CBC, iron studies, ferritin, coag", letter: "B" },
  metab: { name: "Metabolic", desc: "Glucose, A1c, insulin, electrolytes", letter: "M" },
  hormone: { name: "Hormones", desc: "Sex, thyroid, adrenal", letter: "E" },
  vit: { name: "Vitamins & minerals", desc: "D, B12, iodine, copper, MMA", letter: "V" },
  omega: { name: "Omega-3 / fatty acids", desc: "OmegaCheck panel", letter: "O" },
  gut: { name: "Gut health", desc: "Calprotectin, stool pathogens", letter: "G" },
  immune: { name: "Immunology", desc: "ANA, RF, IgE, autoantibodies", letter: "I" },
  infect: { name: "Infectious", desc: "HIV, HSV, syphilis, hepatitis, TB", letter: "S" },
  cancer: { name: "Cancer screen", desc: "PSA", letter: "C" }
}

/* ============ METRIC REGISTRY ============ */
// id: { n:displayName, cat, fd? (good-floor: >=lo is optimal) }
export const M: Record<string, { n: string; cat: CategoryId; fd?: "good-floor" }> = {
  // ----- LIVER -----
  alt: { n: "ALT", cat: "liver" },
  ast: { n: "AST", cat: "liver" },
  alk_phos: { n: "Alkaline phosphatase", cat: "liver" },
  bilirubin_total: { n: "Bilirubin, total", cat: "liver" },
  bilirubin_direct: { n: "Bilirubin, direct", cat: "liver" },
  albumin: { n: "Albumin", cat: "liver" },
  protein_total: { n: "Total protein", cat: "liver" },
  globulin: { n: "Globulin", cat: "liver" },
  ag_ratio: { n: "A/G ratio", cat: "liver" },
  ggt: { n: "GGT", cat: "liver" },
  amylase: { n: "Amylase", cat: "liver" },
  lipase: { n: "Lipase", cat: "liver" },

  // ----- KIDNEY -----
  bun: { n: "BUN", cat: "kidney" },
  creatinine: { n: "Creatinine", cat: "kidney" },
  egfr: { n: "eGFR", cat: "kidney", fd: "good-floor" },
  bun_creat: { n: "BUN / Creat ratio", cat: "kidney" },
  uric_acid: { n: "Uric acid", cat: "kidney" },
  urine_sg: { n: "Urine specific gravity", cat: "kidney" },
  urine_ph: { n: "Urine pH", cat: "kidney" },

  // ----- BLOOD -----
  iron: { n: "Iron", cat: "blood" },
  tibc: { n: "TIBC", cat: "blood" },
  uibc: { n: "UIBC", cat: "blood" },
  iron_sat: { n: "Iron % saturation", cat: "blood" },
  ferritin: { n: "Ferritin", cat: "blood" },
  wbc: { n: "WBC", cat: "blood" },
  rbc: { n: "RBC", cat: "blood" },
  hemoglobin: { n: "Hemoglobin", cat: "blood" },
  hematocrit: { n: "Hematocrit", cat: "blood" },
  mcv: { n: "MCV", cat: "blood" },
  mch: { n: "MCH", cat: "blood" },
  mchc: { n: "MCHC", cat: "blood" },
  rdw: { n: "RDW", cat: "blood" },
  platelets: { n: "Platelets", cat: "blood" },
  mpv: { n: "MPV", cat: "blood" },
  neut_abs: { n: "Neutrophils (abs)", cat: "blood" },
  lymph_abs: { n: "Lymphocytes (abs)", cat: "blood" },
  mono_abs: { n: "Monocytes (abs)", cat: "blood" },
  eos_abs: { n: "Eosinophils (abs)", cat: "blood" },
  baso_abs: { n: "Basophils (abs)", cat: "blood" },
  immature_grans: { n: "Immature granulocytes (abs)", cat: "blood" },
  pt: { n: "Prothrombin time", cat: "blood" },
  pt_inr: { n: "PT INR", cat: "blood" },

  // ----- METAB -----
  glucose: { n: "Glucose (fasting)", cat: "metab" },
  hba1c: { n: "Hemoglobin A1c", cat: "metab" },
  insulin: { n: "Insulin (fasting)", cat: "metab" },
  sodium: { n: "Sodium", cat: "metab" },
  potassium: { n: "Potassium", cat: "metab" },
  chloride: { n: "Chloride", cat: "metab" },
  co2: { n: "CO₂", cat: "metab" },
  calcium: { n: "Calcium", cat: "metab" },
  leptin: { n: "Leptin", cat: "metab" },

  // ----- HEART -----
  chol_total: { n: "Total cholesterol", cat: "heart" },
  hdl: { n: "HDL cholesterol", cat: "heart", fd: "good-floor" },
  ldl: { n: "LDL cholesterol", cat: "heart" },
  trig: { n: "Triglycerides", cat: "heart" },
  chol_hdl: { n: "Cholesterol / HDL ratio", cat: "heart" },
  non_hdl: { n: "Non-HDL cholesterol", cat: "heart" },
  apob: { n: "Apolipoprotein B", cat: "heart" },
  lpa: { n: "Lipoprotein (a)", cat: "heart" },
  hs_crp: { n: "hs-CRP", cat: "heart" },
  crp: { n: "C-reactive protein", cat: "heart" },
  ldl_p: { n: "LDL particle number", cat: "heart" },
  ldl_small: { n: "LDL small", cat: "heart" },
  ldl_med: { n: "LDL medium", cat: "heart" },
  hdl_large: { n: "HDL large", cat: "heart", fd: "good-floor" },
  ldl_peak: { n: "LDL peak size", cat: "heart", fd: "good-floor" },

  // ----- HORMONE -----
  testo_total: { n: "Testosterone, total", cat: "hormone" },
  testo_free: { n: "Testosterone, free", cat: "hormone" },
  shbg: { n: "SHBG", cat: "hormone" },
  dheas: { n: "DHEA sulfate", cat: "hormone" },
  estradiol: { n: "Estradiol", cat: "hormone" },
  prolactin: { n: "Prolactin", cat: "hormone" },
  lh: { n: "LH", cat: "hormone" },
  fsh: { n: "FSH", cat: "hormone" },
  tsh: { n: "TSH", cat: "hormone" },
  ft4: { n: "Free T4", cat: "hormone" },
  ft3: { n: "Free T3", cat: "hormone" },
  cortisol: { n: "Cortisol (LC/MS)", cat: "hormone" },

  // ----- VITAMINS / MINERALS -----
  vit_d: { n: "Vitamin D, 25-OH", cat: "vit" },
  b12: { n: "Vitamin B12", cat: "vit" },
  folate_serum: { n: "Folate, serum", cat: "vit", fd: "good-floor" },
  folate_rbc: { n: "Folate, RBC", cat: "vit", fd: "good-floor" },
  vit_a: { n: "Vitamin A (retinol)", cat: "vit" },
  vit_e_a: { n: "Vitamin E, alpha-tocopherol", cat: "vit" },
  vit_e_bg: { n: "Vitamin E, β/γ-tocopherol", cat: "vit" },
  mma: { n: "Methylmalonic acid", cat: "vit" },
  homocysteine: { n: "Homocysteine", cat: "vit" },
  iodine: { n: "Iodine", cat: "vit" },
  copper: { n: "Copper", cat: "vit" },
  zinc: { n: "Zinc", cat: "vit" },
  selenium: { n: "Selenium", cat: "vit" },
  mg_rbc: { n: "Magnesium, RBC", cat: "vit" },
  chromium: { n: "Chromium", cat: "vit" },
  molybdenum: { n: "Molybdenum", cat: "vit" },
  lead: { n: "Lead", cat: "vit" },
  mercury: { n: "Mercury", cat: "vit" },
  coq10: { n: "Coenzyme Q10", cat: "vit", fd: "good-floor" },

  // ----- OMEGA -----
  omega3_total: { n: "Omega-3 total", cat: "omega" },
  epa_dpa_dha: { n: "EPA + DPA + DHA", cat: "omega" },
  epa: { n: "EPA", cat: "omega" },
  dpa: { n: "DPA", cat: "omega" },
  dha: { n: "DHA", cat: "omega" },
  omega6_3_ratio: { n: "Omega-6 / Omega-3 ratio", cat: "omega" },

  // ----- GUT -----
  calprotectin_fecal: { n: "Calprotectin, fecal", cat: "gut" },

  // ----- IMMUNE -----
  ana: { n: "ANA screen", cat: "immune" },
  rf: { n: "Rheumatoid factor", cat: "immune" },
  ige_total: { n: "Immunoglobulin E (total)", cat: "immune" },
  tpo_ab: { n: "TPO antibodies", cat: "immune" },
  tg_ab: { n: "Thyroglobulin antibodies", cat: "immune" },

  // ----- INFECT -----
  hiv: { n: "HIV 1/2 Ag/Ab", cat: "infect" },
  syphilis: { n: "Syphilis (RPR)", cat: "infect" },
  hsv1: { n: "HSV-1 IgG", cat: "infect" },
  hsv2: { n: "HSV-2 IgG", cat: "infect" },
  chlamydia: { n: "Chlamydia trachomatis", cat: "infect" },
  gonorrhea: { n: "Neisseria gonorrhoeae", cat: "infect" },
  trich: { n: "Trichomonas vaginalis", cat: "infect" },
  hepb_core: { n: "Hep B core Ab", cat: "infect" },
  hepb_surface_ag: { n: "Hep B surface Ag", cat: "infect" },
  hepb_surface_ab: { n: "Hep B surface Ab", cat: "infect" },
  hepa_ab: { n: "Hep A Ab", cat: "infect" },
  hepb_dna: { n: "Hep B DNA PCR", cat: "infect" },
  qft_tb: { n: "QuantiFERON TB Gold", cat: "infect" },

  // ----- CANCER -----
  psa_total: { n: "PSA, total", cat: "cancer" },
  psa_free: { n: "PSA, free", cat: "cancer" },
  psa_pct_free: { n: "PSA, % free", cat: "cancer", fd: "good-floor" }
}

/* ============ RAW RECORDS ============
   id: [ [value, "YYYY-MM-DD", "source", lo, hi, "unit"], ...]
   For qualitative: [value (string), "date", "source"]  (omit lo/hi/unit)
*/
export const REC: Record<string, Row[]> = {
  // ----- LIVER -----
  alt: [
    [19, "2026-05-28", "function", 9, 46, "U/L"],
    [25, "2026-03-03", "quest", 9, 46, "U/L"],
    [68, "2025-12-18", "function", 9, 46, "U/L"],
    [10, "2025-04-14", "quest", 9, 46, "U/L"],
    [17, "2024-04-05", "labcorp", 0, 44, "IU/L"],
    [15, "2023-04-05", "kaiser", 0, 47, "U/L"]
  ],
  ast: [
    [24, "2026-05-28", "function", 10, 40, "U/L"],
    [29, "2026-03-03", "quest", 10, 40, "U/L"],
    [41, "2025-12-18", "function", 10, 40, "U/L"],
    [15, "2025-04-14", "quest", 10, 40, "U/L"],
    [20, "2024-04-05", "labcorp", 0, 40, "IU/L"],
    [19, "2023-04-05", "kaiser", 10, 40, "U/L"]
  ],
  alk_phos: [
    [46, "2026-05-28", "function", 36, 130, "U/L"],
    [49, "2026-03-03", "quest", 36, 130, "U/L"],
    [49, "2025-12-18", "function", 36, 130, "U/L"],
    [39, "2025-04-14", "quest", 36, 130, "U/L"],
    [57, "2024-04-05", "labcorp", 44, 121, "IU/L"],
    [61, "2023-04-05", "kaiser", 37, 117, "U/L"]
  ],
  bilirubin_total: [
    [0.7, "2026-05-28", "function", 0.2, 1.2, "mg/dL"],
    [0.6, "2026-03-03", "quest", 0.2, 1.2, "mg/dL"],
    [1.0, "2025-12-18", "function", 0.2, 1.2, "mg/dL"],
    [0.7, "2025-04-14", "quest", 0.2, 1.2, "mg/dL"],
    [0.8, "2024-04-05", "labcorp", 0, 1.2, "mg/dL"],
    [0.5, "2023-04-05", "kaiser", 0.2, 1.2, "mg/dL"]
  ],
  bilirubin_direct: [[0.1, "2023-04-05", "kaiser", 0, 0.3, "mg/dL"]],
  albumin: [
    [4.9, "2026-05-28", "function", 3.6, 5.1, "g/dL"],
    [5.0, "2026-03-03", "quest", 3.6, 5.1, "g/dL"],
    [5.0, "2025-12-18", "function", 3.6, 5.1, "g/dL"],
    [5.1, "2025-04-14", "quest", 3.6, 5.1, "g/dL"],
    [5.1, "2024-04-05", "labcorp", 4.3, 5.2, "g/dL"],
    [5.2, "2023-04-05", "kaiser", 3.7, 5.7, "g/dL"]
  ],
  protein_total: [
    [7.2, "2026-05-28", "function", 6.1, 8.1, "g/dL"],
    [7.2, "2026-03-03", "quest", 6.1, 8.1, "g/dL"],
    [7.4, "2025-12-18", "function", 6.1, 8.1, "g/dL"],
    [7.2, "2025-04-14", "quest", 6.1, 8.1, "g/dL"],
    [7.3, "2024-04-05", "labcorp", 6.0, 8.5, "g/dL"]
  ],
  globulin: [
    [2.3, "2026-05-28", "function", 1.9, 3.7, "g/dL"],
    [2.2, "2026-03-03", "quest", 1.9, 3.7, "g/dL"],
    [2.4, "2025-12-18", "function", 1.9, 3.7, "g/dL"],
    [2.1, "2025-04-14", "quest", 1.9, 3.7, "g/dL"],
    [2.2, "2024-04-05", "labcorp", 1.5, 4.5, "g/dL"]
  ],
  ag_ratio: [
    [2.1, "2026-05-28", "function", 1.0, 2.5, ""],
    [2.3, "2026-03-03", "quest", 1.0, 2.5, ""],
    [2.1, "2025-12-18", "function", 1.0, 2.5, ""],
    [2.4, "2025-04-14", "quest", 1.0, 2.5, ""],
    [2.3, "2024-04-05", "labcorp", 1.2, 2.2, ""]
  ],
  ggt: [[16, "2025-12-18", "function", 3, 70, "U/L"]],
  amylase: [[62, "2025-12-18", "function", 21, 101, "U/L"]],
  lipase: [[23, "2025-12-18", "function", 7, 60, "U/L"]],

  // ----- KIDNEY -----
  bun: [
    [15, "2026-05-28", "function", 7, 25, "mg/dL"],
    [18, "2026-03-03", "quest", 7, 25, "mg/dL"],
    [13, "2025-12-18", "function", 7, 25, "mg/dL"],
    [17, "2025-04-14", "quest", 7, 25, "mg/dL"],
    [12, "2024-04-05", "labcorp", 6, 20, "mg/dL"]
  ],
  creatinine: [
    [0.98, "2026-05-28", "function", 0.6, 1.24, "mg/dL"],
    [0.97, "2026-03-03", "quest", 0.6, 1.24, "mg/dL"],
    [0.93, "2025-12-18", "function", 0.6, 1.24, "mg/dL"],
    [0.96, "2025-04-14", "quest", 0.6, 1.24, "mg/dL"],
    [0.95, "2024-04-05", "labcorp", 0.76, 1.27, "mg/dL"],
    [0.98, "2023-04-05", "kaiser", 0.5, 1.34, "mg/dL"]
  ],
  egfr: [
    [110, "2026-05-28", "function", 60, 120, "mL/min/1.73m²"],
    [112, "2026-03-03", "quest", 60, 120, "mL/min/1.73m²"],
    [118, "2025-12-18", "function", 60, 120, "mL/min/1.73m²"],
    [114, "2025-04-14", "quest", 60, 120, "mL/min/1.73m²"],
    [116, "2024-04-05", "labcorp", 60, 120, "mL/min/1.73m²"],
    [60, "2023-04-05", "kaiser", 60, 120, "mL/min/1.73m²"]
  ],
  bun_creat: [
    [15, "2026-05-28", "function", 6, 22, ""],
    [19, "2026-03-03", "quest", 6, 22, ""],
    [14, "2025-12-18", "function", 6, 22, ""],
    [13, "2024-04-05", "labcorp", 9, 20, ""]
  ],
  uric_acid: [[5.1, "2025-12-18", "function", 4.0, 8.0, "mg/dL"]],
  urine_sg: [
    [1.037, "2026-05-28", "function", 1.001, 1.035, ""],
    [1.006, "2025-12-18", "function", 1.001, 1.035, ""]
  ],
  urine_ph: [
    [5.5, "2026-05-28", "function", 5.0, 8.0, ""],
    [7.5, "2025-12-18", "function", 5.0, 8.0, ""]
  ],

  // ----- BLOOD -----
  iron: [
    [104, "2026-05-28", "function", 50, 195, "mcg/dL"],
    [116, "2026-03-03", "quest", 50, 195, "mcg/dL"],
    [180, "2025-12-18", "function", 50, 195, "mcg/dL"],
    [138, "2024-04-05", "labcorp", 38, 169, "ug/dL"],
    [106, "2023-04-05", "kaiser", 50, 212, "ug/dL"]
  ],
  tibc: [
    [347, "2026-05-28", "function", 250, 425, "mcg/dL"],
    [351, "2026-03-03", "quest", 250, 425, "mcg/dL"],
    [386, "2025-12-18", "function", 250, 425, "mcg/dL"],
    [326, "2024-04-05", "labcorp", 250, 450, "ug/dL"],
    [344, "2023-04-05", "kaiser", 228, 428, "ug/dL"]
  ],
  uibc: [
    [188, "2024-04-05", "labcorp", 111, 343, "ug/dL"],
    [238, "2023-04-05", "kaiser", 110, 370, "ug/dL"]
  ],
  iron_sat: [
    [30, "2026-05-28", "function", 20, 48, "%"],
    [33, "2026-03-03", "quest", 20, 48, "%"],
    [47, "2025-12-18", "function", 20, 48, "%"],
    [42, "2024-04-05", "labcorp", 15, 55, "%"],
    [31, "2023-04-05", "kaiser", 14, 57, "%"]
  ],
  ferritin: [
    [35, "2026-05-28", "function", 38, 380, "ng/mL"],
    [28, "2026-03-03", "quest", 38, 380, "ng/mL"],
    [30, "2025-12-18", "function", 38, 380, "ng/mL"],
    [125, "2024-04-05", "labcorp", 30, 400, "ng/mL"],
    [52, "2023-04-05", "kaiser", 22, 365, "ng/mL"]
  ],
  wbc: [
    [5.0, "2026-05-28", "function", 3.8, 10.8, "K/µL"],
    [5.9, "2026-03-03", "quest", 3.8, 10.8, "K/µL"],
    [4.1, "2025-12-18", "function", 3.8, 10.8, "K/µL"],
    [4.5, "2025-04-14", "quest", 3.8, 10.8, "K/µL"],
    [5.0, "2024-04-05", "labcorp", 3.4, 10.8, "K/µL"],
    [9.0, "2023-04-05", "kaiser", 3.7, 11.1, "K/µL"]
  ],
  rbc: [
    [5.13, "2026-05-28", "function", 4.2, 5.8, "M/µL"],
    [5.16, "2026-03-03", "quest", 4.2, 5.8, "M/µL"],
    [5.19, "2025-12-18", "function", 4.2, 5.8, "M/µL"],
    [4.9, "2025-04-14", "quest", 4.2, 5.8, "M/µL"],
    [5.21, "2024-04-05", "labcorp", 4.14, 5.8, "M/µL"],
    [5.03, "2023-04-05", "kaiser", 4.1, 5.7, "M/µL"]
  ],
  hemoglobin: [
    [15.3, "2026-05-28", "function", 13.2, 17.1, "g/dL"],
    [15.4, "2026-03-03", "quest", 13.2, 17.1, "g/dL"],
    [15.4, "2025-12-18", "function", 13.2, 17.1, "g/dL"],
    [14.5, "2025-04-14", "quest", 13.2, 17.1, "g/dL"],
    [15.6, "2024-04-05", "labcorp", 13.0, 17.7, "g/dL"],
    [14.5, "2023-04-05", "kaiser", 13.0, 17.0, "g/dL"]
  ],
  hematocrit: [
    [46.4, "2026-05-28", "function", 39.4, 51.1, "%"],
    [46.4, "2026-03-03", "quest", 39.4, 51.1, "%"],
    [46.5, "2025-12-18", "function", 39.4, 51.1, "%"],
    [43.7, "2025-04-14", "quest", 38.5, 50.0, "%"],
    [46.2, "2024-04-05", "labcorp", 37.5, 51.0, "%"],
    [44.8, "2023-04-05", "kaiser", 39.0, 51.0, "%"]
  ],
  mcv: [
    [90.4, "2026-05-28", "function", 81.4, 101.7, "fL"],
    [89.9, "2026-03-03", "quest", 81.4, 101.7, "fL"],
    [89.6, "2025-12-18", "function", 81.4, 101.7, "fL"],
    [89.2, "2025-04-14", "quest", 80.0, 100.0, "fL"],
    [89, "2024-04-05", "labcorp", 79, 97, "fL"],
    [89, "2023-04-05", "kaiser", 80, 100, "fL"]
  ],
  mch: [
    [29.8, "2026-05-28", "function", 27.0, 33.0, "pg"],
    [29.8, "2026-03-03", "quest", 27.0, 33.0, "pg"],
    [29.7, "2025-12-18", "function", 27.0, 33.0, "pg"],
    [29.6, "2025-04-14", "quest", 27.0, 33.0, "pg"],
    [29.9, "2024-04-05", "labcorp", 26.6, 33.0, "pg"]
  ],
  mchc: [
    [33.0, "2026-05-28", "function", 31.6, 35.4, "g/dL"],
    [33.2, "2026-03-03", "quest", 31.6, 35.4, "g/dL"],
    [33.1, "2025-12-18", "function", 31.6, 35.4, "g/dL"],
    [33.2, "2025-04-14", "quest", 32.0, 36.0, "g/dL"],
    [33.8, "2024-04-05", "labcorp", 31.5, 35.7, "g/dL"]
  ],
  rdw: [
    [12.7, "2026-05-28", "function", 11.0, 15.0, "%"],
    [12.9, "2026-03-03", "quest", 11.0, 15.0, "%"],
    [12.7, "2025-12-18", "function", 11.0, 15.0, "%"],
    [12.0, "2025-04-14", "quest", 11.0, 15.0, "%"],
    [12.1, "2024-04-05", "labcorp", 11.6, 15.4, "%"],
    [12.9, "2023-04-05", "kaiser", 12.0, 16.5, "%"]
  ],
  platelets: [
    [329, "2026-05-28", "function", 140, 400, "K/µL"],
    [313, "2026-03-03", "quest", 140, 400, "K/µL"],
    [305, "2025-12-18", "function", 140, 400, "K/µL"],
    [319, "2025-04-14", "quest", 140, 400, "K/µL"],
    [324, "2024-04-05", "labcorp", 150, 450, "K/µL"],
    [350, "2023-04-05", "kaiser", 140, 400, "K/µL"]
  ],
  mpv: [
    [11.5, "2026-05-28", "function", 7.5, 12.5, "fL"],
    [11.3, "2026-03-03", "quest", 7.5, 12.5, "fL"],
    [11.7, "2025-12-18", "function", 7.5, 12.5, "fL"],
    [11.7, "2025-04-14", "quest", 7.5, 12.5, "fL"]
  ],
  neut_abs: [
    [2560, "2026-05-28", "function", 1500, 7800, "cells/µL"],
    [2519, "2026-03-03", "quest", 1500, 7800, "cells/µL"],
    [2009, "2025-12-18", "function", 1500, 7800, "cells/µL"],
    [1971, "2025-04-14", "quest", 1500, 7800, "cells/µL"],
    [2000, "2024-04-05", "labcorp", 1400, 7000, "cells/µL"]
  ],
  lymph_abs: [
    [1905, "2026-05-28", "function", 850, 3900, "cells/µL"],
    [2738, "2026-03-03", "quest", 850, 3900, "cells/µL"],
    [1640, "2025-12-18", "function", 850, 3900, "cells/µL"],
    [2075, "2025-04-14", "quest", 850, 3900, "cells/µL"],
    [2400, "2024-04-05", "labcorp", 700, 3100, "cells/µL"]
  ],
  mono_abs: [
    [415, "2026-05-28", "function", 200, 950, "cells/µL"],
    [454, "2026-03-03", "quest", 200, 950, "cells/µL"],
    [373, "2025-12-18", "function", 200, 950, "cells/µL"],
    [383, "2025-04-14", "quest", 200, 950, "cells/µL"],
    [500, "2024-04-05", "labcorp", 100, 900, "cells/µL"]
  ],
  eos_abs: [
    [70, "2026-05-28", "function", 15, 500, "cells/µL"],
    [118, "2026-03-03", "quest", 15, 500, "cells/µL"],
    [29, "2025-12-18", "function", 15, 500, "cells/µL"],
    [32, "2025-04-14", "quest", 15, 500, "cells/µL"],
    [100, "2024-04-05", "labcorp", 0, 400, "cells/µL"]
  ],
  baso_abs: [
    [50, "2026-05-28", "function", 0, 200, "cells/µL"],
    [71, "2026-03-03", "quest", 0, 200, "cells/µL"],
    [49, "2025-12-18", "function", 0, 200, "cells/µL"],
    [41, "2025-04-14", "quest", 0, 200, "cells/µL"],
    [100, "2024-04-05", "labcorp", 0, 200, "cells/µL"]
  ],
  immature_grans: [[0.0, "2024-04-05", "labcorp", 0.0, 0.1, "K/µL"]],
  pt: [[14.7, "2023-04-05", "kaiser", 11.7, 14.9, "s"]],
  pt_inr: [[1.1, "2023-04-05", "kaiser", 0.8, 1.2, ""]],

  // ----- METAB -----
  glucose: [
    [92, "2026-05-28", "function", 65, 99, "mg/dL"],
    [98, "2026-03-03", "quest", 65, 99, "mg/dL"],
    [93, "2025-12-18", "function", 65, 99, "mg/dL"],
    [94, "2025-04-14", "quest", 65, 99, "mg/dL"],
    [98, "2024-04-05", "labcorp", 70, 99, "mg/dL"],
    [90, "2024-02-01", "kaiser", 60, 99, "mg/dL"],
    [88, "2023-04-05", "kaiser", 60, 99, "mg/dL"]
  ],
  hba1c: [
    [5.4, "2026-05-28", "function", 4.0, 5.7, "%"],
    [5.4, "2026-03-03", "quest", 4.0, 5.7, "%"],
    [5.3, "2025-12-18", "function", 4.0, 5.7, "%"]
  ],
  insulin: [
    [6.9, "2026-05-28", "function", 0, 18.4, "µIU/mL"],
    [5.8, "2025-12-18", "function", 0, 18.4, "µIU/mL"]
  ],
  sodium: [
    [141, "2026-05-28", "function", 135, 146, "mmol/L"],
    [141, "2026-03-03", "quest", 135, 146, "mmol/L"],
    [139, "2025-12-18", "function", 135, 146, "mmol/L"],
    [141, "2025-04-14", "quest", 135, 146, "mmol/L"],
    [138, "2024-04-05", "labcorp", 134, 144, "mmol/L"],
    [141, "2023-04-05", "kaiser", 135, 145, "mmol/L"]
  ],
  potassium: [
    [4.3, "2026-05-28", "function", 3.5, 5.3, "mmol/L"],
    [4.5, "2026-03-03", "quest", 3.5, 5.3, "mmol/L"],
    [4.3, "2025-12-18", "function", 3.5, 5.3, "mmol/L"],
    [4.1, "2025-04-14", "quest", 3.5, 5.3, "mmol/L"],
    [4.2, "2024-04-05", "labcorp", 3.5, 5.2, "mmol/L"],
    [4.1, "2023-04-05", "kaiser", 3.5, 5.3, "mmol/L"]
  ],
  chloride: [
    [102, "2026-05-28", "function", 98, 110, "mmol/L"],
    [104, "2026-03-03", "quest", 98, 110, "mmol/L"],
    [101, "2025-12-18", "function", 98, 110, "mmol/L"],
    [100, "2025-04-14", "quest", 98, 110, "mmol/L"],
    [98, "2024-04-05", "labcorp", 96, 106, "mmol/L"],
    [101, "2023-04-05", "kaiser", 100, 111, "mmol/L"]
  ],
  co2: [
    [30, "2026-05-28", "function", 20, 32, "mmol/L"],
    [29, "2026-03-03", "quest", 20, 32, "mmol/L"],
    [28, "2025-12-18", "function", 20, 32, "mmol/L"],
    [28, "2025-04-14", "quest", 20, 32, "mmol/L"],
    [26, "2024-04-05", "labcorp", 20, 29, "mmol/L"],
    [31, "2023-04-05", "kaiser", 24, 33, "mmol/L"]
  ],
  calcium: [
    [9.7, "2026-05-28", "function", 8.6, 10.3, "mg/dL"],
    [9.6, "2026-03-03", "quest", 8.6, 10.3, "mg/dL"],
    [9.9, "2025-12-18", "function", 8.6, 10.3, "mg/dL"],
    [9.9, "2025-04-14", "quest", 8.6, 10.3, "mg/dL"],
    [10.1, "2024-04-05", "labcorp", 8.7, 10.2, "mg/dL"]
  ],
  leptin: [[1.0, "2025-12-18", "function", 0.3, 13.4, "ng/mL"]],

  // ----- HEART -----
  chol_total: [
    [151, "2026-05-28", "function", 0, 200, "mg/dL"],
    [153, "2026-03-03", "quest", 0, 200, "mg/dL"],
    [154, "2025-12-18", "function", 0, 200, "mg/dL"],
    [141, "2025-04-14", "quest", 0, 200, "mg/dL"],
    [129, "2024-02-01", "kaiser", 0, 239, "mg/dL"],
    [126, "2023-04-05", "kaiser", 0, 239, "mg/dL"]
  ],
  hdl: [
    [57, "2026-05-28", "function", 40, 90, "mg/dL"],
    [62, "2026-03-03", "quest", 40, 90, "mg/dL"],
    [66, "2025-12-18", "function", 40, 90, "mg/dL"],
    [54, "2025-04-14", "quest", 40, 90, "mg/dL"],
    [58, "2024-02-01", "kaiser", 40, 90, "mg/dL"],
    [45, "2023-04-05", "kaiser", 40, 90, "mg/dL"]
  ],
  ldl: [
    [79, "2026-05-28", "function", 0, 100, "mg/dL"],
    [77, "2026-03-03", "quest", 0, 100, "mg/dL"],
    [75, "2025-12-18", "function", 0, 100, "mg/dL"],
    [73, "2025-04-14", "quest", 0, 100, "mg/dL"],
    [61, "2024-02-01", "kaiser", 0, 159, "mg/dL"],
    [67, "2023-04-05", "kaiser", 0, 159, "mg/dL"]
  ],
  trig: [
    [66, "2026-05-28", "function", 0, 150, "mg/dL"],
    [64, "2026-03-03", "quest", 0, 150, "mg/dL"],
    [54, "2025-12-18", "function", 0, 150, "mg/dL"],
    [63, "2025-04-14", "quest", 0, 150, "mg/dL"],
    [51, "2024-02-01", "kaiser", 0, 499, "mg/dL"],
    [71, "2023-04-05", "kaiser", 0, 499, "mg/dL"]
  ],
  chol_hdl: [
    [2.6, "2026-05-28", "function", 0, 5.0, ""],
    [2.5, "2026-03-03", "quest", 0, 5.0, ""],
    [2.3, "2025-12-18", "function", 0, 5.0, ""],
    [2.6, "2025-04-14", "quest", 0, 5.0, ""]
  ],
  non_hdl: [
    [94, "2026-05-28", "function", 0, 130, "mg/dL"],
    [91, "2026-03-03", "quest", 0, 130, "mg/dL"],
    [88, "2025-12-18", "function", 0, 130, "mg/dL"],
    [87, "2025-04-14", "quest", 0, 130, "mg/dL"]
  ],
  apob: [[59, "2025-12-18", "function", 0, 90, "mg/dL"]],
  lpa: [[10, "2025-12-18", "function", 0, 75, "nmol/L"]],
  hs_crp: [
    [0.2, "2026-05-28", "function", 0, 1.0, "mg/L"],
    [0.2, "2025-12-18", "function", 0, 1.0, "mg/L"]
  ],
  crp: [
    [1, "2026-06-11", "labcorp", 0, 10, "mg/L"],
    [1, "2024-04-05", "labcorp", 0, 10, "mg/L"],
    [0.4, "2023-04-05", "kaiser", 0, 0.5, "mg/dL"]
  ],
  ldl_p: [[974, "2025-12-18", "function", 0, 1138, "nmol/L"]],
  ldl_small: [[140, "2025-12-18", "function", 0, 142, "nmol/L"]],
  ldl_med: [[193, "2025-12-18", "function", 0, 215, "nmol/L"]],
  hdl_large: [[6596, "2025-12-18", "function", 6729, 17886, "nmol/L"]],
  ldl_peak: [[221.7, "2025-12-18", "function", 222.9, 234.3, "Å"]],

  // ----- HORMONE -----
  testo_total: [[491, "2025-12-18", "function", 250, 1100, "ng/dL"]],
  testo_free: [[87.5, "2025-12-18", "function", 35.0, 155.0, "pg/mL"]],
  shbg: [[23, "2025-12-18", "function", 10, 50, "nmol/L"]],
  dheas: [[461, "2025-12-18", "function", 74, 617, "mcg/dL"]],
  estradiol: [[30, "2025-12-18", "function", 0, 39, "pg/mL"]],
  prolactin: [[7.3, "2025-12-18", "function", 2.0, 18.0, "ng/mL"]],
  lh: [[2.8, "2025-12-18", "function", 1.5, 9.3, "mIU/mL"]],
  fsh: [[2.5, "2025-12-18", "function", 1.4, 12.8, "mIU/mL"]],
  tsh: [
    [1.21, "2026-03-03", "quest", 0.4, 4.5, "mIU/L"],
    [0.85, "2025-12-18", "function", 0.4, 4.5, "mIU/L"]
  ],
  ft4: [[1.3, "2025-12-18", "function", 0.8, 1.8, "ng/dL"]],
  ft3: [[3.7, "2025-12-18", "function", 2.3, 4.2, "pg/mL"]],
  cortisol: [[8.2, "2025-12-18", "function", 1.8, 13.6, "mcg/dL"]],

  // ----- VITAMINS / MINERALS -----
  vit_d: [
    [49, "2026-03-03", "quest", 30, 100, "ng/mL"],
    [27, "2025-12-18", "function", 30, 100, "ng/mL"],
    [49, "2025-04-14", "quest", 30, 100, "ng/mL"],
    [56.6, "2024-04-05", "labcorp", 30, 100, "ng/mL"],
    [43, "2024-02-01", "kaiser", 20, 79, "ng/mL"],
    [11, "2023-04-05", "kaiser", 20, 79, "ng/mL"]
  ],
  b12: [
    [412, "2026-03-03", "quest", 200, 1100, "pg/mL"],
    [341, "2025-12-19", "function", 200, 1100, "pg/mL"],
    [453, "2024-04-05", "labcorp", 232, 1245, "pg/mL"],
    [318, "2023-04-05", "kaiser", 200, 1100, "pg/mL"]
  ],
  folate_serum: [
    [17.0, "2026-03-03", "quest", 5.4, 99, "ng/mL"],
    [17.0, "2024-04-05", "labcorp", 3.0, 99, "ng/mL"]
  ],
  folate_rbc: [[399, "2025-12-19", "function", 280, 2000, "ng/mL"]],
  vit_a: [[56, "2025-12-19", "function", 38, 98, "mcg/dL"]],
  vit_e_a: [[9.3, "2025-12-19", "function", 5.7, 19.9, "mg/L"]],
  vit_e_bg: [[1.0, "2025-12-19", "function", 0, 4.4, "mg/L"]],
  mma: [[262, "2025-12-18", "function", 55, 335, "nmol/L"]],
  homocysteine: [
    [8.5, "2026-05-28", "function", 0, 12.9, "µmol/L"],
    [14.3, "2025-12-18", "function", 0, 12.9, "µmol/L"]
  ],
  iodine: [[46, "2025-12-19", "function", 52, 109, "mcg/L"]],
  copper: [[67, "2025-12-19", "function", 80, 180, "mcg/dL"]],
  zinc: [
    [82, "2025-12-18", "function", 60, 130, "mcg/dL"],
    [91, "2024-04-05", "labcorp", 44, 115, "mcg/dL"]
  ],
  selenium: [[100, "2025-12-19", "function", 63, 160, "mcg/L"]],
  mg_rbc: [[5.3, "2025-12-18", "function", 4.0, 6.4, "mg/dL"]],
  chromium: [[0.4, "2025-12-19", "function", 0, 1.2, "mcg/L"]],
  molybdenum: [[0.4, "2025-12-19", "function", 0, 2.2, "mcg/L"]],
  lead: [[0.5, "2025-12-18", "function", 0, 3.5, "mcg/dL"]],
  mercury: [[2.5, "2025-12-18", "function", 0, 11, "mcg/L"]],
  coq10: [[0.83, "2025-12-19", "function", 0.35, 2.5, "µg/mL"]],

  // ----- OMEGA -----
  omega3_total: [[2.6, "2025-12-18", "function", 3.7, 14.4, "% by wt"]],
  epa_dpa_dha: [[2.6, "2025-12-18", "function", 5.4, 12, "% by wt"]],
  epa: [[0.3, "2025-12-18", "function", 0.2, 2.3, "% by wt"]],
  dpa: [[0.7, "2025-12-18", "function", 0.8, 1.8, "% by wt"]],
  dha: [[1.7, "2025-12-18", "function", 1.4, 5.1, "% by wt"]],
  omega6_3_ratio: [[13.6, "2025-12-18", "function", 3.7, 14.4, ""]],

  // ----- GUT -----
  calprotectin_fecal: [
    [38, "2026-06-11", "labcorp", 0, 120, "µg/g"],
    [5, "2024-04-05", "labcorp", 0, 120, "µg/g"],
    [1370, "2023-04-19", "kaiser", 0, 49, "µg/g"]
  ],

  // ----- IMMUNE -----
  ana: [["Negative", "2025-12-18", "function"]],
  rf: [["<10 IU/mL", "2025-12-18", "function"]],
  ige_total: [[76, "2025-12-18", "function", 0, 114, "kU/L"]],
  tpo_ab: [["<1 IU/mL", "2025-12-18", "function"]],
  tg_ab: [["<1 IU/mL", "2025-12-18", "function"]],

  // ----- INFECT -----
  hiv: [["Negative", "2025-12-19", "function"]],
  syphilis: [["Non-reactive", "2025-12-19", "function"]],
  hsv1: [["Negative", "2025-12-19", "function"]],
  hsv2: [["Negative", "2025-12-19", "function"]],
  chlamydia: [
    ["Not detected", "2025-12-19", "function"],
    ["Not detected", "2025-04-11", "quest"]
  ],
  gonorrhea: [
    ["Not detected", "2025-12-19", "function"],
    ["Not detected", "2025-04-11", "quest"]
  ],
  trich: [["Not detected", "2025-12-19", "function"]],
  hepb_core: [["Negative", "2023-04-05", "kaiser"]],
  hepb_surface_ag: [["Negative", "2023-04-05", "kaiser"]],
  hepb_surface_ab: [["Negative", "2023-04-05", "kaiser"]],
  hepa_ab: [["Negative", "2023-04-05", "kaiser"]],
  hepb_dna: [["Not detected", "2023-04-05", "kaiser"]],
  qft_tb: [["Negative", "2023-04-05", "kaiser"]],

  // ----- CANCER -----
  psa_total: [[0.5, "2025-12-18", "function", 0, 4.0, "ng/mL"]],
  psa_free: [[0.3, "2025-12-18", "function", 0, 4.0, "ng/mL"]],
  psa_pct_free: [[60, "2025-12-18", "function", 25, 100, "%"]]
}

/* Food IgG sensitivities (Function Dec 19) */
export const IGG: [string, number][] = [
  ["Wheat", 7.2],
  ["Maize / Corn", 5.5],
  ["Yeast", 4.7],
  ["Egg white", 3.9],
  ["Tomato", 3.5],
  ["Cacao (chocolate)", 3.4],
  ["Coffee", 3.1],
  ["Casein", 3.1],
  ["Soybean", 2.9],
  ["Codfish", 2.6],
  ["Peanut", 2.5]
]
export const IGE_NEGS: string[] = [
  "Dust mites",
  "Cat",
  "Dog",
  "Cockroach",
  "Penicillium",
  "Cladosporium",
  "Aspergillus",
  "Alternaria",
  "Alder",
  "Birch",
  "Mountain cedar",
  "Olive",
  "Sycamore",
  "Oak",
  "Elm",
  "White mulberry",
  "Bermuda grass",
  "Timothy grass",
  "Ragweed",
  "Mugwort",
  "Russian thistle",
  "Pigweed",
  "Mouse urine",
  "Egg white",
  "Peanut",
  "Wheat",
  "Walnut",
  "Codfish",
  "Cow's milk",
  "Soybean",
  "Shrimp",
  "Scallop",
  "Sesame",
  "Hazelnut",
  "Cashew",
  "Almond",
  "Salmon",
  "Tuna",
  "Brazil nut",
  "Macadamia",
  "Crab",
  "Lobster",
  "Clam"
]
