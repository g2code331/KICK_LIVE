import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Play, Pause, RotateCcw, Clock, CheckCircle,
  AlertCircle, Plus, X, Edit2, Save, Download, Settings,
  Activity, BarChart3, Users, MessageSquare, Camera, FileText
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { updateStandingsAfterMatch, sendMatchNotification } from '../../../lib/MatchAutomation';

interface MatchDashboardProps {
  matchId: number;
  onBack: () => void;
}

type MatchStatus = 'waiting' | 'ready' | 'kickoff' | 'first_half' | 'half_time' | 
                   'second_half' | 'extra_time' | 'penalty_shootout' | 
                   'full_time' | 'suspended' | 'postponed' | 'abandoned' | 
                   'cancelled' | 'completed';

export default function MatchDashboard({ matchId, onBack }: MatchDashboardProps) {
  // Match State
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matchStatus, setMatchStatus] = useState<MatchStatus>('waiting');
  const [minute, setMinute] = useState(0);
  const [extraTime, setExtraTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [period, setPeriod] = useState(1);
  const [matchLength, setMatchLength] = useState(90);
  
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
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    teamId: '',
    playerId: '',
    assistId: '',
    minute: 0,
    goalType: 'normal',
    cardReason: '',
    description: ''
  });
  
  // Statistics
  const [stats, setStats] = useState<any>({
    home_possession: 50, away_possession: 50,
    home_shots: 0, away_shots: 0,
    home_shots_on_target: 0, away_shots_on_target: 0,
    home_corners: 0, away_corners: 0,
    home_fouls: 0, away_fouls: 0,
    home_yellow_cards: 0, away_yellow_cards: 0,
    home_red_cards: 0, away_red_cards: 0
  });
  
  // Commentary
  const [commentary, setCommentary] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  
  // Active Tab
  const [activeTab, setActiveTab] = useState<'events' | 'stats' | 'commentary'>('events');
  
  // Undo/Redo
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout>();
  
  // Load Match Data
  useEffect(() => {
    loadMatch();
  }, [matchId]);
  
  // Auto Timer Effect - Runs every second for smooth display
  useEffect(() => {
    if (isTimerRunning && !['half_time', 'full_time', 'waiting', 'suspended'].includes(matchStatus)) {
      timerRef.current = setInterval(() => {
        setMinute(m => {
          const maxMinute = period === 1 ? 45 : 90;
          if (m >= maxMinute) {
            return maxMinute;
          }
          return m + 1;
        });
        
        // Auto-save every 30 seconds
        if (minute % 1 === 0) {
          saveMatchState();
        }
      }, 1000); // Update every second for live feel
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning, matchStatus, period, minute]);
  
  async function loadMatch() {
    try {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*, homeTeam:teams!home_team_id(*), awayTeam:teams!away_team_id(*), competition:competitions(*)')
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
        setMatchLength(matchData.match_length || 90);
        
        // Load players
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
        
        // Load stats
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
      }
    } catch (err) {
      console.error('Error loading match:', err);
    } finally {
      setLoading(false);
    }
  }
  
  // Save to history for undo
  const saveToHistory = () => {
    const newState = { minute, homeScore, awayScore, matchStatus, events: [...events], stats: { ...stats } };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  // Undo
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
      await updateMatchInDB();
    }
  };
  
  // Redo
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
      await updateMatchInDB();
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
    } catch (err) {
      console.error('Error auto-saving:', err);
    }
  };
  
  // Update match in database
  const updateMatchInDB = async () => {
    try {
      await supabase.from('matches').update({
        minute,
        home_score: homeScore,
        away_score: awayScore,
        status: matchStatus
      }).eq('id', matchId);
    } catch (err) {
      console.error('Error updating match:', err);
    }
  };
  
  // Match Controls
  const startFirstHalf = async () => {
    saveToHistory();
    setPeriod(1);
    setMatchStatus('first_half');
    setIsTimerRunning(true);
    await addEvent('kickoff', 0);
    await updateMatchInDB();
  };
  
  const pauseMatch = async () => {
    setIsTimerRunning(false);
    await updateMatchInDB();
  };
  
  const resumeMatch = async () => {
    setIsTimerRunning(true);
    await updateMatchInDB();
  };
  
  const endFirstHalf = async () => {
    setIsTimerRunning(false);
    setMatchStatus('half_time');
    await addEvent('half_time', minute);
    await updateMatchInDB();
  };
  
  const startSecondHalf = async () => {
    saveToHistory();
    setPeriod(2);
    setMatchStatus('second_half');
    setIsTimerRunning(true);
    await addEvent('second_half', minute);
    await updateMatchInDB();
  };
  
  const endMatch = async () => {
    setIsTimerRunning(false);
    setMatchStatus('full_time');
    await addEvent('match_ended', minute);
    await updateMatchInDB();
    await finalizeMatch();
  };
  
  const adjustTime = async (minutes: number) => {
    const newMinute = Math.max(0, minute + minutes);
    setMinute(newMinute);
    await updateMatchInDB();
  };
  
  const addEvent = async (eventType: string, minuteOverride?: number, data?: any) => {
    try {
      saveToHistory();
      
      const { data: eventData } = await supabase
        .from('match_events')
        .insert([{
          match_id: matchId,
          event_type: eventType,
          minute: data?.minute || minuteOverride || minute,
          team_id: data?.teamId,
          player_id: data?.playerId,
          assist_player_id: data?.assistId,
          description: data?.description,
          goal_type: data?.goalType,
          card_reason: data?.cardReason
        }])
        .select()
        .single();
      
      if (eventData) {
        setEvents(prev => [...prev, eventData]);
        
        // Send notification for important events
        if (eventType === 'goal') {
          await sendMatchNotification('goal', matchId);
        } else if (eventType === 'red_card') {
          await sendMatchNotification('red_card', matchId);
        }
      }
    } catch (err) {
      console.error('Error adding event:', err);
    }
  };
  
  const addGoal = async (teamId: number, playerId: number, assistId?: number, goalType: string = 'normal') => {
    const scoringTeam = teamId === homeTeam?.id ? 'home' : 'away';
    const newScore = scoringTeam === 'home' ? homeScore + 1 : awayScore + 1;
    
    saveToHistory();
    
    if (scoringTeam === 'home') {
      setHomeScore(newScore);
    } else {
      setAwayScore(newScore);
    }
    
    await addEvent('goal', minute, { 
      teamId, playerId, assistId, goalType,
      description: `GOAL! ${goalType !== 'normal' ? goalType.replace('_', ' ') + ' goal' : ''}` 
    });
    
    await supabase.from('matches').update({
      home_score: scoringTeam === 'home' ? newScore : homeScore,
      away_score: scoringTeam === 'away' ? newScore : awayScore
    }).eq('id', matchId);
    
    // Update stats
    if (scoringTeam === 'home') {
      setStats(s => ({ ...s, home_shots: s.home_shots + 1, home_shots_on_target: s.home_shots_on_target + 1 }));
    } else {
      setStats(s => ({ ...s, away_shots: s.away_shots + 1, away_shots_on_target: s.away_shots_on_target + 1 }));
    }
    
    setShowEventModal(false);
  };
  
  const addCard = async (teamId: number, playerId: number, cardType: 'yellow' | 'red', reason?: string) => {
    saveToHistory();
    
    await addEvent(cardType === 'yellow' ? 'yellow_card' : 'red_card', minute, { 
      teamId, playerId, cardReason: reason 
    });
    
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
  
  const addCommentary = async () => {
    if (!newComment.trim()) return;
    
    try {
      const { data } = await supabase
        .from('match_commentary')
        .insert([{ match_id: matchId, minute, comment: newComment }])
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
      await supabase.from('match_statistics').upsert({
        match_id: matchId,
        [statKey]: value,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating stat:', err);
    }
  };
  
  const finalizeMatch = async () => {
    try {
      saveToHistory();
      
      await supabase.from('matches').update({
        status: 'finished',
        is_locked: true,
        confirmed_at: new Date().toISOString()
      }).eq('id', matchId);
      
      // TRIGGER AUTOMATION
      console.log('[MatchDashboard] Match finalized - triggering automation...');
      
      // Update standings automatically
      await updateStandingsAfterMatch(matchId);
      
      // Send notifications
      await sendMatchNotification('full_time', matchId);
      
      // Generate match report
      await generateMatchReport();
      
      console.log('[MatchDashboard] Automation complete!');
      
      alert('✅ Match finalized!\n\n✅ Standings updated automatically\n✅ Statistics calculated\n✅ Match report generated\n✅ Notifications sent');
      
      onBack();
    } catch (err) {
      console.error('Error finalizing match:', err);
      alert('Error finalizing match: ' + err);
    }
  };
  
  const generateMatchReport = async () => {
    console.log('[MatchDashboard] Generating match report...');
    
    const report = {
      matchId: match.id,
      competition: match.competition?.name,
      homeTeam: homeTeam?.name,
      awayTeam: awayTeam?.name,
      homeScore,
      awayScore,
      events,
      statistics: stats,
      commentary,
      generatedAt: new Date().toISOString()
    };
    
    await supabase.from('match_reports').insert({
      match_id: matchId,
      report_data: report,
      generated_at: new Date().toISOString()
    });
    
    console.log('[MatchDashboard] Match report generated!');
  };
  
  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0B0E13]/95 backdrop-blur-xl">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-green font-bold uppercase text-lg">Loading Match Dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-[200] bg-[#0B0E13] overflow-y-auto">
      {/* Header with Back Button */}
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
        
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-xl font-black uppercase text-sm flex items-center gap-2 ${
            isTimerRunning ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-white/5 text-white/40'
          }`}>
            {isTimerRunning ? '🔴 LIVE' : 'PAUSED'}
          </div>
        </div>
      </div>
      
      {/* Scoreboard */}
      <div className="px-6 py-8 bg-gradient-to-r from-brand-blue/10 via-transparent to-brand-green/10 border-b border-white/10">
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
              <Clock size={24} className="text-white/40" />
              <span className="text-4xl font-black">{minute}'{extraTime > 0 && <span className="text-2xl text-white/40">+{extraTime}</span>}</span>
            </div>
            <div className="text-sm font-black uppercase text-white/40">{matchStatus.replace('_', ' ')}</div>
          </div>
          
          <div className="flex-1 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <span className="text-3xl font-black">{awayTeam?.short_name?.[0] || 'A'}</span>
            </div>
            <h2 className="text-lg font-black uppercase">{awayTeam?.name || 'Away Team'}</h2>
          </div>
        </div>
      </div>
      
      {/* Match Controls */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-4 flex-wrap">
          {matchStatus === 'waiting' && (
            <button onClick={startFirstHalf} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-green text-black font-black uppercase hover:scale-105 transition-all">
              <Play size={18} /> Kick Off
            </button>
          )}
          
          {matchStatus === 'first_half' && (
            <>
              <button onClick={pauseMatch} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white font-black uppercase hover:scale-105 transition-all">
                <Pause size={16} /> Pause
              </button>
              <button onClick={endFirstHalf} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-black uppercase hover:scale-105 transition-all">
                <CheckCircle size={16} /> Half Time
              </button>
              <button onClick={() => adjustTime(1)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all">
                +1'
              </button>
              <button onClick={() => adjustTime(-1)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all">
                -1'
              </button>
            </>
          )}
          
          {matchStatus === 'half_time' && (
            <button onClick={startSecondHalf} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-green text-black font-black uppercase hover:scale-105 transition-all">
              <Play size={18} /> Start 2nd Half
            </button>
          )}
          
          {matchStatus === 'second_half' && (
            <>
              <button onClick={pauseMatch} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white font-black uppercase hover:scale-105 transition-all">
                <Pause size={16} /> Pause
              </button>
              <button onClick={endMatch} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-black uppercase hover:scale-105 transition-all">
                <CheckCircle size={16} /> Full Time
              </button>
              <button onClick={() => adjustTime(1)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all">
                +1'
              </button>
              <button onClick={() => adjustTime(-1)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all">
                -1'
              </button>
            </>
          )}
          
          {matchStatus === 'suspended' && (
            <button onClick={resumeMatch} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-green text-black font-black uppercase hover:scale-105 transition-all">
              <Play size={18} /> Resume
            </button>
          )}
          
          {/* Undo/Redo */}
          <div className="flex items-center gap-2 ml-8 border-l border-white/10 pl-4">
            <button onClick={undo} disabled={historyIndex <= 0} className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <RotateCcw size={18} />
            </button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <RotateCcw size={18} className="rotate-180" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="px-6 py-3 border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'events', label: 'Events', icon: <Activity size={16} /> },
            { id: 'stats', label: 'Statistics', icon: <BarChart3 size={16} /> },
            { id: 'commentary', label: 'Commentary', icon: <MessageSquare size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm uppercase whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-brand-green text-black'
                  : 'bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="p-6 max-w-4xl mx-auto">
        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button onClick={() => { setSelectedEventType('goal'); setShowEventModal(true); }} className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 font-black uppercase hover:bg-green-500/20 transition-all text-sm">
                 Goal
              </button>
              <button onClick={() => { setSelectedEventType('yellow_card'); setShowEventModal(true); }} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 font-black uppercase hover:bg-yellow-500/20 transition-all text-sm">
                 Yellow
              </button>
              <button onClick={() => { setSelectedEventType('red_card'); setShowEventModal(true); }} className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-black uppercase hover:bg-red-500/20 transition-all text-sm">
                 Red
              </button>
              <button onClick={() => { setSelectedEventType('substitution'); setShowEventModal(true); }} className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-500 font-black uppercase hover:bg-blue-500/20 transition-all text-sm">
                🔄 Sub
              </button>
            </div>
            
            {/* Event Timeline */}
            <div className="space-y-3">
              <h3 className="text-lg font-black uppercase">Match Events</h3>
              {events.map((event) => (
                <div key={event.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-16 text-center">
                    <span className="text-lg font-black text-brand-green">{event.minute}'</span>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    event.event_type === 'goal' ? 'bg-green-500/20 text-green-500' :
                    event.event_type.includes('card') ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-blue-500/20 text-blue-500'
                  }`}>
                    {event.event_type === 'goal' ? '' :
                     event.event_type === 'yellow_card' ? '' :
                     event.event_type === 'red_card' ? '🟥' : '📋'}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold uppercase text-sm">{event.event_type.replace('_', ' ')}</p>
                    <p className="text-xs text-white/40">{event.description || ''}</p>
                  </div>
                </div>
              ))}
              
              {events.length === 0 && (
                <div className="text-center py-8 text-white/40">
                  <p>No events yet. Kick off to start!</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <h3 className="text-lg font-black uppercase">Live Statistics</h3>
            
            {[
              { label: 'Possession %', home: stats.home_possession, away: stats.away_possession, stat: 'possession' },
              { label: 'Shots', home: stats.home_shots, away: stats.away_shots, stat: 'shots' },
              { label: 'Shots on Target', home: stats.home_shots_on_target, away: stats.away_shots_on_target, stat: 'shots_on_target' },
              { label: 'Corners', home: stats.home_corners, away: stats.away_corners, stat: 'corners' },
              { label: 'Fouls', home: stats.home_fouls, away: stats.away_fouls, stat: 'fouls' },
            ].map((stat, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold w-8 text-right">{stat.home}</span>
                  <span className="text-xs text-white/40 uppercase flex-1 text-center">{stat.label}</span>
                  <span className="text-sm font-bold w-8">{stat.away}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-green transition-all" style={{ width: `${stat.home}%` }} />
                  </div>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
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
        )}
        
        {/* Commentary Tab */}
        {activeTab === 'commentary' && (
          <div className="space-y-4">
            <h3 className="text-lg font-black uppercase">Live Commentary</h3>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type commentary..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-green/50"
                onKeyPress={(e) => e.key === 'Enter' && addCommentary()}
              />
              <button onClick={addCommentary} className="px-4 py-2 rounded-xl bg-brand-green text-black font-black uppercase text-sm hover:scale-105 transition-all">
                Post
              </button>
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {commentary.map((comm) => (
                <div key={comm.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-brand-green font-black text-sm">{comm.minute}'</span>
                  <p className="text-sm mt-1">{comm.comment}</p>
                </div>
              ))}
              
              {commentary.length === 0 && (
                <div className="text-center py-8 text-white/40">
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
          <div className="glass rounded-3xl p-6 max-w-md w-full border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black uppercase">{selectedEventType.replace('_', ' ')}</h3>
              <button onClick={() => setShowEventModal(false)} className="p-2 hover:bg-white/10 rounded-xl">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-black uppercase text-white/40 mb-2 block">Team</label>
                <select
                  value={eventForm.teamId}
                  onChange={(e) => setEventForm({ ...eventForm, teamId: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="">Select Team</option>
                  <option value={homeTeam?.id}>{homeTeam?.name}</option>
                  <option value={awayTeam?.id}>{awayTeam?.name}</option>
                </select>
              </div>
              
              {selectedEventType !== 'substitution' && (
                <div>
                  <label className="text-xs font-black uppercase text-white/40 mb-2 block">Player</label>
                  <select
                    value={eventForm.playerId}
                    onChange={(e) => setEventForm({ ...eventForm, playerId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="">Select Player</option>
                    {allPlayers.filter(p => p.team_id === parseInt(eventForm.teamId)).map(player => (
                      <option key={player.id} value={player.id}>{player.name} (# {player.number})</option>
                    ))}
                  </select>
                </div>
              )}
              
              {selectedEventType === 'goal' && (
                <div>
                  <label className="text-xs font-black uppercase text-white/40 mb-2 block">Goal Type</label>
                  <select
                    value={eventForm.goalType}
                    onChange={(e) => setEventForm({ ...eventForm, goalType: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="normal">Normal Goal</option>
                    <option value="header">Header</option>
                    <option value="penalty">Penalty</option>
                    <option value="free_kick">Free Kick</option>
                    <option value="own_goal">Own Goal</option>
                  </select>
                </div>
              )}
              
              <div>
                <label className="text-xs font-black uppercase text-white/40 mb-2 block">Minute</label>
                <input
                  type="number"
                  value={eventForm.minute || minute}
                  onChange={(e) => setEventForm({ ...eventForm, minute: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEventModal(false)} className="flex-1 py-2 rounded-xl bg-white/5 text-white font-black uppercase text-sm hover:bg-white/10 transition-all">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedEventType === 'goal' && eventForm.teamId && eventForm.playerId) {
                      addGoal(parseInt(eventForm.teamId), parseInt(eventForm.playerId), eventForm.assistId ? parseInt(eventForm.assistId) : undefined, eventForm.goalType);
                    } else if (selectedEventType === 'yellow_card' && eventForm.teamId && eventForm.playerId) {
                      addCard(parseInt(eventForm.teamId), parseInt(eventForm.playerId), 'yellow', eventForm.cardReason);
                    } else if (selectedEventType === 'red_card' && eventForm.teamId && eventForm.playerId) {
                      addCard(parseInt(eventForm.teamId), parseInt(eventForm.playerId), 'red', eventForm.cardReason);
                    }
                  }}
                  className="flex-1 py-2 rounded-xl bg-brand-green text-black font-black uppercase text-sm hover:scale-105 transition-all"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
