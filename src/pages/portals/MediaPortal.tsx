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
      <main className="flex-1 p-8 overflow-auto">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">
                  Media Dashboard
                </h2>
                <p className="text-white/40">Welcome back, {profile?.username || 'Publisher'}</p>
              </div>
              <button className="bg-purple-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-purple-600 transition-colors">
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
                <p className="text-2xl font-black italic text-brand-green">{mediaStats.thisMonth}</p>
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

            {/* Quick Actions & Recent */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-6">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-left hover:bg-purple-500/20 transition-colors">
                    <Newspaper size={24} className="text-purple-500 mb-3" />
                    <p className="font-bold text-sm">Write Article</p>
                    <p className="text-[10px] text-white/40 mt-1">Create news post</p>
                  </button>
                  <button className="p-4 rounded-xl bg-brand-red/10 border border-brand-red/30 text-left hover:bg-brand-red/20 transition-colors">
                    <Video size={24} className="text-brand-red mb-3" />
                    <p className="font-bold text-sm">Add Highlight</p>
                    <p className="text-[10px] text-white/40 mt-1">Upload video</p>
                  </button>
                  <button className="p-4 rounded-xl bg-brand-blue/10 border border-brand-blue/30 text-left hover:bg-brand-blue/20 transition-colors">
                    <Image size={24} className="text-brand-blue mb-3" />
                    <p className="font-bold text-sm">Photo Gallery</p>
                    <p className="text-[10px] text-white/40 mt-1">Upload images</p>
                  </button>
                  <button className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-left hover:bg-yellow-500/20 transition-colors">
                    <Mic size={24} className="text-yellow-500 mb-3" />
                    <p className="font-bold text-sm">Interview</p>
                    <p className="text-[10px] text-white/40 mt-1">Post interview</p>
                  </button>
                </div>
              </div>

              {/* Recent Articles */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-6">
                  Your Recent Posts
                </h3>
                <div className="space-y-4">
                  {mediaItems.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-colors cursor-pointer">
                      <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold line-clamp-1">{item.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-purple-500 font-bold uppercase">{item.category}</span>
                          <span className="text-[10px] text-white/30">{format(new Date(item.date), 'MMM d')}</span>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <Edit size={16} className="text-white/40" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Draft Articles */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/50">
                  Drafts
                </h3>
                <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                  3 Unpublished
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-xl border border-dashed border-white/10 hover:border-purple-500/30 transition-colors cursor-pointer">
                    <div className="w-full h-24 rounded-lg bg-white/5 flex items-center justify-center mb-3">
                      <Upload size={24} className="text-white/20" />
                    </div>
                    <p className="text-sm font-bold text-white/40">Draft Article {i}</p>
                    <p className="text-[10px] text-white/20 mt-1">Last edited 2 days ago</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'articles' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">All Articles</h2>
              <button className="bg-purple-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                <Plus size={18} />
                New Article
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mediaItems.map((item) => (
                <div key={item.id} className="glass rounded-2xl overflow-hidden group cursor-pointer">
                  <div className="h-40 overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="p-5">
                    <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">{item.category}</span>
                    <h3 className="font-bold mt-2 line-clamp-2">{item.title}</h3>
                    <p className="text-xs text-white/40 mt-2 line-clamp-2">{item.excerpt}</p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                      <span className="text-[10px] text-white/30">{format(new Date(item.date), 'MMM d, yyyy')}</span>
                      <button className="text-[10px] font-bold text-purple-500 hover:underline">Edit</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'highlights' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Match Highlights</h2>
            <div className="glass rounded-2xl p-8 text-center">
              <Video size={48} className="mx-auto text-brand-red mb-4" />
              <p className="text-white/40">Upload and manage match highlight videos.</p>
              <button className="mt-4 bg-brand-red text-white px-6 py-2 rounded-xl font-bold text-sm">
                Upload Video
              </button>
            </div>
          </div>
        )}

        {activeTab === 'interviews' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Interviews</h2>
            <div className="glass rounded-2xl p-8 text-center">
              <Mic size={48} className="mx-auto text-yellow-500 mb-4" />
              <p className="text-white/40">Post-match and exclusive player interviews.</p>
              <button className="mt-4 bg-yellow-500 text-black px-6 py-2 rounded-xl font-bold text-sm">
                Add Interview
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
