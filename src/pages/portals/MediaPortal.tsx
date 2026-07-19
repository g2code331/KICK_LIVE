import { useState } from 'react';
import { 
  Newspaper, Video, Image, Mic, LogOut, 
  FileText, TrendingUp, Eye, Clock, Plus, Upload, Edit
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mediaItems } from '../../data/mockData';
import { format } from 'date-fns';

interface MediaPortalProps {
  onNavigate: (page: string) => void;
}

type MediaTab = 'overview' | 'articles' | 'highlights' | 'interviews';

export default function MediaPortal({ onNavigate }: MediaPortalProps) {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<MediaTab>('overview');

  const handleSignOut = async () => {
    await signOut();
    onNavigate('login');
  };

  const mediaStats = {
    totalArticles: 156,
    thisMonth: 12,
    totalViews: '24.5K',
    avgReadTime: '3.2 min',
  };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp size={20} /> },
    { id: 'articles', label: 'Articles', icon: <Newspaper size={20} /> },
    { id: 'highlights', label: 'Highlights', icon: <Video size={20} /> },
    { id: 'interviews', label: 'Interviews', icon: <Mic size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-brand-bg flex">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-white/10 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <Newspaper size={20} className="text-purple-500" />
          </div>
          <div>
            <h1 className="font-black text-sm uppercase tracking-tight">Media Center</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Publisher</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as MediaTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                activeTab === item.id
                  ? 'bg-purple-500/10 text-purple-500'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon}
              <span className="text-sm font-bold">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500 font-bold">
              {profile?.username?.[0] || 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{profile?.username || 'Media'}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Publisher</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-brand-red hover:bg-brand-red/10 transition-all"
          >
            <LogOut size={20} />
            <span className="text-sm font-bold">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">
                  Media Dashboard
                </h2>
                <p className="text-white/40">Welcome back, {profile?.username || 'Publisher'}</p>
              </div>
              <button className="bg-purple-500 text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-purple-600 transition-colors">
                <Plus size={18} />
                New Article
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass rounded-2xl p-5 text-center">
                <FileText size={20} className="mx-auto text-purple-500 mb-2" />
                <p className="text-2xl font-black italic">{mediaStats.totalArticles}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Total Articles</p>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <TrendingUp size={20} className="mx-auto text-brand-green mb-2" />
                <p className="text-2xl font-black italic">{mediaStats.thisMonth}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">This Month</p>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <Eye size={20} className="mx-auto text-brand-blue mb-2" />
                <p className="text-2xl font-black italic text-brand-blue">{mediaStats.totalViews}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Total Views</p>
              </div>
              <div className="glass rounded-2xl p-5 text-center">
                <Clock size={20} className="mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-black italic">{mediaStats.avgReadTime}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Avg Read Time</p>
              </div>
            </div>

            {/* Content List */}
            <div className="glass rounded-[2rem] border border-white/5 overflow-hidden">
               <div className="p-6 border-b border-white/5 flex items-center justify-between">
                 <h3 className="font-black italic uppercase tracking-widest text-sm">Recent Publications</h3>
                 <div className="flex gap-2">
                   <button className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
                     <Upload size={16} />
                   </button>
                 </div>
               </div>
               <div className="divide-y divide-white/5">
                 {mediaItems.map(item => (
                   <div key={item.id} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-xl bg-white/5 overflow-hidden">
                          <img src={item.image} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-purple-500 uppercase tracking-widest">{item.category}</p>
                          <h4 className="font-bold text-white/80 group-hover:text-white transition-colors">{item.title}</h4>
                          <p className="text-[10px] text-white/30 font-bold uppercase mt-1">{format(new Date(item.date), 'MMM dd, yyyy')}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                       <button className="p-2 hover:bg-purple-500/20 rounded-lg text-white/20 hover:text-purple-500 transition-colors">
                         <Edit size={16} />
                       </button>
                       <button className="p-2 hover:bg-brand-red/20 rounded-lg text-white/20 hover:text-brand-red transition-colors">
                         <Image size={16} />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
