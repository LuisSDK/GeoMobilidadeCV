import { Zap, CheckCircle, AlertTriangle, WifiOff, Layers, Activity } from 'lucide-react';
import type { Posto } from '../../lib/supabase';

interface StatProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

function StatCard({ label, value, sub, icon: Icon, color, bg }: StatProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-card border border-slate-100 hover:shadow-elevated transition-all fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
          <Icon size={18} className={color} />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-sm font-medium text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

interface StatsCardsProps {
  postos: Posto[];
}

export default function StatsCards({ postos }: StatsCardsProps) {
  const total = postos.length;
  const ativos = postos.filter(p => p.estado === 'ativo').length;
  const manutencao = postos.filter(p => p.estado === 'manutencao').length;
  const offline = postos.filter(p => p.estado === 'offline').length;
  const totalKw = postos.reduce((s, p) => s + p.potencia_kw, 0);
  const totalConnectores = postos.reduce((s, p) => s + p.num_conectores, 0);
  const ilhas = new Set(postos.map(p => p.ilha)).size;
  const pctAtivos = total > 0 ? Math.round((ativos / total) * 100) : 0;

  const stats: StatProps[] = [
    { label: 'Total de Postos', value: total, sub: `${ilhas} ilhas cobertas`, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Postos Ativos', value: ativos, sub: `${pctAtivos}% operacionais`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Em Manutenção', value: manutencao, sub: 'Fora de serviço temporário', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Offline', value: offline, sub: 'Requer intervenção', icon: WifiOff, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Potência Total', value: `${totalKw.toLocaleString()} kW`, sub: 'Capacidade instalada', icon: Activity, color: 'text-cv-teal', bg: 'bg-teal-50' },
    { label: 'Total Conectores', value: totalConnectores, sub: 'Pontos de carregamento', icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {stats.map(s => <StatCard key={s.label} {...s} />)}
    </div>
  );
}
