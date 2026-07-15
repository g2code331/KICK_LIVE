import { useState, useEffect } from 'react';
import { 
  Trophy, Users, Settings, Calendar,
  Check, Globe, Zap, Hash, Plus, ArrowLeft, ArrowRight
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import TeamAdder from './TeamAdder';

interface CompetitionWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'basic' | 'teams' | 'format' | 'rules' | 'generate';
type TournamentFormat = 'league' | 'cup' | 'knockout';

export default function CompetitionWizard({ isOpen, onClose }: CompetitionWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [loading, setLoading] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [isTeamAdderOpen, setIsTeamAdderOpen] = useState(false);
  
  // Wizard State
  const [config, setCompetitionConfig] = useState({
    name: '',
    season: '2025',
    type: 'league' as TournamentFormat,
    startDate: '',
    endDate: '',
    selectedTeams: [] as number[],
    matchDuration: 90,
    allowDraw: true,
    varEnabled: false,
    extraTime: false,
    homeAway: false,
    venues: [] as string[],
    cupFormat: 'group_knockout' as string,
  });

  useEffect(() => {
    if (isOpen) {
      console.log('[Wizard] Fetching teams...');
      fetchTeams();
    }
  }, [isOpen]);

  // Refresh teams when moving to teams step
  useEffect(() => {
    if (isOpen && currentStep === 'teams') {
      console.log('[Wizard] Refreshing teams list...');
      fetchTeams();
    }
  }, [isOpen, currentStep]);

  async function fetchTeams() {
    const { data } = await supabase.from('teams').select('id, name, short_name, city');
    const uniqueTeams = Array.from(new Map(data?.map((t: any) => [t.id, t])).values());
    setAvailableTeams(uniqueTeams);
  }

  const toggleTeam = (id: number) => {
    setCompetitionConfig(prev => ({
      ...prev,
      selectedTeams: prev.selectedTeams.includes(id) 
        ? prev.selectedTeams.filter(t => t !== id)
        : [...prev.selectedTeams, id]
    }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      console.log('Creating competition:', config.name);
      console.log('Format:', config.type);
      console.log('Selected teams:', config.selectedTeams.length);
      
      // 1. Create Competition
      const { data: compData, error: compError } = await supabase
        .from('competitions')
        .insert([{
          name: config.name,
          type: config.type,
          season: config.season,
          start_date: config.startDate,
          end_date: config.endDate,
          format: config.type,
          status: 'upcoming'
        }])
        .select()
        .single();

      if (compError) {
        console.error('Competition creation error:', compError);
        throw compError;
      }

      console.log('Competition created:', compData.id);

      // 2. Generate Fixtures IMMEDIATELY using CompetitionEngine
      const { CompetitionEngine } = await import('../../../lib/CompetitionEngine');
      
      let matchesToInsert: any[] = [];
      
      // Validate selected teams
      const selectedTeamsList = availableTeams.filter(t => {
        const isSelected = config.selectedTeams.includes(t.id);
        console.log(`Team ${t.id} (${t.name}): ${isSelected ? 'SELECTED' : 'not selected'}`);
        return isSelected;
      });
      
      console.log('=== FIXTURE GENERATION ===');
      console.log('Available teams:', availableTeams.map(t => ({ id: t.id, name: t.name })));
      console.log('Selected team IDs from config:', config.selectedTeams);
      console.log('Filtered teams:', selectedTeamsList.map(t => ({ id: t.id, name: t.name })));
      console.log('Competition ID:', compData.id);
      
      if (selectedTeamsList.length < 2) {
        console.error('❌ Not enough teams selected!');
        throw new Error(`Please select at least 2 teams. Currently selected: ${selectedTeamsList.length}`);
      }
      
      // Validate all team IDs are valid numbers
      const invalidTeams = selectedTeamsList.filter(t => !t.id || typeof t.id !== 'number');
      if (invalidTeams.length > 0) {
        console.error('❌ Invalid team IDs found:', invalidTeams);
        throw new Error(`Invalid team data found. Please refresh and select teams again.`);
      }
      
      if (config.type === 'league') {
        console.log('Generating LEAGUE fixtures...');
        matchesToInsert = CompetitionEngine.create(
          'league',
          selectedTeamsList,
          {
            rounds: config.cupFormat?.includes('home') || config.cupFormat?.includes('double') ? 'double' : 'single',
            pointsWin: 3,
            pointsDraw: 1,
            pointsLoss: 0,
            startDate: config.startDate || new Date().toISOString().split('T')[0],
            endDate: config.endDate || new Date(Date.now() + 31536000000).toISOString().split('T')[0],
            matchDays: ['Saturday', 'Sunday'],
            kickoffTimes: ['15:00', '18:00'],
            restDays: 3
          },
          compData.id
        );
      } else if (config.type === 'cup') {
        console.log('Generating CUP fixtures...');
        const numGroups = Math.max(2, Math.min(8, Math.ceil(selectedTeamsList.length / 4)));
        matchesToInsert = CompetitionEngine.create(
          'cup',
          selectedTeamsList,
          {
            numGroups: numGroups,
            teamsPerGroup: Math.ceil(selectedTeamsList.length / numGroups),
            qualifyingPerGroup: 2,
            hasThirdPlace: true,
            drawMethod: 'random'
          },
          compData.id
        );
      } else if (config.type === 'knockout') {
        console.log('Generating KNOCKOUT fixtures...');
        console.log('=== KNOCKOUT BRACKET GENERATION ===');
        matchesToInsert = CompetitionEngine.create(
          'knockout',
          selectedTeamsList,
          {
            hasThirdPlace: true,
            extraTime: true,
            penaltyShootout: true,
            awayGoalsRule: false,
            legs: 'single'
          },
          compData.id
        );
        console.log('Knockout bracket generated with', matchesToInsert.length, 'matches');
      }

      console.log('Generated', matchesToInsert.length, 'fixtures');

      if (matchesToInsert.length > 0) {
        console.log('Inserting fixtures in batches...');
        console.log('Sample fixture:', matchesToInsert[0]);
        
        // Validate all team IDs exist in database before inserting
        const allTeamIds = selectedTeamsList.map(t => t.id);
        console.log('Validating team IDs:', allTeamIds);
        
        // Insert in batches to avoid timeout
        const batchSize = 50;
        let inserted = 0;
        
        for (let i = 0; i < matchesToInsert.length; i += batchSize) {
          const batch = matchesToInsert.slice(i, i + batchSize);
          
          // Log first batch for debugging
          if (i === 0) {
            console.log('First batch sample:', batch.slice(0, 3).map(m => ({
              home_team_id: m.home_team_id,
              away_team_id: m.away_team_id,
              group: m.group,
              round: m.round
            })));
          }
          
          const { error: batchError } = await supabase
            .from('matches')
            .insert(batch)
            .select();
          
          if (batchError) {
            console.error('❌ Batch insert error:', batchError);
            console.error('Failed batch:', batch.slice(0, 5));
            console.error('Available team IDs:', allTeamIds);
            
            if (batchError.message.includes('foreign key') || batchError.code === '23503') {
              // Extract the invalid team IDs from the batch
              const batchTeamIds = batch.flatMap(m => [m.home_team_id, m.away_team_id]);
              const invalidIds = batchTeamIds.filter(id => !allTeamIds.includes(id));
              
              console.error('Invalid team IDs in batch:', invalidIds);
              throw new Error(
                `Foreign key constraint failed. Invalid team IDs: ${invalidIds.join(', ')}. ` +
                `Please go to Team Management and ensure all teams are properly saved.`
              );
            }
            
            throw new Error(`Error inserting fixtures: ${batchError.message}`);
          }
          
          inserted += batch.length;
          console.log(`✓ Inserted ${inserted}/${matchesToInsert.length} fixtures`);
        }
        
        console.log('✅ All fixtures inserted successfully!');
      }

      // 3. Log Activity
      try {
        await supabase.rpc('log_activity', {
          p_action: 'Competition Created',
          p_entity_type: 'competition',
          p_entity_id: compData.id,
          p_entity_name: config.name,
          p_destination: '/admin/competitions',
          p_details: { 
            type: config.type, 
            teams: config.selectedTeams.length,
            fixtures: matchesToInsert.length 
          }
        });
      } catch (logErr) {
        console.warn('Activity logging failed:', logErr);
      }

      if (config.type === 'knockout' && matchesToInsert.length > 0) {
        alert(`✅ Knockout competition "${config.name}" created!\n\n Generated ${matchesToInsert.length} knockout matches\n\nBracket includes all rounds from first round to Final.\n\nTeams are properly seeded so top seeds don't meet until later rounds.`);
      } else if (config.type === 'knockout') {
        alert(`Knockout competition "${config.name}" created!\n\n️ No fixtures generated (need at least 2 teams)\n\nGo to Match Control to manually create knockout matches.`);
      } else {
        alert(`Competition "${config.name}" created with ${matchesToInsert.length} fixtures!`);
      }
      onClose();
      window.location.reload();
    } catch (err: any) {
      console.error('Generation error:', err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-bg/95 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative w-full max-w-6xl glass rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-in zoom-in duration-500">
        
        {/* Navigation Sidebar */}
        <div className="flex h-full">
          <aside className="w-72 bg-white/5 border-r border-white/10 p-10 flex flex-col gap-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 gradient-green rounded-2xl flex items-center justify-center shadow-lg">
                <Trophy className="text-black" />
              </div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Wizard</h2>
            </div>

            <div className="space-y-4">
              {[
                { id: 'basic', label: 'Basic Info', icon: <Hash size={18} /> },
                { id: 'teams', label: 'Teams', icon: <Users size={18} /> },
                { id: 'format', label: 'Format', icon: <Globe size={18} /> },
                { id: 'rules', label: 'Match Rules', icon: <Settings size={18} /> },
                { id: 'generate', label: 'Generate', icon: <Zap size={18} /> },
              ].map((s, i) => (
                <div key={s.id} className={`flex items-center gap-4 transition-all ${currentStep === s.id ? 'text-brand-green translate-x-2' : 'text-white/20'}`}>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${currentStep === s.id ? 'border-brand-green bg-brand-green/10' : 'border-white/10'}`}>
                    {i + 1}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto p-6 rounded-2xl bg-brand-green/5 border border-brand-green/10">
              <p className="text-[10px] text-brand-green font-black uppercase mb-2">KickLive Pro</p>
              <p className="text-[10px] text-white/40 leading-relaxed italic">The automation engine handles groups, brackets, and standings automatically.</p>
            </div>
          </aside>

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            {currentStep === 'basic' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
                <div>
                  <h3 className="text-4xl font-black italic uppercase tracking-tighter mb-2">Competition Info</h3>
                  <p className="text-white/40 uppercase tracking-[0.3em] text-[10px]">Step 1: Define the core identity</p>
                </div>
                
                <div className="grid grid-cols-1 gap-8 max-w-2xl">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Competition Name</label>
                    <input 
                      type="text" 
                      value={config.name}
                      onChange={e => setCompetitionConfig(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Champions League 2025" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xl font-black italic focus:border-brand-green transition-all" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Start Date</label>
                      <input 
                        type="date" 
                        value={config.startDate}
                        onChange={e => setCompetitionConfig(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm" 
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">End Date</label>
                      <input 
                        type="date" 
                        value={config.endDate}
                        onChange={e => setCompetitionConfig(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'teams' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                <div>
                  <h3 className="text-4xl font-black italic uppercase tracking-tighter mb-2">Participating Teams</h3>
                  <p className="text-white/40 uppercase tracking-[0.3em] text-[10px]">Select {config.selectedTeams.length} clubs for this tournament</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {availableTeams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => toggleTeam(team.id)}
                      className={`p-6 rounded-[2rem] border-2 transition-all flex items-center gap-4 text-left ${
                        config.selectedTeams.includes(team.id)
                          ? 'border-brand-green bg-brand-green/10 shadow-lg shadow-brand-green/5'
                          : 'border-white/5 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center font-black">
                        {team.short_name[0]}
                      </div>
                      <div>
                        <p className="font-black italic uppercase text-sm">{team.name}</p>
                        <p className="text-[10px] text-white/30 uppercase">{team.city}</p>
                      </div>
                      {config.selectedTeams.includes(team.id) && <Check className="ml-auto text-brand-green" size={20} />}
                    </button>
                  ))}
                  <button 
                    onClick={() => {
                      setIsTeamAdderOpen(true);
                    }}
                    className="p-6 rounded-[2rem] border-2 border-dashed border-brand-green/30 flex items-center justify-center gap-3 text-brand-green hover:border-brand-green hover:bg-brand-green/10 transition-all"
                  >
                    <Plus size={24} /> <span className="text-xs font-black uppercase">Add New Club</span>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'format' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
                <div>
                  <h3 className="text-4xl font-black italic uppercase tracking-tighter mb-2">Tournament Format</h3>
                  <p className="text-white/40 uppercase tracking-[0.3em] text-[10px]">Step 3: Define the competition logic</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { id: 'league', label: 'League Format', desc: 'Teams play in a league table. Winner has most points.', icon: <Hash /> },
                    { id: 'cup', label: 'Cup Format', desc: 'Group stage followed by knockout rounds.', icon: <Trophy /> },
                    { id: 'knockout', label: 'Knockout Only', desc: 'Direct elimination. Lose and you\'re out.', icon: <Zap /> },
                  ].map(format => (
                    <button
                      key={format.id}
                      onClick={() => setCompetitionConfig(prev => ({ ...prev, type: format.id as TournamentFormat }))}
                      className={`p-8 rounded-[2.5rem] border-2 transition-all text-left flex gap-6 ${
                        config.type === format.id
                          ? 'border-brand-green bg-brand-green/10 scale-[1.02]'
                          : 'border-white/5 bg-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${config.type === format.id ? 'bg-brand-green text-black' : 'bg-white/5 text-white/40'}`}>
                        {format.icon}
                      </div>
                      <div>
                        <h4 className="font-black italic uppercase text-lg mb-1">{format.label}</h4>
                        <p className="text-xs text-white/30 leading-relaxed">{format.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 'rules' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
                <div>
                  <h3 className="text-4xl font-black italic uppercase tracking-tighter mb-2">Match Rules</h3>
                  <p className="text-white/40 uppercase tracking-[0.3em] text-[10px]">Step 4: Configure the officiating & gameplay</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                  {[
                    { id: 'varEnabled', label: 'VAR Integration', desc: 'Enable video assistant reviews in Match Center' },
                    { id: 'allowDraw', label: 'Allow Draws', desc: 'Enable 1 point for tie results' },
                    { id: 'extraTime', label: 'Extra Time', desc: 'Enable 30m overtime for knockout fixtures' },
                    { id: 'homeAway', label: 'Home & Away', desc: 'Reverse every fixture automatically' },
                  ].map(rule => (
                    <div key={rule.id} className="p-8 glass-light rounded-[2.5rem] border border-white/5 flex items-center justify-between group">
                      <div>
                        <p className="font-black uppercase italic text-sm tracking-tight">{rule.label}</p>
                        <p className="text-[10px] text-white/20">{rule.desc}</p>
                      </div>
                      <input 
                        type="checkbox" 
                        className="custom-toggle" 
                        checked={(config as any)[rule.id]}
                        onChange={() => setCompetitionConfig(prev => ({ ...prev, [rule.id]: !(prev as any)[rule.id] }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 'generate' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="text-center">
                  <div className="w-32 h-32 gradient-green rounded-[3rem] flex items-center justify-center shadow-[0_0_80px_rgba(57,255,20,0.3)] mx-auto mb-6">
                    <Zap size={64} className="text-black animate-pulse" />
                  </div>
                  <h3 className="text-4xl font-black italic uppercase tracking-tighter mb-2">Ready to Deploy?</h3>
                  <p className="text-white/40 uppercase tracking-[0.3em] text-xs">Review competition details before generating fixtures</p>
                </div>

                {/* Competition Summary */}
                <div className="glass rounded-[2rem] p-6 border border-brand-green/20">
                  <h4 className="text-lg font-black uppercase mb-6 flex items-center gap-2">
                    <Trophy size={20} className="text-brand-green" />
                    Competition Summary
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-brand-green">{config.selectedTeams.length}</p>
                      <p className="text-[10px] text-white/40 uppercase mt-1">Teams</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-brand-blue">{config.type.toUpperCase()}</p>
                      <p className="text-[10px] text-white/40 uppercase mt-1">Format</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-yellow-500">
                        {config.type === 'cup' ? Math.max(2, Math.min(8, Math.ceil(config.selectedTeams.length / 4))) : config.type === 'league' ? 1 : 'N/A'}
                      </p>
                      <p className="text-[10px] text-white/40 uppercase mt-1">Groups</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-purple-500">
                        {config.type === 'league' 
                          ? config.cupFormat?.includes('home') || config.cupFormat?.includes('double')
                            ? config.selectedTeams.length * (config.selectedTeams.length - 1)
                            : Math.floor(config.selectedTeams.length * (config.selectedTeams.length - 1) / 2)
                          : config.type === 'cup'
                            ? Math.floor(config.selectedTeams.length * (config.selectedTeams.length - 1) / 2) + Math.ceil(Math.log2(config.selectedTeams.length)) * 2
                            : Math.ceil(Math.log2(config.selectedTeams.length)) * 2
                        }
                      </p>
                      <p className="text-[10px] text-white/40 uppercase mt-1">Fixtures</p>
                    </div>
                  </div>
                </div>

                {/* Group Preview for Cup Format */}
                {config.type === 'cup' && (
                  <div className="glass rounded-[2rem] p-6 border border-brand-blue/20">
                    <h4 className="text-lg font-black uppercase mb-6 flex items-center gap-2">
                      <Users size={20} className="text-brand-blue" />
                      Group Stage Preview
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(() => {
                        const numGroups = Math.max(2, Math.min(8, Math.ceil(config.selectedTeams.length / 4)));
                        const selectedTeamsList = availableTeams.filter(t => config.selectedTeams.includes(t.id));
                        const groups: any[][] = Array.from({ length: numGroups }, () => []);
                        
                        // Distribute teams into groups
                        selectedTeamsList.forEach((team, index) => {
                          groups[index % numGroups].push(team);
                        });

                        return groups.map((group, i) => (
                          <div key={i} className="bg-white/5 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-brand-blue/20 flex items-center justify-center text-brand-blue font-black text-sm">
                                {String.fromCharCode(65 + i)}
                              </div>
                              <span className="text-xs font-bold text-white/40">Group</span>
                            </div>
                            <div className="space-y-2">
                              {group.map(team => (
                                <div key={team.id} className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-[10px] font-bold">
                                    {team.short_name[0]}
                                  </div>
                                  <span className="text-xs font-bold truncate">{team.name}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/5">
                              <p className="text-[10px] text-white/30">{group.length} teams • {group.length * (group.length - 1)} matches</p>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                    <div className="mt-6 p-4 bg-brand-blue/10 rounded-xl border border-brand-blue/20">
                      <p className="text-xs text-white/40 leading-relaxed">
                        <strong className="text-brand-blue">Top 2 teams</strong> from each group will advance to the knockout stage. 
                        Knockout rounds include Quarter Finals, Semi Finals, and Final.
                      </p>
                    </div>
                  </div>
                )}

                {/* League Format Info */}
                {config.type === 'league' && (
                  <div className="glass rounded-[2rem] p-6 border border-brand-green/20">
                    <h4 className="text-lg font-black uppercase mb-6 flex items-center gap-2">
                      <Calendar size={20} className="text-brand-green" />
                      League Format Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-xs text-white/40 mb-2">Format</p>
                        <p className="text-sm font-bold">
                          {config.cupFormat?.includes('home') || config.cupFormat?.includes('double') 
                            ? 'Double Round Robin (Home & Away)' 
                            : 'Single Round Robin'}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-xs text-white/40 mb-2">Points System</p>
                        <p className="text-sm font-bold">Win: 3 • Draw: 1 • Loss: 0</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-xs text-white/40 mb-2">Total Rounds</p>
                        <p className="text-sm font-bold">
                          {config.cupFormat?.includes('home') || config.cupFormat?.includes('double')
                            ? (config.selectedTeams.length - 1) * 2
                            : config.selectedTeams.length - 1}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-xs text-white/40 mb-2">Matches Per Round</p>
                        <p className="text-sm font-bold">{Math.floor(config.selectedTeams.length / 2)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Knockout Format Info */}
                {config.type === 'knockout' && (
                  <div className="glass rounded-[2rem] p-6 border border-purple-500/20">
                    <h4 className="text-lg font-black uppercase mb-6 flex items-center gap-2">
                      <Zap size={20} className="text-purple-500" />
                      Knockout Bracket Preview
                    </h4>
                    <div className="space-y-4">
                      {(() => {
                        const numTeams = config.selectedTeams.length;
                        const nextPower = Math.pow(2, Math.ceil(Math.log2(numTeams)));
                        const byes = nextPower - numTeams;
                        const rounds = Math.log2(nextPower);
                        
                        return (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-white/5 rounded-xl p-4 text-center">
                                <p className="text-2xl font-black text-purple-500">{nextPower}</p>
                                <p className="text-[10px] text-white/40 uppercase mt-1">Bracket Size</p>
                              </div>
                              <div className="bg-white/5 rounded-xl p-4 text-center">
                                <p className="text-2xl font-black text-yellow-500">{rounds}</p>
                                <p className="text-[10px] text-white/40 uppercase mt-1">Rounds</p>
                              </div>
                              <div className="bg-white/5 rounded-xl p-4 text-center">
                                <p className="text-2xl font-black text-brand-green">{byes}</p>
                                <p className="text-[10px] text-white/40 uppercase mt-1">Byes</p>
                              </div>
                              <div className="bg-white/5 rounded-xl p-4 text-center">
                                <p className="text-2xl font-black text-brand-blue">{nextPower - 1}</p>
                                <p className="text-[10px] text-white/40 uppercase mt-1">Total Matches</p>
                              </div>
                            </div>
                            <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                              <p className="text-xs text-white/40 leading-relaxed">
                                {byes > 0 
                                  ? `${byes} team(s) will receive a bye in the first round based on seeding. ` 
                                  : ''}
                                Winners advance automatically through each round until the Final.
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Fixture Preview Section */}
                <div className="glass rounded-[2rem] p-6 border border-white/10">
                  <h4 className="text-lg font-black uppercase mb-6 flex items-center gap-2">
                    <Calendar size={20} className="text-brand-green" />
                    Fixture Preview
                  </h4>
                  <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {(() => {
                      const selectedTeamsList = availableTeams.filter(t => config.selectedTeams.includes(t.id));
                      
                      if (config.type === 'league') {
                        // Show first few matchdays as preview
                        const matchdays = config.cupFormat?.includes('home') || config.cupFormat?.includes('double') 
                          ? (config.selectedTeams.length - 1) * 2
                          : config.selectedTeams.length - 1;
                        
                        return (
                          <div className="space-y-3">
                            <p className="text-xs text-white/40 mb-2">Showing preview of {Math.min(3, matchdays)} of {matchdays} matchdays</p>
                            {Array.from({ length: Math.min(3, matchdays) }, (_, i) => (
                              <div key={i} className="bg-white/5 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 rounded bg-brand-green/20 flex items-center justify-center text-brand-green font-black text-xs">
                                    {i + 1}
                                  </div>
                                  <span className="text-xs font-bold text-white/40">Matchday {i + 1}</span>
                                </div>
                                <div className="space-y-2">
                                  {Array.from({ length: Math.floor(config.selectedTeams.length / 2) }, (_, j) => (
                                    <div key={j} className="flex items-center justify-between text-xs">
                                      <span className="font-bold text-white/60">{selectedTeamsList[j]?.name || 'TBD'}</span>
                                      <span className="text-white/30">vs</span>
                                      <span className="font-bold text-white/60">{selectedTeamsList[config.selectedTeams.length - 1 - j]?.name || 'TBD'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      } else if (config.type === 'cup') {
                        const numGroups = Math.max(2, Math.min(8, Math.ceil(config.selectedTeams.length / 4)));
                        const groups: any[][] = Array.from({ length: numGroups }, () => []);
                        
                        selectedTeamsList.forEach((team, index) => {
                          groups[index % numGroups].push(team);
                        });
                        
                        return (
                          <div className="space-y-4">
                            <p className="text-xs text-white/40 mb-2">Group Stage Preview</p>
                            <div className="grid grid-cols-2 gap-3">
                              {groups.map((group, i) => (
                                <div key={i} className="bg-white/5 rounded-xl p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 rounded bg-brand-blue/20 flex items-center justify-center text-brand-blue font-black text-xs">
                                      {String.fromCharCode(65 + i)}
                                    </div>
                                    <span className="text-xs font-bold">Group {String.fromCharCode(65 + i)}</span>
                                  </div>
                                  <div className="space-y-1">
                                    {group.slice(0, 3).map((team, j) => (
                                      <div key={j} className="text-[10px] font-bold text-white/60 truncate">
                                        • {team.name}
                                      </div>
                                    ))}
                                    {group.length > 3 && (
                                      <div className="text-[10px] text-white/30">+{group.length - 3} more</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="p-3 bg-brand-blue/10 rounded-xl border border-brand-blue/20">
                              <p className="text-[10px] text-white/40">
                                Top 2 teams from each group advance to knockout stage (Quarter Finals → Semi Finals → Final)
                              </p>
                            </div>
                          </div>
                        );
                      } else {
                        // Knockout preview
                        const numTeams = config.selectedTeams.length;
                        const rounds = Math.ceil(Math.log2(numTeams));
                        
                        return (
                          <div className="space-y-3">
                            <p className="text-xs text-white/40 mb-2">Bracket Preview</p>
                            {Array.from({ length: rounds }, (_, i) => {
                              const roundName = i === rounds - 1 ? 'Final' : i === rounds - 2 ? 'Semi Finals' : `Round of ${Math.pow(2, rounds - i)}`;
                              const matches = Math.pow(2, rounds - 1 - i);
                              
                              return (
                                <div key={i} className="bg-white/5 rounded-xl p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold">{roundName}</span>
                                    <span className="text-[10px] text-white/30">{matches} match{matches > 1 ? 'es' : ''}</span>
                                  </div>
                                  <div className="space-y-1">
                                    {Array.from({ length: Math.min(2, matches) }, (_, j) => (
                                      <div key={j} className="text-[10px] text-white/40 flex items-center gap-2">
                                        <span>TBD</span>
                                        <span className="text-white/20">vs</span>
                                        <span>TBD</span>
                                      </div>
                                    ))}
                                    {matches > 2 && (
                                      <div className="text-[10px] text-white/30">+{matches - 2} more matches</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                    })()}
                  </div>
                  <p className="text-[10px] text-white/30 mt-4 text-center">
                    ⚠️ This is a preview. Full fixtures will be generated and saved to database.
                  </p>
                </div>

                {/* Generate Button */}
                <button 
                  onClick={handleGenerate}
                  disabled={loading || config.selectedTeams.length < 2}
                  className="w-full px-16 py-6 rounded-[2rem] gradient-green text-black font-black uppercase tracking-[0.2em] italic text-xl shadow-2xl shadow-brand-green/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <div className="w-8 h-8 relative">
                      <img src="/kicklive-icon.png" alt="Loading" className="w-full h-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      <Zap size={24} /> GENERATE FIXTURES
                    </>
                  )}
                </button>

                {config.selectedTeams.length < 2 && (
                  <p className="text-center text-red-500 text-sm font-bold">
                    ⚠️ Please select at least 2 teams to generate fixtures
                  </p>
                )}
              </div>
            )}
          </main>
        </div>

        {/* Footer Navigation - FIXED */}
        <div className="px-8 py-6 bg-[#0B0E13]/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-between sticky bottom-0">
          <button 
            onClick={() => {
              if (currentStep === 'basic') onClose();
              else if (currentStep === 'teams') setCurrentStep('basic');
              else if (currentStep === 'format') setCurrentStep('teams');
              else if (currentStep === 'rules') setCurrentStep('format');
              else if (currentStep === 'generate') setCurrentStep('rules');
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-sm transition-all border border-white/20"
          >
            <ArrowLeft size={18} /> Back
          </button>

          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            {[1, 2, 3, 4, 5].map(step => (
              <div 
                key={step} 
                className={`w-2 h-2 rounded-full ${
                  (currentStep === 'basic' && step === 1) ||
                  (currentStep === 'teams' && step === 2) ||
                  (currentStep === 'format' && step === 3) ||
                  (currentStep === 'rules' && step === 4) ||
                  (currentStep === 'generate' && step === 5)
                    ? 'bg-[#39FF14]' : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-sm text-white/60 hover:text-white transition-colors">Cancel</button>
            {currentStep !== 'generate' ? (
              <button 
                onClick={() => {
                  if (currentStep === 'basic') setCurrentStep('teams');
                  else if (currentStep === 'teams') setCurrentStep('format');
                  else if (currentStep === 'format') setCurrentStep('rules');
                  else if (currentStep === 'rules') setCurrentStep('generate');
                }}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#39FF14] text-black font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-[#39FF14]/30"
              >
                Next <ArrowRight size={18} />
              </button>
            ) : (
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#39FF14] text-black font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-[#39FF14]/30 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Zap size={18} /> Generate
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Team Adder Modal */}
        <TeamAdder 
          isOpen={isTeamAdderOpen} 
          onClose={() => {
            setIsTeamAdderOpen(false);
            // Reload teams after adding
            fetchTeams();
          }} 
        />

      </div>
    </div>
  );
}
