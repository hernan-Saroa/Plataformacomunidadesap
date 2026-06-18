/**
 * Modales para Registrar Reunión de Apertura y Reunión de Cierre
 * Modal compacto, datos desde BD, subir acta cuando se selecciona plantilla
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { controlInternoService } from '../../../services/api/controlInternoService';
import { auditoriasApi } from './services/api';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@esap-mfe/shared-ui/select';
import { Calendar, ChevronDown, FileText, Loader2, Search, Users, X } from 'lucide-react';

const CLASE_SELECT_OVERLAY = 'z-[10160]';
function esTargetDentroCombobox(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Node)) return false;
  return Boolean(
    document.querySelector('[data-personas-combobox-popup]')?.contains(target),
  );
}

const propsDialogEvitarCerrarCombobox = {
  onInteractOutside: (e: { target: EventTarget | null; preventDefault: () => void }) => {
    if (esTargetDentroCombobox(e.target)) e.preventDefault();
  },
  onPointerDownOutside: (e: { target: EventTarget | null; preventDefault: () => void }) => {
    if (esTargetDentroCombobox(e.target)) e.preventDefault();
  },
};

function etiquetaPersona(p: PersonaOpcion): string {
  return p.cargo ? `${p.nombre} — ${p.cargo}` : p.nombre;
}

function inicialesNombre(nombre: string): string {
  const partes = nombre.split(' ').filter(Boolean);
  if (partes.length >= 2) {
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }
  return nombre.substring(0, 2).toUpperCase();
}

function colorBadgeCargo(cargo?: string): string {
  const r = (cargo || '').toLowerCase();
  if (r.includes('jefe') || r.includes('director')) return 'bg-purple-100 text-purple-700';
  if (r.includes('líder') || r.includes('lider') || r.includes('senior')) return 'bg-cyan-100 text-cyan-700';
  return 'bg-blue-100 text-blue-700';
}

async function cargarPersonasParaReunion(): Promise<PersonaOpcion[]> {
  const res = await auditoriasApi.getPersonasDisponibles();
  if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
    return mapPersonasFromApi(res.data);
  }
  const all = await auditoriasApi.getAllPersonas(80);
  if (all?.success && Array.isArray(all.data) && all.data.length > 0) {
    return mapPersonasFromApi(all.data);
  }
  return res?.success && Array.isArray(res.data) ? mapPersonasFromApi(res.data) : [];
}

/**
 * Lista desplegable dentro del modal (sin portal a body).
 * Radix Dialog modal bloquea clics en portales externos.
 */
