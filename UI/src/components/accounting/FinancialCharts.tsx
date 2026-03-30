import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

const COLORS = ['#33cbcc', '#283852', '#33cbcc99', '#28385280', '#33cbcc50'];

interface ChartData {
    name: string;
    value: number;
    [key: string]: any;
}

interface MonthlyData {
    month: string;
    revenue: number;
    expenses: number;
    netIncome: number;
}

const formatXAF = (value: number) => {
    return `${value.toLocaleString('fr-CM')} XAF`;
};

export const RevenueExpensesChart = ({ data }: { data: MonthlyData[] }) => (
    <ResponsiveContainer width="100%" height={300} debounce={50}>
        <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
                formatter={(value: number) => formatXAF(value)}
                contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px'
                }}
            />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            <Bar dataKey="revenue" fill="#33cbcc" name="Revenus" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="#283852" name="Charges" radius={[4, 4, 0, 0]} />
        </BarChart>
    </ResponsiveContainer>
);

export const NetIncomeChart = ({ data }: { data: MonthlyData[] }) => (
    <ResponsiveContainer width="100%" height={300} debounce={50}>
        <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
                formatter={(value: number) => formatXAF(value)}
                contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px'
                }}
            />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            <Line
                type="monotone"
                dataKey="netIncome"
                stroke="#33cbcc"
                strokeWidth={3}
                name="Résultat Net"
                dot={{ fill: '#33cbcc', r: 4 }}
                activeDot={{ r: 6 }}
            />
        </LineChart>
    </ResponsiveContainer>
);

export const RevenueBreakdownPie = ({ data }: { data: ChartData[] }) => (
    <ResponsiveContainer width="100%" height={300} debounce={50}>
        <PieChart>
            <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                labelLine={true}
            >
                {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
            </Pie>
            <Tooltip
                formatter={(value: number) => formatXAF(value)}
                contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px'
                }}
            />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
        </PieChart>
    </ResponsiveContainer>
);

export const BudgetVarianceChart = ({ data }: { data: Array<{ name: string; budgeted: number; actual: number }> }) => (
    <ResponsiveContainer width="100%" height={300} debounce={50}>
        <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
                formatter={(value: number) => formatXAF(value)}
                contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px'
                }}
            />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            <Bar dataKey="budgeted" fill="#33cbcc" name="Budgété" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" fill="#283852" name="Réalisé" radius={[4, 4, 0, 0]} />
        </BarChart>
    </ResponsiveContainer>
);

export const BalanceSheetChart = ({ assets, liabilities, equity }: { assets: number; liabilities: number; equity: number }) => {
    const data = [
        { name: 'Actif', value: assets },
        { name: 'Passif', value: liabilities },
        { name: 'Capitaux Propres', value: equity },
    ];

    return (
        <ResponsiveContainer width="100%" height={300} debounce={50}>
            <PieChart>
                <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                >
                    {data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    formatter={(value: number) => formatXAF(value)}
                    contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '8px'
                    }}
                />
                <Legend wrapperStyle={{ fontSize: '14px' }} />
            </PieChart>
        </ResponsiveContainer>
    );
};
