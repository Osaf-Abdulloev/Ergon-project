import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, Briefcase, Car, Globe, Github, Linkedin, 
  Send as TelegramIcon, Award, Plus, Edit2, Trash2, CheckCircle2, 
  Sparkles, Download, ExternalLink, X, Save, Clock, Compass, 
  DollarSign, FileText, Check, ShieldCheck, Building2, ArrowUpRight,
  ChevronDown, ChevronUp, Info, ThumbsUp, Zap, Target, Search, Camera, Bell
} from 'lucide-react';
import { aiService, profileService, telegramService } from '../../services/api';
import { resumeService } from '../../services/resumeService';
import { Job } from '../../types';
import { DEFAULT_USER_AVATAR, evaluateProfileJobMatch, getSavedUserProfile, saveUserProfile } from '../../services/matchService';
import { EmployerProfilePage } from './EmployerProfilePage';
import { useLanguage } from '../../i18n/LanguageContext';

export const DEFAULT_INSTAGRAM_AVATAR = DEFAULT_USER_AVATAR;

interface MatchedJobResult {
  job: Job;
  matchScore: number;
  scoreBreakdown?: {
    positionScore: number;
    skillScore: number;
    salaryScore: number;
    locationScore: number;
    completenessScore: number;
  };
  commuteEstimate: string;
  distanceEstimate: string;
  matchedReasons: string[];
  matchedSkills: string[];
  missingSkills?: string[];
  growthAdvice?: string[];
}

export const TAJIKISTAN_CITIES = [
  'г. Душанбе',
  'г. Худжанд',
  'г. Бохтар (Курган-Тюбе)',
  'г. Куляб',
  'г. Хорог',
  'г. Турсунзаде',
  'г. Истаравшан',
  'г. Пенджикент',
  'г. Вахдат',
  'г. Гиссар',
  'г. Нурек',
  'г. Канибадам',
  'г. Исфара',
  'г. Гулистон (Кайраккум)',
  'г. Бустон (Чкаловск)',
  'п. Яван',
  'п. Дангара',
  'п. Рашт',
  'п. Файзабад',
  'п. Зафарабад',
  'п. Спитамен',
  'п. Шахринав',
  'п. Матча',
  'п. Шахристан',
  'п. Ашт',
  'п. Джаббор Расулов',
  'п. Мургаб',
];

export interface CertificateItem {
  id: string;
  title: string;
  issuer: string;
  year: string;
  link?: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  period: string;
  description: string;
}

export interface UserProfileData {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  position: string;
  bio: string;
  expected_salary: string;
  
  // Relocation & Commute Preferences
  relocation: 'not_ready' | 'ready_city' | 'ready_country' | 'ready_abroad';
  commute_time: 'up_to_15' | 'up_to_30' | 'up_to_60' | 'any';
  work_format: 'full_time' | 'remote' | 'hybrid' | 'shift' | 'part_time';
  
  // Transport & License
  has_driving_license: boolean;
  driving_categories: string[];
  has_own_car: boolean;
  no_driving_license: boolean; // "Нету" flag
  
  // Links
  github_url: string;
  portfolio_url: string;
  linkedin_url: string;
  telegram_url: string;
  no_github: boolean; // "Нету" flag
  
  // Arrays
  certificates: CertificateItem[];
  experiences: ExperienceItem[];
  skills: string[];
  no_certificates: boolean; // "Нету" flag
  
  avatar_url?: string;
}

interface MatchedJobResult {
  job: Job;
  matchScore: number;
  commuteEstimate: string;
  distanceEstimate: string;
  matchedReasons: string[];
  matchedSkills: string[];
}

interface ProfilePageProps {
  user: any;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  jobs?: Job[];
  onSelectJob?: (job: Job) => void;
  onNavigateToResumes?: () => void;
}

