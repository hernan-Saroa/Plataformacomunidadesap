import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, FolderOpen, ClipboardList } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { ActividadProceso, EstudioPrevio } from '../../types';
import { StepperEtapas, ETAPAS } from './StepperEtapas';
import { ActividadEtapa } from './ListaActividades';
import { RielActividades } from './RielActividades';
import { PanelExpediente } from '../estudio-previo/PanelExpediente';
import { ContenidoEstudioPrevio } from '../estudio-previo/ContenidoEstudioPrevio';
import { PanelCdp } from '../cdp/PanelCdp';

/** Actividades del ciclo del CDP; se trabajan desde el panel de la etapa 4. */
const NUMERALES_CDP = ['4.1', '4.2', '4.3', '4.4'];

/** Las 6 actividades de la etapa 3 (matriz de flujo, anexo A2). */
const ACTIVIDADES_ETAPA_3 = [
  {
    numeral: '3.1',
    nombre: 'Elaboración de estudios previos',
    descripcion: 'Descripción de la necesidad, fundamento jurídico y modalidad propuesta',
  },
  {
    numeral: '3.2',
    nombre: 'Análisis del sector y estudio de mercado',
    descripcion: 'Consulta de proveedores y precios para estimar el valor',
  },
  {
    numeral: '3.3',
    nombre: 'Radicación en la Dirección de Contratación',
    descripcion: 'Genera consecutivo en el aplicativo de gestión documental',
  },
  {
    numeral: '3.4',
    nombre: 'Revisión y reparto',
    descripcion: 'Revisiones, mesas de trabajo y observaciones al estudio previo',
  },
  {
    numeral: '3.5',
    nombre: 'Definir modalidad de contratación',
    descripcion: 'Según cuantía y umbral vigente (Decreto 1082/2015)',
  },
  {
    numeral: '3.6',
    nombre: 'Comité de contratación',
    descripcion: 'Revisa, observa o aprueba los documentos del proceso',
  },
];

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

interface Props {
  procesoId: string;
  onVolver: () => void;
  /** Numeral que debe quedar desplegado al entrar. */
  actividadInicial?: string | null;
}

