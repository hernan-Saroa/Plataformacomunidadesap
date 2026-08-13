import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { EstudioPrevio } from '../../types';
import { StepperEtapas, ETAPAS } from './StepperEtapas';
import { ActividadEtapa } from './ListaActividades';
import { AcordeonEtapas } from './AcordeonEtapas';
import { PanelExpediente } from '../estudio-previo/PanelExpediente';
import { ContenidoEstudioPrevio } from '../estudio-previo/ContenidoEstudioPrevio';

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

  // Solo el 3.1 tiene HU entregada; el resto se muestra como estructura.
  const actividades: ActividadEtapa[] = ACTIVIDADES_ETAPA_3.map((act) => {
    const adjuntos = adjuntosPorNumeral[act.numeral] ?? 0;
    if (act.numeral === '3.1') {
      return {
        ...act,
        estado: aprobado ? 'aprobada' : 'en_curso',
        detalle: detalle31(),
        disponible: true,
        adjuntos,
      };
    }
    return { ...act, estado: 'pendiente', disponible: false, adjuntos };
  });

  // Las 10 etapas con sus actividades. Solo la 3 tiene actividades definidas
  // hoy; las demás se listan vacías hasta que lleguen sus HUs.
  const etapasConActividades = ETAPAS.map((e) => ({
    numero: e.numero,
    nombre: e.nombre,
    fueraDeAlcance: e.fueraDeAlcance,
    actividades: e.numero === 3 ? actividades : [],
  }));

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
              {datos.proceso.expediente && (
                <p className="text-[11px] text-gray-400 m-0 mt-1 tabular-nums">
                  Expediente {datos.proceso.expediente}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <StepperEtapas etapaActual={datos.proceso.etapa} />
          </div>
        </div>
      </div>

      {/* Actividades de la etapa + expediente */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 md:gap-4 items-start">
        <AcordeonEtapas
          etapas={etapasConActividades}
          etapaActual={datos.proceso.etapa}
          onAbrirActividad={(numeral) => setExpandida((a) => (a === numeral ? null : numeral))}
          expandida={expandida}
          contenidoExpandido={
            expandida === '3.1' ? (
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
            ) : null
          }
        />

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <PanelExpediente
            procesoId={procesoId}
            editable={!aprobado && !enRevision}
            recargarToken={tokenExpediente}
          />
        </div>
      </div>

    </div>
  );
}
