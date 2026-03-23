import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import {
  Users,
  Briefcase,
  CheckCircle,
  TrendingUp,
  DollarSign,
  CreditCard,
  Coins,
  Clock,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useEmployees } from '../../api/employees/hooks';
import { useProjects } from '../../api/projects/hooks';
import { useTasks } from '../../api/tasks/hooks';
import { useDepartments } from '../../api/departments/hooks';
import { useInvoiceStats, useRevenueByDepartment } from '../../api/invoices/hooks';
import { useExpenseStats } from '../../api/expenses/hooks';
import { useDepartmentScope } from '../../contexts/AuthContext';
import { DashboardSkeleton } from '../../components/Skeleton';

type DatePreset = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';

function getDateRange(preset: DatePreset, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const to = endOfDay.toISOString();

  switch (preset) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: start.toISOString(), to };
    }
    case 'this_week': {
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
      return { from: start.toISOString(), to };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: start.toISOString(), to };
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { from: start.toISOString(), to };
    }
    case 'custom': {
      return {
        from: customFrom ? new Date(customFrom).toISOString() : new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        to: customTo ? new Date(customTo + 'T23:59:59.999').toISOString() : to,
      };
    }
  }
}

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deptScope = useDepartmentScope();

  // Date range state — default: this_month
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showDateMenu, setShowDateMenu] = useState(false);

  const { from, to } = useMemo(
    () => getDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  );

  // API data — pass date range to time-sensitive queries
  const { data: apiEmployees, isLoading: loadingEmployees } = useEmployees(deptScope);
  const { data: apiProjects, isLoading: loadingProjects } = useProjects(deptScope);
  const { data: apiTasks, isLoading: loadingTasks } = useTasks(deptScope, from, to);
  const { data: apiDepartments, isLoading: loadingDepartments } = useDepartments();
  const { data: invoiceStats } = useInvoiceStats(deptScope, from, to);
  const { data: expenseStats } = useExpenseStats();
  const { data: revenueByDept } = useRevenueByDepartment(from, to);

  const isLoading = loadingEmployees || loadingProjects || loadingTasks || loadingDepartments;

  // Derive stats from real data only
  const totalEmployees = apiEmployees?.length ?? 0;
  const activeProjects = apiProjects?.length ?? 0;
  const tasksCompleted = apiTasks?.filter(t => t.state === 'COMPLETED').length ?? 0;
  const totalTasks = apiTasks?.length ?? 0;
  const efficiency = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

  const formatFCFA = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  const revenue = invoiceStats?.totalRevenue ?? 0;
  const totalExpenses = (expenseStats?.totalYear ?? 0) + (expenseStats?.totalSalaries ?? 0) + (expenseStats?.totalProjects ?? 0);
  const profit = revenue - totalExpenses;
  const pending = invoiceStats?.totalPending ?? 0;

  const stats = [
    { title: t('dashboard.stats.totalEmployees'), value: String(totalEmployees), icon: Users, color: '#283852', link: '/employees' },
    { title: t('dashboard.stats.activeProjects'), value: String(activeProjects), icon: Briefcase, color: '#314463', link: '/projects' },
    { title: t('dashboard.stats.tasksCompleted'), value: String(tasksCompleted), icon: CheckCircle, color: '#3a5175', link: '/tasks' },
    { title: t('dashboard.stats.efficiency'), value: `${efficiency}%`, icon: TrendingUp, color: '#445d86' },
    { title: t('dashboard.stats.revenue'), value: formatFCFA(revenue), icon: DollarSign, color: '#4d6a98' },
    { title: t('dashboard.stats.expenses'), value: formatFCFA(totalExpenses), icon: CreditCard, color: '#5676a9', link: '/expenses' },
    { title: t('dashboard.stats.profit'), value: formatFCFA(profit), icon: Coins, color: profit >= 0 ? '#22c55e' : '#f43f5e' },
    { title: t('dashboard.stats.pending'), value: formatFCFA(pending), icon: Clock, color: '#698fcc' },
  ];

  // Derive chart data from real tasks grouped by day of week
  const dayNames = [
    t('dashboard.charts.days.Sun'),
    t('dashboard.charts.days.Mon'),
    t('dashboard.charts.days.Tue'),
    t('dashboard.charts.days.Wed'),
    t('dashboard.charts.days.Thu'),
    t('dashboard.charts.days.Fri'),
    t('dashboard.charts.days.Sat'),
  ];
  const chartData = (() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    (apiTasks || []).forEach(task => {
      const date = task.dueDate || task.createdAt;
      if (date) {
        const dow = new Date(date).getDay();
        counts[dow]++;
      }
    });
    // Return Mon-Sun order
    return [1, 2, 3, 4, 5, 6, 0].map(i => ({ name: dayNames[i], tasks: counts[i] }));
  })();

  // Derive pie data from departments
  const pieData = (apiDepartments || []).map(dept => ({
    name: dept.name,
    value: dept.employees?.length || 0,
  }));
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  const COLORS = ['#283852', '#33cbcc', '#FFBB28', '#FF8042', '#8b5cf6', '#ec4899'];

  const presetOptions: { key: DatePreset; label: string }[] = [
    { key: 'today', label: t('dashboard.dateFilter.today', 'Today') },
    { key: 'this_week', label: t('dashboard.dateFilter.thisWeek', 'This Week') },
    { key: 'this_month', label: t('dashboard.dateFilter.thisMonth', 'This Month') },
    { key: 'this_year', label: t('dashboard.dateFilter.thisYear', 'This Year') },
    { key: 'custom', label: t('dashboard.dateFilter.custom', 'Custom') },
  ];

  const currentLabel = presetOptions.find(o => o.key === datePreset)?.label || '';

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 ">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-gray-800">{t('dashboard.title')}</h1>
           <p className="text-gray-500 mt-1">{t('dashboard.subtitle')}</p>
        </div>
        {/* Date Range Selector */}
        <div className="relative">
           <button
              onClick={() => setShowDateMenu(!showDateMenu)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-[#33cbcc]/40 transition-colors"
           >
              <Calendar size={16} className="text-[#33cbcc]" />
              <span className="text-sm">{currentLabel}</span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${showDateMenu ? 'rotate-180' : ''}`} />
           </button>

           <AnimatePresence>
              {showDateMenu && (
                 <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-gray-200 shadow-xl z-50 min-w-[220px] overflow-hidden"
                 >
                    {presetOptions.map(opt => (
                       <button
                          key={opt.key}
                          onClick={() => {
                             setDatePreset(opt.key);
                             if (opt.key !== 'custom') setShowDateMenu(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                             datePreset === opt.key
                                ? 'bg-[#33cbcc]/10 text-[#33cbcc]'
                                : 'text-gray-600 hover:bg-gray-50'
                          }`}
                       >
                          {opt.label}
                       </button>
                    ))}

                    {datePreset === 'custom' && (
                       <div className="px-4 py-3 border-t border-gray-100 space-y-2">
                          <div>
                             <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{t('dashboard.dateFilter.from', 'From')}</label>
                             <input
                                type="date"
                                value={customFrom}
                                onChange={e => setCustomFrom(e.target.value)}
                                className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#33cbcc]"
                             />
                          </div>
                          <div>
                             <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{t('dashboard.dateFilter.to', 'To')}</label>
                             <input
                                type="date"
                                value={customTo}
                                onChange={e => setCustomTo(e.target.value)}
                                className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#33cbcc]"
                             />
                          </div>
                          <button
                             onClick={() => setShowDateMenu(false)}
                             className="w-full mt-1 px-3 py-2 bg-[#33cbcc] text-white text-sm font-semibold rounded-lg hover:bg-[#2bb5b6] transition-colors"
                          >
                             {t('dashboard.dateFilter.apply', 'Apply')}
                          </button>
                       </div>
                    )}
                 </motion.div>
              )}
           </AnimatePresence>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={stat.link ? () => navigate(stat.link) : undefined}
            onKeyDown={stat.link ? (e) => { if (e.key === 'Enter' || e.key === ' ') navigate(stat.link); } : undefined}
            tabIndex={stat.link ? 0 : undefined}
            role={stat.link ? 'button' : undefined}
            className={`bg-white p-6 rounded-2xl border border-gray-100 transition-all duration-200 relative overflow-hidden group hover:border-[#33cbcc]/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#33cbcc]/40${stat.link ? ' cursor-pointer' : ''}`}
          >
            <div className="relative z-10">
                <h3 className="text-gray-500 text-sm font-medium mb-2 truncate">{stat.title}</h3>
                <h2 className={`font-bold text-gray-800 truncate leading-tight ${stat.value.length > 10 ? 'text-xl' : 'text-3xl'}`}>
                  {stat.value}
                </h2>
            </div>

            <div
                className="absolute -right-6 -bottom-6 opacity-5 transition-transform group-hover:scale-110 duration-500 ease-out"
                style={{ color: stat.color }}
            >
                <stat.icon size={120} strokeWidth={1.5} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.4 }}
           className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100"
        >
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-800">{t('dashboard.charts.productivity')}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.dateFilter.' + datePreset, currentLabel)}</p>
          </div>
          <div className="h-[280px] w-full">
            {chartData.every(d => d.tasks === 0) ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <CheckCircle size={32} className="text-gray-200" />
                <p className="text-sm text-gray-400">{t('dashboard.charts.noTasks', 'No tasks in this period')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#33cbcc" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#33cbcc" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} allowDecimals={false} />
                  <CartesianGrid vertical={false} stroke="#F3F4F6" strokeDasharray="4 4"/>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                    cursor={{ stroke: '#33cbcc', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="tasks" stroke="#33cbcc" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTasks)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Side Chart — Department headcount distribution */}
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.5 }}
           className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col"
        >
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-800">{t('dashboard.charts.distribution')}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.charts.total')} · {pieTotal}</p>
          </div>
          {pieTotal === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <Users size={32} className="text-gray-200" />
              <p className="text-sm text-gray-400">{t('dashboard.charts.noDepartments', 'No departments yet')}</p>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={76}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                      formatter={(v: any) => [`${v ?? 0} ${(v ?? 0) === 1 ? t('dashboard.charts.employee', 'employee') : t('dashboard.charts.employees', 'employees')}`, ''] as [string, string]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800">{pieTotal}</p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">{t('dashboard.charts.people', 'people')}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {pieData.slice(0, 5).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-sm gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-gray-600 truncate text-xs">{entry.name}</span>
                    </div>
                    <span className="font-semibold text-gray-700 text-xs shrink-0">{pieTotal > 0 ? Math.round((entry.value / pieTotal) * 100) : 0}%</span>
                  </div>
                ))}
                {pieData.length > 5 && (
                  <p className="text-[11px] text-gray-400 pl-4">+{pieData.length - 5} more</p>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Revenue by Department */}
      {revenueByDept && revenueByDept.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-white p-6 rounded-2xl border border-gray-100"
        >
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-800">{t('dashboard.charts.revenueByDepartment', 'Revenue by Department')}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.charts.paidInvoices', 'Paid invoices only')}</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueByDept}
                margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
                barCategoryGap="30%"
              >
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#33cbcc" stopOpacity={1} />
                    <stop offset="100%" stopColor="#33cbcc" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="3 3" />
                <XAxis
                  dataKey="department"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  interval={0}
                  tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + '…' : v}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? (v / 1_000_000).toFixed(1) + 'M'
                      : v >= 1_000
                      ? (v / 1_000).toFixed(0) + 'k'
                      : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f3f4f6' }}
                  formatter={(value: any) => [formatFCFA(value ?? 0), t('dashboard.stats.revenue')]}
                />
                <Bar dataKey="revenue" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Department legend with values */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {revenueByDept.map((d, i) => (
              <div key={d.departmentId} className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-gray-500 truncate">{d.department}</span>
                <span className="ml-auto text-xs font-semibold text-gray-700 shrink-0 whitespace-nowrap">
                  {d.revenue >= 1_000_000
                    ? (d.revenue / 1_000_000).toFixed(1) + 'M'
                    : d.revenue >= 1_000
                    ? (d.revenue / 1_000).toFixed(0) + 'k'
                    : d.revenue.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recents Table Section */}
    </div>
  );
};

export default Dashboard;
