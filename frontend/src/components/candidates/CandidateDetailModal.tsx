import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, MapPin, DollarSign, Briefcase, GraduationCap, Phone, Mail, Award, CheckCircle2, User, ExternalLink, Calendar, MessageSquare, ShieldCheck, ArrowLeft, Sparkles, FileText } from 'lucide-react';
import { Candidate } from '../../types';
import { ContactCandidateModal } from './ContactCandidateModal';
import { useLanguage } from '../../i18n/LanguageContext';
import { candidateService } from '../../services/api';
import { resumeService } from '../../services/resumeService';
import { ResumePreviewCard } from '../resumes/ResumePreviewCard';

interface CandidateDetailModalProps {
  candidate: (Candidate & { cover_note?: string }) | null;
  onClose: () => void;
  user?: any;
  onOpenAuth?: () => void;
  onOpenChat?: (recipientId: string) => void;
}

export const CandidateDetailModal: React.FC<CandidateDetailModalProps> = ({
  candidate,
  onClose,
  user,
  onOpenAuth,
  onOpenChat
}) => {
  const { t } = useLanguage();
  const [showContactModal, setShowContactModal] = useState(false);
  const [publishedResume, setPublishedResume] = useState<any | null>(null);
  const [fullProfile, setFullProfile] = useState<any | null>(candidate);
  const [viewTab, setViewTab] = useState<'profile' | 'resume'>('profile');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setFullProfile(candidate);
    if (candidate && (candidate.user_id || (candidate as any).user?.id || candidate.id)) {
      const uId = candidate.user_id || (candidate as any).user?.id || candidate.id;
      setLoading(true);

      // Fetch atomic full candidate profile AND published resumes directly from PostgreSQL
      candidateService.getFullCandidateProfile(uId.toString())
        .then((data) => {
          if (data && data.profile) {
            setFullProfile(data.profile);
          }
          if (data && data.published_resumes && data.published_resumes.length > 0) {
            setPublishedResume(data.published_resumes[0]);
            setViewTab('resume');
          } else {
            setPublishedResume(null);
            setViewTab('profile');
          }
        })
        .catch((err) => {
          console.error('Error fetching candidate full profile from PostgreSQL:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setPublishedResume(null);
      setViewTab('profile');
      setLoading(false);
    }
  }, [candidate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (candidate) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [candidate, onClose]);

  if (!candidate) return null;

  const currentCand = fullProfile || candidate;
  const u: any = currentCand.user || {};
  const fullName = u.full_name || u.username || currentCand.desired_position || 'Соискатель';
  const avatarUrl = u.avatar_url;
  const position = currentCand.desired_position || 'Специалист';
  const salary = currentCand.desired_salary && currentCand.desired_salary > 0 ? currentCand.desired_salary : null;
  const city = u.city || 'Таджикистан';
  const phone = u.phone;
  const email = u.email;
  const skills = currentCand.skills || [];
  const experiences = currentCand.experiences || [];
  const coverNote = (candidate as any).cover_note || (currentCand as any).cover_note;
  const isExternal = (candidate as any).is_external || (candidate as any).source === 'yora';

  const handleContactClick = (type: 'phone' | 'email') => {
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (type === 'phone' && phone) {
      window.location.href = `tel:${phone}`;
    } else if (type === 'email' && email) {
      window.location.href = `mailto:${email}`;
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-slate-950 text-slate-100 flex flex-col w-screen h-screen overflow-hidden animate-fade-in">
      
      {/* 1. TOP FULLSCREEN NAVBAR */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 px-6 sm:px-10 flex items-center justify-between shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-extrabold flex items-center gap-2 transition-all border border-slate-700 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            <span>Назад</span>
          </button>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-black text-white tracking-wide">
              Анкета соискателя
            </span>
            {publishedResume && (
              <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700 ml-4">
                <button
                  onClick={() => setViewTab('resume')}
                  className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                    viewTab === 'resume' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Резюме (Опубликовано ✓)</span>
                </button>
                <button
                  onClick={() => setViewTab('profile')}
                  className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                    viewTab === 'profile' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Профиль</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isExternal && (
            <button
              onClick={() => {
                const targetId = candidate.user_id || (candidate as any).user?.id;
                if (targetId && onOpenChat) {
                  onClose();
                  onOpenChat(targetId.toString());
                } else {
                  setShowContactModal(true);
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Связаться с кандидатом</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <span>Закрыть просмотр</span>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. MAIN SCROLLABLE CONTENT BODY */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-8 sm:p-12 max-w-4xl mx-auto space-y-6 animate-pulse">
            <div className="h-32 bg-slate-900 rounded-3xl border border-slate-800" />
            <div className="h-48 bg-slate-900 rounded-3xl border border-slate-800" />
            <div className="h-48 bg-slate-900 rounded-3xl border border-slate-800" />
          </div>
        ) : publishedResume && viewTab === 'resume' ? (
          <div className="p-6 sm:p-12 max-w-4xl mx-auto space-y-6">
            <div className="p-4 rounded-2xl bg-indigo-900/60 border border-indigo-700/50 text-indigo-100 text-xs font-semibold flex items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                <span>Официальное резюме кандидата ({fullName})</span>
              </div>
              <button
                onClick={() => {
                  const targetId = candidate.user_id || (candidate as any).user?.id;
                  if (targetId && onOpenChat) {
                    onClose();
                    onOpenChat(targetId.toString());
                  } else {
                    setShowContactModal(true);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Написать в чат</span>
              </button>
            </div>
            <ResumePreviewCard content={publishedResume.content} title={publishedResume.title} />
          </div>
        ) : (
          <>
            {/* HERO BANNER */}
            <div className="relative bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-slate-800 p-8 sm:p-12">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center sm:items-start gap-8">
            
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-white/10 p-1.5 shadow-2xl border-2 border-indigo-400/50 backdrop-blur-md overflow-hidden">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="w-full h-full object-cover rounded-2xl"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full rounded-2xl bg-indigo-600/80 flex items-center justify-center text-white font-black text-4xl shadow-inner">
                    {fullName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-black shadow-lg flex items-center gap-1 border-2 border-slate-950">
                <CheckCircle2 className="w-3.5 h-3.5" /> {isExternal ? 'yora.tj' : 'В сети'}
              </span>
            </div>

            {/* Candidate Info */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-bold backdrop-blur-md border border-white/10">
                <User className="w-3.5 h-3.5" />
                <span>Профиль соискателя</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                {fullName}
              </h1>

              <p className="text-lg sm:text-xl text-indigo-200 font-extrabold">{position}</p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs sm:text-sm font-bold">
                <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-slate-200">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  {city}
                </span>

                {salary ? (
                  <span className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-4 py-2 rounded-2xl border border-emerald-500/40 text-sm font-black">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    от {salary.toLocaleString()} TJS
                  </span>
                ) : (
                  <span className="flex items-center gap-2 bg-white/10 text-slate-300 px-4 py-2 rounded-2xl border border-white/10">
                    По договорённости
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* 2-COLUMN DASHBOARD GRID */}
        <div className="max-w-6xl mx-auto p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT SIDEBAR (1/3 Width) */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* Contacts Card */}
            {(phone || email) && (
              <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-indigo-400" />
                  Контакты кандидата
                </h3>

                <div className="space-y-3">
                  {phone && (
                    <button
                      onClick={() => handleContactClick('phone')}
                      className="w-full p-4 rounded-2xl bg-slate-800/80 hover:bg-indigo-600/20 border border-slate-700 hover:border-indigo-500/50 text-xs font-extrabold text-white transition-all flex items-center gap-3 active:scale-95"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                        <Phone className="w-4 h-4" />
                      </div>
                      <span className="truncate">{phone}</span>
                    </button>
                  )}

                  {email && (
                    <button
                      onClick={() => handleContactClick('email')}
                      className="w-full p-4 rounded-2xl bg-slate-800/80 hover:bg-indigo-600/20 border border-slate-700 hover:border-indigo-500/50 text-xs font-extrabold text-white transition-all flex items-center gap-3 active:scale-95"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                        <Mail className="w-4 h-4" />
                      </div>
                      <span className="truncate">{email}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Key Skills */}
            {skills.length > 0 && (
              <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-400" />
                  Ключевые навыки ({skills.length})
                </h3>

                <div className="flex flex-wrap gap-2">
                  {skills.map((s: any, idx: number) => {
                    const skillName = typeof s === 'string' ? s : (s.name || 'Навык');
                    return (
                      <span
                        key={s.id || idx}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-950/80 text-indigo-200 font-extrabold text-xs border border-indigo-700/50 shadow-xs"
                      >
                        {skillName}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* External Link Card if External */}
            {isExternal && (
              <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl text-center space-y-4 shadow-xl">
                <span className="text-xs font-bold text-slate-400 block">Внешняя анкета yora.tj</span>
                <a
                  href={(candidate as any).external_url || "https://yora.tj/ru/vacancies"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-5 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>Открыть на yora.tj</span>
                  <ExternalLink className="w-4 h-4 text-amber-300" />
                </a>
              </div>
            )}

          </div>

          {/* RIGHT MAIN AREA (2/3 Width) */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* Cover Letter Quote */}
            {coverNote && (
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  Сопроводительное письмо к отклику
                </h3>
                <div className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 p-6 rounded-3xl border border-indigo-700/50 shadow-xl relative">
                  <p className="italic font-semibold text-indigo-100">"{coverNote}"</p>
                </div>
              </div>
            )}

            {/* Bio Section */}
            {candidate.bio && (
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  О соискателе
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-xl">
                  {candidate.bio}
                </p>
              </div>
            )}

            {/* Experience Section */}
            {experiences.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-400" />
                  Опыт работы ({experiences.length})
                </h3>

                <div className="space-y-4">
                  {experiences.map((exp: any, idx: number) => (
                    <div key={exp.id || idx} className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2 hover:border-indigo-700/50 transition-all">
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-3">
                        <div>
                          <h4 className="font-extrabold text-white text-base">{exp.role_title}</h4>
                          <p className="text-xs font-bold text-indigo-400 mt-0.5">{exp.company_name}</p>
                        </div>
                        <span className="text-xs font-bold px-3 py-1 rounded-xl bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {exp.start_date} — {exp.end_date || 'По настоящее время'}
                        </span>
                      </div>

                      {exp.description && (
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1 font-medium">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education Section */}
            {candidate.education && (
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                  Образование
                </h3>
                <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 text-xs sm:text-sm font-semibold text-slate-200 shadow-xl">
                  {candidate.education}
                </div>
              </div>
            )}

          </div>

        </div>
        </>
        )}

      </div>

      {/* 3. FULLSCREEN FOOTER */}
      <div className="h-16 bg-slate-900 border-t border-slate-800 px-6 sm:px-10 flex items-center justify-between shrink-0 shadow-lg">
        <span className="text-xs text-slate-400 font-medium flex items-center gap-2">
          <span>Источник данных:</span>
          <strong className="text-indigo-400 font-bold px-2.5 py-0.5 rounded-lg bg-indigo-950 border border-indigo-800">
            {isExternal ? 'yora.tj' : 'Платформа HamKor'}
          </strong>
        </span>

        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs transition-all active:scale-95 border border-slate-700"
        >
          Закрыть просмотр
        </button>
      </div>

      {/* Contact Candidate Modal */}
      {showContactModal && (
        <ContactCandidateModal
          candidate={candidate}
          onClose={() => setShowContactModal(false)}
          user={user}
          onOpenAuth={onOpenAuth}
          onOpenChat={(recipientId) => {
            setShowContactModal(false);
            onClose();
            if (onOpenChat) onOpenChat(recipientId);
          }}
        />
      )}

    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
