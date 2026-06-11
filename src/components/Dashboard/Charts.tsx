import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart,
} from 'recharts';
import type { Posto } from '../../lib/supabase';

const COLORS_ILHA = ['#1e3a5f','#0d9488','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#10b981','#f97316','#06b6d4','#ec4899'];
const ESTADO_COLORS: Record<string, string> = { ativo: '#10b981', manutencao: '#f59e0b', offline: '#ef4444' };
const TIPO_COLORS: Record<string, string> = { publico: '#3b82f6', privado: '#8b5cf6' };

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-card border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

interface ChartsProps {
  postos: Posto[];
}

export default function Charts({ postos }: ChartsProps) {
  const byIlha = Object.entries(
    postos.reduce<Record<string, number>>((acc, p) => { acc[p.ilha] = (acc[p.ilha] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  const byEstado = [
    { name: 'Ativos', value: postos.filter(p => p.estado === 'ativo').length, color: ESTADO_COLORS.ativo },
    { name: 'Manutenção', value: postos.filter(p => p.estado === 'manutencao').length, color: ESTADO_COLORS.manutencao },
    { name: 'Offline', value: postos.filter(p => p.estado === 'offline').length, color: ESTADO_COLORS.offline },
  ];

  const byTipo = [
    { name: 'Público', value: postos.filter(p => p.tipo === 'publico').length, color: TIPO_COLORS.publico },
    { name: 'Privado', value: postos.filter(p => p.tipo === 'privado').length, color: TIPO_COLORS.privado },
  ];

  const byPotencia = Object.entries(
    postos.reduce<Record<string, number>>((acc, p) => { acc[p.ilha] = (acc[p.ilha] || 0) + p.potencia_kw; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value: Math.round(value) }));

  const growth = [
    { mes: 'Jan', postos: 8 }, { mes: 'Fev', postos: 10 }, { mes: 'Mar', postos: 12 },
    { mes: 'Abr', postos: 14 }, { mes: 'Mai', postos: 16 }, { mes: 'Jun', postos: 18 },
    { mes: 'Jul', postos: 20 }, { mes: 'Ago', postos: 21 }, { mes: 'Set', postos: 22 },
    { mes: 'Out', postos: 23 }, { mes: 'Nov', postos: 24 }, { mes: 'Dez', postos: postos.length },
  ];

  const byMunicipio = Object.entries(
    postos.reduce<Record<string, number>>((acc, p) => { acc[p.municipio] = (acc[p.municipio] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Postos por ilha bar chart */}
      <ChartCard title="Postos por Ilha">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={byIlha} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {byIlha.map((_, i) => <Cell key={i} fill={COLORS_ILHA[i % COLORS_ILHA.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Estado pie */}
      <ChartCard title="Estado dos Postos">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={byEstado} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
              {byEstado.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Tipo pie */}
      <ChartCard title="Tipo de Posto">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={byTipo} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
              {byTipo.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Potência por ilha */}
      <ChartCard title="Potência Instalada por Ilha (kW)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={byPotencia} layout="vertical" margin={{ top: 0, right: 20, left: 50, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
            <Bar dataKey="value" fill="#0d9488" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Growth area chart */}
      <ChartCard title="Crescimento da Rede (2024)">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={growth} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
            <Area type="monotone" dataKey="postos" stroke="#1e3a5f" fill="url(#growthGrad)" strokeWidth={2} dot={{ r: 3, fill: '#1e3a5f' }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Municípios bar */}
      <ChartCard title="Top Municípios">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={byMunicipio} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
            <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
