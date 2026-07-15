import { useState } from 'react';
import { X, Settings, Database, Shield, Zap, Globe, Cpu, Smartphone, Moon, Sun, Lock, Trophy } from 'lucide-react';

interface AppSettingsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppSettingsDashboard({ isOpen, onClose }: AppSettingsDashboardProps) {
  const [toggles, setToggles] = useState({
    liveStreaming: true,
    predictions: true,
    userComments: true,
    notifications: true,
    maintenanceMode: false,
    darkMode: true,
    registrationOpen: true,
    dataAutoSync: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApply = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onClose();
      alert('Settings applied successfully!');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-bg/95 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative w-full max-w-6xl glass rounded-[3.5rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-[90vh] animate-in fade-in scale-95 duration-500">
        
        {/* Header */}
        <div className="p-10 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
               <Settings className="text-white/40" size={32} />
            </div>
            <div>
               <h2 className="text-4xl font-black italic uppercase tracking-tighter">System Settings</h2>
               <p className="text-xs text-white/40 uppercase tracking-[0.3em] font-bold">Global Application Configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 glass rounded-full flex items-center justify-center hover:bg-white/10 transition-all"><X /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Main Toggle Section */}
            <div className="lg:col-span-8 space-y-12">
               <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-green mb-8 flex items-center gap-2">
                     <Cpu size={14} /> Core Functionality
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {[
                        { id: 'liveStreaming', label: 'Live Stats Broadcast', icon: <Zap size={20} />, desc: 'Enable real-time match data syncing' },
                        { id: 'predictions', label: 'Fan Predictions', icon: <Trophy size={20} />, desc: 'Allow users to predict match outcomes' },
                        { id: 'userComments', label: 'Community Chat', icon: <Globe size={20} />, desc: 'Enable public match commentary' },
                        { id: 'registrationOpen', label: 'New Registrations', icon: <Smartphone size={20} />, desc: 'Allow new users to create accounts' },
                     ].map(item => (
                        <div key={item.id} className="p-6 glass-light rounded-3xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-all group">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-brand-green transition-colors">
                                 {item.icon}
                              </div>
                              <div>
                                 <p className="font-black uppercase italic text-sm tracking-tight">{item.label}</p>
                                 <p className="text-[10px] text-white/20">{item.desc}</p>
                              </div>
                           </div>
                           <button 
                             onClick={() => handleToggle(item.id as keyof typeof toggles)}
                             className={`w-12 h-6 rounded-full relative transition-all duration-300 ${toggles[item.id as keyof typeof toggles] ? 'bg-brand-green' : 'bg-white/10'}`}
                           >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all duration-300 ${toggles[item.id as keyof typeof toggles] ? 'right-1' : 'left-1'}`}></div>
                           </button>
                        </div>
                     ))}
                  </div>
               </div>

               <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-red mb-8 flex items-center gap-2">
                     <Shield size={14} /> Security & Database
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {[
                        { id: 'maintenanceMode', label: 'Maintenance Mode', icon: <Lock size={20} />, desc: 'Lock the app for emergency updates' },
                        { id: 'dataAutoSync', label: 'Cloud Auto-Backup', icon: <Database size={20} />, desc: 'Real-time database mirroring' },
                     ].map(item => (
                        <div key={item.id} className="p-6 glass-light rounded-3xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-all group">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-brand-red transition-colors">
                                 {item.icon}
                              </div>
                              <div>
                                 <p className="font-black uppercase italic text-sm tracking-tight">{item.label}</p>
                                 <p className="text-[10px] text-white/20">{item.desc}</p>
                              </div>
                           </div>
                           <button 
                             onClick={() => handleToggle(item.id as keyof typeof toggles)}
                             className={`w-12 h-6 rounded-full relative transition-all duration-300 ${toggles[item.id as keyof typeof toggles] ? 'bg-brand-red' : 'bg-white/10'}`}
                           >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all duration-300 ${toggles[item.id as keyof typeof toggles] ? 'right-1' : 'left-1'}`}></div>
                           </button>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* Sidebar Config */}
            <div className="lg:col-span-4 space-y-8">
               <div className="p-8 rounded-[2.5rem] bg-brand-blue/10 border border-brand-blue/20">
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-blue mb-4">UI Preferences</h4>
                  <div className="flex gap-4">
                     <button 
                       onClick={() => handleToggle('darkMode')}
                       className={`flex-1 p-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${toggles.darkMode ? 'border-brand-blue bg-brand-blue/10' : 'border-white/5 opacity-40'}`}>
                        <Moon size={24} />
                        <span className="text-[10px] font-bold uppercase">Dark Mode</span>
                     </button>
                     <button 
                       onClick={() => handleToggle('darkMode')}
                       className={`flex-1 p-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${!toggles.darkMode ? 'border-brand-blue bg-white/10' : 'border-white/5 opacity-40'}`}>
                        <Sun size={24} />
                        <span className="text-[10px] font-bold uppercase">Light Mode</span>
                     </button>
                  </div>
               </div>

               <div className="glass p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-white/40">API Status</h4>
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-white/20">Supabase</span>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-brand-green"></div>
                           <span className="text-[10px] font-black text-brand-green">ONLINE</span>
                        </div>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-white/20">Vercel Edge</span>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-brand-green"></div>
                           <span className="text-[10px] font-black text-brand-green">STABLE</span>
                        </div>
                     </div>
                  </div>
                  <button className="w-full py-4 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                     View System Logs
                  </button>
               </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-10 bg-white/5 border-t border-white/10 flex items-center justify-between">
           <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Version 1.0.4-stable • Build 202505</div>
           <div className="flex gap-4">
              <button onClick={onClose} className="px-8 py-3 rounded-xl font-bold text-sm text-white/40 hover:text-white">Close</button>
              <button 
                onClick={handleApply}
                disabled={isSaving}
                className="px-10 py-3 rounded-xl gradient-green text-black font-black uppercase tracking-widest text-sm shadow-xl shadow-brand-green/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Applying...
                  </>
                ) : 'Apply Settings'}
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}
