import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  History,
  ListChecks,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  ActividadCronograma,
  Adenda,
  CambioCronograma,
  CanalCronograma,
  CronogramaPorEtapas as Cronograma,
  DestinoCronograma,
  PredeterminadoDelProceso,
} from '../../types';
import { Boton, campo } from '../shared/PiezasPanel';
import { Permitido } from '../shared/Permitido';
import { fechaLarga, momento } from '../shared/fechas';
import { ETAPAS_DEL_CRONOGRAMA, NOMBRE_ETAPA } from './etapas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const DESTINOS: { valor: DestinoCronograma; nombre: string }[] = [
  { valor: 'QUIEN_LA_HACE', nombre: 'Quien la hace' },
  { valor: 'ABOGADO_ESTRUCTURADOR', nombre: 'Abogado estructurador' },
  { valor: 'ABOGADO_REVISOR', nombre: 'Abogado revisor' },
  { valor: 'GESTOR_DE_ARCHIVO', nombre: 'Gestor de archivo' },
];

/** En una propia no hay actividad del flujo: «quien la hace» es quien lleva el cronograma. */
const nombreDestino = (d: DestinoCronograma, propia: boolean) =>
  propia && d === 'QUIEN_LA_HACE'
    ? 'Quien lleva el cronograma (5.2)'
    : (DESTINOS.find((x) => x.valor === d)?.nombre ?? d);

const CANALES: { valor: CanalCronograma; nombre: string }[] = [
  { valor: 'CAMPANA', nombre: 'Campanita' },
  { valor: 'CORREO', nombre: 'Correo' },
  { valor: 'AMBOS', nombre: 'Campanita y correo' },
];

const TONO = {
  VENCIDO: 'border-red-200 bg-red-50 text-red-900',
  POR_VENCER: 'border-amber-200 bg-amber-50 text-amber-900',
  VIGENTE: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  CUMPLIDA: 'border-gray-200 bg-slate-50 text-slate-500',
  SIN_FECHA: 'border-gray-200 bg-white text-slate-500',
} as const;

interface Fila {
  /** Las del flujo por su numeral; las propias por su id, o sin él si son nuevas. */
  numeral: string | null;
  id: string | null;
  propia: boolean;
  nombre: string;
  etapa: number;
  fechaInicio: string;
  fechaFin: string;
  diasAntes: string;
  avisarA: DestinoCronograma[];
  canal: CanalCronograma;
  correos: string;
  nota: string | null;
}

const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim());
const listaDeCorreos = (texto: string) =>
  texto
    .split(/[,;\s]+/)
    .map((c) => c.trim())
    .filter(Boolean);

/** La clave de una actividad en el borrador: su numeral, o el id si es propia. */
const claveDe = (a: Pick<ActividadCronograma, 'numeral' | 'id'>) => a.numeral ?? a.id ?? '';

/** Cómo se nombra en pantalla y en los mensajes. */
const titulo = (a: { numeral: string | null; nombre: string }) =>
  a.numeral ? `${a.numeral} · ${a.nombre}` : a.nombre || 'Actividad propia sin nombre';

function comoVa(a: ActividadCronograma): string {
  if (a.estado === 'CUMPLIDA') return 'Cumplida';
  if (a.estado === 'SIN_FECHA' || a.diasRestantes === null) return 'Sin programar';
  if (a.diasRestantes < 0) {
    const n = Math.abs(a.diasRestantes);
    return `Vencida hace ${n} ${n === 1 ? 'día' : 'días'}`;
  }
  if (a.diasRestantes === 0) return 'Vence hoy';
  return `Faltan ${a.diasRestantes} ${a.diasRestantes === 1 ? 'día' : 'días'}`;
}

const filaDe = (a: ActividadCronograma): Fila => ({
  numeral: a.numeral,
  id: a.id,
  propia: a.propia,
  nombre: a.nombre,
  etapa: a.etapa,
  fechaInicio: a.fechaInicio ?? '',
  fechaFin: a.fechaFin ?? '',
  diasAntes: a.diasAntes === null ? '' : String(a.diasAntes),
  avisarA: a.avisarA.length ? a.avisarA : ['QUIEN_LA_HACE'],
  canal: a.canal,
  correos: a.correos.join(', '),
  nota: a.nota,
});

