import { useState, useEffect } from "react";
import { getMatches, getPlayers, getMedia } from "../lib/db";

export default function HomePage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [m, p, n] = await Promise.all([getMatches(), getPlayers(), getMedia()]);
        setMatches(m);
        setPlayers(p);
        setNews(n);
      } catch (err) {
        console.error('Load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="text-6xl animate-spin"></div>
    </div>
  );

  const liveMatches = (matches || []).filter(m => m?.status === "live");
  const topScorers = [...(players || [])].sort((a, b) => (b?.goals || 0) - (a?.goals || 0)).slice(0, 3);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Live Matches */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-[#39FF14]">🔴 Live Now</h2>
        {liveMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveMatches.map((match) => (
              <div key={match.id} className="glass rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-white/40 uppercase">{match?.competition || 'Competition'}</span>
                  <span className="text-xs text-[#39FF14] font-bold">{match?.minute || 0}'</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="text-2xl font-bold mb-2">{match?.homeTeam?.short_name || 'H'}</div>
                    <p className="text-sm">{match?.homeTeam?.name || 'Home Team'}</p>
                  </div>
                  <div className="text-center px-4">
                    <p className="text-3xl font-bold text-[#39FF14]">{match?.home_score ?? 0} - {match?.away_score ?? 0}</p>
                    <p className="text-xs text-[#39FF14] font-bold mt-1">LIVE</p>
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-2xl font-bold mb-2">{match?.awayTeam?.short_name || 'A'}</div>
                    <p className="text-sm">{match?.awayTeam?.name || 'Away Team'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 text-center text-white/40">
            <p className="text-xl">No live matches right now</p>
          </div>
        )}
      </section>

      {/* Top Scorers */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-[#39FF14]">⚽ Top Scorers</h2>
        <div className="glass rounded-2xl p-6">
          <div className="space-y-4">
            {topScorers.map((player, i) => (
              <div key={player.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5">
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-orange-400'}`}>#{i + 1}</span>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold">
                    {player.name?.[0] || 'P'}
                  </div>
                  <div>
                    <p className="font-bold">{player.name || 'Player'}</p>
                    <p className="text-xs text-white/40">{player.nationality || 'Unknown'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-[#39FF14]">{player.goals || 0}</p>
                  <p className="text-xs text-white/40">Goals</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-[#39FF14]">📰 Latest News</h2>
        {news.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {news.slice(0, 6).map((item) => (
              <div key={item.id} className="glass rounded-2xl p-6 border border-white/10 hover:border-[#39FF14]/30 transition-all cursor-pointer">
                <div className="aspect-video bg-gradient-to-br from-[#39FF14]/20 to-[#2196F3]/20 rounded-xl mb-4 flex items-center justify-center">
                  <span className="text-4xl">📰</span>
                </div>
                <span className="text-xs text-[#39FF14] font-bold uppercase">{item.category || 'News'}</span>
                <h3 className="font-bold mt-2 line-clamp-2">{item.title || 'News Title'}</h3>
                <p className="text-xs text-white/40 mt-2">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-white/40 text-lg mb-4">No news yet</p>
            <p className="text-white/30 text-sm">Check back later for updates</p>
          </div>
        )}
      </section>
    </div>
  );
}
