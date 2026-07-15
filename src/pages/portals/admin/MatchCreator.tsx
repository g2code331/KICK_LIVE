import { useState } from 'react';
import { X, Trophy, Calendar, MapPin, Hash, Globe, Star, Zap, Heart, Check } from 'lucide-react';
import { Team } from '../../../data/mockData';
import { createMatch, getTeams } from '../../../lib/db';
import { useEffect } from 'react';

interface MatchCreatorProps {
  isOpen: boolean;
  onClose: () => void;
}

type MatchType = 'league' | 'champions_league' | 'world_cup' | 'friendly' | 'quick_match' | 'gala';

export default function MatchCreator({ isOpen, onClose }: MatchCreatorProps) {
  const [matchType, setMatchType] = useState<MatchType>('league');
  const [dbTeams, setDbTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    home_team_id: '',
    away_team_id: '',
    venue: '',
    start_time: '',
    competition: 'Rx Premier League'
  });

  useEffect(() => {
    if (isOpen) {
      getTeams().then(setDbTeams);
    }
  }, [isOpen]);

  const handleCreateMatch = async () => {
    if (!formData.home_team_id || !formData.away_team_id || !formData.start_time) {
      return alert('Please fill in teams and start time');
    }

    setLoading(true);
    try {
      await createMatch({
        ...formData,
        status: 'scheduled',
        home_team_id: parseInt(formData.home_team_id),
        away_team_id: parseInt(formData.away_team_id),
        competition: matchType.replace('_', ' ').toUpperCase()
      });
      alert('Match scheduled successfully!');
      onClose();
      window.location.reload();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl glass rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 gradient-green rounded-2xl flex items-center justify-center shadow-lg shadow-brand-green/20">
              <Calendar className="text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Match Creator</h2>
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Schedule New Fixture</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[70vh] no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Match Type & Details */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Select Match Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'league', label: 'League Match', icon: <Trophy size={16} /> },
                    { id: 'champions_league', label: 'Champions League', icon: <Globe size={16} /> },
                    { id: 'world_cup', label: 'World Cup', icon: <Globe size={16} /> },
                    { id: 'gala', label: 'Gala Match', icon: <Star size={16} /> },
                    { id: 'friendly', label: 'Friendly', icon: <Heart size={16} /> },
                    { id: 'quick_match', label: 'Quick Match', icon: <Zap size={16} /> },
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setMatchType(type.id as MatchType)}
                      className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 ${
                        matchType === type.id 
                          ? 'border-brand-green bg-brand-green/10 text-brand-green' 
                          : 'border-white/5 bg-white/5 text-white/40 hover:border-white/20'
                      }`}
                    >
                      {type.icon}
                      <span className="text-xs font-bold uppercase">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Venue & Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input type="text" placeholder="Stadium Name" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-green/50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Date</label>
                  <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-brand-green/50 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Time</label>
                  <input type="time" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-brand-green/50 text-sm" />
                </div>
              </div>
            </div>

            {/* Right Column: Team Selection */}
            <div className="space-y-6">
              <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 space-y-6">
                <div className="text-center">
                  <h3 className="text-sm font-black uppercase tracking-widest text-brand-green">Versus Setup</h3>
                  <p className="text-[10px] text-white/30">Choose competing teams</p>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="w-20 h-20 mx-auto rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center">
                      <Hash size={32} className="text-white/10" />
                    </div>
                    <select 
                      value={formData.home_team_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, home_team_id: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs font-bold"
                    >
                      <option value="">Home Team</option>
                      {dbTeams.map((t: Team) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  <div className="text-2xl font-black italic text-white/20">VS</div>

                  <div className="flex-1 space-y-3">
                    <div className="w-20 h-20 mx-auto rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center">
                      <Hash size={32} className="text-white/10" />
                    </div>
                    <select 
                      value={formData.away_team_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, away_team_id: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs font-bold"
                    >
                      <option value="">Away Team</option>
                      {dbTeams.map((t: Team) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Official Broadcast Options</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" className="hidden" />
                    <div className="w-5 h-5 rounded border border-white/20 flex items-center justify-center group-hover:border-brand-green transition-colors">
                      <Check size={14} className="text-brand-green opacity-0 group-hover:opacity-100" />
                    </div>
                    <span className="text-[10px] font-bold uppercase">Broadcast Live</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" className="hidden" />
                    <div className="w-5 h-5 rounded border border-white/20 flex items-center justify-center group-hover:border-brand-green transition-colors">
                      <Check size={14} className="text-brand-green opacity-0 group-hover:opacity-100" />
                    </div>
                    <span className="text-[10px] font-bold uppercase">Allow Predictions</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/10 flex items-center justify-end gap-4 bg-white/5">
          <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-sm text-white/40 hover:text-white transition-colors">Cancel</button>
          <button 
            onClick={handleCreateMatch}
            disabled={loading}
            className="px-10 py-3 rounded-xl gradient-green text-black font-black uppercase tracking-widest text-sm shadow-xl shadow-brand-green/20 hover:scale-105 transition-all disabled:opacity-50"
          >
            {loading ? 'Scheduling...' : 'Create Match'}
          </button>
        </div>
      </div>
    </div>
  );
}
