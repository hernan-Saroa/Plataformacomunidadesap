import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, FilePlus2, FileText, Paperclip, Send, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { Adenda, EstadoAdendas } from '../../types';
import { Aviso, Ayuda, Boton, campo, Marco, Pendiente, Titulo } from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const ETIQUETA_TIPO = {
  FONDO: 'Requisitos de fondo',
  CRONOGRAMA: 'Cronograma',
} as const;

const TONO_ESTADO = {
  EMITIDA: 'border-amber-200 bg-amber-50 text-amber-900',
  PUBLICADA: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  ANULADA: 'border-gray-200 bg-slate-50 text-slate-500',
} as const;

/**
 * Actividad 5.6 · Adendas del proceso (EFDS-1154).
 *
 * Emitir y publicar están separados en la pantalla como lo están en el negocio:
 * la adenda se firma un día y se publica otro, y hasta que no se publica no
 * produce efectos. En una de cronograma, ese efecto es mover el plazo, así que
 * el panel lo dice antes y lo confirma después.
 */
export function PanelAdendas({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoAdendas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [emitiendo, setEmitiendo] = useState(false);

  const [tipo, setTipo] = useState<'FONDO' | 'CRONOGRAMA'>('FONDO');
  const [objeto, setObjeto] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [documento, setDocumento] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .adendas(procesoId)
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

  const limpiar = () => {
    setObjeto('');
    setVencimiento('');
    setDocumento(null);
    setTipo('FONDO');
    setEmitiendo(false);
  };

  const emitir = async () => {
    if (!objeto.trim() || !documento) return;
    if (tipo === 'CRONOGRAMA' && !vencimiento) return;

    setGuardando(true);
    try {
      setEstado(
        await contratacionService.emitirAdenda(
          procesoId,
          {
            tipo,
            objeto: objeto.trim(),
            vencimientoNuevo: tipo === 'CRONOGRAMA' ? vencimiento : undefined,
          },
          documento,
        ),
      );
      limpiar();
      toast.success('Adenda emitida; publícala para que produzca efectos');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const publicar = async (adenda: Adenda, evidencia: File) => {
    setGuardando(true);
    try {
      const tras = await contratacionService.publicarAdenda(
        procesoId,
        adenda.id,
        hoyEnBogota(),
        evidencia,
      );
      setEstado(tras);

      const publicada = tras.adendas.find((a) => a.id === adenda.id);
      toast.success(
        publicada?.tipo === 'CRONOGRAMA' && publicada.vencimientoNuevo
          ? `Adenda publicada; el plazo vence ahora el ${fechaLarga(publicada.vencimientoNuevo)}`
          : 'Adenda publicada',
      );
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const anular = async (adenda: Adenda) => {
    const motivo = window.prompt(`¿Por qué se anula la adenda ${adenda.numero}?`)?.trim();
    if (!motivo) return;

    setGuardando(true);
    try {
      setEstado(await contratacionService.anularAdenda(procesoId, adenda.id, motivo));
      toast.success('Adenda anulada');
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando las adendas…</p>
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
        <Titulo>Adendas del proceso</Titulo>
        <Aviso tono="aviso" titulo="Esta modalidad no admite adendas">
          {estado.motivoNoAplica ?? 'La modalidad del proceso no publica pliego que modificar.'}
        </Aviso>
      </Marco>
    );
  }

  return (
    <Marco>
      <Titulo>Adendas del proceso</Titulo>
      <Ayuda>
        Modificaciones al pliego ya publicado. Una adenda emitida queda en el expediente, pero solo
        produce efectos cuando se publica.
      </Ayuda>

      {estado.adendas.length > 0 ? (
        <div className="space-y-2">
          {estado.adendas.map((adenda) => (
            <FilaAdenda
              key={adenda.id}
              adenda={adenda}
              ocupada={guardando}
              onPublicar={(archivo) => publicar(adenda, archivo)}
              onAnular={() => anular(adenda)}
            />
          ))}
        </div>
      ) : null}

      {/* Sin pliego publicado no hay nada que adendar; con el proceso abierto
          rige el pliego definitivo. Se dice cuál de las dos cosas pasa. */}
      {!estado.publicado ? (
        <Pendiente
          falta="5.2"
          texto="Todavía no hay proyecto de pliego publicado: una adenda modifica algo que ya se hizo público."
        />
      ) : estado.abierto ? (
        <Aviso tono="aviso" titulo="El proceso ya fue abierto">
          A partir de la apertura rige el pliego definitivo, así que no se emiten más adendas.
        </Aviso>
      ) : emitiendo ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Nueva adenda</p>

          <div>
            <label htmlFor="adenda-tipo" className="block text-xs font-bold text-gray-600 mb-1.5">
              Qué modifica <span className="text-red-600">*</span>
            </label>
            <select
              id="adenda-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'FONDO' | 'CRONOGRAMA')}
              className={campo}
            >
              <option value="FONDO">Requisitos de fondo</option>
              <option value="CRONOGRAMA">Cronograma</option>
            </select>
          </div>

          <div>
            <label htmlFor="adenda-objeto" className="block text-xs font-bold text-gray-600 mb-1.5">
              Objeto del cambio <span className="text-red-600">*</span>
            </label>
            <textarea
              id="adenda-objeto"
              value={objeto}
              onChange={(e) => setObjeto(e.target.value)}
              rows={3}
              placeholder="Qué se modifica del pliego publicado"
              className={campo}
            />
          </div>

          {tipo === 'CRONOGRAMA' ? (
            <div>
              <label
                htmlFor="adenda-vencimiento"
                className="block text-xs font-bold text-gray-600 mb-1.5"
              >
                Nuevo vencimiento del plazo <span className="text-red-600">*</span>
              </label>
              <input
                id="adenda-vencimiento"
                type="date"
                value={vencimiento}
                onChange={(e) => setVencimiento(e.target.value)}
                className={campo}
              />
              <p className="text-[11px] text-gray-500 mt-1.5 mb-0 leading-relaxed">
                {estado.vencimientoVigente
                  ? `Hoy vence el ${fechaLarga(estado.vencimientoVigente)}. Una adenda de cronograma prorroga: la fecha nueva debe ser posterior.`
                  : 'Debe ser posterior al vencimiento vigente: una adenda de cronograma prorroga el plazo.'}
              </p>
            </div>
          ) : null}

          <SelectorArchivo
            etiqueta="Documento firmado de la adenda"
            archivo={documento}
            onElegir={setDocumento}
          />

          <div className="flex items-center gap-2">
            <Boton
              icono={<FilePlus2 className="w-3.5 h-3.5" />}
              disabled={
                guardando ||
                !objeto.trim() ||
                !documento ||
                (tipo === 'CRONOGRAMA' && !vencimiento)
              }
              onClick={emitir}
            >
              {guardando ? 'Emitiendo…' : 'Emitir adenda'}
            </Boton>
            <button
              type="button"
              onClick={limpiar}
              className="text-[11.5px] font-bold text-slate-500 hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <Boton icono={<FilePlus2 className="w-3.5 h-3.5" />} onClick={() => setEmitiendo(true)}>
          Emitir una adenda
        </Boton>
      )}
    </Marco>
  );
}

/** Una adenda con su estado y las acciones que admite. */
function FilaAdenda({
  adenda,
  ocupada,
  onPublicar,
  onAnular,
}: {
  adenda: Adenda;
  ocupada: boolean;
  onPublicar: (evidencia: File) => void;
  onAnular: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const anulada = adenda.estado === 'ANULADA';

  return (
    <div className={`rounded-lg border px-3.5 py-3 ${TONO_ESTADO[adenda.estado]}`}>
      <div className="flex items-start gap-2.5">
        {adenda.tipo === 'CRONOGRAMA' ? (
          <CalendarClock className="w-4 h-4 mt-0.5 flex-shrink-0" />
        ) : (
          <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold m-0">
            Adenda {adenda.numero} · {ETIQUETA_TIPO[adenda.tipo]}
          </p>
          <p
            className={`text-[11.5px] m-0 mt-0.5 leading-relaxed break-words ${
              anulada ? 'line-through' : ''
            }`}
          >
            {adenda.objeto}
          </p>

          {adenda.estado === 'PUBLICADA' && adenda.fechaPublicacion ? (
            <p className="text-[11px] m-0 mt-1 leading-relaxed">
              Publicada el {fechaLarga(adenda.fechaPublicacion)}
              {/* El efecto de una adenda de cronograma se enseña como el cambio
                  que fue, no solo como la fecha resultante. */}
              {adenda.tipo === 'CRONOGRAMA' && adenda.vencimientoNuevo
                ? ` · el plazo pasó ${
                    adenda.vencimientoAnterior
                      ? `del ${fechaLarga(adenda.vencimientoAnterior)} `
                      : ''
                  }al ${fechaLarga(adenda.vencimientoNuevo)}`
                : ''}
            </p>
          ) : null}

          {anulada && adenda.motivoAnulacion ? (
            <p className="text-[11px] m-0 mt-1 leading-relaxed">Anulada: {adenda.motivoAnulacion}</p>
          ) : null}
        </div>
      </div>

      {adenda.estado === 'EMITIDA' ? (
        <>
          <input
            ref={input}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              e.target.value = '';
              if (archivo) onPublicar(archivo);
            }}
          />
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              disabled={ocupada}
              onClick={() => input.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm disabled:opacity-50 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Publicar con evidencia
            </button>
            <button
              type="button"
              disabled={ocupada}
              onClick={onAnular}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-all"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Anular
            </button>
          </div>
        </>
      ) : null}
    </div>
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
