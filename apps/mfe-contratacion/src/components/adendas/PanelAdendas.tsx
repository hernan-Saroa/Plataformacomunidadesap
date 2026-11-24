import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, FilePlus2, FileText, Paperclip, Plus, Send, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  Adenda,
  CambioCronogramaAdenda,
  CronogramaPorEtapas,
  EstadoAdendas,
  EvidenciaFirmaOtp,
} from '../../types';
import { Aviso, Ayuda, Boton, campo, Marco, Pendiente, Titulo } from '../shared/PiezasPanel';
import { Permitido } from '../shared/Permitido';
import { fechaLarga, hoyEnBogota } from '../shared/fechas';
import { useFirma } from '../shared/useFirma';
import { useDialogo } from '../shared/useDialogo';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const NUMERAL = '5.13';

const ETIQUETA_TIPO = {
  FONDO: 'Requisitos de fondo',
  CRONOGRAMA: 'Cronograma',
} as const;

/** Una fecha del cronograma que la adenda mueve, mientras se llena (139). */
interface FilaCambio {
  llave: number;
  /** «ETAPA:6» o «ACTIVIDAD:<numeral o id>». */
  opcion: string;
  fechaInicio: string;
  fechaFin: string;
}

/** Lo que se puede mover del cronograma de la 5.2, con la fecha que tiene hoy. */
function opcionesDelCronograma(cronograma: CronogramaPorEtapas | null, sinCierre: boolean) {
  if (!cronograma) return [];
  const hoy = (fin: string | null) => (fin ? `hoy hasta el ${fechaLarga(fin)}` : 'sin programar');
  return [
    ...cronograma.etapas
      .filter((e) => e.estado !== 'CUMPLIDA')
      .map((e) => ({
        valor: `ETAPA:${e.etapa}`,
        nombre: `Etapa ${e.etapa} · ${e.nombre} (${hoy(e.fechaFin)})`,
      })),
    ...(cronograma.actividades ?? [])
      .filter((a) => a.estado !== 'CUMPLIDA' && !(sinCierre && a.numeral === '6.1'))
      .map((a) => ({
        valor: `ACTIVIDAD:${a.numeral ?? a.id}`,
        nombre: `${a.numeral ? `${a.numeral} · ` : ''}${a.nombre}${a.propia ? ' (propia)' : ''} (${hoy(a.fechaFin)})`,
      })),
  ];
}

const TONO_ESTADO = {
  EMITIDA: 'border-amber-200 bg-amber-50 text-amber-900',
  PUBLICADA: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  ANULADA: 'border-gray-200 bg-slate-50 text-slate-500',
} as const;

/**
 * Actividad 5.13 · Adendas del proceso (EFDS-1154).
 *
 * Emitir y publicar están separados en la pantalla como lo están en el negocio:
 * la adenda se firma un día y se publica otro, y hasta que no se publica no
 * produce efectos. En una de cronograma, ese efecto es mover el plazo, así que
 * el panel lo dice antes y lo confirma después.
 */
