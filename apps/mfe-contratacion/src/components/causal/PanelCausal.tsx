import React, { useEffect, useState } from 'react';
import { Check, Gavel } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoCausalProceso, EvidenciaFirmaOtp } from '../../types';
import { Aviso, Ayuda, Boton, Marco, Titulo, campo } from '../shared/PiezasPanel';
import { useFirma } from '../shared/useFirma';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const NUMERAL = '3.6';

/**
 * Actividad 3.6 · Causal de contratación (3.5.1 de la matriz, RF-EST-04).
 *
 * La matriz la describe como «filtro según la modalidad» y solo la marca en
 * selección abreviada de menor cuantía y en contratación directa, donde la
 * celda además trae la norma —«Numeral 4 Artículo 2 de la Ley 1150 de 2007»—
 * en vez de un SI.
 *
 * Hasta ahora era el panel genérico de constancia: una fecha, una nota y quizá
 * un soporte. El expediente quedaba sabiendo que alguien escribió algo, pero no
 * cuál causal habilitaba contratar así, que es lo que después sustenta el acto
 * administrativo de justificación de la directa.
 *
 * La lista llega filtrada del servidor y no se filtra aquí: cuál corresponde
 * depende de la modalidad ratificada en la 3.5, y armar el filtro en la
 * pantalla es la forma más fácil de acabar ofreciendo una causal ajena.
 */
