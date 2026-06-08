// Cameroon Tax Constants — Loi de Finances 2026 / SYSCOHADA Révisé

// ─────────────────────────────────────────
// IRPP — Impôt sur le Revenu des Personnes Physiques
// Applied on annual NET CATEGORIEL (salaire net catégoriel)
// ─────────────────────────────────────────
export const IRPP_BRACKETS = [
    { min: 0,         max: 2_000_000,  rate: 0.10 },  // 10%
    { min: 2_000_001, max: 3_000_000,  rate: 0.15 },  // 15%
    { min: 3_000_001, max: 5_000_000,  rate: 0.25 },  // 25%
    { min: 5_000_001, max: Infinity,   rate: 0.35 },  // 35%
];

// Abattement forfaitaire frais professionnels: 30% du brut (plafonné à 4 800 000 /an)
export const IRPP_ABATTEMENT_RATE = 0.30;
export const IRPP_ABATTEMENT_ANNUAL_CAP = 4_800_000;

// Abattement fixe annuel supplémentaire après frais pro et PVID
export const IRPP_FIXED_ABATTEMENT_ANNUAL = 500_000;

// CAC (Centimes Additionnels Communaux) sur IRPP
export const CAC_ON_IRPP_RATE = 0.10; // 10%

// Legacy — kept for backward compat with old calculator
export const IRPP_EXEMPT = 624_000;
export const COMMUNAL_TAX_RATE = 0.10;

// ─────────────────────────────────────────
// CNPS — Caisse Nationale de Prévoyance Sociale
// Assiette: salaire cotisable (brut plafonné à CNPS_CEILING)
// ─────────────────────────────────────────
export const CNPS_CEILING = 750_000; // Monthly ceiling XAF

// Pension Vieillesse-Invalidité-Décès (PVID) — paritaire
export const PVID_EMPLOYEE_RATE = 0.042; // 4.2% salarial
export const PVID_EMPLOYER_RATE = 0.042; // 4.2% patronal

// Prestations Familiales (PF) — patronal exclusivement
export const PF_EMPLOYER_RATE = 0.07;   // 7% patronal, ceiling 750 000

// AT/MP — Accidents du Travail et Maladies Professionnelles
// 100% patronal, assiette = brut SOCIAL (non plafonné)
// Taux selon classe de risque (1=faible, 2=moyen, 3=élevé)
export const ATMP_RATES: Record<number, number> = {
    1: 0.0175, // 1.75%
    2: 0.025,  // 2.50%
    3: 0.05,   // 5.00%
};
export const ATMP_DEFAULT_RISK_CLASS = 1;

// Legacy — kept for backward compat
export const CNPS_EMPLOYEE_RATE = 0.028; // Old: 2.8% (was PVID + extras blended)
export const CNPS_EMPLOYER_RATE = 0.112; // Old: 11.2%

// ─────────────────────────────────────────
// CFC — Crédit Foncier du Cameroun
// Assiette: salaire taxable brut (non plafonné)
// ─────────────────────────────────────────
export const CFC_EMPLOYEE_RATE = 0.01;  // 1% salarial
export const CFC_EMPLOYER_RATE = 0.015; // 1.5% patronal
export const CFC_RATE = 0.01;           // Legacy alias for employee rate

// ─────────────────────────────────────────
// FNE — Fonds National de l'Emploi
// 100% patronal, assiette: salaire taxable (non plafonné)
// ─────────────────────────────────────────
export const FNE_EMPLOYER_RATE = 0.01; // 1%

// ─────────────────────────────────────────
// RAV — Redevance Audiovisuelle
// Salariale uniquement. Tranches mensuelles sur brut fiscal.
// ─────────────────────────────────────────
export const RAV_BRACKETS = [
    { min: 0,      max: 62_500,   amount: 0 },
    { min: 62_501, max: 125_000,  amount: 3_500 },
    { min: 125_001, max: 250_000, amount: 6_500 },
    { min: 250_001, max: 500_000, amount: 10_000 },
    { min: 500_001, max: Infinity, amount: 13_000 },
];