const propiaNueva = (nombre: string, etapa: number): Fila => ({
  numeral: null,
  id: null,
  propia: true,
  nombre,
  etapa,
  fechaInicio: '',
  fechaFin: '',
  diasAntes: '',
  avisarA: ['QUIEN_LA_HACE'],
  canal: 'CAMPANA',
  correos: '',
  nota: null,
});

/** Un encabezado de etapa que abre y cierra lo que tiene debajo. */
function EncabezadoEtapa({
  etapa,
  abierta,
  resumen,
  onAlternar,
}: {
  etapa: number;
  abierta: boolean;
  resumen: string;
  onAlternar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-expanded={abierta}
      className="w-full flex items-center gap-1.5 text-left px-3 py-2"
    >
      {abierta ? (
        <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
      ) : (
        <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
      )}
      <span className="text-xs font-bold text-slate-700">
        Etapa {etapa} · {NOMBRE_ETAPA[etapa]}
      </span>
      <span className="ml-auto text-[11px] text-slate-500 flex-shrink-0">{resumen}</span>
    </button>
  );
}

/**
 * Cronograma por actividad — actividad 5.2 (138, sesión de QA del 04/11, EFDS-1152).
 *
 * El de etapas se quedaba corto: dentro de una etapa hay actividades con plazo
 * propio —observaciones, subsanaciones, cierre de ofertas— que necesitan su
 * alerta. Cada actividad que se programa dice cuántos días antes se avisa, a
 * quién y por dónde, y avisa también cuando vence sin cumplirse.
 *
 * Además de las del flujo, el proceso puede tener actividades propias (139):
 * las que el flujo no trae. Llevan nombre y etapa, y como no hay actividad que
 * aprobar se marcan cumplidas a mano.
 *
 * Desde la 144 no se muestran todas las actividades de las etapas 5 a 10: de
 * entrada salen las que la modalidad tiene por defecto (Configuración →
 * Cronograma) y las que ya están programadas, agrupadas por etapa en
 * desplegables; el resto se agrega desde el selector. El predeterminado no
 * trae fechas: se ponen aquí.
 *
 * Sigue sin ser obligatorio: lo que no tiene fecha de fin no alerta. Los
 * cambios de fechas quedan en el historial. Una adenda de cronograma puede
 * traer las fechas que mueve (5.13) y se aplican al publicarla; la que
 * prorroga el cierre mueve la 6.1 sola.
 */
