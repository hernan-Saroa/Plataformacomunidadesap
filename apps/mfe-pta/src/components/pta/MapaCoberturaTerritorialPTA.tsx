/**
 * MapaCoberturaTerritorialPTA — Leaflet/OpenStreetMap real map (imperative)
 *
 * Uses raw Leaflet (no react-leaflet) with OSM tiles via CARTO,
 * GeoJSON department boundaries, 62+ CETAPs, 3 visualization modes,
 * and a detail side-panel.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import {
  MapPin, BarChart3, CheckCircle, Clock, AlertTriangle,
  Users, Globe, Loader2, Building2, Target, X,
  Eye, EyeOff, Thermometer, Palette, MapPinned,
  ChevronRight, Navigation, Crosshair,
} from 'lucide-react';
import { getAllPTAs, getCatalogoTerritoriales } from '../../services/api/ptaApi';
import {
  TERRITORIALES_ESAP as TERR_CONFIG,
  getDeptTerritorialId,
  TERRITORIAL_COLORS,
} from './ColombiaMapPaths';
import {
  TERRITORIALES_GEO,
  getTotalCetaps,
  type CetapGeo,
} from './CetapGeoData';
import { COLOMBIA_DEPARTMENTS as COLOMBIA_GEOJSON } from './ColombiaGeoJSON';

// ═══ Leaflet CSS + icon fix ═══
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
function useLeafletCSS() {
  useEffect(() => {
    if (document.querySelector(`link[href="${LEAFLET_CSS}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
    // Fix default icon paths
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);
}

// ═══ Map defaults ═══
const COLOMBIA_CENTER: L.LatLngExpression = [4.5, -73.5];
const COLOMBIA_ZOOM = 6;

// ═══ Helpers ═══
function getProgressColor(pct: number) {
  if (pct >= 80) return { fill: '#059669', text: '#065F46', bg: '#ECFDF5', label: 'Excelente' };
  if (pct >= 50) return { fill: '#D97706', text: '#92400E', bg: '#FFFBEB', label: 'En progreso' };
  if (pct >= 20) return { fill: '#EA580C', text: '#9A3412', bg: '#FFF7ED', label: 'Bajo' };
  if (pct > 0) return { fill: '#DC2626', text: '#991B1B', bg: '#FEF2F2', label: 'Crítico' };
  return { fill: '#94A3B8', text: '#475569', bg: '#F1F5F9', label: 'Sin datos' };
}

function getHeatColor(total: number, maxTotal: number): string {
  if (total === 0) return '#E2E8F0';
  const r = total / Math.max(maxTotal, 1);
  if (r > 0.7) return '#991B1B';
  if (r > 0.5) return '#DC2626';
  if (r > 0.3) return '#EA580C';
  if (r > 0.15) return '#F59E0B';
  if (r > 0.05) return '#FCD34D';
  return '#FEF3C7';
}

interface TerritorialStats {
  id: string; total: number; aprobados: number; pendientes: number;
  rechazados: number; devueltos: number; enConcertacion: number;
  docentes: number; pctAvance: number;
}

type MapMode = 'territorial' | 'calor' | 'avance';

// ═══ Main component ═══
export function MapaCoberturaTerritorialPTA() {
  useLeafletCSS();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const cetapLayerRef = useRef<L.LayerGroup | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);

  const [ptas, setPtas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const geoJson = COLOMBIA_GEOJSON as any;
  const [mapReady, setMapReady] = useState(false);
  const [selectedTerr, setSelectedTerr] = useState<string | null>(null);
  const [showCetaps, setShowCetaps] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [mapMode, setMapMode] = useState<MapMode>('territorial');
  const [selectedCetap, setSelectedCetap] = useState<CetapGeo | null>(null);

  // Keep refs in sync with state for use inside Leaflet callbacks
  const selectedTerrRef = useRef(selectedTerr);
  const mapModeRef = useRef(mapMode);
  useEffect(() => { selectedTerrRef.current = selectedTerr; }, [selectedTerr]);
  useEffect(() => { mapModeRef.current = mapMode; }, [mapMode]);

  // Load PTA data
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ptaRes] = await Promise.all([
          getAllPTAs({ periodo: '2025-2' }),
          getCatalogoTerritoriales(),
        ]);
        // Validación robusta: asegurar que siempre sea un array
        if (ptaRes.success && Array.isArray(ptaRes.data)) {
          setPtas(ptaRes.data);
        } else {
          console.warn('[MapaCobertura] Response data is not an array:', ptaRes);
          setPtas([]);
        }
      } catch (e) {
        console.error('Error loading PTA data:', e);
        setPtas([]);
      }
      setLoading(false);
    })();
  }, []);



  // Stats per territorial
  const terrStats = useMemo<Record<string, TerritorialStats>>(() => {
    const stats: Record<string, TerritorialStats> = {};
    TERR_CONFIG.forEach(t => {
      const terPtas = ptas.filter(p =>
        p.territorial_id === t.id ||
        p.territorial?.toLowerCase().includes(t.nombre.toLowerCase()) ||
        p.territorial?.toLowerCase().includes(t.ciudad.toLowerCase())
      );
      const docentes = new Set(terPtas.map(p => p.docente_id)).size;
      const aprobados = terPtas.filter(p => p.estado === 'Aprobado').length;
      stats[t.id] = {
        id: t.id, total: terPtas.length, aprobados,
        pendientes: terPtas.filter(p => ['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral'].includes(p.estado)).length,
        rechazados: terPtas.filter(p => p.estado === 'Rechazado').length,
        devueltos: terPtas.filter(p => p.estado === 'Devuelto').length,
        enConcertacion: terPtas.filter(p => ['EN_CONCERTACION', 'ESCALADO_SNA'].includes(p.estado)).length,
        docentes,
        pctAvance: terPtas.length > 0 ? Math.round((aprobados / terPtas.length) * 100) : 0,
      };
    });
    return stats;
  }, [ptas]);

  const terrStatsRef = useRef(terrStats);
  useEffect(() => { terrStatsRef.current = terrStats; }, [terrStats]);
  const maxTotal = useMemo(() => Math.max(...Object.values(terrStats).map(s => s.total), 1), [terrStats]);
  const maxTotalRef = useRef(maxTotal);
  useEffect(() => { maxTotalRef.current = maxTotal; }, [maxTotal]);

  const kpis = useMemo(() => {
    const total = ptas.length;
    const aprobados = ptas.filter(p => p.estado === 'Aprobado').length;
    const pendientes = ptas.filter(p => ['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral'].includes(p.estado)).length;
    const conCobertura = TERR_CONFIG.filter(t => (terrStats[t.id]?.total || 0) > 0).length;
    return {
      total, aprobados, pendientes, cobertura: conCobertura,
      totalTerr: TERR_CONFIG.length, totalCetaps: getTotalCetaps(),
      pctAprobacion: total > 0 ? Math.round((aprobados / total) * 100) : 0,
    };
  }, [ptas, terrStats]);

  // ═══ Initialize Leaflet map (once) ═══
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: COLOMBIA_CENTER,
      zoom: COLOMBIA_ZOOM,
      maxBounds: L.latLngBounds([-4.5, -82], [13.5, -66.5]),
      maxBoundsViscosity: 0.9,
      minZoom: 5,
      maxZoom: 14,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Base tiles (no labels)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    // Labels layer
    const labels = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', { pane: 'tooltipPane' });
    labels.addTo(map);
    labelsLayerRef.current = labels;

    // CETAP layer group
    const cetapGroup = L.layerGroup().addTo(map);
    cetapLayerRef.current = cetapGroup;

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ═══ Helper: get terrId from GeoJSON feature ═══
  const getTerritorialForFeature = useCallback((feature: any): string | undefined => {
    const name = feature?.properties?.NOMBRE_DPT
      || feature?.properties?.DEPARTAMEN
      || feature?.properties?.name
      || feature?.properties?.NAME_1
      || feature?.properties?.DPTO
      || '';
    return getDeptTerritorialId(name);
  }, []);

  // ═══ Rebuild GeoJSON layer when data/mode/selection changes ═══
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Remove old
    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }
    if (!geoJson) return;

    const layer = L.geoJSON(geoJson, {
      style: (feature) => {
        const terrId = getTerritorialForFeature(feature);
        const isSel = selectedTerr && selectedTerr === terrId;
        const dimmed = selectedTerr && selectedTerr !== terrId;
        let fillColor = '#E2E8F0';
        let fillOpacity = 0.65;

        if (mapMode === 'territorial') {
          fillColor = terrId ? (TERRITORIAL_COLORS[terrId]?.base || '#94A3B8') : '#E2E8F0';
        } else if (mapMode === 'calor' && terrId) {
          fillColor = getHeatColor(terrStats[terrId]?.total || 0, maxTotal);
        } else if (mapMode === 'avance' && terrId) {
          fillColor = getProgressColor(terrStats[terrId]?.pctAvance || 0).fill;
        }
        if (isSel) fillOpacity = 0.85;
        else if (dimmed) fillOpacity = 0.25;

        return {
          fillColor, fillOpacity,
          color: isSel ? '#0F172A' : '#FFFFFF',
          weight: isSel ? 2.5 : 1,
          opacity: 1,
        };
      },
      onEachFeature: (feature, featureLayer) => {
        const terrId = getTerritorialForFeature(feature);
        const terrData = terrId ? TERR_CONFIG.find(t => t.id === terrId) : null;
        const stats = terrId ? terrStats[terrId] : null;
        const geoT = terrId ? TERRITORIALES_GEO.find(t => t.id === terrId) : null;
        const deptName = feature?.properties?.NOMBRE_DPT
          || feature?.properties?.DEPARTAMEN
          || feature?.properties?.name
          || feature?.properties?.NAME_1
          || 'Desconocido';

        if (terrData && stats) {
          featureLayer.bindTooltip(
            `<div style="font-family:system-ui;min-width:170px">
              <div style="font-weight:800;font-size:13px;display:flex;align-items:center;gap:5px">
                <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${TERRITORIAL_COLORS[terrId!]?.base || '#94A'}"></span>
                ${terrData.nombre}
              </div>
              <div style="color:#64748B;font-size:10px;margin-top:2px">${deptName} · ${geoT?.cetaps.length || 0} CETAPs</div>
              <div style="display:flex;gap:10px;margin-top:6px;font-size:11px">
                <span><span style="color:#9CA3AF">PTAs:</span> <b>${stats.total}</b></span>
                <span style="color:#059669">&check; ${stats.aprobados}</span>
                <span style="color:#D97706">&#9203; ${stats.pendientes}</span>
              </div>
              <div style="margin-top:6px;height:5px;border-radius:4px;background:#E2E8F0;overflow:hidden">
                <div style="height:100%;border-radius:4px;width:${stats.pctAvance}%;background:${getProgressColor(stats.pctAvance).fill}"></div>
              </div>
              <div style="text-align:right;font-size:10px;color:#9CA3AF;margin-top:2px">${stats.pctAvance}% avance</div>
            </div>`,
            { sticky: true, direction: 'top', className: 'leaflet-tooltip-custom' }
          );
        }

        featureLayer.on('mouseover', () => {
          (featureLayer as any).setStyle({ weight: 2.5, fillOpacity: 0.9 });
        });
        featureLayer.on('mouseout', () => {
          layer.resetStyle(featureLayer);
        });
        featureLayer.on('click', () => {
          if (!terrId) return;
          const geo = TERRITORIALES_GEO.find(t => t.id === terrId);
          if (selectedTerrRef.current === terrId) {
            setSelectedTerr(null);
            setSelectedCetap(null);
            map.flyTo(COLOMBIA_CENTER, COLOMBIA_ZOOM, { duration: 0.8 });
          } else if (geo) {
            setSelectedTerr(terrId);
            setSelectedCetap(null);
            map.flyTo([geo.lat, geo.lng], 8, { duration: 0.8 });
          }
        });
      },
    });

    layer.addTo(map);
    geoJsonLayerRef.current = layer;
  }, [mapReady, mapMode, selectedTerr, terrStats, maxTotal, getTerritorialForFeature]);

  // ═══ Rebuild CETAP markers ═══
  useEffect(() => {
    const group = cetapLayerRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showCetaps) return;

    TERRITORIALES_GEO.forEach(terr => {
      const terrColors = TERRITORIAL_COLORS[terr.id];
      const isTerrSel = selectedTerr === terr.id;
      const dimmed = selectedTerr && !isTerrSel;
      if (dimmed) return;

      terr.cetaps.forEach(cetap => {
        const isSede = cetap.esSedeTerritorial;
        const marker = L.circleMarker([cetap.lat, cetap.lng], {
          radius: isSede ? 8 : 5,
          fillColor: isSede ? (terrColors?.base || '#2563EB') : '#FFFFFF',
          color: isSede ? '#FFFFFF' : (terrColors?.base || '#6B7280'),
          weight: isSede ? 2.5 : 1.5,
          fillOpacity: 0.9,
          opacity: 1,
        });

        const sedeTag = cetap.esSedeTerritorial
          ? `<div style="margin-top:3px"><span style="font-size:9px;background:${terrColors?.base || '#2563EB'};color:#fff;padding:1px 5px;border-radius:4px;font-weight:700">SEDE TERRITORIAL</span></div>`
          : '';
        const dirTag = cetap.direccion
          ? `<div style="color:#94A3B8;font-size:10px;margin-top:3px">${cetap.direccion}</div>`
          : '';

        marker.bindTooltip(
          `<div style="font-family:system-ui;min-width:140px">
            <div style="font-weight:700;font-size:12px">${cetap.nombre}</div>
            <div style="color:#64748B;font-size:10px;margin-top:2px">${cetap.ciudad}, ${cetap.departamento}</div>
            ${sedeTag}${dirTag}
          </div>`,
          { direction: 'top', offset: [0, -8], className: 'leaflet-tooltip-cetap' }
        );

        marker.on('click', () => {
          setSelectedTerr(terr.id);
          setSelectedCetap(prev => prev?.id === cetap.id ? null : cetap);
          mapRef.current?.flyTo([cetap.lat, cetap.lng], 10, { duration: 0.8 });
        });

        group.addLayer(marker);
      });
    });
  }, [showCetaps, selectedTerr, selectedCetap]);

  // ═══ Toggle labels layer ═══
  useEffect(() => {
    const map = mapRef.current;
    const labels = labelsLayerRef.current;
    if (!map || !labels) return;
    if (showLabels) { if (!map.hasLayer(labels)) labels.addTo(map); }
    else { if (map.hasLayer(labels)) map.removeLayer(labels); }
  }, [showLabels]);

  // ═══ Derived data ═══
  const selectedData = selectedTerr ? TERR_CONFIG.find(t => t.id === selectedTerr) : null;
  const selectedStats = selectedTerr ? terrStats[selectedTerr] : null;
  const selectedGeo = selectedTerr ? TERRITORIALES_GEO.find(t => t.id === selectedTerr) : null;

  const focusTerritorial = (terrId: string) => {
    const geo = TERRITORIALES_GEO.find(t => t.id === terrId);
    if (geo) {
      setSelectedTerr(terrId);
      setSelectedCetap(null);
      mapRef.current?.flyTo([geo.lat, geo.lng], 8, { duration: 0.8 });
    }
  };

  const resetMap = () => {
    setSelectedTerr(null);
    setSelectedCetap(null);
    mapRef.current?.flyTo(COLOMBIA_CENTER, COLOMBIA_ZOOM, { duration: 0.8 });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-9 h-9 text-blue-700 animate-spin mb-3" />
        <p className="text-sm font-semibold text-gray-500">Cargando datos PTA...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2.5 m-0">
          <Globe className="w-6 h-6 text-blue-800" />
          Mapa de Cobertura Territorial PTA
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {kpis.totalTerr} territoriales · {kpis.totalCetaps} CETAPs — Periodo 2026-1
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total PTAs', value: kpis.total, icon: BarChart3, color: '#003DA5', bg: '#EFF6FF' },
          { label: 'Aprobados', value: `${kpis.aprobados} (${kpis.pctAprobacion}%)`, icon: CheckCircle, color: '#059669', bg: '#ECFDF5' },
          { label: 'Pendientes', value: kpis.pendientes, icon: Clock, color: '#D97706', bg: '#FFFBEB' },
          { label: 'Cobertura', value: `${kpis.cobertura}/${kpis.totalTerr}`, icon: MapPin, color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'CETAPs', value: kpis.totalCetaps, icon: Building2, color: '#0284C7', bg: '#E0F2FE' },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="rounded-lg p-1.5" style={{ background: card.bg }}>
                <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
              </div>
            </div>
            <div className="text-xl font-extrabold text-gray-900">{card.value}</div>
            <div className="text-[11px] text-gray-500 font-medium">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Map + Panel */}
      <div className={`grid gap-4 ${selectedTerr ? 'lg:grid-cols-[1fr_370px]' : 'grid-cols-1'}`}>
        {/* Map Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {([
                { key: 'territorial' as MapMode, label: 'Territoriales', icon: Palette },
                { key: 'avance' as MapMode, label: 'Avance', icon: Target },
                { key: 'calor' as MapMode, label: 'Calor', icon: Thermometer },
              ]).map(m => (
                <button key={m.key} onClick={() => setMapMode(m.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border-none ${mapMode === m.key ? 'bg-white text-gray-900 shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}>
                  <m.icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowCetaps(!showCetaps)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${showCetaps ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                <MapPinned className="w-3 h-3" /><span className="hidden sm:inline">CETAPs</span>
              </button>
              <button onClick={() => setShowLabels(!showLabels)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${showLabels ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                {showLabels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span className="hidden sm:inline">Labels</span>
              </button>
              {selectedTerr && (
                <>
                  <div className="w-px h-5 bg-gray-200 mx-0.5" />
                  <button onClick={resetMap}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border border-gray-200 bg-white hover:bg-gray-50 text-gray-500">
                    <Crosshair className="w-3 h-3" /><span className="hidden sm:inline">Reset</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Leaflet container */}
          <div ref={mapContainerRef} style={{ height: 540, width: '100%', background: '#EFF6FF' }} />

          {/* Legend */}
          <div className="px-4 py-3 border-t border-gray-100">
            {mapMode === 'territorial' && (
              <>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Territoriales ESAP — click para explorar
                </div>
                <div className="flex flex-wrap gap-x-1 gap-y-1">
                  {TERR_CONFIG.map(terr => {
                    const colors = TERRITORIAL_COLORS[terr.id];
                    const isActive = selectedTerr === terr.id;
                    const geo = TERRITORIALES_GEO.find(t => t.id === terr.id);
                    return (
                      <button
                        key={terr.id}
                        onClick={() => { if (isActive) resetMap(); else focusTerritorial(terr.id); }}
                        className={`flex items-center gap-1 text-[11px] cursor-pointer border px-1.5 py-1 rounded-md transition-all ${isActive ? 'bg-blue-50 border-blue-200 font-bold shadow-sm' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'}`}
                        style={{ color: isActive ? colors?.dark : '#6B7280' }}
                      >
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: colors?.base }} />
                        <span className="truncate max-w-[70px]">{terr.nombre}</span>
                        <span className="text-[9px] font-semibold px-1 py-0 rounded"
                          style={{ background: isActive ? `${colors?.base}20` : '#F3F4F6', color: isActive ? colors?.base : '#9CA3AF' }}>
                          {geo?.cetaps.length || 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {mapMode === 'calor' && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Densidad PTAs</span>
                <div className="flex items-center gap-0.5">
                  {['#FEF3C7', '#FCD34D', '#F59E0B', '#EA580C', '#DC2626', '#991B1B'].map((c, i) => (
                    <div key={i} className="w-6 h-3 first:rounded-l last:rounded-r" style={{ background: c }} />
                  ))}
                </div>
                <span className="text-[10px] text-gray-400">Bajo &rarr; Alto</span>
              </div>
            )}
            {mapMode === 'avance' && (
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">% Aprobación</span>
                {[{ l: '≥80%', c: '#059669' }, { l: '50-79%', c: '#D97706' }, { l: '20-49%', c: '#EA580C' }, { l: '<20%', c: '#DC2626' }, { l: 'Sin datos', c: '#94A3B8' }].map(x => (
                  <div key={x.l} className="flex items-center gap-1 text-[11px] text-gray-500">
                    <div className="w-3 h-3 rounded-full" style={{ background: x.c }} />{x.l}
                  </div>
                ))}
              </div>
            )}
            {showCetaps && (
              <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow" /> Sede Territorial
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-white border-2 border-blue-400" /> CETAP
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ Detail Panel ═══ */}
        <AnimatePresence>
          {selectedTerr && selectedData && selectedStats && (
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden self-start max-h-[85vh] overflow-y-auto"
            >
              {/* Panel header */}
              <div className="px-5 py-4 border-b flex justify-between items-start sticky top-0 z-10"
                style={{ background: `linear-gradient(135deg, ${TERRITORIAL_COLORS[selectedTerr]?.base} 0%, ${TERRITORIAL_COLORS[selectedTerr]?.hover} 100%)` }}>
                <div>
                  <h3 className="text-base font-bold text-white m-0 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />{selectedData.nombre}
                  </h3>
                  <p className="text-xs mt-0.5 text-white/70">{selectedData.ciudad}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: getProgressColor(selectedStats.pctAvance).bg, color: getProgressColor(selectedStats.pctAvance).text }}>
                      {getProgressColor(selectedStats.pctAvance).label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white/20 text-white">
                      {selectedGeo?.cetaps.length || 0} CETAPs
                    </span>
                  </div>
                </div>
                <button onClick={resetMap}
                  className="w-7 h-7 rounded-lg border-none cursor-pointer flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>

              <div className="p-5">
                {/* Circular progress + total */}
                <div className="flex items-center gap-5 mb-5">
                  <div className="relative w-[72px] h-[72px] flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-[72px] h-[72px]" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                      <circle cx="18" cy="18" r="14" fill="none"
                        stroke={getProgressColor(selectedStats.pctAvance).fill} strokeWidth="3"
                        strokeDasharray={`${selectedStats.pctAvance * 0.8796} ${87.96 - selectedStats.pctAvance * 0.8796}`}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-extrabold" style={{ color: getProgressColor(selectedStats.pctAvance).text }}>
                        {selectedStats.pctAvance}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-gray-900">{selectedStats.total}</div>
                    <div className="text-xs text-gray-500">PTAs totales</div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                      <Users className="w-3 h-3" /> {selectedStats.docentes} docentes
                    </div>
                  </div>
                </div>

                {/* Estado breakdown */}
                <div className="flex flex-col gap-1.5 mb-5">
                  {[
                    { label: 'Aprobados', value: selectedStats.aprobados, color: '#059669', bg: '#ECFDF5', icon: CheckCircle },
                    { label: 'Pendientes', value: selectedStats.pendientes, color: '#D97706', bg: '#FFFBEB', icon: Clock },
                    { label: 'Concertación/SNA', value: selectedStats.enConcertacion, color: '#7C3AED', bg: '#F5F3FF', icon: Users },
                    { label: 'Devueltos', value: selectedStats.devueltos, color: '#EA580C', bg: '#FFF7ED', icon: AlertTriangle },
                    { label: 'Rechazados', value: selectedStats.rechazados, color: '#DC2626', bg: '#FEF2F2', icon: X },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center px-3 py-2 rounded-lg"
                      style={{ background: item.value > 0 ? item.bg : 'transparent' }}>
                      <div className="flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5" style={{ color: item.value > 0 ? item.color : '#D1D5DB' }} />
                        <span className="text-xs text-gray-600">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: item.value > 0 ? item.color : '#D1D5DB' }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Distribution bar */}
                {selectedStats.total > 0 && (
                  <div className="mb-5">
                    <div className="text-xs font-semibold text-gray-500 mb-1.5">Distribución</div>
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-200">
                      {selectedStats.aprobados > 0 && <div style={{ width: `${(selectedStats.aprobados / selectedStats.total) * 100}%`, background: '#059669' }} />}
                      {selectedStats.pendientes > 0 && <div style={{ width: `${(selectedStats.pendientes / selectedStats.total) * 100}%`, background: '#D97706' }} />}
                      {selectedStats.enConcertacion > 0 && <div style={{ width: `${(selectedStats.enConcertacion / selectedStats.total) * 100}%`, background: '#7C3AED' }} />}
                      {selectedStats.devueltos > 0 && <div style={{ width: `${(selectedStats.devueltos / selectedStats.total) * 100}%`, background: '#EA580C' }} />}
                      {selectedStats.rechazados > 0 && <div style={{ width: `${(selectedStats.rechazados / selectedStats.total) * 100}%`, background: '#DC2626' }} />}
                    </div>
                  </div>
                )}

                {/* CETAPs list */}
                {selectedGeo && selectedGeo.cetaps.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPinned className="w-4 h-4 text-blue-700" />
                      <span className="text-sm font-bold text-gray-900">CETAPs</span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                        {selectedGeo.cetaps.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {selectedGeo.cetaps.map(cetap => {
                        const isSel = selectedCetap?.id === cetap.id;
                        return (
                          <button
                            key={cetap.id}
                            onClick={() => {
                              setSelectedCetap(isSel ? null : cetap);
                              if (!isSel) mapRef.current?.flyTo([cetap.lat, cetap.lng], 11, { duration: 0.8 });
                            }}
                            className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${isSel ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200'}`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cetap.esSedeTerritorial ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                {cetap.esSedeTerritorial
                                  ? <Building2 className="w-4 h-4 text-blue-700" />
                                  : <MapPin className="w-4 h-4 text-gray-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-gray-900 truncate">{cetap.nombre}</span>
                                  {cetap.esSedeTerritorial && (
                                    <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">SEDE</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-0.5">{cetap.ciudad}, {cetap.departamento}</div>
                                {cetap.direccion && (
                                  <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                    <Navigation className="w-2.5 h-2.5" /> {cetap.direccion}
                                  </div>
                                )}
                                {isSel && (
                                  <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-2 gap-1.5 text-[10px]">
                                    <div><span className="text-gray-400">Código:</span> <span className="font-semibold text-gray-700">{cetap.codigo}</span></div>
                                    <div><span className="text-gray-400">Lat:</span> <span className="font-mono text-gray-600">{cetap.lat.toFixed(4)}</span></div>
                                    <div><span className="text-gray-400">Dpto:</span> <span className="font-semibold text-gray-700">{cetap.departamento}</span></div>
                                    <div><span className="text-gray-400">Lng:</span> <span className="font-mono text-gray-600">{cetap.lng.toFixed(4)}</span></div>
                                  </div>
                                )}
                              </div>
                              <ChevronRight className={`w-3.5 h-3.5 text-gray-300 flex-shrink-0 transition-transform ${isSel ? 'rotate-90' : ''}`} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ranking table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mt-5 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-800" />
            <span className="text-sm font-bold text-gray-900">Ranking territorial por avance</span>
          </div>
          <span className="text-[10px] text-gray-400 font-medium">{kpis.totalTerr} territoriales · {kpis.totalCetaps} CETAPs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 w-8">#</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500">TERRITORIAL</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500">CETAPs</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500">PTAs</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500">APROB.</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500">PEND.</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 min-w-[130px]">AVANCE</th>
              </tr>
            </thead>
            <tbody>
              {TERR_CONFIG.map(t => ({ ...t, stats: terrStats[t.id], geo: TERRITORIALES_GEO.find(g => g.id === t.id) }))
                .sort((a, b) => (b.stats?.pctAvance || 0) - (a.stats?.pctAvance || 0))
                .map((t, i) => {
                  const s = t.stats;
                  const colors = getProgressColor(s?.pctAvance || 0);
                  const terrColors = TERRITORIAL_COLORS[t.id];
                  const isActive = selectedTerr === t.id;
                  return (
                    <tr key={t.id} onClick={() => focusTerritorial(t.id)}
                      className={`cursor-pointer border-b border-gray-50 transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-3 py-2.5 text-gray-400 font-semibold text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-gray-900 flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: terrColors?.base }} />
                          {t.nombre}
                        </div>
                        <div className="text-[11px] text-gray-400">{t.ciudad}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">{t.geo?.cetaps.length || 0}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-900 text-xs">{s?.total || 0}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-emerald-600 text-xs">{s?.aprobados || 0}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-amber-600 text-xs">{s?.pendientes || 0}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden min-w-[50px]">
                            <div className="h-full rounded-full transition-all" style={{ background: colors.fill, width: `${s?.pctAvance || 0}%` }} />
                          </div>
                          <span className="text-[11px] font-bold min-w-[28px] text-right" style={{ color: colors.text }}>{s?.pctAvance || 0}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom tooltip styles */}
      <style>{`
        .leaflet-tooltip-custom {
          background: rgba(15,23,42,0.95) !important;
          color: #fff !important;
          border: none !important;
          border-radius: 12px !important;
          padding: 10px 14px !important;
          font-size: 12px !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
          backdrop-filter: blur(8px);
        }
        .leaflet-tooltip-custom::before {
          border-top-color: rgba(15,23,42,0.95) !important;
        }
        .leaflet-tooltip-cetap {
          background: white !important;
          border: 1px solid #E2E8F0 !important;
          border-radius: 10px !important;
          padding: 8px 12px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12) !important;
        }
        .leaflet-tooltip-cetap::before {
          border-top-color: white !important;
        }
        .leaflet-container {
          font-family: system-ui, -apple-system, sans-serif;
        }
        .leaflet-control-zoom a {
          border-radius: 8px !important;
          width: 30px !important;
          height: 30px !important;
          line-height: 30px !important;
          font-size: 15px !important;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.1) !important;
          border-radius: 10px !important;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}