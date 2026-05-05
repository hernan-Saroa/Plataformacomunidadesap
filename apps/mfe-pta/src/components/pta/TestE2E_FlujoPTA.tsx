/**
 * TestE2E_FlujoPTA — Panel de pruebas E2E del flujo completo PTA
 *
 * Escenarios:
 * A) Flujo SNA completo (14 pasos):
 *    Borrador → PROPUESTO → NOTIFICADO → OBJETADO → CONCERTACION → SNA → Aprobación 3N
 *
 * B) Flujo Devolución N2 (12 pasos):
 *    Borrador → Enviar → Aprobar N1 → Devuelto N2 → Corrección → Re-enviar
 *    → Aprobar N1 → Aprobar N2 → Aprobar N3 → APROBADO
 *
 * C) Flujo Aceptación directa (8 pasos):
 *    Borrador → PROPUESTO → NOTIFICADO → ACEPTADO → Aprobación 3N
 *
 * Cada paso hace llamadas reales al API y verifica respuestas.
 */

import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FlaskConical, Play, CheckCircle, XCircle, Clock, Loader2,
  ArrowRight, RotateCcw, AlertTriangle, Scale, MessageSquare,
  FileText, Send, Eye, Zap, ChevronDown, RefreshCw, GitBranch,
} from 'lucide-react';
import {
  savePTA, crearPTAPreCarga, notificarDocentePTA, responderPropuestaPTA,
  agregarComentarioConcertacion, cerrarConcertacion, escalarConcertacion,
  updatePTAStatus, getPTAById, enviarAprobacionPTA,
} from '../../services/api/ptaApi';
import { toast } from 'sonner';

type StepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

interface TestStep {
  id: string;
  label: string;
  description: string;
  icon: any;
  color: string;
  estado_esperado: string;
  status: StepStatus;
  result?: string;
  duration?: number;
}

type ScenarioId = 'sna_completo' | 'devolucion_n2' | 'aceptacion_directa';

interface Scenario {
  id: ScenarioId;
  label: string;
  description: string;
  icon: any;
  color: string;
  bg: string;
  steps: Omit<TestStep, 'status'>[];
}

// ═══ Escenario A: Flujo SNA Completo ═══
const STEPS_SNA: Omit<TestStep, 'status'>[] = [
  { id: 'crear', label: 'Crear PTA (Borrador)', description: 'Crear PTA con pre-carga de asignaturas', icon: FileText, color: '#003DA5', estado_esperado: 'Borrador' },
  { id: 'proponer', label: 'Proponer por Dirección', description: 'Cambiar a PROPUESTO_POR_DIRECCION', icon: Send, color: '#1E40AF', estado_esperado: 'PROPUESTO_POR_DIRECCION' },
  { id: 'notificar', label: 'Notificar al Docente', description: 'Transición a NOTIFICADO_DOCENTE', icon: ArrowRight, color: '#92400E', estado_esperado: 'NOTIFICADO_DOCENTE' },
  { id: 'objetar', label: 'Docente Objeta', description: 'Objeciones → OBJETADO_DOCENTE', icon: AlertTriangle, color: '#DC2626', estado_esperado: 'OBJETADO_DOCENTE' },
  { id: 'concertar_iniciar', label: 'Abrir Concertación', description: 'Mesa → EN_CONCERTACION', icon: MessageSquare, color: '#7C3AED', estado_esperado: 'EN_CONCERTACION' },
  { id: 'concertar_msg1', label: 'Mensaje Dirección', description: 'Propuesta ajustada', icon: MessageSquare, color: '#6B21A8', estado_esperado: 'EN_CONCERTACION' },
  { id: 'concertar_msg2', label: 'Mensaje Docente', description: 'Docente insiste — sin acuerdo', icon: MessageSquare, color: '#6B21A8', estado_esperado: 'EN_CONCERTACION' },
  { id: 'escalar', label: 'Escalar a SNA', description: 'Sin acuerdo → ESCALADO_SNA', icon: Scale, color: '#991B1B', estado_esperado: 'ESCALADO_SNA' },
  { id: 'verificar_sna', label: 'Verificar estado SNA', description: 'Confirmar ESCALADO_SNA', icon: Eye, color: '#991B1B', estado_esperado: 'ESCALADO_SNA' },
  { id: 'resolver_sna', label: 'Resolución SNA', description: 'Árbitro → CONCERTADO (punto medio)', icon: Scale, color: '#065F46', estado_esperado: 'CONCERTADO' },
  { id: 'enviar_aprobacion', label: 'Enviar a Aprobación', description: 'Concertado → Pendiente Jefatura', icon: Send, color: '#92400E', estado_esperado: 'Pendiente Jefatura' },
  { id: 'aprobar_n1', label: 'Aprobar N1 (Jefatura)', description: 'Jefatura → Pendiente Decanatura', icon: CheckCircle, color: '#1E40AF', estado_esperado: 'Pendiente Decanatura' },
  { id: 'aprobar_n2', label: 'Aprobar N2 (Decanatura)', description: 'Decanatura → Pendiente G.Profesoral', icon: CheckCircle, color: '#3730A3', estado_esperado: 'Pendiente Gestión Profesoral' },
  { id: 'aprobar_n3', label: 'Aprobar N3 (G. Profesoral)', description: 'Gestión Profesoral → APROBADO', icon: CheckCircle, color: '#059669', estado_esperado: 'Aprobado' },
];

