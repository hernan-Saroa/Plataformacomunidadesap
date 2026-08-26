import React, { useEffect, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  ExternalLink,
  FileText,
  Globe,
  Paperclip,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  DatosArchivoExpediente,
  DatosPublicacionActa,
  DestinoPublicacionActa,
  EstadoArchivoExpediente,
  IndiceDocumental,
  PublicacionActaRegistrada,
} from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  Pendiente,
  SelectorArchivo,
  Titulo,
} from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const NOMBRE_DESTINO: Record<DestinoPublicacionActa, string> = {
  SECOP_II: 'SECOP II',
  WEB_ESAP: 'página web de la ESAP',
};

const VACIO = {
  destino: 'SECOP_II' as DestinoPublicacionActa,
  fechaPublicacion: hoyEnBogota(),
  secopNumero: '',
  secopUrl: '',
};

const ARCHIVO_VACIO = { radicadoActiveDocument: '', observaciones: '' };

/**
 * Actividad 10.4 · Publicación del acta y archivo del expediente (EFDS-1174).
 *
 * Es la última actividad del proceso. La publicación ocurre en SECOP II y el
 * archivo documental en Active Document: la pantalla lo dice en vez de aparentar
 * que el dato viene de allá, con el mismo criterio del resto del módulo.
 *
 * Lo que sí es propio de la plataforma es el índice congelado, y por eso va a la
 * vista: es lo que convierte «archivado» en algo que se puede probar.
 */
