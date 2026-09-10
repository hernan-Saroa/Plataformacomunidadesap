import React, { useState } from 'react';
import { Ban, Download, Megaphone, Undo2, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  CausalDesierta,
  DeclaratoriaDesierta,
  EstadoDeclaratoriaDesierta,
} from '../../types';
import { Aviso, Boton, BotonSecundario, campo } from '../shared/PiezasPanel';
import { fechaLarga, momentoConHora } from '../shared/fechas';

interface Props {
  procesoId: string;
  estado: EstadoDeclaratoriaDesierta;
  /** Se llama después de cada acción para que el panel de la etapa se relea entero. */
  onCambio: () => Promise<void> | void;
}

const ETIQUETA_CAUSAL: Record<CausalDesierta, string> = {
  SIN_OFERTAS: 'No se presentó ninguna oferta',
  SIN_OFERTAS_HABILITADAS: 'Ninguna oferta quedó habilitada',
};

/**
 * Declaratoria desierta — etapa 7 (EFDS-1160, RF-ADJ-02).
 *
 * El otro desenlace del proceso, dentro del mismo panel de la adjudicación:
 * para el usuario la etapa 7 es una sola pantalla que termina de una de dos
 * maneras, y separarla obligaría a saber de antemano cuál va a ser.
 *
 * Lo que la pantalla insiste en decir es de dónde sale la causal: **no se
 * elige, se deduce del expediente**. Si el proceso recibió ofertas, la única
 * causal posible es que ninguna quedara habilitada, y viceversa. Ofrecer las
 * dos sería invitar a firmar un acto que contradice la lista de oferentes.
 */
