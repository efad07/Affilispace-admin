import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  Users, Activity, ShieldAlert, Ban, Server, Database, Zap, 
  Search, Bell, Settings, ChevronDown, Cpu, AlertTriangle, CheckCircle,
  TrendingUp, Globe, Lock, Eye, LogOut, UserCheck, UserX, Trash2,
  Megaphone, Play, Pause, StopCircle, Check, X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, query, onSnapshot, where, orderBy, limit, 
  doc, updateDoc, deleteDoc, Timestamp, addDoc 
} from 'firebase/firestore';

// Utility for merging tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const GlassCard = ({ children, className, glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={cn(
      "relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-xl",
      glow && "shadow-[0_0_40px_-10px_rgba(124,58,237,0.3)] border-purple-500/30",
      className
    )}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
    {children}
  </motion.div>
);

const StatCard = ({ title, value, change, icon: Icon, color, loading }: { title: string; value: string | number; change?: string; icon: any; color: string; loading?: boolean }) => (
  <GlassCard className="group hover:border-white/20 transition-colors duration-300">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-400 text-sm font-medium tracking-wide uppercase">{title}</p>
        {loading ? (
          <div className="h-8 w-24 bg-white/10 animate-pulse rounded mt-2" />
        ) : (
          <h3 className="text-3xl font-bold mt-2 text-white group-hover:scale-105 transition-transform origin-left">{value}</h3>
        )}
      </div>
      <div className={cn("p-3 rounded-xl bg-opacity-20 backdrop-blur-md", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    {change && (
      <div className="mt-4 flex items-center text-sm">
        <span className={cn("flex items-center font-medium", change.startsWith('+') ? "text-emerald-400" : "text-red-400")}>
          <TrendingUp className={cn("w-4 h-4 mr-1", !change.startsWith('+') && "rotate-180")} />
          {change}
        </span>
        <span className="text-gray-500 ml-2">vs last month</span>
      </div>
    )}
  </GlassCard>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-6">
    <h2 className="text-xl font-bold text-white flex items-center gap-2">
      <span className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full block"></span>
      {title}
    </h2>
    {subtitle && <p className="text-gray-400 text-sm mt-1 ml-3">{subtitle}</p>}
  </div>
);

const CircularProgress = ({ value, size = 120, strokeWidth = 10, color = "#3B82F6" }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          className="text-gray-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="transition-all duration-1000 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{value}%</span>
        <span className="text-xs text-gray-400 uppercase tracking-wider">Health</span>
      </div>
    </div>
  );
};

const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, x: 50 }}
    animate={{ opacity: 1, y: 0, x: 0 }}
    exit={{ opacity: 0, y: 20, x: 20 }}
    className="fixed bottom-6 right-6 bg-gray-900/90 border border-cyan-500/30 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 z-50"
  >
    <div className="p-2 bg-cyan-500/20 rounded-full">
      <Bell className="w-4 h-4 text-cyan-400" />
    </div>
    <div>
      <h4 className="text-sm font-bold">New Notification</h4>
      <p className="text-xs text-gray-300">{message}</p>
    </div>
    <button onClick={onClose} className="ml-4 text-gray-500 hover:text-white">
      <Trash2 className="w-4 h-4" />
    </button>
  </motion.div>
);

