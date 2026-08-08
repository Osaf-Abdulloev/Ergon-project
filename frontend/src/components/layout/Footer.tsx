import React from 'react';
import { ExternalLink, ShieldCheck, Heart, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-3">
            <img 
              src="/logo-dark.png" 
              alt="HamKor Logo" 
              className="h-12 w-auto object-contain dark:block hidden"
              onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
            />
            <img 
              src="/logo-light.png" 
              alt="HamKor Logo" 
              className="h-12 w-auto object-contain dark:hidden block"
              onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
            />
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 font-extrabold border border-indigo-500/20">v2.0 AI</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center md:text-left">
            Интеллектуальная платформа агрегации вакансий и карьерного развития в Таджикистане.
          </p>
        </div>


        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Автоматический парсинг yora.tj</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-4 h-4 text-violet-accent" />
            <span>AI Оптимизация Резюме</span>
          </div>
          <a 
            href="https://yora.tj" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-brand-600 transition-colors"
          >
            <span>Оригинал: yora.tj</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1">
          <span>Сделано с</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>для соискателей</span>
        </div>

      </div>
    </footer>
  );
};
