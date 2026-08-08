import React, { useState, useEffect } from 'react';
import { User as UserIcon, Briefcase, Search, FileText, Mail, Sparkles, LogIn, Lock, UserCheck, Heart } from 'lucide-react';
import { getSavedUserProfile, DEFAULT_USER_AVATAR } from '../../services/matchService';
import { useLanguage } from '../../i18n/LanguageContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user?: any;
  onOpenAuth?: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  user,
  onOpenAuth,
}) => {
  const { t } = useLanguage();
  const [profileAvatar, setProfileAvatar] = useState<string>(DEFAULT_USER_AVATAR);
  const [candidateName, setCandidateName] = useState<string>(t('nav.guest'));
  const [candidatePosition, setCandidatePosition] = useState<string>(t('nav.not_logged_in'));

  const updateLocalProfile = () => {
    if (!user) {
      setCandidateName(t('nav.guest'));
      setCandidatePosition(t('nav.not_logged_in'));
      setProfileAvatar(DEFAULT_USER_AVATAR);
      return;
    }

    const saved = getSavedUserProfile(user);
    if (saved) {
      setProfileAvatar(saved.avatar_url || user?.avatar_url || DEFAULT_USER_AVATAR);
      setCandidateName(saved.full_name || user?.full_name || user?.username || t('admin.role_worker'));
      setCandidatePosition(saved.position || (user?.role === 'employer' ? t('nav.employer_role') : t('nav.specialist_role')));
    } else {
      setProfileAvatar(user?.avatar_url || DEFAULT_USER_AVATAR);
      setCandidateName(user?.full_name || user?.username || t('admin.role_worker'));
      setCandidatePosition(user?.role === 'employer' ? t('nav.employer_role') : t('nav.specialist_role'));
    }
  };

  useEffect(() => {
    updateLocalProfile();

    const handleProfileChange = () => {
      updateLocalProfile();
    };

    window.addEventListener('ergon_profile_updated', handleProfileChange);
    window.addEventListener('storage', handleProfileChange);
    return () => {
      window.removeEventListener('ergon_profile_updated', handleProfileChange);
      window.removeEventListener('storage', handleProfileChange);
    };
  }, [user, t]);

  const allNavItems = [
    { id: 'profile', label: user?.role === 'employer' ? t('nav.company_profile') : t('nav.my_profile'), icon: UserIcon, protected: true },
    ...(user?.role === 'employer' ? [{ id: 'employer', label: t('nav.publish_jobs'), icon: Briefcase, protected: true }] : []),
    ...(user?.role !== 'employer' ? [{ id: 'resumes', label: t('nav.ai_resumes'), icon: Sparkles, protected: true }] : []),
    { id: 'jobs', label: user?.role === 'employer' ? t('nav.all_candidates') : t('nav.all_jobs'), icon: user?.role === 'employer' ? UserCheck : Search, protected: false },
    { id: 'favorites', label: 'Избранное', icon: Heart, protected: false },
    { id: 'applications', label: t('nav.applications'), icon: FileText, protected: true },
    { id: 'chat', label: t('nav.messages'), icon: Mail, protected: true },
  ];

  const handleNavClick = (itemId: string, isProtected: boolean) => {
    if (isProtected && !user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    setActiveTab(itemId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-6 min-h-[calc(100vh-5rem)]">
      
      {/* Left Sidebar */}
      <aside className="w-full md:w-64 shrink-0 ref-card p-4 flex flex-col justify-between h-auto md:h-[calc(100vh-7rem)] sticky top-20">
        
        <div className="space-y-5">
          
          {/* User profile summary or Guest Card */}
          {user ? (
            <div 
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 dark:from-slate-800/90 dark:via-slate-800 dark:to-slate-800/80 border border-indigo-100/80 dark:border-slate-700 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-xs transition-all group"
            >
              <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-indigo-600 via-purple-500 to-amber-400 shrink-0 shadow-sm">
                <img 
                  src={profileAvatar} 
                  alt="Avatar" 
                  className="w-full h-full rounded-full object-cover bg-white dark:bg-slate-900"
                />
              </div>
              <div className="overflow-hidden flex-1">
                <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                  {candidateName}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                  {candidatePosition}
                </p>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => onOpenAuth && onOpenAuth()}
              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white cursor-pointer hover:shadow-md transition-all group shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                <LogIn className="w-5 h-5" />
              </div>
              <div className="overflow-hidden flex-1">
                <h3 className="text-xs font-black truncate">{t('nav.guest_login')}</h3>
                <p className="text-[10px] text-indigo-100 font-semibold truncate flex items-center gap-1">
                  <span>{t('nav.login')}</span> →
                </p>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">{t('nav.dashboard_title')}</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('nav.career_management')}</p>
          </div>

          {/* Navigation links */}
          <nav className="space-y-1">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id, item.protected)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.protected && !user && (
                    <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-amber-500" />
                  )}
                </button>
              );
            })}
          </nav>

        </div>

        {/* Bottom AI Consultant Dedicated Button */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 mt-auto">
          <button
            onClick={() => setActiveTab('ai_consultant')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-extrabold transition-all shadow-xs ${
              activeTab === 'ai_consultant'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/60'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${activeTab === 'ai_consultant' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
            <span>{t('nav.ai_consultant')}</span>
          </button>
        </div>

      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden animate-fade-in">
        {children}
      </main>

    </div>
  );
};
