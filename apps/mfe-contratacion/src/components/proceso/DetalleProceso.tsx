import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, FolderOpen, ClipboardList, ShieldCheck } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { ActividadProceso, EstudioPrevio } from '../../types';
import { AvanceEtapa, LineaDeTiempoEtapas } from './Etapas';
import { ActividadEtapa } from './ListaActividades';
import { estadoDeActividad } from './estadoActividad';
import { RielActividades } from './RielActividades';
import { PanelExpediente } from '../estudio-previo/PanelExpediente';
import { ContenidoEstudioPrevio } from '../estudio-previo/ContenidoEstudioPrevio';
import { PanelCdp } from '../cdp/PanelCdp';
import { PanelPublicacionPliego } from '../publicacion/PanelPublicacionPliego';
import { PanelObservaciones } from '../observaciones/PanelObservaciones';
import { PanelMipyme } from '../mipyme/PanelMipyme';
import { PanelDocumentosProceso } from '../documentos/PanelDocumentosProceso';
import { PanelApertura } from '../apertura/PanelApertura';
import { PanelAudienciaRiesgos } from '../riesgos/PanelAudienciaRiesgos';
import { PanelAdendas } from '../adendas/PanelAdendas';
import { PanelOfertas } from '../ofertas/PanelOfertas';
import { PanelComite } from '../comite/PanelComite';
import { PanelEvaluacion } from '../evaluacion/PanelEvaluacion';
import { PanelTraslado } from '../traslado/PanelTraslado';
import { PanelAdjudicacion } from '../adjudicacion/PanelAdjudicacion';
import { PanelPagos } from '../pagos/PanelPagos';
import { PanelInformeFinal } from '../informe-final/PanelInformeFinal';
import { PanelLiquidacion } from '../liquidacion/PanelLiquidacion';
import { PanelCierreFinanciero } from '../cierre-financiero/PanelCierreFinanciero';
import { PanelArchivoExpediente } from '../archivo-expediente/PanelArchivoExpediente';
import { PanelModificaciones } from '../modificaciones/PanelModificaciones';
import { PanelContrato } from '../contrato/PanelContrato';
import { PanelLegalizacion } from '../legalizacion/PanelLegalizacion';
import { PanelSupervision } from '../supervision/PanelSupervision';
import { PanelRegistroPresupuestal } from '../registro-presupuestal/PanelRegistroPresupuestal';
import { PanelPublicacionContrato } from '../publicacion-contrato/PanelPublicacionContrato';
import { PanelActaInicio } from '../acta-inicio/PanelActaInicio';
import { PanelSeguimiento } from '../seguimiento/PanelSeguimiento';
import { PanelRegistroActividad } from '../actividades/PanelRegistroActividad';
import { PanelIncumplimiento } from '../incumplimiento/PanelIncumplimiento';
import { DocumentosActividad } from '../shared/DocumentosActividad';
import { PanelAuditoria } from '../auditoria/PanelAuditoria';

/** Actividades del ciclo del CDP; se trabajan desde el panel de la etapa 4. */
const NUMERALES_CDP = ['4.1', '4.2', '4.3', '4.4'];

/** Elaboración de los documentos del proceso (EFDS-1149). */
const NUMERAL_DOCUMENTOS = '5.1';
/** Publicación del proyecto de pliego, primera actividad publicada de la etapa 5. */
const NUMERAL_PUBLICACION = '5.2';
/** Observaciones al pliego (EFDS-1151), sobre la publicación ya registrada. */
const NUMERAL_OBSERVACIONES = '5.3';
/** Limitación de la convocatoria a MIPYME (EFDS-1151). */
const NUMERAL_MIPYME = '5.4';
/** Audiencia de asignación de riesgos (EFDS-1153). */
const NUMERAL_RIESGOS = '5.5';
/** Adendas al pliego publicado (EFDS-1154). */
const NUMERAL_ADENDAS = '5.6';
/** Apertura formal del proceso, que cierra la etapa (EFDS-1152). */
const NUMERAL_APERTURA = '5.7';
/** Recepción de ofertas y cierre, primera actividad de la etapa 6 (EFDS-1155). */
const NUMERAL_OFERTAS = '6.1';
/** Designación del comité que evaluará las ofertas (EFDS-1156). */
const NUMERAL_COMITE = '6.2';

