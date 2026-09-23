import React, { useEffect, useState } from 'react';

import { contratacionService } from '../../services/contratacionService';
import { EstadoDocumentos } from '../../types';
import { Aviso, Marco, Titulo } from '../shared/PiezasPanel';
import { ListaDeDocumentos } from '../shared/ListaDeDocumentos';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

/** La actividad que este panel resuelve. */
const NUMERAL = '5.1';

/**
 * Actividad 5.1 · Elaboración de los documentos del proceso (EFDS-1149).
 *
 * El panel no redacta nada: dice qué documentos exige la modalidad y recibe
 * cada uno. Desde EFDS-2066 la lista es la misma pieza que en cualquier otra
 * actividad —el aviso, el pliego o el acto de justificación son filas del
 * catálogo, con su plantilla—; lo propio de la 5.1 es decir cuándo la modalidad
 * no la adelanta y cuándo quedó completa.
 */
export function PanelDocumentosProceso({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoDocumentos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Para que la lista se relea cuando cambia algo fuera de ella. */
  const [token, setToken] = useState(0);

  const leer = () =>
    contratacionService
      .documentosProceso(procesoId)
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando los documentos del proceso…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo consultar la actividad">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  // La modalidad excluye la actividad por completo: no hay nada que cargar, y
  // mostrar una lista vacía haría pensar que faltan documentos.
  if (!estado.aplica) {
    return (
      <Marco>
        <Titulo>Elaboración de documentos del proceso</Titulo>
        <Aviso tono="aviso" titulo="Esta modalidad no elabora estos documentos">
          {estado.motivoNoAplica ??
            'La matriz de flujo no exige esta actividad para la modalidad del proceso.'}
        </Aviso>
      </Marco>
    );
  }

  return (
    <Marco>
      <Titulo>Elaboración de documentos del proceso</Titulo>

      <ListaDeDocumentos
        procesoId={procesoId}
        numeral={NUMERAL}
        recargarToken={token}
        titulo="Documentos que exige la modalidad"
        ayuda={
          <>
            {estado.modalidadNombre
              ? `Lo que elabora ${estado.modalidadNombre}. `
              : 'Lo que elabora la modalidad del proceso. '}
            Cada uno queda en el expediente con su huella digital, que es lo que permite verificar
            después que no se alteró.
          </>
        }
        onCambio={() => {
          // El estado de la 5.1 lo deciden sus documentos: se relee para que
          // el aviso de completos aparezca o se retire con la última carga.
          leer();
          setToken((t) => t + 1);
          onCambio?.();
        }}
      />

      {estado.documentos.length === 0 && (
        <Aviso tono="aviso" titulo="Sin documentos configurados">
          Configuración no ha definido qué documentos elabora esta modalidad en la actividad 5.1.
        </Aviso>
      )}

      {estado.completa ? (
        <Aviso tono="ok" titulo="Documentos completos">
          Ya está todo lo que la modalidad exige. El proyecto de pliego se publica en la actividad
          5.2.
        </Aviso>
      ) : null}
    </Marco>
  );
}
