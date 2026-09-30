import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FilePen,
  FileText,
  FolderOpen,
  ClipboardList,
  ListChecks,
  ShieldCheck,
} from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { ActividadProceso, EstadoParticipacion, EstudioPrevio } from '../../types';
import { AvanceEtapa, LineaDeTiempoEtapas } from './Etapas';
import { ActividadEtapa } from './ListaActividades';
import { estadoDeActividad } from './estadoActividad';
import {
  actividadesDisponibles,
  motivoDelBloqueo,
  NUNCA_BLOQUEA,
  PasoDelFlujo,
} from './secuenciaActividades';
import { RielActividades } from './RielActividades';
import { PanelDeLaActividad } from './PanelDeLaActividad';
import {
  ACTIVIDADES_CON_REGISTRO,
  ETAPAS_DE_LA_FINANCIERA,
  NUMERAL_MODIFICACIONES,
  NUMERAL_REVISION,
  NUMERALES_CON_APROBACION_PROPIA,
  NUMERALES_CON_LISTA_PROPIA,
  TIENEN_PANEL,
} from './actividadesConPanel';
import { etapaEnCurso } from '../procesos/etapaEnCurso';
import { PanelExpediente } from '../estudio-previo/PanelExpediente';
import { ListaDeDocumentos } from '../shared/ListaDeDocumentos';
import { AprobacionDeLaActividad } from '../shared/AprobacionDeLaActividad';
import { EncabezadoActividad } from '../shared/PiezasPanel';
import { AvisoSoloLectura, SoloLectura } from '../shared/SoloLectura';
import { LugarDeDecision } from '../shared/LugarDeDecision';
import { Modal } from '../shared/Modal';
import { PanelAuditoria } from '../auditoria/PanelAuditoria';
import { esSoloPresupuesto, useAlcance } from '../../auth/alcance';
import { useResponsables } from '../../auth/responsables';
import { EntradaSituacion, situacionDelProceso } from './situacionDelProceso';
import { FranjaSituacion } from './FranjaSituacion';
import { FichaDelProceso } from './FichaDelProceso';
import { usePlazos } from '../../hooks/usePlazos';

/**
 * Las 7 actividades de la etapa 3 (matriz de flujo, anexo A2).
 *
 * Solo se usa si la consulta del catálogo falla: el riel no puede quedarse
 * vacío por eso. Se había quedado en seis y con la 3.6 nombrada «Comité de
 * contratación», que es el nombre de la 3.7 desde que la matriz completa
 * aplanó la 3.5.1 a 3.6. Un respaldo que miente sobre el numeral es peor que
 * no tenerlo: abre el panel de la causal con el título del comité.
 */
const ACTIVIDADES_ETAPA_3 = [
  {
    numeral: '3.1',
    etapa: 3,
    nombre: 'Elaboración de estudios previos, análisis del sector y estudio de mercado',
    descripcion:
      'Descripción de la necesidad, fundamento jurídico y modalidad propuesta, con el análisis del sector y el estudio de mercado',
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
    nombre: 'Causal de contratación',
    descripcion: 'Filtro según la modalidad (Ley 1150 de 2007, art. 2)',
  },
  {
    numeral: '3.7',
    etapa: 3,
    nombre: 'Comité de contratación',
    descripcion: 'Revisa, observa o aprueba los documentos del proceso',
  },
];

/**
 * La actividad por la que va el proceso: la primera disponible sin aprobar.
 *
 * Al entrar por «Ver etapa» nadie decía cuál abrir y la pantalla recibía al
 * gestor con «Elige una actividad», obligándole a buscar en el riel el punto
 * al que el proceso ya había llegado —un dato que la propia pantalla conoce.
 *
 * **Lo que espera decisión ajena no cuenta como el punto del proceso**
 * (EFDS-1183). Un estudio previo enviado está esperando a que alguien lo
 * revise: para quien lo mandó no hay nada que hacer ahí, y para la Dirección
 * que acaba de recibirlo, tampoco —lo suyo es hacerse cargo—. Abrir la 3.1 le
 * ponía delante un formulario bloqueado en vez de la única acción disponible.
 *
 * Vive fuera del componente y recibe lo que necesita porque tiene que poder
 * calcularse antes de pintar nada: la actividad que se abre sola se decide en
 * un efecto, y un efecto no puede colgar de que los datos ya hayan llegado.
 * Aplica la misma regla que el riel, con los mismos ayudantes, para que no
 * abra una actividad que el riel muestra bloqueada.
 */
