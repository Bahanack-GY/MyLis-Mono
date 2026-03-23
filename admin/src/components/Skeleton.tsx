/* ─── Skeleton primitives & page-level skeleton screens ─────────────────── */
import type { CSSProperties } from 'react';

const Bone = ({ className = '', style }: { className?: string; style?: CSSProperties }) => (
    <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} style={style} />
);

const StatCard = () => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100">
        <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1 pr-3">
                <Bone className="h-3 w-24" />
                <Bone className="h-7 w-32" />
                <Bone className="h-3 w-16" />
            </div>
            <Bone className="w-10 h-10 rounded-full shrink-0" />
        </div>
    </div>
);

const SearchBar = ({ hasButton = false }: { hasButton?: boolean }) => (
    <div className="flex items-center gap-3">
        <Bone className="h-10 flex-1 rounded-xl" />
        {hasButton && <Bone className="h-10 w-28 rounded-xl" />}
    </div>
);

const FilterPills = ({ count = 5 }: { count?: number }) => (
    <div className="flex gap-2 flex-wrap">
        {Array.from({ length: count }).map((_, i) => (
            <Bone key={i} className={`h-8 rounded-full ${i === 0 ? 'w-16' : i === 1 ? 'w-20' : 'w-24'}`} />
        ))}
    </div>
);

const TableRows = ({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) => (
    <div className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, ri) => (
            <div key={ri} className="px-6 py-4 flex items-center gap-6">
                <div className="space-y-1.5 flex-[2]">
                    <Bone className="h-4 w-40" />
                    <Bone className="h-3 w-24" />
                </div>
                {Array.from({ length: cols - 1 }).map((_, ci) => (
                    <Bone key={ci} className={`h-4 flex-1 ${ci === 0 ? 'max-w-[80px]' : 'max-w-[100px]'}`} />
                ))}
            </div>
        ))}
    </div>
);

