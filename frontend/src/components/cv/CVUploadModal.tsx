import React, { useState, useEffect } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2, FileText, Sparkles, ArrowRight } from 'lucide-react';
import { cvService } from '../../services/api';

interface CVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cvId: string) => void;
}

export const CVUploadModal: React.FC<CVUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cvId, setCvId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle'); // idle, uploading, processing, completed, error
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('');

  useEffect(() => {
    let intervalId: any;
    if (cvId && (status === 'processing' || status === 'uploading')) {
      intervalId = setInterval(async () => {
        try {
          const res = await cvService.getCvStatus(cvId);
          const st = res.processing_status;
          if (st === 'EXTRACTING') {
            setStatusText('Извлечение текста из документа (PyMuPDF / docx)...');
          } else if (st === 'EXTRACTED') {
            setStatusText('Текст успешно извлечён. Запуск ИИ-анализа...');
          } else if (st === 'ANALYZING') {
            setStatusText('Нейросеть распознаёт опыт, навыки и факты...');
          } else if (st === 'PROFILE_REVIEW_REQUIRED' || st === 'COMPLETED') {
            setStatus('completed');
            clearInterval(intervalId);
            setTimeout(() => {
              onSuccess(cvId);
            }, 1200);
          } else if (st === 'FAILED') {
            setStatus('error');
            setErrorMsg(res.processing_error || 'Не удалось распознать документ.');
            clearInterval(intervalId);
          }
        } catch (err: any) {
          logger_error(err);
        }
      }, 1500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [cvId, status, onSuccess]);

  function logger_error(err: any) {
    console.error(err);
  }

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg', 'txt'].includes(ext || '')) {
        setErrorMsg('Поддерживаются только форматы PDF, DOCX, PNG, JPG, TXT.');
        return;
      }
      if (selected.size > 10 * 1024 * 1024) {
        setErrorMsg('Максимальный размер файла — 10 МБ.');
        return;
      }
      setErrorMsg('');
      setFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      setFile(dropped);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setStatus('uploading');
    setStatusText('Загрузка файла на сервер...');
    setErrorMsg('');

    try {
      const res = await cvService.uploadCv(file);
      setCvId(res.id);
      setStatus('processing');
      setStatusText('Анализ документа с помощью ИИ...');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.response?.data?.detail || 'Ошибка при загрузке файла.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-100 dark:border-gray-700 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Загрузить CV / Резюме
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ИИ автоматически заполнит профиль и создаст резюме
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-6">
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start space-x-3 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {status === 'processing' || status === 'uploading' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                ИИ обрабатывает ваш файл...
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-4">
                {statusText}
              </p>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-full animate-pulse transition-all duration-500 w-3/4"></div>
              </div>
            </div>
          ) : status === 'completed' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                Анализ успешно завершён!
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Переходим к подтверждению изменений в профиле...
              </p>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-8 text-center bg-gray-50/50 dark:bg-gray-800/50 transition-colors cursor-pointer"
            >
              <input
                type="file"
                id="cv-file-input"
                className="hidden"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.txt"
                onChange={handleFileChange}
              />
              <label htmlFor="cv-file-input" className="cursor-pointer block">
                <div className="w-14 h-14 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  {file ? file.name : 'Выберите файл или перетащите сюда'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Поддерживаются PDF, DOCX, PNG, JPG (до 10 МБ)
                </p>
                {file && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{(file.size / (1024 * 1024)).toFixed(2)} МБ</span>
                  </span>
                )}
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        {status !== 'completed' && status !== 'processing' && status !== 'uploading' && (
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              Отмена
            </button>
            <button
              disabled={!file || isUploading}
              onClick={handleUpload}
              className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all flex items-center space-x-2"
            >
              <span>Запустить ИИ-анализ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