export default function AdminDashboard() {
  const { user, userData, loading: authLoading, isAdmin, signInWithGoogle, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [notification, setNotification] = useState<string | null>(null);
  
  // Real Data State
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Derived Stats
  const [activeUsersNow, setActiveUsersNow] = useState(0);
  const [blockedContentCount, setBlockedContentCount] = useState(0);
  const [userGrowth, setUserGrowth] = useState({ percent: 0, label: '0%' });
  const [activeGrowth, setActiveGrowth] = useState({ percent: 0, label: '0%' });
  const [reportsGrowth, setReportsGrowth] = useState({ percent: 0, label: '0%' });
  const [blockedGrowth, setBlockedGrowth] = useState({ percent: 0, label: '0%' });
  const [moderationStats, setModerationStats] = useState<any[]>([]);

  // Helper for growth calculation
  const calculateMonthlyGrowth = (data: any[], dateField: string = 'createdAt') => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonthCount = data.filter((item: any) => {
      if (!item[dateField]) return false;
      const date = item[dateField]?.toDate ? item[dateField].toDate() : new Date(item[dateField]);
      return date >= currentMonthStart;
    }).length;

    const lastMonthCount = data.filter((item: any) => {
      if (!item[dateField]) return false;
      const date = item[dateField]?.toDate ? item[dateField].toDate() : new Date(item[dateField]);
      return date >= lastMonthStart && date <= lastMonthEnd;
    }).length;

    let growthPercent = 0;
    if (lastMonthCount > 0) {
      growthPercent = ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100;
    } else if (currentMonthCount > 0) {
      growthPercent = 100;
    }
    
    const percent = parseFloat(growthPercent.toFixed(1));
    return { 
      percent,
      label: percent > 0 ? `+${percent}%` : `${percent}%`
    };
  };

  // Listen to Firestore updates
  useEffect(() => {
    if (!user) return;

    // 1. Users Listener
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersList);
      
      // Active Users (5 mins)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const active = usersList.filter((u: any) => u.lastSeen?.toDate() > fiveMinutesAgo).length;
      setActiveUsersNow(active);

      // Monthly Growth (Total Users)
      setUserGrowth(calculateMonthlyGrowth(usersList, 'createdAt'));
    });

    // 2. Reports Listener
    const unsubscribeReports = onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc')), (snapshot) => {
      const reportsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(reportsList);
      
      // Calculate moderation stats
      const resolved = reportsList.filter((r: any) => r.status === 'resolved').length;
      const pending = reportsList.filter((r: any) => r.status === 'pending').length;
      const dismissed = reportsList.filter((r: any) => r.status === 'dismissed').length;
      
      setModerationStats([
        { name: 'Resolved', value: resolved, color: '#10B981' },
        { name: 'Pending', value: pending, color: '#F59E0B' },
        { name: 'Dismissed', value: dismissed, color: '#6B7280' },
      ]);

      // Reports Growth
      setReportsGrowth(calculateMonthlyGrowth(reportsList, 'createdAt'));

      // Real-time Notification for new reports
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !loadingData) {
          const newReport = change.doc.data();
          setNotification(`New Report: ${newReport.reason || 'Unknown Reason'}`);
          setTimeout(() => setNotification(null), 5000);
        }
      });
    });

    // 3. Posts Listener (Blocked Content)
    const unsubscribePosts = onSnapshot(collection(db, 'posts'), (snapshot) => {
      const postsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsList);
      
      const blocked = postsList.filter((p: any) => p.status === 'blocked');
      setBlockedContentCount(blocked.length);
      
      // Blocked Content Growth
      setBlockedGrowth(calculateMonthlyGrowth(blocked, 'createdAt'));
    });

    // 4. Activity Listener (Chart)
    const unsubscribeActivity = onSnapshot(query(collection(db, 'activity'), orderBy('date', 'asc'), limit(30)), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        name: doc.data().date.split('-')[2], // Just the day
        active: doc.data().activeUsers || 0,
        new: doc.data().newUsers || 0
      }));
      setActivityData(data.length > 0 ? data : []); 
    });

    // 5. Ads Listener
    const unsubscribeAds = onSnapshot(query(collection(db, 'ads'), orderBy('createdAt', 'desc')), (snapshot) => {
      const adsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAds(adsList);
    });
    
    setLoadingData(false);

    return () => {
      unsubscribeUsers();
      unsubscribeReports();
      unsubscribePosts();
      unsubscribeActivity();
      unsubscribeAds();
    };
  }, [user]);

  // Admin Actions
  const handleBanUser = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const handleResolveReport = async (reportId: string, action: 'resolve' | 'dismiss') => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { 
        status: action === 'resolve' ? 'resolved' : 'dismissed',
        resolvedAt: Timestamp.now(),
        resolvedBy: user?.uid
      });
    } catch (error) {
      console.error("Error resolving report:", error);
    }
  };

  const handleAdAction = async (adId: string, action: 'approve' | 'reject' | 'pause' | 'stop') => {
    try {
      let newStatus = '';
      if (action === 'approve') newStatus = 'active';
      if (action === 'reject') newStatus = 'rejected';
      if (action === 'pause') newStatus = 'paused';
      if (action === 'stop') newStatus = 'stopped'; // Or expired

      await updateDoc(doc(db, 'ads', adId), { 
        status: newStatus,
        updatedAt: Timestamp.now(),
        updatedBy: user?.uid
      });
      setNotification(`Ad ${action}d successfully`);
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error(`Error ${action}ing ad:`, error);
      setNotification(`Error: Failed to ${action} ad`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Login Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    // Admin check bypassed for demo purposes as requested
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex h-screen overflow-hidden">
        
        <AnimatePresence>
          {notification && (
            <Toast 
              message={notification} 
              onClose={() => setNotification(null)} 
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <motion.aside 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={cn(
            "hidden md:flex flex-col w-20 lg:w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl transition-all duration-300",
            !isSidebarOpen && "lg:w-20"
          )}
        >
          <div className="h-16 flex items-center justify-center border-b border-white/10">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="text-white w-6 h-6" />
            </div>
            {isSidebarOpen && (
              <span className="ml-3 font-bold text-xl tracking-tight hidden lg:block bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Affilispace
              </span>
            )}
          </div>

          <nav className="flex-1 py-6 space-y-2 px-3">
            {[
              { id: 'overview', icon: Activity, label: 'Overview' },
              { id: 'users', icon: Users, label: 'Users' },
              { id: 'moderation', icon: ShieldAlert, label: 'Moderation' },
              { id: 'ads', icon: Megaphone, label: 'Ads' },
              { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
              { id: 'system', icon: Server, label: 'System' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center p-3 rounded-xl transition-all duration-200 group",
                  activeTab === item.id 
                    ? "bg-white/10 text-white shadow-inner" 
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-cyan-400" : "group-hover:text-cyan-400")} />
                {isSidebarOpen && <span className="ml-3 hidden lg:block font-medium">{item.label}</span>}
                {activeTab === item.id && (
                  <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-8 bg-cyan-400 rounded-r-full" />
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10">
            <button 
              onClick={logout}
              className="flex items-center justify-center w-full p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              {isSidebarOpen && <span className="ml-3 hidden lg:block text-sm">Sign Out</span>}
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Top Header */}
          <header className="h-16 border-b border-white/10 bg-black/20 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-gray-200 tracking-wide">Global App Operational Dashboard</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">{userData?.displayName || 'Admin'}</p>
                  <p className="text-xs text-emerald-400">● Online</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-[1px]">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                    {userData?.photoURL ? (
                      <img src={userData.photoURL} alt="Admin" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-xs font-bold">{userData?.displayName?.charAt(0)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Dashboard Area */}
          <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {activeTab === 'overview' && (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                      title="Total Users" 
                      value={users.length} 
                      change={users.length > 0 ? userGrowth.label : "0%"} 
                      icon={Users} 
                      color="bg-blue-500" 
                      loading={loadingData}
                    />
                    <StatCard 
                      title="Active Now" 
                      value={activeUsersNow} 
                      change={activeGrowth.label} 
                      icon={Activity} 
                      color="bg-emerald-500" 
                      loading={loadingData}
                    />
                    <StatCard 
                      title="Reports" 
                      value={reports.filter(r => r.status === 'pending').length} 
                      change={reportsGrowth.label} 
                      icon={ShieldAlert} 
                      color="bg-orange-500" 
                      loading={loadingData}
                    />
                    <StatCard 
                      title="Blocked Content" 
                      value={blockedContentCount} 
                      change={blockedGrowth.label} 
                      icon={Ban} 
                      color="bg-red-500" 
                      loading={loadingData}
                    />
                  </div>

                  {/* Main Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* User Activity Chart */}
                    <GlassCard className="lg:col-span-2 min-h-[400px]">
                      <div className="flex justify-between items-center mb-6">
                        <SectionTitle title="User Activity Trends" subtitle="Daily active users (Last 30 Days)" />
                        <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm text-gray-300 focus:outline-none">
                          <option>Last 30 Days</option>
                        </select>
                      </div>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={activityData.length > 0 ? activityData : [{name: 'No Data', active: 0, new: 0}]}>
                            <defs>
                              <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="#6B7280" tickLine={false} axisLine={false} />
                            <YAxis stroke="#6B7280" tickLine={false} axisLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px', color: '#fff' }}
                              itemStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="active" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorActive)" />
                            <Area type="monotone" dataKey="new" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorNew)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </GlassCard>

                    {/* Recent Reports Panel */}
                    <GlassCard glow className="lg:col-span-1 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <SectionTitle title="Recent Reports" />
                        <div className="px-2 py-1 rounded bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold uppercase tracking-wider animate-pulse">
                          Live
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-white/10">
                        {reports.length === 0 ? (
                          <div className="text-center text-gray-500 py-8">No pending reports</div>
                        ) : (
                          reports.slice(0, 5).map((report) => (
                            <div key={report.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded uppercase font-bold",
                                  report.severity === 'high' ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                                )}>
                                  {report.reason}
                                </span>
                                <span className="text-xs text-gray-500">{report.createdAt?.toDate().toLocaleTimeString()}</span>
                              </div>
                              <p className="text-sm text-gray-300 mb-3 line-clamp-2">{report.description}</p>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleResolveReport(report.id, 'resolve')}
                                  className="flex-1 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors"
                                >
                                  Resolve
                                </button>
                                <button 
                                  onClick={() => handleResolveReport(report.id, 'dismiss')}
                                  className="flex-1 py-1.5 text-xs bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 rounded transition-colors"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </GlassCard>
                  </div>

                  {/* System Insights & Moderators */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <GlassCard className="lg:col-span-2">
                      <SectionTitle title="AI System Insights" subtitle="Real-time analysis of platform health" />
                      <div className="space-y-4">
                        {reportsGrowth.percent > 10 && (
                          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-4">
                            <div className="p-2 bg-red-500/20 rounded-lg">
                              <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                              <h4 className="text-white font-medium">High Report Volume Detected</h4>
                              <p className="text-sm text-gray-400 mt-1">Reports have increased by {reportsGrowth.percent}% this month. Consider increasing moderation staff.</p>
                            </div>
                            <button className="ml-auto text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg transition-colors">Investigate</button>
                          </div>
                        )}
                        
                        {userGrowth.percent > 15 && (
                          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-4">
                            <div className="p-2 bg-emerald-500/20 rounded-lg">
                              <TrendingUp className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <h4 className="text-white font-medium">Rapid User Growth</h4>
                              <p className="text-sm text-gray-400 mt-1">User base grew by {userGrowth.percent}% recently. Ensure server capacity is sufficient.</p>
                            </div>
                          </div>
                        )}

                        {activeUsersNow > 100 ? (
                          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                              <Activity className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <h4 className="text-white font-medium">High Traffic Volume</h4>
                              <p className="text-sm text-gray-400 mt-1">Currently serving {activeUsersNow} active users. System load is elevated but stable.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-gray-500/10 border border-gray-500/20 flex items-start gap-4">
                            <div className="p-2 bg-gray-500/20 rounded-lg">
                              <CheckCircle className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                              <h4 className="text-white font-medium">System Nominal</h4>
                              <p className="text-sm text-gray-400 mt-1">All systems operating within normal parameters. No critical anomalies detected.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <SectionTitle title="Active Moderators" />
                      <div className="space-y-4">
                        {users.filter(u => u.role === 'admin' || u.role === 'moderator').slice(0, 5).map(mod => (
                          <div key={mod.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 p-[1px]">
                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                                  {mod.photoURL ? (
                                    <img src={mod.photoURL} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-xs font-bold">{mod.displayName?.charAt(0)}</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{mod.displayName}</p>
                                <p className="text-xs text-gray-500 capitalize">{mod.role}</p>
                              </div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>
                </>
              )}

              {activeTab === 'ads' && (
                <>
                  {/* Ads Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <StatCard 
                      title="Total Ads" 
                      value={ads.length} 
                      icon={Megaphone} 
                      color="bg-purple-500" 
                      loading={loadingData}
                    />
                    <StatCard 
                      title="Active Ads" 
                      value={ads.filter(a => a.status === 'active').length} 
                      icon={Play} 
                      color="bg-emerald-500" 
                      loading={loadingData}
                    />
                    <StatCard 
                      title="Pending Requests" 
                      value={ads.filter(a => a.status === 'pending').length} 
                      icon={AlertTriangle} 
                      color="bg-yellow-500" 
                      loading={loadingData}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pending Ads */}
                    <GlassCard className="h-full flex flex-col">
                      <SectionTitle title="Pending Requests" subtitle="Ads waiting for approval" />
                      <div className="flex-1 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-white/10 max-h-[500px]">
                        {ads.filter(a => a.status === 'pending').length === 0 ? (
                          <div className="text-center text-gray-500 py-8">No pending ad requests</div>
                        ) : (
                          ads.filter(a => a.status === 'pending').map((ad) => (
                            <div key={ad.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-white">{ad.title}</h4>
                                <span className="text-xs text-gray-400">{ad.createdAt?.toDate().toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm text-gray-300 mb-2">{ad.content}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                <span>User: {ad.userId}</span>
                                <span>•</span>
                                <span>Duration: {ad.startDate?.toDate().toLocaleDateString()} - {ad.endDate?.toDate().toLocaleDateString()}</span>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleAdAction(ad.id, 'approve')}
                                  className="flex-1 py-2 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors flex items-center justify-center gap-1"
                                >
                                  <Check className="w-3 h-3" /> Approve
                                </button>
                                <button 
                                  onClick={() => handleAdAction(ad.id, 'reject')}
                                  className="flex-1 py-2 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors flex items-center justify-center gap-1"
                                >
                                  <X className="w-3 h-3" /> Reject
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </GlassCard>

                    {/* Active Ads */}
                    <GlassCard className="h-full flex flex-col">
                      <SectionTitle title="Active Campaigns" subtitle="Currently running ads" />
                      <div className="flex-1 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-white/10 max-h-[500px]">
                        {ads.filter(a => a.status === 'active' || a.status === 'paused').length === 0 ? (
                          <div className="text-center text-gray-500 py-8">No active campaigns</div>
                        ) : (
                          ads.filter(a => a.status === 'active' || a.status === 'paused').map((ad) => (
                            <div key={ad.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-white">{ad.title}</h4>
                                  <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded uppercase font-bold",
                                    ad.status === 'active' ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"
                                  )}>
                                    {ad.status}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-400">Ends: {ad.endDate?.toDate().toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                <span>User: {ad.userId}</span>
                              </div>
                              <div className="flex gap-2">
                                {ad.status === 'active' ? (
                                  <button 
                                    onClick={() => handleAdAction(ad.id, 'pause')}
                                    className="flex-1 py-2 text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded transition-colors flex items-center justify-center gap-1"
                                  >
                                    <Pause className="w-3 h-3" /> Pause
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => handleAdAction(ad.id, 'approve')} // Re-activate
                                    className="flex-1 py-2 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors flex items-center justify-center gap-1"
                                  >
                                    <Play className="w-3 h-3" /> Resume
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleAdAction(ad.id, 'stop')}
                                  className="flex-1 py-2 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors flex items-center justify-center gap-1"
                                >
                                  <StopCircle className="w-3 h-3" /> Stop
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </GlassCard>
                  </div>
                </>
              )}

              {activeTab === 'users' && (
                <GlassCard>
                  <SectionTitle title="User Management" subtitle={`Total Users: ${users.length}`} />
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 text-sm uppercase tracking-wider">
                          <th className="p-4 font-medium">User</th>
                          <th className="p-4 font-medium">Role</th>
                          <th className="p-4 font-medium">Status</th>
                          <th className="p-4 font-medium">Joined</th>
                          <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-white/5">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                                  {u.photoURL ? (
                                    <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="font-bold text-xs">{u.displayName?.charAt(0)}</span>
                                  )}
                                </div>
                                <div className="font-medium text-white">{u.displayName}</div>
                              </div>
                            </td>
                            <td className="p-4 text-gray-400">{u.role}</td>
                            <td className="p-4">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium border",
                                u.status === 'active' 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                  : "bg-red-500/10 text-red-400 border-red-500/20"
                              )}>
                                {u.status}
                              </span>
                            </td>
                            <td className="p-4 text-gray-500">{u.createdAt?.toDate().toLocaleDateString()}</td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => handleBanUser(u.id, u.status)}
                                className={cn(
                                  "p-2 rounded hover:bg-white/10 transition-colors",
                                  u.status === 'active' ? "text-red-400 hover:text-red-300" : "text-emerald-400 hover:text-emerald-300"
                                )}
                                title={u.status === 'active' ? "Ban User" : "Unban User"}
                              >
                                {u.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              )}

              {activeTab === 'moderation' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Moderation Stats */}
                  <GlassCard>
                    <SectionTitle title="Moderation Overview" />
                    <div className="flex items-center justify-center h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={moderationStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {moderationStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                      {moderationStats.map((stat) => (
                        <div key={stat.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
                          <span className="text-xs text-gray-400">{stat.name} ({stat.value})</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Full Reports List */}
                  <GlassCard className="h-full flex flex-col">
                    <SectionTitle title="All Reports" />
                    <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-white/10">
                      {reports.map((report) => (
                        <div key={report.id} className="p-4 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-white">{report.reason}</span>
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded uppercase",
                                report.status === 'pending' ? "bg-yellow-500/20 text-yellow-400" :
                                report.status === 'resolved' ? "bg-emerald-500/20 text-emerald-400" :
                                "bg-gray-500/20 text-gray-400"
                              )}>{report.status}</span>
                            </div>
                            <p className="text-xs text-gray-400">Reported by: {report.reporterId || 'Anonymous'}</p>
                          </div>
                          {report.status === 'pending' && (
                            <div className="flex gap-2">
                              <button onClick={() => handleResolveReport(report.id, 'resolve')} className="p-2 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"><CheckCircle className="w-4 h-4" /></button>
                              <button onClick={() => handleResolveReport(report.id, 'dismiss')} className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