const CardGrid = ({ count = 6, cols = 3 }: { count?: number; cols?: number }) => (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${cols === 3 ? 'lg:grid-cols-3' : cols === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-6`}>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex items-center gap-3">
                    <Bone className="w-10 h-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <Bone className="h-4 w-36" />
                        <Bone className="h-3 w-20" />
                    </div>
                </div>
                <Bone className="h-2 w-full rounded-full" />
                <div className="flex justify-between">
                    <Bone className="h-3 w-20" />
                    <Bone className="h-3 w-16" />
                </div>
                <div className="flex gap-2">
                    <Bone className="h-6 w-16 rounded-full" />
                    <Bone className="h-6 w-20 rounded-full" />
                </div>
            </div>
        ))}
    </div>
);

const ChartBox = ({ height = 'h-56' }: { height?: string }) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100">
        <Bone className="h-5 w-44 mb-6" />
        <div className={`${height} flex items-end gap-2`}>
            {[40, 65, 50, 80, 55, 70, 45, 85, 60, 75, 50, 65].map((h, i) => (
                <div key={i} className="flex-1 flex items-end">
                    <Bone className="w-full rounded-t-md animate-pulse bg-gray-100" style={{ height: `${h}%` }} />
                </div>
            ))}
        </div>
    </div>
);

const NotifList = ({ count = 8 }: { count?: number }) => (
    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-start gap-4">
                <Bone className="w-9 h-9 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                    <Bone className="h-4 w-48" />
                    <Bone className="h-3 w-72" />
                    <Bone className="h-3 w-24" />
                </div>
                <Bone className="h-6 w-16 rounded-full shrink-0" />
            </div>
        ))}
    </div>
);

/* ═══════════════════════════════════════════════════
   PAGE-LEVEL SKELETONS
   ═══════════════════════════════════════════════════ */

export const DashboardSkeleton = () => (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div className="space-y-2">
                <Bone className="h-8 w-48" />
                <Bone className="h-4 w-56" />
            </div>
            <Bone className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><ChartBox height="h-72" /></div>
            <ChartBox height="h-72" />
        </div>
    </div>
);

export const EmployeesSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-40" /><Bone className="h-4 w-56" /></div>
            <Bone className="h-10 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex gap-3">
            <Bone className="h-10 flex-1 rounded-xl" />
            <Bone className="h-10 w-36 rounded-xl" />
            <Bone className="h-10 w-24 rounded-xl" />
        </div>
        <CardGrid count={6} cols={3} />
    </div>
);

export const DepartmentsSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-44" /><Bone className="h-4 w-60" /></div>
            <Bone className="h-10 w-44 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartBox />
            <ChartBox />
        </div>
        <CardGrid count={6} cols={3} />
    </div>
);

export const ProjectsSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-36" /><Bone className="h-4 w-52" /></div>
            <Bone className="h-10 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <div className="flex gap-3">
            <Bone className="h-10 flex-1 rounded-xl" />
            <FilterPills count={5} />
        </div>
        <CardGrid count={6} cols={3} />
    </div>
);

export const TasksAdminSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-36" /><Bone className="h-4 w-52" /></div>
            <div className="flex gap-2">
                <Bone className="h-10 w-28 rounded-xl" />
                <Bone className="h-10 w-28 rounded-xl" />
            </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex gap-3">
                {['w-16','w-20','w-14','w-20'].map((w, i) => <Bone key={i} className={`h-8 ${w} rounded-lg`} />)}
            </div>
            <div className="divide-y divide-gray-50">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                        <Bone className="w-8 h-8 rounded-full shrink-0" />
                        <Bone className="h-3 w-28 shrink-0" />
                        <div className="flex-1 flex gap-2 items-center">
                            {Array.from({ length: 2 }).map((_, j) => (
                                <Bone key={j} className="h-8 rounded-xl" style={{ width: `${60 + j * 40}px`, marginLeft: `${j * 80}px` }} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const InvoicesSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-36" /><Bone className="h-4 w-52" /></div>
            <Bone className="h-10 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <SearchBar hasButton />
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100"><Bone className="h-5 w-40" /></div>
            <TableRows rows={8} cols={5} />
        </div>
    </div>
);

export const ExpensesSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-32" /><Bone className="h-4 w-56" /></div>
            <Bone className="h-10 w-44 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartBox height="h-64" />
            <ChartBox height="h-64" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <Bone className="h-5 w-48" />
                <Bone className="h-9 w-52 rounded-xl" />
            </div>
            <TableRows rows={8} cols={6} />
        </div>
    </div>
);

export const ClientsSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-32" /><Bone className="h-4 w-52" /></div>
            <Bone className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <SearchBar />
        <CardGrid count={6} cols={3} />
    </div>
);

export const ActivitySkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-40" /><Bone className="h-4 w-56" /></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <ChartBox height="h-52" />
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <Bone className="h-5 w-36" />
                <Bone className="h-9 w-44 rounded-xl" />
            </div>
            <TableRows rows={10} cols={4} />
        </div>
    </div>
);

export const DocumentsAdminSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-36" /><Bone className="h-4 w-52" /></div>
            <Bone className="h-10 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <SearchBar />
        <FilterPills count={6} />
        <CardGrid count={6} cols={3} />
    </div>
);

export const MeetingsAdminSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-36" /><Bone className="h-4 w-52" /></div>
            <Bone className="h-10 w-44 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <SearchBar />
        <FilterPills count={5} />
        <CardGrid count={6} cols={3} />
    </div>
);

export const NotificationsAdminSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-44" /><Bone className="h-4 w-60" /></div>
            <Bone className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <div className="flex gap-3">
            <Bone className="h-10 flex-1 rounded-xl" />
            <FilterPills count={3} />
        </div>
        <FilterPills count={8} />
        <NotifList count={8} />
    </div>
);

export const TicketsAdminSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-36" /><Bone className="h-4 w-52" /></div>
            <Bone className="h-10 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <SearchBar />
        <FilterPills count={6} />
        <CardGrid count={6} cols={3} />
    </div>
);

export const DemandsAdminSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-32" /><Bone className="h-4 w-52" /></div>
            <Bone className="h-10 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <SearchBar hasButton />
        <FilterPills count={4} />
        <CardGrid count={6} cols={3} />
    </div>
);

export const MessagesSkeleton = () => (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 border-r border-gray-100 flex flex-col shrink-0">
            <div className="p-4 border-b border-gray-100 space-y-3">
                <Bone className="h-6 w-32" />
                <Bone className="h-9 w-full rounded-xl" />
            </div>
            <div className="flex-1 p-3 space-y-1">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                        <Bone className="w-8 h-8 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1">
                            <Bone className="h-3 w-28" />
                            <Bone className="h-2.5 w-20" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
        {/* Main */}
        <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100">
                <Bone className="h-5 w-40" />
            </div>
            <div className="flex-1 p-6 space-y-4">
                {[false, true, false, false, true, false, true].map((own, i) => (
                    <div key={i} className={`flex gap-3 ${own ? 'justify-end' : ''}`}>
                        {!own && <Bone className="w-8 h-8 rounded-full shrink-0" />}
                        <div className={`space-y-1 max-w-xs ${own ? 'items-end flex flex-col' : ''}`}>
                            <Bone className={`h-4 ${own ? 'w-20' : 'w-24'}`} />
                            <Bone className={`h-10 rounded-2xl ${own ? 'w-52 bg-[#33cbcc]/10' : 'w-64'}`} />
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-4 border-t border-gray-100">
                <Bone className="h-12 w-full rounded-xl" />
            </div>
        </div>
    </div>
);

export const ProfileAdminSkeleton = () => (
    <div className="space-y-6">
        {/* Banner */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <Bone className="h-32 w-full rounded-none rounded-t-2xl" />
            <div className="px-6 pb-6 -mt-12 flex items-end justify-between">
                <div className="flex items-end gap-4">
                    <Bone className="w-24 h-24 rounded-full border-4 border-white shrink-0" />
                    <div className="space-y-2 mb-2">
                        <Bone className="h-6 w-40" />
                        <Bone className="h-4 w-28" />
                    </div>
                </div>
                <Bone className="h-9 w-28 rounded-xl mb-2" />
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left */}
            <div className="space-y-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-4">
                    <Bone className="h-5 w-32" />
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex gap-3">
                            <Bone className="w-4 h-4 rounded shrink-0 mt-0.5" />
                            <div className="flex-1 space-y-1"><Bone className="h-3 w-20" /><Bone className="h-4 w-32" /></div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Center */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-4">
                <Bone className="h-5 w-24" />
                <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <Bone key={i} className="h-16 rounded-xl" />
                    ))}
                </div>
            </div>
            {/* Right */}
            <div className="space-y-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-3">
                    <Bone className="h-5 w-36" />
                    <div className="flex items-center gap-4">
                        <Bone className="w-16 h-16 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <Bone className="h-4 w-24" />
                            <Bone className="h-7 w-32" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-3">
                    <Bone className="h-5 w-40" />
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Bone className="w-8 h-8 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-1"><Bone className="h-3 w-32" /><Bone className="h-3 w-20" /></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

export const DetailPageSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-4">
                <Bone className="w-16 h-16 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                    <Bone className="h-6 w-48" />
                    <Bone className="h-4 w-32" />
                </div>
                <Bone className="h-9 w-28 rounded-xl" />
            </div>
        </div>
        <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => <Bone key={i} className="h-9 w-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartBox />
            <ChartBox />
        </div>
    </div>
);
