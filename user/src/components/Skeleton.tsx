/* ─── Skeleton primitives & page-level skeleton screens ─────────────────── */

const Bone = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />
);

const StatCard = () => (
    <div className="bg-white p-5 rounded-2xl border border-gray-100">
        <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1 pr-3">
                <Bone className="h-3 w-20" />
                <Bone className="h-7 w-28" />
                <Bone className="h-3 w-16" />
            </div>
            <Bone className="w-9 h-9 rounded-full shrink-0" />
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
            <Bone key={i} className={`h-8 rounded-full ${i === 0 ? 'w-14' : i === 1 ? 'w-20' : 'w-24'}`} />
        ))}
    </div>
);

const KanbanColumn = () => (
    <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
            <Bone className="h-5 w-24" />
            <Bone className="h-5 w-8 rounded-full" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 space-y-2.5 border border-gray-100">
                <div className="flex gap-2">
                    <Bone className="h-5 w-14 rounded-full" />
                    <Bone className="h-5 w-16 rounded-full" />
                </div>
                <Bone className="h-4 w-full" />
                <Bone className="h-3 w-4/5" />
                <div className="flex items-center justify-between pt-1">
                    <Bone className="h-3 w-20" />
                    <Bone className="w-6 h-6 rounded-full" />
                </div>
            </div>
        ))}
    </div>
);

