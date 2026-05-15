
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Building2, Save, X, Loader2, CheckCircle2, ShieldAlert, LogOut, Shield } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface UserProfileData {
  name: string;
  email: string;
  company: string;
  role: 'ADMIN' | 'ATTORNEY' | 'SUPPORT';
}

export const UserProfileModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState<UserProfileData>({ name: '', email: '', company: '', role: 'ATTORNEY' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    let unsubscribe: () => void;
    
    if (isOpen) {
      setIsLoading(true);
      unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          fetchProfile(user.uid);
        } else {
          setIsLoading(false);
        }
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen]);

  const fetchProfile = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setProfile(userDoc.data() as UserProfileData);
      } else {
        // Pre-fill with Auth data if profile doesn't exist
        const currentUser = auth.currentUser;
        setProfile({
          name: currentUser?.displayName || '',
          email: currentUser?.email || '',
          company: '',
          role: 'ATTORNEY' // Default role for new users
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!profile.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (profile.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!profile.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onClose();
      // App state will naturally handle view change if App.tsx listens to auth changes, 
      // but here we might need to Refresh or redirect.
      window.location.reload(); 
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    if (!auth.currentUser || !validate()) return;
    
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        name: profile.name.trim(),
        email: profile.email.trim(),
        company: profile.company.trim(),
        role: profile.role,
        updatedAt: serverTimestamp()
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveError('Failed to save profile. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Attorney Profile</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Account Settings</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                  <p className="text-sm font-medium text-slate-400">Loading profile data...</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Name Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <User size={12} /> Full Name
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g., Jonathan Harker"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className={cn(
                        "w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm outline-none transition-all",
                        errors.name ? "border-rose-300 ring-4 ring-rose-500/5" : "border-slate-200 focus:ring-4 focus:ring-blue-500/5"
                      )}
                    />
                    {errors.name && <p className="text-[10px] text-rose-500 font-bold">{errors.name}</p>}
                  </div>

                  {/* Email Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Mail size={12} /> Email Address
                    </label>
                    <input 
                      type="email"
                      placeholder="e.g., jharker@lawfirm.com"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className={cn(
                        "w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm outline-none transition-all",
                        errors.email ? "border-rose-300 ring-4 ring-rose-500/5" : "border-slate-200 focus:ring-4 focus:ring-blue-500/5"
                      )}
                    />
                    {errors.email && <p className="text-[10px] text-rose-500 font-bold">{errors.email}</p>}
                  </div>

                  {/* Role Display (Non-editable) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Shield size={12} /> Access Level / Role
                    </label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl">
                      <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        profile.role === 'ADMIN' ? "bg-rose-500" :
                        profile.role === 'ATTORNEY' ? "bg-blue-500" : "bg-emerald-500"
                      )} />
                      <span className="text-sm font-black text-slate-700 tracking-wider">
                        {profile.role}
                      </span>
                      <span className="ml-auto text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 px-2 py-0.5 rounded-md bg-white">
                        System Assigned
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium italic mt-1 px-1">
                      Role-based access controls are managed by organization administrators.
                    </p>
                  </div>

                  {/* Company Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Building2 size={12} /> Law Firm / Company
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g., LegalEase Solutions"
                      value={profile.company}
                      onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/5"
                    />
                  </div>

                  {saveError && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-bold"
                    >
                      <ShieldAlert size={16} />
                      {saveError}
                    </motion.div>
                  )}

                  {showSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-bold"
                    >
                      <CheckCircle2 size={16} />
                      Profile updated successfully!
                    </motion.div>
                  )}

                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : (
                      <>
                        <Save size={18} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={handleLogout}
                    className="w-full py-4 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] mt-2"
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
