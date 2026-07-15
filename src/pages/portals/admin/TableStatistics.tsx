import { useState, useEffect } from 'react';
import { Trophy, Target, Trash2, ChevronRight, ChevronDown, Calendar, Users, Award } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function TableStatistics() {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'groups' | 'knockout' | 'league' | 'fixtures' | 'stats'>('groups');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCompetitions();
  }, []);

  useEffect(() => {
    if (selectedCompetition) {
      loadCompetitionData();
    }
  }, [selectedCompetition]);

  async function loadCompetitions() {
    try {
      const { data } = await supabase
        .from('competitions')
        .select('*')
        .order('created_at', { ascending: false });
      setCompetitions(data || []);
      if (data && data.length > 0) {
        setSelectedCompetition(data[0]);
      }
    } catch (err) {
      console.error('Error loading competitions:', err);
    }
  }

  async function loadCompetitionData() {
    try {
      const [matchesRes, teamsRes] = await Promise.all([
        supabase.from('matches').select('*').eq('competition_id', selectedCompetition.id).order('start_time'),
        supabase.from('teams').select('*')
      ]);
      
      setMatches(matchesRes.data || []);
      setTeams(teamsRes.data || []);
    } catch (err) {
      console.error('Error loading competition data:', err);
    }
  }

  const handleDeleteCompetition = async (compId: number, compName: string) => {
    if (!confirm(`Delete competition "${compName}"? This cannot be undone!`)) return;
    
    try {
      await supabase.from('matches').delete().eq('competition_id', compId);
      const { error } = await supabase.from('competitions').delete().eq('id', compId);
      
      if (error) throw error;
      
      alert('Competition deleted!');
      loadCompetitions();
      setSelectedCompetition(null);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const toggleRound = (roundName: string) => {
    setExpandedRounds(prev => ({ ...prev, [roundName]: !prev[roundName] }));
  };

  // Calculate group standings
  const calculateGroupStandings = () => {
    const groups = matches.reduce((acc, match) => {
      if (match.group) {
        if (!acc[match.group]) acc[match.group] = [];
        acc[match.group].push(match);
      }
      return acc;
    }, {} as Record<string, any[]>);

    const standings: Record<string, any[]> = {};

    Object.entries(groups).forEach(([groupName, groupMatches]) => {
      const teamStats = new Map<number, any>();

      groupMatches.forEach(match => {
        if (!teamStats.has(match.home_team_id)) {
          teamStats.set(match.home_team_id, {
            teamId: match.home_team_id,
            played: 0, won: 0, drawn: 0, lost: 0,
            gf: 0, ga: 0, gd: 0, points: 0, form: []
          });
        }
        if (!teamStats.has(match.away_team_id)) {
          teamStats.set(match.away_team_id, {
            teamId: match.away_team_id,
            played: 0, won: 0, drawn: 0, lost: 0,
            gf: 0, ga: 0, gd: 0, points: 0, form: []
          });
        }

        const home = teamStats.get(match.home_team_id);
        const away = teamStats.get(match.away_team_id);

        if (match.status === 'finished') {
          home.played++; away.played++;
          home.gf += match.home_score || 0;
          home.ga += match.away_score || 0;
          away.gf += match.away_score || 0;
          away.ga += match.home_score || 0;
          home.gd = home.gf - home.ga;
          away.gd = away.gf - away.ga;

          if ((match.home_score || 0) > (match.away_score || 0)) {
            home.won++; home.points += 3; home.form.push('W');
            away.lost++; away.form.push('L');
          } else if ((match.home_score || 0) < (match.away_score || 0)) {
            away.won++; away.points += 3; away.form.push('W');
            home.lost++; home.form.push('L');
          } else {
            home.drawn++; away.drawn++;
            home.points += 1; away.points += 1;
            home.form.push('D'); away.form.push('D');
          }
        }
      });

      standings[groupName] = Array.from(teamStats.values())
        .map(stat => {
          const team = teams.find(t => t.id === stat.teamId);
          return { ...stat, teamName: team?.name || 'Unknown', teamShort: team?.short_name || '?' };
        })
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.gd !== a.gd) return b.gd - a.gd;
          if (b.gf !== a.gf) return b.gf - a.gf;
          return 0;
        });
    });

    return standings;
  };

  const groupStandings = calculateGroupStandings();
  
  // Calculate league standings (not grouped)
  const calculateLeagueStandings = () => {
    const teamStats = new Map<number, any>();
    
    matches.forEach((match: any) => {
      if (!teamStats.has(match.home_team_id)) {
        teamStats.set(match.home_team_id, {
          teamId: match.home_team_id,
          played: 0, won: 0, drawn: 0, lost: 0,
          gf: 0, ga: 0, gd: 0, points: 0, form: []
        });
      }
      if (!teamStats.has(match.away_team_id)) {
        teamStats.set(match.away_team_id, {
          teamId: match.away_team_id,
          played: 0, won: 0, drawn: 0, lost: 0,
          gf: 0, ga: 0, gd: 0, points: 0, form: []
        });
      }

      const home = teamStats.get(match.home_team_id);
      const away = teamStats.get(match.away_team_id);

      if (match.status === 'finished') {
        home.played++; away.played++;
        home.gf += match.home_score || 0;
        home.ga += match.away_score || 0;
        away.gf += match.away_score || 0;
        away.ga += match.home_score || 0;
        home.gd = home.gf - home.ga;
        away.gd = away.gf - away.ga;

        if ((match.home_score || 0) > (match.away_score || 0)) {
          home.won++; home.points += 3; home.form.push('W');
          away.lost++; away.form.push('L');
        } else if ((match.home_score || 0) < (match.away_score || 0)) {
          away.won++; away.points += 3; away.form.push('W');
          home.lost++; home.form.push('L');
        } else {
          home.drawn++; away.drawn++;
          home.points += 1; away.points += 1;
          home.form.push('D'); away.form.push('D');
        }
      }
    });

    return Array.from(teamStats.values())
      .map(stat => {
        const team = teams.find(t => t.id === stat.teamId);
        return { ...stat, teamName: team?.name || 'Unknown', teamShort: team?.short_name || '?' };
      })
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return 0;
      });
  };

  const leagueStandings = calculateLeagueStandings();
  const compFormat = selectedCompetition?.format || selectedCompetition?.type || 'league';
  const standings = compFormat === 'league' ? leagueStandings : Object.values(groupStandings).flat();
  
  const groupMatches: Record<string, any[]> = matches.reduce((acc: any, match: any) => {
    if (match.group) {
      if (!acc[match.group]) acc[match.group] = [];
      acc[match.group].push(match);
    }
    return acc;
  }, {});

  const knockoutMatches = matches.filter(m => m.round && !m.group);
  
  // Organize knockout by round
  const knockoutRounds: Record<string, any[]> = knockoutMatches.reduce((acc: any, match: any) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {});

  // Determine qualified teams for knockout (top 2 from each group)
  const qualifiedTeams = Object.entries(groupStandings).flatMap(([groupName, standings]) => {
    return standings.slice(0, 2).map((stat, index) => ({
      ...stat,
      group: groupName,
      position: index + 1,
      qualified: true
    }));
  });

  return (
    <div className="min-h-screen bg-[#0B0E13] p-4 lg:p-8">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-black italic uppercase tracking-tighter mb-2">
            Table Statistics
          </h1>
          <p className="text-white/40">View competition tables, standings, and brackets</p>
        </div>

        {/* Competition Selector */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Trophy size={24} className="text-brand-green" />
              <h2 className="text-xl font-black uppercase">Competitions</h2>
            </div>
          </div>
          
          {competitions.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={64} className="mx-auto text-white/10 mb-4" />
              <p className="text-white/40">No competitions yet. Create one to view statistics.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {competitions.map(comp => (
                <div key={comp.id} className="relative group">
                  <button
                    onClick={() => {
                      setSelectedCompetition(comp);
                      // Safe tab selection with defaults
                      const format = comp?.format || comp?.type || 'league';
                      setActiveTab(format === 'cup' ? 'groups' : 'league');
                    }}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      selectedCompetition?.id === comp.id
                        ? 'border-brand-green bg-brand-green/10'
                        : 'border-white/5 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black italic uppercase">{comp.name}</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                        comp.status === 'active' ? 'bg-green-500/20 text-green-500' :
                        comp.status === 'completed' ? 'bg-blue-500/20 text-blue-500' :
                        'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {comp.status || 'upcoming'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/40">
                      <span>{comp.season || '2025'}</span>
                      <span className="uppercase">{comp.format || comp.type || 'league'}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteCompetition(comp.id, comp.name)}
                    className="absolute top-2 right-2 p-2 bg-red-500/20 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedCompetition ? (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-8 overflow-x-auto no-scrollbar">
              {(selectedCompetition?.format === 'cup' || selectedCompetition?.type === 'cup') && (
                <>
                  <button
                    onClick={() => setActiveTab('groups')}
                    className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
                      activeTab === 'groups'
                        ? 'bg-brand-green text-black shadow-lg shadow-brand-green/30'
                        : 'bg-white/5 text-white/40 hover:text-white'
                    }`}
                  >
                    <Users size={16} className="inline mr-2" />
                    Group Stage
                  </button>
                  <button
                    onClick={() => setActiveTab('knockout')}
                    className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
                      activeTab === 'knockout'
                        ? 'bg-brand-green text-black shadow-lg shadow-brand-green/30'
                        : 'bg-white/5 text-white/40 hover:text-white'
                    }`}
                  >
                    <Trophy size={16} className="inline mr-2" />
                    Knockout Stage
                  </button>
                </>
              )}
              {(selectedCompetition?.format === 'league' || selectedCompetition?.type === 'league' || !selectedCompetition?.format) && (
                <button
                  onClick={() => setActiveTab('league')}
                  className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeTab === 'league'
                      ? 'bg-brand-green text-black shadow-lg shadow-brand-green/30'
                      : 'bg-white/5 text-white/40 hover:text-white'
                  }`}
                >
                  <Trophy size={16} className="inline mr-2" />
                  League Table
                </button>
              )}
              <button
                onClick={() => setActiveTab('fixtures')}
                className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === 'fixtures'
                    ? 'bg-brand-green text-black shadow-lg shadow-brand-green/30'
                    : 'bg-white/5 text-white/40 hover:text-white'
                }`}
              >
                <Calendar size={16} className="inline mr-2" />
                Fixtures
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === 'stats'
                    ? 'bg-brand-green text-black shadow-lg shadow-brand-green/30'
                    : 'bg-white/5 text-white/40 hover:text-white'
                }`}
              >
                <Award size={16} className="inline mr-2" />
                Statistics
              </button>
            </div>

            {/* Group Stage */}
            {activeTab === 'groups' && compFormat === 'cup' && (
              <div className="space-y-6">
                {Object.entries(groupStandings).map(([groupName, standings]) => (
                  <div key={groupName} className="glass rounded-2xl overflow-hidden border border-white/10">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="w-full px-6 py-4 bg-gradient-to-r from-brand-blue/10 to-transparent flex items-center justify-between hover:bg-brand-blue/20 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-blue/20 flex items-center justify-center text-brand-blue font-black">
                          {groupName}
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-black uppercase">Group {groupName}</h3>
                          <p className="text-xs text-white/40">{standings.length} teams • {groupMatches[groupName]?.length || 0} matches</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase px-3 py-1 rounded bg-brand-green/20 text-brand-green">
                          Top 2 Qualify
                        </span>
                        {expandedGroups[groupName] ? (
                          <ChevronDown size={20} className="text-white/40" />
                        ) : (
                          <ChevronRight size={20} className="text-white/40" />
                        )}
                      </div>
                    </button>

                    {/* Group Table */}
                    {expandedGroups[groupName] !== false && (
                      <div className="border-t border-white/10">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/30">
                                <th className="px-4 py-3 text-left">Pos</th>
                                <th className="px-4 py-3 text-left">Team</th>
                                <th className="px-3 py-3 text-center">P</th>
                                <th className="px-3 py-3 text-center">W</th>
                                <th className="px-3 py-3 text-center">D</th>
                                <th className="px-3 py-3 text-center">L</th>
                                <th className="px-3 py-3 text-center">GF</th>
                                <th className="px-3 py-3 text-center">GA</th>
                                <th className="px-3 py-3 text-center">GD</th>
                                <th className="px-4 py-3 text-center">Pts</th>
                                <th className="px-4 py-3 text-center">Form</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {standings.map((row: any, i) => (
                                <tr key={row.teamId} className={`hover:bg-white/[0.02] transition-colors ${
                                  i < 2 ? 'bg-green-500/5' : i >= standings.length - 2 ? 'bg-red-500/5' : ''
                                }`}>
                                  <td className="px-4 py-3">
                                    <span className={`text-sm font-black italic ${
                                      i < 2 ? 'text-green-500' : i >= standings.length - 2 ? 'text-red-500' : 'text-white/40'
                                    }`}>
                                      {i + 1}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-xs">
                                        {row.teamShort}
                                      </div>
                                      <span className="font-bold text-sm">{row.teamName}</span>
                                      {i < 2 && (
                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-green-500/20 text-green-500">Q</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-center text-sm">{row.played}</td>
                                  <td className="px-3 py-3 text-center text-sm">{row.won}</td>
                                  <td className="px-3 py-3 text-center text-sm">{row.drawn}</td>
                                  <td className="px-3 py-3 text-center text-sm">{row.lost}</td>
                                  <td className="px-3 py-3 text-center text-sm">{row.gf}</td>
                                  <td className="px-3 py-3 text-center text-sm">{row.ga}</td>
                                  <td className="px-3 py-3 text-center text-sm">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="text-base font-black text-brand-green">{row.points}</span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {row.form?.slice(-5).map((result: string, j: number) => (
                                        <div key={j} className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black ${
                                          result === 'W' ? 'bg-green-500 text-black' :
                                          result === 'D' ? 'bg-gray-500 text-white' :
                                          'bg-red-500 text-white'
                                        }`}>
                                          {result}
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Group Matches */}
                        <div className="border-t border-white/10 p-6">
                          <h4 className="text-sm font-black uppercase mb-4 flex items-center gap-2">
                            <Calendar size={16} className="text-brand-blue" />
                            Group {groupName} Matches
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {(groupMatches[groupName] || []).map((match: any) => (
                              <div key={match.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-[10px] text-white/40 uppercase">
                                    {match.status === 'finished' ? 'FT' : match.status === 'live' ? `${match.minute}'` : new Date(match.start_time).toLocaleDateString()}
                                  </span>
                                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                                    match.status === 'finished' ? 'bg-white/10 text-white/40' :
                                    match.status === 'live' ? 'bg-red-500/20 text-red-500 animate-pulse' :
                                    'bg-blue-500/20 text-blue-500'
                                  }`}>
                                    {match.status === 'scheduled' ? 'UPCOMING' : match.status}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="text-left flex-1">
                                    <p className="text-sm font-bold">{teams.find(t => t.id === match.home_team_id)?.short_name || 'HOME'}</p>
                                  </div>
                                  <div className="text-center px-4">
                                    {match.status === 'finished' || match.status === 'live' ? (
                                      <p className="text-xl font-black">
                                        <span className={match.home_score > match.away_score ? 'text-green-500' : ''}>{match.home_score ?? '-'}</span>
                                        <span className="text-white/30 text-sm mx-1">-</span>
                                        <span className={match.away_score > match.home_score ? 'text-green-500' : ''}>{match.away_score ?? '-'}</span>
                                      </p>
                                    ) : (
                                      <p className="text-sm text-white/30">vs</p>
                                    )}
                                  </div>
                                  <div className="text-right flex-1">
                                    <p className="text-sm font-bold">{teams.find(t => t.id === match.away_team_id)?.short_name || 'AWAY'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Knockout Stage */}
            {(activeTab === 'knockout' && (compFormat === 'cup' || compFormat === 'knockout')) && (
              <div className="space-y-6">
                <div className="glass rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <Trophy size={24} className="text-yellow-500" />
                      <div>
                        <h3 className="text-xl font-black uppercase">Knockout Bracket</h3>
                        <p className="text-xs text-white/40">Auto-updates as group matches complete</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-brand-green">{qualifiedTeams.length} Qualified</p>
                      <p className="text-[10px] text-white/40">from group stage</p>
                    </div>
                  </div>

                  {knockoutMatches.length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(knockoutRounds).map(([roundName, roundMatches]) => (
                        <div key={roundName} className="border border-white/10 rounded-xl overflow-hidden">
                          <button
                            onClick={() => toggleRound(roundName)}
                            className="w-full px-6 py-4 bg-gradient-to-r from-yellow-500/10 to-transparent flex items-center justify-between hover:bg-yellow-500/20 transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-black">
                                <Trophy size={20} />
                              </div>
                              <div className="text-left">
                                <h4 className="text-lg font-black uppercase">{roundName}</h4>
                                <p className="text-xs text-white/40">{roundMatches.length} match{roundMatches.length > 1 ? 'es' : ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] font-black uppercase px-3 py-1 rounded bg-white/10 text-white/40">
                                {roundMatches.filter(m => m.status === 'finished').length}/{roundMatches.length} Complete
                              </span>
                              {expandedRounds[roundName] ? (
                                <ChevronDown size={20} className="text-white/40" />
                              ) : (
                                <ChevronRight size={20} className="text-white/40" />
                              )}
                            </div>
                          </button>

                          {expandedRounds[roundName] !== false && (
                            <div className="border-t border-white/10 p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {roundMatches.map((match: any) => {
                                  const homeQualified = qualifiedTeams.find(t => t.teamId === match.home_team_id);
                                  const awayQualified = qualifiedTeams.find(t => t.teamId === match.away_team_id);

                                  return (
                                    <div key={match.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                                      <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] text-white/40 uppercase">
                                          {match.status === 'finished' ? 'FT' : match.status === 'live' ? `${match.minute}'` : 'TBD'}
                                        </span>
                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                                          match.status === 'finished' ? 'bg-white/10 text-white/40' :
                                          match.status === 'live' ? 'bg-red-500/20 text-red-500 animate-pulse' :
                                          'bg-blue-500/20 text-blue-500'
                                        }`}>
                                          {match.status}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <div className="text-left flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-brand-blue/20 text-brand-blue">
                                              {homeQualified ? `${homeQualified.group}${homeQualified.position}` : 'TBD'}
                                            </span>
                                          </div>
                                          <p className={`text-sm font-bold ${match.home_score > match.away_score ? 'text-green-500' : ''}`}>
                                            {homeQualified ? homeQualified.teamName : 'TBD'}
                                          </p>
                                        </div>
                                        <div className="text-center px-4">
                                          {match.status === 'finished' || match.status === 'live' ? (
                                            <p className="text-xl font-black">
                                              <span className={match.home_score > match.away_score ? 'text-green-500' : ''}>{match.home_score ?? '-'}</span>
                                              <span className="text-white/30 text-sm mx-1">-</span>
                                              <span className={match.away_score > match.home_score ? 'text-green-500' : ''}>{match.away_score ?? '-'}</span>
                                            </p>
                                          ) : (
                                            <p className="text-sm text-white/30">vs</p>
                                          )}
                                        </div>
                                        <div className="text-right flex-1">
                                          <div className="flex items-center justify-end gap-2 mb-1">
                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-brand-blue/20 text-brand-blue">
                                              {awayQualified ? `${awayQualified.group}${awayQualified.position}` : 'TBD'}
                                            </span>
                                          </div>
                                          <p className={`text-sm font-bold ${match.away_score > match.home_score ? 'text-green-500' : ''}`}>
                                            {awayQualified ? awayQualified.teamName : 'TBD'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                  <div className="text-center py-12">
                    <Trophy size={64} className="mx-auto text-white/10 mb-4" />
                    <h4 className="text-xl font-black uppercase mb-2">
                      {compFormat === 'knockout' ? 'No Knockout Matches Yet' : 'Knockout Stage Not Started'}
                    </h4>
                    <p className="text-white/40 mb-4">
                      {compFormat === 'knockout' 
                        ? 'Generate fixtures to create the knockout bracket' 
                        : 'Complete group stage matches to unlock knockout bracket'}
                    </p>
                  </div>
                  )}
                </div>
              </div>
            )}

            {/* League Table */}
            {activeTab === 'league' && compFormat === 'league' && standings.length > 0 && (
              <div className="glass rounded-2xl overflow-hidden border border-white/10">
                <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-brand-green/10 to-transparent">
                  <h3 className="text-xl font-black uppercase">League Standings</h3>
                  <p className="text-xs text-white/40">{standings.length} teams competing</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/30">
                        <th className="px-4 py-3 text-left">Pos</th>
                        <th className="px-4 py-3 text-left">Team</th>
                        <th className="px-3 py-3 text-center">P</th>
                        <th className="px-3 py-3 text-center">W</th>
                        <th className="px-3 py-3 text-center">D</th>
                        <th className="px-3 py-3 text-center">L</th>
                        <th className="px-3 py-3 text-center">GF</th>
                        <th className="px-3 py-3 text-center">GA</th>
                        <th className="px-3 py-3 text-center">GD</th>
                        <th className="px-4 py-3 text-center">Pts</th>
                        <th className="px-4 py-3 text-center">Form</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {standings.map((row: any, i) => (
                        <tr key={row.teamId} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <span className={`text-sm font-black italic ${
                              i < 2 ? 'text-green-500' : i >= standings.length - 2 ? 'text-red-500' : 'text-white/40'
                            }`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-xs">
                                {teams.find(t => t.id === row.teamId)?.short_name || row.teamName?.[0] || '?'}
                              </div>
                              <span className="font-bold text-sm">{row.teamName}</span>
                              {i < 2 && (
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-green-500/20 text-green-500">Q</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-sm">{row.played}</td>
                          <td className="px-3 py-3 text-center text-sm">{row.won}</td>
                          <td className="px-3 py-3 text-center text-sm">{row.drawn}</td>
                          <td className="px-3 py-3 text-center text-sm">{row.lost}</td>
                          <td className="px-3 py-3 text-center text-sm">{row.gf}</td>
                          <td className="px-3 py-3 text-center text-sm">{row.ga}</td>
                          <td className="px-3 py-3 text-center text-sm">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-base font-black text-brand-green">{row.points}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {row.form?.slice(-5).map((result: string, j: number) => (
                                <div
                                  key={j}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black ${
                                    result === 'W' ? 'bg-green-500 text-black' :
                                    result === 'D' ? 'bg-gray-500 text-white' :
                                    'bg-red-500 text-white'
                                  }`}
                                >
                                  {result}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-3 border-t border-white/10 bg-white/[0.02] flex items-center gap-4 text-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500"></div>
                    <span className="text-white/40 uppercase">Qualification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500"></div>
                    <span className="text-white/40 uppercase">Relegation</span>
                  </div>
                </div>
              </div>
            )}

            {/* Fixtures Tab */}
            {activeTab === 'fixtures' && (
              <div className="glass rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Calendar size={24} className="text-brand-blue" />
                    <div>
                      <h3 className="text-xl font-black uppercase">All Fixtures</h3>
                      <p className="text-xs text-white/40">{matches.length} matches scheduled</p>
                    </div>
                  </div>
                </div>
                {matches.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matches.map((match: any) => (
                      <div key={match.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] text-white/40 uppercase">
                            {match.round ? match.round : match.group ? `Group ${match.group}` : `Matchday ${match.matchday || 1}`}
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                            match.status === 'finished' ? 'bg-white/10 text-white/40' :
                            match.status === 'live' ? 'bg-red-500/20 text-red-500 animate-pulse' :
                            'bg-blue-500/20 text-blue-500'
                          }`}>
                            {match.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-left flex-1">
                            <p className="text-sm font-bold">{teams.find(t => t.id === match.home_team_id)?.short_name || 'HOME'}</p>
                          </div>
                          <div className="text-center px-4">
                            {match.status === 'finished' || match.status === 'live' ? (
                              <p className="text-xl font-black">
                                <span className={match.home_score > match.away_score ? 'text-green-500' : ''}>{match.home_score ?? '-'}</span>
                                <span className="text-white/30 text-sm mx-1">-</span>
                                <span className={match.away_score > match.home_score ? 'text-green-500' : ''}>{match.away_score ?? '-'}</span>
                              </p>
                            ) : (
                              <p className="text-sm text-white/30">vs</p>
                            )}
                          </div>
                          <div className="text-right flex-1">
                            <p className="text-sm font-bold">{teams.find(t => t.id === match.away_team_id)?.short_name || 'AWAY'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar size={64} className="mx-auto text-white/10 mb-4" />
                    <p className="text-white/40">No fixtures generated yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Statistics */}
            {activeTab === 'stats' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Target size={24} className="text-brand-green" />
                    <h3 className="text-lg font-black uppercase">Competition Stats</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                      <span className="text-sm text-white/40">Total Matches</span>
                      <span className="text-xl font-black">{matches.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                      <span className="text-sm text-white/40">Goals Scored</span>
                      <span className="text-xl font-black text-brand-green">
                        {matches.reduce((acc, m) => acc + (m.home_score || 0) + (m.away_score || 0), 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                      <span className="text-sm text-white/40">Matches Played</span>
                      <span className="text-xl font-black">
                        {matches.filter(m => m.status === 'finished').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                      <span className="text-sm text-white/40">Avg Goals/Match</span>
                      <span className="text-xl font-black text-brand-blue">
                        {(matches.reduce((acc, m) => acc + (m.home_score || 0) + (m.away_score || 0), 0) / 
                          matches.filter(m => m.status === 'finished').length).toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          competitions.length === 0 && (
            <div className="glass rounded-2xl p-20 text-center">
              <Trophy size={64} className="mx-auto text-white/10 mb-6" />
              <h3 className="text-2xl font-black uppercase mb-2">No Competitions Yet</h3>
              <p className="text-white/40">Create a competition to view tables and statistics</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
