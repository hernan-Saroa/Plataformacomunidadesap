/**
 * ModalActas - Gestión de Actas de Audiencias y Diligencias
 * ✅ Diseño corporativo ESAP 2025 - Versión Premium
 * ✅ Header morado con gradiente (distintivo para actas)
 * ✅ Footer sticky con botones siempre visibles
 * ✅ Timeline visual mejorada
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
  FileCheck, Download, Eye, FileText, Calendar,
  Users, Clock, X, Upload, CheckCircle, AlertCircle, Play,
  Search, Trash2, Filter, Plus
} from 'lucide-react';
import type { ExpedienteJudicial } from '../core/types';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { legalService } from '../../../../services/api/legal.service';
import { getServiceUrl } from '../../../../config/environment';
import { VisorDocumentoModal } from './VisorDocumentoModal';
import { DialogoConfirmacion } from './DialogoConfirmacion';
import { ModalHeaderClean } from './ModalHeaderClean';

interface ModalActasProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
}

// Tipos de actas
const tiposActa = [
  'TODAS',
  'Audiencia Inicial',
  'Audiencia de Conciliación',
  'Audiencia de Pruebas',
  'Inspección Judicial',
  'Declaración de Testigos',
  'Audiencia de Fallo'
];

// Mocks eliminados - Datos cargados desde API

export function ModalActas({ isOpen, onClose, expediente }: ModalActasProps) {
  const [actas, setActas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const [modalVisorAbierto, setModalVisorAbierto] = useState(false);
  const [actaSeleccionada, setActaSeleccionada] = useState<any>(null);
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [actaEliminar, setActaEliminar] = useState<any>(null);

  // Form state for creating new acta
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newActaData, setNewActaData] = useState({
    tipo: 'Audiencia Inicial',
    numeroActa: `ACTA-${Date.now().toString().slice(-6)}`,
    fecha: new Date().toISOString().split('T')[0],
    horaInicio: '10:00',
    horaFin: '12:00',
    lugar: 'Juzgado Administrativo',
    presidente: '',
    resumen: '',
    participantes: ''
  });

  // Calculate duration from time inputs
  const calcularDuracion = (inicio: string, fin: string): string => {
    if (!inicio || !fin) return 'N/A';
    const [hInicio, mInicio] = inicio.split(':').map(Number);
    const [hFin, mFin] = fin.split(':').map(Number);
    const minutosInicio = hInicio * 60 + mInicio;
    const minutosFin = hFin * 60 + mFin;
    let diferencia = minutosFin - minutosInicio;
    if (diferencia < 0) diferencia += 24 * 60; // Handle overnight
    const horas = Math.floor(diferencia / 60);
    const minutos = diferencia % 60;
    if (minutos === 0) return `${horas}h`;
    return `${horas}h ${minutos}min`;
  };

  // Cargar actas al abrir
  useEffect(() => {
    if (isOpen && (expediente.uuid || expediente.id)) {
      loadActas();
    }
  }, [isOpen, expediente]);

  const loadActas = async () => {
    try {
      setLoading(true);
      const data = await legalService.getActas(expediente.uuid || expediente.id);

      const mapped = data.map((acta: any) => ({
        id: acta.id,
        tipo: acta.tipo || 'Audiencia General',
        numero: acta.numeroActa || `ACTA-${acta.id.slice(0, 4)}`,
        fecha: acta.fecha ? new Date(acta.fecha).toLocaleDateString('es-CO') : 'Sin fecha',
        hora: acta.horario || 'Sin horario',
        lugar: acta.lugar || 'Sin especificar',
        presidente: acta.presidente || 'Sin asignar',
        participantes: acta.participantes ? (typeof acta.participantes === 'string' ? JSON.parse(acta.participantes) : acta.participantes) : [],
        resumen: acta.resumen || 'Sin resumen',
        decisiones: acta.decisionesTomadas ? (typeof acta.decisionesTomadas === 'string' ? JSON.parse(acta.decisionesTomadas) : acta.decisionesTomadas) : [],
        estado: acta.estado || 'Programada',
        estadoColor: getEstadoColor(acta.estado),
        archivo: acta.archivoNombre,
        archivoUrl: acta.archivoUrl,
        tamaño: acta.archivoTamano ? `${(acta.archivoTamano / (1024 * 1024)).toFixed(2)} MB` : null,
        duracion: acta.duracion || 'N/A'
      }));

      setActas(mapped);
    } catch (error) {
      console.error('Error cargando actas:', error);
      toast.error('Error al cargar actas');
      setActas([]);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado: string | undefined): string => {
    if (!estado) return 'blue';
    if (estado.toLowerCase().includes('firmada')) return 'green';
    if (estado.toLowerCase().includes('programada')) return 'blue';
    return 'orange';
  };

  // Helper para construir URL correcta de archivo
  const getFileUrl = (archivoUrl: string): string => {
    if (!archivoUrl) return '';

    const baseUrl = getServiceUrl('legal');

    // Si es URL absoluta con /api/, corregirla
    if (archivoUrl.startsWith('http') && archivoUrl.includes('/api/legal/api/v1/files/')) {
      return archivoUrl.replace('/api/legal/api/v1/files/', '/legal/api/v1/files/');
    }
    // Si es URL absoluta correcta, devolverla
    if (archivoUrl.startsWith('http')) {
      return archivoUrl;
    }

    // Rutas relativas
    if (archivoUrl.startsWith('/api/legal/api/v1/files/')) {
      return `${baseUrl}${archivoUrl.replace('/api', '')}`;
    }
    if (archivoUrl.startsWith('files/')) {
      return `${baseUrl}/legal/${archivoUrl}`;
    }
    if (archivoUrl.includes('/legal/api/v1/files/') && !archivoUrl.includes('/api/')) {
      return `${baseUrl}${archivoUrl}`;
    }
    if (archivoUrl.includes('/files/')) {
      const filename = archivoUrl.split('/files/').pop();
      return `${baseUrl}/legal/api/v1/files/${filename}`;
    }
    return `${baseUrl}/legal/api/v1/files/${archivoUrl}`;
  };

  const handleDescargarActa = async (acta: any) => {
    if (!acta.archivoUrl) {
      toast.warning('Esta acta aún no ha sido firmada y digitalizada');
      return;
    }
    try {
      toast.info('Iniciando descarga...');
      const fileUrl = getFileUrl(acta.archivoUrl);
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Error al descargar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', acta.archivo || `acta_${acta.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Error al descargar el archivo');
    }
  };

  const handleVerActa = (acta: any) => {
    if (!acta.archivoUrl) {
      toast.warning('Esta acta aún no ha sido firmada y digitalizada');
      return;
    }
    const fileUrl = getFileUrl(acta.archivoUrl);
    window.open(fileUrl, '_blank');
  };

  const handleCargarActa = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        try {
          toast.loading('Subiendo acta...');

          const formData = new FormData();
          formData.append('file', file);
          formData.append('tipo', 'Audiencia de Pruebas');
          formData.append('numeroActa', `ACTA-${Date.now()}`);
          formData.append('fecha', new Date().toISOString());
          formData.append('horario', '10:00 AM - 12:00 PM');
          formData.append('duracion', '2h');
          formData.append('lugar', 'Juzgado Administrativo');
          formData.append('presidente', 'Por asignar');
          formData.append('resumen', `Acta cargada: ${file.name}`);
          formData.append('estado', 'Firmada');

          await legalService.createActa(expediente.uuid || expediente.id, formData);

          toast.dismiss();
          toast.success('Acta cargada correctamente');
          loadActas();
        } catch (error) {
          console.error('Error subiendo acta:', error);
          toast.dismiss();
          toast.error('Error al subir el acta');
        }
      }
    };

    input.click();
  };

  const handleEliminarActa = async (id: string, numero: string) => {
    if (!confirm(`¿Eliminar acta "${numero}"?`)) return;
    try {
      await legalService.deleteActa(id);
      toast.success('Acta eliminada');
      loadActas();
    } catch (error) {
      console.error('Error eliminando:', error);
      toast.error('Error al eliminar');
    }
  };

  const handleMarcarFirmada = (id: string, actaNumero: string) => {
    // Create a file input to upload the signed document
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      const toastId = toast.loading('Subiendo acta firmada...');
      try {
        const formData = new FormData();
        formData.append('file', file);

        // Use the new endpoint to update the file without losing data
        await legalService.uploadActaFirmada(id, formData);

        toast.success('✅ Acta firmada subida correctamente', { id: toastId });
        loadActas();
      } catch (error) {
        console.error('Error subiendo acta firmada:', error);
        toast.error('Error al subir el acta firmada', { id: toastId });
      }
    };

    input.click();
  };

  const handleDescargarTodas = async () => {
    const actasFirmadas = actas.filter(a => a.archivoUrl);
    if (actasFirmadas.length === 0) {
      toast.info('No hay actas firmadas para descargar');
      return;
    }

    toast.loading('📦 Preparando descarga ZIP...', { id: 'download-actas' });

    try {
      const expedienteId = expediente.uuid || expediente.id;
      const baseUrl = getServiceUrl('legal');
      const url = `${baseUrl}/legal/api/v1/actas/expediente/${expedienteId}/download-zip`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error al descargar las actas');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `actas_${expediente.id.replace(/[^a-zA-Z0-9]/g, '_')}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('✅ Actas descargadas', {
        id: 'download-actas',
        description: `${actasFirmadas.length} archivos en ZIP`
      });
    } catch (error) {
      console.error('Error descargando ZIP:', error);
      toast.error('Error al descargar actas', { id: 'download-actas' });
    }
  };

  const handleCreateActa = async () => {
    if (!newActaData.resumen || !newActaData.presidente) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    const toastId = toast.loading('Creando acta...');
    try {
      const horario = `${newActaData.horaInicio} - ${newActaData.horaFin}`;
      const duracion = calcularDuracion(newActaData.horaInicio, newActaData.horaFin);

      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('tipo', newActaData.tipo);
      formData.append('numeroActa', newActaData.numeroActa);
      formData.append('fecha', newActaData.fecha);
      formData.append('horario', horario);
      formData.append('duracion', duracion);
      formData.append('lugar', newActaData.lugar);
      formData.append('presidente', newActaData.presidente);
      formData.append('resumen', newActaData.resumen);

      // Process participantes string manually entered
      const participantesArray = newActaData.participantes
        ? newActaData.participantes.split(',').map(p => p.trim()).filter(p => p)
        : [];
      formData.append('participantes', JSON.stringify(participantesArray));

      await legalService.createActa(expediente.uuid || expediente.id, formData);
      toast.success(selectedFile ? 'Acta firmada creada' : 'Acta programada creada', { id: toastId });

      // Reset form
      setIsCreateOpen(false);
      setSelectedFile(null);
      setNewActaData({
        tipo: 'Audiencia Inicial',
        numeroActa: `ACTA-${Date.now().toString().slice(-6)}`,
        fecha: new Date().toISOString().split('T')[0],
        horaInicio: '10:00',
        horaFin: '12:00',
        lugar: 'Juzgado Administrativo',
        presidente: '',
        resumen: '',
        participantes: ''
      });
      loadActas();
    } catch (error) {
      console.error(error);
      toast.error('Error al crear el acta', { id: toastId });
    }
  };

  const getEstadoBadge = (estado: string, color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-100 text-green-700 border-green-300',
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      orange: 'bg-orange-100 text-orange-700 border-orange-300'
    };

    const icons: Record<string, JSX.Element> = {
      green: <CheckCircle className="w-3 h-3" />,
      blue: <Clock className="w-3 h-3" />,
      orange: <AlertCircle className="w-3 h-3" />
    };

    return (
      <Badge className={`${colors[color]} font-semibold flex items-center gap-1 text-xs`}>
        {icons[color]}
        {estado}
      </Badge>
    );
  };

  const actasFiltradas = filtroTipo === 'TODAS'
    ? actas
    : actas.filter(a => a.tipo === filtroTipo);

  const actasBuscadas = actasFiltradas.filter(a =>
    a.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.tipo.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.resumen.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogTitle className="sr-only">
            Actas de Audiencias - Expediente {expediente.id}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Gestión de actas de audiencias y diligencias del expediente {expediente.id}
          </DialogDescription>

          {/* Header Corporativo ESAP 2025 - Diseño Limpio y Usable */}
          <ModalHeaderClean
            titulo="Actas de Audiencias y Diligencias"
            subtitulo={`Registro oficial de diligencias del expediente ${expediente.id}`}
            icono={FileCheck}
            colorIcono="purple"
            badgePrincipal="CONTESTACIÓN"
            badges={
              <>
                <Badge variant="outline" className="font-semibold text-xs border-gray-300 text-gray-700">
                  {expediente.etapa}
                </Badge>
                <Badge variant="outline" className="font-semibold text-xs border-purple-300 text-purple-700">
                  <FileCheck className="w-3 h-3 mr-1" />
                  {actas.length} actas
                </Badge>
                <Badge variant="outline" className="font-semibold text-xs border-green-300 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {actas.filter(a => a.estado === 'Firmada').length} firmadas
                </Badge>
                <Badge variant="outline" className="font-semibold text-xs border-orange-300 text-orange-700">
                  <Clock className="w-3 h-3 mr-1" />
                  {actas.filter(a => a.estado === 'Programada').length} programadas
                </Badge>
              </>
            }
            onClose={onClose}
          />

          {/* Barra de filtros */}
          <div className="px-6 py-4 bg-gradient-to-b from-purple-50 to-white border-b flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar acta por número, tipo o contenido..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10 text-sm font-semibold"
                />
              </div>
            </div>

            {/* Filtros por tipo */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
              {tiposActa.map((tipo) => {
                const count = tipo === 'TODAS' ? actas.length : actas.filter(a => a.tipo === tipo).length;
                return (
                  <Button
                    key={tipo}
                    size="sm"
                    variant={filtroTipo === tipo ? 'default' : 'outline'}
                    onClick={() => setFiltroTipo(tipo)}
                    className="text-xs font-bold whitespace-nowrap"
                    style={filtroTipo === tipo ? { background: '#7B1FA2', color: '#FFFFFF' } : {}}
                  >
                    {tipo} ({count})
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Información contextual */}
            <Card className="p-4 mb-4 bg-purple-50 border-purple-200">
              <h4 className="text-sm font-bold text-purple-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                ¿Qué son las Actas Procesales?
              </h4>
              <p className="text-xs text-purple-800 leading-relaxed">
                Las <strong>actas</strong> son documentos que registran oficialmente lo acontecido en
                audiencias, inspecciones judiciales y demás diligencias procesales. Deben ser firmadas
                por el juez, las partes y la secretaria judicial. Son prueba de lo actuado en el proceso.
              </p>
            </Card>

            {/* Lista de actas */}
            <div className="space-y-4">
              {actasBuscadas.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-bold text-gray-600 mb-1">
                    No hay actas de tipo "{filtroTipo}"
                  </p>
                  <p className="text-xs text-gray-500">
                    Intenta con otro filtro
                  </p>
                </Card>
              ) : (
                actasBuscadas.map((acta) => (
                  <Card key={acta.id} className="p-5 hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
                    <div className="flex items-start gap-4">
                      {/* Icono */}
                      <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 flex-shrink-0">
                        <FileCheck className="w-7 h-7 text-purple-600" />
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-black text-gray-900 text-lg">{acta.numero}</h4>
                              {getEstadoBadge(acta.estado, acta.estadoColor)}
                            </div>
                            <Badge
                              variant="outline"
                              className="text-xs mb-2 bg-purple-50 text-purple-700 border-purple-300"
                            >
                              {acta.tipo}
                            </Badge>
                          </div>
                        </div>

                        {/* Info de la audiencia */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Fecha
                            </p>
                            <p className="text-xs font-bold text-gray-900">{acta.fecha}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Horario
                            </p>
                            <p className="text-xs font-bold text-gray-900">{acta.hora}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                              <Play className="w-3 h-3" />
                              Duración
                            </p>
                            <p className="text-xs font-bold text-gray-900">{acta.duracion}</p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-0.5">📍 Lugar</p>
                          <p className="text-xs font-bold text-gray-900">{acta.lugar}</p>
                        </div>

                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">⚖️ Presidente</p>
                          <p className="text-xs font-bold text-gray-900">{acta.presidente}</p>
                        </div>

                        {/* Participantes */}
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Participantes
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                            {acta.participantes.map((participante: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-700">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                                {participante}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Resumen */}
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs font-bold text-blue-900 mb-1">📝 Resumen</p>
                          <p className="text-sm text-blue-800 leading-relaxed">
                            {acta.resumen}
                          </p>
                        </div>

                        {/* Decisiones - only show if there are any and acta is not firmada */}
                        {acta.decisiones && acta.decisiones.length > 0 && !acta.archivo && (
                          <div className="mb-3">
                            <p className="text-xs font-bold text-gray-700 mb-2">📋 Decisiones Pendientes</p>
                            <ul className="space-y-1">
                              {acta.decisiones.map((decision: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                                  <AlertCircle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                                  <span>{decision}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Archivo */}
                        {acta.archivo ? (
                          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-5 h-5 text-green-600" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-green-900 truncate">
                                  📎 {acta.archivo}
                                </p>
                                <p className="text-xs text-green-600">{acta.tamaño}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleVerActa(acta)}
                                className="flex-1 text-xs font-bold text-blue-600 hover:bg-blue-50 border-blue-300"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                Ver Acta
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDescargarActa(acta)}
                                className="flex-1 text-xs font-bold text-green-600 hover:bg-green-100 border-green-300"
                              >
                                <Download className="w-3.5 h-3.5 mr-1" />
                                Descargar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEliminarActa(acta.id, acta.numero)}
                                className="hover:bg-red-100 text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                              <p className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Acta pendiente de firma y digitalización
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarcarFirmada(acta.id, acta.numero)}
                                className="flex-1 text-xs font-bold text-green-600 hover:bg-green-50"
                              >
                                <Upload className="w-3 h-3 mr-1" />
                                Subir Acta Firmada
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEliminarActa(acta.id, acta.numero)}
                                className="text-xs font-bold text-red-600 hover:bg-red-50 border-red-300"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        )}
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
                  <strong>{actasBuscadas.length}</strong> de <strong>{actas.length}</strong> actas ·
                  <strong className="text-green-600"> {actas.filter(a => a.estado === 'Firmada').length} firmadas</strong> ·
                  <strong className="text-blue-600"> {actas.filter(a => a.estado === 'Programada').length} programadas</strong>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleDescargarTodas}
                  variant="outline"
                  className="font-bold"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Descargar Firmadas (ZIP)
                </Button>
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Nueva Acta
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Crear Acta */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Nueva Acta de Audiencia</DialogTitle>
          <DialogDescription>Registra una nueva acta de audiencia o diligencia procesal.</DialogDescription>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label>Tipo de Acta</Label>
              <Select onValueChange={(val) => setNewActaData({ ...newActaData, tipo: val })} value={newActaData.tipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {tiposActa.filter(t => t !== 'TODAS').map(tipo => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Número de Acta</Label>
                <Input value={newActaData.numeroActa} onChange={e => setNewActaData({ ...newActaData, numeroActa: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Fecha</Label>
                <Input type="date" value={newActaData.fecha} onChange={e => setNewActaData({ ...newActaData, fecha: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Hora Inicio</Label>
                <Input type="time" value={newActaData.horaInicio} onChange={e => setNewActaData({ ...newActaData, horaInicio: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Hora Fin</Label>
                <Input type="time" value={newActaData.horaFin} onChange={e => setNewActaData({ ...newActaData, horaFin: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Duración (auto)</Label>
                <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 text-sm font-semibold text-gray-700 flex items-center">
                  {calcularDuracion(newActaData.horaInicio, newActaData.horaFin)}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Lugar</Label>
              <Input placeholder="Juzgado o sala donde se realizó" value={newActaData.lugar} onChange={e => setNewActaData({ ...newActaData, lugar: e.target.value })} />
            </div>

            <div className="grid gap-2">
              <Label>Presidente / Juez</Label>
              <Input placeholder="Nombre del juez que presidió" value={newActaData.presidente} onChange={e => setNewActaData({ ...newActaData, presidente: e.target.value })} />
            </div>

            <div className="grid gap-2">
              <Label>Participantes (separados por coma)</Label>
              <Input
                placeholder="Ej: Juan Perez, Maria Gomez, Fiscalia"
                value={newActaData.participantes}
                onChange={e => setNewActaData({ ...newActaData, participantes: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Resumen de la Audiencia</Label>
              <Textarea
                placeholder="Describe lo acontecido en la audiencia..."
                value={newActaData.resumen}
                onChange={e => setNewActaData({ ...newActaData, resumen: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Archivo del Acta (opcional - subir si ya está firmada)</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              />
              {selectedFile ? (
                <p className="text-xs text-green-600 font-semibold">✅ Se subirá como firmada: {selectedFile.name}</p>
              ) : (
                <p className="text-xs text-gray-500">💡 Si no adjuntas archivo, el acta quedará como "Programada" para subir después</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateActa}>{selectedFile ? 'Crear Acta Firmada' : 'Crear Acta Programada'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
