import React, { useEffect, useState } from 'react';
import { History, Inbox } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoParticipacion, PuestosDelProceso as DatosPuestos } from '../../types';
import { Aviso, Ayuda, Boton, Marco, Titulo } from '../shared/PiezasPanel';
import { PasoDeLaActividad, PasosDeLaActividad } from '../shared/PasosDeLaActividad';
import { momento } from '../shared/fechas';
import { PuestosDelProceso } from './PuestosDelProceso';

interface Props {
  procesoId: string;
  /** Para que el riel y el listado se enteren de que cambió de manos. */
  onCambio?: () => void;
}

/**
 * Actividad 3.3 · Radicación en la Dirección de Contratación (EFDS-1183, 109).
 *
 * Radicar es recibir el proceso y ponerle quién lo lleve. Dos actos con reglas
 * distintas: **tomar** no lo autoriza nadie, la bandeja es compartida y quien
 * llega primero se queda con el proceso; **asignar los puestos** lo hace quien
 * lo tomó.
 *
 * Los puestos —Abogado, Segundo abogado, Jefe…— no están escritos aquí: los
 * configura la Dirección, y cada actividad dice cuál la hace o la aprueba. Esta
 * pantalla solo pone a una persona en cada uno.
 */
export function PanelRadicacion({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoParticipacion | null>(null);
  const [puestos, setPuestos] = useState<DatosPuestos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);

  /** Nulo si la consulta falla: la radicación sigue sirviendo para tomar el proceso. */
  const leerPuestos = () =>
    contratacionService
      .puestosDelProceso(procesoId)
      .then(setPuestos)
      .catch(() => setPuestos(null));

  useEffect(() => {
    setCargando(true);
    leerPuestos();
    contratacionService
      .participacion(procesoId)
      .then((r) => {
        setEstado(r);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procesoId]);

  const tomar = async () => {
    setGuardando(true);
    try {
      setEstado(await contratacionService.tomarProceso(procesoId));
      // Hacerse cargo es lo que habilita asignar los puestos.
      leerPuestos();
      toast.success('Ya estás a cargo. Ahora asigna los puestos del proceso.');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <Marco>
        <p className="text-[11.5px] text-slate-400 m-0">Cargando la radicación…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo cargar la radicación">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  const { contratacion, puedeTomar } = estado;

  /*
   * Quienes lo llevaron antes: los relevados de Contratación y los de cada
   * puesto, juntos y por fecha. El abogado de antes de la 109 sigue aquí como
   * historia: desde entonces es un puesto.
   */
  const NOMBRE_PAPEL = { ABOGADO: 'abogado', CONTRATACION: 'contratación', FINANCIERA: 'financiera' } as const;
  const historial = [
    ...estado.historial.map((h) => ({ ...h, como: NOMBRE_PAPEL[h.papel] })),
    ...(puestos?.historial ?? []).map((h) => ({ ...h, como: h.puesto, asignadoPor: null as string | null })),
  ].sort((a, b) => (b.relevadoAt ?? '').localeCompare(a.relevadoAt ?? ''));

  // ------------------------------------------- paso 1 · hacerse cargo ----
  const pasoCargo: PasoDeLaActividad = contratacion
    ? {
        titulo: 'Hacerse cargo del proceso',
        estado: 'hecho',
        detalle: `${contratacion.nombre}${contratacion.esMio ? ' (tú)' : ''} · desde el ${momento(
          contratacion.asignadoAt,
        )}`,
      }
    : puedeTomar
      ? {
          titulo: 'Hacerse cargo del proceso',
          estado: 'te-toca',
          detalle:
            'El área entregó el proceso y todavía no lo lleva nadie. Quien se haga cargo queda como responsable en la Dirección y asigna los puestos.',
          children: (
            <Boton icono={<Inbox className="w-3.5 h-3.5" />} disabled={guardando} onClick={tomar}>
              Hacerme cargo
            </Boton>
          ),
        }
      : {
          titulo: 'Hacerse cargo del proceso',
          estado: 'le-toca',
          detalle:
            'Todavía no lo lleva nadie: está esperando a que alguien de la Dirección de Contratación se haga cargo.',
        };

  // ------------------------------------- paso 2 · los puestos (109) -------
  const lista = puestos?.puestos ?? [];
  const vacios = lista.filter((p) => !p.ocupante).length;
  const conProblema = lista.filter((p) => p.problema).length;
  const pasoPuestos: PasoDeLaActividad | null = !lista.length
    ? null
    : !contratacion
      ? {
          titulo: 'Asignar los puestos del proceso',
          estado: 'espera',
          detalle: 'Los asigna quien se haga cargo del proceso.',
        }
      : {
          titulo: 'Asignar los puestos del proceso',
          estado:
            vacios === 0 && conProblema === 0 ? 'hecho' : puestos?.puedeAsignar ? 'te-toca' : 'le-toca',
          detalle:
            vacios === 0 && conProblema === 0
              ? 'Cada puesto tiene quién lo ocupe.'
              : `${
                  vacios ? (vacios === 1 ? 'Falta 1 puesto por asignar' : `Faltan ${vacios} puestos por asignar`) : ''
                }${vacios && conProblema ? '; ' : ''}${
                  conProblema ? (conProblema === 1 ? '1 puesto necesita atención' : `${conProblema} puestos necesitan atención`) : ''
                }.${puestos?.puedeAsignar ? '' : ` Los asigna ${contratacion.nombre}.`}`,
          children: <PuestosDelProceso procesoId={procesoId} datos={puestos!} onCambio={setPuestos} />,
        };

  return (
    <Marco>
      <Titulo>Radicación en la Dirección</Titulo>
      <Ayuda>Recibir el proceso en la Dirección de Contratación y poner a una persona en cada puesto.</Ayuda>

      <PasosDeLaActividad pasos={[pasoCargo, ...(pasoPuestos ? [pasoPuestos] : [])]} />

      {/* ---------------------------------------------------- historial -- */}
      {historial.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setHistorialAbierto((v) => !v)}
            aria-expanded={historialAbierto}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-slate-500 hover:text-[#003DA5]"
          >
            <History className="w-3.5 h-3.5" />
            {historialAbierto ? 'Ocultar' : 'Ver'} quiénes lo llevaron antes ({historial.length})
          </button>

          {historialAbierto && (
            <ul className="mt-2 m-0 p-0 list-none space-y-2">
              {historial.map((h, i) => (
                <li
                  key={`${h.como}-${h.relevadoAt ?? i}`}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                >
                  <p className="text-[12px] font-bold text-slate-700 m-0 break-words">
                    {h.nombre}
                    <span className="font-normal text-slate-400">
                      {' · '}
                      {h.como}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed break-words">
                    Del {momento(h.asignadoAt)}
                    {h.relevadoAt ? ` al ${momento(h.relevadoAt)}` : ''}
                    {h.relevadoPor ? ` · relevado por ${h.relevadoPor}` : ''}
                  </p>
                  {h.motivoRelevo && (
                    <p className="text-[11px] text-slate-600 m-0 mt-1 leading-relaxed break-words">
                      «{h.motivoRelevo}»
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Marco>
  );
}
