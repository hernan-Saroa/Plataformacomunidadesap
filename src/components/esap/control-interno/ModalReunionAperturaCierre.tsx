/**
 * Modales para Registrar Reunión de Apertura y Reunión de Cierre
 * Modal compacto, datos desde BD, subir acta cuando se selecciona plantilla
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { controlInternoService } from '../../../services/api/controlInternoService';
import { auditoriasApi } from './services/api';
import { toast } from 'sonner';
import { Calendar, FileText, Users } from 'lucide-react';

export interface DatosReunionApertura {
  fecha: string;
  hora: string;
  modalidad: 'presencial' | 'virtual';
  lugar: string;
  participantes: string;
  temasTratados: string;
  elaboradoPor: string;
  revisadoPor: string;
  observaciones: string;
  actaBibliotecaId?: string;
}

export interface DatosReunionCierre {
  fecha: string;
  hora: string;
  modalidad: 'presencial' | 'virtual';
  lugar: string;
  participantes: string;
  temasTratados: string;
  elaboradoPor: string;
  revisadoPor: string;
  observaciones: string;
  actaBibliotecaId?: string;
}

interface ModalReunionAperturaProps {
  isOpen: boolean;
  onClose: () => void;
  auditoriaId: string;
  auditoriaNombre?: string;
  /** Datos existentes para edición */
  reunionExistente?: { fecha: string | Date; modalidad?: string; lugar?: string; participantes?: string[] | string; agenda?: { temasTratados?: string }; elaboradoPor?: string; revisadoPor?: string; observaciones?: string; documentoBibliotecaId?: string | null } | null;
  onGuardar?: (datos: DatosReunionApertura) => void | Promise<void>;
  onSuccess?: () => void;
}

interface ModalReunionCierreProps {
  isOpen: boolean;
  onClose: () => void;
  auditoriaId: string;
  auditoriaNombre?: string;
  /** Datos existentes para edición */
  reunionExistente?: { fecha: string | Date; modalidad?: string; lugar?: string; participantes?: string[] | string; agenda?: { temasTratados?: string }; elaboradoPor?: string; revisadoPor?: string; observaciones?: string; documentoBibliotecaId?: string | null } | null;
  onGuardar?: (datos: DatosReunionCierre) => void | Promise<void>;
  onSuccess?: () => void;
}

function parseReunionToForm(r: { fecha?: string | Date; modalidad?: string; lugar?: string; participantes?: string[] | string; agenda?: { temasTratados?: string }; elaboradoPor?: string; revisadoPor?: string; observaciones?: string; documentoBibliotecaId?: string | null } | null | undefined): { fecha: string; hora: string; modalidad: 'presencial' | 'virtual'; lugar: string; participantes: string; temasTratados: string; elaboradoPor: string; revisadoPor: string; observaciones: string; actaBibliotecaId: string } {
  if (!r) return { fecha: '', hora: '', modalidad: 'presencial', lugar: '', participantes: '', temasTratados: '', elaboradoPor: '', revisadoPor: '', observaciones: '', actaBibliotecaId: '' };
  const d = r.fecha ? (typeof r.fecha === 'string' ? new Date(r.fecha) : r.fecha) : null;
  const participantes = Array.isArray(r.participantes) ? r.participantes.join(', ') : (r.participantes || '');
  const m = (r.modalidad === 'hibrida' ? 'presencial' : (r.modalidad as 'presencial' | 'virtual') || 'presencial');
  const docId = r.documentoBibliotecaId ?? '';
  return {
    fecha: d ? d.toISOString().slice(0, 10) : '',
    hora: d ? d.toTimeString().slice(0, 5) : '',
    modalidad: m === 'virtual' ? 'virtual' : 'presencial',
    lugar: r.lugar || '',
    participantes,
    temasTratados: r.agenda?.temasTratados || '',
    elaboradoPor: r.elaboradoPor || '',
    revisadoPor: r.revisadoPor || '',
    observaciones: r.observaciones || '',
    actaBibliotecaId: typeof docId === 'string' ? docId : '',
  };
}

