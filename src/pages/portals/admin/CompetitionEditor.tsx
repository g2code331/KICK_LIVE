import { useState, useEffect } from 'react';
import { X, Save, Trophy, Calendar, Clock, Settings } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface CompetitionEditorProps {
  competition: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function CompetitionEditor({ competition, isOpen, onClose, onUpdate }: CompetitionEditorProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'format' | 'schedule' | 'rules'>('general');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: competition?.name || '',
    season: competition?.season || '2025',
    format: competition?.format || competition?.type || 'league',
    status: competition?.status || 'upcoming',
    start_date: competition?.start_date || '',
    end_date: competition?.end_date || '',
    // Match Settings
    match_duration: 90,
    half_time_duration: 15,
    extra_time_duration: 30,
    penalty_shootout: false,
    // League Settings
    points_win: 3,
    points_draw: 1,
    points_loss: 0,
    // Scheduling
    kickoff_times: ['15:00', '18:00', '20:00'],
    match_days: ['Saturday', 'Sunday'],
    rest_days_between: 3,
    // Rules
    allow_draws: true,
    away_goals_rule: false,
    var_enabled: false,
    substitutions: 5,
  });

  useEffect(() => {
    if (competition) {
      setFormData(prev => ({
        ...prev,
        name: competition.name || '',
        season: competition.season || '2025',
        format: competition.format || competition.type || 'league',
        status: competition.status || 'upcoming',
        start_date: competition.start_date || '',
        end_date: competition.end_date || '',
      }));
    }
  }, [competition]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('competitions')
        .update({
          name: formData.name,
          season: formData.season,
          format: formData.format,
          status: formData.status,
          start_date: formData.start_date,
          end_date: formData.end_date,
        })
        .eq('id', competition.id);

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_activity', {
        p_action: 'Competition Updated',
        p_entity_type: 'competition',
        p_entity_id: competition.id,
        p_entity_name: formData.name,
        p_destination: '/admin/competitions',
        p_details: { format: formData.format }
      });

      alert('Competition updated successfully!');
      onUpdate();
      onClose();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0B0E13]/95 backdrop-blur-xl" onClick={onClose}></div>
      
      <div className="relative w-full max-w-6xl glass rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-in zoom-in duration-500">
        
        {/* Header */}
        <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-green-500/10 to-blue-500/10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 gradient-green rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <Trophy className="text-black" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">Edit Competition</h2>
              <p className="text-xs text-white/40 uppercase tracking-widest">{formData.season} Season</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-10 py-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            {[
              { id: 'general', label: 'General', icon: <Settings size={18} /> },
              { id: 'format', label: 'Format & Rules', icon: <Trophy size={18} /> },
              { id: 'schedule', label: 'Schedule', icon: <Calendar size={18} /> },
              { id: 'rules', label: 'Match Rules', icon: <Clock size={18} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? 'bg-green-500 text-black shadow-lg shadow-green-500/30'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10">
          
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-right-4">
              <div>
                <h3 className="text-2xl font-black italic uppercase mb-2">General Information</h3>
                <p className="text-white/40 text-sm">Basic competition details</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Competition Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                    placeholder="e.g. Premier League 2025"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Season</label>
                  <input
                    type="text"
                    value={formData.season}
                    onChange={(e) => setFormData(prev => ({ ...prev, season: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                    placeholder="2025"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Format</label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                  >
                    <option value="league">League</option>
                    <option value="cup">Cup</option>
                    <option value="knockout">Knockout</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* FORMAT & RULES TAB */}
          {activeTab === 'format' && (
            <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-right-4">
              <div>
                <h3 className="text-2xl font-black italic uppercase mb-2">Format & Scoring</h3>
                <p className="text-white/40 text-sm">Competition format and points system</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Points for Win</label>
                  <input
                    type="number"
                    value={formData.points_win}
                    onChange={(e) => setFormData(prev => ({ ...prev, points_win: parseInt(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Points for Draw</label>
                  <input
                    type="number"
                    value={formData.points_draw}
                    onChange={(e) => setFormData(prev => ({ ...prev, points_draw: parseInt(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Points for Loss</label>
                  <input
                    type="number"
                    value={formData.points_loss}
                    onChange={(e) => setFormData(prev => ({ ...prev, points_loss: parseInt(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Allow Draws</label>
                  <select
                    value={formData.allow_draws ? 'yes' : 'no'}
                    onChange={(e) => setFormData(prev => ({ ...prev, allow_draws: e.target.value === 'yes' }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No (Extra Time + Penalties)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Away Goals Rule</label>
                  <select
                    value={formData.away_goals_rule ? 'yes' : 'no'}
                    onChange={(e) => setFormData(prev => ({ ...prev, away_goals_rule: e.target.value === 'yes' }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                  >
                    <option value="no">Disabled</option>
                    <option value="yes">Enabled (Two-legged ties)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">VAR Enabled</label>
                  <select
                    value={formData.var_enabled ? 'yes' : 'no'}
                    onChange={(e) => setFormData(prev => ({ ...prev, var_enabled: e.target.value === 'yes' }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                  >
                    <option value="no">Disabled</option>
                    <option value="yes">Enabled</option>
                  </select>
                </div>
              </div>

              {/* Format Preview */}
              <div className="glass rounded-2xl p-6 border border-white/5 bg-gradient-to-r from-green-500/5 to-blue-500/5">
                <h4 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Trophy size={16} className="text-green-500" />
                  Format Preview
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-xs text-white/40">Competition Type</span>
                    <span className="text-sm font-bold uppercase">{formData.format}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-xs text-white/40">Points System</span>
                    <span className="text-sm font-bold">W: {formData.points_win} • D: {formData.points_draw} • L: {formData.points_loss}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs text-white/40">Tiebreaker</span>
                    <span className="text-sm font-bold">{formData.away_goals_rule ? 'Away Goals' : 'Extra Time + Penalties'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-right-4">
              <div>
                <h3 className="text-2xl font-black italic uppercase mb-2">Match Schedule</h3>
                <p className="text-white/40 text-sm">Kickoff times and match days</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Preferred Kickoff Times</label>
                  <div className="space-y-2">
                    {['15:00', '18:00', '20:00', '12:30', '17:30'].map(time => (
                      <button
                        key={time}
                        onClick={() => {
                          if (!formData.kickoff_times.includes(time)) {
                            setFormData(prev => ({ ...prev, kickoff_times: [...prev.kickoff_times, time] }));
                          }
                        }}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                          formData.kickoff_times.includes(time)
                            ? 'bg-green-500 text-black'
                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Match Days</label>
                  <div className="space-y-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <button
                        key={day}
                        onClick={() => {
                          if (!formData.match_days.includes(day)) {
                            setFormData(prev => ({ ...prev, match_days: [...prev.match_days, day] }));
                          } else {
                            setFormData(prev => ({ ...prev, match_days: prev.match_days.filter(d => d !== day) }));
                          }
                        }}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                          formData.match_days.includes(day)
                            ? 'bg-green-500 text-black'
                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Rest Days Between Matches</label>
                  <input
                    type="number"
                    value={formData.rest_days_between}
                    onChange={(e) => setFormData(prev => ({ ...prev, rest_days_between: parseInt(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                    min="1"
                    max="14"
                  />
                  <p className="text-[10px] text-white/30">Minimum days between matches for each team</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Max Matches Per Week</label>
                  <input
                    type="number"
                    value="2"
                    readOnly
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white/40 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-white/30">Automatically calculated based on rest days</p>
                </div>
              </div>

              {/* Schedule Preview */}
              <div className="glass rounded-2xl p-6 border border-white/5">
                <h4 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Calendar size={16} className="text-green-500" />
                  Schedule Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-green-500">{formData.kickoff_times.length}</p>
                    <p className="text-[10px] text-white/40 uppercase mt-1">Kickoff Times</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-green-500">{formData.match_days.length}</p>
                    <p className="text-[10px] text-white/40 uppercase mt-1">Match Days</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-green-500">{formData.rest_days_between}</p>
                    <p className="text-[10px] text-white/40 uppercase mt-1">Rest Days</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MATCH RULES TAB */}
          {activeTab === 'rules' && (
            <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-right-4">
              <div>
                <h3 className="text-2xl font-black italic uppercase mb-2">Match Rules</h3>
                <p className="text-white/40 text-sm">Match duration and regulations</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Match Duration (Minutes)</label>
                  <input
                    type="number"
                    value={formData.match_duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, match_duration: parseInt(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                  />
                  <p className="text-[10px] text-white/30">Standard: 90 minutes</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Half-Time Duration (Minutes)</label>
                  <input
                    type="number"
                    value={formData.half_time_duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, half_time_duration: parseInt(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                  />
                  <p className="text-[10px] text-white/30">Standard: 15 minutes</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Extra Time Duration (Minutes)</label>
                  <input
                    type="number"
                    value={formData.extra_time_duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, extra_time_duration: parseInt(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                  />
                  <p className="text-[10px] text-white/30">Standard: 30 minutes (2x15)</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Max Substitutions</label>
                  <input
                    type="number"
                    value={formData.substitutions}
                    onChange={(e) => setFormData(prev => ({ ...prev, substitutions: parseInt(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                    min="0"
                    max="12"
                  />
                  <p className="text-[10px] text-white/30">Standard: 5 substitutions</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Penalty Shootout</label>
                  <select
                    value={formData.penalty_shootout ? 'yes' : 'no'}
                    onChange={(e) => setFormData(prev => ({ ...prev, penalty_shootout: e.target.value === 'yes' }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-green-500/50 focus:outline-none transition-all"
                  >
                    <option value="no">Disabled</option>
                    <option value="yes">Enabled for knockout matches</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Golden Goal</label>
                  <select
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white/40 cursor-not-allowed"
                  >
                    <option>Disabled (Modern Rules)</option>
                  </select>
                  <p className="text-[10px] text-white/30">No longer used in modern football</p>
                </div>
              </div>

              {/* Rules Preview */}
              <div className="glass rounded-2xl p-6 border border-white/5 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
                <h4 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" />
                  Match Timeline
                </h4>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 to-blue-500"></div>
                  <div className="space-y-4 pl-8">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-black font-black text-xs">0'</div>
                      <p className="text-sm font-bold">Kick Off</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-black text-xs">45'</div>
                      <p className="text-sm font-bold">Half Time ({formData.half_time_duration} min break)</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-black font-black text-xs">{formData.match_duration}'</div>
                      <p className="text-sm font-bold">Full Time</p>
                    </div>
                    {formData.extra_time_duration > 0 && (
                      <>
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-black text-xs">+15'</div>
                          <p className="text-sm font-bold">Extra Time First Half</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-black text-xs">+{formData.match_duration + formData.extra_time_duration}'</div>
                          <p className="text-sm font-bold">Extra Time Full Time</p>
                        </div>
                      </>
                    )}
                    {formData.penalty_shootout && (
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-black text-xs">PEN</div>
                        <p className="text-sm font-bold">Penalty Shootout (if required)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-white/5 border-t border-white/10 flex items-center justify-end gap-4">
          <button onClick={onClose} className="px-8 py-3 rounded-xl font-bold text-sm text-white/40 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-12 py-3 rounded-xl gradient-green text-black font-black uppercase tracking-widest text-sm shadow-xl shadow-green-500/30 hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={18} /> Save Changes
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
