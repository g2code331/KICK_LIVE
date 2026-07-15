import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Pause } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface MatchControlSimpleProps {
  matchId: number;
  onBack: () => void;
}

// Calculate match time from timestamps - RUNS LOCALLY, ZERO DB CALLS
function calculateMatchTime(match: any): number {
  if (!match) return 0;
  if (match.status === 'scheduled' || match.status === 'waiting') return 0;
  
  // If paused or finished, return saved time
  if (match.status === 'paused' || match.status === 'half_time' || match.status === 'full_time' || match.status === 'finished') {
    return match.elapsed_seconds_before_pause || 0;
  }
  
  // If live, calculate from timestamps
  if (match.status === 'first_half' || match.status === 'second_half' || match.status === 'extra_time') {
    const now = new Date();
    const startTime = new Date(match.match_start_time || now);
    const secondsPassed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    return (match.elapsed_seconds_before_pause || 0) + secondsPassed;
  }
  
  return 0;
}

export default function MatchControlSimple({ matchId, onBack }: MatchControlSimpleProps) {
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homeTeam, setHomeTeam] = useState<any>(null);
  const [awayTeam, setAwayTeam] = useState<any>(null);

  // Load match data ONCE
  useEffect(() => {
    loadMatch();
  }, [matchId]);

  // Update timer LOCALLY every second - ZERO DATABASE CALLS!
  useEffect(() => {
    const timer = setInterval(() => {
      if (match && (match.status === 'first_half' || match.status === 'second_half' || match.status === 'extra_time')) {
        // Calculate time locally using timestamp physics
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
    } catch (err) {
      console.error('Error loading match:', err);
    } finally {
      setLoading(false);
    }
  }

  // START MATCH - 1 DATABASE CALL
  const startMatch = async () => {
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
      
      // Reload to get updated data
      loadMatch();
    } catch (err) {
      console.error('Error starting match:', err);
    }
  };

  // PAUSE MATCH - 1 DATABASE CALL
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
          status: 'first_half',
          match_start_time: now
        })
        .eq('id', matchId);
      
      loadMatch();
    } catch (err) {
      console.error('Error resuming match:', err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0B0E13]/95 backdrop-blur-xl">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-green font-bold uppercase text-lg">Loading...</p>
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
        <div className={`px-4 py-2 rounded-xl font-black uppercase text-sm ${
          match.status === 'first_half' || match.status === 'second_half'
            ? 'bg-red-500/20 text-red-500'
            : 'bg-white/5 text-white/40'
        }`}>
          {match.status === 'first_half' || match.status === 'second_half' ? '🔴 LIVE' : match.status.toUpperCase()}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="px-6 py-12 bg-gradient-to-r from-brand-blue/10 via-transparent to-brand-green/10 border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex-1 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <span className="text-3xl font-black">{homeTeam?.short_name?.[0] || 'H'}</span>
            </div>
            <h2 className="text-lg font-black uppercase">{homeTeam?.name || 'Home Team'}</h2>
          </div>

          <div className="flex-1 text-center px-8">
            <div className="text-6xl font-black mb-4">
              <span className="text-brand-green">{homeScore}</span>
              <span className="text-white/30 mx-4">-</span>
              <span className="text-brand-green">{awayScore}</span>
            </div>
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-4xl font-black">{displayMinute}'</span>
            </div>
            <p className="text-sm font-black uppercase text-white/40">{match.status.replace('_', ' ')}</p>
          </div>

          <div className="flex-1 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <span className="text-3xl font-black">{awayTeam?.short_name?.[0] || 'A'}</span>
            </div>
            <h2 className="text-lg font-black uppercase">{awayTeam?.name || 'Away Team'}</h2>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
          {match.status === 'scheduled' && (
            <button onClick={startMatch} className="flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-green text-black font-black uppercase text-lg hover:scale-105 transition-all">
              <Play size={24} /> KICK OFF
            </button>
          )}

          {(match.status === 'first_half' || match.status === 'second_half') && (
            <button onClick={pauseMatch} className="flex items-center gap-2 px-8 py-4 rounded-xl bg-orange-500 text-white font-black uppercase text-lg hover:scale-105 transition-all">
              <Pause size={24} /> PAUSE
            </button>
          )}

          {match.status === 'paused' && (
            <button onClick={resumeMatch} className="flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-green text-black font-black uppercase text-lg hover:scale-105 transition-all">
              <Play size={24} /> RESUME
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
