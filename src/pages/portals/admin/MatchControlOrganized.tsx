import { useState, useEffect } from 'react';
import { Trophy, Play } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import MatchControlPro from './MatchControlPro';

export default function MatchControlOrganized() {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<any>(null);
  const [matchesByCompetition, setMatchesByCompetition] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  
  useEffect(() => {
    loadCompetitions();
  }, []);
  
  useEffect(() => {
    if (selectedCompetition) {
      loadMatches();
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
    } finally {
      setLoading(false);
    }
  }
  
  async function loadMatches() {
    if (!selectedCompetition) return;
    
    try {
      const { data } = await supabase
        .from('matches')
        .select('*, homeTeam:teams!home_team_id(*), awayTeam:teams!away_team_id(*)')
        .eq('competition_id', selectedCompetition.id)
        .order('start_time', { ascending: false });
      
      setMatchesByCompetition(prev => ({
        ...prev,
        [selectedCompetition.id]: data || []
      }));
    } catch (err) {
      console.error('Error loading matches:', err);
    }
  }
  
  if (selectedMatch) {
    return (
      <MatchControlPro 
        matchId={selectedMatch.id} 
        onBack={() => setSelectedMatch(null)} 
      />
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-green font-bold uppercase">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#0B0E13] p-8">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black italic uppercase mb-2">Match Control</h1>
            <p className="text-white/40">Organized by competition</p>
          </div>
        </div>
        
        {/* Competition Selector */}
        <div className="glass rounded-2xl p-6 mb-8 border border-white/10">
          <div className="flex items-center gap-4 mb-4">
            <Trophy className="text-brand-green" size={24} />
            <h2 className="text-xl font-black uppercase">Select Competition</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {competitions.map(comp => (
              <button
                key={comp.id}
                onClick={() => setSelectedCompetition(comp)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedCompetition?.id === comp.id
                    ? 'border-brand-green bg-brand-green/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
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
            ))}
          </div>
        </div>
        
        {/* Matches by Competition */}
        {selectedCompetition && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black uppercase">
                {selectedCompetition.name} - Matches ({matchesByCompetition[selectedCompetition.id]?.length || 0})
              </h2>
            </div>
            
            {matchesByCompetition[selectedCompetition.id]?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {matchesByCompetition[selectedCompetition.id].map((match: any) => (
                  <div
                    key={match.id}
                    onClick={() => setSelectedMatch(match)}
                    className="glass rounded-xl p-4 border border-white/10 hover:border-brand-green/30 transition-all cursor-pointer group"
                  >
                    {/* Status */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                        match.status === 'live' || match.status === 'first_half' || match.status === 'second_half'
                          ? 'bg-red-500/20 text-red-500 animate-pulse'
                          : match.status === 'finished' || match.status === 'full_time'
                          ? 'bg-white/10 text-white/40'
                          : 'bg-blue-500/20 text-blue-500'
                      }`}>
                        {match.status === 'live' || match.status === 'first_half' || match.status === 'second_half'
                          ? 'LIVE'
                          : match.status === 'finished' || match.status === 'full_time'
                          ? 'FT'
                          : match.status || 'SCHEDULED'}
                      </span>
                      <span className="text-[10px] text-white/40">{match.minute || 0}'</span>
                    </div>
                    
                    {/* Teams with Logos */}
                    <div className="space-y-3 mb-4">
                      {/* Home Team */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                            {match.homeTeam?.logo_url ? (
                              <img src={match.homeTeam.logo_url} alt={match.homeTeam.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg font-black">{match.homeTeam?.short_name?.[0] || 'H'}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{match.homeTeam?.name || 'Home Team'}</p>
                            <p className="text-[10px] text-white/40">{match.homeTeam?.city || ''}</p>
                          </div>
                        </div>
                        <span className="text-xl font-black text-brand-green">{match.home_score ?? 0}</span>
                      </div>
                      
                      {/* Away Team */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                            {match.awayTeam?.logo_url ? (
                              <img src={match.awayTeam.logo_url} alt={match.awayTeam.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg font-black">{match.awayTeam?.short_name?.[0] || 'A'}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{match.awayTeam?.name || 'Away Team'}</p>
                            <p className="text-[10px] text-white/40">{match.awayTeam?.city || ''}</p>
                          </div>
                        </div>
                        <span className="text-xl font-black text-brand-green">{match.away_score ?? 0}</span>
                      </div>
                    </div>
                    
                    {/* Control Button */}
                    <button className="w-full py-2 rounded-lg bg-brand-green/10 text-brand-green font-black uppercase tracking-widest text-[10px] group-hover:bg-brand-green/20 transition-all flex items-center justify-center gap-2">
                      <Play size={12} /> CONTROL MATCH
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass rounded-2xl p-20 text-center border border-white/10">
                <Trophy size={64} className="mx-auto text-white/10 mb-4" />
                <p className="text-white/30 font-bold uppercase tracking-widest mb-2">No matches yet</p>
                <p className="text-white/40 text-sm">Create fixtures for this competition first</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