function FormReunionBase({
  tipo,
  onSubmit,
  onClose,
  guardando,
  plantillasActa,
  actaBibliotecaId,
  setActaBibliotecaId,
  personas,
  elaboradoPor,
  setElaboradoPor,
  revisadoPor,
  setRevisadoPor,
  observaciones,
  children
}: {
  tipo: 'apertura' | 'cierre';
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  guardando: boolean;
  plantillasActa: any[];
  actaBibliotecaId: string;
  setActaBibliotecaId: (v: string) => void;
  personas: { id: string; nombre: string }[];
  elaboradoPor: string;
  setElaboradoPor: (v: string) => void;
  revisadoPor: string;
  setRevisadoPor: (v: string) => void;
  observaciones?: string;
  children: React.ReactNode;
}) {
  const tituloActa = tipo === 'apertura' ? 'ACTA DE APERTURA' : 'ACTA DE CIERRE';
  const plantillas = plantillasActa.filter((d: any) => !d.auditoriaId && !d.auditoria_id);

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      {children}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">Elaborado por</label>
          <select
            value={elaboradoPor}
            onChange={(e) => setElaboradoPor(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccione</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">Revisado por</label>
          <select
            value={revisadoPor}
            onChange={(e) => setRevisadoPor(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccione</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">Observaciones / acuerdos</label>
        <textarea
          name="observaciones"
          defaultValue={observaciones ?? ''}
          rows={3}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 min-h-[60px]"
          placeholder="Compromisos, acuerdos..."
        />
      </div>
      <div className="border-t pt-2">
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          <FileText className="w-3 h-3 inline mr-1" />
          {tituloActa} – SELECCIONAR PLANTILLA DESDE BIBLIOTECA
        </label>
        <select
          value={actaBibliotecaId}
          onChange={(e) => setActaBibliotecaId(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Ninguno</option>
          {plantillas.map((d: any) => (
            <option key={d.id} value={d.id}>{d.nombre || d.nombreArchivoOriginal || d.id}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1 text-xs">
          Cerrar
        </Button>
        <Button type="submit" size="sm" disabled={guardando} className="flex-1 text-xs">
          <Calendar className="w-3 h-3 mr-1" />
          {guardando ? 'Guardando...' : 'Registrar'}
        </Button>
      </div>
    </form>
  );
}

export function ModalReunionApertura({
  isOpen,
  onClose,
  auditoriaId,
  reunionExistente,
  onGuardar,
  onSuccess,
}: ModalReunionAperturaProps) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [modalidad, setModalidad] = useState<'presencial' | 'virtual'>('presencial');
  const [lugar, setLugar] = useState('');
  const [participantes, setParticipantes] = useState('');
  const [temasTratados, setTemasTratados] = useState('');
  const [elaboradoPor, setElaboradoPor] = useState('');
  const [revisadoPor, setRevisadoPor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [actaBibliotecaId, setActaBibliotecaId] = useState('');
  const [plantillasActa, setPlantillasActa] = useState<any[]>([]);
  const [personas, setPersonas] = useState<{ id: string; nombre: string }[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const init = parseReunionToForm(reunionExistente ?? undefined);
      setFecha(init.fecha);
      setHora(init.hora);
      setModalidad(init.modalidad);
      setLugar(init.lugar);
      setParticipantes(init.participantes);
      setTemasTratados(init.temasTratados);
      setElaboradoPor(init.elaboradoPor);
      setRevisadoPor(init.revisadoPor);
      setObservaciones(init.observaciones);
      setActaBibliotecaId(init.actaBibliotecaId);
      Promise.all([
        controlInternoService.getDocumentos().then((all) =>
          (all || []).filter((d: any) =>
            (!d.auditoriaId && !d.auditoria_id) &&
            (d.tipoDocumento === 'acta_reunion_apertura' || d.tipo_documento === 'acta_reunion_apertura' || d.tipoDocumento === 'acta' || d.tipo_documento === 'acta')
          )
        ),
        auditoriasApi.getPersonasDisponibles()
      ])
        .then(([docs, res]) => {
          setPlantillasActa(docs || []);
          if (res?.success && res?.data) {
            setPersonas(res.data.map((p: any) => ({
              id: String(p.idPersona || p.id_tercero || p.id),
              nombre: p.nombre || p.nom_largo || 'Sin nombre'
            })));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, reunionExistente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const obs = (form.elements.namedItem('observaciones') as HTMLTextAreaElement)?.value || '';
    if (!fecha || !hora || !participantes || !temasTratados) {
      toast.error('Complete Fecha, Hora, Participantes y Temas tratados');
      return;
    }
    setGuardando(true);
    try {
      const datos: DatosReunionApertura = {
        fecha,
        hora,
        modalidad,
        lugar,
        participantes,
        temasTratados,
        elaboradoPor,
        revisadoPor,
        observaciones: obs,
        actaBibliotecaId: actaBibliotecaId || undefined,
      };
      if (onGuardar) {
        await onGuardar(datos);
      } else {
        await controlInternoService.registrarReunionApertura(auditoriaId, datos);
      }
      toast.success('Reunión de apertura registrada');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Error al registrar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent
          size="xs"
          className="overflow-y-auto p-4 [&]:!w-[420px] [&]:!max-w-[420px] [&]:!min-h-[85vh]"
          style={{ width: 420, maxWidth: 420, minHeight: '85vh' }}
        >
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-1.5 text-base">
            <Users className="w-4 h-4" />
            Registrar Reunión de Apertura
          </DialogTitle>
        </DialogHeader>
        <FormReunionBase
          tipo="apertura"
          onSubmit={handleSubmit}
          onClose={onClose}
          guardando={guardando}
          plantillasActa={plantillasActa}
          actaBibliotecaId={actaBibliotecaId}
          setActaBibliotecaId={setActaBibliotecaId}
          personas={personas}
          elaboradoPor={elaboradoPor}
          setElaboradoPor={setElaboradoPor}
          revisadoPor={revisadoPor}
          setRevisadoPor={setRevisadoPor}
          observaciones={observaciones}
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">Fecha *</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">Hora</label>
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Modalidad *</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input type="radio" name="modalidad" checked={modalidad === 'presencial'} onChange={() => setModalidad('presencial')} />
                Presencial
              </label>
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input type="radio" name="modalidad" checked={modalidad === 'virtual'} onChange={() => setModalidad('virtual')} />
                Virtual
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Lugar</label>
            <input type="text" value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Ej: Sala 203"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Participantes *</label>
            <textarea value={participantes} onChange={(e) => setParticipantes(e.target.value)} rows={3} required
              placeholder="Ej: Fernando Ávila, Lucía Torres..."
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 min-h-[70px]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Temas tratados *</label>
            <textarea value={temasTratados} onChange={(e) => setTemasTratados(e.target.value)} rows={4} required
              placeholder="Presentación equipo, alcance, cronograma..."
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 min-h-[90px]" />
          </div>
        </FormReunionBase>
      </DialogContent>
    </Dialog>
  );
}

export function ModalReunionCierre({
  isOpen,
  onClose,
  auditoriaId,
  reunionExistente,
  onGuardar,
  onSuccess,
}: ModalReunionCierreProps) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [modalidad, setModalidad] = useState<'presencial' | 'virtual'>('presencial');
  const [lugar, setLugar] = useState('');
  const [participantes, setParticipantes] = useState('');
  const [temasTratados, setTemasTratados] = useState('');
  const [elaboradoPor, setElaboradoPor] = useState('');
  const [revisadoPor, setRevisadoPor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [actaBibliotecaId, setActaBibliotecaId] = useState('');
  const [plantillasActa, setPlantillasActa] = useState<any[]>([]);
  const [personas, setPersonas] = useState<{ id: string; nombre: string }[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const init = parseReunionToForm(reunionExistente ?? undefined);
      setFecha(init.fecha);
      setHora(init.hora);
      setModalidad(init.modalidad);
      setLugar(init.lugar);
      setParticipantes(init.participantes);
      setTemasTratados(init.temasTratados);
      setElaboradoPor(init.elaboradoPor);
      setRevisadoPor(init.revisadoPor);
      setObservaciones(init.observaciones);
      setActaBibliotecaId(init.actaBibliotecaId);
      Promise.all([
        controlInternoService.getDocumentos().then((all) =>
          (all || []).filter((d: any) =>
            (!d.auditoriaId && !d.auditoria_id) &&
            (d.tipoDocumento === 'acta_reunion_cierre' || d.tipo_documento === 'acta_reunion_cierre' || d.tipoDocumento === 'acta' || d.tipo_documento === 'acta')
          )
        ),
        auditoriasApi.getPersonasDisponibles()
      ])
        .then(([docs, res]) => {
          setPlantillasActa(docs || []);
          if (res?.success && res?.data) {
            setPersonas(res.data.map((p: any) => ({
              id: String(p.idPersona || p.id_tercero || p.id),
              nombre: p.nombre || p.nom_largo || 'Sin nombre'
            })));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, reunionExistente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const obs = (form.elements.namedItem('observaciones') as HTMLTextAreaElement)?.value || '';
    if (!fecha || !hora || !participantes || !temasTratados) {
      toast.error('Complete Fecha, Hora, Participantes y Temas tratados');
      return;
    }
    setGuardando(true);
    try {
      const datos: DatosReunionCierre = {
        fecha,
        hora,
        modalidad,
        lugar,
        participantes,
        temasTratados,
        elaboradoPor,
        revisadoPor,
        observaciones: obs,
        actaBibliotecaId: actaBibliotecaId || undefined,
      };
      if (onGuardar) {
        await onGuardar(datos);
      } else {
        await controlInternoService.registrarReunionCierre(auditoriaId, datos);
      }
      toast.success('Reunión de cierre registrada');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Error al registrar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent
          size="xs"
          className="overflow-y-auto p-4 [&]:!w-[420px] [&]:!max-w-[420px] [&]:!min-h-[85vh]"
          style={{ width: 420, maxWidth: 420, minHeight: '85vh' }}
        >
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-1.5 text-base">
            <Users className="w-4 h-4" />
            {reunionExistente ? 'Editar Reunión de Cierre' : 'Registrar Reunión de Cierre'}
          </DialogTitle>
        </DialogHeader>
        <FormReunionBase
          tipo="cierre"
          onSubmit={handleSubmit}
          onClose={onClose}
          guardando={guardando}
          plantillasActa={plantillasActa}
          actaBibliotecaId={actaBibliotecaId}
          setActaBibliotecaId={setActaBibliotecaId}
          personas={personas}
          elaboradoPor={elaboradoPor}
          setElaboradoPor={setElaboradoPor}
          revisadoPor={revisadoPor}
          setRevisadoPor={setRevisadoPor}
          observaciones={observaciones}
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">Fecha *</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">Hora</label>
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Modalidad *</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input type="radio" name="modalidad-cierre" checked={modalidad === 'presencial'} onChange={() => setModalidad('presencial')} />
                Presencial
              </label>
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input type="radio" name="modalidad-cierre" checked={modalidad === 'virtual'} onChange={() => setModalidad('virtual')} />
                Virtual
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Lugar</label>
            <input type="text" value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Ej: Sala 203"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Participantes *</label>
            <textarea value={participantes} onChange={(e) => setParticipantes(e.target.value)} rows={3} required
              placeholder="Ej: Auditor Líder, responsable del área..."
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 min-h-[70px]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Temas tratados *</label>
            <textarea value={temasTratados} onChange={(e) => setTemasTratados(e.target.value)} rows={4} required
              placeholder="Hallazgos, evidencias, acuerdos..."
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 min-h-[90px]" />
          </div>
        </FormReunionBase>
      </DialogContent>
    </Dialog>
  );
}