export function PanelCausal({ procesoId, onCambio }: Props) {
  const firma = useFirma(NUMERAL, 'Registrar la causal de contratación');
  const [estado, setEstado] = useState<EstadoCausalProceso | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [eligiendo, setEligiendo] = useState(false);
  const [elegida, setElegida] = useState('');
  const [sustento, setSustento] = useState('');

  useEffect(() => {
    setCargando(true);
    contratacionService
      .causalDelProceso(procesoId)
      .then((r) => {
        setEstado(r);
        setElegida(r.causal?.codigo ?? '');
        setSustento(r.sustento ?? '');
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));
  }, [procesoId]);

  const guardar = async (firmaOtp?: EvidenciaFirmaOtp) => {
    setGuardando(true);
    try {
      const r = await contratacionService.elegirCausal(
        procesoId,
        elegida,
        sustento.trim() || undefined,
        firmaOtp,
      );
      setEstado(r);
      setElegida(r.causal?.codigo ?? '');
      setSustento(r.sustento ?? '');
      setEligiendo(false);
      toast.success('Causal registrada en el expediente');
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando la causal…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo cargar la causal">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  // Nueve de las once modalidades. El riel ya la muestra en NO_APLICA, pero
  // quien entre desde el tablero llega aquí directamente y merece saber por qué
  // no hay nada que hacer.
  if (!estado.aplica) {
    return (
      <Marco>
        <Titulo>Causal de contratación</Titulo>
        <Aviso tono="aviso" titulo="Esta modalidad no pide causal">
          La matriz solo marca esta actividad en selección abreviada de menor cuantía y en
          contratación directa. En las demás, la modalidad se sustenta por la cuantía y no por una
          causal.
        </Aviso>
      </Marco>
    );
  }

  const elegidaYa = !!estado.causal;
  const sinRatificar = estado.motivoNoElige === 'MODALIDAD_SIN_RATIFICAR';
  const catalogoSinConfirmar = estado.causales.some((c) => !c.confirmada);

  return (
    <Marco>
      <Titulo>Causal de contratación</Titulo>
      <Ayuda>
        Qué disposición habilita contratar por esta modalidad. La elige el abogado que lleva el
        proceso, de la lista de la modalidad ratificada en la 3.5.
        {estado.referenciaMatriz ? ` La matriz remite a: ${estado.referenciaMatriz}.` : ''}
      </Ayuda>

      {/* ------------------------------------------------- la que está puesta -- */}
      <div
        className={`rounded-lg border px-3.5 py-3 ${
          elegidaYa ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-slate-50'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <Gavel
            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
              elegidaYa ? 'text-emerald-900' : 'text-slate-600'
            }`}
          />
          <div className="min-w-0 flex-1">
            <p
              className={`text-[13px] font-bold m-0 break-words ${
                elegidaYa ? 'text-emerald-900' : 'text-slate-800'
              }`}
            >
              {estado.causal?.nombre ?? 'Sin causal elegida'}
            </p>
            {/* La norma junto a la causal: es como se cita en el expediente y lo
                que el acto de justificación tiene que reproducir. */}
            {estado.causal && (
              <p className="text-[11.5px] text-slate-600 m-0 mt-0.5">
                {estado.causal.referenciaNormativa}
              </p>
            )}
            {estado.sustento && (
              <p className="text-[11.5px] text-slate-600 m-0 mt-1 break-words">
                «{estado.sustento}»
              </p>
            )}
            {!elegidaYa && (
              <p className="text-[11px] text-slate-500 m-0 mt-1">
                Sin causal, el expediente no puede decir qué habilita esta modalidad.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Lo que el área adelantó en el estudio previo. No decide nada —es texto
          libre de quien radicó— pero es de donde parte el abogado. */}
      {estado.propuestaDelArea && (
        <Aviso tono="aviso" titulo="El área propuso en el estudio previo">
          «{estado.propuestaDelArea}»
        </Aviso>
      )}

      {/* -------------------------------------------------------- el abogado -- */}
      {estado.puedeElegir && !eligiendo && (
        <Boton
          icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
          onClick={() => setEligiendo(true)}
        >
          {elegidaYa ? 'Rectificar la causal' : 'Elegir la causal'}
        </Boton>
      )}

      {eligiendo && (
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-3">
          <label htmlFor="causal-elegida" className="block text-xs font-bold text-gray-600">
            Causal que habilita esta modalidad <span className="text-red-600">*</span>
          </label>
          <select
            id="causal-elegida"
            value={elegida}
            disabled={guardando}
            onChange={(e) => setElegida(e.target.value)}
            className={campo}
          >
            <option value="">Elige la causal…</option>
            {estado.causales.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.nombre} — {c.referenciaNormativa}
              </option>
            ))}
          </select>

          <label htmlFor="causal-sustento" className="block text-xs font-bold text-gray-600">
            Por qué el objeto encaja en esa causal
          </label>
          <textarea
            id="causal-sustento"
            rows={3}
            value={sustento}
            disabled={guardando}
            onChange={(e) => setSustento(e.target.value)}
            placeholder="El objeto corresponde a servicios profesionales de apoyo jurídico que solo pueden encomendarse a…"
            className={campo}
          />
          <p className="text-[11px] text-slate-500 m-0">
            Opcional, pero es la motivación que después reproduce el acto administrativo de
            justificación.
          </p>

          <div className="flex items-center gap-2">
            <Boton
              icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
              disabled={!elegida || guardando}
              onClick={() => firma.conFirma(guardar)}
            >
              Registrar la causal
            </Boton>
            <button
              type="button"
              disabled={guardando}
              onClick={() => setEligiendo(false)}
              className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* A quien no le toca, o no le toca todavía, se le dice por qué: una
          franja vacía donde otros ven un botón se lee como una pantalla rota. */}
      {!estado.puedeElegir && (
        <p className="text-[11.5px] text-slate-500 m-0">
          {sinRatificar
            ? 'Primero hay que ratificar la modalidad en la 3.5: la lista de causales sale de la modalidad ratificada.'
            : estado.motivoNoElige === 'ETAPA_PASADA'
              ? 'El proceso ya pasó de la etapa 3 y la causal sustentó la solicitud de CDP: queda como está.'
              : estado.motivoNoDecide === 'SIN_ABOGADO'
                ? 'Nadie ha repartido este proceso todavía: se asigna abogado en la actividad 3.3.'
                : estado.motivoNoDecide === 'NO_ES_TUYO'
                  ? `La elige ${estado.abogado?.nombre ?? 'el abogado del proceso'}.`
                  : 'La elige el abogado al que se le asignó el proceso.'}
        </p>
      )}

      {/* El catálogo sale de la lectura del equipo sobre la Ley 1150 de 2007, no
          de un anexo firmado. Mientras la Dirección no lo ratifique, quien
          elige tiene derecho a saberlo. */}
      {catalogoSinConfirmar && (
        <p className="text-[11px] text-slate-500 m-0">
          Catálogo pendiente de ratificación por la Dirección de Contratación.
        </p>
      )}
      {firma.modal}
    </Marco>
  );
}
