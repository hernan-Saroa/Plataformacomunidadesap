/**
 * ModalTrazabilidadDocumento - Trazabilidad Completa World-Class
 * Muestra todo el ciclo de vida y progreso del documento
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  X, CheckCircle, Clock, Eye, Mail, Download, Share2,
  AlertCircle, User, Calendar, MapPin, Smartphone, Monitor,
  Bell, ArrowRight, FileText, Send, PenTool, CheckCheck
} from 'lucide-react';
import { useState } from 'react';

interface ModalTrazabilidadDocumentoProps {
  isOpen: boolean;
  onClose: () => void;
  documento: any;
}

// Función auxiliar para obtener iniciales
const getInitials = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Función para obtener color del avatar
const getAvatarColor = (name: string): string => {
  const colors = ['#003DA5', '#1e5da8', '#2a6dbd', '#F57C00', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export function ModalTrazabilidadDocumento({
  isOpen,
  onClose,
  documento
}: ModalTrazabilidadDocumentoProps) {
  const [tabActiva, setTabActiva] = useState<'timeline' | 'firmantes' | 'actividad'>('timeline');

  if (!documento) return null;

  // Simular datos de trazabilidad
  const eventosTimeline = [
    {
      id: 1,
      tipo: 'creacion',
      icono: FileText,
      color: 'blue',
      titulo: 'Documento creado',
      descripcion: `Creado por ${documento.cargadoPor}`,
      fecha: documento.fechaCarga,
      hora: '09:15 AM',
      usuario: documento.cargadoPor,
      completado: true
    },
    {
      id: 2,
      tipo: 'compartir',
      icono: Share2,
      color: 'purple',
      titulo: 'Compartido con firmantes',
      descripcion: `Enviado a ${documento.firmasRequeridas} firmantes`,
      fecha: documento.fechaCarga,
      hora: '09:20 AM',
      usuario: documento.cargadoPor,
      completado: true,
      detalles: [
        { accion: 'Email enviado', destinatarios: documento.firmantes.map((f: any) => f.email) }
      ]
    },
    ...documento.firmantes.map((firmante: any, index: number) => ({
      id: 10 + index,
      tipo: firmante.estado === 'firmado' ? 'firma' : 'pendiente',
      icono: firmante.estado === 'firmado' ? CheckCircle : Clock,
      color: firmante.estado === 'firmado' ? 'green' : 'orange',
      titulo: firmante.estado === 'firmado' ? `Firmado por ${firmante.nombre}` : `Pendiente: ${firmante.nombre}`,
      descripcion: firmante.estado === 'firmado' 
        ? `Firmado con verificación OTP` 
        : `Esperando firma - ${firmante.cargo}`,
      fecha: firmante.fechaFirma || 'Pendiente',
      hora: firmante.horaFirma || '-',
      usuario: firmante.nombre,
      completado: firmante.estado === 'firmado',
      firmante: firmante
    }))
  ];

  // Datos de actividad del documento
  const actividadDocumento = [
    { id: 1, accion: 'Documento creado', usuario: documento.cargadoPor, fecha: '23/12/2024', hora: '09:15 AM', dispositivo: 'Web - Chrome', ip: '192.168.1.100', icono: FileText, color: 'blue' },
    { id: 2, accion: 'Email enviado', destinatario: documento.firmantes[0]?.email, fecha: '23/12/2024', hora: '09:20 AM', dispositivo: 'Sistema', icono: Mail, color: 'purple' },
    { id: 3, accion: 'Documento abierto', usuario: documento.firmantes[0]?.nombre, fecha: '23/12/2024', hora: '10:15 AM', dispositivo: 'Web - Safari', ip: '192.168.1.105', icono: Eye, color: 'cyan' },
    { id: 4, accion: 'Documento firmado', usuario: documento.firmantes[0]?.nombre, fecha: documento.firmantes[0]?.fechaFirma, hora: documento.firmantes[0]?.horaFirma, dispositivo: 'Web - Safari', ip: '192.168.1.105', icono: CheckCircle, color: 'green' },
    { id: 5, accion: 'Email enviado', destinatario: documento.firmantes[1]?.email, fecha: '23/12/2024', hora: '10:30 AM', dispositivo: 'Sistema', icono: Mail, color: 'purple' },
    { id: 6, accion: 'Documento abierto', usuario: documento.firmantes[1]?.nombre, fecha: '23/12/2024', hora: '14:22 AM', dispositivo: 'Mobile - iOS', ip: '192.168.1.110', icono: Smartphone, color: 'cyan' },
    { id: 7, accion: 'Recordatorio enviado', destinatario: documento.firmantes[2]?.email, fecha: '24/12/2024', hora: '09:00 AM', dispositivo: 'Sistema', icono: Bell, color: 'orange' }
  ];

  // Progreso general
  const progresoGeneral = (documento.firmasCompletadas / documento.firmasRequeridas) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogDescription className="sr-only">
          Trazabilidad completa del documento {documento.nombre}
        </DialogDescription>

        {/* Header Premium */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-white/20">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Trazabilidad del Documento
                </DialogTitle>
                <p className="text-sm text-cyan-100 mt-1">
                  {documento.nombre}
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progreso Global */}
          <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Progreso General</span>
                <Badge className="bg-white/20 text-white font-bold">
                  {documento.firmasCompletadas} de {documento.firmasRequeridas}
                </Badge>
              </div>
              <span className="text-lg font-black">{progresoGeneral.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${progresoGeneral}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-cyan-100">
              <span>Iniciado: {documento.fechaCarga}</span>
              <span>{documento.ultimaActividad}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50">
          <div className="flex gap-1 px-6">
            <button
              onClick={() => setTabActiva('timeline')}
              className={`px-4 py-3 font-semibold text-sm transition-all ${
                tabActiva === 'timeline'
                  ? 'text-cyan-700 border-b-2 border-cyan-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📍 Timeline
            </button>
            <button
              onClick={() => setTabActiva('firmantes')}
              className={`px-4 py-3 font-semibold text-sm transition-all ${
                tabActiva === 'firmantes'
                  ? 'text-cyan-700 border-b-2 border-cyan-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👥 Firmantes ({documento.firmantes.length})
            </button>
            <button
              onClick={() => setTabActiva('actividad')}
              className={`px-4 py-3 font-semibold text-sm transition-all ${
                tabActiva === 'actividad'
                  ? 'text-cyan-700 border-b-2 border-cyan-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Actividad Detallada
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB: TIMELINE */}
          {tabActiva === 'timeline' && (
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                {/* Línea vertical */}
                <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-200" />

                {/* Eventos */}
                <div className="space-y-6">
                  {eventosTimeline.map((evento, index) => {
                    const IconoEvento = evento.icono;
                    const colorClasses = {
                      blue: 'bg-blue-500 border-blue-200',
                      purple: 'bg-purple-500 border-purple-200',
                      green: 'bg-green-500 border-green-200',
                      orange: 'bg-orange-500 border-orange-200',
                      cyan: 'bg-cyan-500 border-cyan-200'
                    };

                    return (
                      <div key={evento.id} className="relative flex gap-4">
                        {/* Icono */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[evento.color as keyof typeof colorClasses]} border-4 bg-white z-10`}>
                          <IconoEvento className={`w-5 h-5 ${evento.completado ? 'text-white' : 'text-gray-400'}`} />
                        </div>

                        {/* Contenido */}
                        <Card className={`flex-1 p-4 ${evento.completado ? 'border-2 border-gray-200' : 'border-2 border-dashed border-gray-300 bg-gray-50'}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className={`font-bold ${evento.completado ? 'text-gray-900' : 'text-gray-600'}`}>
                                {evento.titulo}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {evento.descripcion}
                              </p>
                            </div>
                            {evento.completado ? (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                            ) : (
                              <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 ml-2" />
                            )}
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{evento.fecha}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{evento.hora}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              <span>{evento.usuario}</span>
                            </div>
                          </div>

                          {/* Detalles adicionales para firmantes */}
                          {evento.firmante && evento.completado && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="grid grid-cols-3 gap-3 text-xs">
                                <div>
                                  <p className="text-gray-500 mb-1">Cargo</p>
                                  <p className="font-semibold text-gray-900">{evento.firmante.cargo}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 mb-1">Email</p>
                                  <p className="font-semibold text-gray-900">{evento.firmante.email}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 mb-1">Método</p>
                                  <p className="font-semibold text-gray-900">Firma Digital + OTP</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Detalles para compartir */}
                          {evento.detalles && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500 mb-2">Destinatarios:</p>
                              <div className="flex flex-wrap gap-2">
                                {evento.detalles[0].destinatarios.map((email: string, i: number) => (
                                  <Badge key={i} className="bg-purple-100 text-purple-700 text-xs">
                                    {email}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: FIRMANTES */}
          {tabActiva === 'firmantes' && (
            <div className="max-w-4xl mx-auto">
              <div className="grid gap-4">
                {documento.firmantes.map((firmante: any, index: number) => {
                  const initials = getInitials(firmante.nombre);
                  const avatarColor = getAvatarColor(firmante.nombre);
                  const estadoConfig = {
                    firmado: { color: 'green', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle },
                    pendiente: { color: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', icon: Clock },
                    rechazado: { color: 'red', bg: 'bg-red-50', border: 'border-red-200', icon: AlertCircle }
                  };
                  const config = estadoConfig[firmante.estado as keyof typeof estadoConfig];
                  const IconoEstado = config.icon;

                  return (
                    <Card key={index} className={`p-5 border-2 ${config.border} ${config.bg}`}>
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">{firmante.nombre}</h3>
                              <p className="text-sm text-gray-600">{firmante.cargo}</p>
                            </div>
                            <Badge className={`bg-${config.color}-100 text-${config.color}-700 font-bold`}>
                              {firmante.estado === 'firmado' ? '✓ Firmado' : 
                               firmante.estado === 'pendiente' ? '⏰ Pendiente' : 
                               '✗ Rechazado'}
                            </Badge>
                          </div>

                          {/* Detalles */}
                          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                            <div>
                              <p className="text-gray-500 mb-1">Email</p>
                              <p className="font-semibold text-gray-900">{firmante.email}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1">Orden de firma</p>
                              <p className="font-semibold text-gray-900">#{index + 1} de {documento.firmantes.length}</p>
                            </div>
                          </div>

                          {/* Timeline del firmante */}
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 text-gray-700">
                                <Mail className="w-3.5 h-3.5 text-purple-600" />
                                <span>Email enviado: {documento.fechaCarga} 09:20 AM</span>
                              </div>
                              {firmante.estado === 'firmado' && (
                                <>
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <Eye className="w-3.5 h-3.5 text-cyan-600" />
                                    <span>Documento abierto: {firmante.fechaFirma} {(parseInt(firmante.horaFirma) - 1).toString().padStart(2, '0')}:15 AM</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-green-700">
                                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                    <span className="font-semibold">Firmado: {firmante.fechaFirma} {firmante.horaFirma}</span>
                                  </div>
                                </>
                              )}
                              {firmante.estado === 'pendiente' && (
                                <div className="flex items-center gap-2 text-orange-700">
                                  <Bell className="w-3.5 h-3.5 text-orange-600" />
                                  <span>Recordatorio enviado: Hace 1 día</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: ACTIVIDAD DETALLADA */}
          {tabActiva === 'actividad' && (
            <div className="max-w-5xl mx-auto">
              <Card className="border-2 border-gray-200">
                <div className="divide-y divide-gray-100">
                  {actividadDocumento.map((actividad) => {
                    const IconoActividad = actividad.icono;
                    const colorClasses = {
                      blue: 'bg-blue-100 text-blue-600',
                      purple: 'bg-purple-100 text-purple-600',
                      green: 'bg-green-100 text-green-600',
                      orange: 'bg-orange-100 text-orange-600',
                      cyan: 'bg-cyan-100 text-cyan-600'
                    };

                    return (
                      <div key={actividad.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-4">
                          {/* Icono */}
                          <div className={`p-2 rounded-lg ${colorClasses[actividad.color as keyof typeof colorClasses]}`}>
                            <IconoActividad className="w-5 h-5" />
                          </div>

                          {/* Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-bold text-gray-900">{actividad.accion}</h4>
                                {actividad.usuario && (
                                  <p className="text-sm text-gray-600 mt-1">Por: {actividad.usuario}</p>
                                )}
                                {actividad.destinatario && (
                                  <p className="text-sm text-gray-600 mt-1">A: {actividad.destinatario}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-700">{actividad.fecha}</p>
                                <p className="text-xs text-gray-500">{actividad.hora}</p>
                              </div>
                            </div>

                            {/* Metadata técnica */}
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                              {actividad.dispositivo && (
                                <div className="flex items-center gap-1">
                                  {actividad.dispositivo.includes('Mobile') ? (
                                    <Smartphone className="w-3.5 h-3.5" />
                                  ) : (
                                    <Monitor className="w-3.5 h-3.5" />
                                  )}
                                  <span>{actividad.dispositivo}</span>
                                </div>
                              )}
                              {actividad.ip && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span>IP: {actividad.ip}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Resumen de Actividad */}
              <div className="grid grid-cols-4 gap-4 mt-6">
                <Card className="p-4 border-2 border-cyan-200 bg-cyan-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-cyan-600" />
                    <p className="text-xs font-semibold text-cyan-700">Visualizaciones</p>
                  </div>
                  <p className="text-2xl font-black text-cyan-900">
                    {actividadDocumento.filter(a => a.accion.includes('abierto')).length}
                  </p>
                </Card>

                <Card className="p-4 border-2 border-purple-200 bg-purple-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-purple-600" />
                    <p className="text-xs font-semibold text-purple-700">Emails Enviados</p>
                  </div>
                  <p className="text-2xl font-black text-purple-900">
                    {actividadDocumento.filter(a => a.accion.includes('Email')).length}
                  </p>
                </Card>

                <Card className="p-4 border-2 border-green-200 bg-green-50">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-xs font-semibold text-green-700">Firmas</p>
                  </div>
                  <p className="text-2xl font-black text-green-900">
                    {documento.firmasCompletadas}
                  </p>
                </Card>

                <Card className="p-4 border-2 border-orange-200 bg-orange-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-4 h-4 text-orange-600" />
                    <p className="text-xs font-semibold text-orange-700">Recordatorios</p>
                  </div>
                  <p className="text-2xl font-black text-orange-900">
                    {actividadDocumento.filter(a => a.accion.includes('Recordatorio')).length}
                  </p>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            ID: {documento.id} • Última actividad: {documento.ultimaActividad}
          </p>
          <Button
            onClick={onClose}
            className="font-medium"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
