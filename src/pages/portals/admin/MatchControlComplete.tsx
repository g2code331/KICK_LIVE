import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Clock, CheckCircle, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface MatchControlCompleteProps {
  matchId: number;
  onBack: () => void;
}

// Calculate match time from timestamps - ZERO BANDWIDTH!
function calculateMatchTime(match: any): number {
  if (!match) return 0;
  if (match.status === 'scheduled' || match.status === 'waiting') return 0;
  
  if (match.status === 'paused' || match.status === 'half_time' || match.status === 'full_time' || match.status === 'finished') {
    return match.elapsed_seconds_before_pause || 0;
  }
  
  if (match.status === 'first_half' || match.status === 'second_half' || match.status === 'extra_time') {
    const now = new Date();
    const startTime = new Date(match.match_start_time || now);
    const secondsPassed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    return (match.elapsed_seconds_before_pause || 0) + secondsPassed;
  }
  
  return 0;
}

export default function MatchControlComplete({ matchId, onBack }: MatchControlCompleteProps) {
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homeTeam, setHomeTeam] = useState<any>(null);
  const [awayTeam, setAwayTeam] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'statistics' | 'commentary'>('events');
  const [showKickoffModal, setShowKickoffModal] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>({
    home_possession: 50, away_possession: 50,
    home_shots: 0, away_shots: 0,
    home_shots_on_target: 0, away_shots_on_target: 0,
    home_corners: 0, away_corners: 0,
    home_fouls: 0, away_fouls: 0,
    home_yellow_cards: 0, away_yellow_cards: 0,
    home_red_cards: 0, away_red_cards: 0
  });
  const [commentary, setCommentary] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [kickoffSettings, setKickoffSettings] = useState({
    matchLength: 90,
    extraTimeEnabled: false,
    extraTimeLength: 30,
    breakDuration: 15
  });

  // Load match data ONCE
  useEffect(() => {
    loadMatch();
  }, [matchId]);

  // Update timer LOCALLY every second - ZERO DATABASE CALLS!
  useEffect(() => {
    const timer = setInterval(() => {
      if (match && (match.status === 'first_half' || match.status === 'second_half' || match.status === 'extra_time')) {
        const newTime = calculateMatchTime(match);
        setCurrentTime(newTime);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [match]);

  async function loadMatch() {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*, homeTeam:teams!home_team_id(*), awayTeam:teams!away_team_id(*)')
        .eq('id', matchId)
        .single();
      
      if (error) throw error;
      
      setMatch(data);
      setHomeTeam(data.homeTeam);
      setAwayTeam(data.awayTeam);
      setHomeScore(data.home_score || 0);
      setAwayScore(data.away_score || 0);
      setCurrentTime(calculateMatchTime(data));
      
      // Load events
      const { data: eventsData } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('minute', { ascending: true });
      setEvents(eventsData || []);
      
      // Load statistics
      const { data: statsData } = await supabase
        .from('match_statistics')
        .select('*')
        .eq('match_id', matchId)
        .single();
      if (statsData) setStatistics(statsData);
      
      // Load commentary
      const { data: commentaryData } = await supabase
        .from('match_commentary')
        .select('*')
        .eq('match_id', matchId)
        .order('minute', { ascending: true });
      setCommentary(commentaryData || []);
    } catch (err) {
      console.error('Error loading match:', err);
    } finally {
      setLoading(false);
    }
  }

  // START MATCH - 1 DATABASE CALL
  const startMatch = async () => {
    setShowKickoffModal(true);
  };

  const confirmKickoff = async () => {
    try {
      const now = new Date().toISOString();
      await supabase
        .from('matches')
        .update({
          status: 'first_half',
          match_start_time: now,
          elapsed_seconds_before_pause: 0
        })
        .eq('id', matchId);
      
      await supabase.from('match_events').insert([{
        match_id: matchId,
        event_type: 'kickoff',
        minute: 0
      }]);
      
      setShowKickoffModal(false);
      setMatch({ ...match, status: 'first_half' });
      setCurrentTime(0);
      loadMatch();
    } catch (err) {
      console.error('Error starting match:', err);
    }
  };

  // PAUSE MATCH - 1 DATABASE CALL
  const pauseMatch = async () => {
    try {
      const elapsed = calculateMatchTime(match);
      await supabase
        .from('matches')
        .update({
          status: 'paused',
          elapsed_seconds_before_pause: elapsed,
          match_start_time: null
        })
        .eq('id', matchId);
      
      setMatch({ ...match, status: 'paused' });
    } catch (err) {
      console.error('Error pausing match:', err);
    }
  };

  // RESUME MATCH - 1 DATABASE CALL
  const resumeMatch = async () => {
    try {
      const now = new Date().toISOString();
      await supabase
        .from('matches')
        .update({
          status: match.status === 'half_time' ? 'second_half' : 'first_half',
          match_start_time: now
        })
        .eq('id', matchId);
      
      loadMatch();
    } catch (err) {
      console.error('Error resuming match:', err);
    }
  };

  const halfTime = async () => {
    try {
      const elapsed = calculateMatchTime(match);
      await supabase
        .from('matches')
        .update({
          status: 'half_time',
          elapsed_seconds_before_pause: elapsed,
          match_start_time: null
        })
        .eq('id', matchId);
      
      await supabase.from('match_events').insert([{
        match_id: matchId,
        event_type: 'half_time',
        minute: Math.floor(elapsed / 60)
      }]);
      
      setMatch({ ...match, status: 'half_time' });
      loadMatch();
    } catch (err) {
      console.error('Error at half time:', err);
    }
  };

  const startSecondHalf = async () => {
    try {
      const now = new Date().toISOString();
      await supabase
        .from('matches')
        .update({
          status: 'second_half',
          match_start_time: now
        })
        .eq('id', matchId);
      
      await supabase.from('match_events').insert([{
        match_id: matchId,
        event_type: 'second_half',
        minute: 45
      }]);
      
      setMatch({ ...match, status: 'second_half' });
      loadMatch();
    } catch (err) {
      console.error('Error starting second half:', err);
    }
  };

  const fullTime = async () => {
    try {
      const elapsed = calculateMatchTime(match);
      await supabase
        .from('matches')
        .update({
          status: 'finished',
          elapsed_seconds_before_pause: elapsed,
          match_start_time: null,
          is_locked: true,
          confirmed_at: new Date().toISOString()
        })
        .eq('id', matchId);
      
      await supabase.from('match_events').insert([{
        match_id: matchId,
        event_type: 'match_ended',
        minute: Math.floor(elapsed / 60)
      }]);
      
      setMatch({ ...match, status: 'finished' });
      loadMatch();
    } catch (err) {
      console.error('Error at full time:', err);
    }
  };

  const addGoal = async () => {
    const minute = Math.floor(currentTime / 60);
    await supabase.from('match_events').insert([{
      match_id: matchId,
      event_type: 'goal',
      minute
    }]);
    loadMatch();
  };

  const addYellowCard = async () => {
    const minute = Math.floor(currentTime / 60);
    await supabase.from('match_events').insert([{
      match_id: matchId,
      event_type: 'yellow_card',
      minute
    }]);
    loadMatch();
  };

  const addRedCard = async () => {
    const minute = Math.floor(currentTime / 60);
    await supabase.from('match_events').insert([{
      match_id: matchId,
      event_type: 'red_card',
      minute
    }]);
    loadMatch();
  };

  const addCommentary = async () => {
    if (!newComment.trim()) return;
    const minute = Math.floor(currentTime / 60);
    await supabase.from('match_commentary').insert([{
      match_id: matchId,
      minute,
      comment: newComment
    }]);
    setNewComment('');
    loadMatch();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0B0E13]/95 backdrop-blur-xl">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-green font-bold uppercase text-lg">Loading Match...</p>
        </div>
      </div>
    );
  }

  const displayMinute = Math.floor(currentTime / 60);

  return (
    <div className="fixed inset-0 z-[200] bg-[#0B0E13] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-[210] glass border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase">Match Control</h1>
            <p className="text-xs text-white/40">{homeTeam?.name || 'Home'} vs {awayTeam?.name || 'Away'}</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-xl font-black uppercase text-sm flex items-center gap-2 ${
          match.status === 'first_half' || match.status === 'second_half' || match.status === 'extra_time'
            ? 'bg-red-500/20 text-red-500 animate-pulse'
            : 'bg-white/5 text-white/40'
        }`}>
          {match.status === 'first_half' || match.status === 'second_half' || match.status === 'extra_time' ? '🔴 LIVE' : match.status.replace('_', ' ').toUpperCase()}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="px-6 py-8 bg-gradient-to-r from-brand-blue/10 via-transparent to-brand-green/10 border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex-1 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              {homeTeam?.logo_url ? (
                <img src={homeTeam.logo_url} alt={homeTeam.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black">{homeTeam?.short_name?.[0] || 'H'}</span>
              )}
            </div>
            <h2 className="text-lg font-black uppercase">{homeTeam?.name || 'Home Team'}</h2>
            <p className="text-xs text-white/40">{homeTeam?.city || ''}</p>
          </div>

          <div className="flex-1 text-center px-8">
            <div className="text-6xl font-black mb-4">
              <span className="text-brand-green">{homeScore}</span>
              <span className="text-white/30 mx-4">-</span>
              <span className="text-brand-green">{awayScore}</span>
            </div>
            <div className="flex items-center justify-center gap-3 mb-4">
              <Clock size={24} className="text-white/40" />
              <span className="text-4xl font-black">{displayMinute}'</span>
            </div>
            <p className="text-sm font-black uppercase text-white/40">{match.status.replace('_', ' ')}</p>
          </div>

          <div className="flex-1 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              {awayTeam?.logo_url ? (
                <img src={awayTeam.logo_url} alt={awayTeam.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black">{awayTeam?.short_name?.[0] || 'A'}</span>
              )}
            </div>
            <h2 className="text-lg font-black uppercase">{awayTeam?.name || 'Away Team'}</h2>
            <p className="text-xs text-white/40">{awayTeam?.city || ''}</p>
          </div>
        </div>
      </div>

      {/* Match Controls */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3 flex-wrap">
          {match.status === 'scheduled' && (
            <button onClick={startMatch} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-brand-green text-black font-black uppercase hover:scale-105 transition-all">
              <Play size={18} /> Kick Off
            </button>
          )}

          {(match.status === 'first_half' || match.status === 'second_half') && (
            <>
              <button onClick={pauseMatch} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white font-black uppercase hover:scale-105 transition-all">
                <Pause size={16} /> Pause
              </button>
              {match.status === 'first_half' && (
                <button onClick={halfTime} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-black uppercase hover:scale-105 transition-all">
                  <CheckCircle size={16} /> Half Time
                </button>
              )}
              {match.status === 'second_half' && (
                <button onClick={fullTime} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500 text-white font-black uppercase hover:scale-105 transition-all">
                  <CheckCircle size={16} /> Full Time
                </button>
              )}
            </>
          )}

          {match.status === 'paused' && (
            <button onClick={resumeMatch} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-brand-green text-black font-black uppercase hover:scale-105 transition-all">
              <Play size={18} /> Resume
            </button>
          )}

          {match.status === 'half_time' && (
            <button onClick={startSecondHalf} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-brand-green text-black font-black uppercase hover:scale-105 transition-all">
              <Play size={18} /> Start 2nd Half
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-6 py-2 rounded-xl font-bold text-sm uppercase ${
              activeTab === 'events' ? 'bg-brand-green text-black' : 'bg-white/5 text-white/40'
            }`}
          >
            ✓ Events
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`px-6 py-2 rounded-xl font-bold text-sm uppercase ${
              activeTab === 'statistics' ? 'bg-brand-green text-black' : 'bg-white/5 text-white/40'
            }`}
          >
            Statistics
          </button>
          <button
            onClick={() => setActiveTab('commentary')}
            className={`px-6 py-2 rounded-xl font-bold text-sm uppercase ${
              activeTab === 'commentary' ? 'bg-brand-green text-black' : 'bg-white/5 text-white/40'
            }`}
          >
            Commentary
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'events' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={addGoal} className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 font-black uppercase hover:bg-green-500/20 transition-all">
                  Goal
                </button>
                <button onClick={addYellowCard} className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 font-black uppercase hover:bg-yellow-500/20 transition-all">
                  Yellow
                </button>
                <button onClick={addRedCard} className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-black uppercase hover:bg-red-500/20 transition-all">
                  Red
                </button>
                <button className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-500 font-black uppercase hover:bg-blue-500/20 transition-all">
                  🔄 Sub
                </button>
              </div>

              {/* Events List */}
              <div>
                <h3 className="text-xl font-black uppercase mb-4">Match Events</h3>
                <div className="space-y-3">
                  {events.map((event, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-brand-green font-black">{event.minute}'</span>
                      <div className="w-10 h-10 rounded-full bg-brand-blue/20 flex items-center justify-center">
                        📋
                      </div>
                      <span className="font-bold uppercase">{event.event_type.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'statistics' && (
            <div>
              <h3 className="text-xl font-black uppercase mb-4">Match Statistics</h3>
              <div className="space-y-4">
                {Object.entries(statistics).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-sm font-bold uppercase">{key.replace('_', ' ')}</span>
                    <span className="text-lg font-black text-brand-green">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'commentary' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add commentary..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-green/50"
                  onKeyPress={(e) => e.key === 'Enter' && addCommentary()}
                />
                <button onClick={addCommentary} className="px-6 py-3 rounded-xl bg-brand-green text-black font-black uppercase hover:scale-105 transition-all">
                  Post
                </button>
              </div>
              <div className="space-y-3">
                {commentary.map((comm, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-brand-green font-black">{comm.minute}'</span>
                    <p className="mt-2">{comm.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kickoff Modal */}
      {showKickoffModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass rounded-3xl p-8 max-w-md w-full border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black uppercase">Match Settings</h3>
              <button onClick={() => setShowKickoffModal(false)} className="p-2 hover:bg-white/10 rounded-xl">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black uppercase text-white/40 mb-2 block">Match Duration (minutes)</label>
                <input
                  type="number"
                  value={kickoffSettings.matchLength}
                  onChange={(e) => setKickoffSettings(prev => ({ ...prev, matchLength: parseInt(e.target.value) }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-green/50"
                />
              </div>
              
              <div>
                <label className="text-xs font-black uppercase text-white/40 mb-2 block">Break Duration (minutes)</label>
                <input
                  type="number"
                  value={kickoffSettings.breakDuration}
                  onChange={(e) => setKickoffSettings(prev => ({ ...prev, breakDuration: parseInt(e.target.value) }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-green/50"
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <span className="text-sm font-bold">Enable Extra Time</span>
                <button
                  onClick={() => setKickoffSettings(prev => ({ ...prev, extraTimeEnabled: !prev.extraTimeEnabled }))}
                  className={`w-12 h-6 rounded-full transition-all ${kickoffSettings.extraTimeEnabled ? 'bg-brand-green' : 'bg-white/20'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${kickoffSettings.extraTimeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              
              {kickoffSettings.extraTimeEnabled && (
                <div>
                  <label className="text-xs font-black uppercase text-white/40 mb-2 block">Extra Time Duration (minutes)</label>
                  <input
                    type="number"
                    value={kickoffSettings.extraTimeLength}
                    onChange={(e) => setKickoffSettings(prev => ({ ...prev, extraTimeLength: parseInt(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-green/50"
                  />
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowKickoffModal(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-white font-black uppercase text-sm hover:bg-white/10 transition-all">
                  Cancel
                </button>
                <button onClick={confirmKickoff} className="flex-1 py-3 rounded-xl bg-brand-green text-black font-black uppercase text-sm hover:scale-105 transition-all">
                  Kick Off
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
