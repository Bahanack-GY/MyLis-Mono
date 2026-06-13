import { Injectable } from '@nestjs/common';
import {
    IRPP_BRACKETS,
    RAV_BRACKETS,
    TDL_BRACKETS,
    ATMP_DEFAULT_RISK_CLASS,
    DEFAULT_TAX_CONFIG,
    TaxRateConfig,
} from './cameroon-tax.constants';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface SalaryComponentInput {
    label: string;
    type: 'PRIME' | 'INDEMNITE' | 'AVANTAGE_NATURE' | 'RETENUE';
    amount: number;
    cnpsBase: boolean;  // included in cotisable base
    taxable: boolean;   // included in IRPP taxable base
    cap?: number | null;        // exoneration cap (0 = uncapped)
    justificatifUrl?: string | null;
}

export interface DeductionToggles {
    includeCnps: boolean;
    includeCfc: boolean;
    includeIrpp: boolean;
    includeCommunalTax: boolean; // legacy alias for includeIrppCac
    includeFne: boolean;
    includeRav: boolean;
    includeTdl: boolean;
}

export interface CustomDeduction {
    name: string;
    amount: number;
}

export interface PayrollLineItem {
    label: string;
    base: number;
    rate: number;       // 0 if not percentage-based
    employeeAmount: number;
    employerAmount: number;
}

export interface PayrollCalculation {
    // Salary bases
    baseSalary: number;
    grossSalary: number;        // base + all components (brut global)
    grossCotisable: number;     // brut cotisable (capped at CNPS_CEILING for CNPS, uncapped for AT/MP)
    grossTaxable: number;       // brut fiscal = base + taxable components
    netCategoriel: number;      // after abattements, before IRPP brackets

    // CNPS breakdown
    pvidEmployee: number;       // PVID 4.2% employee
    pvidEmployer: number;       // PVID 4.2% employer
    cnpsFamilyAllowance: number; // PF 7% employer
    atmp: number;               // AT/MP employer

    // CFC
    cfcEmployee: number;        // 1% employee
    cfcEmployer: number;        // 1.5% employer

    // FNE
    fne: number;                // 1% employer

    // Fiscal deductions (employee)
    irpp: number;
    cac: number;                // 10% of IRPP
    rav: number;
    tdl: number;

    // Aggregates
    totalEmployeeDeductions: number;
    totalEmployerCharges: number;
    customDeductionsTotal: number;
    netSalary: number;

    // Compliance
    complianceWarnings: string[];
    riskClass: number;

    // Itemized detail for payslip
    details: PayrollLineItem[];

    // Legacy compat
    cnpsEmployee: number;
    cnpsEmployer: number;
    cfc: number;
    taxableIncome: number;
    communalTax: number;
    totalDeductions: number;
}

// ─────────────────────────────────────────
// Service
// ─────────────────────────────────────────

@Injectable()
export class PayrollCalculatorService {

