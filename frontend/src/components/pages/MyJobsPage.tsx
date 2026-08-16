import React, { useState, useEffect } from 'react';
import { Briefcase, Building2, MapPin, DollarSign, Edit3, Trash2, Users, PlusCircle, Clock, CheckCircle2, XCircle, AlertCircle, Eye, Search, Sparkles, X, Check } from 'lucide-react';
import { jobService } from '../../services/api';
import { Job } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface MyJobsPageProps {
  user?: any;
  onOpenAuth?: () => void;
  onNavigateToCreateJob?: () => void;
  onViewCandidates?: (jobId: string) => void;
}

export const MyJobsPage: React.FC<MyJobsPageProps> = ({
  user,
  onOpenAuth,
  onNavigateToCreateJob,
  onViewCandidates
}) => {
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit Modal State
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSalaryMin, setEditSalaryMin] = useState('');
  const [editSalaryMax, setEditSalaryMax] = useState('');
  const [editLocation, setEditLocation] = useState('г. Душанбе');
  const [editCategory, setCategory] = useState('Информационные технологии');
  const [editEmploymentType, setEditEmploymentType] = useState('full_time');
  const [editStatus, setEditStatus] = useState<'open' | 'closed'>('open');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const loadMyJobs = async () => {
    setLoading(true);
    try {
      const res = await jobService.getMyJobs({ limit: 100 });
      setJobs(res.items || []);
    } catch (err) {
      console.error('Error loading employer jobs from PostgreSQL:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadMyJobs();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400 shadow-md">
          <Briefcase className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">Мои вакансии</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto font-medium">
            Войдите в личный кабинет работодателя, чтобы управлять опубликованными вакансиями и просматривать отклики соискателей.
          </p>
        </div>
        <button
          onClick={onOpenAuth}
          className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-lg transition-all active:scale-95"
        >
          Войти в аккаунт
        </button>
      </div>
    );
  }

  const handleDeleteJob = async (jobId: string, title: string) => {
    if (!window.confirm(`Вы действительно хотите удалить вакансию «${title}»? Это действие нельзя отменить.`)) {
      return;
    }

    setDeletingId(jobId);
    try {
      await jobService.deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err) {
      console.error('Error deleting job from PostgreSQL:', err);
      alert('Не удалось удалить вакансию. Попробуйте снова.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenEditModal = (job: Job) => {
    setEditingJob(job);
    setEditTitle(job.title || '');
    setEditDescription(job.description || '');
    setEditSalaryMin(job.salary_min ? String(job.salary_min) : '');
    setEditSalaryMax(job.salary_max ? String(job.salary_max) : '');
    setEditLocation(job.location || 'г. Душанбе');
    setCategory(job.category || 'Информационные технологии');
    setEditEmploymentType(job.employment_type || 'full_time');
    setEditStatus((job.status as any) || 'open');
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    setIsSaving(true);
    setEditError('');

    try {
      const updated = await jobService.updateJob(editingJob.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        salary_min: editSalaryMin ? parseFloat(editSalaryMin) : undefined,
        salary_max: editSalaryMax ? parseFloat(editSalaryMax) : undefined,
        location: editLocation.trim(),
        category: editCategory,
        employment_type: editEmploymentType,
        status: editStatus
      });

      setJobs((prev) => prev.map((j) => (j.id === editingJob.id ? { ...j, ...updated } : j)));
      setEditingJob(null);
    } catch (err: any) {
      console.error('Error updating job:', err);
      setEditError(err?.response?.data?.detail || 'Ошибка при сохранении изменений.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatSalary = (job: Job) => {
    if (job.salary_min && job.salary_max) {
      return `${job.salary_min.toLocaleString()} – ${job.salary_max.toLocaleString()} TJS`;
    }
    if (job.salary_min) return `от ${job.salary_min.toLocaleString()} TJS`;
    if (job.salary_max) return `до ${job.salary_max.toLocaleString()} TJS`;
    return 'По договоренности';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-black border border-indigo-200/60 dark:border-indigo-800/60">
            <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Панель работодателя</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Мои вакансии ({jobs.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Управляйте опубликованными вакансиями, редактируйте описание и просматривайте отклики кандидатов.
          </p>
        </div>

        {onNavigateToCreateJob && (
          <button
            onClick={onNavigateToCreateJob}
            className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Разместить вакансию</span>
          </button>
        )}
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="py-20 text-center space-y-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Загрузка вакансий из PostgreSQL...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 p-8 space-y-4">
          <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">У вас пока нет опубликованных вакансий</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Опубликуйте свою первую вакансию, чтобы получать отклики от квалифицированных специалистов Таджикистана.
          </p>
          {onNavigateToCreateJob && (
            <button
              onClick={onNavigateToCreateJob}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Создать вакансию</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const isOpen = job.status === 'open' || (job.status as any) === 'OPEN';
            return (
              <div
                key={job.id}
                className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Info Column */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-black ${
                      isOpen
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}>
                      {isOpen ? '🟢 Активна' : '🔴 Закрыта'}
                    </span>

                    {job.category && (
                      <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                        {job.category}
                      </span>
                    )}

                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(job.created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>

                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 truncate">
                    {job.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <DollarSign className="w-4 h-4 shrink-0" />
                      <span>{formatSalary(job)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{job.location}</span>
                    </div>
                  </div>

                  {job.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>
                  )}
                </div>

                {/* Action Buttons Column */}
                <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-stretch shrink-0">
                  {/* View Candidates Button */}
                  <button
                    onClick={() => onViewCandidates && onViewCandidates(job.id)}
                    className="flex-1 md:flex-initial px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>Посмотреть кандидатов</span>
                  </button>

                  <div className="flex items-center gap-2 flex-1 md:flex-initial">
                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEditModal(job)}
                      className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700/80 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-600 font-bold text-xs border border-slate-200 dark:border-slate-600 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Изменить</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteJob(job.id, job.title)}
                      disabled={deletingId === job.id}
                      className="px-4 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200/80 dark:border-rose-800/60 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deletingId === job.id ? 'Удаление...' : 'Удалить'}</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Edit Job Modal */}
      {editingJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative animate-scale-in my-8">
            <button
              onClick={() => setEditingJob(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Редактирование вакансии</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Обновите параметры и сохранится ли информация в базе данных PostgreSQL.
              </p>
            </div>

            {editError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200/80 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Название вакансии *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    Зарплата от (TJS)
                  </label>
                  <input
                    type="number"
                    value={editSalaryMin}
                    onChange={(e) => setEditSalaryMin(e.target.value)}
                    placeholder="Например: 4000"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    Зарплата до (TJS)
                  </label>
                  <input
                    type="number"
                    value={editSalaryMax}
                    onChange={(e) => setEditSalaryMax(e.target.value)}
                    placeholder="Например: 8000"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    Город / Локация
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    Статус вакансии
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="open">🟢 Активна (Открыта)</option>
                    <option value="closed">🔴 Закрыта (Архив)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Описание вакансии *
                </label>
                <textarea
                  required
                  rows={5}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs hover:bg-slate-200 transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
