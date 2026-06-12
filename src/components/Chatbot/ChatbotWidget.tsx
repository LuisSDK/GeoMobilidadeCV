import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Minimize2, Maximize2, MapPin, Zap, Sparkles } from 'lucide-react';
import { supabase, type Posto } from '../../lib/supabase';
import type { PostoAvailability } from '../../hooks/useAvailability';
import { findNearest, findNearby, computeCoverageStats, priorityZones } from '../../lib/geoUtils';

export interface ChatbotMapCommand {
  type: 'filter_ilha' | 'filter_estado' | 'highlight_stations' | 'goto_station' | 'show_near' | 'filter_power' | 'filter_availability';
  payload: unknown;
}

interface Message {
  id: number;
  role: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

function generateResponse(
  input: string,
  postos: Posto[],
  isAdmin: boolean,
  availability: Record<string, PostoAvailability>,
  onCommand?: (cmd: ChatbotMapCommand) => void
): string {
  const q = input.toLowerCase().trim();
  const ativos = postos.filter(p => p.estado === 'ativo');
  const disponiveis = postos.filter(p => availability[p.id]?.status === 'disponivel');
  const stats = computeCoverageStats(postos);

  if (/^(olá|ola|bom dia|boa tarde|boa noite|hi|hello)/.test(q)) {
    return isAdmin
      ? 'Olá, administrador! Posso analisar a rede, identificar zonas críticas e navegar no mapa. O que precisa?'
      : 'Olá! Sou o Assistente GeoMobilidade. Posso ajudá-lo a encontrar postos, calcular rotas e filtrar por disponibilidade. Como posso ajudar?';
  }

  // Show nearby / nearest
  if (/próximo|proximo|mais perto|perto de mim|localização|localizacao/.test(q)) {
    onCommand?.({ type: 'show_near', payload: null });
    return 'A ativar a geolocalização para encontrar o posto mais próximo de si. Clique em "📍 Localizar" no mapa para obter a sua posição.';
  }

  // Filter by island
  const ilhaMaps: Record<string,string> = { 'são vicente':'São Vicente','sao vicente':'São Vicente','santiago':'Santiago','sal':'Sal','boa vista':'Boa Vista','fogo':'Fogo','santo antão':'Santo Antão','santo antao':'Santo Antão','maio':'Maio','brava':'Brava','são nicolau':'São Nicolau' };
  for (const [key, ilha] of Object.entries(ilhaMaps)) {
    if (q.includes(key)) {
      const ilhaPostos = postos.filter(p => p.ilha === ilha);
      const dispIlha = ilhaPostos.filter(p => availability[p.id]?.status === 'disponivel');
      onCommand?.({ type: 'filter_ilha', payload: ilha });
      return `A filtrar postos em **${ilha}**: ${ilhaPostos.length} postos encontrados (${dispIlha.length} disponíveis agora). O mapa foi atualizado.`;
    }
  }

  // Filter available
  if (/disponív|disponivel|livre|free/.test(q)) {
    onCommand?.({ type: 'filter_availability', payload: 'disponivel' });
    return `Existem **${disponiveis.length} postos disponíveis** agora. O mapa foi filtrado para mostrar apenas postos disponíveis.`;
  }

  // Filter fast charging
  if (/rápido|rapido|fast|50kw|100kw|dc|ccs/.test(q)) {
    onCommand?.({ type: 'filter_power', payload: 50 });
    const rapidos = ativos.filter(p => p.potencia_kw >= 50);
    return `A filtrar postos de carregamento rápido (≥50kW): **${rapidos.length} postos** encontrados. O mapa foi atualizado.`;
  }

  // All postos
  if (/todos|tudo|limpar|reset|mostrar tudo/.test(q)) {
    onCommand?.({ type: 'filter_ilha', payload: '' });
    return `A mostrar todos os **${postos.length} postos** na rede nacional. Filtros removidos.`;
  }

  // Praia (city)
  if (/\bpraia\b/.test(q) && !q.includes('boa vista')) {
    const praia = postos.filter(p => p.municipio === 'Praia');
    const dispPraia = praia.filter(p => availability[p.id]?.status === 'disponivel');
    onCommand?.({ type: 'filter_ilha', payload: 'Santiago' });
    return `Na **Praia** existem ${praia.length} postos (${dispPraia.length} disponíveis). O mapa focou em Santiago.`;
  }

  // How many
  if (/quantos postos|total de postos|número de postos/.test(q)) {
    const byIlha = Object.entries(stats.byIlha).sort((a,b)=>b[1].total-a[1].total).slice(0,4).map(([ilha, d]) => `${ilha}: ${d.total}`).join(', ');
    return `Existem **${postos.length} postos** na rede nacional (**${disponiveis.length} disponíveis** agora). Top ilhas: ${byIlha}.`;
  }

  // Coverage
  if (/cobertura|percentagem|porcentagem|área/.test(q)) {
    return `A rede cobre aproximadamente **${stats.coveragePct}%** do território nacional. Potência total instalada: **${stats.totalPotencia.toLocaleString()} kW** com ${stats.totalConnectores} pontos de carregamento.`;
  }

  // Maintenance / offline
  if (/manutenção|manutencao|avaria|offline|fora de serviço/.test(q)) {
    const m = postos.filter(p => p.estado === 'manutencao');
    const o = postos.filter(p => p.estado === 'offline');
    onCommand?.({ type: 'filter_estado', payload: 'manutencao' });
    return `**${m.length} postos em manutenção** e **${o.length} offline**. Total indisponível: ${m.length+o.length}. O mapa foi filtrado.`;
  }

  // Occupied / wait time
  if (/ocupado|fila|espera|wait/.test(q)) {
    const ocupados = postos.filter(p => availability[p.id]?.status === 'ocupado');
    const avgWait = ocupados.length > 0
      ? Math.round(ocupados.reduce((s,p) => s + (availability[p.id]?.espera_min || 0), 0) / ocupados.length)
      : 0;
    return `**${ocupados.length} postos ocupados** com tempo médio de espera de **${avgWait} minutos**. Experimente filtrar por "disponíveis" para ver as alternativas.`;
  }

  // Route / trip planner
  if (/rota|viagem|destino|percurso|trip/.test(q)) {
    return 'Para planear uma viagem com postos de carregamento ao longo do percurso, aceda ao módulo **"Planeador de Viagem"** no menu lateral. Pode calcular rotas entre localidades e ver postos disponíveis na rota.';
  }

  // Favorites
  if (/favorit|guardar|saved/.test(q)) {
    return 'Pode guardar postos favoritos clicando na ⭐ no painel de detalhes do posto. Aceda a **"Meus Favoritos"** no menu para ver todos os seus postos guardados.';
  }

  // Power
  if (/potência|potencia|kw|watt|energia/.test(q)) {
    const rapidos = ativos.filter(p => p.potencia_kw >= 50);
    return `Potência total instalada: **${stats.totalPotencia.toLocaleString()} kW**. Postos rápidos (≥50kW): ${rapidos.length}. Maior posto: ${postos.reduce((a,b)=>a.potencia_kw>b.potencia_kw?a:b).nome} (${postos.reduce((a,b)=>a.potencia_kw>b.potencia_kw?a:b).potencia_kw}kW).`;
  }

  // Admin specific
  if (isAdmin && /zona.*críti|critica|sem cobertura|expandir/.test(q)) {
    const zones = priorityZones(postos);
    const alta = zones.filter(z => z.prioridade === 'alta');
    return `Zonas de alta prioridade identificadas:\n${alta.map(z=>`• **${z.nome}**: ${z.motivo}`).join('\n')}\n\nAceda ao módulo de Planeamento SIG para visualização completa.`;
  }

  if (isAdmin && /api|endpoint/.test(q)) {
    return 'API disponível em **"API Explorer"** no menu lateral. Endpoints: GET /postos, /postos/municipio/{nome}, /postos/proximos?lat=&lon=, /cobertura.';
  }

  if (isAdmin && /dashboard|gráfico|grafico|estatística/.test(q)) {
    return 'Aceda ao **Dashboard Analítico** no menu lateral para métricas detalhadas: distribuição por ilha, potência instalada, crescimento da rede e análise de cobertura.';
  }

  // Help
  if (/ajuda|help|o que podes|funcionalidades/.test(q)) {
    return isAdmin
      ? 'Comandos disponíveis:\n• "Postos em [ilha]" — filtra o mapa\n• "Postos disponíveis" — só disponíveis\n• "Postos rápidos" — ≥50kW\n• "Cobertura atual"\n• "Zonas críticas"\n• "Mostrar tudo"\n\nO que precisa?'
      : 'Comandos disponíveis:\n• "Postos em [ilha]" — filtra o mapa\n• "Postos disponíveis" — só disponíveis\n• "Postos rápidos" — carregamento rápido\n• "Mais próximo de mim"\n• "Mostrar tudo"\n• "Planear viagem"\n\nO que posso fazer por si?';
  }

  return `Não encontrei informação específica sobre "${input}". Tente perguntar sobre uma ilha, "postos disponíveis", "carregamento rápido" ou "mais próximo de mim".`;
}

interface ChatbotProps {
  postos?: Posto[];
  isAdmin?: boolean;
  availability?: Record<string, PostoAvailability>;
  onMapCommand?: (cmd: ChatbotMapCommand) => void;
}

let msgCounter = 0;

export default function ChatbotWidget({ postos: externalPostos, isAdmin = false, availability: externalAvailability, onMapCommand }: ChatbotProps) {
  const [postos, setPostos] = useState<Posto[]>(externalPostos || []);
  const [availability, setAvailability] = useState<Record<string, PostoAvailability>>(externalAvailability || {});
  const [loaded, setLoaded] = useState(!!externalPostos?.length);

  // Fetch postos internally if not provided
  useEffect(() => {
    if (externalPostos && externalPostos.length > 0) {
      setPostos(externalPostos);
      setLoaded(true);
    } else if (!loaded) {
      supabase.from('postos').select('*').order('nome').then(({ data }) => {
        if (data) {
          setPostos(data);
          setLoaded(true);
        }
      });
    }
  }, [externalPostos, loaded]);

  // Generate mock availability if not provided
  useEffect(() => {
    if (postos.length > 0 && (!externalAvailability || Object.keys(externalAvailability).length === 0)) {
      const mock: Record<string, PostoAvailability> = {};
      postos.forEach(p => {
        const rand = Math.random();
        mock[p.id] = {
          status: rand < 0.5 ? 'disponivel' : rand < 0.8 ? 'ocupado' : 'manutencao',
          ocupacao: Math.floor(Math.random() * 100),
          espera_min: rand < 0.5 ? 0 : Math.floor(Math.random() * 30) + 5,
          carregamentos_hoje: Math.floor(Math.random() * 15) + 2,
          carregamentos_semana: Math.floor(Math.random() * 80) + 10,
          ultima_atualizacao: new Date(),
        };
      });
      setAvailability(mock);
    } else if (externalAvailability && Object.keys(externalAvailability).length > 0) {
      setAvailability(externalAvailability);
    }
  }, [postos, externalAvailability]);

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: ++msgCounter, role: 'bot', timestamp: new Date(),
    text: isAdmin
      ? 'Olá, administrador! Posso filtrar o mapa, analisar a rede e executar comandos geoespaciais. Tente: "postos em Santiago" ou "zonas críticas".'
      : 'Olá! Posso filtrar o mapa, encontrar postos próximos e planear viagens. Experimente: "postos disponíveis" ou "postos em Sal".',
  }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages(m => [...m, { id: ++msgCounter, role: 'user', text, timestamp: new Date() }]);
    setTyping(true);
    setTimeout(() => {
      const response = generateResponse(text, postos, isAdmin, availability, onMapCommand);
      setMessages(m => [...m, { id: ++msgCounter, role: 'bot', text: response, timestamp: new Date() }]);
      setTyping(false);
    }, 500 + Math.random() * 400);
  }

  const suggestions = isAdmin
    ? ['Postos disponíveis', 'Zonas críticas', 'Postos rápidos', 'Dashboard']
    : ['Postos disponíveis', 'Mais próximo', 'Postos em Sal', 'Planear viagem'];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-[2000] w-14 h-14 rounded-2xl bg-cv-blue shadow-modal flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all ${open ? 'hidden' : 'flex'}`}
      >
        <Bot size={22} />
        <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-cv-gold rounded-full flex items-center justify-center">
          <Sparkles size={8} className="text-cv-blue" />
        </span>
      </button>

      {open && (
        <div className={`fixed bottom-6 right-6 z-[2000] w-[360px] bg-white dark:bg-slate-800 rounded-2xl shadow-modal border border-slate-200 dark:border-slate-700 flex flex-col transition-all ${minimized ? 'h-14' : 'h-[520px]'}`}>
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-cv-blue to-blue-700 rounded-t-2xl flex-shrink-0">
            <div className="w-8 h-8 bg-cv-teal rounded-xl flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white text-sm">Assistente GeoMobilidade</div>
              <div className="text-blue-300 text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {postos.filter(p => p.estado === 'ativo').length} ativos · {Object.values(availability).filter(a => a.status === 'disponivel').length} disponíveis
              </div>
            </div>
            <button onClick={() => setMinimized(!minimized)} className="text-white/70 hover:text-white p-1">{minimized ? <Maximize2 size={14}/> : <Minimize2 size={14}/>}</button>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1"><X size={14}/></button>
          </div>

          {!minimized && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-white dark:bg-slate-800">
                {messages.map(msg => (
                  <div key={msg.id} className={`chat-bubble flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'bot' && (
                      <div className="w-7 h-7 bg-cv-blue rounded-xl flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                        <Bot size={12} className="text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-cv-blue text-white rounded-tr-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-sm'}`}>
                      {msg.text.split('\n').map((line, i) => (
                        <span key={i}>
                          {line.split(/\*\*(.+?)\*\*/).map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
                          {i < msg.text.split('\n').length - 1 && <br/>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {typing && (
                  <div className="flex items-center gap-2 chat-bubble">
                    <div className="w-7 h-7 bg-cv-blue rounded-xl flex items-center justify-center flex-shrink-0"><Bot size={12} className="text-white" /></div>
                    <div className="bg-slate-100 dark:bg-slate-700 px-3.5 py-2.5 rounded-2xl rounded-tl-sm flex gap-1">
                      {[0,150,300].map(d => <div key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto bg-white dark:bg-slate-800">
                {suggestions.map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="flex-shrink-0 text-xs bg-blue-50 dark:bg-blue-900/30 text-cv-blue dark:text-blue-400 border border-blue-100 dark:border-blue-800 px-3 py-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-medium">
                    {s}
                  </button>
                ))}
              </div>

              <div className="px-3 pb-3 pt-1 flex gap-2 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Escreva um comando..."
                  className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 focus:border-cv-blue bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400"
                />
                <button onClick={send} disabled={!input.trim()}
                  className="w-9 h-9 bg-cv-blue text-white rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-blue-800 transition-colors flex-shrink-0">
                  <Send size={14}/>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
