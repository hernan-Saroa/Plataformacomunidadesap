import React from "react";
import { ClipboardList } from "lucide-react";

import { ContenidoEstudioPrevio } from "../estudio-previo/ContenidoEstudioPrevio";
import { PanelCdp } from "../cdp/PanelCdp";
import { PanelPublicacionPliego } from "../publicacion/PanelPublicacionPliego";
import { PanelObservaciones } from "../observaciones/PanelObservaciones";
import { PanelMipyme } from "../mipyme/PanelMipyme";
import { PanelDocumentosProceso } from "../documentos/PanelDocumentosProceso";
import { PanelApertura } from "../apertura/PanelApertura";
import { PanelAudienciaRiesgos } from "../riesgos/PanelAudienciaRiesgos";
import { PanelAdendas } from "../adendas/PanelAdendas";
import { PanelOfertas } from "../ofertas/PanelOfertas";
import { PanelComite } from "../comite/PanelComite";
import { PanelEvaluacion } from "../evaluacion/PanelEvaluacion";
import { PanelTraslado } from "../traslado/PanelTraslado";
import { PanelAdjudicacion } from "../adjudicacion/PanelAdjudicacion";
import { PanelPagos } from "../pagos/PanelPagos";
import { PanelInformeFinal } from "../informe-final/PanelInformeFinal";
import { PanelLiquidacion } from "../liquidacion/PanelLiquidacion";
import { PanelCierreFinanciero } from "../cierre-financiero/PanelCierreFinanciero";
import { PanelArchivoExpediente } from "../archivo-expediente/PanelArchivoExpediente";
import { PanelModificaciones } from "../modificaciones/PanelModificaciones";
import { PanelContrato } from "../contrato/PanelContrato";
import { PanelLegalizacion } from "../legalizacion/PanelLegalizacion";
import { PanelSupervision } from "../supervision/PanelSupervision";
import { PanelRegistroPresupuestal } from "../registro-presupuestal/PanelRegistroPresupuestal";
import { PanelPublicacionContrato } from "../publicacion-contrato/PanelPublicacionContrato";
import { PanelActaInicio } from "../acta-inicio/PanelActaInicio";
import { PanelSuscripcionActa } from "../acta-inicio/PanelSuscripcionActa";
import { PanelSeguimiento } from "../seguimiento/PanelSeguimiento";
import { PanelRegistroActividad } from "../actividades/PanelRegistroActividad";
import { PanelIncumplimiento } from "../incumplimiento/PanelIncumplimiento";
import { PanelRadicacion } from "../participacion/PanelRadicacion";
import { PanelModalidad } from "../modalidad/PanelModalidad";
import { PanelCausal } from "../causal/PanelCausal";
import { PanelComiteContratacion } from "../comite-contratacion/PanelComiteContratacion";
import {
  NUMERALES_ADJUDICACION,
  NUMERALES_CDP,
  NUMERALES_CON_REGISTRO,
  NUMERALES_SUPERVISION,
  NUMERALES_TRASLADO,
  NUMERAL_ACTA_INICIO,
  NUMERAL_ACTA_INICIO_LEGALIZACION,
  NUMERAL_ADENDAS,
  NUMERAL_APERTURA,
  NUMERAL_ARCHIVO_EXPEDIENTE,
  NUMERAL_ARL,
  NUMERAL_CAUSAL,
  NUMERAL_CIERRE_FINANCIERO,
  NUMERAL_COMITE,
  NUMERAL_COMITE_CONTRATACION,
  NUMERAL_CONTRATO,
  NUMERAL_DOCUMENTOS,
  NUMERAL_EVALUACION,
  NUMERAL_GARANTIAS,
  NUMERAL_INFORME_FINAL,
  NUMERAL_LIQUIDACION,
  NUMERAL_MIPYME,
  NUMERAL_MODALIDAD,
  NUMERAL_MODIFICACIONES,
  NUMERAL_OBSERVACIONES,
  NUMERAL_OFERTAS,
  NUMERAL_PAGOS,
  NUMERAL_PUBLICACION,
  NUMERAL_PUBLICACION_CONTRATO,
  NUMERAL_RADICACION,
  NUMERAL_RIESGOS,
  NUMERAL_RP,
  NUMERAL_SEGUIMIENTO,
} from "./actividadesConPanel";

interface Props {
  numeral: string | null;
  nombre?: string;
  procesoId: string;
  valorEstimado?: number | null;
  /** Algo cambió en el expediente: el contenedor relee. */
  onCambio: () => void;
  /** Cambió el estudio previo, que además es de donde sale el estado de la 3.1. */
  onCambioEstudio: () => void;
  requiereAprobacion?: boolean;
  devuelta?: boolean;
  recargarToken?: number;
}

/**
 * El panel que trabaja cada actividad, elegido por su numeral.
 *
 * Estaba dentro de `DetalleProceso`, y así solo esa pantalla podía montar un
 * panel. La revisión necesita enseñar el mismo trabajo —el que se va a
 * aprobar— sin el riel ni la cabecera del proceso alrededor, y copiar treinta
 * ramas habría dejado dos listas que se separan a la primera actividad nueva.
 */
