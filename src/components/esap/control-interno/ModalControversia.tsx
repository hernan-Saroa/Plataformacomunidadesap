/**
 * MODAL DE CONTROVERSIA DE HALLAZGOS
 * Proceso que permite al auditado presentar argumentos de descargo
 * sobre un hallazgo identificado durante la auditoría
 */

'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  MessageSquare,
  FileText,
  Upload,
  Send,
  Clock,
  User,
  CheckCircle,
  XCircle,
  FileCheck,
  Calendar,
  ArrowRight,
  Info,
  Shield
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

interface Hallazgo {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  criterio: string;
  condicion: string;
  causa: string;
  efecto: string;
  clasificacion: 'Hallazgo' | 'Observación' | 'Oportunidad de Mejora';
  gravedad: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  estado: 'Abierto' | 'En Controversia' | 'Cerrado' | 'Rechazado';
  responsable: string;
  fechaIdentificacion: string;
  procesoAuditado: string;
  auditor: string;
  controversia?: Controversia;
}

interface Controversia {
  id: string;
  hallazgoId: string;
  fechaInicio: string;
  estado: 'Pendiente' | 'En Revisión' | 'Aceptada' | 'Rechazada';
  
  // Argumentación del auditado
  argumentosAuditado: string;
  evidenciasDescargo: EvidenciaDescargo[];
  responsableDescargo: string;
  
  // Respuesta del auditor
  respuestaAuditor?: string;
  auditorRevisor?: string;
  fechaRespuesta?: string;
  
  // Decisión final
  decisionFinal?: 'Mantener Hallazgo' | 'Modificar Hallazgo' | 'Anular Hallazgo';
  justificacionDecision?: string;
  fechaDecision?: string;
  
  // Timeline
  timeline: EventoControversia[];
}

interface EvidenciaDescargo {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: string;
  fecha: string;
  descripcion?: string;
}

interface EventoControversia {
  id: string;
  tipo: 'inicio' | 'argumentacion' | 'evidencia' | 'respuesta' | 'decision';
  descripcion: string;
  usuario: string;
  fecha: string;
  icono?: any;
}

interface ModalControversiaProps {
  isOpen: boolean;
  onClose: () => void;
  hallazgo: Hallazgo;
  modoVista: 'iniciar' | 'responder' | 'ver';
  usuarioActual: {
    nombre: string;
    rol: 'auditado' | 'auditor' | 'jefe';
  };
  onIniciarControversia?: (data: {
    argumentos: string;
    evidencias: EvidenciaDescargo[];
  }) => void;
  onResponderControversia?: (data: {
    respuesta: string;
    decision: 'Mantener Hallazgo' | 'Modificar Hallazgo' | 'Anular Hallazgo';
    justificacion: string;
  }) => void;
}

// ============ COMPONENTE PRINCIPAL ============