    calculate(
        grossSalaryOrBase: number,
        toggles?: Partial<DeductionToggles>,
        customDeductions?: CustomDeduction[],
        components?: SalaryComponentInput[],
        riskClass?: number,
        baseSalary?: number,
        rateOverrides?: Partial<TaxRateConfig>,
    ): PayrollCalculation {
        const opts: DeductionToggles = {
            includeCnps: true,
            includeCfc: true,
            includeIrpp: true,
            includeCommunalTax: true,
            includeFne: true,
            includeRav: true,
            includeTdl: true,
            ...toggles,
        };

        const r: TaxRateConfig = { ...DEFAULT_TAX_CONFIG, ...(rateOverrides ?? {}) };
        const atmpRiskClass = riskClass || ATMP_DEFAULT_RISK_CLASS;
        const base = Math.round(baseSalary ?? grossSalaryOrBase);
        const warnings: string[] = [];
        const details: PayrollLineItem[] = [];

        // ── 1. Salary components ──
        let componentsCotisable = 0;
        let componentsTaxable = 0;
        let componentsGross = 0;

        for (const comp of components || []) {
            const amt = Math.round(comp.amount);
            componentsGross += amt;
            if (comp.cnpsBase) componentsCotisable += amt;
            if (comp.taxable) componentsTaxable += amt;

            // Sanity check: exonerated amount without justificatif
            if (!comp.taxable && amt > 0 && !comp.justificatifUrl) {
                if (comp.type === 'INDEMNITE') {
                    warnings.push(`Indemnité "${comp.label}" exonérée sans justificatif — risque de requalification.`);
                }
            }
            // Cap check for indemnités
            if (comp.cap && comp.cap > 0 && amt > comp.cap) {
                warnings.push(`"${comp.label}" dépasse le plafond d'exonération (${comp.cap.toLocaleString('fr-FR')} XAF). Excédent imposable.`);
            }
        }

        const gross = base + componentsGross; // brut global
        const grossCotisable = Math.min(base + componentsCotisable, r.cnpsCeiling); // cotisable (plafonné)
        const grossTaxable = base + componentsTaxable; // brut fiscal

        details.push({ label: 'Salaire de base', base, rate: 1, employeeAmount: 0, employerAmount: 0 });
        if (componentsGross > 0) {
            details.push({ label: 'Primes, indemnités et avantages', base: componentsGross, rate: 1, employeeAmount: 0, employerAmount: 0 });
        }

        // ── 2. CNPS PVID (plafond cotisable) ──
        let pvidEmployee = 0, pvidEmployer = 0;
        if (opts.includeCnps) {
            pvidEmployee = Math.min(Math.round(grossCotisable * r.pvidEmployeeRate), r.pvidMonthlyCap);
            pvidEmployer = Math.round(grossCotisable * r.pvidEmployerRate);
            details.push({
                label: 'CNPS PVID (Pension Vieillesse)',
                base: grossCotisable,
                rate: r.pvidEmployeeRate,
                employeeAmount: pvidEmployee,
                employerAmount: pvidEmployer,
            });
        }

        // ── 3. CNPS Prestations Familiales (patronal seulement) ──
        let cnpsFamilyAllowance = 0;
        if (opts.includeCnps) {
            cnpsFamilyAllowance = Math.round(grossCotisable * r.pfEmployerRate);
            details.push({
                label: 'CNPS Prestations Familiales (patronal)',
                base: grossCotisable,
                rate: r.pfEmployerRate,
                employeeAmount: 0,
                employerAmount: cnpsFamilyAllowance,
            });
        }

        // ── 4. CNPS AT/MP (patronal, assiette = brut GLOBAL non plafonné) ──
        let atmp = 0;
        if (opts.includeCnps) {
            const atmpRate = (r.atmpRates[atmpRiskClass] ?? r.atmpRates[1]) as number;
            atmp = Math.round(gross * atmpRate);
            details.push({
                label: `CNPS AT/MP (classe risque ${atmpRiskClass}, patronal)`,
                base: gross,
                rate: atmpRate,
                employeeAmount: 0,
                employerAmount: atmp,
            });
        }

        // ── 5. CFC (employee + employer, assiette = brut taxable) ──
        let cfcEmployee = 0, cfcEmployer = 0;
        if (opts.includeCfc) {
            cfcEmployee = Math.round(grossTaxable * r.cfcEmployeeRate);
            cfcEmployer = Math.round(grossTaxable * r.cfcEmployerRate);
            details.push({
                label: 'CFC Crédit Foncier',
                base: grossTaxable,
                rate: r.cfcEmployeeRate,
                employeeAmount: cfcEmployee,
                employerAmount: cfcEmployer,
            });
        }

        // ── 6. FNE (patronal, assiette = brut taxable) ──
        let fne = 0;
        if (opts.includeFne) {
            fne = Math.round(grossTaxable * r.fneEmployerRate);
            details.push({
                label: 'FNE Fonds National de l\'Emploi (patronal)',
                base: grossTaxable,
                rate: r.fneEmployerRate,
                employeeAmount: 0,
                employerAmount: fne,
            });
        }

        // ── 7. Net catégoriel pour IRPP ──
        const annualGrossTaxable = grossTaxable * 12;
        const abattementAnnual = Math.min(annualGrossTaxable * r.irppAbattementRate, r.irppAbattementAnnualCap);
        const annualPvidEmployee = pvidEmployee * 12;
        const netCategorielAnnual = Math.max(0,
            annualGrossTaxable - abattementAnnual - annualPvidEmployee - r.irppFixedAbattementAnnual
        );
        const netCategoriel = Math.round(netCategorielAnnual / 12);

        // ── 8. IRPP (barème progressif sur net catégoriel annuel) + CAC 10% ──
        let irpp = 0, cac = 0;
        if (opts.includeIrpp) {
            const annualIrpp = this.calculateIrppBrackets(netCategorielAnnual);
            irpp = Math.round(annualIrpp / 12);
            cac = opts.includeCommunalTax ? Math.round(irpp * r.cacRate) : 0;
            details.push({
                label: 'IRPP (Impôt sur le revenu)',
                base: netCategoriel,
                rate: 0,
                employeeAmount: irpp,
                employerAmount: 0,
            });
            if (cac > 0) {
                details.push({
                    label: 'CAC — Centimes Additionnels Communaux (10% IRPP)',
                    base: irpp,
                    rate: r.cacRate,
                    employeeAmount: cac,
                    employerAmount: 0,
                });
            }
        }

        // ── 9. RAV — Redevance Audiovisuelle (salariale, mensuelle, brut fiscal) ──
        let rav = 0;
        if (opts.includeRav) {
            rav = this.calculateRav(grossTaxable);
            if (rav > 0) {
                details.push({
                    label: 'RAV Redevance Audiovisuelle',
                    base: grossTaxable,
                    rate: 0,
                    employeeAmount: rav,
                    employerAmount: 0,
                });
            }
        }

        // ── 10. TDL — Taxe de Développement Local (salariale, annuelle ÷12, base salary) ──
        let tdl = 0;
        if (opts.includeTdl) {
            tdl = this.calculateTdl(base);
            if (tdl > 0) {
                details.push({
                    label: 'TDL Taxe de Développement Local (mensuel)',
                    base,
                    rate: 0,
                    employeeAmount: tdl,
                    employerAmount: 0,
                });
            }
        }

        // ── 11. Custom deductions ──
        const customDeductionsTotal = (customDeductions || []).reduce((s, d) => s + Math.round(d.amount), 0);

        // ── 12. Totals ──
        const totalEmployeeDeductions = pvidEmployee + cfcEmployee + irpp + cac + rav + tdl;
        const totalEmployerCharges = pvidEmployer + cnpsFamilyAllowance + atmp + cfcEmployer + fne;
        const netSalary = gross - totalEmployeeDeductions - customDeductionsTotal;

        return {
            baseSalary: base,
            grossSalary: gross,
            grossCotisable,
            grossTaxable,
            netCategoriel,
            pvidEmployee,
            pvidEmployer,
            cnpsFamilyAllowance,
            atmp,
            cfcEmployee,
            cfcEmployer,
            fne,
            irpp,
            cac,
            rav,
            tdl,
            totalEmployeeDeductions,
            totalEmployerCharges,
            customDeductionsTotal,
            netSalary,
            complianceWarnings: warnings,
            riskClass: atmpRiskClass,
            details,
            // Legacy compat fields
            cnpsEmployee: pvidEmployee,
            cnpsEmployer: pvidEmployer + cnpsFamilyAllowance + atmp,
            cfc: cfcEmployee,
            taxableIncome: netCategoriel,
            communalTax: cac,
            totalDeductions: totalEmployeeDeductions,
        };
    }

    private calculateIrppBrackets(annualNetCategoriel: number): number {
        let tax = 0;
        let remaining = Math.max(0, annualNetCategoriel);
        for (const bracket of IRPP_BRACKETS) {
            if (remaining <= 0) break;
            const bracketMax = bracket.max === Infinity ? remaining : bracket.max - bracket.min + 1;
            const taxable = Math.min(remaining, bracketMax);
            tax += taxable * bracket.rate;
            remaining -= taxable;
        }
        return Math.round(tax);
    }

    private calculateRav(monthlyGrossTaxable: number): number {
        for (const bracket of RAV_BRACKETS) {
            if (monthlyGrossTaxable <= bracket.max) return bracket.amount;
        }
        return 0;
    }

    private calculateTdl(monthlyBaseSalary: number): number {
        for (const bracket of TDL_BRACKETS) {
            if (monthlyBaseSalary <= bracket.max) return Math.round(bracket.annual / 12);
        }
        return 0;
    }
}
