import { useState, useEffect } from 'react';
import { Play, Pause, CheckCircle, Activity, MessageSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface MatchControlProps {
  matchId?: number;
}

export default function MatchControl({ matchId }: MatchControlProps) {
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matchStatus, setMatchStatus] = useState('waiting');
  const [minute, setMinute] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homeTeam, setHomeTeam] = useState<any>(null);
  const [awayTeam, setAwayTeam] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'events' | 'commentary'>('events');
  const [commentary, setCommentary] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (matchId) loadMatch();
  }, [matchId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && !['half_time', 'full_time', 'waiting'].includes(matchStatus)) {
      interval = setInterval(() => {
        setMinute(m => {
          if (m >= 45 && matchStatus === 'first_half') return 45;
          if (m >= 90 && matchStatus === 'second_half') return 90;
          return m + 1;
        });
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, matchStatus]);

  async function loadMatch() {
    try {
      const { data } = await supabase
        .from('matches')
        .select('*, homeTeam:teams!home_team_id(*), awayTeam:teams!away_team_id(*)')
        .eq('id', matchId)
        .single();
      
      if (data) {
        setMatch(data);
        setHomeTeam(data.homeTeam);
        setAwayTeam(data.awayTeam);
        setHomeScore(data.home_score || 0);
        setAwayScore(data.away_score || 0);
        setMatchStatus(data.status || 'waiting');
        setMinute(data.minute || 0);
        
        const { data: eventsData } = await supabase
          .from('match_events')
          .select('*')
          .eq('match_id', matchId)
          .order('minute', { ascending: true });
        setEvents(eventsData || []);
        
        const { data: commData } = await supabase
          .from('match_commentary')
          .select('*')
          .eq('match_id', matchId)
          .order('minute', { ascending: true });
        setCommentary(commData || []);
      }
    } catch (err) {
      console.error('Error loading match:', err);
    } finally {
      setLoading(false);
    }
  }

  const startMatch = async () => {
    setMatchStatus('first_half');
    setIsTimerRunning(true);
    await addEvent('kickoff', 0);
    await updateMatch();
  };

  const pauseMatch = async () => {
    setIsTimerRunning(false);
    await updateMatch();
  };

  const resumeMatch = async () => {
    setIsTimerRunning(true);
    await updateMatch();
  };

  const endHalf = async () => {
    setIsTimerRunning(false);
    if (matchStatus === 'first_half') {
      setMatchStatus('half_time');
      await addEvent('half_time', minute);
    } else {
      setMatchStatus('full_time');
      await addEvent('match_ended', minute);
      await finalizeMatch();
    }
    await updateMatch();
  };

  const updateMatch = async () => {
    try {
      await supabase.from('matches').update({ 
        status: matchStatus, minute,
        status_detail: matchStatus.replace('_', ' ').toUpperCase()
      }).eq('id', matchId);
    } catch (err) {
      console.error('Error updating match:', err);
    }
  };

  const addEvent = async (eventType: string, minute: number, data?: any) => {
    try {
      await supabase.from('match_events').insert([{
        match_id: matchId, event_type: eventType, minute,
        team_id: data?.teamId, player_id: data?.playerId,
        description: data?.description
      }]);
      loadMatch();
    } catch (err) {
      console.error('Error adding event:', err);
    }
  };

  const addGoal = async (teamId: number) => {
    const isHome = teamId === homeTeam?.id;
    const newScore = isHome ? homeScore + 1 : awayScore + 1;
    
    if (isHome) {
      setHomeScore(newScore);
      await supabase.from('matches').update({ home_score: newScore }).eq('id', matchId);
    } else {
      setAwayScore(newScore);
      await supabase.from('matches').update({ away_score: newScore }).eq('id', matchId);
    }
    
    await addEvent('goal', minute, { teamId, description: 'GOAL!' });
  };

  const addCard = async (teamId: number, cardType: 'yellow' | 'red') => {
    await addEvent(cardType === 'yellow' ? 'yellow_card' : 'red_card', minute, { teamId });
  };

  const addCommentary = async () => {
    if (!newComment.trim()) return;
    try {
      await supabase.from('match_commentary').insert([{
        match_id: matchId, minute, comment: newComment
      }]);
      setNewComment('');
      loadMatch();
    } catch (err) {
      console.error('Error adding commentary:', err);
    }
  };

  const finalizeMatch = async () => {
    try {
      await supabase.from('matches').update({
        status: 'finished', is_locked: true,
        confirmed_at: new Date().toISOString()
      }).eq('id', matchId);
      alert('Match finalized! Standings will update automatically.');
    } catch (err) {
      console.error('Error finalizing match:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-green font-bold uppercase">Loading Match Control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E13] p-4 lg:p-8">
      <div className="container mx-auto">
        {/* Header */}
        <div className="glass rounded-2xl p-6 mb-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <Activity className="text-red-500" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase">Match Control</h1>
                <p className="text-xs text-white/40">{match?.competition || 'Competition'}</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-xl font-black uppercase text-sm ${
              isTimerRunning ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-white/5 text-white/40'
            }`}>
              {isTimerRunning ? '🔴 LIVE' : 'PAUSED'}
            </div>
          </div>
          
          {/* Scoreboard */}
          <div className="glass rounded-2xl p-8 bg-gradient-to-r from-brand-blue/10 via-transparent to-brand-green/10 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-3xl font-black">{homeTeam?.short_name?.[0] || 'H'}</span>
                </div>
                <h2 className="text-xl font-black uppercase">{homeTeam?.name || 'Home'}</h2>
              </div>
              
              <div className="flex-1 text-center px-8">
                <div className="text-6xl font-black mb-4">
                  <span className="text-brand-green">{homeScore}</span>
                  <span className="text-white/30 mx-4">-</span>
                  <span className="text-brand-green">{awayScore}</span>
                </div>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-3xl font-black">{minute}'</span>
                </div>
                <div className="text-sm font-black uppercase text-white/40">{matchStatus.replace('_', ' ')}</div>
              </div>
              
              <div className="flex-1 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-3xl font-black">{awayTeam?.short_name?.[0] || 'A'}</span>
                </div>
                <h2 className="text-xl font-black uppercase">{awayTeam?.name || 'Away'}</h2>
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-6">
            {matchStatus === 'waiting' && (
              <button onClick={startMatch} className="flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-green text-black font-black uppercase hover:scale-105 transition-all">
                <Play size={20} /> Kick Off
              </button>
            )}
            {isTimerRunning ? (
              <button onClick={pauseMatch} className="flex items-center gap-2 px-8 py-4 rounded-xl bg-orange-500 text-white font-black uppercase hover:scale-105 transition-all">
                <Pause size={20} /> Pause
              </button>
            ) : matchStatus !== 'waiting' && matchStatus !== 'full_time' && (
              <button onClick={resumeMatch} className="flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-green text-black font-black uppercase hover:scale-105 transition-all">
                <Play size={20} /> Resume
              </button>
            )}
            {(matchStatus === 'first_half' || matchStatus === 'second_half') && (
              <button onClick={endHalf} className="flex items-center gap-2 px-8 py-4 rounded-xl bg-red-500 text-white font-black uppercase hover:scale-105 transition-all">
                <CheckCircle size={20} /> {matchStatus === 'first_half' ? 'Half Time' : 'Full Time'}
              </button>
            )}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button onClick={() => addGoal(homeTeam?.id)} className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 font-black uppercase hover:bg-green-500/20 transition-all">
            ⚽ Home Goal
          </button>
          <button onClick={() => addGoal(awayTeam?.id)} className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 font-black uppercase hover:bg-green-500/20 transition-all">
            ⚽ Away Goal
          </button>
          <button onClick={() => addCard(homeTeam?.id, 'yellow')} className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 font-black uppercase hover:bg-yellow-500/20 transition-all">
            🟨 Home Yellow
          </button>
          <button onClick={() => addCard(awayTeam?.id, 'yellow')} className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 font-black uppercase hover:bg-yellow-500/20 transition-all">
            🟨 Away Yellow
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { id: 'events', label: 'Events', icon: <Activity size={16} /> },
            { id: 'commentary', label: 'Commentary', icon: <MessageSquare size={16} /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm uppercase transition-all ${
              activeTab === tab.id ? 'bg-brand-green text-black' : 'bg-white/5 text-white/40 hover:text-white'
            }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        
        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="glass rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-black uppercase mb-6">Match Events</h3>
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-16 text-center">
                    <span className="text-lg font-black text-brand-green">{event.minute}'</span>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    event.event_type === 'goal' ? 'bg-green-500/20 text-green-500' :
                    event.event_type.includes('card') ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-blue-500/20 text-blue-500'
                  }`}>
                    {event.event_type === 'goal' ? '⚽' : event.event_type.includes('card') ? '🟨' : '📋'}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold uppercase">{event.event_type.replace('_', ' ')}</p>
                    <p className="text-xs text-white/40">{event.description || ''}</p>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-center py-12 text-white/40">
                  <p>No events yet. Kick off to start!</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Commentary Tab */}
        {activeTab === 'commentary' && (
          <div className="glass rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-black uppercase mb-6">Live Commentary</h3>
            <div className="flex gap-4 mb-6">
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type commentary..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-green/50"
                onKeyPress={(e) => e.key === 'Enter' && addCommentary()} />
              <button onClick={addCommentary} className="px-6 py-3 rounded-xl bg-brand-green text-black font-black uppercase hover:scale-105 transition-all">Post</button>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {commentary.map((comm) => (
                <div key={comm.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-brand-green font-black">{comm.minute}'</span>
                  <p className="mt-2">{comm.comment}</p>
                </div>
              ))}
              {commentary.length === 0 && (
                <div className="text-center py-12 text-white/40">
                  <p>No commentary yet. Start typing!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