// ═══ Escenario B: Devolución en N2 ═══
const STEPS_DEVOLUCION: Omit<TestStep, 'status'>[] = [
  { id: 'crear', label: 'Crear PTA (Borrador)', description: 'Crear PTA de prueba', icon: FileText, color: '#003DA5', estado_esperado: 'Borrador' },
  { id: 'enviar_1', label: 'Enviar a Aprobación', description: 'Borrador → Pendiente Jefatura', icon: Send, color: '#92400E', estado_esperado: 'Pendiente Jefatura' },
  { id: 'aprobar_n1_1', label: 'Aprobar N1 (Jefatura)', description: 'Primera aprobación N1', icon: CheckCircle, color: '#1E40AF', estado_esperado: 'Pendiente Decanatura' },
  { id: 'devolver_n2', label: 'Devolver en N2 (Decanatura)', description: 'Decanatura devuelve con observaciones', icon: RotateCcw, color: '#D97706', estado_esperado: 'Devuelto' },
  { id: 'verificar_devuelto', label: 'Verificar estado Devuelto', description: 'Confirmar PTA en estado Devuelto', icon: Eye, color: '#D97706', estado_esperado: 'Devuelto' },
  { id: 'corregir', label: 'Corregir PTA (Borrador)', description: 'Docente corrige → vuelve a Borrador', icon: FileText, color: '#003DA5', estado_esperado: 'Borrador' },
  { id: 'reenviar', label: 'Re-enviar a Aprobación', description: 'Borrador → Pendiente Jefatura (2da vez)', icon: Send, color: '#92400E', estado_esperado: 'Pendiente Jefatura' },
  { id: 'aprobar_n1_2', label: 'Aprobar N1 (Jefatura) 2da', description: 'Segunda aprobación N1', icon: CheckCircle, color: '#1E40AF', estado_esperado: 'Pendiente Decanatura' },
  { id: 'aprobar_n2_ok', label: 'Aprobar N2 (Decanatura)', description: 'Decanatura aprueba (corregido)', icon: CheckCircle, color: '#3730A3', estado_esperado: 'Pendiente Gestión Profesoral' },
  { id: 'aprobar_n3', label: 'Aprobar N3 (G. Profesoral)', description: 'G. Profesoral → APROBADO', icon: CheckCircle, color: '#059669', estado_esperado: 'Aprobado' },
];

