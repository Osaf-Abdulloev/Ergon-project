import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Building, ArrowRight, ShieldCheck } from 'lucide-react';
import { authService } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'worker' | 'employer'>('worker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [inn, setInn] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const res = await authService.login({ email, password });
        let loggedUser = res.user;
        if (!loggedUser) {
          loggedUser = await authService.getCurrentUser();
        }
        if (!loggedUser) {
          loggedUser = { id: `usr-${Date.now()}`, email, username: email.split('@')[0], role };
        }
        localStorage.setItem('ergon_user', JSON.stringify(loggedUser));
        window.dispatchEvent(new Event('ergon_profile_updated'));
        onSuccess(loggedUser);
        onClose();
      } else {
        const cleanUsername = username.trim() || email.split('@')[0];
        if (role === 'worker') {
          await authService.registerWorker({ email, username: cleanUsername, password });
        } else {
          const cleanInn = inn.trim();
          if (!companyName.trim() || !cleanInn || cleanInn.length !== 9) {
            setError('Для регистрации работодателя обязательно укажите полное название компании и 9-значный ИНН организации (например, 010023456).');
            setLoading(false);
            return;
          }
          await authService.registerEmployer({ email, username: cleanUsername, password, company_name: companyName.trim(), inn: cleanInn });
        }
        const res = await authService.login({ email, password });
        let loggedUser = res.user;
        if (!loggedUser) {
          loggedUser = await authService.getCurrentUser();
        }
        if (!loggedUser) {
          loggedUser = { id: `usr-${Date.now()}`, email, username: cleanUsername, role };
        }
        localStorage.setItem('ergon_user', JSON.stringify(loggedUser));
        window.dispatchEvent(new Event('ergon_profile_updated'));
        onSuccess(loggedUser);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Произошла ошибка проверки данных организации. Убедитесь, что ИНН и название компании верны.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6 flex flex-col items-center">
          <img 
            src="/logo-dark.png" 
            alt="HamKor Logo" 
            className="h-14 w-auto object-contain mb-3 dark:block hidden"
            onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
          />
          <img 
            src="/logo-light.png" 
            alt="HamKor Logo" 
            className="h-14 w-auto object-contain mb-3 dark:hidden block"
            onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
          />
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {mode === 'login' ? t('nav.login') : 'Регистрация'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            {mode === 'login' ? 'Получите доступ к AI-инструментам и откликам' : 'Выберите вашу роль на платформе'}
          </p>
        </div>


        {/* Mode Switcher Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-6 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
              mode === 'login' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {t('nav.login')}
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
              mode === 'register' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* Role Switcher if Register */}
        {mode === 'register' && (
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setRole('worker')}
              className={`flex-1 p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                role === 'worker' 
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black shadow-2xs' 
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <UserIcon className="w-5 h-5" />
              <span className="text-xs">Соискатель</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('employer')}
              className={`flex-1 p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                role === 'employer' 
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black shadow-2xs' 
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Building className="w-5 h-5" />
              <span className="text-xs">{t('nav.employer')}</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Имя пользователя</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alex_dev"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
            </div>
          )}

          {mode === 'register' && role === 'employer' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Название компании <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Например: ЗАО Алиф Банк, ООО Осиё..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    ИНН компании (9 цифр) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800/60 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    Реестр РТ
                  </span>
                </div>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-indigo-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={9}
                    value={inn}
                    onChange={(e) => setInn(e.target.value.replace(/\D/g, ''))}
                    placeholder="Пример: 010023456"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 tracking-wider"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  * Наш сервис сверяет ИНН и название организации с Единым налоговым реестром РТ.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Электронная почта</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Пароль</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Загрузка...' : mode === 'login' ? t('nav.login') : 'Зарегистрироваться'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
