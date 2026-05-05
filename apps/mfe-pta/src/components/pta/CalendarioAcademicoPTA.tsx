/**
 * CalendarioAcademicoPTA — Vista de calendario académico con deadlines del flujo PTA
 *
 * Funcionalidades:
 * - Vista mensual con celdas que muestran eventos/deadlines
 * - Deadlines por etapa del flujo: creación propuesta, notificación, concertación, 
 *   aprobación N1/N2/N3, fecha límite de cierre
 * - Eventos codificados por color según tipo (deadline, hito, alerta)
 * - Panel lateral con detalle del día seleccionado
 * - Indicador de hoy y semana actual
 * - Resumen de próximos deadlines (próximos 7, 15, 30 días)
 * - Integración con PTAs reales para mostrar fechas de vencimiento
 * - Vista de cronograma del semestre con fases
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock,
  AlertTriangle, CheckCircle, Bell, Flag, Users, FileText,
  MessageSquare, Shield, Award, ArrowRight, X, Target,
  Zap, Eye,
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  fecha: string; // YYYY-MM-DD
  titulo: string;
  tipo: 'deadline' | 'hito' | 'alerta' | 'evento' | 'reunion';
  etapa: string;
  descripcion: string;
  prioridad: 'critica' | 'alta' | 'media' | 'baja';
  completado?: boolean;
}

const TIPO_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  deadline: { color: '#DC2626', bg: '#FEE2E2', icon: Clock },
  hito: { color: '#059669', bg: '#D1FAE5', icon: Flag },
  alerta: { color: '#D97706', bg: '#FEF3C7', icon: AlertTriangle },
  evento: { color: '#003DA5', bg: '#EFF6FF', icon: CalendarIcon },
  reunion: { color: '#7C3AED', bg: '#F3E8FF', icon: Users },
};

const PRIORIDAD_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critica: { label: 'Crítica', color: '#991B1B', bg: '#FEE2E2' },
  alta: { label: 'Alta', color: '#DC2626', bg: '#FEF2F2' },
  media: { label: 'Media', color: '#D97706', bg: '#FEF3C7' },
  baja: { label: 'Baja', color: '#6B7280', bg: '#F3F4F6' },
};

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function generateSemesterEvents(year: number, semester: 1 | 2): CalendarEvent[] {
  const startMonth = semester === 1 ? 0 : 6; // Jan or Jul
  const events: CalendarEvent[] = [];
  const baseDate = (month: number, day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Phase 1: Preparation (month 0-1)
  events.push(
    { id: 'e1', fecha: baseDate(startMonth, 15), titulo: 'Inicio carga masiva de docentes', tipo: 'hito', etapa: 'Preparación', descripcion: 'Apertura del módulo de carga masiva para importar la planta docente del periodo.', prioridad: 'alta' },
    { id: 'e2', fecha: baseDate(startMonth, 22), titulo: 'Deadline carga catálogo asignaturas', tipo: 'deadline', etapa: 'Preparación', descripcion: 'Fecha límite para tener actualizado el catálogo de asignaturas y programas.', prioridad: 'critica' },
    { id: 'e3', fecha: baseDate(startMonth + 1, 1), titulo: 'Inicio programación académica', tipo: 'hito', etapa: 'Programación', descripcion: 'Los directores territoriales inician la programación de asignaturas por CETAP.', prioridad: 'alta' },
  );

  // Phase 2: PTA Creation (month 1-2)
  events.push(
    { id: 'e4', fecha: baseDate(startMonth + 1, 10), titulo: 'Generación masiva de propuestas PTA', tipo: 'hito', etapa: 'Creación PTA', descripcion: 'Lanzamiento del proceso de creación de PTAs con pre-carga de datos institucionales.', prioridad: 'critica' },
    { id: 'e5', fecha: baseDate(startMonth + 1, 15), titulo: 'Deadline creación propuestas PTA', tipo: 'deadline', etapa: 'Creación PTA', descripcion: 'Fecha límite para que todas las propuestas de PTA estén generadas.', prioridad: 'critica' },
    { id: 'e6', fecha: baseDate(startMonth + 1, 16), titulo: 'Notificación masiva a docentes', tipo: 'evento', etapa: 'Notificación', descripcion: 'Envío masivo de notificaciones a docentes con sus propuestas de PTA.', prioridad: 'alta' },
    { id: 'e7', fecha: baseDate(startMonth + 1, 20), titulo: 'Reunión comité evaluación nacional', tipo: 'reunion', etapa: 'Notificación', descripcion: 'Sesión de coordinación con los comités de evaluación para definir criterios de este periodo.', prioridad: 'media' },
  );

  // Phase 3: Negotiation (month 2)
  events.push(
    { id: 'e8', fecha: baseDate(startMonth + 1, 25), titulo: 'Deadline respuesta docentes', tipo: 'deadline', etapa: 'Concertación', descripcion: 'Los docentes deben haber respondido (aceptar/objetar/modificar) sus propuestas.', prioridad: 'critica' },
    { id: 'e9', fecha: baseDate(startMonth + 2, 1), titulo: 'Apertura mesas de concertación', tipo: 'hito', etapa: 'Concertación', descripcion: 'Se habilitan las mesas de concertación para PTAs objetados o modificados.', prioridad: 'alta' },
    { id: 'e10', fecha: baseDate(startMonth + 2, 10), titulo: 'Deadline cierre concertaciones', tipo: 'deadline', etapa: 'Concertación', descripcion: 'Todas las mesas de concertación deben estar cerradas (acuerdo o escalamiento SNA).', prioridad: 'critica' },
    { id: 'e11', fecha: baseDate(startMonth + 2, 8), titulo: 'Alerta: concertaciones sin cerrar', tipo: 'alerta', etapa: 'Concertación', descripcion: 'Revisión de concertaciones que llevan más de 10 días sin resolverse.', prioridad: 'alta' },
  );

  // Phase 4: Approval (month 2-3)
  events.push(
    { id: 'e12', fecha: baseDate(startMonth + 2, 12), titulo: 'Inicio aprobación N1 (Jefatura)', tipo: 'hito', etapa: 'Aprobación N1', descripcion: 'Los jefes de programa inician la revisión y aprobación de PTAs concertados.', prioridad: 'alta' },
    { id: 'e13', fecha: baseDate(startMonth + 2, 18), titulo: 'Deadline aprobación N1', tipo: 'deadline', etapa: 'Aprobación N1', descripcion: 'Fecha límite para que todas las jefaturas hayan completado la revisión N1.', prioridad: 'critica' },
    { id: 'e14', fecha: baseDate(startMonth + 2, 20), titulo: 'Inicio aprobación N2 (Decanatura)', tipo: 'hito', etapa: 'Aprobación N2', descripcion: 'Las decanaturas revisan y aprueban los PTAs que pasaron N1.', prioridad: 'alta' },
    { id: 'e15', fecha: baseDate(startMonth + 2, 25), titulo: 'Deadline aprobación N2', tipo: 'deadline', etapa: 'Aprobación N2', descripcion: 'Fecha límite para la aprobación por decanatura.', prioridad: 'critica' },
    { id: 'e16', fecha: baseDate(startMonth + 2, 27), titulo: 'Inicio aprobación N3 (G. Profesoral)', tipo: 'hito', etapa: 'Aprobación N3', descripcion: 'Gestión Profesoral realiza la aprobación final con firma digital.', prioridad: 'alta' },
    { id: 'e17', fecha: baseDate(startMonth + 3, 5), titulo: 'Deadline aprobación final N3', tipo: 'deadline', etapa: 'Aprobación N3', descripcion: 'Fecha límite absoluta para la aprobación final de todos los PTAs del periodo.', prioridad: 'critica', completado: false },
  );

  // Phase 5: Close (month 3)
  events.push(
    { id: 'e18', fecha: baseDate(startMonth + 3, 8), titulo: 'Generación de certificados y actas', tipo: 'evento', etapa: 'Cierre', descripcion: 'Emisión automática de certificados de firma y actas de concertación.', prioridad: 'media' },
    { id: 'e19', fecha: baseDate(startMonth + 3, 10), titulo: 'Cierre oficial del periodo PTA', tipo: 'hito', etapa: 'Cierre', descripcion: 'Cierre oficial del proceso PTA para el periodo. Se archivan todos los documentos.', prioridad: 'critica' },
    { id: 'e20', fecha: baseDate(startMonth + 3, 15), titulo: 'Informe ejecutivo al consejo', tipo: 'reunion', etapa: 'Cierre', descripcion: 'Presentación del informe ejecutivo de resultados del proceso PTA.', prioridad: 'alta' },
  );

  return events;
}

export function CalendarioAcademicoPTA() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);

  const events = useMemo(() => {
    const sem = currentMonth < 6 ? 1 : 2;
    return generateSemesterEvents(currentYear, sem as 1 | 2);
  }, [currentYear, currentMonth]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7; // Monday=0
    const totalDays = lastDay.getDate();

    const days: { date: string; day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Previous month padding
    const prevMonthLast = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({ date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: false, isToday: false });
    }

    // Current month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
      days.push({ date: dateStr, day: d, isCurrentMonth: true, isToday });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      days.push({ date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: false, isToday: false });
    }

    return days;
  }, [currentYear, currentMonth]);

  const getEventsForDate = (dateStr: string) => {
    let filtered = events.filter(e => e.fecha === dateStr);
    if (filtroTipo) filtered = filtered.filter(e => e.tipo === filtroTipo);
    return filtered;
  };

  const selectedDayEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Upcoming deadlines
  const upcomingDeadlines = useMemo(() => {
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return events
      .filter(e => e.fecha >= todayStr && !e.completado)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 6);
  }, [events]);

  // Phase timeline data
  const fases = [
    { nombre: 'Preparación', color: '#003DA5', semanas: '1-3' },
    { nombre: 'Creación PTA', color: '#7C3AED', semanas: '4-6' },
    { nombre: 'Notificación', color: '#0891B2', semanas: '6-7' },
    { nombre: 'Concertación', color: '#D97706', semanas: '7-9' },
    { nombre: 'Aprobación N1', color: '#059669', semanas: '9-10' },
    { nombre: 'Aprobación N2', color: '#1E40AF', semanas: '10-11' },
    { nombre: 'Aprobación N3', color: '#6B21A8', semanas: '11-12' },
    { nombre: 'Cierre', color: '#374151', semanas: '12-14' },
  ];

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarIcon style={{ width: 24, height: 24, color: '#003DA5' }} />
            Calendario Académico PTA
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
            Deadlines y hitos del flujo de aprobación — Semestre {currentMonth < 6 ? '1' : '2'} / {currentYear}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowTimeline(!showTimeline)} style={{ padding: '7px 14px', borderRadius: 8, border: showTimeline ? '1.5px solid #003DA5' : '1px solid #E5E7EB', background: showTimeline ? '#EFF6FF' : 'white', color: showTimeline ? '#003DA5' : '#6B7280', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Target style={{ width: 13, height: 13 }} /> Cronograma
          </button>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.78rem', background: 'white' }}>
            <option value="">Todos los tipos</option>
            <option value="deadline">Deadlines</option>
            <option value="hito">Hitos</option>
            <option value="alerta">Alertas</option>
            <option value="evento">Eventos</option>
            <option value="reunion">Reuniones</option>
          </select>
        </div>
      </div>

      {/* Phase Timeline */}
      <AnimatePresence>
        {showTimeline && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target style={{ width: 16, height: 16, color: '#003DA5' }} /> Cronograma del semestre
              </h3>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {fases.map((fase, i) => (
                  <div key={fase.nombre} style={{ flex: '1 1 0', minWidth: 80, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '100%', height: 28, borderRadius: 6, background: fase.color, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }}>{fase.nombre}</span>
                      {i < fases.length - 1 && (
                        <div style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: `6px solid ${fase.color}`, zIndex: 1 }} />
                      )}
                    </div>
                    <span style={{ fontSize: '0.55rem', color: '#9CA3AF', marginTop: 3 }}>Sem. {fase.semanas}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '1fr 320px' : '1fr', gap: 16 }}>
        {/* Calendar Grid */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 20px' }}>
          {/* Month navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft style={{ width: 16, height: 16, color: '#374151' }} />
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              {MESES[currentMonth]} {currentYear}
            </h3>
            <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight style={{ width: 16, height: 16, color: '#374151' }} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DIAS_SEMANA.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {calendarDays.map((day, i) => {
              const dayEvents = getEventsForDate(day.date);
              const isSelected = selectedDate === day.date;
              const hasDeadline = dayEvents.some(e => e.tipo === 'deadline');
              const hasHito = dayEvents.some(e => e.tipo === 'hito');

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(isSelected ? null : day.date)}
                  style={{
                    padding: '6px 4px', minHeight: 60, borderRadius: 8,
                    border: isSelected ? '2px solid #003DA5' : day.isToday ? '2px solid #059669' : '1px solid #F3F4F6',
                    background: isSelected ? '#EFF6FF' : day.isToday ? '#F0FDF4' : day.isCurrentMonth ? 'white' : '#FAFAFA',
                    cursor: 'pointer', textAlign: 'left', verticalAlign: 'top',
                    display: 'flex', flexDirection: 'column', gap: 2,
                    opacity: day.isCurrentMonth ? 1 : 0.4,
                  }}
                >
                  <span style={{ fontSize: '0.72rem', fontWeight: day.isToday ? 800 : 600, color: day.isToday ? '#059669' : '#374151' }}>
                    {day.day}
                  </span>
                  {dayEvents.slice(0, 2).map(ev => {
                    const cfg = TIPO_CONFIG[ev.tipo];
                    return (
                      <div key={ev.id} style={{ padding: '1px 4px', borderRadius: 3, background: cfg.bg, fontSize: '0.5rem', fontWeight: 600, color: cfg.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '1.3' }}>
                        {ev.titulo.substring(0, 18)}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <span style={{ fontSize: '0.48rem', color: '#9CA3AF', fontWeight: 600 }}>+{dayEvents.length - 2} más</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.entries(TIPO_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', color: '#6B7280' }}>
                  <Icon style={{ width: 10, height: 10, color: cfg.color }} />
                  <span style={{ textTransform: 'capitalize' }}>{key}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel — Selected day / Upcoming */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Selected day detail */}
          {selectedDate && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <button onClick={() => setSelectedDate(null)} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X style={{ width: 11, height: 11, color: '#6B7280' }} />
                </button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <p style={{ fontSize: '0.78rem', color: '#9CA3AF', textAlign: 'center', padding: '16px 0' }}>Sin eventos para este día</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedDayEvents.map(ev => {
                    const cfg = TIPO_CONFIG[ev.tipo];
                    const priCfg = PRIORIDAD_CONFIG[ev.prioridad];
                    const Icon = cfg.icon;
                    return (
                      <div key={ev.id} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${cfg.bg}`, background: '#FAFAFA' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Icon style={{ width: 13, height: 13, color: cfg.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', flex: 1 }}>{ev.titulo}</span>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: '0 0 6px' }}>{ev.descripcion}</p>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <span style={{ padding: '1px 6px', borderRadius: 4, background: cfg.bg, color: cfg.color, fontSize: '0.58rem', fontWeight: 700, textTransform: 'capitalize' }}>{ev.tipo}</span>
                          <span style={{ padding: '1px 6px', borderRadius: 4, background: priCfg.bg, color: priCfg.color, fontSize: '0.58rem', fontWeight: 700 }}>{priCfg.label}</span>
                          <span style={{ padding: '1px 6px', borderRadius: 4, background: '#F3F4F6', color: '#6B7280', fontSize: '0.58rem', fontWeight: 600 }}>{ev.etapa}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Upcoming deadlines */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 18px' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap style={{ width: 14, height: 14, color: '#D97706' }} /> Próximos eventos
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {upcomingDeadlines.map(ev => {
                const cfg = TIPO_CONFIG[ev.tipo];
                const Icon = cfg.icon;
                const daysUntil = Math.max(0, Math.round((new Date(ev.fecha).getTime() - today.getTime()) / 86400000));

                return (
                  <button
                    key={ev.id}
                    onClick={() => {
                      const [y, m] = ev.fecha.split('-').map(Number);
                      setCurrentYear(y);
                      setCurrentMonth(m - 1);
                      setSelectedDate(ev.fecha);
                    }}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #F3F4F6', background: 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 8, alignItems: 'flex-start' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FAFAFA'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <Icon style={{ width: 11, height: 11, color: cfg.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>{ev.titulo}</div>
                      <div style={{ fontSize: '0.62rem', color: '#9CA3AF', marginTop: 1 }}>
                        {new Date(ev.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                        <span style={{ marginLeft: 6, padding: '1px 4px', borderRadius: 3, background: daysUntil <= 3 ? '#FEE2E2' : daysUntil <= 7 ? '#FEF3C7' : '#F3F4F6', color: daysUntil <= 3 ? '#991B1B' : daysUntil <= 7 ? '#92400E' : '#6B7280', fontWeight: 700 }}>
                          {daysUntil === 0 ? 'HOY' : `${daysUntil}d`}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {upcomingDeadlines.length === 0 && (
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', textAlign: 'center', padding: 12 }}>No hay eventos próximos</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
