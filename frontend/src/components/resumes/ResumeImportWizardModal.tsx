import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Layers, ArrowRight, ShieldCheck } from 'lucide-react';
import { resumeService } from '../../services/resumeService';
import { api } from '../../services/api';
import { Resume } from '../../types/resume';
import { useLanguage } from '../../i18n/LanguageContext';

interface ResumeImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (resume: Resume) => void;
  user?: any;
}

export const ResumeImportWizardModal: React.FC<ResumeImportWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user
}) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const [step, setStep] = useState<'upload' | 'analyzing' | 'error'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  
  const [analysisProgress, setAnalysisProgress] = useState(10);
  const [analysisStatusText, setAnalysisStatusText] = useState('Чтение файла...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch previous uploaded files
  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setSelectedFile(null);
      setSelectedFileId(null);
      setErrorMessage(null);

      setIsLoadingFiles(true);
      api.get('/files/my-uploads').then((res) => {
        const items = res.data?.items || res.data || [];
        setUserFiles(items.filter((f: any) => f.folder === 'resumes' || f.mime_type.includes('pdf') || f.mime_type.includes('word') || f.original_filename.endsWith('.pdf') || f.original_filename.endsWith('.docx')));
      }).catch(() => {
        setUserFiles([]);
      }).finally(() => {
        setIsLoadingFiles(false);
      });
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExts = ['.pdf', '.docx', '.doc', '.txt'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!validExts.includes(fileExt)) {
        setErrorMessage('Поддерживаются только форматы PDF, DOCX, DOC, TXT.');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage('Размер файла не должен превышать 15 МБ.');
        return;
      }

      setSelectedFile(file);
      setSelectedFileId(null);
      setErrorMessage(null);
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile && !selectedFileId) {
      setErrorMessage('Выберите файл резюме или выберите из галереи.');
      return;
    }

    setStep('analyzing');
    setAnalysisProgress(15);
    setAnalysisStatusText('Чтение и распознавание документа...');

    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev < 40) {
          setAnalysisStatusText('Распознавание структуры...');
          return prev + 15;
        } else if (prev < 75) {
          setAnalysisStatusText('HamKor AI: Извлечение опыта, навыков и образования...');
          return prev + 10;
        } else if (prev < 92) {
          setAnalysisStatusText('Формирование разделов и проверка совпадений...');
          return prev + 5;
        }
        return prev;
      });
    }, 400);

    try {
      const createdResume = await resumeService.parseCVFile(selectedFile || undefined, selectedFileId || undefined);
      clearInterval(interval);
      setAnalysisProgress(100);
      setAnalysisStatusText('Резюме сформировано!');

      if (createdResume) {
        setTimeout(() => {
          onSuccess(createdResume);
          onClose();
        }, 600);
      } else {
        throw new Error('Failed to parse resume');
      }
    } catch (err: any) {
      clearInterval(interval);
      console.error('CV Parsing error:', err);
      setStep('error');
      setErrorMessage(err?.response?.data?.detail || 'Не удалось распознать документ. Проверьте формат файла.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-indigo-100 dark:border-slate-700 relative space-y-6 animate-scale-up">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">ИИ Конструктор Резюме</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              Загрузите ваш файл CV, и HamKor AI мгновенно сформирует резюме.
            </p>
          </div>
        </div>

        {/* STEP 1: UPLOAD OR CHOOSE GALLERY FILE */}
        {step === 'upload' && (
          <div className="space-y-5 animate-fade-in">
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Dropzone File Upload */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Загрузить файл резюме (PDF, DOCX, TXT)</label>
              <label className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${selectedFile ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/60' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mb-2 shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-xs font-black text-indigo-700 dark:text-indigo-300">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{(selectedFile.size / (1024 * 1024)).toFixed(2)} МБ • Нажмите для смены</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100">Перетащите сюда файл или нажмите для выбора</p>
                    <p className="text-[10px] text-slate-400">Поддерживаются PDF, DOCX, DOC, TXT (до 15 МБ)</p>
                  </div>
                )}
              </label>
            </div>

            {/* Previously uploaded files in gallery */}
            {userFiles.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Или выберите из ранее загруженных файлов:
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {userFiles.map((f) => {
                    const isSel = selectedFileId === f.id;
                    return (
                      <div
                        key={f.id}
                        onClick={() => {
                          setSelectedFileId(f.id);
                          setSelectedFile(null);
                          setErrorMessage(null);
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${isSel ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 font-bold shadow-xs' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium'}`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className={`w-4 h-4 shrink-0 ${isSel ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                          <span className="truncate">{f.original_filename}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">{new Date(f.created_at || Date.now()).toLocaleDateString('ru-RU')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200 text-xs font-semibold space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-indigo-950 dark:text-indigo-100">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>ИИ не публикует резюме автоматически</span>
              </div>
              <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
                Вы сможете отредактировать каждую секцию, проверить опыт и внести любые изменения перед публикацией.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={!selectedFile && !selectedFileId}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                <span>Создать с ИИ</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ANIMATED AI ANALYSIS SCREEN */}
        {step === 'analyzing' && (
          <div className="py-8 text-center space-y-6 animate-fade-in">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900 animate-ping"></div>
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xl animate-bounce">
                <Sparkles className="w-10 h-10" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-black text-slate-900 dark:text-slate-100">ИИ анализирует документ</h4>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono animate-pulse">{analysisStatusText}</p>
            </div>

            {/* Progress Bar */}
            <div className="max-w-md mx-auto space-y-1">
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${analysisProgress}%` }}
                ></div>
              </div>
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">{analysisProgress}% завершено</span>
            </div>
          </div>
        )}

        {/* STEP 3: ERROR STATE WITH RETRY */}
        {step === 'error' && (
          <div className="py-6 text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-md">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h4 className="text-lg font-black text-slate-900 dark:text-slate-100">Ошибка обработки документа</h4>
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 leading-relaxed">{errorMessage}</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Попробовать снова</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
