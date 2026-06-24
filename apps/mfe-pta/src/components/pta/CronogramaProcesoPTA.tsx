/**
 * CronogramaProcesoPTA — Cronograma Interactivo del Proceso PTA
 * 
 * Implementa el diagrama de flujo completo PARTE XXVI, Sec. 26.3.1:
 * - Fase 1: Entrada de Datos (inicio de periodo)
 * - Fase 2: Creacion y Concertacion de PTAs
 * - Fase 3: Flujo de Aprobacion Jerarquico (N1, N2, N3)
 * - Fase 4: Generacion de Reportes y Exportaciones
 * 
 * Timeline interactivo con hitos, estados en tiempo real, y conexion con datos del KV.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Calendar, Upload, Users, FileText, MessageSquare, CheckCircle2,
  Globe, BarChart3, Clock, ArrowRight, ChevronDown, ChevronRight,
  Database, Shield, AlertTriangle, Briefcase, RefreshCw, TrendingUp,
  Loader2, Download, Printer, Building2, FlaskConical,
} from 'lucide-react';
import { getAllPTAs, getPTAEstadisticas } from '../../services/api/ptaApi';

interface FaseConfig {
  id: string;
  numero: number;
  titulo: string;
  subtitulo: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  fechaInicio: string;
  fechaFin: string;
  hitos: Hito[];
}

interface Hito {
  id: string;
  label: string;
  descripcion: string;
  estado: 'completado' | 'en_progreso' | 'pendiente' | 'bloqueado';
  fecha?: string;
  responsable: string;
  indicador?: { valor: number; total: number };
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function CronogramaProcesoPTA() {
  const [ptas, setPtas] = useState<any[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedFase, setExpandedFase] = useState<string | null>('fase-2');
  const [periodo] = useState('2025-2');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [ptasRes, statsRes] = await Promise.all([
      getAllPTAs({ periodo }),
      getPTAEstadisticas(periodo),
    ]);
    // Validación robusta: asegurar que siempre sean arrays
    if (ptasRes.success && Array.isArray(ptasRes.data)) {
      setPtas(ptasRes.data);
    } else {
      console.warn('[CronogramaProceso] PTA data is not an array:', ptasRes);
      setPtas([]);
    }
    if (statsRes.success) setEstadisticas(statsRes.data);
    setLoading(false);
  };

  // Calculate real-time stats
  const stats = useMemo(() => {
    const total = ptas.length;
    const borradores = ptas.filter(p => p.estado === 'Borrador').length;
    const enConcertacion = ptas.filter(p => ['En Concertacion', 'CONCERTADO', 'Pendiente Concertacion'].includes(p.estado)).length;
    const pendienteJef = ptas.filter(p => p.estado === 'Pendiente Jefatura').length;
    const pendienteDec = ptas.filter(p => p.estado === 'Pendiente Decanatura').length;
    const pendienteGP = ptas.filter(p => p.estado === 'Pendiente Gestion Profesoral').length;
    const pendienteAprobacion = ptas.filter(p => p.estado === 'PENDIENTE_APROBACION').length;
    const aprobados = ptas.filter(p => p.estado === 'Aprobado').length;
    const rechazados = ptas.filter(p => p.estado === 'Rechazado' || p.estado === 'Devuelto').length;
    const conDatos = ptas.filter(p => (p.total_horas_programadas || 0) > 0).length;
    return { total, borradores, enConcertacion, pendienteJef, pendienteDec, pendienteGP, pendienteAprobacion, aprobados, rechazados, conDatos };
  }, [ptas]);

  // Determine real hito states based on data
  const fases: FaseConfig[] = [
    {
      id: 'fase-1', numero: 1,
      titulo: 'Entrada de Datos',
      subtitulo: 'Inicio de Periodo Academico',
      icon: Upload, color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE',
      fechaInicio: '2026-01-15', fechaFin: '2026-02-15',
      hitos: [
        {
          id: 'h1-1', label: 'Carga masiva de docentes',
          descripcion: 'Archivo Excel con 263 docentes TC/MT desde Gestion Humana',
          estado: stats.total > 0 ? 'completado' : 'en_progreso',
          fecha: '2026-02-01', responsable: 'Gestion Humana',
          indicador: { valor: stats.total, total: 263 },
        },
        {
          id: 'h1-2', label: 'Carga de asignaturas',
          descripcion: '426 asignaturas del catalogo academico por programa',
          estado: 'completado', fecha: '2026-02-05', responsable: 'Subdireccion Academica',
        },
        {
          id: 'h1-3', label: 'Actualizacion de catalogos',
          descripcion: 'Territoriales, programas, escalafones, actividades complementarias',
          estado: 'completado', fecha: '2026-02-03', responsable: 'OTIC',
        },
        {
          id: 'h1-4', label: 'Validacion y conciliacion',
          descripcion: 'Verificacion de datos cruzados entre fuentes',
          estado: stats.total > 0 ? 'completado' : 'pendiente',
          fecha: '2026-02-08', responsable: 'OTIC',
        },
        {
          id: 'h1-5', label: 'Habilitacion de PTAs',
          descripcion: 'Apertura del periodo para creacion de PTAs por docentes',
          estado: stats.total > 0 ? 'completado' : 'pendiente',
          fecha: '2026-02-10', responsable: 'Subdireccion Academica',
        },
      ],
    },
    {
      id: 'fase-2', numero: 2,
      titulo: 'Creacion y Concertacion',
      subtitulo: 'Docentes crean PTAs y conciertan con jefes',
      icon: MessageSquare, color: '#7C3AED', bg: '#F3E8FF', border: '#DDD6FE',
      fechaInicio: '2026-02-10', fechaFin: '2026-03-15',
      hitos: [
        {
          id: 'h2-1', label: 'Creacion individual de PTAs',
          descripcion: 'Cada docente crea su PTA con los 4 componentes',
          estado: stats.conDatos > 0 ? 'en_progreso' : 'pendiente',
          fecha: '2026-02-10 a 2026-03-01', responsable: '263 Docentes',
          indicador: { valor: stats.conDatos, total: 263 },
        },
        {
          id: 'h2-2', label: 'Motor de calculo y validaciones',
          descripcion: 'Limites normativos, porcentajes, consistencia de horas',
          estado: 'en_progreso', responsable: 'Sistema automatico',
        },
        {
          id: 'h2-3', label: 'Mesa de Concertacion',
          descripcion: 'Reunion bilateral docente-jefe para concertar PTA',
          estado: stats.enConcertacion > 0 || stats.pendienteJef > 0 ? 'en_progreso' : 'pendiente',
          fecha: '2026-02-20 a 2026-03-10', responsable: 'Docentes y Jefes',
          indicador: { valor: stats.enConcertacion + stats.pendienteJef + stats.pendienteDec + stats.pendienteGP + stats.aprobados, total: 263 },
        },
        {
          id: 'h2-4', label: 'Firma digital de concertacion',
          descripcion: 'Ambas partes firman digitalmente el acta de concertacion',
          estado: stats.pendienteJef > 0 || stats.aprobados > 0 ? 'en_progreso' : 'pendiente',
          responsable: 'Docente + Jefe Inmediato',
        },
      ],
    },
    {
      id: 'fase-3', numero: 3,
      titulo: 'Flujo de Aprobacion Jerarquico',
      subtitulo: 'Aprobacion multinivel: N1 → N2 → N3',
      icon: CheckCircle2, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
      fechaInicio: '2026-03-01', fechaFin: '2026-04-15',
      hitos: [
        {
          id: 'h3-1', label: 'N1 — Director Territorial',
          descripcion: 'Revision y aprobacion por el director de cada territorial',
          estado: stats.pendienteJef > 0 ? 'en_progreso' : stats.pendienteDec > 0 || stats.aprobados > 0 ? 'completado' : 'pendiente',
          responsable: '17 Directores Territoriales',
          indicador: { valor: stats.pendienteDec + stats.pendienteGP + stats.aprobados, total: stats.total || 263 },
        },
        {
          id: 'h3-2', label: 'N2 — Coordinador Academico / Decanatura',
          descripcion: 'Revision de pertinencia academica y consistencia',
          estado: stats.pendienteDec > 0 ? 'en_progreso' : stats.pendienteGP > 0 || stats.aprobados > 0 ? 'completado' : 'pendiente',
          responsable: 'Decanatura Nacional',
          indicador: { valor: stats.pendienteGP + stats.aprobados, total: stats.total || 263 },
        },
        {
          id: 'h3-3', label: 'N3 — Gestion Profesoral / Subdireccion',
          descripcion: 'Aprobacion final con firma digital y generacion de resolucion',
          estado: stats.pendienteGP > 0 ? 'en_progreso' : stats.aprobados > 0 ? 'completado' : 'pendiente',
          responsable: 'Subdireccion Nal. Serv. Academicos',
          indicador: { valor: stats.aprobados, total: stats.total || 263 },
        },
        {
          id: 'h3-4', label: 'Gestion de rechazos/devoluciones',
          descripcion: 'PTAs devueltos al docente para correccion',
          estado: stats.rechazados > 0 ? 'en_progreso' : 'pendiente',
          responsable: 'Todos los niveles',
          indicador: stats.rechazados > 0 ? { valor: stats.rechazados, total: stats.total || 263 } : undefined,
        },
      ],
    },
    {
      id: 'fase-4', numero: 4,
      titulo: 'Reportes y Exportaciones',
      subtitulo: 'Generacion de salidas oficiales',
      icon: BarChart3, color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74',
      fechaInicio: '2026-03-15', fechaFin: '2026-06-30',
      hitos: [
        {
          id: 'h4-1', label: 'PDF — Resumen Individual PTA (R-01)',
          descripcion: 'Formato GTH-F081 con firmas digitales y QR de verificacion',
          estado: stats.aprobados > 0 ? 'en_progreso' : 'pendiente',
          responsable: 'Sistema automatico',
        },
        {
          id: 'h4-2', label: 'Excel — Tablero de Control Docente (R-02)',
          descripcion: 'Consolidado nacional con 26 columnas y tablas dinamicas',
          estado: stats.total > 0 ? 'en_progreso' : 'pendiente',
          responsable: 'Subdireccion',
        },
        {
          id: 'h4-3', label: 'TXT — Archivo plano para SIIF (EXP-01)',
          descripcion: 'Datos de nomina delimitados por pipes para sistema financiero',
          estado: 'pendiente', responsable: 'Financiera',
        },
        {
          id: 'h4-4', label: 'API — Sincronizacion RUND (EXP-02)',
          descripcion: 'JSON automatico al sistema de registro unico docente',
          estado: 'pendiente', responsable: 'OTIC',
        },
        {
          id: 'h4-5', label: 'PDF — Informe Ejecutivo Direccion (R-11)',
          descripcion: 'KPIs estrategicos para la Direccion Nacional',
          estado: 'pendiente', responsable: 'Direccion Nacional',
        },
      ],
    },
  ];

  // Calculate global progress
  const allHitos = fases.flatMap(f => f.hitos);
  const hitosCompletados = allHitos.filter(h => h.estado === 'completado').length;
  const hitosEnProgreso = allHitos.filter(h => h.estado === 'en_progreso').length;
  const globalProgress = allHitos.length > 0 ? ((hitosCompletados + hitosEnProgreso * 0.5) / allHitos.length) * 100 : 0;

  // Current date position in timeline
  const today = new Date();
  const timelineStart = new Date('2026-01-15');
  const timelineEnd = new Date('2026-06-30');
  const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / 86400000;
  const currentDay = Math.max(0, Math.min(totalDays, (today.getTime() - timelineStart.getTime()) / 86400000));
  const currentPct = (currentDay / totalDays) * 100;

  const estadoColors: Record<string, { bg: string; color: string; label: string }> = {
    completado: { bg: '#D1FAE5', color: '#065F46', label: 'Completado' },
    en_progreso: { bg: '#DBEAFE', color: '#1E40AF', label: 'En Progreso' },
    pendiente: { bg: '#F3F4F6', color: '#6B7280', label: 'Pendiente' },
    bloqueado: { bg: '#FEE2E2', color: '#991B1B', label: 'Bloqueado' },
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'white', borderRadius: 12, border: '1px solid #E5E7EB' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 style={{ width: 36, height: 36, color: '#003DA5', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>Cargando cronograma...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', background: 'linear-gradient(135deg, #FAFBFF 0%, #F0F4FF 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar style={{ width: 20, height: 20, color: '#003DA5' }} />
              Cronograma del Proceso PTA
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
              Periodo {periodo} — 4 fases, {allHitos.length} hitos — PARTE XXVI Sec. 26.3.1
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              padding: '6px 14px', borderRadius: 8, background: '#003DA5', color: 'white',
              fontSize: '0.82rem', fontWeight: 700,
            }}>
              Avance Global: {globalProgress.toFixed(0)}%
            </div>
            <button onClick={loadData} style={{
              padding: '7px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
              background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              fontSize: '0.78rem', fontWeight: 600, color: '#374151',
            }}>
              <RefreshCw style={{ width: 13, height: 13 }} /> Actualizar
            </button>
          </div>
        </div>

        {/* Global progress bar */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.72rem', color: '#9CA3AF' }}>
            <span>Ene 2026</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Abr</span>
            <span>May</span>
            <span>Jun 2026</span>
          </div>
          <div style={{ position: 'relative', height: 28, borderRadius: 10, background: '#F3F4F6', overflow: 'hidden' }}>
            {/* Phase segments */}
            {fases.map((fase, idx) => {
              const fStart = new Date(fase.fechaInicio);
              const fEnd = new Date(fase.fechaFin);
              const left = ((fStart.getTime() - timelineStart.getTime()) / 86400000 / totalDays) * 100;
              const width = ((fEnd.getTime() - fStart.getTime()) / 86400000 / totalDays) * 100;
              return (
                <div
                  key={fase.id}
                  style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: `${left}%`, width: `${width}%`,
                    background: `${fase.color}15`, borderRight: `2px solid ${fase.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: fase.color, whiteSpace: 'nowrap' }}>
                    F{fase.numero}
                  </span>
                </div>
              );
            })}
            {/* Progress fill */}
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0,
              width: `${globalProgress}%`,
              background: 'linear-gradient(90deg, #003DA5 0%, #2563EB 100%)',
              borderRadius: 10, opacity: 0.25,
            }} />
            {/* Today marker */}
            <div style={{
              position: 'absolute', top: -4, bottom: -4,
              left: `${currentPct}%`, width: 2,
              background: '#DC2626', zIndex: 5,
            }}>
              <div style={{
                position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                background: '#DC2626', color: 'white', fontSize: '0.62rem', fontWeight: 700,
                padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap',
              }}>
                HOY
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Total PTAs', value: stats.total, color: '#003DA5', bg: '#EFF6FF' },
            { label: 'Aprobados', value: stats.aprobados, color: '#059669', bg: '#D1FAE5' },
            { label: 'En Flujo', value: stats.pendienteJef + stats.pendienteDec + stats.pendienteGP + stats.pendienteAprobacion, color: '#7C3AED', bg: '#F3E8FF' },
            { label: 'Borradores', value: stats.borradores, color: '#6B7280', bg: '#F3F4F6' },
            { label: 'Rechazados', value: stats.rechazados, color: '#DC2626', bg: '#FEE2E2' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '6px 14px', borderRadius: 8, background: s.bg,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: s.color }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Phases */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {fases.map((fase, faseIdx) => {
            const isExpanded = expandedFase === fase.id;
            const faseHitosCompletados = fase.hitos.filter(h => h.estado === 'completado').length;
            const faseProgress = fase.hitos.length > 0 ? (faseHitosCompletados / fase.hitos.length) * 100 : 0;

            return (
              <div key={fase.id} style={{ marginBottom: 12 }}>
                {/* Connector line */}
                {faseIdx > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                    <div style={{ width: 2, height: 20, background: '#E5E7EB' }} />
                  </div>
                )}

                {/* Phase card */}
                <motion.div
                  layout
                  style={{
                    borderRadius: 14, border: `2px solid ${isExpanded ? fase.color : fase.border}`,
                    overflow: 'hidden', transition: 'border-color 0.3s',
                  }}
                >
                  {/* Phase header */}
                  <button
                    onClick={() => setExpandedFase(isExpanded ? null : fase.id)}
                    style={{
                      width: '100%', padding: '16px 20px', border: 'none', cursor: 'pointer',
                      background: isExpanded ? fase.bg : 'white',
                      display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, background: `${fase.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <fase.icon style={{ width: 22, height: 22, color: fase.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: fase.color, background: `${fase.color}15`, padding: '2px 8px', borderRadius: 6 }}>
                          FASE {fase.numero}
                        </span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>
                          {fase.titulo}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 2 }}>
                        {fase.subtitulo}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                          {fase.fechaInicio.slice(5)} → {fase.fechaFin.slice(5)}
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: fase.color }}>
                          {faseHitosCompletados}/{fase.hitos.length} hitos
                        </div>
                      </div>
                      {/* Mini progress */}
                      <div style={{ width: 40, height: 40, position: 'relative' }}>
                        <svg viewBox="0 0 36 36" style={{ width: 40, height: 40, transform: 'rotate(-90deg)' }}>
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15.9" fill="none"
                            stroke={fase.color} strokeWidth="3"
                            strokeDasharray={`${faseProgress} ${100 - faseProgress}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div style={{
                          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.62rem', fontWeight: 800, color: fase.color,
                        }}>
                          {faseProgress.toFixed(0)}%
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown style={{ width: 18, height: 18, color: '#9CA3AF' }} />
                      ) : (
                        <ChevronRight style={{ width: 18, height: 18, color: '#9CA3AF' }} />
                      )}
                    </div>
                  </button>

                  {/* Hitos */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{ padding: '0 20px 16px', background: fase.bg }}
                    >
                      {fase.hitos.map((hito, hitoIdx) => {
                        const ec = estadoColors[hito.estado];
                        return (
                          <div key={hito.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: hitoIdx < fase.hitos.length - 1 ? `1px solid ${fase.border}` : 'none' }}>
                            {/* Status dot + connector */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                              <div style={{
                                width: 24, height: 24, borderRadius: '50%', background: ec.bg,
                                border: `2px solid ${ec.color}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {hito.estado === 'completado' && <CheckCircle2 style={{ width: 14, height: 14, color: ec.color }} />}
                                {hito.estado === 'en_progreso' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: ec.color, animation: 'pulse 2s infinite' }} />}
                                {hito.estado === 'pendiente' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D1D5DB' }} />}
                                {hito.estado === 'bloqueado' && <AlertTriangle style={{ width: 12, height: 12, color: ec.color }} />}
                              </div>
                              {hitoIdx < fase.hitos.length - 1 && (
                                <div style={{ width: 2, flex: 1, background: fase.border, minHeight: 12, marginTop: 4 }} />
                              )}
                            </div>
                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                                <div>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>
                                    {hito.label}
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 2 }}>
                                    {hito.descripcion}
                                  </div>
                                </div>
                                <span style={{
                                  padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                                  background: ec.bg, color: ec.color, whiteSpace: 'nowrap', flexShrink: 0,
                                }}>
                                  {ec.label}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                                {hito.fecha && (
                                  <span style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Calendar style={{ width: 11, height: 11 }} /> {hito.fecha}
                                  </span>
                                )}
                                <span style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Users style={{ width: 11, height: 11 }} /> {hito.responsable}
                                </span>
                                {hito.indicador && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 80, height: 6, borderRadius: 4, background: '#E5E7EB', overflow: 'hidden' }}>
                                      <div style={{
                                        width: `${Math.min(100, (hito.indicador.valor / hito.indicador.total) * 100)}%`,
                                        height: '100%', borderRadius: 4, background: fase.color,
                                      }} />
                                    </div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: fase.color }}>
                                      {hito.indicador.valor}/{hito.indicador.total}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </motion.div>
              </div>
            );
          })}

          {/* Legend */}
          <div style={{
            marginTop: 20, padding: 14, borderRadius: 10, background: '#F9FAFB',
            border: '1px solid #E5E7EB', display: 'flex', gap: 16, flexWrap: 'wrap',
            justifyContent: 'center', alignItems: 'center',
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280' }}>Estados:</span>
            {Object.entries(estadoColors).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.color}` }} />
                <span style={{ fontSize: '0.72rem', color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
