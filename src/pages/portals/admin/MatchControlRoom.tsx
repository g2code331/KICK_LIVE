import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Clock, Users, MessageSquare, 
  Camera, FileText, Settings, Undo, Redo, Search, Filter,
  Trophy, MapPin, Calendar, User, Shield, AlertCircle, CheckCircle,
  X, Save, Download, Upload, Mic, Video, Image, Plus, Trash2,
  Edit2, ChevronDown, ChevronUp, Activity, BarChart3
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { updateStandingsAfterMatch, sendMatchNotification } from '../../../lib/MatchAutomation';

interface MatchControlRoomProps {
  matchId: number;
  onClose: () => void;
}

type MatchStatus = 'waiting' | 'ready' | 'kickoff' | 'first_half' | 'half_time' | 
                   'second_half' | 'extra_time' | 'penalty_shootout' | 
                   'full_time' | 'suspended' | 'postponed' | 'abandoned' | 
                   'cancelled' | 'completed';

type EventType = 'goal' | 'own_goal' | 'penalty_awarded' | 'penalty_goal' | 'penalty_missed' |
                 'var_review' | 'var_overturned' | 'yellow_card' | 'second_yellow' | 'red_card' |
                 'substitution' | 'injury' | 'corner' | 'offside' | 'free_kick' | 
                 'throw_in' | 'goal_kick' | 'water_break' | 'kickoff' | 
                 'half_time' | 'second_half' | 'extra_time' | 'penalty_shootout' | 
                 'match_suspended' | 'match_resumed' | 'match_ended';

