import React, { useEffect, useState } from 'react';
import { ClipboardList, Pencil } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import {
  DimensionEvaluacion,
  DimensionManual,
  EstadoEvaluacion,
  EstadoOferta,
  OfertaEnEvaluacion,
} from '../../types';
import { Aviso, Ayuda, Marco, Pendiente, Titulo } from '../shared/PiezasPanel';
import { FormularioDimension } from './FormularioDimension';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const ETIQUETA_DIMENSION: Record<DimensionEvaluacion, string> = {
  JURIDICO: 'Jurídica',
  FINANCIERO: 'Financiera',
  TECNICO: 'Técnica',
  ECONOMICO: 'Económica',
};

const DIMENSIONES: DimensionEvaluacion[] = ['JURIDICO', 'FINANCIERO', 'TECNICO', 'ECONOMICO'];

const ESTADO_OFERTA: Record<EstadoOferta, { texto: string; clase: string }> = {
  HABILITADA: { texto: 'Habilitada', clase: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  NO_HABILITADA: { texto: 'No habilitada', clase: 'bg-red-50 text-red-800 border-red-200' },
  PENDIENTE: { texto: 'Pendiente', clase: 'bg-slate-50 text-slate-600 border-gray-200' },
};

const pesos = (valor: number | null) =>
  valor == null
    ? '—'
    : new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(valor);

/**
 * Actividad 6.3 · Evaluación de las ofertas (EFDS-1157).
 *
 * La pantalla se adapta a quién mira: el evaluador llena su dimensión y nada
 * más, el gestor consulta el consolidado sin poder calificar. Eso no se
 * resuelve con el rol del token sino con lo que devuelve el estado —en qué
 * dimensiones fue designado quien consulta—, porque un evaluador jurídico
 * designado en otro proceso no evalúa en este.
 *
 * Primero la tabla consolidada, que es la vista que más se consulta, y el
 * formulario de calificación por detrás de ella.
 */
export function PanelEvaluacion({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoEvaluacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluando, setEvaluando] = useState<{ oferta: string; dimension: DimensionManual } | null>(
    null,
  );

  const leer = () =>
    contratacionService
      .evaluacion(procesoId)
      .then((datos) => {
        setEstado(datos);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId]);

  if (cargando) {
    return (
      <Marco>
        <p className="text-[11.5px] text-slate-400 m-0">Cargando la evaluación…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo cargar la actividad">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  if (!estado.aplica) {
    return (
      <Marco>
        <Titulo>Evaluación de las ofertas</Titulo>
        <Aviso tono="aviso" titulo="Esta modalidad no evalúa ofertas">
          {estado.motivoNoAplica ?? 'La modalidad del proceso no adelanta evaluación de ofertas.'}
        </Aviso>
      </Marco>
    );
  }

  const criteriosDe = (dimension: DimensionEvaluacion) =>
    estado.criterios.filter((c) => c.dimension === dimension);

  const evaluada = (oferta: OfertaEnEvaluacion, dimension: DimensionEvaluacion) =>
    oferta.evaluaciones.some((e) => e.dimension === dimension);

  return (
    <Marco>
      <Titulo>Evaluación de las ofertas</Titulo>
      <Ayuda>
        El comité califica cada oferta en las dimensiones jurídica, financiera y técnica. La
        económica no la llena nadie: se calcula sobre el valor ofertado, en proporción a la oferta
        más barata entre las que siguen en carrera.
      </Ayuda>

      {/* Lo que impide evaluar se dice por separado, en vez de dejar una tabla
          vacía sin explicación. */}
      {!estado.recepcionCerrada ? (
        <Pendiente
          falta="6.1"
          texto="La recepción de ofertas sigue abierta: la evaluación se hace sobre la lista de oferentes en firme."
        />
      ) : !estado.comiteDesignado ? (
        <Pendiente
          falta="6.2"
          texto="No hay comité evaluador designado. Sin comité no hay quién califique, y el sistema no admite evaluaciones."
        />
      ) : estado.ofertas.length === 0 ? (
        <Aviso tono="aviso" titulo="El proceso cerró sin ofertas">
          No se recibió ninguna oferta, así que no hay nada que evaluar.
        </Aviso>
      ) : null}

      {/* Igual que con los plazos de ofertas: mientras los criterios no estén
          ratificados, la calificación que sale de ellos es provisional. */}
      {estado.criteriosSinConfirmar && (
        <Aviso tono="aviso" titulo="Criterios sin confirmar">
          Algunos criterios y sus pesos son supuestos del equipo, pendientes de que la Dirección de
          Contratación los ratifique. La calificación que sale de ellos no puede presentarse todavía
          como definitiva.
        </Aviso>
      )}

      {estado.comiteDesignado && estado.misDimensiones.length > 0 && (
        <Aviso tono="ok" titulo="Evalúas en este proceso">
          Puedes calificar la dimensión{' '}
          {estado.misDimensiones.map((d) => ETIQUETA_DIMENSION[d].toLowerCase()).join(' y ')}. Las
          demás las llenan los otros miembros del comité.
        </Aviso>
      )}

      {estado.ofertas.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-slate-50">
                <th className="px-3 py-2 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                  Oferta
                </th>
                <th className="px-3 py-2 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                  Estado
                </th>
                {DIMENSIONES.map((d) => (
                  <th
                    key={d}
                    className="px-3 py-2 text-[10.5px] font-black uppercase tracking-wide text-slate-500 text-right"
                  >
                    {ETIQUETA_DIMENSION[d]}
                  </th>
                ))}
                <th className="px-3 py-2 text-[10.5px] font-black uppercase tracking-wide text-slate-500 text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {estado.ofertas.map((oferta) => {
                const consolidado = oferta.consolidado;
                const marca = ESTADO_OFERTA[consolidado?.estado ?? 'PENDIENTE'];

                return (
                  <tr key={oferta.id} className="border-b border-gray-100 last:border-0 align-top">
                    <td className="px-3 py-2.5">
                      <p className="text-[12.5px] font-bold text-slate-800 m-0 break-words">
                        {oferta.numero}. {oferta.nombre}
                      </p>
                      <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                        {oferta.identificacion} · {pesos(oferta.valorOfertado)}
                      </p>
                      {/* No basta con decir que quedó fuera: el oferente
                          reclama por el criterio concreto, y el informe de
                          evaluación tiene que sustentarlo. */}
                      {consolidado?.incumplimientos.map((i) => (
                        <p
                          key={i.criterioId}
                          className="text-[11px] text-red-800 m-0 mt-1 leading-relaxed"
                        >
                          Incumple «{i.nombre}»{i.motivo ? `: ${i.motivo}` : ''}
                        </p>
                      ))}
                      {oferta.valorOfertado == null && (
                        <p className="text-[11px] text-amber-800 m-0 mt-1 leading-relaxed">
                          Sin valor ofertado registrado: la económica no se puede calcular.
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10.5px] font-bold rounded-md border ${marca.clase}`}
                      >
                        {marca.texto}
                      </span>
                      {(consolidado?.dimensionesPendientes.length ?? 0) > 0 && (
                        <p className="text-[10.5px] text-slate-500 m-0 mt-1 leading-relaxed">
                          Falta{' '}
                          {consolidado!.dimensionesPendientes
                            .map((d) => ETIQUETA_DIMENSION[d].toLowerCase())
                            .join(', ')}
                        </p>
                      )}
                    </td>
                    {DIMENSIONES.map((d) => (
                      <td
                        key={d}
                        className="px-3 py-2.5 text-[12px] text-slate-700 tabular-nums text-right"
                      >
                        {consolidado?.puntajePorDimension?.[d] ?? (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-[12.5px] font-bold text-slate-800 tabular-nums text-right">
                      {consolidado ? `${consolidado.puntajeTotal} / ${consolidado.puntajeMaximo}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* El formulario va detrás de la tabla: se consulta más de lo que se
          califica, y solo aparece para quien fue designado. */}
      {estado.puedeEvaluar &&
        estado.ofertas.map((oferta) => (
          <div key={oferta.id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11.5px] font-bold text-slate-700 m-0">
                {oferta.numero}. {oferta.nombre}
              </p>
              {estado.misDimensiones.map((dimension) => (
                <button
                  key={dimension}
                  type="button"
                  onClick={() => setEvaluando({ oferta: oferta.id, dimension })}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md border border-gray-200 text-slate-600 hover:border-[#003DA5] hover:text-[#003DA5] transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  {evaluada(oferta, dimension) ? 'Corregir' : 'Evaluar'}{' '}
                  {ETIQUETA_DIMENSION[dimension].toLowerCase()}
                </button>
              ))}
            </div>

            {evaluando?.oferta === oferta.id && (
              <FormularioDimension
                procesoId={procesoId}
                oferta={oferta}
                dimension={evaluando.dimension}
                criterios={criteriosDe(evaluando.dimension)}
                onListo={(tras) => {
                  setEstado(tras);
                  setEvaluando(null);
                  onCambio?.();
                }}
                onCancelar={() => setEvaluando(null)}
              />
            )}
          </div>
        ))}

      {estado.comiteDesignado && estado.misDimensiones.length === 0 && estado.ofertas.length > 0 && (
        <p className="text-[11px] text-slate-500 m-0 flex items-start gap-1.5 leading-relaxed">
          <ClipboardList className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          Consultas la evaluación, pero no calificas: solo lo hacen los miembros designados en el
          comité de este proceso, cada uno en su dimensión.
        </p>
      )}
    </Marco>
  );
}
