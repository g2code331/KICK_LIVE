import { useState } from 'react';
import { X, Play, Square, Pause, RotateCcw, Zap, AlertCircle, Share2, Clock, Trophy } from 'lucide-react';
import { Match } from '../../../data/mockData';

interface MatchControlCenterProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
}

import { updateMatch } from '../../../lib/db';

export default function MatchControlCenter({ isOpen, onClose, match }: MatchControlCenterProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'ended'>(match.status as any);
  const [homeScore, setHomeScore] = useState(match.homeScore);
  const [awayScore, setAwayScore] = useState(match.awayScore);
  const [minute, setMinute] = useState(match.minute || 0);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleLiveUpdate = async () => {
    setIsSaving(true);
    try {
      await updateMatch(match.id, {
        home_score: homeScore,
        away_score: awayScore,
        minute,
        status
      });
      alert('Match data broadcasted successfully!');
      onClose();
      window.location.reload();
    } catch (err: any) {
      alert('Broadcast failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-bg/90 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-full max-w-5xl glass rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
        
        {/* Main Interface */}
        <div className="flex flex-col h-[85vh]">
          
          {/* Top Bar - Match Info */}
          <div className="p-8 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-6">
               <div className="px-3 py-1 bg-brand-red rounded-lg text-[10px] font-black uppercase animate-pulse">Live Control</div>
               <div>
                  <h2 className="text-xl font-black italic uppercase tracking-tighter">{match.competition}</h2>
                  <p className="text-xs text-white/40 uppercase tracking-widest">{match.venue}</p>
               </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X /></button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Scoreboard Area */}
              <div className="lg:col-span-8 space-y-8">
                <div className="glass rounded-[3rem] p-12 flex items-center justify-around relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-r from-brand-green/5 to-brand-blue/5 pointer-events-none"></div>
                   
                   {/* Home Team */}
                   <div className="text-center space-y-4 z-10">
                      <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-black italic">
                         {match.homeTeam.shortName[0]}
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-widest">{match.homeTeam.name}</h3>
                      <div className="flex gap-2">
                         <button onClick={() => setHomeScore(s => Math.max(0, s - 1))} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-xl font-bold">-</button>
                         <button onClick={() => setHomeScore(s => s + 1)} className="w-8 h-8 rounded-lg bg-brand-green text-black font-black text-xl">+</button>
                      </div>
                   </div>

                   {/* Score Display */}
                   <div className="text-center z-10">
                      <div className="text-8xl font-black italic tracking-tighter flex items-center gap-6">
                         <span className="text-brand-green text-glow-green">{homeScore}</span>
                         <span className="text-white/10">:</span>
                         <span className="text-brand-green text-glow-green">{awayScore}</span>
                      </div>
                      <div className="mt-4 px-4 py-2 bg-white/5 rounded-full inline-flex items-center gap-2">
                         <Clock size={16} className="text-brand-green" />
                         <span className="text-xl font-black italic text-brand-green">{minute}'</span>
                      </div>
                   </div>

                   {/* Away Team */}
                   <div className="text-center space-y-4 z-10">
                      <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-black italic">
                         {match.awayTeam.shortName[0]}
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-widest">{match.awayTeam.name}</h3>
                      <div className="flex gap-2">
                         <button onClick={() => setAwayScore(s => Math.max(0, s - 1))} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-xl font-bold">-</button>
                         <button onClick={() => setAwayScore(s => s + 1)} className="w-8 h-8 rounded-lg bg-brand-green text-black font-black text-xl">+</button>
                      </div>
                   </div>
                </div>

                {/* Match Events Control */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {[
                     { label: 'Yellow Card', color: 'bg-yellow-500', icon: <Zap size={20} /> },
                     { label: 'Red Card', color: 'bg-brand-red', icon: <AlertCircle size={20} /> },
                     { label: 'Penalty', color: 'bg-brand-blue', icon: <Trophy size={20} /> },
                     { label: 'VAR Check', color: 'bg-purple-500', icon: <Square size={20} /> },
                   ].map(event => (
                     <button key={event.label} className="p-6 glass-light rounded-3xl border border-white/5 hover:border-white/20 transition-all flex flex-col items-center gap-3 group">
                        <div className={`w-12 h-12 ${event.color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                           {event.icon}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{event.label}</span>
                     </button>
                   ))}
                </div>
              </div>

              {/* Status & Timeline Side */}
              <div className="lg:col-span-4 space-y-6">
                <div className="glass rounded-[2rem] p-8 space-y-6 border border-white/5">
                   <h3 className="text-xs font-black uppercase tracking-widest text-brand-green">Control Panel</h3>
                   
                   <div className="space-y-3">
                      <button 
                        onClick={() => setStatus('running')}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest transition-all ${
                        status === 'running' ? 'bg-brand-green text-black scale-[0.98]' : 'bg-white/5 text-white/40 hover:bg-white/10'
                      }`}>
                         <Play size={20} /> Start Match
                      </button>
                      <button 
                        onClick={() => setStatus('paused')}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest transition-all ${
                        status === 'paused' ? 'bg-yellow-500 text-black scale-[0.98]' : 'bg-white/5 text-white/40 hover:bg-white/10'
                      }`}>
                         <Pause size={20} /> Pause
                      </button>
                      <button 
                        onClick={() => setStatus('ended')}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest transition-all ${
                        status === 'ended' ? 'bg-brand-red text-white scale-[0.98]' : 'bg-white/5 text-white/40 hover:bg-white/10'
                      }`}>
                         <Square size={20} /> End Match
                      </button>
                      <button 
                        onClick={() => setMinute(0)}
                        className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 bg-white/5 text-white/40 hover:bg-white/10 font-black uppercase tracking-widest transition-all">
                         <RotateCcw size={20} /> Reset Clock
                      </button>
                   </div>
                </div>

                <div className="glass rounded-[2rem] p-8 space-y-4 border border-white/5">
                   <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-brand-blue">Broadcast</h3>
                      <div className="flex items-center gap-1.5">
                         <div className="w-2 h-2 rounded-full bg-brand-green animate-ping"></div>
                         <span className="text-[10px] font-black text-brand-green uppercase">Live Syncing</span>
                      </div>
                   </div>
                   <p className="text-[10px] text-white/40 leading-relaxed italic">All changes are broadcasted in real-time to all {match.competition} viewers.</p>
                   <button className="w-full py-3 rounded-xl bg-brand-blue/10 text-brand-blue font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                      <Share2 size={14} /> Send Alert to Users
                   </button>
                </div>
              </div>

            </div>
          </div>

          {/* Action Footer */}
          <div className="p-8 bg-white/5 border-t border-white/10 flex items-center justify-between">
             <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 italic">
                Authorized Official Session • Admin UID: 9fc69921
             </div>
             <div className="flex gap-4">
                <button onClick={onClose} className="px-8 py-3 rounded-xl font-bold text-sm text-white/40 hover:text-white transition-colors">Discard Session</button>
                <button 
                  onClick={handleLiveUpdate}
                  disabled={isSaving}
                  className="px-10 py-3 rounded-xl gradient-green text-black font-black uppercase tracking-widest text-sm shadow-xl shadow-brand-green/20 disabled:opacity-50"
                >
                  {isSaving ? 'Broadcasting...' : 'Finalize & Broadcast'}
                </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
