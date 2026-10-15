import React, { useEffect, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { LaHaceConfig, Puesto } from '../../types';
import { campo } from '../shared/PiezasPanel';

interface Props {
  numeral: string;
}

/**
 * Quién hace la actividad (109).
 *
 * Tres formas, y ninguna da permisos: los da Permisos por etapa. Esto solo
 * dice, de los que pueden, quién la hace.
 *
 * - Quien tenga el permiso: lo de siempre, cualquiera con el rol.
 * - Un puesto del proceso: solo quien lo ocupe en cada proceso, asignado en
 *   la 3.3. Es lo que hacía el abogado con la causal y el comité.
 * - Unas personas: siempre ellas, en todos los procesos.
 */
export function LaHaceActividad({ numeral }: Props) {
  const [config, setConfig] = useState<LaHaceConfig | null>(null);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [modo, setModo] = useState<'PERMISO' | 'PUESTO' | 'PERSONAS'>('PERMISO');
  const [texto, setTexto] = useState('');
  const [encontradas, setEncontradas] = useState<{ id: string; nombre: string }[]>([]);

  useEffect(() => {
    Promise.all([contratacionService.laHaceDeActividad(numeral), contratacionService.puestos()])
      .then(([c, p]) => {
        setConfig(c);
        setModo(c.tipo);
        setPuestos(p);
        setError(null);
      })
      .catch((e: any) => setError(e.message));
  }, [numeral]);

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

  const guardar = async (datos: { puestoId?: string; personas?: string[] }, exito: string) => {
    setGuardando(true);
    try {
      const nueva = await contratacionService.guardarLaHaceDeActividad(numeral, datos);
      setConfig(nueva);
      setModo(nueva.tipo);
      setTexto('');
      toast.success(exito);
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  if (error) return <p className="text-xs text-red-600 m-0">{error}</p>;
  if (!config) return <p className="text-xs text-slate-400 m-0">Cargando la configuración…</p>;

  const personas = config.tipo === 'PERSONAS' ? config.personas : [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600 m-0 leading-relaxed">
        Quién hace esta actividad en cada proceso. No da permisos: de los que la pueden hacer según Permisos por
        etapa, dice quién la hace. Rige de ahora en adelante.
      </p>

      <div className="space-y-2">
        <Opcion
          marcada={modo === 'PERMISO'}
          disabled={guardando}
          onClick={() => (config.tipo === 'PERMISO' ? setModo('PERMISO') : guardar({}, 'La hace quien tenga el permiso'))}
          titulo="Quien tenga el permiso"
          ayuda="Cualquiera cuyo rol pueda editarla en Permisos por etapa."
        />
        <Opcion
          marcada={modo === 'PUESTO'}
          disabled={guardando}
          onClick={() => setModo('PUESTO')}
          titulo={
            config.tipo === 'PUESTO' && config.puesto
              ? `Quien ocupe el puesto «${config.puesto.nombre}»`
              : 'Quien ocupe un puesto del proceso'
          }
          ayuda="Se asigna en la 3.3 de cada proceso, entre quienes tienen el permiso."
        />
        <Opcion
          marcada={modo === 'PERSONAS'}
          disabled={guardando}
          onClick={() => setModo('PERSONAS')}
          titulo="Unas personas concretas"
          ayuda="Siempre ellas, en todos los procesos."
        />
      </div>

      {config.tipo === 'PUESTO' && config.puesto && !config.puesto.activo ? (
        <p className="text-xs font-bold text-amber-700 m-0">
          El puesto «{config.puesto.nombre}» ya no existe: elige otro o vuelve a «Quien tenga el permiso».
        </p>
      ) : null}

      {modo === 'PUESTO' && (
        <div className="ml-6 space-y-1.5">
          {puestos.length === 0 ? (
            <p className="text-xs text-amber-700 m-0">Todavía no hay puestos: créalos en la ficha de la 3.3.</p>
          ) : (
            puestos.map((p) => (
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
            ))
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
