import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowUp,
  ListOrdered,
  Pencil,
  Plus,
  Save,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  AccionEscalon,
  CadenaDeAprobacion,
  EscalonConfigurado,
  PapelEscalon,
} from '../../types';
import { PERMISOS } from '../../auth/permisos';
import { useAlcance } from '../../auth/alcance';
import { useDialogo } from '../shared/useDialogo';
import { campo } from '../shared/PiezasPanel';

/** Un escalón mientras se edita: los nombres van aparte de los ids que se guardan. */
interface EscalonEnEdicion extends EscalonConfigurado {
  clave: number;
  nombres: Record<string, string>;
}

interface Borrador {
  id: string | null;
  nombre: string;
  descripcion: string;
  permiteMismoAprobador: boolean;
  escalones: EscalonEnEdicion[];
}

let siguienteClave = 1;

const escalonVacio = (): EscalonEnEdicion => ({
  clave: siguienteClave++,
  nombre: '',
  roles: [],
  personas: [],
  papeles: [],
  puestos: [],
  reglaDecision: 'UNO',
  acciones: ['APROBAR', 'DEVOLVER'],
  nombres: {},
});

const borradorDe = (c: CadenaDeAprobacion | null): Borrador =>
  c
    ? {
        id: c.id,
        nombre: c.nombre,
        descripcion: c.descripcion ?? '',
        permiteMismoAprobador: c.permiteMismoAprobador,
        escalones: c.escalones.map((e) => ({
          clave: siguienteClave++,
          nombre: e.nombre,
          roles: e.roles,
          personas: e.personas,
          papeles: e.papeles,
          puestos: e.puestos ?? [],
          reglaDecision: e.reglaDecision,
          acciones: e.acciones,
          nombres: Object.fromEntries([
            ...e.roles.map((r, i) => [r, e.nombresRoles[i] ?? r]),
            ...e.personas.map((p, i) => [p, e.nombresPersonas[i] ?? p]),
            ...e.papeles.map((p, i) => [p, e.nombresPapeles[i] ?? p]),
            ...(e.puestos ?? []).map((p, i) => [p, e.nombresPuestos?.[i] ?? p]),
          ]),
        })),
      }
    : { id: null, nombre: '', descripcion: '', permiteMismoAprobador: false, escalones: [escalonVacio()] };

const ACCIONES: { accion: AccionEscalon; etiqueta: string; ayuda: string }[] = [
  { accion: 'APROBAR', etiqueta: 'Aprobar', ayuda: 'Siempre: sin eso la cadena no tiene salida' },
  { accion: 'DEVOLVER', etiqueta: 'Devolver', ayuda: 'Regresa a quien la envió, que la corrige' },
  { accion: 'NEGAR', etiqueta: 'Negar', ayuda: 'No procede: el proceso termina' },
];

