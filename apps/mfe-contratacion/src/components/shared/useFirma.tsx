import React, { useCallback, useEffect, useRef, useState } from 'react';

import { contratacionService } from '../../services/contratacionService';
import { EvidenciaFirmaOtp } from '../../types';
import { FirmaOtpModal } from './FirmaOtpModal';

/**
 * La firma con el token institucional, para el botón que la exige (EFDS-2070).
 *
 * No es un aviso aparte que haya que resolver antes: la firma la pide la
 * propia acción que cierra la actividad —o la aprueba, o la que sea—, igual
 * que un formulario pide los campos obligatorios al enviarlo y no antes. Por
 * eso este hook no pinta nada por su cuenta; envuelve la acción del panel y
 * decide si hace falta el token antes de ejecutarla.
 *
 * Un hook por numeral y no un solo `FirmaDeLaActividad` compartido: enviar y
 * aprobar son dos acciones de dos personas distintas, y cada una firma la
 * suya. Un panel que necesite las dos (quien registra y quien aprueba) monta
 * dos de estos, uno por acción.
 */
export function useFirma(numeral: string, accionDetalle: string) {
  const [cargando, setCargando] = useState(true);
  const [requiereFirma, setRequiereFirma] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const pendiente = useRef<((firma?: EvidenciaFirmaOtp) => unknown) | null>(null);

  useEffect(() => {
    setCargando(true);
    contratacionService
      .firmaDeActividad(numeral)
      .then((r) => setRequiereFirma(r.requiereFirma))
      .catch(() => setRequiereFirma(false))
      .finally(() => setCargando(false));
  }, [numeral]);

  /**
   * Envuelve la acción del botón: si la actividad exige firma, primero pide
   * el token y solo entonces ejecuta; si no la exige, ejecuta de una vez.
   *
   * Devuelve lo que la acción devuelva —algunos paneles esperan el resultado
   * para saber si limpiar su formulario—, salvo cuando queda pendiente del
   * token: ahí no hay nada que devolver todavía, porque la ejecución ocurre
   * después, cuando el modal se resuelve.
   */
  const conFirma = useCallback(
    <T,>(ejecutar: (firma?: EvidenciaFirmaOtp) => T | Promise<T>): T | Promise<T> | undefined => {
      if (requiereFirma) {
        pendiente.current = ejecutar;
        setMostrarModal(true);
        return undefined;
      }
      return ejecutar(undefined);
    },
    [requiereFirma],
  );

  const modal = (
    <FirmaOtpModal
      isOpen={mostrarModal}
      onClose={() => setMostrarModal(false)}
      accionDetalle={accionDetalle}
      onFirmado={(evidencia) => {
        setMostrarModal(false);
        const accion = pendiente.current;
        pendiente.current = null;
        accion?.(evidencia);
      }}
    />
  );

  return { conFirma, modal, requiereFirma, cargando };
}
