import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Upload,
  Eye,
  Download,
  Calendar,
  Target,
  Users,
  FileText,
  X,
  Check,
  AlertCircle,
  Send,
  MessageSquare,
  Activity,
  BarChart3
} from 'lucide-react';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/Button';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { InputSIGL } from '../gestion-legal/design-system/Input';
import { TextareaSIGL } from '../gestion-legal/design-system/TextareaSIGL';
import { toast } from 'sonner';

// ====================================
// TIPOS Y DATOS
// ====================================

interface AccionCorrectiva {
  id: string;
  hallazgoTitulo: string;
  descripcion: string;
  responsable: string;
  cantidadProgramada: number;
  fechaInicio: string;
  fechaFin: string;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA';
}

interface EvidenciaValidada {
  id: string;
  accionId: string;
  archivoNombre: string;
  archivoUrl: string;
  fechaCarga: string;
  cargadoPor: string;
  calificacion: 'PENDIENTE_REVISION' | 'ACEPTADA' | 'CON_OBSERVACIONES';
  comentariosAuditor?: string;
  fechaValidacion?: string;
  auditorValido?: string;
  solicitudNuevaEvidencia?: boolean;
}

interface AccionSeguimiento {
  id: string;
  accionId: string;
  cantidadImplementada: number;
  cumplimiento: 0 | 1 | 2; // Fórmula EMFO002
  evidencias: EvidenciaValidada[];
  observaciones: string;
}

interface SeguimientoPlan {
  id: string;
  planMejoramientoId: string;
  numeroSeguimiento: 1 | 2 | 3 | 4; // Jul, Oct, Ene, Abr
  tipoSeguimiento: 'TRIMESTRAL' | 'ANUAL';
  fechaSeguimiento: string;
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'VALIDACION_AUDITOR' | 'COMPLETADO';
  acciones: AccionSeguimiento[];
  porcentajeCumplimientoGlobal: number; // 0-100%
  semaforoColor: 'VERDE' | 'AMARILLO' | 'ROJO';
}

interface PlanMejoramiento {
  id: string;
  auditoriaCodigo: string;
  auditoriaNombre: string;
  areaResponsable: string;
  responsableArea: string;
  estado: 'BORRADOR' | 'REVISION' | 'APROBADO' | 'EN_EJECUCION' | 'COMPLETADO' | 'VENCIDO' | 'RECHAZADO';
  etapaAuditoria?: 'BACKLOG' | 'PLANEACION' | 'EJECUCION' | 'COMUNICACION' | 'SEGUIMIENTO' | 'FINALIZADA';
  acciones: AccionCorrectiva[];
  seguimientos: SeguimientoPlan[];
}

// Estados del plan que permiten acceso a seguimientos
const ESTADOS_PLAN_PERMITEN_SEGUIMIENTO = ['APROBADO', 'EN_EJECUCION', 'COMPLETADO'];

// Etapas de auditoría que permiten acceso a seguimientos
const ETAPAS_AUDITORIA_PERMITEN_SEGUIMIENTO = ['COMUNICACION', 'SEGUIMIENTO', 'FINALIZADA'];

