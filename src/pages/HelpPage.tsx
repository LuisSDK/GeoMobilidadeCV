import { useState } from 'react';
import { useI18n, type TranslationKey } from '../contexts/I18nContext';
import { AppShell } from '../components/Layout/Header';
import {
  HelpCircle, Map, Zap, Route, Star, Bot, BarChart3, Users,
  ChevronDown, ChevronRight, MessageCircle, Monitor, Eye, Volume2,
  Globe, Moon, Search, Filter, MapPin, Calendar, CreditCard, Settings
} from 'lucide-react';

interface HelpSection {
  id: string;
  icon: React.ElementType;
  titleKey: TranslationKey;
  items: { qKey: TranslationKey; aKey: TranslationKey }[];
}

const helpSections: HelpSection[] = [
  {
    id: 'mapa',
    icon: Map,
    titleKey: 'help_map',
    items: [
      { qKey: 'help_map_q1', aKey: 'help_map_a1' },
      { qKey: 'help_map_q2', aKey: 'help_map_a2' },
      { qKey: 'help_map_q3', aKey: 'help_map_a3' },
    ],
  },
  {
    id: 'postos',
    icon: Zap,
    titleKey: 'help_stations',
    items: [
      { qKey: 'help_postos_q1', aKey: 'help_postos_a1' },
      { qKey: 'help_postos_q2', aKey: 'help_postos_a2' },
    ],
  },
  {
    id: 'viagem',
    icon: Route,
    titleKey: 'help_trip',
    items: [
      { qKey: 'help_viagem_q1', aKey: 'help_viagem_a1' },
    ],
  },
  {
    id: 'favoritos',
    icon: Star,
    titleKey: 'help_favorites',
    items: [
      { qKey: 'help_fav_q1', aKey: 'help_fav_a1' },
    ],
  },
  {
    id: 'chatbot',
    icon: Bot,
    titleKey: 'help_chatbot',
    items: [
      { qKey: 'help_bot_q1', aKey: 'help_bot_a1' },
      { qKey: 'help_bot_q2', aKey: 'help_bot_a2' },
    ],
  },
  {
    id: 'acessibilidade',
    icon: Eye,
    titleKey: 'help_a11y',
    items: [
      { qKey: 'help_a11y_q1', aKey: 'help_a11y_a1' },
      { qKey: 'help_a11y_q2', aKey: 'help_a11y_a2' },
      { qKey: 'help_a11y_q3', aKey: 'help_a11y_a3' },
    ],
  },
  {
    id: 'idioma',
    icon: Globe,
    titleKey: 'help_lang',
    items: [
      { qKey: 'help_lang_q1', aKey: 'help_lang_a1' },
    ],
  },
  {
    id: 'conta',
    icon: Users,
    titleKey: 'help_account',
    items: [
      { qKey: 'help_conta_q1', aKey: 'help_conta_a1' },
      { qKey: 'help_conta_q2', aKey: 'help_conta_a2' },
    ],
  },
];

export default function HelpPage() {
  const { t } = useI18n();
  const [expandedSection, setExpandedSection] = useState<string | null>('mapa');
  const [searchQuery, setSearchQuery] = useState('');

  function toggleSection(id: string) {
    setExpandedSection(prev => prev === id ? null : id);
  }

  const filteredSections = helpSections.filter(section => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = t(section.titleKey).toLowerCase();
    if (title.includes(q)) return true;
    return section.items.some(item =>
      t(item.qKey).toLowerCase().includes(q) ||
      t(item.aKey).toLowerCase().includes(q)
    );
  });

  return (
    <AppShell title={t('help_title')} subtitle={t('help_subtitle')}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('help_search')}
            className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 focus:border-cv-blue transition-all"
          />
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {filteredSections.map(section => (
            <div key={section.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${expandedSection === section.id ? 'bg-cv-blue text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                  <section.icon size={18} />
                </div>
                <span className="flex-1 font-semibold text-slate-800 dark:text-white">{t(section.titleKey)}</span>
                {expandedSection === section.id ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
              </button>
              {expandedSection === section.id && (
                <div className="px-5 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                      <p className="font-medium text-slate-800 dark:text-white text-sm mb-2">{t(item.qKey)}</p>
                      <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{t(item.aKey)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredSections.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">{t('help_no_results')}</p>
          </div>
        )}

        {/* Contact */}
        <div className="mt-8 bg-gradient-to-r from-cv-blue to-blue-700 rounded-2xl p-6 text-white">
          <h3 className="font-bold text-lg mb-2">{t('help_contact_title')}</h3>
          <p className="text-blue-200 text-sm mb-4">{t('help_contact_desc')}</p>
          <div className="flex flex-wrap gap-4">
            <a href="mailto:suporte@geomobilidade.cv" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <MessageCircle size={16} /> suporte@geomobilidade.cv
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
