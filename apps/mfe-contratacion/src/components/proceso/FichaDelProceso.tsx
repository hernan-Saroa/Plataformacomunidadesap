import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  CheckCircle2,
  Circle,
  CircleDot,
  Landmark,
  Lock,
  Scale,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { EstadoParticipacion, EstadoSupervision, PlazoDeActividad } from '../../types';
import { ETAPAS } from './Etapas';
import { ActividadEtapa } from './ListaActividades';
import { EntradaSituacion, responsableDelPaso, Situacion } from './situacionDelProceso';
import { ChipPlazo } from './ChipPlazo';
import { Modal } from '../shared/Modal';
import { SoloLectura, AvisoSoloLectura } from '../shared/SoloLectura';
import { momento as fechaDelMomento } from '../shared/fechas';
import { PanelRadicacion } from '../participacion/PanelRadicacion';
import { PanelSupervision } from '../supervision/PanelSupervision';

interface Props {
  procesoId: string;
  /** Las actividades del proceso como las pinta el riel: estado, bloqueo, etapa. */
  actividades: ActividadEtapa[];
  entrada: EntradaSituacion;
  situacion: Situacion;
  etapaActual: number;
  participacion: EstadoParticipacion | null;
  plazos: PlazoDeActividad[];
  /** Lleva a trabajar esa actividad. */
  onAbrir: (numeral: string) => void;
  /** Algo cambió en el equipo: el contenedor relee. */
  onCambio: () => void;
  /** Por qué una actividad todavía no se puede trabajar, o `null`. */
  motivoDe: (numeral: string) => string | null;
}

type Equipo = 'radicacion' | 'supervision' | null;

/**
 * La ficha del proceso: cómo va, quién hizo qué y quién sigue.
 *
 * Es la entrada al proceso para quien lo sigue (reestructuración del flujo).
 * El riel sirve para trabajar una actividad; para saber si el proceso avanza
 * había que recorrerlo numeral por numeral. Aquí el recorrido se lee de un
 * vistazo —etapas hechas, la actual abierta, cada actividad con su responsable
 * y su fecha— y el equipo del proceso está a la vista, con las asignaciones al
 * alcance de quien puede hacerlas.
 */