const boton =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md border border-gray-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const primario =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-[#003DA5] text-white hover:bg-[#00307f] disabled:opacity-50';
const iconoBoton =
  'p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30';

/**
 * Las cadenas de aprobación por escalones (migración 101).
 *
 * Una cadena se arma una vez —técnico, coordinador, director— y se elige
 * después en la pestaña de Aprobación de cada actividad que la necesite. Así no
 * hay que reconstruir la misma cadena actividad por actividad.
 *
 * Cambiar una cadena solo afecta los envíos siguientes: lo que ya está en
 * revisión sigue con la cadena con la que se envió.
 */
export function CadenasDeAprobacion() {
  const { tiene } = useAlcance();
  const puedeEditar = tiene(PERMISOS.configurar);
  const dialogo = useDialogo();
  const [cadenas, setCadenas] = useState<CadenaDeAprobacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<Borrador | null>(null);

  const leer = () =>
    contratacionService
      .cadenasDeAprobacion()
      .then((c) => {
        setCadenas(c);
        setError(null);
      })
      .catch((e: any) => setError(e.message));

  useEffect(() => {
    leer();
  }, []);

  const archivar = async (c: CadenaDeAprobacion) => {
    const ok = await dialogo.confirmar({
      titulo: `Archivar «${c.nombre}»`,
      descripcion:
        'Deja de ofrecerse en las actividades. Lo que ya se aprobó con ella conserva su historia.',
      confirmar: 'Archivar',
      tono: 'peligro',
    });
    if (!ok) return;
    try {
      await contratacionService.archivarCadenaDeAprobacion(c.id);
      toast.success('Cadena archivada');
      leer();
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo archivar');
    }
  };

  if (error) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-red-800 m-0">{error}</p>
      </div>
    );
  }
  if (!cadenas) return <p className="text-xs text-slate-500 m-0 px-4 py-3">Cargando…</p>;

  if (editando) {
    return (
      <EditorCadena
        inicial={editando}
        onCancelar={() => setEditando(null)}
        onGuardada={() => {
          setEditando(null);
          leer();
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <ListOrdered className="w-5 h-5 text-[#003DA5] mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-800 m-0">Cadenas de aprobación</h3>
            <p className="text-[12px] text-slate-600 m-0 mt-0.5 leading-relaxed">
              Revisiones en orden: cuando un escalón aprueba, pasa al siguiente; la actividad queda
              aprobada solo cuando decide el último. Si alguno la devuelve, regresa a quien la envió y,
              al reenviarla, la revisión empieza otra vez desde el primero. Se eligen en la pestaña de
              Aprobación de cada actividad.
            </p>
          </div>
          {puedeEditar ? (
            <button type="button" className={primario} onClick={() => setEditando(borradorDe(null))}>
              <Plus className="w-3.5 h-3.5" />
              Nueva cadena
            </button>
          ) : null}
        </div>
      </div>

      {cadenas.length === 0 ? (
        <p className="text-xs text-slate-500 m-0 px-1">
          Todavía no hay cadenas. Mientras tanto, cada actividad se aprueba en un solo paso.
        </p>
      ) : (
        cadenas.map((c) => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-2.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 m-0">{c.nombre}</p>
                {c.descripcion ? (
                  <p className="text-[12px] text-slate-600 m-0 mt-0.5">{c.descripcion}</p>
                ) : null}
              </div>
              {puedeEditar ? (
                <>
                  <button type="button" className={boton} onClick={() => setEditando(borradorDe(c))}>
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    className={boton}
                    onClick={() => archivar(c)}
                    disabled={c.usadaEn.length > 0}
                    title={c.usadaEn.length ? 'Primero quítala de las actividades que la usan' : undefined}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Archivar
                  </button>
                </>
              ) : null}
            </div>

            <ol className="m-0 p-0 list-none space-y-1.5">
              {c.escalones.map((e, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg border border-gray-100 bg-slate-50 px-3 py-2">
                  <span className="text-xs font-black text-[#003DA5] tabular-nums w-4 flex-shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 m-0">{e.nombre}</p>
                    <p className="text-[11px] text-slate-600 m-0">
                      {[...(e.nombresPuestos ?? []), ...e.nombresRoles, ...e.nombresPersonas, ...e.nombresPapeles].join(' o ')}
                      {e.reglaDecision === 'TODOS' ? ' · deben aprobar todos' : ''}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500 flex-shrink-0">
                    {ACCIONES.filter((a) => e.acciones.includes(a.accion))
                      .map((a) => a.etiqueta)
                      .join(' · ')}
                  </span>
                </li>
              ))}
            </ol>

            {c.problemas?.length ? (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 space-y-0.5">
                  {c.problemas.map((pr) => (
                    <p key={pr} className="text-xs text-amber-800 m-0">
                      {pr}
                    </p>
                  ))}
                  {puedeEditar ? (
                    <p className="text-xs text-amber-800 m-0 font-bold">
                      Edita la cadena y elige el rol que corresponde hoy.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <p className="text-[11px] text-slate-500 m-0">
              {c.usadaEn.length
                ? `La usan: ${c.usadaEn.map((u) => `${u.numeral} ${u.nombre}`).join('; ')}`
                : 'Ninguna actividad la usa todavía.'}
              {c.permiteMismoAprobador ? ' · Una persona puede aprobar varios escalones.' : ''}
            </p>
          </div>
        ))
      )}
      {dialogo.elemento}
    </div>
  );
}

/** El formulario de una cadena: nombre, escalones en orden y reglas de cada uno. */
function EditorCadena({
  inicial,
  onCancelar,
  onGuardada,
}: {
  inicial: Borrador;
  onCancelar: () => void;
  onGuardada: () => void;
}) {
  const [b, setB] = useState<Borrador>(inicial);
  const [guardando, setGuardando] = useState(false);
  const [problemas, setProblemas] = useState<string | null>(null);

  const cambiarEscalon = (clave: number, cambios: Partial<EscalonEnEdicion>) =>
    setB((x) => ({
      ...x,
      escalones: x.escalones.map((e) => (e.clave === clave ? { ...e, ...cambios } : e)),
    }));

  const mover = (i: number, d: -1 | 1) =>
    setB((x) => {
      const lista = [...x.escalones];
      const [e] = lista.splice(i, 1);
      lista.splice(i + d, 0, e);
      return { ...x, escalones: lista };
    });

  const guardar = async () => {
    setGuardando(true);
    setProblemas(null);
    try {
      await contratacionService.guardarCadenaDeAprobacion(b.id, {
        nombre: b.nombre,
        descripcion: b.descripcion || undefined,
        permiteMismoAprobador: b.permiteMismoAprobador,
        escalones: b.escalones.map(({ clave: _c, nombres: _n, ...e }) => e),
      });
      toast.success(b.id ? 'Cadena actualizada' : 'Cadena creada', {
        description: b.id ? 'Aplica a los envíos desde ahora; lo que está en revisión sigue igual.' : undefined,
      });
      onGuardada();
    } catch (e: any) {
      // El servidor dice todo lo que falta de una vez, en frases.
      setProblemas(e.message ?? 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ListOrdered className="w-5 h-5 text-[#003DA5] flex-shrink-0" />
        <h3 className="text-sm font-black text-slate-800 m-0 flex-1">
          {b.id ? 'Editar la cadena' : 'Nueva cadena de aprobación'}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-700">Nombre</span>
          <input
            className={campo}
            value={b.nombre}
            onChange={(e) => setB({ ...b, nombre: e.target.value })}
            placeholder="Técnico, coordinador y director"
            maxLength={160}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-700">Para qué se usa (opcional)</span>
          <input
            className={campo}
            value={b.descripcion}
            onChange={(e) => setB({ ...b, descripcion: e.target.value })}
            placeholder="Actividades que firma la Dirección"
          />
        </label>
      </div>

      <label className="flex items-start gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={b.permiteMismoAprobador}
          onChange={(e) => setB({ ...b, permiteMismoAprobador: e.target.checked })}
          className="mt-0.5"
        />
        <span>
          <span className="font-bold">Una misma persona puede aprobar varios escalones</span>
          <span className="block text-[11px] text-slate-500">
            Apagado, quien aprobó un escalón no puede aprobar otro del mismo envío: así cada escalón lo
            decide alguien distinto.
          </span>
        </span>
      </label>

      <ol className="m-0 p-0 list-none space-y-2.5">
        {b.escalones.map((e, i) => (
          <li key={e.clave} className="rounded-lg border border-gray-200 bg-slate-50 p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#003DA5] tabular-nums w-4">{i + 1}</span>
              <input
                className={`${campo} flex-1`}
                value={e.nombre}
                onChange={(ev) => cambiarEscalon(e.clave, { nombre: ev.target.value })}
                placeholder={i === 0 ? 'Revisión técnica' : i === b.escalones.length - 1 ? 'Aprobación final' : 'Coordinación'}
                aria-label={`Nombre del escalón ${i + 1}`}
                maxLength={120}
              />
              <button type="button" className={iconoBoton} onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className={iconoBoton}
                onClick={() => mover(i, 1)}
                disabled={i === b.escalones.length - 1}
                aria-label="Bajar"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className={iconoBoton}
                onClick={() => setB({ ...b, escalones: b.escalones.filter((x) => x.clave !== e.clave) })}
                disabled={b.escalones.length === 1}
                aria-label={`Quitar el escalón ${i + 1}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <ResponsablesDelEscalon escalon={e} onCambio={(c) => cambiarEscalon(e.clave, c)} />

            <div className="flex flex-wrap items-start gap-x-5 gap-y-2">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-600 m-0">Si hay varios responsables</p>
                <select
                  className={campo}
                  value={e.reglaDecision}
                  onChange={(ev) => cambiarEscalon(e.clave, { reglaDecision: ev.target.value as 'UNO' | 'TODOS' })}
                  aria-label={`Regla de decisión del escalón ${i + 1}`}
                >
                  <option value="UNO">Basta con que apruebe uno</option>
                  <option value="TODOS">Deben aprobar todas las personas nombradas</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-600 m-0">Este escalón puede</p>
                <div className="flex flex-wrap gap-3">
                  {ACCIONES.map((a) => (
                    <label key={a.accion} className="flex items-center gap-1.5 text-xs text-slate-700" title={a.ayuda}>
                      <input
                        type="checkbox"
                        checked={e.acciones.includes(a.accion)}
                        disabled={a.accion === 'APROBAR'}
                        onChange={(ev) =>
                          cambiarEscalon(e.clave, {
                            acciones: ev.target.checked
                              ? [...e.acciones, a.accion]
                              : e.acciones.filter((x) => x !== a.accion),
                          })
                        }
                      />
                      {a.etiqueta}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className={boton}
        onClick={() => setB({ ...b, escalones: [...b.escalones, escalonVacio()] })}
      >
        <Plus className="w-3.5 h-3.5" />
        Agregar escalón
      </button>

      {problemas ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-800 m-0">{problemas}</p>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
        <button type="button" className={boton} onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
        <button type="button" className={primario} onClick={guardar} disabled={guardando}>
          <Save className="w-3.5 h-3.5" />
          {guardando ? 'Guardando…' : 'Guardar la cadena'}
        </button>
      </div>
    </div>
  );
}

/**
 * Quién responde por un escalón: roles, personas, un puesto o un papel del
 * proceso.
 *
 * En pestañas, como en la aprobación de una actividad: mezclados en una lista
 * no se distingue un rol de una persona. Los puestos (109) —Abogado, Jefe— los
 * ocupa una persona en cada proceso, asignada en la 3.3; los papeles —quien lo
 * lleva en Contratación, el supervisor— nombran a quien cumple ese papel en
 * cada expediente.
 */
function ResponsablesDelEscalon({
  escalon,
  onCambio,
}: {
  escalon: EscalonEnEdicion;
  onCambio: (c: Partial<EscalonEnEdicion>) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [donde, setDonde] = useState<'puestos' | 'roles' | 'personas' | 'papeles'>('puestos');
  const [texto, setTexto] = useState('');
  const [roles, setRoles] = useState<{ code: string; name: string }[]>([]);
  const [papeles, setPapeles] = useState<{ codigo: PapelEscalon; nombre: string }[]>([]);
  const [puestos, setPuestos] = useState<{ id: string; nombre: string }[]>([]);
  const [personas, setPersonas] = useState<{ id: string; nombre: string; cargo?: string }[]>([]);

  const elegidos = useMemo(
    () => new Set([...escalon.roles, ...escalon.personas, ...escalon.papeles, ...(escalon.puestos ?? [])]),
    [escalon],
  );

  const abrir = () => {
    setAbierto(true);
    if (!roles.length) contratacionService.rolesAprobadores().then(setRoles).catch(() => setRoles([]));
    if (!papeles.length) contratacionService.papelesDeEscalon().then(setPapeles).catch(() => setPapeles([]));
    if (!puestos.length) {
      contratacionService
        .puestos()
        .then((l) => setPuestos(l.map((x) => ({ id: x.id, nombre: x.nombre }))))
        .catch(() => setPuestos([]));
    }
  };

  useEffect(() => {
    const q = texto.trim();
    if (donde !== 'personas' || q.length < 2) {
      setPersonas([]);
      return;
    }
    const t = setTimeout(() => {
      contratacionService
        .personas(q)
        .then((lista: any[]) =>
          setPersonas(
            lista
              .map((p) => ({
                id: p.id ?? p.idPerson ?? p.id_person,
                nombre: p.nombre ?? p.nombreCompleto ?? p.full_name ?? '',
                cargo: p.cargo ?? p.email ?? undefined,
              }))
              .filter((p) => p.id && p.nombre && !elegidos.has(p.id))
              .slice(0, 6),
          ),
        )
        .catch(() => setPersonas([]));
    }, 250);
    return () => clearTimeout(t);
  }, [texto, donde, elegidos]);

  const agregar = (clase: 'roles' | 'personas' | 'papeles' | 'puestos', id: string, nombre: string) => {
    onCambio({
      [clase]: [...((escalon[clase] ?? []) as string[]), id],
      nombres: { ...escalon.nombres, [id]: nombre },
    } as Partial<EscalonEnEdicion>);
    setTexto('');
    setAbierto(false);
  };

  const quitar = (id: string) =>
    onCambio({
      roles: escalon.roles.filter((x) => x !== id),
      personas: escalon.personas.filter((x) => x !== id),
      papeles: escalon.papeles.filter((x) => x !== id),
      puestos: (escalon.puestos ?? []).filter((x) => x !== id),
    });

  const q = texto.trim().toLowerCase();
  const chips = [
    ...(escalon.puestos ?? []).map((id) => ({ id, clase: 'Puesto' })),
    ...escalon.roles.map((id) => ({ id, clase: 'Rol' })),
    ...escalon.personas.map((id) => ({ id, clase: 'Persona' })),
    ...escalon.papeles.map((id) => ({ id, clase: 'Papel' })),
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-slate-800"
          >
            {escalon.nombres[c.id] ?? c.id}
            <span className="text-[10px] text-slate-400">{c.clase}</span>
            <button
              type="button"
              onClick={() => quitar(c.id)}
              aria-label={`Quitar ${escalon.nombres[c.id] ?? c.id}`}
              className="text-slate-400 hover:text-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {!abierto ? (
          <button type="button" className={boton} onClick={abrir}>
            <Plus className="w-3.5 h-3.5" />
            {chips.length ? 'Agregar' : 'Quién decide este escalón'}
          </button>
        ) : null}
      </div>

      {abierto ? (
        <div className="rounded-lg border border-gray-200 bg-white p-2 space-y-2">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
            {(
              [
                ['puestos', 'Puesto'],
                ['roles', 'Roles'],
                ['personas', 'Personas'],
                ['papeles', 'Papel en el proceso'],
              ] as const
            ).map(([id, etiqueta]) => (
              <button
                key={id}
                type="button"
                onClick={() => setDonde(id)}
                aria-pressed={donde === id}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  donde === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-gray-700'
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>

          {donde === 'roles' || donde === 'personas' ? (
            <label className="relative block">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                autoFocus
                type="search"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={donde === 'roles' ? 'Buscar un rol' : 'Buscar una persona por su nombre'}
                aria-label={donde === 'roles' ? 'Buscar un rol' : 'Buscar una persona'}
                className={`${campo} pl-8`}
              />
            </label>
          ) : null}

          {donde === 'puestos'
            ? puestos.filter((x) => !elegidos.has(x.id)).length
              ? puestos
                  .filter((x) => !elegidos.has(x.id))
                  .map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => agregar('puestos', x.id, x.nombre)}
                      className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-700 hover:bg-slate-50"
                    >
                      {x.nombre}
                      <span className="block text-[10px] text-slate-400">Lo decide quien lo ocupe en cada proceso</span>
                    </button>
                  ))
              : (
                  <p className="text-xs text-slate-400 m-0 px-1 py-2">
                    No hay más puestos: créalos en Puestos del proceso, en la pestaña Flujo.
                  </p>
                )
            : donde === 'roles'
            ? roles
                .filter((r) => !elegidos.has(r.code))
                .filter((r) => !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
                .slice(0, 6)
                .map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => agregar('roles', r.code, r.name)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-700 hover:bg-slate-50"
                  >
                    {r.name}
                  </button>
                ))
            : donde === 'personas'
              ? personas.length
                ? personas.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => agregar('personas', p.id, p.nombre)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50"
                    >
                      <span className="block text-xs text-slate-700">{p.nombre}</span>
                      {p.cargo ? <span className="block text-[10px] text-slate-400">{p.cargo}</span> : null}
                    </button>
                  ))
                : (
                    <p className="text-xs text-slate-400 m-0 px-1 py-2">
                      {texto.trim().length < 2 ? 'Escribe al menos dos letras del nombre.' : `Ninguna persona coincide con «${texto}».`}
                    </p>
                  )
              : papeles
                  .filter((p) => !elegidos.has(p.codigo))
                  .map((p) => (
                    <button
                      key={p.codigo}
                      type="button"
                      onClick={() => agregar('papeles', p.codigo, p.nombre)}
                      className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-700 hover:bg-slate-50"
                    >
                      {p.nombre}
                    </button>
                  ))}

          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              setTexto('');
            }}
            className="text-xs font-bold text-slate-500 hover:text-gray-700 px-2 pt-1"
          >
            Cancelar
          </button>
        </div>
      ) : null}
    </div>
  );
}