export function DetalleProceso({ procesoId, onVolver, actividadInicial = null }: Props) {
  const [datos, setDatos] = useState<EstudioPrevio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandida, setExpandida] = useState<string | null>(actividadInicial);
  const [expedienteAbierto, setExpedienteAbierto] = useState(false);
  /** Actividades de la etapa, con su estado. Vacío mientras carga o si falla. */
  const [catalogo, setCatalogo] = useState<ActividadProceso[]>([]);
  const [tokenExpediente, setTokenExpediente] = useState(0);
  /** Documentos por numeral, para mostrar el contador en cada actividad. */
  const [adjuntosPorNumeral, setAdjuntosPorNumeral] = useState<Record<string, number>>({});

  useEffect(() => {
    contratacionService
      .obtenerExpediente(procesoId)
      .then((exp) => {
        const conteo: Record<string, number> = {};
        for (const doc of exp.documentos) {
          if (doc.numeral) conteo[doc.numeral] = (conteo[doc.numeral] ?? 0) + 1;
        }
        setAdjuntosPorNumeral(conteo);
      })
      .catch(() => undefined);
  }, [procesoId, tokenExpediente]);

  useEffect(() => {
    // Si falla se sigue con la lista de la etapa 3 que había antes: el riel no
    // puede quedarse vacío por una consulta caída.
    contratacionService
      .actividades(procesoId)
      .then(setCatalogo)
      .catch(() => setCatalogo([]));
  }, [procesoId, tokenExpediente]);

  useEffect(() => {
    let vigente = true;
    contratacionService
      .obtenerEstudioPrevio(procesoId)
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [procesoId]);

  if (cargando) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
        <p className="text-sm text-slate-500 m-0">Cargando proceso…</p>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
        <p className="text-sm text-red-600 m-0 mb-3">{error ?? 'No se pudo cargar el proceso'}</p>
        <button onClick={onVolver} className="text-sm font-bold text-[#003DA5]">
          Volver a procesos
        </button>
      </div>
    );
  }

  const aprobado = datos.estado === 'APROBADO';
  const enRevision = datos.estado === 'EN_REVISION';
  const faltantes = datos.definicionCampos.filter(
    (c) => c.obligatorio && !datos.datos?.[c.codigo],
  ).length;

  const detalle31 = () => {
    if (aprobado) return 'Aprobado · registrado en el expediente';
    if (enRevision) return 'En revisión · pendiente de aprobación';
    if (faltantes > 0) {
      return `En elaboración · faltan ${faltantes} ${
        faltantes === 1 ? 'campo obligatorio' : 'campos obligatorios'
      }`;
    }
    return 'Listo para enviar a revisión';
  };

  // El catálogo llega del backend desde EFDS-1342: la matriz tiene 63
  // actividades y corregir el nombre de una no debería exigir un despliegue.
  // Si la consulta falla se cae a la etapa 3, que es lo único que había antes.
  const delCatalogo: ActividadEtapa[] = (catalogo.length > 0 ? catalogo : ACTIVIDADES_ETAPA_3).map(
    (act: any) => {
      const adjuntos = adjuntosPorNumeral[act.numeral] ?? 0;
      const aplica = act.aplica !== false;

      if (act.numeral === '3.1') {
        return {
          ...act,
          estado: aprobado ? 'aprobada' : 'en_curso',
          detalle: detalle31(),
          disponible: true,
          adjuntos,
        };
      }
      // Las actividades del CDP se trabajan aquí desde EFDS-1148.
      if (NUMERALES_CDP.includes(act.numeral)) {
        return {
          ...act,
          estado: act.estado === 'APROBADO' ? 'aprobada' : aplica ? 'en_curso' : 'pendiente',
          disponible: aplica,
          detalle: aplica ? undefined : 'No aplica a esta modalidad',
          adjuntos,
        };
      }
      return { ...act, estado: 'pendiente', disponible: false, adjuntos };
    },
  );

  const actividades = delCatalogo;

  const nombreEtapa =
    ETAPAS.find((e) => e.numero === datos.proceso.etapa)?.nombre ?? `Etapa ${datos.proceso.etapa}`;

  const actividadSeleccionada = actividades.find((a) => a.numeral === expandida) ?? null;

  // La cuantía se muestra en la cabecera porque desde EFDS-1147 es dato del
  // proceso, no del estudio previo, y de ella depende la modalidad aplicable.
  const ficha = [
    datos.proceso.expediente ? `Expediente ${datos.proceso.expediente}` : null,
    typeof datos.proceso.valorEstimado === 'number'
      ? `Valor estimado ${formatoPesos.format(datos.proceso.valorEstimado)}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // La modalidad manda sobre todo el flujo —determina qué actividades aplican—
  // así que va destacada y no perdida en la línea de datos menores.
  const modalidad = datos.proceso.modalidadNombre ?? datos.proceso.modalidad ?? null;

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Cabecera del proceso */}
      <div
        className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        style={{ borderBottom: '3px solid #003DA5' }}
      >
        <div className="p-4">
          <button
            onClick={onVolver}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#003DA5] mb-2.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Procesos
          </button>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E0EDFF] grid place-items-center flex-shrink-0">
              <FileText className="w-5 h-5 text-[#003DA5]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[#003DA5] m-0 tabular-nums">
                {datos.proceso.radicado}
              </p>
              <h2 className="text-[15px] font-bold text-slate-900 m-0 mt-0.5 leading-snug">
                {datos.proceso.objeto}
              </h2>
              {modalidad && (
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-[#E0EDFF] text-[#003DA5] text-[11px] font-bold">
                  {modalidad}
                </span>
              )}
              {ficha && (
                <p className="text-[11px] text-gray-400 m-0 mt-1 tabular-nums">{ficha}</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <StepperEtapas etapaActual={datos.proceso.etapa} />

            <button
              type="button"
              onClick={() => setExpedienteAbierto((v) => !v)}
              aria-expanded={expedienteAbierto}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold
                border transition-colors ${
                  expedienteAbierto
                    ? 'bg-[#E0EDFF] border-[#003DA5]/30 text-[#003DA5]'
                    : 'bg-white border-gray-200 text-slate-600 hover:border-[#003DA5]/30 hover:text-[#003DA5]'
                }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Expediente
            </button>
          </div>
        </div>
      </div>

      {/* Riel de actividades · superficie de trabajo · expediente a demanda. */}
      <div className={`detalle-proceso ${expedienteAbierto ? 'con-expediente' : ''}`}>
        <RielActividades
          etapa={datos.proceso.etapa}
          nombreEtapa={nombreEtapa}
          actividades={actividades}
          seleccionada={expandida}
          onSeleccionar={setExpandida}
        />

        <div className="min-w-0">
          {actividadSeleccionada && NUMERALES_CDP.includes(actividadSeleccionada.numeral) ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelCdp
                numeral={actividadSeleccionada.numeral}
                procesoId={procesoId}
                valorEstimado={datos.proceso.valorEstimado}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === '3.1' ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <ContenidoEstudioPrevio
                procesoId={procesoId}
                onCambio={() => {
                  contratacionService
                    .obtenerEstudioPrevio(procesoId)
                    .then(setDatos)
                    .catch(() => undefined);
                  setTokenExpediente((t) => t + 1);
                }}
              />
            </div>
          ) : (
            /* El riel deja pulsar solo lo disponible, pero al entrar sin
               actividad elegida hay que decir qué hacer. */
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
              <ClipboardList className="w-10 h-10 mx-auto text-gray-300 mb-3" aria-hidden="true" />
              <p className="text-sm font-bold text-gray-600 m-0">
                {actividadSeleccionada
                  ? `${actividadSeleccionada.numeral} · ${actividadSeleccionada.nombre}`
                  : 'Elige una actividad'}
              </p>
              <p className="text-xs text-gray-400 m-0 mt-1">
                {actividadSeleccionada
                  ? 'Esta actividad aún no está habilitada en la plataforma.'
                  : 'Selecciona una actividad del panel izquierdo para trabajar en ella.'}
              </p>
            </div>
          )}
        </div>

        {expedienteAbierto && (
          <div className="panel-expediente bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <PanelExpediente
              procesoId={procesoId}
              editable={!aprobado && !enRevision}
              recargarToken={tokenExpediente}
            />
          </div>
        )}
      </div>

    </div>
  );
}
