import { Injectable } from '@nestjs/common';
import { ReportsService } from '../accounting/reports.service';
import {
    IS_STANDARD_RATE,
    IS_SME_RATE,
    IS_SME_THRESHOLD,
    IS_MINIMUM_RATE,
    IS_MINIMUM_FLOOR,
    IS_QUARTERLY_FRACTION,
} from '../payroll/cameroon-tax.constants';

@Injectable()
export class IsService {
    constructor(private reportsService: ReportsService) {}

    /**
     * Calculate Corporate Tax (Impôt sur les Sociétés) for a fiscal year
     */
    async calculateAnnual(fiscalYearId: string) {
        const income = await this.reportsService.incomeStatement(fiscalYearId);

        const turnover = income.totalRevenue;
        const taxableProfit = income.netIncome;

        // Determine IS rate based on turnover
        const isRate = turnover < IS_SME_THRESHOLD ? IS_SME_RATE : IS_STANDARD_RATE;

        // Standard IS on profit
        const standardIs = Math.max(0, Math.round(taxableProfit * isRate));

        // Minimum IS (1% of turnover, min 500k XAF)
        const minimumIs = Math.max(IS_MINIMUM_FLOOR, Math.round(turnover * IS_MINIMUM_RATE));

        // The company pays the HIGHER of standard IS or minimum IS
        const isDue = Math.max(standardIs, minimumIs);

        // Quarterly advance (25% each)
        const quarterlyAdvance = Math.round(isDue * IS_QUARTERLY_FRACTION);

        return {
            turnover: Math.round(turnover * 100) / 100,
            totalExpenses: Math.round(income.totalExpenses * 100) / 100,
            taxableProfit: Math.round(taxableProfit * 100) / 100,
            isRate,
            standardIs,
            minimumIs,
            isDue,
            quarterlyAdvance,
            regime: turnover < IS_SME_THRESHOLD ? 'PME (28%)' : 'Standard (30%)',
        };
    }
}
