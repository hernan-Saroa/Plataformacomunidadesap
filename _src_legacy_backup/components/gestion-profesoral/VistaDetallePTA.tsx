/**
 * VISTA DETALLE PTA - ESAP
 * 
 * Vista completa y detallada de un PTA para aprobadores.
 * Muestra toda la información del PTA incluyendo:
 * - Información del docente
 * - Distribución de horas por componente
 * - Lista detallada de actividades de cada componente
 * - Validaciones y alertas
 * - Timeline de aprobaciones
 */

import { useState } from 'react';
import {
  X,
  User,
  Mail,
  Award,
  Building2,
  Calendar,
  Clock,
  BookOpen,
  FlaskConical,
  Users,
  Briefcase,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  FileText,
  Download,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { ActividadDocencia } from './FormularioDocencia';
import type { ActividadInvestigacion } from './FormularioInvestigacion';
import type { ActividadExtension } from './FormularioExtension';
import type { ActividadComplementaria } from './FormularioComplementarias';

// ============================================================================
// TIPOS
// ============================================================================

interface PTADetalle {
  id: string;
  periodoAcademico: string;
  docente: {
    cedula: string;
    nombreCompleto: string;
    email: string;
    tipoVinculacion: string;
    tipoDocente: string;
    programa: string;
    escuela: string;
    sede: string;
    horasProgramables: number;
  };
  fechaCreacion: string;
  fechaEnvio: string;
  estado: 'en-revision' | 'aprobado' | 'rechazado';
  actividadesDocencia: ActividadDocencia[];
  actividadesInvestigacion: ActividadInvestigacion[];
  actividadesExtension: ActividadExtension[];
  actividadesComplementarias: ActividadComplementaria[];
  aprobaciones?: {
    nivel1?: { aprobador: string; fecha: string; estado: 'aprobado' | 'rechazado'; observaciones?: string };
    nivel2?: { aprobador: string; fecha: string; estado: 'aprobado' | 'rechazado'; observaciones?: string };
    nivel3?: { aprobador: string; fecha: string; estado: 'aprobado' | 'rechazado'; observaciones?: string };
  };
}

// Datos mock
const PTA_DETALLE_MOCK: PTADetalle = {
  id: 'pta-001',
  periodoAcademico: '2025-1',
  docente: {
    cedula: '1234567890',
    nombreCompleto: 'Dr. Carlos Alberto Méndez Rivera',
    email: 'carlos.mendez@esap.edu.co',
    tipoVinculacion: 'Tiempo Completo',
    tipoDocente: 'Titular',
    programa: 'Administración Pública',
    escuela: 'Escuela Superior de Administración Pública',
    sede: 'Bogotá',
    horasProgramables: 800
  },
  fechaCreacion: '2024-12-20T10:00:00',
  fechaEnvio: '2025-01-01T10:00:00',
  estado: 'en-revision',
  actividadesDocencia: [
    {
      id: 'doc-1',
      asignatura: 'Teoría del Estado',
      creditos: 3,
      gruposAsignados: 2,
      horasDirectas: 96,
      horasIndependientes: 192,
      horasPTA: 192
    },
    {
      id: 'doc-2',
      asignatura: 'Políticas Públicas',
      creditos: 4,
      gruposAsignados: 1,
      horasDirectas: 64,
      horasIndependientes: 192,
      horasPTA: 128
    }
  ],
  actividadesInvestigacion: [
    {
      id: 'inv-1',
      categoria: 'proyecto',
      descripcion: 'Proyecto: Modernización del Estado colombiano',
      recibeEstimulo: true,
      horas: 200
    }
  ],
  actividadesExtension: [
    {
      id: 'ext-1',
      categoria: 'consultoria',
      descripcion: 'Consultoría: Reforma administrativa municipal',
      horas: 80
    }
  ],
  actividadesComplementarias: [
    {
      id: 'comp-1',
      categoria: 'comite',
      descripcion: 'Comité Curricular - Programa Administración Pública',
      horas: 40
    }
  ]
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface VistaDetallePTAProps {
  ptaId: string;
  onClose: () => void;
  onAprobar?: () => void;
  onRechazar?: () => void;
  modoVisualizacion?: boolean; // Si es true, no muestra botones de aprobación
}

export function VistaDetallePTA({
  ptaId,
  onClose,
  onAprobar,
  onRechazar,
  modoVisualizacion = false
}: VistaDetallePTAProps) {
  const [expandido, setExpandido] = useState({
    docencia: true,
    investigacion: true,
    extension: true,
    complementarias: true
  });

  // TODO: Cargar datos del backend usando ptaId
  const pta = PTA_DETALLE_MOCK;

  // Calcular totales
  const horas = {
    docencia: pta.actividadesDocencia.reduce((sum, act) => sum + act.horasPTA, 0),
    investigacion: pta.actividadesInvestigacion.reduce((sum, act) => sum + act.horas, 0),
    extension: pta.actividadesExtension.reduce((sum, act) => sum + act.horas, 0),
    complementarias: pta.actividadesComplementarias.reduce((sum, act) => sum + act.horas, 0),
    total: 0
  };
  horas.total = horas.docencia + horas.investigacion + horas.extension + horas.complementarias;

  const porcentajes = {
    docencia: (horas.docencia / horas.total) * 100,
    investigacion: (horas.investigacion / horas.total) * 100,
    extension: (horas.extension / horas.total) * 100,
    complementarias: (horas.complementarias / horas.total) * 100
  };

  // Validaciones
  const validaciones = [
    {
      cumple: horas.total === pta.docente.horasProgramables,
      mensaje: `Total de horas debe ser ${pta.docente.horasProgramables}`,
      valor: `${horas.total} hrs`
    },
    {
      cumple: porcentajes.investigacion <= 50,
      mensaje: 'Investigación ≤ 50%',
      valor: `${porcentajes.investigacion.toFixed(1)}%`
    },
    {
      cumple: porcentajes.extension <= 25,
      mensaje: 'Extensión ≤ 25%',
      valor: `${porcentajes.extension.toFixed(1)}%`
    },
    {
      cumple: porcentajes.complementarias <= 25,
      mensaje: 'Complementarias ≤ 25%',
      valor: `${porcentajes.complementarias.toFixed(1)}%`
    }
  ];

  const todasValidacionesCumplen = validaciones.every(v => v.cumple);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Plan de Trabajo Académico - {pta.periodoAcademico}</h2>
              <p className="text-blue-100">{pta.docente.nombreCompleto}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mini Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-3xl font-bold">{horas.total}</div>
              <div className="text-sm text-blue-100">Total horas</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-3xl font-bold">{pta.actividadesDocencia.length + pta.actividadesInvestigacion.length + pta.actividadesExtension.length + pta.actividadesComplementarias.length}</div>
              <div className="text-sm text-blue-100">Actividades</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2">
                {todasValidacionesCumplen ? (
                  <CheckCircle className="w-6 h-6 text-green-300" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-yellow-300" />
                )}
                <div className="text-xl font-bold">{validaciones.filter(v => v.cumple).length}/{validaciones.length}</div>
              </div>
              <div className="text-sm text-blue-100">Validaciones</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-lg font-bold">{new Date(pta.fechaEnvio).toLocaleDateString('es-ES')}</div>
              <div className="text-sm text-blue-100">Fecha envío</div>
            </div>
          </div>
        </div>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Información del Docente */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del Docente
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoField icon={User} label="Cédula" value={pta.docente.cedula} />
              <InfoField icon={Mail} label="Email" value={pta.docente.email} />
              <InfoField icon={Award} label="Tipo Vinculación" value={pta.docente.tipoVinculacion} />
              <InfoField icon={Award} label="Tipo Docente" value={pta.docente.tipoDocente} />
              <InfoField icon={Building2} label="Programa" value={pta.docente.programa} />
              <InfoField icon={Building2} label="Sede" value={pta.docente.sede} />
            </div>
          </div>

          {/* Validaciones */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              {todasValidacionesCumplen ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              )}
              Validaciones del PTA
            </h3>
            <div className="space-y-2">
              {validaciones.map((val, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    val.cumple ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {val.cumple ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-medium ${val.cumple ? 'text-green-900' : 'text-red-900'}`}>
                      {val.mensaje}
                    </span>
                  </div>
                  <span className={`font-bold ${val.cumple ? 'text-green-700' : 'text-red-700'}`}>
                    {val.valor}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Distribución por Componentes */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Distribución de Horas
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <ComponenteCard
                nombre="Docencia"
                icon={BookOpen}
                horas={horas.docencia}
                porcentaje={porcentajes.docencia}
                color="blue"
                cantidadActividades={pta.actividadesDocencia.length}
              />
              <ComponenteCard
                nombre="Investigación"
                icon={FlaskConical}
                horas={horas.investigacion}
                porcentaje={porcentajes.investigacion}
                color="green"
                cantidadActividades={pta.actividadesInvestigacion.length}
              />
              <ComponenteCard
                nombre="Extensión"
                icon={Users}
                horas={horas.extension}
                porcentaje={porcentajes.extension}
                color="teal"
                cantidadActividades={pta.actividadesExtension.length}
              />
              <ComponenteCard
                nombre="Complementarias"
                icon={Briefcase}
                horas={horas.complementarias}
                porcentaje={porcentajes.complementarias}
                color="orange"
                cantidadActividades={pta.actividadesComplementarias.length}
              />
            </div>
          </div>

          {/* Actividades Detalladas */}
          <div className="space-y-4">
            {/* Docencia */}
            <SeccionActividades
              titulo="Actividades de Docencia"
              icon={BookOpen}
              color="blue"
              expandido={expandido.docencia}
              onToggle={() => setExpandido({ ...expandido, docencia: !expandido.docencia })}
              totalHoras={horas.docencia}
              cantidadActividades={pta.actividadesDocencia.length}
            >
              <div className="space-y-3">
                {pta.actividadesDocencia.map((act) => (
                  <div key={act.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-blue-900">{act.asignatura}</h4>
                        <p className="text-sm text-blue-700">
                          {act.creditos} créditos • {act.gruposAsignados} grupo{act.gruposAsignados > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-900">{act.horasPTA} hrs</div>
                        <div className="text-xs text-blue-700">PTA</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white rounded px-3 py-2">
                        <span className="text-gray-600">Directas:</span>{' '}
                        <span className="font-medium text-gray-900">{act.horasDirectas} hrs</span>
                      </div>
                      <div className="bg-white rounded px-3 py-2">
                        <span className="text-gray-600">Independientes:</span>{' '}
                        <span className="font-medium text-gray-900">{act.horasIndependientes} hrs</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SeccionActividades>

            {/* Investigación */}
            <SeccionActividades
              titulo="Actividades de Investigación"
              icon={FlaskConical}
              color="green"
              expandido={expandido.investigacion}
              onToggle={() => setExpandido({ ...expandido, investigacion: !expandido.investigacion })}
              totalHoras={horas.investigacion}
              cantidadActividades={pta.actividadesInvestigacion.length}
            >
              <div className="space-y-3">
                {pta.actividadesInvestigacion.map((act) => (
                  <div key={act.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded font-medium uppercase">
                            {act.categoria}
                          </span>
                          {act.recibeEstimulo && (
                            <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded font-medium">
                              Con Estímulo
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-green-900">{act.descripcion}</p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-bold text-green-900">{act.horas} hrs</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SeccionActividades>

            {/* Extensión */}
            <SeccionActividades
              titulo="Actividades de Extensión"
              icon={Users}
              color="teal"
              expandido={expandido.extension}
              onToggle={() => setExpandido({ ...expandido, extension: !expandido.extension })}
              totalHoras={horas.extension}
              cantidadActividades={pta.actividadesExtension.length}
            >
              <div className="space-y-3">
                {pta.actividadesExtension.map((act) => (
                  <div key={act.id} className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="px-2 py-1 bg-teal-200 text-teal-800 text-xs rounded font-medium uppercase mb-2 inline-block">
                          {act.categoria}
                        </span>
                        <p className="font-medium text-teal-900">{act.descripcion}</p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-bold text-teal-900">{act.horas} hrs</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SeccionActividades>

            {/* Complementarias */}
            <SeccionActividades
              titulo="Actividades Complementarias"
              icon={Briefcase}
              color="orange"
              expandido={expandido.complementarias}
              onToggle={() => setExpandido({ ...expandido, complementarias: !expandido.complementarias })}
              totalHoras={horas.complementarias}
              cantidadActividades={pta.actividadesComplementarias.length}
            >
              <div className="space-y-3">
                {pta.actividadesComplementarias.map((act) => (
                  <div key={act.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded font-medium uppercase mb-2 inline-block">
                          {act.categoria}
                        </span>
                        <p className="font-medium text-orange-900">{act.descripcion}</p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-bold text-orange-900">{act.horas} hrs</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SeccionActividades>
          </div>
        </div>

        {/* Footer con Botones */}
        {!modoVisualizacion && onAprobar && onRechazar && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Cerrar
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={onRechazar}
                  className="px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors font-medium border border-red-200 flex items-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Rechazar
                </button>
                <button
                  onClick={onAprobar}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-lg flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Aprobar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

function InfoField({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-gray-500 mt-0.5" />
      <div>
        <p className="text-xs text-gray-600">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

interface ComponenteCardProps {
  nombre: string;
  icon: any;
  horas: number;
  porcentaje: number;
  color: 'blue' | 'green' | 'teal' | 'orange';
  cantidadActividades: number;
}

function ComponenteCard({ nombre, icon: Icon, horas, porcentaje, color, cantidadActividades }: ComponenteCardProps) {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200' },
    green: { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-900', border: 'border-teal-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200' }
  };

  const classes = colorClasses[color];

  return (
    <div className={`${classes.bg} border ${classes.border} rounded-lg p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${classes.text}`} />
        <span className="text-sm font-medium text-gray-700">{nombre}</span>
      </div>
      <div className={`text-2xl font-bold ${classes.text}`}>{horas} hrs</div>
      <div className="text-sm text-gray-600">{porcentaje.toFixed(1)}%</div>
      <div className="text-xs text-gray-500 mt-1">{cantidadActividades} actividad{cantidadActividades !== 1 ? 'es' : ''}</div>
    </div>
  );
}

interface SeccionActividadesProps {
  titulo: string;
  icon: any;
  color: 'blue' | 'green' | 'teal' | 'orange';
  expandido: boolean;
  onToggle: () => void;
  totalHoras: number;
  cantidadActividades: number;
  children: React.ReactNode;
}

function SeccionActividades({
  titulo,
  icon: Icon,
  color,
  expandido,
  onToggle,
  totalHoras,
  cantidadActividades,
  children
}: SeccionActividadesProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-300 text-blue-900',
    green: 'bg-green-50 border-green-300 text-green-900',
    teal: 'bg-teal-50 border-teal-300 text-teal-900',
    orange: 'bg-orange-50 border-orange-300 text-orange-900'
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full ${colorClasses[color]} border-b-2 p-4 flex items-center justify-between hover:opacity-80 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          <span className="font-bold">{titulo}</span>
          <span className="text-sm opacity-75">
            ({cantidadActividades} actividad{cantidadActividades !== 1 ? 'es' : ''} • {totalHoras} hrs)
          </span>
        </div>
        {expandido ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {expandido && <div className="p-4">{children}</div>}
    </div>
  );
}
