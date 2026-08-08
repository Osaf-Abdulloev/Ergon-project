import React, { useState, useEffect } from 'react';
import { X, Mail, Send, CheckCircle2, AlertCircle, Sparkles, Building2 } from 'lucide-react';
import { Candidate } from '../../types';
import { candidateService } from '../../services/api';

interface SendEmailModalProps {
  candidate: Candidate | null;
  onClose: () => void;
  user?: any;
  onOpenAuth?: () => void;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  candidate,
  onClose,
  user,
  onOpenAuth
}) => {
  if (!candidate) return null;

  const u: any = candidate.user || {};
  const initialEmail = u.email && !u.email.includes('@yora.tj') ? u.email : (u.email || 'abdulloevosaf0@gmail.com');
  const candidateName = u.full_name || u.username || 'Соискатель';
  const position = candidate.desired_position || 'Специалист';

  const [toEmail, setToEmail] = useState(initialEmail);
  const [subject, setSubject] = useState(`Приглашение на собеседование — ${position}`);
  const [message, setMessage] = useState(
    `Здравствуйте, ${candidateName}!\n\nПросмотрели ваше резюме на платформе HamKor. Ваш опыт работы и навыки подходят для нашей вакансии "${position}".\n\nПредлагаем обсудить детали и назначить удобное время для собеседования.\n\nС уважением,\nОтдел кадров`
  );
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (candidate) {
      const e = u.email || 'abdulloevosaf0@gmail.com';
      setToEmail(e);
      setSubject(`Приглашение на собеседование — ${candidate.desired_position || 'Специалист'}`);
      setMessage(`Здравствуйте, ${candidateName}!\n\nПросмотрели ваше резюме на платформе HamKor. Ваш опыт работы и навыки подходят для нашей вакансии "${candidate.desired_position || 'Специалист'}".\n\nПредлагаем обсудить детали и назначить удобное время для собеседования.\n\nС уважением,\nОтдел кадров`);
    }
  }, [candidate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (!toEmail.trim() || !subject.trim() || !message.trim()) {
      setErrorMsg('Пожалуйста, заполните email, тему и текст сообщения');
      return;
    }

    setSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await candidateService.sendCandidateEmail({
        candidate_user_id: candidate.user_id || candidate.id,
        recipient_email: toEmail.trim(),
        subject: subject.trim(),
        message: message.trim()
      });

      setSuccessMsg(res.message || `Ваше сообщение успешно отправлено на email ${toEmail}!`);
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error('Error sending candidate email:', err);
      const detail = err?.response?.data?.detail || 'Не удалось отправить email. Проверьте подключение к серверу.';
      setErrorMsg(detail);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-indigo-100 dark:border-slate-700 relative space-y-6 animate-scale-up">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-700 border border-indigo-100 dark:border-slate-600 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
              Написать на Email соискателю
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              {candidateName} ({position})
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs font-extrabold flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Recipient Email Info */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Кому (Gmail / Email работника)</label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-indigo-500 transition-all">
              <Mail className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <input
                type="email"
                required
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="email@gmail.com"
                className="w-full text-xs font-bold text-slate-900 dark:text-slate-100 bg-transparent outline-none"
              />
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Тема письма</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Тема письма..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Text Message */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Текст сообщения</label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Напишите сообщение..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-slate-100 leading-relaxed"
            />
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={sending || !!successMsg}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${sending ? 'animate-bounce' : ''}`} />
              <span>{sending ? 'Отправка...' : 'Отправить Email'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