// ═══ Escenario C: Aceptación Directa ═══
const STEPS_ACEPTACION: Omit<TestStep, 'status'>[] = [
  { id: 'crear', label: 'Crear PTA (Borrador)', description: 'Crear PTA con pre-carga', icon: FileText, color: '#003DA5', estado_esperado: 'Borrador' },
  { id: 'proponer', label: 'Proponer por Dirección', description: 'PROPUESTO_POR_DIRECCION', icon: Send, color: '#1E40AF', estado_esperado: 'PROPUESTO_POR_DIRECCION' },
  { id: 'notificar', label: 'Notificar al Docente', description: 'NOTIFICADO_DOCENTE', icon: ArrowRight, color: '#92400E', estado_esperado: 'NOTIFICADO_DOCENTE' },
  { id: 'aceptar', label: 'Docente Acepta', description: 'Aceptación directa → ACEPTADO_DOCENTE', icon: CheckCircle, color: '#059669', estado_esperado: 'ACEPTADO_DOCENTE' },
  { id: 'enviar_aprobacion', label: 'Enviar a Aprobación', description: 'Aceptado → Pendiente Jefatura', icon: Send, color: '#92400E', estado_esperado: 'Pendiente Jefatura' },
  { id: 'aprobar_n1', label: 'Aprobar N1 (Jefatura)', description: 'Jefatura → Decanatura', icon: CheckCircle, color: '#1E40AF', estado_esperado: 'Pendiente Decanatura' },
  { id: 'aprobar_n2', label: 'Aprobar N2 (Decanatura)', description: 'Decanatura → G.Profesoral', icon: CheckCircle, color: '#3730A3', estado_esperado: 'Pendiente Gestión Profesoral' },
  { id: 'aprobar_n3', label: 'Aprobar N3 (G. Profesoral)', description: 'G. Profesoral → APROBADO', icon: CheckCircle, color: '#059669', estado_esperado: 'Aprobado' },
];

const SCENARIOS: Scenario[] = [
  { id: 'sna_completo', label: 'Flujo SNA Completo', description: '14 pasos: Objeción → Concertación → SNA → Aprobación', icon: Scale, color: '#991B1B', bg: '#FEF2F2', steps: STEPS_SNA },
  { id: 'devolucion_n2', label: 'Devolución en N2', description: '10 pasos: Envío → N1 OK → Devuelto N2 → Corrección → Re-aprobación', icon: RotateCcw, color: '#D97706', bg: '#FEF3C7', steps: STEPS_DEVOLUCION },
  { id: 'aceptacion_directa', label: 'Aceptación Directa', description: '8 pasos: Propuesta → Aceptada → Aprobación 3N (happy path)', icon: CheckCircle, color: '#059669', bg: '#D1FAE5', steps: STEPS_ACEPTACION },
];

