import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarRange,
  Check,
  CheckCircle2,
  History,
  ListChecks,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
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
} from '../../types';
import { Boton, campo } from '../shared/PiezasPanel';
import { Permitido } from '../shared/Permitido';
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';

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
 * El cronograma predeterminado de la modalidad (140, Configuración →
 * Cronograma) se carga en el formulario con el día cero que se elija: queda
 * como propuesta, y solo se guarda cuando se guarda el formulario.
 *
 * Sigue sin ser obligatorio: lo que no tiene fecha de fin no alerta. Los
 * cambios de fechas quedan en el historial. Una adenda de cronograma puede
 * traer las fechas que mueve (5.13) y se aplican al publicarla; la que
 * prorroga el cierre mueve la 6.1 sola.
 */
export function CronogramaPorActividad({ procesoId, onCambio }: Props) {
  const [cronograma, setCronograma] = useState<Cronograma | null>(null);
  const [adendas, setAdendas] = useState<Adenda[]>([]);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [borrador, setBorrador] = useState<Record<string, Fila>>({});
  /** El orden del borrador: el del cronograma y, al final de su etapa, las propias nuevas. */
  const [orden, setOrden] = useState<string[]>([]);
  const [nuevas, setNuevas] = useState(0);
  const [adendaId, setAdendaId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [verHistorial, setVerHistorial] = useState(false);
  /** Para cargar el predeterminado de la modalidad (140). */
  const [diaCero, setDiaCero] = useState(hoyEnBogota());
  const [reemplazar, setReemplazar] = useState(false);
  const [cargandoPropuesta, setCargandoPropuesta] = useState(false);
  const [avisoPredeterminado, setAvisoPredeterminado] = useState<string | null>(null);

  useEffect(() => {
    contratacionService.cronograma(procesoId).then(setCronograma).catch(() => setCronograma(null));
    contratacionService
      .adendas(procesoId)
      .then((e) => setAdendas((e.adendas ?? []).filter((a) => a.tipo === 'CRONOGRAMA' && a.estado === 'PUBLICADA')))
      .catch(() => setAdendas([]));
  }, [procesoId]);

  const actividades = cronograma?.actividades ?? [];
  const historial: CambioCronograma[] = cronograma?.historial ?? [];
  const etapas = useMemo(() => [...new Set(actividades.map((a) => a.etapa))].sort((x, y) => x - y), [actividades]);

  if (!cronograma || !cronograma.actividades) return null;

  const empezar = () => {
    setBorrador(
      Object.fromEntries(
        actividades.map((a) => [
          claveDe(a),
          {
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
          },
        ]),
      ),
    );
    setOrden(actividades.map(claveDe));
    setAdendaId('');
    setMotivo('');
    setAvisoPredeterminado(null);
    setEditando(true);
  };

  /**
   * Carga en el formulario las fechas del predeterminado de la modalidad
   * (140). Lo que ya tiene fecha se deja, salvo que se pida reemplazarlo; las
   * propias del predeterminado se suman, o actualizan la que ya se llame igual
   * en la misma etapa. No guarda: eso lo hace el botón de siempre.
   */
  const cargarPredeterminado = async () => {
    if (!diaCero) return;
    setCargandoPropuesta(true);
    try {
      const p = await contratacionService.propuestaCronograma(procesoId, diaCero);
      const modalidad = p.modalidadNombre ?? 'La modalidad del proceso';
      if (!p.actividades.length) {
        setAvisoPredeterminado(
          `${modalidad} no tiene cronograma predeterminado. Se configura en Configuración → Cronograma.`,
        );
        return;
      }

      const siguiente = { ...borrador };
      const nuevoOrden = [...orden];
      let n = nuevas;
      let cargadas = 0;
      let dejadas = 0;
      for (const a of p.actividades) {
        let clave: string | undefined =
          a.numeral ??
          nuevoOrden.find((c) => {
            const f = siguiente[c];
            return f?.propia && f.etapa === a.etapa && f.nombre.trim().toLowerCase() === a.nombre.trim().toLowerCase();
          });
        const actual = clave ? siguiente[clave] : undefined;
        // Del flujo pero fuera del cronograma de este proceso: no aplica aquí.
        if (a.numeral && !actual) continue;
        if (actual?.fechaFin && !reemplazar) {
          dejadas++;
          continue;
        }
        if (!clave) {
          n += 1;
          clave = `nueva-${n}`;
          nuevoOrden.push(clave);
        }
        siguiente[clave] = {
          numeral: actual?.numeral ?? null,
          id: actual?.id ?? null,
          propia: actual?.propia ?? true,
          nombre: actual?.nombre ?? a.nombre,
          etapa: actual?.etapa ?? a.etapa,
          fechaInicio: a.fechaInicio ?? '',
          fechaFin: a.fechaFin,
          diasAntes: a.diasAntes === null ? '' : String(a.diasAntes),
          avisarA: a.avisarA.length ? a.avisarA : ['QUIEN_LA_HACE'],
          canal: a.canal,
          correos: a.correos.join(', '),
          nota: actual?.nota ?? a.nota,
        };
        cargadas++;
      }

      setNuevas(n);
      setBorrador(siguiente);
      setOrden(nuevoOrden);
      if (!motivo.trim()) setMotivo(`Cronograma predeterminado de ${modalidad}`);
      setAvisoPredeterminado(
        `Se ${cargadas === 1 ? 'cargó 1 fecha' : `cargaron ${cargadas} fechas`} del cronograma predeterminado de ${modalidad}, con día cero el ${fechaLarga(diaCero)}` +
          (dejadas ? `; ${dejadas === 1 ? '1 ya tenía fecha y se dejó' : `${dejadas} ya tenían fecha y se dejaron`} como estaba${dejadas === 1 ? '' : 'n'}` : '') +
          '. Revísalas y guarda el cronograma.',
      );
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCargandoPropuesta(false);
    }
  };

  const cambiar = (clave: string, cambio: Partial<Fila>) =>
    setBorrador((b) => ({ ...b, [clave]: { ...b[clave], ...cambio } }));

  const agregarPropia = (etapa: number) => {
    const clave = `nueva-${nuevas + 1}`;
    setNuevas((n) => n + 1);
    setBorrador((b) => ({
      ...b,
      [clave]: {
        numeral: null,
        id: null,
        propia: true,
        nombre: '',
        etapa,
        fechaInicio: '',
        fechaFin: '',
        diasAntes: '',
        avisarA: ['QUIEN_LA_HACE'],
        canal: 'CAMPANA',
        correos: '',
        nota: null,
      },
    }));
    setOrden((o) => [...o, clave]);
  };

  const quitarPropia = (clave: string) => {
    setBorrador((b) => {
      const { [clave]: _, ...resto } = b;
      return resto;
    });
    setOrden((o) => o.filter((c) => c !== clave));
  };

  const problema = orden
    .map((clave) => {
      const f = borrador[clave];
      if (!f) return null;
      const n = f.numeral ?? `«${f.nombre.trim() || 'actividad propia'}»`;
      if (f.propia && !f.nombre.trim()) return 'Ponle nombre a la actividad propia';
      if (f.propia && !f.fechaFin) return `${n}: una actividad propia necesita fecha de fin`;
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
            .map((clave) => borrador[clave])
            .filter(Boolean)
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

  const programadas = actividades.filter((a) => a.fechaFin);

  return (
    <section className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 space-y-3">
      <div className="flex items-start gap-2.5">
        <ListChecks className="w-4 h-4 mt-0.5 text-[#003DA5] flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 m-0">
            Cronograma por actividad <span className="font-normal text-slate-500">· opcional</span>
          </p>
          <p className="text-xs text-slate-500 m-0 mt-0.5 leading-relaxed">
            Fechas de las actividades con plazo propio —observaciones, subsanaciones, cierre de
            ofertas— y de las que el flujo no trae, que se agregan como actividades propias. Cada una
            dice cuántos días antes se avisa, a quién y por dónde, y avisa también cuando vence sin
            cumplirse. Sin días de aviso rige la anticipación general ({cronograma.anticipacion}{' '}
            {cronograma.anticipacion === 1 ? 'día' : 'días'}).
          </p>
        </div>
      </div>

      {!editando ? (
        programadas.length === 0 ? (
          <p className="text-xs text-slate-500 m-0">Ninguna actividad tiene fechas todavía.</p>
        ) : (
          <ul className="space-y-1.5 m-0 p-0 list-none">
            {programadas.map((a) => (
              <li key={claveDe(a)} className={`rounded-lg border px-3 py-2 ${TONO[a.estado]}`}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold m-0">
                      {titulo(a)}
                      {a.propia ? (
                        <span className="ml-1.5 rounded border border-current px-1 text-[10px] font-bold uppercase opacity-70">
                          Propia · etapa {a.etapa}
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
        )
      ) : (
        <div className="space-y-3">
          {/* El predeterminado de la modalidad (140): propuesta que se revisa aquí. */}
          <div className="rounded-lg border border-[#003DA5]/20 bg-slate-50 px-3 py-2 space-y-1.5">
            <p className="text-xs font-bold text-slate-700 m-0 inline-flex items-center gap-1.5">
              <CalendarRange className="w-3.5 h-3.5 text-[#003DA5]" />
              Cronograma predeterminado de la modalidad
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-slate-500 flex items-center gap-1.5">
                Día cero
                <input
                  type="date"
                  aria-label="Día cero del cronograma predeterminado"
                  value={diaCero}
                  onChange={(e) => setDiaCero(e.target.value)}
                  className={campo}
                  style={{ width: 150 }}
                />
              </label>
              <label className="text-xs text-slate-600 flex items-center gap-1">
                <input type="checkbox" checked={reemplazar} onChange={(e) => setReemplazar(e.target.checked)} />
                Reemplazar también las que ya tienen fecha
              </label>
              <button
                type="button"
                disabled={cargandoPropuesta || !diaCero}
                onClick={cargarPredeterminado}
                className="text-xs font-bold text-[#003DA5] hover:underline"
              >
                {cargandoPropuesta ? 'Cargando…' : 'Cargar las fechas'}
              </button>
            </div>
            {avisoPredeterminado ? (
              <p className="text-xs text-slate-600 m-0 leading-relaxed">{avisoPredeterminado}</p>
            ) : null}
          </div>

          {etapas.map((etapa) => (
            <div key={etapa} className="space-y-1.5">
              <p className="text-[10.5px] font-black uppercase tracking-wide text-slate-500 m-0">Etapa {etapa}</p>
              {orden
                .filter((clave) => borrador[clave]?.etapa === etapa)
                .map((clave) => {
                  const f = borrador[clave];
                  const etiqueta = f.numeral ?? (f.nombre.trim() || 'actividad propia');
                  return (
                    <div key={clave} className="rounded-lg border border-gray-200 px-3 py-2 space-y-1.5">
                      {f.propia ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            aria-label="Nombre de la actividad propia"
                            placeholder="Nombre de la actividad (visita técnica, mesa de trabajo…)"
                            value={f.nombre}
                            maxLength={200}
                            onChange={(e) => cambiar(clave, { nombre: e.target.value })}
                            className={`${campo} flex-1`}
                          />
                          <button
                            type="button"
                            onClick={() => quitarPropia(clave)}
                            aria-label={`Quitar la actividad ${etiqueta}`}
                            className="text-xs font-bold text-red-700 hover:underline inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Quitar
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-800 m-0">{titulo(f)}</p>
                      )}
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
                                    avisarA: e.target.checked
                                      ? [...f.avisarA, d.valor]
                                      : f.avisarA.filter((x) => x !== d.valor),
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
                      ) : null}
                    </div>
                  );
                })}
              <button
                type="button"
                onClick={() => agregarPropia(etapa)}
                className="text-xs font-bold text-[#003DA5] hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar una actividad propia a la etapa {etapa}
              </button>
            </div>
          ))}

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
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="text-xs font-bold text-slate-500 hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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
