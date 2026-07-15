import { useState } from 'react';
import { X, User, Mail, Smartphone, Shield, LogOut, Camera, Save, Key, Bell, Globe } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

interface ProfileDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDashboard({ isOpen, onClose }: ProfileDashboardProps) {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'notifications'>('account');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-bg/95 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl glass rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[80vh] animate-in slide-in-from-right-8 duration-500">
        
        {/* Profile Sidebar */}
        <div className="flex h-full">
           <aside className="w-64 bg-white/5 border-r border-white/10 p-8 flex flex-col">
              <div className="flex flex-col items-center text-center mb-10">
                 <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-brand-green/20 flex items-center justify-center text-3xl font-black text-brand-green border-2 border-brand-green/30">
                       {profile?.username?.[0] || 'U'}
                    </div>
                    <button className="absolute bottom-0 right-0 w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-black border-4 border-brand-bg opacity-0 group-hover:opacity-100 transition-all">
                       <Camera size={14} />
                    </button>
                 </div>
                 <h3 className="mt-4 font-black uppercase italic tracking-tighter text-lg">{profile?.username}</h3>
                 <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mt-1">{profile?.role.replace('_', ' ')}</p>
              </div>

              <nav className="flex-1 space-y-2">
                 {[
                    { id: 'account', label: 'Account Info', icon: <User size={18} /> },
                    { id: 'security', label: 'Security', icon: <Key size={18} /> },
                    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
                 ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                      activeTab === tab.id ? 'bg-brand-green/10 text-brand-green' : 'text-white/40 hover:text-white'
                    }`}>
                       {tab.icon} {tab.label}
                    </button>
                 ))}
              </nav>

              <button 
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-brand-red hover:bg-brand-red/10 transition-all text-sm font-bold mt-auto"
              >
                 <LogOut size={18} /> Sign Out
              </button>
           </aside>

           {/* Main Content Area */}
           <main className="flex-1 overflow-y-auto no-scrollbar p-10">
              <div className="flex justify-between items-start mb-10">
                 <div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">
                       {activeTab === 'account' ? 'Account Settings' : activeTab === 'security' ? 'Security & Privacy' : 'Notification Prefs'}
                    </h2>
                    <p className="text-xs text-white/30 uppercase tracking-widest font-bold mt-1">Manage your digital identity</p>
                 </div>
                 <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X /></button>
              </div>

              {activeTab === 'account' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><User size={12}/> Username</label>
                          <input type="text" defaultValue={profile?.username} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-green/50" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Smartphone size={12}/> Telephone</label>
                          <input type="text" defaultValue={profile?.phone} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-green/50" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Mail size={12}/> Email Address</label>
                       <input type="email" disabled defaultValue={profile?.email} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm opacity-50 cursor-not-allowed" />
                    </div>
                    <div className="p-6 rounded-2xl bg-brand-blue/5 border border-brand-blue/10 flex items-center gap-4">
                       <Globe className="text-brand-blue" size={24} />
                       <div>
                          <p className="text-xs font-black uppercase italic text-brand-blue">Global Reach</p>
                          <p className="text-[10px] text-white/40">Your profile is visible across the KickLive ecosystem.</p>
                       </div>
                    </div>
                    <button className="flex items-center gap-2 bg-brand-green text-black px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-opacity">
                       <Save size={16} /> Save Changes
                    </button>
                 </div>
              )}

              {activeTab === 'security' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-6">
                       <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green"><Shield size={20}/></div>
                             <div>
                                <p className="text-sm font-bold">Two-Factor Authentication</p>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest">Recommended</p>
                             </div>
                          </div>
                          <div className="w-12 h-6 bg-white/10 rounded-full relative"><div className="absolute left-1 top-1 w-4 h-4 bg-white/40 rounded-full"></div></div>
                       </div>
                       <div className="space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-widest text-white/20">Change Password</h4>
                          <input type="password" placeholder="Current Password" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm" />
                          <input type="password" placeholder="New Password" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm" />
                          <button className="bg-white/5 text-white/40 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10">Update Password</button>
                       </div>
                    </div>
                 </div>
              )}
           </main>
        </div>

      </div>
    </div>
  );
}
