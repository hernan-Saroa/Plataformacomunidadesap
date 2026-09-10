import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, Globe, Undo2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DestinoPublicacion, EstadoPublicacionContrato } from '../../types';
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
import { fechaLarga, hoyEnBogota } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const ETIQUETA_DESTINO: Record<DestinoPublicacion, string> = {
  SECOP_II: 'SECOP II',
  WEB_ESAP: 'Página web de la ESAP',
};

/**
 * Actividad 8.8 · Publicación del contrato (EFDS-1166).
 *
 * Se pide el destino porque las fuentes no coinciden: la historia habla de
 * SECOP II y la matriz llama a la actividad «Publicación en página web ESAP».
 * Registrar el sitio reconcilia las dos lecturas sin decidir por Contratación.
 */
export function PanelPublicacionContrato({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoPublicacionContrato | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [registrando, setRegistrando] = useState(false);
  const [datos, setDatos] = useState({
    destino: 'SECOP_II' as DestinoPublicacion,
    fechaPublicacion: hoyEnBogota(),
    secopNumero: '',
    secopUrl: '',
  });
  const [evidencia, setEvidencia] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .publicacionContrato(procesoId)
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

  const limpiar = () => {
    setDatos({
      destino: 'SECOP_II',
      fechaPublicacion: hoyEnBogota(),
      secopNumero: '',
      secopUrl: '',
    });
    setEvidencia(null);
    setRegistrando(false);
  };

  const publicar = async () => {
    if (!evidencia) return;

    setGuardando(true);
    try {
      const respuesta = await contratacionService.publicarContrato(
        procesoId,
        {
          destino: datos.destino,
          fechaPublicacion: datos.fechaPublicacion,
          ...(datos.secopNumero.trim() ? { secopNumero: datos.secopNumero.trim() } : {}),
          ...(datos.secopUrl.trim() ? { secopUrl: datos.secopUrl.trim() } : {}),
        },
        evidencia,
      );
      setEstado(respuesta);
      limpiar();

      const registrada = respuesta.publicaciones.find((p) => p.destino === datos.destino);
      toast.success(
        registrada?.aTiempo === false
          ? 'Publicación registrada, fuera del plazo'
          : 'Publicación registrada',
      );
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando la publicación…</p>
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

  return (
    <Marco>
      <Titulo>Publicación del contrato</Titulo>
      <Ayuda>
        El contrato se publica dentro del plazo legal contado desde su perfeccionamiento. Se
        registra dónde se publicó y con qué evidencia.
      </Ayuda>

      {/* La publicación cierra la etapa, así que espera a las anteriores: la
          última con implementación es la ARL. */}
      {!estado.legalizado ? (
        <Pendiente
          falta="8.5"
          texto={`El contrato se publica cuando está legalizado: ${
            estado.motivoNoLegalizado ?? 'todavía no lo está'
          }.`}
        />
      ) : null}

      {/* Un plazo sin confirmar se advierte en vez de mostrarse como cierto: la
          matriz dice «150» sin unidad y eso no encaja con ningún plazo legal. */}
      {!estado.plazo.confirmado ? (
        <Aviso tono="aviso" titulo={`Plazo de ${estado.plazo.diasHabiles} días hábiles, sin confirmar`}>
          {estado.plazo.fundamento ??
            'La Dirección de Contratación todavía no ha validado este plazo.'}
        </Aviso>
      ) : null}

      {estado.publicaciones.map((p) => (
        <div
          key={p.id}
          className={`rounded-lg border px-3.5 py-3 ${
            p.aTiempo === false ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <Globe
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                p.aTiempo === false ? 'text-amber-900' : 'text-emerald-900'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p
                className={`text-[12.5px] font-bold m-0 break-words ${
                  p.aTiempo === false ? 'text-amber-900' : 'text-emerald-900'
                }`}
              >
                {ETIQUETA_DESTINO[p.destino]} · {fechaLarga(p.fechaPublicacion)}
              </p>
              <p
                className={`text-[11.5px] m-0 mt-0.5 leading-relaxed break-words ${
                  p.aTiempo === false ? 'text-amber-900' : 'text-emerald-900'
                }`}
              >
                {p.aTiempo === false
                  ? `Fuera del plazo: vencía el ${p.fechaLimite ? fechaLarga(p.fechaLimite) : '—'}`
                  : p.fechaLimite
                    ? `Dentro del plazo, que vencía el ${fechaLarga(p.fechaLimite)}`
                    : 'Sin plazo calculado'}
                {p.publicadoPor ? ` · registró ${p.publicadoPor}` : ''}
              </p>
              {p.secopNumero ? (
                <p className="text-[11.5px] text-slate-600 m-0 mt-0.5">Nº {p.secopNumero}</p>
              ) : null}
              {p.secopUrl ? (
                <a
                  href={p.secopUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 mt-1 text-[11.5px] font-bold text-[#003DA5] hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver la publicación
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ))}

      {/* Qué destinos faltan lo dice el servidor: la pantalla no conoce la lista. */}
      {estado.legalizado && estado.pendientes.length > 0 && !registrando ? (
        <Boton
          icono={<Upload className="w-3.5 h-3.5" />}
          onClick={() => {
            setDatos((p) => ({ ...p, destino: estado.pendientes[0] }));
            setRegistrando(true);
          }}
        >
          Registrar publicación en {ETIQUETA_DESTINO[estado.pendientes[0]]}
        </Boton>
      ) : null}

      {estado.legalizado && estado.pendientes.length === 0 ? (
        <Aviso tono="ok" titulo="El contrato está publicado">
          Quedó registrada la publicación en los dos sitios.
        </Aviso>
      ) : null}

      {registrando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Registrar publicación</p>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="pub-destino" className="block text-xs font-bold text-gray-600 mb-1.5">
                Dónde se publicó <span className="text-red-600">*</span>
              </label>
              <select
                id="pub-destino"
                value={datos.destino}
                onChange={(e) =>
                  setDatos((p) => ({ ...p, destino: e.target.value as DestinoPublicacion }))
                }
                className={campo}
              >
                {estado.pendientes.map((d) => (
                  <option key={d} value={d}>
                    {ETIQUETA_DESTINO[d]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pub-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
                Fecha de publicación <span className="text-red-600">*</span>
              </label>
              <input
                id="pub-fecha"
                type="date"
                value={datos.fechaPublicacion}
                onChange={(e) => setDatos((p) => ({ ...p, fechaPublicacion: e.target.value }))}
                className={campo}
              />
              <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">
                La real, no la de hoy: es la que cuenta para el plazo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="pub-numero" className="block text-xs font-bold text-gray-600 mb-1.5">
                Número del proceso
              </label>
              <input
                id="pub-numero"
                type="text"
                value={datos.secopNumero}
                onChange={(e) => setDatos((p) => ({ ...p, secopNumero: e.target.value }))}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="pub-url" className="block text-xs font-bold text-gray-600 mb-1.5">
                Enlace a la publicación
              </label>
              <input
                id="pub-url"
                type="url"
                value={datos.secopUrl}
                onChange={(e) => setDatos((p) => ({ ...p, secopUrl: e.target.value }))}
                placeholder="https://…"
                className={campo}
              />
            </div>
          </div>

          <SelectorArchivo
            id="pub-evidencia"
            etiqueta="Evidencia de la publicación"
            ayuda="El comprobante o la captura del sitio donde quedó publicado."
            archivo={evidencia}
            onElegir={setEvidencia}
          />

          <div className="flex flex-wrap gap-2">
            <Boton
              icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
              disabled={guardando || !datos.fechaPublicacion || !evidencia}
              onClick={publicar}
            >
              Registrar
            </Boton>
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={limpiar}
            >
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      ) : null}
    </Marco>
  );
}
