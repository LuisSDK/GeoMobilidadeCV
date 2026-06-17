import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Posto } from '../../lib/supabase';
import type { PostoAvailability } from '../../hooks/useAvailability';
import { haversineDistance } from '../../lib/geoUtils';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const TILE_LIGHT = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

function getMarkerColor(posto: Posto, avail?: PostoAvailability): string {
  if (posto.estado === 'offline') return '#ef4444';
  if (posto.estado === 'manutencao') return '#f59e0b';
  if (avail) {
    if (avail.status === 'manutencao') return '#f59e0b';
    if (avail.status === 'ocupado') return '#f97316';
    return posto.tipo === 'privado' ? '#3b82f6' : '#10b981';
  }
  return posto.tipo === 'privado' ? '#3b82f6' : '#10b981';
}

function createMarkerIcon(posto: Posto, avail: PostoAvailability | undefined, highlight: boolean): L.DivIcon {
  const color = getMarkerColor(posto, avail);
  const size = highlight ? 18 : posto.potencia_kw >= 50 ? 16 : 13;
  const ring = highlight ? `box-shadow:0 0 0 5px ${color}30,0 2px 8px rgba(0,0,0,.3)` : '0 2px 6px rgba(0,0,0,.25)';
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2.5px solid white;border-radius:50%;${ring};cursor:pointer;transition:all .2s"></div>`,
    className: '', iconSize: [size, size], iconAnchor: [size/2, size/2],
  });
}

