import React, { useState, useEffect, useMemo } from 'react';
import { Search, Bookmark, Building2, ChevronLeft, ChevronRight, ExternalLink, Sparkles, MapPin, Zap } from 'lucide-react';
import { Job } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { jobService } from '../../services/api';
import { getSavedUserProfile, evaluateProfileJobMatch } from '../../services/matchService';

interface JobsCatalogProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  initialSearch?: string;
}

export const JobsCatalog: React.FC<JobsCatalogProps> = ({
  jobs: initialPropJobs,
  onSelectJob,
  initialSearch = '',
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState('All Roles');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [catalogJobs, setCatalogJobs] = useState<Job[]>(initialPropJobs);
  const [isSearching, setIsSearching] = useState(false);
  const itemsPerPage = 8;

  useEffect(() => {
    setCatalogJobs(initialPropJobs);
  }, [initialPropJobs]);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!searchTerm && selectedCity === 'all' && (selectedCategory === 'All Roles' || selectedCategory === t('catalog.cat_all'))) {
        return;
      }
      try {
        setIsSearching(true);
        const res = await jobService.getJobs({
          title: searchTerm || undefined,
          location: selectedCity !== 'all' ? selectedCity : undefined,
          category: (selectedCategory !== 'All Roles' && selectedCategory !== t('catalog.cat_all') && selectedCategory !== t('catalog.cat_remote') && selectedCategory !== t('catalog.cat_matched')) ? selectedCategory : undefined,
          employment_type: selectedCategory === t('catalog.cat_remote') ? 'remote' : undefined,
          limit: 50
        });
        if (isMounted && res.items) {
          setCatalogJobs(res.items);
        }
      } catch (e) {
        console.error('Server job search error:', e);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchTerm, selectedCity, selectedCategory, t]);

  const categories = [
    t('catalog.cat_all'),
    t('catalog.cat_matched'),
    t('catalog.cat_it'),
    t('catalog.cat_marketing'),
    t('catalog.cat_finance'),
    t('catalog.cat_remote')
  ];

  const userProfile = useMemo(() => {
    return getSavedUserProfile();
  }, []);

  const evaluateJobWithProfile = (job: Job) => {
    return evaluateProfileJobMatch(job, userProfile);
  };

  // Filter real jobs list dynamically & sort ALL jobs by match score
  const filteredJobs = useMemo(() => {
    const scoreMap = new Map<string, number>();
    const getScore = (j: Job) => {
      if (!scoreMap.has(j.id)) {
        scoreMap.set(j.id, j.match_score ?? evaluateJobWithProfile(j).matchScore);
      }
      return scoreMap.get(j.id)!;
    };

    let result = catalogJobs.filter((job) => {
      // Search term
      const sLower = searchTerm.toLowerCase().trim();
      const matchSearch =
        !sLower ||
        job.title.toLowerCase().includes(sLower) ||
        job.description.toLowerCase().includes(sLower) ||
        (job.external_company_name && job.external_company_name.toLowerCase().includes(sLower)) ||
        job.location.toLowerCase().includes(sLower);

      // City filter
      let matchCity = true;
      if (selectedCity && selectedCity !== 'all') {
        matchCity = job.location.toLowerCase().includes(selectedCity.toLowerCase());
      }

      // Category filter
      let matchCategory = true;
      if (selectedCategory === t('catalog.cat_remote')) {
        matchCategory = job.employment_type === 'remote' || job.location.toLowerCase().includes('удален') || job.description.toLowerCase().includes('удален');
      } else if (selectedCategory === t('catalog.cat_matched')) {
        const score = getScore(job);
        matchCategory = score >= 65;
      } else if (selectedCategory !== t('catalog.cat_all') && selectedCategory !== 'All Roles') {
        matchCategory = 
          (job.category && job.category.toLowerCase().includes(selectedCategory.toLowerCase())) ||
          job.title.toLowerCase().includes(selectedCategory.toLowerCase()) ||
          job.description.toLowerCase().includes(selectedCategory.toLowerCase());
      }

      return matchSearch && matchCity && matchCategory;
    });

    // Always sort ALL jobs by match score descending so top profile matches are 1st
    return [...result].sort((a, b) => getScore(b) - getScore(a));
  }, [catalogJobs, searchTerm, selectedCity, selectedCategory, userProfile, t]);

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage) || 1;

  // Pagination calculation
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredJobs.slice(start, start + itemsPerPage);
  }, [filteredJobs, currentPage, itemsPerPage]);

  const featuredJob = paginatedJobs[0];
  const remainingJobs = paginatedJobs.slice(1);

  const formatSalary = (job: Job) => {
    if (job.salary_min && job.salary_max) {
      return `${job.salary_min.toLocaleString()} – ${job.salary_max.toLocaleString()} ${job.currency || 'TJS'}`;
    }
    if (job.salary_min) return `${t('catalog.salary_min')} ${job.salary_min.toLocaleString()} ${job.currency || 'TJS'}`;
    if (job.salary_max) return `${t('catalog.salary_max')} ${job.salary_max.toLocaleString()} ${job.currency || 'TJS'}`;
    return t('catalog.salary_negotiable');
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Prominent Search Bar Hero Container */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-xl space-y-6 border border-indigo-800/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{t('catalog.title')}</h1>
            <p className="text-xs sm:text-sm text-indigo-200 font-medium">
              Найдено {filteredJobs.length} свежих вакансий с умным сканированием профиля
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Умный поиск & AI Подбор
            </span>
          </div>
        </div>

        {/* High-Visibility Search Input Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 p-2 bg-white/10 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/20 dark:border-slate-700 shadow-2xl">
          <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-xl w-full flex-1 border border-slate-200 dark:border-slate-700">
            <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <input
              type="text"
              placeholder="Поиск по названию вакансии, компании, навыкам или городу..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-transparent text-sm font-semibold outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs font-extrabold text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* City Selector Dropdown */}
          <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-56 shrink-0">
            <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-transparent text-xs font-bold outline-none text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="all" className="dark:bg-slate-800">Все города</option>
              <option value="Душанбе" className="dark:bg-slate-800">г. Душанбе</option>
              <option value="Худжанд" className="dark:bg-slate-800">г. Худжанд</option>
              <option value="Бохтар" className="dark:bg-slate-800">г. Бохтар</option>
              <option value="Куляб" className="dark:bg-slate-800">г. Куляб</option>
              <option value="Удаленно" className="dark:bg-slate-800">Удаленно</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Pills Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentPage(1);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'ref-pill-active shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-[#e8e6e5] dark:border-slate-700 text-[#686767] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span>{cat}</span>
              {isActive && selectedCategory !== 'All Roles' && selectedCategory !== t('catalog.cat_all') && <span className="text-[10px]">✕</span>}
            </button>
          );
        })}
      </div>

      {/* Profile Match Header Banner if profile exists */}
      {userProfile?.position && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900 to-indigo-950 text-white text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm border border-indigo-700/50">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-black text-amber-300">{t('catalog.ai_banner_title')}</span>
              <span>{userProfile.position} {userProfile.skills?.length ? `• ${userProfile.skills.join(', ')}` : ''}</span>
            </div>
          </div>

          <button
            onClick={() => setSelectedCategory(t('catalog.cat_matched'))}
            className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0 transition-all"
          >
            {t('catalog.only_matched_btn')}
          </button>
        </div>
      )}

      {/* Featured Job Card */}
      {featuredJob ? (() => {
        const { matchScore, matchedSkills } = evaluateJobWithProfile(featuredJob);
        return (
          <div className="ref-card p-6 space-y-4 hover:shadow-md transition-shadow relative bg-white dark:bg-slate-800 border border-[#e8e6e5] dark:border-slate-700">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                  {featuredJob.external_company_logo ? (
                    <img src={featuredJob.external_company_logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      🎯 {matchScore}% {t('catalog.match_tag')}
                    </span>
                    {matchedSkills.length > 0 && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/60 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" /> {t('catalog.skills_matched')} {matchedSkills.join(', ')}
                      </span>
                    )}
                  </div>
                  <h3 
                    onClick={() => onSelectJob(featuredJob)}
                    className="text-lg font-bold text-[#1b1c1c] dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                  >
                    {featuredJob.title}
                  </h3>
                  <p className="text-xs text-[#686767] dark:text-slate-400">
                    {featuredJob.external_company_name || 'Работодатель'} • {featuredJob.location}
                  </p>
                </div>
              </div>

              <button className="text-slate-400 hover:text-[#1b1c1c] dark:hover:text-slate-200 transition-colors p-1">
                <Bookmark className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#686767] dark:text-slate-300 leading-relaxed max-w-4xl line-clamp-3">
              {featuredJob.description}
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[#e8e6e5] dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#1b1c1c] dark:text-slate-200">
                <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-indigo-950/60 border border-slate-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-extrabold">
                  {formatSalary(featuredJob)}
                </span>
                <span className="text-[#686767] dark:text-slate-400 capitalize">
                  {featuredJob.employment_type === 'full_time' ? 'Full-Time' : featuredJob.employment_type === 'remote' ? 'Remote' : featuredJob.employment_type}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onSelectJob(featuredJob)}
                  className="ref-btn-primary text-xs py-2 px-5 font-bold"
                >
                  {t('catalog.apply_now')}
                </button>
              </div>
            </div>
          </div>
        );
      })() : (
        <div className="ref-card p-12 text-center space-y-3 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('catalog.no_jobs_found')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('catalog.no_jobs_sub')}</p>
        </div>
      )}

      {/* Grid of Remaining Jobs */}
      {remainingJobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {remainingJobs.map((job) => {
            const { matchScore, matchedSkills } = evaluateJobWithProfile(job);
            return (
              <div 
                key={job.id} 
                className="ref-card p-5 space-y-3 hover:shadow-md transition-shadow bg-white dark:bg-slate-800 border border-[#e8e6e5] dark:border-slate-700 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      🎯 {matchScore}% {t('catalog.match_tag')}
                    </span>
                    <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                      {formatSalary(job)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 pt-1">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                      {job.external_company_logo ? (
                        <img src={job.external_company_logo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                          {(job.external_company_name || job.title || 'E')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <h4 
                        onClick={() => onSelectJob(job)}
                        className="text-sm font-black text-[#1b1c1c] dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer line-clamp-1"
                      >
                        {job.title}
                      </h4>
                      <p className="text-xs text-[#686767] dark:text-slate-400 flex items-center gap-1 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {job.external_company_name || 'Работодатель HamKor'} • {job.location}
                      </p>
                    </div>
                  </div>

                  {/* Matched skills pill */}
                  {matchedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {matchedSkills.map((sk) => (
                        <span key={sk} className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold border border-indigo-100 dark:border-indigo-800/60">
                          ✓ {sk}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-[#686767] dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#e8e6e5] dark:border-slate-700 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    {job.employment_type === 'remote' ? 'Удаленно' : 'Полная занятость'}
                  </span>
                  <button 
                    onClick={() => onSelectJob(job)}
                    className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
                  >
                    <span>{t('catalog.details')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> {t('catalog.prev')}
          </button>

          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            {t('catalog.page')} {currentPage} {t('catalog.of')} {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
          >
            {t('catalog.next')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
