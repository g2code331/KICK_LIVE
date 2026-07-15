import { useState, useEffect } from 'react';
import { 
  Shield, Users, Calendar, Trophy, Newspaper, Settings, Target,
  LogOut, TrendingUp, AlertCircle, CheckCircle, ChevronRight,
  UserPlus, FileText, Activity, Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CompetitionWizard from './admin/CompetitionWizard';
import CompetitionEditor from './admin/CompetitionEditor';
import FixturesViewer from './admin/FixturesViewer';
import TableStatistics from './admin/TableStatistics';
import MatchControlComplete from './admin/MatchControlComplete';
import UserManagement from './admin/UserManagement';
import PlayerCreator from './shared/PlayerCreator';
import MediaPublisher from './shared/MediaPublisher';
import TeamAdder from './admin/TeamAdder';
import TeamDashboard from './admin/TeamDashboard';
import AppSettingsDashboard from './admin/AppSettingsDashboard';

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
        const [teams, matches, users, competitions] = await Promise.all([
          supabase.from('teams').select('*'),
          supabase.from('matches').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('competitions').select('*').order('created_at', { ascending: false })
        ]);
        
        setTeamsList(teams.data || []);
        setMatchesList(matches.data || []);
        setUsersList(users.data || []);
        setCompetitionsList(competitions.data || []);
        
        // Load media posts
        const media = await supabase.from('media').select('*').order('created_at', { ascending: false }).limit(10);
        setMediaList(media.data || []);
        
        // Load activity logs
        const activity = await supabase.from('activity_logs').select('*, profiles(username)').order('created_at', { ascending: false }).limit(10);
        setActivityList(activity.data || []);
      } catch (err) {
        console.error('Load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, [activeTab, isTeamAdderOpen, isCompetitionWizardOpen, isMediaPublisherOpen]);

  const handleSignOut = async () => {
    await signOut();
    onNavigate('login');
  };

  const handleDeleteCompetition = async (compId: number, compName: string) => {
    if (!confirm(`Delete competition "${compName}"? This will also delete all associated matches. This cannot be undone!`)) return;
    
    try {
      await supabase.from('matches').delete().eq('competition_id', compId);
      const { error } = await supabase.from('competitions').delete().eq('id', compId);
      
      if (error) throw error;
      
      alert('Competition deleted successfully!');
      // Reload competitions
      const { data } = await supabase.from('competitions').select('*').order('created_at', { ascending: false });
      setCompetitionsList(data || []);
    } catch (err: any) {
      alert('Error deleting competition: ' + err.message);
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B0E13] flex">
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-[200] p-3 glass rounded-xl border border-white/10"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/80 z-[150]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 glass border-r border-white/10 p-6 flex flex-col fixed lg:static inset-y-0 left-0 z-[160] transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 gradient-green rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-black" />
          </div>
          <div>
            <h1 className="font-black text-sm uppercase tracking-tight">Admin Portal</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Full Access</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'overview', label: 'Overview', icon: <TrendingUp size={20} /> },
            { id: 'users', label: 'User Management', icon: <Users size={20} /> },
            { id: 'competitions', label: 'Competitions', icon: <Trophy size={20} /> },
            { id: 'tables', label: 'Table Statistics', icon: <Target size={20} /> },
            { id: 'teams', label: 'Team Management', icon: <Trophy size={20} /> },
            { id: 'matches', label: 'Match Control', icon: <Calendar size={20} /> },
            { id: 'media', label: 'Media Center', icon: <Newspaper size={20} /> },
            { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => item.id === 'settings' ? setIsSettingsOpen(true) : setActiveTab(item.id as AdminTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                activeTab === item.id ? 'bg-[#39FF14]/10 text-[#39FF14]' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon}
              <span className="text-sm font-bold">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-[#39FF14]/20 flex items-center justify-center text-[#39FF14] font-bold">
              {profile?.username?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{profile?.username || 'Admin'}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Administrator</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all">
            <LogOut size={20} />
            <span className="text-sm font-bold">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-auto pt-20 lg:pt-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Dashboard Overview</h2>
              <p className="text-white/40">Welcome back, {profile?.username || 'Admin'}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <button onClick={() => setActiveTab('users')} className="glass rounded-2xl p-6 text-left hover:scale-[1.02] hover:bg-white/[0.04] transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                    <Users size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2 py-1 rounded">
                    REGISTERED
                  </span>
                </div>
                <p className="text-3xl font-black italic">{usersList.length}</p>
                <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Total Users</p>
              </button>
              
              <button onClick={() => setActiveTab('teams')} className="glass rounded-2xl p-6 text-left hover:scale-[1.02] hover:bg-white/[0.04] transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
                    <Trophy size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                    ACTIVE
                  </span>
                </div>
                <p className="text-3xl font-black italic">{teamsList.length}</p>
                <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Total Teams</p>
              </button>
              
              <button onClick={() => setActiveTab('matches')} className="glass rounded-2xl p-6 text-left hover:scale-[1.02] hover:bg-white/[0.04] transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                    <Activity size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-green-500 bg-green-500/10 px-2 py-1 rounded">
                    LIVE
                  </span>
                </div>
                <p className="text-3xl font-black italic">{matchesList.filter(m => m.status === 'live').length}</p>
                <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Live Matches</p>
              </button>
              
              <button onClick={() => setActiveTab('media')} className="glass rounded-2xl p-6 text-left hover:scale-[1.02] hover:bg-white/[0.04] transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                    <Newspaper size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500 bg-purple-500/10 px-2 py-1 rounded">
                    PUBLISHED
                  </span>
                </div>
                <p className="text-3xl font-black italic">{mediaList.length}</p>
                <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Media Posts</p>
              </button>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-6 flex items-center gap-2">
                  <Activity size={16} />
                  Recent Activity
                </h3>
                {activityList.length > 0 ? (
                  <div className="space-y-3">
                    {activityList.slice(0, 5).map((activity, i) => (
                      <button 
                        key={i} 
                        onClick={() => {
                          if (activity.destination) {
                            // Navigate to destination
                            if (activity.destination.includes('media')) setActiveTab('media');
                            else if (activity.destination.includes('matches')) setActiveTab('matches');
                            else if (activity.destination.includes('teams')) setActiveTab('teams');
                            else if (activity.destination.includes('users')) setActiveTab('users');
                          }
                        }}
                        className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors text-left group cursor-pointer"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          activity.entity_type === 'user' ? 'bg-blue-500/10 text-blue-500' :
                          activity.entity_type === 'match' ? 'bg-green-500/10 text-green-500' :
                          activity.entity_type === 'media' ? 'bg-purple-500/10 text-purple-500' :
                          'bg-yellow-500/10 text-yellow-500'
                        } group-hover:scale-110 transition-transform`}>
                          {activity.entity_type === 'user' ? <UserPlus size={18} /> :
                           activity.entity_type === 'match' ? <CheckCircle size={18} /> :
                           activity.entity_type === 'media' ? <FileText size={18} /> :
                           <Users size={18} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold group-hover:text-green-400 transition-colors">{activity.action}</p>
                          <p className="text-[10px] text-white/40">
                            {activity.entity_name ? activity.entity_name : ''} • by {activity.profiles?.username || 'System'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/30">{new Date(activity.created_at).toLocaleDateString()}</span>
                          <ChevronRight size={16} className="text-white/20 group-hover:text-green-400 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/30">
                    <Activity size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-6 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setIsCompetitionWizardOpen(true)} className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-left hover:bg-green-500/20 transition-colors group">
                    <Trophy size={24} className="text-green-500 mb-3 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-sm">New Competition</p>
                    <p className="text-[10px] text-white/40 mt-1">Launch Tournament Wizard</p>
                  </button>
                  <button onClick={() => setIsPlayerCreatorOpen(true)} className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-left hover:bg-blue-500/20 transition-colors group">
                    <UserPlus size={24} className="text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-sm">Add Player</p>
                    <p className="text-[10px] text-white/40 mt-1">Register to squad</p>
                  </button>
                  <button onClick={() => setIsMediaPublisherOpen(true)} className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-left hover:bg-purple-500/20 transition-colors group">
                    <Newspaper size={24} className="text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-sm">Post News</p>
                    <p className="text-[10px] text-white/40 mt-1">Publish article</p>
                  </button>
                  <button onClick={() => setIsTeamAdderOpen(true)} className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-left hover:bg-yellow-500/20 transition-colors group">
                    <Shield size={24} className="text-yellow-500 mb-3 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-sm">Add Team</p>
                    <p className="text-[10px] text-white/40 mt-1">Club registration</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'competitions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">Competitions</h2>
                <p className="text-white/40">Manage all leagues, cups, and tournaments</p>
              </div>
              <button onClick={() => setIsCompetitionWizardOpen(true)} className="gradient-green text-black px-6 py-2 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-green-500/20">
                <Plus size={18} /> Create Competition
              </button>
            </div>
            
            {competitionsList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {competitionsList.map((comp: any) => (
                  <div key={comp.id} className="glass rounded-2xl lg:rounded-[2rem] p-4 lg:p-6 border border-white/5 group hover:border-green-500/30 transition-all cursor-pointer hover:scale-[1.02]">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
                        <Trophy size={32} className="text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-black uppercase italic tracking-tighter">{comp.name}</h3>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">{comp.season || '2025'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between py-2 border-b border-white/5">
                        <span className="text-[10px] text-white/40 uppercase">Format</span>
                        <span className="text-xs font-bold text-white/60">{comp.format || comp.type || 'League'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-white/5">
                        <span className="text-[10px] text-white/40 uppercase">Status</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                          comp.status === 'active' ? 'bg-green-500/20 text-green-500' :
                          comp.status === 'completed' ? 'bg-blue-500/20 text-blue-500' :
                          'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {comp.status || 'upcoming'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-[10px] text-white/40 uppercase">Created</span>
                        <span className="text-xs text-white/60">{new Date(comp.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => { setSelectedCompetition(comp); setIsCompetitionEditorOpen(true); }} className="py-3 rounded-xl bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-all">
                        Edit
                      </button>
                      <button onClick={() => { setSelectedCompetition(comp); setIsFixturesViewerOpen(true); }} className="py-3 rounded-xl bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all">
                        Fixtures
                      </button>
                      <button onClick={() => handleDeleteCompetition(comp.id, comp.name)} className="py-3 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass rounded-[2rem] p-20 text-center border border-dashed border-white/10">
                <Trophy size={64} className="mx-auto text-white/10 mb-6" />
                <h3 className="text-xl font-black uppercase mb-2">No Competitions Yet</h3>
                <p className="text-white/40 mb-6">Create your first competition to get started</p>
                <button onClick={() => setIsCompetitionWizardOpen(true)} className="gradient-green text-black px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs inline-flex items-center gap-2 hover:scale-105 transition-all">
                  <Plus size={18} /> Create Competition
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">Team Management</h2>
              <button onClick={() => setIsTeamAdderOpen(true)} className="gradient-green text-black px-6 py-2 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-green-500/20">
                <Plus size={18} /> Register Club
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamsList.map((team: any) => (
                <div key={team.id} onClick={() => { setSelectedTeam(team); setIsTeamDashboardOpen(true); }} className="glass rounded-[2rem] p-6 border border-white/5 group hover:border-green-500/30 transition-all cursor-pointer hover:scale-[1.02]">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                      {team.logo_url ? <img src={team.logo_url} className="w-full h-full object-cover" /> : <span className="text-2xl font-black italic">{team.short_name?.[0]}</span>}
                    </div>
                    <div>
                      <h3 className="font-black uppercase italic tracking-tighter">{team.name}</h3>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest">{team.city}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-white/5 p-3 rounded-2xl text-center">
                      <p className="text-xs font-black text-green-500">SQUAD</p>
                      <p className="text-[10px] text-white/40 uppercase">Manage</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-2xl text-center">
                      <p className="text-xs font-black text-blue-500">{team.coach}</p>
                      <p className="text-[10px] text-white/40 uppercase">Coach</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); }} className="w-full py-3 rounded-xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-red-500 group-hover:bg-red-500/10 transition-all">
                    Remove Club
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">Media Center</h2>
              <button onClick={() => setIsMediaPublisherOpen(true)} className="gradient-green text-black px-6 py-2 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2">
                <Plus size={18} /> Post News
              </button>
            </div>
            {mediaList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mediaList.map((item: any) => (
                  <div key={item.id} className="glass rounded-2xl p-6 border border-white/10 hover:border-green-500/30 transition-all">
                    <div className="aspect-video bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-xl mb-4 flex items-center justify-center">
                      <span className="text-4xl">📰</span>
                    </div>
                    <span className="text-xs text-green-500 font-bold uppercase">{item.category || 'News'}</span>
                    <h3 className="font-bold mt-2 line-clamp-2">{item.title}</h3>
                    <p className="text-xs text-white/40 mt-2">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass rounded-2xl p-20 text-center">
                <Newspaper size={64} className="mx-auto text-white/10 mb-4" />
                <p className="text-white/30 font-bold uppercase tracking-widest">No news posts yet</p>
                <button onClick={() => setIsMediaPublisherOpen(true)} className="mt-6 gradient-green text-black px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs">
                  Create First Post
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'matches' && (
          <MatchControlComplete matchId={1} onBack={() => {}} />
        )}

        {activeTab === 'users' && (
          <UserManagement />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Settings</h2>
            <div className="glass rounded-2xl p-6">
              <p className="text-white/40">Configure system settings.</p>
            </div>
          </div>
        )}

        {activeTab === 'tables' && (
          <TableStatistics />
        )}
      </main>

      {/* Modals */}
      <CompetitionWizard isOpen={isCompetitionWizardOpen} onClose={() => setIsCompetitionWizardOpen(false)} />
      {selectedCompetition && (
        <>
          <CompetitionEditor 
            competition={selectedCompetition}
            isOpen={isCompetitionEditorOpen}
            onClose={() => { setIsCompetitionEditorOpen(false); setSelectedCompetition(null); }}
            onUpdate={() => {
              // Reload competitions
              supabase.from('competitions').select('*').order('created_at', { ascending: false }).then(({ data }) => {
                setCompetitionsList(data || []);
              });
            }}
          />
          <FixturesViewer
            competition={selectedCompetition}
            isOpen={isFixturesViewerOpen}
            onClose={() => { setIsFixturesViewerOpen(false); setSelectedCompetition(null); }}
          />
        </>
      )}
      <PlayerCreator isOpen={isPlayerCreatorOpen} onClose={() => setIsPlayerCreatorOpen(false)} />
      <MediaPublisher isOpen={isMediaPublisherOpen} onClose={() => setIsMediaPublisherOpen(false)} />
      <TeamAdder isOpen={isTeamAdderOpen} onClose={() => { setIsTeamAdderOpen(false); window.location.reload(); }} />
      <AppSettingsDashboard isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      {selectedTeam && <TeamDashboard isOpen={isTeamDashboardOpen} team={selectedTeam} onClose={() => { setIsTeamDashboardOpen(false); setSelectedTeam(null); }} onTeamUpdate={() => window.location.reload()} />}
    </div>
  );
}
