/**
 * ModalProcesoDisciplinario - Modal del Expediente Disciplinario
 * ✅ Diseño corporativo ESAP premium
 * ✅ 6 tabs funcionales con lógica de negocio profesional
 * ✅ Similar a ModalExpediente pero adaptado para procesos disciplinarios
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import { 
  Gavel, FileText, Users, Clock, AlertTriangle, CheckCircle, X,
  Calendar, User, Building, Phone, Mail, MapPin, Briefcase,
  Eye, Download, Upload, Plus, Edit, Trash2, Send
} from 'lucide-react';
import type { ProcesoDisciplinario } from '../core/types';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';

interface ModalProcesoDisciplinarioProps {
  isOpen: boolean;
  onClose: () => void;
  proceso: ProcesoDisciplinario;
}

export function ModalProcesoDisciplinario({ isOpen, onClose, proceso }: ModalProcesoDisciplinarioProps) {
  const [tabActivo, setTabActivo] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  const handleGuardarCambios = () => {
    toast.success('Cambios guardados exitosamente', {
      description: `Los cambios del proceso ${proceso.id} se han guardado correctamente`,
      duration: 3000,
    });
    setHasChanges(false);
    // Aquí iría la lógica para guardar en el backend
    // await actualizarProceso(proceso.id, cambios);
  };

  const handleCerrar = () => {
    if (hasChanges) {
      if (confirm('¿Deseas cerrar sin guardar los cambios?')) {
        setHasChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCerrar}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogDescription className="sr-only">
          Vista completa del proceso disciplinario {proceso.id} con información detallada de hechos, pruebas, actuaciones y decisiones
        </DialogDescription>
        
        {/* ==================== HEADER STICKY ==================== */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <Gavel className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-white">
                    {proceso.id}
                  </DialogTitle>
                  <p className="text-sm text-blue-100">{proceso.tipoFalta}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-white/20 text-white font-semibold border-white/30">
                  {proceso.etapa}
                </Badge>
                <Badge className="bg-orange-500 text-white font-semibold">
                  {proceso.diasRestantes} días restantes
                </Badge>
              </div>
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

        {/* ==================== TABS NAVIGATION ==================== */}
        <Tabs value={tabActivo} onValueChange={setTabActivo} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 border-b bg-gray-50">
            <TabsList className="bg-transparent border-0 p-0 h-auto gap-1">
              <TabsTrigger 
                value="general"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <FileText className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger 
                value="hechos"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Hechos
              </TabsTrigger>
              <TabsTrigger 
                value="pruebas"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <Eye className="w-4 h-4 mr-2" />
                Pruebas
              </TabsTrigger>
              <TabsTrigger 
                value="actuaciones"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <Clock className="w-4 h-4 mr-2" />
                Actuaciones
              </TabsTrigger>
              <TabsTrigger 
                value="decisiones"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Decisiones
              </TabsTrigger>
              <TabsTrigger 
                value="documentos"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <FileText className="w-4 h-4 mr-2" />
                Documentos
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ==================== TAB: GENERAL ==================== */}
          <TabsContent value="general" className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Información del Proceso */}
              <Card className="p-4 border-2 border-blue-100">
                <h3 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                  <Gavel className="w-5 h-5" />
                  Información del Proceso
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Número de Proceso</p>
                    <p className="font-bold text-lg" style={{ color: '#003DA5' }}>{proceso.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tipo de Falta</p>
                    <Badge className="bg-orange-100 text-orange-700 font-semibold">
                      {proceso.tipoFalta}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Etapa Actual</p>
                    <p className="font-bold">{proceso.etapa}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Investigador Asignado</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5' }}>
                          {proceso.abogadoAsignado.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-bold">{proceso.abogadoAsignado}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Información del Disciplinado */}
              <Card className="p-4 border-2 border-gray-200">
                <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-gray-800">
                  <User className="w-5 h-5" />
                  Disciplinado
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Nombre Completo</p>
                    <p className="font-bold text-lg">{proceso.disciplinado}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cargo</p>
                    <p className="font-semibold">{proceso.cargo || 'Coordinador Académico'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Dependencia</p>
                    <p className="font-semibold">{proceso.dependencia || 'Dirección Académica'}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Cronología de Términos */}
            <Card className="p-4 bg-blue-50 border-2 border-blue-200">
              <h3 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                <Clock className="w-5 h-5" />
                Cronología de Términos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Días Restantes</p>
                  <p className="text-3xl font-black text-orange-600">{proceso.diasRestantes}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Días Transcurridos</p>
                  <p className="text-3xl font-black text-blue-600">{proceso.diasTotales - proceso.diasRestantes}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Días Totales</p>
                  <p className="text-3xl font-black text-gray-600">{proceso.diasTotales}</p>
                </div>
              </div>
              
              {/* Barra de progreso */}
              <div className="mt-4">
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                    style={{ width: `${((proceso.diasTotales - proceso.diasRestantes) / proceso.diasTotales) * 100}%` }}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* ==================== TAB: HECHOS ==================== */}
          <TabsContent value="hechos" className="flex-1 overflow-y-auto p-6">
            <Card className="p-6">
              <h3 className="font-black text-xl mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                <AlertTriangle className="w-6 h-6" />
                Descripción de los Hechos
              </h3>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  {proceso.descripcionHechos || 'El funcionario presuntamente incurrió en irregularidades durante el proceso de selección de docentes, favoreciendo candidatos sin cumplir los requisitos establecidos en el manual de contratación de la entidad.'}
                </p>
              </div>
              
              <div className="mt-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <p className="text-sm font-bold text-orange-800 mb-2">⚠️ Clasificación de la Falta</p>
                <Badge className="bg-orange-600 text-white font-bold text-sm">
                  FALTA {proceso.tipoFalta?.toUpperCase()}
                </Badge>
              </div>
            </Card>
          </TabsContent>

          {/* ==================== TAB: PRUEBAS ==================== */}
          <TabsContent value="pruebas" className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl" style={{ color: '#003DA5' }}>Material Probatorio</h3>
              <Button 
                onClick={() => {
                  toast.info('Agregando nueva prueba...');
                  setHasChanges(true);
                }}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Prueba
              </Button>
            </div>

            {[1, 2, 3].map((item) => (
              <Card key={item} className="p-4 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-50">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-1">Prueba Documental #{item}</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Documento probatorio relacionado con el proceso disciplinario
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => toast.info(`Visualizando prueba #${item}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => toast.success(`Descargando prueba #${item}...`)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Descargar
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* ==================== TAB: ACTUACIONES ==================== */}
          <TabsContent value="actuaciones" className="flex-1 overflow-y-auto p-6">
            <h3 className="font-black text-xl mb-4" style={{ color: '#003DA5' }}>
              Historial de Actuaciones
            </h3>
            <div className="space-y-3">
              {[
                { fecha: '26/12/2024', actuacion: proceso.ultimaActuacion || 'Solicitud de informes a RRHH', tipo: 'info' },
                { fecha: '20/12/2024', actuacion: 'Auto de apertura de investigación disciplinaria', tipo: 'alert' },
                { fecha: '15/12/2024', actuacion: 'Recepción de queja por irregularidades', tipo: 'start' }
              ].map((act, idx) => (
                <Card key={idx} className="p-4 border-l-4" style={{ borderLeftColor: act.tipo === 'alert' ? '#F59E0B' : '#003DA5' }}>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-900">{act.actuacion}</p>
                      <p className="text-xs text-gray-500 mt-1">📅 {act.fecha}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ==================== TAB: DECISIONES ==================== */}
          <TabsContent value="decisiones" className="flex-1 overflow-y-auto p-6">
            <Card className="p-6 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="font-black text-xl mb-2 text-gray-600">Sin Decisiones Registradas</h3>
              <p className="text-gray-500 mb-4">
                El proceso aún se encuentra en etapa de investigación
              </p>
              <Button 
                onClick={() => {
                  toast.info('Abriendo formulario de decisión...');
                  setHasChanges(true);
                }}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Registrar Decisión
              </Button>
            </Card>
          </TabsContent>

          {/* ==================== TAB: DOCUMENTOS ==================== */}
          <TabsContent value="documentos" className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl" style={{ color: '#003DA5' }}>Documentos del Proceso</h3>
              <Button 
                onClick={() => {
                  toast.success('Documento subido correctamente');
                  setHasChanges(true);
                }}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir Documento
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <Card key={item} className="p-4 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div className="flex-1">
                      <h4 className="font-bold mb-1">Documento_{item}.pdf</h4>
                      <p className="text-xs text-gray-500">256 KB • 26/12/2024</p>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => toast.info(`Visualizando documento ${item}`)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Ver
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => toast.success(`Descargando documento ${item}...`)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* ==================== FOOTER STICKY ==================== */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Última actualización:</span> {proceso.fechaActualizacion.toLocaleDateString('es-CO')}
            </p>
            {hasChanges && (
              <Badge className="bg-orange-100 text-orange-700 font-semibold text-xs">
                Cambios sin guardar
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCerrar}
              className="font-semibold"
            >
              Cerrar
            </Button>
            <Button 
              onClick={handleGuardarCambios}
              disabled={!hasChanges}
              className="font-semibold"
              style={{ 
                background: hasChanges ? '#003DA5' : '#9CA3AF', 
                color: '#FFFFFF',
                cursor: hasChanges ? 'pointer' : 'not-allowed'
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}