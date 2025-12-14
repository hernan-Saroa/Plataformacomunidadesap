/**
 * MIS EXPEDIENTES LEGALES - Portal Transaccional
 * Vista para investigados (docentes/administrativos) 
 * Permite ver expedientes, subir descargos y consultar estado procesal
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Scale,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  X as XIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Shield,
  Download,
  Eye,
  Paperclip,
  Calendar,
  CheckCircle,
  ArrowLeft,
  History,
  Info,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';

interface MisExpedientesLegalesProps {
  onVolver?: () => void;
}

interface Expediente {
  id: string;
  numero: string;
  etapaActual: string;
  fechaNotificacion: string;
  fechaLimiteRespuesta: string | null;
  diasRestantes: number | null;
  tipoFalta: 'Leve' | 'Grave' | 'Gravísima';
  abogadoAsignado: string;
  estadoRespuesta: 'Pendiente' | 'Presentado' | 'Vencido' | 'No Aplica';
  hechos: string;
  documentosSubidos: number;
  ultimaActuacion: string;
  fechaUltimaActuacion: string;
  puedeSubirDescargos: boolean;
  historial: ActuacionHistorial[];
}

interface ActuacionHistorial {
  fecha: string;
  titulo: string;
  descripcion: string;
  tipo: 'notificacion' | 'respuesta' | 'auto' | 'termino';
}

const EXPEDIENTES_MOCK: Expediente[] = [
  {
    id: '1',
    numero: 'PD-2025-0125',
    etapaActual: 'Traslado Descargos',
    fechaNotificacion: '2025-01-05',
    fechaLimiteRespuesta: '2025-01-20',
    diasRestantes: 3,
    tipoFalta: 'Grave',
    abogadoAsignado: 'Dr. Carlos Mendoza',
    estadoRespuesta: 'Pendiente',
    hechos: 'Presunto incumplimiento de funciones administrativas relacionadas con el proceso de matrícula del periodo 2024-2.',
    documentosSubidos: 2,
    ultimaActuacion: 'Auto de avocamiento notificado',
    fechaUltimaActuacion: '2025-01-05',
    puedeSubirDescargos: true,
    historial: [
      {
        fecha: '2025-01-05',
        titulo: 'Notificación Auto de Avocamiento',
        descripcion: 'Se notifica auto que define procedimiento y se da traslado para presentar descargos en término de 10 días hábiles.',
        tipo: 'notificacion'
      },
      {
        fecha: '2025-01-02',
        titulo: 'Expediente Recibido',
        descripcion: 'La Oficina Jurídica recibe el expediente desde la OCID para iniciar etapa de juzgamiento.',
        tipo: 'auto'
      }
    ]
  },
  {
    id: '2',
    numero: 'PD-2024-0234',
    etapaActual: 'Práctica Pruebas',
    fechaNotificacion: '2024-08-20',
    fechaLimiteRespuesta: null,
    diasRestantes: null,
    tipoFalta: 'Grave',
    abogadoAsignado: 'Dr. Luis Ramírez',
    estadoRespuesta: 'Presentado',
    hechos: 'Presunta violación al régimen de incompatibilidades e inhabilidades.',
    documentosSubidos: 8,
    ultimaActuacion: 'Auto decreto de pruebas',
    fechaUltimaActuacion: '2024-10-12',
    puedeSubirDescargos: false,
    historial: [
      {
        fecha: '2024-10-12',
        titulo: 'Auto Decreto de Pruebas',
        descripcion: 'Se decreta la práctica de pruebas solicitadas en los descargos presentados.',
        tipo: 'auto'
      },
      {
        fecha: '2024-09-05',
        titulo: 'Descargos Presentados',
        descripcion: 'Usted presentó escrito de descargos y solicitó práctica de pruebas.',
        tipo: 'respuesta'
      },
      {
        fecha: '2024-08-20',
        titulo: 'Notificación Auto de Avocamiento',
        descripcion: 'Se notifica auto que define procedimiento y se da traslado para presentar descargos.',
        tipo: 'notificacion'
      }
    ]
  }
];

export function MisExpedientesLegales({ onVolver }: MisExpedientesLegalesProps) {
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState<Expediente | null>(null);
  const [mostrarModalSubida, setMostrarModalSubida] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [mostrarFormularioDescargos, setMostrarFormularioDescargos] = useState(false);
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([]);
  const [descripcionDescargos, setDescripcionDescargos] = useState('');
  const [mostrandoHistorial, setMostrandoHistorial] = useState(false);

  const expedientesActivos = EXPEDIENTES_MOCK.filter(e => e.estadoRespuesta === 'Pendiente' || e.diasRestantes !== null);
  const expedientesProceso = EXPEDIENTES_MOCK.filter(e => e.estadoRespuesta === 'Presentado' && e.diasRestantes === null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevosArchivos = Array.from(e.target.files);
      setArchivosSeleccionados([...archivosSeleccionados, ...nuevosArchivos]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setArchivosSeleccionados(archivosSeleccionados.filter((_, i) => i !== index));
  };

  const handleSubmitDescargos = () => {
    // Aquí iría la lógica de envío
    alert('Descargos enviados exitosamente');
    setMostrarFormularioDescargos(false);
    setArchivosSeleccionados([]);
    setDescripcionDescargos('');
  };

  const getSemaforoTermino = (dias: number | null) => {
    if (dias === null) return null;
    if (dias <= 2) return { color: '#DC2626', label: 'URGENTE', bg: '#FEE2E2' };
    if (dias <= 5) return { color: '#F59E0B', label: 'Próximo a vencer', bg: '#FEF3C7' };
    return { color: '#10B981', label: 'En término', bg: '#D1FAE5' };
  };

  // Vista de lista de expedientes
  if (!expedienteSeleccionado) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white px-4 py-6 sm:px-6 sm:py-8">
          <div className="max-w-4xl mx-auto">
            {/* Botón de volver al panel (solo si onVolver está definido) */}
            {onVolver && (
              <button
                onClick={() => {
                  console.log('MisExpedientesLegales - Botón Volver clickeado');
                  onVolver();
                }}
                className="flex items-center gap-2 mb-4 hover:bg-white/10 px-2 sm:px-3 py-2 rounded-lg transition-colors text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Volver al Panel Administrativo</span>
              </button>
            )}
            
            <div className="flex items-start gap-3 mb-6">
              <div className="bg-white/20 p-3 rounded-lg flex-shrink-0">
                <Scale className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-black mb-1">Mis Procesos Legales</h1>
                <p className="text-purple-100 text-sm sm:text-base">Expedientes disciplinarios</p>
              </div>
            </div>

            {/* Alertas importantes */}
            {expedientesActivos.length > 0 && (
              <Card className="bg-yellow-50 border-2 border-yellow-300 p-3 sm:p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-yellow-900 mb-1 text-sm sm:text-base">
                      Tienes {expedientesActivos.length} expediente(s) con término para responder
                    </p>
                    <p className="text-xs sm:text-sm text-yellow-800">
                      Es muy importante que presentes tus descargos antes de la fecha límite
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Contenido principal */}
        <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
          {/* Expedientes con término activo */}
          {expedientesActivos.length > 0 && (
            <div>
              <h2 className="font-black text-gray-900 mb-3 flex items-center gap-2 text-base sm:text-lg">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
                <span>Requieren Respuesta</span>
              </h2>
              <div className="space-y-3">
                {expedientesActivos.map((exp) => {
                  const semaforo = getSemaforoTermino(exp.diasRestantes);
                  return (
                    <motion.div
                      key={exp.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card
                        className="p-3 sm:p-4 border-2 cursor-pointer hover:shadow-lg transition-all"
                        style={{ borderColor: semaforo?.color }}
                        onClick={() => setExpedienteSeleccionado(exp)}
                      >
                        <div className="flex justify-between items-start mb-3 gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-gray-900 mb-1 text-sm sm:text-base">{exp.numero}</p>
                            <Badge
                              className="text-[10px] sm:text-xs"
                              style={{
                                background: semaforo?.bg,
                                color: semaforo?.color
                              }}
                            >
                              {semaforo?.label}
                            </Badge>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xl sm:text-2xl font-black" style={{ color: semaforo?.color }}>
                              {exp.diasRestantes}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">días restantes</p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-start gap-2 text-xs sm:text-sm">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-600 break-words">
                              Fecha límite: <span className="font-bold text-gray-900">{exp.fechaLimiteRespuesta}</span>
                            </span>
                          </div>
                          <div className="flex items-start gap-2 text-xs sm:text-sm">
                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-600 break-words">
                              Etapa: <span className="font-bold text-gray-900">{exp.etapaActual}</span>
                            </span>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">{exp.hechos}</p>

                        <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm">
                          <Upload className="w-4 h-4 mr-2" />
                          Presentar Descargos
                        </Button>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expedientes en proceso */}
          {expedientesProceso.length > 0 && (
            <div>
              <h2 className="font-black text-gray-900 mb-3 flex items-center gap-2 text-base sm:text-lg">
                <History className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <span>En Proceso</span>
              </h2>
              <div className="space-y-3">
                {expedientesProceso.map((exp) => (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card
                      className="p-3 sm:p-4 border-2 border-gray-200 cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => setExpedienteSeleccionado(exp)}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-900 mb-1 text-sm sm:text-base break-words">{exp.numero}</p>
                          <Badge className="text-[10px] sm:text-xs bg-blue-100 text-blue-700">
                            {exp.etapaActual}
                          </Badge>
                        </div>
                        <Badge className="bg-green-100 text-green-700 text-[10px] sm:text-xs flex-shrink-0">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Descargos presentados
                        </Badge>
                      </div>

                      <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">{exp.hechos}</p>

                      <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                        <span className="text-gray-600 truncate">
                          Última actuación: {exp.fechaUltimaActuacion}
                        </span>
                        <Eye className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Información general */}
          <Card className="p-3 sm:p-4 bg-blue-50 border-2 border-blue-200">
            <div className="flex gap-2 sm:gap-3">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-xs sm:text-sm flex-1 min-w-0">
                <p className="font-bold text-blue-900">Información importante:</p>
                <ul className="space-y-1 text-blue-800">
                  <li>• Los términos procesales se cuentan en días hábiles</li>
                  <li>• Puedes presentar descargos antes de la fecha límite</li>
                  <li>• Los documentos deben estar en formato PDF</li>
                  <li>• Si necesitas asesoría legal, contacta a tu abogado asignado</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Vista de detalle de expediente
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white px-4 py-4 sm:py-5 sticky top-0 z-50 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              setExpedienteSeleccionado(null);
              setMostrarFormularioDescargos(false);
            }}
            className="flex items-center gap-2 mb-4 hover:bg-white/10 px-2 sm:px-3 py-2 rounded-lg transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Volver a mis expedientes</span>
          </button>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-black mb-1 break-words">{expedienteSeleccionado.numero}</h1>
              <p className="text-purple-100 text-xs sm:text-sm">{expedienteSeleccionado.etapaActual}</p>
            </div>
            {expedienteSeleccionado.diasRestantes !== null && (
              <div className="text-right flex-shrink-0">
                <p className="text-xl sm:text-2xl font-black">{expedienteSeleccionado.diasRestantes}</p>
                <p className="text-[10px] sm:text-xs text-purple-100 whitespace-nowrap">días restantes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-4">
        {/* Alerta de término */}
        {expedienteSeleccionado.puedeSubirDescargos && expedienteSeleccionado.diasRestantes !== null && (
          <Card
            className="p-3 sm:p-4 border-2"
            style={{
              background: getSemaforoTermino(expedienteSeleccionado.diasRestantes)?.bg,
              borderColor: getSemaforoTermino(expedienteSeleccionado.diasRestantes)?.color
            }}
          >
            <div className="flex gap-2 sm:gap-3">
              <AlertTriangle
                className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5"
                style={{ color: getSemaforoTermino(expedienteSeleccionado.diasRestantes)?.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold mb-1 text-sm sm:text-base" style={{ color: getSemaforoTermino(expedienteSeleccionado.diasRestantes)?.color }}>
                  Fecha límite para presentar descargos
                </p>
                <p className="text-xs sm:text-sm font-medium mb-3">
                  {expedienteSeleccionado.fechaLimiteRespuesta}
                </p>
                {!mostrarFormularioDescargos && (
                  <Button
                    onClick={() => setMostrarFormularioDescargos(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm w-full sm:w-auto"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Presentar Descargos Ahora
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Formulario de descargos */}
        <AnimatePresence>
          {mostrarFormularioDescargos && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="p-3 sm:p-4 border-2 border-purple-300">
                <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2 text-base sm:text-lg">
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                  <span>Presentar Descargos</span>
                </h3>

                {/* Área de descripción */}
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                    Argumentos de descargo
                  </label>
                  <textarea
                    value={descripcionDescargos}
                    onChange={(e) => setDescripcionDescargos(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none min-h-[120px] text-sm"
                    placeholder="Explica los argumentos de tu defensa..."
                  />
                </div>

                {/* Área de carga de archivos */}
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                    Documentos de soporte (PDF)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-purple-500 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        Haz clic para seleccionar archivos
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Solo archivos PDF</p>
                    </label>
                  </div>
                </div>

                {/* Lista de archivos seleccionados */}
                {archivosSeleccionados.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs sm:text-sm font-bold text-gray-700">
                      Archivos seleccionados ({archivosSeleccionados.length})
                    </p>
                    {archivosSeleccionados.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 sm:p-3 bg-gray-100 rounded-lg gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Paperclip className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-gray-900 truncate">{file.name}</span>
                          <span className="text-[10px] sm:text-xs text-gray-500 flex-shrink-0">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                        >
                          <XIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    onClick={handleSubmitDescargos}
                    disabled={!descripcionDescargos.trim() || archivosSeleccionados.length === 0}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Enviar Descargos
                  </Button>
                  <Button
                    onClick={() => {
                      setMostrarFormularioDescargos(false);
                      setArchivosSeleccionados([]);
                      setDescripcionDescargos('');
                    }}
                    variant="outline"
                    className="border-2 text-sm"
                  >
                    Cancelar
                  </Button>
                </div>

                {/* Advertencia legal */}
                <div className="mt-4 p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-yellow-800">
                    <strong>Importante:</strong> Una vez enviados los descargos, no podrás modificarlos. 
                    Asegúrate de incluir todos los documentos y argumentos necesarios.
                  </p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Información del expediente */}
        <Card className="p-3 sm:p-4 border-2 border-gray-200">
          <h3 className="font-black text-gray-900 mb-3 text-base sm:text-lg">Información del Expediente</h3>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 mb-1">TIPO DE FALTA</p>
              <Badge
                className="text-xs sm:text-sm"
                style={{
                  background: expedienteSeleccionado.tipoFalta === 'Gravísima' ? '#FEE2E2' :
                             expedienteSeleccionado.tipoFalta === 'Grave' ? '#FEF3C7' : '#DBEAFE',
                  color: expedienteSeleccionado.tipoFalta === 'Gravísima' ? '#991B1B' :
                         expedienteSeleccionado.tipoFalta === 'Grave' ? '#92400E' : '#1E40AF'
                }}
              >
                {expedienteSeleccionado.tipoFalta}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 mb-1">HECHOS INVESTIGADOS</p>
              <p className="text-xs sm:text-sm text-gray-900">{expedienteSeleccionado.hechos}</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 mb-1">ABOGADO SUSTANCIADOR</p>
              <div className="flex items-center gap-2">
                <Avatar className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-100">
                  <AvatarFallback className="text-purple-700 text-[10px] sm:text-xs">
                    {expedienteSeleccionado.abogadoAsignado.split(' ')[1]?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs sm:text-sm font-bold text-gray-900">
                  {expedienteSeleccionado.abogadoAsignado}
                </span>
              </div>
            </div>
            {expedienteSeleccionado.documentosSubidos > 0 && (
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-gray-500 mb-1">DOCUMENTOS PRESENTADOS</p>
                <div className="flex items-center gap-2">
                  <Paperclip className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                  <span className="text-xs sm:text-sm text-gray-900">
                    {expedienteSeleccionado.documentosSubidos} documento(s) subido(s)
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Historial de actuaciones */}
        <Card className="p-3 sm:p-4 border-2 border-gray-200">
          <button
            onClick={() => setMostrandoHistorial(!mostrandoHistorial)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="font-black text-gray-900 flex items-center gap-2 text-base sm:text-lg">
              <History className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
              <span>Historial de Actuaciones</span>
            </h3>
            {mostrandoHistorial ? (
              <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
            )}
          </button>

          <AnimatePresence>
            {mostrandoHistorial && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <div className="space-y-3 sm:space-y-4">
                  {expedienteSeleccionado.historial.map((actuacion, index) => (
                    <div key={index} className="flex gap-2 sm:gap-3">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div
                          className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                          style={{
                            background: index === 0 ? '#6F42C1' : '#D1D5DB'
                          }}
                        />
                        {index < expedienteSeleccionado.historial.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-300 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-3 sm:pb-4 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-1 gap-1">
                          <p className="font-bold text-gray-900 text-xs sm:text-sm break-words">{actuacion.titulo}</p>
                          {index === 0 && (
                            <Badge className="bg-purple-100 text-purple-700 text-[10px] sm:text-xs flex-shrink-0 w-fit">
                              Reciente
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-600 mb-1 sm:mb-2">{actuacion.fecha}</p>
                        <p className="text-xs sm:text-sm text-gray-700">{actuacion.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Asesoría legal */}
        <Card className="p-3 sm:p-4 bg-purple-50 border-2 border-purple-200">
          <div className="flex gap-2 sm:gap-3">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-purple-900 mb-2 text-sm sm:text-base">¿Necesitas asesoría legal?</p>
              <p className="text-xs sm:text-sm text-purple-800 mb-3">
                Tienes derecho a ser asesorado por un abogado de tu elección. 
                También puedes solicitar copias del expediente completo.
              </p>
              <Button variant="outline" className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 text-xs sm:text-sm w-full sm:w-auto">
                <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Descargar Expediente Completo
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}