export function PanelDeLaActividad({
  numeral,
  nombre,
  procesoId,
  valorEstimado,
  onCambio,
  onCambioEstudio,
  requiereAprobacion = false,
  devuelta = false,
  recargarToken,
}: Props) {
  return (
    <>
      {numeral === NUMERAL_MODALIDAD ? (
        // La 3.5 deja de ser constancia: definir la modalidad es
        // ratificar la que el área eligió, o devolverla para corregirla.
        <PanelModalidad procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_CAUSAL ? (
        // La 3.6 deja de ser constancia: la causal es una calificación
        // jurídica que se elige del catálogo de la modalidad, no una
        // fecha con una nota.
        <PanelCausal procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_COMITE_CONTRATACION ? (
        // La 3.7 deja de ser constancia: lo que el comité decidió son
        // tres desenlaces, y observar devuelve los documentos.
        <PanelComiteContratacion procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_RADICACION ? (
        // La 3.3 deja de ser el panel genérico de constancia: radicar es
        // recibir el proceso y ponerle responsable, no anotar una fecha.
        <PanelRadicacion procesoId={procesoId} onCambio={onCambio} />
      ) : numeral && NUMERALES_CDP.includes(numeral) ? (
        <PanelCdp
          numeral={numeral!}
          procesoId={procesoId}
          valorEstimado={valorEstimado}
          onCambio={onCambio}
        />
      ) : numeral === NUMERAL_ADENDAS ? (
        <PanelAdendas procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_OFERTAS ? (
        <PanelOfertas procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_COMITE ? (
        <PanelComite procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_EVALUACION ? (
        <PanelEvaluacion procesoId={procesoId} onCambio={onCambio} />
      ) : numeral && NUMERALES_TRASLADO.includes(numeral) ? (
        <PanelTraslado procesoId={procesoId} onCambio={onCambio} />
      ) : numeral && NUMERALES_ADJUDICACION.includes(numeral) ? (
        <PanelAdjudicacion procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_ARCHIVO_EXPEDIENTE ? (
        <PanelArchivoExpediente procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_CIERRE_FINANCIERO ? (
        <PanelCierreFinanciero procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_LIQUIDACION ? (
        <PanelLiquidacion procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_INFORME_FINAL ? (
        <PanelInformeFinal procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_MODIFICACIONES ? (
        <PanelModificaciones procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_PAGOS ? (
        <PanelPagos procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_ACTA_INICIO_LEGALIZACION ? (
        <PanelSuscripcionActa procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_ACTA_INICIO ? (
        <PanelActaInicio procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_PUBLICACION_CONTRATO ? (
        <PanelPublicacionContrato procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_RP ? (
        <PanelRegistroPresupuestal procesoId={procesoId} onCambio={onCambio} />
      ) : numeral && NUMERALES_SUPERVISION.includes(numeral) ? (
        <PanelSupervision procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_SEGUIMIENTO ? (
        /**
         * Dos paneles en la misma casilla.
         *
         * El presunto incumplimiento es un bloque transversal de la matriz
         * y no una de las 63 actividades numeradas, así que no tiene
         * casilla propia en el riel. Se cuelga de la 9.2 porque es donde el
         * supervisor ya está: vigila la ejecución, y si algo no se cumple
         * lo constata mirando esto mismo. Dejarlo sin sitio lo volvería
         * inalcanzable desde la pantalla.
         */
        <div className="space-y-3">
          <PanelSeguimiento procesoId={procesoId} onCambio={onCambio} />
          <PanelIncumplimiento procesoId={procesoId} onCambio={onCambio} />
        </div>
      ) : numeral && NUMERALES_CON_REGISTRO.includes(numeral) ? (
        <PanelRegistroActividad
          procesoId={procesoId}
          numeral={numeral!}
          onCambio={onCambio}
          requiereAprobacion={requiereAprobacion}
          devuelta={devuelta}
          /* Donde el bloque de documentos recibe el soporte, cargarlo
           ahi es lo que desbloquea el boton de registrar: sin este
           token el formulario no se enteraba. */
          recargarToken={recargarToken}
        />
      ) : numeral === NUMERAL_GARANTIAS || numeral === NUMERAL_ARL ? (
        <PanelLegalizacion
          procesoId={procesoId}
          numeral={numeral as "8.4" | "8.5"}
          onCambio={onCambio}
        />
      ) : numeral === NUMERAL_CONTRATO ? (
        <PanelContrato procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_RIESGOS ? (
        <PanelAudienciaRiesgos procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_APERTURA ? (
        <PanelApertura procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_DOCUMENTOS ? (
        <PanelDocumentosProceso procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_PUBLICACION ? (
        <PanelPublicacionPliego procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_OBSERVACIONES ? (
        <PanelObservaciones procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === NUMERAL_MIPYME ? (
        <PanelMipyme procesoId={procesoId} onCambio={onCambio} />
      ) : numeral === "3.1" ? (
        <ContenidoEstudioPrevio
          procesoId={procesoId}
          onCambio={onCambioEstudio}
        />
      ) : (
        /* El riel deja pulsar solo lo disponible, pero al entrar sin
         actividad elegida hay que decir qué hacer. Sin marco propio:
         el del contenedor ya lo envuelve. */
        <div className="p-10 text-center">
          <ClipboardList
            className="w-10 h-10 mx-auto text-gray-300 mb-3"
            aria-hidden="true"
          />
          <p className="text-sm font-bold text-gray-600 m-0">
            {numeral ? nombre : "Elige una actividad"}
          </p>
          <p className="text-xs text-gray-400 m-0 mt-1">
            {numeral
              ? "Esta actividad aún no está habilitada en la plataforma."
              : "Selecciona una actividad del panel izquierdo para trabajar en ella."}
          </p>
        </div>
      )}
    </>
  );
}