const CardGrid = ({ count = 4, cols = 2 }: { count?: number; cols?: number }) => (
    <div className={`grid grid-cols-1 ${cols === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex items-center gap-3">
                    <Bone className="w-10 h-10 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <Bone className="h-4 w-36" />
                        <Bone className="h-3 w-24" />
                    </div>
                </div>
                <Bone className="h-2 w-full rounded-full" />
                <div className="flex gap-2">
                    <Bone className="h-5 w-16 rounded-full" />
                    <Bone className="h-5 w-20 rounded-full" />
                </div>
            </div>
        ))}
    </div>
);

const NotifList = ({ count = 6 }: { count?: number }) => (
    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-start gap-3">
                <Bone className="w-9 h-9 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                    <Bone className="h-4 w-44" />
                    <Bone className="h-3 w-64" />
                    <Bone className="h-3 w-20" />
                </div>
            </div>
        ))}
    </div>
);

/* ═══════════════════════════════════════════════════
   PAGE-LEVEL SKELETONS
   ═══════════════════════════════════════════════════ */

export const UserDashboardSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2">
                <Bone className="h-7 w-52" />
                <Bone className="h-4 w-40" />
            </div>
            <Bone className="w-12 h-12 rounded-full" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Tasks */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-3">
                <Bone className="h-5 w-32 mb-2" />
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <Bone className="w-5 h-5 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1">
                            <Bone className="h-3.5 w-full" />
                            <Bone className="h-3 w-24" />
                        </div>
                        <Bone className="h-5 w-14 rounded-full shrink-0" />
                    </div>
                ))}
            </div>
            {/* Meetings */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-3">
                <Bone className="h-5 w-40 mb-2" />
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <Bone className="w-9 h-9 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-1">
                            <Bone className="h-3.5 w-36" />
                            <Bone className="h-3 w-24" />
                        </div>
                    </div>
                ))}
            </div>
            {/* Top Employee */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-4">
                <Bone className="h-5 w-36 mb-2" />
                <div className="flex flex-col items-center gap-3">
                    <Bone className="w-20 h-20 rounded-full" />
                    <Bone className="h-5 w-32" />
                    <Bone className="h-4 w-24" />
                    <Bone className="h-8 w-full rounded-xl" />
                </div>
            </div>
        </div>
    </div>
);

export const UserTasksSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-32" /><Bone className="h-4 w-48" /></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <div className="space-y-3">
            <SearchBar />
            <FilterPills count={5} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KanbanColumn />
            <KanbanColumn />
            <KanbanColumn />
        </div>
    </div>
);

export const UserProjectsSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-36" /><Bone className="h-4 w-52" /></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <SearchBar />
        <FilterPills count={5} />
        <CardGrid count={4} cols={2} />
    </div>
);

export const UserMeetingsSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-36" /><Bone className="h-4 w-52" /></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <SearchBar />
        <FilterPills count={5} />
        <CardGrid count={6} cols={3} />
    </div>
);

export const UserDocumentsSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-36" /><Bone className="h-4 w-52" /></div>
            <Bone className="h-10 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <div className="flex gap-3">
            <SearchBar />
            <Bone className="h-10 w-20 rounded-xl shrink-0" />
        </div>
        <FilterPills count={6} />
        <CardGrid count={6} cols={3} />
    </div>
);

export const UserTicketsSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-32" /><Bone className="h-4 w-48" /></div>
            <Bone className="h-10 w-40 rounded-xl" />
        </div>
        <div className="flex gap-2 mb-2">
            <Bone className="h-9 w-32 rounded-xl" />
            <Bone className="h-9 w-44 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <SearchBar />
        <FilterPills count={6} />
        <CardGrid count={6} cols={3} />
    </div>
);

export const UserDemandsSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-32" /><Bone className="h-4 w-48" /></div>
            <Bone className="h-10 w-40 rounded-xl" />
        </div>
        <div className="flex gap-3">
            <Bone className="h-10 flex-1 rounded-xl" />
            <Bone className="h-10 w-40 rounded-xl" />
        </div>
        <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="h-10 w-28 rounded-xl" />)}
        </div>
        <CardGrid count={6} cols={3} />
    </div>
);

export const UserNotificationsSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-2"><Bone className="h-7 w-44" /><Bone className="h-4 w-60" /></div>
            <Bone className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
        </div>
        <div className="flex gap-3 flex-wrap">
            <Bone className="h-10 flex-1 rounded-xl min-w-[200px]" />
            <FilterPills count={3} />
        </div>
        <FilterPills count={8} />
        <NotifList count={8} />
    </div>
);

export const UserProfileSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <Bone className="h-28 w-full rounded-none" />
            <div className="px-6 pb-6 -mt-10 flex items-end justify-between">
                <div className="flex items-end gap-4">
                    <Bone className="w-20 h-20 rounded-full border-4 border-white shrink-0" />
                    <div className="space-y-2 mb-1">
                        <Bone className="h-6 w-36" />
                        <Bone className="h-4 w-24" />
                    </div>
                </div>
                <Bone className="h-9 w-24 rounded-xl mb-1" />
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-3">
                    <Bone className="h-5 w-28" />
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex gap-3">
                            <Bone className="w-4 h-4 rounded mt-0.5 shrink-0" />
                            <div className="flex-1 space-y-1"><Bone className="h-3 w-16" /><Bone className="h-4 w-28" /></div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-3">
                <Bone className="h-5 w-20" />
                <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 9 }).map((_, i) => <Bone key={i} className="h-14 rounded-xl" />)}
                </div>
            </div>
            <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-3">
                    <Bone className="h-5 w-32" />
                    <div className="flex items-center gap-3">
                        <Bone className="w-14 h-14 rounded-full shrink-0" />
                        <div className="space-y-2 flex-1">
                            <Bone className="h-3 w-20" />
                            <Bone className="h-6 w-28" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export const UserMessagesSkeleton = () => (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="w-64 border-r border-gray-100 flex flex-col shrink-0">
            <div className="p-4 border-b border-gray-100 space-y-3">
                <Bone className="h-6 w-28" />
                <Bone className="h-9 w-full rounded-xl" />
            </div>
            <div className="flex-1 p-3 space-y-1">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                        <Bone className="w-8 h-8 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1">
                            <Bone className="h-3 w-24" />
                            <Bone className="h-2.5 w-16" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <div className="flex-1 flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100">
                <Bone className="h-5 w-36" />
            </div>
            <div className="flex-1 p-5 space-y-4">
                {[false, true, false, false, true].map((own, i) => (
                    <div key={i} className={`flex gap-3 ${own ? 'justify-end' : ''}`}>
                        {!own && <Bone className="w-8 h-8 rounded-full shrink-0" />}
                        <div className={`max-w-xs space-y-1 ${own ? 'items-end flex flex-col' : ''}`}>
                            <Bone className={`h-3.5 ${own ? 'w-16' : 'w-20'}`} />
                            <Bone className={`h-10 rounded-2xl ${own ? 'w-44' : 'w-56'}`} />
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
