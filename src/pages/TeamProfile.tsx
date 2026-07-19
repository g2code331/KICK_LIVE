import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Trophy, Calendar, MapPin, Shirt, TrendingUp, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function TeamProfile() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teamId) {
      loadTeamData();
    }
  }, [teamId]);

  async function loadTeamData() {
    try {
      // Fetch team details
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
      setTeam(teamData);

      // Fetch players
      const { data: playersData } = await supabase
        .from('players')
        .select('id, name, number, position, goals, assists, nationality, photo_url')
        .eq('team_id', teamId)
        .order('number');
      setPlayers(playersData || []);

      // Fetch matches involving this team
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          id,
          home_score,
          away_score,
          status,
          minute,
          start_time,
          homeTeam:teams!home_team_id(id, name, short_name),
          awayTeam:teams!away_team_id(id, name, short_name),
          competitions(id, name)
        `)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order('start_time', { ascending: false })
        .limit(20);
      setMatches(matchesData || []);

      // Fetch competitions this team is in
      const { data: compsData } = await supabase
        .from('competitions')
        .select(`
          id,
          name,
          type,
          season,
          matches!inner(id, home_team_id, away_team_id)
        `)
        .filter('matches.home_team_id', 'eq', teamId)
        .or(`matches.away_team_id.eq.${teamId}`);
      
      setCompetitions(compsData || []);

      // Calculate standings for each competition
      if (compsData && compsData.length > 0) {
        const standingsData = await Promise.all(
          compsData.map(async (comp: any) => {
            const { data: compMatches } = await supabase
              .from('matches')
              .select('home_team_id, away_team_id, home_score, away_score, status')
              .eq('competition_id', comp.id)
              .in('status', ['completed', 'full_time', 'finished']);

            // Calculate standings
            const teamStats: any = {};
            compMatches?.forEach((match: any) => {
              [match.home_team_id, match.away_team_id].forEach(teamId => {
                if (!teamStats[teamId]) {
                  teamStats[teamId] = { teamId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
                }
                const stats = teamStats[teamId];
                stats.played++;
                if (match.status === 'completed' || match.status === 'full_time' || match.status === 'finished') {
                  const isHome = match.home_team_id === teamId;
                  const teamScore = isHome ? match.home_score : match.away_score;
                  const opponentScore = isHome ? match.away_score : match.home_score;
                  stats.gf += teamScore || 0;
                  stats.ga += opponentScore || 0;
                  stats.gd = stats.gf - stats.ga;
                  if (teamScore > opponentScore) {
                    stats.won++;
                    stats.points += 3;
                  } else if (teamScore === opponentScore) {
                    stats.drawn++;
                    stats.points += 1;
                  } else {
                    stats.lost++;
                  }
                }
              });
            });

            const standingsArray = Object.values(teamStats)
              .sort((a: any, b: any) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.gd !== a.gd) return b.gd - a.gd;
                return b.gf - a.gf;
              });

            return { competition: comp, standings: standingsArray };
          })
        );
        setStandings(standingsData);
      }
    } catch (err) {
      console.error('Error loading team data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-green font-bold uppercase">Loading Team Profile...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 text-xl">Team not found</p>
          <button onClick={() => navigate('/teams')} className="mt-4 text-brand-green hover:underline">Back to Teams</button>
        </div>
      </div>
    );
  }

  const upcomingMatches = matches.filter(m => 
    m.status === 'scheduled' || m.status === 'waiting'
  );
  const liveMatches = matches.filter(m => 
    m.status === 'first_half' || m.status === 'second_half' || m.status === 'extra_time' || m.status === 'live'
  );
  const finishedMatches = matches.filter(m => 
    m.status === 'completed' || m.status === 'full_time' || m.status === 'finished'
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="relative h-64 overflow-hidden">
        <div className="absolute inset-0" style={{
          background: `linear-gradient(135deg, ${team.primary_color}44, ${team.secondary_color}22)`
        }}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B0E13]"></div>
        <button 
          onClick={() => navigate('/teams')}
          className="absolute top-6 left-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-10">
        {/* Team Info Card */}
        <div className="glass rounded-[2rem] p-8 border border-white/10 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 rounded-full flex items-center justify-center text-6xl font-black italic shadow-2xl" style={{
              background: `linear-gradient(135deg, ${team.primary_color}, ${team.secondary_color})`,
              color: team.secondary_color === '#000000' ? '#fff' : '#000'
            }}>
              {team.short_name[0]}
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-2">{team.name}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-white/40">
                {team.city && (
                  <span className="flex items-center gap-2">
                    <MapPin size={16} /> {team.city}
                  </span>
                )}
                {team.coach && (
                  <span className="flex items-center gap-2">
                    <Users size={16} /> Coach: {team.coach}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-light p-4 rounded-2xl text-center min-w-[120px]">
                <p className="text-3xl font-black text-brand-green">{players.length}</p>
                <p className="text-xs text-white/40 uppercase">Players</p>
              </div>
              <div className="glass-light p-4 rounded-2xl text-center min-w-[120px]">
                <p className="text-3xl font-black text-brand-blue">{finishedMatches.length}</p>
                <p className="text-xs text-white/40 uppercase">Matches</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Squad */}
          <div className="glass rounded-[2rem] p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <Users size={24} className="text-brand-green" />
              <h2 className="text-2xl font-black uppercase">Squad</h2>
            </div>
            {players.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {players.map(player => (
                  <div key={player.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                    onClick={() => navigate(`/player/${player.id}`)}>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-green/20 to-brand-blue/20 flex items-center justify-center font-black text-lg">
                      {player.number}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{player.name}</p>
                      <p className="text-xs text-white/40">{player.position} • {player.nationality || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-brand-green">{player.goals || 0}</p>
                      <p className="text-xs text-white/40">Goals</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-white/40">
                <Users size={48} className="mx-auto mb-4 opacity-20" />
                <p>No players in squad yet</p>
              </div>
            )}
          </div>

          {/* Matches */}
          <div className="glass rounded-[2rem] p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <Calendar size={24} className="text-brand-blue" />
              <h2 className="text-2xl font-black uppercase">Matches</h2>
            </div>
            
            <div className="space-y-6">
              {/* Live */}
              {liveMatches.length > 0 && (
                <div>
                  <h3 className="text-sm font-black uppercase text-brand-green mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Live Now
                  </h3>
                  <div className="space-y-2">
                    {liveMatches.map(match => (
                      <div key={match.id} className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                        onClick={() => navigate(`/match/${match.id}`)}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-bold">{match.homeTeam?.name}</p>
                            <p className="text-xs text-white/40">{match.awayTeam?.name}</p>
                          </div>
                          <div className="text-center px-4">
                            <p className="text-2xl font-black text-brand-green">{match.home_score} - {match.away_score}</p>
                            <p className="text-xs text-brand-green">{match.minute}'</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming */}
              {upcomingMatches.length > 0 && (
                <div>
                  <h3 className="text-sm font-black uppercase text-brand-blue mb-3">Upcoming</h3>
                  <div className="space-y-2">
                    {upcomingMatches.slice(0, 5).map(match => (
                      <div key={match.id} className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                        onClick={() => navigate(`/match/${match.id}`)}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-bold">{match.homeTeam?.name}</p>
                            <p className="text-xs text-white/40">vs {match.awayTeam?.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-white/40">
                              {new Date(match.start_time).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-brand-blue">
                              {new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Results */}
              {finishedMatches.length > 0 && (
                <div>
                  <h3 className="text-sm font-black uppercase text-white/40 mb-3">Recent Results</h3>
                  <div className="space-y-2">
                    {finishedMatches.slice(0, 5).map(match => (
                      <div key={match.id} className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                        onClick={() => navigate(`/match/${match.id}`)}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-bold">{match.homeTeam?.name}</p>
                            <p className="text-xs text-white/40">{match.awayTeam?.name}</p>
                          </div>
                          <div className="text-center px-4">
                            <p className="text-xl font-black">{match.home_score} - {match.away_score}</p>
                            <p className="text-xs text-white/40">FT</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Competitions & Standings */}
        {standings.length > 0 && (
          <div className="glass rounded-[2rem] p-6 border border-white/10 mt-8">
            <div className="flex items-center gap-3 mb-6">
              <Trophy size={24} className="text-yellow-500" />
              <h2 className="text-2xl font-black uppercase">Competitions & Standings</h2>
            </div>
            <div className="space-y-8">
              {standings.map(({ competition, standings: compStandings }: any, idx) => (
                <div key={competition.id} className="space-y-4">
                  <h3 className="text-lg font-black uppercase text-brand-green">{competition.name} {competition.season}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] font-black uppercase tracking-widest text-white/30 border-b border-white/5">
                          <th className="px-4 py-3 text-left">Pos</th>
                          <th className="px-4 py-3 text-left">Team</th>
                          <th className="px-3 py-3 text-center">P</th>
                          <th className="px-3 py-3 text-center">W</th>
                          <th className="px-3 py-3 text-center">D</th>
                          <th className="px-3 py-3 text-center">L</th>
                          <th className="px-3 py-3 text-center">GD</th>
                          <th className="px-4 py-3 text-center">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compStandings.slice(0, 10).map((row: any, i: number) => (
                          <tr key={row.teamId} className={`border-b border-white/5 ${row.teamId === parseInt(teamId || '0') ? 'bg-brand-green/10' : ''}`}>
                            <td className="px-4 py-3 text-center font-bold">{i + 1}</td>
                            <td className="px-4 py-3 font-bold">{row.name}</td>
                            <td className="px-3 py-3 text-center">{row.played}</td>
                            <td className="px-3 py-3 text-center">{row.won}</td>
                            <td className="px-3 py-3 text-center">{row.drawn}</td>
                            <td className="px-3 py-3 text-center">{row.lost}</td>
                            <td className="px-3 py-3 text-center">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                            <td className="px-4 py-3 text-center font-black text-brand-green">{row.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
