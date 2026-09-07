import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, FolderOpen, ClipboardList, ShieldCheck } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { ActividadProceso, EstudioPrevio } from '../../types';
import { AvanceEtapa, LineaDeTiempoEtapas } from './Etapas';
import { ActividadEtapa } from './ListaActividades';
import { estadoDeActividad } from './estadoActividad';
import {
  actividadesDisponibles,
  motivoDelBloqueo,
  PasoDelFlujo,
} from './secuenciaActividades';
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
import { DocumentosDeLaActividad } from '../shared/DocumentosDeLaActividad';
import { AprobacionDeLaActividad } from '../shared/AprobacionDeLaActividad';
import { BurbujaDecision } from '../shared/BurbujaDecision';
import { EncabezadoActividad } from '../shared/PiezasPanel';
import { PanelAuditoria } from '../auditoria/PanelAuditoria';

/** Actividades del ciclo del CDP; se trabajan desde el panel de la etapa 4. */
const NUMERALES_CDP = ['4.1', '4.2', '4.3', '4.4'];

/**
 * Actividades cuyo panel ya reparte sus formatos documento por documento.
 * El bloque genérico se salta ambas para no duplicarlos.
 */
const NUMERALES_CON_FORMATOS_PROPIOS = ['3.1', '5.1'];

/**
 * Actividades cuyo panel ya tiene su propio ciclo de aprobación.
 *
 * Solo el estudio previo: es la única que además de aprobarse a sí misma
 * escribe en `proceso_actividades.estado`, el mismo sitio donde el trámite
 * genérico guarda el suyo. Montar los dos dejaría al gestor con dos bloques
 * pidiéndole lo mismo sobre un único estado, y a la primera decisión el otro
 * se quedaría diciendo algo falso.
 *
 * Las garantías y las modificaciones no entran aquí aunque también aprueban:
 * lo suyo es cada póliza y cada modificación por separado, no la actividad, y
 * conviven sin pisarse.
 */
const NUMERALES_CON_APROBACION_PROPIA = ['3.1'];

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

/**
 * Acta de inicio, cuando el contrato la pactó (EFDS-1167), actividad 8.7.
 *
 * La matriz nombra el acta dos veces: aquí, al cerrar la legalización, y en la
 * 9.1 como «reunión de inicio». Es un solo hecho y un solo registro —una sola
 * acta por contrato—, así que las dos casillas abren el mismo panel en vez de
 * duplicar el trámite. Se llegue por donde se llegue, lo que se ve es el
 * estado del acta de ese contrato.
 */
const NUMERAL_ACTA_INICIO_LEGALIZACION = '8.7';

/** Publicación del contrato dentro del plazo legal (EFDS-1166). */
const NUMERAL_PUBLICACION_CONTRATO = '8.8';

