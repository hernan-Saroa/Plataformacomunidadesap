/**
 * ModalEvidencias - Gestión de evidencias y pruebas documentales
 * Versión simplificada para restaurar compilación.
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Textarea } from '../../../ui/textarea';
import {
  Paperclip,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Trash2,
  Upload,
  Search,
  Filter,
  X
} from 'lucide-react';
import type { ExpedienteJudicial } from '../core/types';
import { toast } from 'sonner';
import { legalService } from '../../../../services/api/legal.service';
import { getServiceUrl, API_MODE } from '../../../../config/environment';
import { ModalHeaderClean } from './ModalHeaderClean';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '../../../../enums/permissions';

interface ModalEvidenciasProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
}

const categorias = [
  'TODOS',
  'Documentales',
  'Testimoniales',
  'Periciales',
  'Fotográficas',
  'Audiovisuales',
  'Digitales'
];

export function ModalEvidencias({ isOpen, onClose, expediente }: ModalEvidenciasProps) {
  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newEvidenciaData, setNewEvidenciaData] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'Documentales',
    relevancia: 'Media'
  });

  useEffect(() => {
    if (isOpen && (expediente.uuid || expediente.id)) {
      loadEvidencias();
    }
  }, [isOpen, expediente]);

  const loadEvidencias = async () => {
    try {
      const data = await legalService.getEvidencias(expediente.uuid || expediente.id);
      setEvidencias(
        data.map((ev: any) => ({
          id: ev.id,
          nombre: ev.archivoNombre || ev.nombre || ev.tipo || 'Evidencia',
          descripcion: ev.descripcion || 'Sin descripción',
          categoria: ev.categoria || ev.tipo || 'Documentales',
          tipo: ev.tipo || 'Documentales',
          folios: ev.folios || 0,
          relevancia: ev.relevancia || ev.prioridad || 'Media',
          estado: ev.estado || 'Pendiente',
          estadoColor: ev.estado === 'Admitida' ? 'green' : 'orange',
          fecha: ev.fechaPresentacion ? new Date(ev.fechaPresentacion).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO'),
          aportadoPor: ev.aportadoPor || 'ESAP',
          url: ev.archivoUrl
        }))
      );
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar evidencias');
      setEvidencias([]);
    }
  };

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'Testimoniales': return '🗣️';
      case 'Periciales': return '🧪';
      case 'Fotográficas': return '📸';
      case 'Audiovisuales': return '🎥';
      case 'Digitales': return '💻';
      default: return '📄';
    }
  };

  const getEstadoBadge = (estado: string, color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-100 text-green-700 border-green-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200'
    };
    return (
      <Badge className={`text-xs font-semibold border ${colors[color] || ''}`}>
        {estado}
      </Badge>
    );
  };

  const evidenciasFiltradas = evidencias.filter(e => {
    const matchCat = filtroCategoria === 'TODOS' || e.categoria === filtroCategoria;
    const matchSearch =
      e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.categoria.toLowerCase().includes(busqueda.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalEvidencias = evidencias.length;
  const evidenciasAdmitidas = evidencias.filter(e => e.estado === 'Admitida').length;
  const evidenciasPendientes = evidencias.filter(e => e.estado !== 'Admitida').length;

  const handleDescargarTodas = async () => {
    if (evidencias.length === 0) {
      toast.info('No hay evidencias para descargar');
      return;
    }

    toast.loading('📦 Preparando descarga ZIP...', { id: 'download-evidencias' });

    try {
      const expedienteId = expediente.uuid || expediente.id;
      const baseUrl = getServiceUrl('legal');
      const prefix = API_MODE === 'direct' ? '' : '/legal/api/v1';
      const url = `${baseUrl}${prefix}/evidencias/expediente/${expedienteId}/download-zip`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error al descargar las evidencias');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `evidencias_${expediente.id.replace(/[^a-zA-Z0-9]/g, '_')}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('✅ Evidencias descargadas', {
        id: 'download-evidencias',
        description: `${evidencias.length} archivos en ZIP`
      });
    } catch (error) {
      console.error('Error descargando ZIP:', error);
      toast.error('Error al descargar evidencias', { id: 'download-evidencias' });
    }
  };

  // Helper para construir URL correcta de archivo
  // Direct mode: localhost:3008/files/:filename
  // Gateway mode: localhost:3000/legal/files/:filename (NOT /legal/api/v1/files!)
  const getFileUrl = (archivoUrl: string): string => {
    if (!archivoUrl) return '';

    const baseUrl = getServiceUrl('legal');

    // Extraer solo el nombre del archivo de cualquier ruta
    let filename = archivoUrl;
    if (archivoUrl.includes('/files/')) {
      filename = archivoUrl.split('/files/').pop() || archivoUrl;
    } else if (archivoUrl.includes('/')) {
      filename = archivoUrl.split('/').pop() || archivoUrl;
    }

    // Gateway rutea /legal/files/* -> backend /files/* (NO usa /api/v1 para archivos)
    const prefix = API_MODE === 'direct' ? '' : '/legal';
    return `${baseUrl}${prefix}/files/${filename}`;
  };

  const handleVerEvidencia = (ev: any) => {
    const fileUrl = getFileUrl(ev.url);
    if (!fileUrl) {
      toast.error('No hay archivo asociado a esta evidencia');
      return;
    }
    window.open(fileUrl, '_blank');
    toast.success('👁️ Documento abierto', { description: ev.nombre });
  };

  // Helper para verificar si el archivo es previsualizable en el navegador
  const isPrevisuable = (filename: string): boolean => {
    if (!filename) return false;
    const ext = filename.toLowerCase().split('.').pop();
    return ['pdf', 'jpg', 'jpeg', 'png', 'gif'].includes(ext || '');
  };

  const handleDescargarEvidencia = async (ev: any) => {
    const fileUrl = getFileUrl(ev.url);
    if (!fileUrl) {
      toast.error('No hay archivo para descargar');
      return;
    }

    toast.loading('⏳ Descargando...', { id: 'download-evidencia' });
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Error al descargar');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = ev.nombre || 'evidencia';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('✅ Descarga completada', { id: 'download-evidencia', description: ev.nombre });
    } catch (error) {
      console.error('Error descargando:', error);
      toast.error('Error al descargar el archivo', { id: 'download-evidencia' });
    }
  };

  const handleMarcarAdmitida = async (id: string) => {
    try {
      await legalService.updateEvidenciaEstado(id, 'Admitida');
      toast.success('✅ Evidencia admitida');
      loadEvidencias(); // Recargar lista
    } catch (error) {
      console.error('Error admitiendo evidencia:', error);
      toast.error('Error al admitir la evidencia');
    }
  };

  const handleEliminarEvidencia = async (id: string, nombre: string) => {
    try {
      await legalService.deleteEvidencia(id);
      toast.success(`Evidencia "${nombre}" eliminada`);
      setEvidencias(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error eliminando:', error);
      toast.error('Error al eliminar la evidencia');
    }
  };
  const handleCargarNuevaEvidencia = () => setIsCreateOpen(true);

  const handleCreateEvidencia = async () => {
    if (!selectedFile) return;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('nombre', newEvidenciaData.nombre || selectedFile.name);
      formData.append('descripcion', newEvidenciaData.descripcion || 'Sin descripción');
      formData.append('tipo', newEvidenciaData.tipo);
      formData.append('relevancia', newEvidenciaData.relevancia);
      formData.append('categoria', newEvidenciaData.tipo);
      formData.append('aportadoPor', 'ESAP');

      const expedienteId = expediente.uuid || expediente.id;
      await legalService.createEvidencia(expedienteId, formData);

      toast.success('Evidencia guardada correctamente');
      setIsCreateOpen(false);
      setSelectedFile(null);
      setNewEvidenciaData({
        nombre: '',
        descripcion: '',
        tipo: 'Documentales',
        relevancia: 'Media'
      });
      // Recargar lista de evidencias
      loadEvidencias();
    } catch (error) {
      console.error('Error creando evidencia:', error);
      toast.error('Error al guardar la evidencia');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent hideCloseButton className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogTitle className="sr-only">
            Evidencias y Pruebas - Expediente {expediente.id}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Gestión de evidencias y pruebas documentales del expediente {expediente.id}
          </DialogDescription>

          {/* Header Corporativo ESAP 2025 - Diseño Limpio y Usable */}
          <ModalHeaderClean
            titulo="Evidencias y Pruebas Documentales"
            subtitulo={`Material probatorio del expediente ${expediente.id}`}
            icono={Paperclip}
            colorIcono="orange"
            badgePrincipal={expediente.etapa}
            badges={
              <>
                <Badge variant="outline" className="font-semibold text-xs border-green-300 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {evidenciasAdmitidas} admitidas
                </Badge>
                <Badge variant="outline" className="font-semibold text-xs border-orange-300 text-orange-700">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {evidenciasPendientes} pendientes
                </Badge>
                <Badge variant="outline" className="font-semibold text-xs border-blue-300 text-blue-700">
                  <Paperclip className="w-3 h-3 mr-1" />
                  {totalEvidencias} total
                </Badge>
              </>
            }
            onClose={onClose}
          />

          <div className="flex items-center gap-2 px-6 py-3 border-b bg-white sticky top-0 z-10">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, categoría o descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 font-semibold text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
              {categorias.map((cat) => {
                const count = cat === 'TODOS' ? evidencias.length : evidencias.filter(e => e.categoria === cat).length;
                return (
                  <Button
                    key={cat}
                    size="sm"
                    variant={filtroCategoria === cat ? 'default' : 'outline'}
                    onClick={() => setFiltroCategoria(cat)}
                    className="text-xs font-bold whitespace-nowrap"
                    style={filtroCategoria === cat ? { background: '#F57C00', color: '#FFFFFF' } : {}}
                  >
                    {cat} ({count})
                  </Button>
                );
              })}
            </div>

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
                evidenciasFiltradas.map((ev) => (
                  <Card key={ev.id} className="p-4 hover:shadow-md transition-shadow border border-gray-200">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex-shrink-0 text-xl">
                        {getIconoTipo(ev.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-black text-gray-900">{ev.nombre}</h4>
                              {getEstadoBadge(ev.estado, ev.estadoColor)}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {ev.categoria}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                          {ev.descripcion}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">📅 Fecha</p>
                            <p className="text-xs font-bold text-gray-900">{ev.fecha}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">👤 Aportado por</p>
                            <p className="text-xs font-bold text-gray-900">{ev.aportadoPor}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">⚖️ Relevancia</p>
                            <p className="text-xs font-bold text-gray-900">{ev.relevancia}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Botón Ver - Solo para archivos previsualizables (PDF, imágenes) */}
                          {isPrevisuable(ev.nombre) && (
                            <Button size="sm" onClick={() => handleVerEvidencia(ev)} className="font-bold text-xs px-3 py-1.5 text-white" style={{ background: '#F57C00' }}>
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Ver
                            </Button>
                          )}
                          <Button size="sm" onClick={() => handleDescargarEvidencia(ev)} className="font-bold text-xs px-3 py-1.5 text-white" style={{ background: '#003DA5' }}>
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Descargar
                          </Button>
                          {ev.estado !== 'Admitida' && authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_EVIDENCIAS_ADMITIR) && (
                            <Button size="sm" onClick={() => handleMarcarAdmitida(ev.id)} className="font-bold text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white">
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Admitir
                            </Button>
                          )}
                          {authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_EVIDENCIAS_DELETE) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`¿Estás seguro de eliminar "${ev.nombre}"?`)) {
                                handleEliminarEvidencia(ev.id, ev.nombre);
                              }
                            }}
                            className="font-bold text-xs px-2 py-1.5 border-red-400 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div
            className="flex-shrink-0 bg-white border-t-2 px-6 py-4"
            style={{
              borderTopColor: '#F57C00',
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
                  Mostrando <strong className="text-orange-700">{evidenciasFiltradas.length}</strong> de{' '}
                  <strong className="text-orange-700">{totalEvidencias}</strong> evidencias
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleDescargarTodas} variant="outline" className="font-bold">
                  <Download className="w-4 h-4 mr-1.5" />
                  Descargar Todas (ZIP)
                </Button>
                {authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_EXPEDIENTE_EVIDENCIA_CREATE) && (
                <Button onClick={handleCargarNuevaEvidencia} className="font-bold text-white" style={{ background: '#F57C00' }}>
                  <Upload className="w-4 h-4 mr-1.5" />
                  Cargar Evidencia
                </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Registrar Evidencia</DialogTitle>
          <DialogDescription>Sube una nueva evidencia o prueba documental.</DialogDescription>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nombre</Label>
              <Input value={newEvidenciaData.nombre} onChange={e => setNewEvidenciaData({ ...newEvidenciaData, nombre: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea value={newEvidenciaData.descripcion} onChange={e => setNewEvidenciaData({ ...newEvidenciaData, descripcion: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Categoría</Label>
                <Select onValueChange={(val) => setNewEvidenciaData({ ...newEvidenciaData, tipo: val })} value={newEvidenciaData.tipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {categorias.filter(c => c !== 'TODOS').map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Relevancia</Label>
                <Select onValueChange={(val) => setNewEvidenciaData({ ...newEvidenciaData, relevancia: val })} value={newEvidenciaData.relevancia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona relevancia" />
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
              <Label>Archivo</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.png"
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
