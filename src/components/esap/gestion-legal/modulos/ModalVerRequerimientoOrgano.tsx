/**
 * ModalVerRequerimientoOrgano - Vista completa del requerimiento de órgano de control
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import {
  Building2, Calendar, User, Clock, X, AlertTriangle, FileText,
  CheckCircle, Target, Mail, Download, Upload, MessageSquare,
  Paperclip, Edit, Send, Archive, TrendingUp, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ModalComentarRequerimiento } from './ModalComentarRequerimiento';
import { ModalSubirRespuesta } from './ModalSubirRespuesta';
import { ModalCambiarEtapa } from './ModalCambiarEtapa';
import { ModalReasignar } from './ModalReasignar';
import { ModalArchivar } from './ModalArchivar';

interface RequerimientoOrganoControl {
  id: string;
  numeroOficio: string;
  organismo: 'CGR' | 'PROCURADURIA' | 'CONTRALORIA_TERRITORIAL' | 'FISCALIA' | 'DEFENSORIA' | 'PERSONERIA';
  asunto: string;
  responsable: string;
  fechaRadicacion: Date;
  fechaVencimiento: Date;
  diasRestantes: number;
  diasTotales: number;
  etapa: 'RECIBIDO' | 'ANALISIS' | 'RESPUESTA' | 'ENVIADO';
  ultimaActuacion?: string;
  documentos?: number;
}

interface ModalVerRequerimientoOrganoProps {
  isOpen: boolean;
  onClose: () => void;
  requerimiento: RequerimientoOrganoControl | null;
}

export function ModalVerRequerimientoOrgano({
  isOpen,
  onClose,
  requerimiento
}: ModalVerRequerimientoOrganoProps) {
  const [tabActiva, setTabActiva] = useState('general');
  const [showComentarModal, setShowComentarModal] = useState(false);
  const [showSubirRespuestaModal, setShowSubirRespuestaModal] = useState(false);
  const [showCambiarEtapaModal, setShowCambiarEtapaModal] = useState(false);
  const [showReasignarModal, setShowReasignarModal] = useState(false);
  const [showArchivarModal, setShowArchivarModal] = useState(false);
  const [modalPadreVisible, setModalPadreVisible] = useState(true);

  if (!requerimiento) return null;

  // Resetear visibilidad cuando se cierra el modal
  const handleClose = () => {
    setModalPadreVisible(true);
    setShowComentarModal(false);
    setShowSubirRespuestaModal(false);
    setShowCambiarEtapaModal(false);
    setShowReasignarModal(false);
    setShowArchivarModal(false);
    onClose();
  };

  // Handlers para modales hijos - ocultar padre mientras hijo está abierto
  const handleAbrirComentar = () => {
    setModalPadreVisible(false);
    setShowComentarModal(true);
  };

  const handleCerrarComentar = () => {
    setShowComentarModal(false);
    setModalPadreVisible(true);
  };

  const handleAbrirRespuesta = () => {
    setModalPadreVisible(false);
    setShowSubirRespuestaModal(true);
  };

  const handleCerrarRespuesta = () => {
    setShowSubirRespuestaModal(false);
    setModalPadreVisible(true);
  };

  const handleAbrirCambiarEtapa = () => {
    setModalPadreVisible(false);
    setShowCambiarEtapaModal(true);
  };

  const handleCerrarCambiarEtapa = () => {
    setShowCambiarEtapaModal(false);
    setModalPadreVisible(true);
  };

  const handleAbrirReasignar = () => {
    setModalPadreVisible(false);
    setShowReasignarModal(true);
  };

  const handleCerrarReasignar = () => {
    setShowReasignarModal(false);
    setModalPadreVisible(true);
  };

  const handleAbrirArchivar = () => {
    setModalPadreVisible(false);
    setShowArchivarModal(true);
  };

  const handleCerrarArchivar = () => {
    setShowArchivarModal(false);
    setModalPadreVisible(true);
  };

  // Calcular semáforo
  const getSemaforoColor = (diasRestantes: number) => {
    if (diasRestantes < 0) return { color: '#DC2626', bg: '#FEE2E2', label: 'VENCIDO' };
    if (diasRestantes <= 5) return { color: '#F59E0B', bg: '#FEF3C7', label: 'URGENTE' };
    return { color: '#10B981', bg: '#D1FAE5', label: 'EN TÉRMINO' };
  };

  const semaforo = getSemaforoColor(requerimiento.diasRestantes);
  const porcentajeTiempo = Math.round(((requerimiento.diasTotales - requerimiento.diasRestantes) / requerimiento.diasTotales) * 100);

  const getOrganoInfo = (organo: string) => {
    switch(organo) {
      case 'CGR': return { nombre: 'Contraloría General de la República', icon: '🏛️', color: '#1E40AF' };
      case 'CONTRALORIA_TERRITORIAL': return { nombre: 'Contraloría Territorial', icon: '📊', color: '#7C3AED' };
      case 'PROCURADURIA': return { nombre: 'Procuraduría General de la Nación', icon: '⚖️', color: '#059669' };
      case 'FISCALIA': return { nombre: 'Fiscalía General de la Nación', icon: '🔍', color: '#DC2626' };
      case 'DEFENSORIA': return { nombre: 'Defensoría del Pueblo', icon: '🛡️', color: '#EA580C' };
      case 'PERSONERIA': return { nombre: 'Personería Municipal', icon: '📜', color: '#0891B2' };
      default: return { nombre: organo, icon: '📋', color: '#6B7280' };
    }
  };

  const organoInfo = getOrganoInfo(requerimiento.organismo);

  const etapasConfig = {
    RECIBIDO: { label: 'Recibido', color: 'bg-gray-100 text-gray-700', icon: '📥' },
    ANALISIS: { label: 'En Análisis', color: 'bg-yellow-100 text-yellow-700', icon: '🔍' },
    RESPUESTA: { label: 'Elaborando Respuesta', color: 'bg-blue-100 text-blue-700', icon: '✍️' },
    ENVIADO: { label: 'Respuesta Enviada', color: 'bg-green-100 text-green-700', icon: '✅' }
  };

  // Mock data para timeline
  const timeline = [
    {
      fecha: new Date('2024-12-10'),
      accion: 'Requerimiento recibido por Centro de Comunicaciones',
      usuario: 'Sistema SIGL',
      tipo: 'recepcion'
    },
    {
      fecha: new Date('2024-12-11'),
      accion: 'Asignado a Dra. María Fernández - Área Jurídica',
      usuario: 'Director Jurídico',
      tipo: 'asignacion'
    },
    {
      fecha: new Date('2024-12-12'),
      accion: 'Solicitud de información a áreas técnicas (Contratación, Financiera)',
      usuario: 'Dra. María Fernández',
      tipo: 'actuacion'
    },
    {
      fecha: new Date('2024-12-15'),
      accion: 'Información consolidada de áreas. Iniciando redacción de respuesta',
      usuario: 'Dra. María Fernández',
      tipo: 'actuacion'
    }
  ];

  return (
    <Dialog open={isOpen && modalPadreVisible} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0 my-4 overflow-hidden">
        <DialogTitle className="sr-only">
          Detalle del Requerimiento {requerimiento.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Vista completa del requerimiento {requerimiento.id} del órgano de control con información detallada sobre plazos, etapas, responsables y documentación asociada.
        </DialogDescription>
        
        {/* Header - FIJO NO SCROLL */}
        <div className="flex-shrink-0 px-6 py-5 bg-white border-b flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div 
              className="p-2.5 border-2 rounded-lg"
              style={{ borderColor: organoInfo.color, backgroundColor: `${organoInfo.color}10` }}
            >
              <Building2 className="w-5 h-5" style={{ color: organoInfo.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">{requerimiento.id}</h2>
                <Badge className={etapasConfig[requerimiento.etapa].color}>
                  {etapasConfig[requerimiento.etapa].icon} {etapasConfig[requerimiento.etapa].label}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                {organoInfo.icon} {organoInfo.nombre}
              </p>
            </div>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Contenido - CON SCROLL */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          <div className="space-y-6">
            
            {/* ALERTA DE SEMÁFORO */}
            <div 
              className="p-4 rounded-lg border-2 flex items-center gap-3"
              style={{ 
                backgroundColor: semaforo.bg, 
                borderColor: semaforo.color 
              }}
            >
              <AlertTriangle 
                className="w-6 h-6 flex-shrink-0" 
                style={{ color: semaforo.color }}
              />
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: semaforo.color }}>
                  Estado: {semaforo.label}
                </p>
                <p className="text-xs text-gray-700 mt-1">
                  {requerimiento.diasRestantes < 0 
                    ? `⚠️ Vencido hace ${Math.abs(requerimiento.diasRestantes)} días` 
                    : `⏰ Quedan ${requerimiento.diasRestantes} día${requerimiento.diasRestantes !== 1 ? 's' : ''} para vencimiento`
                  }
                </p>
              </div>
              <Badge
                className="font-bold text-lg px-4 py-2"
                style={{ backgroundColor: semaforo.color, color: '#FFFFFF' }}
              >
                {Math.abs(requerimiento.diasRestantes)} días
              </Badge>
            </div>

            {/* INFORMACIÓN GENERAL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Número de Oficio
                  </p>
                  <p className="text-sm font-mono font-bold text-gray-900">{requerimiento.numeroOficio}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    Órgano de Control
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {organoInfo.icon} {organoInfo.nombre}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Responsable ESAP
                  </p>
                  <p className="text-sm font-bold text-gray-900">{requerimiento.responsable}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Fecha de Radicación
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {requerimiento.fechaRadicacion.toLocaleDateString('es-CO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div 
                  className="p-3 rounded-lg border-2"
                  style={{ backgroundColor: semaforo.bg, borderColor: semaforo.color }}
                >
                  <p className="text-xs font-bold mb-1 flex items-center gap-1" style={{ color: semaforo.color }}>
                    <Clock className="w-3 h-3" />
                    Fecha Límite de Respuesta
                  </p>
                  <p className="text-sm font-bold" style={{ color: semaforo.color }}>
                    {requerimiento.fechaVencimiento.toLocaleDateString('es-CO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 font-bold mb-1">Término Legal</p>
                  <p className="text-sm font-bold text-blue-900">
                    {requerimiento.diasTotales} días hábiles
                  </p>
                </div>
              </div>
            </div>

            {/* BARRA DE PROGRESO */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Progreso del plazo legal</span>
                <span className="font-bold text-gray-900">{porcentajeTiempo}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.min(porcentajeTiempo, 100)}%`,
                    backgroundColor: semaforo.color
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                {requerimiento.diasTotales - requerimiento.diasRestantes} de {requerimiento.diasTotales} días transcurridos
              </p>
            </div>

            {/* TABS CON INFORMACIÓN DETALLADA */}
            <Tabs value={tabActiva} onValueChange={setTabActiva}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">
                  <FileText className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger value="timeline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="documentos">
                  <Paperclip className="w-4 h-4 mr-2" />
                  Documentos ({requerimiento.documentos || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">📋 Asunto del Requerimiento</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {requerimiento.asunto}
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">📝 Última Actuación</h3>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">
                      {requerimiento.ultimaActuacion || 'Sin actuaciones registradas'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      📅 {requerimiento.fechaRadicacion.toLocaleDateString('es-CO')}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-purple-900">
                      <p className="font-bold mb-1">💡 Información del Requerimiento:</p>
                      <ul className="list-disc list-inside space-y-1 text-purple-700">
                        <li>Este requerimiento proviene de {organoInfo.nombre}</li>
                        <li>Término legal: {requerimiento.diasTotales} días hábiles (improrrogable)</li>
                        <li>Responsable: {requerimiento.responsable}</li>
                        <li>Estado actual: {etapasConfig[requerimiento.etapa].label}</li>
                        <li>La respuesta debe ser completa, precisa y con soportes documentales</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-3 mt-4">
                <div className="space-y-3">
                  {timeline.map((evento, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div 
                          className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center"
                          style={{ backgroundColor: '#003DA5' }}
                        >
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        {idx < timeline.length - 1 && (
                          <div className="w-0.5 h-full min-h-[40px] bg-gray-300 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-bold text-gray-900">{evento.accion}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          👤 {evento.usuario} • 📅 {evento.fecha.toLocaleDateString('es-CO')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="documentos" className="space-y-3 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">Documentos Adjuntos</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info('Función de carga de documentos')}
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Cargar
                  </Button>
                </div>

                <div className="space-y-2">
                  {[
                    { nombre: 'Oficio CGR-OF-2024-00125.pdf', tipo: 'PDF', fecha: new Date('2024-12-10') },
                    { nombre: 'Anexo 1 - Contratos 2024.xlsx', tipo: 'Excel', fecha: new Date('2024-12-12') },
                    { nombre: 'Certificación Presupuestal.pdf', tipo: 'PDF', fecha: new Date('2024-12-13') }
                  ].map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <Paperclip className="w-4 h-4 text-gray-600" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{doc.nombre}</p>
                          <p className="text-xs text-gray-500">
                            {doc.tipo} • Subido el {doc.fecha.toLocaleDateString('es-CO')}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* ACCIONES RÁPIDAS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAbrirCambiarEtapa}
              >
                <Edit className="w-3 h-3 mr-1" />
                Cambiar Etapa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAbrirReasignar}
              >
                <User className="w-3 h-3 mr-1" />
                Reasignar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAbrirArchivar}
              >
                <Archive className="w-3 h-3 mr-1" />
                Archivar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info('Función de exportación')}
              >
                <Download className="w-3 h-3 mr-1" />
                Exportar
              </Button>
            </div>
          </div>
        </div>

        {/* Footer con acciones principales */}
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
              onClick={handleAbrirComentar}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Comentar
            </Button>
            <Button
              style={{ background: '#003DA5' }}
              className="text-white"
              onClick={handleAbrirRespuesta}
            >
              <Send className="w-4 h-4 mr-2" />
              Elaborar Respuesta
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Modales Hijos - FUERA del Dialog padre para evitar conflictos de z-index */}
      <ModalComentarRequerimiento
        isOpen={showComentarModal}
        onClose={handleCerrarComentar}
        requerimientoId={requerimiento.id}
        requerimientoAsunto={requerimiento.asunto}
      />

      <ModalSubirRespuesta
        isOpen={showSubirRespuestaModal}
        onClose={handleCerrarRespuesta}
        requerimiento={{
          id: requerimiento.id,
          numeroOficio: requerimiento.numeroOficio,
          organismo: organoInfo.nombre,
          asunto: requerimiento.asunto,
          fechaVencimiento: requerimiento.fechaVencimiento,
          diasRestantes: requerimiento.diasRestantes,
        }}
      />

      <ModalCambiarEtapa
        isOpen={showCambiarEtapaModal}
        onClose={handleCerrarCambiarEtapa}
        requerimientoId={requerimiento.id}
        etapaActual={requerimiento.etapa}
      />

      <ModalReasignar
        isOpen={showReasignarModal}
        onClose={handleCerrarReasignar}
        requerimientoId={requerimiento.id}
        responsableActual={requerimiento.responsable}
      />

      <ModalArchivar
        isOpen={showArchivarModal}
        onClose={handleCerrarArchivar}
        requerimientoId={requerimiento.id}
        requerimientoAsunto={requerimiento.asunto}
      />
    </Dialog>
  );
}