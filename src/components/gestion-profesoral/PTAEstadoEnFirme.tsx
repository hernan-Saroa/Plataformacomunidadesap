/**
 * COMPONENTE: ESTADO EN FIRME DEL PTA
 * 
 * Muestra información del PTA congelado y gestiona solicitudes de modificación
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  LockOpen,
  Shield,
  FileCheck,
  AlertTriangle,
  Calendar,
  User,
  Hash,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Edit,
  Send,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { PTAEnFirmeService, type PTAEnFirme, type SolicitudModificacionPTA, MENSAJES_BLOQUEO_EN_FIRME } from '../../services/pta/ptaEnFirmeService';

interface PTAEstadoEnFirmeProps {
  pta: any;
  usuarioActual?: {
    id: string;
    nombre: string;
    rol: string;
  };
  onSolicitarModificacion?: () => void;
}

export function PTAEstadoEnFirme({ 
  pta, 
  usuarioActual,
  onSolicitarModificacion 
}: PTAEstadoEnFirmeProps) {
  
  const [expandido, setExpandido] = useState(false);
  const [mostrandoSolicitudes, setMostrandoSolicitudes] = useState(false);
  
  // Obtener información del PTA EN FIRME
  const ptaEnFirme = PTAEnFirmeService.obtenerPTAEnFirme(pta.id);
  
  if (!ptaEnFirme) {
    return null; // Solo mostrar si está EN FIRME
  }
  
  // Verificar integridad
  const integridadValida = PTAEnFirmeService.verificarIntegridad(ptaEnFirme);
  
  // Obtener solicitudes de modificación
  const solicitudes = PTAEnFirmeService.obtenerSolicitudesModificacion(pta.id);
  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'PENDIENTE');
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="space-y-4">
      {/* Tarjeta principal EN FIRME */}
      <Card className="p-6 border-l-4 border-purple-500 bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-900">
                  PTA EN FIRME
                </h3>
                <p className="text-sm text-purple-700">
                  Versión oficial congelada para ejecución
                </p>
              </div>
              <Badge className="bg-purple-600 ml-auto">
                🟣 BLOQUEADO
              </Badge>
            </div>
            
            {/* Información de bloqueo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-gray-600">Fecha de aprobación final</p>
                  <p className="font-bold text-gray-900">
                    {formatDate(ptaEnFirme.fecha_paso_en_firme)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-gray-600">Aprobado por</p>
                  <p className="font-bold text-gray-900">
                    {ptaEnFirme.aprobado_por_nivel_3}
                  </p>
                  <p className="text-xs text-gray-500">{ptaEnFirme.cargo_aprobador}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-gray-600">Hash de integridad</p>
                  <p className="font-mono text-xs font-bold text-purple-700">
                    {ptaEnFirme.hash_integridad}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Verificación de integridad */}
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              integridadValida 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {integridadValida ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-bold text-green-900 text-sm">
                      ✓ Integridad Verificada
                    </p>
                    <p className="text-xs text-green-700">
                      El PTA no ha sido modificado desde su aprobación final
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div className="flex-1">
                    <p className="font-bold text-red-900 text-sm">
                      ⚠️ Alerta de Integridad
                    </p>
                    <p className="text-xs text-red-700">
                      El hash de integridad no coincide. Contacte al administrador.
                    </p>
                  </div>
                </>
              )}
            </div>
            
            {/* Mensaje de restricción */}
            <div className="mt-4 p-4 bg-purple-100 border border-purple-300 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-purple-700 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-purple-900 text-sm mb-1">
                    Restricciones del Estado EN FIRME
                  </p>
                  <ul className="text-xs text-purple-800 space-y-1">
                    <li>• No se pueden modificar componentes ni actividades directamente</li>
                    <li>• Solo puedes cargar evidencias y actualizar el cumplimiento</li>
                    <li>• Para cambios mayores, debes solicitar una modificación extraordinaria</li>
                    <li>• La solicitud requiere aprobación de la Subdirección Nacional Académica</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Acciones */}
            <div className="flex items-center gap-3 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandido(!expandido)}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                {expandido ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Ocultar Detalles
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Ver Detalles Completos
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrandoSolicitudes(!mostrandoSolicitudes)}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                Solicitudes ({solicitudes.length})
                {solicitudesPendientes.length > 0 && (
                  <Badge className="ml-2 bg-orange-600 text-white">
                    {solicitudesPendientes.length} pendientes
                  </Badge>
                )}
              </Button>
              
              {onSolicitarModificacion && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSolicitarModificacion}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Solicitar Modificación
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
      
      {/* Panel expandible: Detalles completos */}
      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-6">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-600" />
                Snapshot del PTA Congelado
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Información básica */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-bold text-gray-700 mb-2">Información Básica</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-600">Código PTA:</span> <span className="font-mono font-bold">{ptaEnFirme.version_congelada.codigo}</span></p>
                    <p><span className="text-gray-600">Período:</span> <span className="font-bold">{ptaEnFirme.version_congelada.periodo}</span></p>
                    <p><span className="text-gray-600">Horas Programables:</span> <span className="font-bold">{ptaEnFirme.version_congelada.horas_programables}h</span></p>
                    <p><span className="text-gray-600">Versión Snapshot:</span> <span className="font-mono text-xs">{ptaEnFirme.version_congelada.snapshot_version}</span></p>
                  </div>
                </div>
                
                {/* Componentes */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-bold text-gray-700 mb-2">Distribución de Horas</p>
                  <div className="space-y-1 text-sm">
                    <p className="flex justify-between">
                      <span className="text-gray-600">Docencia:</span>
                      <span className="font-bold">{ptaEnFirme.version_congelada.componente_docencia?.horas || 0}h</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-600">Investigación:</span>
                      <span className="font-bold">{ptaEnFirme.version_congelada.componente_investigacion?.horas || 0}h</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-600">Extensión:</span>
                      <span className="font-bold">{ptaEnFirme.version_congelada.componente_extension?.horas || 0}h</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-600">Complementarias:</span>
                      <span className="font-bold">{ptaEnFirme.version_congelada.componente_complementarias?.horas || 0}h</span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Historial de aprobaciones */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-bold text-blue-900 mb-2">Historial de Aprobaciones</p>
                <div className="space-y-2">
                  {ptaEnFirme.version_congelada.fecha_aprobacion_nivel_1 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">Nivel 1:</span>
                      <span className="font-bold">{ptaEnFirme.version_congelada.aprobador_nivel_1}</span>
                      <span className="text-gray-500 text-xs">
                        {formatDate(ptaEnFirme.version_congelada.fecha_aprobacion_nivel_1)}
                      </span>
                    </div>
                  )}
                  {ptaEnFirme.version_congelada.fecha_aprobacion_nivel_2 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">Nivel 2:</span>
                      <span className="font-bold">{ptaEnFirme.version_congelada.aprobador_nivel_2}</span>
                      <span className="text-gray-500 text-xs">
                        {formatDate(ptaEnFirme.version_congelada.fecha_aprobacion_nivel_2)}
                      </span>
                    </div>
                  )}
                  {ptaEnFirme.version_congelada.fecha_aprobacion_nivel_3 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">Nivel 3:</span>
                      <span className="font-bold">{ptaEnFirme.version_congelada.aprobador_nivel_3}</span>
                      <span className="text-gray-500 text-xs">
                        {formatDate(ptaEnFirme.version_congelada.fecha_aprobacion_nivel_3)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Panel de solicitudes */}
      <AnimatePresence>
        {mostrandoSolicitudes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-6">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Solicitudes de Modificación
                {solicitudesPendientes.length > 0 && (
                  <Badge className="bg-orange-600">
                    {solicitudesPendientes.length} pendientes
                  </Badge>
                )}
              </h4>
              
              {solicitudes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay solicitudes de modificación</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {solicitudes.map((solicitud) => (
                    <SolicitudModificacionCard
                      key={solicitud.id}
                      solicitud={solicitud}
                      usuarioActual={usuarioActual}
                      ptaId={pta.id}
                    />
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Tarjeta de solicitud de modificación
 */
interface SolicitudModificacionCardProps {
  solicitud: SolicitudModificacionPTA;
  usuarioActual?: {
    id: string;
    nombre: string;
    rol: string;
  };
  ptaId: string;
}

function SolicitudModificacionCard({ 
  solicitud, 
  usuarioActual,
  ptaId 
}: SolicitudModificacionCardProps) {
  
  const [expandido, setExpandido] = useState(false);
  
  const estadoConfig = {
    PENDIENTE: {
      color: 'bg-orange-100 text-orange-700 border-orange-300',
      icon: Clock,
      label: 'Pendiente'
    },
    APROBADA: {
      color: 'bg-green-100 text-green-700 border-green-300',
      icon: CheckCircle,
      label: 'Aprobada'
    },
    RECHAZADA: {
      color: 'bg-red-100 text-red-700 border-red-300',
      icon: XCircle,
      label: 'Rechazada'
    }
  }[solicitud.estado];
  
  const Icon = estadoConfig.icon;
  
  const handleAprobar = () => {
    if (!usuarioActual) return;
    
    const exito = PTAEnFirmeService.aprobarSolicitudModificacion(
      solicitud.id,
      ptaId,
      {
        id: usuarioActual.id,
        nombre: usuarioActual.nombre
      },
      'Aprobada la modificación solicitada'
    );
    
    if (exito) {
      toast.success('Solicitud aprobada exitosamente');
      window.location.reload(); // Recargar para ver cambios
    }
  };
  
  const handleRechazar = () => {
    if (!usuarioActual) return;
    
    const observaciones = prompt('Observaciones del rechazo:');
    if (!observaciones) return;
    
    const exito = PTAEnFirmeService.rechazarSolicitudModificacion(
      solicitud.id,
      ptaId,
      {
        id: usuarioActual.id,
        nombre: usuarioActual.nombre
      },
      observaciones
    );
    
    if (exito) {
      toast.success('Solicitud rechazada');
      window.location.reload();
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <Card className={`p-4 border-l-4 ${
      solicitud.estado === 'PENDIENTE' ? 'border-orange-500' :
      solicitud.estado === 'APROBADA' ? 'border-green-500' :
      'border-red-500'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={estadoConfig.color}>
              <Icon className="w-3 h-3 mr-1" />
              {estadoConfig.label}
            </Badge>
            <span className="text-xs text-gray-500">
              {formatDate(solicitud.fecha_solicitud)}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-1">
            <span className="font-bold">Solicitante:</span> {solicitud.solicitante_nombre}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-bold">Motivo:</span> {solicitud.motivo_solicitud}
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpandido(!expandido)}
        >
          {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>
      
      {/* Cambios propuestos */}
      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t"
          >
            <p className="text-sm font-bold text-gray-700 mb-2">Cambios Propuestos:</p>
            <div className="space-y-2">
              {solicitud.cambios_propuestos.map((cambio, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded text-xs">
                  <p className="font-bold text-gray-900 mb-1">
                    {cambio.componente} → {cambio.campo}
                  </p>
                  <p className="text-gray-600 mb-1">
                    <span className="font-medium">Actual:</span> {JSON.stringify(cambio.valor_actual)}
                  </p>
                  <p className="text-gray-600 mb-1">
                    <span className="font-medium">Propuesto:</span> {JSON.stringify(cambio.valor_propuesto)}
                  </p>
                  <p className="text-gray-700 italic">
                    "{cambio.justificacion}"
                  </p>
                </div>
              ))}
            </div>
            
            {/* Respuesta (si existe) */}
            {solicitud.fecha_respuesta && (
              <div className="mt-3 p-3 bg-blue-50 rounded">
                <p className="text-xs font-bold text-blue-900 mb-1">
                  Respuesta de {solicitud.aprobador_nombre}
                </p>
                <p className="text-xs text-blue-700">
                  {solicitud.observaciones_respuesta}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {formatDate(solicitud.fecha_respuesta)}
                </p>
              </div>
            )}
            
            {/* Acciones (solo si pendiente y usuario es admin) */}
            {solicitud.estado === 'PENDIENTE' && usuarioActual?.rol === 'admin' && (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAprobar}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprobar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRechazar}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/**
 * Mensaje de bloqueo para mostrar cuando intenten editar
 */
export function MensajeBloqueoEnFirme({ tipo = 'EDICION_BLOQUEADA' }: { tipo?: keyof typeof MENSAJES_BLOQUEO_EN_FIRME }) {
  return (
    <div className="p-4 bg-purple-50 border border-purple-300 rounded-lg">
      <div className="flex items-start gap-3">
        <Lock className="w-5 h-5 text-purple-700 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-purple-900 text-sm mb-1">
            PTA Bloqueado
          </p>
          <p className="text-sm text-purple-800">
            {MENSAJES_BLOQUEO_EN_FIRME[tipo]}
          </p>
        </div>
      </div>
    </div>
  );
}
