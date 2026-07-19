import { useState, useEffect, useCallback } from 'react';
import {
  Users, Trash2, Edit, Plus, Loader2, X, Save,
  CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, Eye
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import TeamSquadDashboard from './TeamSquadDashboard';

// ─── Inline toast ─────────────────────────────────────────────────────────────
function useMsg() {
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const show = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };
  return { msg, success: (t: string) => show('success', t), error: (t: string) => show('error', t) };
}

function InlineMsg({ msg }: { msg: { type: string; text: string } | null }) {
  if (!msg) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl font-bold text-sm max-w-sm animate-in slide-in-from-right-4 duration-300 ${
      msg.type === 'success' ? 'bg-brand-green/20 border-brand-green/40' : 'bg-red-500/20 border-red-500/40'
    }`}>
      {msg.type === 'success'
        ? <CheckCircle2 size={18} className="text-brand-green shrink-0" />
        : <XCircle size={18} className="text-red-400 shrink-0" />}
      <span>{msg.text}</span>
    </div>
  );
}

export default function TeamDashboard() {
  const [teams, setTeams] = useState<any[]>([]);
  const [pendingTeams, setPendingTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<number | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: '', short_name: '', city: '', venue: '', coach: '',
    primary_color: '#39FF14', secondary_color: '#000000'
  });
  const [showSquadDashboard, setShowSquadDashboard] = useState(false);
  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [teamMatches, setTeamMatches] = useState<any[]>([]);
  const { msg, success, error } = useMsg();

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    const [allTeams, pending] = await Promise.all([
      supabase
        .from('teams')
        .select('id, name, short_name, city, venue, coach, primary_color, secondary_color, status, owner_id, created_at')
        .not('status', 'eq', 'pending')
        .order('name'),
      supabase
        .from('teams')
        .select('id, name, short_name, city, venue, coach, primary_color, secondary_color, status, owner_id, created_at, profiles(username, email)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);
    // If the status column doesn't exist, fall back to fetching all teams
    if (allTeams.error?.message?.includes('status')) {
      const { data } = await supabase
        .from('teams')
        .select('id, name, short_name, city, primary_color, secondary_color, created_at')
        .order('name');
      setTeams(data || []);
      setPendingTeams([]);
    } else {
      setTeams(allTeams.data || []);
      setPendingTeams(pending.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  // ── Approval actions ────────────────────────────────────────────────────────
  const handleApprove = async (team: any) => {
    setApproving(team.id);
    try {
      const { error: err } = await supabase
        .from('teams')
        .update({ status: 'active' })
        .eq('id', team.id);
      if (err) throw err;
      success(`✓ "${team.name}" approved — team manager now has full access.`);
      fetchTeams();
    } catch (err: any) { error('Approve failed: ' + err.message); }
    finally { setApproving(null); }
  };

  const handleReject = async (team: any) => {
    setApproving(team.id);
    try {
      const { error: err } = await supabase
        .from('teams')
        .update({ status: 'rejected' })
        .eq('id', team.id);
      if (err) throw err;
      success(`"${team.name}" rejected — team manager notified.`);
      fetchTeams();
    } catch (err: any) { error('Reject failed: ' + err.message); }
    finally { setApproving(null); }
  };

  // ── Edit / Delete ────────────────────────────────────────────────────────────
  const handleEditClick = (team: any) => {
    setSelectedTeam(team);
    setEditForm({
      name: team.name || '',
      short_name: team.short_name || '',
      city: team.city || '',
      venue: team.venue || '',
      coach: team.coach || '',
      primary_color: team.primary_color || '#39FF14',
      secondary_color: team.secondary_color || '#000000',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const { error: err } = await supabase.from('teams').update(editForm).eq('id', selectedTeam.id);
      if (err) throw err;
      success('Team updated!');
      setShowEditModal(false);
      fetchTeams();
    } catch (err: any) { error('Update failed: ' + err.message); }
  };

  const handleConfirmDelete = async () => {
    try {
      const { error: err } = await supabase.from('teams').delete().eq('id', selectedTeam.id);
      if (err) throw err;
      success('Team deleted.');
      setShowDeleteModal(false);
      fetchTeams();
    } catch (err: any) { error('Delete failed: ' + err.message); }
  };

  const handleViewMatches = async (team: any) => {
    setSelectedTeam(team);
    const { data } = await supabase
      .from('matches')
      .select('id, home_score, away_score, status, start_time, homeTeam:teams!home_team_id(name,short_name), awayTeam:teams!away_team_id(name,short_name)')
      .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
      .order('start_time', { ascending: false })
      .limit(20);
    setTeamMatches(data || []);
    setShowMatchesModal(true);
  };

  return (
    <div className="space-y-8 animate-in">
      <InlineMsg msg={msg} />

      {/* ── Pending Approval Section ─────────────────────────────────────── */}
      {pendingTeams.length > 0 && (
        <div className="glass rounded-[2rem] border border-yellow-500/30 overflow-hidden">
          <div className="px-8 py-5 border-b border-yellow-500/20 flex items-center justify-between bg-yellow-500/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Clock size={20} className="text-yellow-400" />
              </div>
              <div>
                <h3 className="font-black uppercase text-yellow-400 text-sm tracking-widest">
                  {pendingTeams.length} Team Request{pendingTeams.length > 1 ? 's' : ''} Pending Approval
                </h3>
                <p className="text-[10px] text-white/30 mt-0.5">Team managers waiting for your decision</p>
              </div>
            </div>
            <button onClick={fetchTeams} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <RefreshCw size={16} className="text-white/30" />
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {pendingTeams.map(team => (
              <div key={team.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Team badge */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 border border-white/10"
                    style={{ background: `linear-gradient(135deg, ${team.primary_color || '#39FF14'}, ${team.secondary_color || '#000'})` }}
                  >
                    {team.short_name?.[0] || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black uppercase">{team.name}</h4>
                      <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 uppercase tracking-widest">Pending</span>
                    </div>
                    <p className="text-xs text-white/40 truncate">
                      {team.short_name}
                      {team.city ? ` • ${team.city}` : ''}
                      {team.venue ? ` • ${team.venue}` : ''}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-white/30">
                      {team.coach && <span>🧑‍💼 {team.coach}</span>}
                      {team.profiles?.username && <span>👤 {team.profiles.username}</span>}
                      <span>📅 {new Date(team.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(team)}
                    disabled={approving === team.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green/20 text-brand-green hover:bg-brand-green hover:text-black font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    {approving === team.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(team)}
                    disabled={approving === team.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All Teams ────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">
              Teams & <span className="text-brand-green">Squads</span>
            </h2>
            <p className="text-xs text-white/40 uppercase tracking-widest font-black mt-0.5">
              {teams.length} active clubs
            </p>
          </div>
          <button
            onClick={fetchTeams}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className="text-white/30" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-brand-green" size={32} />
          </div>
        ) : teams.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center border border-white/5">
            <Users size={48} className="mx-auto text-white/10 mb-4" />
            <p className="text-white/30 font-bold uppercase">No active teams yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map(team => (
              <div key={team.id} className="glass rounded-[2rem] p-6 border border-white/5 group hover:border-brand-green/30 transition-all">
                {/* Header */}
                <div className="flex items-center gap-4 mb-5">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black italic shadow-lg border border-white/10 shrink-0"
                    style={{ background: `linear-gradient(135deg, ${team.primary_color || '#39FF14'}, ${team.secondary_color || '#000'})` }}
                  >
                    {team.short_name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black italic uppercase tracking-tighter truncate">{team.name}</h3>
                    <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">{team.city || 'Unknown'}</p>
                    {team.coach && <p className="text-[10px] text-white/30 mt-0.5">🧑‍💼 {team.coach}</p>}
                  </div>
                  {team.status === 'active' && (
                    <span className="ml-auto px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-brand-green/20 text-brand-green">Active</span>
                  )}
                </div>

                {/* Quick info */}
                {(team.venue || team.short_name) && (
                  <div className="flex gap-2 mb-4">
                    {team.short_name && (
                      <span className="px-2 py-1 rounded-lg bg-white/5 text-[10px] font-black text-white/40 tracking-widest">{team.short_name}</span>
                    )}
                    {team.venue && (
                      <span className="px-2 py-1 rounded-lg bg-white/5 text-[10px] text-white/30 truncate">🏟 {team.venue}</span>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setSelectedTeam(team); setShowSquadDashboard(true); }}
                      className="flex items-center justify-center gap-2 p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white"
                    >
                      <Users size={13} /> Squad
                    </button>
                    <button
                      onClick={() => handleViewMatches(team)}
                      className="flex items-center justify-center gap-2 p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white"
                    >
                      <Eye size={13} /> Matches
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleEditClick(team)}
                      className="flex items-center justify-center gap-2 p-2.5 bg-white/5 rounded-xl hover:bg-brand-green/10 hover:text-brand-green transition-all text-[10px] font-black uppercase tracking-widest text-white/50"
                    >
                      <Edit size={13} /> Edit
                    </button>
                    <button
                      onClick={() => { setSelectedTeam(team); setShowDeleteModal(true); }}
                      className="flex items-center justify-center gap-2 p-2.5 bg-red-500/10 rounded-xl hover:bg-red-500/20 text-red-400 transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Modal ────────────────────────────────────────────────────── */}
      {showEditModal && selectedTeam && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-2xl glass rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0B0E13]">
              <h2 className="text-xl font-black uppercase">Edit Team</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-white/10 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Live preview */}
              <div className="glass rounded-xl p-4 border border-white/5 flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black"
                  style={{ background: `linear-gradient(135deg, ${editForm.primary_color}, ${editForm.secondary_color})` }}>
                  {editForm.short_name?.[0] || '?'}
                </div>
                <div>
                  <p className="font-black uppercase">{editForm.name || 'Team Name'}</p>
                  <p className="text-white/40 text-xs">{editForm.city || '—'}{editForm.venue ? ` • ${editForm.venue}` : ''}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {([
                  { key: 'name', label: 'Team Name' },
                  { key: 'short_name', label: 'Short Name', upper: true, maxLen: 5 },
                  { key: 'city', label: 'City' },
                  { key: 'venue', label: 'Stadium' },
                ] as any[]).map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-black uppercase text-white/40 mb-2 block">{f.label}</label>
                    <input
                      type="text"
                      maxLength={f.maxLen}
                      value={editForm[f.key as keyof typeof editForm]}
                      onChange={e => setEditForm({ ...editForm, [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-green/50"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-white/40 mb-2 block">Coach</label>
                <input value={editForm.coach} onChange={e => setEditForm({ ...editForm, coach: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-green/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-white/40 mb-2 block">Primary Color</label>
                  <input type="color" value={editForm.primary_color} onChange={e => setEditForm({ ...editForm, primary_color: e.target.value })}
                    className="w-full h-12 rounded-xl cursor-pointer border-0 bg-transparent" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-white/40 mb-2 block">Secondary Color</label>
                  <input type="color" value={editForm.secondary_color} onChange={e => setEditForm({ ...editForm, secondary_color: e.target.value })}
                    className="w-full h-12 rounded-xl cursor-pointer border-0 bg-transparent" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex gap-3">
              <button onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white font-black uppercase tracking-widest hover:bg-white/10">
                Cancel
              </button>
              <button onClick={handleSaveEdit}
                className="flex-1 py-3 rounded-xl gradient-green text-black font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ──────────────────────────────────────────────────── */}
      {showDeleteModal && selectedTeam && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative w-full max-w-md glass rounded-[2.5rem] border border-red-500/30 shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl font-black uppercase mb-2">Delete Team?</h2>
            <p className="text-white/40 text-sm mb-6">
              Delete <span className="text-white font-bold">"{selectedTeam.name}"</span>? This removes all associated data and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 font-black uppercase tracking-widest hover:bg-white/10">
                Cancel
              </button>
              <button onClick={handleConfirmDelete}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black uppercase tracking-widest hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Matches Modal ─────────────────────────────────────────────────── */}
      {showMatchesModal && selectedTeam && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowMatchesModal(false)} />
          <div className="relative w-full max-w-2xl glass rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden max-h-[85vh]">
            <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0B0E13]">
              <h2 className="text-lg font-black uppercase">{selectedTeam.name} — Matches</h2>
              <button onClick={() => setShowMatchesModal(false)} className="p-2 hover:bg-white/10 rounded-xl"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] divide-y divide-white/5">
              {teamMatches.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-white/30 font-bold uppercase">No matches found</p>
                </div>
              ) : teamMatches.map((m: any) => {
                const done = ['full_time', 'completed', 'finished'].includes(m.status);
                const live = ['first_half', 'second_half', 'extra_time', 'half_time'].includes(m.status);
                return (
                  <div key={m.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02]">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{m.homeTeam?.name} vs {m.awayTeam?.name}</p>
                      <p className="text-[10px] text-white/30">{m.start_time ? new Date(m.start_time).toLocaleDateString() : '—'}</p>
                    </div>
                    {done ? (
                      <span className="font-black text-brand-green">{m.home_score} – {m.away_score}</span>
                    ) : live ? (
                      <span className="text-[10px] font-black text-red-400 animate-pulse bg-red-400/10 px-2 py-1 rounded">LIVE</span>
                    ) : (
                      <span className="text-[10px] text-white/30 font-bold uppercase">{m.status}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Squad Dashboard (full-screen overlay) ────────────────────────── */}
      {showSquadDashboard && selectedTeam && (
        <TeamSquadDashboard team={selectedTeam} onBack={() => setShowSquadDashboard(false)} />
      )}
    </div>
  );
}