/** Evaluación de las ofertas (EFDS-1157). */
const NUMERAL_EVALUACION = '6.3';

/**
 * Traslado del informe y subsanaciones (EFDS-1158).
 *
 * Tres numerales y un solo panel: para el usuario es un solo trámite —se
 * publica el informe, corre un término, entran escritos y se responden—, y
 * partirlo obligaría a saltar entre pantallas para saber si el plazo sigue
 * abierto.
 */
const NUMERALES_TRASLADO = ['6.4', '6.5', '6.6'];

/**
 * Adjudicación (EFDS-1159), etapa 7 completa.
 *
 * Cuatro numerales y un solo panel, por lo mismo que el traslado: para el
 * usuario es un solo desenlace —audiencia, sobre económico, informe definitivo
 * y acto— y saber en qué paso va exige verlos juntos.
 */
const NUMERALES_ADJUDICACION = ['7.1', '7.2', '7.3', '7.4'];

/** Las de la etapa 5 que ya tienen panel; el riel las trata igual. */
const NUMERALES_ETAPA_5 = [
  NUMERAL_DOCUMENTOS,
  NUMERAL_PUBLICACION,
  NUMERAL_OBSERVACIONES,
  NUMERAL_MIPYME,
  NUMERAL_RIESGOS,
  NUMERAL_ADENDAS,
  NUMERAL_APERTURA,
];

/**
 * Las de la etapa 6 que ya tienen panel.
 *
 * Lista aparte y no añadida a la de la etapa 5: son etapas distintas, y meterlas
 * en la misma constante haría que el nombre dejara de decir la verdad.
 */
const NUMERALES_ETAPA_6 = [
  NUMERAL_OFERTAS,
  NUMERAL_COMITE,
  NUMERAL_EVALUACION,
  ...NUMERALES_TRASLADO,
];

/** Elaboración del contrato y aceptación del proponente (EFDS-1161). */
const NUMERAL_CONTRATO = '8.1';

/** Designación del supervisor del contrato (EFDS-1165). */
const NUMERAL_SUPERVISOR = '8.2';
/** Expedición del registro presupuestal del contrato (EFDS-1163). */
const NUMERAL_RP = '8.3';
/** Constitución de garantías con sus amparos (EFDS-1164). */
const NUMERAL_GARANTIAS = '8.4';
/** Registro de la ARL para contratistas persona natural (EFDS-1164). */
const NUMERAL_ARL = '8.5';

/** Publicación del contrato dentro del plazo legal (EFDS-1166). */
const NUMERAL_PUBLICACION_CONTRATO = '8.8';

/** Las de la etapa 8 que ya tienen panel. Misma razón que la lista anterior. */
const NUMERALES_ETAPA_8 = [
  NUMERAL_CONTRATO,
  NUMERAL_SUPERVISOR,
  NUMERAL_RP,
  NUMERAL_GARANTIAS,
  NUMERAL_ARL,
  NUMERAL_PUBLICACION_CONTRATO,
];

/** Reunión de inicio que da comienzo a la ejecución (EFDS-1167). */
const NUMERAL_ACTA_INICIO = '9.1';

/** Seguimiento de la ejecución del contrato (EFDS-1168). */
const NUMERAL_SEGUIMIENTO = '9.2';

/** Tramite de pagos del contrato (EFDS-1170). */
const NUMERAL_PAGOS = '9.4';
/**
 * Modificaciones contractuales (EFDS-1176).
 *
 * La matriz si le da numeral a este bloque, a diferencia de la declaratoria
 * desierta y del cierre definitivo. Crecera con EFDS-1177 y EFDS-1178, que
 * traen la prorroga, la cesion, el aclaratorio y la suspension al mismo panel.
 */
const NUMERAL_MODIFICACIONES = '9.5';
const NUMERALES_ETAPA_9 = [
  NUMERAL_ACTA_INICIO,
  NUMERAL_SEGUIMIENTO,
  NUMERAL_PAGOS,
  NUMERAL_MODIFICACIONES,
];

