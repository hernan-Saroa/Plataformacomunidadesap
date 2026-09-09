import React, { useEffect, useRef, useState } from 'react';
import { FileText, Paperclip, ShieldAlert, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoAudienciaRiesgos } from '../../types';
import { Aviso, Ayuda, Boton, campo, Marco, Titulo } from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

/**
 * Actividad 5.5 · Audiencia de asignación de riesgos (EFDS-1153).
 *
 * El sistema no celebra la audiencia: registra que se celebró y guarda lo que
 * produjo. Donde la audiencia es obligatoria, ese registro es lo que habilita
 * la apertura del proceso, así que el panel lo dice antes de que el gestor
 * llegue a la 5.7 y se encuentre bloqueado sin saber por qué.
 */
export function PanelAudienciaRiesgos({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoAudienciaRiesgos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [fecha, setFecha] = useState(hoyEnBogota());
  const [observaciones, setObservaciones] = useState('');
  const [acta, setActa] = useState<File | null>(null);
  const [matriz, setMatriz] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .audienciaRiesgos(procesoId)
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

  const registrar = async () => {
    if (!fecha || !acta || !matriz) return;

    setGuardando(true);
    try {
      setEstado(
        await contratacionService.registrarAudienciaRiesgos(
          procesoId,
          { fechaCelebracion: fecha, observaciones: observaciones.trim() || undefined },
          acta,
          matriz,
        ),
      );
      setActa(null);
      setMatriz(null);
      setObservaciones('');
      toast.success('Audiencia registrada con su matriz de riesgos');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const anular = async () => {
    const motivo = window.prompt('¿Por qué se anula la audiencia registrada?')?.trim();
    if (!motivo) return;

    setGuardando(true);
    try {
      setEstado(await contratacionService.anularAudienciaRiesgos(procesoId, motivo));
      toast.success('Audiencia anulada; registra la corregida');
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando la audiencia de riesgos…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo cargar la actividad">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  if (!estado.aplica) {
    return (
      <Marco>
        <Titulo>Audiencia de asignación de riesgos</Titulo>
        <Aviso tono="aviso" titulo="Esta modalidad no adelanta audiencia de riesgos">
          {estado.motivoNoAplica ??
            'La matriz de flujo no exige esta actividad para la modalidad del proceso.'}
        </Aviso>
      </Marco>
    );
  }

  // Ya celebrada: se muestra con qué quedó y se ofrece corregirla.
  if (estado.celebrada && estado.audiencia) {
    const { fechaCelebracion, acta: actaCargada, matriz: matrizCargada, observaciones: notas } =
      estado.audiencia;

    return (
      <Marco>
        <Titulo>Audiencia de asignación de riesgos</Titulo>
        <Aviso tono="ok" titulo={`Audiencia celebrada el ${fechaLarga(fechaCelebracion)}`}>
          {estado.obligatoria
            ? 'Con esto queda cumplido el requisito que condiciona la apertura del proceso.'
            : 'La matriz de riesgos quedó consolidada en el expediente.'}
        </Aviso>

        {notas ? (
          <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3">
            <p className="text-[12.5px] font-bold text-slate-700 m-0">Observaciones</p>
            <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">{notas}</p>
          </div>
        ) : null}

        <div className="space-y-2">
          {(
            [
              ['Acta de la audiencia', actaCargada],
              ['Matriz de riesgos consolidada', matrizCargada],
            ] as const
          ).map(([etiqueta, doc]) =>
            doc ? (
              <div
                key={etiqueta}
                className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 flex items-start gap-2.5"
              >
                <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-slate-800 m-0">{etiqueta}</p>
                  <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed break-words">
                    {doc.nombre}
                  </p>
                </div>
              </div>
            ) : null,
          )}
        </div>

        <button
          type="button"
          disabled={guardando}
          onClick={anular}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-all"
        >
          <Undo2 className="w-3.5 h-3.5" />
          Anular y corregir
        </button>
      </Marco>
    );
  }

  const listo = !!fecha && !!acta && !!matriz;

  return (
    <Marco>
      <Titulo>Audiencia de asignación de riesgos</Titulo>
      <Ayuda>
        Registra la audiencia ya celebrada y la matriz de riesgos que consolidó. Los dos documentos
        quedan en el expediente con su huella digital.
      </Ayuda>

      {/* Que sea obligatoria se dice aquí y no solo al bloquear la apertura: es
          la diferencia entre planear la audiencia y descubrir en la 5.7 que el
          proceso no puede abrirse. */}
      {estado.obligatoria ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold text-amber-900 m-0">
              Obligatoria en esta modalidad
            </p>
            <p className="text-[11.5px] text-amber-900 m-0 mt-0.5 leading-relaxed">
              {estado.fundamento ?? 'El proceso no puede abrirse mientras no se celebre.'}
              {estado.confirmado
                ? ''
                : ' Regla pendiente de confirmar con la Dirección de Contratación.'}
            </p>
          </div>
        </div>
      ) : null}

      <div>
        <label htmlFor="audiencia-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
          Fecha de celebración <span className="text-red-600">*</span>
        </label>
        <input
          id="audiencia-fecha"
          type="date"
          value={fecha}
          max={hoyEnBogota()}
          onChange={(e) => setFecha(e.target.value)}
          className={campo}
        />
        <p className="text-[11px] text-gray-500 mt-1.5 mb-0 leading-relaxed">
          La del día en que se celebró, no la de hoy: se registra una audiencia ya ocurrida.
        </p>
      </div>

      <div>
        <label
          htmlFor="audiencia-observaciones"
          className="block text-xs font-bold text-gray-600 mb-1.5"
        >
          Observaciones
        </label>
        <textarea
          id="audiencia-observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={3}
          placeholder="Acuerdos o precisiones relevantes de la audiencia"
          className={campo}
        />
      </div>

      <SelectorArchivo etiqueta="Acta de la audiencia" archivo={acta} onElegir={setActa} />
      <SelectorArchivo
        etiqueta="Matriz de riesgos consolidada"
        archivo={matriz}
        onElegir={setMatriz}
      />

      <Boton
        icono={<ShieldAlert className="w-3.5 h-3.5" />}
        disabled={!listo || guardando}
        onClick={registrar}
      >
        {guardando ? 'Registrando…' : 'Registrar la audiencia'}
      </Boton>
    </Marco>
  );
}

/** Adjunto obligatorio, con su nombre cuando ya está elegido. */
function SelectorArchivo({
  etiqueta,
  archivo,
  onElegir,
}: {
  etiqueta: string;
  archivo: File | null;
  onElegir: (archivo: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`rounded-lg border px-3.5 py-3 space-y-2 ${
        archivo ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
      }`}
    >
      <p
        className={`text-xs font-bold m-0 flex items-start gap-1.5 ${
          archivo ? 'text-emerald-900' : 'text-slate-700'
        }`}
      >
        <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        {etiqueta} <span className="text-red-600">*</span>
      </p>
      <p
        className={`text-[11.5px] m-0 leading-relaxed break-words ${
          archivo ? 'text-emerald-900' : 'text-slate-600'
        }`}
      >
        {archivo ? archivo.name : 'Sin archivo seleccionado.'}
      </p>

      <input
        ref={input}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        onChange={(e) => {
          const elegido = e.target.files?.[0];
          e.target.value = '';
          if (elegido) onElegir(elegido);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] transition-all"
      >
        <Paperclip className="w-3.5 h-3.5" />
        {archivo ? 'Cambiar archivo' : 'Seleccionar archivo'}
      </button>
    </div>
  );
}