export function PanelDesierta({ procesoId, estado, onCambio }: Props) {
  const [declarando, setDeclarando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [motivo, setMotivo] = useState('');
  const [numeroActo, setNumeroActo] = useState('');
  const [fechaActo, setFechaActo] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [actoArchivo, setActoArchivo] = useState<File | null>(null);
  const [informeComite, setInformeComite] = useState<File | null>(null);

  const [medio, setMedio] = useState('');
  const [evidencia, setEvidencia] = useState<File | null>(null);

  // La causal la fija el expediente, no el usuario: si hubo ofertas es que
  // ninguna quedó habilitada, y si no hubo es que no se presentó nadie.
  const causal: CausalDesierta | null = estado.causalesPosibles[0] ?? null;
  const exigeInforme = causal === 'SIN_OFERTAS_HABILITADAS';
  const exigeJustificacion = !!estado.ganadoraDelComite;

  const conGuardado = async (accion: () => Promise<unknown>, exito: string) => {
    setGuardando(true);
    try {
      await accion();
      await onCambio();
      toast.success(exito);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const declarar = () =>
    conGuardado(async () => {
      await contratacionService.declararDesierto(
        procesoId,
        {
          causal: causal as CausalDesierta,
          motivo: motivo.trim(),
          numeroActo: numeroActo.trim(),
          fechaActo,
          justificacion: justificacion.trim() || undefined,
        },
        actoArchivo as File,
        exigeInforme ? informeComite : null,
      );
      setDeclarando(false);
      setMotivo('');
      setNumeroActo('');
      setFechaActo('');
      setJustificacion('');
      setActoArchivo(null);
      setInformeComite(null);
    }, 'Proceso declarado desierto');

  const publicar = () =>
    conGuardado(async () => {
      await contratacionService.publicarDeclaratoriaDesierta(
        procesoId,
        { medioPublicacion: medio.trim() },
        evidencia as File,
      );
      setMedio('');
      setEvidencia(null);
    }, 'Declaratoria notificada y publicada');

  const revocar = async () => {
    const razon = window.prompt('¿Por qué se revoca la declaratoria desierta?')?.trim();
    if (!razon) return;
    await conGuardado(
      () => contratacionService.revocarDeclaratoriaDesierta(procesoId, razon),
      'Declaratoria revocada',
    );
  };

  // La modalidad no recibe ofertas: no hay nada que declarar desierto y decirlo
  // vale más que esconder la sección.
  if (!estado.aplica) return null;

  const vigente = estado.declaratoria;

  return (
    <div className="space-y-2.5 pt-1">
      <p className="text-[12.5px] font-bold text-slate-800 m-0">Declaratoria desierta</p>

      {vigente ? (
        <ResumenDeclaratoria declaratoria={vigente} />
      ) : (
        <p className="text-[12px] text-slate-500 m-0">
          El otro desenlace posible: si el proceso no termina en adjudicación, se declara desierto
          por acto motivado.
        </p>
      )}

      {!vigente && estado.adjudicado && (
        <Aviso tono="aviso" titulo="El proceso ya está adjudicado">
          Adjudicado y desierto a la vez es una contradicción que el expediente no puede sostener.
          Revoca el acto de adjudicación antes de declararlo desierto.
        </Aviso>
      )}

      {!vigente && !estado.adjudicado && !estado.recepcionCerrada && (
        <p className="text-[11.5px] text-slate-500 m-0 leading-relaxed">
          La recepción de ofertas sigue abierta: mientras el plazo corra, «no hay ofertas» todavía
          no es un hecho.
        </p>
      )}

      {estado.puedeDeclarar &&
        (declarando ? (
          <div className="border border-gray-200 rounded-lg p-3 space-y-2.5">
            {/* La causal se muestra resuelta, no se elige: sale del expediente. */}
            <div className="rounded-md bg-slate-50 border border-gray-200 px-3 py-2">
              <p className="text-[11.5px] font-bold text-slate-700 m-0">
                Causal: {causal ? ETIQUETA_CAUSAL[causal] : '—'}
              </p>
              <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed">
                {estado.ofertasRecibidas === 0
                  ? 'La recepción cerró sin oferentes registrados.'
                  : `El proceso recibió ${estado.ofertasRecibidas} oferta(s), así que la causal solo puede ser que ninguna quedara habilitada.`}
              </p>
            </div>

            {exigeJustificacion && (
              <Aviso tono="aviso" titulo="El comité ya registró una ganadora">
                El resultado vigente propone a {estado.ganadoraDelComite?.nombre}. Declarar desierto
                se aparta de él: no está prohibido, pero hay que decir por qué.
              </Aviso>
            )}

            <textarea
              className={`${campo} min-h-[72px]`}
              placeholder="Motivación del acto: por qué el proceso no puede terminar en contrato"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />

            {exigeJustificacion && (
              <textarea
                className={`${campo} min-h-[72px]`}
                placeholder={`Por qué se declara desierto pese a que el comité propuso a ${estado.ganadoraDelComite?.nombre}`}
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
              />
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <input
                className={campo}
                placeholder="Número de la resolución"
                value={numeroActo}
                onChange={(e) => setNumeroActo(e.target.value)}
              />
              <input
                type="date"
                className={campo}
                value={fechaActo}
                onChange={(e) => setFechaActo(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer">
              <UploadCloud size={15} className="text-slate-400" />
              <span>{actoArchivo?.name ?? 'Adjuntar la resolución firmada'}</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setActoArchivo(e.target.files?.[0] ?? null)}
              />
            </label>

            {exigeInforme && (
              <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer">
                <UploadCloud size={15} className="text-slate-400" />
                <span>
                  {informeComite?.name ?? 'Adjuntar el informe del comité (ninguna habilitada)'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setInformeComite(e.target.files?.[0] ?? null)}
                />
              </label>
            )}

            <div className="flex gap-2">
              <Boton
                icono={<Ban className="w-3.5 h-3.5" />}
                onClick={declarar}
                disabled={
                  guardando ||
                  !causal ||
                  motivo.trim().length < 10 ||
                  !numeroActo.trim() ||
                  !fechaActo ||
                  !actoArchivo ||
                  (exigeInforme && !informeComite) ||
                  (exigeJustificacion && justificacion.trim().length === 0)
                }
              >
                Declarar desierto
              </Boton>
              <BotonSecundario
                icono={<X className="w-3.5 h-3.5" />}
                onClick={() => setDeclarando(false)}
              >
                Cancelar
              </BotonSecundario>
            </div>
          </div>
        ) : (
          <BotonSecundario
            icono={<Ban className="w-3.5 h-3.5" />}
            onClick={() => setDeclarando(true)}
            disabled={guardando}
          >
            Declarar desierto el proceso
          </BotonSecundario>
        ))}

      {vigente && !vigente.publicadaAt && (
        <div className="border border-gray-200 rounded-lg p-3 space-y-2.5">
          <input
            className={campo}
            placeholder="Dónde se publicó y cómo se notificó la declaratoria"
            value={medio}
            onChange={(e) => setMedio(e.target.value)}
          />
          <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer">
            <UploadCloud size={15} className="text-slate-400" />
            <span>{evidencia?.name ?? 'Adjuntar el soporte de la publicación'}</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => setEvidencia(e.target.files?.[0] ?? null)}
            />
          </label>
          <Boton
            icono={<Megaphone className="w-3.5 h-3.5" />}
            onClick={publicar}
            disabled={guardando || !evidencia || medio.trim().length < 10}
          >
            Notificar y publicar
          </Boton>
        </div>
      )}

      {vigente && (
        <BotonSecundario
          icono={<Undo2 className="w-3.5 h-3.5" />}
          onClick={revocar}
          disabled={guardando}
        >
          Revocar la declaratoria
        </BotonSecundario>
      )}

      {estado.revocadas.length > 0 && (
        <div className="pt-1">
          <p className="text-[11.5px] font-bold text-slate-600 m-0">Declaratorias revocadas</p>
          <ul className="list-none p-0 m-0 mt-1 space-y-1">
            {estado.revocadas.map((d) => (
              <li key={d.id} className="text-[11.5px] text-slate-500">
                {d.numeroActo} · {d.motivoRevocacion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** La declaratoria vigente: por qué, con qué acto y con qué sustento. */
function ResumenDeclaratoria({ declaratoria }: { declaratoria: DeclaratoriaDesierta }) {
  const pieza = (doc: { nombre: string; archivoUrl: string } | null) =>
    doc ? (
      <a
        className="text-[11.5px] text-blue-700 inline-flex items-center gap-1"
        href={contratacionService.urlDescarga(doc.archivoUrl)}
      >
        <Download size={12} /> {doc.nombre}
      </a>
    ) : null;

  return (
    <div className="border border-red-200 bg-red-50/30 rounded-lg p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[12.5px] font-bold text-slate-800 m-0">
          <Ban size={13} className="inline mr-1 text-red-700" />
          Proceso declarado desierto · {ETIQUETA_CAUSAL[declaratoria.causal]}
        </p>
        {pieza(declaratoria.acto)}
      </div>

      <p className="text-[12px] text-slate-600 m-0">
        Resolución {declaratoria.numeroActo} del {fechaLarga(declaratoria.fechaActo)} ·{' '}
        {declaratoria.ofertasRecibidas} oferta(s) recibidas
      </p>

      <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">{declaratoria.motivo}</p>

      {declaratoria.seApartaDelResultado && (
        <p className="text-[11.5px] text-amber-800 m-0 leading-relaxed">
          La declaratoria se apartó del resultado que el comité había registrado.
        </p>
      )}

      {declaratoria.informeComite && <div>{pieza(declaratoria.informeComite)}</div>}

      {declaratoria.publicadaAt ? (
        <p className="text-[11.5px] text-slate-500 m-0">
          Notificada el {momentoConHora(declaratoria.notificadaAt ?? declaratoria.publicadaAt)} y
          publicada el {momentoConHora(declaratoria.publicadaAt)}.
        </p>
      ) : (
        <p className="text-[11.5px] text-slate-500 m-0">Todavía sin notificar ni publicar.</p>
      )}
    </div>
  );
}
