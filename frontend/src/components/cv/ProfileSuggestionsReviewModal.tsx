import React, { useState, useEffect } from 'react';
import { Sparkles, Check, X, Edit3, ArrowRight, ShieldCheck, CheckSquare, Square, AlertCircle, Loader2 } from 'lucide-react';
import { cvService } from '../../services/api';

interface ProposedFieldChange {
  category: string;
  field_name: string;
  field_label: string;
  current_value?: any;
  proposed_value?: any;
  status: string;
}

interface ProfileAISuggestion {
  id: string;
  user_id: string;
  cv_document_id: string;
  status: string;
  suggested_changes: ProposedFieldChange[];
}

interface ProfileSuggestionsReviewModalProps {
  isOpen: boolean;
  cvId: string | null;
  onClose: () => void;
  onConfirmed: () => void;
}

export const ProfileSuggestionsReviewModal: React.FC<ProfileSuggestionsReviewModalProps> = ({
  isOpen,
  cvId,
  onClose,
  onConfirmed
}) => {
  const [suggestion, setSuggestion] = useState<ProfileAISuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [customOverrides, setCustomOverrides] = useState<Record<string, any>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && cvId) {
      loadSuggestions();
    }
  }, [isOpen, cvId]);

  const loadSuggestions = async () => {
    if (!cvId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await cvService.getCvSuggestions(cvId);
      setSuggestion(data);
      if (data && data.suggested_changes) {
        // Select all proposed fields by default
        const allFieldNames = data.suggested_changes.map((c: ProposedFieldChange) => c.field_name);
        setSelectedFields(allFieldNames);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Не удалось загрузить предложения ИИ.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const toggleSelectField = (fieldName: string) => {
    if (selectedFields.includes(fieldName)) {
      setSelectedFields(selectedFields.filter((f) => f !== fieldName));
    } else {
      setSelectedFields([...selectedFields, fieldName]);
    }
  };

  const toggleSelectAll = () => {
    if (!suggestion) return;
    if (selectedFields.length === suggestion.suggested_changes.length) {
      setSelectedFields([]);
    } else {
      setSelectedFields(suggestion.suggested_changes.map((c) => c.field_name));
    }
  };

  const handleStartEdit = (fieldName: string, currentVal: any) => {
    setEditingField(fieldName);
    setEditValue(typeof currentVal === 'object' ? JSON.stringify(currentVal) : String(currentVal || ''));
  };

  const handleSaveEdit = (fieldName: string) => {
    setCustomOverrides({ ...customOverrides, [fieldName]: editValue });
    setEditingField(null);
  };

  const handleConfirm = async () => {
    if (!suggestion) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await cvService.confirmSuggestions(suggestion.id, selectedFields, customOverrides);
      onConfirmed();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Ошибка при подтверждении изменений.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!suggestion) return;
    setSubmitting(true);
    try {
      await cvService.rejectSuggestions(suggestion.id);
      onClose();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderValue = (val: any) => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-gray-400 italic">не указано</span>;
    }
    if (Array.isArray(val)) {
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {val.map((item, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-md border border-blue-200 dark:border-blue-800"
            >
              {typeof item === 'object' ? item.position || item.company_name || JSON.stringify(item) : String(item)}
            </span>
          ))}
        </div>
      );
    }
    if (typeof val === 'object') {
      return <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">{JSON.stringify(val, null, 2)}</pre>;
    }
    return <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{String(val)}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <span>Предложенные ИИ изменения в профиль</span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Сравните извлечённые данные с текущими и выберите, что обновить
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
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Загрузка предложений ИИ...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : !suggestion || !suggestion.suggested_changes || suggestion.suggested_changes.length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                Все данные уже актуальны!
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Факты из вашего CV полностью совпадают с вашим текущим профилем.
              </p>
            </div>
          ) : (
            <>
              {/* Select All Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center space-x-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                >
                  {selectedFields.length === suggestion.suggested_changes.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span>Выбрать все извлечённые данные ({suggestion.suggested_changes.length})</span>
                </button>

                <span className="text-xs text-gray-400">
                  Выбрано: {selectedFields.length} из {suggestion.suggested_changes.length}
                </span>
              </div>

              {/* Diff Cards List */}
              <div className="space-y-3.5">
                {suggestion.suggested_changes.map((change) => {
                  const isSelected = selectedFields.includes(change.field_name);
                  const isEditing = editingField === change.field_name;
                  const displayProposed = customOverrides[change.field_name] !== undefined
                    ? customOverrides[change.field_name]
                    : change.proposed_value;

                  return (
                    <div
                      key={change.field_name}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-blue-500/50 bg-blue-50/30 dark:bg-blue-950/20 dark:border-blue-500/30 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2.5">
                          <button
                            onClick={() => toggleSelectField(change.field_name)}
                            className="text-blue-600 dark:text-blue-400 focus:outline-none"
                          >
                            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-gray-400" />}
                          </button>
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/50 px-2 py-0.5 rounded-md">
                            {change.field_label}
                          </span>
                        </div>

                        {!isEditing && (
                          <button
                            onClick={() => handleStartEdit(change.field_name, displayProposed)}
                            className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center space-x-1 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Изменить значение</span>
                          </button>
                        )}
                      </div>

                      {/* Diff Comparison Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        {/* Current Value */}
                        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Текущее значение в профиле
                          </span>
                          {renderValue(change.current_value)}
                        </div>

                        {/* Proposed Value */}
                        <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
                            Найдено в CV (Предложено ИИ)
                          </span>
                          {isEditing ? (
                            <div className="space-y-2 mt-1">
                              <textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full text-xs p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white"
                                rows={3}
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => setEditingField(null)}
                                  className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded"
                                >
                                  Отмена
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(change.field_name)}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                                >
                                  Сохранить
                                </button>
                              </div>
                            </div>
                          ) : (
                            renderValue(displayProposed)
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <button
            disabled={submitting}
            onClick={handleReject}
            className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            Отклонить все изменения
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              Отмена
            </button>
            <button
              disabled={submitting || selectedFields.length === 0}
              onClick={handleConfirm}
              className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all flex items-center space-x-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Применить выбранные изменения ({selectedFields.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
