import { Trophy, Info } from "lucide-react";
import { standings } from "../data/mockData";

export default function StandingsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="space-y-2">
           <span className="bg-brand-blue/20 text-brand-blue px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-brand-blue/30">
             FIFA Style Ranking
           </span>
           <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
             Group <span className="text-brand-blue">Standings</span>
           </h1>
           <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Rx Premier League • Season 2025</p>
        </div>
        
        <div className="flex gap-4">
           <div className="glass-light p-4 rounded-2xl border border-white/5 flex items-center gap-4">
              <div className="w-10 h-10 gradient-green rounded-xl flex items-center justify-center shadow-lg shadow-brand-green/20">
                 <Trophy size={18} className="text-black" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase text-white/20">Championship Prize</p>
                 <p className="text-sm font-black uppercase italic tracking-tighter">Gold Trophy + ₵50,000</p>
              </div>
           </div>
        </div>
      </div>

      <div className="glass rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                <th className="px-8 py-6">Pos</th>
                <th className="px-8 py-6">Team</th>
                <th className="px-4 py-6 text-center">P</th>
                <th className="px-4 py-6 text-center">W</th>
                <th className="px-4 py-6 text-center">D</th>
                <th className="px-4 py-6 text-center">L</th>
                <th className="px-4 py-6 text-center">GF</th>
                <th className="px-4 py-6 text-center">GA</th>
                <th className="px-4 py-6 text-center">GD</th>
                <th className="px-8 py-6 text-center bg-brand-green/10 text-brand-green">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {standings.map((row, i) => (
                <tr key={row.name} className={`hover:bg-white/[0.02] transition-colors group relative ${i < 2 ? "bg-brand-green/5" : i >= standings.length - 2 ? "bg-brand-red/5" : ""}`}>
                  <td className="px-8 py-6 relative">
                    {i < 2 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-green"></div>}
                    {i >= standings.length - 2 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red"></div>}
                    <span className={`text-lg font-black italic ${i < 2 ? "text-brand-green" : i >= standings.length - 2 ? "text-brand-red" : "text-white/20"}`}>
                      {i + 1 < 10 ? `0${i + 1}` : i + 1}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center font-black text-xs border border-white/10 group-hover:scale-110 transition-transform">
                        {row.name[0]}
                      </div>
                      <span className="font-bold text-sm">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-6 text-center text-sm text-white/60 font-bold">{row.played}</td>
                  <td className="px-4 py-6 text-center text-sm text-white/60 font-bold">{row.won}</td>
                  <td className="px-4 py-6 text-center text-sm text-white/60 font-bold">{row.drawn}</td>
                  <td className="px-4 py-6 text-center text-sm text-white/60 font-bold">{row.lost}</td>
                  <td className="px-4 py-6 text-center text-sm text-white/60 font-bold">{row.gf}</td>
                  <td className="px-4 py-6 text-center text-sm text-white/60 font-bold">{row.ga}</td>
                  <td className="px-4 py-6 text-center text-sm font-bold">
                    <span className={row.gd > 0 ? 'text-brand-green' : row.gd < 0 ? 'text-brand-red' : 'text-white/40'}>
                      {row.gd > 0 ? `+${row.gd}` : row.gd}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center bg-brand-green/5">
                    <span className="text-xl font-black italic text-brand-green">{row.points}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 mt-8 px-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-brand-green"></div>
          <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Qualification</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-brand-red"></div>
          <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Relegation Zone</span>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <Info size={14} className="text-white/20" />
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Updated after each matchday</span>
        </div>
      </div>
    </div>
  );
}
