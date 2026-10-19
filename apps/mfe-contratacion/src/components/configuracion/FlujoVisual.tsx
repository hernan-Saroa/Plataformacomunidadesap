import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  FilePlus2,
  Rocket,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DiagramaFlujo, ModoAsignacion, NodoFlujo, ProblemaFlujo, VersionFlujo } from '../../types';
import { useDialogo } from '../shared/useDialogo';
import { AprobacionActividad } from './AprobacionActividad';
import { LaHaceActividad } from './LaHaceActividad';
import { PuestosConfig } from './PuestosConfig';
import { NOMBRE_ETAPA } from './simbolos';

/** Cómo se asigna quien hace la actividad: ícono, nombre y explicación. */
const MODO: Record<ModoAsignacion, { Icono: typeof User; nombre: string; ayuda: string }> = {
  ROL: { Icono: Users, nombre: 'Por rol', ayuda: 'La hace cualquiera cuyo rol tenga el permiso' },
  PERSONA: { Icono: User, nombre: 'Persona fija', ayuda: 'La hace siempre la misma persona' },
  AL_EJECUTAR: {
    Icono: UserPlus,
    nombre: 'Por puesto',
    ayuda: 'La hace quien ocupe el puesto en cada proceso; la persona se asigna al recibirlo (3.3) y se puede cambiar después',
  },
};

/**
 * El flujo de trabajo, de principio a fin (migración 111).
 *
 * Una franja por etapa con sus actividades en orden. Cada una dice quién la
 * hace y cómo se asigna —por rol, una persona fija o por puesto del proceso—,
 * quién la revisa y si le falta algo. Las que asignan gente al proceso van
 * destacadas, porque de ellas sale quién hace las demás.
 *
 * Los puestos del proceso se crean aquí mismo, en su sección plegable, o
 * desde «Quién la hace» de cualquier actividad.
 *
 * No es un dibujo aparte: lee y escribe las mismas versiones del flujo que
 * ejecuta el sistema. Se edita el borrador y se activa de una vez; activar no
 * se deja mientras algo, en alguna modalidad, quede sin quién lo haga o lo
 * apruebe.
 */