function ComboboxPersonas({
  opciones,
  placeholder,
  disabled,
  cargando,
  onSeleccionar,
  textoBoton,
}: {
  opciones: PersonaOpcion[];
  placeholder: string;
  disabled?: boolean;
  cargando?: boolean;
  onSeleccionar: (persona: PersonaOpcion) => void;
  textoBoton?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popupRef.current?.contains(target)) return;
      if (containerRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filtrados = opciones.filter((p) => {
    const q = busqueda.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      (p.cargo || '').toLowerCase().includes(q)
    );
  });

  const labelBoton = cargando
    ? 'Cargando personas...'
    : textoBoton || placeholder;

  return (
    <div className={`relative w-full ${isOpen ? 'z-[500]' : 'z-[1]'}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled || cargando}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled && !cargando) setIsOpen((v) => !v);
        }}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm text-left flex justify-between items-center gap-2 bg-white transition-colors ${
          disabled || cargando
            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
            : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50/50'
        }`}
      >
        <span className="truncate flex-1">{labelBoton}</span>
        {cargando ? (
          <Loader2 className="w-4 h-4 shrink-0 animate-spin text-gray-400" />
        ) : (
          <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div
          ref={popupRef}
          data-personas-combobox-popup=""
          className="absolute left-0 right-0 top-full mt-1 z-[200] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[min(280px,40vh)]"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b border-gray-100 bg-gray-50 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o cargo..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 py-1 overscroll-contain">
            {filtrados.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">
                {opciones.length === 0
                  ? 'No hay personas disponibles'
                  : 'Sin resultados para la búsqueda'}
              </p>
            ) : (
              filtrados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSeleccionar(p);
                    setIsOpen(false);
                    setBusqueda('');
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-blue-50 active:bg-blue-100 flex items-center gap-3 border-b border-gray-50 last:border-0 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                    {inicialesNombre(p.nombre)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{p.nombre}</p>
                    {p.cargo && (
                      <p className="text-[11px] text-gray-500 truncate">{p.cargo}</p>
                    )}
                  </div>
                  {p.cargo && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 max-w-[100px] truncate ${colorBadgeCargo(p.cargo)}`}
                    >
                      {p.cargo}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export type PersonaOpcion = { id: string; nombre: string; cargo?: string };

function mapPersonasFromApi(data: any[]): PersonaOpcion[] {
  return (data || []).map((p: any) => ({
    id: String(p.idPersona || p.id_tercero || p.id),
    nombre: p.nombre || p.nom_largo || 'Sin nombre',
    cargo: p.cargo,
  }));
}

function parseParticipantesLista(
  raw: string[] | string | undefined,
  personas: PersonaOpcion[],
): PersonaOpcion[] {
  const nombres: string[] = Array.isArray(raw)
    ? raw.map(String).filter(Boolean)
    : typeof raw === 'string'
      ? raw.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  return nombres.map((nombre) => {
    const found = personas.find(
      (p) => p.nombre.toLowerCase() === nombre.toLowerCase() || p.id === nombre,
    );
    return found ?? { id: `legacy-${nombre}`, nombre };
  });
}

function resolverPersonaId(
  valor: string | undefined,
  personas: PersonaOpcion[],
): string {
  if (!valor) return '';
  const byId = personas.find((p) => p.id === valor);
  if (byId) return byId.id;
  const byNombre = personas.find(
    (p) => p.nombre.toLowerCase() === valor.toLowerCase(),
  );
  return byNombre?.id ?? valor;
}

function nombrePersonaPorId(id: string, personas: PersonaOpcion[]): string {
  if (!id) return '';
  const p = personas.find((x) => x.id === id);
  return p?.nombre || id;
}

function participantesListaATexto(lista: PersonaOpcion[]): string {
  return lista.map((p) => p.nombre).join(', ');
}

/** Participantes: combobox con búsqueda; al elegir se añade a la lista */
function SelectorParticipantes({
  label,
  required,
  participantes,
  onChange,
  personas,
  cargandoPersonas,
}: {
  label: string;
  required?: boolean;
  participantes: PersonaOpcion[];
  onChange: (lista: PersonaOpcion[]) => void;
  personas: PersonaOpcion[];
  cargandoPersonas?: boolean;
}) {
  const disponibles = personas.filter(
    (p) => !participantes.some((x) => x.id === p.id),
  );

  const placeholder =
    disponibles.length === 0 && participantes.length > 0
      ? 'Todas las personas ya fueron agregadas'
      : 'Buscar y agregar participante...';

  const agregar = (persona: PersonaOpcion) => {
    if (participantes.some((p) => p.id === persona.id)) {
      toast.error('Esta persona ya está en la lista');
      return;
    }
    onChange([...participantes, persona]);
  };

  return (
    <div className="relative overflow-visible">
      <label className="block text-xs font-medium text-gray-700 mb-0.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <ComboboxPersonas
        opciones={disponibles}
        placeholder={placeholder}
        cargando={cargandoPersonas}
        disabled={cargandoPersonas}
        onSeleccionar={agregar}
      />
      {participantes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200 min-h-[44px]">
          {participantes.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded-full text-xs font-medium"
            >
              {p.nombre}
              <button
                type="button"
                onClick={() => onChange(participantes.filter((x) => x.id !== p.id))}
                className="hover:bg-white/20 rounded-full p-0.5"
                aria-label={`Quitar ${p.nombre}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        !cargandoPersonas && personas.length === 0 && (
          <p className="text-xs text-amber-700 mt-1.5">
            No se cargaron personas. Verifique la conexión o permisos.
          </p>
        )
      )}
    </div>
  );
}

/** Elaborado / revisado — combobox de una sola persona */
function SelectorPersonaUnica({
  label,
  value,
  onChange,
  personas,
  cargandoPersonas,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  personas: PersonaOpcion[];
  cargandoPersonas?: boolean;
}) {
  const seleccionada = personas.find((p) => p.id === value);
  const valorEnLista = Boolean(seleccionada);

  return (
    <div className="relative overflow-visible">
      <label className="block text-xs font-medium text-gray-700 mb-0.5">{label}</label>
      <ComboboxPersonas
        opciones={personas}
        placeholder="Seleccione..."
        cargando={cargandoPersonas}
        disabled={cargandoPersonas}
        textoBoton={valorEnLista ? etiquetaPersona(seleccionada!) : undefined}
        onSeleccionar={(p) => onChange(p.id)}
      />
      {value && !valorEnLista && (
        <p className="text-[10px] text-amber-700 mt-0.5 truncate" title={value}>
          Valor guardado: {value}
        </p>
      )}
    </div>
  );
}

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

function parseReunionToForm(
  r: {
    fecha?: string | Date;
    modalidad?: string;
    lugar?: string;
    participantes?: string[] | string;
    agenda?: { temasTratados?: string };
    elaboradoPor?: string;
    revisadoPor?: string;
    observaciones?: string;
    documentoBibliotecaId?: string | null;
  } | null
  | undefined,
  personas: PersonaOpcion[] = [],
): {
  fecha: string;
  hora: string;
  modalidad: 'presencial' | 'virtual';
  lugar: string;
  participantesLista: PersonaOpcion[];
  temasTratados: string;
  elaboradoPor: string;
  revisadoPor: string;
  observaciones: string;
  actaBibliotecaId: string;
} {
  if (!r) {
    return {
      fecha: '',
      hora: '',
      modalidad: 'presencial',
      lugar: '',
      participantesLista: [],
      temasTratados: '',
      elaboradoPor: '',
      revisadoPor: '',
      observaciones: '',
      actaBibliotecaId: '',
    };
  }
  const d = r.fecha ? (typeof r.fecha === 'string' ? new Date(r.fecha) : r.fecha) : null;
  const m = (r.modalidad === 'hibrida' ? 'presencial' : (r.modalidad as 'presencial' | 'virtual') || 'presencial');
  const docId = r.documentoBibliotecaId ?? '';
  return {
    fecha: d ? d.toISOString().slice(0, 10) : '',
    hora: d ? d.toTimeString().slice(0, 5) : '',
    modalidad: m === 'virtual' ? 'virtual' : 'presencial',
    lugar: r.lugar || '',
    participantesLista: parseParticipantesLista(r.participantes, personas),
    temasTratados: r.agenda?.temasTratados || '',
    elaboradoPor: resolverPersonaId(r.elaboradoPor, personas),
    revisadoPor: resolverPersonaId(r.revisadoPor, personas),
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
  cargandoPersonas,
  participantesLista,
  setParticipantesLista,
  elaboradoPor,
  setElaboradoPor,
  revisadoPor,
  setRevisadoPor,
  observaciones,
  mostrarCamposDetalle,
  camposPrevios,
  camposPosteriores,
}: {
  tipo: 'apertura' | 'cierre';
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  guardando: boolean;
  plantillasActa: any[];
  actaBibliotecaId: string;
  setActaBibliotecaId: (v: string) => void;
  personas: PersonaOpcion[];
  cargandoPersonas?: boolean;
  participantesLista: PersonaOpcion[];
  setParticipantesLista: (lista: PersonaOpcion[]) => void;
  elaboradoPor: string;
  setElaboradoPor: (v: string) => void;
  revisadoPor: string;
  setRevisadoPor: (v: string) => void;
  observaciones?: string;
  mostrarCamposDetalle: boolean;
  camposPrevios?: React.ReactNode;
  camposPosteriores?: React.ReactNode;
}) {
  const tituloActa = tipo === 'apertura' ? 'ACTA DE APERTURA' : 'ACTA DE CIERRE';
  const plantillas = plantillasActa.filter((d: any) => !d.auditoriaId && !d.auditoria_id);

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      {camposPrevios}
      <SelectorParticipantes
        label="Participantes"
        required
        participantes={participantesLista}
        onChange={setParticipantesLista}
        personas={personas}
        cargandoPersonas={cargandoPersonas}
      />
      {camposPosteriores}
      {mostrarCamposDetalle && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <SelectorPersonaUnica
              label="Elaborado por"
              value={elaboradoPor}
              onChange={setElaboradoPor}
              personas={personas}
              cargandoPersonas={cargandoPersonas}
            />
            <SelectorPersonaUnica
              label="Revisado por"
              value={revisadoPor}
              onChange={setRevisadoPor}
              personas={personas}
              cargandoPersonas={cargandoPersonas}
            />
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
            <Select
              value={actaBibliotecaId || 'ninguno'}
              onValueChange={(v) => setActaBibliotecaId(v === 'ninguno' ? '' : v)}
            >
              <SelectTrigger className="w-full h-10 text-sm font-normal bg-white">
                <SelectValue placeholder="Ninguno" />
              </SelectTrigger>
              <SelectContent className={CLASE_SELECT_OVERLAY}>
                <SelectItem value="ninguno">Ninguno</SelectItem>
                {plantillas.map((d: any) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.nombre || d.nombreArchivoOriginal || d.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
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
  const [participantesLista, setParticipantesLista] = useState<PersonaOpcion[]>([]);
  const [temasTratados, setTemasTratados] = useState('');
  const [elaboradoPor, setElaboradoPor] = useState('');
  const [revisadoPor, setRevisadoPor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [actaBibliotecaId, setActaBibliotecaId] = useState('');
  const [plantillasActa, setPlantillasActa] = useState<any[]>([]);
  const [personas, setPersonas] = useState<PersonaOpcion[]>([]);
  const [cargandoPersonas, setCargandoPersonas] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const init = parseReunionToForm(reunionExistente ?? undefined, []);
    setFecha(init.fecha);
    setHora(init.hora);
    setModalidad(init.modalidad);
    setLugar(init.lugar);
    setParticipantesLista(init.participantesLista);
    setTemasTratados(init.temasTratados);
    setElaboradoPor(init.elaboradoPor);
    setRevisadoPor(init.revisadoPor);
    setObservaciones(init.observaciones);
    setActaBibliotecaId(init.actaBibliotecaId);

    setCargandoPersonas(true);
    Promise.all([
      controlInternoService.getDocumentos().then((all) =>
        (all || []).filter((d: any) =>
          (!d.auditoriaId && !d.auditoria_id) &&
          (d.tipoDocumento === 'acta_reunion_apertura' || d.tipo_documento === 'acta_reunion_apertura' || d.tipoDocumento === 'acta' || d.tipo_documento === 'acta')
        )
      ),
      cargarPersonasParaReunion(),
    ])
      .then(([docs, lista]) => {
        setPlantillasActa(docs || []);
        setPersonas(lista);
        const initConPersonas = parseReunionToForm(reunionExistente ?? undefined, lista);
        setParticipantesLista(initConPersonas.participantesLista);
        setElaboradoPor(initConPersonas.elaboradoPor);
        setRevisadoPor(initConPersonas.revisadoPor);
        if (lista.length === 0) {
          toast.warning('No se encontraron personas para seleccionar');
        }
      })
      .catch(() => toast.error('Error al cargar personas'))
      .finally(() => setCargandoPersonas(false));
  }, [isOpen, reunionExistente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const obs = (form.elements.namedItem('observaciones') as HTMLTextAreaElement)?.value || '';
    if (!fecha || !hora) {
      toast.error('Complete Fecha y Hora');
      return;
    }
    if (participantesLista.length === 0 || !temasTratados) {
      toast.error('Agregue al menos un participante y complete Temas tratados');
      return;
    }
    setGuardando(true);
    try {
      const datos: DatosReunionApertura = {
        fecha,
        hora,
        modalidad,
        lugar,
        participantes: participantesListaATexto(participantesLista),
        temasTratados,
        elaboradoPor: nombrePersonaPorId(elaboradoPor, personas),
        revisadoPor: nombrePersonaPorId(revisadoPor, personas),
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

  if (!isOpen) return null;

  const modal = (
    <Dialog open={isOpen} modal={false} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent
          layer="nested"
          className="block overflow-y-auto overflow-x-visible p-6 bg-white"
          style={{ width: 620, maxWidth: 620, maxHeight: 'min(90dvh, 720px)' }}
          {...propsDialogEvitarCerrarCombobox}
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
          cargandoPersonas={cargandoPersonas}
          participantesLista={participantesLista}
          setParticipantesLista={setParticipantesLista}
          elaboradoPor={elaboradoPor}
          setElaboradoPor={setElaboradoPor}
          revisadoPor={revisadoPor}
          setRevisadoPor={setRevisadoPor}
          observaciones={observaciones}
          mostrarCamposDetalle={true}
          camposPrevios={(
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Fecha *</label>
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Hora *</label>
                  <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} required
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
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  {modalidad === 'virtual' ? 'Link de reunión (URL)' : 'Lugar'}
                </label>
                <input
                  type={modalidad === 'virtual' ? 'url' : 'text'}
                  value={lugar}
                  onChange={(e) => setLugar(e.target.value)}
                  placeholder={modalidad === 'virtual' ? 'https://teams.microsoft.com/...' : 'Ej: Sala 203'}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
          camposPosteriores={(
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">Temas tratados *</label>
              <textarea value={temasTratados} onChange={(e) => setTemasTratados(e.target.value)} rows={4} required
                placeholder="Presentación equipo, alcance, cronograma..."
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 min-h-[90px]" />
            </div>
          )}
        />
      </DialogContent>
    </Dialog>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
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
  const [participantesLista, setParticipantesLista] = useState<PersonaOpcion[]>([]);
  const [temasTratados, setTemasTratados] = useState('');
  const [elaboradoPor, setElaboradoPor] = useState('');
  const [revisadoPor, setRevisadoPor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [actaBibliotecaId, setActaBibliotecaId] = useState('');
  const [plantillasActa, setPlantillasActa] = useState<any[]>([]);
  const [personas, setPersonas] = useState<PersonaOpcion[]>([]);
  const [cargandoPersonas, setCargandoPersonas] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const init = parseReunionToForm(reunionExistente ?? undefined, []);
    setFecha(init.fecha);
    setHora(init.hora);
    setModalidad(init.modalidad);
    setLugar(init.lugar);
    setParticipantesLista(init.participantesLista);
    setTemasTratados(init.temasTratados);
    setElaboradoPor(init.elaboradoPor);
    setRevisadoPor(init.revisadoPor);
    setObservaciones(init.observaciones);
    setActaBibliotecaId(init.actaBibliotecaId);

    setCargandoPersonas(true);
    Promise.all([
      controlInternoService.getDocumentos().then((all) =>
        (all || []).filter((d: any) =>
          (!d.auditoriaId && !d.auditoria_id) &&
          (d.tipoDocumento === 'acta_reunion_cierre' || d.tipo_documento === 'acta_reunion_cierre' || d.tipoDocumento === 'acta' || d.tipo_documento === 'acta')
        )
      ),
      cargarPersonasParaReunion(),
    ])
      .then(([docs, lista]) => {
        setPlantillasActa(docs || []);
        setPersonas(lista);
        const initConPersonas = parseReunionToForm(reunionExistente ?? undefined, lista);
        setParticipantesLista(initConPersonas.participantesLista);
        setElaboradoPor(initConPersonas.elaboradoPor);
        setRevisadoPor(initConPersonas.revisadoPor);
        if (lista.length === 0) {
          toast.warning('No se encontraron personas para seleccionar');
        }
      })
      .catch(() => toast.error('Error al cargar personas'))
      .finally(() => setCargandoPersonas(false));
  }, [isOpen, reunionExistente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const obs = (form.elements.namedItem('observaciones') as HTMLTextAreaElement)?.value || '';
    if (!fecha || !hora) {
      toast.error('Complete Fecha y Hora');
      return;
    }
    if (participantesLista.length === 0 || !temasTratados) {
      toast.error('Agregue al menos un participante y complete Temas tratados');
      return;
    }
    setGuardando(true);
    try {
      const datos: DatosReunionCierre = {
        fecha,
        hora,
        modalidad,
        lugar,
        participantes: participantesListaATexto(participantesLista),
        temasTratados,
        elaboradoPor: nombrePersonaPorId(elaboradoPor, personas),
        revisadoPor: nombrePersonaPorId(revisadoPor, personas),
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

  if (!isOpen) return null;

  const modal = (
    <Dialog open={isOpen} modal={false} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent
          layer="nested"
          className="block overflow-y-auto overflow-x-visible p-6 bg-white"
          style={{ width: 620, maxWidth: 620, maxHeight: 'min(90dvh, 720px)' }}
          {...propsDialogEvitarCerrarCombobox}
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
          cargandoPersonas={cargandoPersonas}
          participantesLista={participantesLista}
          setParticipantesLista={setParticipantesLista}
          elaboradoPor={elaboradoPor}
          setElaboradoPor={setElaboradoPor}
          revisadoPor={revisadoPor}
          setRevisadoPor={setRevisadoPor}
          observaciones={observaciones}
          mostrarCamposDetalle={true}
          camposPrevios={(
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Fecha *</label>
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Hora *</label>
                  <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} required
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
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  {modalidad === 'virtual' ? 'Link de reunión (URL)' : 'Lugar'}
                </label>
                <input
                  type={modalidad === 'virtual' ? 'url' : 'text'}
                  value={lugar}
                  onChange={(e) => setLugar(e.target.value)}
                  placeholder={modalidad === 'virtual' ? 'https://teams.microsoft.com/...' : 'Ej: Sala 203'}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
          camposPosteriores={(
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">Temas tratados *</label>
              <textarea value={temasTratados} onChange={(e) => setTemasTratados(e.target.value)} rows={4} required
                placeholder="Hallazgos, evidencias, acuerdos..."
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 min-h-[90px]" />
            </div>
          )}
        />
      </DialogContent>
    </Dialog>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
