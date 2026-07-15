import { useState, useEffect } from "react";
// FORCE REBUILD - NEW SUPABASE PROJECT - $(date +%s)
import { Search, Bell, User, Home, Calendar, Trophy, Users, MoreHorizontal } from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import HomePage from "./pages/HomePage";
import MatchesPage from "./pages/MatchesPage";
import StandingsPage from "./pages/StandingsPage";
import TeamsPage from "./pages/TeamsPage";
import DrawPage from "./pages/DrawPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ProfileDashboard from "./pages/portals/shared/ProfileDashboard";
import AdminPortal from "./pages/portals/AdminPortal";
import FanPortal from "./pages/portals/FanPortal";
import TeamPortal from "./pages/portals/TeamPortal";
import MediaPortal from "./pages/portals/MediaPortal";
import { dataLoader } from "./lib/DataLoader";

type Page = "home" | "matches" | "standings" | "teams" | "draw" | "login" | "signup" | "forgot-password" | "admin-portal" | "fan-portal" | "team-portal" | "media-portal";

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  // Initialize background data loading
  useEffect(() => {
    console.log('[App] Initializing background data loader...');
    
    // Load all data in background (non-blocking)
    dataLoader.loadAll().then(() => {
      console.log('[App] ✓ Initial data loaded');
    }).catch(err => {
      console.error('[App] Initial data load failed:', err);
    });

    // Start auto-refresh every 2 minutes (silent, in background)
    dataLoader.startAutoRefresh();

    // Cleanup on unmount
    return () => {
      dataLoader.stopAutoRefresh();
    };
  }, []);

  useEffect(() => {
    if (user && profile && !loading) {
      const portals: Page[] = ["admin-portal", "fan-portal", "team-portal", "media-portal"];
      if (!portals.includes(currentPage)) {
        if (profile.role === 'admin') setCurrentPage('admin-portal');
        else if (profile.role === 'fan') setCurrentPage('fan-portal');
        else if (profile.role === 'team_manager') setCurrentPage('team-portal');
        else if (profile.role === 'media') setCurrentPage('media-portal');
      }
    }
  }, [user, profile, loading]);

  // Don't show loading screen - let data load in background
  // Only show minimal loading for auth
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E13] flex items-center justify-center">
        <div className="text-center">
          <img src="/kicklive-icon.png" alt="KickLive" className="w-24 h-24 mx-auto mb-4 animate-spin" style={{ animationDuration: '2s' }} />
          <p className="text-[#39FF14] font-bold uppercase text-sm">KickLive</p>
        </div>
      </div>
    );
  }

  if (currentPage === "login") return <LoginPage onNavigate={handleNavigate} showBackButton={true} />;
  if (currentPage === "signup") return <SignupPage onNavigate={handleNavigate} />;
  if (currentPage === "forgot-password") return <ForgotPasswordPage onNavigate={handleNavigate} />;

  if (currentPage === "admin-portal" && user && profile?.role === 'admin') return <AdminPortal onNavigate={handleNavigate} />;
  if (currentPage === "fan-portal" && user && profile?.role === 'fan') return <FanPortal onNavigate={handleNavigate} />;
  if (currentPage === "team-portal" && user && profile?.role === 'team_manager') return <TeamPortal onNavigate={handleNavigate} />;
  if (currentPage === "media-portal" && user && profile?.role === 'media') return <MediaPortal onNavigate={handleNavigate} />;

  const renderPage = () => {
    if (currentPage === "home") return <HomePage />;
    if (currentPage === "matches") return <MatchesPage />;
    if (currentPage === "standings") return <StandingsPage />;
    if (currentPage === "teams") return <TeamsPage />;
    if (currentPage === "draw") return <DrawPage />;
    return <HomePage />;
  };

  const navItems = [
    { page: "home" as Page, icon: <Home size={24} />, label: "Home" },
    { page: "matches" as Page, icon: <Calendar size={24} />, label: "Matches" },
    { page: "standings" as Page, icon: <Trophy size={24} />, label: "Tables" },
    { page: "teams" as Page, icon: <Users size={24} />, label: "Teams" },
    { page: "draw" as Page, icon: <MoreHorizontal size={24} />, label: "Draw" },
  ];

  return (
    <div className="min-h-screen bg-[#0B0E13] text-white">
      <header className="sticky top-0 z-50 glass border-b border-white/10 h-16 flex items-center">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <button onClick={() => setCurrentPage("home")} className="flex items-center gap-3">
            <div className="text-3xl">⚽</div>
            <span className="font-bold text-lg italic uppercase hidden sm:block text-[#39FF14]">KickLive</span>
          </button>
          
          <div className="flex items-center gap-4">
            <nav className="hidden lg:flex gap-2">
              {navItems.map(item => (
                <button
                  key={item.page}
                  onClick={() => setCurrentPage(item.page)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold uppercase ${
                    currentPage === item.page ? 'text-[#39FF14] bg-[#39FF14]/10' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
              <Search size={16} className="text-white/40" />
              <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-sm ml-2 w-40 text-white placeholder:text-white/20" />
            </div>
            <button className="p-2 hover:bg-white/5 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            {user ? (
              <button onClick={() => setIsProfileOpen(true)} className="w-10 h-10 rounded-full bg-[#39FF14]/20 border border-[#39FF14]/40 flex items-center justify-center text-[#39FF14] font-bold">
                {profile?.username?.[0] || 'U'}
              </button>
            ) : (
              <button onClick={() => setCurrentPage('login')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#39FF14]/10 text-[#39FF14] font-bold text-sm">
                <User size={18} /> Login
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="pb-32">
        {renderPage()}
      </main>

      <ProfileDashboard isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-md glass rounded-[2rem] h-20 flex items-center justify-around px-4 border border-white/10 lg:hidden">
        {navItems.map(item => (
          <button key={item.page} onClick={() => setCurrentPage(item.page)} className="flex flex-col items-center gap-1">
            <div className={`p-2.5 rounded-2xl ${currentPage === item.page ? 'bg-[#39FF14]/10 text-[#39FF14]' : 'text-white/40'}`}>
              {item.icon}
            </div>
            <span className={`text-[10px] font-bold uppercase ${currentPage === item.page ? 'text-[#39FF14]' : 'text-white/30'}`}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