type VistaActual = 'PORTAL_AREA' | 'AUDITOR' | 'JEFE_OCI';

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export const SeguimientoPlanMejoramientoModule: React.FC<{ planId?: string; rol?: VistaActual }> = ({ 
  planId = 'pm-001', 
  rol: rolInicial = 'JEFE_OCI' 
}) => {
  const [rol, setRol] = useState<VistaActual>(rolInicial);

  // Datos del plan (mock - después conectar con backend)
  const [plan, setPlan] = useState<PlanMejoramiento>({
    id: planId,
    auditoriaCodigo: 'AUD-2025-005',
    auditoriaNombre: 'Auditoría Gestión Financiera',
    areaResponsable: 'Dirección Administrativa y Financiera',
    responsableArea: 'María González',
    estado: 'APROBADO', // Estado correcto para permitir seguimientos
    etapaAuditoria: 'COMUNICACION', // Etapa que permite seguimientos
    acciones: [
      {
        id: 'acc1',
        hallazgoTitulo: 'Falta de conciliaciones bancarias mensuales',
        descripcion: 'Implementar software de conciliación bancaria y capacitar personal',
        responsable: 'Carlos Méndez',
        cantidadProgramada: 12, // 12 conciliaciones mensuales
        fechaInicio: '2025-02-01',
        fechaFin: '2026-01-31',
        estado: 'EN_PROCESO'
      },
      {
        id: 'acc2',
        hallazgoTitulo: 'Documentación de gastos incompleta',
        descripcion: 'Crear checklist de documentos obligatorios y socializar normativa',
        responsable: 'Ana Rodríguez',
        cantidadProgramada: 4, // 4 socializaciones trimestrales
        fechaInicio: '2025-02-01',
        fechaFin: '2025-12-31',
        estado: 'EN_PROCESO'
      },
      {
        id: 'acc3',
        hallazgoTitulo: 'Retraso en reportes presupuestales',
        descripcion: 'Redistribuir carga de trabajo e implementar calendario de entregas',
        responsable: 'Luis Vargas',
        cantidadProgramada: 12, // 12 reportes mensuales
        fechaInicio: '2025-02-01',
        fechaFin: '2026-01-31',
        estado: 'EN_PROCESO'
      }
    ],
    seguimientos: [
      {
        id: 'seg1',
        planMejoramientoId: planId,
        numeroSeguimiento: 1,
        tipoSeguimiento: 'TRIMESTRAL',
        fechaSeguimiento: '2025-07-15',
        estado: 'COMPLETADO',
        acciones: [
          {
            id: 'accseg1-1',
            accionId: 'acc1',
            cantidadImplementada: 5,
            cumplimiento: 1, // Parcial
            evidencias: [
              {
                id: 'ev1',
                accionId: 'acc1',
                archivoNombre: 'Conciliaciones_Feb_Jun.pdf',
                archivoUrl: '/mock/evidencias/conciliaciones.pdf',
                fechaCarga: '2025-07-10',
                cargadoPor: 'Carlos Méndez',
                calificacion: 'ACEPTADA',
                comentariosAuditor: 'Evidencias suficientes para el período',
                fechaValidacion: '2025-07-12',
                auditorValido: 'Fernando Ávila'
              }
            ],
            observaciones: 'Se han realizado 5 de 6 conciliaciones programadas para el trimestre'
          },
          {
            id: 'accseg1-2',
            accionId: 'acc2',
            cantidadImplementada: 1,
            cumplimiento: 1,
            evidencias: [
              {
                id: 'ev2',
                accionId: 'acc2',
                archivoNombre: 'Socialización_Checklist.pdf',
                archivoUrl: '/mock/evidencias/socializacion.pdf',
                fechaCarga: '2025-07-08',
                cargadoPor: 'Ana Rodríguez',
                calificacion: 'ACEPTADA',
                fechaValidacion: '2025-07-11',
                auditorValido: 'Fernando Ávila'
              }
            ],
            observaciones: 'Primera socialización realizada exitosamente'
          },
          {
            id: 'accseg1-3',
            accionId: 'acc3',
            cantidadImplementada: 6,
            cumplimiento: 2, // Completo
            evidencias: [
              {
                id: 'ev3',
                accionId: 'acc3',
                archivoNombre: 'Reportes_Feb_Jun.xlsx',
                archivoUrl: '/mock/evidencias/reportes.xlsx',
                fechaCarga: '2025-07-09',
                cargadoPor: 'Luis Vargas',
                calificacion: 'ACEPTADA',
                fechaValidacion: '2025-07-13',
                auditorValido: 'Fernando Ávila'
              }
            ],
            observaciones: 'Todos los reportes entregados a tiempo'
          }
        ],
        porcentajeCumplimientoGlobal: 75,
        semaforoColor: 'AMARILLO'
      },
      {
        id: 'seg2',
        planMejoramientoId: planId,
        numeroSeguimiento: 2,
        tipoSeguimiento: 'TRIMESTRAL',
        fechaSeguimiento: '2025-10-15',
        estado: 'EN_PROGRESO',
        acciones: [
          {
            id: 'accseg2-1',
            accionId: 'acc1',
            cantidadImplementada: 0,
            cumplimiento: 0,
            evidencias: [],
            observaciones: ''
          },
          {
            id: 'accseg2-2',
            accionId: 'acc2',
            cantidadImplementada: 0,
            cumplimiento: 0,
            evidencias: [],
            observaciones: ''
          },
          {
            id: 'accseg2-3',
            accionId: 'acc3',
            cantidadImplementada: 0,
            cumplimiento: 0,
            evidencias: [],
            observaciones: ''
          }
        ],
        porcentajeCumplimientoGlobal: 0,
        semaforoColor: 'ROJO'
      }
    ]
  });

  const [seguimientoActual, setSeguimientoActual] = useState<SeguimientoPlan>(plan.seguimientos[1]); // Seguimiento actual (Oct)

  // ====================================
  // VALIDACIONES DE ACCESO AL MÓDULO
  // ====================================

  // Validar si el plan permite acceso a seguimientos
  const planPermiteAcceso = ESTADOS_PLAN_PERMITEN_SEGUIMIENTO.includes(plan.estado);
  
  // Validar si la etapa de la auditoría permite seguimientos
  const etapaPermiteAcceso = plan.etapaAuditoria 
    ? ETAPAS_AUDITORIA_PERMITEN_SEGUIMIENTO.includes(plan.etapaAuditoria)
    : true; // Si no hay etapa definida, permitir (caso de planes sin auditoría)

  // Acceso completo solo si ambas condiciones se cumplen
  const accesoPermitido = planPermiteAcceso && etapaPermiteAcceso;

  // Mensajes de error específicos
  const getMensajeBloqueo = () => {
    if (!planPermiteAcceso) {
      return {
        titulo: 'Plan de Mejoramiento no aprobado',
        mensaje: `El Plan de Mejoramiento está en estado "${plan.estado}". Solo se puede acceder a Seguimientos cuando el plan está APROBADO o EN EJECUCIÓN.`,
        flujo: 'Flujo correcto: Comunicación → Formulación del Plan → Revisión → APROBACIÓN → Seguimiento'
      };
    }
    if (!etapaPermiteAcceso) {
      return {
        titulo: 'Etapa de auditoría no permite seguimientos',
        mensaje: `La auditoría está en etapa "${plan.etapaAuditoria}". Solo se puede acceder a Seguimientos desde las etapas: Comunicación, Seguimiento o Finalizada.`,
        flujo: 'Flujo correcto: Planeación → Ejecución → COMUNICACIÓN → Seguimiento'
      };
    }
    return null;
  };

  const mensajeBloqueo = getMensajeBloqueo();

  // ====================================
  // RENDER DE BLOQUEO SI NO TIENE ACCESO
  // ====================================

  if (!accesoPermitido && mensajeBloqueo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-slate-50 p-6">
        <div className="max-w-2xl mx-auto">
          <CardSIGL className="border-red-200 bg-white">
            <div className="p-8 text-center space-y-6">
              {/* Icono de bloqueo */}
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
              
              {/* Título */}
              <h2 className="text-2xl font-bold text-gray-900">
                {mensajeBloqueo.titulo}
              </h2>
              
              {/* Mensaje */}
              <p className="text-gray-600 text-lg">
                {mensajeBloqueo.mensaje}
              </p>
              
              {/* Flujo correcto */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-medium">
                  📋 {mensajeBloqueo.flujo}
                </p>
              </div>
              
              {/* Información del plan */}
              <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Auditoría:</span> {plan.auditoriaCodigo} - {plan.auditoriaNombre}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Estado del Plan:</span>{' '}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    planPermiteAcceso ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {plan.estado}
                  </span>
                </p>
                {plan.etapaAuditoria && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Etapa Auditoría:</span>{' '}
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      etapaPermiteAcceso ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {plan.etapaAuditoria}
                    </span>
                  </p>
                )}
              </div>
              
              {/* Botón para volver */}
              <ButtonSIGL 
                variant="default" 
                onClick={() => window.history.back()}
                className="mt-4"
              >
                ← Volver al módulo anterior
              </ButtonSIGL>
            </div>
          </CardSIGL>
        </div>
      </div>
    );
  }

  // ====================================
  // RENDER POR ROL
  // ====================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* SELECTOR DE VISTA (Solo para demo) */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Vista actual:</span>
            <div className="flex gap-2">
              <ButtonSIGL
                variant={rol === 'PORTAL_AREA' ? 'primary' : 'default'}
                onClick={() => setRol('PORTAL_AREA')}
              >
                Portal Área Auditada
              </ButtonSIGL>
              <ButtonSIGL
                variant={rol === 'AUDITOR' ? 'primary' : 'default'}
                onClick={() => setRol('AUDITOR')}
              >
                Dashboard Auditor
              </ButtonSIGL>
              <ButtonSIGL
                variant={rol === 'JEFE_OCI' ? 'primary' : 'default'}
                onClick={() => setRol('JEFE_OCI')}
              >
                Dashboard Jefe OCI
              </ButtonSIGL>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={rol}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {rol === 'PORTAL_AREA' && (
              <PortalAreaAuditada
                plan={plan}
                seguimientoActual={seguimientoActual}
                onActualizarSeguimiento={(seguimientoActualizado) => {
                  setPlan(prev => ({
                    ...prev,
                    seguimientos: prev.seguimientos.map(s =>
                      s.id === seguimientoActualizado.id ? seguimientoActualizado : s
                    )
                  }));
                  setSeguimientoActual(seguimientoActualizado);
                }}
              />
            )}

            {rol === 'AUDITOR' && (
              <DashboardAuditor
                plan={plan}
                seguimientoActual={seguimientoActual}
                onActualizarSeguimiento={(seguimientoActualizado) => {
                  setPlan(prev => ({
                    ...prev,
                    seguimientos: prev.seguimientos.map(s =>
                      s.id === seguimientoActualizado.id ? seguimientoActualizado : s
                    )
                  }));
                  setSeguimientoActual(seguimientoActualizado);
                }}
              />
            )}

            {rol === 'JEFE_OCI' && (
              <DashboardJefeOCI plan={plan} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ====================================
// VISTA 1: PORTAL ÁREA AUDITADA
// ====================================

const PortalAreaAuditada: React.FC<{
  plan: PlanMejoramiento;
  seguimientoActual: SeguimientoPlan;
  onActualizarSeguimiento: (seguimiento: SeguimientoPlan) => void;
}> = ({ plan, seguimientoActual, onActualizarSeguimiento }) => {
  const [modalCargarEvidencia, setModalCargarEvidencia] = useState<{ abierto: boolean; accion?: AccionCorrectiva; accionSeguimiento?: AccionSeguimiento }>({
    abierto: false
  });

  const diasRestantes = useMemo(() => {
    const ahora = new Date();
    const fechaLimite = new Date(seguimientoActual.fechaSeguimiento);
    const diff = fechaLimite.getTime() - ahora.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [seguimientoActual.fechaSeguimiento]);

  const handleCargarEvidencia = (accionId: string, data: { cantidadImplementada: number; observaciones: string; archivo: any }) => {
    const accion = plan.acciones.find(a => a.id === accionId);
    if (!accion) return;

    // Calcular cumplimiento según fórmula EMFO002
    const cumplimiento = calcularCumplimientoEMFO002(data.cantidadImplementada, accion.cantidadProgramada);

    // Crear nueva evidencia
    const nuevaEvidencia: EvidenciaValidada = {
      id: `ev${Date.now()}`,
      accionId,
      archivoNombre: data.archivo.name,
      archivoUrl: `/mock/evidencias/${data.archivo.name}`,
      fechaCarga: new Date().toISOString(),
      cargadoPor: typeof plan.responsableArea === 'string' ? plan.responsableArea : plan.responsableArea?.nombre || 'No asignado',
      calificacion: 'PENDIENTE_REVISION'
    };

    // Actualizar seguimiento
    const seguimientoActualizado = {
      ...seguimientoActual,
      acciones: seguimientoActual.acciones.map(a =>
        a.accionId === accionId
          ? {
              ...a,
              cantidadImplementada: data.cantidadImplementada,
              cumplimiento,
              evidencias: [...a.evidencias, nuevaEvidencia],
              observaciones: data.observaciones
            }
          : a
      ),
      estado: 'VALIDACION_AUDITOR' as const
    };

    // Recalcular cumplimiento global
    const cumplimientoGlobal = calcularCumplimientoGlobal(seguimientoActualizado.acciones, plan.acciones);
    seguimientoActualizado.porcentajeCumplimientoGlobal = cumplimientoGlobal;
    seguimientoActualizado.semaforoColor = calcularSemaforo(cumplimientoGlobal);

    onActualizarSeguimiento(seguimientoActualizado);
    setModalCargarEvidencia({ abierto: false });
    toast.success('Evidencia cargada exitosamente. El auditor será notificado.');
  };

  return (
    <>
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Carga de Evidencias - Seguimiento Trimestral</h1>
                <p className="text-sm text-gray-500">
                  Seguimiento #{seguimientoActual.numeroSeguimiento} - {getMesSeguimiento(seguimientoActual.numeroSeguimiento)} {new Date(seguimientoActual.fechaSeguimiento).getFullYear()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mt-4">
              <BadgeSIGL variant="info">
                <Target className="w-3 h-3" />
                {plan.auditoriaCodigo}
              </BadgeSIGL>
              <BadgeSIGL variant="default">
                <Calendar className="w-3 h-3" />
                Vence: {new Date(seguimientoActual.fechaSeguimiento).toLocaleDateString()}
              </BadgeSIGL>
              <BadgeSIGL variant={diasRestantes <= 3 ? 'danger' : diasRestantes <= 7 ? 'warning' : 'success'}>
                <Clock className="w-3 h-3" />
                {diasRestantes > 0 ? `${diasRestantes} días restantes` : 'Vencido'}
              </BadgeSIGL>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500 mb-2">Progreso del Seguimiento</div>
            <div className="flex items-center gap-3">
              <div className={`text-3xl font-bold ${
                seguimientoActual.semaforoColor === 'VERDE' ? 'text-green-600' :
                seguimientoActual.semaforoColor === 'AMARILLO' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {seguimientoActual.porcentajeCumplimientoGlobal}%
              </div>
              <div className={`w-4 h-4 rounded-full ${
                seguimientoActual.semaforoColor === 'VERDE' ? 'bg-green-500' :
                seguimientoActual.semaforoColor === 'AMARILLO' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* INSTRUCCIONES */}
      <CardSIGL>
        <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Instrucciones para Carga de Evidencias</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <strong>1. Revise cada acción</strong> del plan de mejoramiento y determine cuántas veces se ejecutó en este trimestre.
                </p>
                <p>
                  <strong>2. Cargue las evidencias</strong> que demuestren la implementación de cada acción (PDFs, Excel, imágenes, etc.).
                </p>
                <p>
                  <strong>3. Agregue observaciones</strong> que complementen la información de las evidencias.
                </p>
                <p>
                  <strong>4. Archivos permitidos:</strong> PDF, Excel, Word, imágenes (máximo 50MB por archivo).
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardSIGL>

      {/* ACCIONES DEL PLAN */}
      <div className="space-y-4">
        {plan.acciones.map((accion, index) => {
          const accionSeguimiento = seguimientoActual.acciones.find(a => a.accionId === accion.id);
          const tieneEvidencias = accionSeguimiento && accionSeguimiento.evidencias.length > 0;

          return (
            <motion.div
              key={accion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <CardSIGL>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-700 flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{accion.hallazgoTitulo}</h3>
                        <p className="text-sm text-gray-600 mb-2">{accion.descripcion}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">
                            <Users className="w-4 h-4 inline mr-1" />
                            {accion.responsable}
                          </span>
                          <span className="text-gray-600">
                            <Target className="w-4 h-4 inline mr-1" />
                            Cantidad programada: {accion.cantidadProgramada}
                          </span>
                        </div>
                      </div>
                    </div>

                    {accionSeguimiento && accionSeguimiento.cumplimiento > 0 && (
                      <BadgeSIGL variant={
                        accionSeguimiento.cumplimiento === 2 ? 'success' :
                        accionSeguimiento.cumplimiento === 1 ? 'warning' : 'danger'
                      }>
                        {accionSeguimiento.cumplimiento === 2 ? 'Completo' :
                         accionSeguimiento.cumplimiento === 1 ? 'Parcial' : 'Pendiente'}
                      </BadgeSIGL>
                    )}
                  </div>

                  {/* Evidencias Cargadas */}
                  {tieneEvidencias && accionSeguimiento && (
                    <div className="mb-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">Evidencias cargadas:</p>
                      {accionSeguimiento.evidencias.map(evidencia => (
                        <div key={evidencia.id} className={`p-3 rounded-lg border ${
                          evidencia.calificacion === 'ACEPTADA' ? 'bg-green-50 border-green-200' :
                          evidencia.calificacion === 'CON_OBSERVACIONES' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-blue-50 border-blue-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-gray-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{evidencia.archivoNombre}</p>
                                <p className="text-xs text-gray-600">
                                  Cargado el {new Date(evidencia.fechaCarga).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <BadgeSIGL variant={
                              evidencia.calificacion === 'ACEPTADA' ? 'success' :
                              evidencia.calificacion === 'CON_OBSERVACIONES' ? 'warning' : 'info'
                            }>
                              {evidencia.calificacion === 'ACEPTADA' ? 'Aceptada' :
                               evidencia.calificacion === 'CON_OBSERVACIONES' ? 'Con observaciones' :
                               'Pendiente validación'}
                            </BadgeSIGL>
                          </div>

                          {evidencia.comentariosAuditor && (
                            <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                              <p className="text-xs font-medium text-gray-700">Comentarios del auditor:</p>
                              <p className="text-xs text-gray-600">{evidencia.comentariosAuditor}</p>
                            </div>
                          )}

                          {evidencia.solicitudNuevaEvidencia && (
                            <div className="mt-2 bg-yellow-100 border border-yellow-300 rounded p-2">
                              <p className="text-xs text-yellow-800">
                                <AlertTriangle className="w-3 h-3 inline mr-1" />
                                Se solicita cargar nueva evidencia
                              </p>
                            </div>
                          )}
                        </div>
                      ))}

                      {accionSeguimiento.observaciones && (
                        <div className="p-3 bg-gray-50 rounded border border-gray-200">
                          <p className="text-xs font-medium text-gray-700">Observaciones:</p>
                          <p className="text-sm text-gray-600">{accionSeguimiento.observaciones}</p>
                        </div>
                      )}

                      <div className="p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-sm text-blue-900">
                          <strong>Cantidad implementada:</strong> {accionSeguimiento.cantidadImplementada} de {accion.cantidadProgramada}
                          {accionSeguimiento.cumplimiento === 2 && ' ✅ Cumplimiento total'}
                          {accionSeguimiento.cumplimiento === 1 && ' ⚠️ Cumplimiento parcial'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Botón Cargar Evidencia */}
                  <ButtonSIGL
                    variant="primary"
                    onClick={() => setModalCargarEvidencia({ abierto: true, accion, accionSeguimiento })}
                  >
                    <Upload className="w-4 h-4" />
                    {tieneEvidencias ? 'Cargar Más Evidencias' : 'Cargar Evidencias'}
                  </ButtonSIGL>
                </div>
              </CardSIGL>
            </motion.div>
          );
        })}
      </div>

      {/* Botón Enviar Seguimiento */}
      <CardSIGL>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">¿Listo para enviar el seguimiento?</h3>
              <p className="text-sm text-gray-600">
                El auditor revisará las evidencias y validará el cumplimiento.
              </p>
            </div>
            <ButtonSIGL
              variant="primary"
              disabled={seguimientoActual.acciones.every(a => a.evidencias.length === 0)}
            >
              <Send className="w-4 h-4" />
              Enviar al Auditor
            </ButtonSIGL>
          </div>
        </div>
      </CardSIGL>

      {/* Modal Cargar Evidencia */}
      {modalCargarEvidencia.abierto && modalCargarEvidencia.accion && (
        <ModalCargarEvidencia
          accion={modalCargarEvidencia.accion}
          accionSeguimiento={modalCargarEvidencia.accionSeguimiento}
          onClose={() => setModalCargarEvidencia({ abierto: false })}
          onCargar={(data) => handleCargarEvidencia(modalCargarEvidencia.accion!.id, data)}
        />
      )}
    </>
  );
};

// ====================================
// VISTA 2: DASHBOARD AUDITOR
// ====================================

const DashboardAuditor: React.FC<{
  plan: PlanMejoramiento;
  seguimientoActual: SeguimientoPlan;
  onActualizarSeguimiento: (seguimiento: SeguimientoPlan) => void;
}> = ({ plan, seguimientoActual, onActualizarSeguimiento }) => {
  const [modalValidar, setModalValidar] = useState<{ abierto: boolean; evidencia?: EvidenciaValidada }>({ abierto: false });

  const evidenciasPendientes = useMemo(() => {
    return seguimientoActual.acciones.flatMap(a =>
      a.evidencias.filter(e => e.calificacion === 'PENDIENTE_REVISION')
    );
  }, [seguimientoActual]);

  const handleValidar = (evidenciaId: string, calificacion: 'ACEPTADA' | 'CON_OBSERVACIONES', comentarios: string, solicitarNueva: boolean) => {
    const seguimientoActualizado = {
      ...seguimientoActual,
      acciones: seguimientoActual.acciones.map(a => ({
        ...a,
        evidencias: a.evidencias.map(e =>
          e.id === evidenciaId
            ? {
                ...e,
                calificacion,
                comentariosAuditor: comentarios,
                fechaValidacion: new Date().toISOString(),
                auditorValido: 'Fernando Ávila',
                solicitudNuevaEvidencia: solicitarNueva
              }
            : e
        )
      }))
    };

    // Si todas las evidencias están validadas, cambiar estado
    const todasValidadas = seguimientoActualizado.acciones.every(a =>
      a.evidencias.every(e => e.calificacion !== 'PENDIENTE_REVISION')
    );

    if (todasValidadas) {
      seguimientoActualizado.estado = 'COMPLETADO';
    }

    onActualizarSeguimiento(seguimientoActualizado);
    setModalValidar({ abierto: false });
    toast.success(`Evidencia ${calificacion === 'ACEPTADA' ? 'aceptada' : 'marcada con observaciones'}`);
  };

  return (
    <>
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Validación de Evidencias</h1>
                <p className="text-sm text-gray-500">
                  {plan.auditoriaCodigo} - {plan.auditoriaNombre}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mt-4">
              <BadgeSIGL variant="info">
                Seguimiento #{seguimientoActual.numeroSeguimiento} - {getMesSeguimiento(seguimientoActual.numeroSeguimiento)}
              </BadgeSIGL>
              <BadgeSIGL variant={evidenciasPendientes.length > 0 ? 'warning' : 'success'}>
                {evidenciasPendientes.length} evidencias pendientes
              </BadgeSIGL>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500 mb-2">Cumplimiento Global</div>
            <div className="flex items-center gap-3">
              <div className={`text-3xl font-bold ${
                seguimientoActual.semaforoColor === 'VERDE' ? 'text-green-600' :
                seguimientoActual.semaforoColor === 'AMARILLO' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {seguimientoActual.porcentajeCumplimientoGlobal}%
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                seguimientoActual.semaforoColor === 'VERDE' ? 'bg-green-500' :
                seguimientoActual.semaforoColor === 'AMARILLO' ? 'bg-yellow-500' : 'bg-red-500'
              }`}>
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ACCIONES Y EVIDENCIAS */}
      <div className="space-y-4">
        {plan.acciones.map((accion, index) => {
          const accionSeguimiento = seguimientoActual.acciones.find(a => a.accionId === accion.id);
          if (!accionSeguimiento) return null;

          return (
            <CardSIGL key={accion.id}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-sm font-bold text-purple-700 flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{accion.hallazgoTitulo}</h3>
                      <p className="text-sm text-gray-600 mb-2">{accion.descripcion}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">
                          Implementadas: {accionSeguimiento.cantidadImplementada} de {accion.cantidadProgramada}
                        </span>
                        <BadgeSIGL variant={
                          accionSeguimiento.cumplimiento === 2 ? 'success' :
                          accionSeguimiento.cumplimiento === 1 ? 'warning' : 'danger'
                        }>
                          {accionSeguimiento.cumplimiento === 2 ? 'Completo 100%' :
                           accionSeguimiento.cumplimiento === 1 ? 'Parcial' : 'Pendiente'}
                        </BadgeSIGL>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de Evidencias */}
                {accionSeguimiento.evidencias.length > 0 ? (
                  <div className="space-y-2">
                    {accionSeguimiento.evidencias.map(evidencia => (
                      <div key={evidencia.id} className={`p-4 rounded-lg border ${
                        evidencia.calificacion === 'ACEPTADA' ? 'bg-green-50 border-green-200' :
                        evidencia.calificacion === 'CON_OBSERVACIONES' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-600" />
                            <div>
                              <p className="font-medium text-gray-900">{evidencia.archivoNombre}</p>
                              <p className="text-xs text-gray-600">
                                Cargado por {evidencia.cargadoPor} el {new Date(evidencia.fechaCarga).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <BadgeSIGL variant={
                              evidencia.calificacion === 'ACEPTADA' ? 'success' :
                              evidencia.calificacion === 'CON_OBSERVACIONES' ? 'warning' : 'info'
                            }>
                              {evidencia.calificacion === 'ACEPTADA' ? 'Aceptada' :
                               evidencia.calificacion === 'CON_OBSERVACIONES' ? 'Con observaciones' :
                               'Pendiente'}
                            </BadgeSIGL>

                            {evidencia.calificacion === 'PENDIENTE_REVISION' && (
                              <ButtonSIGL
                                variant="primary"
                                onClick={() => setModalValidar({ abierto: true, evidencia })}
                              >
                                Validar
                              </ButtonSIGL>
                            )}
                          </div>
                        </div>

                        {evidencia.comentariosAuditor && (
                          <div className="mt-2 p-3 bg-white rounded border border-gray-200">
                            <p className="text-xs font-medium text-gray-700">Comentarios:</p>
                            <p className="text-sm text-gray-600">{evidencia.comentariosAuditor}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Validado por {evidencia.auditorValido} el {evidencia.fechaValidacion && new Date(evidencia.fechaValidacion).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600">No se han cargado evidencias para esta acción</p>
                  </div>
                )}
              </div>
            </CardSIGL>
          );
        })}
      </div>

      {/* Modal Validar Evidencia */}
      {modalValidar.abierto && modalValidar.evidencia && (
        <ModalValidarEvidencia
          evidencia={modalValidar.evidencia}
          onClose={() => setModalValidar({ abierto: false })}
          onValidar={handleValidar}
        />
      )}
    </>
  );
};

// ====================================
// VISTA 3: DASHBOARD JEFE OCI
// ====================================

const DashboardJefeOCI: React.FC<{ plan: PlanMejoramiento }> = ({ plan }) => {
  const estadisticas = useMemo(() => {
    const seguimientosCompletados = plan.seguimientos.filter(s => s.estado === 'COMPLETADO').length;
    const cumplimientoPromedio = Math.round(
      plan.seguimientos.reduce((sum, s) => sum + s.porcentajeCumplimientoGlobal, 0) / plan.seguimientos.length
    );
    const accionesCompletadas = plan.acciones.filter(a => a.estado === 'COMPLETADA').length;

    return {
      seguimientosCompletados,
      cumplimientoPromedio,
      accionesCompletadas,
      totalAcciones: plan.acciones.length,
      semaforoGeneral: cumplimientoPromedio >= 80 ? 'VERDE' : cumplimientoPromedio >= 50 ? 'AMARILLO' : 'ROJO'
    };
  }, [plan]);

  return (
    <>
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Ejecutivo - Jefe OCI</h1>
            <p className="text-sm text-gray-500">Visión general de planes de mejoramiento</p>
          </div>
        </div>
      </motion.div>

      {/* ESTADÍSTICAS GENERALES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardSIGL>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-indigo-600" />
              <div className={`w-8 h-8 rounded-full ${
                estadisticas.semaforoGeneral === 'VERDE' ? 'bg-green-500' :
                estadisticas.semaforoGeneral === 'AMARILLO' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{estadisticas.cumplimientoPromedio}%</div>
            <div className="text-sm text-gray-600">Cumplimiento Promedio</div>
          </div>
        </CardSIGL>

        <CardSIGL>
          <div className="p-6">
            <Calendar className="w-8 h-8 text-blue-600 mb-2" />
            <div className="text-3xl font-bold text-gray-900 mb-1">{estadisticas.seguimientosCompletados}/4</div>
            <div className="text-sm text-gray-600">Seguimientos Completados</div>
          </div>
        </CardSIGL>

        <CardSIGL>
          <div className="p-6">
            <CheckCircle2 className="w-8 h-8 text-green-600 mb-2" />
            <div className="text-3xl font-bold text-gray-900 mb-1">{estadisticas.accionesCompletadas}/{estadisticas.totalAcciones}</div>
            <div className="text-sm text-gray-600">Acciones Completadas</div>
          </div>
        </CardSIGL>

        <CardSIGL>
          <div className="p-6">
            <Target className="w-8 h-8 text-purple-600 mb-2" />
            <div className="text-3xl font-bold text-gray-900 mb-1">{estadisticas.totalAcciones}</div>
            <div className="text-sm text-gray-600">Total Acciones</div>
          </div>
        </CardSIGL>
      </div>

      {/* INFORMACIÓN DEL PLAN */}
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Plan</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Código de Auditoría:</span>
              <p className="text-gray-900">{plan.auditoriaCodigo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Nombre de Auditoría:</span>
              <p className="text-gray-900">{plan.auditoriaNombre}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Área Responsable:</span>
              <p className="text-gray-900">{plan.areaResponsable}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Responsable del Plan:</span>
              <p className="text-gray-900">{typeof plan.responsableArea === 'string' ? plan.responsableArea : plan.responsableArea?.nombre || 'No asignado'}</p>
            </div>
          </div>
        </div>
      </CardSIGL>

      {/* HISTÓRICO DE SEGUIMIENTOS */}
      <CardSIGL>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Seguimientos Trimestrales</h3>
          <div className="space-y-3">
            {plan.seguimientos.map(seguimiento => (
              <div key={seguimiento.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      seguimiento.semaforoColor === 'VERDE' ? 'bg-green-100 text-green-700' :
                      seguimiento.semaforoColor === 'AMARILLO' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      <strong>#{seguimiento.numeroSeguimiento}</strong>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        Seguimiento {getMesSeguimiento(seguimiento.numeroSeguimiento)} {new Date(seguimiento.fechaSeguimiento).getFullYear()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Fecha: {new Date(seguimiento.fechaSeguimiento).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        seguimiento.semaforoColor === 'VERDE' ? 'text-green-600' :
                        seguimiento.semaforoColor === 'AMARILLO' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {seguimiento.porcentajeCumplimientoGlobal}%
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full ${
                      seguimiento.semaforoColor === 'VERDE' ? 'bg-green-500' :
                      seguimiento.semaforoColor === 'AMARILLO' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <BadgeSIGL variant={
                      seguimiento.estado === 'COMPLETADO' ? 'success' :
                      seguimiento.estado === 'VALIDACION_AUDITOR' ? 'warning' :
                      seguimiento.estado === 'EN_PROGRESO' ? 'info' : 'default'
                    }>
                      {seguimiento.estado}
                    </BadgeSIGL>
                  </div>
                </div>

                {/* Detalle de Acciones */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  {seguimiento.acciones.map(accion => {
                    const accionOriginal = plan.acciones.find(a => a.id === accion.accionId);
                    return (
                      <div key={accion.id} className="bg-gray-50 rounded p-3">
                        <p className="font-medium text-gray-900 text-xs mb-1">{accionOriginal?.hallazgoTitulo}</p>
                        <p className="text-xs text-gray-600">
                          {accion.cantidadImplementada} / {accionOriginal?.cantidadProgramada}
                        </p>
                        <BadgeSIGL variant={
                          accion.cumplimiento === 2 ? 'success' :
                          accion.cumplimiento === 1 ? 'warning' : 'danger'
                        }>
                          {accion.cumplimiento === 2 ? 'Completo' :
                           accion.cumplimiento === 1 ? 'Parcial' : 'Pendiente'}
                        </BadgeSIGL>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardSIGL>
    </>
  );
};

// ====================================
// MODAL: CARGAR EVIDENCIA
// ====================================

const ModalCargarEvidencia: React.FC<{
  accion: AccionCorrectiva;
  accionSeguimiento?: AccionSeguimiento;
  onClose: () => void;
  onCargar: (data: { cantidadImplementada: number; observaciones: string; archivo: File }) => void;
}> = ({ accion, accionSeguimiento, onClose, onCargar }) => {
  const [cantidadImplementada, setCantidadImplementada] = useState(accionSeguimiento?.cantidadImplementada || 0);
  const [observaciones, setObservaciones] = useState(accionSeguimiento?.observaciones || '');
  const [archivo, setArchivo] = useState<File | null>(null);

  const cumplimiento = useMemo(() => {
    return calcularCumplimientoEMFO002(cantidadImplementada, accion.cantidadProgramada);
  }, [cantidadImplementada, accion.cantidadProgramada]);

  const handleSubmit = () => {
    if (cantidadImplementada < 0) {
      toast.error('La cantidad implementada no puede ser negativa');
      return;
    }

    if (!archivo) {
      toast.error('Debe seleccionar un archivo de evidencia');
      return;
    }

    if (archivo.size > 50 * 1024 * 1024) {
      toast.error('El archivo no puede superar 50MB');
      return;
    }

    onCargar({ cantidadImplementada, observaciones, archivo });
  };

  return (
    <ModalSIGL
      isOpen={true}
      onClose={onClose}
      title="Cargar Evidencia"
      size="medium"
    >
      <div className="space-y-4">
        {/* Información de la Acción */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-medium text-blue-900 mb-1">{accion.hallazgoTitulo}</p>
          <p className="text-sm text-blue-700">{accion.descripcion}</p>
          <p className="text-sm text-blue-700 mt-2">
            <strong>Cantidad programada:</strong> {accion.cantidadProgramada}
          </p>
        </div>

        {/* Cantidad Implementada */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cantidad Implementada en este Trimestre *
          </label>
          <InputSIGL
            type="number"
            value={cantidadImplementada}
            onChange={(e) => setCantidadImplementada(parseInt(e.target.value) || 0)}
            min="0"
            max={accion.cantidadProgramada}
          />
          <p className="text-xs text-gray-500 mt-1">
            ¿Cuántas veces se ejecutó esta acción en este trimestre?
          </p>
        </div>

        {/* Cálculo de Cumplimiento */}
        <div className={`p-4 rounded-lg border ${
          cumplimiento === 2 ? 'bg-green-50 border-green-200' :
          cumplimiento === 1 ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        }`}>
          <p className="text-sm font-medium mb-1">
            Cumplimiento según fórmula EMFO002:
          </p>
          <p className={`text-lg font-bold ${
            cumplimiento === 2 ? 'text-green-700' :
            cumplimiento === 1 ? 'text-yellow-700' : 'text-red-700'
          }`}>
            {cumplimiento === 2 ? '✅ COMPLETO (100%)' :
             cumplimiento === 1 ? '⚠️ PARCIAL' : '❌ PENDIENTE'}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Fórmula: IF(Implementada ≥ Programada, 2, IF(Implementada ≥ 1, 1, 0))
          </p>
        </div>

        {/* Archivo de Evidencia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Archivo de Evidencia *
          </label>
          <input
            type="file"
            accept=".pdf,.xlsx,.xls,.docx,.jpg,.jpeg,.png"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            Formatos permitidos: PDF, Excel, Word, imágenes (máx. 50MB)
          </p>
          {archivo && (
            <p className="text-sm text-green-600 mt-2">
              ✓ Archivo seleccionado: {archivo.name} ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observaciones (Opcional)
          </label>
          <TextareaSIGL
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Agregue comentarios adicionales sobre la evidencia..."
            rows={3}
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <ButtonSIGL variant="default" onClick={onClose}>
            Cancelar
          </ButtonSIGL>
          <ButtonSIGL variant="primary" onClick={handleSubmit}>
            <Upload className="w-4 h-4" />
            Cargar Evidencia
          </ButtonSIGL>
        </div>
      </div>
    </ModalSIGL>
  );
};

// ====================================
// MODAL: VALIDAR EVIDENCIA
// ====================================

const ModalValidarEvidencia: React.FC<{
  evidencia: EvidenciaValidada;
  onClose: () => void;
  onValidar: (evidenciaId: string, calificacion: 'ACEPTADA' | 'CON_OBSERVACIONES', comentarios: string, solicitarNueva: boolean) => void;
}> = ({ evidencia, onClose, onValidar }) => {
  const [comentarios, setComentarios] = useState('');
  const [solicitarNueva, setSolicitarNueva] = useState(false);

  return (
    <ModalSIGL
      isOpen={true}
      onClose={onClose}
      title="Validar Evidencia"
      size="medium"
    >
      <div className="space-y-4">
        {/* Información de la Evidencia */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-medium text-blue-900 mb-1">{evidencia.archivoNombre}</p>
          <p className="text-sm text-blue-700">
            Cargado por: {evidencia.cargadoPor}
          </p>
          <p className="text-sm text-blue-700">
            Fecha: {new Date(evidencia.fechaCarga).toLocaleDateString()}
          </p>
          <ButtonSIGL variant="default" className="mt-3">
            <Eye className="w-4 h-4" />
            Ver Archivo
          </ButtonSIGL>
        </div>

        {/* Comentarios del Auditor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comentarios de Validación *
          </label>
          <TextareaSIGL
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            placeholder="Agregue sus comentarios sobre la evidencia..."
            rows={4}
          />
        </div>

        {/* Opción Solicitar Nueva */}
        <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <input
            type="checkbox"
            checked={solicitarNueva}
            onChange={(e) => setSolicitarNueva(e.target.checked)}
            className="mt-1"
          />
          <div>
            <p className="text-sm font-medium text-yellow-900">Solicitar nueva evidencia</p>
            <p className="text-xs text-yellow-700">
              Marque esta opción si la evidencia no es suficiente y requiere que el área cargue evidencia adicional.
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <ButtonSIGL variant="default" onClick={onClose}>
            Cancelar
          </ButtonSIGL>
          <ButtonSIGL
            variant="danger"
            onClick={() => onValidar(evidencia.id, 'CON_OBSERVACIONES', comentarios, true)}
            disabled={!comentarios.trim()}
          >
            <X className="w-4 h-4" />
            Con Observaciones
          </ButtonSIGL>
          <ButtonSIGL
            variant="success"
            onClick={() => onValidar(evidencia.id, 'ACEPTADA', comentarios, solicitarNueva)}
            disabled={!comentarios.trim()}
          >
            <Check className="w-4 h-4" />
            Aceptar
          </ButtonSIGL>
        </div>
      </div>
    </ModalSIGL>
  );
};

// ====================================
// FUNCIONES AUXILIARES
// ====================================

// Fórmula EMFO002 exacta: IF(K>=F,2,IF(K>=1,1,0))
function calcularCumplimientoEMFO002(cantidadImplementada: number, cantidadProgramada: number): 0 | 1 | 2 {
  if (cantidadImplementada >= cantidadProgramada) return 2; // Completo
  if (cantidadImplementada >= 1) return 1;                   // Parcial
  return 0;                                                   // Pendiente
}

// Calcular cumplimiento global del seguimiento
function calcularCumplimientoGlobal(acciones: AccionSeguimiento[], accionesOriginales: AccionCorrectiva[]): number {
  const totalPuntos = acciones.length * 2; // Máximo 2 puntos por acción
  const puntosObtenidos = acciones.reduce((sum, a) => sum + a.cumplimiento, 0);
  return Math.round((puntosObtenidos / totalPuntos) * 100);
}

// Calcular semáforo según porcentaje
function calcularSemaforo(porcentaje: number): 'VERDE' | 'AMARILLO' | 'ROJO' {
  if (porcentaje >= 80) return 'VERDE';
  if (porcentaje >= 50) return 'AMARILLO';
  return 'ROJO';
}

// Obtener nombre del mes de seguimiento
function getMesSeguimiento(numero: 1 | 2 | 3 | 4): string {
  const meses = ['Julio', 'Octubre', 'Enero', 'Abril'];
  return meses[numero - 1];
}

export default SeguimientoPlanMejoramientoModule;