export default function MatchControlRoom({ matchId, onClose }: MatchControlRoomProps) {
  // Match State
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matchStatus, setMatchStatus] = useState<MatchStatus>('waiting');
  const [minute, setMinute] = useState(0);
  const [extraTime, setExtraTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [period, setPeriod] = useState(1);
  
  // Score
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  
  // Teams
  const [homeTeam, setHomeTeam] = useState<any>(null);
  const [awayTeam, setAwayTeam] = useState<any>(null);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  
  // Events
  const [events, setEvents] = useState<any[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [eventForm, setEventForm] = useState({
    teamId: '',
    playerId: '',
    assistId: '',
    minute: 0,
    extraMinute: 0,
    goalType: 'normal',
    cardReason: '',
    subReason: '',
    description: '',
    photoUrl: '',
    notes: ''
  });
  
  // Statistics
  const [stats, setStats] = useState<any>({
    home_possession: 50,
    away_possession: 50,
    home_shots: 0,
    away_shots: 0,
    home_shots_on_target: 0,
    away_shots_on_target: 0,
    home_corners: 0,
    away_corners: 0,
    home_offsides: 0,
    away_offsides: 0,
    home_fouls: 0,
    away_fouls: 0,
    home_yellow_cards: 0,
    away_yellow_cards: 0,
    home_red_cards: 0,
    away_red_cards: 0,
    home_saves: 0,
    away_saves: 0
  });
  
  // Lineups
  const [lineups, setLineups] = useState<any>({
    home: { formation: '', coach: '', captain: '', starting: [], bench: [] },
    away: { formation: '', coach: '', captain: '', starting: [], bench: [] }
  });
  
  // Commentary
  const [commentary, setCommentary] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  
  // Active Tab
  const [activeTab, setActiveTab] = useState<'events' | 'stats' | 'lineups' | 'commentary' | 'media' | 'officials'>('events');
  
  // Undo/Redo
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Auto-save timer
  const autoSaveRef = useRef<NodeJS.Timeout>();
  
  // Load Match Data
  useEffect(() => {
    loadMatch();
  }, [matchId]);
  
  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && !['half_time', 'full_time', 'waiting', 'suspended'].includes(matchStatus)) {
      interval = setInterval(() => {
        setMinute(m => {
          if (period === 1 && m >= 45) {
            return 45;
          }
          if (period === 2 && m >= 90) {
            return 90;
          }
          return m + 1;
        });
        
        // Auto-save every minute
        saveMatchState();
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, matchStatus, period]);
  
  async function loadMatch() {
    try {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*, homeTeam:teams!home_team_id(*), awayTeam:teams!away_team_id(*)')
        .eq('id', matchId)
        .single();
      
      if (matchData) {
        setMatch(matchData);
        setHomeTeam(matchData.homeTeam);
        setAwayTeam(matchData.awayTeam);
        setHomeScore(matchData.home_score || 0);
        setAwayScore(matchData.away_score || 0);
        setMatchStatus(matchData.status || 'waiting');
        setMinute(matchData.minute || 0);
        
        // Load all players for both teams
        const { data: playersData } = await supabase
          .from('players')
          .select('*')
          .in('team_id', [matchData.home_team_id, matchData.away_team_id]);
        setAllPlayers(playersData || []);
        
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
        if (statsData) setStats(statsData);
        
        // Load commentary
        const { data: commentaryData } = await supabase
          .from('match_commentary')
          .select('*')
          .eq('match_id', matchId)
          .order('minute', { ascending: true });
        setCommentary(commentaryData || []);
        
        // Load lineups
        const { data: lineupsData } = await supabase
          .from('match_lineups')
          .select('*')
          .eq('match_id', matchId);
        if (lineupsData && lineupsData.length > 0) {
          const homeLineup = lineupsData.find(l => l.team_id === matchData.home_team_id);
          const awayLineup = lineupsData.find(l => l.team_id === matchData.away_team_id);
          setLineups({
            home: homeLineup || { formation: '', coach: '', starting: [], bench: [] },
            away: awayLineup || { formation: '', coach: '', starting: [], bench: [] }
          });
        }
      }
    } catch (err) {
      console.error('Error loading match:', err);
    } finally {
      setLoading(false);
    }
  }
  
  // Save match state for undo/redo
  const saveToHistory = () => {
    const newState = {
      minute,
      homeScore,
      awayScore,
      matchStatus,
      events: [...events],
      stats: { ...stats }
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  // Undo last action
  const undo = async () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setMinute(prevState.minute);
      setHomeScore(prevState.homeScore);
      setAwayScore(prevState.awayScore);
      setMatchStatus(prevState.matchStatus);
      setEvents(prevState.events);
      setStats(prevState.stats);
      setHistoryIndex(historyIndex - 1);
      
      // Update database
      await supabase.from('matches').update({
        minute: prevState.minute,
        home_score: prevState.homeScore,
        away_score: prevState.awayScore,
        status: prevState.matchStatus
      }).eq('id', matchId);
    }
  };
  
  // Redo action
  const redo = async () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setMinute(nextState.minute);
      setHomeScore(nextState.homeScore);
      setAwayScore(nextState.awayScore);
      setMatchStatus(nextState.matchStatus);
      setEvents(nextState.events);
      setStats(nextState.stats);
      setHistoryIndex(historyIndex + 1);
      
      // Update database
      await supabase.from('matches').update({
        minute: nextState.minute,
        home_score: nextState.homeScore,
        away_score: nextState.awayScore,
        status: nextState.matchStatus
      }).eq('id', matchId);
    }
  };
  
  // Auto-save match state
  const saveMatchState = async () => {
    try {
      await supabase.from('matches').update({
        minute,
        status: matchStatus,
        status_detail: matchStatus.replace('_', ' ').toUpperCase()
      }).eq('id', matchId);
      
      console.log('Match state auto-saved');
    } catch (err) {
      console.error('Error auto-saving:', err);
    }
  };
  
  // Match Control Functions
  const startMatch = async () => {
    saveToHistory();
    setMatchStatus('kickoff');
    setIsTimerRunning(true);
    await addEvent('kickoff', 0);
    await updateMatchStatus('kickoff');
  };
  
  const pauseMatch = async () => {
    setIsTimerRunning(false);
    await updateMatchStatus('suspended');
  };
  
  const resumeMatch = async () => {
    setIsTimerRunning(true);
    await updateMatchStatus(matchStatus === 'half_time' ? 'second_half' : matchStatus);
  };
  
  const startFirstHalf = async () => {
    saveToHistory();
    setPeriod(1);
    setMatchStatus('first_half');
    setIsTimerRunning(true);
    await addEvent('kickoff', 0);
    await updateMatchStatus('first_half');
  };
  
  const endFirstHalf = async () => {
    setIsTimerRunning(false);
    setMatchStatus('half_time');
    await addEvent('half_time', minute);
    await updateMatchStatus('half_time');
  };
  
  const startSecondHalf = async () => {
    saveToHistory();
    setPeriod(2);
    setMatchStatus('second_half');
    setIsTimerRunning(true);
    await addEvent('second_half', minute);
    await updateMatchStatus('second_half');
  };
  
  const endMatch = async () => {
    setIsTimerRunning(false);
    setMatchStatus('full_time');
    await addEvent('match_ended', minute);
    await updateMatchStatus('full_time');
    await finalizeMatch();
  };
  
  const updateMatchStatus = async (status: string) => {
    try {
      await supabase
        .from('matches')
        .update({ 
          status, 
          minute,
          status_detail: status.replace('_', ' ').toUpperCase()
        })
        .eq('id', matchId);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };
  
  const addEvent = async (eventType: string, minute: number, data?: any) => {
    try {
      saveToHistory();
      
      const { data: eventData, error } = await supabase
        .from('match_events')
        .insert([{
          match_id: matchId,
          event_type: eventType,
          minute: data?.minute || minute,
          extra_minute: data?.extraMinute || 0,
          team_id: data?.teamId,
          player_id: data?.playerId,
          assist_player_id: data?.assistId,
          description: data?.description,
          goal_type: data?.goalType,
          card_reason: data?.cardReason,
          substitution_reason: data?.subReason,
          notes: data?.notes
        }])
        .select()
        .single();
      
      if (eventData) {
        setEvents(prev => [...prev, eventData]);
        // Log to audit trail
        await logAudit('event_added', 'match_event', eventData.id, null, eventData);
      }
    } catch (err) {
      console.error('Error adding event:', err);
    }
  };
  
  const addGoal = async (teamId: number, playerId: number, assistId?: number, goalType: string = 'normal', minuteOverride?: number) => {
    const scoringTeam = teamId === homeTeam?.id ? 'home' : 'away';
    const newScore = scoringTeam === 'home' ? homeScore + 1 : awayScore + 1;
    
    saveToHistory();
    
    if (scoringTeam === 'home') {
      setHomeScore(newScore);
    } else {
      setAwayScore(newScore);
    }
    
    await addEvent('goal', minuteOverride || minute, { 
      teamId, 
      playerId, 
      assistId, 
      goalType,
      minute: minuteOverride || minute,
      description: `GOAL! ${goalType !== 'normal' ? goalType.replace('_', ' ') + ' goal' : ''}` 
    });
    
    // Update match score
    await supabase
      .from('matches')
      .update({
        home_score: scoringTeam === 'home' ? newScore : homeScore,
        away_score: scoringTeam === 'away' ? newScore : awayScore
      })
      .eq('id', matchId);
    
    // Update statistics
    if (scoringTeam === 'home') {
      setStats(s => ({ ...s, home_shots: s.home_shots + 1, home_shots_on_target: s.home_shots_on_target + 1 }));
    } else {
      setStats(s => ({ ...s, away_shots: s.away_shots + 1, away_shots_on_target: s.away_shots_on_target + 1 }));
    }
    
    setShowEventModal(false);
  };
  
  const addCard = async (teamId: number, playerId: number, cardType: 'yellow' | 'red' | 'second_yellow', reason?: string) => {
    saveToHistory();
    
    await addEvent(cardType === 'yellow' ? 'yellow_card' : cardType === 'red' ? 'red_card' : 'second_yellow', minute, { 
      teamId, playerId, cardReason: reason 
    });
    
    // Update statistics
    if (cardType === 'yellow') {
      setStats(s => ({
        ...s,
        home_yellow_cards: teamId === homeTeam?.id ? s.home_yellow_cards + 1 : s.home_yellow_cards,
        away_yellow_cards: teamId === awayTeam?.id ? s.away_yellow_cards + 1 : s.away_yellow_cards
      }));
    } else {
      setStats(s => ({
        ...s,
        home_red_cards: teamId === homeTeam?.id ? s.home_red_cards + 1 : s.home_red_cards,
        away_red_cards: teamId === awayTeam?.id ? s.away_red_cards + 1 : s.away_red_cards
      }));
    }
    
    setShowEventModal(false);
  };
  
  const addSubstitution = async (teamId: number, playerOut: number, playerIn: number, reason?: string) => {
    saveToHistory();
    
    await addEvent('substitution', minute, { 
      teamId, playerId: playerIn, 
      description: `${playerIn} replaces ${playerOut}${reason ? ` - ${reason}` : ''}`,
      subReason: reason
    });
    
    setShowEventModal(false);
  };
  
  const addCorner = async (teamId: number) => {
    setStats(s => ({
      ...s,
      home_corners: teamId === homeTeam?.id ? s.home_corners + 1 : s.home_corners,
      away_corners: teamId === awayTeam?.id ? s.away_corners + 1 : s.away_corners
    }));
  };
  
  const addCommentary = async () => {
    if (!newComment.trim()) return;
    
    try {
      const { data } = await supabase
        .from('match_commentary')
        .insert([{
          match_id: matchId,
          minute,
          comment: newComment,
          is_important: false
        }])
        .select()
        .single();
      
      if (data) {
        setCommentary(prev => [...prev, data]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Error adding commentary:', err);
    }
  };
  
  const updateStat = async (stat: string, value: number, team: 'home' | 'away') => {
    const statKey = `${team}_${stat}`;
    setStats(s => ({ ...s, [statKey]: value }));
    
    try {
      await supabase
        .from('match_statistics')
        .upsert({
          match_id: matchId,
          [statKey]: value,
          updated_at: new Date().toISOString()
        });
    } catch (err) {
      console.error('Error updating stat:', err);
    }
  };
  
  const logAudit = async (action: string, entityType: string, entityId: number, oldValue: any, newValue: any) => {
    try {
      await supabase.from('match_audit_logs').insert([{
        match_id: matchId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_value: oldValue,
        new_value: newValue
      }]);
    } catch (err) {
      console.error('Error logging audit:', err);
    }
  };
  
  const generateMatchReport = async (matchId: number) => {
    console.log('[MatchControl] Generating match report for:', matchId);
    
    // Get match details
    const { data: match } = await supabase
      .from('matches')
      .select('*, homeTeam:teams!home_team_id(*), awayTeam:teams!away_team_id(*)')
      .eq('id', matchId)
      .single();
    
    if (!match) return;
    
    // Get events
    const { data: events } = await supabase
      .from('match_events')
      .select('*')
      .eq('match_id', matchId)
      .order('minute', { ascending: true });
    
    // Get statistics
    const { data: stats } = await supabase
      .from('match_statistics')
      .select('*')
      .eq('match_id', matchId)
      .single();
    
    // Get commentary
    const { data: commentary } = await supabase
      .from('match_commentary')
      .select('*')
      .eq('match_id', matchId)
      .order('minute', { ascending: true });
    
    // Generate report
    const report = {
      matchId: match.id,
      competition: match.competition,
      homeTeam: match.homeTeam?.name,
      awayTeam: match.awayTeam?.name,
      homeScore: match.home_score,
      awayScore: match.away_score,
      status: match.status,
      minute: match.minute,
      events: events || [],
      statistics: stats,
      commentary: commentary || [],
      generatedAt: new Date().toISOString(),
      venue: match.venue,
      attendance: match.attendance
    };
    
    // Store in match_reports table
    await supabase.from('match_reports').insert({
      match_id: matchId,
      report_data: report,
      generated_at: new Date().toISOString()
    });
    
    console.log('[MatchControl] Match report generated!');
  };
  
  const finalizeMatch = async () => {
    try {
      saveToHistory();
      
      await supabase
        .from('matches')
        .update({
          status: 'finished',
          is_locked: true,
          confirmed_at: new Date().toISOString()
        })
        .eq('id', matchId);
      
      // Log audit
      await logAudit('match_finalized', 'match', matchId, { status: matchStatus }, { status: 'finished' });
      
      // TRIGGER AUTOMATION
      console.log('[MatchControl] Match finalized - triggering automation...');
      
      // Update standings automatically
      await updateStandingsAfterMatch(matchId);
      
      // Send notifications
      await sendMatchNotification('full_time', matchId);
      
      // Generate match report
      await generateMatchReport(matchId);
      
      console.log('[MatchControl] Automation complete!');
      
      alert('✅ Match finalized!\n\n✅ Standings updated automatically\n✅ Statistics calculated\n✅ Match report generated\n✅ Notifications sent');
    } catch (err) {
      console.error('Error finalizing match:', err);
      alert('Error finalizing match: ' + err);
    }
  };
  
  const validateAction = (action: string): { valid: boolean; message?: string } => {
    if (matchStatus === 'waiting' && action !== 'startMatch') {
      return { valid: false, message: 'Match must start before recording events' };
    }
    
    if (matchStatus === 'full_time' && action !== 'finalize') {
      return { valid: false, message: 'Match has ended' };
    }
    
    return { valid: true };
  };
  
  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0B0E13]/95 backdrop-blur-xl">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-green font-bold uppercase text-lg">Loading Match Control Room...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0B0E13]/95 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-7xl glass rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in duration-500 my-8">
        
        {/* Header */}
        <div className="px-10 py-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-brand-blue/10 via-transparent to-brand-green/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center">
              <Activity className="text-red-500" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase">Match Control Room</h1>
              <p className="text-xs text-white/40">{match?.competition || 'Competition'} • {homeTeam?.name || 'Home'} vs {awayTeam?.name || 'Away'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`px-6 py-3 rounded-xl font-black uppercase text-sm flex items-center gap-2 ${
              isTimerRunning ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-white/5 text-white/40'
            }`}>
              {isTimerRunning ? '🔴 LIVE' : 'PAUSED'}
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-xl transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>
        
        {/* Scoreboard */}
        <div className="px-10 py-8 bg-gradient-to-r from-brand-blue/10 via-transparent to-brand-green/10 border-b border-white/10">
          <div className="flex items-center justify-between">
            {/* Home Team */}
            <div className="flex-1 text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-4xl font-black">{homeTeam?.short_name?.[0] || 'H'}</span>
              </div>
              <h2 className="text-xl font-black uppercase">{homeTeam?.name || 'Home Team'}</h2>
              <p className="text-xs text-white/40">{homeTeam?.city || ''}</p>
            </div>
            
            {/* Score & Timer */}
            <div className="flex-1 text-center px-8">
              <div className="text-7xl font-black mb-4">
                <span className="text-brand-green">{homeScore}</span>
                <span className="text-white/30 mx-6">-</span>
                <span className="text-brand-green">{awayScore}</span>
              </div>
              <div className="flex items-center justify-center gap-3 mb-4">
                <Clock size={24} className="text-white/40" />
                <span className="text-4xl font-black">
                  {minute}'{extraTime > 0 && <span className="text-2xl text-white/40">+{extraTime}</span>}
                </span>
              </div>
              <div className="text-sm font-black uppercase text-white/40">{matchStatus.replace('_', ' ')}</div>
            </div>
            
            {/* Away Team */}
            <div className="flex-1 text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-4xl font-black">{awayTeam?.short_name?.[0] || 'A'}</span>
              </div>
              <h2 className="text-xl font-black uppercase">{awayTeam?.name || 'Away Team'}</h2>
              <p className="text-xs text-white/40">{awayTeam?.city || ''}</p>
            </div>
          </div>
        </div>
        
        {/* Match Controls */}
        <div className="px-10 py-6 border-b border-white/10 flex items-center justify-center gap-4">
          {matchStatus === 'waiting' && (
            <button onClick={startFirstHalf} className="flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-green text-black font-black uppercase tracking-widest hover:scale-105 transition-all">
              <Play size={20} /> Kick Off
            </button>
          )}
          
          {matchStatus === 'first_half' && (
            <>
              <button onClick={pauseMatch} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white font-black uppercase hover:scale-105 transition-all">
                <Pause size={18} /> Pause
              </button>
              <button onClick={endFirstHalf} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500 text-white font-black uppercase hover:scale-105 transition-all">
                <CheckCircle size={18} /> Half Time
              </button>
            </>
          )}
          
          {matchStatus === 'half_time' && (
            <button onClick={startSecondHalf} className="flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-green text-black font-black uppercase tracking-widest hover:scale-105 transition-all">
              <Play size={20} /> Start 2nd Half
            </button>
          )}
          
          {matchStatus === 'second_half' && (
            <>
              <button onClick={pauseMatch} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white font-black uppercase hover:scale-105 transition-all">
                <Pause size={18} /> Pause
              </button>
              <button onClick={endMatch} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500 text-white font-black uppercase hover:scale-105 transition-all">
                <CheckCircle size={18} /> Full Time
              </button>
            </>
          )}
          
          {matchStatus === 'suspended' && (
            <button onClick={resumeMatch} className="flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-green text-black font-black uppercase tracking-widest hover:scale-105 transition-all">
              <Play size={20} /> Resume
            </button>
          )}
          
          {/* Undo/Redo */}
          <div className="flex items-center gap-2 ml-8">
            <button onClick={undo} disabled={historyIndex <= 0} className="p-3 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <Undo size={20} />
            </button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-3 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <Redo size={20} />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-10 py-4 border-b border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'events', label: 'Events', icon: <Activity size={16} /> },
            { id: 'stats', label: 'Statistics', icon: <BarChart3 size={16} /> },
            { id: 'lineups', label: 'Lineups', icon: <Users size={16} /> },
            { id: 'commentary', label: 'Commentary', icon: <MessageSquare size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-brand-green text-black shadow-lg shadow-brand-green/30'
                  : 'bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        
        {/* Content Area */}
        <div className="p-10 max-h-[600px] overflow-y-auto">
          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => { setSelectedEventType('goal'); setShowEventModal(true); }} className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 font-black uppercase hover:bg-green-500/20 transition-all">
                  ⚽ Goal
                </button>
                <button onClick={() => { setSelectedEventType('yellow_card'); setShowEventModal(true); }} className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 font-black uppercase hover:bg-yellow-500/20 transition-all">
                  🟨 Yellow Card
                </button>
                <button onClick={() => { setSelectedEventType('red_card'); setShowEventModal(true); }} className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-black uppercase hover:bg-red-500/20 transition-all">
                  🟥 Red Card
                </button>
                <button onClick={() => { setSelectedEventType('substitution'); setShowEventModal(true); }} className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-500 font-black uppercase hover:bg-blue-500/20 transition-all">
                  🔄 Substitution
                </button>
              </div>
              
              {/* Event Timeline */}
              <div className="space-y-4">
                <h3 className="text-xl font-black uppercase">Match Timeline</h3>
                {events.map((event, i) => (
                  <div key={event.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="w-20 text-center">
                      <span className="text-lg font-black text-brand-green">{event.minute}'{event.extra_minute > 0 && `+${event.extra_minute}`}</span>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      event.event_type === 'goal' ? 'bg-green-500/20 text-green-500' :
                      event.event_type.includes('card') ? 'bg-yellow-500/20 text-yellow-500' :
                      event.event_type === 'substitution' ? 'bg-blue-500/20 text-blue-500' :
                      'bg-white/10 text-white/40'
                    }`}>
                      {event.event_type === 'goal' ? '' :
                       event.event_type === 'yellow_card' ? '🟨' :
                       event.event_type === 'red_card' ? '🟥' :
                       event.event_type === 'substitution' ? '🔄' : '📋'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold uppercase">{event.event_type.replace('_', ' ')}</p>
                      <p className="text-xs text-white/40">{event.description || ''}</p>
                      {event.player_id && (
                        <p className="text-xs text-brand-blue">Player ID: {event.player_id}</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {events.length === 0 && (
                  <div className="text-center py-12 text-white/40">
                    <Activity size={64} className="mx-auto mb-4 opacity-20" />
                    <p>No events yet. Kick off to start recording!</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase">Live Statistics</h3>
              
              <div className="space-y-6">
                {[
                  { label: 'Possession %', home: stats.home_possession, away: stats.away_possession, stat: 'possession' },
                  { label: 'Shots', home: stats.home_shots, away: stats.away_shots, stat: 'shots' },
                  { label: 'Shots on Target', home: stats.home_shots_on_target, away: stats.away_shots_on_target, stat: 'shots_on_target' },
                  { label: 'Corners', home: stats.home_corners, away: stats.away_corners, stat: 'corners' },
                  { label: 'Offsides', home: stats.home_offsides, away: stats.away_offsides, stat: 'offsides' },
                  { label: 'Fouls', home: stats.home_fouls, away: stats.away_fouls, stat: 'fouls' },
                  { label: 'Yellow Cards', home: stats.home_yellow_cards, away: stats.away_yellow_cards, stat: 'yellow_cards' },
                  { label: 'Red Cards', home: stats.home_red_cards, away: stats.away_red_cards, stat: 'red_cards' },
                  { label: 'Saves', home: stats.home_saves, away: stats.away_saves, stat: 'saves' },
                ].map((stat, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-right w-12">{stat.home}</span>
                      <span className="text-xs text-white/40 uppercase flex-1 text-center">{stat.label}</span>
                      <span className="text-sm font-bold w-12">{stat.away}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-green transition-all" style={{ width: `${stat.home}%` }} />
                      </div>
                      <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-blue transition-all" style={{ width: `${stat.away}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => updateStat(stat.stat, stat.home + 1, 'home')} className="text-xs text-brand-green hover:underline">+ Home</button>
                      <button onClick={() => updateStat(stat.stat, stat.away + 1, 'away')} className="text-xs text-brand-blue hover:underline">+ Away</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Lineups Tab */}
          {activeTab === 'lineups' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase">Match Lineups</h3>
              
              <div className="grid grid-cols-2 gap-6">
                {/* Home Team */}
                <div className="glass rounded-2xl p-6 border border-white/10">
                  <h4 className="text-lg font-black uppercase mb-4">{homeTeam?.name || 'Home'}</h4>
                  <div className="space-y-2">
                    <p className="text-xs text-white/40">Formation: {lineups.home?.formation || 'Not set'}</p>
                    <p className="text-xs text-white/40">Coach: {lineups.home?.coach || 'Not set'}</p>
                    <div className="mt-4">
                      <p className="text-sm font-bold mb-2">Starting XI:</p>
                      {lineups.home?.starting?.length > 0 ? (
                        <div className="space-y-1">
                          {lineups.home.starting.map((playerId: number, i: number) => {
                            const player = allPlayers.find(p => p.id === playerId);
                            return player ? (
                              <div key={playerId} className="text-xs flex items-center gap-2">
                                <span className="text-brand-green font-bold">{player.number}</span>
                                <span>{player.name}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-white/30">Not set</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Away Team */}
                <div className="glass rounded-2xl p-6 border border-white/10">
                  <h4 className="text-lg font-black uppercase mb-4">{awayTeam?.name || 'Away'}</h4>
                  <div className="space-y-2">
                    <p className="text-xs text-white/40">Formation: {lineups.away?.formation || 'Not set'}</p>
                    <p className="text-xs text-white/40">Coach: {lineups.away?.coach || 'Not set'}</p>
                    <div className="mt-4">
                      <p className="text-sm font-bold mb-2">Starting XI:</p>
                      {lineups.away?.starting?.length > 0 ? (
                        <div className="space-y-1">
                          {lineups.away.starting.map((playerId: number, i: number) => {
                            const player = allPlayers.find(p => p.id === playerId);
                            return player ? (
                              <div key={playerId} className="text-xs flex items-center gap-2">
                                <span className="text-brand-blue font-bold">{player.number}</span>
                                <span>{player.name}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-white/30">Not set</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Commentary Tab */}
          {activeTab === 'commentary' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase">Live Commentary</h3>
              
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type live commentary..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-brand-green/50"
                  onKeyPress={(e) => e.key === 'Enter' && addCommentary()}
                />
                <button
                  onClick={addCommentary}
                  className="px-6 py-3 rounded-xl bg-brand-green text-black font-black uppercase hover:scale-105 transition-all"
                >
                  Post
                </button>
              </div>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {commentary.map((comm) => (
                  <div key={comm.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-brand-green font-black">{comm.minute}'</span>
                    <p className="mt-2">{comm.comment}</p>
                  </div>
                ))}
                
                {commentary.length === 0 && (
                  <div className="text-center py-12 text-white/40">
                    <MessageSquare size={64} className="mx-auto mb-4 opacity-20" />
                    <p>No commentary yet. Start typing!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Event Modal */}
        {showEventModal && selectedEventType && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="glass rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black uppercase">{selectedEventType.replace('_', ' ')}</h3>
                <button onClick={() => setShowEventModal(false)} className="p-2 hover:bg-white/10 rounded-xl">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Team Selection */}
                <div>
                  <label className="text-xs font-black uppercase text-white/40 mb-2 block">Team</label>
                  <select
                    value={eventForm.teamId}
                    onChange={(e) => setEventForm({ ...eventForm, teamId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                  >
                    <option value="">Select Team</option>
                    <option value={homeTeam?.id}>{homeTeam?.name}</option>
                    <option value={awayTeam?.id}>{awayTeam?.name}</option>
                  </select>
                </div>
                
                {/* Player Selection */}
                {selectedEventType !== 'substitution' && (
                  <div>
                    <label className="text-xs font-black uppercase text-white/40 mb-2 block">Player</label>
                    <select
                      value={eventForm.playerId}
                      onChange={(e) => setEventForm({ ...eventForm, playerId: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                    >
                      <option value="">Select Player</option>
                      {allPlayers.filter(p => p.team_id === parseInt(eventForm.teamId)).map(player => (
                        <option key={player.id} value={player.id}>{player.name} (# {player.number})</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Goal Type */}
                {selectedEventType === 'goal' && (
                  <div>
                    <label className="text-xs font-black uppercase text-white/40 mb-2 block">Goal Type</label>
                    <select
                      value={eventForm.goalType}
                      onChange={(e) => setEventForm({ ...eventForm, goalType: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                    >
                      <option value="normal">Normal Goal</option>
                      <option value="header">Header</option>
                      <option value="penalty">Penalty</option>
                      <option value="free_kick">Free Kick</option>
                      <option value="own_goal">Own Goal</option>
                      <option value="volley">Volley</option>
                      <option value="long_shot">Long Shot</option>
                    </select>
                  </div>
                )}
                
                {/* Minute */}
                <div>
                  <label className="text-xs font-black uppercase text-white/40 mb-2 block">Minute</label>
                  <input
                    type="number"
                    value={eventForm.minute || minute}
                    onChange={(e) => setEventForm({ ...eventForm, minute: parseInt(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label className="text-xs font-black uppercase text-white/40 mb-2 block">Description</label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                    rows={3}
                  />
                </div>
                
                {/* Submit */}
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowEventModal(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-white font-black uppercase hover:bg-white/10 transition-all">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (selectedEventType === 'goal' && eventForm.teamId && eventForm.playerId) {
                        addGoal(parseInt(eventForm.teamId), parseInt(eventForm.playerId), eventForm.assistId ? parseInt(eventForm.assistId) : undefined, eventForm.goalType, eventForm.minute || minute);
                      } else if (selectedEventType === 'yellow_card' && eventForm.teamId && eventForm.playerId) {
                        addCard(parseInt(eventForm.teamId), parseInt(eventForm.playerId), 'yellow', eventForm.cardReason);
                      } else if (selectedEventType === 'red_card' && eventForm.teamId && eventForm.playerId) {
                        addCard(parseInt(eventForm.teamId), parseInt(eventForm.playerId), 'red', eventForm.cardReason);
                      }
                    }}
                    className="flex-1 py-3 rounded-xl bg-brand-green text-black font-black uppercase hover:scale-105 transition-all"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
