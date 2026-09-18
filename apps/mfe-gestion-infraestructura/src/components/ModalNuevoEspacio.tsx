import React, { useEffect, useMemo, useState } from 'react';
import { X, Save, LayoutGrid, AlertCircle, CheckCircle2, Wind, Monitor, Video } from 'lucide-react';
import { EspacioFisico, Sede, BloqueEdificio, infraestructuraService } from '../services/infraestructuraService';

export type TipoEspacio = 'AULA' | 'AUDITORIO' | 'LABORATORIO' | 'OFICINA' | 'BIBLIOTECA' | 'SALA_CONSEJO';
export type EstadoEspacio = 'DISPONIBLE' | 'MANTENIMIENTO' | 'INACTIVO' | 'RESERVADO';

export const OPCIONES_TIPO_ESPACIO: Array<{ valor: TipoEspacio; label: string }> = [
  { valor: 'AULA', label: 'AULA' },
  { valor: 'AUDITORIO', label: 'AUDITORIO' },
  { valor: 'LABORATORIO', label: 'LABORATORIO' },
  { valor: 'OFICINA', label: 'OFICINA' },
  { valor: 'BIBLIOTECA', label: 'BIBLIOTECA' },
  { valor: 'SALA_CONSEJO', label: 'SALA CONSEJO' },
];

export const OPCIONES_ESTADO: Array<{ valor: EstadoEspacio; label: string }> = [
  { valor: 'DISPONIBLE', label: 'DISPONIBLE' },
  { valor: 'MANTENIMIENTO', label: 'EN MANTENIMIENTO' },
  { valor: 'RESERVADO', label: 'RESERVADO' },
  { valor: 'INACTIVO', label: 'INACTIVO' },
];

export interface FormularioNuevoEspacio {
  idSede: string;
  idBloque: string;
  codigo: string;
  nombre: string;
  tipo: TipoEspacio;
  capacidad: number;
  piso: number;
  areaM2: string;
  estado: EstadoEspacio;
  tieneAireAcondicionado: boolean;
  tieneVideobeam: boolean;
  tieneComputadores: boolean;
  isActivo: boolean;
}

const FORM_VACIO: FormularioNuevoEspacio = {
  idSede: '',
  idBloque: '',
  codigo: '',
  nombre: '',
  tipo: 'AULA',
  capacidad: 30,
  piso: 1,
  areaM2: '',
  estado: 'DISPONIBLE',
  tieneAireAcondicionado: false,
  tieneVideobeam: false,
  tieneComputadores: false,
  isActivo: true,
};

export interface ModalNuevoEspacioProps {
  open: boolean;
  onClose: () => void;
  sedes: Sede[];
  espacioAEditar?: EspacioFisico | null;
  onExito: (espacio: EspacioFisico) => void;
  onError?: (msg: string) => void;
}

