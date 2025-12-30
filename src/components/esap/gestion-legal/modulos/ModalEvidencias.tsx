/**
 * ModalEvidencias - Gestión de Evidencias y Pruebas Documentales
 * Evidencias = Pruebas aportadas por las partes para sustentar sus pretensiones
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Textarea } from '../../../ui/textarea';
import {
  Paperclip, Download, Eye, FileText, Image as ImageIcon,
  Video, File, X, Upload, Plus, Trash2, CheckCircle, AlertCircle,
  Search, Star, Filter, Edit
} from 'lucide-react';
import type { ExpedienteJudicial } from '../core/types';
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { legalService } from '../../../../services/api/legal.service';

interface ModalEvidenciasProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
}

// Categorías de evidencias
const categorias = [
  'TODOS',
  'Documentales',
  'Testimoniales',
  'Periciales',
  'Fotográficas',
  'Audiovisuales',
  'Digitales'
];

// Mocks eliminados - Datos cargados desde API

export function ModalEvidencias({ isOpen, onClose, expediente }: ModalEvidenciasProps) {
  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [vistaDetallada, setVistaDetallada] = useState(true);

  // Form state for creating new evidencia
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newEvidenciaData, setNewEvidenciaData] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'Documentales',
    aportadoPor: 'ESAP',
    prioridad: 'Media'
  });

  // Cargar evidencias al abrir
  useEffect(() => {
    if (isOpen && (expediente.uuid || expediente.id)) {
      loadEvidencias();
    }
  }, [isOpen, expediente]);

  const loadEvidencias = async () => {
    try {
      setLoading(true);
      const data = await legalService.getEvidencias(expediente.uuid || expediente.id);

      const mapped = data.map((ev: any) => ({
        id: ev.id,
        nombre: ev.archivoNombre || ev.descripcion || 'Sin nombre',
        categoria: ev.tipo || 'Documentales',
        tipo: ev.tipoArchivo || getFileType(ev.archivoNombre),
        tamaño: ev.archivoTamano ? `${(ev.archivoTamano / (1024 * 1024)).toFixed(2)} MB` : 'N/A',
        fecha: new Date(ev.createdAt).toLocaleDateString('es-CO'),
        aportadoPor: ev.aportadoPor || 'ESAP',
        descripcion: ev.descripcion || 'Sin descripción',
        estado: ev.estado || 'En Revisión',
        estadoColor: getEstadoColor(ev.estado),
        relevancia: ev.prioridad || 'Media',
        folios: 'Por asignar',
        archivoUrl: ev.archivoUrl
      }));

      setEvidencias(mapped);
    } catch (error) {
      console.error('Error cargando evidencias:', error);
      toast.error('Error al cargar evidencias');
      setEvidencias([]);
    } finally {
      setLoading(false);
    }
  };

  const getFileType = (filename: string | undefined): string => {
    if (!filename) return 'pdf';
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    if (['mp4', 'avi', 'mov'].includes(ext)) return 'video';
    return 'pdf';
  };

  const getEstadoColor = (estado: string | undefined): string => {
    if (!estado) return 'blue';
    if (estado.toLowerCase().includes('admitida')) return 'green';
    if (estado.toLowerCase().includes('pendiente')) return 'orange';
    return 'blue';
  };

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://localhost:3008${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleDescargarEvidencia = async (evidencia: any) => {
    if (!evidencia.archivoUrl) {
      toast.error('Esta evidencia no tiene archivo adjunto');
      return;
    }
    try {
      toast.info('Iniciando descarga...');
      const response = await fetch(getFullUrl(evidencia.archivoUrl));
      if (!response.ok) throw new Error('Error al descargar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', evidencia.nombre);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Error al descargar el archivo');
    }
  };

  const handleVerEvidencia = (evidencia: any) => {
    if (!evidencia.archivoUrl) {
      toast.error('No hay archivo para visualizar');
      return;
    }
    window.open(getFullUrl(evidencia.archivoUrl), '_blank');
  };

  const handleCargarNuevaEvidencia = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4,.mp3,.zip';

    input.onchange = async (e: any) => {
      const files = e.target?.files;
      if (files && files.length > 0) {
        try {
          toast.loading('Subiendo evidencias...');

          for (const file of Array.from(files) as File[]) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('descripcion', `Evidencia: ${file.name}`);
            formData.append('tipo', 'Documentales');
            formData.append('aportadoPor', 'ESAP');
            formData.append('prioridad', 'Media');

            await legalService.createEvidencia(expediente.uuid || expediente.id, formData);
          }

          toast.dismiss();
          toast.success(`${files.length} evidencia(s) cargada(s) correctamente`);
          loadEvidencias();
        } catch (error) {
          console.error('Error subiendo evidencias:', error);
          toast.dismiss();
          toast.error('Error al subir evidencias');
        }
      }
    };

    input.click();
  };

  const handleEliminarEvidencia = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar evidencia "${nombre}"?`)) return;
    try {
      await legalService.deleteEvidencia(id);
      toast.success('Evidencia eliminada');
      loadEvidencias();
    } catch (error) {
      console.error('Error eliminando:', error);
      toast.error('Error al eliminar');
    }
  };

  const handleMarcarAdmitida = async (id: string) => {
    try {
      await legalService.updateEvidenciaEstado(id, 'Admitida');
      toast.success('Evidencia marcada como admitida');
      loadEvidencias();
    } catch (error) {
      console.error('Error actualizando estado:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const handleDescargarTodas = () => {
    toast.info('Función de descarga masiva pendiente de implementar');
  };

  const handleCreateEvidencia = async () => {
    if (!selectedFile) {
      toast.error('Debes seleccionar un archivo');
      return;
    }
    if (!newEvidenciaData.descripcion) {
      toast.error('Ingresa una descripción para la evidencia');
      return;
    }

    const toastId = toast.loading('Creando evidencia...');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('nombre', newEvidenciaData.nombre || selectedFile.name);
      formData.append('descripcion', newEvidenciaData.descripcion);
      formData.append('tipo', newEvidenciaData.tipo);
      formData.append('aportadoPor', newEvidenciaData.aportadoPor);
      formData.append('prioridad', newEvidenciaData.prioridad);

      await legalService.createEvidencia(expediente.uuid || expediente.id, formData);
      toast.success('Evidencia creada exitosamente', { id: toastId });
      setIsCreateOpen(false);
      setSelectedFile(null);
      setNewEvidenciaData({ nombre: '', descripcion: '', tipo: 'Documentales', aportadoPor: 'ESAP', prioridad: 'Media' });
      loadEvidencias();
    } catch (error) {
      console.error(error);
      toast.error('Error al crear la evidencia', { id: toastId });
    }
  };

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-600" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-blue-600" />;
      case 'video':
        return <Video className="w-5 h-5 text-purple-600" />;
      default:
        return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  const getEstadoBadge = (estado: string, color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-100 text-green-700 border-green-300',
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      orange: 'bg-orange-100 text-orange-700 border-orange-300'
    };

    return (
      <Badge className={`${colors[color]} font-semibold text-xs`}>
        {estado}
      </Badge>
    );
  };

  const getRelevanciaBadge = (relevancia: string) => {
    const colors: Record<string, string> = {
      'Crítica': 'bg-red-100 text-red-700',
      'Alta': 'bg-orange-100 text-orange-700',
      'Media': 'bg-yellow-100 text-yellow-700',
      'Baja': 'bg-gray-100 text-gray-700'
    };

    return (
      <Badge variant="outline" className={`${colors[relevancia]} text-xs font-semibold`}>
        {relevancia}
      </Badge>
    );
  };

  const evidenciasFiltradas = evidencias
    .filter(e => filtroCategoria === 'TODOS' || e.categoria === filtroCategoria)
    .filter(e =>
      busqueda === '' ||
      e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.categoria.toLowerCase().includes(busqueda.toLowerCase())
    );

  // Estadísticas
  const totalEvidencias = evidencias.length;
  const evidenciasAdmitidas = evidencias.filter(e => e.estado === 'Admitida').length;
  const evidenciasPendientes = evidencias.filter(e => e.estado.includes('Pendiente') || e.estado.includes('Revisión')).length;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogDescription className="sr-only">
            Gestión de evidencias y pruebas documentales del expediente {expediente.id}
          </DialogDescription>
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg" style={{ background: '#FFF3E0' }}>
                    <Paperclip className="w-5 h-5" style={{ color: '#F57C00' }} />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black" style={{ color: '#003DA5' }}>
                      Evidencias y Pruebas
                    </DialogTitle>
                    <p className="text-sm text-gray-600">
                      Material probatorio - {expediente.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge style={{ background: '#003DA5', color: '#FFFFFF' }}>
                    {expediente.etapa}
                  </Badge>
                  <Badge className="bg-green-100 text-green-700 font-semibold">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {evidenciasAdmitidas} admitidas
                  </Badge>
                  <Badge className="bg-orange-100 text-orange-700 font-semibold">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {evidenciasPendientes} pendientes
                  </Badge>
                </div>
              </div>

              <Button onClick={onClose} variant="ghost" size="sm" className="ml-4">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Búsqueda */}
            <div className="flex items-center gap-2 mt-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, categoría o descripción..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-2 mt-3 overflow-x-auto">
              <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
              {categorias.map((cat) => {
                const count = cat === 'TODOS' ? evidencias.length : evidencias.filter(e => e.categoria === cat).length;
                return (
                  <Button
                    key={cat}
                    size="sm"
                    variant={filtroCategoria === cat ? 'default' : 'outline'}
                    onClick={() => setFiltroCategoria(cat)}
                    className="text-xs whitespace-nowrap"
                  >
                    {cat} ({count})
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Información contextual */}
            <Card className="p-4 mb-4 bg-orange-50 border-orange-200">
              <h4 className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Gestión de Evidencias
              </h4>
              <p className="text-xs text-orange-800 leading-relaxed">
                Las <strong>evidencias</strong> son pruebas documentales, testimoniales, periciales o físicas
                que ambas partes aportan para sustentar sus pretensiones. Es crucial mantener organizadas
                todas las pruebas, asegurar su admisibilidad legal y verificar que estén debidamente foliadas
                y relacionadas en el expediente.
              </p>
            </Card>

            {/* Lista de evidencias */}
            <div className="space-y-3">
              {evidenciasFiltradas.length === 0 ? (
                <Card className="p-8 text-center">
                  <Paperclip className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-bold text-gray-600 mb-1">
                    No hay evidencias en "{filtroCategoria}"
                  </p>
                  <p className="text-xs text-gray-500">
                    Intenta con otro filtro o carga una nueva evidencia
                  </p>
                </Card>
              ) : (
                evidenciasFiltradas.map((evidencia) => (
                  <Card key={evidencia.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      {/* Icono del tipo */}
                      <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex-shrink-0">
                        {getIconoTipo(evidencia.tipo)}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-black text-gray-900">{evidencia.nombre}</h4>
                              {getEstadoBadge(evidencia.estado, evidencia.estadoColor)}
                              {getRelevanciaBadge(evidencia.relevancia)}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {evidencia.categoria}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Folios {evidencia.folios}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Descripción */}
                        <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                          {evidencia.descripcion}
                        </p>

                        {/* Metadata */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">📅 Fecha</p>
                            <p className="text-xs font-bold text-gray-900">{evidencia.fecha}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">📤 Aportado por</p>
                            <p className="text-xs font-bold text-gray-900">{evidencia.aportadoPor}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">📦 Tamaño</p>
                            <p className="text-xs font-bold text-gray-900">{evidencia.tamaño}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">📄 Tipo</p>
                            <p className="text-xs font-bold text-gray-900 uppercase">{evidencia.tipo}</p>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerEvidencia(evidencia)}
                            className="text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDescargarEvidencia(evidencia)}
                            className="text-xs"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Descargar
                          </Button>
                          {evidencia.estado !== 'Admitida' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarcarAdmitida(evidencia.id)}
                              className="text-xs text-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Admitir
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEliminarEvidencia(evidencia.id, evidencia.nombre)}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={onClose}>
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Cerrar
                </Button>
                <div className="text-xs text-gray-600">
                  <strong>{evidenciasFiltradas.length}</strong> de <strong>{totalEvidencias}</strong> evidencias
                  · <strong className="text-green-600">{evidenciasAdmitidas} admitidas</strong>
                  · <strong className="text-orange-600">{evidenciasPendientes} pendientes</strong>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleDescargarTodas}
                  variant="outline"
                  className="font-bold"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Descargar Todas ({totalEvidencias})
                </Button>
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Nueva Evidencia
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Crear Evidencia */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogTitle>Nueva Evidencia</DialogTitle>
          <DialogDescription>Registra una nueva evidencia o prueba documental.</DialogDescription>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nombre de la Evidencia</Label>
              <Input
                placeholder="Ej: Contrato Laboral Firmado"
                value={newEvidenciaData.nombre}
                onChange={e => setNewEvidenciaData({ ...newEvidenciaData, nombre: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Categoría / Tipo</Label>
              <Select onValueChange={(val: string) => setNewEvidenciaData({ ...newEvidenciaData, tipo: val })} value={newEvidenciaData.tipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {categorias.filter(c => c !== 'TODOS').map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Describe el contenido y relevancia de la evidencia..."
                value={newEvidenciaData.descripcion}
                onChange={e => setNewEvidenciaData({ ...newEvidenciaData, descripcion: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Aportado por</Label>
                <Select onValueChange={(val: string) => setNewEvidenciaData({ ...newEvidenciaData, aportadoPor: val })} value={newEvidenciaData.aportadoPor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="ESAP">ESAP</SelectItem>
                    <SelectItem value="Demandante">Demandante</SelectItem>
                    <SelectItem value="Juzgado">Juzgado</SelectItem>
                    <SelectItem value="Perito">Perito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Prioridad</Label>
                <Select onValueChange={(val: string) => setNewEvidenciaData({ ...newEvidenciaData, prioridad: val })} value={newEvidenciaData.prioridad}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Archivo de la Evidencia</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4,.mp3,.zip"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              />
              {selectedFile && (
                <p className="text-xs text-gray-500">Seleccionado: {selectedFile.name}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateEvidencia} disabled={!selectedFile}>Crear Evidencia</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}