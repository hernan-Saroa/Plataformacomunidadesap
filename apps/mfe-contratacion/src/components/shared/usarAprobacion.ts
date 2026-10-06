import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EvidenciaFirmaOtp, SoporteDeDevolucion } from '../../types';

/**
 * Sube, uno tras otro, los archivos que acompañan una devolución.
 *
 * En fila y no a la vez: cada uno se suma a la lista de la revisión, y así
 * quedan en el orden en que se eligieron. La devolución ya quedó, así que los
 * que fallen se avisan juntos sin deshacer lo decidido.
 */
export async function adjuntarSoportes(procesoId: string, numeral: string, archivos: File[]) {
  const fallidos: string[] = [];
  let motivo: string | undefined;
  for (const archivo of archivos) {
    try {
      await contratacionService.subirSoporteDevolucion(procesoId, numeral, archivo);
    } catch (e: any) {
      fallidos.push(archivo.name);
      motivo = motivo ?? e?.message;
    }
  }
  if (fallidos.length) {
    toast.warning(
      fallidos.length === 1
        ? `Se devolvió, pero no se pudo adjuntar ${fallidos[0]}`
        : `Se devolvió, pero no se pudieron adjuntar ${fallidos.length} archivos: ${fallidos.join(', ')}`,
      { description: motivo },
    );
  }
}

/** Una decisión ya tomada sobre la actividad. */
export interface RevisionDeActividad {
  decision: 'APROBADO' | 'DEVUELTO';
  observaciones: string | null;
  revisadoPor: string;
  /** Sobre qué versión del documento se pronunció. */
  versionRevisada: number;
  fecha: string;
  /** Las correcciones marcadas que acompañan una devolución, si las hay. */
  soportes?: SoporteDeDevolucion[];
}

/** Lo que un panel necesita saber para pintar el pie de aprobación. */
export interface Aprobacion {
  cargando: boolean;
  requiereAprobacion: boolean;
  puedoAprobar: boolean;
  /** Nombres legibles de quien aprueba, para decirlo antes de enviar. */
  quienAprueba: string[];
  estado: 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'DEVUELTO';
  /** Si la envió quien está mirando: solo él puede retirarla. */
  esMia: boolean;
  /** Por qué se devolvió, si se devolvió. */
  observaciones: string | null;
  decididaPor: string | null;
  /**
   * Todas las decisiones tomadas, de la más nueva a la más vieja.
   *
   * Una actividad puede devolverse varias veces: sin el recorrido, quien va a
   * aprobar no sabe qué se pidió corregir en las rondas anteriores ni cuántas
   * hubo.
   */
  revisiones: RevisionDeActividad[];
  guardando: boolean;
  enviar: () => Promise<void>;
  retirar: () => Promise<void>;
  aprobar: (firma?: EvidenciaFirmaOtp) => Promise<void>;
  /** Con archivos, los adjunta como soportes de la devolución. */
  devolver: (observaciones: string, soportes?: File[]) => Promise<void>;
}

/**
 * El trámite de aprobación de una actividad, para el panel que la trabaja.
 *
 * Un hook y no código dentro de cada panel porque son treinta y ocho paneles y
 * el trámite es el mismo en todos: cambia la actividad, no lo que hay que
 * hacer con ella. Es la misma razón por la que existe `PiezasPanel`.
 *
 * Cuando el área no ha configurado aprobación para esa actividad,
 * `requiereAprobacion` llega en false y el panel se comporta como antes: un
 * botón que la cierra. Por eso adoptar el hook no cambia nada hasta que alguien
 * marque la actividad en Configuración.
 */