export function FlujoVisual() {
  const [versiones, setVersiones] = useState<VersionFlujo[] | null>(null);
  const [diagrama, setDiagrama] = useState<DiagramaFlujo | null>(null);
  const [validacion, setValidacion] = useState<ProblemaFlujo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalidad, setModalidad] = useState<string>('');
  const [cual, setCual] = useState<'BORRADOR' | 'ACTIVA' | undefined>(undefined);
  const [elegido, setElegido] = useState<string | null>(null);
  const [mostrarSaltadas, setMostrarSaltadas] = useState(false);
  const [verProblemas, setVerProblemas] = useState(false);
  const [verPuestos, setVerPuestos] = useState(false);
  /** Lo que el diagnóstico de puestos encuentra: se cuenta en el botón de la sección. */
  const [problemasPuestos, setProblemasPuestos] = useState(0);
  /** Suben con cada cambio, para que la sección de puestos y el panel relean al otro. */
  const [cambios, setCambios] = useState(0);
  const [cambiosPuestos, setCambiosPuestos] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const dialogo = useDialogo();

  const borrador = versiones?.find((v) => v.estado === 'BORRADOR') ?? null;
  const activa = versiones?.find((v) => v.estado === 'ACTIVA') ?? null;

  const leer = useCallback(async () => {
    try {
      const [v, d, p] = await Promise.all([
        contratacionService.versionesFlujo(),
        contratacionService.diagramaFlujo(modalidad || null, cual),
        contratacionService.validacionFlujo(),
      ]);
      setVersiones(v);
      setDiagrama(d);
      setValidacion(p);
      setError(null);
      // Aparte: si el diagnóstico falla, el flujo se sigue viendo.
      contratacionService
        .diagnosticoDePuestos()
        .then((x) => setProblemasPuestos(x.length))
        .catch(() => setProblemasPuestos(0));
    } catch (e: any) {
      setError(e.message);
    }
  }, [modalidad, cual]);

  useEffect(() => {
    void leer();
  }, [leer]);

  const nombreModalidad = diagrama?.modalidades.find((m) => m.codigo === modalidad)?.nombre;
  const errores = validacion.filter((p) => p.gravedad === 'ERROR');
  const nodos = useMemo(() => diagrama?.etapas.flatMap((e) => e.actividades) ?? [], [diagrama]);
  const nodoElegido = nodos.find((n) => n.numeral === elegido) ?? null;
  const viendoBorrador = diagrama?.version.estado === 'BORRADOR';

  const hacer = async (accion: () => Promise<unknown>, exito: string) => {
    setOcupado(true);
    try {
      await accion();
      toast.success(exito);
      setCual(undefined);
      await leer();
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo completar');
      await leer();
      setVerProblemas(true);
    } finally {
      setOcupado(false);
    }
  };

  const activar = async () => {
    if (!borrador) return;
    const nota = await dialogo.pedirMotivo({
      titulo: `Activar la versión ${borrador.numero} del flujo`,
      descripcion:
        'Desde ahora la toman los procesos nuevos. Los que están en curso siguen con su versión hasta que Contratación los pase a esta.',
      etiqueta: 'Qué cambia en esta versión',
      placeholder: 'Por ejemplo: el estudio previo lo revisa el abogado revisor y después la jefe',
      opcional: true,
      confirmar: 'Activar',
    });
    if (nota === null) return;
    await hacer(() => contratacionService.activarFlujo(nota || undefined), `La versión ${borrador.numero} quedó activa`);
  };

  const descartar = async () => {
    if (!borrador) return;
    const ok = await dialogo.confirmar({
      titulo: `Descartar el borrador (versión ${borrador.numero})`,
      descripcion: 'Se pierden los cambios que no se han activado. Lo activo sigue como está.',
      confirmar: 'Descartar',
      tono: 'peligro',
    });
    if (!ok) return;
    await hacer(() => contratacionService.descartarBorradorFlujo(), 'Se descartó el borrador');
  };

  const irA = (p: ProblemaFlujo) => {
    if (p.modalidad && p.modalidad !== modalidad) setModalidad(p.modalidad);
    setElegido(p.numeral);
    setVerProblemas(false);
    setTimeout(() => document.getElementById(`flujo-nodo-${p.numeral}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  };

  if (error && !diagrama) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-red-800 m-0">{error}</p>
      </div>
    );
  }
  if (!diagrama || !versiones) {
    return <p className="text-sm text-slate-400 m-0">Cargando el flujo…</p>;
  }

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------- versión y acciones */}
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-base font-bold text-slate-900">Flujo de trabajo</p>
            <p className="m-0 text-xs text-slate-500">
              Quién hace y quién revisa cada actividad, de principio a fin. Se edita un borrador y se activa de una vez.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {borrador ? (
              <>
                <button
                  type="button"
                  disabled={ocupado || errores.length > 0}
                  onClick={activar}
                  title={errores.length ? 'Primero corrige lo que falta' : undefined}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#003DA5] px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <Rocket className="w-3.5 h-3.5" /> Activar versión {borrador.numero}
                </button>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={descartar}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Descartar borrador
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => hacer(() => contratacionService.crearBorradorFlujo(), 'Se creó el borrador: edita sin afectar lo activo')}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#003DA5] px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <FilePlus2 className="w-3.5 h-3.5" /> Crear borrador para editar
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activa ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
              Activa: versión {activa.numero}
              <span className="font-normal text-emerald-600">· {activa.procesosEnCurso} en curso</span>
            </span>
          ) : null}
          {borrador ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-700">
              Borrador: versión {borrador.numero}
            </span>
          ) : null}
          {borrador ? (
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Qué versión ver">
              {(['BORRADOR', 'ACTIVA'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={(c === 'BORRADOR') === viendoBorrador}
                  onClick={() => setCual(c)}
                  className={`rounded-md px-2.5 py-1 font-bold ${
                    (c === 'BORRADOR') === viendoBorrador ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Ver {c === 'BORRADOR' ? 'borrador' : 'activa'}
                </button>
              ))}
            </div>
          ) : null}
          <label className="ml-auto inline-flex items-center gap-1.5 text-slate-600">
            Modalidad
            <select
              value={modalidad}
              onChange={(e) => {
                setModalidad(e.target.value);
              }}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
            >
              <option value="">Todas (configuración general)</option>
              {diagrama.modalidades.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setMostrarSaltadas((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-slate-600 hover:bg-slate-50"
          >
            {mostrarSaltadas ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {mostrarSaltadas ? 'Ocultar' : 'Mostrar'} lo que se salta
          </button>
        </div>

      <Leyenda />

      {/* ------------------------------------------------- puestos del proceso */}
      {verPuestos ? (
        <section className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-2" aria-label="Puestos del proceso">
          <div className="flex items-start gap-2">
            <p className="m-0 flex-1 text-sm font-bold text-slate-800">Puestos del proceso</p>
            <button
              type="button"
              onClick={() => setVerPuestos(false)}
              aria-label="Cerrar los puestos"
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
            {verProblemas ? (
              <ul className="m-0 mt-2 list-none space-y-1 p-0">
                {errores.map((p, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => irA(p)}
                      className="w-full rounded-md px-2 py-1 text-left text-xs text-red-900 hover:bg-red-100"
                    >
                      <span className="font-bold">
                        {p.numeral} · {p.nombre}
                      </span>{' '}
                      — {p.mensaje}
                      {p.modalidades?.length ? <span className="text-red-700"> ({p.modalidades.join(', ')})</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <PuestosConfig
            key={cambios}
            onCambio={() => {
              setCambiosPuestos((c) => c + 1);
              void leer();
            }}
          />
        </section>
      ) : null}

      {/* ------------------------------------------------- diagrama y panel */}
      <div className={`flujo-visual ${nodoElegido ? 'flujo-visual--con-panel' : ''}`}>
        <div className="space-y-1">
          {diagrama.etapas.map((e, i) => {
            const visibles = e.actividades.filter((a) => mostrarSaltadas || a.aplica);
            const conError = e.actividades.filter((a) => a.aplica && a.estado === 'ERROR').length;
            return (
              <React.Fragment key={e.etapa}>
                {i > 0 ? (
                  <div className="flujo-entre-etapas" aria-hidden>
                    <ArrowDown className="w-4 h-4" />
                  </div>
                ) : null}
                <section className="flujo-franja rounded-xl border border-gray-200 bg-white p-3">
                  <header className="flujo-franja-titulo">
                    <p className="m-0 text-xs font-bold uppercase tracking-wide text-slate-400">Etapa {e.etapa}</p>
                    <p className="m-0 text-sm font-bold text-slate-800">{NOMBRE_ETAPA[e.etapa] ?? ''}</p>
                    {conError ? (
                      <p className="m-0 mt-1 text-xs font-bold text-red-600">
                        {conError === 1 ? '1 con problemas' : `${conError} con problemas`}
                      </p>
                    ) : null}
                  </header>
                  {visibles.length ? (
                    <ol className="flujo-nodos m-0 list-none p-0">
                      {visibles.map((n, j) => (
                        <React.Fragment key={n.numeral}>
                          {j > 0 ? (
                            <li className="flujo-flecha" aria-hidden>
                              <ChevronRight className="w-4 h-4" />
                            </li>
                          ) : null}
                          <li>
                            <Nodo nodo={n} elegido={n.numeral === elegido} onElegir={() => setElegido(n.numeral)} />
                          </li>
                        </React.Fragment>
                      ))}
                    </ol>
                  ) : (
                    <p className="m-0 self-center text-xs text-slate-400">Esta modalidad se salta toda la etapa.</p>
                  )}
                </section>
              </React.Fragment>
            );
          })}
        </div>

        {nodoElegido ? (
          <PanelDeActividad
            key={`${nodoElegido.numeral}|${modalidad}|${cambiosPuestos}`}
            nodo={nodoElegido}
            modalidad={modalidad || null}
            nombreModalidad={nombreModalidad}
            onCerrar={() => setElegido(null)}
            onCambio={() => {
              setCual('BORRADOR');
              setCambios((c) => c + 1);
              void leer();
            }}
          />
        ) : null}
      </div>

      {dialogo.elemento}
    </div>
  );
}

/** Qué significa cada marca del diagrama. */
function Leyenda() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-slate-400">
      {(Object.keys(MODO) as ModoAsignacion[]).map((m) => {
        const { Icono, nombre, ayuda } = MODO[m];
        return (
          <span key={m} className="inline-flex items-center gap-1" title={ayuda}>
            <Icono className="w-3.5 h-3.5 text-slate-600" /> {nombre}
          </span>
        );
      })}
      <span className="inline-flex items-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-600" /> Con revisión
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="flujo-marca-asigna" /> Asigna personas al proceso
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="flujo-marca-propia" /> Propio de la modalidad
      </span>
      <span className="inline-flex items-center gap-1">
        <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Falta configurar
      </span>
    </div>
  );
}

/** Una actividad en el diagrama. */
function Nodo({ nodo, elegido, onElegir }: { nodo: NodoFlujo; elegido: boolean; onElegir: () => void }) {
  const { Icono, nombre } = MODO[nodo.hace.modo];
  const clases = [
    'flujo-nodo',
    !nodo.aplica ? 'flujo-nodo--salta' : !nodo.enLaPlataforma ? 'flujo-nodo--fuera' : `flujo-nodo--${nodo.estado.toLowerCase()}`,
    nodo.asigna ? 'flujo-nodo--asigna' : '',
    elegido ? 'flujo-nodo--elegido' : '',
  ].join(' ');
  const revisores = nodo.aprueba.escalones.length;
  return (
    <button id={`flujo-nodo-${nodo.numeral}`} type="button" onClick={onElegir} aria-pressed={elegido} className={clases}>
      <span className="flex items-center gap-1.5">
        <span className="text-xs font-black tabular-nums text-[#003DA5]">{nodo.numeral}</span>
        {nodo.hace.propia || nodo.aprueba.propia ? <span className="flujo-marca-propia" title="Propio de esta modalidad" /> : null}
        {nodo.estado === 'ERROR' && nodo.aplica && nodo.enLaPlataforma ? (
          <AlertTriangle className="ml-auto w-3.5 h-3.5 text-red-600" aria-label="Falta configurar" />
        ) : nodo.estado === 'AVISO' && nodo.aplica && nodo.enLaPlataforma ? (
          <AlertTriangle className="ml-auto w-3.5 h-3.5 text-amber-500" aria-label="Conviene revisar" />
        ) : null}
      </span>
      <span className="mt-0.5 block text-xs font-bold text-slate-800 line-clamp-2">{nodo.nombre}</span>
      {!nodo.aplica ? (
        <span className="mt-1 block text-xs text-slate-400">Esta modalidad la salta</span>
      ) : !nodo.enLaPlataforma ? (
        <span className="mt-1 block text-xs text-slate-400">Se hace fuera de la plataforma</span>
      ) : (
        <>
          <span className="mt-1.5 flex items-start gap-1 text-xs text-slate-600" title={MODO[nodo.hace.modo].ayuda}>
            <Icono className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span className="min-w-0 line-clamp-2">
              <span className="font-bold">{nombre}</span>
              {nodo.hace.quien ? `: ${nodo.hace.quien}` : ''}
            </span>
          </span>
          <span className="mt-1 flex items-start gap-1 text-xs text-slate-600">
            <ShieldCheck className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${revisores ? 'text-slate-600' : 'text-slate-300'}`} />
            <span className="min-w-0 line-clamp-2">
              {revisores === 0
                ? 'Sin revisión'
                : nodo.aprueba.cadena
                  ? `${nodo.aprueba.cadena} (${revisores} ${revisores === 1 ? 'paso' : 'pasos'})`
                  : nodo.aprueba.escalones[0].quienes.map((q) => q.nombre).join(' o ')}
            </span>
          </span>
          {nodo.asigna ? <span className="mt-1.5 block text-xs font-bold text-indigo-700">{nodo.asigna}</span> : null}
        </>
      )}
    </button>
  );
}

/** El panel para consultar y configurar una actividad sin perder el diagrama. */
function PanelDeActividad({
  nodo,
  modalidad,
  nombreModalidad,
  onCerrar,
  onCambio,
}: {
  nodo: NodoFlujo;
  modalidad: string | null;
  nombreModalidad?: string;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  /** Con una modalidad elegida, si se edita solo ella o lo general. */
  const [alcance, setAlcance] = useState<'MODALIDAD' | 'GENERAL'>('MODALIDAD');
  const editando = modalidad && alcance === 'MODALIDAD' ? modalidad : null;

  // Escape cierra el panel, salvo que haya un diálogo abierto encima.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) onCerrar();
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [onCerrar]);

  return (
    <aside className="flujo-panel rounded-xl border border-gray-200 bg-white p-4 space-y-4" aria-label={`Configurar la ${nodo.numeral}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-xs font-bold uppercase tracking-wide text-slate-400">
            Etapa {nodo.etapa} · {nodo.numeral}
          </p>
          <p className="m-0 text-base font-bold text-slate-900">{nodo.nombre}</p>
          {nodo.asigna ? <p className="m-0 mt-1 text-xs font-bold text-indigo-700">{nodo.asigna}</p> : null}
          {nodo.dependeDe?.length ? (
            <p className="m-0 mt-1 text-xs text-slate-500">Empieza cuando termina la {nodo.dependeDe.join(' y la ')}.</p>
          ) : null}
        </div>
        <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      {nodo.problemas.length ? (
        <ul className="m-0 list-none space-y-1 p-0">
          {nodo.problemas.map((p, i) => (
            <li
              key={i}
              className={`flex items-start gap-1.5 rounded-md px-2 py-1.5 text-xs ${
                p.gravedad === 'ERROR' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {p.mensaje}
            </li>
          ))}
        </ul>
      ) : null}

      {!nodo.enLaPlataforma ? (
        <p className="m-0 text-xs text-slate-500">
          Esta actividad se hace fuera de la plataforma: el flujo la salta y no necesita responsable aquí.
        </p>
      ) : (
        <>
          {modalidad ? (
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs" role="group" aria-label="A qué modalidades aplica">
              {(['MODALIDAD', 'GENERAL'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={alcance === a}
                  onClick={() => setAlcance(a)}
                  className={`rounded-md px-2.5 py-1 font-bold ${alcance === a ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                >
                  {a === 'MODALIDAD' ? `Solo ${nombreModalidad ?? modalidad}` : 'Todas las modalidades'}
                </button>
              ))}
            </div>
          ) : null}

          <section className="space-y-2">
            <p className="m-0 text-sm font-bold text-slate-800">Quién la hace</p>
            <LaHaceActividad
              key={`hace|${editando ?? ''}`}
              numeral={nodo.numeral}
              modalidad={editando}
              nombreModalidad={nombreModalidad}
              onCambio={onCambio}
            />
          </section>
          <section className="space-y-2 border-t border-gray-100 pt-3">
            <p className="m-0 text-sm font-bold text-slate-800">Quién la revisa</p>
            <AprobacionActividad
              key={`aprueba|${editando ?? ''}`}
              numeral={nodo.numeral}
              modalidad={editando}
              nombreModalidad={nombreModalidad}
              onCambio={onCambio}
            />
          </section>
        </>
      )}
    </aside>
  );
}
