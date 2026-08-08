import React, { useState, useEffect } from 'react';
import { 
  Users, Briefcase, FileText, Send, RefreshCw, Shield, ShieldAlert, 
  Search, CheckCircle, Clock, AlertTriangle, UserCheck, UserX, ChevronRight, X
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminService } from '../../services/api';

interface AdminDashboardProps {
  user: any;
  onOpenAuth: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onOpenAuth }) => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingTg, setSyncingTg] = useState(false);
  const [syncingYora, setSyncingYora] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  
  // Mute Modal State
  const [muteModalUser, setMuteModalUser] = useState<any>(null);
  const [muteDuration, setMuteDuration] = useState<number>(24); // hours
  const [muteReason, setMuteReason] = useState<string>('');
  const [submittingMute, setSubmittingMute] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers({ q: searchQuery, role: selectedRole, limit: 50 })
      ]);
      setStats(statsData);
      setUsers(usersData.items || []);
    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadData();
    }
  }, [user, searchQuery, selectedRole]);

  const handleSyncTelegram = async () => {
    setSyncingTg(true);
    try {
      await adminService.syncTelegram(5);
      await loadData();
    } catch (err) {
      console.error('Error syncing Telegram:', err);
    } finally {
      setSyncingTg(false);
    }
  };

  const handleSyncYora = async () => {
    setSyncingYora(true);
    try {
      await adminService.syncYora(3);
      await loadData();
    } catch (err) {
      console.error('Error syncing Yora:', err);
    } finally {
      setSyncingYora(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    try {
      await adminService.updateUserRole(targetUserId, newRole);
      await loadData();
    } catch (err) {
      console.error('Error changing user role:', err);
    }
  };

  const handleOpenMuteModal = (u: any) => {
    setMuteModalUser(u);
    setMuteDuration(24);
    setMuteReason('');
  };

  const handleConfirmMute = async () => {
    if (!muteModalUser) return;
    setSubmittingMute(true);
    try {
      await adminService.muteUser(muteModalUser.id, {
        duration_hours: muteDuration > 0 ? muteDuration : undefined,
        reason: muteReason || 'Нарушение правил сайта'
      });
      setMuteModalUser(null);
      await loadData();
    } catch (err) {
      console.error('Error muting user:', err);
    } finally {
      setSubmittingMute(false);
    }
  };

  const handleUnmute = async (targetUserId: string) => {
    try {
      await adminService.unmuteUser(targetUserId);
      await loadData();
    } catch (err) {
      console.error('Error unmuting user:', err);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-950/60 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Доступ ограничен</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Эта панель предназначена только для главного администратора системы.</p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
        >
          Войти как Суперадмин
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3 border border-indigo-500/30">
              <Shield className="w-3.5 h-3.5" />
              {t('admin.title')}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
              Центр управления HamKor
            </h1>
            <p className="text-slate-300 max-w-2xl text-sm sm:text-base">
              {t('admin.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSyncTelegram}
              disabled={syncingTg}
              className="px-5 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm shadow-lg shadow-sky-500/25 flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${syncingTg ? 'animate-spin' : ''}`} />
              {syncingTg ? 'Парсинг...' : t('admin.sync_telegram_btn')}
            </button>

            <button
              onClick={handleSyncYora}
              disabled={syncingYora}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncingYora ? 'animate-spin' : ''}`} />
              {syncingYora ? 'Парсинг...' : t('admin.sync_yora_btn')}
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Users Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full">
                Всего: {stats.users.total}
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">{stats.users.total}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('admin.stat_users')}</p>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700 pt-3">
              <div className="flex justify-between">
                <span>{t('admin.stat_candidates')}:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{stats.users.candidates}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('admin.stat_employers')}:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{stats.users.employers}</span>
              </div>
              <div className="flex justify-between text-red-600 dark:text-red-400">
                <span>{t('admin.stat_muted')}:</span>
                <span className="font-bold">{stats.users.muted}</span>
              </div>
            </div>
          </div>

          {/* Jobs Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center font-bold">
                <Briefcase className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full">
                Активно: {stats.jobs.active}
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">{stats.jobs.total}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('admin.stat_jobs')}</p>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700 pt-3">
              <div className="flex justify-between">
                <span>Прямые вакансии:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{stats.jobs.direct}</span>
              </div>
              <div className="flex justify-between text-sky-600 dark:text-sky-400">
                <span>Telegram (Kortj1):</span>
                <span className="font-bold">{stats.jobs.telegram_kortj1}</span>
              </div>
              <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                <span>Yora.tj:</span>
                <span className="font-bold">{stats.jobs.yora_tj}</span>
              </div>
            </div>
          </div>

          {/* Telegram Parser Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-2xl flex items-center justify-center font-bold">
                <Send className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded-full">
                LIVE
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">{stats.jobs.telegram_kortj1}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('admin.stat_telegram')}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3">
              Авто-парсер парсит абсолютно все публикации с t.me/Kortj1 и обновляет список вакансий.
            </p>
          </div>

          {/* Applications Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center font-bold">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-full">
                {stats.applications.pending} на рассмотрении
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">{stats.applications.total}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('admin.stat_applications')}</p>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700 pt-3">
              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                <span>В ожидании:</span>
                <span className="font-bold">{stats.applications.pending}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Принято:</span>
                <span className="font-bold">{stats.applications.accepted}</span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400">
                <span>Отклонено:</span>
                <span className="font-bold">{stats.applications.rejected}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Parsed Vacancy Sources Analytics Banner */}
      {stats && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-700/60">
            <div>
              <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-sky-400" />
                Статистика источников вакансий и парсинга
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Точный реальный учет парсингованных данных из Telegram-канала Kortj1 и портала Yora.tj
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Авто-парсер активен
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Telegram Kortj1 Source Card */}
            <div className="bg-slate-800/80 border border-sky-500/30 rounded-2xl p-5 hover:border-sky-400 transition relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-sky-500/10 rounded-full blur-xl group-hover:bg-sky-500/20 transition" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold px-2.5 py-1 bg-sky-500/20 text-sky-300 rounded-lg border border-sky-500/30 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  t.me/Kortj1
                </span>
                <span className="text-xs text-slate-400 font-medium">Telegram</span>
              </div>
              <div className="text-3xl font-black text-white mb-1">
                {stats.jobs.telegram_kortj1}
              </div>
              <p className="text-xs text-slate-300 font-medium mb-4">
                Запарсено реальных вакансий из Telegram
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-slate-700/60 text-xs">
                <span className="text-slate-400">Доля от внешних:</span>
                <span className="font-bold text-sky-400">
                  {stats.jobs.external > 0 ? ((stats.jobs.telegram_kortj1 / stats.jobs.external) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <button
                onClick={handleSyncTelegram}
                disabled={syncingTg}
                className="mt-4 w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingTg ? 'animate-spin' : ''}`} />
                {syncingTg ? 'Парсинг...' : 'Синхронизировать Telegram'}
              </button>
            </div>

            {/* Yora.tj Source Card */}
            <div className="bg-slate-800/80 border border-indigo-500/30 rounded-2xl p-5 hover:border-indigo-400 transition relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/30 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  yora.tj
                </span>
                <span className="text-xs text-slate-400 font-medium">Веб-портал</span>
              </div>
              <div className="text-3xl font-black text-white mb-1">
                {stats.jobs.yora_tj}
              </div>
              <p className="text-xs text-slate-300 font-medium mb-4">
                Запарсено реальных вакансий из Yora.tj
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-slate-700/60 text-xs">
                <span className="text-slate-400">Доля от внешних:</span>
                <span className="font-bold text-indigo-400">
                  {stats.jobs.external > 0 ? ((stats.jobs.yora_tj / stats.jobs.external) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <button
                onClick={handleSyncYora}
                disabled={syncingYora}
                className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingYora ? 'animate-spin' : ''}`} />
                {syncingYora ? 'Парсинг...' : 'Синхронизировать Yora.tj'}
              </button>
            </div>

            {/* Direct HamKor Employers Card */}
            <div className="bg-slate-800/80 border border-emerald-500/30 rounded-2xl p-5 hover:border-emerald-400 transition relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Прямые работодатели
                </span>
                <span className="text-xs text-slate-400 font-medium">HamKor Platform</span>
              </div>
              <div className="text-3xl font-black text-white mb-1">
                {stats.jobs.direct}
              </div>
              <p className="text-xs text-slate-300 font-medium mb-4">
                Создано напрямую работодателями на сайте
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-slate-700/60 text-xs mt-auto">
                <span className="text-slate-400">Доля от всех вакансий:</span>
                <span className="font-bold text-emerald-400">
                  {stats.jobs.total > 0 ? ((stats.jobs.direct / stats.jobs.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {t('admin.users_tab')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Управление ролями и блокировками пользователей HamKor
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('admin.search_user_ph')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter Role */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="">Все роли</option>
              <option value="worker">{t('admin.role_worker')}</option>
              <option value="employer">{t('admin.role_employer')}</option>
              <option value="admin">{t('admin.role_admin')}</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-100 dark:border-slate-700 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">{t('admin.table_user')}</th>
                <th className="py-3.5 px-4">{t('admin.table_role')}</th>
                <th className="py-3.5 px-4">{t('admin.table_status')}</th>
                <th className="py-3.5 px-4">{t('admin.table_created')}</th>
                <th className="py-3.5 px-6 text-right">{t('admin.table_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/50 transition">
                  {/* User info */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow">
                        {u.full_name ? u.full_name[0].toUpperCase() : u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {u.full_name || u.username}
                        </div>
                        <div className="text-slate-400 text-xs">{u.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role Selector */}
                  <td className="py-4 px-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="worker">{t('admin.role_worker')}</option>
                      <option value="employer">{t('admin.role_employer')}</option>
                      <option value="admin">{t('admin.role_admin')}</option>
                    </select>
                  </td>

                  {/* Mute status */}
                  <td className="py-4 px-4">
                    {u.is_muted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Мут ({u.muted_until ? new Date(u.muted_until).toLocaleDateString() : 'Абадӣ'})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Активный
                      </span>
                    )}
                  </td>

                  {/* Created date */}
                  <td className="py-4 px-4 text-slate-400 text-xs">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-6 text-right">
                    {u.is_muted ? (
                      <button
                        onClick={() => handleUnmute(u.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 font-bold transition text-xs inline-flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {t('admin.action_unmute')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenMuteModal(u)}
                        className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 font-bold transition text-xs inline-flex items-center gap-1"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        {t('admin.action_mute')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mute Dialog Modal */}
      {muteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 relative animate-in fade-in zoom-in">
            <button
              onClick={() => setMuteModalUser(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center font-bold">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                  {t('admin.mute_dialog_title')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {muteModalUser.full_name || muteModalUser.username} ({muteModalUser.email})
                </p>
              </div>
            </div>

            {/* Mute Duration Selection */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t('admin.mute_duration_label')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: t('admin.mute_1h'), hours: 1 },
                  { label: t('admin.mute_24h'), hours: 24 },
                  { label: t('admin.mute_7d'), hours: 168 },
                  { label: t('admin.mute_30d'), hours: 720 },
                  { label: t('admin.mute_perm'), hours: 0 },
                ].map((item) => (
                  <button
                    key={item.hours}
                    type="button"
                    onClick={() => setMuteDuration(item.hours)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center ${
                      muteDuration === item.hours
                        ? 'bg-red-600 border-red-600 text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mute Reason Input */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t('admin.mute_reason_label')}
              </label>
              <textarea
                rows={3}
                placeholder={t('admin.mute_reason_ph')}
                value={muteReason}
                onChange={(e) => setMuteReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMuteModalUser(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {t('admin.cancel')}
              </button>
              <button
                type="button"
                disabled={submittingMute}
                onClick={handleConfirmMute}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/20"
              >
                {submittingMute ? 'Захват...' : t('admin.confirm_mute')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
