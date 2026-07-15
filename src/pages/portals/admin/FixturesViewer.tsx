import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Edit2, Plus, Filter, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface FixturesViewerProps {
  competition: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function FixturesViewer({ competition, isOpen, onClose }: FixturesViewerProps) {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'live' | 'finished'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatchday, setSelectedMatchday] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && competition) {
      console.log('FixturesViewer opened for competition:', competition.id);
      loadFixtures();
      loadTeams();
    }
  }, [isOpen, competition]);

  async function loadFixtures() {
    setLoading(true);
    try {
      console.log('Loading fixtures for competition:', competition.id);
      
      // First get matches with limit to prevent timeout
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('competition_id', competition.id)
        .order('start_time', { ascending: true })
        .limit(200); // Limit to prevent timeout
      
      if (matchesError) {
        console.error('Matches query error:', matchesError);
        throw matchesError;
      }
      
      if (!matchesData || matchesData.length === 0) {
        setFixtures([]);
        return;
      }
      
      // Get unique team IDs from matches
      const teamIds = Array.from(new Set([
        ...matchesData.map(m => m.home_team_id),
        ...matchesData.map(m => m.away_team_id)
      ]));
      
      // Then get only the teams we need
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, short_name, logo_url')
        .in('id', teamIds);
      
      const teamsMap = new Map(teamsData?.map(t => [t.id, t]));
      
      // Combine data
      const fixtures = matchesData.map(match => ({
        ...match,
        homeTeam: teamsMap.get(match.home_team_id),
        awayTeam: teamsMap.get(match.away_team_id)
      }));
      
      console.log('Loaded fixtures:', fixtures.length);
      setFixtures(fixtures);
    } catch (err: any) {
      console.error('Error loading fixtures:', err);
      // Don't alert on every error, just log
    } finally {
      setLoading(false);
    }
  }

  async function loadTeams() {
    try {
      const { data } = await supabase
        .from('teams')
        .select('id, name, short_name')
        .limit(50); // Limit teams for performance
      setTeams(data || []);
    } catch (err) {
      console.error('Error loading teams:', err);
    }
  }

  const filteredFixtures = fixtures.filter(match => {
    // Filter by status
    let matchesFilter = filter === 'all' ? true :
      filter === 'upcoming' ? match.status === 'scheduled' :
      filter === 'live' ? match.status === 'live' :
      filter === 'finished' ? match.status === 'finished' :
      true;
    
    // UPCOMING: Show only the NEXT match (earliest scheduled)
    if (filter === 'upcoming' && matchesFilter) {
      const upcomingMatches = fixtures.filter(m => m.status === 'scheduled');
      if (upcomingMatches.length > 0) {
        const nextMatch = upcomingMatches.sort((a, b) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )[0];
        matchesFilter = match.id === nextMatch.id;
      }
    }
    
    // LIVE: Show only currently live matches
    if (filter === 'live' && matchesFilter) {
      // Just filter by status === 'live'
      matchesFilter = match.status === 'live';
    }
    
    // FINISHED: Show all finished matches
    if (filter === 'finished') {
      matchesFilter = match.status === 'finished';
    }
    
    // Filter by search term (check both team names and short names)
    const matchesSearch = searchTerm === '' ? true :
      match.homeTeam?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.awayTeam?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.homeTeam?.short_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.awayTeam?.short_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by matchday if selected
    const matchesMatchday = selectedMatchday === null ? true :
      (match.matchday || 1) === selectedMatchday;
    
    return matchesFilter && matchesSearch && matchesMatchday;
  });

  const matchdays = Array.from(new Set(fixtures.map(f => f.matchday || 1))).sort((a, b) => a - b);

  const reshuffleFixtures = async () => {
    if (fixtures.length === 0) {
      alert('No fixtures to reshuffle! Generate fixtures first.');
      return;
    }
    
    if (!confirm('Reshuffle fixtures? This will randomize all dates and times while keeping the same matchups.')) return;
    
    setLoading(true);
    try {
      console.log('Reshuffling fixtures for competition:', competition.id);
      
      // Update each fixture with new random dates/times
      const updatedFixtures = fixtures.map(match => {
        const randomDays = Math.floor(Math.random() * 60); // Random day within 60 days
        const randomHour = [15, 17, 19, 20][Math.floor(Math.random() * 4)]; // Random kickoff time
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + randomDays);
        newDate.setHours(randomHour, 0, 0, 0);
        
        return {
          id: match.id,
          start_time: newDate.toISOString(),
          venue: match.venue || 'TBD'
        };
      });
      
      // Update in batches
      const batchSize = 50;
      for (let i = 0; i < updatedFixtures.length; i += batchSize) {
        const batch = updatedFixtures.slice(i, i + batchSize);
        const { error } = await supabase
          .from('matches')
          .upsert(batch);
        
        if (error) throw error;
      }
      
      alert('✅ Fixtures reshuffled successfully!');
      await loadFixtures(); // Reload to show new dates
    } catch (err: any) {
      console.error('Reshuffle error:', err);
      alert('Error reshuffling: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const generateFixtures = async () => {
    if (teams.length < 2) {
      alert('You need at least 2 teams to generate fixtures!');
      return;
    }
    
    if (!confirm('Generate fixtures for this competition? This will delete existing fixtures and create new ones.')) return;
    
    setLoading(true);
    try {
      console.log('Generating fixtures for competition:', competition.id);
      
      // First, delete existing fixtures for this competition
      console.log('Deleting existing fixtures...');
      const { error: deleteError } = await supabase
        .from('matches')
        .delete()
        .eq('competition_id', competition.id);
      
      if (deleteError) throw deleteError;
      
      // Simple round-robin fixture generation
      const teamIds = teams.map(t => t.id);
      const numTeams = teamIds.length;
      const matchdays_count = numTeams - 1;
      const matches_per_matchday = Math.floor(numTeams / 2);
      
      console.log('Will generate:', matchdays_count, 'matchdays with', matches_per_matchday, 'matches each');
      
      const matchesToInsert = [];
      
      for (let matchday = 1; matchday <= matchdays_count; matchday++) {
        for (let i = 0; i < matches_per_matchday; i++) {
          const homeTeam = teamIds[i];
          const awayTeam = teamIds[numTeams - 1 - i];
          
          const matchDate = new Date();
          matchDate.setDate(matchDate.getDate() + (matchday * 7)); // One week apart
          matchDate.setHours(15, 0, 0, 0);
          
          matchesToInsert.push({
            competition_id: competition.id,
            home_team_id: homeTeam,
            away_team_id: awayTeam,
            start_time: matchDate.toISOString(),
            status: 'scheduled',
            matchday: matchday,
            venue: 'TBD'
          });
        }
        
        // Rotate teams for next matchday (Berger tables algorithm)
        const lastTeam = teamIds.pop();
        if (lastTeam) {
          teamIds.splice(1, 0, lastTeam);
        }
      }
      
      console.log('Inserting', matchesToInsert.length, 'matches...');
      
      const { data, error } = await supabase
        .from('matches')
        .insert(matchesToInsert)
        .select();
      
      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      
      console.log('Successfully inserted:', data?.length, 'matches');
      
      // Log activity
      try {
        await supabase.rpc('log_activity', {
          p_action: 'Fixtures Generated',
          p_entity_type: 'competition',
          p_entity_id: competition.id,
          p_entity_name: competition.name,
          p_destination: '/admin/competitions',
          p_details: { matches: matchesToInsert.length }
        });
      } catch (logErr) {
        console.warn('Activity logging failed:', logErr);
      }
      
      alert(`Successfully generated ${matchesToInsert.length} fixtures!`);
      
      // Force reload
      await loadFixtures();
      
    } catch (err: any) {
      console.error('Generation error:', err);
      alert('Error generating fixtures: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0B0E13]/95 backdrop-blur-xl" onClick={onClose}></div>
      
      <div className="relative w-full max-w-7xl glass rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-in zoom-in duration-500">
        
        {/* Header */}
        <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Calendar className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">Fixtures & Results</h2>
              <p className="text-xs text-white/40 uppercase tracking-widest">{competition.name} • {competition.season}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-10 py-6 border-b border-white/10 bg-white/[0.02] flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'live', label: 'Live' },
                { id: 'finished', label: 'Finished' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id as any)}
                  className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
                    filter === tab.id
                      ? 'bg-blue-500 text-white'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Matchday Filter */}
            {matchdays.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-white/40" />
                <select
                  value={selectedMatchday || ''}
                  onChange={(e) => setSelectedMatchday(e.target.value ? Number(e.target.value) : null)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">All Matchdays</option>
                  {matchdays.map(md => (
                    <option key={md} value={md}>Matchday {md}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search teams..."
                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 w-48"
              />
            </div>

            {/* Reshuffle Fixtures Button */}
            {fixtures.length > 0 && (
              <button
                onClick={reshuffleFixtures}
                disabled={loading || teams.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reshuffle Fixtures
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10">
          {loading ? (
            <div className="space-y-8">
              {/* Loading Skeletons */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl"></div>
                    <div className="h-4 bg-white/5 rounded w-32"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="glass rounded-2xl p-6 border border-white/10">
                        <div className="flex justify-between mb-4">
                          <div className="h-3 bg-white/5 rounded w-20"></div>
                          <div className="h-3 bg-white/5 rounded w-16"></div>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                          <div className="h-4 bg-white/5 rounded w-24"></div>
                          <div className="h-8 bg-white/5 rounded w-12"></div>
                          <div className="h-4 bg-white/5 rounded w-24"></div>
                        </div>
                        <div className="flex justify-between pt-4 border-t border-white/5">
                          <div className="h-3 bg-white/5 rounded w-32"></div>
                          <div className="h-3 bg-white/5 rounded w-16"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFixtures.length > 0 ? (
            <div className="space-y-8">
              {/* Group by Matchday */}
              {matchdays.map(matchday => {
                const matchdayFixtures = filteredFixtures.filter(f => (f.matchday || 1) === matchday);
                if (matchdayFixtures.length === 0) return null;
                
                return (
                  <div key={matchday} className="space-y-4">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                        <span className="text-xl font-black text-white">{matchday}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-black italic uppercase">Matchday {matchday}</h3>
                        <p className="text-xs text-white/40">{matchdayFixtures.length} matches</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {matchdayFixtures.map(match => (
                        <div key={match.id} className="glass rounded-2xl p-6 border border-white/10 hover:border-blue-500/30 transition-all group">
                          {/* Match Header */}
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] text-white/40 uppercase tracking-widest">
                              {new Date(match.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            {match.status === 'live' && (
                              <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded animate-pulse">
                                LIVE {match.minute}'
                              </span>
                            )}
                            {match.status === 'finished' && (
                              <span className="text-[10px] font-black text-white/40 bg-white/5 px-2 py-1 rounded">
                                FT
                              </span>
                            )}
                            {match.status === 'scheduled' && (
                              <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded">
                                {new Date(match.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>

                          {/* Teams & Score */}
                          <div className="flex items-center justify-between gap-4 mb-4">
                            <div className="flex-1 text-right">
                              <div className="flex items-center justify-end gap-3 mb-2">
                                <span className="text-sm font-bold">{match.homeTeam?.name || 'TBD'}</span>
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                  {match.homeTeam?.logo_url ? (
                                    <img src={match.homeTeam.logo_url} className="w-full h-full object-cover rounded-xl" />
                                  ) : (
                                    <span className="text-lg font-black">{match.homeTeam?.short_name?.[0] || 'H'}</span>
                                  )}
                                </div>
                              </div>
                              {match.status !== 'scheduled' && (
                                <p className="text-3xl font-black text-blue-500">{match.home_score ?? '-'}</p>
                              )}
                            </div>

                            <div className="text-center">
                              <span className="text-lg font-black text-white/20">VS</span>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                  {match.awayTeam?.logo_url ? (
                                    <img src={match.awayTeam.logo_url} className="w-full h-full object-cover rounded-xl" />
                                  ) : (
                                    <span className="text-lg font-black">{match.awayTeam?.short_name?.[0] || 'A'}</span>
                                  )}
                                </div>
                                <span className="text-sm font-bold">{match.awayTeam?.name || 'TBD'}</span>
                              </div>
                              {match.status !== 'scheduled' && (
                                <p className="text-3xl font-black text-purple-500">{match.away_score ?? '-'}</p>
                              )}
                            </div>
                          </div>

                          {/* Match Info */}
                          <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2 text-[10px] text-white/40">
                              <MapPin size={12} />
                              <span>{match.venue || 'TBD'}</span>
                            </div>
                            <button className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-500 hover:text-blue-400 transition-colors">
                              <Edit2 size={12} /> Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <Calendar size={80} className="mx-auto text-white/10 mb-6" />
                {filter === 'upcoming' ? (
                  <>
                    <h3 className="text-2xl font-black italic uppercase mb-2">No Upcoming Matches</h3>
                    <p className="text-white/40 mb-6">All matches have been played or there are no scheduled fixtures.</p>
                  </>
                ) : filter === 'live' ? (
                  <>
                    <h3 className="text-2xl font-black italic uppercase mb-2">No Live Matches</h3>
                    <p className="text-white/40 mb-6">No matches are currently being played. Check back later!</p>
                    <div className="p-4 bg-brand-green/10 rounded-xl border border-brand-green/20">
                      <p className="text-sm text-brand-green font-bold">💡 Tip: Go to Match Control to start a match live</p>
                    </div>
                  </>
                ) : filter === 'finished' ? (
                  <>
                    <h3 className="text-2xl font-black italic uppercase mb-2">No Finished Matches</h3>
                    <p className="text-white/40 mb-6">No matches have been completed yet for this competition.</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-black italic uppercase mb-2">No Fixtures Yet</h3>
                    <p className="text-white/40 mb-6">Generate fixtures for this competition based on the selected format and teams.</p>
                    {teams.length > 0 ? (
                      <button
                        onClick={generateFixtures}
                        className="flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-500 text-white font-black uppercase tracking-widest text-sm hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/30"
                      >
                        <Plus size={20} /> Generate Fixtures
                      </button>
                    ) : (
                      <p className="text-orange-500 text-sm font-bold">Add teams to this competition first</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