export const ModalNuevoEspacio: React.FC<ModalNuevoEspacioProps> = ({
  open,
  onClose,
  sedes,
  espacioAEditar,
  onExito,
  onError,
}) => {
  const [form, setForm] = useState<FormularioNuevoEspacio>(FORM_VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  const bloquesDisponibles: BloqueEdificio[] = useMemo(() => {
    if (!form.idSede) return [];
    const sede = sedes.find((s) => s.idSede === form.idSede);
    return (sede?.bloques ?? []).filter((b) => b.isActivo);
  }, [form.idSede, sedes]);

  const modoEdicion = Boolean(espacioAEditar?.idEspacio);

  useEffect(() => {
    if (!open) return;
    if (modoEdicion && espacioAEditar) {
      const idSede = espacioAEditar.bloque?.idSede ?? '';
      setForm({
        idSede,
        idBloque: espacioAEditar.idBloque,
        codigo: espacioAEditar.codigo,
        nombre: espacioAEditar.nombre,
        tipo: (OPCIONES_TIPO_ESPACIO.find((o) => o.valor === espacioAEditar.tipo)?.valor ?? 'AULA') as TipoEspacio,
        capacidad: espacioAEditar.capacidad ?? 30,
        piso: espacioAEditar.piso ?? 1,
        areaM2: espacioAEditar.areaM2 != null ? String(espacioAEditar.areaM2) : '',
        estado: (OPCIONES_ESTADO.find((o) => o.valor === espacioAEditar.estado)?.valor ?? 'DISPONIBLE') as EstadoEspacio,
        tieneAireAcondicionado: Boolean(espacioAEditar.tieneAireAcondicionado),
        tieneVideobeam: Boolean(espacioAEditar.tieneVideobeam),
        tieneComputadores: Boolean(espacioAEditar.tieneComputadores),
        isActivo: Boolean(espacioAEditar.isActivo),
      });
    } else {
      const sedePrimera = (sedes.find((s) => s.isActivo) ?? sedes[0]);
      setForm({
        ...FORM_VACIO,
        idSede: sedePrimera?.idSede ?? '',
        idBloque: (sedePrimera?.bloques ?? [])[0]?.idBloque ?? '',
      });
    }
    setErrores({});
    setFeedback(null);
  }, [open, modoEdicion, espacioAEditar, sedes]);

  const esValido = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.idSede) e.idSede = 'Seleccione una sede.';
    if (!form.idBloque) e.idBloque = 'Seleccione un bloque / edificio.';
    if (!form.codigo.trim()) e.codigo = 'Código es obligatorio.';
    else if (form.codigo.length > 50) e.codigo = 'Máx 50 caracteres.';
    if (!form.nombre.trim()) e.nombre = 'Nombre es obligatorio.';
    if (!form.tipo) e.tipo = 'Seleccione tipo de espacio.';
    if (!(Number.isFinite(Number(form.capacidad)) && Number(form.capacidad) >= 1)) {
      e.capacidad = 'Capacidad mínima 1 puesto.';
    }
    if (!Number.isFinite(Number(form.piso))) e.piso = 'Piso debe ser entero.';
    if (form.areaM2 !== '' && !(Number(form.areaM2) > 0)) e.areaM2 = 'Area debe ser > 0 o vacío.';
    setErrores(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const submitDisabled = !esValido || cargando;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esValido) return;
    setCargando(true);
    setFeedback(null);
    try {
      const payload: Partial<EspacioFisico> & { idBloque: string; codigo: string; nombre: string; tipo: string } = {
        idBloque: form.idBloque,
        codigo: form.codigo.trim().toUpperCase(),
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        capacidad: Math.max(1, Math.floor(Number(form.capacidad))),
        piso: Math.floor(Number(form.piso)),
        areaM2: form.areaM2 === '' ? undefined : Number(form.areaM2),
        estado: form.estado,
        tieneAireAcondicionado: form.tieneAireAcondicionado,
        tieneVideobeam: form.tieneVideobeam,
        tieneComputadores: form.tieneComputadores,
        isActivo: form.isActivo,
      };
      let resultado: EspacioFisico;
      if (modoEdicion && espacioAEditar) {
        resultado = await infraestructuraService.actualizarEspacio(espacioAEditar.idEspacio, payload);
      } else {
        resultado = await infraestructuraService.crearEspacio(payload);
      }
      setFeedback({ tipo: 'ok', texto: `Espacio ${resultado.codigo} ${modoEdicion ? 'actualizado' : 'guardado'} correctamente.` });
      setTimeout(() => {
        onExito(resultado);
      }, 600);
    } catch (err: any) {
      const msg = err?.message ?? 'Error desconocido';
      setFeedback({ tipo: 'err', texto: msg });
      onError?.(msg);
    } finally {
      setCargando(false);
    }
  };

  if (!open) return null;

  const toggle = (key: keyof FormularioNuevoEspacio) => {
    setForm((f) => ({ ...f, [key]: !Boolean((f as any)[key]) }));
  };

  const FilaToggle: React.FC<{
    activo: boolean;
    onClick: () => void;
    label: string;
    hint?: string;
    colorActive?: string;
  }> = ({ activo, onClick, label, hint, colorActive = 'bg-emerald-600' }) => (
    <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-slate-800">{label}</div>
        {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        onClick={onClick}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-sm ${activo ? colorActive : 'bg-slate-300'}`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${activo ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !cargando) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={modoEdicion ? 'Editar Espacio Físico / Aula' : 'Nuevo Espacio Físico / Aula'}
    >
      <div
        style={{
          position: 'fixed',
          top: 136,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '95vw',
          maxWidth: 960,
          height: 'calc(100vh - 160px)',
          overflow: 'hidden',
        }}
      >
        <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 h-full">

          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-5 border-b border-slate-200 bg-white/95 backdrop-blur rounded-t-2xl">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10  bg-gray-400 shrink-0 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/30 ring-2 ring-indigo-100">
                <LayoutGrid className="w-5 h-5" />
              </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-black text-slate-900 tracking-tight truncate">
                {modoEdicion ? 'Editar Espacio Físico / Aula' : 'Nuevo Espacio Físico / Aula'}
              </h3>
              <p className="text-sm text-slate-600 font-medium mt-0.5">
                {modoEdicion
                  ? 'Actualice los datos del espacio y guarde los cambios.'
                  : 'Asocie el espacio a un bloque dentro de una sede territorial. Ingrese los datos y equipamiento disponible.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          {feedback && (
            <div
              className={`mb-4 rounded-xl border p-3 shadow-sm text-xs font-bold flex items-start gap-2 ${
                feedback.tipo === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedback.tipo === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 break-words">{feedback.texto}</div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 tracking-wide mb-1.5">Sede Territorial</label>
              <select
                value={form.idSede}
                onChange={(e) => setForm((f) => ({ ...f, idSede: e.target.value, idBloque: '' }))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition-all shadow-sm"
              >
                <option value="">Seleccione sede</option>
                {sedes
                  .filter((s) => s.isActivo)
                  .map((s) => (
                    <option key={s.idSede} value={s.idSede}>
                      {s.codigo} — {s.nombre}
                    </option>
                  ))}
              </select>
              {errores.idSede && <div className="text-xs font-bold text-rose-600 mt-1.5">{errores.idSede}</div>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 tracking-wide mb-1.5">Bloque / Edificio</label>
              <select
                value={form.idBloque}
                onChange={(e) => setForm((f) => ({ ...f, idBloque: e.target.value }))}
                disabled={!form.idSede || bloquesDisponibles.length === 0}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition-all shadow-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                <option value="">{form.idSede ? 'Seleccione bloque' : 'Primero seleccione sede'}</option>
                {bloquesDisponibles.map((b) => (
                  <option key={b.idBloque} value={b.idBloque}>
                    {b.codigo} — {b.nombre} ({b.pisos} piso{b.pisos === 1 ? '' : 's'})
                  </option>
                ))}
              </select>
              {errores.idBloque && <div className="text-xs font-bold text-rose-600 mt-1.5">{errores.idBloque}</div>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 tracking-wide mb-1.5">Código Espacio</label>
              <input
                type="text"
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                placeholder="Ej. AUL-201, AUD-001, LAB-TIC"
                maxLength={50}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-sm"
              />
              {errores.codigo && <div className="text-xs font-bold text-rose-600 mt-1.5">{errores.codigo}</div>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 tracking-wide mb-1.5">Tipo de Espacio</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoEspacio }))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-sm"
              >
                {OPCIONES_TIPO_ESPACIO.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.label}</option>
                ))}
              </select>
              {errores.tipo && <div className="text-xs font-bold text-rose-600 mt-1.5">{errores.tipo}</div>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-600 tracking-wide mb-1.5">Nombre del Espacio</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Aula 201 Edificio A - Bloque Centro"
                maxLength={150}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-sm"
              />
              {errores.nombre && <div className="text-xs font-bold text-rose-600 mt-1.5">{errores.nombre}</div>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 tracking-wide mb-1.5">Capacidad (puestos)</label>
              <input
                type="number"
                min={1}
                step={1}
                value={form.capacidad}
                onChange={(e) => setForm((f) => ({ ...f, capacidad: Number(e.target.value) }))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-sm"
              />
              {errores.capacidad && <div className="text-xs font-bold text-rose-600 mt-1.5">{errores.capacidad}</div>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 tracking-wide mb-1.5">Piso</label>
              <input
                type="number"
                step={1}
                value={form.piso}
                onChange={(e) => setForm((f) => ({ ...f, piso: Number(e.target.value) }))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-sm"
              />
              {errores.piso && <div className="text-xs font-bold text-rose-600 mt-1.5">{errores.piso}</div>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 tracking-wide mb-1.5">Área (m²) - Opcional</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.areaM2}
                onChange={(e) => setForm((f) => ({ ...f, areaM2: e.target.value }))}
                placeholder="Ej. 68.5"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-sm"
              />
              {errores.areaM2 && <div className="text-xs font-bold text-rose-600 mt-1.5">{errores.areaM2}</div>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 tracking-wide mb-1.5">Estado Disponibilidad</label>
              <select
                value={form.estado}
                onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoEspacio }))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-sm"
              >
                {OPCIONES_ESTADO.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FilaToggle
              activo={form.tieneAireAcondicionado}
              onClick={() => toggle('tieneAireAcondicionado')}
              colorActive="bg-sky-600"
              label="Aire Acondicionado"
              hint="Equipo HVAC / Clima"
            />
            <FilaToggle
              activo={form.tieneComputadores}
              onClick={() => toggle('tieneComputadores')}
              colorActive="bg-amber-600"
              label="Equipos de Cómputo"
              hint="PC, All-In-One, portátiles"
            />
            <FilaToggle
              activo={form.tieneVideobeam}
              onClick={() => toggle('tieneVideobeam')}
              colorActive="bg-purple-600"
              label="Proyector / VideoBeam"
              hint="Pantalla o proyección"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FilaToggle
              activo={form.isActivo}
              onClick={() => toggle('isActivo')}
              colorActive={form.isActivo ? 'bg-emerald-600' : 'bg-slate-300'}
              label={form.isActivo ? 'Espacio Activo' : 'Espacio Inactivo (soft delete)'}
              hint={form.isActivo
                ? 'Visible en inventario y disponible para solicitudes.'
                : 'Oculto en filtro por defecto; equivale a soft delete.'}
            />
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 font-semibold">
            <div className="flex items-center gap-1 text-sky-700">
              <Wind className="w-3.5 h-3.5" /> Aire
            </div>
            <div className="flex items-center gap-1 text-amber-700 ml-1">
              <Monitor className="w-3.5 h-3.5" /> Cómputo
            </div>
            <div className="flex items-center gap-1 text-purple-700 ml-1">
              <Video className="w-3.5 h-3.5" /> Proyector
            </div>
          </div>
        </form>

        <div className="sticky bottom-0 z-10 p-4 sm:p-5 border-t border-slate-200 bg-slate-50/90 backdrop-blur flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={cargando}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold shadow-sm transition-all disabled:bg-slate-200 disabled:text-slate-600 disabled:cursor-not-allowed active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={(ev) => handleSubmit(ev)}
            disabled={submitDisabled}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm shadow-blue-500/25 transition-all active:scale-95 disabled:bg-slate-300 disabled:text-slate-800 disabled:shadow-none disabled:cursor-not-allowed disabled:scale-100"
          >
            <Save className="w-4 h-4 shrink-0" />
            {cargando ? (modoEdicion ? 'Actualizando...' : 'Guardando...') : (modoEdicion ? 'Guardar Cambios' : 'Crear Espacio')}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};
