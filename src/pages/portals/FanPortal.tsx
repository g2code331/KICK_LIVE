import { useState } from 'react';
import { 
  Heart, Trophy, Calendar, Star, Bell, LogOut, 
  TrendingUp, MessageCircle, ThumbsUp, Award, Target
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { matches, players, mediaItems } from '../../data/mockData';
import { format } from 'date-fns';

interface FanPortalProps {
  onNavigate: (page: string) => void;
}

export default function FanPortal({ onNavigate }: FanPortalProps) {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'matches' | 'predictions' | 'community'>('home');

  const handleSignOut = async () => {
    await signOut();
    onNavigate('login');
  };

  const liveMatches = matches.filter(m => m.status === 'live');
  const upcomingMatches = matches.filter(m => m.status === 'scheduled');
  const topScorers = [...players].sort((a, b) => b.goals - a.goals).slice(0, 5);

  const userStats = {
    predictions: 47,
    correct: 32,
    points: 1580,
    rank: 142,
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Header */}
      <header className="glass border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-blue/20 rounded-xl flex items-center justify-center">
              <Heart size={20} className="text-brand-blue" />
            </div>
            <div>
              <h1 className="font-black text-lg uppercase tracking-tight">Fan Zone</h1>
              <p className="text-[10px] text-white/40">Welcome, {profile?.username || 'Fan'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-white/5 rounded-xl transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-brand-red rounded-full"></span>
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-brand-red hover:bg-brand-red/10 transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm font-bold hidden sm:block">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="container mx-auto px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'home', label: 'Home', icon: <Heart size={16} /> },
              { id: 'matches', label: 'Matches', icon: <Calendar size={16} /> },
              { id: 'predictions', label: 'Predictions', icon: <Target size={16} /> },
              { id: 'community', label: 'Community', icon: <MessageCircle size={16} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-blue text-white'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-24">
        {activeTab === 'home' && (
          <div className="space-y-8">
            {/* User Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass rounded-2xl p-5 text-center">
                <Target size={24} className="mx-auto text-brand-blue mb-2" />
                <p className="text-2xl font-black italic">{userStats.predictions}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Predictions</p>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <ThumbsUp size={24} className="mx-auto text-brand-green mb-2" />
                <p className="text-2xl font-black italic text-brand-green">{userStats.correct}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Correct</p>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <Star size={24} className="mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-black italic text-yellow-500">{userStats.points}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Points</p>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <Award size={24} className="mx-auto text-purple-500 mb-2" />
                <p className="text-2xl font-black italic">#{userStats.rank}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Global Rank</p>
              </div>
            </div>

            {/* Live Matches */}
            {liveMatches.length > 0 && (
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-brand-green rounded-full pulse-green"></span>
                  Live Now
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {liveMatches.map((match) => (
                    <div key={match.id} className="glass rounded-2xl p-5 hover:border-brand-green/30 transition-all cursor-pointer">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{match.competition}</span>
                        <span className="text-[10px] font-black text-brand-green bg-brand-green/10 px-2 py-1 rounded">{match.minute}'</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <div className="w-12 h-12 mx-auto bg-white/5 rounded-full flex items-center justify-center font-bold mb-2">
                            {match.homeTeam.shortName[0]}
                          </div>
                          <p className="text-xs font-bold">{match.homeTeam.name}</p>
                        </div>
                        <div className="text-center px-4">
                          <p className="text-3xl font-black italic text-brand-green text-glow-green">
                            {match.homeScore} - {match.awayScore}
                          </p>
                          <p className="text-[10px] text-brand-green uppercase tracking-widest mt-1">LIVE</p>
                        </div>
                        <div className="text-center flex-1">
                          <div className="w-12 h-12 mx-auto bg-white/5 rounded-full flex items-center justify-center font-bold mb-2">
                            {match.awayTeam.shortName[0]}
                          </div>
                          <p className="text-xs font-bold">{match.awayTeam.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Matches */}
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                <Calendar size={14} />
                Upcoming Matches
              </h2>
              <div className="space-y-3">
                {upcomingMatches.slice(0, 4).map((match) => (
                  <div key={match.id} className="glass rounded-xl p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-[10px] text-white/30 uppercase">{format(new Date(match.startTime), 'MMM d')}</p>
                        <p className="text-sm font-black">{format(new Date(match.startTime), 'HH:mm')}</p>
                      </div>
                      <div className="h-8 w-px bg-white/10"></div>
                      <div>
                        <p className="text-sm font-bold">{match.homeTeam.name} vs {match.awayTeam.name}</p>
                        <p className="text-[10px] text-white/30">{match.competition}</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-brand-blue/10 text-brand-blue rounded-xl text-xs font-bold hover:bg-brand-blue/20 transition-colors">
                      Predict
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Scorers & News */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                  <Trophy size={14} className="text-yellow-500" />
                  Top Scorers
                </h3>
                <div className="space-y-3">
                  {topScorers.map((player, i) => (
                    <div key={player.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-black italic w-6 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-400' : 'text-white/20'}`}>
                          {i + 1}
                        </span>
                        <span className="text-sm font-bold">{player.name}</span>
                      </div>
                      <span className="text-lg font-black text-brand-green">{player.goals}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                  <TrendingUp size={14} />
                  Latest News
                </h3>
                <div className="space-y-4">
                  {mediaItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex gap-3 cursor-pointer hover:bg-white/[0.02] rounded-lg p-2 transition-colors">
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold line-clamp-2">{item.title}</p>
                        <p className="text-[10px] text-white/30 mt-1">{format(new Date(item.date), 'MMM d')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">All Matches</h2>
            <div className="space-y-4">
              {matches.map((match) => (
                <div key={match.id} className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">{match.competition}</p>
                      <p className="font-bold">{match.homeTeam.name} vs {match.awayTeam.name}</p>
                    </div>
                    <div className="text-center">
                      {match.status === 'live' ? (
                        <p className="text-2xl font-black text-brand-green">{match.homeScore} - {match.awayScore}</p>
                      ) : match.status === 'finished' ? (
                        <p className="text-2xl font-black">{match.homeScore} - {match.awayScore}</p>
                      ) : (
                        <p className="text-sm font-bold text-brand-blue">{format(new Date(match.startTime), 'HH:mm')}</p>
                      )}
                      <p className={`text-[10px] font-bold uppercase ${
                        match.status === 'live' ? 'text-brand-green' : 
                        match.status === 'finished' ? 'text-white/30' : 'text-brand-blue'
                      }`}>
                        {match.status === 'live' ? `${match.minute}'` : match.status === 'finished' ? 'FT' : format(new Date(match.startTime), 'MMM d')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'predictions' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Your Predictions</h2>
            <div className="glass rounded-2xl p-8 text-center">
              <Target size={48} className="mx-auto text-brand-blue mb-4" />
              <p className="text-white/40">Make predictions on upcoming matches to earn points!</p>
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Community</h2>
            <div className="glass rounded-2xl p-8 text-center">
              <MessageCircle size={48} className="mx-auto text-purple-500 mb-4" />
              <p className="text-white/40">Join discussions, vote for MOTM, and engage with other fans!</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