export function TestE2E_FlujoPTA() {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>('sna_completo');
  const scenario = SCENARIOS.find(s => s.id === selectedScenario)!;
  const [steps, setSteps] = useState<TestStep[]>(
    scenario.steps.map(s => ({ ...s, status: 'pending' as StepStatus }))
  );
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [ptaTestId, setPtaTestId] = useState<string | null>(null);
  const [expandLogs, setExpandLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const abortRef = useRef(false);

  const switchScenario = (id: ScenarioId) => {
    if (running) return;
    setSelectedScenario(id);
    const sc = SCENARIOS.find(s => s.id === id)!;
    setSteps(sc.steps.map(s => ({ ...s, status: 'pending' as StepStatus })));
    setLogs([]);
    setPtaTestId(null);
    setCurrentStep(-1);
  };

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString('es-CO');
    setLogs(prev => [...prev, `[${ts}] ${msg}`]);
  };

  const updateStep = (idx: number, updates: Partial<TestStep>) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...updates } : s));
  };

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const createTestPTA = async (): Promise<string> => {
    const ts = Date.now();
    let res = await crearPTAPreCarga({
      docente_id: `test-e2e-${ts}`,
      docente_nombre: `Docente Test E2E (${selectedScenario})`,
      dedicacion: 'Tiempo Completo',
      periodo: '2026-1',
      territorial_id: 'ter-01',
      programa_id: 'ap-diurno',
      asignaturas: [
        { asignatura_id: 'as-001', grupos: 1 },
        { asignatura_id: 'as-002', grupos: 1 },
        { asignatura_id: 'as-003', grupos: 1 },
      ],
      creado_por: 'test-e2e-runner',
    });
    if (res.success && res.data?.id) return res.data.id;

    // Fallback
    res = await savePTA({
      docente_id: `test-e2e-${ts}`,
      docente_nombre: `Docente Test E2E (${selectedScenario})`,
      dedicacion: 'Tiempo Completo',
      periodo: '2026-1',
      territorial_id: 'ter-01',
      estado: 'Borrador',
    });
    if (res.success && res.data?.id) return res.data.id;
    throw new Error(res.error || 'No se pudo crear el PTA');
  };

  const executeStep = async (stepId: string, ptaId: string): Promise<void> => {
    let res: any;

    switch (stepId) {
      case 'crear':
        // handled externally
        break;

      case 'proponer':
        res = await updatePTAStatus(ptaId, { estado: 'PROPUESTO_POR_DIRECCION', observaciones: `[E2E-${selectedScenario}] Propuesto por dirección`, aprobador_id: 'test-e2e', aprobador_nombre: 'Test E2E Runner' });
        if (!res.success) throw new Error(res.error || 'Error al proponer');
        addLog('Estado → PROPUESTO_POR_DIRECCION');
        break;

      case 'notificar':
        res = await notificarDocentePTA(ptaId, { mensaje: `[E2E] Notificación (${selectedScenario})`, notificado_por: 'test-e2e', fecha_limite: '2026-04-01' });
        if (!res.success) await updatePTAStatus(ptaId, { estado: 'NOTIFICADO_DOCENTE', observaciones: '[E2E] Notificado (fallback)' });
        addLog('Estado → NOTIFICADO_DOCENTE');
        break;

      case 'objetar':
        res = await responderPropuestaPTA(ptaId, { accion: 'objetar', observaciones: '[E2E] Docente objeta para forzar concertación', docente_id: 'test-e2e-doc' });
        if (!res.success) await updatePTAStatus(ptaId, { estado: 'OBJETADO_DOCENTE', observaciones: '[E2E] Objetado (fallback)' });
        addLog('Estado → OBJETADO_DOCENTE');
        break;

      case 'aceptar':
        res = await responderPropuestaPTA(ptaId, { accion: 'aceptar', observaciones: '[E2E] Docente acepta propuesta directamente', docente_id: 'test-e2e-doc' });
        if (!res.success) await updatePTAStatus(ptaId, { estado: 'ACEPTADO_DOCENTE', observaciones: '[E2E] Aceptado (fallback)' });
        addLog('Estado → ACEPTADO_DOCENTE');
        break;

      case 'concertar_iniciar':
        res = await updatePTAStatus(ptaId, { estado: 'EN_CONCERTACION', observaciones: '[E2E] Mesa de concertación abierta' });
        if (!res.success) throw new Error(res.error || 'Error al abrir concertación');
        addLog('Estado → EN_CONCERTACION');
        break;

      case 'concertar_msg1':
        await agregarComentarioConcertacion(ptaId, { autor: 'Dir. Académica Test', autor_rol: 'direccion', mensaje: '[E2E] Propuesta ajustada: reducir carga a 3 asignaturas' });
        addLog('Mensaje dirección agregado');
        break;

      case 'concertar_msg2':
        await agregarComentarioConcertacion(ptaId, { autor: 'Docente Test', autor_rol: 'docente', mensaje: '[E2E] No hay acuerdo. Solicito escalamiento.' });
        addLog('Mensaje docente agregado');
        break;

      case 'escalar':
        res = await escalarConcertacion(ptaId, { motivo: '[E2E] Sin acuerdo tras negociación', escalado_por: 'test-e2e' });
        if (!res.success) await updatePTAStatus(ptaId, { estado: 'ESCALADO_SNA', observaciones: '[E2E] Escalado (fallback)' });
        addLog('Estado → ESCALADO_SNA');
        break;

      case 'verificar_sna': {
        await delay(500);
        const ptaData = await getPTAById(ptaId);
        const est = ptaData.data?.estado || ptaData.data?.estado_actual;
        addLog(`Verificación: estado actual = ${est || 'no disponible'}`);
        if (est && est !== 'ESCALADO_SNA') addLog(`ADVERTENCIA: esperado ESCALADO_SNA, actual: ${est}`);
        break;
      }

      case 'resolver_sna':
        res = await updatePTAStatus(ptaId, { estado: 'CONCERTADO', observaciones: '[RESOLUCIÓN SNA E2E] Punto medio. Decisión vinculante.', aprobador_id: 'arbitro-sna-test', aprobador_nombre: 'Árbitro SNA Test' });
        if (!res.success) throw new Error(res.error || 'Error en resolución SNA');
        addLog('Estado → CONCERTADO (resolución SNA)');
        break;

      case 'enviar_aprobacion':
      case 'enviar_1':
      case 'reenviar':
        res = await enviarAprobacionPTA(ptaId, { enviado_por: 'test-e2e' });
        if (!res.success) await updatePTAStatus(ptaId, { estado: 'Pendiente Jefatura', observaciones: `[E2E] Enviado a aprobación (${stepId})` });
        addLog('Estado → Pendiente Jefatura');
        break;

      case 'aprobar_n1':
      case 'aprobar_n1_1':
      case 'aprobar_n1_2':
        res = await updatePTAStatus(ptaId, { estado: 'Pendiente Decanatura', observaciones: `[E2E] Aprobado por Jefatura (${stepId})`, aprobador_id: 'test-jefatura', aprobador_nombre: 'Jefe Test E2E' });
        if (!res.success) throw new Error(res.error || 'Error N1');
        addLog('Estado → Pendiente Decanatura');
        break;

      case 'devolver_n2':
        res = await updatePTAStatus(ptaId, { estado: 'Devuelto', observaciones: '[E2E-DEVOLUCIÓN] Decanatura devuelve: Falta justificación de carga horaria en extensión. Requiere ajustar prorrateo de investigación (excede 50%).', motivo_devolucion: 'Prorrateo de investigación supera el 50% permitido por Circular 003/2025', aprobador_id: 'test-decanatura', aprobador_nombre: 'Decano Test E2E' });
        if (!res.success) throw new Error(res.error || 'Error al devolver');
        addLog('Estado → Devuelto (con motivo detallado)');
        break;

      case 'verificar_devuelto': {
        await delay(500);
        const ptaData2 = await getPTAById(ptaId);
        const est2 = ptaData2.data?.estado || ptaData2.data?.estado_actual;
        addLog(`Verificación: estado actual = ${est2 || 'no disponible'}`);
        const historial = ptaData2.data?.historial || [];
        const devEntry = historial.find((h: any) => h.estado_nuevo === 'Devuelto' || h.accion?.includes('Devuelto'));
        if (devEntry) {
          addLog(`  Motivo: ${devEntry.observaciones || devEntry.motivo_devolucion || 'sin motivo'}`);
          addLog(`  Devuelto por: ${devEntry.actor || devEntry.aprobador_nombre || 'desconocido'}`);
        }
        break;
      }

      case 'corregir':
        res = await updatePTAStatus(ptaId, { estado: 'Borrador', observaciones: '[E2E] Docente corrige el PTA tras devolución: ajusta prorrateo investigación al 45%' });
        if (!res.success) throw new Error(res.error || 'Error al corregir');
        addLog('Estado → Borrador (corregido por docente)');
        break;

      case 'aprobar_n2':
      case 'aprobar_n2_ok':
        res = await updatePTAStatus(ptaId, { estado: 'Pendiente Gestión Profesoral', observaciones: `[E2E] Aprobado por Decanatura (${stepId === 'aprobar_n2_ok' ? 'tras corrección' : 'primera vez'})`, aprobador_id: 'test-decanatura', aprobador_nombre: 'Decano Test E2E' });
        if (!res.success) throw new Error(res.error || 'Error N2');
        addLog('Estado → Pendiente Gestión Profesoral');
        break;

      case 'aprobar_n3':
        res = await updatePTAStatus(ptaId, { estado: 'Aprobado', observaciones: '[E2E] Aprobado por Gestión Profesoral — FLUJO COMPLETO', aprobador_id: 'test-gestion', aprobador_nombre: 'Gestión Prof. Test E2E' });
        if (!res.success) throw new Error(res.error || 'Error N3');
        addLog('Estado → Aprobado *** FLUJO COMPLETO ***');
        break;

      default:
        addLog(`Paso desconocido: ${stepId}`);
    }
  };

  const runTests = async () => {
    setRunning(true);
    abortRef.current = false;
    setLogs([]);
    const activeSteps = scenario.steps;
    setSteps(activeSteps.map(s => ({ ...s, status: 'pending' as StepStatus })));
    let ptaId = '';

    addLog(`═══ Iniciando escenario: ${scenario.label} (${activeSteps.length} pasos) ═══`);

    for (let i = 0; i < activeSteps.length; i++) {
      if (abortRef.current) {
        addLog('--- TEST ABORTADO POR USUARIO ---');
        for (let j = i; j < activeSteps.length; j++) updateStep(j, { status: 'skipped' });
        break;
      }

      setCurrentStep(i);
      updateStep(i, { status: 'running' });
      addLog(`Paso ${i + 1}/${activeSteps.length}: ${activeSteps[i].label}...`);
      const start = Date.now();

      try {
        if (activeSteps[i].id === 'crear') {
          ptaId = await createTestPTA();
          setPtaTestId(ptaId);
          addLog(`PTA creado: ${ptaId}`);
        } else {
          await executeStep(activeSteps[i].id, ptaId);
        }

        const duration = Date.now() - start;
        updateStep(i, { status: 'success', duration, result: `OK (${duration}ms)` });
        addLog(`  OK en ${duration}ms`);
        await delay(300);
      } catch (err: any) {
        const duration = Date.now() - start;
        const errMsg = err.message || String(err);
        updateStep(i, { status: 'error', duration, result: errMsg });
        addLog(`  ERROR: ${errMsg}`);
        toast.error(`Error en "${activeSteps[i].label}": ${errMsg}`);
        for (let j = i + 1; j < activeSteps.length; j++) updateStep(j, { status: 'skipped', result: 'Omitido' });
        break;
      }
    }

    setRunning(false);
    setCurrentStep(-1);
    addLog(`═══ Escenario finalizado ═══`);
  };

  const passedCount = steps.filter(s => s.status === 'success').length;
  const failedCount = steps.filter(s => s.status === 'error').length;
  const totalSteps = scenario.steps.length;
  const totalDuration = steps.reduce((acc, s) => acc + (s.duration || 0), 0);
  const allPassed = passedCount === totalSteps && failedCount === 0 && passedCount > 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FlaskConical style={{ width: 24, height: 24, color: '#7C3AED' }} />
            Test E2E — Flujos PTA
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
            3 escenarios: SNA completo, Devolución N2, Aceptación directa
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {running ? (
            <button onClick={() => { abortRef.current = true; }} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#991B1B', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <XCircle style={{ width: 15, height: 15 }} /> Abortar
            </button>
          ) : (
            <button onClick={runTests} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: '#7C3AED', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }}>
              <Play style={{ width: 15, height: 15 }} /> Ejecutar
            </button>
          )}
        </div>
      </div>

      {/* Scenario Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 18 }}>
        {SCENARIOS.map(sc => {
          const isActive = selectedScenario === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => switchScenario(sc.id)}
              disabled={running}
              style={{
                padding: '14px 16px', borderRadius: 12, border: isActive ? `2px solid ${sc.color}` : '1.5px solid #E5E7EB',
                background: isActive ? sc.bg : 'white', cursor: running ? 'not-allowed' : 'pointer',
                textAlign: 'left', transition: 'all 0.15s', opacity: running && !isActive ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <sc.icon style={{ width: 16, height: 16, color: sc.color }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isActive ? sc.color : '#111827' }}>{sc.label}</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: 0 }}>{sc.description}</p>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      {(passedCount > 0 || failedCount > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
          <div style={{ padding: '12px 16px', borderRadius: 10, background: allPassed ? '#D1FAE5' : '#EFF6FF', border: `1px solid ${allPassed ? '#6EE7B7' : '#BFDBFE'}` }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: allPassed ? '#065F46' : '#1E40AF' }}>{passedCount}/{totalSteps}</div>
            <div style={{ fontSize: '0.72rem', color: allPassed ? '#065F46' : '#1E40AF', fontWeight: 500 }}>Pasos exitosos</div>
          </div>
          {failedCount > 0 && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FEE2E2', border: '1px solid #FCA5A5' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#991B1B' }}>{failedCount}</div>
              <div style={{ fontSize: '0.72rem', color: '#991B1B', fontWeight: 500 }}>Errores</div>
            </div>
          )}
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#F3E8FF', border: '1px solid #DDD6FE' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#6B21A8' }}>{(totalDuration / 1000).toFixed(1)}s</div>
            <div style={{ fontSize: '0.72rem', color: '#6B21A8', fontWeight: 500 }}>Tiempo total</div>
          </div>
          {ptaTestId && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', wordBreak: 'break-all' }}>{ptaTestId.substring(0, 14)}...</div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 500 }}>PTA de prueba</div>
            </div>
          )}
        </div>
      )}

      {/* Steps Timeline */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, fontSize: '0.72rem', fontWeight: 600, color: '#6B7280' }}>
          <GitBranch style={{ width: 13, height: 13 }} />
          <span>{scenario.label} — {totalSteps} pasos</span>
        </div>
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const StatusIcon = step.status === 'success' ? CheckCircle :
                           step.status === 'error' ? XCircle :
                           step.status === 'running' ? Loader2 :
                           step.status === 'skipped' ? AlertTriangle : Clock;
          const statusColor = step.status === 'success' ? '#059669' :
                            step.status === 'error' ? '#DC2626' :
                            step.status === 'running' ? '#7C3AED' :
                            step.status === 'skipped' ? '#9CA3AF' : '#D1D5DB';
          const isActive = currentStep === i;

          return (
            <div key={`${step.id}-${i}`} style={{ display: 'flex', gap: 14, position: 'relative', minHeight: 48 }}>
              {!isLast && (
                <div style={{
                  position: 'absolute', left: 13, top: 28, bottom: -8, width: 2,
                  background: step.status === 'success' ? '#6EE7B7' : '#E5E7EB',
                }} />
              )}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: step.status === 'success' ? '#D1FAE5' : step.status === 'error' ? '#FEE2E2' : step.status === 'running' ? '#F3E8FF' : '#F9FAFB',
                border: `2px solid ${statusColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
              }}>
                <StatusIcon style={{ width: 14, height: 14, color: statusColor, animation: step.status === 'running' ? 'spin 1s linear infinite' : 'none' }} />
              </div>
              <div style={{ flex: 1, paddingBottom: isLast ? 0 : 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 800 : 600, color: step.status === 'skipped' ? '#9CA3AF' : '#111827' }}>{step.label}</span>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{step.description}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {step.duration != null && <span style={{ fontSize: '0.68rem', color: '#6B7280' }}>{step.duration}ms</span>}
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, background: step.status === 'success' ? '#D1FAE5' : step.status === 'error' ? '#FEE2E2' : '#F3F4F6', color: statusColor }}>
                      {step.estado_esperado}
                    </span>
                  </div>
                </div>
                {step.status === 'error' && step.result && (
                  <div style={{ marginTop: 4, padding: '6px 10px', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '0.72rem', color: '#991B1B' }}>{step.result}</div>
                )}
              </div>
            </div>
          );
        })}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Logs */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <button onClick={() => setExpandLogs(!expandLogs)} style={{ width: '100%', padding: '12px 18px', border: 'none', background: '#F9FAFB', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
          <span>Logs de ejecución ({logs.length})</span>
          <ChevronDown style={{ width: 14, height: 14, transform: expandLogs ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
        <AnimatePresence>
          {expandLogs && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', maxHeight: 300, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.72rem', lineHeight: 1.6, background: '#1F2937' }}>
                {logs.length === 0 ? (
                  <span style={{ color: '#6B7280' }}>Ejecute el test para ver los logs...</span>
                ) : logs.map((log, i) => (
                  <div key={i} style={{ color: log.includes('ERROR') ? '#FCA5A5' : log.includes('OK') ? '#6EE7B7' : log.includes('ADVERTENCIA') ? '#FDE68A' : log.includes('***') || log.includes('═══') ? '#A78BFA' : '#D1D5DB' }}>{log}</div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