export function CronogramaPorActividad({ procesoId, onCambio }: Props) {
  const [cronograma, setCronograma] = useState<Cronograma | null>(null);
  const [predeterminado, setPredeterminado] = useState<PredeterminadoDelProceso | null>(null);
  const [adendas, setAdendas] = useState<Adenda[]>([]);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [borrador, setBorrador] = useState<Record<string, Fila>>({});
  /** Lo que se ve en el formulario, en orden: lo de entrada y lo que se agregue. */
  const [orden, setOrden] = useState<string[]>([]);
  const [nuevas, setNuevas] = useState(0);
  const [adendaId, setAdendaId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [verHistorial, setVerHistorial] = useState(false);
  /** Las etapas desplegadas, en la vista y en el formulario. */
  const [abiertas, setAbiertas] = useState<Set<number> | null>(null);

  useEffect(() => {
    contratacionService.cronograma(procesoId).then(setCronograma).catch(() => setCronograma(null));
    contratacionService
      .predeterminadoDelProceso(procesoId)
      .then(setPredeterminado)
      .catch(() => setPredeterminado(null));
    contratacionService
      .adendas(procesoId)
      .then((e) => setAdendas((e.adendas ?? []).filter((a) => a.tipo === 'CRONOGRAMA' && a.estado === 'PUBLICADA')))
      .catch(() => setAdendas([]));
  }, [procesoId]);

  const actividades = cronograma?.actividades ?? [];
  const historial: CambioCronograma[] = cronograma?.historial ?? [];
  const programadas = useMemo(() => actividades.filter((a) => a.fechaFin), [actividades]);

  if (!cronograma || !cronograma.actividades) return null;

  /** De entrada se abren las etapas con algo vencido o por vencer. */
  const abiertasEnLaVista =
    abiertas ??
    new Set(programadas.filter((a) => a.estado === 'VENCIDO' || a.estado === 'POR_VENCER').map((a) => a.etapa));
  const alternar = (etapa: number) => {
    const s = new Set(abiertasEnLaVista);
    if (s.has(etapa)) s.delete(etapa);
    else s.add(etapa);
    setAbiertas(s);
  };

  /**
   * Arma el formulario con lo programado, las propias del proceso y lo que la
   * modalidad tiene por defecto. Las propias por defecto que el proceso no
   * tiene entran como nuevas, sin fecha: si no se les pone, no se guardan.
   */
  const empezar = () => {
    const numeralesPorDefecto = new Set(predeterminado?.numerales ?? []);
    const deEntrada = actividades.filter((a) => a.fechaFin || a.propia || (a.numeral && numeralesPorDefecto.has(a.numeral)));
    const siguiente: Record<string, Fila> = Object.fromEntries(actividades.map((a) => [claveDe(a), filaDe(a)]));
    const claves = deEntrada.map(claveDe);

    let n = nuevas;
    for (const p of predeterminado?.propias ?? []) {
      const yaEsta = actividades.some(
        (a) => a.propia && a.etapa === p.etapa && a.nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase(),
      );
      if (yaEsta) continue;
      n += 1;
      const clave = `nueva-${n}`;
      siguiente[clave] = propiaNueva(p.nombre, p.etapa);
      claves.push(clave);
    }

    setNuevas(n);
    setBorrador(siguiente);
    setOrden(claves);
    setAdendaId('');
    setMotivo('');
    // En el formulario se abre de entrada la primera etapa que tenga algo.
    const primera = ETAPAS_DEL_CRONOGRAMA.find((e) => claves.some((c) => siguiente[c]?.etapa === e));
    setAbiertas(new Set(primera ? [primera] : []));
    setEditando(true);
  };

  const cancelar = () => {
    setEditando(false);
    setAbiertas(null);
  };

  const cambiar = (clave: string, cambio: Partial<Fila>) =>
    setBorrador((b) => ({ ...b, [clave]: { ...b[clave], ...cambio } }));

  const abrir = (etapa: number) => setAbiertas((s) => new Set([...(s ?? []), etapa]));

  /** Trae al formulario una actividad del flujo que no salió de entrada. */
  const agregarDelFlujo = (numeral: string) => {
    const fila = borrador[numeral];
    if (!fila) return;
    setOrden((o) => [...o, numeral]);
    abrir(fila.etapa);
  };

  const agregarPropia = (etapa: number) => {
    const clave = `nueva-${nuevas + 1}`;
    setNuevas((n) => n + 1);
    setBorrador((b) => ({ ...b, [clave]: propiaNueva('', etapa) }));
    setOrden((o) => [...o, clave]);
    abrir(etapa);
  };

  /** Sacarla del formulario la quita del cronograma al guardar: deja de alertar. */
  const quitar = (clave: string) => {
    const f = borrador[clave];
    setOrden((o) => o.filter((c) => c !== clave));
    if (f?.propia) {
      setBorrador((b) => {
        const { [clave]: _, ...resto } = b;
        return resto;
      });
    } else if (f) {
      // La del flujo vuelve al selector limpia, por si se agrega otra vez.
      const original = actividades.find((a) => a.numeral === f.numeral);
      if (original) setBorrador((b) => ({ ...b, [clave]: { ...filaDe(original), fechaInicio: '', fechaFin: '' } }));
    }
  };

  /** Las propias nuevas sin fecha de fin no se guardan: son sugerencias del predeterminado. */
  const seGuarda = (clave: string) => {
    const f = borrador[clave];
    return !!f && !(f.propia && !f.id && !f.fechaFin);
  };

  const problema = orden
    .map((clave) => {
      const f = borrador[clave];
      if (!f) return null;
      const n = f.numeral ?? `«${f.nombre.trim() || 'actividad propia'}»`;
      if (f.propia && !f.nombre.trim()) return 'Ponle nombre a la actividad propia';
      if (f.propia && f.id && !f.fechaFin) return `${n}: una actividad propia necesita fecha de fin; si ya no va, quítala`;
      if (f.fechaInicio && !f.fechaFin) return `${n}: falta la fecha de fin`;
      if (f.fechaInicio && f.fechaFin && f.fechaInicio > f.fechaFin) return `${n}: el inicio va después del fin`;
      if (f.diasAntes && !(Number.isInteger(Number(f.diasAntes)) && Number(f.diasAntes) >= 0 && Number(f.diasAntes) <= 90)) {
        return `${n}: los días de aviso van de 0 a 90`;
      }
      const correos = listaDeCorreos(f.correos);
      const malo = correos.find((c) => !correoValido(c));
      if (malo) return `${n}: el correo ${malo} no es válido`;
      if (f.fechaFin && !f.avisarA.length && !correos.length) return `${n}: di a quién se le avisa`;
      return null;
    })
    .find(Boolean);

  const guardar = async () => {
    if (problema) return;
    setGuardando(true);
    try {
      setCronograma(
        await contratacionService.guardarCronogramaActividades(
          procesoId,
          orden
            .filter(seGuarda)
            .map((clave) => borrador[clave])
            .map((f) => ({
              ...(f.propia
                ? { id: f.id, nombre: f.nombre.trim(), etapa: f.etapa }
                : { numeral: f.numeral }),
              fechaInicio: f.fechaInicio || null,
              fechaFin: f.fechaFin || null,
              diasAntes: f.diasAntes ? Number(f.diasAntes) : null,
              avisarA: f.avisarA,
              canal: f.canal,
              correos: listaDeCorreos(f.correos),
              nota: f.nota,
            })),
          { adendaId: adendaId || undefined, motivo },
        ),
      );
      setEditando(false);
      setAbiertas(null);
      toast.success('Cronograma por actividad guardado');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const marcarCumplida = async (a: ActividadCronograma, cumplida: boolean) => {
    if (!a.id) return;
    setGuardando(true);
    try {
      setCronograma(await contratacionService.marcarCumplidaCronograma(procesoId, a.id, cumplida));
      toast.success(cumplida ? `«${a.nombre}» quedó cumplida` : `«${a.nombre}» se vuelve a vigilar`);
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ------------------------------------------------------------- vistas --

  const vista = () => {
    if (programadas.length === 0) {
      return <p className="text-xs text-slate-500 m-0">Ninguna actividad tiene fechas todavía.</p>;
    }
    const etapas = ETAPAS_DEL_CRONOGRAMA.filter((e) => programadas.some((a) => a.etapa === e));
    return (
      <ul className="space-y-1.5 m-0 p-0 list-none">
        {etapas.map((etapa) => {
          const deLaEtapa = programadas.filter((a) => a.etapa === etapa);
          const vencidas = deLaEtapa.filter((a) => a.estado === 'VENCIDO').length;
          const porVencer = deLaEtapa.filter((a) => a.estado === 'POR_VENCER').length;
          const resumen = [
            `${deLaEtapa.length} ${deLaEtapa.length === 1 ? 'actividad' : 'actividades'}`,
            vencidas ? `${vencidas} ${vencidas === 1 ? 'vencida' : 'vencidas'}` : '',
            porVencer ? `${porVencer} por vencer` : '',
          ]
            .filter(Boolean)
            .join(' · ');
          const abierta = abiertasEnLaVista.has(etapa);
          return (
            <li key={etapa} className="rounded-lg border border-gray-200">
              <EncabezadoEtapa etapa={etapa} abierta={abierta} resumen={resumen} onAlternar={() => alternar(etapa)} />
              {abierta ? (
                <ul className="space-y-1.5 m-0 px-3 pb-2 list-none">
                  {deLaEtapa.map((a) => (
                    <li key={claveDe(a)} className={`rounded-lg border px-3 py-2 ${TONO[a.estado]}`}>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold m-0">
                            {titulo(a)}
                            {a.propia ? (
                              <span className="ml-1.5 rounded border border-current px-1 text-[10px] font-bold uppercase opacity-70">
                                Propia
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs m-0 mt-0.5">
                            {a.fechaInicio ? `${fechaLarga(a.fechaInicio)} – ` : 'Hasta el '}
                            {fechaLarga(a.fechaFin!)} · <span className="font-bold">{comoVa(a)}</span>
                            {a.propia && a.cumplidaAt
                              ? ` · la marcó ${a.cumplidaPor ?? '—'}, ${momento(a.cumplidaAt)}`
                              : ''}
                          </p>
                          <p className="text-[11px] m-0 mt-0.5 opacity-80">
                            <BellRing className="inline w-3 h-3 mr-1" />
                            {a.diasAntes ?? cronograma.anticipacion} días antes ·{' '}
                            {[...a.avisarA.map((d) => nombreDestino(d, a.propia)), ...a.correos].join(', ')} ·{' '}
                            {CANALES.find((c) => c.valor === a.canal)?.nombre}
                          </p>
                        </div>
                        {/* Las del flujo se cumplen solas al aprobarse; las propias, a mano. */}
                        {a.propia ? (
                          <Permitido accion="editar" punto="5.2">
                            <button
                              type="button"
                              disabled={guardando}
                              onClick={() => marcarCumplida(a, !a.cumplidaAt)}
                              className="text-[11px] font-bold hover:underline inline-flex items-center gap-1 flex-shrink-0"
                            >
                              {a.cumplidaAt ? (
                                <>
                                  <RotateCcw className="w-3 h-3" /> Volver a vigilar
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3 h-3" /> Marcar cumplida
                                </>
                              )}
                            </button>
                          </Permitido>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  };

  const filaDelFormulario = (clave: string) => {
    const f = borrador[clave];
    const etiqueta = f.numeral ?? (f.nombre.trim() || 'actividad propia');
    return (
      <div key={clave} className="rounded-lg border border-gray-200 px-3 py-2 space-y-1.5">
        <div className="flex items-center gap-2">
          {f.propia ? (
            <input
              type="text"
              aria-label="Nombre de la actividad propia"
              placeholder="Nombre de la actividad (visita técnica, mesa de trabajo…)"
              value={f.nombre}
              maxLength={200}
              onChange={(e) => cambiar(clave, { nombre: e.target.value })}
              className={`${campo} flex-1`}
            />
          ) : (
            <p className="text-xs font-bold text-slate-800 m-0 flex-1">{titulo(f)}</p>
          )}
          <button
            type="button"
            onClick={() => quitar(clave)}
            aria-label={`Quitar la actividad ${etiqueta}`}
            className={`text-xs font-bold hover:underline inline-flex items-center gap-1 ${
              f.propia ? 'text-red-700' : 'text-slate-500'
            }`}
          >
            {f.propia ? <Trash2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} Quitar
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-500 flex items-center gap-1.5">
            Inicio
            <input
              type="date"
              aria-label={`Inicio de la actividad ${etiqueta}`}
              value={f.fechaInicio}
              onChange={(e) => cambiar(clave, { fechaInicio: e.target.value })}
              className={campo}
              style={{ width: 150 }}
            />
          </label>
          <label className="text-xs text-slate-500 flex items-center gap-1.5">
            Fin
            <input
              type="date"
              aria-label={`Fin de la actividad ${etiqueta}`}
              value={f.fechaFin}
              onChange={(e) => cambiar(clave, { fechaFin: e.target.value })}
              className={campo}
              style={{ width: 150 }}
            />
          </label>
          {f.fechaFin ? (
            <>
              <label className="text-xs text-slate-500 flex items-center gap-1.5">
                Avisar
                <input
                  type="number"
                  min={0}
                  max={90}
                  aria-label={`Días de aviso de la actividad ${etiqueta}`}
                  placeholder={String(cronograma.anticipacion)}
                  value={f.diasAntes}
                  onChange={(e) => cambiar(clave, { diasAntes: e.target.value })}
                  className={campo}
                  style={{ width: 70 }}
                />
                días antes
              </label>
              <select
                aria-label={`Canal del aviso de la actividad ${etiqueta}`}
                value={f.canal}
                onChange={(e) => cambiar(clave, { canal: e.target.value as CanalCronograma })}
                className={campo}
                style={{ width: 170 }}
              >
                {CANALES.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </>
          ) : null}
        </div>
        {f.fechaFin ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-xs text-slate-500">A quién:</span>
            {DESTINOS.map((d) => (
              <label key={d.valor} className="text-xs text-slate-700 flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={f.avisarA.includes(d.valor)}
                  onChange={(e) =>
                    cambiar(clave, {
                      avisarA: e.target.checked ? [...f.avisarA, d.valor] : f.avisarA.filter((x) => x !== d.valor),
                    })
                  }
                />
                {nombreDestino(d.valor, f.propia)}
              </label>
            ))}
            <input
              type="text"
              aria-label={`Otros correos de la actividad ${etiqueta}`}
              placeholder="Otros correos, separados por coma"
              value={f.correos}
              onChange={(e) => cambiar(clave, { correos: e.target.value })}
              className={campo}
              style={{ width: 260 }}
            />
          </div>
        ) : f.propia && !f.id ? (
          <p className="text-[11px] text-slate-500 m-0">Sin fecha de fin no se guarda.</p>
        ) : null}
      </div>
    );
  };

  const formulario = () => {
    const enElFormulario = new Set(orden);
    const delFlujoPorAgregar = actividades.filter((a) => !a.propia && a.numeral && !enElFormulario.has(a.numeral));
    const etapas = ETAPAS_DEL_CRONOGRAMA.filter((e) => orden.some((c) => borrador[c]?.etapa === e));
    const abiertasDelFormulario = abiertas ?? new Set<number>();

    return (
      <div className="space-y-3">
        {etapas.length === 0 ? (
          <p className="text-xs text-slate-500 m-0">
            {predeterminado?.modalidadNombre
              ? `${predeterminado.modalidadNombre} no tiene actividades por defecto en el cronograma. `
              : ''}
            Agrega abajo las actividades que quieras programar.
          </p>
        ) : (
          <ul className="space-y-1.5 m-0 p-0 list-none">
            {etapas.map((etapa) => {
              const claves = orden.filter((c) => borrador[c]?.etapa === etapa);
              const conFecha = claves.filter((c) => borrador[c].fechaFin).length;
              const abierta = abiertasDelFormulario.has(etapa);
              return (
                <li key={etapa} className="rounded-lg border border-gray-200">
                  <EncabezadoEtapa
                    etapa={etapa}
                    abierta={abierta}
                    resumen={`${claves.length} ${claves.length === 1 ? 'actividad' : 'actividades'} · ${conFecha} con fecha`}
                    onAlternar={() => {
                      const s = new Set(abiertasDelFormulario);
                      if (s.has(etapa)) s.delete(etapa);
                      else s.add(etapa);
                      setAbiertas(s);
                    }}
                  />
                  {abierta ? <div className="space-y-1.5 px-3 pb-2">{claves.map(filaDelFormulario)}</div> : null}
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Plus className="w-3.5 h-3.5 text-[#003DA5]" />
          {delFlujoPorAgregar.length ? (
            <select
              aria-label="Agregar una actividad del flujo al cronograma"
              value=""
              onChange={(e) => e.target.value && agregarDelFlujo(e.target.value)}
              className={campo}
              style={{ maxWidth: 340 }}
            >
              <option value="">Agregar una actividad del flujo…</option>
              {ETAPAS_DEL_CRONOGRAMA.filter((e) => delFlujoPorAgregar.some((a) => a.etapa === e)).map((etapa) => (
                <optgroup key={etapa} label={`Etapa ${etapa} · ${NOMBRE_ETAPA[etapa]}`}>
                  {delFlujoPorAgregar
                    .filter((a) => a.etapa === etapa)
                    .map((a) => (
                      <option key={a.numeral!} value={a.numeral!}>
                        {a.numeral} · {a.nombre}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          ) : null}
          <select
            aria-label="Agregar una actividad propia al cronograma"
            value=""
            onChange={(e) => e.target.value && agregarPropia(Number(e.target.value))}
            className={campo}
            style={{ maxWidth: 300 }}
          >
            <option value="">Agregar una actividad propia en la etapa…</option>
            {ETAPAS_DEL_CRONOGRAMA.map((etapa) => (
              <option key={etapa} value={etapa}>
                Etapa {etapa} · {NOMBRE_ETAPA[etapa]}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 space-y-1.5">
          <p className="text-xs font-bold text-slate-700 m-0">Si cambian fechas ya programadas</p>
          <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
            Si el cambio lo hace una adenda de cronograma, lo mejor es indicar las fechas al emitirla
            (5.13): se aplican solas cuando se publica. Si ya se publicó, cítala aquí.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Adenda de cronograma que origina el cambio"
              value={adendaId}
              onChange={(e) => setAdendaId(e.target.value)}
              className={campo}
              style={{ width: 240 }}
            >
              <option value="">Sin adenda</option>
              {adendas.map((a) => (
                <option key={a.id} value={a.id}>
                  Adenda {a.numero} de cronograma
                </option>
              ))}
            </select>
            <input
              type="text"
              aria-label="Motivo del cambio de fechas"
              placeholder="Motivo (queda en el historial)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className={campo}
              style={{ width: 280 }}
            />
          </div>
        </div>

        {problema ? <p className="text-xs text-red-700 m-0">{problema}</p> : null}
        <div className="flex items-center gap-2">
          <Boton icono={<Check className="w-3.5 h-3.5" />} disabled={guardando || !!problema} onClick={guardar}>
            {guardando ? 'Guardando…' : 'Guardar el cronograma por actividad'}
          </Boton>
          <button type="button" onClick={cancelar} className="text-xs font-bold text-slate-500 hover:underline">
            Cancelar
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 space-y-3">
      <div className="flex items-start gap-2.5">
        <ListChecks className="w-4 h-4 mt-0.5 text-[#003DA5] flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 m-0">
            Cronograma por actividad <span className="font-normal text-slate-500">· opcional</span>
          </p>
          <p className="text-xs text-slate-500 m-0 mt-0.5 leading-relaxed">
            Fechas de las actividades con plazo propio y de las que el flujo no trae (actividades
            propias). Cada una dice cuántos días antes se avisa, a quién y por dónde, y avisa también
            cuando vence sin cumplirse. Sin días de aviso rige la anticipación general (
            {cronograma.anticipacion} {cronograma.anticipacion === 1 ? 'día' : 'días'}).
          </p>
        </div>
      </div>

      {editando ? formulario() : vista()}

      {!editando ? (
        <Permitido accion="editar" punto="5.2">
          <Boton icono={<Pencil className="w-3.5 h-3.5" />} onClick={empezar}>
            {programadas.length === 0 ? 'Programar actividades' : 'Editar el cronograma por actividad'}
          </Boton>
        </Permitido>
      ) : null}

      {historial.length ? (
        <div>
          <button
            type="button"
            onClick={() => setVerHistorial((v) => !v)}
            className="text-xs font-bold text-slate-600 hover:underline inline-flex items-center gap-1"
          >
            <History className="w-3.5 h-3.5" />
            {verHistorial ? 'Ocultar el historial de cambios' : `Historial de cambios (${historial.length})`}
          </button>
          {verHistorial ? (
            <ul className="list-none m-0 p-0 mt-1.5 space-y-1">
              {historial.map((h, i) => (
                <li key={i} className="text-[11.5px] text-slate-600">
                  {h.nombre ?? (h.ambito === 'ETAPA' ? `Etapa ${h.clave}` : h.clave)}:{' '}
                  {h.antes.fechaFin ? fechaLarga(h.antes.fechaFin) : 'sin fecha'} →{' '}
                  {h.despues.fechaFin ? fechaLarga(h.despues.fechaFin) : 'sin fecha'}
                  {h.adenda ? ` · adenda ${h.adenda.numero ?? ''}` : ''}
                  {h.motivo ? ` · ${h.motivo}` : ''} · {h.usuario ?? '—'}, {momento(h.fecha)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
