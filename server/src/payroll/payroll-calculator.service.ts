import { Injectable } from '@nestjs/common';
import {
    IRPP_BRACKETS,
    IRPP_EXEMPT,
    CNPS_EMPLOYEE_RATE,
    CNPS_EMPLOYER_RATE,
    CNPS_CEILING,
    CFC_RATE,
    COMMUNAL_TAX_RATE,
} from './cameroon-tax.constants';

export interface DeductionToggles {
    includeCnps: boolean;
    includeCfc: boolean;
    includeIrpp: boolean;
    includeCommunalTax: boolean;
}

export interface CustomDeduction {
    name: string;
    amount: number;
}

export interface PayrollCalculation {
    grossSalary: number;
    cnpsEmployee: number;
    cnpsEmployer: number;
    cfc: number;
    taxableIncome: number;
    irpp: number;
    communalTax: number;
    totalDeductions: number;
    totalEmployerCharges: number;
    netSalary: number;
    details: PayrollLineItem[];
    customDeductionsTotal: number;
}

export interface PayrollLineItem {
    label: string;
    base: number;
    rate: number;
    employeeAmount: number;
    employerAmount: number;
}

@Injectable()
export class PayrollCalculatorService {
    /**
     * Calculate all payroll deductions from gross salary.
     * Toggles allow excluding specific statutory deductions.
     * Custom deductions are subtracted after statutory ones.
     */
    calculate(
        grossSalary: number,
        toggles?: Partial<DeductionToggles>,
        customDeductions?: CustomDeduction[],
    ): PayrollCalculation {
        const gross = Math.round(grossSalary);
        const opts: DeductionToggles = {
            includeCnps: true,
            includeCfc: true,
            includeIrpp: true,
            includeCommunalTax: true,
            ...toggles,
        };

        // 1. CNPS Employee contribution (2.8% capped at ceiling)
        const cnpsBase = Math.min(gross, CNPS_CEILING);
        const cnpsEmployee = opts.includeCnps ? Math.round(cnpsBase * CNPS_EMPLOYEE_RATE) : 0;

        // 2. CNPS Employer contribution (11.2% capped at ceiling)
        const cnpsEmployer = opts.includeCnps ? Math.round(cnpsBase * CNPS_EMPLOYER_RATE) : 0;

        // 3. CFC (1% of gross)
        const cfc = opts.includeCfc ? Math.round(gross * CFC_RATE) : 0;

        // 4. Taxable income = gross - CNPS employee - CFC
        const monthlyTaxable = gross - cnpsEmployee - cfc;

        // 5. IRPP: annualize → apply brackets → divide by 12
        let irpp = 0;
        if (opts.includeIrpp) {
            const annualTaxable = Math.max(0, monthlyTaxable * 12 - IRPP_EXEMPT);
            const annualIrpp = this.calculateIrpp(annualTaxable);
            irpp = Math.round(annualIrpp / 12);
        }

        // 6. Communal tax = 10% of IRPP (only if IRPP is included)
        const communalTax = opts.includeCommunalTax && opts.includeIrpp
            ? Math.round(irpp * COMMUNAL_TAX_RATE)
            : 0;

        // Custom deductions total
        const customDeductionsTotal = (customDeductions || []).reduce(
            (s, d) => s + Math.round(d.amount), 0,
        );

        // Totals
        const totalDeductions = cnpsEmployee + cfc + irpp + communalTax;
        const totalEmployerCharges = cnpsEmployer;
        const netSalary = gross - totalDeductions - customDeductionsTotal;

        // Breakdown for payslip
        const details: PayrollLineItem[] = [
            { label: 'Salaire brut', base: gross, rate: 1, employeeAmount: 0, employerAmount: 0 },
        ];

        if (opts.includeCnps) {
            details.push({
                label: 'CNPS (Pension vieillesse)',
                base: cnpsBase,
                rate: CNPS_EMPLOYEE_RATE,
                employeeAmount: cnpsEmployee,
                employerAmount: cnpsEmployer,
            });
        }

        if (opts.includeCfc) {
            details.push({
                label: 'CFC (Crédit Foncier)',
                base: gross,
                rate: CFC_RATE,
                employeeAmount: cfc,
                employerAmount: 0,
            });
        }

        if (opts.includeIrpp) {
            details.push({
                label: 'IRPP (Impôt sur le revenu)',
                base: monthlyTaxable,
                rate: 0,
                employeeAmount: irpp,
                employerAmount: 0,
            });
        }

        if (opts.includeCommunalTax && opts.includeIrpp) {
            details.push({
                label: 'Centimes additionnels communaux',
                base: irpp,
                rate: COMMUNAL_TAX_RATE,
                employeeAmount: communalTax,
                employerAmount: 0,
            });
        }

        return {
            grossSalary: gross,
            cnpsEmployee,
            cnpsEmployer,
            cfc,
            taxableIncome: monthlyTaxable,
            irpp,
            communalTax,
            totalDeductions,
            totalEmployerCharges,
            netSalary,
            details,
            customDeductionsTotal,
        };
    }

    /**
     * Apply progressive IRPP brackets on annual taxable income
     */
    private calculateIrpp(annualTaxable: number): number {
        let tax = 0;
        let remaining = annualTaxable;

        for (const bracket of IRPP_BRACKETS) {
            if (remaining <= 0) break;
            const bracketWidth = bracket.max === Infinity
                ? remaining
                : Math.min(remaining, bracket.max - bracket.min + 1);
            tax += bracketWidth * bracket.rate;
            remaining -= bracketWidth;
        }

        return Math.round(tax);
    }
}
