import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Eye,
  Download,
  Send,
  Edit2,
  User
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';

interface PTARevisionViewProps {
  className?: string;
  ptaId?: string;
}

interface PTAData {
  id: string;
  docente_id: string;
  docente_nombre: string;
  docente_foto?: string;
  periodo: string;
  estado: 'Borrador' | 'Enviado' | 'En Revisión' | 'Ajustes Solicitados' | 'Aprobado' | 'Rechazado';
  fecha_envio: string;
  fecha_revision?: string;
  dedicacion_total: number;
  territorial: string;
  departamento: string;
  componentes: {
    ensenanza: ComponentePTA;
    investigacion: ComponentePTA;
    extension: ComponentePTA;
    apoyo_institucional: ComponentePTA;
  };
  historial: HistorialItem[];
  observaciones_docente?: string;
  observaciones_coordinador?: string;
  periodo_anterior?: {
    existe: boolean;
    cambios?: string[];
  };
}

interface ComponentePTA {
  horas: number;
  porcentaje: number;
  actividades: Actividad[];
}

interface Actividad {
  descripcion: string;
  horas_semana: number;
  semanas: number;
}

interface HistorialItem {
  fecha: string;
  accion: string;
  usuario: string;
  comentario?: string;
}

export function PTARevisionView({ className = '', ptaId = '1' }: PTARevisionViewProps) {
  const [vistaActual, setVistaActual] = useState<'resumen' | 'detalle' | 'comparacion'>('resumen');
  const [comentario, setComentario] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [accionModal, setAccionModal] = useState<'aprobar' | 'solicitar_ajustes' | 'rechazar'>('aprobar');

  // Mock data del PTA
  const pta: PTAData = {
    id: '1',
    docente_id: '1',
    docente_nombre: 'María López Gómez',
    periodo: '2025-I',
    estado: 'En Revisión',
    fecha_envio: '2025-01-20',
    dedicacion_total: 40,
    territorial: 'Bogotá',
    departamento: 'Derecho Público',
    componentes: {
      ensenanza: {
        horas: 24,
        porcentaje: 60,
        actividades: [
          { descripcion: 'Derecho Administrativo I - 4 horas semanales', horas_semana: 4, semanas: 16 },
          { descripcion: 'Procedimiento Administrativo - 4 horas semanales', horas_semana: 4, semanas: 16 },
          { descripcion: 'Preparación de clases y materiales', horas_semana: 8, semanas: 16 },
          { descripcion: 'Atención a estudiantes', horas_semana: 4, semanas: 16 },
          { descripcion: 'Evaluaciones y retroalimentación', horas_semana: 4, semanas: 16 }
        ]
      },
      investigacion: {
        horas: 8,
        porcentaje: 20,
        actividades: [
          { descripcion: 'Proyecto: "Análisis de procedimientos administrativos en Colombia"', horas_semana: 6, semanas: 16 },
          { descripcion: 'Publicación de artículo en revista indexada', horas_semana: 2, semanas: 16 }
        ]
      },
      extension: {
        horas: 4,
        porcentaje: 10,
        actividades: [
          { descripcion: 'Consultorías a entidades públicas', horas_semana: 2, semanas: 16 },
          { descripcion: 'Conferencias y seminarios externos', horas_semana: 2, semanas: 16 }
        ]
      },
      apoyo_institucional: {
        horas: 4,
        porcentaje: 10,
        actividades: [
          { descripcion: 'Comité curricular del programa', horas_semana: 2, semanas: 16 },
          { descripcion: 'Actividades administrativas del departamento', horas_semana: 2, semanas: 16 }
        ]
      }
    },
    historial: [
      {
        fecha: '2025-01-15',
        accion: 'Creación',
        usuario: 'María López Gómez',
        comentario: 'PTA creado por el docente'
      },
      {
        fecha: '2025-01-20',
        accion: 'Envío',
        usuario: 'María López Gómez',
        comentario: 'PTA enviado para revisión'
      }
    ],
    observaciones_docente: 'Este PTA refleja mi compromiso con la formación de estudiantes y el desarrollo de investigación en derecho administrativo.',
    periodo_anterior: {
      existe: true,
      cambios: [
        'Incremento de 2 horas en investigación',
        'Reducción de 2 horas en apoyo institucional',
        'Nueva asignatura: Procedimiento Administrativo'
      ]
    }
  };

  const getEstadoConfig = (estado: PTAData['estado']) => {
    switch (estado) {
      case 'Borrador':
        return { color: 'bg-gray-100 text-gray-700', icon: Edit2 };
      case 'Enviado':
        return { color: 'bg-blue-100 text-blue-700', icon: Send };
      case 'En Revisión':
        return { color: 'bg-amber-100 text-amber-700', icon: Eye };
      case 'Ajustes Solicitados':
        return { color: 'bg-orange-100 text-orange-700', icon: AlertCircle };
      case 'Aprobado':
        return { color: 'bg-green-100 text-green-700', icon: CheckCircle };
      case 'Rechazado':
        return { color: 'bg-red-100 text-red-700', icon: XCircle };
    }
  };

  const estadoConfig = getEstadoConfig(pta.estado);
  const IconEstado = estadoConfig.icon;

  const handleAccion = (accion: 'aprobar' | 'solicitar_ajustes' | 'rechazar') => {
    setAccionModal(accion);
    setShowModal(true);
  };

  const confirmarAccion = () => {
    console.log(`Acción: ${accionModal}`, comentario);
    setShowModal(false);
    setComentario('');
  };

  const getInitials = (nombre: string) => {
    const parts = nombre.split(' ');
    return `${parts[0]?.charAt(0) || ''}${parts[1]?.charAt(0) || ''}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Revisión de PTA
            </h1>
            <Badge className={`${estadoConfig.color} flex items-center gap-1`}>
              <IconEstado className="w-3 h-3" />
              {pta.estado}
            </Badge>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {pta.periodo} • {pta.docente_nombre}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
        </div>
      </div>

      {/* Tabs de Vista */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setVistaActual('resumen')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            vistaActual === 'resumen'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Resumen
        </button>
        <button
          onClick={() => setVistaActual('detalle')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            vistaActual === 'detalle'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Detalle
        </button>
        <button
          onClick={() => setVistaActual('comparacion')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            vistaActual === 'comparacion'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Comparación
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* Vista Resumen */}
        {vistaActual === 'resumen' && (
          <motion.div
            key="resumen"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Info del Docente */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={pta.docente_foto} />
                  <AvatarFallback className="bg-[#1e5da8] text-white text-xl">
                    {getInitials(pta.docente_nombre)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{pta.docente_nombre}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{pta.departamento}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{pta.territorial}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{pta.dedicacion_total} horas/semana</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Distribución de Componentes */}
            <Card className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">Distribución de Tiempo</h3>
              <div className="space-y-4">
                {[
                  { label: 'Enseñanza', data: pta.componentes.ensenanza, color: 'bg-blue-500', target: '60-70%' },
                  { label: 'Investigación', data: pta.componentes.investigacion, color: 'bg-purple-500', target: '15-25%' },
                  { label: 'Extensión', data: pta.componentes.extension, color: 'bg-green-500', target: '5-10%' },
                  { label: 'Apoyo Institucional', data: pta.componentes.apoyo_institucional, color: 'bg-amber-500', target: '5-10%' }
                ].map(({ label, data, color, target }) => {
                  const cumpleRango = 
                    (label === 'Enseñanza' && data.porcentaje >= 60 && data.porcentaje <= 70) ||
                    (label === 'Investigación' && data.porcentaje >= 15 && data.porcentaje <= 25) ||
                    (label === 'Extensión' && data.porcentaje >= 5 && data.porcentaje <= 10) ||
                    (label === 'Apoyo Institucional' && data.porcentaje >= 5 && data.porcentaje <= 10);

                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">{label}</span>
                          <Badge variant="secondary" className="text-xs">{target}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{data.horas}h</span>
                          <span className="text-sm font-bold text-gray-900">{data.porcentaje}%</span>
                          {cumpleRango ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                          )}
                        </div>
                      </div>
                      <Progress value={data.porcentaje} className={`h-2 ${color}`} />
                      <p className="text-xs text-gray-600 mt-1">
                        {data.actividades.length} actividad{data.actividades.length !== 1 ? 'es' : ''}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Validación */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Total:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {pta.componentes.ensenanza.horas + 
                       pta.componentes.investigacion.horas + 
                       pta.componentes.extension.horas + 
                       pta.componentes.apoyo_institucional.horas}h / {pta.dedicacion_total}h
                    </span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Cambios vs Periodo Anterior */}
            {pta.periodo_anterior?.existe && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-gray-900">Cambios vs Periodo Anterior</h3>
                </div>
                <div className="space-y-2">
                  {pta.periodo_anterior.cambios?.map((cambio, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2" />
                      <span>{cambio}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Observaciones del Docente */}
            {pta.observaciones_docente && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  <h3 className="font-bold text-gray-900">Observaciones del Docente</h3>
                </div>
                <p className="text-gray-700">{pta.observaciones_docente}</p>
              </Card>
            )}
          </motion.div>
        )}

        {/* Vista Detalle */}
        {vistaActual === 'detalle' && (
          <motion.div
            key="detalle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {Object.entries(pta.componentes).map(([key, componente]) => {
              const labels: Record<string, string> = {
                ensenanza: 'Enseñanza',
                investigacion: 'Investigación',
                extension: 'Extensión',
                apoyo_institucional: 'Apoyo Institucional'
              };

              const colors: Record<string, string> = {
                ensenanza: 'border-blue-500',
                investigacion: 'border-purple-500',
                extension: 'border-green-500',
                apoyo_institucional: 'border-amber-500'
              };

              return (
                <Card key={key} className={`p-6 border-l-4 ${colors[key]}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{labels[key]}</h3>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{componente.horas}h</p>
                      <p className="text-sm text-gray-600">{componente.porcentaje}%</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {componente.actividades.map((actividad, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-gray-900 flex-1">{actividad.descripcion}</p>
                          <Badge variant="secondary" className="ml-2">
                            {actividad.horas_semana}h/sem
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {actividad.semanas} semanas • Total: {actividad.horas_semana * actividad.semanas} horas en el periodo
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </motion.div>
        )}

        {/* Vista Comparación */}
        {vistaActual === 'comparacion' && (
          <motion.div
            key="comparacion"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">Comparación de Periodos</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-3 font-medium text-gray-600">Componente</th>
                      <th className="text-center p-3 font-medium text-gray-600">2024-II</th>
                      <th className="text-center p-3 font-medium text-gray-600">2025-I</th>
                      <th className="text-center p-3 font-medium text-gray-600">Cambio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Enseñanza', anterior: 26, actual: 24 },
                      { label: 'Investigación', anterior: 6, actual: 8 },
                      { label: 'Extensión', anterior: 4, actual: 4 },
                      { label: 'Apoyo Inst.', anterior: 4, actual: 4 }
                    ].map((item) => {
                      const cambio = item.actual - item.anterior;
                      return (
                        <tr key={item.label} className="border-b border-gray-100">
                          <td className="p-3 font-medium text-gray-900">{item.label}</td>
                          <td className="p-3 text-center text-gray-700">{item.anterior}h</td>
                          <td className="p-3 text-center font-medium text-gray-900">{item.actual}h</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {cambio > 0 ? (
                                <>
                                  <TrendingUp className="w-4 h-4 text-green-600" />
                                  <span className="font-medium text-green-600">+{cambio}h</span>
                                </>
                              ) : cambio < 0 ? (
                                <>
                                  <TrendingDown className="w-4 h-4 text-red-600" />
                                  <span className="font-medium text-red-600">{cambio}h</span>
                                </>
                              ) : (
                                <span className="text-gray-600">Sin cambio</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Historial */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h3 className="font-bold text-gray-900">Historial</h3>
        </div>
        <div className="space-y-3">
          {pta.historial.map((item, index) => (
            <div key={index} className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
              <div className="flex-1">
                <p className="text-gray-900">
                  <span className="font-medium">{item.accion}</span> por {item.usuario}
                </p>
                {item.comentario && (
                  <p className="text-gray-600 mt-1">{item.comentario}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{formatDate(item.fecha)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Acciones de Revisión */}
      {pta.estado === 'En Revisión' && (
        <Card className="p-6 bg-gray-50">
          <h3 className="font-bold text-gray-900 mb-4">Decisión de Revisión</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => handleAccion('aprobar')}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Aprobar PTA
            </Button>
            <Button
              onClick={() => handleAccion('solicitar_ajustes')}
              variant="outline"
              className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Solicitar Ajustes
            </Button>
            <Button
              onClick={() => handleAccion('rechazar')}
              variant="outline"
              className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rechazar
            </Button>
          </div>
        </Card>
      )}

      {/* Modal de Confirmación */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {accionModal === 'aprobar' && 'Aprobar PTA'}
              {accionModal === 'solicitar_ajustes' && 'Solicitar Ajustes'}
              {accionModal === 'rechazar' && 'Rechazar PTA'}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentarios {accionModal !== 'aprobar' && '*'}
              </label>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Ingresa tus observaciones..."
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowModal(false);
                  setComentario('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmarAccion}
                className={`flex-1 ${
                  accionModal === 'aprobar'
                    ? 'bg-green-600 hover:bg-green-700'
                    : accionModal === 'solicitar_ajustes'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirmar
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
