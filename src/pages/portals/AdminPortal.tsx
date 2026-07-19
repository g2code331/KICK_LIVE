import { useState, useEffect } from 'react';
import { 
  Shield, Users, Calendar, Trophy, Newspaper, Settings, Target,
  LogOut, TrendingUp, AlertCircle, CheckCircle, ChevronRight,
  UserPlus, FileText, Activity, Plus, Menu, X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CompetitionWizard from './admin/CompetitionWizard';
import CompetitionEditor from './admin/CompetitionEditor';
import FixturesViewer from './admin/FixturesViewer';
import MatchControlComplete from './admin/MatchControlComplete';
import PlayerCreator from './shared/PlayerCreator';
import MediaPublisher from './shared/MediaPublisher';
import AppSettingsDashboard from './admin/AppSettingsDashboard';
import UserManagement from './admin/UserManagement';
import TeamDashboard from './admin/TeamDashboard';
import TableStatistics from './admin/TableStatistics';
import MultiMatchQueue from './admin/MultiMatchQueue';
import SeasonManagement from './admin/SeasonManagement';

type AdminTab = 'overview' | 'users' | 'matches' | 'teams' | 'media' | 'competitions' | 'tables' | 'settings';

export default function AdminPortal({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [matchesList, setMatchesList] = useState<any[]>([]);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [activityList, setActivityList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [competitionsList, setCompetitionsList] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);
  
  const [isCompetitionWizardOpen, setIsCompetitionWizardOpen] = useState(false);
  const [isCompetitionEditorOpen, setIsCompetitionEditorOpen] = useState(false);
  const [isFixturesViewerOpen, setIsFixturesViewerOpen] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<any>(null);
  const [isPlayerCreatorOpen, setIsPlayerCreatorOpen] = useState(false);
  const [isMediaPublisherOpen, setIsMediaPublisherOpen] = useState(false);
  const [isTeamAdderOpen, setIsTeamAdderOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [isTeamDashboardOpen, setIsTeamDashboardOpen] = useState(false);

  useEffect(() => {
    async function loadAdminData() {
      try {
        // Only fetch data ONCE when component mounts, NOT on every tab change
        const [teams, matches, users, competitions] = await Promise.all([
          supabase.from('teams').select('id, name, short_name, city, primary_color, secondary_color'),
          supabase.from('matches').select('id, home_team_id, away_team_id, home_score, away_score, status, start_time, competition_id').limit(50),
          supabase.from('profiles').select('id, email, username, role, created_at').limit(50),
          supabase.from('competitions').select('id, name, type, season, status, created_at').order('created_at', { ascending: false }).limit(20)
        ]);
        
        setTeamsList(teams.data || []);
        setMatchesList(matches.data || []);
        setUsersList(users.data || []);
        setCompetitionsList(competitions.data || []);
        
        const media = await supabase.from('media').select('id, title, category, image_url, created_at').order('created_at', { ascending: false }).limit(10);
        setMediaList(media.data || []);
        
        const activity = await supabase.from('activity_logs').select('id, action, entity_type, entity_name, created_at, profiles(username)').order('created_at', { ascending: false }).limit(10);
        setActivityList(activity.data || []);
      } catch (err) {
        console.error('Load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
    // Empty dependency array = only runs ONCE on mount
  }, []);

  const handleSignOut = async () => {
    await signOut();
    window.location.hash = '/login';
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminMsg, setAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <Activity size={20} /> },
    { id: 'competitions', label: 'Tournaments', icon: <Trophy size={20} /> },
    { id: 'matches', label: 'Match Center', icon: <Calendar size={20} /> },
    { id: 'teams', label: 'Teams & Squads', icon: <Users size={20} /> },
    { id: 'media', label: 'Media Hub', icon: <Newspaper size={20} /> },
    { id: 'users', label: 'User Control', icon: <Shield size={20} /> },
    { id: 'tables', label: 'Table Statistics', icon: <Target size={20} /> },
    { id: 'settings', label: 'App Settings', icon: <Settings size={20} /> },
  ];

  const logActivity = async (action: string, entityType: string, entityId: number, entityName: string, details?: any) => {
    try {
      await supabase.from('activity_logs').insert([{
        user_id: profile?.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        details: details || {}
      }]);
      const { data: activityData } = await supabase.from('activity_logs').select('*, profiles(username)').order('created_at', { ascending: false }).limit(10);
      setActivityList(activityData || []);
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  };

  const handleDeleteCompetition = async (compId: number, compName: string) => {
    if (!confirm(`Are you sure you want to delete "${compName}"? This will delete all fixtures and cannot be undone!`)) return;
    
    try {
      await supabase.from('matches').delete().eq('competition_id', compId);
      const { error } = await supabase.from('competitions').delete().eq('id', compId);
      if (error) throw error;
      setAdminMsg({ type: 'success', text: 'Tournament deleted successfully!' });
      const { data } = await supabase.from('competitions').select('id, name, type, season, status, created_at').order('created_at', { ascending: false }).limit(20);
      setCompetitionsList(data || []);
      await logActivity('Competition Deleted', 'competition', compId, compName);
    } catch (err: any) {
      setAdminMsg({ type: 'error', text: 'Error: ' + err.message });
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E13] flex">
      {/* Admin Toast */}
      {adminMsg && (
        <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl font-bold text-sm max-w-sm animate-in slide-in-from-right-4 duration-300 ${
          adminMsg.type === 'success' ? 'bg-brand-green/20 border-brand-green/40' : 'bg-red-500/20 border-red-500/40'
        }`}>
          {adminMsg.type === 'success' ? '✅' : '❌'} {adminMsg.text}
        </div>
      )}
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 glass border-r border-white/10 p-6 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 gradient-green rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-black" />
          </div>
          <span className="font-black italic uppercase tracking-tighter text-lg">Admin<span className="text-[#39FF14]">Panel</span></span>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as AdminTab);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                activeTab === item.id ? 'bg-[#39FF14]/10 text-[#39FF14]' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-white/10">
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-brand-red hover:bg-brand-red/10 transition-all font-bold text-sm">
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-12 pb-32">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 lg:mb-12">
          <div className="flex items-center gap-4">
            {/* Hamburger – visible on mobile only */}
            <button
              className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-2xl lg:text-4xl font-black italic uppercase tracking-tighter">System <span className="text-[#39FF14]">Dashboard</span></h1>
              <p className="text-white/40 text-xs lg:text-sm mt-1">Real-time infrastructure management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsCompetitionWizardOpen(true)}
               className="gradient-green text-black px-4 lg:px-6 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:scale-105 transition-transform"
             >
               <Plus size={16} /> New Tournament
             </button>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Users', value: usersList.length, icon: <Users />, color: 'blue', tab: 'users' as AdminTab },
                { label: 'Active Matches', value: matchesList.filter((m: any) => m.status === 'live').length, icon: <Activity />, color: 'green', tab: 'matches' as AdminTab },
                { label: 'Tournaments', value: competitionsList.length, icon: <Trophy />, color: 'yellow', tab: 'competitions' as AdminTab },
                { label: 'Media Posts', value: mediaList.length, icon: <FileText />, color: 'purple', tab: 'media' as AdminTab },
              ].map((stat, i) => (
                <div 
                  key={i} 
                  onClick={() => setActiveTab(stat.tab)}
                  className="glass p-6 rounded-3xl border border-white/5 cursor-pointer hover:border-brand-green/30 hover:bg-brand-green/5 transition-all group"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-500/20 text-${stat.color}-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    {stat.icon}
                  </div>
                  <p className="text-3xl font-black italic">{stat.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-black italic uppercase tracking-widest text-sm">System Activity</h3>
                  <TrendingUp size={16} className="text-[#39FF14]" />
                </div>
                <div className="p-4 space-y-2">
                   {activityList.length > 0 ? activityList.map((log, i) => (
                     <div key={i} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                          {log.action?.includes('Update') ? <Settings size={16} /> : <Plus size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white/80">{log.action} <span className="text-[#39FF14]">{log.entity_name}</span></p>
                          <p className="text-[10px] text-white/30 uppercase mt-1 font-bold">{log.profiles?.username} • {new Date(log.created_at).toLocaleTimeString()}</p>
                        </div>
                     </div>
                   )) : (
                     <p className="p-8 text-center text-white/20 text-xs font-bold uppercase tracking-widest">No recent activity</p>
                   )}
                </div>
              </div>

              <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-black italic uppercase tracking-widest text-sm">Live Infrastructure</h3>
                  <Target size={16} className="text-brand-blue" />
                </div>
                <div className="p-8 space-y-6">
                   {[
                     { name: 'API Server', status: 'Online', color: 'green' },
                     { name: 'Database Instance', status: 'Healthy', color: 'green' },
                     { name: 'Storage Engine', status: 'Online', color: 'green' },
                     { name: 'Real-time Sync', status: 'Connected', color: 'green' },
                   ].map((sys, i) => (
                     <div key={i} className="flex items-center justify-between">
                       <span className="text-sm font-bold text-white/60">{sys.name}</span>
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{sys.status}</span>
                         <div className={`w-2 h-2 rounded-full bg-brand-${sys.color} animate-pulse`}></div>
                       </div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'competitions' && (
          <div className="space-y-6 animate-in">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {competitionsList.map((comp) => (
                  <div key={comp.id} className="glass rounded-[2rem] p-8 border border-white/10 flex flex-col hover:border-[#39FF14]/30 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-[#39FF14]/10 rounded-2xl flex items-center justify-center text-[#39FF14]">
                        <Trophy size={24} />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        comp.status === 'live' ? 'bg-[#39FF14] text-black' : 'bg-white/10 text-white/40'
                      }`}>
                        {comp.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2 group-hover:text-[#39FF14] transition-colors">{comp.name}</h3>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-6">{comp.type} • {comp.season}</p>
                    
                    <div className="mt-auto grid grid-cols-3 gap-2 pt-6 border-t border-white/5">
                      <button 
                        onClick={() => {
                          setSelectedCompetition(comp);
                          setIsFixturesViewerOpen(true);
                        }}
                        className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-[10px] font-black uppercase tracking-widest"
                      >
                        Fixtures
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedCompetition(comp);
                          setIsCompetitionEditorOpen(true);
                        }}
                        className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-[10px] font-black uppercase tracking-widest"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteCompetition(comp.id, comp.name)}
                        className="p-3 bg-brand-red/10 rounded-xl hover:bg-brand-red/20 text-brand-red transition-colors text-[10px] font-black uppercase tracking-widest"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="animate-in">
            <MultiMatchQueue />
          </div>
        )}
        {activeTab === 'media' && (
          <div className="animate-in">
            <div className="glass rounded-[2rem] p-8 border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter">Media <span className="text-[#39FF14]">Hub</span></h2>
                  <p className="text-white/40 text-sm">Manage all media content and publications</p>
                </div>
                <button 
                  onClick={() => setIsMediaPublisherOpen(true)}
                  className="gradient-green text-black px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2"
                >
                  <Plus size={16} /> New Article
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mediaList.length > 0 ? mediaList.map((item: any) => (
                  <div key={item.id} className="glass rounded-2xl overflow-hidden group cursor-pointer">
                    <div className="h-40 overflow-hidden">
                      <img src={item.image_url || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400'} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="p-5">
                      <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">{item.category || 'News'}</span>
                      <h3 className="font-bold mt-2 line-clamp-2">{item.title}</h3>
                      <p className="text-xs text-white/40 mt-2 line-clamp-2">{item.excerpt || 'No excerpt'}</p>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                        <span className="text-[10px] text-white/30">{new Date(item.created_at).toLocaleDateString()}</span>
                        <button className="text-[10px] font-bold text-purple-500 hover:underline">Edit</button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full text-center py-20">
                    <Newspaper size={64} className="mx-auto text-white/10 mb-4" />
                    <p className="text-white/30 font-bold uppercase tracking-widest">No media posts yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'teams' && <TeamDashboard />}
        {activeTab === 'tables' && <TableStatistics />}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            <AppSettingsDashboard isOpen={true} onClose={() => setActiveTab('overview')} />
            <SeasonManagement />
          </div>
        )}

      </main>

      {/* Modals & Wizards */}
      {isCompetitionWizardOpen && <CompetitionWizard isOpen={isCompetitionWizardOpen} onClose={() => setIsCompetitionWizardOpen(false)} />}
      {isCompetitionEditorOpen && <CompetitionEditor competition={selectedCompetition} isOpen={isCompetitionEditorOpen} onClose={() => setIsCompetitionEditorOpen(false)} onUpdate={() => {}} />}
      {isFixturesViewerOpen && <FixturesViewer competition={selectedCompetition} isOpen={isFixturesViewerOpen} onClose={() => setIsFixturesViewerOpen(false)} />}
      {isPlayerCreatorOpen && <PlayerCreator isOpen={isPlayerCreatorOpen} onClose={() => setIsPlayerCreatorOpen(false)} />}
      {isMediaPublisherOpen && <MediaPublisher isOpen={isMediaPublisherOpen} onClose={() => setIsMediaPublisherOpen(false)} />}
      {isSettingsOpen && <AppSettingsDashboard isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}
