import React from 'react';
import { ShieldAlert, LogOut, Mail } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { authService } from '../../services/api';

interface MutedScreenProps {
  user: any;
  onLogout: () => void;
}

export const MutedScreen: React.FC<MutedScreenProps> = ({ user, onLogout }) => {
  const { t } = useLanguage();

  const handleLogout = () => {
    authService.logout();
    onLogout();
  };

  const reason = user?.mute_reason || t('admin.mute_reason_ph');
  const until = user?.muted_until
    ? new Date(user.muted_until).toLocaleString()
    : t('admin.mute_perm');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-red-100 text-center relative overflow-hidden">
        {/* Top Warning Banner Accent */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />

        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 shadow-inner">
          <ShieldAlert className="w-10 h-10 animate-bounce" />
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-2">
          {t('muted.title')}
        </h2>
        <p className="text-slate-600 mb-6 text-sm">
          {t('muted.notice')}
        </p>

        <div className="bg-red-50/80 border border-red-200 rounded-2xl p-5 mb-6 text-left space-y-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-red-700 block mb-1">
              {t('muted.reason_label')}
            </span>
            <p className="text-sm font-medium text-red-950 bg-white/70 p-3 rounded-xl border border-red-100">
              "{reason}"
            </p>
          </div>

          <div className="pt-2 border-t border-red-200/60 flex justify-between items-center">
            <span className="text-xs font-medium text-slate-600">
              {t('muted.until_label')}
            </span>
            <span className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-lg">
              {until}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-6 flex items-center justify-center gap-1">
          <Mail className="w-4 h-4 text-slate-400" />
          {t('muted.contact')}
        </p>

        <button
          onClick={handleLogout}
          className="w-full py-3.5 px-6 rounded-2xl font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          {t('nav.logout')}
        </button>
      </div>
    </div>
  );
};