// ─────────────────────────────────────────
// TDL — Taxe de Développement Local
// Salariale uniquement. Annuel recouvré mensuellement (÷12).
// Assiette: salaire de base mensuel.
// ─────────────────────────────────────────
export const TDL_BRACKETS = [
    { min: 0,       max: 20_000,  annual: 0 },
    { min: 20_001,  max: 30_000,  annual: 3_000 },
    { min: 30_001,  max: 50_000,  annual: 6_000 },
    { min: 50_001,  max: 80_000,  annual: 9_000 },
    { min: 80_001,  max: 150_000, annual: 12_000 },
    { min: 150_001, max: 250_000, annual: 18_000 },
    { min: 250_001, max: 500_000, annual: 24_000 },
    { min: 500_001, max: Infinity, annual: 30_000 },
];

// ─────────────────────────────────────────
// PVID employee cap per month
// ─────────────────────────────────────────
export const PVID_EMPLOYEE_MONTHLY_CAP = 31_500; // 4.2% × 750 000

// ─────────────────────────────────────────
// Per-fiscal-year configurable rate structure
// ─────────────────────────────────────────

export interface TaxRateConfig {
    pvidEmployeeRate: number;
    pvidEmployerRate: number;
    pvidMonthlyCap: number;
    pfEmployerRate: number;
    cnpsCeiling: number;
    atmpRates: Record<number, number>;
    cfcEmployeeRate: number;
    cfcEmployerRate: number;
    fneEmployerRate: number;
    irppAbattementRate: number;
    irppAbattementAnnualCap: number;
    irppFixedAbattementAnnual: number;
    cacRate: number;
}

export const DEFAULT_TAX_CONFIG: TaxRateConfig = {
    pvidEmployeeRate: PVID_EMPLOYEE_RATE,
    pvidEmployerRate: PVID_EMPLOYER_RATE,
    pvidMonthlyCap: PVID_EMPLOYEE_MONTHLY_CAP,
    pfEmployerRate: PF_EMPLOYER_RATE,
    cnpsCeiling: CNPS_CEILING,
    atmpRates: { 1: 0.0175, 2: 0.025, 3: 0.05 },
    cfcEmployeeRate: CFC_EMPLOYEE_RATE,
    cfcEmployerRate: CFC_EMPLOYER_RATE,
    fneEmployerRate: FNE_EMPLOYER_RATE,
    irppAbattementRate: IRPP_ABATTEMENT_RATE,
    irppAbattementAnnualCap: IRPP_ABATTEMENT_ANNUAL_CAP,
    irppFixedAbattementAnnual: IRPP_FIXED_ABATTEMENT_ANNUAL,
    cacRate: CAC_ON_IRPP_RATE,
};

// ─────────────────────────────────────────
// Avantages en nature — forfaits légaux (% du brut taxable)
// ─────────────────────────────────────────
export const BENEFIT_IN_KIND_RATES = {
    logement:   0.15,  // 15%
    vehicule:   0.10,  // 10%
    nourriture: 0.10,  // 10%
    electricite: 0.04, // 4%
    eau:        0.02,  // 2%
    domestique: 0.05,  // 5% par domestique
};

// ─────────────────────────────────────────
// Plafonds d'exonération des indemnités de frais professionnels
// ─────────────────────────────────────────
export const INDEMNITY_CAPS = {
    representation: 0.10, // ≤ 10% du salaire de base
};

// ─────────────────────────────────────────
// TVA (Taxe sur la Valeur Ajoutée)
// ─────────────────────────────────────────
export const TVA_BASE_RATE = 0.175;
export const CAC_ON_TVA_RATE = 0.10;
export const TVA_EFFECTIVE_RATE = 0.1925;
export const TVA_ZERO_RATE = 0;

// ─────────────────────────────────────────
// IS (Impôt sur les Sociétés)
// ─────────────────────────────────────────
export const IS_STANDARD_RATE = 0.30;
export const IS_SME_RATE = 0.28;
export const IS_SME_THRESHOLD = 3_000_000_000;
export const IS_MINIMUM_RATE = 0.01;
export const IS_MINIMUM_FLOOR = 500_000;
export const IS_QUARTERLY_FRACTION = 0.25;

// Tax filing deadlines
export const TVA_FILING_DEADLINE_DAY = 15;
export const CNPS_FILING_DEADLINE_DAY = 15;
export const IS_ANNUAL_DEADLINE_MONTH = 3;
export const IS_QUARTERLY_MONTHS = [3, 6, 9, 12];
