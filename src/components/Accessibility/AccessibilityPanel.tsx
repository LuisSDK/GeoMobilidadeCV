import { useRef, useEffect, useState } from 'react';
import { Eye, Volume2, ChevronLeft, X, Sun, Minus, Plus, Play } from 'lucide-react';
import { useAccessibility, type FontSize } from '../../contexts/AccessibilityContext';
import { useI18n } from '../../contexts/I18nContext';

type DisabilityType = 'visual' | 'auditory' | null;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const FONT_STEPS: { key: FontSize; label_key: 'a11y_font_sm' | 'a11y_font_md' | 'a11y_font_lg' | 'a11y_font_xl'; px: string }[] = [
  { key: 'sm', label_key: 'a11y_font_sm', px: '14' },
  { key: 'md', label_key: 'a11y_font_md', px: '16' },
  { key: 'lg', label_key: 'a11y_font_lg', px: '18' },
  { key: 'xl', label_key: 'a11y_font_xl', px: '21' },
];

export default function AccessibilityPanel({ isOpen, onClose }: Props) {
  const { highContrast, fontSize, tts, toggleHighContrast, setFontSize, toggleTts, speak, activeCount } = useAccessibility();
  const { t, locale } = useI18n();
  const [view, setView] = useState<DisabilityType>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') { if (view) setView(null); else onClose(); } }
    function handleClick(e: MouseEvent) { if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose(); }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => { document.removeEventListener('keydown', handleKey); document.removeEventListener('mousedown', handleClick); };
  }, [isOpen, onClose, view]);

  // Reset sub-view when closed
  useEffect(() => { if (!isOpen) setView(null); }, [isOpen]);

  if (!isOpen) return null;

  const ttsLang = locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : 'pt-PT';

  const fontIdx = FONT_STEPS.findIndex(s => s.key === fontSize);

  function decreaseFont() { if (fontIdx > 0) setFontSize(FONT_STEPS[fontIdx - 1].key); }
  function increaseFont() { if (fontIdx < FONT_STEPS.length - 1) setFontSize(FONT_STEPS[fontIdx + 1].key); }

  // ── Header shared ──
  const headerBar = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex-shrink-0">
      <div className="flex items-center gap-2">
        {view && (
          <button
            onClick={() => setView(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label={t('a11y_back')}
          >
            <ChevronLeft size={15} />
          </button>
        )}
        <div>
          <p className="text-xs font-bold text-slate-800 dark:text-white">{t('a11y_title')}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {view === 'visual' ? t('a11y_visual') : view === 'auditory' ? t('a11y_auditory') : t('a11y_subtitle')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {activeCount > 0 && !view && (
          <span className="text-[9px] font-bold bg-cv-blue text-white px-2 py-0.5 rounded-full">
            {activeCount} {t('a11y_active_features')}
          </span>
        )}
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Fechar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );

  // ── Type selection ──
  if (!view) return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t('a11y_title')}
      className="absolute top-16 right-4 z-50 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-modal overflow-hidden flex flex-col"
    >
      {headerBar}
      <div className="p-3 space-y-2">
        <button
          onClick={() => setView('visual')}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-cv-blue/60 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-cv-blue group-hover:text-white transition-colors">
            <Eye size={18} className="text-cv-blue group-hover:text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 dark:text-white">{t('a11y_visual')}</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{t('a11y_visual_desc')}</div>
          </div>
          {(highContrast || fontSize !== 'md') && (
            <span className="w-2 h-2 rounded-full bg-cv-teal flex-shrink-0" />
          )}
        </button>

        <button
          onClick={() => setView('auditory')}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-cv-blue/60 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center flex-shrink-0 group-hover:bg-cv-teal group-hover:text-white transition-colors">
            <Volume2 size={18} className="text-cv-teal group-hover:text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 dark:text-white">{t('a11y_auditory')}</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{t('a11y_auditory_desc')}</div>
          </div>
          {tts && <span className="w-2 h-2 rounded-full bg-cv-teal flex-shrink-0" />}
        </button>
      </div>
      <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
        <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-relaxed">
          As preferências são guardadas localmente.
        </p>
      </div>
    </div>
  );

  // ── Visual settings ──
  if (view === 'visual') return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t('a11y_visual')}
      className="absolute top-16 right-4 z-50 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-modal overflow-hidden flex flex-col"
    >
      {headerBar}
      <div className="p-3 space-y-3">
        {/* High contrast toggle */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
          <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('a11y_high_contrast')}</span>
          </div>
          <button
            onClick={toggleHighContrast}
            aria-pressed={highContrast}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${highContrast ? 'bg-slate-900 text-white' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <Sun size={16} className={highContrast ? 'text-yellow-400' : 'text-slate-400'} />
            <div className="flex-1">
              <div className={`text-xs font-semibold ${highContrast ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{t('a11y_high_contrast')}</div>
              <div className={`text-[10px] mt-0.5 ${highContrast ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>{t('a11y_high_contrast_desc')}</div>
            </div>
            <div className={`w-9 h-5 rounded-full relative transition-colors ${highContrast ? 'bg-yellow-400' : 'bg-slate-200 dark:bg-slate-600'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${highContrast ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
          </button>
        </div>

        {/* Font size */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
          <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('a11y_font_size')}</span>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={decreaseFont}
                disabled={fontIdx === 0}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                aria-label="Diminuir texto"
              >
                <Minus size={14} />
              </button>
              <div className="flex-1 flex gap-1">
                {FONT_STEPS.map((step, i) => (
                  <button
                    key={step.key}
                    onClick={() => setFontSize(step.key)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors border ${
                      fontSize === step.key
                        ? 'bg-cv-blue border-cv-blue text-white'
                        : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-cv-blue/50 hover:text-cv-blue'
                    }`}
                    aria-pressed={fontSize === step.key}
                  >
                    {step.px}
                  </button>
                ))}
              </div>
              <button
                onClick={increaseFont}
                disabled={fontIdx === FONT_STEPS.length - 1}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                aria-label="Aumentar texto"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="flex justify-between px-1">
              {FONT_STEPS.map(s => (
                <span key={s.key} className={`text-[9px] ${fontSize === s.key ? 'text-cv-blue font-bold' : 'text-slate-400'}`}>{t(s.label_key)}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Auditory settings ──
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t('a11y_auditory')}
      className="absolute top-16 right-4 z-50 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-modal overflow-hidden flex flex-col"
    >
      {headerBar}
      <div className="p-3 space-y-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
          <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('a11y_tts')}</span>
          </div>
          <button
            onClick={toggleTts}
            aria-pressed={tts}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${tts ? 'bg-cv-teal/10 dark:bg-teal-900/20' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <Volume2 size={16} className={tts ? 'text-cv-teal' : 'text-slate-400'} />
            <div className="flex-1">
              <div className={`text-xs font-semibold ${tts ? 'text-cv-teal dark:text-teal-400' : 'text-slate-800 dark:text-white'}`}>{t('a11y_tts')}</div>
              <div className="text-[10px] mt-0.5 text-slate-400 dark:text-slate-500">{t('a11y_tts_desc')}</div>
            </div>
            <div className={`w-9 h-5 rounded-full relative transition-colors ${tts ? 'bg-cv-teal' : 'bg-slate-200 dark:bg-slate-600'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${tts ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
          </button>
        </div>

        {tts && (
          <button
            onClick={() => speak(t('a11y_tts_test_text'), ttsLang)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-cv-teal/40 bg-teal-50 dark:bg-teal-900/20 text-cv-teal dark:text-teal-400 text-xs font-semibold hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors"
          >
            <Play size={13} />
            {t('a11y_tts_test')}
          </button>
        )}

        {!tts && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center px-2 leading-relaxed">
            Quando ativo, o portal irá narrar automaticamente o conteúdo principal ao navegar.
          </p>
        )}
      </div>
    </div>
  );
}