export function PanelArchivoExpediente({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoArchivoExpediente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [publicando, setPublicando] = useState(false);
  const [datos, setDatos] = useState(VACIO);
  const [evidencia, setEvidencia] = useState<File | null>(null);

  const [archivando, setArchivando] = useState(false);
  const [datosArchivo, setDatosArchivo] = useState(ARCHIVO_VACIO);

  const leer = () =>
    contratacionService
      .archivoExpediente(procesoId)
      .then((respuesta) => {
        setEstado(respuesta);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId]);

  const publicar = async () => {
    if (!evidencia) return;

    const cuerpo: DatosPublicacionActa = {
      destino: datos.destino,
      fechaPublicacion: datos.fechaPublicacion,
      ...(datos.secopNumero.trim() ? { secopNumero: datos.secopNumero.trim() } : {}),
      ...(datos.secopUrl.trim() ? { secopUrl: datos.secopUrl.trim() } : {}),
    };

    setGuardando(true);
    try {
      setEstado(await contratacionService.publicarActa(procesoId, cuerpo, evidencia));
      setDatos(VACIO);
      setEvidencia(null);
      setPublicando(false);
      toast.success('Publicación registrada');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const archivar = async () => {
    const cuerpo: DatosArchivoExpediente = {
      ...(datosArchivo.radicadoActiveDocument.trim()
        ? { radicadoActiveDocument: datosArchivo.radicadoActiveDocument.trim() }
        : {}),
      ...(datosArchivo.observaciones.trim()
        ? { observaciones: datosArchivo.observaciones.trim() }
        : {}),
    };

    setGuardando(true);
    try {
      setEstado(await contratacionService.archivarExpediente(procesoId, cuerpo));
      setDatosArchivo(ARCHIVO_VACIO);
      setArchivando(false);
      toast.success('Expediente archivado');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const reabrir = async () => {
    const motivo = window.prompt('¿Por qué se reabre el expediente?')?.trim();
    if (!motivo) return;

    setGuardando(true);
    try {
      setEstado(await contratacionService.reabrirExpediente(procesoId, motivo));
      toast.success('Expediente reabierto');
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando la publicación y el archivo…</p>
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

  const archivado = estado.expediente?.estado === 'ARCHIVADO';

  return (
    <Marco>
      <Titulo>Publicación del acta y archivo del expediente</Titulo>
      <Ayuda>
        El Archivo de Gestión publica el acta de liquidación y archiva el expediente, que queda
        disponible para consulta y auditoría. La publicación se hace en SECOP II y el archivo
        documental en Active Document: aquí se registran con su soporte.
      </Ayuda>

      {/* El plazo sin confirmar se advierte en vez de mostrarse como cierto. */}
      {!estado.plazo.confirmado ? (
        <Aviso tono="aviso" titulo={`Plazo tentativo: ${estado.plazo.diasHabiles} días hábiles`}>
          {estado.plazo.fundamento ??
            'Ninguna fuente del proyecto fija un plazo propio para publicar el acta.'}
        </Aviso>
      ) : null}

      {/* ------------------------------------------------ el expediente -- */}
      {archivado && estado.expediente ? (
        <>
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <Archive className="w-4 h-4 mt-0.5 flex-shrink-0 text-violet-900" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-violet-900 m-0">
                  Expediente {estado.expediente.numeroExpediente} archivado
                  {estado.expediente.archivadoAt
                    ? ` el ${momento(estado.expediente.archivadoAt)}`
                    : ''}
                </p>
                <p className="text-[11.5px] text-violet-900 m-0 mt-0.5 leading-relaxed break-words">
                  {estado.expediente.archivadoPor ? `Por ${estado.expediente.archivadoPor}` : ''}
                  {estado.expediente.radicadoActiveDocument
                    ? ` · radicado ${estado.expediente.radicadoActiveDocument}`
                    : ' · sin radicado de Active Document'}
                </p>
              </div>
            </div>
          </div>

          {estado.expediente.observacionesArchivo ? (
            <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
              <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed whitespace-pre-line break-words">
                {estado.expediente.observacionesArchivo}
              </p>
            </div>
          ) : null}

          {estado.expediente.indiceDocumental ? (
            <Indice indice={estado.expediente.indiceDocumental} />
          ) : null}

          <BotonSecundario
            icono={<ArchiveRestore className="w-3.5 h-3.5" />}
            disabled={guardando}
            onClick={reabrir}
          >
            Reabrir el expediente
          </BotonSecundario>
        </>
      ) : null}

      {/* La última reapertura, también cuando el expediente ya se volvió a
          archivar: explica por qué el índice pudo cambiar. */}
      {estado.expediente?.reabiertoAt ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Última reapertura</p>
          <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed break-words">
            {momento(estado.expediente.reabiertoAt)}
            {estado.expediente.reabiertoPor ? ` · por ${estado.expediente.reabiertoPor}` : ''}
            {estado.expediente.motivoReapertura ? ` · ${estado.expediente.motivoReapertura}` : ''}
          </p>
        </div>
      ) : null}

      {/* ----------------------------------------------- las publicaciones -- */}
      {estado.publicaciones.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Publicaciones del acta</p>
          {estado.publicaciones.map((p) => (
            <Publicacion key={p.id} publicacion={p} />
          ))}
        </div>
      ) : null}

      {/* ------------------------------------------------- qué falta -- */}
      {!archivado && estado.pendientesArchivo.length > 0 ? (
        <Pendiente
          falta={estado.acta ? '10.3' : '10.2'}
          texto={`Todavía no se puede archivar el expediente: ${estado.pendientesArchivo.join('; ')}.`}
        />
      ) : null}

      {/* ------------------------------------------------ publicar -- */}
      {estado.acta && !archivado && estado.pendientesPublicacion.length > 0 && !publicando ? (
        <Boton icono={<Globe className="w-3.5 h-3.5" />} onClick={() => setPublicando(true)}>
          Registrar la publicación
        </Boton>
      ) : null}

      {publicando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Publicación del acta</p>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="pa-destino" className="block text-xs font-bold text-gray-600 mb-1.5">
                Dónde se publicó <span className="text-red-600">*</span>
              </label>
              <select
                id="pa-destino"
                value={datos.destino}
                onChange={(e) =>
                  setDatos((p) => ({ ...p, destino: e.target.value as DestinoPublicacionActa }))
                }
                className={campo}
              >
                {estado.pendientesPublicacion.map((d) => (
                  <option key={d} value={d}>
                    {NOMBRE_DESTINO[d]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pa-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
                Fecha de la publicación <span className="text-red-600">*</span>
              </label>
              <input
                id="pa-fecha"
                type="date"
                value={datos.fechaPublicacion}
                onChange={(e) => setDatos((p) => ({ ...p, fechaPublicacion: e.target.value }))}
                className={campo}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="pa-numero" className="block text-xs font-bold text-gray-600 mb-1.5">
                Número de la publicación
              </label>
              <input
                id="pa-numero"
                type="text"
                value={datos.secopNumero}
                onChange={(e) => setDatos((p) => ({ ...p, secopNumero: e.target.value }))}
                placeholder="CO1.PCCNTR.000000"
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="pa-url" className="block text-xs font-bold text-gray-600 mb-1.5">
                Enlace
              </label>
              <input
                id="pa-url"
                type="url"
                value={datos.secopUrl}
                onChange={(e) => setDatos((p) => ({ ...p, secopUrl: e.target.value }))}
                placeholder="https://…"
                className={campo}
              />
            </div>
          </div>

          <SelectorArchivo
            id="pa-evidencia"
            etiqueta="Evidencia de la publicación *"
            ayuda="Sin soporte no hay publicación registrada, solo la afirmación de que se hizo."
            archivo={evidencia}
            onElegir={setEvidencia}
          />

          <div className="flex flex-wrap gap-2">
            <Boton
              icono={<Globe className="w-3.5 h-3.5" />}
              disabled={guardando || !evidencia}
              onClick={publicar}
            >
              Registrar la publicación
            </Boton>
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={() => {
                setDatos(VACIO);
                setEvidencia(null);
                setPublicando(false);
              }}
            >
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      ) : null}

      {/* -------------------------------------------------- archivar -- */}
      {estado.puedeArchivar && !archivando ? (
        <Boton icono={<Archive className="w-3.5 h-3.5" />} onClick={() => setArchivando(true)}>
          Archivar el expediente
        </Boton>
      ) : null}

      {estado.puedeArchivar && archivando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Archivo del expediente</p>

          <div>
            <label htmlFor="ae-radicado" className="block text-xs font-bold text-gray-600 mb-1.5">
              Radicado en Active Document
            </label>
            <input
              id="ae-radicado"
              type="text"
              value={datosArchivo.radicadoActiveDocument}
              onChange={(e) =>
                setDatosArchivo((p) => ({ ...p, radicadoActiveDocument: e.target.value }))
              }
              placeholder="AD-2026-000000"
              className={campo}
            />
            <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">
              No hay integración con Active Document: el archivo documental se tramita por fuera y
              aquí se transcribe su radicado.
            </p>
          </div>

          <div>
            <label htmlFor="ae-obs" className="block text-xs font-bold text-gray-600 mb-1.5">
              Observaciones
            </label>
            <textarea
              id="ae-obs"
              rows={2}
              value={datosArchivo.observaciones}
              onChange={(e) => setDatosArchivo((p) => ({ ...p, observaciones: e.target.value }))}
              className={campo}
            />
          </div>

          {/* Qué implica pulsar, junto al botón: el expediente deja de recibir
              documentos y su contenido queda congelado. */}
          <p className="text-[11.5px] text-slate-600 m-0">
            Al archivar se congela el índice de lo que el expediente contiene y deja de admitir
            documentos. Para volver a moverlo hay que reabrirlo con motivo.
          </p>

          <div className="flex flex-wrap gap-2">
            <Boton
              icono={<Archive className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={archivar}
            >
              Archivar el expediente
            </Boton>
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={() => {
                setDatosArchivo(ARCHIVO_VACIO);
                setArchivando(false);
              }}
            >
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      ) : null}
    </Marco>
  );
}

/**
 * Una publicación registrada.
 *
 * Si llegó tarde se dice con esas palabras y en ámbar: publicar fuera del plazo
 * es un hallazgo, y esconderlo en una fecha obligaría a restar días a mano.
 */
function Publicacion({ publicacion }: { publicacion: PublicacionActaRegistrada }) {
  const tarde = publicacion.aTiempo === false;

  return (
    <div className="border-l-2 border-slate-200 pl-2.5">
      <p className="text-[11.5px] font-bold text-slate-700 m-0 break-words">
        {NOMBRE_DESTINO[publicacion.destino]} · {fechaLarga(publicacion.fechaPublicacion)}
        {tarde ? (
          <span className="text-amber-700"> · fuera del plazo</span>
        ) : publicacion.aTiempo ? (
          <span className="text-emerald-700"> · a tiempo</span>
        ) : null}
      </p>
      <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed break-words">
        {publicacion.secopNumero ? `${publicacion.secopNumero} · ` : ''}
        {publicacion.fechaLimite ? `límite ${fechaLarga(publicacion.fechaLimite)}` : ''}
        {publicacion.publicadoPor ? ` · por ${publicacion.publicadoPor}` : ''}
      </p>
      {publicacion.secopUrl ? (
        <a
          href={publicacion.secopUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 mt-1 text-[11.5px] font-bold text-[#003DA5] hover:underline break-words"
        >
          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          Ver la publicación
        </a>
      ) : null}
    </div>
  );
}

/**
 * El índice congelado.
 *
 * Va con el hash a la vista y no solo con el nombre: un documento sustituido
 * conserva el nombre y cambia el hash, y el índice está para notar eso. Se
 * muestran los primeros ocho caracteres, que es lo que sirve para comparar de un
 * vistazo sin llenar la columna.
 */
function Indice({ indice }: { indice: IndiceDocumental }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
      <p className="text-[12.5px] font-bold text-slate-800 m-0 mb-2">
        Índice documental
        <span className="ml-1.5 text-[10.5px] font-bold text-slate-400">
          · congelado al archivar
        </span>
      </p>

      <p className="text-[11.5px] text-slate-600 m-0 mb-2 tabular-nums">
        {indice.totalDocumentos} {indice.totalDocumentos === 1 ? 'documento' : 'documentos'} el{' '}
        {momento(indice.generadoAt)}
      </p>

      <div className="max-h-48 overflow-y-auto space-y-2">
        {indice.documentos.map((d) => (
          <div key={d.id} className="flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-bold text-slate-700 m-0 break-words">
                {d.nombre}
                {d.numeral ? (
                  <span className="text-slate-400 font-normal"> · {d.numeral}</span>
                ) : null}
              </p>
              <p className="text-[11px] text-slate-400 m-0 tabular-nums break-words">
                <Paperclip className="w-3 h-3 inline-block mr-1" />
                {d.hashSha256.slice(0, 8)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