/**
 * La actividad que alguien reabrió, si la hay.
 *
 * `DEVUELTO` es el único estado que pide volver atrás: el comité aprueba la
 * 3.7 y de paso reabre la 3.1 para que se la validen, y a partir de ahí lo que
 * sigue no es lo que viene después en la matriz, es esa. La guía del paso
 * siguiente solo miraba hacia adelante, así que saltaba por encima y mandaba a
 * la etapa 4.
 *
 * Fuera del componente para poder fijar la regla sin montar la pantalla.
 */
export const actividadReabierta = (flujo: PasoDelFlujo[]): PasoDelFlujo | null =>
  flujo.find((p) => p.aplica && p.construida && p.estado === 'DEVUELTO') ?? null;

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
      // Enviado y esperando: el proceso ya no está aquí, está en manos de quien
      // tiene que recibirlo y decidir. Se sigue buscando.
      if (estadoDelEstudio === 'EN_REVISION') continue;
      if (estadoDelEstudio !== 'APROBADO') return '3.1';
      continue;
    }

    // La 9.2 nunca llega a "aprobada" mientras el contrato se ejecuta (dura
    // toda la vigencia): tratarla como pendiente la dejaría fija como "la
    // actividad en curso" para siempre, sin dejar ver qué más falta de verdad.
    if (NUNCA_BLOQUEA.has(act.numeral)) continue;

    const aplica = act.aplica !== false;
    if (!aplica || !disponibles.has(act.numeral)) continue;
    if (estadoDeActividad(aplica, act.estado, true) !== 'aprobada') return act.numeral;
  }

  /**
   * Si todo lo disponible está esperando decisión, se abre el estudio previo.
   *
   * Es el caso del abogado: no tiene nada que trabajar, pero sí algo que
   * resolver, y es ahí donde se resuelve.
   */
  return estadoDelEstudio === 'EN_REVISION' ? '3.1' : null;
};

export { ACTIVIDADES_CON_REGISTRO, TIENEN_PANEL };

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
  /**
   * Lleva a la pantalla de revisión de esa actividad.
   *
   * Quien tiene que decidir no decide sobre el formulario de quien redactó:
   * desde aquí se le ofrece abrir la revisión.
   */
  onRevisar?: (numeral: string) => void;
  /** A dónde lleva «volver»: el listado o «Mi trabajo». */
  volverA?: string;
}