export function ModalControversia({
  isOpen,
  onClose,
  hallazgo,
  modoVista,
  usuarioActual,
  onIniciarControversia,
  onResponderControversia,
}: ModalControversiaProps) {
  // Estados del formulario de controversia
  const [argumentos, setArgumentos] = useState('');
  const [evidencias, setEvidencias] = useState<EvidenciaDescargo[]>([]);
  
  // Estados del formulario de respuesta
  const [respuesta, setRespuesta] = useState('');
  const [decision, setDecision] = useState<'Mantener Hallazgo' | 'Modificar Hallazgo' | 'Anular Hallazgo'>('Mantener Hallazgo');
  const [justificacion, setJustificacion] = useState('');
  
  const [enviando, setEnviando] = useState(false);

  // ============ HANDLERS ============

  const handleIniciarControversia = async () => {
    if (!argumentos.trim()) {
      toast.error('Debes proporcionar argumentos para la controversia');
      return;
    }

    setEnviando(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (onIniciarControversia) {
        onIniciarControversia({
          argumentos,
          evidencias,
        });
      }

      toast.success('Controversia iniciada correctamente');
      onClose();
    } catch (error) {
      toast.error('Error al iniciar la controversia');
    } finally {
      setEnviando(false);
    }
  };

  const handleResponderControversia = async () => {
    if (!respuesta.trim()) {
      toast.error('Debes proporcionar una respuesta');
      return;
    }

    if (!justificacion.trim()) {
      toast.error('Debes justificar tu decisión');
      return;
    }

    setEnviando(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (onResponderControversia) {
        onResponderControversia({
          respuesta,
          decision,
          justificacion,
        });
      }

      toast.success('Respuesta registrada correctamente');
      onClose();
    } catch (error) {
      toast.error('Error al registrar la respuesta');
    } finally {
      setEnviando(false);
    }
  };

  const handleAgregarEvidencia = () => {
    const nuevaEvidencia: EvidenciaDescargo = {
      id: Date.now().toString(),
      nombre: `Evidencia_${evidencias.length + 1}.pdf`,
      tipo: 'application/pdf',
      tamaño: '2.4 MB',
      fecha: new Date().toISOString().split('T')[0],
      descripcion: 'Documento adjunto',
    };
    setEvidencias([...evidencias, nuevaEvidencia]);
    toast.success('Evidencia agregada (simulación)');
  };

  const handleEliminarEvidencia = (id: string) => {
    setEvidencias(evidencias.filter((e) => e.id !== id));
    toast.info('Evidencia eliminada');
  };

  // ============ RENDER POR MODO ============

  const renderTitulo = () => {
    if (modoVista === 'iniciar') return 'Iniciar Proceso de Controversia';
    if (modoVista === 'responder') return 'Responder Controversia';
    return 'Controversia de Hallazgo';
  };

  // ============ RENDER ============

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={renderTitulo()}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-6">
        {/* Información del Hallazgo */}
        <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-l-4 border-orange-500">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{hallazgo.titulo}</h4>
                  <p className="text-sm text-gray-600">Código: {hallazgo.codigo}</p>
                </div>
                <div className="flex gap-2">
                  <Badge
                    className={
                      hallazgo.gravedad === 'Crítica'
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : hallazgo.gravedad === 'Alta'
                        ? 'bg-orange-100 text-orange-800 border-orange-200'
                        : hallazgo.gravedad === 'Media'
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        : 'bg-green-100 text-green-800 border-green-200'
                    }
                  >
                    {hallazgo.gravedad}
                  </Badge>
                  <Badge variant="outline">{hallazgo.clasificacion}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Proceso:</span>{' '}
                  <span className="text-gray-600">{hallazgo.procesoAuditado}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Responsable:</span>{' '}
                  <span className="text-gray-600">{hallazgo.responsable}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Auditor:</span>{' '}
                  <span className="text-gray-600">{hallazgo.auditor}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Fecha:</span>{' '}
                  <span className="text-gray-600">{hallazgo.fechaIdentificacion}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Descripción del Hallazgo */}
        <div className="p-4 bg-gray-50 rounded-lg border">
          <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Descripción del Hallazgo
          </h5>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <span className="font-medium text-gray-900">Condición:</span>
              <p className="mt-1">{hallazgo.condicion}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">Criterio:</span>
              <p className="mt-1">{hallazgo.criterio}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">Causa:</span>
              <p className="mt-1">{hallazgo.causa}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">Efecto:</span>
              <p className="mt-1">{hallazgo.efecto}</p>
            </div>
          </div>
        </div>

        {/* MODO: INICIAR CONTROVERSIA */}
        {modoVista === 'iniciar' && (
          <>
            {/* Información del derecho a controversia */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium text-gray-900 mb-1">
                    Derecho a Controversia
                  </p>
                  <p>
                    Tienes derecho a presentar argumentos de descargo sobre este hallazgo.
                    El auditor revisará tu controversia y emitirá una decisión fundamentada
                    dentro de los siguientes 5 días hábiles.
                  </p>
                </div>
              </div>
            </div>

            {/* Formulario de Argumentación */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Argumentos de Descargo *
                </label>
                <textarea
                  value={argumentos}
                  onChange={(e) => setArgumentos(e.target.value)}
                  placeholder="Explica detalladamente por qué consideras que el hallazgo no es procedente o requiere modificación..."
                  rows={6}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Proporciona argumentos claros y específicos. Incluye referencias normativas si aplica.
                </p>
              </div>

              {/* Evidencias de Descargo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evidencias de Descargo (Opcional)
                </label>

                {evidencias.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {evidencias.map((evidencia) => (
                      <div
                        key={evidencia.id}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileCheck className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {evidencia.nombre}
                            </p>
                            <p className="text-xs text-gray-500">
                              {evidencia.tamaño} • {evidencia.fecha}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEliminarEvidencia(evidencia.id)}
                        >
                          <XCircle className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAgregarEvidencia}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Adjuntar Documento
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Puedes adjuntar documentos, informes, actas u otros soportes que respalden tus argumentos.
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={enviando}>
                Cancelar
              </Button>
              <Button
                onClick={handleIniciarControversia}
                disabled={enviando || !argumentos.trim()}
                className="gap-2"
                style={{ backgroundColor: '#003DA5' }}
              >
                {enviando ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Iniciar Controversia
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* MODO: RESPONDER CONTROVERSIA */}
        {modoVista === 'responder' && hallazgo.controversia && (
          <>
            {/* Argumentos del Auditado */}
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Argumentos del Auditado
              </h5>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {hallazgo.controversia.argumentosAuditado}
              </p>

              {hallazgo.controversia.evidenciasDescargo.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Evidencias Adjuntas:
                  </p>
                  <div className="space-y-2">
                    {hallazgo.controversia.evidenciasDescargo.map((evidencia) => (
                      <div
                        key={evidencia.id}
                        className="flex items-center gap-3 p-2 bg-white rounded border"
                      >
                        <FileCheck className="w-4 h-4 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {evidencia.nombre}
                          </p>
                          <p className="text-xs text-gray-500">
                            {evidencia.tamaño} • {evidencia.fecha}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Formulario de Respuesta */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Respuesta del Auditor *
                </label>
                <textarea
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                  placeholder="Analiza los argumentos presentados y proporciona una respuesta fundamentada..."
                  rows={5}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decisión sobre el Hallazgo *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setDecision('Mantener Hallazgo')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      decision === 'Mantener Hallazgo'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-gray-900">Mantener</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      El hallazgo permanece sin modificaciones
                    </p>
                  </button>

                  <button
                    onClick={() => setDecision('Modificar Hallazgo')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      decision === 'Modificar Hallazgo'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-orange-600" />
                      <span className="font-medium text-gray-900">Modificar</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Se ajusta la redacción o clasificación
                    </p>
                  </button>

                  <button
                    onClick={() => setDecision('Anular Hallazgo')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      decision === 'Anular Hallazgo'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-gray-900">Anular</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      El hallazgo no procede
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Justificación de la Decisión *
                </label>
                <textarea
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  placeholder="Explica de manera fundamentada tu decisión..."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] resize-none"
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={enviando}>
                Cancelar
              </Button>
              <Button
                onClick={handleResponderControversia}
                disabled={enviando || !respuesta.trim() || !justificacion.trim()}
                className="gap-2"
                style={{ backgroundColor: '#003DA5' }}
              >
                {enviando ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Emitir Decisión
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* MODO: VER CONTROVERSIA */}
        {modoVista === 'ver' && hallazgo.controversia && (
          <>
            {/* Timeline de la Controversia */}
            <div className="space-y-4">
              <h5 className="font-medium text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Línea de Tiempo de la Controversia
              </h5>

              <div className="relative">
                {/* Línea vertical */}
                <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gray-200" />

                {/* Eventos */}
                <div className="space-y-6">
                  {hallazgo.controversia.timeline.map((evento, index) => (
                    <div key={evento.id} className="relative flex gap-4">
                      {/* Punto en la línea */}
                      <div className="relative z-10 flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-[#003DA5] flex items-center justify-center">
                          {evento.tipo === 'inicio' && <MessageSquare className="w-4 h-4 text-white" />}
                          {evento.tipo === 'argumentacion' && <FileText className="w-4 h-4 text-white" />}
                          {evento.tipo === 'evidencia' && <FileCheck className="w-4 h-4 text-white" />}
                          {evento.tipo === 'respuesta' && <User className="w-4 h-4 text-white" />}
                          {evento.tipo === 'decision' && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                      </div>

                      {/* Contenido del evento */}
                      <div className="flex-1 pb-6">
                        <div className="p-4 bg-gray-50 rounded-lg border">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium text-gray-900">{evento.descripcion}</p>
                            <span className="text-xs text-gray-500">{evento.fecha}</span>
                          </div>
                          <p className="text-sm text-gray-600">Por: {evento.usuario}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Decisión Final (si existe) */}
            {hallazgo.controversia.decisionFinal && (
              <div
                className={`p-4 rounded-lg border-l-4 ${
                  hallazgo.controversia.decisionFinal === 'Anular Hallazgo'
                    ? 'bg-green-50 border-green-500'
                    : hallazgo.controversia.decisionFinal === 'Modificar Hallazgo'
                    ? 'bg-orange-50 border-orange-500'
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  {hallazgo.controversia.decisionFinal === 'Anular Hallazgo' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : hallazgo.controversia.decisionFinal === 'Modificar Hallazgo' ? (
                    <FileText className="w-5 h-5 text-orange-600" />
                  ) : (
                    <Shield className="w-5 h-5 text-red-600" />
                  )}
                  Decisión Final: {hallazgo.controversia.decisionFinal}
                </h5>
                <p className="text-sm text-gray-700 mb-3">
                  {hallazgo.controversia.justificacionDecision}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>
                    <strong>Decisión por:</strong> {hallazgo.controversia.auditorRevisor}
                  </span>
                  <span>
                    <strong>Fecha:</strong> {hallazgo.controversia.fechaDecision}
                  </span>
                </div>
              </div>
            )}

            {/* Botón cerrar */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={onClose}>Cerrar</Button>
            </div>
          </>
        )}
      </div>
    </ResponsiveModal>
  );
}

// ============ COMPONENTE AUXILIAR: BOTÓN DE CONTROVERSIA ============

interface BotonControversiaProps {
  hallazgo: Hallazgo;
  usuarioActual: {
    nombre: string;
    rol: 'auditado' | 'auditor' | 'jefe';
  };
  onIniciarControversia?: (data: any) => void;
  onResponderControversia?: (data: any) => void;
}

export function BotonControversia({
  hallazgo,
  usuarioActual,
  onIniciarControversia,
  onResponderControversia,
}: BotonControversiaProps) {
  const [mostrarModal, setMostrarModal] = useState(false);

  const determinarModoVista = (): 'iniciar' | 'responder' | 'ver' => {
    if (hallazgo.estado === 'En Controversia' && usuarioActual.rol === 'auditor') {
      return 'responder';
    }
    if (hallazgo.estado === 'En Controversia') {
      return 'ver';
    }
    if (usuarioActual.rol === 'auditado' && hallazgo.estado === 'Abierto') {
      return 'iniciar';
    }
    return 'ver';
  };

  const modoVista = determinarModoVista();

  const obtenerTextoBoton = () => {
    if (hallazgo.estado === 'En Controversia' && usuarioActual.rol === 'auditor') {
      return 'Responder Controversia';
    }
    if (hallazgo.estado === 'En Controversia') {
      return 'Ver Controversia';
    }
    return 'Iniciar Controversia';
  };

  const obtenerIcono = () => {
    if (hallazgo.estado === 'En Controversia') {
      return <MessageSquare className="w-4 h-4" />;
    }
    return <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <>
      <Button
        variant={hallazgo.estado === 'En Controversia' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setMostrarModal(true)}
        className="gap-2"
      >
        {obtenerIcono()}
        {obtenerTextoBoton()}
      </Button>

      <ModalControversia
        isOpen={mostrarModal}
        onClose={() => setMostrarModal(false)}
        hallazgo={hallazgo}
        modoVista={modoVista}
        usuarioActual={usuarioActual}
        onIniciarControversia={onIniciarControversia}
        onResponderControversia={onResponderControversia}
      />
    </>
  );
}
