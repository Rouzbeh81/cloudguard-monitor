
import React from 'react';
import { CloudUpdate, SummaryReport } from '../types';
import UpdateCard from './UpdateCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Layers, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  updates: CloudUpdate[];
  report: SummaryReport | null;
  loading: boolean;
  onOpenAlerts: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ updates, report, loading, onOpenAlerts }) => {
  const getCategoryCount = (cat: string) => 
    updates.filter(u => u.category.toLowerCase() === cat.toLowerCase()).length;

  const chartData = [
    { name: 'Azure', count: getCategoryCount('Azure') },
    { name: 'M365', count: getCategoryCount('M365') },
    { name: 'Security', count: getCategoryCount('Security') },
  ];

  const COLORS = ['#2563eb', '#8b5cf6', '#ef4444'];

  if (loading) {
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
          icon={<Layers className="text-blue-600" />} 
          title="Total Updates" 
          value={updates.length} 
          trend="Real-time stream" 
        />
        <StatCard 
          icon={<CheckCircle2 className="text-green-600" />} 
          title="GA Status" 
          value={updates.filter(u => u.status.includes('Availability')).length} 
          trend="Production ready" 
        />
        <StatCard 
          icon={<Activity className="text-purple-600" />} 
          title="In Preview" 
          value={updates.filter(u => u.status.includes('Preview')).length} 
          trend="Roadmap items" 
        />
        <StatCard 
          icon={<ShieldAlert className="text-red-600" />} 
          title="Security Hits" 
          value={getCategoryCount('Security')} 
          trend="High priority" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-slate-900">Recent Announcements</h2>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cloud Roadmap</span>
          </div>
          <div className="space-y-4">
            {updates.length > 0 ? (
              updates.map((update) => (
                <UpdateCard key={update.id} update={update} />
              ))
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
                    className="text-sm font-bold text-blue-600 hover:text-blue-700"
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
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-6 uppercase tracking-wider">Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} allowDecimals={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

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
  icon: React.ReactNode;
  title: string;
  value: number | string;
  trend: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, trend }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
    <div className="p-2.5 bg-slate-50 rounded-lg">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className="flex items-baseline gap-2">
        <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
        <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">{trend}</span>
      </div>
    </div>
  </div>
);

export default Dashboard;