export function DetalleProceso({
  procesoId,
  onVolver,
  actividadInicial = null,
  onRevisar,
  volverA = 'Procesos',
}: Props) {
  const [datos, setDatos] = useState<EstudioPrevio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandida, setExpandida] = useState<string | null>(actividadInicial);
  /**
   * Seguir el proceso o trabajar una actividad (reestructuración del flujo).
   *
   * Se entra por la ficha, que dice cómo va y quién sigue. Quien llega a hacer
   * algo concreto —desde «Mi trabajo», una alerta o la franja— entra directo a
   * trabajar esa actividad.
   */
  const [vista, setVista] = useState<'seguimiento' | 'trabajo'>(
    actividadInicial ? 'trabajo' : 'seguimiento',
  );
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
  /**
   * Quien solo mueve presupuesto ve el recorrido recortado a lo suyo.
   *
   * Se decide por lo que *no* tiene, igual que la sección de entrada: alguien
   * que además diligencie procesos ve las diez, porque entonces las diez son su
   * trabajo. Mientras el alcance no llega responde que no, así que la duda cae
   * del lado de enseñarlo todo.
   */
  const { puede, cargado: alcanceCargado } = useAlcance();
  const soloPresupuesto = esSoloPresupuesto(puede);
  /** Qué roles responden por cada punto, para decir a quién le toca. */
  const responsables = useResponsables();
  /**
   * Quién lleva el proceso: la Dirección, el abogado y la Financiera.
   *
   * Nulo mientras llega o si no se pudo leer: la franja cae entonces a los
   * roles, que es menos preciso pero no dice nada falso.
   */
  const [participacion, setParticipacion] = useState<EstadoParticipacion | null>(null);
  /**
   * Y puede pedir el proceso entero.
   *
   * No es un adorno: para certificar la disponibilidad hay que poder leer el
   * estudio previo que justifica el gasto, y eso vive en la etapa 3. El recorte
   * ahorra el ruido de nueve etapas ajenas; esconderlas del todo le quitaría el
   * expediente que necesita para decidir.
   */
  const [verTodasLasEtapas, setVerTodasLasEtapas] = useState(false);
  const recortado = soloPresupuesto && !verTodasLasEtapas;
  /** Actividades de la etapa, con su estado. Vacío mientras carga o si falla. */
  const [catalogo, setCatalogo] = useState<ActividadProceso[]>([]);
  const [tokenExpediente, setTokenExpediente] = useState(0);
  /** Los plazos que aprietan, releídos cuando algo cambia en el expediente. */
  const plazos = usePlazos(tokenExpediente);

  /**
   * Si la actividad abierta tiene aprobadores configurados.
   *
   * Lo dice el bloque de aprobacion, que ya lo consulta, y lo necesita el
   * panel de trabajo para nombrar su boton: donde alguien revisa, registrar
   * envia a aprobacion en vez de cerrar.
   */
  const [pideAprobacion, setPideAprobacion] = useState(false);
  /** Si la aprobacion la devolvio: el panel de abajo no la consulta y sin esto
      le seguia mostrando «Registrada» sin camino para corregirla. */
  const [fueDevuelta, setFueDevuelta] = useState(false);
  /** Documentos por numeral, para mostrar el contador en cada actividad. */
  const [adjuntosPorNumeral, setAdjuntosPorNumeral] = useState<Record<string, number>>({});
  /**
   * Lo que se avisa al gestor justo después de enviar una actividad.
   *
   * Modal y no una notificación de esquina: la primera versión usaba un toast
   * y no se notaba —el gestor seguía sin saber qué hacer después—. Aquí hay
   * que pararse a leer y elegir, así que se pone en medio de la pantalla y con
   * el botón que da el siguiente paso, en vez de avanzar solo.
   */
  const [avisoPaso, setAvisoPaso] = useState<
    | { tipo: 'revision' }
    | { tipo: 'fin' }
    | { tipo: 'bloqueado'; motivo: string }
    | { tipo: 'siguiente'; numeral: string; nombre: string }
    | { tipo: 'reabierta'; numeral: string; nombre: string }
    | null
  >(null);

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

  /** El estado de la actividad abierta la última vez que se revisó, para notar cuándo avanza. */
  const avanceRef = useRef<{ numeral: string; estado: string | null | undefined } | null>(null);

  /**
   * Avisa a dónde sigue el proceso justo después de enviar una actividad.
   *
   * El módulo se sentía pesado porque enviar algo no decía qué pasaba después:
   * tocaba ir al riel a averiguar si ya se podía seguir o a quién le tocaba
   * ahora. Se detecta comparando el estado de la actividad abierta contra el
   * que tenía la vez anterior que este efecto corrió —no cada carga de
   * `tokenExpediente`, que también sube al subir un adjunto que no cierra
   * nada— y solo cuando avanza a `EN_REVISION` o `APROBADO`.
   *
   * Va con los demás hooks, antes del `if (cargando)` de más abajo: el resto
   * de esta función deja de llamar hooks después de esa condición, así que
   * reconstruye del `catalogo` y `datos` lo mismo que el cuerpo del componente
   * arma más abajo como `flujo`, en vez de depender de esa variable.
   */
  useEffect(() => {
    if (!expandida) {
      avanceRef.current = null;
      return;
    }

    const flujoActual: PasoDelFlujo[] = (catalogo.length > 0 ? catalogo : ACTIVIDADES_ETAPA_3)
      .filter((act: any) => act.numeral !== NUMERAL_REVISION)
      .map((act: any) => ({
        numeral: act.numeral,
        // La 3.1 no vive en `proceso_actividades`: su estado es el del estudio
        // previo, igual que en el `flujo` que arma el resto del componente.
        estado: act.numeral === '3.1' ? (datos?.estado ?? null) : act.estado,
        aplica: act.aplica !== false,
        construida: TIENEN_PANEL(act.numeral),
      }));

    const actual = flujoActual.find((p) => p.numeral === expandida) ?? null;
    const anterior = avanceRef.current;
    avanceRef.current = actual ? { numeral: actual.numeral, estado: actual.estado } : null;

    // Sin base de comparación, o se cambió de actividad sin enviar nada: no
    // hay avance que anunciar, solo una nueva base para la próxima vez.
    if (!actual || !anterior || anterior.numeral !== actual.numeral) return;
    if (anterior.estado === actual.estado) return;
    if (actual.estado !== 'EN_REVISION' && actual.estado !== 'APROBADO') return;

    if (actual.estado === 'EN_REVISION') {
      setAvisoPaso({ tipo: 'revision' });
      return;
    }

    /*
     * Lo reabierto manda sobre lo que viene después.
     *
     * Una actividad DEVUELTA es la única que pide volver atrás, y puede estar
     * antes en el flujo: el comité aprueba la 3.7 y de paso reabre la 3.1 para
     * que se la validen. Buscando solo hacia adelante, la guía saltaba por
     * encima y mandaba a la etapa 4 —o, con la 3.1 bloqueando, decía «debe
     * continuar otra persona»—, que es justo lo contrario de lo que acababa de
     * pasar.
     */
    const reabierta = actividadReabierta(flujoActual);
    if (reabierta) {
      setAvisoPaso({
        tipo: 'reabierta',
        numeral: reabierta.numeral,
        nombre:
          catalogo.find((a: any) => a.numeral === reabierta.numeral)?.nombre ?? reabierta.numeral,
      });
      return;
    }

    // APROBADO: se busca el siguiente paso del flujo para guiar hacia él.
    const indice = flujoActual.findIndex((p) => p.numeral === actual.numeral);
    const siguiente = flujoActual
      .slice(indice + 1)
      .find((p) => p.aplica && p.construida && p.estado !== 'APROBADO');

    if (!siguiente) {
      setAvisoPaso({ tipo: 'fin' });
      return;
    }

    const nombreSiguiente =
      catalogo.find((a: any) => a.numeral === siguiente.numeral)?.nombre ?? siguiente.numeral;

    if (actividadesDisponibles(flujoActual).has(siguiente.numeral)) {
      setAvisoPaso({ tipo: 'siguiente', numeral: siguiente.numeral, nombre: nombreSiguiente });
    } else {
      setAvisoPaso({
        tipo: 'bloqueado',
        motivo: motivoDelBloqueo(siguiente.numeral, flujoActual) ?? 'Debe continuar otra persona del equipo',
      });
    }
  }, [tokenExpediente, expandida, catalogo, datos]);

  // Con el mismo token que el expediente: tomar el proceso o asignar el abogado
  // cambia a quién le toca, y la franja tiene que enterarse sin recargar.
  useEffect(() => {
    let vigente = true;
    Promise.resolve()
      .then(() => contratacionService.participacion(procesoId))
      .then((p) => vigente && setParticipacion(p))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
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

  /*
   * El estudio previo, que además es de donde sale el estado de la 3.1.
   *
   * Depende de `tokenExpediente` igual que el catálogo y los adjuntos: la 3.1
   * no vive en `proceso_actividades` como las demás —su estado es el del
   * estudio previo—, así que sin esto se quedaba con el que tenía al entrar. Si
   * el comité la reabría, el riel la seguía pintando verde y la guía del
   * siguiente paso la daba por aprobada y mandaba a la etapa 4.
   */
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
  }, [procesoId, tokenExpediente]);

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
          Volver a {volverA.toLowerCase()}
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
  const catalogoDelProceso: any[] = (
    catalogo.length > 0 ? catalogo : ACTIVIDADES_ETAPA_3
  ).filter((act: any) => act.numeral !== NUMERAL_REVISION);

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

  /**
   * Dónde está el proceso y a quién le toca, con la misma secuencia del riel.
   *
   * Se calcula aquí y no en la franja porque la franja no sabe del catálogo ni
   * del estado del estudio previo; esta pantalla ya los tiene.
   */
  const entradaSituacion: EntradaSituacion = {
    pasos: catalogoDelProceso.map((act: any, i: number) => ({
      ...flujo[i],
      nombre: act.nombre,
      etapa: act.etapa ?? 3,
      actualizadoEn: act.actualizadoEn ?? null,
      responsableCargo: act.responsableCargo ?? null,
      responde: act.responde ?? null,
    })),
    participacion: participacion ?? undefined,
    radicadoPorMi: datos.proceso.radicadoPorMi,
    responsables,
    puedo: alcanceCargado ? puede : undefined,
  };
  const situacion = situacionDelProceso(entradaSituacion);

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

  /**
   * Las modificaciones (9.5) no van en el riel.
   *
   * El riel cuenta una secuencia, y una prórroga, una adición o una suspensión
   * no son un paso de ella: caben en cualquier momento de la ejecución. En el
   * riel se leían como «lo siguiente después de los pagos», así que se abren
   * desde su propio botón en la cabecera, igual que el expediente.
   */
  const modificaciones =
    actividades.find((a) => a.numeral === NUMERAL_MODIFICACIONES && a.estado !== 'no_aplica') ??
    null;
  const actividadesDelRiel = actividades.filter((a) => a.numeral !== NUMERAL_MODIFICACIONES);

  const actividadSeleccionada = actividades.find((a) => a.numeral === expandida) ?? null;

  /**
   * Por qué la actividad abierta se puede leer pero no trabajar (EFDS-1183).
   *
   * El riel dejó de cerrar el paso: cualquiera se puede abrir para ver qué pide
   * y con qué formatos. Lo que sigue en pie es el orden del expediente, y por
   * eso el bloqueo se aplica aquí dentro —los botones y las cargas se apagan
   * mientras esto traiga motivo— en vez de en el botón que lleva a la pantalla.
   *
   * `null` cuando se puede trabajar, que es lo normal.
   */
  const motivoSoloLectura =
    actividadSeleccionada && !actividadSeleccionada.disponible
      ? // La que no tiene panel se explica por sí sola: lo que falta no es la
        // anterior, es la actividad. Nombrar una previa mandaría a terminar
        // algo que no destrabaría nada.
        !TIENEN_PANEL(actividadSeleccionada.numeral)
        ? 'Esta actividad todavía no está construida en la plataforma'
        : (motivoDelBloqueo(actividadSeleccionada.numeral, flujo) ??
          'Esta actividad todavía no está habilitada')
      : null;

  /**
   * Qué etapa se mira.
   *
   * Con el recorrido recortado, la etapa del proceso puede no estar en él —un
   * proceso en la 3 para quien solo ve 4, 8, 9 y 10—, y entonces el riel
   * quedaría vacío sin que nada lo explicara. Se cae en la primera de las
   * suyas, que es donde esa persona tiene algo que hacer.
   */
  /**
   * En qué etapa va el proceso.
   *
   * La misma cuenta que el listado: `procesos.etapa` se queda en 5 después de
   * la apertura —a propósito, ver `ofertas.service.ts`—, así que un contrato
   * en ejecución se abría en la etapa 5 y la línea del tiempo marcaba esa como
   * la actual. Solo cuentan las que tienen fila: las del catálogo que nadie ha
   * empezado llegan sin estado, y eso no es trabajo hecho.
   */
  const etapaActual = etapaEnCurso({
    etapa: datos.proceso.etapa,
    actividades: catalogoDelProceso
      .filter((act: any) => act.numeral !== '3.1' && act.estado)
      .map((act: any) => ({ numeral: act.numeral, estado: act.estado })),
  });

  const etapaDelProceso = etapaElegida ?? etapaActual;
  const etapaVista =
    recortado && !ETAPAS_DE_LA_FINANCIERA.includes(etapaDelProceso)
      ? ETAPAS_DE_LA_FINANCIERA[0]
      : etapaDelProceso;

  /**
   * Cuántas actividades aplican y cuántas están hechas, por etapa.
   *
   * Es lo que pinta la línea del tiempo. Se cuenta sobre las que aplican a la
   * modalidad: exigir las excluidas para dar una etapa por cerrada dejaría
   * etapas que nunca llegan al final.
   */
  // Sobre lo que muestra el riel: contar la 9.5, que puede no ocurrir nunca,
  // dejaría la etapa 9 sin llegar al final en todo contrato que no se modificó.
  const avance: Record<number, AvanceEtapa> = {};
  for (const act of actividadesDelRiel) {
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

  const abrirActividad = (numeral: string) => {
    // Volver a pulsar la actividad abierta no reinicia nada: el riel
    // no deselecciona, así que sería apagar la columna sin que nadie
    // vuelva a encenderla —la pieza de aprobación no se remonta y no
    // repite el aviso—, y la tarjeta caía al final del flujo.
    if (numeral === expandida) return;

    // Al cambiar de actividad sí: el estado de la aprobación es de la
    // anterior, y arrastrarlo nombraría mal el botón de esta.
    setPideAprobacion(false);
    setFueDevuelta(false);
    setExpandida(numeral);
  };

  /** Trabajar una actividad: cambia a la vista de trabajo y la abre. */
  const trabajarEn = (numeral: string) => {
    setVista('trabajo');
    abrirActividad(numeral);
  };

  /** Por qué una actividad todavía no se puede trabajar, o `null`. */
  const motivoDe = (numeral: string): string | null => {
    const act = actividades.find((a) => a.numeral === numeral);
    if (!act || act.disponible) return null;
    return motivoDelBloqueo(numeral, flujo) ?? act.detalle ?? 'Esta actividad todavía no está habilitada';
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
            <ArrowLeft className="w-3.5 h-3.5" /> {volverA}
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

          <FranjaSituacion
            situacion={situacion}
            abierta={vista === 'trabajo' ? expandida : null}
            onIr={trabajarEn}
            onRevisar={onRevisar}
            plazos={plazos.get(procesoId) ?? []}
          />

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            {/* Seguir o trabajar: dos formas de estar en el proceso. */}
            <div className="inline-flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5" role="tablist" aria-label="Vista del proceso">
              {(
                [
                  { id: 'seguimiento' as const, etiqueta: 'Seguimiento' },
                  { id: 'trabajo' as const, etiqueta: 'Trabajar' },
                ]
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={vista === v.id}
                  onClick={() => setVista(v.id)}
                  className={`px-3 py-1 rounded-md text-[12px] font-bold transition-colors ${
                    vista === v.id ? 'bg-white text-[#003DA5] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {v.etiqueta}
                </button>
              ))}
            </div>

            {vista === 'trabajo' ? (
              <LineaDeTiempoEtapas
                etapaActual={etapaActual}
                etapaSeleccionada={etapaVista}
                onSeleccionar={elegirEtapa}
                avance={avance}
                soloEstas={recortado ? ETAPAS_DE_LA_FINANCIERA : undefined}
              />
            ) : (
              <span className="flex-1" />
            )}

            {/* Solo a quien se le recortó: para los demás sería un interruptor
                que no apaga nada. */}
            {soloPresupuesto && (
              <button
                type="button"
                onClick={() => setVerTodasLasEtapas((v) => !v)}
                aria-pressed={verTodasLasEtapas}
                title={
                  verTodasLasEtapas
                    ? 'Volver a las etapas en las que interviene la Dirección Financiera'
                    : 'Ver las diez etapas del proceso, incluido el estudio previo que justifica el gasto'
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold
                  border transition-colors ${
                    verTodasLasEtapas
                      ? 'bg-[#E0EDFF] border-[#003DA5]/30 text-[#003DA5]'
                      : 'bg-white border-gray-200 text-slate-600 hover:border-[#003DA5]/30 hover:text-[#003DA5]'
                  }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                {verTodasLasEtapas ? 'Solo lo mío' : 'Todo el proceso'}
              </button>
            )}

            {/* Desde que la ejecución arrancó, o mirando la etapa 9 o la 10.
                No se pregunta por `datos.proceso.etapa`: en la base se queda
                atrás —hay contratos en ejecución con el proceso en la 5— y el
                botón no salía nunca. Antes de eso no hay nada que modificar.
                Mirando la etapa 9 sin acta de inicio se abre igual, como
                cualquier actividad del riel: el panel queda de solo lectura y
                dice qué falta. */}
            {modificaciones && (modificaciones.disponible || etapaVista >= 9) && (
              <button
                type="button"
                onClick={() => trabajarEn(NUMERAL_MODIFICACIONES)}
                aria-pressed={expandida === NUMERAL_MODIFICACIONES}
                title={
                  modificaciones.disponible
                    ? 'Prórroga, adición, cesión, suspensión y demás modificaciones del contrato'
                    : modificaciones.detalle ?? 'Todavía no se puede modificar el contrato'
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold
                  border transition-colors ${
                    expandida === NUMERAL_MODIFICACIONES
                      ? 'bg-[#E0EDFF] border-[#003DA5]/30 text-[#003DA5]'
                      : 'bg-white border-gray-200 text-slate-600 hover:border-[#003DA5]/30 hover:text-[#003DA5]'
                  }`}
              >
                <FilePen className="w-3.5 h-3.5" />
                Modificaciones
              </button>
            )}

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
      {vista === 'seguimiento' ? (
        <>
          <FichaDelProceso
            procesoId={procesoId}
            actividades={actividades.filter((a) => a.numeral !== NUMERAL_MODIFICACIONES)}
            entrada={entradaSituacion}
            situacion={situacion}
            etapaActual={etapaActual}
            participacion={participacion}
            plazos={plazos.get(procesoId) ?? []}
            onAbrir={trabajarEn}
            onCambio={() => setTokenExpediente((t) => t + 1)}
            motivoDe={motivoDe}
          />
          {expedienteAbierto && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <PanelExpediente
                procesoId={procesoId}
                editable={!aprobado && !enRevision}
                recargarToken={tokenExpediente}
              />
            </div>
          )}
        </>
      ) : (
      <div className={`detalle-proceso ${expedienteAbierto ? 'con-expediente' : ''}`}>
        <RielActividades
          etapa={etapaVista}
          etapaActual={etapaActual}
          actividades={actividadesDelRiel}
          seleccionada={expandida}
          onSeleccionar={abrirActividad}
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
              onDevuelta={setFueDevuelta}
              onRevisar={
                onRevisar ? () => onRevisar(actividadSeleccionada.numeral) : undefined
              }
              /* Sin esto el aviso se quedaba con el estado anterior: tras
                 corregir y reenviar seguía diciendo «devuelta» y volvía a
                 ofrecer corregir sobre un registro ya vigente. */
              recargarToken={tokenExpediente}
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
          {/* Lo que el bloqueo de secuencia envuelve: el panel que trabaja la
              actividad y los documentos que entrega. Todo lo que escribe está
              aquí dentro, así que apagarlo desde un sitio basta para las
              sesenta y tres. La decisión de aprobación queda fuera a propósito:
              es un acto sobre trabajo ya enviado, y por tanto sobre una
              actividad que la secuencia ya alcanzó. */}
          {/* Aquí no se decide: los paneles que deciden dentro de sí llevan a
              la revisión en vez de enseñar sus botones. */}
          <LugarDeDecision abrirRevision={onRevisar}>
          <SoloLectura motivo={motivoSoloLectura}>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {actividadSeleccionada ? (
                <EncabezadoActividad
                  numeral={actividadSeleccionada.numeral}
                  nombre={actividadSeleccionada.nombre}
                />
              ) : null}

              {/* Un panel con todos los botones apagados y sin una línea que lo
                  explique se lee como una pantalla rota. */}
              {motivoSoloLectura ? <AvisoSoloLectura motivo={motivoSoloLectura} /> : null}

              <PanelDeLaActividad
                numeral={actividadSeleccionada?.numeral ?? null}
                nombre={actividadSeleccionada?.nombre}
                procesoId={procesoId}
                valorEstimado={datos.proceso.valorEstimado}
                onCambio={() => setTokenExpediente((t) => t + 1)}
                onCambioEstudio={() => {
                  contratacionService
                    .obtenerEstudioPrevio(procesoId)
                    .then(setDatos)
                    .catch(() => undefined);
                  setTokenExpediente((t) => t + 1);
                }}
                requiereAprobacion={pideAprobacion}
                devuelta={fueDevuelta}
                recargarToken={tokenExpediente}
                onRevisar={onRevisar}
              />
            </div>

            {/* La lista de documentos de la actividad, debajo del panel: primero
                se trabaja, después se adjunta. Es la misma para las sesenta y
                tres —sale de lo que Configuración le pide a cada una— y no se
                pinta donde la actividad no pide ni tiene documentos. */}
            {actividadSeleccionada &&
            !NUMERALES_CON_LISTA_PROPIA.includes(actividadSeleccionada.numeral) ? (
              <div className="mt-3">
                <ListaDeDocumentos
                  procesoId={procesoId}
                  numeral={actividadSeleccionada.numeral}
                  recargarToken={tokenExpediente}
                  onCambio={() => setTokenExpediente((t) => t + 1)}
                />
              </div>
            ) : null}
          </SoloLectura>
          </LugarDeDecision>

        </div>

        {/* Aquí ya no se decide: aprobar o devolver se hace en la pantalla de
            revisión, que enseña lo enviado en solo lectura y la decisión al
            lado. El aviso de arriba lleva a ella a quien le toca. */}

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

      )}


      {/* La guía paso a paso: se para a mitad de pantalla porque una esquina
          que desaparece sola no se nota, y el gestor se queda sin saber qué
          sigue. Avanzar es un clic, no algo que ocurra solo. */}
      <Modal
        isOpen={avisoPaso !== null}
        onClose={() => setAvisoPaso(null)}
        title="Enviado correctamente"
        size="small"
        icon={
          avisoPaso?.tipo === 'siguiente' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <ClipboardCheck className="w-5 h-5" />
          )
        }
        color={avisoPaso?.tipo === 'siguiente' ? '#10B981' : '#003DA5'}
        footer={
          avisoPaso?.tipo === 'siguiente' || avisoPaso?.tipo === 'reabierta' ? (
            <button
              type="button"
              onClick={() => {
                setExpandida(avisoPaso.numeral);
                setAvisoPaso(null);
              }}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#003DA5] px-4 py-2 text-sm font-bold text-white hover:opacity-90"
            >
              Ir a {avisoPaso.numeral} · {avisoPaso.nombre}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAvisoPaso(null)}
              className="ml-auto rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              Entendido
            </button>
          )
        }
      >
        {avisoPaso?.tipo === 'revision' && (
          <p className="text-sm text-slate-700 m-0 leading-relaxed">
            Queda en revisión: te avisaremos aquí cuando Contratación continúe.
          </p>
        )}
        {avisoPaso?.tipo === 'fin' && (
          <p className="text-sm text-slate-700 m-0 leading-relaxed">
            Por ahora no quedan más pasos pendientes en este proceso.
          </p>
        )}
        {avisoPaso?.tipo === 'bloqueado' && (
          <p className="text-sm text-slate-700 m-0 leading-relaxed">{avisoPaso.motivo}.</p>
        )}
        {avisoPaso?.tipo === 'siguiente' && (
          <p className="text-sm text-slate-700 m-0 leading-relaxed">
            El siguiente paso es{' '}
            <strong className="font-bold">
              {avisoPaso.numeral} · {avisoPaso.nombre}
            </strong>
            .
          </p>
        )}
        {/* Volver atrás no es «el siguiente paso»: es una actividad que ya
            estaba cerrada y que hay que diligenciar otra vez. */}
        {avisoPaso?.tipo === 'reabierta' && (
          <p className="text-sm text-slate-700 m-0 leading-relaxed">
            Se reabrió{' '}
            <strong className="font-bold">
              {avisoPaso.numeral} · {avisoPaso.nombre}
            </strong>
            : hay que volver a diligenciarla antes de que el proceso siga. Avisamos a quien la
            había enviado.
          </p>
        )}
      </Modal>
    </div>
  );
}
