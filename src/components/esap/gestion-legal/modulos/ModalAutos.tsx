/**
 * ModalAutos - Gestión de Autos Procesales
 * ✅ Diseño corporativo ESAP 2025 - Versión Premium
 * ✅ Botones siempre visibles con footer sticky
 * ✅ Header azul corporativo con gradiente
 */

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Textarea } from '../../../ui/textarea';
import {
  Scale, Download, Eye, FileText, Calendar,
  AlertCircle, CheckCircle, Clock, X, Upload, Plus,
  Trash2, Edit, Search, Filter, ZoomIn, ZoomOut, Printer, Maximize2
} from 'lucide-react';
import type { ExpedienteJudicial } from '../core/types';
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { legalService } from '../../../../services/api/legal.service';
import { VisorPDFModal } from './VisorPDFModal';
import { ModalNuevoAuto } from './ModalNuevoAuto';
import { ModalHeaderClean } from './ModalHeaderClean';

interface ModalAutosProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
}

// Tipos de autos judiciales
const tiposAuto = [
  'Auto Admisorio',
  'Auto de Pruebas',
  'Auto de Traslado',
  'Auto de Archivo',
  'Auto de Nulidad',
  'Auto de Corrección',
  'Auto Interlocutorio',
  'Auto de Sustanciación'
];

interface Auto {
  id: string;
  tipo: string;
  numero: string;
  fechaAuto: string;
  juzgado: string;
  resumen: string;
  estado: string;
  fechaNotificacion?: string;
  archivoNombre: string;
  archivoUrl: string;
  diasRestantes?: number; // Calculated on frontend or backend
}

