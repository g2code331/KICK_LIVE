import { MapPin, ChevronRight, ArrowUpRight } from "lucide-react";
import { teams, players } from "../data/mockData";

export default function TeamsPage() {
  const teamPlayerCounts = new Map<number, number>();
  players.forEach(p => {
    teamPlayerCounts.set(p.teamId, (teamPlayerCounts.get(p.teamId) || 0) + 1);
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-16 space-y-4">
        <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">
          Clubs <span className="text-white/10">&</span> <span className="text-brand-green">Squads</span>
        </h1>
        <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-xs">Explore the professional network of KickLive participating teams</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {teams.map((team) => (
          <div key={team.id} className="group relative cursor-pointer">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-green to-brand-blue rounded-[3rem] blur opacity-0 group-hover:opacity-20 transition-all"></div>
            
            <div className="relative glass rounded-[3rem] overflow-hidden border border-white/5 transition-all group-hover:-translate-y-2 group-hover:bg-white/[0.04]">
              <div className="h-40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-bg/90 z-10"></div>
                <div className="absolute inset-0 scale-110 blur-sm opacity-20 bg-cover bg-center" style={{ 
                  backgroundImage: `linear-gradient(135deg, ${team.primaryColor}44, ${team.secondaryColor}22)` 
                }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl font-black italic" style={{
                    background: `linear-gradient(135deg, ${team.primaryColor}, ${team.secondaryColor})`,
                    color: team.secondaryColor === '#000000' ? '#000' : '#fff'
                  }}>
                    {team.shortName[0]}
                  </div>
                </div>
                
                <div className="absolute top-6 right-6 z-20 w-10 h-10 glass rounded-full flex items-center justify-center border border-white/10 group-hover:bg-brand-green group-hover:text-black transition-all">
                   <ArrowUpRight size={18} />
                </div>
              </div>

              <div className="p-10 -mt-10 relative z-20 text-center flex flex-col items-center">
                 <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-1">{team.name}</h3>
                 <div className="flex items-center gap-3 mb-8">
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center p-1">
                       <MapPin size={10} className="text-white/40" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30 italic">{team.city}</span>
                 </div>

                 <div className="grid grid-cols-2 gap-4 w-full mb-8">
                    <div className="glass-light p-4 rounded-3xl border border-white/5">
                       <p className="text-lg font-black text-brand-green">{teamPlayerCounts.get(team.id) || 0}</p>
                       <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Squad Size</p>
                    </div>
                    <div className="glass-light p-4 rounded-3xl border border-white/5">
                       <p className="text-lg font-black text-brand-blue">{team.coach.split(' ')[1]}</p>
                       <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Coach</p>
                    </div>
                 </div>

                 <div className="w-full h-px bg-white/5 mb-8"></div>

                 <div className="flex items-center justify-between w-full">
                    <div className="flex -space-x-3">
                       {[1,2,3,4].map(i => (
                         <div key={i} className="w-8 h-8 rounded-full border-2 border-brand-bg bg-white/5 flex items-center justify-center text-[10px] font-black">{i}</div>
                       ))}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-green flex items-center gap-1">
                      Full Squad <ChevronRight size={10} className="inline ml-1" />
                    </span>
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
