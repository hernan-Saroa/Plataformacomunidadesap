/**
 * ModalDetalleSolicitudInforme - Vista completa de solicitud de informe
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Textarea } from '../../../ui/textarea';
import {
  FileText, Calendar, User, Building, Clock, X, AlertCircle,
  CheckCircle, Target, Edit, Send, Download, Upload, MessageSquare,
  Paperclip, AlertTriangle
} from 'lucide-react';
import { SolicitudInforme, EtapaSolicitudInforme } from '../core/types';
import { toast } from 'sonner@2.0.3';

interface ModalDetalleSolicitudInformeProps {
  isOpen: boolean;
  onClose: () => void;
  solicitud: SolicitudInforme | null;
  onCambiarEtapa: (id: string, nuevaEtapa: EtapaSolicitudInforme) => void;
  onAgregarComentario: (id: string, comentario: string) => void;
}

export function ModalDetalleSolicitudInforme({
  isOpen,
  onClose,
  solicitud,
  onCambiarEtapa,
  onAgregarComentario
}: ModalDetalleSolicitudInformeProps) {
  const [comentarioNuevo, setComentarioNuevo] = useState('');
  const [mostrarCambioEtapa, setMostrarCambioEtapa] = useState(false);

  if (!solicitud) return null;

  const diasRestantes = solicitud.diasRestantes;
  let semaforoColor = '#10B981';
  let semaforoBg = '#D1FAE5';
  let semaforoTexto = 'En término';
  
  if (diasRestantes <= 0) {
    semaforoColor = '#DC2626';
    semaforoBg = '#FEE2E2';
    semaforoTexto = 'VENCIDO';
  } else if (diasRestantes <= 2) {
    semaforoColor = '#DC2626';
    semaforoBg = '#FEE2E2';
    semaforoTexto = 'CRÍTICO';
  } else if (diasRestantes <= 5) {
    semaforoColor = '#F59E0B';
    semaforoBg = '#FEF3C7';
    semaforoTexto = 'URGENTE';
  }

  const etapasConfig = {
    RECIBIDA: { label: 'Recibida', color: 'bg-blue-100 text-blue-700', icon: '📥' },
    EN_ELABORACIÓN: { label: 'En Elaboración', color: 'bg-yellow-100 text-yellow-700', icon: '✍️' },
    EN_PROCESO: { label: 'En Proceso', color: 'bg-orange-100 text-orange-700', icon: '⚙️' },
    REVISIÓN: { label: 'En Revisión', color: 'bg-purple-100 text-purple-700', icon: '🔍' },
    ENVIADO: { label: 'Enviado', color: 'bg-green-100 text-green-700', icon: '✅' },
    FINALIZADA: { label: 'Finalizada', color: 'bg-gray-100 text-gray-700', icon: '🏁' },
    VENCIDA: { label: 'Vencida', color: 'bg-red-100 text-red-700', icon: '⚠️' }
  };

  const handleCambiarEtapa = (nuevaEtapa: EtapaSolicitudInforme) => {
    onCambiarEtapa(solicitud.id, nuevaEtapa);
    setMostrarCambioEtapa(false);
  };

  const handleAgregarComentario = () => {
    if (comentarioNuevo.trim()) {
      onAgregarComentario(solicitud.id, comentarioNuevo);
      setComentarioNuevo('');
      toast.success('Comentario agregado', {
        icon: <MessageSquare className="w-4 h-4" />
      });
    }
  };

  const porcentajeAvance = ((solicitud.diasTotales - diasRestantes) / solicitud.diasTotales) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">
          Detalle de Solicitud de Informe {solicitud.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Vista completa de la solicitud de informe {solicitud.id} con información detallada sobre plazos, etapas, responsables y documentación asociada.
        </DialogDescription>
        
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">Solicitud {solicitud.id}</h2>
                
                {/* Badge: Integración Transversal */}
                {solicitud.moduloOrigen && solicitud.moduloOrigen !== 'TERMINOS_INFORMES' && (
                  <Badge className="text-xs font-bold bg-purple-100 text-purple-700 border border-purple-300">
                    🔗 Auto-Generado
                  </Badge>
                )}
                
                {/* Badge: Improrrogable */}
                {(solicitud.esImprorrogable || solicitud.improrrogable) && (
                  <Badge className="text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                    ⚠️ Improrrogable
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{solicitud.asunto}</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          
          {/* ALERTA DE SEMÁFORO */}
          <div 
            className="p-4 rounded-lg border-2 flex items-center gap-3"
            style={{ 
              backgroundColor: semaforoBg, 
              borderColor: semaforoColor 
            }}
          >
            <AlertTriangle 
              className="w-6 h-6 flex-shrink-0" 
              style={{ color: semaforoColor }}
            />
            <div className="flex-1">
              <p className="font-bold text-sm" style={{ color: semaforoColor }}>
                Estado: {semaforoTexto}
              </p>
              <p className="text-xs text-gray-700 mt-1">
                {diasRestantes <= 0 
                  ? `Vencido hace ${Math.abs(diasRestantes)} días` 
                  : `Quedan ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} para vencimiento`
                }
              </p>
            </div>
            <Badge
              className="font-bold text-lg px-4 py-2"
              style={{ backgroundColor: semaforoColor, color: '#FFFFFF' }}
            >
              {diasRestantes} días
            </Badge>
          </div>

          {/* INFORMACIÓN GENERAL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Tipo de Informe</p>
                <p className="text-sm font-bold text-gray-900">{solicitud.tipoInforme}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Building className="w-3.5 h-3.5 text-gray-500" />
                  <p className="text-xs text-gray-500">Ente Solicitante</p>
                </div>
                <p className="text-sm font-bold text-gray-900">{solicitud.enteSolicitante}</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  <p className="text-xs text-gray-500">Responsable ESAP</p>
                </div>
                <p className="text-sm font-bold text-gray-900">{solicitud.responsable}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3.5 h-3.5 text-gray-500" />
                  <p className="text-xs text-gray-500">Radicado Externo</p>
                </div>
                <p className="text-sm font-mono font-bold text-gray-900">{solicitud.radicadoExterno}</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <p className="text-xs text-gray-500">Fecha de Solicitud</p>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {solicitud.fechaSolicitud.toLocaleDateString('es-CO', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-red-600" />
                  <p className="text-xs text-red-600 font-bold">Fecha Límite de Entrega</p>
                </div>
                <p className="text-sm font-bold text-red-900">
                  {solicitud.fechaVencimiento.toLocaleDateString('es-CO', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* ETAPA ACTUAL Y CAMBIO DE ETAPA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-600" />
                Etapa del Proceso
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarCambioEtapa(!mostrarCambioEtapa)}
              >
                <Edit className="w-3 h-3 mr-1" />
                Cambiar Etapa
              </Button>
            </div>

            {/* Etapa actual */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <span className="text-2xl">{etapasConfig[solicitud.etapa]?.icon || '📋'}</span>
              <div className="flex-1">
                <Badge className={etapasConfig[solicitud.etapa]?.color || 'bg-gray-100 text-gray-700'}>
                  {etapasConfig[solicitud.etapa]?.label || solicitud.etapa}
                </Badge>
                <p className="text-xs text-gray-600 mt-1">Etapa actual de la solicitud</p>
              </div>
            </div>

            {/* Selector de nueva etapa */}
            {mostrarCambioEtapa && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <p className="text-xs font-bold text-blue-900 mb-2">Seleccionar nueva etapa:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(Object.keys(etapasConfig) as EtapaSolicitudInforme[]).map((etapa) => (
                    <Button
                      key={etapa}
                      size="sm"
                      variant={solicitud.etapa === etapa ? "default" : "outline"}
                      onClick={() => handleCambiarEtapa(etapa)}
                      disabled={solicitud.etapa === etapa}
                      className="text-xs"
                    >
                      <span className="mr-1">{etapasConfig[etapa].icon}</span>
                      {etapasConfig[etapa].label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* BARRA DE PROGRESO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Progreso del plazo</span>
              <span className="font-bold text-gray-900">{Math.round(porcentajeAvance)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min(porcentajeAvance, 100)}%`,
                  backgroundColor: semaforoColor
                }}
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              {solicitud.diasTotales - diasRestantes} de {solicitud.diasTotales} días transcurridos
            </p>
          </div>

          {/* ASUNTO Y DESCRIPCIÓN */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900">Asunto</h3>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
              {solicitud.asunto}
            </p>

            {solicitud.descripcion && (
              <>
                <h3 className="font-bold text-gray-900 mt-4">Descripción Detallada</h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {solicitud.descripcion}
                </p>
              </>
            )}
          </div>

          {/* 🔗 INFORMACIÓN DE INTEGRACIÓN TRANSVERSAL */}
          {solicitud.moduloOrigen && solicitud.moduloOrigen !== 'TERMINOS_INFORMES' && (
            <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-purple-900">🔗 Término Auto-Generado (Integración Transversal)</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-white p-3 rounded border border-purple-200">
                  <p className="text-xs text-purple-600 font-bold mb-1">Módulo de Origen</p>
                  <p className="text-purple-900 font-semibold">
                    {solicitud.moduloOrigen?.replace(/_/g, ' ')}
                  </p>
                </div>

                {solicitud.tipoTermino && (
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <p className="text-xs text-purple-600 font-bold mb-1">Tipo de Término</p>
                    <p className="text-purple-900 font-semibold">
                      {solicitud.tipoTermino}
                    </p>
                  </div>
                )}

                {(solicitud.expedienteOrigen || solicitud.expedienteRelacionado) && (
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <p className="text-xs text-purple-600 font-bold mb-1">Expediente Relacionado</p>
                    <p className="text-purple-900 font-mono font-bold">
                      {solicitud.expedienteOrigen || solicitud.expedienteRelacionado}
                    </p>
                  </div>
                )}

                {solicitud.baseNormativa && (
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <p className="text-xs text-purple-600 font-bold mb-1">Base Normativa</p>
                    <p className="text-purple-900 font-semibold text-xs">
                      {solicitud.baseNormativa}
                    </p>
                  </div>
                )}

                {solicitud.consecuenciaIncumplimiento && (
                  <div className="bg-white p-3 rounded border border-red-200 md:col-span-2">
                    <p className="text-xs text-red-600 font-bold mb-1">⚠️ Consecuencia de Incumplimiento</p>
                    <p className="text-red-900 font-semibold text-xs">
                      {solicitud.consecuenciaIncumplimiento}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white p-3 rounded border border-purple-200">
                <p className="text-xs text-purple-900">
                  <strong>ℹ️ Información:</strong> Este término fue generado automáticamente desde el expediente{' '}
                  <span className="font-mono font-bold">{solicitud.expedienteRelacionado}</span> del módulo de{' '}
                  <strong>{solicitud.moduloOrigen?.replace(/_/g, ' ')}</strong>. 
                  {solicitud.esImprorrogable && ' Este término es IMPRORROGABLE según normativa vigente.'}
                </p>
              </div>
            </div>
          )}

          {/* DATOS REQUERIDOS */}
          {solicitud.datosRequeridos && solicitud.datosRequeridos.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900">Datos/Información Requerida</h3>
              <div className="flex flex-wrap gap-2">
                {solicitud.datosRequeridos.map((dato, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {dato}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* DOCUMENTOS ADJUNTOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Documentos Adjuntos</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info('Función de carga de documentos')}
              >
                <Upload className="w-3 h-3 mr-1" />
                Cargar Archivo
              </Button>
            </div>
            
            {solicitud.documentos && solicitud.documentos.length > 0 ? (
              <div className="space-y-2">
                {solicitud.documentos.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <Paperclip className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{doc.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {doc.tipo} • Subido el {doc.fechaCarga.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center">
                <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No hay documentos adjuntos aún</p>
              </div>
            )}
          </div>

          {/* AGREGAR COMENTARIO */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-600" />
              Agregar Nota o Comentario
            </h3>
            <Textarea
              value={comentarioNuevo}
              onChange={(e) => setComentarioNuevo(e.target.value)}
              placeholder="Escriba aquí observaciones, avances, inconvenientes o cualquier información relevante sobre esta solicitud..."
              rows={3}
              className="text-sm"
            />
            <Button
              onClick={handleAgregarComentario}
              disabled={!comentarioNuevo.trim()}
              size="sm"
              style={{ background: '#003DA5' }}
              className="text-white"
            >
              <Send className="w-3 h-3 mr-2" />
              Agregar Comentario
            </Button>
          </div>

          {/* INFO AYUDA */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-purple-900">
                <p className="font-bold mb-1">💡 Gestión de la Solicitud:</p>
                <ul className="list-disc list-inside space-y-1 text-purple-700">
                  <li>Actualice la etapa según el avance del informe</li>
                  <li>Documente cualquier inconveniente o retraso en los comentarios</li>
                  <li>Cargue borradores y documentos de soporte</li>
                  <li>Coordine con el responsable para cumplir el plazo</li>
                  <li>Al finalizar, marque como "ENVIADO" y adjunte el informe final</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-2" />
            Cerrar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => toast.info('Función de descarga de reporte')}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button
              style={{ background: '#F57C00' }}
              className="text-white"
              onClick={() => toast.success('Enviando recordatorio al responsable')}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Recordatorio
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}