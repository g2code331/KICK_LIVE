import { useState, useEffect } from 'react';
import { 
  X, Users, Calendar, Trophy, Settings, Trash2, Save, Upload,
  MapPin, Shield, Edit2, Plus, ChevronLeft,
  Activity, Award, Star
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { createPlayer } from '../../../lib/db';

interface TeamDashboardProps {
  team: any;
  isOpen: boolean;
  onClose: () => void;
  onTeamUpdate: () => void;
}

type TeamTab = 'overview' | 'squad' | 'matches' | 'settings';

export default function TeamDashboard({ team, isOpen, onClose, onTeamUpdate }: TeamDashboardProps) {
  const [activeTab, setActiveTab] = useState<TeamTab>('overview');
  const [players, setPlayers] = useState<any[]>([]);
  const [teamMatches, setTeamMatches] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: team?.name || '',
    short_name: team?.short_name || '',
    city: team?.city || '',
    venue: team?.venue || '',
    coach: team?.coach || '',
    primary_color: team?.primary_color || '#39FF14',
    secondary_color: team?.secondary_color || '#000000',
    logo_url: team?.logo_url || '',
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    try {
      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, logo_url: base64String }));
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert('Error uploading logo: ' + err.message);
    }
  };

  useEffect(() => {
    if (isOpen && team) {
      loadTeamData();
    }
  }, [isOpen, team]);

  async function loadTeamData() {
    setLoading(true);
    try {
      // Load Players
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', team.id)
        .order('number');
      setPlayers(playersData || []);

      // Load Matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*, homeTeam:teams!home_team_id(*), awayTeam:teams!away_team_id(*)')
        .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
        .order('start_time', { ascending: false });
      setTeamMatches(matchesData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveTeam = async () => {
    try {
      const updateData: any = {
        name: formData.name,
        short_name: formData.short_name,
        city: formData.city,
        venue: formData.venue,
        coach: formData.coach,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
      };
      
      // Only update logo if a new one was uploaded
      if (formData.logo_url && formData.logo_url !== team.logo_url) {
        updateData.logo_url = formData.logo_url;
      }
      
      console.log('Updating team:', team.id, 'with data:', updateData);
      
      const { data, error } = await supabase
        .from('teams')
        .update(updateData)
        .eq('id', team.id)
        .select();
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Update successful:', data);
      alert('Team updated successfully!');
      setIsEditing(false);
      
      // Force reload the team data
      await loadTeamData();
      onTeamUpdate();
      
    } catch (err: any) {
      console.error('Save error:', err);
      alert('Error saving: ' + err.message);
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm(`Are you sure you want to delete ${team.name}? This will remove all players and match history.`)) {
      return;
    }
    
    try {
      const { error } = await supabase.from('teams').delete().eq('id', team.id);
      if (error) throw error;
      
      alert('Team deleted successfully!');
      onClose();
      onTeamUpdate();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeletePlayer = async (playerId: number) => {
    if (!confirm('Remove this player from the squad?')) return;
    
    try {
      const { error } = await supabase.from('players').delete().eq('id', playerId);
      if (error) throw error;
      
      alert('Player removed!');
      loadTeamData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const stats = {
    totalPlayers: players.length,
    totalMatches: teamMatches.length,
    wins: teamMatches.filter(m => 
      (m.home_team_id === team.id && m.home_score > m.away_score) ||
      (m.away_team_id === team.id && m.away_score > m.home_score)
    ).length,
    goals: teamMatches.reduce((acc, m) => {
      if (m.home_team_id === team.id) return acc + (m.home_score || 0);
      if (m.away_team_id === team.id) return acc + (m.away_score || 0);
      return acc;
    }, 0)
  };

  if (!isOpen || !team) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-bg/95 backdrop-blur-xl" onClick={onClose}></div>
      
      <div className="relative w-full max-w-7xl glass rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-in zoom-in duration-500">
        
        {/* Header */}
        <div className="px-10 py-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-6">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ChevronLeft size={24} />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                {team.logo_url ? (
                  <img src={team.logo_url} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black italic">{team.short_name?.[0]}</span>
                )}
              </div>
              <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">{team.name}</h2>
                <p className="text-[10px] text-white/30 uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={12} /> {team.city}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (isEditing) {
                  handleSaveTeam();
                } else {
                  setIsEditing(true);
                }
              }}
              className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all ${
                isEditing ? 'bg-brand-green text-black hover:opacity-90' : 'bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              {isEditing ? <><Save size={16} /> Save Changes</> : <><Edit2 size={16} /> Edit Team</>}
            </button>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-10 py-4 border-b border-white/10 flex items-center gap-2 bg-white/[0.02]">
          {[
            { id: 'overview', label: 'Overview', icon: <Activity size={18} /> },
            { id: 'squad', label: 'Squad Management', icon: <Users size={18} /> },
            { id: 'matches', label: 'Matches', icon: <Calendar size={18} /> },
            { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TeamTab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-green/10 text-brand-green border border-brand-green/30'
                  : 'text-white/30 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-10">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="glass rounded-[2rem] p-6 border border-white/5">
                  <Users size={24} className="text-brand-green mb-4" />
                  <p className="text-4xl font-black italic">{stats.totalPlayers}</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">Total Players</p>
                </div>
                <div className="glass rounded-[2rem] p-6 border border-white/5">
                  <Calendar size={24} className="text-brand-blue mb-4" />
                  <p className="text-4xl font-black italic">{stats.totalMatches}</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">Matches Played</p>
                </div>
                <div className="glass rounded-[2rem] p-6 border border-white/5">
                  <Trophy size={24} className="text-yellow-500 mb-4" />
                  <p className="text-4xl font-black italic text-yellow-500">{stats.wins}</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">Wins</p>
                </div>
                <div className="glass rounded-[2rem] p-6 border border-white/5">
                  <Activity size={24} className="text-brand-red mb-4" />
                  <p className="text-4xl font-black italic text-brand-red">{stats.goals}</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">Goals Scored</p>
                </div>
              </div>

              {/* Team Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass rounded-[2rem] p-8 border border-white/5">
                  <h3 className="text-lg font-black uppercase italic mb-6 flex items-center gap-2">
                    <Shield size={20} className="text-brand-green" /> Club Information
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between py-3 border-b border-white/5">
                      <span className="text-[10px] text-white/30 uppercase tracking-widest">Full Name</span>
                      <span className="text-sm font-bold">{team.name}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-white/5">
                      <span className="text-[10px] text-white/30 uppercase tracking-widest">Short Code</span>
                      <span className="text-sm font-bold">{team.short_name}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-white/5">
                      <span className="text-[10px] text-white/30 uppercase tracking-widest">City</span>
                      <span className="text-sm font-bold">{team.city}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-white/5">
                      <span className="text-[10px] text-white/30 uppercase tracking-widest">Stadium</span>
                      <span className="text-sm font-bold">{team.venue}</span>
                    </div>
                    <div className="flex justify-between py-3">
                      <span className="text-[10px] text-white/30 uppercase tracking-widest">Head Coach</span>
                      <span className="text-sm font-bold text-brand-blue">{team.coach}</span>
                    </div>
                  </div>
                </div>

                <div className="glass rounded-[2rem] p-8 border border-white/5">
                  <h3 className="text-lg font-black uppercase italic mb-6 flex items-center gap-2">
                    <Award size={20} className="text-yellow-500" /> Team Colors
                  </h3>
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1 text-center">
                      <div className="w-full aspect-square rounded-2xl mb-3 border-2 border-white/10" style={{ backgroundColor: team.primary_color }}></div>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest">Primary</p>
                      <p className="text-xs font-mono mt-1">{team.primary_color}</p>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="w-full aspect-square rounded-2xl mb-3 border-2 border-white/10" style={{ backgroundColor: team.secondary_color }}></div>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest">Secondary</p>
                      <p className="text-xs font-mono mt-1">{team.secondary_color}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Players */}
              <div className="glass rounded-[2rem] p-8 border border-white/5">
                <h3 className="text-lg font-black uppercase italic mb-6 flex items-center gap-2">
                  <Star size={20} className="text-brand-green" /> Key Players
                </h3>
                {players.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {players.slice(0, 3).map(player => (
                      <div key={player.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center font-black">
                          {player.number}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{player.name}</p>
                          <p className="text-[10px] text-white/30 uppercase">{player.position}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/30 text-center py-8">No players registered yet</p>
                )}
              </div>
            </div>
          )}

          {/* SQUAD TAB */}
          {activeTab === 'squad' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Squad Management</h3>
                <button 
                  onClick={() => setShowPlayerModal(true)}
                  className="gradient-green text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:scale-105 transition-all"
                >
                  <Plus size={18} /> Add Player
                </button>
              </div>

              {players.length > 0 ? (
                <div className="glass rounded-[2rem] border border-white/5 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/30">
                        <th className="px-6 py-4 text-left">#</th>
                        <th className="px-6 py-4 text-left">Player</th>
                        <th className="px-6 py-4 text-left">Position</th>
                        <th className="px-6 py-4 text-center">Goals</th>
                        <th className="px-6 py-4 text-center">Assists</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {players.map((player) => (
                        <tr key={player.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-black text-lg">{player.number}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold">
                                {player.name[0]}
                              </div>
                              <div>
                                <p className="font-bold text-sm">{player.name}</p>
                                <p className="text-[10px] text-white/30">{player.nationality}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-white/60">{player.position}</td>
                          <td className="px-6 py-4 text-center font-bold text-brand-green">{player.goals || 0}</td>
                          <td className="px-6 py-4 text-center font-bold text-brand-blue">{player.assists || 0}</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDeletePlayer(player.id)}
                              className="text-[10px] font-black uppercase text-brand-red hover:bg-brand-red/10 px-3 py-2 rounded-lg transition-all"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="glass rounded-[2rem] p-20 text-center border border-dashed border-white/10">
                  <Users size={48} className="mx-auto text-white/10 mb-4" />
                  <p className="text-white/30 font-bold uppercase tracking-widest mb-4">No players in squad</p>
                  <button 
                    onClick={() => setShowPlayerModal(true)}
                    className="gradient-green text-black px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs"
                  >
                    Add First Player
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MATCHES TAB */}
          {activeTab === 'matches' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter">Match History</h3>
              
              {teamMatches.length > 0 ? (
                <div className="space-y-4">
                  {teamMatches.map((match) => (
                    <div key={match.id} className="glass rounded-2xl p-6 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        <div className="text-center w-24">
                          <p className="text-[10px] text-white/30 uppercase">{match.homeTeam?.short_name || 'TBD'}</p>
                          <p className="font-bold text-sm">{match.homeTeam?.name || 'TBD'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-black italic">{match.home_score} - {match.away_score}</p>
                          <p className={`text-[10px] font-black uppercase ${
                            match.status === 'live' ? 'text-brand-green' : 
                            match.status === 'finished' ? 'text-white/30' : 'text-brand-blue'
                          }`}>
                            {match.status === 'live' ? `${match.minute}'` : match.status === 'finished' ? 'FT' : new Date(match.start_time).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-center w-24">
                          <p className="text-[10px] text-white/30 uppercase">{match.awayTeam?.short_name || 'TBD'}</p>
                          <p className="font-bold text-sm">{match.awayTeam?.name || 'TBD'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-white/30 uppercase">{match.competition}</p>
                        <p className="text-xs text-white/40">{match.venue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass rounded-[2rem] p-20 text-center border border-dashed border-white/10">
                  <Calendar size={48} className="mx-auto text-white/10 mb-4" />
                  <p className="text-white/30 font-bold uppercase tracking-widest">No matches played yet</p>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter">Team Settings</h3>
              
              <div className="glass rounded-[2rem] p-8 border border-white/5 space-y-6">
                {isEditing ? (
                  <>
                    {/* Logo Upload Section */}
                    <div className="mb-8">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4 block">Club Logo</label>
                      <div className="flex items-center gap-6">
                        <div 
                          onClick={() => document.getElementById('logo-upload-input')?.click()}
                          className="w-24 h-24 rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-brand-green/50 transition-all"
                        >
                          {formData.logo_url ? (
                            <img src={formData.logo_url} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl font-black italic text-white/20">{team.short_name?.[0]}</span>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Upload size={24} className="text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <input 
                            type="file" 
                            id="logo-upload-input"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <button 
                            type="button"
                            onClick={() => document.getElementById('logo-upload-input')?.click()}
                            className="bg-white/5 hover:bg-white/10 text-white/60 hover:text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all"
                          >
                            Change Logo
                          </button>
                          <p className="text-[10px] text-white/30 mt-2">PNG, JPG up to 5MB. Recommended: 512x512px</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Club Name</label>
                        <input 
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Short Code</label>
                        <input 
                          value={formData.short_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, short_name: e.target.value.toUpperCase() }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm uppercase font-black italic"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">City</label>
                        <input 
                          value={formData.city}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Stadium</label>
                        <input 
                          value={formData.venue}
                          onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Head Coach</label>
                        <input 
                          value={formData.coach}
                          onChange={(e) => setFormData(prev => ({ ...prev, coach: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Primary Color</label>
                        <input 
                          type="color"
                          value={formData.primary_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                          className="w-full h-12 bg-white/5 border border-white/10 rounded-xl cursor-pointer"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Secondary Color</label>
                        <input 
                          type="color"
                          value={formData.secondary_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                          className="w-full h-12 bg-white/5 border border-white/10 rounded-xl cursor-pointer"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleSaveTeam}
                      className="gradient-green text-black px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
                    >
                      <Save size={18} /> Save Changes
                    </button>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Settings size={48} className="mx-auto text-white/10 mb-4" />
                    <p className="text-white/30 mb-4">Click "Edit Team" in the header to modify team details</p>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="bg-white/5 text-white/40 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:text-white hover:bg-white/10 transition-all"
                    >
                      Enable Edit Mode
                    </button>
                  </div>
                )}
              </div>

              {/* Danger Zone */}
              <div className="glass rounded-[2rem] p-8 border border-brand-red/20">
                <h3 className="text-lg font-black uppercase italic mb-4 flex items-center gap-2 text-brand-red">
                  <Trash2 size={20} /> Danger Zone
                </h3>
                <p className="text-white/30 text-sm mb-6">Once you delete a team, there is no going back. Please be certain.</p>
                <button 
                  onClick={handleDeleteTeam}
                  className="bg-brand-red/10 text-brand-red px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm border border-brand-red/30 hover:bg-brand-red hover:text-white transition-all"
                >
                  Delete Entire Club
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Add Player Modal */}
        {showPlayerModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPlayerModal(false)}></div>
            <div className="relative w-full max-w-2xl glass rounded-[2rem] border border-white/10 p-8 animate-in zoom-in">
              <h3 className="text-2xl font-black italic uppercase mb-6">Register Player</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                
                try {
                  await createPlayer({
                    team_id: team.id,
                    name: formData.get('name'),
                    position: formData.get('position'),
                    number: parseInt(formData.get('number') as string),
                    nationality: formData.get('nationality')
                  });
                  alert('Player added!');
                  setShowPlayerModal(false);
                  loadTeamData();
                } catch (err: any) {
                  alert('Error: ' + err.message);
                }
              }}>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <input name="name" placeholder="Full Name" required className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm" />
                  <input name="nationality" placeholder="Nationality" required className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm" />
                  <select name="position" required className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm">
                    <option value="">Select Position</option>
                    <option value="Goalkeeper">Goalkeeper</option>
                    <option value="Defender">Defender</option>
                    <option value="Midfielder">Midfielder</option>
                    <option value="Forward">Forward</option>
                  </select>
                  <input name="number" type="number" placeholder="Jersey Number" required className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm" />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowPlayerModal(false)} className="flex-1 bg-white/5 text-white/40 py-3 rounded-xl font-black uppercase tracking-widest text-xs">Cancel</button>
                  <button type="submit" className="flex-1 gradient-green text-black py-3 rounded-xl font-black uppercase tracking-widest text-xs">Add Player</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
