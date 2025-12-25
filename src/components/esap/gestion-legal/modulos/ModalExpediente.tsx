/**
 * ModalExpediente - Modal de visualización completa del expediente
 * Diseño corporativo ESAP premium
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import { 
  FileText, Scale, User, Calendar, Clock, AlertTriangle,
  Download, Eye, ExternalLink, Paperclip, CheckCircle,
  AlertCircle, TrendingUp, X
} from 'lucide-react';
import type { ExpedienteJudicial } from '../core/types';
import { Avatar, AvatarFallback } from '../../../ui/avatar';

interface ModalExpedienteProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
}

export function ModalExpediente({ isOpen, onClose, expediente }: ModalExpedienteProps) {
  const getSemaforoColor = (diasRestantes: number) => {
    if (diasRestantes <= 5) return { color: '#DC2626', label: 'Crítico', bg: '#FEE2E2' };
    if (diasRestantes <= 15) return { color: '#F59E0B', label: 'Próximo', bg: '#FEF3C7' };
    return { color: '#10B981', label: 'En término', bg: '#D1FAE5' };
  };

  const semaforo = getSemaforoColor(expediente.diasRestantes);
  const porcentajeTiempo = Math.round(((expediente.diasTotales - expediente.diasRestantes) / expediente.diasTotales) * 100);

  // Datos mock de documentos
  const documentos = expediente.documentos || [
    { id: 1, nombre: 'Demanda Principal.pdf', fecha: '15/12/2024', tipo: 'Demanda', tamaño: '2.4 MB' },
    { id: 2, nombre: 'Contestación ESAP.pdf', fecha: '20/12/2024', tipo: 'Contestación', tamaño: '1.8 MB' },
    { id: 3, nombre: 'Auto Admisorio.pdf', fecha: '10/12/2024', tipo: 'Auto', tamaño: '980 KB' },
    { id: 4, nombre: 'Pruebas Documentales.pdf', fecha: '22/12/2024', tipo: 'Pruebas', tamaño: '5.2 MB' }
  ];

  const actuaciones = [
    { fecha: '22/12/2024', descripcion: 'Se presentó contestación de la demanda', responsable: expediente.abogadoAsignado },
    { fecha: '20/12/2024', descripcion: 'Se asignó abogado defensor', responsable: 'Sistema' },
    { fecha: '15/12/2024', descripcion: 'Se recibió notificación de demanda', responsable: 'Centro Comunicaciones' },
    { fecha: '10/12/2024', descripcion: 'Auto admisorio emitido por juzgado', responsable: 'Juzgado Administrativo' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header Sticky */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ background: '#E0EDFF' }}>
                  <Scale className="w-5 h-5" style={{ color: '#003DA5' }} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black" style={{ color: '#003DA5' }}>
                    {expediente.id}
                  </DialogTitle>
                  <p className="text-sm text-gray-600">{expediente.medioControl}</p>
                </div>
              </div>
              
              {/* Badges de estado */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="font-semibold" style={{ background: '#003DA5', color: '#FFFFFF' }}>
                  {expediente.etapa}
                </Badge>
                <Badge 
                  className="font-semibold flex items-center gap-1.5"
                  style={{ background: semaforo.bg, color: semaforo.color, border: `1px solid ${semaforo.color}` }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: semaforo.color }} />
                  {semaforo.label} - {expediente.diasRestantes} días
                </Badge>
                <Badge className="bg-gray-100 text-gray-700 font-semibold">
                  <FileText className="w-3 h-3 mr-1" />
                  {documentos.length} documentos
                </Badge>
              </div>
            </div>

            <Button 
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="ml-4"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="general">📋 General</TabsTrigger>
              <TabsTrigger value="documentos">📄 Documentos</TabsTrigger>
              <TabsTrigger value="actuaciones">⚖️ Actuaciones</TabsTrigger>
              <TabsTrigger value="timeline">📅 Timeline</TabsTrigger>
            </TabsList>

            {/* TAB: GENERAL */}
            <TabsContent value="general" className="space-y-4">
              {/* Información principal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Demandante */}
                <Card className="p-4 border-l-4" style={{ borderLeftColor: '#DC2626' }}>
                  <h4 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    DEMANDANTE
                  </h4>
                  <p className="text-base font-bold text-gray-900 mb-1">{expediente.demandante}</p>
                  <p className="text-xs text-gray-600">CC 1.234.567.890</p>
                  <p className="text-xs text-gray-600 mt-2">📧 demandante@email.com</p>
                  <p className="text-xs text-gray-600">📞 +57 310 123 4567</p>
                </Card>

                {/* Demandado */}
                <Card className="p-4 border-l-4" style={{ borderLeftColor: '#003DA5' }}>
                  <h4 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    DEMANDADO
                  </h4>
                  <p className="text-base font-bold text-gray-900 mb-1">ESAP - Escuela Superior de Administración Pública</p>
                  <p className="text-xs text-gray-600">NIT 899.999.061-4</p>
                  <p className="text-xs text-gray-600 mt-2">📧 juridica@esap.edu.co</p>
                </Card>
              </div>

              {/* Profesional asignado */}
              <Card className="p-4">
                <h4 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  PROFESIONAL ASIGNADO
                </h4>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback 
                      className="text-sm font-bold"
                      style={{ background: '#E0EDFF', color: '#003DA5' }}
                    >
                      {expediente.abogadoAsignado.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-gray-900">{expediente.abogadoAsignado}</p>
                    <p className="text-xs text-gray-600">Abogado Defensor</p>
                    <p className="text-xs text-gray-600">📧 {expediente.abogadoAsignado.toLowerCase().replace(/ /g, '.')}@esap.edu.co</p>
                  </div>
                </div>
              </Card>

              {/* Información del proceso */}
              <Card className="p-4">
                <h4 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  INFORMACIÓN DEL PROCESO
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Radicado</p>
                    <p className="text-sm font-bold text-gray-900">{expediente.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Juzgado</p>
                    <p className="text-sm font-bold text-gray-900">Juzgado 1° Administrativo</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Ciudad</p>
                    <p className="text-sm font-bold text-gray-900">Bogotá D.C.</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Cuantía</p>
                    <p className="text-sm font-bold text-green-600">$45.000.000</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Pretensiones</p>
                    <p className="text-sm font-bold text-gray-900">Reintegro Laboral</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Fecha Notificación</p>
                    <p className="text-sm font-bold text-gray-900">15/12/2024</p>
                  </div>
                </div>
              </Card>

              {/* Última Actuación */}
              <Card className="p-4" style={{ background: '#F0F7FF', border: '2px solid #3B82F6' }}>
                <h4 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: '#003DA5' }}>
                  <AlertCircle className="w-4 h-4" />
                  ÚLTIMA ACTUACIÓN
                </h4>
                <p className="text-sm text-gray-700 mb-2">
                  {expediente.ultimaActuacion || 'No hay actuaciones recientes'}
                </p>
                <p className="text-xs text-gray-600">
                  📅 {expediente.fechaActualizacion.toLocaleDateString('es-CO', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              </Card>

              {/* Progreso */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-gray-600 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    PROGRESO DEL PROCESO
                  </h4>
                  <span className="text-sm font-bold" style={{ color: '#003DA5' }}>
                    {porcentajeTiempo}%
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500"
                    style={{ 
                      width: `${porcentajeTiempo}%`,
                      background: 'linear-gradient(to right, #003DA5, #2563EB)'
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-600">
                    {expediente.diasTotales - expediente.diasRestantes} días transcurridos
                  </span>
                  <span className="text-xs text-gray-600">
                    {expediente.diasRestantes} días restantes
                  </span>
                </div>
              </Card>
            </TabsContent>

            {/* TAB: DOCUMENTOS */}
            <TabsContent value="documentos" className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-gray-700">
                  {documentos.length} documentos en el expediente
                </h4>
                <Button size="sm" style={{ background: '#003DA5', color: '#FFFFFF' }}>
                  <Download className="w-3 h-3 mr-1" />
                  Descargar Todos
                </Button>
              </div>

              {documentos.map((doc: any) => (
                <Card key={doc.id} className="p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-red-50">
                        <FileText className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{doc.nombre}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <Badge variant="outline" className="text-xs">{doc.tipo}</Badge>
                          <span className="text-xs text-gray-500">{doc.tamaño}</span>
                          <span className="text-xs text-gray-500">📅 {doc.fecha}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* TAB: ACTUACIONES */}
            <TabsContent value="actuaciones" className="space-y-3">
              <h4 className="text-sm font-bold text-gray-700 mb-4">
                Historial de Actuaciones Procesales
              </h4>

              <div className="relative">
                {/* Línea vertical */}
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />

                {actuaciones.map((actuacion, idx) => (
                  <div key={idx} className="relative pl-8 pb-6 last:pb-0">
                    {/* Punto en la línea */}
                    <div 
                      className="absolute left-0 top-0 w-6 h-6 rounded-full border-4 border-white"
                      style={{ background: idx === 0 ? '#003DA5' : '#CBD5E0' }}
                    />
                    
                    <Card className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <Badge 
                          className="text-xs font-semibold"
                          style={{ background: idx === 0 ? '#003DA5' : '#E5E7EB', color: idx === 0 ? '#FFFFFF' : '#6B7280' }}
                        >
                          {actuacion.fecha}
                        </Badge>
                        {idx === 0 && (
                          <Badge className="text-xs bg-green-100 text-green-700">
                            Más Reciente
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        {actuacion.descripcion}
                      </p>
                      <p className="text-xs text-gray-600">
                        👤 {actuacion.responsable}
                      </p>
                    </Card>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB: TIMELINE */}
            <TabsContent value="timeline" className="space-y-4">
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h4 className="text-sm font-bold mb-3" style={{ color: '#003DA5' }}>
                  📅 LÍNEA DE TIEMPO ESTIMADA
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">Notificada</p>
                      <p className="text-xs text-gray-600">Completada el 15/12/2024</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">Contestación (Actual)</p>
                      <p className="text-xs text-gray-600">En curso - Vence en {expediente.diasRestantes} días</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-400">Probatoria</p>
                      <p className="text-xs text-gray-500">Pendiente - Inicia después de contestación</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-400">Alegatos</p>
                      <p className="text-xs text-gray-500">Pendiente - Última etapa antes del fallo</p>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer con acciones */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline">
                <Download className="w-3 h-3 mr-1" />
                Descargar PDF
              </Button>
              <Button style={{ background: '#003DA5', color: '#FFFFFF' }}>
                <ExternalLink className="w-3 h-3 mr-1" />
                Abrir en Nueva Pestaña
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