function popupContent(posto: Posto, avail?: PostoAvailability): string {
  const color = getMarkerColor(posto, avail);
  const statusLabel = avail ? { disponivel: '● Disponível', ocupado: '● Ocupado', manutencao: '● Indisponível' }[avail.status] : posto.estado;
  return `
    <div style="font-family:Inter,sans-serif;min-width:240px">
      <div style="background:linear-gradient(135deg,#1e3a5f,#1d4ed8);padding:12px 14px;border-radius:12px 12px 0 0">
        <div style="font-size:10px;font-weight:700;color:#93c5fd;text-transform:uppercase;letter-spacing:.05em">${posto.ilha} · ${posto.municipio}</div>
        <div style="font-size:14px;font-weight:700;color:white;margin-top:3px">${posto.nome}</div>
      </div>
      <div style="padding:12px 14px;background:white;border-radius:0 0 12px 12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:11px;font-weight:600;color:${color}">${statusLabel}</span>
          ${avail?.espera_min ? `<span style="font-size:10px;color:#94a3b8">Espera: ~${avail.espera_min}min</span>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <div style="background:#f8fafc;border-radius:8px;padding:6px;text-align:center">
            <div style="font-size:14px;font-weight:700;color:#1e293b">${posto.potencia_kw}<span style="font-size:10px;color:#64748b">kW</span></div>
            <div style="font-size:9px;color:#94a3b8">Potência</div>
          </div>
          <div style="background:#f8fafc;border-radius:8px;padding:6px;text-align:center">
            <div style="font-size:14px;font-weight:700;color:#1e293b">${posto.num_conectores}</div>
            <div style="font-size:9px;color:#94a3b8">Conectores</div>
          </div>
        </div>
        ${avail ? `<div style="margin-top:8px;background:#f8fafc;border-radius:8px;padding:6px">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-bottom:3px"><span>Utilização</span><span style="font-weight:600;color:#1e293b">${avail.ocupacao}%</span></div>
          <div style="background:#e2e8f0;border-radius:999px;height:4px"><div style="height:4px;border-radius:999px;background:${avail.ocupacao>70?'#f59e0b':'#10b981'};width:${avail.ocupacao}%"></div></div>
        </div>` : ''}
        <div style="margin-top:6px;font-size:10px;color:#94a3b8">${posto.operador || 'N/D'} · ${posto.horario || '24h'}</div>
      </div>
    </div>`;
}

interface MapProps {
  postos: Posto[];
  selectedId?: string | null;
  onSelect?: (posto: Posto) => void;
  showCoverage?: boolean;
  coverageRadius?: number;
  center?: { lat: number; lng: number; zoom: number };
  highlightedIds?: string[];
  userLocation?: { lat: number; lng: number } | null;
  routeCoords?: [number, number][] | null;
  availability?: Record<string, PostoAvailability>;
  isDark?: boolean;
  openPopupOnSelect?: boolean;
}

export default function InteractiveMap({
  postos, selectedId, onSelect, showCoverage = false, coverageRadius = 10,
  center, highlightedIds, userLocation, routeCoords, availability = {}, isDark = false,
  openPopupOnSelect = true,
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const coverageLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: center ? [center.lat, center.lng] : [16.0, -24.0], zoom: center?.zoom ?? 8, zoomControl: true });
    const tile = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
    tileRef.current = tile;
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Switch tiles on dark mode change
  useEffect(() => {
    tileRef.current?.setUrl(isDark ? TILE_DARK : TILE_LIGHT);
  }, [isDark]);

  // Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();
    postos.forEach(posto => {
      const avail = availability[posto.id];
      const isHighlighted = highlightedIds?.includes(posto.id) || posto.id === selectedId;
      const marker = L.marker([posto.latitude, posto.longitude], {
        icon: createMarkerIcon(posto, avail, isHighlighted),
        zIndexOffset: isHighlighted ? 1000 : 0,
      });
      marker.bindPopup(popupContent(posto, avail), { maxWidth: 280, closeButton: false });
      marker.on('click', () => onSelect?.(posto));
      marker.addTo(map);
      markersRef.current.set(posto.id, marker);
    });
  }, [postos, selectedId, highlightedIds, onSelect, availability]);

  // Coverage
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    coverageLayerRef.current?.remove();
    if (!showCoverage) return;
    const layer = L.layerGroup();
    postos.filter(p => p.estado === 'ativo').forEach(p => {
      L.circle([p.latitude, p.longitude], { radius: coverageRadius * 1000, color: '#10b981', fillColor: '#10b981', fillOpacity: 0.06, weight: 1.5, opacity: 0.35, dashArray: '4 4' }).addTo(layer);
    });
    layer.addTo(map);
    coverageLayerRef.current = layer;
  }, [showCoverage, coverageRadius, postos]);

  // User location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    if (!userLocation) return;
    const icon = L.divIcon({
      html: `<div style="width:16px;height:16px;background:#1d4ed8;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(29,78,216,.2),0 2px 8px rgba(0,0,0,.3)"></div>`,
      className: '', iconSize: [16,16], iconAnchor: [8,8],
    });
    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon, zIndexOffset: 2000 })
      .bindPopup('<b style="font-family:Inter;font-size:12px">📍 A sua localização</b>')
      .addTo(map);
  }, [userLocation]);

  // Route
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    routeLayerRef.current?.remove();
    if (!routeCoords?.length) return;
    routeLayerRef.current = L.polyline(routeCoords, { color: '#1d4ed8', weight: 5, opacity: 0.85, lineJoin: 'round' }).addTo(map);
    map.fitBounds(L.polyline(routeCoords).getBounds(), { padding: [40, 40] });
  }, [routeCoords]);

  // Fly to selected
  useEffect(() => {
    if (!selectedId || !mapRef.current || !openPopupOnSelect) return;
    const posto = postos.find(p => p.id === selectedId);
    if (!posto) return;
    mapRef.current.flyTo([posto.latitude, posto.longitude], 13, { duration: 0.8 });
    const marker = markersRef.current.get(selectedId);
    if (marker) setTimeout(() => marker.openPopup(), 900);
  }, [selectedId, postos, openPopupOnSelect]);

  // Pan to center
  useEffect(() => {
    if (!center || !mapRef.current) return;
    mapRef.current.flyTo([center.lat, center.lng], center.zoom, { duration: 1.0 });
  }, [center]);

  return <div ref={containerRef} className="w-full h-full rounded-xl" />;
}
