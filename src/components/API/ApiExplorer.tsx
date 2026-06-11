import { useState } from 'react';
import type { Posto } from '../../lib/supabase';
import { Code2, Play, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { computeCoverageStats, findNearby } from '../../lib/geoUtils';

interface Endpoint {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  params?: string;
  example: (postos: Posto[]) => unknown;
}

function buildEndpoints(postos: Posto[]): Endpoint[] {
  return [
    {
      method: 'GET', path: '/api/postos',
      description: 'Lista todos os postos de carregamento',
      example: () => ({ total: postos.length, data: postos.slice(0, 3), _note: '... + mais registos' }),
    },
    {
      method: 'GET', path: '/api/postos/{id}',
      description: 'Retorna detalhes de um posto específico por ID',
      params: 'id: UUID do posto',
      example: () => ({ data: postos[0] || null }),
    },
    {
      method: 'GET', path: '/api/postos/municipio/{nome}',
      description: 'Filtra postos por município',
      params: 'nome: ex. "Praia", "Mindelo", "Santa Cruz"',
      example: () => {
        const praia = postos.filter(p => p.municipio === 'Praia');
        return { municipio: 'Praia', total: praia.length, data: praia };
      },
    },
    {
      method: 'GET', path: '/api/postos/ilha/{nome}',
      description: 'Filtra postos por ilha',
      params: 'nome: ex. "Santiago", "São Vicente", "Sal"',
      example: () => {
        const sv = postos.filter(p => p.ilha === 'Santiago');
        return { ilha: 'Santiago', total: sv.length, data: sv };
      },
    },
    {
      method: 'GET', path: '/api/postos/proximos?lat=&lon=&raio=',
      description: 'Retorna postos dentro de um raio (km) a partir de coordenadas',
      params: 'lat: latitude, lon: longitude, raio: km (default 10)',
      example: () => {
        const nearby = findNearby(postos, 14.93, -23.51, 10);
        return {
          query: { lat: 14.93, lon: -23.51, raio_km: 10 },
          total: nearby.length,
          data: nearby.map(p => ({ ...p, distancia_km: (p as typeof p & { distancia: number }).distancia.toFixed(2) })),
        };
      },
    },
    {
      method: 'GET', path: '/api/cobertura',
      description: 'Retorna análise de cobertura geoespacial da rede',
      example: () => {
        const stats = computeCoverageStats(postos);
        return {
          cobertura_pct: stats.coveragePct,
          postos_ativos: stats.ativos,
          potencia_total_kw: stats.totalPotencia,
          total_conectores: stats.totalConnectores,
          por_ilha: stats.byIlha,
          por_municipio: stats.byMunicipio,
        };
      },
    },
    {
      method: 'GET', path: '/api/postos/estado/{estado}',
      description: 'Filtra postos por estado operacional',
      params: 'estado: "ativo", "manutencao" ou "offline"',
      example: () => {
        const offline = postos.filter(p => p.estado === 'offline');
        return { estado: 'offline', total: offline.length, data: offline };
      },
    },
  ];
}

function syntaxHighlight(json: string): string {
  return json
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
      let cls = 'json-number';
      if (/^"/.test(match)) cls = /:$/.test(match) ? 'json-key' : 'json-string';
      else if (/true|false/.test(match)) cls = 'json-boolean';
      return `<span class="${cls}">${match}</span>`;
    });
}

interface ApiExplorerProps { postos: Posto[]; }

export default function ApiExplorer({ postos }: ApiExplorerProps) {
  const [activeEndpoint, setActiveEndpoint] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState<number | null>(null);
  const endpoints = buildEndpoints(postos);

  function runEndpoint(i: number) {
    const ep = endpoints[i];
    const result = JSON.stringify(ep.example(postos), null, 2);
    setResults(r => ({ ...r, [i]: result }));
    setActiveEndpoint(i);
  }

  function copyResult(i: number) {
    navigator.clipboard.writeText(results[i] || '');
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-800 to-slate-700">
          <div className="flex items-center gap-3">
            <Code2 size={18} className="text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-sm">API Geográfica — GeoMobilidade CV</h3>
              <p className="text-slate-400 text-xs mt-0.5">Base URL: <span className="font-mono text-emerald-400">https://api.geomobilidade.cv/v1</span></p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">Formato:</span><span className="text-emerald-400 font-mono">JSON</span>
            <span className="text-slate-400">Autenticação:</span><span className="text-amber-400 font-mono">Bearer Token</span>
            <span className="text-slate-400">Versão:</span><span className="text-blue-400 font-mono">v1.0.0</span>
            <span className="text-slate-400">Postos:</span><span className="text-white font-mono">{postos.length}</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {endpoints.map((ep, i) => (
            <div key={i} className="hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3 px-5 py-3.5 cursor-pointer" onClick={() => setActiveEndpoint(activeEndpoint === i ? null : i)}>
                <span className={`text-[10px] font-bold px-2 py-1 rounded font-mono flex-shrink-0 ${ep.method === 'GET' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {ep.method}
                </span>
                <code className="text-sm font-mono text-cv-blue flex-1">{ep.path}</code>
                <span className="text-xs text-slate-500 hidden md:block">{ep.description}</span>
                <button
                  onClick={e => { e.stopPropagation(); runEndpoint(i); }}
                  className="flex items-center gap-1.5 text-xs bg-cv-blue text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors flex-shrink-0"
                >
                  <Play size={11}/> Executar
                </button>
                {activeEndpoint === i ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />}
              </div>

              {activeEndpoint === i && (
                <div className="px-5 pb-4 fade-in">
                  <div className="text-xs text-slate-500 mb-2">{ep.description}</div>
                  {ep.params && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 mb-3">
                      <strong>Parâmetros:</strong> {ep.params}
                    </div>
                  )}
                  {results[i] ? (
                    <div className="relative">
                      <div className="api-response" dangerouslySetInnerHTML={{ __html: syntaxHighlight(results[i]) }} />
                      <button onClick={() => copyResult(i)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-white p-1.5 rounded bg-slate-800/50 hover:bg-slate-700 transition-colors">
                        {copied === i ? <Check size={12} className="text-emerald-400"/> : <Copy size={12}/>}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-900 rounded-lg p-4 text-slate-500 text-xs font-mono">
                      Clique em "Executar" para ver a resposta...
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
