/**
 * ============================================
 * MODAL DETALLE COMPLETO: REQUERIMIENTO ÓRGANO DE CONTROL
 * ============================================
 * 
 * REQ-MOD02-001: BLOQUE 6 - Modal de Detalle Completo
 * 
 * FUNCIONALIDADES:
 * ✅ A1: Header con ID, radicado, badges de tipo y estado
 * ✅ A2: Sección "Información General" (órgano, tipo, fecha, territorial, docs)
 * ✅ A3: Sección "Plazos y Alertas" (barra progreso, días restantes, vencimiento)
 * ✅ A4: Sección "Descripción" (editable/readonly según estado)
 * ✅ A5: Sección "Responsable" (abogado asignado con avatar)
 * ✅ A6: Sección "Respuesta Draft" (editable en EN_PREPARACION)
 * ✅ A7: Sección "Observaciones de Revisión" (visible en EN_REVISION)
 * ✅ A8: Sección "Información de Envío" (visible en ENVIADA/RESUELTA)
 * ✅ A9: Botones de acción según estado del requerimiento
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Shield,
  Calendar,
  Clock,
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Building2,
  Paperclip,
  Send,
  PlayCircle,
  CheckCheck,
  XCircle,
  Mail,
  Download,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { toast } from 'sonner@2.0.3';
import { TextareaSIGL } from '../design-system';
import { calcularInfoPlazo, formatearFecha } from '../../../../utils/calcularDiasHabiles';
import {
  validarTransicion,
  generarMetadataEnvio,
  generarEntradaHistorial,
  type UsuarioActual,
  type RolUsuario,
  type EstadoRequerimiento as EstadoValidacion,
} from '../../../../utils/validacionesTransicionesEstado';

// ==================== TIPOS ====================

type OrganoControl =
  | 'Contraloría General de la República'
  | 'Procuraduría General de la Nación'
  | 'Defensoría del Pueblo'
  | 'DANE'
  | 'Superintendencia de Educación'
  | 'Otro';

type TipoRequerimiento = 'INFORMACION' | 'AJUSTE';

type EstadoRequerimiento =
  | 'RECIBIDO'
  | 'EN_PREPARACION'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'ENVIADA'
  | 'RESUELTA';

type ColorAlerta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';

interface Requerimiento {
  id: string;
  organoControl: OrganoControl;
  tipo: TipoRequerimiento;
  numeroRadicado: string;
  fechaRecepcion: Date;
  fechaVencimiento: Date;
  diasTotales: number;
  diasRestantes: number;
  colorAlerta: ColorAlerta;
  descripcion: string;
  respuestaDraft: string;
  abogadoAsignado: string;
  estado: EstadoRequerimiento;
  territorial: string;
  documentosAdjuntos: number;
  observacionesRevision?: string;
  fechaEnvio?: Date;
  emailEnvio?: string;
  linkActiveDocument?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ModalDetalleRequerimientoProps {
  isOpen: boolean;
  onClose: () => void;
  requerimiento: Requerimiento;
  onActualizar: (requerimiento: Partial<Requerimiento>) => void;
  usuarioActual: UsuarioActual;
  rolUsuario: RolUsuario;
}

// ==================== CONFIGURACIÓN DE COLORES ====================

const ESTADO_CONFIG: Record<
  EstadoRequerimiento,
  { color: string; label: string; bgColor: string }
> = {
  RECIBIDO: { color: '#6366F1', label: 'Recibido', bgColor: 'bg-indigo-100 text-indigo-800' },
  EN_PREPARACION: { color: '#F59E0B', label: 'En Análisis', bgColor: 'bg-orange-100 text-orange-800' },
  EN_REVISION: { color: '#8B5CF6', label: 'En Revisión', bgColor: 'bg-purple-100 text-purple-800' },
  APROBADA: { color: '#EC4899', label: 'Aprobada', bgColor: 'bg-pink-100 text-pink-800' },
  ENVIADA: { color: '#10B981', label: 'Enviada', bgColor: 'bg-green-100 text-green-800' },
  RESUELTA: { color: '#6B7280', label: 'Resuelta', bgColor: 'bg-gray-100 text-gray-800' },
};

const ALERTA_CONFIG: Record<
  ColorAlerta,
  { icon: any; color: string; bgColor: string; label: string }
> = {
  VERDE: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    label: 'En tiempo',
  },
  AMARILLO: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    label: 'Precaución',
  },
  ROJO: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    label: 'Urgente',
  },
  VENCIDO: {
    icon: AlertTriangle,
    color: 'text-red-900',
    bgColor: 'bg-red-100 border-red-300',
    label: 'Vencido',
  },
};

// ==================== COMPONENTE PRINCIPAL ====================

export function ModalDetalleRequerimiento({
  isOpen,
  onClose,
  requerimiento,
  onActualizar,
  usuarioActual,
  rolUsuario,
}: ModalDetalleRequerimientoProps) {
  const [respuestaDraft, setRespuestaDraft] = useState(requerimiento.respuestaDraft);
  const [observaciones, setObservaciones] = useState('');
  const [descripcionLocal, setDescripcionLocal] = useState(requerimiento.descripcion);

  // Verificar si el estado permite edición
  const esEditable = requerimiento.estado !== 'RESUELTA' && requerimiento.estado !== 'ENVIADA';
  const puedeEditarRespuesta = requerimiento.estado === 'EN_PREPARACION';

  // Calcular información de plazo actualizada
  const infoPlazo = calcularInfoPlazo(requerimiento.fechaRecepcion, requerimiento.diasTotales);
  const porcentajeTranscurrido = ((requerimiento.diasTotales - requerimiento.diasRestantes) / requerimiento.diasTotales) * 100;

  // ==================== HANDLERS DE ACCIONES ====================

  const handleIniciarAnalisis = () => {
    const validacion = validarTransicion(
      requerimiento.estado,
      'EN_PREPARACION',
      requerimiento,
      usuarioActual
    );
    
    if (!validacion.permitida) {
      toast.error('❌ Error', {
        description: validacion.mensaje,
      });
      return;
    }

    onActualizar({ estado: 'EN_PREPARACION' });
    toast.success('✅ Análisis iniciado', {
      description: 'El requerimiento está ahora en preparación',
    });
    onClose();
  };

  const handleEnviarARevision = () => {
    const validacion = validarTransicion(
      requerimiento.estado,
      'EN_REVISION',
      { ...requerimiento, respuestaDraft },
      usuarioActual
    );
    
    if (!validacion.permitida) {
      toast.error('❌ Error', {
        description: validacion.mensaje,
      });
      return;
    }

    onActualizar({
      estado: 'EN_REVISION',
      respuestaDraft: respuestaDraft,
    });
    toast.success('✅ Enviado a revisión', {
      description: 'El Jefe de Oficina Jurídica revisará la respuesta',
    });
    onClose();
  };

  const handleAprobar = () => {
    const validacion = validarTransicion(
      requerimiento.estado,
      'APROBADA',
      requerimiento,
      usuarioActual
    );
    
    if (!validacion.permitida) {
      toast.error('❌ Error', {
        description: validacion.mensaje,
      });
      return;
    }

    onActualizar({ estado: 'APROBADA' });
    toast.success('✅ Respuesta aprobada', {
      description: 'La respuesta está lista para ser enviada',
    });
    onClose();
  };

  const handleDevolver = () => {
    const validacion = validarTransicion(
      requerimiento.estado,
      'EN_PREPARACION',
      requerimiento,
      usuarioActual,
      { observaciones }
    );
    
    if (!validacion.permitida) {
      toast.error('❌ Error', {
        description: validacion.mensaje,
      });
      return;
    }

    onActualizar({
      estado: 'EN_PREPARACION',
      observacionesRevision: observaciones,
    });
    toast.warning('⚠️ Devuelto para correcciones', {
      description: 'El abogado recibirá las observaciones',
    });
    onClose();
  };

  const handleEnviarRespuesta = () => {
    const validacion = validarTransicion(
      requerimiento.estado,
      'ENVIADA',
      requerimiento,
      usuarioActual
    );
    
    if (!validacion.permitida) {
      toast.error('❌ Error', {
        description: validacion.mensaje,
      });
      return;
    }

    const fechaEnvio = new Date();
    const metadata = generarMetadataEnvio(requerimiento, usuarioActual);

    onActualizar({
      estado: 'ENVIADA',
      fechaEnvio: metadata.fechaEnvio,
      emailEnvio: metadata.emailEnvio,
      linkActiveDocument: metadata.linkActiveDocument,
    });
    toast.success('✅ Respuesta enviada', {
      description: `Enviado el ${formatearFecha(fechaEnvio)}`,
    });
    onClose();
  };

  const handleMarcarResuelta = () => {
    const validacion = validarTransicion(
      requerimiento.estado,
      'RESUELTA',
      requerimiento,
      usuarioActual
    );
    
    if (!validacion.permitida) {
      toast.error('❌ Error', {
        description: validacion.mensaje,
      });
      return;
    }

    onActualizar({ estado: 'RESUELTA' });
    toast.success('✅ Requerimiento resuelto', {
      description: 'El caso ha sido cerrado exitosamente',
    });
    onClose();
  };

  const handleGenerarReporte = () => {
    toast.info('📄 Generando reporte...', {
      description: 'Función de generación de PDF en desarrollo',
    });
  };

  // ==================== RENDER ====================

  if (!isOpen) return null;

  const estadoConfig = ESTADO_CONFIG[requerimiento.estado];
  const alertaConfig = ALERTA_CONFIG[requerimiento.colorAlerta];
  const AlertaIcon = alertaConfig.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto pt-20 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-5xl bg-white rounded-xl shadow-2xl m-4"
        >
          {/* ==================== HEADER ==================== */}
          <div className="relative bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-xl">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                <Shield className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{requerimiento.id}</h2>
                  <Badge className={`${estadoConfig.bgColor} text-sm px-3 py-1`}>
                    {estadoConfig.label}
                  </Badge>
                  <Badge
                    className={`${
                      requerimiento.tipo === 'INFORMACION'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-orange-100 text-orange-800'
                    } text-sm px-3 py-1`}
                  >
                    {requerimiento.tipo === 'INFORMACION' ? 'Información' : 'Ajuste'}
                  </Badge>
                </div>
                <p className="text-white/90 text-sm">Radicado: {requerimiento.numeroRadicado}</p>
              </div>
            </div>
          </div>

          {/* ==================== CONTENIDO ==================== */}
          <div className="p-6 space-y-6 max-h-[calc(100vh-240px)] overflow-y-auto">
            {/* A2: INFORMACIÓN GENERAL */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-red-600" />
                Información General
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem
                  icon={<Building2 className="w-4 h-4 text-gray-500" />}
                  label="Órgano de Control"
                  value={requerimiento.organoControl}
                />
                <InfoItem
                  icon={<FileText className="w-4 h-4 text-gray-500" />}
                  label="Tipo de Requerimiento"
                  value={requerimiento.tipo === 'INFORMACION' ? 'Información' : 'Ajuste'}
                />
                <InfoItem
                  icon={<Calendar className="w-4 h-4 text-gray-500" />}
                  label="Fecha de Recepción"
                  value={formatearFecha(requerimiento.fechaRecepcion)}
                />
                <InfoItem
                  icon={<Building2 className="w-4 h-4 text-gray-500" />}
                  label="Territorial"
                  value={requerimiento.territorial}
                />
                <InfoItem
                  icon={<Paperclip className="w-4 h-4 text-gray-500" />}
                  label="Documentos Adjuntos"
                  value={`${requerimiento.documentosAdjuntos} archivo(s)`}
                />
                <InfoItem
                  icon={<Calendar className="w-4 h-4 text-gray-500" />}
                  label="Fecha de Vencimiento"
                  value={formatearFecha(requerimiento.fechaVencimiento)}
                  highlight={requerimiento.colorAlerta === 'ROJO' || requerimiento.colorAlerta === 'VENCIDO'}
                />
              </div>
            </section>

            {/* A3: PLAZOS Y ALERTAS */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" />
                Plazos y Alertas
              </h3>

              {/* Card de Alerta Visual */}
              <div
                className={`p-4 rounded-lg border-2 ${alertaConfig.bgColor} mb-4`}
              >
                <div className="flex items-center gap-3">
                  <AlertaIcon className={`w-8 h-8 ${alertaConfig.color}`} />
                  <div className="flex-1">
                    <p className={`font-bold ${alertaConfig.color}`}>{alertaConfig.label}</p>
                    <p className="text-sm text-gray-700">
                      {requerimiento.diasRestantes > 0
                        ? `${requerimiento.diasRestantes} días hábiles restantes de ${requerimiento.diasTotales} días totales`
                        : `Vencido hace ${Math.abs(requerimiento.diasRestantes)} días hábiles`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-bold ${alertaConfig.color}`}>
                      {Math.round(porcentajeTranscurrido)}%
                    </p>
                    <p className="text-xs text-gray-600">Transcurrido</p>
                  </div>
                </div>
              </div>

              {/* Barra de Progreso */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progreso del plazo</span>
                  <span>
                    {requerimiento.diasTotales - requerimiento.diasRestantes} / {requerimiento.diasTotales} días
                  </span>
                </div>
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(porcentajeTranscurrido, 100)}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`h-full ${
                      requerimiento.colorAlerta === 'VERDE'
                        ? 'bg-green-500'
                        : requerimiento.colorAlerta === 'AMARILLO'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                  />
                </div>
              </div>
            </section>

            {/* A4: DESCRIPCIÓN */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                Descripción del Requerimiento
              </h3>
              <TextareaSIGL
                value={descripcionLocal}
                onChange={(e) => setDescripcionLocal(e.target.value)}
                rows={4}
                disabled={!esEditable}
                className={!esEditable ? 'bg-gray-50 cursor-not-allowed' : ''}
              />
              {!esEditable && (
                <p className="text-xs text-gray-500 mt-2">
                  ⓘ La descripción no puede editarse en este estado
                </p>
              )}
            </section>

            {/* A5: RESPONSABLE */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-red-600" />
                Responsable
              </h3>
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {requerimiento.abogadoAsignado.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{requerimiento.abogadoAsignado}</p>
                  <p className="text-sm text-gray-600">Abogado Asignado</p>
                  <p className="text-xs text-gray-500 mt-1">
                    📧 {requerimiento.abogadoAsignado.toLowerCase().replace(/\s+/g, '.')}@esap.edu.co
                  </p>
                </div>
              </div>
            </section>

            {/* A6: RESPUESTA DRAFT */}
            {(requerimiento.estado === 'EN_PREPARACION' ||
              requerimiento.estado === 'EN_REVISION' ||
              requerimiento.estado === 'APROBADA' ||
              requerimiento.estado === 'ENVIADA' ||
              requerimiento.estado === 'RESUELTA') && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  Respuesta Preparada
                  {puedeEditarRespuesta && (
                    <Badge className="bg-orange-100 text-orange-800 text-xs">Editable</Badge>
                  )}
                </h3>
                <TextareaSIGL
                  value={respuestaDraft}
                  onChange={(e) => setRespuestaDraft(e.target.value)}
                  placeholder="Escribe aquí la respuesta al requerimiento..."
                  rows={6}
                  disabled={!puedeEditarRespuesta}
                  className={!puedeEditarRespuesta ? 'bg-gray-50' : ''}
                />
                {puedeEditarRespuesta && (
                  <p className="text-xs text-gray-500 mt-2">
                    {respuestaDraft.length} caracteres
                  </p>
                )}
              </section>
            )}

            {/* A7: OBSERVACIONES DE REVISIÓN */}
            {requerimiento.estado === 'EN_REVISION' && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-purple-600" />
                  Observaciones de Revisión
                  <Badge className="bg-purple-100 text-purple-800 text-xs">Solo Jefe OJ</Badge>
                </h3>
                <TextareaSIGL
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Si devuelves el requerimiento, escribe aquí las observaciones..."
                  rows={4}
                />
              </section>
            )}

            {/* Mostrar observaciones previas si existen */}
            {requerimiento.observacionesRevision && requerimiento.estado === 'EN_PREPARACION' && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Observaciones Recibidas
                </h3>
                <div className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
                  <p className="text-sm text-gray-700">{requerimiento.observacionesRevision}</p>
                </div>
              </section>
            )}

            {/* A8: INFORMACIÓN DE ENVÍO */}
            {(requerimiento.estado === 'ENVIADA' || requerimiento.estado === 'RESUELTA') &&
              requerimiento.fechaEnvio && (
                <section>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Send className="w-5 h-5 text-green-600" />
                    Información de Envío
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoItem
                      icon={<Calendar className="w-4 h-4 text-gray-500" />}
                      label="Fecha de Envío"
                      value={formatearFecha(requerimiento.fechaEnvio)}
                    />
                    <InfoItem
                      icon={<Mail className="w-4 h-4 text-gray-500" />}
                      label="Email de Envío"
                      value={requerimiento.emailEnvio || 'No registrado'}
                    />
                  </div>
                  {requerimiento.linkActiveDocument && (
                    <div className="mt-3">
                      <button className="text-sm text-blue-600 hover:underline flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Ver documento en Active Document
                      </button>
                    </div>
                  )}
                </section>
              )}
          </div>

          {/* ==================== FOOTER: BOTONES DE ACCIÓN ==================== */}
          <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-xl">
            <div className="flex items-center justify-between gap-3">
              {/* Botón "Generar Reporte" siempre visible */}
              <Button variant="outline" onClick={handleGenerarReporte} className="flex-shrink-0">
                <Download className="w-4 h-4 mr-2" />
                Generar Reporte
              </Button>

              {/* Botones de acción según estado */}
              <div className="flex items-center gap-3">
                {requerimiento.estado === 'RECIBIDO' && (
                  <Button onClick={handleIniciarAnalisis} className="bg-blue-600 hover:bg-blue-700">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Iniciar Análisis
                  </Button>
                )}

                {requerimiento.estado === 'EN_PREPARACION' && (
                  <Button onClick={handleEnviarARevision} className="bg-purple-600 hover:bg-purple-700">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Enviar a Revisión
                  </Button>
                )}

                {requerimiento.estado === 'EN_REVISION' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleDevolver}
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Devolver
                    </Button>
                    <Button onClick={handleAprobar} className="bg-green-600 hover:bg-green-700">
                      <CheckCheck className="w-4 h-4 mr-2" />
                      Aprobar
                    </Button>
                  </>
                )}

                {requerimiento.estado === 'APROBADA' && (
                  <Button onClick={handleEnviarRespuesta} className="bg-green-600 hover:bg-green-700">
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Respuesta
                  </Button>
                )}

                {requerimiento.estado === 'ENVIADA' && (
                  <Button onClick={handleMarcarResuelta} className="bg-gray-600 hover:bg-gray-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marcar como Resuelta
                  </Button>
                )}

                {requerimiento.estado === 'RESUELTA' && (
                  <Badge className="bg-gray-100 text-gray-700 px-4 py-2">
                    ✅ Caso Cerrado
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ==================== COMPONENTE AUXILIAR ====================

function InfoItem({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs text-gray-600">{label}</p>
      </div>
      <p className={`font-bold ${highlight ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}