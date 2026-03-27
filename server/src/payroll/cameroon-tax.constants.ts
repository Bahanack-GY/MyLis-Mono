// Cameroon Tax Constants — CEMAC Zone

// IRPP (Impôt sur le Revenu des Personnes Physiques) — Progressive brackets on ANNUAL taxable income
export const IRPP_BRACKETS = [
    { min: 0, max: 2_000_000, rate: 0.10 },
    { min: 2_000_001, max: 3_000_000, rate: 0.15 },
    { min: 3_000_001, max: 5_000_000, rate: 0.25 },
    { min: 5_000_001, max: Infinity, rate: 0.35 },
];

// Annual exempt threshold (abattement forfaitaire)
export const IRPP_EXEMPT = 624_000;

// CNPS (Caisse Nationale de Prévoyance Sociale)
export const CNPS_EMPLOYEE_RATE = 0.028; // 2.8% employee contribution
export const CNPS_EMPLOYER_RATE = 0.112; // 11.2% employer contribution (includes work accidents)
export const CNPS_CEILING = 750_000; // Monthly ceiling for CNPS contributions

// CFC (Crédit Foncier du Cameroun)
export const CFC_RATE = 0.01; // 1%

// Centimes additionnels communaux — 10% of IRPP
export const COMMUNAL_TAX_RATE = 0.10;

// TVA (Taxe sur la Valeur Ajoutée)
export const TVA_BASE_RATE = 0.175; // 17.5% base rate
export const CAC_ON_TVA_RATE = 0.10; // 10% Centimes Additionnels Communaux on TVA
export const TVA_EFFECTIVE_RATE = 0.1925; // 19.25% = 17.5% + (17.5% × 10%)
export const TVA_ZERO_RATE = 0; // For exports

// IS (Impôt sur les Sociétés)
export const IS_STANDARD_RATE = 0.30; // 30% standard rate
export const IS_SME_RATE = 0.28; // 28% for turnover < 3 billion XAF
export const IS_SME_THRESHOLD = 3_000_000_000; // 3 billion XAF threshold
export const IS_MINIMUM_RATE = 0.01; // 1% of turnover (minimum tax)
export const IS_MINIMUM_FLOOR = 500_000; // Minimum 500,000 XAF
export const IS_QUARTERLY_FRACTION = 0.25; // 25% quarterly advance

// Tax filing deadlines (day of month)
export const TVA_FILING_DEADLINE_DAY = 15; // 15th of following month
export const CNPS_FILING_DEADLINE_DAY = 15; // 15th of following month
export const IS_ANNUAL_DEADLINE_MONTH = 3; // March 15 of following year
export const IS_QUARTERLY_MONTHS = [3, 6, 9, 12]; // March, June, September, December