export function ModalAutos({ isOpen, onClose, expediente }: ModalAutosProps) {
  const [autos, setAutos] = useState<Auto[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [visorPDFAbierto, setVisorPDFAbierto] = useState(false);
  const [documentoActual, setDocumentoActual] = useState<typeof autosMock[0] | null>(null);
  const [modalNuevoAutoAbierto, setModalNuevoAutoAbierto] = useState(false);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAutoData, setNewAutoData] = useState({
    tipo: '',
    numero: `AUTO-${new Date().getFullYear()}-001`,
    fechaAuto: new Date().toISOString().split('T')[0],
    juzgado: 'Juzgado 1° Administrativo',
    resumen: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch Autos
  const fecthAutos = async () => {
    setLoading(true);
    try {
      const data = await legalService.getAutos(expediente.id);
      setAutos(data);
    } catch (error) {
      console.error('Error fetching autos:', error);
      toast.error('Error al cargar autos procesales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fecthAutos();
    }
  }, [isOpen, expediente.id]);

  const handleDescargarAuto = async (auto: Auto) => {
    try {
      const response = await fetch(auto.archivoUrl);
      if (!response.ok) throw new Error('Error al descargar el archivo');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = auto.archivoNombre || `auto-${auto.numero}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Error al descargar el archivo');
    }
  };

  const handleVerAuto = (auto: Auto) => {
    // Same logic for now, opens in new tab
    window.open(auto.archivoUrl, '_blank');
  };

  const handleCreateAuto = async () => {
    if (!selectedFile) {
      toast.error('Debes adjuntar el archivo del auto');
      return;
    }
    if (!newAutoData.tipo || !newAutoData.numero || !newAutoData.resumen) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    const toastId = toast.loading('Creando auto procesal...');
    try {
      // Use current radicado as ID (or expediente.id if they match, checking types)
      await legalService.createAuto(expediente.id, newAutoData, selectedFile);
      toast.success('Auto creado exitosamente', { id: toastId });
      setIsCreateOpen(false);
      setSelectedFile(null);
      // Reset form basic fields maybe?
      fecthAutos();
    } catch (error) {
      console.error(error);
      toast.error('Error al crear el auto', { id: toastId });
    }
  };

  const handleCargarNuevoAuto = () => {
    toast.info('📄 Abriendo carga de auto procesal', {
      description: 'Selecciona el archivo del auto judicial',
      duration: 2000
    });
    
    // Simular apertura de input file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        // Mostrar toast de procesamiento
        toast.info('⏳ Procesando auto procesal...', {
          description: `${file.name} - ${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          duration: 2000
        });
        
        // Reset filtros para mostrar el nuevo auto inmediatamente
        setFiltroTipo('TODOS');
        setBusqueda('');

        toast.success('✅ Auto procesal cargado exitosamente');
      }
    };
    
    input.click();
  };

  const handleEliminarAuto = async (id: string, numero: string) => {
    if (!confirm(`¿Estás seguro de eliminar el auto ${numero}?`)) return;

    const toastId = toast.loading('Eliminando auto...');
    try {
      await legalService.deleteAuto(id);
      toast.success('Auto eliminado', { id: toastId });
      setAutos(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar el auto', { id: toastId });
    }
  };

  const handleNotificar = async (id: string) => {
    const toastId = toast.loading('Actualizando estado...');
    try {
      await legalService.updateAutoEstado(id, 'Notificado');
      toast.success('Auto marcado como notificado', { id: toastId });
      fecthAutos(); // Refresh to show new state and date
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar estado', { id: toastId });
    }
  };

  const handleDescargarTodos = () => {
    const url = legalService.getAutosDownloadUrl(expediente.id);
    window.open(url, '_blank');
  };

  const getEstadoBadge = (estado: string) => {
    const colorClass = estado === 'Notificado' ? 'bg-green-100 text-green-700 border-green-300'
      : estado === 'Archivado' ? 'bg-blue-100 text-blue-700 border-blue-300'
        : 'bg-orange-100 text-orange-700 border-orange-300';

    const icon = estado === 'Notificado' ? <CheckCircle className="w-3 h-3" />
      : estado === 'Archivado' ? <Clock className="w-3 h-3" />
        : <AlertCircle className="w-3 h-3" />;

    return (
      <Badge className={`${colorClass} font-semibold flex items-center gap-1`}>
        {icon}
        {estado}
      </Badge>
    );
  };

  // Aplicar filtros y búsqueda
  const autosFiltrados = autos
    .filter(a => filtroTipo === 'TODOS' || a.tipo === filtroTipo)
    .filter(a =>
      busqueda === '' ||
      a.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.tipo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (a.resumen && a.resumen.toLowerCase().includes(busqueda.toLowerCase()))
    );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">
          Autos Procesales - Expediente {expediente.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Gestión de autos procesales del expediente {expediente.id}
        </DialogDescription>
        
        {/* Header Corporativo ESAP 2025 - Diseño Limpio y Usable */}
        <ModalHeaderClean
          titulo="Autos Procesales"
          subtitulo={`Decisiones judiciales del expediente ${expediente.id}`}
          icono={Scale}
          colorIcono="indigo"
          badgePrincipal={expediente.etapa}
          badges={
            <>
              <Badge variant="outline" className="font-semibold text-xs border-indigo-300 text-indigo-700">
                <FileText className="w-3 h-3 mr-1" />
                {autos.length} autos registrados
              </Badge>
              <Badge variant="outline" className="font-semibold text-xs border-green-300 text-green-700">
                <CheckCircle className="w-3 h-3 mr-1" />
                {autos.filter(a => a.estado === 'Notificado').length} notificados
              </Badge>
              <Badge variant="outline" className="font-semibold text-xs border-orange-300 text-orange-700">
                <AlertCircle className="w-3 h-3 mr-1" />
                {autos.filter(a => a.estado === 'Pendiente').length} pendientes
              </Badge>
            </>
          }
          onClose={onClose}
        />

        {/* Barra de búsqueda y filtros */}
        <div className="px-6 py-4 bg-gradient-to-b from-blue-50 to-white border-b flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por número, tipo o contenido del auto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 text-sm font-semibold"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCreateOpen(true)}
              className="font-bold"
              // onClick={() => setModalNuevoAutoAbierto(true)}
              // className="font-bold text-white"
              // style={{ background: '#F57C00' }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nuevo Auto
            </Button>
          </div>

          {/* Filtros por tipo */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <Button
              size="sm"
              variant={filtroTipo === 'TODOS' ? 'default' : 'outline'}
              onClick={() => setFiltroTipo('TODOS')}
              className="text-xs font-bold whitespace-nowrap"
              style={filtroTipo === 'TODOS' ? { background: '#003DA5', color: '#FFFFFF' } : {}}
            >
              Todos ({autos.length})
            </Button>
            {tiposAuto.slice(0, 5).map((tipo) => {
              const count = autos.filter(a => a.tipo === tipo).length;
              return (
                <Button
                  key={tipo}
                  size="sm"
                  variant={filtroTipo === tipo ? 'default' : 'outline'}
                  onClick={() => setFiltroTipo(tipo)}
                  className="text-xs font-bold whitespace-nowrap"
                  style={filtroTipo === tipo ? { background: '#003DA5', color: '#FFFFFF' } : {}}
                >
                  {tipo} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        {/* Contenido - Lista de autos */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Información contextual */}
          <Card className="p-4 mb-4 border-l-4 border-l-orange-500" style={{ background: 'linear-gradient(135deg, #FFF3E0 0%, #FFFFFF 100%)' }}>
            <h4 className="text-sm font-black text-orange-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              ¿Qué son los Autos Procesales?
            </h4>
            <p className="text-xs text-orange-800 leading-relaxed">
              Los <strong>autos</strong> son decisiones judiciales emitidas por el juzgado durante el proceso.
              Es fundamental dar cumplimiento oportuno a cada auto para evitar sanciones procesales.
            </p>
          </Card>

          {/* Lista de autos */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-10 text-gray-500">Cargando autos...</div>
            ) : autosFiltrados.length === 0 ? (
              <Card className="p-8 text-center">
                <Scale className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-bold text-gray-600 mb-1">
                  No hay autos {filtroTipo !== 'TODOS' ? `de tipo "${filtroTipo}"` : 'que coincidan con tu búsqueda'}
                </p>
                <p className="text-xs text-gray-500">
                  {filtroTipo !== 'TODOS' ? 'Intenta con otro filtro' : 'Intenta con otros términos de búsqueda'}
                </p>
              </Card>
            ) : (
              autosFiltrados.map((auto) => (
                <Card key={auto.id} className="p-4 hover:shadow-lg transition-all border-l-4" style={{ borderLeftColor: auto.estadoColor === 'green' ? '#22c55e' : auto.estadoColor === 'blue' ? '#3b82f6' : '#f97316' }}>
                  <div className="flex items-start gap-4">
                    {/* Icono del tipo */}
                    <div className="p-3 rounded-lg flex-shrink-0" style={{ background: '#FFF3E0' }}>
                      <Scale className="w-6 h-6" style={{ color: '#F57C00' }} />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-black text-gray-900">{auto.numero}</h4>
                            {getEstadoBadge(auto.estado)}
                          </div>
                          <Badge variant="outline" className="text-xs font-bold mb-2">
                            {auto.tipo}
                          </Badge>
                        </div>
                      </div>

                      {/* Resumen */}
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {auto.resumen}
                      </p>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">📅 Fecha Auto</p>
                          <p className="text-xs font-bold text-gray-900">{new Date(auto.fechaAuto).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">⚖️ Juzgado</p>
                          <p className="text-xs font-bold text-gray-900">{auto.juzgado}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">🔔 Notificación</p>
                          <p className="text-xs font-bold text-gray-900">
                            {auto.fechaNotificacion ? new Date(auto.fechaNotificacion).toLocaleDateString() : 'Pendiente'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">✅ Cumplimiento</p>
                          <p className="text-xs font-bold text-gray-900">
                            {auto.estado === 'Notificado' ? 'Completado' : 'Pendiente'}
                          </p>
                        </div>
                        {/* Alerta de días restantes */}
                        {auto.diasRestantes && (
                          <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 mb-3">
                            <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              ⚠️ Quedan {auto.diasRestantes} días para dar cumplimiento
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Archivo y acciones */}
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border-2 border-gray-200">
                        <FileText className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {auto.archivoNombre}
                          </p>
                          {/* <p className="text-xs text-gray-500 font-semibold">{auto.tamaño}</p> */}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* Botón Ver */}
                          <Button
                            size="sm"
                            onClick={() => handleVerAuto(auto)}
                            title="Ver documento completo"
                            className="font-bold text-xs px-3 py-1.5 text-white"
                            style={{ background: '#F57C00' }}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Ver
                          </Button>
                          
                          {/* Botón Descargar */}
                          <Button
                            size="sm"
                            onClick={() => handleDescargarAuto(auto)}
                            title="Descargar archivo PDF"
                            className="font-bold text-xs px-3 py-1.5 text-white"
                            style={{ background: '#003DA5' }}
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Descargar
                          </Button>

                          {/* Botón Eliminar - Rojo peligro */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEliminarAuto(auto.id, auto.numero)}
                            title="Eliminar auto del expediente"
                            className="font-semibold text-xs px-2 py-1.5 border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>

                          {/* Botón Notificado (condicional) */}
                          {auto.estado !== 'Notificado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleNotificar(auto.id)}
                              title="Marcar como notificado"
                              className="font-bold text-xs px-2 py-1.5 border-green-500 text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          
                          {/* Botón Eliminar */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`¿Estás seguro de eliminar el auto ${auto.numero}?`)) {
                                handleEliminarAuto(auto.id, auto.numero);
                              }
                            }}
                            title="Eliminar auto"
                            className="font-bold text-xs px-2 py-1.5 border-red-400 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Footer - Botones SIEMPRE visibles */}
        <div 
          className="flex-shrink-0 bg-white border-t-2 px-6 py-4"
          style={{ 
            borderTopColor: '#003DA5',
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose} className="font-bold">
                <X className="w-4 h-4 mr-1.5" />
                Cerrar
              </Button>
              <div className="text-xs text-gray-600">
                Mostrando <strong className="text-blue-700">{autosFiltrados.length}</strong> de{' '}
                <strong className="text-blue-700">{autos.length}</strong> autos
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleDescargarTodos}
                variant="outline"
                className="font-bold"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Descargar Todos (ZIP)
              </Button>
              <Button
                // onClick={() => setIsCreateOpen(true)}
                // className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
                onClick={handleCargarNuevoAuto}
                className="font-bold text-white"
                style={{ background: '#F57C00' }}
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Cargar Auto Nuevo
              </Button>
            </div>
          </div>
        </div>

        {/* Modal Crear Auto */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogTitle>Crear Nuevo Auto</DialogTitle>
            <DialogDescription>Registra un nuevo auto procesal en el expediente.</DialogDescription>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Tipo de Auto</Label>
                <Select onValueChange={(val) => setNewAutoData({ ...newAutoData, tipo: val })} value={newAutoData.tipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {tiposAuto.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Número</Label>
                  <Input value={newAutoData.numero} onChange={e => setNewAutoData({ ...newAutoData, numero: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={newAutoData.fechaAuto} onChange={e => setNewAutoData({ ...newAutoData, fechaAuto: e.target.value })} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Juzgado</Label>
                <Input value={newAutoData.juzgado} onChange={e => setNewAutoData({ ...newAutoData, juzgado: e.target.value })} />
              </div>

              <div className="grid gap-2">
                <Label>Resumen / Contenido</Label>
                <Textarea value={newAutoData.resumen} onChange={e => setNewAutoData({ ...newAutoData, resumen: e.target.value })} />
              </div>

              <div className="grid gap-2">
                <Label>Archivo del Auto (PDF)</Label>
                <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateAuto} disabled={!selectedFile}>Crear Auto</Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>

      {/* Visor de PDF Corporativo Premium */}
      {visorPDFAbierto && documentoActual && (
        <VisorPDFModal
          isOpen={visorPDFAbierto}
          onClose={() => {
            setVisorPDFAbierto(false);
            setDocumentoActual(null);
          }}
          documento={documentoActual}
          expedienteId={expediente.id}
        />
      )}

      {/* Modal para registrar nuevo auto */}
      <ModalNuevoAuto
        isOpen={modalNuevoAutoAbierto}
        onClose={() => setModalNuevoAutoAbierto(false)}
        expedienteId={expediente.id}
        onGuardar={(nuevoAuto) => {
          setAutos([nuevoAuto, ...autos]);
          setFiltroTipo('TODOS');
          setBusqueda('');
        }}
      />
    </Dialog>
  );
}