export function usarAprobacion(
  procesoId: string,
  numeral: string,
  onCambio?: () => void,
  /**
   * Sube de valor para releer el trámite desde fuera.
   *
   * El bloque del aviso y el panel que trabaja la actividad son dos montajes
   * con su propio estado: cuando el gestor corregía una actividad devuelta y la
   * reenviaba desde el panel, el aviso de arriba seguía creyéndola devuelta y
   * volvía a ofrecerle corregir, sobre un registro que ya estaba vigente. El
   * servicio lo rechazaba con «ya tiene un registro vigente», que es cierto
   * pero no explica nada a quien acaba de guardar bien.
   */
  recargarToken?: number,
): Aprobacion {
  const [cargando, setCargando] = useState(true);
  const [requiereAprobacion, setRequiere] = useState(false);
  const [puedoAprobar, setPuedoAprobar] = useState(false);
  const [quienAprueba, setQuienAprueba] = useState<string[]>([]);
  const [estado, setEstado] = useState<Aprobacion['estado']>('BORRADOR');
  const [esMia, setEsMia] = useState(false);
  const [observaciones, setObservaciones] = useState<string | null>(null);
  const [decididaPor, setDecididaPor] = useState<string | null>(null);
  const [revisiones, setRevisiones] = useState<RevisionDeActividad[]>([]);
  const [guardando, setGuardando] = useState(false);

  const leer = useCallback(() => {
    setCargando(true);
    return contratacionService
      .aprobadoresDeActividad(procesoId, numeral)
      .then((r) => {
        setRequiere(r.requiereAprobacion);
        setPuedoAprobar(r.puedoAprobar);
        // Roles y personas: designar solo a alguien por su nombre dejaba la
        // lista vacía, y el gestor leía que nadie la aprobaba.
        setQuienAprueba([
          ...(r.aprobadores?.roles ?? []),
          ...((r.aprobadores as { personas?: string[] } | null)?.personas ?? []),
        ]);
        setEstado((r.estado as Aprobacion['estado']) ?? 'BORRADOR');
        setEsMia(!!r.esMia);
        setObservaciones(r.observaciones ?? null);
        setDecididaPor(r.decididaPor ?? null);
        setRevisiones((r as any).revisiones ?? []);
      })
      .catch(() => {
        // Sin respuesta se asume que no requiere aprobación: dejar el panel
        // bloqueado porque una consulta falló impediría trabajar una actividad
        // que quizá ni la exige.
        setRequiere(false);
        setPuedoAprobar(false);
      })
      .finally(() => setCargando(false));
  }, [procesoId, numeral]);

  useEffect(() => {
    leer();
    // `recargarToken` entra a propósito: el panel de abajo cambia el estado del
    // trámite —al registrar envía a aprobación, al corregir reenvía— y sin esto
    // el aviso de arriba se quedaba con el estado anterior.
  }, [leer, recargarToken]);

  /** Envuelve las cuatro acciones: todas avisan, refrescan y propagan igual. */
  const accion = useCallback(
    async (hacer: () => Promise<unknown>, exito: string) => {
      setGuardando(true);
      try {
        await hacer();
        toast.success(exito);
        await leer();
        onCambio?.();
      } catch (e: any) {
        toast.error(e.message ?? 'No se pudo completar la acción');
      } finally {
        setGuardando(false);
      }
    },
    [leer, onCambio],
  );

  return {
    cargando,
    requiereAprobacion,
    puedoAprobar,
    quienAprueba,
    estado,
    esMia,
    observaciones,
    decididaPor,
    revisiones,
    guardando,
    enviar: () =>
      accion(
        () => contratacionService.enviarAprobacion(procesoId, numeral),
        'Enviada a aprobación',
      ),
    retirar: () =>
      accion(
        () => contratacionService.retirarAprobacion(procesoId, numeral),
        'Retirada de aprobación: ya puedes corregirla',
      ),
    aprobar: (firma?: EvidenciaFirmaOtp) =>
      accion(
        () => contratacionService.aprobarActividad(procesoId, numeral, undefined, firma),
        'Actividad aprobada',
      ),
    devolver: (observaciones: string, soportes: File[] = []) =>
      accion(async () => {
        await contratacionService.devolverActividad(procesoId, numeral, observaciones);
        await adjuntarSoportes(procesoId, numeral, soportes);
      }, 'Devuelta con tus observaciones'),
  };
}
