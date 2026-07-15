import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Clock, CheckCircle, X, Edit2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { updateStandingsAfterMatch, sendMatchNotification } from '../../../lib/MatchAutomation';
import MatchControlPro from './MatchControlPro';

interface MatchControlOrganizedProps {
  matchId: number;
  onBack: () => void;
}

// Calculate match time from timestamps
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

export default function MatchControlOrganized({ matchId, onBack }: MatchControlOrganizedProps) {
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homeTeam, setHomeTeam] = useState<any>(null);
  const [awayTeam, setAwayTeam] = useState<any>(null);
  const [matchStatus, setMatchStatus] = useState('scheduled');
  const [currentTime, setCurrentTime] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [showKickoffModal, setShowKickoffModal] = useState(false);
  const [kickoffSettings, setKickoffSettings] = useState({
    matchLength: 90,
    extraTimeEnabled: false,
    extraTimeLength: 30,
    breakDuration: 15
  });
  
  const realtimeChannel = useRef<any>(null);

  // Load match data
  useEffect(() => {
    loadMatch();
    
    // Setup realtime subscription
    realtimeChannel.current = supabase
      .channel(`match-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => {
          console.log('Realtime update:', payload.new);
          setMatch(payload.new);
          if (payload.new.home_score !== undefined) setHomeScore(payload.new.home_score);
          if (payload.new.away_score !== undefined) setAwayScore(payload.new.away_score);
          if (payload.new.status) setMatchStatus(payload.new.status);
        }
      )
      .subscribe();
    
    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
      }
    };
  }, [matchId]);

  // Update timer every second when live
  useEffect(() => {
    const timer = setInterval(() => {
      if (match && (match.status === 'first_half' || match.status === 'second_half' || match.status === 'extra_time')) {
        setCurrentTime(calculateMatchTime(match));
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
      setMatchStatus(data.status || 'scheduled');
      setCurrentTime(calculateMatchTime(data));
      
      // Load events
      const { data: eventsData } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('minute', { ascending: true });
      setEvents(eventsData || []);
    } catch (err) {
      console.error('Error loading match:', err);
    } finally {
      setLoading(false);
    }
  }

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
      setMatchStatus('first_half');
      setCurrentTime(0);
    } catch (err) {
      console.error('Error starting match:', err);
    }
  };

  const pauseMatch = async () => {
    try {
      // Calculate elapsed time before pausing
      const elapsed = calculateMatchTime(match);
      await supabase
        .from('matches')
        .update({
          status: 'paused',
          elapsed_seconds_before_pause: elapsed,
          match_start_time: null
        })
        .eq('id', matchId);
      
      setMatchStatus('paused');
    } catch (err) {
      console.error('Error pausing match:', err);
    }
  };

  const resumeMatch = async () => {
    try {
      const now = new Date().toISOString();
      await supabase
        .from('matches')
        .update({
          status: matchStatus === 'half_time' ? 'second_half' : matchStatus,
          match_start_time: now
        })
        .eq('id', matchId);
      
      setMatchStatus(matchStatus === 'half_time' ? 'second_half' : matchStatus);
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
      
      setMatchStatus('half_time');
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
      
      setMatchStatus('second_half');
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
      
      setMatchStatus('finished');
      
      // Trigger automation
      await updateStandingsAfterMatch(matchId);
      await sendMatchNotification('full_time', matchId);
    } catch (err) {
      console.error('Error at full time:', err);
    }
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
          matchStatus === 'first_half' || matchStatus === 'second_half' || matchStatus === 'extra_time'
            ? 'bg-red-500/20 text-red-500 animate-pulse'
            : 'bg-white/5 text-white/40'
        }`}>
          {matchStatus === 'first_half' || matchStatus === 'second_half' || matchStatus === 'extra_time' ? '🔴 LIVE' : matchStatus.replace('_', ' ').toUpperCase()}
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
            <p className="text-sm font-black uppercase text-white/40">{matchStatus.replace('_', ' ')}</p>
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
          {matchStatus === 'scheduled' && (
            <button onClick={startMatch} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-brand-green text-black font-black uppercase hover:scale-105 transition-all">
              <Play size={18} /> Kick Off
            </button>
          )}

          {(matchStatus === 'first_half' || matchStatus === 'second_half' || matchStatus === 'extra_time') && (
            <>
              <button onClick={pauseMatch} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white font-black uppercase hover:scale-105 transition-all">
                <Pause size={16} /> Pause
              </button>
              {matchStatus === 'first_half' && (
                <button onClick={halfTime} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-black uppercase hover:scale-105 transition-all">
                  <CheckCircle size={16} /> Half Time
                </button>
              )}
              {matchStatus === 'second_half' && (
                <button onClick={fullTime} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500 text-white font-black uppercase hover:scale-105 transition-all">
                  <CheckCircle size={16} /> Full Time
                </button>
              )}
            </>
          )}

          {matchStatus === 'paused' && (
            <button onClick={resumeMatch} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-brand-green text-black font-black uppercase hover:scale-105 transition-all">
              <Play size={18} /> Resume
            </button>
          )}

          {matchStatus === 'half_time' && (
            <button onClick={startSecondHalf} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-brand-green text-black font-black uppercase hover:scale-105 transition-all">
              <Play size={18} /> Start 2nd Half
            </button>
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
              
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <span className="text-sm font-bold">Enable Extra Time</span>
                <button
                  onClick={() => setKickoffSettings(prev => ({ ...prev, extraTimeEnabled: !prev.extraTimeEnabled }))}
                  className={`w-12 h-6 rounded-full transition-all ${kickoffSettings.extraTimeEnabled ? 'bg-brand-green' : 'bg-white/20'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${kickoffSettings.extraTimeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              
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
