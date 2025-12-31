/**
 * ModalHistorialFirmas - Modal de Historial y Trazabilidad de Firmas
 * Diseño corporativo ESAP premium con timeline completo
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import {
  X, History, CheckCircle, Clock, User, Calendar, Download, FileText,
  Share2, Upload, Eye, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ModalHistorialFirmasProps {
  isOpen: boolean;
  onClose: () => void;
  documento: any;
}

export function ModalHistorialFirmas({ isOpen, onClose, documento }: ModalHistorialFirmasProps) {
  const handleDescargarHistorial = () => {
    toast.loading('📥 Generando reporte de historial...', {
      id: 'descargar-historial',
      duration: 2000
    });

    setTimeout(() => {
      toast.success('✅ Reporte descargado', {
        id: 'descargar-historial',
        description: `Historial_${documento.id}.pdf descargado exitosamente`,
        duration: 3000
      });
    }, 2000);
  };

  const getIconoAccion = (accion: string) => {
    if (accion.includes('firmado')) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (accion.includes('compartido')) return <Share2 className="w-5 h-5 text-blue-600" />;
    if (accion.includes('cargado')) return <Upload className="w-5 h-5 text-purple-600" />;
    if (accion.includes('visualizado')) return <Eye className="w-5 h-5 text-orange-600" />;
    return <FileText className="w-5 h-5 text-gray-600" />;
  };

  const getColorLinea = (accion: string) => {
    if (accion.includes('firmado')) return '#10B981';
    if (accion.includes('compartido')) return '#3B82F6';
    if (accion.includes('cargado')) return '#8B5CF6';
    if (accion.includes('visualizado')) return '#F59E0B';
    return '#6B7280';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogDescription className="sr-only">
          Historial completo de firmas y trazabilidad del documento {documento.nombre}
        </DialogDescription>

        {/* Header Premium */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#003DA5] to-[#1e5da8] text-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <History className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-white">
                    Historial y Trazabilidad
                  </DialogTitle>
                  <p className="text-sm text-blue-100">
                    {documento.nombre}
                  </p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white font-semibold border-white/30">
                {documento.id} • {documento.historial.length} eventos registrados
              </Badge>
            </div>

            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Información General del Documento */}
          <Card className="p-5 border-2 border-blue-200 bg-blue-50">
            <h3 className="font-black text-lg mb-4" style={{ color: '#003DA5' }}>
              📄 Información del Documento
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 text-xs mb-1">ID Documento</p>
                <p className="font-bold text-gray-900">{documento.id}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs mb-1">Tipo</p>
                <p className="font-bold text-gray-900">{documento.tipo}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs mb-1">Fecha de Carga</p>
                <p className="font-bold text-gray-900">{documento.fechaCarga}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs mb-1">Cargado Por</p>
                <p className="font-bold text-gray-900">{documento.cargadoPor}</p>
              </div>
            </div>
          </Card>

          {/* Estado de Firmas */}
          <Card className="p-5 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg" style={{ color: '#003DA5' }}>
                ✍️ Estado de Firmas
              </h3>
              <Badge
                className="font-bold"
                style={{
                  background: documento.estado === 'firmado' ? '#10B981' :
                              documento.estado === 'en_proceso' ? '#F59E0B' : '#EF4444',
                  color: '#FFFFFF'
                }}
              >
                {documento.firmasCompletadas} de {documento.firmasRequeridas} firmas
              </Badge>
            </div>

            {/* Barra de Progreso */}
            <div className="mb-4">
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                  style={{ width: `${(documento.firmasCompletadas / documento.firmasRequeridas) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1 text-right">
                {Math.round((documento.firmasCompletadas / documento.firmasRequeridas) * 100)}% completado
              </p>
            </div>

            {/* Lista de Firmantes */}
            <div className="space-y-2">
              {documento.firmantes.map((firmante: any, idx: number) => (
                <Card key={idx} className="p-4 bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        firmante.estado === 'firmado' ? 'bg-green-100' : 'bg-orange-100'
                      }`}>
                        {firmante.estado === 'firmado' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-gray-900">{firmante.nombre}</p>
                        <p className="text-xs text-gray-600">{firmante.cargo}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {firmante.estado === 'firmado' ? (
                        <div>
                          <Badge className="bg-green-100 text-green-700 font-semibold mb-1">
                            ✓ Firmado
                          </Badge>
                          <p className="text-xs text-gray-600">
                            {firmante.fechaFirma} • {firmante.horaFirma}
                          </p>
                        </div>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 font-semibold">
                          ⏳ Pendiente
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* Timeline de Eventos */}
          <Card className="p-5 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg" style={{ color: '#003DA5' }}>
                📅 Línea de Tiempo
              </h3>
              <Button
                size="sm"
                onClick={handleDescargarHistorial}
                style={{ background: '#F57C00', color: '#FFFFFF' }}
                className="font-semibold"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar Reporte
              </Button>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Línea vertical */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-gray-300" />

              {/* Eventos */}
              <div className="space-y-6">
                {documento.historial.map((evento: any, idx: number) => {
                  const colorLinea = getColorLinea(evento.accion);
                  const icono = getIconoAccion(evento.accion);

                  return (
                    <div key={idx} className="relative pl-16">
                      {/* Icono en la línea */}
                      <div
                        className="absolute left-0 p-2 rounded-full bg-white shadow-lg border-4"
                        style={{ borderColor: colorLinea }}
                      >
                        {icono}
                      </div>

                      {/* Contenido del evento */}
                      <Card
                        className="p-4 border-2 hover:shadow-md transition-all"
                        style={{ borderColor: `${colorLinea}40` }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold text-gray-900">{evento.accion}</h4>
                          <Badge
                            className="font-semibold"
                            style={{ background: `${colorLinea}20`, color: colorLinea }}
                          >
                            Evento #{documento.historial.length - idx}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-500">Usuario</p>
                              <p className="font-bold text-gray-900">{evento.usuario}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-500">Fecha</p>
                              <p className="font-bold text-gray-900">{evento.fecha}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-500">Hora</p>
                              <p className="font-bold text-gray-900">{evento.hora}</p>
                            </div>
                          </div>
                        </div>

                        {/* IP y metadata adicional (simulado) */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="font-semibold">Dirección IP:</span>
                              <span className="ml-1">192.168.1.{100 + idx}</span>
                            </div>
                            <div>
                              <span className="font-semibold">Dispositivo:</span>
                              <span className="ml-1">Windows 11 • Chrome</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>

              {/* Inicio del documento */}
              <div className="relative pl-16 mt-6">
                <div
                  className="absolute left-0 p-2 rounded-full bg-white shadow-lg border-4 border-gray-300"
                >
                  <FileText className="w-5 h-5 text-gray-500" />
                </div>
                <Card className="p-4 bg-gray-50 border-2 border-dashed border-gray-300">
                  <p className="font-bold text-gray-600 text-sm">
                    🚀 Inicio del Documento
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Documento creado en el sistema
                  </p>
                </Card>
              </div>
            </div>
          </Card>

          {/* Información de Certificación */}
          <Card className="p-5 bg-green-50 border-2 border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-green-900 mb-2">
                  ✅ Certificación de Trazabilidad
                </p>
                <p className="text-sm text-green-800 leading-relaxed mb-3">
                  Este historial constituye la trazabilidad completa del documento con validez legal.
                  Todas las acciones están registradas con fecha, hora, usuario y dispositivo.
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-green-700">Total de eventos:</span>
                    <span className="ml-2 font-bold text-green-900">{documento.historial.length}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Último evento:</span>
                    <span className="ml-2 font-bold text-green-900">{documento.ultimaActividad}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Advertencia Legal */}
          <Card className="p-4 bg-orange-50 border-2 border-orange-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-orange-900 mb-1">
                  ⚖️ Validez Legal
                </p>
                <p className="text-sm text-orange-800 leading-relaxed">
                  Este historial de firmas y trazabilidad tiene validez legal conforme a la Ley 527 de 1999
                  sobre Comercio Electrónico, el Decreto 2364 de 2012 y demás normas aplicables sobre
                  firma electrónica y digital en Colombia.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t-2 px-6 py-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Historial generado el {new Date().toLocaleDateString('es-CO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDescargarHistorial}
              variant="outline"
              className="font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar PDF
            </Button>
            <Button
              onClick={onClose}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
              className="font-semibold"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
