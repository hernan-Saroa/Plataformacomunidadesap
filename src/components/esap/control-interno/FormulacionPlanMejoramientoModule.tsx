import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Target,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  Send,
  Eye,
  Download,
  Plus,
  X,
  Edit2,
  Trash2,
  AlertCircle,
  Save
} from 'lucide-react';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { InputSIGL, TextareaSIGL } from '../gestion-legal/design-system/InputSIGL';
import { toast } from 'sonner@2.0.3';

// ====================================
// TIPOS Y DATOS
// ====================================

interface Hallazgo {
  id: string;
  titulo: string;
  gravedad: 'LEVE' | 'MODERADO' | 'GRAVE';
  descripcion: string;
  causas: string[];
  efectos: string[];
  recomendaciones: string[];
}

interface AccionCorrectiva {
  id: string;
  hallazgoId: string;
  hallazgoTitulo: string;
  descripcionAccion: string;
  causasRaiz: string;
  responsable: string;
  cargo: string;
  cantidadProgramada: number;
  fechaInicio: string;
  fechaFin: string;
  tiempoEjecucionMeses: number;
  evidenciasSoporte: string[];
  estado: 'PENDIENTE' | 'EN_REVISION' | 'APROBADA';
}

interface PlanMejoramiento {
  id: string;
  auditoriaId: string;
  auditoriaCodigo: string;
  auditoriaNombre: string;
  areaResponsable: string;
  responsableArea: string;
  fechaCreacion: string;
  fechaLimite: string;
  estado: 'FORMULACION' | 'REVISION' | 'APROBADO' | 'RECHAZADO';
  acciones: AccionCorrectiva[];
  observacionesJefeOCI?: string;
  fechaAprobacion?: string;
}

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export const FormulacionPlanMejoramientoModule: React.FC<{ auditoriaId?: string }> = ({ auditoriaId = 'aud-001' }) => {
  // Datos de la auditoría (mock - después conectar con backend)
  const [auditoria] = useState({
    id: auditoriaId,
    codigo: 'AUD-2025-005',
    nombre: 'Auditoría Gestión Financiera',
    proceso: 'Gestión Financiera',
    areaResponsable: 'Dirección Administrativa y Financiera',
    responsableArea: 'María González',
    cargoResponsable: 'Directora Administrativa',
    plazoFormulacionDias: 30,
    hallazgosDefinitivos: [
      {
        id: 'h1',
        titulo: 'Falta de conciliaciones bancarias mensuales',
        gravedad: 'GRAVE' as const,
        descripcion: 'No se realizan conciliaciones bancarias de manera mensual, solo trimestrales.',
        causas: ['Falta de personal capacitado', 'Procesos manuales sin automatizar'],
        efectos: ['Riesgo de fraude no detectado', 'Información financiera inexacta'],
        recomendaciones: ['Implementar software de conciliación', 'Capacitar personal']
      },
      {
        id: 'h2',
        titulo: 'Documentación de gastos incompleta',
        gravedad: 'MODERADO' as const,
        descripcion: 'Algunos gastos no tienen toda la documentación soporte requerida.',
        causas: ['Falta de procedimiento claro', 'Desconocimiento de normativa'],
        efectos: ['Posibles observaciones CGR', 'Riesgo de rechazo de gastos'],
        recomendaciones: ['Crear checklist de documentos obligatorios', 'Socializar normativa']
      },
      {
        id: 'h3',
        titulo: 'Retraso en reportes presupuestales',
        gravedad: 'LEVE' as const,
        descripcion: 'Los reportes presupuestales se entregan 2-3 días después del plazo.',
        causas: ['Volumen de trabajo elevado', 'Falta de priorización'],
        efectos: ['Información no oportuna para toma de decisiones'],
        recomendaciones: ['Redistribuir carga de trabajo', 'Implementar calendario de entregas']
      }
    ]
  });

  const [plan, setPlan] = useState<PlanMejoramiento>({
    id: `PM-${Date.now()}`,
    auditoriaId: auditoria.id,
    auditoriaCodigo: auditoria.codigo,
    auditoriaNombre: auditoria.nombre,
    areaResponsable: auditoria.areaResponsable,
    responsableArea: auditoria.responsableArea,
    fechaCreacion: new Date().toISOString(),
    fechaLimite: new Date(Date.now() + auditoria.plazoFormulacionDias * 24 * 60 * 60 * 1000).toISOString(),
    estado: 'FORMULACION',
    acciones: []
  });

  const [modalAccion, setModalAccion] = useState<{ abierto: boolean; hallazgo?: Hallazgo; accionEditar?: AccionCorrectiva }>({
    abierto: false
  });

  const [modalPreview, setModalPreview] = useState(false);

  // Cálculo de progreso
  const progreso = useMemo(() => {
    const hallazgosConAccion = new Set(plan.acciones.map(a => a.hallazgoId));
    return Math.round((hallazgosConAccion.size / auditoria.hallazgosDefinitivos.length) * 100);
  }, [plan.acciones, auditoria.hallazgosDefinitivos]);

  const puedeEnviar = useMemo(() => {
    return plan.acciones.length === auditoria.hallazgosDefinitivos.length &&
           plan.acciones.every(a => a.estado !== 'PENDIENTE');
  }, [plan.acciones, auditoria.hallazgosDefinitivos]);

  // Días restantes
  const diasRestantes = useMemo(() => {
    const ahora = new Date();
    const limite = new Date(plan.fechaLimite);
    const diff = limite.getTime() - ahora.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [plan.fechaLimite]);

  // ====================================
  // HANDLERS
  // ====================================

  const handleAgregarAccion = (accion: Omit<AccionCorrectiva, 'id' | 'estado'>) => {
    const nueva: AccionCorrectiva = {
      ...accion,
      id: `acc${Date.now()}`,
      estado: 'PENDIENTE'
    };

    setPlan(prev => ({
      ...prev,
      acciones: [...prev.acciones, nueva]
    }));

    setModalAccion({ abierto: false });
    toast.success('Acción correctiva agregada');
  };

  const handleEditarAccion = (accion: AccionCorrectiva) => {
    setPlan(prev => ({
      ...prev,
      acciones: prev.acciones.map(a => a.id === accion.id ? accion : a)
    }));

    setModalAccion({ abierto: false });
    toast.success('Acción correctiva actualizada');
  };

  const handleEliminarAccion = (id: string) => {
    if (confirm('¿Está seguro de eliminar esta acción correctiva?')) {
      setPlan(prev => ({
        ...prev,
        acciones: prev.acciones.filter(a => a.id !== id)
      }));
      toast.success('Acción correctiva eliminada');
    }
  };

  const handleEnviarPlan = () => {
    if (!puedeEnviar) {
      toast.error('Complete todas las acciones correctivas antes de enviar');
      return;
    }

    setPlan(prev => ({ ...prev, estado: 'REVISION' }));
    toast.success('Plan de Mejoramiento enviado para aprobación');
  };

  const handleGuardarBorrador = () => {
    toast.success('Borrador guardado correctamente');
  };

  // ====================================
  // RENDER
  // ====================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Formulación de Plan de Mejoramiento</h1>
                  <p className="text-sm text-gray-500">{plan.auditoriaCodigo} - {plan.auditoriaNombre}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-4">
                <BadgeSIGL variant="info">
                  <Users className="w-3 h-3" />
                  {typeof plan.responsableArea === 'string' ? plan.responsableArea : plan.responsableArea?.nombre || 'No asignado'}
                </BadgeSIGL>
                <BadgeSIGL variant="default">
                  <Calendar className="w-3 h-3" />
                  Vence: {new Date(plan.fechaLimite).toLocaleDateString()}
                </BadgeSIGL>
                <BadgeSIGL variant={diasRestantes <= 7 ? 'danger' : diasRestantes <= 15 ? 'warning' : 'success'}>
                  <Clock className="w-3 h-3" />
                  {diasRestantes} días restantes
                </BadgeSIGL>
                <BadgeSIGL variant={
                  plan.estado === 'FORMULACION' ? 'default' :
                  plan.estado === 'REVISION' ? 'warning' :
                  plan.estado === 'APROBADO' ? 'success' : 'danger'
                }>
                  {plan.estado}
                </BadgeSIGL>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-500 mb-2">Progreso del Plan</div>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-emerald-600">{progreso}%</div>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progreso}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {plan.acciones.length} de {auditoria.hallazgosDefinitivos.length} hallazgos con acción
              </p>
            </div>
          </div>
        </motion.div>

        {/* INSTRUCCIONES */}
        <CardSIGL>
          <div className="p-6 bg-gradient-to-r from-emerald-50 to-blue-50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Instrucciones para la Formulación</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <strong>1. Analice cada hallazgo</strong> identificado en el informe final de auditoría.
                  </p>
                  <p>
                    <strong>2. Formule acciones correctivas</strong> que ataquen las causas raíz, no solo los síntomas.
                  </p>
                  <p>
                    <strong>3. Defina claramente:</strong> descripción de la acción, responsable, plazos, cantidad programada (cuántas veces se ejecutará).
                  </p>
                  <p>
                    <strong>4. Tenga en cuenta</strong> que este plan será sometido a seguimiento trimestral (Julio, Octubre, Enero, Abril).
                  </p>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    <strong>Importante:</strong> Debe formular al menos una acción correctiva por cada hallazgo antes de enviar el plan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardSIGL>

        {/* HALLAZGOS Y ACCIONES */}
        <div className="space-y-4">
          {auditoria.hallazgosDefinitivos.map((hallazgo, index) => {
            const accionesDelHallazgo = plan.acciones.filter(a => a.hallazgoId === hallazgo.id);
            const tieneAccion = accionesDelHallazgo.length > 0;

            return (
              <motion.div
                key={hallazgo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <CardSIGL>
                  <div className="p-6">
                    {/* Hallazgo */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-700 flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{hallazgo.titulo}</h3>
                            <BadgeSIGL variant={
                              hallazgo.gravedad === 'GRAVE' ? 'danger' :
                              hallazgo.gravedad === 'MODERADO' ? 'warning' : 'info'
                            }>
                              {hallazgo.gravedad}
                            </BadgeSIGL>
                            {tieneAccion && (
                              <BadgeSIGL variant="success">
                                <CheckCircle2 className="w-3 h-3" />
                                Con acción
                              </BadgeSIGL>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{hallazgo.descripcion}</p>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Causas:</span>
                              <ul className="list-disc list-inside text-gray-600 mt-1">
                                {hallazgo.causas.map((c, i) => <li key={i}>{c}</li>)}
                              </ul>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Efectos:</span>
                              <ul className="list-disc list-inside text-gray-600 mt-1">
                                {hallazgo.efectos.map((e, i) => <li key={i}>{e}</li>)}
                              </ul>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Recomendaciones:</span>
                              <ul className="list-disc list-inside text-gray-600 mt-1">
                                {hallazgo.recomendaciones.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Acciones Correctivas */}
                    {accionesDelHallazgo.length > 0 ? (
                      <div className="space-y-3 mb-4">
                        {accionesDelHallazgo.map(accion => (
                          <div key={accion.id} className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-emerald-600" />
                                <h4 className="font-semibold text-gray-900">Acción Correctiva</h4>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setModalAccion({ abierto: true, hallazgo, accionEditar: accion })}
                                  className="text-blue-600 hover:text-blue-700"
                                  disabled={plan.estado !== 'FORMULACION'}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEliminarAccion(accion.id)}
                                  className="text-red-600 hover:text-red-700"
                                  disabled={plan.estado !== 'FORMULACION'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Descripción:</span>
                                <p className="text-gray-600 mt-1">{accion.descripcionAccion}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Causas Raíz Atacadas:</span>
                                <p className="text-gray-600 mt-1">{accion.causasRaiz}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Responsable:</span>
                                <p className="text-gray-600 mt-1">{accion.responsable} - {accion.cargo}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Plazos:</span>
                                <p className="text-gray-600 mt-1">
                                  {new Date(accion.fechaInicio).toLocaleDateString()} - {new Date(accion.fechaFin).toLocaleDateString()}
                                  <span className="ml-2 text-emerald-600">({accion.tiempoEjecucionMeses} meses)</span>
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Cantidad Programada:</span>
                                <p className="text-gray-600 mt-1">{accion.cantidadProgramada} ejecuciones</p>
                              </div>
                              {accion.evidenciasSoporte.length > 0 && (
                                <div>
                                  <span className="font-medium text-gray-700">Evidencias Soporte:</span>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {accion.evidenciasSoporte.map((ev, i) => (
                                      <span key={i} className="text-xs bg-white px-2 py-1 rounded border border-emerald-300">
                                        {ev}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                          <p className="text-sm text-yellow-800">
                            Este hallazgo aún no tiene acción correctiva asignada
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Botón Agregar Acción */}
                    {plan.estado === 'FORMULACION' && (
                      <ButtonSIGL
                        variant="primary"
                        onClick={() => setModalAccion({ abierto: true, hallazgo })}
                      >
                        <Plus className="w-4 h-4" />
                        {tieneAccion ? 'Agregar Otra Acción' : 'Agregar Acción Correctiva'}
                      </ButtonSIGL>
                    )}
                  </div>
                </CardSIGL>
              </motion.div>
            );
          })}
        </div>

        {/* ACCIONES FINALES */}
        <CardSIGL>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones del Plan</h3>

            {plan.estado === 'FORMULACION' && (
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">
                    {puedeEnviar 
                      ? '✅ Plan completo. Puede enviar para aprobación del Jefe de OCI.'
                      : '⚠️ Complete todas las acciones correctivas antes de enviar.'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <ButtonSIGL variant="default" onClick={handleGuardarBorrador}>
                    <Save className="w-4 h-4" />
                    Guardar Borrador
                  </ButtonSIGL>
                  <ButtonSIGL variant="default" onClick={() => setModalPreview(true)} disabled={plan.acciones.length === 0}>
                    <Eye className="w-4 h-4" />
                    Vista Previa
                  </ButtonSIGL>
                  <ButtonSIGL variant="primary" onClick={handleEnviarPlan} disabled={!puedeEnviar}>
                    <Send className="w-4 h-4" />
                    Enviar para Aprobación
                  </ButtonSIGL>
                </div>
              </div>
            )}

            {plan.estado === 'REVISION' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-900">Plan en Revisión</p>
                    <p className="text-sm text-yellow-700">
                      El Jefe de OCI está revisando el plan. Recibirá una notificación cuando sea aprobado o rechazado.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {plan.estado === 'APROBADO' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Plan Aprobado</p>
                    <p className="text-sm text-green-700">
                      Fecha de aprobación: {plan.fechaAprobacion && new Date(plan.fechaAprobacion).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      El plan pasa ahora a fase de EJECUCIÓN. Los seguimientos trimestrales iniciarán según el cronograma.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {plan.estado === 'RECHAZADO' && plan.observacionesJefeOCI && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-900 mb-2">Plan Rechazado</p>
                    <p className="text-sm text-red-700 font-medium">Observaciones del Jefe de OCI:</p>
                    <p className="text-sm text-red-700 mt-1 bg-white rounded p-3 border border-red-200">
                      {plan.observacionesJefeOCI}
                    </p>
                    <p className="text-sm text-red-700 mt-2">
                      Por favor, ajuste el plan según las observaciones y vuelva a enviarlo.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardSIGL>

        {/* MODAL ACCIÓN CORRECTIVA */}
        {modalAccion.abierto && modalAccion.hallazgo && (
          <ModalFormularioAccion
            hallazgo={modalAccion.hallazgo}
            accionEditar={modalAccion.accionEditar}
            onClose={() => setModalAccion({ abierto: false })}
            onGuardar={modalAccion.accionEditar ? handleEditarAccion : handleAgregarAccion}
          />
        )}

        {/* MODAL PREVIEW */}
        {modalPreview && (
          <ModalPreviewPlan
            plan={plan}
            auditoria={auditoria}
            onClose={() => setModalPreview(false)}
          />
        )}
      </div>
    </div>
  );
};

// ====================================
// MODAL: FORMULARIO ACCIÓN CORRECTIVA
// ====================================

const ModalFormularioAccion: React.FC<{
  hallazgo: Hallazgo;
  accionEditar?: AccionCorrectiva;
  onClose: () => void;
  onGuardar: (accion: any) => void;
}> = ({ hallazgo, accionEditar, onClose, onGuardar }) => {
  const [form, setForm] = useState({
    descripcionAccion: accionEditar?.descripcionAccion || '',
    causasRaiz: accionEditar?.causasRaiz || '',
    responsable: accionEditar?.responsable || '',
    cargo: accionEditar?.cargo || '',
    cantidadProgramada: accionEditar?.cantidadProgramada || 1,
    fechaInicio: accionEditar?.fechaInicio.split('T')[0] || '',
    fechaFin: accionEditar?.fechaFin.split('T')[0] || '',
    evidenciasSoporte: accionEditar?.evidenciasSoporte || []
  });

  const [nuevaEvidencia, setNuevaEvidencia] = useState('');

  const tiempoEjecucionMeses = useMemo(() => {
    if (!form.fechaInicio || !form.fechaFin) return 0;
    const inicio = new Date(form.fechaInicio);
    const fin = new Date(form.fechaFin);
    const diff = fin.getTime() - inicio.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24 * 30)); // Aproximado
  }, [form.fechaInicio, form.fechaFin]);

  const handleSubmit = () => {
    if (!form.descripcionAccion.trim() || !form.causasRaiz.trim() || !form.responsable.trim() ||
        !form.cargo.trim() || !form.fechaInicio || !form.fechaFin) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    if (new Date(form.fechaFin) <= new Date(form.fechaInicio)) {
      toast.error('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    if (form.cantidadProgramada < 1) {
      toast.error('La cantidad programada debe ser al menos 1');
      return;
    }

    onGuardar({
      ...form,
      hallazgoId: hallazgo.id,
      hallazgoTitulo: hallazgo.titulo,
      tiempoEjecucionMeses
    });
  };

  return (
    <ModalSIGL
      isOpen={true}
      onClose={onClose}
      title={accionEditar ? 'Editar Acción Correctiva' : 'Nueva Acción Correctiva'}
      size="large"
    >
      <div className="space-y-4">
        {/* Hallazgo de Referencia */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-1">Hallazgo:</p>
          <p className="text-gray-900">{hallazgo.titulo}</p>
          <div className="mt-2">
            <p className="text-xs font-medium text-gray-700">Causas identificadas en auditoría:</p>
            <ul className="list-disc list-inside text-xs text-gray-600 mt-1">
              {hallazgo.causas.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        </div>

        {/* Descripción de la Acción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción de la Acción Correctiva *
          </label>
          <TextareaSIGL
            value={form.descripcionAccion}
            onChange={(e) => setForm(prev => ({ ...prev, descripcionAccion: e.target.value }))}
            placeholder="Describa claramente qué acción se implementará para corregir el hallazgo..."
            rows={4}
          />
        </div>

        {/* Causas Raíz */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Causas Raíz que Ataca esta Acción *
          </label>
          <TextareaSIGL
            value={form.causasRaiz}
            onChange={(e) => setForm(prev => ({ ...prev, causasRaiz: e.target.value }))}
            placeholder="Indique qué causas raíz específicas ataca esta acción..."
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">
            Importante: La acción debe atacar las causas, no solo los síntomas
          </p>
        </div>

        {/* Responsable y Cargo */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Responsable de la Acción *
            </label>
            <InputSIGL
              value={form.responsable}
              onChange={(e) => setForm(prev => ({ ...prev, responsable: e.target.value }))}
              placeholder="Nombre completo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cargo del Responsable *
            </label>
            <InputSIGL
              value={form.cargo}
              onChange={(e) => setForm(prev => ({ ...prev, cargo: e.target.value }))}
              placeholder="Cargo o posición"
            />
          </div>
        </div>

        {/* Fechas y Cantidad */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Inicio *
            </label>
            <InputSIGL
              type="date"
              value={form.fechaInicio}
              onChange={(e) => setForm(prev => ({ ...prev, fechaInicio: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Fin *
            </label>
            <InputSIGL
              type="date"
              value={form.fechaFin}
              onChange={(e) => setForm(prev => ({ ...prev, fechaFin: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad Programada *
            </label>
            <InputSIGL
              type="number"
              value={form.cantidadProgramada}
              onChange={(e) => setForm(prev => ({ ...prev, cantidadProgramada: parseInt(e.target.value) || 1 }))}
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">Veces que se ejecutará</p>
          </div>
        </div>

        {/* Tiempo de Ejecución (calculado) */}
        {tiempoEjecucionMeses > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <Clock className="w-4 h-4 inline mr-2" />
              Tiempo de ejecución: <strong>{tiempoEjecucionMeses} meses</strong>
            </p>
          </div>
        )}

        {/* Evidencias Soporte */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Evidencias Soporte (Opcional)
          </label>
          <div className="flex gap-2 mb-2">
            <InputSIGL
              value={nuevaEvidencia}
              onChange={(e) => setNuevaEvidencia(e.target.value)}
              placeholder="Nombre del archivo o documento..."
              onKeyPress={(e) => {
                if (e.key === 'Enter' && nuevaEvidencia.trim()) {
                  setForm(prev => ({
                    ...prev,
                    evidenciasSoporte: [...prev.evidenciasSoporte, nuevaEvidencia.trim()]
                  }));
                  setNuevaEvidencia('');
                }
              }}
            />
            <ButtonSIGL
              variant="default"
              onClick={() => {
                if (nuevaEvidencia.trim()) {
                  setForm(prev => ({
                    ...prev,
                    evidenciasSoporte: [...prev.evidenciasSoporte, nuevaEvidencia.trim()]
                  }));
                  setNuevaEvidencia('');
                }
              }}
            >
              <Plus className="w-4 h-4" />
              Agregar
            </ButtonSIGL>
          </div>

          {form.evidenciasSoporte.length > 0 && (
            <div className="space-y-1">
              {form.evidenciasSoporte.map((ev, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                  <span className="text-sm text-gray-700">{ev}</span>
                  <button
                    onClick={() => setForm(prev => ({
                      ...prev,
                      evidenciasSoporte: prev.evidenciasSoporte.filter((_, i) => i !== index)
                    }))}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <ButtonSIGL variant="default" onClick={onClose}>
            Cancelar
          </ButtonSIGL>
          <ButtonSIGL variant="primary" onClick={handleSubmit}>
            <Save className="w-4 h-4" />
            {accionEditar ? 'Actualizar Acción' : 'Agregar Acción'}
          </ButtonSIGL>
        </div>
      </div>
    </ModalSIGL>
  );
};

// ====================================
// MODAL: PREVIEW DEL PLAN
// ====================================

const ModalPreviewPlan: React.FC<{
  plan: PlanMejoramiento;
  auditoria: any;
  onClose: () => void;
}> = ({ plan, auditoria, onClose }) => {
  return (
    <ModalSIGL
      isOpen={true}
      onClose={onClose}
      title="Vista Previa - Plan de Mejoramiento"
      size="large"
    >
      <div className="prose max-w-none">
        {/* Header Oficial */}
        <div className="bg-gradient-to-r from-blue-50 to-emerald-50 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP
          </h2>
          <h3 className="text-xl font-semibold text-emerald-700">
            PLAN DE MEJORAMIENTO
          </h3>
          <p className="text-sm text-gray-600 mt-2">Formato EMFO002</p>
        </div>

        {/* Información General */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="font-semibold text-gray-700">Código de Auditoría:</p>
            <p className="text-gray-900">{plan.auditoriaCodigo}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Nombre de Auditoría:</p>
            <p className="text-gray-900">{plan.auditoriaNombre}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Área Responsable:</p>
            <p className="text-gray-900">{plan.areaResponsable}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Responsable del Plan:</p>
            <p className="text-gray-900">{typeof plan.responsableArea === 'string' ? plan.responsableArea : plan.responsableArea?.nombre || 'No asignado'}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Fecha de Creación:</p>
            <p className="text-gray-900">{new Date(plan.fechaCreacion).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Total de Acciones:</p>
            <p className="text-gray-900">{plan.acciones.length}</p>
          </div>
        </div>

        <hr className="my-6" />

        {/* Tabla de Acciones (Estilo EMFO002) */}
        <h4 className="text-lg font-bold text-gray-900 mb-4">Acciones Correctivas</h4>

        {plan.acciones.map((accion, index) => (
          <div key={accion.id} className="border border-gray-300 rounded-lg p-4 mb-4 bg-white">
            <div className="bg-emerald-100 px-3 py-2 rounded mb-3">
              <h5 className="font-bold text-emerald-900">
                Acción #{index + 1} - {accion.hallazgoTitulo}
              </h5>
            </div>

            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="font-semibold text-gray-700 py-2 w-1/3">Descripción de la Acción:</td>
                  <td className="text-gray-900 py-2">{accion.descripcionAccion}</td>
                </tr>
                <tr className="border-b">
                  <td className="font-semibold text-gray-700 py-2">Causas Raíz:</td>
                  <td className="text-gray-900 py-2">{accion.causasRaiz}</td>
                </tr>
                <tr className="border-b">
                  <td className="font-semibold text-gray-700 py-2">Responsable:</td>
                  <td className="text-gray-900 py-2">{accion.responsable} - {accion.cargo}</td>
                </tr>
                <tr className="border-b">
                  <td className="font-semibold text-gray-700 py-2">Cantidad Programada:</td>
                  <td className="text-gray-900 py-2">{accion.cantidadProgramada} ejecuciones</td>
                </tr>
                <tr className="border-b">
                  <td className="font-semibold text-gray-700 py-2">Fecha Inicio:</td>
                  <td className="text-gray-900 py-2">{new Date(accion.fechaInicio).toLocaleDateString()}</td>
                </tr>
                <tr className="border-b">
                  <td className="font-semibold text-gray-700 py-2">Fecha Fin:</td>
                  <td className="text-gray-900 py-2">{new Date(accion.fechaFin).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td className="font-semibold text-gray-700 py-2">Tiempo de Ejecución:</td>
                  <td className="text-gray-900 py-2">{accion.tiempoEjecucionMeses} meses</td>
                </tr>
              </tbody>
            </table>

            {accion.evidenciasSoporte.length > 0 && (
              <div className="mt-3">
                <p className="font-semibold text-gray-700 text-sm mb-2">Evidencias Soporte:</p>
                <div className="flex flex-wrap gap-2">
                  {accion.evidenciasSoporte.map((ev, i) => (
                    <span key={i} className="text-xs bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Nota:</strong> Este plan será sometido a seguimiento trimestral en los meses de Julio, Octubre, Enero y Abril.
            El área responsable deberá cargar evidencias de cumplimiento en cada seguimiento.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <ButtonSIGL variant="default" onClick={onClose}>
          Cerrar
        </ButtonSIGL>
        <ButtonSIGL variant="primary">
          <Download className="w-4 h-4" />
          Descargar PDF
        </ButtonSIGL>
      </div>
    </ModalSIGL>
  );
};

export default FormulacionPlanMejoramientoModule;