/**
 * Informe final de ejecucion (EFDS-1171), primera actividad de la etapa 10.
 *
 * Lista propia por lo mismo que las anteriores: es otra etapa. Crecera con
 * EFDS-1172 a EFDS-1175.
 */
const NUMERAL_INFORME_FINAL = '10.1';
/** Acta de liquidacion del contrato (EFDS-1172). */
const NUMERAL_LIQUIDACION = '10.2';
/** Pago final y liberacion del saldo del RP (EFDS-1173). */
const NUMERAL_CIERRE_FINANCIERO = '10.3';
/**
 * Publicacion del acta y archivo del expediente (EFDS-1174).
 *
 * La matriz solo le da numeral al archivo; la publicacion no tiene uno propio y
 * RF-LIQ-04 las enuncia juntas, asi que las dos viven en la 10.4.
 */
const NUMERAL_ARCHIVO_EXPEDIENTE = '10.4';
const NUMERALES_ETAPA_10 = [
  NUMERAL_INFORME_FINAL,
  NUMERAL_LIQUIDACION,
  NUMERAL_CIERRE_FINANCIERO,
  NUMERAL_ARCHIVO_EXPEDIENTE,
];

/** Las 6 actividades de la etapa 3 (matriz de flujo, anexo A2). */
const ACTIVIDADES_ETAPA_3 = [
  {
    numeral: '3.1',
    etapa: 3,
    nombre: 'Elaboración de estudios previos',
    descripcion: 'Descripción de la necesidad, fundamento jurídico y modalidad propuesta',
  },
  {
    numeral: '3.2',
    etapa: 3,
    nombre: 'Análisis del sector y estudio de mercado',
    descripcion: 'Consulta de proveedores y precios para estimar el valor',
  },
  {
    numeral: '3.3',
    etapa: 3,
    nombre: 'Radicación en la Dirección de Contratación',
    descripcion: 'Genera consecutivo en el aplicativo de gestión documental',
  },
  {
    numeral: '3.4',
    etapa: 3,
    nombre: 'Revisión y reparto',
    descripcion: 'Revisiones, mesas de trabajo y observaciones al estudio previo',
  },
  {
    numeral: '3.5',
    etapa: 3,
    nombre: 'Definir modalidad de contratación',
    descripcion: 'Según cuantía y umbral vigente (Decreto 1082/2015)',
  },
  {
    numeral: '3.6',
    etapa: 3,
    nombre: 'Comité de contratación',
    descripcion: 'Revisa, observa o aprueba los documentos del proceso',
  },
];

/**
 * Las once actividades de la matriz que ninguna historia recogió (migración 051).
 *
 * No tienen trámite propio en la plataforma —el sorteo se hace en la Dirección
 * de Contratación, la subasta en SECOP II, la radicación en Active Document—,
 * así que se cumplen dejando constancia. Comparten un solo panel: lo que las
 * distingue no cambia lo que el expediente necesita de ellas.
 */
const ACTIVIDADES_CON_REGISTRO: Record<string, string> = {
  '3.2': 'Análisis del sector y estudio de mercado',
  '3.3': 'Radicación en la Dirección de Contratación',
  '3.4': 'Revisión y reparto',
  '3.5': 'Definir modalidad de contratación',
  '5.9': 'Manifestación de interés',
  '5.10': 'Sorteo',
  '5.11': 'Publicación de la manifestación de interés',
  '6.7': 'Informe previo a la audiencia de adjudicación',
  '6.8': 'Informe previo al evento de subasta',
  '6.9': 'Apertura del sobre económico previo a la subasta',
  '6.10': 'Evento de subasta',
};

