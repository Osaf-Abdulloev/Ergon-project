import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, DollarSign, Filter, RefreshCw, UserCheck, CheckCircle2, Sparkles, Building2, Eye, Award, ExternalLink, MessageSquare } from 'lucide-react';
import { candidateService } from '../../services/api';
import { Candidate } from '../../types';
import { CandidateDetailModal } from './CandidateDetailModal';
import { ContactCandidateModal } from './ContactCandidateModal';
import { 
  getSavedEmployerProfile, 
  evaluateEmployerCandidateMatch, 
  sortCandidatesByEmployerMatch 
} from '../../services/matchService';

import { useLanguage } from '../../i18n/LanguageContext';

interface CandidatesCatalogProps {
  user?: any;
  onOpenAuth?: () => void;
  onNavigateToPostJob?: () => void;
  onOpenChat?: (chatId: string) => void;
}

export const CandidatesCatalog: React.FC<CandidatesCatalogProps> = ({
  user,
  onOpenAuth,
  onNavigateToPostJob,
  onOpenChat
}) => {
  const { t } = useLanguage();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [contactCandidate, setContactCandidate] = useState<Candidate | null>(null);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const res = await candidateService.getCandidates({ limit: 100 });
      setCandidates(res.items || []);
    } catch (err) {
      console.error('Error loading candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const handleSyncYora = async () => {
    setSyncing(true);
    try {
      await candidateService.syncYoraCandidates();
      await loadCandidates();
    } catch (err) {
      console.error('Error syncing yora candidates:', err);
    } finally {
      setSyncing(false);
    }
  };

  const employerProfile = useMemo(() => {
    return getSavedEmployerProfile(user);
  }, [user]);

  const filteredCandidates = useMemo(() => {
    const filtered = candidates.filter((c) => {
      const u: any = c.user || {};
      const fullName = (u.full_name || u.username || '').toLowerCase();
      const pos = (c.desired_position || '').toLowerCase();
      const city = (u.city || '').toLowerCase();
      const skills = (c.skills || []).map((s) => s.name.toLowerCase()).join(' ');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || fullName.includes(q) || pos.includes(q) || skills.includes(q);

      const matchesCity = selectedCity === 'all' || city.includes(selectedCity.toLowerCase());

      return matchesSearch && matchesCity;
    });

    return sortCandidatesByEmployerMatch(filtered, employerProfile);
  }, [candidates, searchQuery, selectedCity, employerProfile]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Employer Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 p-8 sm:p-12 text-white shadow-xl">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-80 h-80 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-xs sm:text-sm font-extrabold shadow-inner border border-white/20">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>База соискателей Таджикистана</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Ваши будущие сотрудники — здесь
          </h1>

          <p className="text-sm sm:text-lg text-indigo-100 font-medium max-w-2xl mx-auto leading-relaxed">
            Размещайте вакансии и находите будущих коллег среди лучших кандидатов с реальными данными и анкетными фото из yora.tj
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            {onNavigateToPostJob && (
              <button
                onClick={onNavigateToPostJob}
                className="px-8 py-4 rounded-2xl bg-white text-indigo-700 hover:bg-slate-50 font-black text-sm sm:text-base shadow-xl transition-all active:scale-95 flex items-center gap-2"
              >
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span>Разместить вакансию</span>
              </button>
            )}

            <button
              onClick={handleSyncYora}
              disabled={syncing}
              className="px-6 py-4 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 border border-white/20"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Синхронизация yora.tj...' : 'Обновить из yora.tj'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* Search Field */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по должности, имени или навыкам (например: Бухгалтер, Developer, HR)..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
          </div>

          {/* City Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <MapPin className="w-5 h-5 text-slate-400 hidden sm:block" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full sm:w-48 px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            >
              <option value="all">Все города</option>
              <option value="душанбе">г. Душанбе</option>
              <option value="худжанд">г. Худжанд</option>
              <option value="бохтар">г. Бохтар</option>
            </select>
          </div>

        </div>

        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">
          <span>Найдено соискателей: <strong className="text-purple-700 dark:text-purple-400">{filteredCandidates.length}</strong></span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Реальные анкеты yora.tj
          </span>
        </div>
      </div>

      {/* Candidate Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 dark:border-t-purple-400 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Загрузка соискателей с yora.tj...</p>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 p-8 space-y-4">
          <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">Соискатели не найдены</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Попробуйте изменить поисковый запрос или обновить список соискателей кнопкой выше.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((c) => {
            const u: any = c.user || {};
            const fullName = u.full_name || u.username || 'Соискатель';
            const avatarUrl = u.avatar_url;
            const position = c.desired_position || 'Специалист';
            const salary = c.desired_salary;
            const city = u.city || 'Душанбе';
            const skills = c.skills || [];
            const isCandidateExternal = c.is_external || !c.user_id || !!c.external_source;

            return (
              <div
                key={c.id}
                className="group relative bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Candidate Header */}
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    {/* Photo */}
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-0.5 overflow-hidden shadow-md">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={fullName}
                            className="w-full h-full object-cover rounded-xl"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-700 dark:text-purple-300 font-black text-xl">
                            {fullName[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800" title="Активен" />
                    </div>

                    {/* Name & Position */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 mb-0.5">
                        🎯 {evaluateEmployerCandidateMatch(c, employerProfile).matchScore}% Подходит профилю
                      </span>
                      <h3 className="font-black text-slate-900 dark:text-slate-100 text-base sm:text-lg truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {fullName}
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 truncate">{position}</p>
                      <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{city}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expected Salary */}
                  {salary && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold border border-emerald-200/60 dark:border-emerald-800/60">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>от {salary.toLocaleString()} TJS / месяц</span>
                    </div>
                  )}

                  {/* Skills tags */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {skills.slice(0, 4).map((sk, idx) => (
                        <span
                          key={sk.id || idx}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold"
                        >
                          {sk.name}
                        </span>
                      ))}
                      {skills.length > 4 && (
                        <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                          +{skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-700 mt-4 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (c.user_id && onOpenChat) {
                        onOpenChat(c.user_id);
                      } else {
                        setContactCandidate(c);
                      }
                    }}
                    className="flex-1 py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t('catalog.contact_btn') || 'Связаться'}</span>
                  </button>

                  <button
                    onClick={() => setSelectedCandidate(c)}
                    className="flex-1 py-3 px-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs sm:text-sm border border-indigo-200/80 dark:border-indigo-800/60 transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    <Eye className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t('catalog.view_resume') || 'Резюме'}</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Candidate Detail Modal */}
      <CandidateDetailModal
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        user={user}
        onOpenAuth={onOpenAuth}
        onOpenChat={onOpenChat}
      />

      {/* Contact Candidate Modal */}
      <ContactCandidateModal
        candidate={contactCandidate}
        onClose={() => setContactCandidate(null)}
        user={user}
        onOpenAuth={onOpenAuth}
        onOpenChat={onOpenChat}
      />

    </div>
  );
};
