import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Briefcase, GraduationCap, Award, Code, CheckCircle2, User } from 'lucide-react';
import { ResumeContent } from '../../types/resume';

interface ResumePreviewCardProps {
  content: ResumeContent;
  title?: string;
  isPrintMode?: boolean;
}

export const ResumePreviewCard: React.FC<ResumePreviewCardProps> = ({ content, title, isPrintMode = false }) => {
  const p = content?.personal_info || {};
  const exp = content?.work_experience || [];
  const edu = content?.education || [];
  const skills = content?.skills || { technical: [], soft: [] };
  const techSkills = skills.technical || [];
  const softSkills = skills.soft || [];
  const languages = content?.languages || [];
  const certs = content?.certificates || [];
  const projects = content?.projects || [];
  const social = content?.social_links || {};
  const custom = content?.custom_sections || [];

  return (
    <div className={`shadow-xl rounded-2xl overflow-hidden border transition-all ${isPrintMode ? 'p-8 max-w-none shadow-none rounded-none border-none bg-white text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200/80 dark:border-slate-700 p-6 sm:p-8 max-w-3xl mx-auto'}`}>
      
      {/* Header / Personal Info */}
      <div className="border-b border-slate-200 dark:border-slate-700 pb-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {p.full_name || 'Имя Фамилия'}
            </h1>
            <p className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {p.desired_position || 'Желаемая должность'}
            </p>

            {/* Contact details bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {p.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {p.email}
                </span>
              )}
              {p.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {p.phone}
                </span>
              )}
              {p.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {p.city}
                </span>
              )}
              {social.linkedin && (
                <span className="flex items-center gap-1">
                  <Linkedin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {social.linkedin}
                </span>
              )}
              {social.github && (
                <span className="flex items-center gap-1">
                  <Github className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {social.github}
                </span>
              )}
              {social.website && (
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {social.website}
                </span>
              )}
            </div>
          </div>

          {p.photo_url && (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-indigo-100 dark:border-slate-700 shadow-md shrink-0 bg-slate-100 dark:bg-slate-700">
              <img src={p.photo_url} alt={p.full_name} className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Summary */}
        {p.summary && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
              {p.summary}
            </p>
          </div>
        )}
      </div>

      {/* Main Body Layout */}
      <div className="space-y-6">

        {/* Work Experience */}
        {exp.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest font-black text-indigo-600 dark:text-indigo-400 border-b border-indigo-100 dark:border-slate-700 pb-1 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Опыт работы ({exp.length})
            </h2>

            <div className="space-y-4 pt-1">
              {exp.map((item) => (
                <div key={item.id} className="space-y-1.5 relative pl-4 border-l-2 border-indigo-200 dark:border-indigo-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{item.position}</h3>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 rounded-md">
                      {item.start_date} — {item.is_current ? 'По настоящее время' : (item.end_date || 'Н.В.')}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                    <span>{item.company_name}</span>
                    {item.location && <span className="text-slate-400">• {item.location}</span>}
                  </div>

                  {item.responsibilities && item.responsibilities.length > 0 && (
                    <ul className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1 font-medium pt-1">
                      {item.responsibilities.map((resp, idx) => (
                        <li key={idx} className="leading-relaxed">{resp}</li>
                      ))}
                    </ul>
                  )}

                  {item.achievements && item.achievements.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">Достижения:</span>
                      <ul className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-0.5 font-medium">
                        {item.achievements.map((ach, idx) => (
                          <li key={idx} className="leading-relaxed text-emerald-900 dark:text-emerald-300">{ach}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Technical & Soft Skills */}
        {(techSkills.length > 0 || softSkills.length > 0) && (
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest font-black text-indigo-600 dark:text-indigo-400 border-b border-indigo-100 dark:border-slate-700 pb-1 flex items-center gap-2">
              <Code className="w-4 h-4" /> Навыки и Компетенции
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {techSkills.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase">Профессиональные</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {techSkills.map((sk: any, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                        {typeof sk === 'string' ? sk : sk.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {softSkills.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase">Личностные</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {softSkills.map((sk: any, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                        {typeof sk === 'string' ? sk : sk.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Education */}
        {edu.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest font-black text-indigo-600 dark:text-indigo-400 border-b border-indigo-100 dark:border-slate-700 pb-1 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Образование
            </h2>

            <div className="space-y-3">
              {edu.map((item) => (
                <div key={item.id} className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-slate-100">{item.degree}</h3>
                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{item.institution}</p>
                    {item.field_of_study && <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Специальность: {item.field_of_study}</p>}
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 rounded-md">
                    {item.end_year || 'Завершено'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Languages & Certificates */}
        {(languages.length > 0 || certs.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            {languages.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-widest font-black text-indigo-600 dark:text-indigo-400 border-b border-indigo-100 dark:border-slate-700 pb-1">
                  Языки
                </h3>
                <div className="space-y-1 text-xs">
                  {languages.map((lang: any, idx) => (
                    <div key={idx} className="flex items-center justify-between font-semibold">
                      <span className="text-slate-900 dark:text-slate-100">{lang.name || lang.language}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">{lang.proficiency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {certs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-widest font-black text-indigo-600 dark:text-indigo-400 border-b border-indigo-100 dark:border-slate-700 pb-1">
                  Сертификаты
                </h3>
                <div className="space-y-1 text-xs">
                  {certs.map((c: any, idx) => (
                    <div key={idx} className="font-semibold">
                      <div className="text-slate-900 dark:text-slate-100 font-bold">{c.title || c.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{c.issuer} {c.year ? `(${c.year})` : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