const NUMERALES_CON_REGISTRO = Object.keys(ACTIVIDADES_CON_REGISTRO);

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
  /**
   * Qué etapa se está mirando. Nula hasta que alguien elija: mientras tanto se
   * muestra la del proceso, que es donde se trabaja al entrar.
   */
  const [etapaElegida, setEtapaElegida] = useState<number | null>(null);
  const [auditoriaAbierta, setAuditoriaAbierta] = useState(false);
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

  // Entrar directo a una actividad —desde el tablero, por ejemplo— tiene que
  // mover también la línea del tiempo, o el carril mostraría otra etapa y la
  // actividad abierta a la derecha no estaría en ninguna parte de la izquierda.
  useEffect(() => {
    if (!expandida) return;
    const suya = catalogo.find((a: any) => a.numeral === expandida)?.etapa;
    if (typeof suya === 'number') setEtapaElegida(suya);
  }, [expandida, catalogo]);

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
      // Las actividades del CDP se trabajan aquí desde EFDS-1148, la
      // publicación del pliego desde EFDS-1150 y las observaciones y la
      // limitación a MIPYME desde EFDS-1151. Se tratan igual: el riel las
      // habilita cuando la matriz las marca aplicables a la modalidad.
      if (
        NUMERALES_CDP.includes(act.numeral) ||
        NUMERALES_ETAPA_5.includes(act.numeral) ||
        NUMERALES_ETAPA_6.includes(act.numeral) ||
        NUMERALES_ADJUDICACION.includes(act.numeral) ||
        NUMERALES_ETAPA_8.includes(act.numeral) ||
        NUMERALES_ETAPA_9.includes(act.numeral) ||
        NUMERALES_ETAPA_10.includes(act.numeral) ||
        NUMERALES_CON_REGISTRO.includes(act.numeral)
      ) {
        // `no_aplica` y no `pendiente`: es lo que el riel tacha, y lo que hace
        // que no cuente en el avance de la etapa. Poniendo `pendiente` —como
        // se hacía— una actividad que la modalidad excluye se veía igual que
        // una que está por hacer, y el contador la exigía para llegar al 100%.
        return {
          ...act,
          // Antes se daba por en curso todo lo aplicable, así que el riel
          // encendía en azul las nueve actividades de las etapas 4 y 5 desde el
          // minuto uno y el color dejaba de informar.
          estado: estadoDeActividad(aplica, act.estado),
          disponible: aplica,
          detalle: aplica ? undefined : 'No aplica a esta modalidad',
          adjuntos,
        };
      }
      // El candado sin explicación se lee como un error del sistema; decir
      // que falta construirla distingue lo pendiente de lo roto.
      return {
        ...act,
        estado: 'pendiente',
        disponible: false,
        detalle: 'Pendiente de desarrollo',
        adjuntos,
      };
    },
  );

  const actividades = delCatalogo;

  const actividadSeleccionada = actividades.find((a) => a.numeral === expandida) ?? null;

  const etapaVista = etapaElegida ?? datos.proceso.etapa;

  /**
   * Cuántas actividades aplican y cuántas están hechas, por etapa.
   *
   * Es lo que pinta la línea del tiempo. Se cuenta sobre las que aplican a la
   * modalidad: exigir las excluidas para dar una etapa por cerrada dejaría
   * etapas que nunca llegan al final.
   */
  const avance: Record<number, AvanceEtapa> = {};
  for (const act of actividades) {
    const numero = act.etapa ?? 3;
    if (!avance[numero]) avance[numero] = { aplicables: 0, completas: 0 };
    if (act.estado === 'no_aplica') continue;
    avance[numero].aplicables += 1;
    if (act.estado === 'aprobada') avance[numero].completas += 1;
  }

  // Cambiar de etapa suelta la actividad abierta: la de la etapa anterior ya no
  // está en el carril, y dejarla a la derecha sin nada que la señale confunde.
  const elegirEtapa = (numero: number) => {
    setEtapaElegida(numero);
    setExpandida(null);
  };

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
            {/* Gradiente y no fondo plano: misma insignia que las cabeceras de
                control interno y gestión legal. */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003DA5] to-[#0051D5] grid place-items-center flex-shrink-0 shadow-md">
              <FileText className="w-5 h-5 text-white" />
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
            <LineaDeTiempoEtapas
              etapaActual={datos.proceso.etapa}
              etapaSeleccionada={etapaVista}
              onSeleccionar={elegirEtapa}
              avance={avance}
            />

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

            {/* El expediente de trabajo deja subir y borrar; este solo se lee, y
                trae además la trazabilidad y el historial (EFDS-1186). */}
            <button
              type="button"
              onClick={() => setAuditoriaAbierta((v) => !v)}
              aria-expanded={auditoriaAbierta}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold
                border transition-colors ${
                  auditoriaAbierta
                    ? 'bg-[#E0EDFF] border-[#003DA5]/30 text-[#003DA5]'
                    : 'bg-white border-gray-200 text-slate-600 hover:border-[#003DA5]/30 hover:text-[#003DA5]'
                }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Auditoría
            </button>
          </div>
        </div>
      </div>

      {/* A ancho completo y no en la columna del expediente: la trazabilidad y
          el historial no caben en una barra lateral. */}
      {auditoriaAbierta && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-4">
          <PanelAuditoria procesoId={procesoId} />
        </div>
      )}

      {/* Riel de actividades · superficie de trabajo · expediente a demanda. */}
      <div className={`detalle-proceso ${expedienteAbierto ? 'con-expediente' : ''}`}>
        <RielActividades
          etapa={etapaVista}
          etapaActual={datos.proceso.etapa}
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
          ) : actividadSeleccionada?.numeral === NUMERAL_ADENDAS ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelAdendas
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_OFERTAS ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelOfertas
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_COMITE ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelComite
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_EVALUACION ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelEvaluacion
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada &&
            NUMERALES_TRASLADO.includes(actividadSeleccionada.numeral) ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelTraslado
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada &&
            NUMERALES_ADJUDICACION.includes(actividadSeleccionada.numeral) ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelAdjudicacion
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_ARCHIVO_EXPEDIENTE ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelArchivoExpediente
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_CIERRE_FINANCIERO ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelCierreFinanciero
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_LIQUIDACION ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelLiquidacion
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_INFORME_FINAL ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelInformeFinal
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_MODIFICACIONES ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelModificaciones
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_PAGOS ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelPagos
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_ACTA_INICIO ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelActaInicio
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_PUBLICACION_CONTRATO ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelPublicacionContrato
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_RP ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelRegistroPresupuestal
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_SUPERVISOR ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelSupervision
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_SEGUIMIENTO ? (
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
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <PanelSeguimiento
                  procesoId={procesoId}
                  onCambio={() => setTokenExpediente((t) => t + 1)}
                />
              </div>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <PanelIncumplimiento
                  procesoId={procesoId}
                  onCambio={() => setTokenExpediente((t) => t + 1)}
                />
              </div>
            </div>
          ) : actividadSeleccionada &&
            NUMERALES_CON_REGISTRO.includes(actividadSeleccionada.numeral) ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelRegistroActividad
                procesoId={procesoId}
                numeral={actividadSeleccionada.numeral}
                nombre={ACTIVIDADES_CON_REGISTRO[actividadSeleccionada.numeral]}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_GARANTIAS ||
            actividadSeleccionada?.numeral === NUMERAL_ARL ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelLegalizacion
                procesoId={procesoId}
                numeral={actividadSeleccionada.numeral as '8.4' | '8.5'}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_CONTRATO ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelContrato
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_RIESGOS ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelAudienciaRiesgos
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_APERTURA ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelApertura
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_DOCUMENTOS ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelDocumentosProceso
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_PUBLICACION ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelPublicacionPliego
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_OBSERVACIONES ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelObservaciones
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            </div>
          ) : actividadSeleccionada?.numeral === NUMERAL_MIPYME ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <PanelMipyme
                procesoId={procesoId}
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
                {actividadSeleccionada ? actividadSeleccionada.nombre : 'Elige una actividad'}
              </p>
              <p className="text-xs text-gray-400 m-0 mt-1">
                {actividadSeleccionada
                  ? 'Esta actividad aún no está habilitada en la plataforma.'
                  : 'Selecciona una actividad del panel izquierdo para trabajar en ella.'}
              </p>
            </div>
          )}

          {/* Los documentos que la actividad dejó en el expediente.
              Va aquí y no dentro de cada panel porque los quince paneles no
              conocen su propio numeral, y este sitio sí sabe cuál está abierta:
              montarlo una vez evita repetirlo en todos y que se olvide en los
              que vengan después. */}
          {actividadSeleccionada ? (
            <DocumentosActividad
              procesoId={procesoId}
              numeral={actividadSeleccionada.numeral}
              recargarToken={tokenExpediente}
            />
          ) : null}
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
