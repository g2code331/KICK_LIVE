import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Trophy, ShieldCheck, Timer, Lock } from "lucide-react";

export default function DrawPage() {
  const [selectedBall, setSelectedBall] = useState<number | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedGroup, setRevealedGroup] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isMyTurn, setIsMyTurn] = useState(true);

  useEffect(() => {
    if (timeLeft > 0 && isMyTurn && !selectedBall && selectedBall === null) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && selectedBall === null) {
      handleBallClick(Math.floor(Math.random() * 5));
    }
  }, [timeLeft, isMyTurn, selectedBall]);

  const handleBallClick = (index: number) => {
    if (selectedBall !== null || !isMyTurn) return;
    
    setSelectedBall(index);
    setIsRevealing(true);
    
    setTimeout(() => {
      const groups = ["GROUP A", "GROUP B", "GROUP C", "GROUP D"];
      const randomGroup = groups[Math.floor(Math.random() * groups.length)];
      setRevealedGroup(randomGroup);
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#39FF14", "#2196F3", "#FFFFFF"]
      });
      
      setIsRevealing(false);
    }, 2000);
  };

  const handleReset = () => {
    setSelectedBall(null);
    setRevealedGroup(null);
    setIsRevealing(false);
    setTimeLeft(30);
    setIsMyTurn(true);
  };

  const balls = [
    { color: "from-red-500 to-red-700", label: "1" },
    { color: "from-blue-500 to-blue-700", label: "2" },
    { color: "from-yellow-500 to-yellow-700", label: "3" },
    { color: "from-green-500 to-green-700", label: "4" },
    { color: "from-purple-500 to-purple-700", label: "5" },
  ];

  return (
    <div className="min-h-screen bg-brand-bg pt-12 pb-24 overflow-hidden">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="bg-brand-green/20 text-brand-green px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-brand-green/30">
                Official Ceremony
              </span>
              <div className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-widest">
                <Timer size={14} />
                Live from Accra
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
              Ballot Draw <span className="text-brand-green">Ceremony</span>
            </h1>
          </div>

          <div className="glass p-6 rounded-[2rem] border border-white/5 flex items-center gap-6 min-w-[300px]">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isMyTurn ? "gradient-green" : "bg-white/5"}`}>
               {isMyTurn ? <ShieldCheck className="text-black" /> : <Lock className="text-white/20" />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Owner Status</p>
              <p className={`text-sm font-black uppercase italic ${isMyTurn ? "text-brand-green" : "text-white/20"}`}>
                {isMyTurn ? "Your Turn to Pick" : "Waiting for Next"}
              </p>
              {isMyTurn && selectedBall === null && (
                <div className="flex items-center gap-2 mt-1">
                   <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
                     <div 
                        style={{ width: `${(timeLeft/30)*100}%`, transition: 'width 1s linear' }}
                        className="h-full bg-brand-red"
                      />
                   </div>
                   <span className="text-[10px] font-black text-brand-red">{timeLeft}s</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Action Area */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center min-h-[500px] glass rounded-[3rem] p-12 relative overflow-hidden border border-white/5 shadow-2xl">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-green/10 rounded-full blur-[120px] pointer-events-none"></div>

            {revealedGroup ? (
              <div className="text-center space-y-8 z-10 animate-in">
                <div className="space-y-2">
                  <p className="text-sm font-black uppercase tracking-[0.5em] text-white/40">Selection Result</p>
                  <h2 className="text-7xl md:text-9xl font-black italic text-brand-green text-glow-green tracking-widest transition-all duration-1000">
                    {revealedGroup}
                  </h2>
                </div>
                <div className="flex flex-col items-center gap-6">
                   <div className="w-24 h-24 gradient-green rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(57,255,20,0.5)]">
                      <Trophy size={48} className="text-black" />
                   </div>
                   <p className="text-lg font-bold text-white max-w-xs uppercase italic tracking-tighter">
                      Your team has been placed!
                   </p>
                   <button 
                     onClick={handleReset}
                     className="mt-4 gradient-green text-black px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-sm hover:opacity-90 transition-opacity"
                   >
                     Draw Again
                   </button>
                </div>
              </div>
            ) : isRevealing ? (
              <div className="text-center space-y-8 z-10">
                <div className="w-32 h-32 mx-auto rounded-full border-4 border-brand-green/30 border-t-brand-green animate-spin"></div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-brand-green animate-pulse">Revealing...</p>
              </div>
            ) : (
              <div className="text-center space-y-12 z-10">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.5em] text-white/20 mb-4">Select a Ball</p>
                  <p className="text-white/40 text-xs">Click on one of the balls below to reveal your group placement</p>
                </div>
                
                <div className="flex gap-6 justify-center flex-wrap">
                  {balls.map((ball, index) => (
                    <button
                      key={index}
                      onClick={() => handleBallClick(index)}
                      className={`w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br ${ball.color} flex items-center justify-center text-2xl md:text-3xl font-black text-white shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] glow-pulse`}
                    >
                      {ball.label}
                    </button>
                  ))}
                </div>
                
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">
                  {timeLeft > 0 ? `Auto-select in ${timeLeft}s` : 'Auto-selecting...'}
                </p>
              </div>
            )}
          </div>

          {/* Side Panel - Groups */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 mb-4">Group Assignments</h3>
            
            {["A", "B", "C", "D"].map((group) => (
              <div key={group} className={`glass rounded-2xl p-5 border border-white/5 transition-all ${revealedGroup === `GROUP ${group}` ? 'border-brand-green/30 bg-brand-green/5' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${revealedGroup === `GROUP ${group}` ? 'gradient-green text-black' : 'bg-white/5 text-white/40'}`}>
                      {group}
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-white/40">Group {group}</span>
                  </div>
                  {revealedGroup === `GROUP ${group}` && (
                    <span className="text-[8px] font-black uppercase tracking-widest text-brand-green bg-brand-green/10 px-2 py-1 rounded">YOUR GROUP</span>
                  )}
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(slot => (
                    <div key={slot} className="flex items-center gap-3 py-1.5">
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-white/20">{slot}</div>
                      <div className="h-px flex-grow bg-white/5"></div>
                      <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest">TBD</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
