import { useState } from 'react';
import { 
  Users, Calendar, Trophy, LogOut, UserPlus, 
  FileText, Settings, Shield, Star, TrendingUp, Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { teams, players, matches } from '../../data/mockData';

interface TeamPortalProps {
  onNavigate: (page: string) => void;
}

type TeamTab = 'overview' | 'roster' | 'matches' | 'reports';

export default function TeamPortal({ onNavigate }: TeamPortalProps) {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TeamTab>('overview');

  // Simulate managed team (first team in the list)
  const myTeam = teams[0];
  const myPlayers = players.filter(p => p.teamId === myTeam.id);
  const myMatches = matches.filter(m => m.homeTeamId === myTeam.id || m.awayTeamId === myTeam.id);

  const handleSignOut = async () => {
    await signOut();
    onNavigate('login');
  };

  const teamStats = {
    wins: 8,
    draws: 1,
    losses: 1,
    goalsFor: 24,
    goalsAgainst: 8,
    position: 1,
  };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp size={20} /> },
    { id: 'roster', label: 'Squad Roster', icon: <Users size={20} /> },
    { id: 'matches', label: 'Match Reports', icon: <Calendar size={20} /> },
    { id: 'reports', label: 'Team Reports', icon: <FileText size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-brand-bg flex">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-white/10 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black" style={{
            background: `linear-gradient(135deg, ${myTeam.primaryColor}, ${myTeam.secondaryColor})`,
          }}>
            {myTeam.shortName[0]}
          </div>
          <div>
            <h1 className="font-black text-sm uppercase tracking-tight">{myTeam.name}</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Team Manager</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TeamTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                activeTab === item.id
                  ? 'bg-yellow-500/10 text-yellow-500'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon}
              <span className="text-sm font-bold">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold">
              {profile?.username?.[0] || 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{profile?.username || 'Team Manager'}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Manager</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-brand-red hover:bg-brand-red/10 transition-all"
          >
            <LogOut size={20} />
            <span className="text-sm font-bold">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">
                Team Dashboard
              </h2>
              <p className="text-white/40">Manage {myTeam.name}</p>
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="glass rounded-2xl p-5 text-center">
                <Trophy size={20} className="mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-black italic">#{teamStats.position}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Position</p>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <p className="text-2xl font-black italic text-brand-green">{teamStats.wins}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Wins</p>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <p className="text-2xl font-black italic text-yellow-500">{teamStats.draws}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Draws</p>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <p className="text-2xl font-black italic text-brand-red">{teamStats.losses}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Losses</p>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <p className="text-2xl font-black italic">{teamStats.goalsFor}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Goals For</p>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <p className="text-2xl font-black italic">{teamStats.goalsAgainst}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Against</p>
              </div>
            </div>

            {/* Quick Actions & Upcoming */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-6 flex items-center gap-2">
                  <Activity size={16} />
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-left hover:bg-yellow-500/20 transition-colors">
                    <UserPlus size={24} className="text-yellow-500 mb-3" />
                    <p className="font-bold text-sm">Add Player</p>
                    <p className="text-[10px] text-white/40 mt-1">Register new player</p>
                  </button>
                  <button className="p-4 rounded-xl bg-brand-blue/10 border border-brand-blue/30 text-left hover:bg-brand-blue/20 transition-colors">
                    <FileText size={24} className="text-brand-blue mb-3" />
                    <p className="font-bold text-sm">Match Report</p>
                    <p className="text-[10px] text-white/40 mt-1">Submit report</p>
                  </button>
                  <button className="p-4 rounded-xl bg-brand-green/10 border border-brand-green/30 text-left hover:bg-brand-green/20 transition-colors">
                    <Shield size={24} className="text-brand-green mb-3" />
                    <p className="font-bold text-sm">Lineup</p>
                    <p className="text-[10px] text-white/40 mt-1">Set formation</p>
                  </button>
                  <button className="p-4 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-colors">
                    <Settings size={24} className="text-white/40 mb-3" />
                    <p className="font-bold text-sm">Team Settings</p>
                    <p className="text-[10px] text-white/40 mt-1">Edit details</p>
                  </button>
                </div>
              </div>

              {/* Upcoming Matches */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-6 flex items-center gap-2">
                  <Calendar size={16} />
                  Upcoming Fixtures
                </h3>
                <div className="space-y-4">
                  {myMatches.filter(m => m.status === 'scheduled').slice(0, 3).map((match) => (
                    <div key={match.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                      <div>
                        <p className="font-bold text-sm">
                          {match.homeTeamId === myTeam.id ? 'vs ' + match.awayTeam.name : '@ ' + match.homeTeam.name}
                        </p>
                        <p className="text-[10px] text-white/30">{match.competition}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-brand-blue">
                          {new Date(match.startTime).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] text-white/30">
                          {match.homeTeamId === myTeam.id ? 'HOME' : 'AWAY'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Players */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-6 flex items-center gap-2">
                <Star size={16} className="text-yellow-500" />
                Squad Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myPlayers.slice(0, 6).map((player) => (
                  <div key={player.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center font-bold">
                      {player.number}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{player.name}</p>
                      <p className="text-[10px] text-white/30">{player.position}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-brand-green">{player.goals}</p>
                      <p className="text-[8px] text-white/20 uppercase">Goals</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'roster' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">Squad Roster</h2>
              <button className="gradient-green text-black px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                <UserPlus size={18} />
                Add Player
              </button>
            </div>
            <div className="glass rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/30">
                    <th className="px-6 py-4 text-left">#</th>
                    <th className="px-6 py-4 text-left">Player</th>
                    <th className="px-6 py-4 text-left">Position</th>
                    <th className="px-6 py-4 text-center">Goals</th>
                    <th className="px-6 py-4 text-center">Assists</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {myPlayers.map((player) => (
                    <tr key={player.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-black">{player.number}</td>
                      <td className="px-6 py-4 font-bold">{player.name}</td>
                      <td className="px-6 py-4 text-white/60">{player.position}</td>
                      <td className="px-6 py-4 text-center font-bold text-brand-green">{player.goals}</td>
                      <td className="px-6 py-4 text-center font-bold text-brand-blue">{player.assists}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-[10px] font-bold text-brand-blue hover:underline">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Match Reports</h2>
            <div className="glass rounded-2xl p-8 text-center">
              <Calendar size={48} className="mx-auto text-yellow-500 mb-4" />
              <p className="text-white/40">View and submit match reports for your team fixtures.</p>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Team Reports</h2>
            <div className="glass rounded-2xl p-8 text-center">
              <FileText size={48} className="mx-auto text-brand-blue mb-4" />
              <p className="text-white/40">Analytics and performance reports for your team.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