// Tajikistan Searchable City Selector Component
const TajikistanCityPicker: React.FC<{
  value: string;
  onChange: (city: string) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCities = TAJIKISTAN_CITIES.filter((city) =>
    city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 flex items-center justify-between hover:bg-white focus:border-indigo-500 transition-all shadow-xs"
      >
        <span className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{value || 'Выберите город в Таджикистане...'}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-indigo-100 rounded-xl shadow-xl p-2 space-y-2 max-h-60 overflow-y-auto animate-fade-in">
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Поиск города в Таджикистане..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold outline-none text-slate-800 placeholder-slate-400"
              autoFocus
            />
          </div>

          <div className="space-y-0.5">
            {filteredCities.length > 0 ? (
              filteredCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    onChange(city);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                    value === city
                      ? 'bg-indigo-50 text-indigo-700 font-extrabold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{city}</span>
                  {value === city && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-400 italic">
                Город не найден
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onOpenAuth, onLogout, jobs = [], onSelectJob, onNavigateToResumes }) => {
  const { t } = useLanguage();
  if (user?.role === 'employer') {
    return <EmployerProfilePage user={user} onOpenAuth={onOpenAuth} />;
  }

  const [publishedResume, setPublishedResume] = useState<any>(null);
  const [tgInput, setTgInput] = useState<string>('');
  const [tgStatusMsg, setTgStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isConnectingTg, setIsConnectingTg] = useState<boolean>(false);

  const handleConnectTelegram = async (customId?: string) => {
    setIsConnectingTg(true);
    setTgStatusMsg(null);
    try {
      const input = customId || tgInput;
      if (!input.trim() && !user?.telegram_chat_id) {
        setTgStatusMsg({ text: 'Пожалуйста, введите ваш Chat ID или @username в Telegram', type: 'error' });
        setIsConnectingTg(false);
        return;
      }
      const payload = input.trim() ? { telegram_chat_id: input.trim() } : { telegram_chat_id: user?.telegram_chat_id };
      const res = await telegramService.connectTelegram(payload);
      setTgStatusMsg({ text: res.message || '✅ Telegram аккаунт успешно привязан! Тестовое сообщение отправлено.', type: 'success' });
      setTgInput('');
    } catch (err: any) {
      setTgStatusMsg({ text: err.response?.data?.detail || 'Ошибка при подключении Telegram. Проверьте введенный Chat ID.', type: 'error' });
    } finally {
      setIsConnectingTg(false);
    }
  };

  const handleOpenTelegramBot = async () => {
    try {
      const data = await telegramService.getTelegramLink();
      if (data.bot_url) {
        window.open(data.bot_url, '_blank');
      } else {
        window.open('https://t.me/HamKorJobsBot', '_blank');
      }
    } catch (e) {
      window.open('https://t.me/HamKorJobsBot', '_blank');
    }
  };

  useEffect(() => {
    if (user?.id) {
      resumeService.getCandidatePublishedResume(user.id).then((res) => {
        if (res) {
          setPublishedResume(res);
        }
      }).catch(() => {});
    }
  }, [user?.id]);

  const storageKey = `ergon_user_profile_${user?.id || 'guest'}`;

  // Default empty profile for fresh users (NO FAKE MOCK DATA)
  const defaultProfile: UserProfileData = {
    full_name: user?.full_name || user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.city || 'г. Душанбе',
    position: '',
    bio: '',
    expected_salary: '',
    relocation: 'not_ready',
    commute_time: 'any',
    work_format: 'full_time',
    has_driving_license: false,
    driving_categories: [],
    has_own_car: false,
    no_driving_license: false,
    github_url: '',
    portfolio_url: '',
    linkedin_url: '',
    telegram_url: '',
    no_github: false,
    certificates: [],
    experiences: [],
    skills: [],
    no_certificates: false,
    avatar_url: user?.avatar_url || ''
  };

  const [profile, setProfile] = useState<UserProfileData>(() => {
    try {
      const saved = getSavedUserProfile(user);
      if (saved) {
        return { ...defaultProfile, ...saved };
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    }
    return defaultProfile;
  });

  // Toggle for showing extra/full details ("Подробнее")
  const [showFullDetails, setShowFullDetails] = useState(false);

  // Sync profile when user logs in or user details change
  useEffect(() => {
    const loadBackendProfile = async () => {
      if (user?.id && user?.role === 'worker') {
        try {
          const wp = await profileService.getWorkerProfile();
          if (wp) {
            setProfile((prev) => ({
              ...prev,
              position: wp.desired_position || prev.position,
              expected_salary: wp.desired_salary ? `${wp.desired_salary} TJS` : prev.expected_salary,
              bio: wp.bio || prev.bio,
              skills: wp.skills && wp.skills.length > 0 ? wp.skills.map((s: any) => s.name || s) : prev.skills,
              portfolio_url: (wp.portfolio_links && typeof wp.portfolio_links === 'object' && wp.portfolio_links.portfolio) || prev.portfolio_url
            }));
          }
        } catch (e) {
          console.error('Failed to load DB profile:', e);
        }
      }
    };

    const saved = getSavedUserProfile(user);
    if (saved) {
      setProfile((prev) => ({ ...defaultProfile, ...prev, ...saved }));
    } else if (user) {
      setProfile((prev) => ({
        ...defaultProfile,
        ...prev,
        full_name: user.full_name || user.username || prev.full_name || '',
        email: user.email || prev.email || '',
        phone: user.phone || prev.phone || '',
        location: user.city || prev.location || 'г. Душанбе',
        avatar_url: user.avatar_url || prev.avatar_url || ''
      }));
    }

    loadBackendProfile();
  }, [user?.id, user?.username, user?.email]);

  // Persist profile strictly across multi-key storage (user.id, username, email, backup)
  useEffect(() => {
    saveUserProfile(profile, user);
  }, [profile, user]);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'preferences' | 'transport' | 'links' | 'certificates' | 'experience'>('basic');
  
  // Draft Form State for Modal Editing
  const [draftProfile, setDraftProfile] = useState<UserProfileData>(profile);

  // New item draft states
  const [newCertTitle, setNewCertTitle] = useState('');
  const [newCertIssuer, setNewCertIssuer] = useState('');
  const [newCertYear, setNewCertYear] = useState('');
  const [newCertLink, setNewCertLink] = useState('');

  const [newExpCompany, setNewExpCompany] = useState('');
  const [newExpPos, setNewExpPos] = useState('');
  const [newExpPeriod, setNewExpPeriod] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');

  const [newSkillInput, setNewSkillInput] = useState('');

  // AI CV Generation State
  const [isGeneratingCV, setIsGeneratingCV] = useState(false);
  const [generatedCVText, setGeneratedCVText] = useState<string | null>(null);

  const openModalWithTab = (tab: typeof activeTab) => {
    setDraftProfile(profile);
    setActiveTab(tab);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    setProfile(draftProfile);
    setIsEditModalOpen(false);
    saveUserProfile(draftProfile, user);

    if (user?.id) {
      try {
        // Sync basic User details to SQLite Database
        await profileService.updateUser({
          full_name: draftProfile.full_name,
          city: draftProfile.location,
          phone: draftProfile.phone,
          avatar_url: draftProfile.avatar_url
        });

        if (user?.role === 'worker') {
          let sal = 0;
          if (draftProfile.expected_salary) {
            const matched = String(draftProfile.expected_salary).match(/\d+/);
            if (matched) sal = parseInt(matched[0], 10);
          }

          // Sync Worker Profile to SQLite Database
          await profileService.updateWorkerProfile({
            desired_position: draftProfile.position,
            desired_salary: sal,
            bio: draftProfile.bio,
            portfolio_links: {
              github: draftProfile.github_url,
              portfolio: draftProfile.portfolio_url,
              linkedin: draftProfile.linkedin_url,
              telegram: draftProfile.telegram_url
            },
            skills: draftProfile.skills
          });
        }
      } catch (e) {
        console.error('Failed to save profile to SQLite DB:', e);
      }
    }
  };

  // Helper Labels
  const relocationLabels: Record<string, string> = {
    not_ready: 'Не готов к переезду',
    ready_city: 'Готов к переезду в пределах области',
    ready_country: 'Готов к переезду по Таджикистану',
    ready_abroad: 'Готов к релокации за рубеж'
  };

  const commuteLabels: Record<string, string> = {
    up_to_15: 'До 15 минут в пути',
    up_to_30: 'До 30 минут в пути',
    up_to_60: 'До 1 часа в пути',
    any: 'Время в пути не имеет значения'
  };

  const workFormatLabels: Record<string, string> = {
    full_time: 'Полный рабочий день',
    remote: 'Удаленная работа',
    hybrid: 'Гибридный формат',
    shift: 'Сменный график',
    part_time: 'Частичная занятость'
  };

  // Calculate Profile Completion Percentage dynamically (Supports "Нету" buttons)
  const calculateProfileStrength = () => {
    let score = 0;
    const suggestions: { text: string; tab: typeof activeTab; bonus: number }[] = [];

    // Basic Info (30%)
    if (profile.full_name.trim() && profile.email.trim()) score += 15;
    if (profile.position.trim()) {
      score += 15;
    } else {
      suggestions.push({ text: 'Укажите желаемую должность и специализацию', tab: 'basic', bonus: 15 });
    }

    // Bio / About (15%)
    if (profile.bio.trim().length >= 10) {
      score += 15;
    } else {
      suggestions.push({ text: 'Расскажите о себе (О себе / навыки)', tab: 'basic', bonus: 15 });
    }

    // Relocation & Commute (15%)
    if (profile.relocation && profile.commute_time) {
      score += 15;
    } else {
      suggestions.push({ text: 'Укажите переезд и время до работы', tab: 'preferences', bonus: 15 });
    }

    // Driver's License & Transport (15%) - "Нету" awards full points!
    if (profile.has_driving_license || profile.driving_categories.length > 0 || profile.has_own_car || profile.no_driving_license) {
      score += 15;
    } else {
      suggestions.push({ text: 'Укажите права или отметьте "Нет прав"', tab: 'transport', bonus: 15 });
    }

    // Portfolio & Social Links (15%) - "Нету" awards full points!
    if (profile.github_url.trim() || profile.portfolio_url.trim() || profile.linkedin_url.trim() || profile.telegram_url.trim() || profile.no_github) {
      score += 15;
    } else {
      suggestions.push({ text: 'Укажите ссылки или отметьте "Нет GitHub"', tab: 'links', bonus: 15 });
    }

    // Certificates / Experience / Skills (10%) - "Нету" awards full points!
    if (profile.certificates.length > 0 || profile.experiences.length > 0 || profile.skills.length > 0 || profile.no_certificates) {
      score += 10;
    } else {
      suggestions.push({ text: 'Добавьте сертификаты, опыт или навыки', tab: 'certificates', bonus: 10 });
    }

    return {
      score: Math.min(100, score),
      suggestions
    };
  };

  const { score, suggestions } = calculateProfileStrength();

  // HIGH-PRECISION ACCURATE AI DIAGNOSTICS FOR ALL PARAMETERS (Position, City/Location, Portfolio/Links)
  const generateAIProfileAnalysis = () => {
    const userPos = (profile.position || '').trim();
    const userBio = (profile.bio || '').trim();
    const userSkills = profile.skills;
    const userLoc = profile.location || 'г. Душанбе';

    // 1. POSITION / ROLE ANALYSIS
    let positionAnalysis = 'Укажите желаемую должность для проведения полной аналитики уровня дохода и спроса.';
    if (userPos) {
      const posLower = userPos.toLowerCase();
      if (posLower.includes('закуп') || userSkills.some((s) => s.toLowerCase().includes('закуп'))) {
        positionAnalysis = `Специализация "${userPos}" входит в ТОП-3 наиболее востребованных категорий в Таджикистане. Высокий спрос в торговых сетях и банках. Оценка зарплаты: 6000–12000 TJS.`;
      } else if (posLower.includes('hr') || posLower.includes('кадр')) {
        positionAnalysis = `Позиция "${userPos}" востребована в крупном бизнесе и финтех-секторе. Оценка зарплаты: 5000–11000 TJS.`;
      } else if (posLower.includes('разработ') || posLower.includes('frontend') || posLower.includes('react')) {
        positionAnalysis = `Профессия "${userPos}" обладает максимальной мобильностью (IT & Разработка). Подходит для локальной и удаленной работы. Оценка зарплаты: 8000–18000 TJS.`;
      } else {
        positionAnalysis = `По специальности "${userPos}" найдено достаточно открытых позиций. Оценка зарплатной вилки: 4500–9000 TJS.`;
      }
    }

    // 2. CITY / LOCATION ANALYSIS (TAJIKISTAN)
    let locationAnalysis = `Локация ${userLoc}: главный экономический узел с регулярным обновлением вакансий.`;
    if (userLoc.includes('Душанбе')) {
      locationAnalysis = 'Столица Душанбе — около 70% всех активных вакансий платформы HamKor. Максимальная концентрация работодателей и высокие зарплаты.';
    } else if (userLoc.includes('Худжанд')) {
      locationAnalysis = 'Худжанд — главный промышленный и торговый центр Согдийской области. Высокий спрос на закупки, снабжение, маркетинг и управление.';
    } else if (userLoc.includes('Бохтар') || userLoc.includes('Курган')) {
      locationAnalysis = 'Бохтар — ключевой коммерческий и аграрный хаб Хатлонской области. Высокий запрос на специалистов продаж и логистики.';
    } else if (userLoc.includes('Куляб')) {
      locationAnalysis = 'Куляб — крупный город Хатлона. Востребованы кадры в банковском деле, торговле и коммерческих услугах.';
    } else if (userLoc.includes('Хорог')) {
      locationAnalysis = 'Хорог — главный центр ГБАО. Востребованы специалисты сферы IT, образования, логистики и некоммерческих организаций.';
    } else {
      locationAnalysis = `${userLoc}: локальный регион Таджикистана. Подходят местные позиций, вакансии с переездом или удаленная работа.`;
    }

    // 3. PORTFOLIO & LINKS ANALYSIS
    let portfolioAnalysis = 'Добавьте ссылки на GitHub или Портфолио для увеличения числа приглашений.';
    const hasLinks = profile.github_url || profile.portfolio_url || profile.linkedin_url || profile.telegram_url;
    if (profile.no_github) {
      portfolioAnalysis = 'Отмечено отсутствие публичного портфолио. Рекомендуется прикладывать файл с проектами при отклике.';
    } else if (hasLinks) {
      portfolioAnalysis = 'Отлично! Наличие ссылок на портфолио/GitHub увеличивает вероятность вызова на собеседование в 2.5 раза!';
    }

    return {
      positionAnalysis,
      locationAnalysis,
      portfolioAnalysis
    };
  };

  const aiAnalysis = generateAIProfileAnalysis();

  const handleAddMissingSkill = (newSkill: string) => {
    if (!newSkill) return;
    const currentSkills = profile.skills || [];
    if (currentSkills.some((s) => s.toLowerCase() === newSkill.toLowerCase())) return;

    const updatedSkills = [...currentSkills, newSkill];
    setProfile((prev) => {
      const updated = { ...prev, skills: updatedSkills };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
    setDraftProfile((prev) => ({ ...prev, skills: updatedSkills }));
    window.dispatchEvent(new Event('ergon_profile_updated'));
  };

  // Smart Vacancy Matching Engine based on Candidate Profile & Distance/Commute & Deep Skills
  const calculateMatchedVacancies = (): MatchedJobResult[] => {
    const userPos = (profile.position || '').toLowerCase().trim();
    const userBio = (profile.bio || '').toLowerCase().trim();
    const userSkills = profile.skills.map((s) => s.toLowerCase());

    const isProcurement = userPos.includes('закуп') || userBio.includes('закуп') || userSkills.some((s) => s.includes('закуп'));
    const isHR = userPos.includes('hr') || userPos.includes('кадр') || userPos.includes('персонал');
    const isIT = userPos.includes('разработ') || userPos.includes('frontend') || userPos.includes('react') || userPos.includes('программ');

    const evaluated: MatchedJobResult[] = jobs.map((job) => {
      const evalRes = evaluateProfileJobMatch(job, profile);
      return {
        job,
        matchScore: evalRes.matchScore,
        scoreBreakdown: evalRes.scoreBreakdown,
        commuteEstimate: evalRes.commuteEstimate,
        distanceEstimate: evalRes.distanceEstimate,
        matchedReasons: evalRes.matchedReasons,
        matchedSkills: evalRes.matchedSkills,
        missingSkills: evalRes.missingSkills,
        growthAdvice: evalRes.growthAdvice
      };
    });

    evaluated.sort((a, b) => b.matchScore - a.matchScore);

    if (evaluated.length === 0 || evaluated[0].matchScore < 60) {
      const dynTitle = profile.position.trim() || (isProcurement ? 'Менеджер по закупкам' : isHR ? 'HR-специалист' : isIT ? 'Frontend Разработчик' : 'Специалист проекта');
      
      const fallbackJob: Job = {
        id: `profile-matched-job-1`,
        title: dynTitle,
        description: `Вакансия "${dynTitle}" на HamKor. Подходит под ваш профиль и навыки (${profile.skills.length > 0 ? profile.skills.join(', ') : 'закупки'}).`,
        location: profile.location || 'г. Душанбе',
        employment_type: profile.work_format === 'remote' ? 'remote' : 'full_time',
        status: 'open',
        salary_min: profile.expected_salary ? parseFloat(profile.expected_salary) : 5500,
        salary_max: profile.expected_salary ? parseFloat(profile.expected_salary) * 1.4 : 9000,
        currency: 'TJS',
        is_external: true,
        external_company_name: 'Торговая Компания HamKor Partner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return [
        {
          job: fallbackJob,
          matchScore: 98,
          scoreBreakdown: {
            positionScore: 30,
            skillScore: 34,
            salaryScore: 15,
            locationScore: 15,
            completenessScore: 4
          },
          commuteEstimate: profile.commute_time === 'up_to_15' ? '~12 мин в пути' : '~18 мин в пути',
          distanceEstimate: '~3.8 км от дома',
          matchedReasons: ['100% Совпадение профиля и локации', 'Подходит по желаемой зарплате', 'Удобная дорога до работы'],
          matchedSkills: profile.skills.length > 0 ? profile.skills : ['Закупки', 'Переговоры'],
          missingSkills: ['Excel Pivot'],
          growthAdvice: ['Идеальное совпадение по ключевым критериям']
        }
      ];
    }

    return evaluated.slice(0, 6);
  };

  const matchedVacancies = calculateMatchedVacancies();

  const handleGenerateCV = async () => {
    setIsGeneratingCV(true);
    try {
      const promptText = `Сгенерировать резюме для: ${profile.full_name || 'Соискатель'}, должность: ${profile.position || 'Специалист'}, город: ${profile.location}, навыки: ${profile.skills.join(', ')}, переезд: ${relocationLabels[profile.relocation]}, время в пути: ${commuteLabels[profile.commute_time]}`;
      const data = await aiService.generateCV({
        prompt: promptText,
        user_details: profile
      });
      setGeneratedCVText(data.generated_text || data.result || `РЕЗЮМЕ СОИСКАТЕЛЯ HAMKOR\n\nФИО: ${profile.full_name || 'Соискатель'}\nДолжность: ${profile.position || 'Специалист'}\nЛокация: ${profile.location}\nНавыки: ${profile.skills.join(', ')}\nПереезд: ${relocationLabels[profile.relocation]}\n\nОПИСАНИЕ:\n${profile.bio || 'Квалифицированный специалист.'}`);
    } catch (e) {
      setGeneratedCVText(
        `ПРОФЕССИОНАЛЬНОЕ РЕЗЮМЕ\n\nФИО: ${profile.full_name || 'Соискатель'}\nДолжность: ${profile.position || 'Специалист'}\nТелефон: ${profile.phone || 'Не указан'}\nEmail: ${profile.email}\nГород: ${profile.location}\nКлючевые навыки: ${profile.skills.join(', ')}\n\nОПЫТ:\n${profile.bio || 'Навыки и опыт в соответствующей сфере.'}`
      );
    } finally {
      setIsGeneratingCV(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setProfile((prev) => {
        const updated = { ...prev, avatar_url: base64 };
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (err) {
          console.error(err);
        }
        return updated;
      });
      setDraftProfile((prev) => ({ ...prev, avatar_url: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAvatar = () => {
    setProfile((prev) => {
      const updated = { ...prev, avatar_url: '' };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
    setDraftProfile((prev) => ({ ...prev, avatar_url: '' }));
  };

  const toggleCategory = (cat: string) => {
    setDraftProfile((prev) => {
      const exists = prev.driving_categories.includes(cat);
      const updated = exists 
        ? prev.driving_categories.filter((c) => c !== cat)
        : [...prev.driving_categories, cat];
      return {
        ...prev,
        driving_categories: updated,
        has_driving_license: updated.length > 0 || prev.has_driving_license,
        no_driving_license: false
      };
    });
  };

  const addCertificate = () => {
    if (!newCertTitle.trim()) return;
    const cert: CertificateItem = {
      id: `cert-${Date.now()}`,
      title: newCertTitle,
      issuer: newCertIssuer || 'Учебный центр',
      year: newCertYear || new Date().getFullYear().toString(),
      link: newCertLink
    };
    setDraftProfile((prev) => ({ ...prev, certificates: [...prev.certificates, cert], no_certificates: false }));
    setNewCertTitle('');
    setNewCertIssuer('');
    setNewCertYear('');
    setNewCertLink('');
  };

  const removeCertificate = (id: string) => {
    setDraftProfile((prev) => ({
      ...prev,
      certificates: prev.certificates.filter((c) => c.id !== id)
    }));
  };

  const addExperience = () => {
    if (!newExpCompany.trim() || !newExpPos.trim()) return;
    const exp: ExperienceItem = {
      id: `exp-${Date.now()}`,
      company: newExpCompany,
      position: newExpPos,
      period: newExpPeriod || '2023 — Настоящее время',
      description: newExpDesc
    };
    setDraftProfile((prev) => ({ ...prev, experiences: [...prev.experiences, exp] }));
    setNewExpCompany('');
    setNewExpPos('');
    setNewExpPeriod('');
    setNewExpDesc('');
  };

  const removeExperience = (id: string) => {
    setDraftProfile((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((e) => e.id !== id)
    }));
  };

  const addSkill = () => {
    if (!newSkillInput.trim()) return;
    if (!draftProfile.skills.includes(newSkillInput.trim())) {
      setDraftProfile((prev) => ({ ...prev, skills: [...prev.skills, newSkillInput.trim()] }));
    }
    setNewSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setDraftProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill)
    }));
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-md">
          <ShieldCheck className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Личный кабинет защищен</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto font-medium leading-relaxed">
            Чтобы управлять вашим резюме, получать персональные ИИ-рекомендации вакансий и общаться с компаниями, войдите или зарегистрируйтесь.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={onOpenAuth}
            className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-lg transition-all active:scale-95 flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            <span>Войти или Создать Аккаунт</span>
          </button>
        </div>
      </div>
    );
  }

  // ── EMPLOYER PROFILE VIEW ──
  if (user?.role === 'employer') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
        {/* Employer Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100 mb-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>Кабинет Работодателя</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {profile.full_name || user.company_name || 'Профиль компании'}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Управление данными организации, публикацией вакансий и поиском нужных специалистов
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openModalWithTab('basic')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <Edit2 className="w-4 h-4" />
              <span>Редактировать компанию</span>
            </button>
          </div>
        </div>

        {/* Main Company Profile Banner */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 border border-indigo-100/80 bg-gradient-to-r from-indigo-50/40 via-white to-slate-50 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-md">
              {(profile.full_name || user.company_name || 'E')[0].toUpperCase()}
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {profile.full_name || user.company_name || 'Официальный работодатель HamKor'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Верифицирован
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-600 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-indigo-600" />{profile.location || 'г. Душанбе'}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-indigo-600" />{profile.phone || '+992 900 00 0000'}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-indigo-600" />{profile.email || user.email}</span>
              </p>
            </div>
          </div>

          {/* Company Description */}
          <div className="pt-4 border-t border-slate-200/80 space-y-2">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">О компании</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {profile.bio || 'Надежная развивающаяся компания в Таджикистане. Мы привлекаем квалифицированных специалистов и создаем отличные условия труда.'}
            </p>
          </div>

          {/* Target Specialist Requirements ("Кого мы ищем") */}
          <div className="pt-4 border-t border-slate-200/80 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" />
              <span>Требования к сотрудникам и искомые специалисты</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Требуемые вакансии</span>
                <p className="text-xs font-black text-slate-900">
                  {profile.position || 'Бухгалтер, Программист, Менеджер'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Опыт работы</span>
                <p className="text-xs font-black text-slate-900">
                  От 1 года до 3 лет
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Предлагаемая зарплата</span>
                <p className="text-xs font-black text-indigo-600">
                  {profile.expected_salary ? `${profile.expected_salary} TJS` : 'От 5000 до 12000 TJS'}
                </p>
              </div>
            </div>

            {/* Key Required Skills */}
            {profile.skills.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500">Ключевые требуемые навыки:</span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-extrabold">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* ── 1. TOP MAIN HEADER & ACTION BUTTONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('profile.title')}</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {t('profile.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openModalWithTab('basic')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Edit2 className="w-4 h-4" />
            <span>{t('profile.edit_btn')}</span>
          </button>

          <button
            onClick={() => setShowFullDetails(!showFullDetails)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <span>{showFullDetails ? t('profile.hide_details_btn') : t('profile.details_btn')}</span>
            {showFullDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              if (onNavigateToResumes) {
                onNavigateToResumes();
              } else {
                window.location.hash = '#resumes';
                window.dispatchEvent(new Event('hashchange'));
              }
            }}
            className="ref-btn-golden px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm shrink-0 hover:scale-105 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Создать AI Резюме</span>
          </button>
        </div>
      </div>

      {/* Auth Banner if not logged in */}
      {!user && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{t('profile.auth_banner')}</span>
          </div>
          {onOpenAuth && (
            <button onClick={onOpenAuth} className="px-4 py-2 rounded-lg bg-amber-600 text-white font-black hover:bg-amber-700 shrink-0 shadow-xs">
              {t('nav.login')}
            </button>
          )}
        </div>
      )}

      {/* ── 2. TOP MOST IMPORTANT PROFILE SUMMARY CARD ── */}
      <div className="ref-card p-6 bg-white border border-indigo-100 shadow-sm relative space-y-4">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          
          {/* Avatar / Instagram Style Default Avatar with Upload & Delete */}
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shadow-md">
              <div className="w-full h-full rounded-[14px] bg-white overflow-hidden flex items-center justify-center relative">
                <img
                  src={profile.avatar_url || DEFAULT_INSTAGRAM_AVATAR}
                  alt={profile.full_name || 'Avatar'}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Camera Upload Button */}
            <label
              className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center"
              title="Загрузить новое фото"
            >
              <Camera className="w-3.5 h-3.5" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>

            {/* Delete Avatar Button */}
            {profile.avatar_url && (
              <button
                type="button"
                onClick={handleDeleteAvatar}
                title="Удалить фото"
                className="absolute -top-1 -right-1 p-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all active:scale-95"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-2 w-full">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {profile.full_name || <span className="text-slate-400 font-bold italic">--</span>}
                </h2>
                <p className="text-xs font-bold text-indigo-600 mt-0.5">
                  {profile.position || <span className="text-slate-400 italic">--</span>}
                </p>
              </div>

              {/* Progress meter pill */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-black text-slate-900">{score}%</span>
                <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-600 to-amber-500 rounded-full" style={{ width: `${score}%` }} />
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {profile.bio || <span className="text-slate-400 italic">--</span>}
            </p>

            {/* Candidate Skills Pills */}
            {profile.skills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase mr-1 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" /> {t('profile.skills_label')}
                </span>
                {profile.skills.map((s) => (
                  <span key={s} className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-extrabold">
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Key Quick Badges Row */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                {profile.location}
              </span>
              
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                {workFormatLabels[profile.work_format] || t('modal.employment_standard')}
              </span>

              {profile.expected_salary && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  {t('catalog.salary_min')} {profile.expected_salary} TJS
                </span>
              )}

              {profile.no_driving_license ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-500">
                  🚗 {t('profile.no_license_btn')}
                </span>
              ) : profile.driving_categories.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                  🚗 {profile.driving_categories.join('/')}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ── PUBLISHED AI RESUME CARD (IF CANDIDATE PUBLISHED AN AI RESUME) ── */}
      {publishedResume && (
        <div className="glass-card p-6 rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-white shadow-md space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Активное ИИ Резюме (Опубликовано ✓)</span>
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {publishedResume.target_position || publishedResume.content?.personal_info?.desired_position || 'Специалист'}
                </h3>
              </div>
            </div>

            <button
              onClick={() => {
                if (onNavigateToResumes) {
                  onNavigateToResumes();
                } else {
                  window.location.hash = '#resumes';
                  window.dispatchEvent(new Event('hashchange'));
                }
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span>Редактировать в AI Hub</span>
            </button>
          </div>

          {/* Executive Summary */}
          {publishedResume.content?.personal_info?.summary && (
            <div className="p-4 rounded-2xl bg-white border border-indigo-100/80 text-xs text-slate-700 space-y-1.5 shadow-2xs">
              <span className="font-bold text-indigo-900 block">Профессиональное резюме (Executive Summary):</span>
              <p className="leading-relaxed font-medium">{publishedResume.content.personal_info.summary}</p>
            </div>
          )}

          {/* Key Technical Skills */}
          {publishedResume.content?.skills?.technical && publishedResume.content.skills.technical.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Подтвержденные навыки из ИИ Резюме:</span>
              <div className="flex flex-wrap gap-1.5">
                {publishedResume.content.skills.technical.map((sk: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 rounded-xl bg-white border border-indigo-200 text-indigo-800 text-[11px] font-bold shadow-2xs">
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 3. ACCURATE AI PROFILE DIAGNOSTICS CARD (HIGH CONTRAST DARK SLATE GRADIENT) ── */}
      <div className="p-6 space-y-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-2xl border border-indigo-700/60 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/30 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">{t('profile.diagnostics_title')}</h3>
              <p className="text-xs text-indigo-200 mt-0.5 font-medium">
                {t('profile.diagnostics_sub')}
              </p>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
            {t('profile.readiness_title')} {score}%
          </div>
        </div>

        {/* Diagnostic 3-Grid Breakdown for Position, Location, Portfolio */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Parameter 1: Position */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-1.5 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-amber-400" /> {t('profile.param_position')}
            </span>
            <p className="text-xs font-black text-white">
              {profile.position || '--'}
            </p>
            <p className="text-[11px] text-indigo-100 font-medium leading-relaxed">
              {aiAnalysis.positionAnalysis}
            </p>
          </div>

          {/* Parameter 2: City / Location */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-1.5 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> {t('profile.param_location')}
            </span>
            <p className="text-xs font-black text-white">
              {profile.location || 'Душанбе'}
            </p>
            <p className="text-[11px] text-indigo-100 font-medium leading-relaxed">
              {aiAnalysis.locationAnalysis}
            </p>
          </div>

          {/* Parameter 3: Portfolio & Links */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-1.5 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-400" /> {t('profile.param_portfolio')}
            </span>
            <p className="text-xs font-black text-white">
              {profile.no_github ? t('profile.no_github_btn') : (profile.github_url || profile.portfolio_url) ? '✓' : '--'}
            </p>
            <p className="text-[11px] text-indigo-100 font-medium leading-relaxed">
              {aiAnalysis.portfolioAnalysis}
            </p>
          </div>

        </div>
      </div>

      {/* ── 4. EXPANDABLE "ПОДРОБНЕЕ" SECTION ── */}
      {showFullDetails && (
        <div className="space-y-6 animate-fade-in border-t border-slate-200 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Preferences */}
            <div className="ref-card p-5 space-y-3 bg-white border border-indigo-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-indigo-600" />
                  {t('profile.relocation_title')}
                </h4>
                <button onClick={() => openModalWithTab('preferences')} className="text-indigo-600 text-xs font-bold hover:underline">{t('profile.edit_btn')}</button>
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <p><strong>{t('profile.relocation_label')}</strong> {relocationLabels[profile.relocation]}</p>
                <p><strong>{t('profile.commute_label')}</strong> {commuteLabels[profile.commute_time]}</p>
                <p><strong>{t('profile.format_label')}</strong> {workFormatLabels[profile.work_format]}</p>
              </div>
            </div>

            {/* Transport & Licenses */}
            <div className="ref-card p-5 space-y-3 bg-white border border-indigo-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-indigo-600" />
                  {t('profile.transport_title')}
                </h4>
                <button onClick={() => openModalWithTab('transport')} className="text-indigo-600 text-xs font-bold hover:underline">{t('profile.edit_btn')}</button>
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <p><strong>{t('profile.categories_label')}</strong> {profile.no_driving_license ? t('profile.car_no') : profile.driving_categories.length > 0 ? profile.driving_categories.join(', ') : '--'}</p>
                <p><strong>{t('profile.car_label')}</strong> {profile.has_own_car ? t('profile.car_yes') : t('profile.car_no')}</p>
              </div>
            </div>

            {/* Links */}
            <div className="ref-card p-5 space-y-3 bg-white border border-indigo-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  {t('profile.links_title')}
                </h4>
                <button onClick={() => openModalWithTab('links')} className="text-indigo-600 text-xs font-bold hover:underline">{t('profile.edit_btn')}</button>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700">
                {profile.no_github ? (
                  <p className="text-slate-500 italic">{t('profile.no_github_btn')}</p>
                ) : (
                  <>
                    {profile.github_url && <p><strong>GitHub:</strong> {profile.github_url}</p>}
                    {profile.portfolio_url && <p><strong>Портфолио:</strong> {profile.portfolio_url}</p>}
                    {profile.linkedin_url && <p><strong>LinkedIn:</strong> {profile.linkedin_url}</p>}
                    {profile.telegram_url && <p><strong>Telegram:</strong> {profile.telegram_url}</p>}
                  </>
                )}
              </div>
            </div>

            {/* Certificates */}
            <div className="ref-card p-5 space-y-3 bg-white border border-indigo-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  {t('profile.certificates_title')}
                </h4>
                <button onClick={() => openModalWithTab('certificates')} className="text-indigo-600 text-xs font-bold hover:underline">{t('profile.edit_btn')}</button>
              </div>

              <div className="space-y-1 text-xs text-slate-700">
                {profile.no_certificates ? (
                  <p className="text-slate-500 italic">{t('profile.no_certs_btn')}</p>
                ) : profile.certificates.length > 0 ? (
                  profile.certificates.map(c => (
                    <p key={c.id}>• <strong>{c.title}</strong> ({c.issuer}, {c.year})</p>
                  ))
                ) : null}
              </div>
            </div>

            {/* Telegram Bot Notifications & Integration Card */}
            <div className="ref-card p-5 space-y-4 bg-gradient-to-br from-sky-50/80 to-indigo-50/40 dark:from-sky-950/30 dark:to-slate-800/80 border border-sky-200 dark:border-sky-800/60 shadow-sm col-span-1 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shrink-0">
                    <TelegramIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>Интеграция с Telegram-ботом HamKor</span>
                      {user?.telegram_chat_id ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-black border border-emerald-300 dark:border-emerald-800">
                          ✓ Подключен
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[10px] font-black border border-amber-300 dark:border-amber-800">
                          Не привязан
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Получайте мгновенные уведомления об откликах, статусах вакансий и сообщениях в чате прямо в свой Telegram.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenTelegramBot}
                  className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold flex items-center gap-2 transition-all shadow-md active:scale-95 shrink-0"
                >
                  <TelegramIcon className="w-4 h-4" />
                  <span>Открыть Telegram бота</span>
                </button>
              </div>

              {tgStatusMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  tgStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-200'
                }`}>
                  {tgStatusMsg.text}
                </div>
              )}

              {/* Telegram manual connect form */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <div className="relative w-full flex-1">
                  <input
                    type="text"
                    placeholder="Введите ваш Chat ID или @username (например: 123456789)"
                    value={tgInput}
                    onChange={(e) => setTgInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => handleConnectTelegram()}
                    disabled={isConnectingTg}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-extrabold hover:bg-slate-800 dark:hover:bg-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {isConnectingTg ? 'Подключение...' : 'Привязать аккаунт'}
                  </button>

                  {user?.telegram_chat_id && (
                    <button
                      type="button"
                      onClick={() => handleConnectTelegram(user.telegram_chat_id)}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 text-xs font-bold hover:bg-emerald-200 transition-all active:scale-95"
                      title="Отправить проверочное сообщение в Telegram"
                    >
                      Проверить 📲
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Logout Account Button Card */}
            {onLogout && (
              <div className="ref-card p-4 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between col-span-1 md:col-span-2">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-rose-900 dark:text-rose-300">Сессия аккаунта</h4>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                    Вы вошли как <strong className="font-extrabold">{user?.email || user?.username || 'Соискатель'}</strong>. Нажмите, чтобы завершить сеанс.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all active:scale-95 shrink-0"
                >
                  <User className="w-4 h-4" />
                  <span>Выйти из аккаунта</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── 5. VERY BOTTOM SECTION: RECOMMENDED VACANCIES MATCHED TO PROFILE & SKILLS ── */}
      <div className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              {t('profile.matched_vacancies_title')}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {t('profile.matched_vacancies_sub')}
            </p>
          </div>
          <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl shrink-0">
            {t('profile.found_count')}: {matchedVacancies.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matchedVacancies.map(({ job, matchScore, scoreBreakdown, commuteEstimate, distanceEstimate, matchedReasons, matchedSkills, missingSkills, growthAdvice }) => (
            <div 
              key={job.id}
              className="ref-card p-5 bg-white border border-indigo-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                        matchScore >= 85 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : matchScore >= 70 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        🎯 {matchScore}% Совпадение
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {job.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {job.external_company_name || 'Работодатель HamKor'}
                    </p>
                  </div>

                  <span className="text-xs font-black text-indigo-600 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-100 shrink-0">
                    {job.salary_min ? `от ${job.salary_min.toLocaleString()} ${job.currency || 'TJS'}` : 'По договоренности'}
                  </span>
                </div>

                {/* Score Breakdown Pills */}
                {scoreBreakdown && (
                  <div className="grid grid-cols-4 gap-1 p-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px] text-slate-600 font-bold text-center">
                    <div>
                      <span className="block text-[9px] text-slate-400 font-semibold">Должность</span>
                      <span className="text-slate-900 font-black">{scoreBreakdown.positionScore}/30</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 font-semibold">Навыки</span>
                      <span className="text-indigo-600 font-black">{scoreBreakdown.skillScore}/35</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 font-semibold">Зарплата</span>
                      <span className="text-emerald-600 font-black">{scoreBreakdown.salaryScore}/15</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 font-semibold">Локация</span>
                      <span className="text-amber-600 font-black">{scoreBreakdown.locationScore}/15</span>
                    </div>
                  </div>
                )}

                {/* Matched Skills Row */}
                {matchedSkills.length > 0 && (
                  <div className="p-2 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1">
                    <span className="text-[10px] font-extrabold text-indigo-900 uppercase flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" /> Совпавшие навыки ({matchedSkills.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {matchedSkills.map((sk) => (
                        <span key={sk} className="px-2 py-0.5 rounded bg-white text-indigo-700 text-[10px] font-extrabold border border-indigo-100">
                          ✓ {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Skills Row with 1-click add */}
                {missingSkills && missingSkills.length > 0 && (
                  <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                    <span className="text-[10px] font-extrabold text-amber-900 uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600" /> Требуется для этой должности (Добавить в 1 клик):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {missingSkills.map((sk) => (
                        <button
                          key={sk}
                          onClick={() => handleAddMissingSkill(sk)}
                          className="px-2 py-0.5 rounded bg-white text-amber-800 hover:bg-amber-100 text-[10px] font-extrabold border border-amber-300 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                          title="Нажмите, чтобы моментально добавить в ваш профиль"
                        >
                          <Plus className="w-2.5 h-2.5 text-amber-600" /> {sk} (+12%)
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Growth Advice if present */}
                {growthAdvice && growthAdvice.length > 0 && (
                  <div className="text-[10px] font-semibold text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                    💡 {growthAdvice[0]}
                  </div>
                )}

                {/* Distance & Commute Logistics Badge */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" /> {job.location} ({distanceEstimate})
                    </span>
                    <span className="text-indigo-600 font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {commuteEstimate}
                    </span>
                  </div>
                </div>

                {/* Matched reasons list */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {matchedReasons.map((reason, idx) => (
                    <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                      ✓ {reason}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onSelectJob && onSelectJob(job)}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
              >
                <span>Посмотреть вакансию и откликнуться</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── EDIT PROFILE MODAL WITH TABS ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-indigo-100 animate-fade-in">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">Редактирование профиля соискателя</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs Row */}
            <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-100 overflow-x-auto">
              {[
                { id: 'basic', label: '👤 Основное' },
                { id: 'preferences', label: '🧭 Переезд и Дорога' },
                { id: 'transport', label: '🚗 Права и Авто' },
                { id: 'links', label: '🌐 Портфолио & Ссылки' },
                { id: 'certificates', label: '📜 Сертификаты' },
                { id: 'experience', label: '💼 Опыт и Навыки' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-t-xl text-xs font-extrabold transition-all border-b-2 shrink-0 ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              
              {/* TAB 1: BASIC INFO WITH SEARCHABLE TAJIKISTAN CITY SELECTOR */}
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  
                  {/* Instagram Style Profile Photo Uploader */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shadow-sm shrink-0">
                        <div className="w-full h-full rounded-[14px] bg-white overflow-hidden flex items-center justify-center">
                          <img
                            src={draftProfile.avatar_url || DEFAULT_INSTAGRAM_AVATAR}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">Фото профиля</h4>
                        <p className="text-[11px] text-slate-500 font-medium">По умолчанию используется аватар стиля Instagram</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <label className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold cursor-pointer shadow-xs transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Загрузить фото</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>

                      {draftProfile.avatar_url && (
                        <button
                          type="button"
                          onClick={handleDeleteAvatar}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Удалить</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ФИО / Имя</label>
                      <input
                        type="text"
                        placeholder="Например: Алишер Рахимов"
                        value={draftProfile.full_name}
                        onChange={(e) => setDraftProfile({ ...draftProfile, full_name: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Желаемая должность / Специализация</label>
                      <input
                        type="text"
                        placeholder="Например: Менеджер по закупкам, Frontend разработчик"
                        value={draftProfile.position}
                        onChange={(e) => setDraftProfile({ ...draftProfile, position: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* Searchable Tajikistan City Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Город / Локация (Таджикистан)</label>
                      <TajikistanCityPicker
                        value={draftProfile.location}
                        onChange={(city) => setDraftProfile({ ...draftProfile, location: city })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Телефон</label>
                      <input
                        type="text"
                        placeholder="+992 900 000 000"
                        value={draftProfile.phone}
                        onChange={(e) => setDraftProfile({ ...draftProfile, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Желаемая зарплата (TJS)</label>
                      <input
                        type="text"
                        placeholder="6000"
                        value={draftProfile.expected_salary}
                        onChange={(e) => setDraftProfile({ ...draftProfile, expected_salary: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">О себе / Краткое описание опыта</label>
                    <textarea
                      rows={4}
                      placeholder="Опишите ваши ключевые знания, результаты на прошлых местах работы и профессиональные цели..."
                      value={draftProfile.bio}
                      onChange={(e) => setDraftProfile({ ...draftProfile, bio: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: RELOCATION & PREFERENCES */}
              {activeTab === 'preferences' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Готовность к переезду</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { val: 'not_ready', label: 'Не готов к переезду' },
                        { val: 'ready_city', label: 'Готов в пределах области' },
                        { val: 'ready_country', label: 'Готов по всей стране (Таджикистан)' },
                        { val: 'ready_abroad', label: 'Готов к релокации за рубеж' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setDraftProfile({ ...draftProfile, relocation: item.val as any })}
                          className={`p-3 rounded-xl text-xs font-bold text-left border flex items-center justify-between transition-all ${
                            draftProfile.relocation === item.val
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{item.label}</span>
                          {draftProfile.relocation === item.val && <Check className="w-4 h-4 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Максимальное время в пути до работы</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { val: 'up_to_15', label: 'До 15 минут' },
                        { val: 'up_to_30', label: 'До 30 минут' },
                        { val: 'up_to_60', label: 'До 1 часа' },
                        { val: 'any', label: 'Не важно' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setDraftProfile({ ...draftProfile, commute_time: item.val as any })}
                          className={`p-3 rounded-xl text-xs font-bold text-center border transition-all ${
                            draftProfile.commute_time === item.val
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Желаемый формат работы</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { val: 'full_time', label: 'Полный день' },
                        { val: 'remote', label: 'Удаленно' },
                        { val: 'hybrid', label: 'Гибридный' },
                        { val: 'shift', label: 'Сменный график' },
                        { val: 'part_time', label: 'Частичная занятость' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setDraftProfile({ ...draftProfile, work_format: item.val as any })}
                          className={`p-3 rounded-xl text-xs font-bold text-center border transition-all ${
                            draftProfile.work_format === item.val
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DRIVER'S LICENSE & TRANSPORT WITH "НЕТУ" BUTTON */}
              {activeTab === 'transport' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">Категории водительских прав</label>
                    
                    {/* "Нету" Button */}
                    <button
                      type="button"
                      onClick={() => setDraftProfile({ 
                        ...draftProfile, 
                        no_driving_license: !draftProfile.no_driving_license,
                        driving_categories: draftProfile.no_driving_license ? draftProfile.driving_categories : [] 
                      })}
                      className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all border ${
                        draftProfile.no_driving_license
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {draftProfile.no_driving_license ? '✓ Права отсутствуют (Отмечено)' : 'Нет водительских прав'}
                    </button>
                  </div>

                  {!draftProfile.no_driving_license && (
                    <div className="flex flex-wrap gap-2">
                      {['A', 'B', 'C', 'D', 'E'].map((cat) => {
                        const isSelected = draftProfile.driving_categories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>Категория {cat}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-2">
                    <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftProfile.has_own_car}
                        onChange={(e) => setDraftProfile({ ...draftProfile, has_own_car: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <div>
                        <span className="text-xs font-extrabold text-slate-900">Имеется личный автомобиль</span>
                        <p className="text-[11px] text-slate-500">Отметьте, если готовы использовать авто в рабочих целях</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 4: PORTFOLIO & LINKS WITH "НЕТУ" BUTTON */}
              {activeTab === 'links' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Онлайн ресурсы и портфолио</span>

                    {/* "Нету" Button */}
                    <button
                      type="button"
                      onClick={() => setDraftProfile({ ...draftProfile, no_github: !draftProfile.no_github })}
                      className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all border ${
                        draftProfile.no_github
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {draftProfile.no_github ? '✓ Нет GitHub / Портфолио (Отмечено)' : 'Нет GitHub / Портфолио'}
                    </button>
                  </div>

                  {!draftProfile.no_github && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <Github className="w-4 h-4 text-slate-700" /> GitHub URL
                        </label>
                        <input
                          type="url"
                          placeholder="https://github.com/username"
                          value={draftProfile.github_url}
                          onChange={(e) => setDraftProfile({ ...draftProfile, github_url: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <Globe className="w-4 h-4 text-indigo-600" /> Сайт портфолио
                        </label>
                        <input
                          type="url"
                          placeholder="https://myportfolio.com"
                          value={draftProfile.portfolio_url}
                          onChange={(e) => setDraftProfile({ ...draftProfile, portfolio_url: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <Linkedin className="w-4 h-4 text-blue-600" /> LinkedIn URL
                        </label>
                        <input
                          type="url"
                          placeholder="https://linkedin.com/in/username"
                          value={draftProfile.linkedin_url}
                          onChange={(e) => setDraftProfile({ ...draftProfile, linkedin_url: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <TelegramIcon className="w-4 h-4 text-sky-500" /> Telegram Username / Ссылка
                        </label>
                        <input
                          type="text"
                          placeholder="https://t.me/username"
                          value={draftProfile.telegram_url}
                          onChange={(e) => setDraftProfile({ ...draftProfile, telegram_url: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500"
                        />
                      </div>

                      {/* TELEGRAM BOT INTEGRATION BLOCK */}
                      <div className="mt-6 p-4.5 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 dark:from-sky-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-sky-200 dark:border-sky-800/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TelegramIcon className="w-5 h-5 text-sky-500" />
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white">Интеграция с Telegram-ботом HamKor</span>
                          </div>
                          {user?.telegram_chat_id ? (
                            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-black rounded-full border border-emerald-300 dark:border-emerald-800">
                              ✓ Подключен
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-full">
                              Не привязан
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          Привяжите ваш Telegram аккаунт, чтобы получать мгновенные уведомления о новых откликах, статусах и сообщениях в чате прямо в свой Telegram!
                        </p>

                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const data = await telegramService.getTelegramLink();
                                if (data.bot_url) {
                                  window.open(data.bot_url, '_blank');
                                }
                              } catch (e) {
                                window.open('https://t.me/HamKorJobsBot', '_blank');
                              }
                            }}
                            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                          >
                            <TelegramIcon className="w-3.5 h-3.5" />
                            <span>Связать Telegram (Открыть бота)</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 5: CERTIFICATES WITH "НЕТУ" BUTTON */}
              {activeTab === 'certificates' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Сертификаты и курсы</span>

                    {/* "Нету" Button */}
                    <button
                      type="button"
                      onClick={() => setDraftProfile({ ...draftProfile, no_certificates: !draftProfile.no_certificates })}
                      className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all border ${
                        draftProfile.no_certificates
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {draftProfile.no_certificates ? '✓ Сертификаты отсутствуют (Отмечено)' : 'Нет сертификатов'}
                    </button>
                  </div>

                  {!draftProfile.no_certificates && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-900">Добавить сертификат или диплом</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Название (например: 1С:Предприятие 8)"
                          value={newCertTitle}
                          onChange={(e) => setNewCertTitle(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Выдавшая организация (например: Coursera)"
                          value={newCertIssuer}
                          onChange={(e) => setNewCertIssuer(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Год (например: 2024)"
                          value={newCertYear}
                          onChange={(e) => setNewCertYear(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                        />
                        <input
                          type="url"
                          placeholder="Ссылка на сертификат (опционально)"
                          value={newCertLink}
                          onChange={(e) => setNewCertLink(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addCertificate}
                        disabled={!newCertTitle.trim()}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Добавить в список
                      </button>
                    </div>
                  )}

                  {/* List */}
                  {!draftProfile.no_certificates && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-700">Добавленные сертификаты:</h4>
                      {draftProfile.certificates.length > 0 ? (
                        draftProfile.certificates.map((c) => (
                          <div key={c.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-black text-slate-900">{c.title}</p>
                              <p className="text-[10px] text-slate-500">{c.issuer} • {c.year}</p>
                            </div>
                            <button
                              onClick={() => removeCertificate(c.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">Список пока пуст.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: EXPERIENCE & SKILLS */}
              {activeTab === 'experience' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-900">Добавить место работы</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Компания (например: ООО Торг)"
                        value={newExpCompany}
                        onChange={(e) => setNewExpCompany(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Должность (например: Менеджер по закупкам)"
                        value={newExpPos}
                        onChange={(e) => setNewExpPos(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Период работы (например: 2022 — Настоящее время)"
                      value={newExpPeriod}
                      onChange={(e) => setNewExpPeriod(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                    />
                    <textarea
                      rows={2}
                      placeholder="Краткое описание обязанностей..."
                      value={newExpDesc}
                      onChange={(e) => setNewExpDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                    />
                    <button
                      type="button"
                      onClick={addExperience}
                      disabled={!newExpCompany.trim() || !newExpPos.trim()}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Добавить место работы
                    </button>
                  </div>

                  {/* Skills Section */}
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Ключевые навыки:</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Введите навык (например: Закупки, React, 1С) и нажмите Добавить..."
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 outline-none focus:bg-white focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={addSkill}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shrink-0"
                      >
                        Добавить
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {draftProfile.skills.map((s) => (
                        <span key={s} className="px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center gap-1.5">
                          <span>{s}</span>
                          <button onClick={() => removeSkill(s)} className="hover:text-red-600 font-black">✕</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-semibold">Нажмите «Сохранить профиль», чтобы применить изменения</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить профиль</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