export function FichaDelProceso({
  procesoId,
  actividades,
  entrada,
  situacion,
  etapaActual,
  participacion,
  plazos,
  onAbrir,
  onCambio,
  motivoDe,
}: Props) {
  const [abiertas, setAbiertas] = useState<Set<number>>(() => new Set([etapaActual]));
  const [equipo, setEquipo] = useState<Equipo>(null);
  const [supervision, setSupervision] = useState<EstadoSupervision | null>(null);

  // El supervisor existe desde el contrato: antes no hay a quién preguntar.
  useEffect(() => {
    if (etapaActual < 8) return;
    let vigente = true;
    Promise.resolve()
      .then(() => contratacionService.supervision(procesoId))
      .then((s) => vigente && setSupervision(s))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [procesoId, etapaActual, equipo]);

  const porEtapa = useMemo(() => {
    const mapa = new Map<number, ActividadEtapa[]>();
    for (const a of actividades) {
      const n = a.etapa ?? 3;
      mapa.set(n, [...(mapa.get(n) ?? []), a]);
    }
    return ETAPAS.filter((e) => mapa.has(e.numero)).map((e) => {
      const lista = mapa.get(e.numero)!;
      const aplicables = lista.filter((a) => a.estado !== 'no_aplica');
      return {
        etapa: e,
        actividades: aplicables,
        noAplican: lista.length - aplicables.length,
        hechas: aplicables.filter((a) => a.estado === 'aprobada').length,
      };
    });
  }, [actividades]);

  const pasoDe = (numeral: string) => entrada.pasos.find((p) => p.numeral === numeral);

  /** Lo que se dice a la derecha de cada actividad. */
  const lineaDe = (a: ActividadEtapa): { texto: string; tono: string } => {
    const paso = pasoDe(a.numeral);
    if (a.estado === 'aprobada') {
      return {
        texto: paso?.actualizadoEn ? `Hecha · ${fechaDelMomento(paso.actualizadoEn)}` : 'Hecha',
        tono: 'text-emerald-700',
      };
    }
    if (situacion.numeral === a.numeral) {
      return {
        texto: situacion.teToca ? 'Te toca' : situacion.quien ? `Le toca a ${situacion.quien}` : 'En curso',
        tono: situacion.teToca ? 'text-[#003DA5] font-bold' : 'text-slate-700 font-bold',
      };
    }
    if (a.detalle && !a.disponible) return { texto: a.detalle, tono: 'text-slate-400' };
    const quien = paso ? responsableDelPaso(entrada, paso).quien : null;
    return { texto: quien ?? '', tono: 'text-slate-500' };
  };

  const alternar = (n: number) =>
    setAbiertas((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(n)) siguiente.delete(n);
      else siguiente.add(n);
      return siguiente;
    });

  const cerrarEquipo = () => {
    setEquipo(null);
    onCambio();
  };

  const puedeGestionarReparto = !!participacion && (participacion.puedeTomar || participacion.puedeRepartir);

  return (
    <div className="ficha-proceso">
      {/* El recorrido. */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden" aria-label="Recorrido">
        <h3 className="m-0 px-4 py-3 border-b border-gray-100 text-sm font-bold text-slate-900">
          Recorrido del proceso
        </h3>
        <ol className="m-0 p-0 list-none">
          {porEtapa.map(({ etapa, actividades: lista, noAplican, hechas }) => {
            const completa = lista.length > 0 && hechas === lista.length;
            const actual = etapa.numero === etapaActual;
            const abierta = abiertas.has(etapa.numero);
            return (
              <li key={etapa.numero} className="border-b border-gray-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => alternar(etapa.numero)}
                  aria-expanded={abierta}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 ${
                    actual ? 'bg-blue-50' : ''
                  }`}
                >
                  {completa ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" aria-hidden="true" />
                  ) : actual ? (
                    <CircleDot className="w-5 h-5 text-[#003DA5] flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] font-bold ${actual ? 'text-[#003DA5]' : 'text-slate-800'}`}>
                      Etapa {etapa.numero} · {etapa.nombre}
                    </span>
                    <span className="block text-[12px] text-slate-500">
                      {lista.length ? `${hechas} de ${lista.length} hechas` : 'Nada aplica a esta modalidad'}
                      {actual ? ' · aquí va el proceso' : ''}
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${abierta ? '' : '-rotate-90'}`}
                    aria-hidden="true"
                  />
                </button>

                {abierta && lista.length ? (
                  <ul className="m-0 px-4 pb-3 list-none space-y-0.5">
                    {lista.map((a) => {
                      const linea = lineaDe(a);
                      const plazo = plazos.find((p) => p.numeral === a.numeral);
                      return (
                        <li key={a.numeral}>
                          <button
                            type="button"
                            onClick={() => onAbrir(a.numeral)}
                            className="w-full text-left rounded-lg px-2 py-2 flex items-start gap-2.5 hover:bg-slate-50"
                          >
                            <EstadoIcono estado={a.estado} actual={situacion.numeral === a.numeral} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] text-slate-800 leading-snug">
                                <span className="font-bold text-slate-500 tabular-nums">{a.numeral}</span>{' '}
                                {a.nombre}
                              </span>
                              {plazo ? (
                                <span className="block mt-1">
                                  <ChipPlazo plazo={plazo} />
                                </span>
                              ) : null}
                            </span>
                            {linea.texto ? (
                              <span className={`text-[12px] text-right flex-shrink-0 ficha-linea ${linea.tono}`}>
                                {linea.texto}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                    {noAplican ? (
                      <li className="px-2 pt-1 text-[12px] text-slate-400">
                        {noAplican === 1 ? '1 actividad no aplica' : `${noAplican} actividades no aplican`} a
                        esta modalidad
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      {/* El equipo. */}
      <aside className="bg-white border border-gray-200 rounded-xl overflow-hidden" aria-label="Equipo del proceso">
        <h3 className="m-0 px-4 py-3 border-b border-gray-100 text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-slate-500" aria-hidden="true" />
          Equipo del proceso
        </h3>
        <ul className="m-0 p-0 list-none divide-y divide-gray-100">
          <Miembro
            Icono={UserCog}
            papel="Área solicitante"
            nombre={entrada.radicadoPorMi ? 'Tú radicaste el proceso' : 'Radicó el proceso'}
          />
          <Miembro
            Icono={Landmark}
            papel="Dirección de Contratación"
            nombre={participacion?.contratacion?.nombre ?? null}
            vacio={participacion?.contratacion ? null : 'Sin recibir: está en la bandeja'}
            esMio={participacion?.contratacion?.esMio}
            accion={
              participacion?.puedeTomar
                ? { texto: 'Recibir', hacer: () => setEquipo('radicacion') }
                : undefined
            }
          />
          <Miembro
            Icono={Scale}
            papel="Abogado"
            nombre={participacion?.abogado?.nombre ?? null}
            vacio="Sin asignar"
            esMio={participacion?.abogado?.esMio}
            accion={
              participacion?.puedeRepartir
                ? {
                    texto: participacion.abogado ? 'Reasignar' : 'Asignar',
                    hacer: () => setEquipo('radicacion'),
                  }
                : undefined
            }
          />
          {etapaActual >= 4 || participacion?.financiera ? (
            <Miembro
              Icono={Landmark}
              papel="Dirección Financiera"
              nombre={participacion?.financiera?.nombre ?? null}
              vacio="Nadie ha tomado el CDP"
              esMio={participacion?.financiera?.esMio}
              accion={{ texto: 'Ver el CDP', hacer: () => onAbrir('4.2') }}
            />
          ) : null}
          {etapaActual >= 8 ? (
            <Miembro
              Icono={ShieldCheck}
              papel="Supervisor"
              nombre={supervision?.supervisor?.nombre ?? null}
              vacio={supervision?.admiteSupervisor === false ? 'Aún no hay contrato' : 'Sin designar'}
              accion={
                supervision?.puedeDesignar
                  ? {
                      texto: supervision.supervisor ? 'Reasignar' : 'Designar',
                      hacer: () => setEquipo('supervision'),
                    }
                  : undefined
              }
            />
          ) : null}
        </ul>
        {!puedeGestionarReparto && !supervision?.puedeDesignar ? (
          <p className="m-0 px-4 py-2.5 border-t border-gray-100 text-[12px] text-slate-500 flex items-start gap-1.5">
            <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            Las asignaciones las hace la Dirección de Contratación.
          </p>
        ) : null}
      </aside>

      {/* Asignar sin salir de la ficha: los paneles de siempre, en un modal. */}
      <Modal
        isOpen={equipo !== null}
        onClose={cerrarEquipo}
        title={equipo === 'supervision' ? 'Supervisor del contrato' : 'Recibir y asignar abogado'}
        size="large"
        sinPadding
      >
        {equipo ? (
          <SoloLectura motivo={motivoDe(equipo === 'supervision' ? '8.2' : '3.3')}>
            {motivoDe(equipo === 'supervision' ? '8.2' : '3.3') ? (
              <AvisoSoloLectura motivo={motivoDe(equipo === 'supervision' ? '8.2' : '3.3')!} />
            ) : null}
            {equipo === 'supervision' ? (
              <PanelSupervision procesoId={procesoId} onCambio={onCambio} />
            ) : (
              <PanelRadicacion procesoId={procesoId} onCambio={onCambio} />
            )}
          </SoloLectura>
        ) : null}
      </Modal>
    </div>
  );
}

function EstadoIcono({ estado, actual }: { estado: ActividadEtapa['estado']; actual: boolean }) {
  if (estado === 'aprobada') {
    return <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" aria-label="Hecha" />;
  }
  if (actual || estado === 'en_curso') {
    return <CircleDot className="w-4 h-4 mt-0.5 text-[#003DA5] flex-shrink-0" aria-label="En curso" />;
  }
  return <Circle className="w-4 h-4 mt-0.5 text-slate-300 flex-shrink-0" aria-label="Pendiente" />;
}

function Miembro({
  Icono,
  papel,
  nombre,
  vacio = null,
  esMio,
  accion,
}: {
  Icono: typeof Users;
  papel: string;
  nombre: string | null;
  vacio?: string | null;
  esMio?: boolean;
  accion?: { texto: string; hacer: () => void };
}) {
  return (
    <li className="px-4 py-3 flex items-start gap-2.5">
      <Icono className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[12px] font-bold text-slate-500">{papel}</p>
        <p className={`m-0 text-[13px] ${nombre ? 'text-slate-900 font-bold' : 'text-amber-700'}`}>
          {nombre ?? vacio ?? '—'}
          {nombre && esMio ? ' (tú)' : ''}
        </p>
      </div>
      {accion ? (
        <button
          type="button"
          onClick={accion.hacer}
          className="self-center px-2.5 py-1 text-[12px] font-bold rounded-lg border border-gray-200 text-[#003DA5] hover:border-[#003DA5]/40 flex-shrink-0"
        >
          {accion.texto}
        </button>
      ) : null}
    </li>
  );
}
