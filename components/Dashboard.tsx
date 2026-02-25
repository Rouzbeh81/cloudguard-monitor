
import React, { useState, useMemo, useDeferredValue, memo } from 'react';
import { CloudUpdate, SummaryReport } from '../types';
import UpdateCard from './UpdateCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Layers, Activity, ShieldAlert, CheckCircle2, Search, Clock, LucideIcon } from 'lucide-react';

interface DashboardProps {
  updates: CloudUpdate[];
  report: SummaryReport | null;
  loading: boolean;
  lastSynced: string | null;
  onOpenAlerts: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ updates, report, loading, lastSynced, onOpenAlerts }) => {
  // Integrated search and category-based filtering from main with accessibility enhancements.
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Use deferred value for the search query to keep the UI responsive during typing.
  // This allows React to prioritize the search input update over the list filtering.
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const COLORS = ['#2563eb', '#8b5cf6', '#ef4444'];

  // Consolidate stat calculations into a single O(N) pass, memoized for performance.
  // This avoids multiple filter passes when the parent re-renders (e.g., during search).
  const stats = useMemo(() => {
    let gaCount = 0;
    let previewCount = 0;
    let azureCount = 0;
    let m365Count = 0;
    let securityCount = 0;

    for (const u of updates) {
      const cat = u.category.toLowerCase();
      if (cat === 'azure') azureCount++;
      else if (cat === 'm365') m365Count++;
      else if (cat === 'security') securityCount++;

      const status = u.status;
      if (status.includes('Availability')) gaCount++;
      if (status.includes('Preview')) previewCount++;
    }

    return {
      gaCount,
      previewCount,
      azureCount,
      m365Count,
      securityCount,
      chartData: [
        { name: 'Azure', count: azureCount },
        { name: 'M365', count: m365Count },
        { name: 'Security', count: securityCount },
      ]
    };
  }, [updates]);

  const quarterInfo = useMemo(() => {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + 1;
    return `Q${q} ${now.getFullYear()}`;
  }, []);

  const filteredUpdates = useMemo(() => {
    if (!deferredSearchQuery && activeCategory === 'All') return updates;

    const query = deferredSearchQuery.toLowerCase();
    const targetCategory = activeCategory.toLowerCase();

    return updates.filter(update => {
      // 1. Quick category short-circuit to skip expensive search on non-matching categories
      if (targetCategory !== 'all' && update.category.toLowerCase() !== targetCategory) {
        return false;
      }

      // 2. Search check only if query exists and category matched
      if (!query) return true;

      return update.title.toLowerCase().includes(query) ||
             update.description.toLowerCase().includes(query);
    });
  }, [updates, deferredSearchQuery, activeCategory]);

  if (loading && updates.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="lg:col-span-2 h-[600px] bg-slate-200 rounded-xl"></div>
          <div className="h-[600px] bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Layers}
          iconColor="text-blue-600"
          title="Total Updates" 
          value={updates.length} 
          trend="Real-time stream" 
        />
        <StatCard 
          icon={CheckCircle2}
          iconColor="text-green-600"
          title="GA Status" 
          value={stats.gaCount}
          trend="Production ready" 
        />
        <StatCard 
          icon={Activity}
          iconColor="text-purple-600"
          title="In Preview" 
          value={stats.previewCount}
          trend="Roadmap items" 
        />
        <StatCard 
          icon={ShieldAlert}
          iconColor="text-red-600"
          title="Security Hits" 
          value={stats.securityCount}
          trend="High priority" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-lg font-semibold text-slate-900">Recent Announcements</h2>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md uppercase tracking-wider">
                  {quarterInfo}
                </span>
              </div>
              {lastSynced && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <Clock className="w-3 h-3" />
                  Last synced: {new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search updates..."
                aria-label="Search updates"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-64 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {['All', 'Azure', 'M365', 'Security'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={activeCategory === cat}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 ${
                  activeCategory === cat
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredUpdates.length > 0 ? (
              filteredUpdates.map((update) => (
                <UpdateCard key={update.id} update={update} />
              ))
            ) : updates.length > 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-16 text-center shadow-sm">
                <div className="max-w-xs mx-auto">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-slate-900 font-bold mb-1">No matches found</h3>
                  <p className="text-slate-500 text-sm mb-6">We couldn't find any updates matching your current search or category filters.</p>
                  <button
                    onClick={() => {setSearchQuery(''); setActiveCategory('All');}}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700 focus-visible:underline focus:outline-none"
                  >
                    Clear all filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-16 text-center shadow-sm">
                <div className="max-w-xs mx-auto">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-slate-900 font-bold mb-1">No Updates Found</h3>
                  <p className="text-slate-500 text-sm mb-6">We couldn't parse any recent updates. Try refreshing the sync or check your connection.</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700 focus-visible:underline focus:outline-none"
                  >
                    Force Refresh
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Charts/Summary */}
        <div className="space-y-6">
          <DistributionChart data={stats.chartData} />

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldAlert className="w-24 h-24" />
            </div>
            <h3 className="font-bold mb-3 flex items-center gap-2 relative z-10">
              <Activity className="w-5 h-5 text-blue-400" />
              Intelligence Active
            </h3>
            <p className="text-sm opacity-80 leading-relaxed mb-4 relative z-10">
              Real-time monitoring is searching Microsoft 365 and Azure global endpoints for high-impact service changes.
            </p>
            <button 
              onClick={onOpenAlerts}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition-all relative z-10 shadow-lg shadow-blue-900/20"
            >
              Configure Notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  value: number | string;
  trend: string;
}

// Memoized StatCard prevents re-renders when parent state (like search) changes.
// Using stable icon component references instead of JSX elements ensures memoization works effectively.
const StatCard = memo(({ icon: Icon, iconColor, title, value, trend }: StatCardProps) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
    <div className="p-2.5 bg-slate-50 rounded-lg">
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className="flex items-baseline gap-2">
        <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
        <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">{trend}</span>
      </div>
    </div>
  </div>
));

// Memoized DistributionChart skips expensive Recharts re-renders during search/filtering.
const DistributionChart = memo(({ data }: { data: any[] }) => {
  const COLORS = ['#2563eb', '#8b5cf6', '#ef4444'];

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-6 uppercase tracking-wider">Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} allowDecimals={false} />
            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default Dashboard;
