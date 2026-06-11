import type { Posto } from './supabase';

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }

export function findNearby(postos: Posto[], lat: number, lon: number, radiusKm = 10): (Posto & { distancia: number })[] {
  return postos
    .map(p => ({ ...p, distancia: haversineDistance(lat, lon, p.latitude, p.longitude) }))
    .filter(p => p.distancia <= radiusKm)
    .sort((a, b) => a.distancia - b.distancia);
}

export function findNearest(postos: Posto[], lat: number, lon: number): (Posto & { distancia: number }) | null {
  if (!postos.length) return null;
  let best: (Posto & { distancia: number }) | null = null;
  for (const p of postos) {
    const d = haversineDistance(lat, lon, p.latitude, p.longitude);
    if (!best || d < best.distancia) best = { ...p, distancia: d };
  }
  return best;
}

export function computeCoverageStats(postos: Posto[]) {
  const ativos = postos.filter(p => p.estado === 'ativo');
  const coverageAreaKm2 = ativos.length * Math.PI * 10 ** 2;
  const totalAreaCV = 4033;
  const pct = Math.min(100, Math.round((coverageAreaKm2 / totalAreaCV) * 100 * 10) / 10);

  const byIlha = postos.reduce<Record<string, { total: number; ativos: number; potencia: number }>>((acc, p) => {
    if (!acc[p.ilha]) acc[p.ilha] = { total: 0, ativos: 0, potencia: 0 };
    acc[p.ilha].total++;
    if (p.estado === 'ativo') acc[p.ilha].ativos++;
    acc[p.ilha].potencia += p.potencia_kw;
    return acc;
  }, {});

  const byMunicipio = postos.reduce<Record<string, number>>((acc, p) => {
    acc[p.municipio] = (acc[p.municipio] || 0) + 1;
    return acc;
  }, {});

  const totalPotencia = postos.reduce((s, p) => s + p.potencia_kw, 0);
  const totalConnectores = postos.reduce((s, p) => s + p.num_conectores, 0);

  return { coveragePct: pct, byIlha, byMunicipio, totalPotencia, totalConnectores, ativos: ativos.length };
}

export function priorityZones(postos: Posto[]) {
  const zones = [
    { id: 1, nome: 'Interior Santiago Norte', lat: 15.18, lng: -23.68, prioridade: 'alta', motivo: 'Sem cobertura num raio de 30km' },
    { id: 2, nome: 'Tarrafal (offline)', lat: 15.28, lng: -23.75, prioridade: 'alta', motivo: 'Posto offline, zona turística' },
    { id: 3, nome: 'Ribeira Grande Santiago', lat: 15.03, lng: -23.74, prioridade: 'media', motivo: 'Densidade populacional crescente' },
    { id: 4, nome: 'São Nicolau', lat: 16.58, lng: -24.25, prioridade: 'alta', motivo: 'Ilha sem postos ativos' },
    { id: 5, nome: 'São Filipe (manutenção)', lat: 14.90, lng: -24.50, prioridade: 'media', motivo: 'Posto em manutenção, ilha do Fogo' },
    { id: 6, nome: 'Mosteiros Fogo', lat: 15.00, lng: -24.34, prioridade: 'alta', motivo: 'Zona rural sem cobertura' },
    { id: 7, nome: 'Brava Norte', lat: 14.87, lng: -24.70, prioridade: 'media', motivo: 'Posto offline, ilha isolada' },
  ];
  return zones.map(z => {
    const nearby = findNearby(postos.filter(p => p.estado === 'ativo'), z.lat, z.lng, 15);
    return { ...z, postosProximos: nearby.length };
  });
}
