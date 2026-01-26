
import React, { useState, useEffect } from 'react';
import { X, Bell, Mail, Shield, CheckCircle, User, Key, ExternalLink } from 'lucide-react';

interface AlertsModalProps {
  onClose: () => void;
}

const AlertsModal: React.FC<AlertsModalProps> = ({ onClose }) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    recipientEmail: '',
    aiProvider: 'gemini' as 'gemini' | 'groq',
    geminiApiKey: '',
    groqApiKey: '',
    dailyEmail: true,
    securityAlerts: true,
    browserPush: false,
    m365Updates: true,
    azureUpdates: true
  });

  useEffect(() => {
    const stored = localStorage.getItem('cloudguard_alerts');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem('cloudguard_alerts', JSON.stringify(settings));
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  const Toggle = ({ id, label, description, icon: Icon }: any) => (
    <div className="flex items-start justify-between py-4 border-b border-slate-100 last:border-0">
      <div className="flex gap-3">
        <div className="mt-1 p-2 bg-slate-50 rounded-lg text-slate-500">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <label htmlFor={id} className="text-sm font-bold text-slate-900 block">{label}</label>
          <span className="text-xs text-slate-500">{description}</span>
        </div>
      </div>
      <button
        id={id}
        onClick={() => setSettings(s => ({ ...s, [id]: !s[id as keyof typeof settings] }))}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings[id as keyof typeof settings] ? 'bg-blue-600' : 'bg-slate-200'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings[id as keyof typeof settings] ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-900">Configure Notification Alerts</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="mb-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Intelligence Provider</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setSettings(s => ({ ...s, aiProvider: 'gemini' }))}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${settings.aiProvider === 'gemini' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                Google Gemini
              </button>
              <button
                onClick={() => setSettings(s => ({ ...s, aiProvider: 'groq' }))}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${settings.aiProvider === 'groq' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                Groq (Llama)
              </button>
            </div>

            {settings.aiProvider === 'gemini' ? (
              <>
                <div className="relative mb-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    placeholder="Enter Gemini API Key"
                    value={settings.geminiApiKey}
                    onChange={(e) => setSettings(s => ({ ...s, geminiApiKey: e.target.value }))}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white shadow-sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 italic font-medium text-blue-600">Recommended: Best for live web search grounding.</p>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 shrink-0 ml-4"
                  >
                    Get Gemini key <ExternalLink className="w-2 h-2" />
                  </a>
                </div>
              </>
            ) : (
              <>
                <div className="relative mb-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    placeholder="Enter Groq API Key"
                    value={settings.groqApiKey}
                    onChange={(e) => setSettings(s => ({ ...s, groqApiKey: e.target.value }))}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white shadow-sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 italic font-medium text-orange-600">Free Alternative: Great fallback if Gemini quota is exhausted.</p>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 shrink-0 ml-4"
                  >
                    Get Groq key <ExternalLink className="w-2 h-2" />
                  </a>
                </div>
              </>
            )}
          </div>

          <div className="mb-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Destination Settings</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="email"
                placeholder="Enter your email address"
                value={settings.recipientEmail}
                onChange={(e) => setSettings(s => ({ ...s, recipientEmail: e.target.value }))}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white shadow-sm"
              />
            </div>
            <p className="mt-2 text-[10px] text-slate-400 italic">This address will be used for all automated and manual email reports.</p>
          </div>

          <div className="space-y-1 mb-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Delivery Methods</label>
            <Toggle 
              id="dailyEmail" 
              label="Daily Intelligence Digest" 
              description="Receive a summarized email every morning at 8:00 AM." 
              icon={Mail}
            />
            <Toggle 
              id="securityAlerts" 
              label="High Priority Security" 
              description="Instant alerts for critical security patches and EOL services." 
              icon={Shield}
            />
            <Toggle 
              id="browserPush" 
              label="Push Notifications" 
              description="Get browser notifications as updates are published." 
              icon={Bell}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${saved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'}`}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : saved ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Settings Saved
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertsModal;
