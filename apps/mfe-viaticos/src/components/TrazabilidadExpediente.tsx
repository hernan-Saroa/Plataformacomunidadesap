import { useEffect, useState } from 'react';
import { AlertCircle, Download, ExternalLink, FileText, History } from 'lucide-react';
import { TrazabilidadExpediente as Trazabilidad } from '../types/viaticos';
import viaticosService from '../services/api/viaticosService';

interface TrazabilidadExpedienteProps {
  solicitudId: string;
  codigo?: string;
}

const formatearFechaHora = (valor?: string | null): string => {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const capitalizar = (texto?: string | null): string =>
  texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '';

/**
 * RF-SIS-001 — Línea de tiempo con la trazabilidad completa del expediente
 * (quién, qué y cuándo) y descarga del expediente en PDF.
 */
export default function TrazabilidadExpediente({ solicitudId, codigo }: TrazabilidadExpedienteProps) {
  const [trazabilidad, setTrazabilidad] = useState<Trazabilidad | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    viaticosService
      .obtenerTrazabilidad(solicitudId)
      .then((data) => {
        if (activo) setTrazabilidad(data);
      })
      .catch(() => {
        if (activo) setError('No fue posible cargar la trazabilidad del expediente.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [solicitudId]);

  const handleDescargar = async () => {
    setDescargando(true);
    try {
      const blob = await viaticosService.descargarExpediente(solicitudId);
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `Expediente-${codigo || trazabilidad?.consecutivoUnico || solicitudId}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch {
      setError('No fue posible descargar el expediente. Intente nuevamente.');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider">
          <History className="w-4 h-4 text-[#003DA5]" />
          Trazabilidad del expediente
        </h4>
        <button
          type="button"
          onClick={handleDescargar}
          disabled={descargando || cargando}
          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#003DA5] border border-blue-200/80 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          {descargando ? 'Descargando...' : 'Descargar expediente'}
        </button>
      </div>

      {cargando ? (
        <p className="text-xs text-slate-400 py-3">Cargando trazabilidad...</p>
      ) : error && !trazabilidad ? (
        <p className="text-xs text-red-600 py-3 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      ) : trazabilidad ? (
        <div className="space-y-4">
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}

          {trazabilidad.historial.length === 0 ? (
            <p className="text-xs text-slate-500">Sin movimientos registrados en el historial.</p>
          ) : (
            <ol className="relative ml-2 border-l-2 border-slate-200 space-y-3">
              {trazabilidad.historial.map((h) => (
                <li key={h.id} className="ml-4">
                  <span
                    className="absolute mt-1 w-3 h-3 rounded-full border-2 border-white"
                    style={{ backgroundColor: '#003DA5', left: '-7px' }}
                  />
                  <p className="text-[11px] text-slate-400 font-medium">{formatearFechaHora(h.fecha)}</p>
                  <p className="text-xs font-bold text-slate-800">
                    {h.estadoAnteriorEtiqueta && h.estadoAnterior !== h.estadoNuevo
                      ? `${capitalizar(h.estadoAnteriorEtiqueta)} → ${capitalizar(h.estadoNuevoEtiqueta)}`
                      : capitalizar(h.estadoNuevoEtiqueta)}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Responsable: <span className="font-semibold">{h.usuarioNombre}</span>
                  </p>
                  {h.comentarios && <p className="text-[11px] text-slate-500 mt-0.5">{h.comentarios}</p>}
                </li>
              ))}
            </ol>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">
              Documentos soporte de la solicitud
            </p>
            {trazabilidad.documentos.length === 0 ? (
              <p className="text-xs text-slate-500">Sin documentos cargados.</p>
            ) : (
              <ul className="space-y-1">
                {trazabilidad.documentos.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 text-xs text-slate-700">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {d.tipoDocumento} · {d.nombreArchivo}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400">{formatearFechaHora(d.fechaCarga)}</span>
                      {d.urlRepositorio && (
                        <a
                          href={viaticosService.obtenerUrlArchivo(d.urlRepositorio)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#003DA5] hover:underline inline-flex items-center gap-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {trazabilidad.soportesLegalizacion.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">
                Soportes de la legalización
              </p>
              <ul className="space-y-1">
                {trazabilidad.soportesLegalizacion.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-xs text-slate-700">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {s.tipoDocumento || 'Soporte'} · {s.nombreArchivo}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {formatearFechaHora(s.fechaCarga)}
                      {s.revision ? ` · ${capitalizar(s.revision.toLowerCase())}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
