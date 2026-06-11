import { createContext, useContext, useState, useEffect } from 'react';

export type FontSize = 'sm' | 'md' | 'lg' | 'xl';

interface AccessibilityState {
  highContrast: boolean;
  fontSize: FontSize;
  tts: boolean;
}

interface AccessibilityContextValue extends AccessibilityState {
  toggleHighContrast: () => void;
  setFontSize: (s: FontSize) => void;
  toggleTts: () => void;
  speak: (text: string, lang?: string) => void;
  activeCount: number;
}

const STORAGE_KEY = 'geomobilidade_a11y';
const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: '14px',
  md: '16px',
  lg: '18px',
  xl: '21px',
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccessibilityState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : { highContrast: false, fontSize: 'md', tts: false };
    } catch { return { highContrast: false, fontSize: 'md', tts: false }; }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('high-contrast', state.highContrast);
    root.style.fontSize = FONT_SIZE_MAP[state.fontSize];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function toggleHighContrast() { setState(prev => ({ ...prev, highContrast: !prev.highContrast })); }
  function setFontSize(s: FontSize) { setState(prev => ({ ...prev, fontSize: s })); }
  function toggleTts() { setState(prev => ({ ...prev, tts: !prev.tts })); }

  function speak(text: string, lang = 'pt-PT') {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = 0.9;
    window.speechSynthesis.speak(utt);
  }

  const activeCount = [
    state.highContrast,
    state.fontSize !== 'md',
    state.tts,
  ].filter(Boolean).length;

  return (
    <AccessibilityContext.Provider value={{ ...state, toggleHighContrast, setFontSize, toggleTts, speak, activeCount }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used inside AccessibilityProvider');
  return ctx;
}