export function PanelAdendas({ procesoId, onCambio }: Props) {
  const dialogo = useDialogo();
  const firma = useFirma(NUMERAL, 'Publicar o anular la adenda');
  const [estado, setEstado] = useState<EstadoAdendas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [emitiendo, setEmitiendo] = useState(false);

  const [tipo, setTipo] = useState<'FONDO' | 'CRONOGRAMA'>('FONDO');
  const [objeto, setObjeto] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  /** Hora del nuevo cierre de ofertas; vacía conserva la del cronograma (EFDS-1155). */
  const [hora, setHora] = useState('');
  const [documento, setDocumento] = useState<File | null>(null);
  /** Otras fechas del cronograma de la 5.2 que mueve la adenda (139). */
  const [cambios, setCambios] = useState<FilaCambio[]>([]);
  const [cronograma, setCronograma] = useState<CronogramaPorEtapas | null>(null);

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

  // El cronograma se pide al abrir el formulario: es lo que la adenda puede mover.
  useEffect(() => {
    if (!emitiendo) return;
    contratacionService
      .cronograma(procesoId)
      .then(setCronograma)
      .catch(() => setCronograma(null));
  }, [emitiendo, procesoId]);

  const limpiar = () => {
    setObjeto('');
    setVencimiento('');
    setHora('');
    setDocumento(null);
    setTipo('FONDO');
    setCambios([]);
    setEmitiendo(false);
  };

  // Cerrada la recepción de ofertas solo caben las de cronograma, y ya no
  // mueven una fecha que la plataforma controle (revisión de QA de EFDS-1154).
  const soloCronograma = !!estado?.soloCronograma;
  const tipoElegido = soloCronograma ? 'CRONOGRAMA' : tipo;
  const pideVencimiento = tipoElegido === 'CRONOGRAMA' && !soloCronograma;
  // Solo el cierre de ofertas tiene hora; el plazo de observaciones es un día.
  const pideHora = pideVencimiento && estado?.mueve === 'CIERRE_OFERTAS';

  // Si la adenda mueve el cierre, la 6.1 del cronograma se mueve con él.
  const opciones = opcionesDelCronograma(cronograma, pideHora);
  const cambiosAEnviar: CambioCronogramaAdenda[] =
    tipoElegido === 'CRONOGRAMA'
      ? cambios.map((c) => {
          const [ambito, ...resto] = c.opcion.split(':');
          return {
            ambito: ambito as 'ETAPA' | 'ACTIVIDAD',
            clave: resto.join(':'),
            fechaInicio: c.fechaInicio || null,
            fechaFin: c.fechaFin,
          };
        })
      : [];
  const problemaCambios = cambios
    .map((c, i) => {
      if (!c.opcion) return `Fecha ${i + 1} del cronograma: elige qué mueve`;
      if (!c.fechaFin) return `Fecha ${i + 1} del cronograma: falta la nueva fecha de fin`;
      if (c.fechaInicio && c.fechaInicio > c.fechaFin) return `Fecha ${i + 1} del cronograma: el inicio va después del fin`;
      if (cambios.findIndex((x) => x.opcion === c.opcion) !== i) return `Fecha ${i + 1} del cronograma: ya está arriba`;
      return null;
    })
    .find(Boolean);
  // Desde la 139 una de cronograma puede mover solo fechas del cronograma.
  const faltaVencimiento = pideVencimiento && !vencimiento && cambios.length === 0;

  const emitir = async () => {
    if (!objeto.trim() || !documento) return;
    if (faltaVencimiento || (tipoElegido === 'CRONOGRAMA' && problemaCambios)) return;

    setGuardando(true);
    try {
      setEstado(
        await contratacionService.emitirAdenda(
          procesoId,
          {
            tipo: tipoElegido,
            objeto: objeto.trim(),
            vencimientoNuevo: pideVencimiento && vencimiento ? vencimiento : undefined,
            horaNueva: pideHora && vencimiento && hora ? hora : undefined,
            cambiosCronograma: cambiosAEnviar.length ? cambiosAEnviar : undefined,
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

  const publicar = async (adenda: Adenda, evidencia: File, firmaOtp?: EvidenciaFirmaOtp) => {
    setGuardando(true);
    try {
      const tras = await contratacionService.publicarAdenda(
        procesoId,
        adenda.id,
        hoyEnBogota(),
        evidencia,
        firmaOtp,
      );
      setEstado(tras);

      const publicada = tras.adendas.find((a) => a.id === adenda.id);
      const movidas = publicada?.cambiosCronograma?.length ?? 0;
      toast.success(
        (publicada?.tipo === 'CRONOGRAMA' && publicada.vencimientoNuevo
          ? `Adenda publicada; el plazo vence ahora el ${momento(publicada.vencimientoNuevo, publicada.horaNueva ?? publicada.horaAnterior)}`
          : 'Adenda publicada') +
          (movidas ? `. Se ${movidas === 1 ? 'movió 1 fecha' : `movieron ${movidas} fechas`} del cronograma` : ''),
      );
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const anular = async (adenda: Adenda, firmaOtp?: EvidenciaFirmaOtp) => {
    const motivo = await dialogo.pedirMotivo({
      titulo: `Anular la adenda ${adenda.numero}`,
      descripcion: 'La adenda anulada se conserva en el expediente con el motivo: lo publicado no se borra.',
      etiqueta: 'Motivo de la anulación',
      placeholder: 'Se publicó con la fecha de cierre equivocada…',
      confirmar: 'Anular la adenda',
      tono: 'peligro',
    });
    if (!motivo) return;

    setGuardando(true);
    try {
      setEstado(await contratacionService.anularAdenda(procesoId, adenda.id, motivo, firmaOtp));
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
              puedeGestionar={estado.puedeGestionar}
              onPublicar={(archivo) => firma.conFirma((firmaOtp) => publicar(adenda, archivo, firmaOtp))}
              onAnular={() => firma.conFirma((firmaOtp) => anular(adenda, firmaOtp))}
            />
          ))}
        </div>
      ) : null}

      {/* Desde la 112, como en la matriz: las adendas van de la apertura al
          cierre de ofertas (donde no hay apertura, desde la publicación). Se
          dice qué falta o qué las cerró, en vez de esconder el botón. */}
      {!estado.publicado ? (
        <Pendiente
          falta="5.3"
          texto="Todavía no hay pliego publicado en SECOP II: una adenda modifica algo que ya se hizo público."
        />
      ) : !estado.puedeEmitir && !estado.abierto ? (
        <Pendiente
          falta="5.7"
          texto={
            estado.motivoNoPuedeEmitir ??
            'Las adendas se emiten a partir de la apertura del proceso.'
          }
        />
      ) : !estado.puedeGestionar ? (
        <Aviso tono="aviso" titulo="Solo de consulta">
          {estado.motivoNoPuedeEmitir ?? 'Las adendas las genera el abogado dueño del proceso.'}
        </Aviso>
      ) : !estado.puedeEmitir ? (
        <Aviso tono="aviso" titulo="Ya no se emiten adendas">
          {estado.motivoNoPuedeEmitir ?? 'El pliego ya no admite adendas.'}
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
              value={tipoElegido}
              onChange={(e) => setTipo(e.target.value as 'FONDO' | 'CRONOGRAMA')}
              className={campo}
            >
              {!soloCronograma && <option value="FONDO">Requisitos de fondo</option>}
              <option value="CRONOGRAMA">Cronograma</option>
            </select>
            {soloCronograma && (
              <p className="text-[11px] text-gray-500 mt-1.5 mb-0 leading-relaxed">
                {estado.motivoNoFondo} Las nuevas fechas de evaluación o adjudicación van en el
                documento de la adenda.
              </p>
            )}
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

          {pideVencimiento ? (
            <div>
              <label
                htmlFor="adenda-vencimiento"
                className="block text-xs font-bold text-gray-600 mb-1.5"
              >
                {estado.mueve === 'CIERRE_OFERTAS'
                  ? 'Nueva fecha de cierre de ofertas'
                  : 'Nuevo vencimiento del plazo de observaciones'}{' '}
                {cambios.length === 0 ? <span className="text-red-600">*</span> : null}
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="adenda-vencimiento"
                  type="date"
                  value={vencimiento}
                  onChange={(e) => setVencimiento(e.target.value)}
                  className={`${campo} flex-1`}
                  style={{ minWidth: 150 }}
                />
                {/* El cierre de ofertas se fija con hora: «hasta las 10:00 a.m.
                    del día X». Vacía, se conserva la del cronograma. */}
                {pideHora ? (
                  <input
                    id="adenda-hora"
                    type="time"
                    aria-label="Hora del nuevo cierre de ofertas"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className={campo}
                    style={{ width: 130 }}
                  />
                ) : null}
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5 mb-0 leading-relaxed">
                {estado.vencimientoVigente
                  ? `Hoy vence el ${momento(estado.vencimientoVigente, estado.horaVigente)}. Una adenda de cronograma prorroga: ${pideHora ? 'el nuevo cierre' : 'la fecha nueva'} debe ser posterior.`
                  : 'Debe ser posterior al vencimiento vigente: una adenda de cronograma prorroga el plazo.'}
                {pideHora
                  ? ' Si dejas la hora vacía se conserva la del cronograma. Mientras la adenda no se publique, el cierre vigente sigue siendo el de hoy.'
                  : ''}
                {' '}Si la adenda solo mueve otras fechas del cronograma, déjala vacía.
              </p>
            </div>
          ) : null}

          {/* Las demás fechas del cronograma de la 5.2 que mueve (139): se
              aplican al publicarla, como el nuevo cierre. */}
          {tipoElegido === 'CRONOGRAMA' && opciones.length > 0 ? (
            <div className="space-y-1.5">
              <p className="block text-xs font-bold text-gray-600 m-0">Fechas del cronograma que mueve</p>
              <p className="text-[11px] text-gray-500 m-0 leading-relaxed">
                Etapas o actividades del cronograma de la 5.2, incluidas las propias del proceso. Se
                aplican cuando la adenda se publica y quedan en el historial del cronograma.
                {pideHora ? ' La 6.1 se mueve con la nueva fecha de cierre.' : ''}
              </p>
              {cambios.map((c, i) => (
                <div key={c.llave} className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={`Qué mueve la fecha ${i + 1} del cronograma`}
                    value={c.opcion}
                    onChange={(e) =>
                      setCambios((cs) => cs.map((x) => (x.llave === c.llave ? { ...x, opcion: e.target.value } : x)))
                    }
                    className={`${campo} flex-1`}
                    style={{ minWidth: 220 }}
                  >
                    <option value="">Elige la etapa o actividad…</option>
                    {opciones.map((o) => (
                      <option key={o.valor} value={o.valor}>
                        {o.nombre}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    aria-label={`Nuevo inicio de la fecha ${i + 1} del cronograma`}
                    title="Nuevo inicio (opcional: vacío conserva el que tiene)"
                    value={c.fechaInicio}
                    onChange={(e) =>
                      setCambios((cs) => cs.map((x) => (x.llave === c.llave ? { ...x, fechaInicio: e.target.value } : x)))
                    }
                    className={campo}
                    style={{ width: 150 }}
                  />
                  <input
                    type="date"
                    aria-label={`Nuevo fin de la fecha ${i + 1} del cronograma`}
                    value={c.fechaFin}
                    onChange={(e) =>
                      setCambios((cs) => cs.map((x) => (x.llave === c.llave ? { ...x, fechaFin: e.target.value } : x)))
                    }
                    className={campo}
                    style={{ width: 150 }}
                  />
                  <button
                    type="button"
                    aria-label={`Quitar la fecha ${i + 1} del cronograma`}
                    onClick={() => setCambios((cs) => cs.filter((x) => x.llave !== c.llave))}
                    className="text-xs font-bold text-red-700 hover:underline inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setCambios((cs) => [
                    ...cs,
                    { llave: (cs.length ? cs[cs.length - 1].llave : 0) + 1, opcion: '', fechaInicio: '', fechaFin: '' },
                  ])
                }
                className="text-xs font-bold text-[#003DA5] hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Mover una fecha del cronograma
              </button>
              {problemaCambios ? <p className="text-xs text-red-700 m-0">{problemaCambios}</p> : null}
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
                faltaVencimiento ||
                (tipoElegido === 'CRONOGRAMA' && !!problemaCambios)
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
        <Permitido accion="editar" punto="5.13" quien="el gestor de contratación">
          <Boton icono={<FilePlus2 className="w-3.5 h-3.5" />} onClick={() => setEmitiendo(true)}>
            Emitir una adenda
          </Boton>
        </Permitido>
      )}
      {firma.modal}
      {dialogo.elemento}
    </Marco>
  );
}

/** Un día con la hora del cierre, si la tiene: «12 de noviembre de 2026 a las 10:00». */
function momento(dia: string, hora: string | null) {
  return `${fechaLarga(dia)}${hora ? ` a las ${hora.slice(0, 5)}` : ''}`;
}

/** Una adenda con su estado y las acciones que admite. */
function FilaAdenda({
  adenda,
  ocupada,
  puedeGestionar,
  onPublicar,
  onAnular,
}: {
  adenda: Adenda;
  ocupada: boolean;
  /** Publicar y anular también son del abogado dueño (EFDS-1154). */
  puedeGestionar: boolean;
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
                      ? `del ${momento(adenda.vencimientoAnterior, adenda.horaAnterior)} `
                      : ''
                  }al ${momento(adenda.vencimientoNuevo, adenda.horaNueva ?? adenda.horaAnterior)}`
                : ''}
            </p>
          ) : null}

          {/* Las fechas del cronograma que mueve (139): antes de publicarla, lo
              que hará; publicada, el cambio que fue. */}
          {adenda.tipo === 'CRONOGRAMA' && adenda.cambiosCronograma?.length && !anulada ? (
            <div className="mt-1">
              <p className="text-[11px] font-bold m-0">
                {adenda.estado === 'PUBLICADA' ? 'Movió en el cronograma:' : 'Al publicarse moverá en el cronograma:'}
              </p>
              <ul className="list-none m-0 p-0">
                {adenda.cambiosCronograma.map((c) => (
                  <li key={`${c.ambito}:${c.clave}`} className="text-[11px] leading-relaxed">
                    {c.nombre ?? c.clave}:{' '}
                    {adenda.estado === 'PUBLICADA'
                      ? `${c.antes?.fechaFin ? fechaLarga(c.antes.fechaFin) : 'sin fecha'} → `
                      : 'hasta el '}
                    {fechaLarga(c.fechaFin)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {anulada && adenda.motivoAnulacion ? (
            <p className="text-[11px] m-0 mt-1 leading-relaxed">Anulada: {adenda.motivoAnulacion}</p>
          ) : null}
        </div>
      </div>

      {adenda.estado === 'EMITIDA' && puedeGestionar ? (
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
