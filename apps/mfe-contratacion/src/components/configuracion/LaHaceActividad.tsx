import React, { useEffect, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { LaHaceConfig, Puesto } from '../../types';
import { campo } from '../shared/PiezasPanel';

/**
 * Donde se asignan los puestos. Un puesto no puede hacerla: en un proceso
 * recién llegado nadie lo ocupa, y nadie podría tomarlo. El servidor también lo
 * rechaza; aquí no se ofrece.
 */
const NUMERAL_QUE_ASIGNA_PUESTOS = '3.3';

interface Props {
  numeral: string;
  /** Una modalidad (111); sin ella, la configuración general. */
  modalidad?: string | null;
  nombreModalidad?: string;
  /** Algo cambió en el borrador: el diagrama relee. */
  onCambio?: () => void;
}

/**
 * Quién hace la actividad (109).
 *
 * Tres formas, y ninguna da permisos: los da Permisos por etapa. Esto solo
 * dice, de los que pueden, quién la hace.
 *
 * - Quien tenga el permiso: lo de siempre, cualquiera con el rol.
 * - Por puesto del proceso: solo quien lo ocupe en cada proceso, asignado en
 *   la 3.3. Es lo que hacía el abogado con la causal y el comité. Si el puesto
 *   todavía no existe, se crea aquí mismo.
 * - Unas personas: siempre ellas, en todos los procesos.
 */
export function LaHaceActividad({ numeral, modalidad = null, nombreModalidad, onCambio }: Props) {
  const [config, setConfig] = useState<LaHaceConfig | null>(null);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [modo, setModo] = useState<'PERMISO' | 'PUESTO' | 'PERSONAS'>('PERMISO');
  const [texto, setTexto] = useState('');
  const [encontradas, setEncontradas] = useState<{ id: string; nombre: string }[]>([]);
  const [nuevoPuesto, setNuevoPuesto] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([contratacionService.laHaceDeActividad(numeral, modalidad), contratacionService.puestos()])
      .then(([c, p]) => {
        setConfig(c);
        setModo(c.tipo);
        setPuestos(p);
        setError(null);
      })
      .catch((e: any) => setError(e.message));
  }, [numeral, modalidad]);

  // Las personas son miles: se buscan en el servidor desde dos letras.
  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) {
      setEncontradas([]);
      return;
    }
    const t = setTimeout(() => {
      contratacionService
        .personas(q)
        .then((lista: any[]) =>
          setEncontradas(
            lista
              .map((p) => ({ id: p.id ?? p.idPerson ?? p.id_person, nombre: p.nombre ?? p.nombreCompleto ?? '' }))
              .filter((p) => p.id && p.nombre && !config?.personas.some((x) => x.id === p.id))
              .slice(0, 6),
          ),
        )
        .catch(() => setEncontradas([]));
    }, 250);
    return () => clearTimeout(t);
  }, [texto, config]);

  const guardar = async (datos: { puestoId?: string; personas?: string[]; usarGeneral?: boolean }, exito: string) => {
    setGuardando(true);
    try {
      const nueva = await contratacionService.guardarLaHaceDeActividad(numeral, { ...datos, modalidad });
      setConfig(nueva);
      setModo(nueva.tipo);
      setTexto('');
      toast.success(exito);
      onCambio?.();
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  /** Crea el puesto y lo deja como el que hace la actividad. */
  const crearYElegir = async () => {
    const nombre = (nuevoPuesto ?? '').trim();
    setGuardando(true);
    let creado: Puesto;
    try {
      creado = await contratacionService.crearPuesto({ nombre });
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo crear el puesto');
      setGuardando(false);
      return;
    }
    setPuestos((antes) => [...antes, creado]);
    setNuevoPuesto(null);
    await guardar({ puestoId: creado.id }, `Se creó el puesto ${creado.nombre} y hace esta actividad`);
  };

  if (error) return <p className="text-xs text-red-600 m-0">{error}</p>;
  if (!config) return <p className="text-xs text-slate-400 m-0">Cargando la configuración…</p>;

  const personas = config.tipo === 'PERSONAS' ? config.personas : [];
  // Si ya la tuviera (guardado antes de esta regla), se enseña para poder cambiarla.
  const ofrecePuesto = numeral !== NUMERAL_QUE_ASIGNA_PUESTOS || config.tipo === 'PUESTO';

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600 m-0 leading-relaxed">
        Quién hace esta actividad en cada proceso. No da permisos: de los que la pueden hacer según Permisos por
        etapa, dice quién la hace.
      </p>
      <AvisoDeVersion
        heredada={config.heredada}
        modalidad={modalidad}
        nombreModalidad={nombreModalidad}
        ocupado={guardando}
        onUsarGeneral={() => guardar({ usarGeneral: true }, 'Vuelve a usar lo general')}
      />

      <div className="space-y-2">
        <Opcion
          marcada={modo === 'PERMISO'}
          disabled={guardando}
          onClick={() => (config.tipo === 'PERMISO' ? setModo('PERMISO') : guardar({}, 'La hace quien tenga el permiso'))}
          titulo="Por rol: quien tenga el permiso"
          ayuda="Cualquiera cuyo rol pueda hacerla en Permisos por etapa."
        />
        {ofrecePuesto && (
          <Opcion
            marcada={modo === 'PUESTO'}
            disabled={guardando}
            onClick={() => setModo('PUESTO')}
            titulo={
              config.tipo === 'PUESTO' && config.puesto
                ? `Por puesto del proceso: «${config.puesto.nombre}»`
                : 'Por puesto del proceso'
            }
            ayuda="La hace quien ocupe el puesto en cada proceso. La persona se asigna al recibirlo (3.3), entre quienes tienen el permiso, y se puede cambiar después desde el equipo del proceso."
          />
        )}
        <Opcion
          marcada={modo === 'PERSONAS'}
          disabled={guardando}
          onClick={() => setModo('PERSONAS')}
          titulo="Una persona fija"
          ayuda="Siempre ella, en todos los procesos. No cambia de un proceso a otro."
        />
      </div>

      {numeral === NUMERAL_QUE_ASIGNA_PUESTOS ? (
        <p className={`text-xs m-0 ${config.tipo === 'PUESTO' ? 'font-bold text-red-700' : 'text-slate-500'}`}>
          La 3.3 es donde se asignan los puestos, así que no puede hacerla un puesto: en un proceso recién llegado nadie
          lo ocupa todavía.{config.tipo === 'PUESTO' ? ' Elige por rol o una persona fija.' : ''}
        </p>
      ) : null}

      {config.tipo === 'PUESTO' && config.puesto && !config.puesto.activo ? (
        <p className="text-xs font-bold text-amber-700 m-0">
          El puesto «{config.puesto.nombre}» ya no existe: elige otro o vuelve a «Quien tenga el permiso».
        </p>
      ) : null}

      {modo === 'PUESTO' && (
        <div className="ml-6 space-y-1.5">
          {puestos.length === 0 && nuevoPuesto === null ? (
            <p className="text-xs text-amber-700 m-0">Todavía no hay puestos: crea el primero.</p>
          ) : null}
          {puestos.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={guardando || (config.tipo === 'PUESTO' && config.puesto?.id === p.id)}
              onClick={() => guardar({ puestoId: p.id }, `La hace quien ocupe el puesto ${p.nombre}`)}
              className="w-full text-left rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              {p.nombre}
              {config.tipo === 'PUESTO' && config.puesto?.id === p.id ? ' · elegido' : ''}
            </button>
          ))}
          {nuevoPuesto === null ? (
            <button
              type="button"
              disabled={guardando}
              onClick={() => setNuevoPuesto('')}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold text-[#003DA5] hover:underline disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear puesto
            </button>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-2 space-y-2">
              <input
                autoFocus
                value={nuevoPuesto}
                onChange={(e) => setNuevoPuesto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nuevoPuesto.trim().length >= 3) void crearYElegir();
                  if (e.key === 'Escape') setNuevoPuesto(null);
                }}
                placeholder="Nombre del puesto, por ejemplo «Segundo abogado»"
                aria-label="Nombre del puesto nuevo"
                className={campo}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={guardando || nuevoPuesto.trim().length < 3}
                  onClick={() => void crearYElegir()}
                  className="px-3 py-1.5 text-xs font-bold rounded-md bg-[#003DA5] text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  Crear y elegir
                </button>
                <button
                  type="button"
                  onClick={() => setNuevoPuesto(null)}
                  className="text-xs font-bold text-slate-500 hover:text-gray-700 px-2"
                >
                  Cancelar
                </button>
              </div>
              <p className="text-[11px] text-slate-500 m-0">
                La descripción y si es obligatorio se ajustan en Puestos del proceso.
              </p>
            </div>
          )}
        </div>
      )}

      {modo === 'PERSONAS' && (
        <div className="ml-6 space-y-2">
          {personas.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <span className="text-xs text-slate-800 flex-1 min-w-0 truncate">{p.nombre}</span>
              <button
                type="button"
                disabled={guardando}
                aria-label={`Quitar ${p.nombre}`}
                onClick={() => {
                  const quedan = personas.filter((x) => x.id !== p.id).map((x) => x.id);
                  guardar(
                    quedan.length ? { personas: quedan } : {},
                    quedan.length ? 'Se quitó la persona' : 'La hace quien tenga el permiso',
                  );
                }}
                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <label className="relative block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar una persona por su nombre"
              aria-label="Buscar una persona"
              className={`${campo} pl-8`}
            />
          </label>
          {encontradas.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={guardando}
              onClick={() =>
                guardar({ personas: [...personas.map((x) => x.id), p.id] }, `${p.nombre} hace esta actividad`)
              }
              className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-700 hover:bg-slate-50"
            >
              {p.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const Opcion = ({
  marcada,
  disabled,
  onClick,
  titulo,
  ayuda,
}: {
  marcada: boolean;
  disabled?: boolean;
  onClick: () => void;
  titulo: string;
  ayuda?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={marcada}
    className={`w-full text-left flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors disabled:opacity-50 ${
      marcada ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
    }`}
  >
    <span
      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
        marcada ? 'border-[#003DA5] bg-[#003DA5]' : 'border-gray-300'
      }`}
    >
      {marcada && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-bold text-slate-800">{titulo}</span>
      {ayuda && <span className="block text-[11px] text-slate-500 mt-0.5">{ayuda}</span>}
    </span>
  </button>
);

/**
 * Lo que se dice arriba de la ficha (111): que se edita el borrador del flujo
 * y, en una modalidad, si se hereda la general o se la reemplaza.
 */
export function AvisoDeVersion({
  heredada,
  modalidad,
  nombreModalidad,
  onUsarGeneral,
  ocupado,
}: {
  heredada?: boolean;
  modalidad?: string | null;
  nombreModalidad?: string;
  onUsarGeneral: () => void;
  ocupado: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500 m-0">
        Los cambios se guardan en el borrador del flujo y rigen cuando se activa en la pestaña Flujo. Los procesos en
        curso siguen con su versión.
      </p>
      {modalidad ? (
        heredada ? (
          <p className="text-xs text-slate-600 m-0">
            {nombreModalidad ?? modalidad} usa lo general. Si lo cambias aquí, cambia solo para esta modalidad.
          </p>
        ) : (
          <p className="text-xs text-indigo-700 m-0">
            {nombreModalidad ?? modalidad} tiene su propia configuración.{' '}
            <button
              type="button"
              disabled={ocupado}
              onClick={onUsarGeneral}
              className="font-bold underline hover:no-underline disabled:opacity-50"
            >
              Volver a lo general
            </button>
          </p>
        )
      ) : null}
    </div>
  );
}