/** Las de la etapa 8 que ya tienen panel. Misma razón que la lista anterior. */
const NUMERALES_ETAPA_8 = [
  NUMERAL_CONTRATO,
  NUMERAL_SUPERVISOR,
  NUMERAL_RP,
  NUMERAL_GARANTIAS,
  NUMERAL_ARL,
  NUMERAL_ACTA_INICIO_LEGALIZACION,
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

/**
 * Reasignación de supervisión (EFDS-1169), actividad 9.3.
 *
 * No tiene panel propio: comparte el de la 8.2, que es donde se reasigna desde
 * que la historia se cerró. Reasignar *es* designar otra vez —el mismo
 * ordenador del gasto, el mismo acto administrativo—, y lo que la matriz
 * separa en dos numerales es cuándo ocurre: la 8.2 antes de arrancar y la 9.3
 * «en cualquier momento durante la ejecución». Mismo criterio que los cuatro
 * numerales del CDP contra un solo `PanelCdp`.
 *
 * Sin esto la actividad salía con candado y «Pendiente de desarrollo», que era
 * falso: lo construido no se podía alcanzar desde la etapa donde ocurre.
 */
const NUMERAL_REASIGNACION = '9.3';

const NUMERALES_ETAPA_9 = [
  NUMERAL_ACTA_INICIO,
  NUMERAL_SEGUIMIENTO,
  NUMERAL_REASIGNACION,
  NUMERAL_PAGOS,
  NUMERAL_MODIFICACIONES,
];

/** Los dos numerales que trabajan la supervisión: designarla y reasignarla. */
const NUMERALES_SUPERVISION = [NUMERAL_SUPERVISOR, NUMERAL_REASIGNACION];

/** Los dos numerales desde los que se llega al acta de inicio del contrato. */
const NUMERALES_ACTA_INICIO = [NUMERAL_ACTA_INICIO_LEGALIZACION, NUMERAL_ACTA_INICIO];

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
 * Las catorce actividades de la matriz que ninguna historia recogió
 * (migraciones 051 y 059).
 *
 * No tienen trámite propio en la plataforma —el sorteo se hace en la Dirección
 * de Contratación, la subasta en SECOP II, la radicación en Active Document—,
 * así que se cumplen dejando constancia. Comparten un solo panel: lo que las
 * distingue no cambia lo que el expediente necesita de ellas.
 *
 * La 3.6, la 3.7 y la 8.6 llegaron después, con la 059: estaban en la misma
 * situación que las once y se habían quedado fuera de la cuenta, saliendo con
 * candado en el riel.
 */
const ACTIVIDADES_CON_REGISTRO: Record<string, string> = {
  '3.2': 'Análisis del sector y estudio de mercado',
  '3.3': 'Radicación en la Dirección de Contratación',
  '3.4': 'Revisión y reparto',
  '3.5': 'Definir modalidad de contratación',
  '3.6': 'Causal de contratación',
  '3.7': 'Comité de contratación',
  '5.9': 'Manifestación de interés',
  '5.10': 'Sorteo',
  '5.11': 'Publicación de la manifestación de interés',
  '6.7': 'Informe previo a la audiencia de adjudicación',
  '6.8': 'Informe previo al evento de subasta',
  '6.9': 'Apertura del sobre económico previo a la subasta',
  '6.10': 'Evento de subasta',
  '8.6': 'Comunicación de inicio',
};

const NUMERALES_CON_REGISTRO = Object.keys(ACTIVIDADES_CON_REGISTRO);

/**
 * Si la plataforma tiene panel para trabajar la actividad.
 *
 * La secuencia lo necesita para no trancar el flujo con una actividad que
 * nadie puede terminar: las que aún no se han construido se saltan, igual que
 * las que la modalidad excluye. Cuando estén las sesenta y tres, esto devuelve
 * siempre true y la excepción sobra.
 */
const TIENEN_PANEL = (numeral: string): boolean =>
  numeral === '3.1' ||
  NUMERALES_CDP.includes(numeral) ||
  NUMERALES_ETAPA_5.includes(numeral) ||
  NUMERALES_ETAPA_6.includes(numeral) ||
  NUMERALES_ADJUDICACION.includes(numeral) ||
  NUMERALES_ETAPA_8.includes(numeral) ||
  NUMERALES_ETAPA_9.includes(numeral) ||
  NUMERALES_ETAPA_10.includes(numeral) ||
  NUMERALES_CON_REGISTRO.includes(numeral);

/**
 * La actividad por la que va el proceso: la primera disponible sin aprobar.
 *
 * Al entrar por «Ver etapa» nadie decía cuál abrir y la pantalla recibía al
 * gestor con «Elige una actividad», obligándole a buscar en el riel el punto
 * al que el proceso ya había llegado —un dato que la propia pantalla conoce.
 *
 * Vive fuera del componente y recibe lo que necesita porque tiene que poder
 * calcularse antes de pintar nada: la actividad que se abre sola se decide en
 * un efecto, y un efecto no puede colgar de que los datos ya hayan llegado.
 * Aplica la misma regla que el riel, con los mismos ayudantes, para que no
 * abra una actividad que el riel muestra bloqueada.
 */
export const actividadEnCurso = (
  catalogo: any[],
  estadoDelEstudio: string,
): string | null => {
  if (catalogo.length === 0) return null;

  const flujo: PasoDelFlujo[] = catalogo.map((act: any) => ({
    numeral: act.numeral,
    estado: act.numeral === '3.1' ? estadoDelEstudio : act.estado,
    aplica: act.aplica !== false,
    construida: TIENEN_PANEL(act.numeral),
  }));
  const disponibles = actividadesDisponibles(flujo);

  for (const act of catalogo) {
    if (!TIENEN_PANEL(act.numeral)) continue;
    if (act.numeral === '3.1') {
      if (estadoDelEstudio !== 'APROBADO') return '3.1';
      continue;
    }
    const aplica = act.aplica !== false;
    if (!aplica || !disponibles.has(act.numeral)) continue;
    if (estadoDeActividad(aplica, act.estado, true) !== 'aprobada') return act.numeral;
  }
  return null;
};

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
  /**
   * Si ya se abrió la actividad en curso al entrar.
   *
   * Se hace una sola vez y no cada vez que llegan datos: si se repitiera, el
   * riel volvería a saltar a la actividad en curso cada vez que el expediente
   * se refresca, deshaciendo lo que el gestor acabara de elegir.
   */
  const [abiertaLaPrimera, setAbiertaLaPrimera] = useState(false);
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
  /**
   * Formatos requeridos sin cargar en la actividad abierta.
   *
   * Lo cuenta el bloque de documentos y lo necesita la decisión, que está en
   * otra franja: sin el dato, Aprobar quedaba activo aunque la lista de arriba
   * dijera «Falta 1 de 1».
   */
  const [faltanFormatos, setFaltanFormatos] = useState(0);
  /**
   * Si la actividad abierta espera una decisión de quien está mirando.
   *
   * Lo dice la propia pieza de aprobación, que es la que conoce el estado y el
   * rol. El contenedor solo necesita el sí o el no para abrir la columna: sin
   * el dato reservaría 17rem en las actividades que nadie tiene que aprobar.
   */
  const [hayDecision, setHayDecision] = useState(false);

  /**
   * Si la actividad abierta tiene aprobadores configurados.
   *
   * Lo dice el bloque de aprobacion, que ya lo consulta, y lo necesita el
   * panel de trabajo para nombrar su boton: donde alguien revisa, registrar
   * envia a aprobacion en vez de cerrar.
   */
  const [pideAprobacion, setPideAprobacion] = useState(false);
  /**
   * La decisión apartada a la burbuja, por voluntad de quien mira.
   *
   * Se guarda por numeral y no como un booleano suelto: esconderla en una
   * actividad no debe esconderla en la siguiente, que es otra decisión y otro
   * expediente.
   */
  const [decisionEscondida, setDecisionEscondida] = useState<string | null>(null);
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

  // Se abre sola al entrar, no en cada refresco: una vez el gestor ha elegido,
  // mandar la pantalla de vuelta a la actividad en curso sería quitarle lo que
  // estaba mirando. Va aquí arriba, con el resto de los efectos y antes de las
  // salidas tempranas, porque un hook que solo corre cuando ya hay datos
  // cambia el número de hooks entre renders y React rompe la pantalla.
  useEffect(() => {
    if (abiertaLaPrimera || expandida || !datos) return;
    const enCurso = actividadEnCurso(catalogo, datos.estado);
    if (!enCurso) return;
    setAbiertaLaPrimera(true);
    setExpandida(enCurso);
  }, [abiertaLaPrimera, expandida, datos, catalogo]);

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
  const catalogoDelProceso: any[] = catalogo.length > 0 ? catalogo : ACTIVIDADES_ETAPA_3;

  /*
   * La secuencia del flujo, calculada una vez sobre el catálogo completo.
   *
   * El catálogo llega ordenado por etapa y orden, que es el orden de la
   * matriz, así que recorrerlo tal cual basta para saber hasta dónde puede
   * llegar el gestor. Se hace antes del map porque saber si la 4.1 está
   * disponible exige haber mirado todo lo que viene antes, incluidas las
   * etapas anteriores.
   */
  const flujo: PasoDelFlujo[] = catalogoDelProceso.map((act: any) => ({
    numeral: act.numeral,
    // La 3.1 no vive en `proceso_actividades` como las demás: su estado es el
    // del estudio previo, que es lo que esta pantalla ya venía mostrando.
    estado: act.numeral === '3.1' ? datos.estado : act.estado,
    aplica: act.aplica !== false,
    construida: TIENEN_PANEL(act.numeral),
  }));

  const disponibles = actividadesDisponibles(flujo);

  const delCatalogo: ActividadEtapa[] = catalogoDelProceso.map(
    (act: any) => {
      const adjuntos = adjuntosPorNumeral[act.numeral] ?? 0;
      const aplica = act.aplica !== false;

      if (act.numeral === '3.1') {
        return {
          ...act,
          estado: aprobado ? 'aprobada' : 'en_curso',
          detalle: detalle31(),
          // La primera del flujo: no hay nada antes que pueda bloquearla.
          disponible: true,
          adjuntos,
        };
      }
      // Las actividades del CDP se trabajan aquí desde EFDS-1148, la
      // publicación del pliego desde EFDS-1150 y las observaciones y la
      // limitación a MIPYME desde EFDS-1151. Se tratan igual: el riel las
      // habilita cuando la matriz las marca aplicables a la modalidad y la
      // secuencia ya llegó hasta ellas.
      if (TIENEN_PANEL(act.numeral)) {
        const alcanzada = disponibles.has(act.numeral);

        // `no_aplica` y no `pendiente`: es lo que el riel tacha, y lo que hace
        // que no cuente en el avance de la etapa. Poniendo `pendiente` —como
        // se hacía— una actividad que la modalidad excluye se veía igual que
        // una que está por hacer, y el contador la exigía para llegar al 100%.
        return {
          ...act,
          // Antes se daba por en curso todo lo aplicable, así que el riel
          // encendía en azul las nueve actividades de las etapas 4 y 5 desde el
          // minuto uno y el color dejaba de informar.
          estado: estadoDeActividad(aplica, act.estado, alcanzada),
          disponible: aplica && alcanzada,
          detalle: !aplica
            ? 'No aplica a esta modalidad'
            : // Un candado sin explicación se lee como un fallo: decir cuál es
              // la actividad que falta lo convierte en una instrucción.
              (alcanzada ? undefined : motivoDelBloqueo(act.numeral, flujo) ?? undefined),
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
  // `numeric` puede llegar como string desde el driver, así que un
  // `typeof === 'number'` dejaba fuera valores que sí existen y la ficha
  // mostraba «Valor estimado $» con el importe en blanco.
  const valorEstimado =
    datos.proceso.valorEstimado === null || datos.proceso.valorEstimado === undefined
      ? null
      : Number(datos.proceso.valorEstimado);

  const ficha = [
    datos.proceso.expediente ? `Expediente ${datos.proceso.expediente}` : null,
    valorEstimado !== null && Number.isFinite(valorEstimado)
      ? `Valor estimado ${formatoPesos.format(valorEstimado)}`
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
                control interno y gestión legal.

                Con flex y no `grid place-items-center`: el CSS del shell viene
                precompilado y solo trae las utilidades que él usa, así que
                `place-items-center` no aplicaba y el icono quedaba pegado a la
                esquina en vez de centrado. Es el mismo motivo por el que la
                trazabilidad lleva sus anchos en `style`. */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003DA5] to-[#0051D5] flex items-center justify-center flex-shrink-0 shadow-md">
              <FileText className="w-5 h-5 text-white" aria-hidden="true" />
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
      {/* `con-decision` abre la tercera columna solo cuando hay algo que
          resolver y nadie la ha apartado: en las demás actividades ese ancho
          se lo queda el formulario, que es quien lo necesita.

          Dónde acaba cayendo la tarjeta lo decide `layout.css` según el ancho
          disponible: columna propia con sitio, o franja completa al final
          cuando el expediente ya ocupa la tercera. */}
      <div
        className={`detalle-proceso ${expedienteAbierto ? 'con-expediente' : ''} ${
          hayDecision && decisionEscondida !== expandida ? 'con-decision' : ''
        }`}
      >
        <RielActividades
          etapa={etapaVista}
          etapaActual={datos.proceso.etapa}
          actividades={actividades}
          seleccionada={expandida}
          onSeleccionar={(numeral) => {
            // Volver a pulsar la actividad abierta no reinicia nada: el riel
            // no deselecciona, así que sería apagar la columna sin que nadie
            // vuelva a encenderla —la pieza de aprobación no se remonta y no
            // repite el aviso—, y la tarjeta caía al final del flujo.
            if (numeral === expandida) return;

            // Al cambiar de actividad sí: el contador de formatos y la
            // decisión son de la anterior, y arrastrarlos bloquearía o abriría
            // esta por documentos que no son suyos.
            setFaltanFormatos(0);
            setHayDecision(false);
            setPideAprobacion(false);
            setExpandida(numeral);
          }}
        />

        <div className="min-w-0">
          {/* La aprobación va encima porque decide si el panel de abajo sirve
              de algo: sin visto bueno la actividad no se cierra. Los documentos
              van después del panel, que es donde se trabaja. */}
          {actividadSeleccionada &&
          !NUMERALES_CON_APROBACION_PROPIA.includes(actividadSeleccionada.numeral) ? (
            <AprobacionDeLaActividad
              procesoId={procesoId}
              numeral={actividadSeleccionada.numeral}
              onCambio={() => setTokenExpediente((t) => t + 1)}
              parte="aviso"
              onRequiereAprobacion={setPideAprobacion}
            />
          ) : null}

          {/* El marco y el encabezado los pinta el contenedor, una sola vez y
              para las sesenta y tres actividades: es la unica forma de que la
              pantalla no cambie de forma segun que panel se abra. El panel de
              abajo solo aporta el cuerpo.

              El encabezado va aqui y no en cada panel porque `DetalleProceso`
              es quien conoce el numeral y el nombre; los paneles no, y por eso
              una actividad bloqueada abria diciendo solo «Pendiente del paso
              4.2», sin decir de cual actividad hablaba. */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            {actividadSeleccionada ? (
              <EncabezadoActividad
                numeral={actividadSeleccionada.numeral}
                nombre={actividadSeleccionada.nombre}
              />
            ) : null}

            {actividadSeleccionada && NUMERALES_CDP.includes(actividadSeleccionada.numeral) ? (
              <PanelCdp
                numeral={actividadSeleccionada.numeral}
                procesoId={procesoId}
                valorEstimado={datos.proceso.valorEstimado}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_ADENDAS ? (
              <PanelAdendas
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_OFERTAS ? (
              <PanelOfertas
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_COMITE ? (
              <PanelComite
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_EVALUACION ? (
              <PanelEvaluacion
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada &&
              NUMERALES_TRASLADO.includes(actividadSeleccionada.numeral) ? (
              <PanelTraslado
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada &&
              NUMERALES_ADJUDICACION.includes(actividadSeleccionada.numeral) ? (
              <PanelAdjudicacion
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_ARCHIVO_EXPEDIENTE ? (
              <PanelArchivoExpediente
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_CIERRE_FINANCIERO ? (
              <PanelCierreFinanciero
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_LIQUIDACION ? (
              <PanelLiquidacion
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_INFORME_FINAL ? (
              <PanelInformeFinal
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_MODIFICACIONES ? (
              <PanelModificaciones
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_PAGOS ? (
              <PanelPagos
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada &&
              NUMERALES_ACTA_INICIO.includes(actividadSeleccionada.numeral) ? (
              <PanelActaInicio
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_PUBLICACION_CONTRATO ? (
              <PanelPublicacionContrato
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_RP ? (
              <PanelRegistroPresupuestal
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada &&
              NUMERALES_SUPERVISION.includes(actividadSeleccionada.numeral) ? (
              <PanelSupervision
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
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
                <PanelSeguimiento
                  procesoId={procesoId}
                  onCambio={() => setTokenExpediente((t) => t + 1)}
                />
                <PanelIncumplimiento
                  procesoId={procesoId}
                  onCambio={() => setTokenExpediente((t) => t + 1)}
                />
              </div>
            ) : actividadSeleccionada &&
              NUMERALES_CON_REGISTRO.includes(actividadSeleccionada.numeral) ? (
              <PanelRegistroActividad
                procesoId={procesoId}
                numeral={actividadSeleccionada.numeral}
                onCambio={() => setTokenExpediente((t) => t + 1)}
                requiereAprobacion={pideAprobacion}
                /* Donde el bloque de documentos recibe el soporte, cargarlo
                   ahi es lo que desbloquea el boton de registrar: sin este
                   token el formulario no se enteraba. */
                recargarToken={tokenExpediente}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_GARANTIAS ||
              actividadSeleccionada?.numeral === NUMERAL_ARL ? (
              <PanelLegalizacion
                procesoId={procesoId}
                numeral={actividadSeleccionada.numeral as '8.4' | '8.5'}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_CONTRATO ? (
              <PanelContrato
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_RIESGOS ? (
              <PanelAudienciaRiesgos
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_APERTURA ? (
              <PanelApertura
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_DOCUMENTOS ? (
              <PanelDocumentosProceso
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_PUBLICACION ? (
              <PanelPublicacionPliego
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_OBSERVACIONES ? (
              <PanelObservaciones
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === NUMERAL_MIPYME ? (
              <PanelMipyme
                procesoId={procesoId}
                onCambio={() => setTokenExpediente((t) => t + 1)}
              />
            ) : actividadSeleccionada?.numeral === '3.1' ? (
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
            ) : (
              /* El riel deja pulsar solo lo disponible, pero al entrar sin
                 actividad elegida hay que decir qué hacer. Sin marco propio:
                 el del contenedor ya lo envuelve. */
              <div className="p-10 text-center">
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
          </div>

          {/* Los documentos que la actividad entrega, debajo del panel: primero
              se trabaja, después se adjunta.

              Un solo bloque, con los formatos requeridos y lo demás que quedó
              en el expediente como dos secciones dentro del mismo marco. Antes
              eran dos componentes apilados con estilos distintos, y había que
              deducir cuál lista era cuál.

              Donde el panel ya reparte sus formatos —3.1 y 5.1— se monta en
              modo `soloExpediente`, para listar lo demás sin duplicarlos. */}
          {actividadSeleccionada ? (
            <div className="mt-3">
              <DocumentosDeLaActividad
                procesoId={procesoId}
                numeral={actividadSeleccionada.numeral}
                recargarToken={tokenExpediente}
                soloExpediente={NUMERALES_CON_FORMATOS_PROPIOS.includes(
                  actividadSeleccionada.numeral,
                )}
                onCambio={() => setTokenExpediente((t) => t + 1)}
                onFaltantes={setFaltanFormatos}
              />
            </div>
          ) : null}

        </div>

        {/* La decisión, en columna propia y a la altura del trabajo.
            Aprobar o devolver es el acto que cierra la actividad, no un
            documento más: dentro de la caja de adjuntos, bajo «Adjuntar otro
            documento», se leía como un anexo. Y al final de la pila vertical
            había que buscarla con desplazamiento, justo lo que el aprobador
            viene a hacer.

            Se monta aunque esté escondida: es la pieza la que sabe si hay algo
            que decidir, y el contenedor lo necesita para pintar la burbuja. */}
        {actividadSeleccionada &&
        !NUMERALES_CON_APROBACION_PROPIA.includes(actividadSeleccionada.numeral) ? (
          <div
            className="panel-decision"
            hidden={decisionEscondida === actividadSeleccionada.numeral}
          >
            <AprobacionDeLaActividad
              procesoId={procesoId}
              numeral={actividadSeleccionada.numeral}
              onCambio={() => setTokenExpediente((t) => t + 1)}
              parte="decision"
              faltanDocumentos={faltanFormatos}
              onHayDecision={setHayDecision}
              onEsconder={() => setDecisionEscondida(actividadSeleccionada.numeral)}
            />
          </div>
        ) : null}

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

      {/* La decisión apartada no desaparece: queda como burbuja, que dice que
          sigue pendiente y la devuelve de un clic. Sin ella, esconder la
          tarjeta sería una forma de perder de vista lo que hay que resolver. */}
      {hayDecision && actividadSeleccionada && decisionEscondida === actividadSeleccionada.numeral ? (
        <BurbujaDecision
          numeral={actividadSeleccionada.numeral}
          faltanDocumentos={faltanFormatos}
          onAbrir={() => setDecisionEscondida(null)}
        />
      ) : null}
    </div>
  );
}
