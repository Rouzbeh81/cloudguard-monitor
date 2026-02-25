
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import SummaryModal from './components/SummaryModal';
import AlertsModal from './components/AlertsModal';
import { fetchCloudUpdates } from './services/intelligenceService';
import { SummaryReport, AppState } from './types';
import { RefreshCw, Mail, AlertCircle, LayoutDashboard, Sparkles, Send } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    updates: [],
    loading: false,
    error: null,
    report: null
  });

  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [automationTriggered, setAutomationTriggered] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  const checkApiKey = useCallback(() => {
    const stored = localStorage.getItem('cloudguard_alerts');
    const hasGeminiEnv = !!process.env.API_KEY && process.env.API_KEY !== "undefined";
    const hasGroqEnv = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "undefined";

    if (!stored) {
      setApiKeyMissing(!(hasGeminiEnv || hasGroqEnv));
      return hasGeminiEnv || hasGroqEnv;
    }

    try {
      const settings = JSON.parse(stored);
      const defaultProvider = hasGroqEnv && !hasGeminiEnv ? 'groq' : 'gemini';
      const provider = settings.aiProvider || defaultProvider;
      const key = provider === 'gemini'
        ? (settings.geminiApiKey || (hasGeminiEnv ? process.env.API_KEY : undefined))
        : (settings.groqApiKey || (hasGroqEnv ? process.env.GROQ_API_KEY : undefined));

      setApiKeyMissing(!key);
      return !!key;
    } catch (e) {
      setApiKeyMissing(!(hasGeminiEnv || hasGroqEnv));
      return hasGeminiEnv || hasGroqEnv;
    }
  }, []);

  const loadData = useCallback(async (isAutomated = false) => {
    const stored = localStorage.getItem('cloudguard_alerts');
    let settings: any = {};
    if (stored) {
      try { settings = JSON.parse(stored); } catch (e) {}
    }

    if (!checkApiKey()) {
      const msg = settings.aiProvider === 'groq' ? "Groq API Key is missing." : "Gemini API Key is missing.";
      setState(prev => ({ ...prev, error: `${msg} Please configure it in settings.` }));
      return;
    }

    const hasGeminiEnv = !!process.env.API_KEY && process.env.API_KEY !== "undefined";
    const hasGroqEnv = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "undefined";
    const defaultProvider = hasGroqEnv && !hasGeminiEnv ? 'groq' : 'gemini';

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Always pass both keys (from settings OR env) to enable transparent fallback in the service layer
      const report = await fetchCloudUpdates({
        provider: settings.aiProvider || defaultProvider,
        geminiKey: settings.geminiApiKey || (hasGeminiEnv ? process.env.API_KEY : undefined),
        groqKey: settings.groqApiKey || (hasGroqEnv ? process.env.GROQ_API_KEY : undefined)
      });

      const syncTime = new Date().toISOString();
      localStorage.setItem('cloudguard_cache', JSON.stringify({
        report,
        lastSynced: syncTime
      }));
      setLastSynced(syncTime);

      setState({
        updates: report.keyUpdates,
        report,
        loading: false,
        error: null
      });
      if (isAutomated) {
        setAutomationTriggered(true);
      }
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message || "An unexpected error occurred."
      }));
    }
  }, []);

  const handleSendEmail = (isAutoRun = false) => {
    if (!state.report) return;
    
    const stored = localStorage.getItem('cloudguard_alerts');
    let recipient = "";
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        recipient = settings.recipientEmail || "";
      } catch (e) {}
    }

    // Security: Sanitize recipient to prevent mail header injection or malicious protocol usage
    // We remove CRLF, and query characters that could allow parameter injection.
    const sanitizedRecipient = recipient.trim().replace(/[\r\n?&]/g, '');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const finalRecipient = emailRegex.test(sanitizedRecipient) ? sanitizedRecipient : "";

    // Handmatige datum formattering naar DD-MM-YYYY
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    const subject = encodeURIComponent(`CloudGuard Intelligence Digest - ${formattedDate}`);
    const body = encodeURIComponent(
      `EXECUTIVE SUMMARY:\n${state.report.executiveSummary}\n\n` +
      `LATEST UPDATES:\n` +
      state.report.keyUpdates.map(u => `- [${u.category}] ${u.title} (${u.status})`).join('\n') +
      `\n\nTo view technical sources and charts, please visit your CloudGuard Dashboard.`
    );
    
    // Mark as sent in automation
    if (isAutoRun) {
      localStorage.setItem('cloudguard_last_digest', new Date().toDateString());
      setAutomationTriggered(false);
    }

    window.location.href = `mailto:${finalRecipient}?subject=${subject}&body=${body}`;
  };

  // Cache Loader & Automated Schedule Checker
  useEffect(() => {
    const cached = localStorage.getItem('cloudguard_cache');
    if (cached) {
      try {
        const { report, lastSynced: cachedTime } = JSON.parse(cached);
        if (report && report.keyUpdates) {
          setState(prev => ({
            ...prev,
            updates: report.keyUpdates,
            report
          }));
          setLastSynced(cachedTime);
        }
      } catch (e) {
        console.error("Failed to load cache", e);
      }
    }

    checkApiKey();
    const checkSchedule = () => {
      const storedAlerts = localStorage.getItem('cloudguard_alerts');
      if (!storedAlerts) {
        loadData(); // No settings yet, but try default/env key
        return;
      }

      let settings: any = {};
      try { settings = JSON.parse(storedAlerts); } catch(e) {}

      const lastRun = localStorage.getItem('cloudguard_last_digest');
      const today = new Date().toDateString();
      const currentHour = new Date().getHours();

      // If it's a new day and past 8 AM (8-23)
      if (settings.dailyEmail && lastRun !== today && currentHour >= 8) {
        loadData(true);
      } else {
        // If we don't have updates yet (even from cache), or if cache is old (> 1 hour), sync
        const hasUpdates = !!(cached && JSON.parse(cached).report);
        const cacheAge = cached ? (Date.now() - new Date(JSON.parse(cached).lastSynced).getTime()) : Infinity;

        if (!hasUpdates || cacheAge > 3600000) {
          loadData();
        }
      }
    };

    checkSchedule();
  }, [loadData, checkApiKey]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Automation Banner */}
        {automationTriggered && state.report && (
          <div className="mb-6 bg-indigo-600 rounded-2xl p-4 shadow-xl shadow-indigo-200 border border-indigo-500 animate-in slide-in-from-top duration-500 flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-indigo-100" />
              </div>
              <div>
                <p className="font-bold">Daily Intelligence Digest Ready</p>
                <p className="text-xs text-indigo-100">The 8:00 AM automated scan has completed successfully.</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setAutomationTriggered(false)}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-xl transition-colors"
              >
                Dismiss
              </button>
              <button 
                onClick={() => handleSendEmail(true)}
                className="flex-1 sm:flex-none px-6 py-2 bg-white text-indigo-600 font-bold text-sm rounded-xl shadow-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Dispatch to Email
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cloud Intelligence Dashboard</h1>
            <p className="text-slate-500">Real-time monitoring for Azure & Microsoft 365</p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => loadData()}
              disabled={state.loading}
              className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${state.loading ? 'animate-spin' : ''}`} />
              {state.loading ? 'Syncing...' : 'Sync Now'}
            </button>
            <button 
              onClick={() => setIsSummaryOpen(true)}
              disabled={!state.report || state.loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm shadow-blue-200"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Intelligence Digest
            </button>
            <button 
              onClick={() => handleSendEmail(false)}
              disabled={!state.report || state.loading}
              className="inline-flex items-center px-4 py-2 bg-slate-900 rounded-lg text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Mail className="w-4 h-4 mr-2" />
              Manual Brief
            </button>
          </div>
        </div>

        {state.error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Intelligence Sync Issue</p>
                <p className="text-sm opacity-90">{state.error}</p>
              </div>
            </div>
            <button
              onClick={() => setIsAlertsOpen(true)}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              {apiKeyMissing ? 'Configure Key' : 'Adjust Settings'}
            </button>
          </div>
        )}

        <Dashboard 
          updates={state.updates} 
          report={state.report} 
          loading={state.loading}
          lastSynced={lastSynced}
          onOpenAlerts={useCallback(() => setIsAlertsOpen(true), [])}
        />
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-500">
            &copy; 2026 CloudGuard Intelligence Agent. Designed & Developed by Rouzbeh.
          </p>
        </div>
      </footer>

      {isSummaryOpen && state.report && (
        <SummaryModal 
          report={state.report} 
          onClose={() => setIsSummaryOpen(false)} 
        />
      )}

      {isAlertsOpen && (
        <AlertsModal 
          onClose={() => {
            setIsAlertsOpen(false);
            checkApiKey();
          }}
        />
      )}
    </div>
  );
};

export default App;
