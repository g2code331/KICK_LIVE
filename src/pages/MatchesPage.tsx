import { useState, useEffect } from "react";
import { getMatches } from "../lib/db";

export default function MatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMatches() {
      try {
        const data = await getMatches();
        setMatches(data);
      } catch (err) {
        console.error('Matches load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMatches();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="text-6xl animate-spin"></div>
    </div>
  );

  const filteredMatches = matches.filter(m => {
    if (filter === 'live') return m.status === 'live';
    if (filter === 'scheduled') return m.status === 'scheduled';
    if (filter === 'finished') return m.status === 'finished';
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold italic mb-2">Fixtures & Results</h1>
          <p className="text-white/40">All matches from KickLive</p>
        </div>
        <div className="flex gap-2">
          {['all', 'live', 'scheduled', 'finished'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl font-bold text-sm uppercase ${
                filter === f ? 'bg-[#39FF14] text-black' : 'bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredMatches.map((match) => (
          <div key={match.id} className="glass rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 flex-1">
                <div className="text-center w-32">
                  <p className="text-xs text-white/40 uppercase mb-1">{match.homeTeam?.short_name || 'HOME'}</p>
                  <p className="font-bold">{match.homeTeam?.name || 'Home Team'}</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{match.home_score ?? '-'} - {match.away_score ?? '-'}</p>
                  <p className={`text-xs font-bold mt-1 ${
                    match.status === 'live' ? 'text-[#39FF14]' : 
                    match.status === 'finished' ? 'text-white/40' : 'text-[#2196F3]'
                  }`}>
                    {match.status === 'live' ? `${match.minute || 0}' LIVE` : 
                     match.status === 'finished' ? 'FT' : 
                     new Date(match.start_time).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-center w-32">
                  <p className="text-xs text-white/40 uppercase mb-1">{match.awayTeam?.short_name || 'AWAY'}</p>
                  <p className="font-bold">{match.awayTeam?.name || 'Away Team'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/40 uppercase">{match.competition || 'Competition'}</p>
                <p className="text-sm text-white/60">{match.venue || 'TBD'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMatches.length === 0 && (
        <div className="glass rounded-2xl p-20 text-center text-white/40">
          <p className="text-xl">No matches found</p>
        </div>
      )}
    </div>
  );
}
