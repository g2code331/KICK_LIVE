import { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle, AlertCircle, Users, MessageSquare, Play, Pause } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface MatchQueueItem {
  id: number;
  homeTeam: any;
  awayTeam: any;
  competition: string;
  status: string;
  minute: number;
  homeScore: number;
  awayScore: number;
  startTime: string;
}

export default function MultiMatchQueue({ onSelectMatch, selectedMatchId }: any) {
  const [liveMatches, setLiveMatches] = useState<MatchQueueItem[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchQueueItem[]>([]);
  const [finishedMatches, setFinishedMatches] = useState<MatchQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadMatches();
    
    // Auto-refresh every 30 seconds for live matches
    const interval = setInterval(loadMatches, 30000);
    return () => clearInterval(interval);
  }, []);
  
  async function loadMatches() {
    try {
      const { data: matches } = await supabase
        .from('matches')
        .select('*, homeTeam:teams!home_team_id(short_name, name), awayTeam:teams!away_team_id(short_name, name)')
        .order('start_time', { ascending: false })
        .limit(50);
      
      if (matches) {
        setLiveMatches(matches.filter(m => m.status === 'live' || m.status === 'first_half' || m.status === 'second_half'));
        setUpcomingMatches(matches.filter(m => m.status === 'scheduled' || m.status === 'waiting'));
        setFinishedMatches(matches.filter(m => m.status === 'finished' || m.status === 'full_time'));
      }
    } catch (err) {
      console.error('Error loading matches:', err);
    } finally {
      setLoading(false);
    }
  }
  
  const getStatusIcon = (status: string) => {
    if (status === 'live' || status === 'first_half' || status === 'second_half') {
      return <Activity className="text-red-500 animate-pulse" size={16} />;
    }
    if (status === 'scheduled' || status === 'waiting') {
      return <Clock className="text-blue-500" size={16} />;
    }
    return <CheckCircle className="text-green-500" size={16} />;
  };
  
  const getStatusColor = (status: string) => {
    if (status === 'live' || status === 'first_half' || status === 'second_half') {
      return 'bg-red-500/20 text-red-500';
    }
    if (status === 'scheduled' || status === 'waiting') {
      return 'bg-blue-500/20 text-blue-500';
    }
    return 'bg-green-500/20 text-green-500';
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-white/40">Loading matches...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Live Matches */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="text-red-500" size={20} />
          <h3 className="text-lg font-black uppercase">Live Matches ({liveMatches.length})</h3>
        </div>
        
        {liveMatches.length > 0 ? (
          <div className="space-y-3">
            {liveMatches.map(match => (
              <div
                key={match.id}
                onClick={() => onSelectMatch(match)}
                className={`glass rounded-xl p-4 border cursor-pointer transition-all hover:scale-[1.02] ${
                  selectedMatchId === match.id ? 'border-brand-green bg-brand-green/10' : 'border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(match.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold">{match.homeTeam?.short_name || 'HOME'}</span>
                        <span className="text-lg font-black text-brand-green">{match.home_score ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{match.awayTeam?.short_name || 'AWAY'}</span>
                        <span className="text-lg font-black text-brand-green">{match.away_score ?? 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-xs font-black uppercase mb-2 ${getStatusColor(match.status)}`}>
                      {match.status === 'live' || match.status === 'first_half' || match.status === 'second_half'
                        ? `${match.minute}'`
                        : match.status}
                    </div>
                    <p className="text-xs text-white/40">{match.competition || 'Competition'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl p-8 text-center text-white/40">
            <Activity size={48} className="mx-auto mb-4 opacity-20" />
            <p>No live matches at the moment</p>
          </div>
        )}
      </div>
      
      {/* Upcoming Matches */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="text-blue-500" size={20} />
          <h3 className="text-lg font-black uppercase">Upcoming ({upcomingMatches.length})</h3>
        </div>
        
        {upcomingMatches.length > 0 ? (
          <div className="space-y-2">
            {upcomingMatches.slice(0, 5).map(match => (
              <div
                key={match.id}
                onClick={() => onSelectMatch(match)}
                className={`glass rounded-lg p-3 border cursor-pointer transition-all hover:bg-white/5 ${
                  selectedMatchId === match.id ? 'border-brand-green' : 'border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(match.status)}
                    <span className="text-sm font-bold">{match.homeTeam?.short_name} vs {match.awayTeam?.short_name}</span>
                  </div>
                  <span className="text-xs text-white/40">{new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl p-4 text-center text-white/40 text-sm">
            No upcoming matches
          </div>
        )}
      </div>
      
      {/* Recently Finished */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="text-green-500" size={20} />
          <h3 className="text-lg font-black uppercase">Recently Finished ({finishedMatches.length})</h3>
        </div>
        
        {finishedMatches.length > 0 ? (
          <div className="space-y-2">
            {finishedMatches.slice(0, 5).map(match => (
              <div
                key={match.id}
                onClick={() => onSelectMatch(match)}
                className={`glass rounded-lg p-3 border cursor-pointer transition-all hover:bg-white/5 ${
                  selectedMatchId === match.id ? 'border-brand-green' : 'border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(match.status)}
                    <span className="text-sm font-bold">{match.homeTeam?.short_name} {match.home_score} - {match.away_score} {match.awayTeam?.short_name}</span>
                  </div>
                  <span className="text-xs text-white/40">FT</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl p-4 text-center text-white/40 text-sm">
            No finished matches
          </div>
        )}
      </div>
    </div>
  );
}
