import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, updateDoc, doc, where, getDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '@/src/lib/firebase';
import { motion } from 'motion/react';
import { LEGAL_SERVICES } from '@/src/constants/services';
import { Users, MessageSquare, Calendar, ShieldAlert, TrendingUp, ChevronRight, Ban, Loader2, Search, Shield, BookOpen, AlertCircle, Zap, ChevronDown, Filter, ListTodo, Plus, Trash2, Edit3, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { syncChatSummaryToCRM } from '@/src/services/crmService';
import { UserProfileModal } from './UserProfile';
import { AnimatePresence } from 'motion/react';

export const Dashboard: React.FC<{ onBack: () => void, onRequestService: (text: string) => void }> = ({ onBack, onRequestService }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeSessions: 0,
    hotLeads: 0,
    demoBookings: 0,
    spamRate: "2.4%"
  });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'MEDIUM', assignedTo: '' });
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingSpam, setIsProcessingSpam] = useState<string | null>(null);
  const [hiddenLines, setHiddenLines] = useState<string[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['business', 'protection', 'execution']);

  const CATEGORIES = [
    {
      id: 'business',
      name: 'Business & Ops',
      description: 'Optimize internal legal depts and structures.',
      serviceIds: ['CORPORATE_GOVERNANCE', 'LEGAL_OPS', 'LEGAL_OPS_AUTOMATION']
    },
    {
      id: 'protection',
      name: 'Protection & IP',
      description: 'Secure assets and global compliance.',
      serviceIds: ['COMPLIANCE', 'INTELLECTUAL_PROPERTY']
    },
    {
      id: 'execution',
      name: 'Execution & Disputes',
      description: 'Contracts and strategic resolution.',
      serviceIds: ['CONTRACT_SOLUTIONS', 'LITIGATION_SUPPORT']
    }
  ];

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => 
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setCurrentUser(userDoc.data());
        }
      }
    };
    fetchUser();
  }, []);

  const markAsSpam = async (lead: any) => {
    if (currentUser?.role === 'SUPPORT') return; // Access control
    setIsProcessingSpam(lead.id);
    try {
      // 1. Update Lead in Firestore
      await updateDoc(doc(db, 'leads', lead.id), {
        leadScore: 'SPAM',
        updatedAt: new Date().toISOString()
      });

      // 2. Fetch associated session for transcript
      const sessionsQ = query(collection(db, 'sessions'), where('leadId', '==', lead.id), limit(1));
      const sessionsSnap = await getDocs(sessionsQ);
      const transcript = !sessionsSnap.empty ? sessionsSnap.docs[0].data().messages : [];

      // 3. Sync to CRM
      await syncChatSummaryToCRM({
        leadEmail: lead.email,
        summary: "MARKED AS SPAM BY MODERATOR",
        transcript,
        status: 'SPAM'
      });

      // 4. Update local state
      setRecentLeads(prev => prev.map(l => l.id === lead.id ? { ...l, leadScore: 'SPAM' } : l));
      
    } catch (error) {
      console.error('Failed to mark as spam:', error);
    } finally {
      setIsProcessingSpam(null);
    }
  };

  const toggleLine = (e: any) => {
    const { dataKey } = e;
    setHiddenLines(prev => 
      prev.includes(dataKey) ? prev.filter(k => k !== dataKey) : [...prev, dataKey]
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        let leadsSnap;
        try {
          leadsSnap = await getDocs(collection(db, 'leads'));
        } catch (e) {
          handleFirestoreError(e, OperationType.LIST, 'leads');
          return;
        }

        let sessionsSnap;
        try {
          sessionsSnap = await getDocs(collection(db, 'sessions'));
        } catch (e) {
          handleFirestoreError(e, OperationType.LIST, 'sessions');
          return;
        }

        let consultsSnap;
        try {
          consultsSnap = await getDocs(collection(db, 'consultations'));
        } catch (e) {
          handleFirestoreError(e, OperationType.LIST, 'consultations');
          return;
        }

        const leads = leadsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sessionsData = sessionsSnap.docs.map(doc => {
          const data = doc.data();
          const lead = leads.find((l: any) => l.id === data.leadId);
          return {
            id: doc.id,
            ...data,
            leadName: lead?.name || 'Anonymous',
            leadEmail: lead?.email
          };
        }).sort((a: any, b: any) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });

        setSessions(sessionsData);
        const hotLeadsCount = leads.filter((l: any) => l.leadScore === 'HOT').length;

        setStats({
          totalLeads: leadsSnap.size,
          activeSessions: sessionsSnap.size,
          hotLeads: hotLeadsCount,
          demoBookings: consultsSnap.size,
          spamRate: "1.8%"
        });

        // Recent Leads
        const q = query(collection(db, 'leads'), orderBy('capturedAt', 'desc'), limit(5));
        const recentSnap = await getDocs(q);
        setRecentLeads(recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Service Requests
        const sreqPath = 'service_requests';
        try {
          const sreqQ = query(collection(db, sreqPath), orderBy('timestamp', 'desc'), limit(10));
          const sreqSnap = await getDocs(sreqQ);
          setServiceRequests(sreqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (sreqErr) {
          handleFirestoreError(sreqErr, OperationType.GET, sreqPath);
        }

        // Mock Chart Data (since we don't have day-by-day aggregation yet)
        setChartData([
          { name: 'Mon', leads: 4, bookings: 1 },
          { name: 'Tue', leads: 7, bookings: 2 },
          { name: 'Wed', leads: 5, bookings: 1 },
          { name: 'Thu', leads: 12, bookings: 5 },
          { name: 'Fri', leads: 8, bookings: 3 },
          { name: 'Sat', leads: 3, bookings: 0 },
          { name: 'Sun', leads: 2, bookings: 0 },
        ]);

        // Tasks
        try {
          const tasksSnap = await getDocs(query(collection(db, 'tasks'), orderBy('createdAt', 'desc')));
          setTasks(tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (taskErr) {
          console.error("Failed to fetch tasks", taskErr);
        }

      } catch (error) {
        console.error('Final dashboard fetch failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const taskData = {
        ...newTask,
        status: 'TODO',
        createdBy: auth.currentUser?.uid || 'unknown',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, 'tasks'), taskData);
      setTasks(prev => [{ id: docRef.id, ...taskData }, ...prev]);
      setNewTask({ title: '', description: '', priority: 'MEDIUM', assignedTo: '' });
      setIsAddingTask(false);
    } catch (err) {
      console.error("Failed to add task", err);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: newStatus,
        updatedAt: new Date()
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error("Failed to update task", err);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Loading Intelligence Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-white overflow-hidden">
      {/* Persistent Sidebar */}
      <aside className="w-72 shrink-0 border-r border-slate-200 flex flex-col bg-white hidden lg:flex">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Shield size={18} />
            </div>
            <h2 className="text-lg font-black tracking-tighter uppercase italic text-slate-800">Firm Services</h2>
          </div>
          <button 
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all",
              selectedCategory === null 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                : "bg-slate-50 text-slate-500 hover:bg-slate-100"
            )}
          >
            <div className="flex items-center gap-2">
              <Filter size={14} />
              <span>All Categories</span>
            </div>
            {selectedCategory === null && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className="space-y-1">
              <button 
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat.name}</span>
                  <p className="text-[9px] text-slate-500 font-medium leading-tight mt-0.5">{cat.description}</p>
                </div>
                <ChevronDown 
                  size={14} 
                  className={cn(
                    "text-slate-400 transition-transform", 
                    !expandedCategories.includes(cat.id) && "-rotate-90"
                  )} 
                />
              </button>

              <AnimatePresence>
                {expandedCategories.includes(cat.id) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-1 ml-2"
                  >
                    {cat.serviceIds.map(sid => {
                      const service = LEGAL_SERVICES[sid];
                      return (
                        <button
                          key={sid}
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setServiceSearchQuery(service.name);
                          }}
                          className={cn(
                            "w-full text-left p-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-between group",
                            serviceSearchQuery === service.name 
                              ? "bg-blue-50 text-blue-600 border border-blue-100" 
                              : "text-slate-600 hover:bg-slate-50 border border-transparent"
                          )}
                        >
                          <span className="truncate pr-2">{service.shortName}</span>
                          <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Pro Insights</p>
            <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
              Filter by category to refine analytics and spotlight specific legal initiatives.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex-1 p-8 bg-slate-50 overflow-y-auto">
      <UserProfileModal 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button 
                onClick={onBack}
                className="p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-500"
              >
                <ChevronRight className="rotate-180" size={20} />
              </button>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Back to Chat</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">LegalEase Intelligence</h1>
            <p className="text-slate-500 text-sm mt-1">Real-time performance metrics and lead qualification.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsProfileOpen(true)}
              className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-colors group"
            >
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                <Users size={14} />
              </div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Account Profile</span>
            </button>
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Live Updates</span>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard title="Total Leads" value={stats.totalLeads} icon={<Users className="text-blue-600" />} trend="+12%" />
          <StatCard title="Active Chats" value={stats.activeSessions} icon={<MessageSquare className="text-purple-600" />} trend="+5%" />
          <StatCard title="Qualified (HOT)" value={stats.hotLeads} icon={<TrendingUp className="text-emerald-600" />} trend="+20%" />
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'ATTORNEY') && (
            <>
              <StatCard title="Demo Bookings" value={stats.demoBookings} icon={<Calendar className="text-orange-600" />} trend="+8%" />
              <StatCard title="Spam Rate" value={stats.spamRate} icon={<ShieldAlert className="text-rose-600" />} trend="-0.5%" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'ATTORNEY') ? (
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Weekly Acquisition Trend</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[120px]">
                              <p className="font-bold mb-2 border-b border-white/10 pb-1">{label} Acquisition</p>
                              {payload.map((entry: any) => (
                                <div key={entry.name} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-slate-300">{entry.name}:</span>
                                  </div>
                                  <span className="font-mono font-bold">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      onClick={toggleLine}
                      wrapperStyle={{ paddingTop: '20px', cursor: 'pointer' }}
                    />
                    <Line 
                      name="Leads"
                      type="monotone" 
                      dataKey="leads" 
                      hide={hiddenLines.includes('leads')}
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 6, strokeWidth: 0 }} 
                    />
                    <Line 
                      name="Bookings"
                      type="monotone" 
                      dataKey="bookings" 
                      hide={hiddenLines.includes('bookings')}
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 6, strokeWidth: 0 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 bg-blue-600 rounded-2xl p-10 text-white flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-10">
                <Shield size={200} />
              </div>
              <h3 className="text-2xl font-serif italic mb-4">Support Access Level</h3>
              <p className="text-blue-100 max-w-md leading-relaxed">
                As a member of the Support Staff, you have access to real-time lead monitoring and chat transcripts. 
                Detailed strategy analytics and booking trends are reserved for Administrators and Attorneys.
              </p>
              <div className="mt-8 flex gap-4">
                <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <p className="text-[10px] uppercase font-bold text-blue-200">Session View</p>
                  <p className="text-lg font-bold">Enabled</p>
                </div>
                <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <p className="text-[10px] uppercase font-bold text-blue-200">Lead Search</p>
                  <p className="text-lg font-bold">Enabled</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {/* Recent Activity Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Latest Qualified Leads</h3>
              
              {/* Search Filter with Validation */}
              <div className="mb-4 relative">
                <div className="absolute left-3 top-2.5 text-slate-400">
                  <Search size={14} />
                </div>
                <input 
                  type="text" 
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {recentLeads.filter(l => l.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400">
                        {lead.name?.[0] || '?'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{lead.name || 'Anonymous'}</h4>
                        <p className="text-[10px] text-slate-400 font-medium">{lead.company || lead.email || 'No Contact Info'}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded text-[9px] font-bold uppercase",
                      lead.leadScore === 'HOT' ? "bg-emerald-100 text-emerald-700" : 
                      lead.leadScore === 'SPAM' ? "bg-rose-100 text-rose-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {lead.leadScore}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Requested Services Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Requested Services</h3>
                <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg">
                  <Zap size={14} />
                </div>
              </div>
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {serviceRequests
                  .filter(req => {
                    if (!selectedCategory) return true;
                    const cat = CATEGORIES.find(c => c.id === selectedCategory);
                    return cat?.serviceIds.some(sid => LEGAL_SERVICES[sid].name === req.serviceName);
                  })
                  .length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <div className="p-3 bg-slate-50 text-slate-300 rounded-full mb-3">
                      <BookOpen size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No matching requests</p>
                    <p className="text-[10px] text-slate-400 mt-1">Refine your category selection</p>
                  </div>
                ) : (
                  serviceRequests
                    .filter(req => {
                      if (!selectedCategory) return true;
                      const cat = CATEGORIES.find(c => c.id === selectedCategory);
                      return cat?.serviceIds.some(sid => LEGAL_SERVICES[sid].name === req.serviceName);
                    })
                    .map((req) => (
                    <div key={req.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all group">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{req.serviceName}</h4>
                        <span className="text-[9px] font-mono text-slate-400">
                          {req.timestamp?.seconds ? new Date(req.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={12} className="text-slate-400" />
                        <p className="text-[11px] font-medium text-slate-600">{req.leadName || 'Anonymous'}</p>
                        <span className="text-slate-300">•</span>
                        <p className="text-[10px] text-slate-400">{req.leadEmail}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Internal Firm Tasks Section */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-slate-100 text-slate-800 rounded-lg">
                  <ListTodo size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Firm Operations Tracker</h3>
              </div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Internal task management and priority escalation</p>
            </div>
            
            <button 
              onClick={() => setIsAddingTask(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Plus size={16} />
              <span>Create Task</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['TODO', 'IN_PROGRESS', 'DONE'].map((status) => (
              <div key={status} className="flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      status === 'TODO' ? "bg-slate-400" : status === 'IN_PROGRESS' ? "bg-blue-500 animate-pulse" : "bg-emerald-500"
                    )} />
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{status.replace('_', ' ')}</h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-300">{tasks.filter(t => t.status === status).length}</span>
                </div>
                
                <div className="space-y-4 bg-slate-50/50 p-4 rounded-2xl flex-1 border border-slate-100/50">
                  {tasks.filter(t => t.status === status).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                      <Clock size={24} className="opacity-20" />
                      <p className="text-[10px] font-bold uppercase tracking-widest mt-2">{status === 'TODO' ? 'Empty Queue' : 'No Active Tasks'}</p>
                    </div>
                  ) : (
                    tasks.filter(t => t.status === status).map((task) => (
                      <motion.div 
                        layoutId={task.id}
                        key={task.id} 
                        className={cn(
                          "p-4 bg-white rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all group relative",
                          task.priority === 'HIGH' ? "border-l-rose-500" : task.priority === 'MEDIUM' ? "border-l-orange-400" : "border-l-blue-400"
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={cn(
                            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest",
                            task.priority === 'HIGH' ? "bg-rose-50 text-rose-600" : task.priority === 'MEDIUM' ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {task.priority} Priority
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => deleteTask(task.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <h5 className="text-[11px] font-bold text-slate-800 line-clamp-1">{task.title}</h5>
                        {task.description && <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>}
                        
                        <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                          <div className="flex gap-1">
                            {status !== 'TODO' && (
                              <button 
                                onClick={() => updateTaskStatus(task.id, status === 'DONE' ? 'IN_PROGRESS' : 'TODO')}
                                className="p-1 bg-slate-50 text-slate-400 rounded hover:bg-slate-100 transition-colors"
                              >
                                <ChevronRight size={12} className="rotate-180" />
                              </button>
                            )}
                            {status !== 'DONE' && (
                              <button 
                                onClick={() => updateTaskStatus(task.id, status === 'TODO' ? 'IN_PROGRESS' : 'DONE')}
                                className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                              >
                                <ChevronRight size={12} />
                              </button>
                            )}
                          </div>
                          {status === 'DONE' && <CheckCircle size={14} className="text-emerald-500" />}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legal Services Catalog Section */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <BookOpen size={16} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Legal Services Catalog</h3>
              </div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Internal knowledge base for firm capabilities</p>
            </div>
            
            <div className="relative w-full md:w-80">
              <div className="absolute left-3 top-2.5 text-slate-400">
                <Search size={16} />
              </div>
              <input 
                type="text" 
                placeholder="Search services by name, tagline, description, or features..."
                value={serviceSearchQuery}
                onChange={(e) => setServiceSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          {(() => {
            const filtered = Object.values(LEGAL_SERVICES).filter(s => {
              const query = serviceSearchQuery.toLowerCase();
              const categoryMatch = selectedCategory 
                ? CATEGORIES.find(c => c.id === selectedCategory)?.serviceIds.includes(s.id)
                : true;

              return categoryMatch && (
                s.name.toLowerCase().includes(query) || 
                s.tagline.toLowerCase().includes(query) ||
                s.description.toLowerCase().includes(query) ||
                s.features.some(f => f.title.toLowerCase().includes(query))
              );
            });

            if (filtered.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="p-4 bg-white rounded-full shadow-sm text-slate-300 mb-4">
                    <AlertCircle size={32} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">No Services Match Your Search</h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[240px] text-center leading-relaxed">
                    Try using different keywords or clear the search to view all {Object.keys(LEGAL_SERVICES).length} firm services.
                  </p>
                  <button 
                    onClick={() => setServiceSearchQuery('')}
                    className="mt-6 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                  >
                    Clear Search Query
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filtered.map((service) => (
                  <div key={service.id} className="p-5 border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/20 transition-all group flex flex-col h-full bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Zap size={16} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">#{service.id.slice(0, 4)}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1">{service.name}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed flex-1">
                      {service.tagline}
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{service.features.length} Key Features</span>
                      <button 
                        onClick={() => onRequestService(`I'm interested in the "${service.name}" service. Can you provide more details on how to get started?`)}
                        className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-1 group/btn"
                      >
                        Request
                        <ChevronRight size={10} className="group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Chat History Section */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Chat History</h3>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">Audit log of all AI-Client interactions</p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg uppercase tracking-wider">Total: {sessions.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 italic">
                  <th className="pb-4 pt-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Session ID</th>
                  <th className="pb-4 pt-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lead Name</th>
                  <th className="pb-4 pt-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="pb-4 pt-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Updated</th>
                  <th className="pb-4 pt-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sessions.slice(0, 10).map((session) => (
                  <tr key={session.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4">
                      <span className="text-xs font-mono text-slate-400">#{session.id.slice(-6)}</span>
                    </td>
                    <td className="py-4">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{session.leadName}</p>
                      <p className="text-[10px] text-slate-400">{session.leadEmail || 'No email associated'}</p>
                    </td>
                    <td className="py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                        session.status === 'completed' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700 animate-pulse"
                      )}>
                        {session.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="text-xs text-slate-500 font-medium">
                        {session.updatedAt?.seconds ? new Date(session.updatedAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={() => setSelectedSession(session)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sessions.length > 10 && (
            <div className="mt-8 pt-6 border-t border-slate-50 text-center">
              <p className="text-[10px] text-slate-400 font-medium">Showing 10 of {sessions.length} total sessions. Use the enterprise audit portal for full logs.</p>
            </div>
          )}
        </div>
      </div>

      {/* Session Details Modal Overlay */}
      <AnimatePresence>
        {selectedSession && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setSelectedSession(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500 rounded-2xl">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-serif italic">Session Intelligence Report</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Session #{selectedSession.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Search className="rotate-45" size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Client Information</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Name</p>
                          <p className="text-sm font-bold text-slate-900">{selectedSession.leadName}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Session Status</p>
                          <p className={cn(
                            "text-sm font-bold capitalize mt-1",
                            selectedSession.status === 'completed' ? "text-blue-600" : "text-emerald-500"
                          )}>{selectedSession.status}</p>
                        </div>
                      </div>
                    </div>

                    {selectedSession.summary && (
                      <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-xl shadow-blue-500/20">
                        <h4 className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-4">AI Insight Summary</h4>
                        <div className="text-xs leading-relaxed whitespace-pre-wrap font-medium">
                          {selectedSession.summary}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Chat Transcript</h4>
                      <span className="text-[10px] text-slate-300 font-bold">{selectedSession.messages?.length || 0} Messages</span>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-slate-50/30">
                      {selectedSession.messages?.map((msg: any, i: number) => (
                        <div key={i} className={cn(
                          "max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed",
                          msg.role === 'user' 
                            ? "bg-slate-100 text-slate-700 ml-auto" 
                            : "bg-white border border-slate-200 text-slate-800 shadow-sm"
                        )}>
                          <p className="text-[8px] font-bold uppercase tracking-widest mb-1 opacity-50">
                            {msg.role === 'user' ? 'Client' : 'Assistant'}
                          </p>
                          {msg.content}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingTask && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4"
            onClick={() => setIsAddingTask(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500 rounded-2xl">
                    <ListTodo size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-serif italic">New Firm Task</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Priority Resource Allocation</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddTask} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Task Title</label>
                    <input 
                      autoFocus
                      required
                      type="text" 
                      placeholder="e.g. Finalize Merger Disclosure Schedules"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Notes / Description</label>
                    <textarea 
                      placeholder="Add context for the attorney team..."
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all min-h-[100px] resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {['LOW', 'MEDIUM', 'HIGH'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewTask({ ...newTask, priority: p })}
                        className={cn(
                          "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                          newTask.priority === p 
                            ? (p === 'HIGH' ? "bg-rose-50 border-rose-500 text-rose-600" : p === 'MEDIUM' ? "bg-orange-50 border-orange-400 text-orange-600" : "bg-blue-50 border-blue-400 text-blue-600")
                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-50 transition-all uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 uppercase tracking-widest"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
};

const StatCard = ({ title, value, icon, trend }: { title: string, value: any, icon: React.ReactNode, trend: string }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      <span className={cn(
        "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
        trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
      )}>{trend}</span>
    </div>
    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
  </div>
);

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
