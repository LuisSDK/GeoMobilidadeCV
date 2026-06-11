import { useState, useEffect, useRef } from 'react';
import type { Posto } from '../lib/supabase';

export type AvailabilityStatus = 'disponivel' | 'ocupado' | 'manutencao';

export interface PostoAvailability {
  status: AvailabilityStatus;
  ocupacao: number;
  espera_min: number;
  carregamentos_hoje: number;
  carregamentos_semana: number;
  ultima_atualizacao: Date;
}

export type AvailabilityMap = Record<string, PostoAvailability>;

function initAvailability(postos: Posto[]): AvailabilityMap {
  const map: AvailabilityMap = {};
  postos.forEach(p => {
    if (p.estado === 'offline') {
      map[p.id] = { status: 'manutencao', ocupacao: 0, espera_min: 0, carregamentos_hoje: 0, carregamentos_semana: 0, ultima_atualizacao: new Date() };
      return;
    }
    if (p.estado === 'manutencao') {
      map[p.id] = { status: 'manutencao', ocupacao: 0, espera_min: 0, carregamentos_hoje: Math.floor(Math.random()*3), carregamentos_semana: Math.floor(Math.random()*12), ultima_atualizacao: new Date() };
      return;
    }
    const r = Math.random();
    const status: AvailabilityStatus = r < 0.65 ? 'disponivel' : r < 0.85 ? 'ocupado' : 'manutencao';
    const ocupacao = status === 'disponivel' ? Math.floor(Math.random()*40) : status === 'ocupado' ? 60 + Math.floor(Math.random()*40) : 0;
    map[p.id] = {
      status,
      ocupacao,
      espera_min: status === 'ocupado' ? 5 + Math.floor(Math.random()*20) : 0,
      carregamentos_hoje: Math.floor(Math.random()*15) + 2,
      carregamentos_semana: Math.floor(Math.random()*80) + 10,
      ultima_atualizacao: new Date(),
    };
  });
  return map;
}

function updateAvailability(current: AvailabilityMap, postos: Posto[]): AvailabilityMap {
  const next = { ...current };
  const updateCount = Math.max(1, Math.floor(postos.length * 0.2));
  const shuffled = [...postos].sort(() => Math.random() - 0.5).slice(0, updateCount);
  shuffled.forEach(p => {
    if (p.estado !== 'ativo') return;
    const r = Math.random();
    const status: AvailabilityStatus = r < 0.65 ? 'disponivel' : r < 0.87 ? 'ocupado' : 'manutencao';
    const ocupacao = status === 'disponivel' ? Math.floor(Math.random()*40) : status === 'ocupado' ? 60 + Math.floor(Math.random()*40) : 0;
    const prev = next[p.id];
    next[p.id] = {
      status,
      ocupacao,
      espera_min: status === 'ocupado' ? 5 + Math.floor(Math.random()*20) : 0,
      carregamentos_hoje: (prev?.carregamentos_hoje || 0) + (Math.random() > 0.7 ? 1 : 0),
      carregamentos_semana: prev?.carregamentos_semana || 0,
      ultima_atualizacao: new Date(),
    };
  });
  return next;
}

export function useAvailability(postos: Posto[], intervalMs = 30000) {
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const postosRef = useRef(postos);
  postosRef.current = postos;

  useEffect(() => {
    if (!postos.length) return;
    setAvailability(initAvailability(postos));
    const id = setInterval(() => {
      setAvailability(prev => updateAvailability(prev, postosRef.current));
    }, intervalMs);
    return () => clearInterval(id);
  }, [postos.length, intervalMs]);

  return availability;
}
