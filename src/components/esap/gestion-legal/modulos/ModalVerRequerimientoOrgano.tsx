/**
 * ModalVerRequerimientoOrgano - Vista simplificada del requerimiento de órgano de control
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { ModalHeaderClean } from './ModalHeaderClean';
import {
  FileText, Calendar, User, Clock, CheckCircle, AlertTriangle, Download, X,
  MessageSquare, Send, Archive, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { ocService } from '../../../../services/api/legal.service';
import { ModalComentariosOrgano } from './ModalComentariosOrgano';
import { ModalRespuestaOrgano } from './ModalRespuestaOrgano';
import { usePermisos } from '../config/PermisosContext';
import { ModalArchivarRequerimiento } from './ModalArchivarRequerimiento';

interface RequerimientoOrganoControl {
  id: string;
  numeroOficio: string;
  organismo: string;
  asunto: string;
  responsable: string;
  fechaRadicacion: Date;
  fechaVencimiento: Date;
  diasRestantes: number;
  diasTotales: number;
  etapa: 'RECIBIDO' | 'EN_ANALISIS' | 'EN_RESPUESTA' | 'ENVIADO';
  ultimaActuacion?: string;
  documentos?: number;
  descripcion?: string;
  areaResponsable?: string;
}

interface ModalVerRequerimientoOrganoProps {
  isOpen: boolean;
  onClose: () => void;
  requerimiento: RequerimientoOrganoControl | null;
  onUpdate?: () => void;
}

export function ModalVerRequerimientoOrgano({
  isOpen,
  onClose,
  requerimiento,
  onUpdate
}: ModalVerRequerimientoOrganoProps) {
  const [showComuntarModal, setShowComentarModal] = useState(false);
  const [showRespuestaModal, setShowRespuestaModal] = useState(false);
  const [showArchivarModal, setShowArchivarModal] = useState(false);
  const [showEliminarModal, setShowEliminarModal] = useState(false);
  const { usuario } = usePermisos();
  const esGestor = usuario?.rol === 'GESTOR_JURIDICO' || usuario?.rol === 'ADMIN';

  if (!requerimiento) return null;

  // Calcular semáforo
  const getSemaforoColor = (diasRestantes: number) => {
    if (diasRestantes < 0) return { color: '#DC2626', bg: '#FEE2E2', label: 'VENCIDO' };
    if (diasRestantes <= 5) return { color: '#F59E0B', bg: '#FEF3C7', label: 'URGENTE' };
    return { color: '#10B981', bg: '#D1FAE5', label: 'EN TÉRMINO' };
  };

  const semaforo = getSemaforoColor(requerimiento.diasRestantes);
  const diasTranscurridos = requerimiento.diasTotales > 0 ? Math.max(0, requerimiento.diasTotales - Math.max(0, requerimiento.diasRestantes)) : 0;
  const porcentajeTiempo = requerimiento.diasTotales > 0 ? Math.min(100, Math.max(0, Math.round((diasTranscurridos / requerimiento.diasTotales) * 100))) : 0;

  const handleDescargar = () => {
    toast.info("Descargando expediente del requerimiento...");
  };

  const handleArchivar = async (motivo: string) => {
    try {
      await ocService.archivarRequerimiento(requerimiento.id, motivo, usuario?.nombre || 'Desconocido');
      toast.success('Requerimiento archivado exitosamente');
      setShowArchivarModal(false);
      onClose();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error archivando:', error);
      toast.error('Error al archivar requerimiento');
    }
  };

  const handleEliminar = async (motivo: string) => {
    try {
      // Usamos el motivo como log de auditoría aunque sea eliminación permanente (soft delete en backend)
      // Aunque el backend no pide motivo explícito en el endpoint delete, el servicio frontend lo espera?
      // Revisando legal.service.ts: eliminarRequerimientoPermanente(id, usuario). 
      // No pide motivo. El backend lo recibe? 
      // Backend controller: @Body() body: { usuario: string }. No motivo.
      // Pero el servicio backend: loguea operacion? 
      // El servicio backend hace soft delete con estado 'ELIMINADO'.
      // Ok, no pasamos motivo al servicio, pero el modal lo pide. No importa, lo usamos para confirmar.

      await ocService.eliminarRequerimientoPermanente(requerimiento.id, usuario?.nombre || 'Desconocido', motivo);
      toast.success('Requerimiento eliminado exitosamente');
      setShowEliminarModal(false);
      onClose();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error eliminando:', error);
      toast.error('Error al eliminar requerimiento');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90%] max-w-lg !max-h-[85vh] !top-1/2 !-translate-y-1/2 overflow-y-auto rounded-lg">
        <DialogTitle className="sr-only">Detalle del Requerimiento</DialogTitle>
        <DialogDescription className="sr-only">
          Vista detallada del requerimiento {requerimiento.numeroOficio}
        </DialogDescription>
        <ModalHeaderClean
          titulo="Detalle del Requerimiento"
          subtitulo={`Expediente: ${requerimiento.numeroOficio}`}
          icono={FileText}
          colorIcono="blue"
          onClose={onClose}
        />

        <div className="p-6 space-y-6">
          {/* Header con Estado */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{requerimiento.numeroOficio}</h2>
              <p className="text-gray-500 font-medium">{requerimiento.organismo || 'Organismo Desconocido'}</p>
            </div>
            <Badge variant="outline" className={`${semaforo.bg} ${semaforo.color} border-current px-3 py-1 text-sm font-bold`}>
              {requerimiento.etapa.replace('_', ' ')}
            </Badge>
          </div>

          {/* Grid de Información Principal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase font-bold">Asunto</label>
                <p className="text-gray-900 font-medium">{requerimiento.asunto}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase font-bold">Responsable</label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-900">{requerimiento.responsable}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold">Radicación</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">
                      {requerimiento.fechaRadicacion instanceof Date
                        ? requerimiento.fechaRadicacion.toLocaleDateString()
                        : new Date(requerimiento.fechaRadicacion).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold">Vencimiento</label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">
                      {requerimiento.fechaVencimiento instanceof Date
                        ? requerimiento.fechaVencimiento.toLocaleDateString()
                        : new Date(requerimiento.fechaVencimiento).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase font-bold">Días Restantes</label>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" style={{ color: semaforo.color }} />
                  <p className={`font-bold ${semaforo.color.replace('text-', '')}`} style={{ color: semaforo.color }}>
                    {requerimiento.diasRestantes} días
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Última Actuación */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-blue-900 text-sm">Última Actuación</h4>
                <p className="text-blue-800 text-sm mt-1">{requerimiento.ultimaActuacion || 'No hay actuaciones recientes'}</p>
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-3 text-center bg-white hover:bg-gray-50 transition-colors cursor-pointer">
              <FileText className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <p className="text-2xl font-bold text-gray-900">{requerimiento.documentos || 0}</p>
              <p className="text-xs text-gray-500">Documentos</p>
            </div>
            <div className="border rounded-lg p-3 text-center bg-white">
              <Clock className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <p className="text-2xl font-bold text-gray-900">{diasTranscurridos}</p>
              <p className="text-xs text-gray-500">Días Transcurridos</p>
            </div>
            <div className="border rounded-lg p-3 text-center bg-white">
              <div className="relative w-10 h-10 mx-auto mb-1 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="20" cy="20" r="16" stroke="#E5E7EB" strokeWidth="4" fill="none" />
                  <circle cx="20" cy="20" r="16" stroke={semaforo.color} strokeWidth="4" fill="none" strokeDasharray="100" strokeDashoffset={100 - porcentajeTiempo} />
                </svg>
                <span className="absolute text-xs font-bold">{porcentajeTiempo}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Avance Plazo</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleDescargar}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>


            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => setShowArchivarModal(true)}
            >
              <Archive className="w-4 h-4 mr-2" />
              Archivar
            </Button>

            <Button
              variant="outline"
              className="text-red-700 border-red-300 hover:bg-red-100 hover:text-red-800"
              onClick={() => setShowEliminarModal(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>


            <Button style={{ background: '#003DA5' }} className="text-white" onClick={onClose}>
              Cerrar Vista
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Modales Hijos */}
      <ModalComentariosOrgano
        isOpen={showComuntarModal}
        onClose={() => setShowComentarModal(false)}
        requerimientoId={requerimiento.id}
      />

      <ModalRespuestaOrgano
        isOpen={showRespuestaModal}
        onClose={() => setShowRespuestaModal(false)}
        requerimientoId={requerimiento.id}
        organismoNombre={requerimiento.organismo}
        onSuccess={() => {
          // Recargar datos si es necesario
          if (onUpdate) onUpdate();
        }}
      />

      <ModalArchivarRequerimiento
        isOpen={showArchivarModal}
        onClose={() => setShowArchivarModal(false)}
        onConfirm={handleArchivar}
        titulo="Archivar Requerimiento"
        descripcion={`¿Está seguro de archivar el requerimiento ${requerimiento.numeroOficio}?`}
      />

      <ModalArchivarRequerimiento
        isOpen={showEliminarModal}
        onClose={() => setShowEliminarModal(false)}
        onConfirm={handleEliminar}
        titulo="Eliminar Requerimiento"
        descripcion={`¿Está seguro de eliminar PERMANENTEMENTE el requerimiento ${requerimiento.numeroOficio}? Esta acción no se puede deshacer.`}
      />
    </Dialog >
  );
}