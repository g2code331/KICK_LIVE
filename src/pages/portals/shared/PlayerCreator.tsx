import { useState, useEffect } from 'react';
import { X, UserPlus, Upload, Shield, Hash, Award, Activity } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface PlayerCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  teamId?: number; // Pre-select team for Team Owner
}

export default function PlayerCreator({ isOpen, onClose, teamId }: PlayerCreatorProps) {
  const [teams, setTeams] = useState<any[]>([]);
  const [_loading, setLoading] = useState(false);
  const [playerPhoto, setPlayerPhoto] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>(teamId);
  const [formData, setFormData] = useState({
    name: '',
    nationality: '',
    position: 'Forward',
    number: '',
    speed: 75,
    power: 75,
    dribbling: 75,
    stamina: 75
  });

  useEffect(() => {
    if (isOpen) {
      fetchTeams();
      if (teamId) setSelectedTeamId(teamId);
    }
  }, [isOpen, teamId]);

  async function fetchTeams() {
    const { data } = await supabase.from('teams').select('id, name, short_name').order('name');
    const uniqueTeams = Array.from(new Map(data?.map((t: any) => [t.id, t])).values());
    setTeams(uniqueTeams);
    if (!teamId && uniqueTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(uniqueTeams[0].id);
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPlayerPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPlayer = async () => {
    if (!formData.name || !formData.number) {
      alert('Please fill in player name and jersey number');
      return;
    }

    const finalTeamId = teamId || selectedTeamId || teams[0]?.id;
    if (!finalTeamId) {
      alert('Please select a team');
      return;
    }

    setLoading(true);
    try {
      const { data: playerData, error } = await supabase.from('players').insert([{
        team_id: finalTeamId,
        name: formData.name,
        nationality: formData.nationality || 'Unknown',
        position: formData.position,
        number: parseInt(formData.number),
        goals: 0,
        assists: 0,
        photo_url: playerPhoto || null
      }]).select().single();

      if (error) throw error;

      // Log Activity
      await supabase.rpc('log_activity', {
        p_action: 'Player Registered',
        p_entity_type: 'player',
        p_entity_id: playerData.id,
        p_entity_name: formData.name,
        p_destination: '/admin/teams',
        p_details: { team_id: finalTeamId, position: formData.position }
      });

      alert('Player added successfully!');
      onClose();
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert('Error adding player: ' + err.message);
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
            <div className="w-12 h-12 bg-brand-blue/20 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-blue/20">
              <UserPlus className="text-brand-blue" />
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Register Player</h2>
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Squad Roster Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[70vh] no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left: Picture Upload */}
            <div className="md:col-span-1 space-y-6 text-center">
              <input 
                type="file" 
                id="player-photo" 
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <label 
                htmlFor="player-photo"
                className="w-full aspect-[3/4] rounded-[2rem] bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 group cursor-pointer hover:border-brand-blue/50 transition-all relative overflow-hidden"
              >
                {playerPhoto ? (
                  <>
                    <img src={playerPhoto} alt="Player" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="text-white" size={32} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="text-white/20 group-hover:text-brand-blue" size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase tracking-widest text-white/40">Upload Portrait</p>
                      <p className="text-[10px] text-white/20">PNG or JPG (Max 5MB)</p>
                    </div>
                  </>
                )}
              </label>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 block text-left">Jersey Number</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input 
                    type="number" 
                    value={formData.number}
                    onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                    placeholder="10" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-blue/50 text-xl font-black italic" 
                  />
                </div>
              </div>
            </div>

            {/* Right: Info Form */}
            <div className="md:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Mohammed Kudus" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-brand-blue/50 text-sm" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Nationality</label>
                  <input 
                    type="text" 
                    value={formData.nationality}
                    onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                    placeholder="Ghana" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-brand-blue/50 text-sm" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Position</label>
                  <select 
                    value={formData.position}
                    onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-brand-blue/50 text-sm font-bold"
                  >
                    <option>Goalkeeper</option>
                    <option>Defender</option>
                    <option>Midfielder</option>
                    <option>Forward</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Assigned Team</label>
                  <select 
                    disabled={!!teamId}
                    value={selectedTeamId || ''}
                    onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-brand-blue/50 text-sm font-bold disabled:opacity-50"
                  >
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 block">Player Attributes</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Speed', icon: <Activity size={14} /> },
                    { label: 'Power', icon: <Award size={14} /> },
                    { label: 'Dribbling', icon: <Shield size={14} /> },
                    { label: 'Stamina', icon: <Activity size={14} /> },
                  ].map((attr) => (
                    <div key={attr.label} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-[10px] text-white/40 font-bold uppercase">
                        {attr.icon} {attr.label}
                      </div>
                      <input type="number" defaultValue="75" className="w-full bg-transparent text-sm font-black focus:outline-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/10 flex items-center justify-end gap-4 bg-white/5">
          <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-sm text-white/40 hover:text-white transition-colors">Cancel</button>
          <button 
            onClick={handleAddPlayer}
            disabled={_loading}
            className="px-10 py-3 rounded-xl bg-brand-blue text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-brand-blue/20 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {_loading ? 'Adding...' : 'Add to Squad'}
          </button>
        </div>
      </div>
    </div>
  );
}
