import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';

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
  guardando: boolean;
  enviar: () => Promise<void>;
  retirar: () => Promise<void>;
  aprobar: () => Promise<void>;
  devolver: (observaciones: string) => Promise<void>;
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
): Aprobacion {
  const [cargando, setCargando] = useState(true);
  const [requiereAprobacion, setRequiere] = useState(false);
  const [puedoAprobar, setPuedoAprobar] = useState(false);
  const [quienAprueba, setQuienAprueba] = useState<string[]>([]);
  const [estado, setEstado] = useState<Aprobacion['estado']>('BORRADOR');
  const [esMia, setEsMia] = useState(false);
  const [observaciones, setObservaciones] = useState<string | null>(null);
  const [decididaPor, setDecididaPor] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const leer = useCallback(() => {
    setCargando(true);
    return contratacionService
      .aprobadoresDeActividad(procesoId, numeral)
      .then((r) => {
        setRequiere(r.requiereAprobacion);
        setPuedoAprobar(r.puedoAprobar);
        setQuienAprueba(r.aprobadores?.roles ?? []);
        setEstado((r.estado as Aprobacion['estado']) ?? 'BORRADOR');
        setEsMia(!!r.esMia);
        setObservaciones(r.observaciones ?? null);
        setDecididaPor(r.decididaPor ?? null);
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
  }, [leer]);

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
    aprobar: () =>
      accion(() => contratacionService.aprobarActividad(procesoId, numeral), 'Actividad aprobada'),
    devolver: (observaciones: string) =>
      accion(
        () => contratacionService.devolverActividad(procesoId, numeral, observaciones),
        'Devuelta con tus observaciones',
      ),
  };
}
