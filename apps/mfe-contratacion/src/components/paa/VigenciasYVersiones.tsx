import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Flag, MapPin, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DocumentoPaa, VigenciaPaa } from '../../types';
import { Modal } from '../shared/Modal';
import { Permitido } from '../shared/Permitido';
import { useDialogo } from '../shared/useDialogo';
import { DetalleVersion } from './DetalleVersion';
import { ESTADO_VERSION, fechaCorta } from './formato';

const CLASE_CAMPO =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20';

/**
 * El PAA de cada territorio: sus vigencias y el historial de versiones de cada una.
 *
 * Cargar es solo subir el Excel y decir el año. Del archivo salen sus regiones
 * —el prefijo de cada línea y su unidad de contratación— y con ellas se sabe
 * de qué territorio es: si es uno nuevo, se crean su documento y sus regiones;
 * si el año no estaba abierto, se abre. Cada territorio publica su propio
 * Excel —el de la Sede Central trae además las líneas de Chocó—, y sus años,
 * sus versiones y su cambio de año no tocan a los demás.
 *
 * Cargar una versión no la activa: la valida y la compara, y se abre su
 * detalle para que quien la cargó vea qué cambia antes de decidir. Declarar
 * vigente un año nuevo es otra cosa —no actualiza ningún proceso— y por eso
 * tiene su propio botón y su propia confirmación.
 */
export function VigenciasYVersiones() {
  const dialogo = useDialogo();
  const [documentos, setDocumentos] = useState<DocumentoPaa[] | null>(null);
  const [documentoId, setDocumentoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  /** El formulario de carga: abierto con el año propuesto, o cerrado. */
  const [carga, setCarga] = useState<{ anio: string; archivo: File | null } | null>(null);
  const [cargando, setCargando] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  const leer = (elegir?: string) =>
    contratacionService.paa
      .documentos()
      .then((d) => {
        setDocumentos(d);
        setDocumentoId((actual) => {
          const preferido = elegir ?? actual;
          return preferido && d.some((x) => x.id === preferido) ? preferido : d[0]?.id ?? null;
        });
        setError(null);
      })
      .catch((err: any) => setError(err.message));

  useEffect(() => {
    leer();
  }, []);

  const documento = documentos?.find((d) => d.id === documentoId) ?? null;
  const vigencias = documento?.vigencias ?? [];

  /** Propone el año vigente del documento que se mira; sin él, el año en curso. */
  const abrirCarga = () => {
    const anio = documento?.vigencias.find((v) => v.vigente)?.anio ?? new Date().getFullYear();
    setCarga({ anio: String(anio), archivo: null });
  };

  const cargar = async () => {
    if (!carga?.archivo) return;
    const anio = Number(carga.anio);
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      toast.error('La vigencia es un año, como 2027');
      return;
    }

    setCargando(true);
    try {
      const version = await contratacionService.paa.cargarPaa(anio, carga.archivo);
      if (version.estado === 'INVALIDA') {
        toast.error(`La versión ${version.numero} del PAA ${anio} de ${version.documento.nombre} tiene ${version.errores.length} error(es)`, {
          description: 'No se puede activar. Revisa el detalle, corrige el archivo y cárgalo de nuevo.',
        });
      } else {
        toast.success(`Versión ${version.numero} del PAA ${anio} de ${version.documento.nombre} validada`, {
          description: 'Revisa qué cambia antes de activarla.',
        });
      }
      setCarga(null);
      await leer(version.documento.id);
      setAbierta(version.id);
    } catch (err: any) {
      toast.error('No se pudo cargar el archivo', { description: err.message });
    } finally {
      setCargando(false);
    }
  };

  const declararVigente = async (v: VigenciaPaa) => {
    const regiones = documento?.regiones.map((r) => r.nombre).join(' y ') ?? '';
    let descripcion = `Los procesos nuevos de ${regiones} saldrán del PAA ${v.anio}. Los demás territorios no cambian.`;
    try {
      const afectados = await contratacionService.paa.afectadosPorCambioDeVigencia(v.id);
      descripcion +=
        afectados.procesos.length > 0
          ? ` ${afectados.procesos.length} proceso(s) en curso de su año anterior no cambian sus datos: cada uno queda detenido con una evaluación por cambio anual para su abogado (continuar, devolver, migrar o cancelar).`
          : ' No hay procesos en curso de años anteriores que evaluar.';
    } catch {
      /* la confirmación sigue teniendo sentido sin el conteo */
    }
    const ok = await dialogo.confirmar({
      titulo: `Declarar vigente el PAA ${v.anio} de ${documento?.nombre ?? ''}`,
      descripcion: `${descripcion} No se puede volver a un año anterior.`,
      confirmar: `Declarar vigente ${v.anio}`,
      tono: 'peligro',
    });
    if (!ok) return;
    try {
      const r = await contratacionService.paa.declararVigente(v.id);
      toast.success(`El PAA ${r.anio} es el vigente`, {
        description: r.evaluaciones ? `${r.evaluaciones} proceso(s) quedaron en evaluación por cambio anual.` : undefined,
      });
      await leer();
    } catch (err: any) {
      toast.error('No se declaró vigente', { description: err.message });
    }
  };

  if (error) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-red-800 m-0">{error}</p>
      </div>
    );
  }
  if (!documentos) return <p className="text-xs text-gray-400 m-0">Cargando los documentos del PAA…</p>;

  return (
    <div className="space-y-3">
      {dialogo.elemento}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-xs text-gray-600">
          Sube el Excel del PAA de un territorio: sus regiones, su documento y su año salen del archivo.
        </p>
        <Permitido accion="editar" punto="PAA">
          <button
            type="button"
            onClick={abrirCarga}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-lg text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            Cargar PAA
          </button>
        </Permitido>
      </div>

      {!documento ? (
        <p className="m-0 rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-xs text-gray-500">
          Todavía no se ha cargado ningún PAA. Carga el Excel de un territorio y sus regiones quedarán creadas.
        </p>
      ) : (
        <>
        <div>
          <p className="m-0 mb-1.5 text-xs font-bold text-gray-600">PAA de</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Documento del PAA">
            {documentos.map((d) => {
              const activo = d.id === documento.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  onClick={() => setDocumentoId(d.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    activo ? 'bg-[#003DA5] border-[#003DA5] text-white' : 'bg-white border-gray-300 text-slate-700 hover:border-[#003DA5]'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                  {d.nombre}
                </button>
              );
            })}
          </div>
          <p className="m-0 mt-1.5 flex flex-wrap items-center gap-1 text-xs text-gray-500">
            <MapPin className="w-3 h-3" aria-hidden="true" />
            Su Excel trae las líneas de{' '}
            {documento.regiones.map((r) => `${r.nombre} (${r.prefijoLinea})`).join(', ') || 'ninguna región todavía'}.
          </p>
        </div>

        <p className="m-0 text-xs text-gray-600">
          Cada año tiene su propio historial. Solo uno es el vigente, y de él nacen los procesos nuevos de este territorio.
        </p>

        {vigencias.map((v) => (
          <section key={v.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
              <div className="min-w-0">
                <h3 className="m-0 flex items-center gap-2 text-sm font-extrabold text-slate-800">
                  PAA {v.anio}
                  {v.vigente && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                      Vigente
                    </span>
                  )}
                </h3>
                <p className="m-0 mt-0.5 text-xs text-gray-500">
                  {v.activa
                    ? `Activa: versión ${v.activa.numero} · ${v.activa.totalLineas} líneas · desde ${fechaCorta(v.activa.activadaAt)}`
                    : 'Sin versión activa'}
                  {v.declaradaVigenteAt && ` · vigente desde ${fechaCorta(v.declaradaVigenteAt)} (${v.declaradaVigentePor})`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!v.vigente && v.activa && (
                  <Permitido accion="aprobar" punto="PAA">
                    <button
                      type="button"
                      onClick={() => declararVigente(v)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-amber-300 bg-white text-amber-800 hover:bg-amber-50"
                    >
                      <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                      Declarar vigente
                    </button>
                  </Permitido>
                )}
              </div>
            </header>

            {v.versiones.length === 0 ? (
              <p className="m-0 px-4 py-3 text-xs text-gray-500">Sin versiones cargadas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-left text-gray-500">
                    <tr>
                      <th className="px-3 py-1.5 font-bold">Versión</th>
                      <th className="px-3 py-1.5 font-bold">Archivo</th>
                      <th className="px-3 py-1.5 font-bold">Estado</th>
                      <th className="px-3 py-1.5 font-bold">Líneas</th>
                      <th className="px-3 py-1.5 font-bold">Cargada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {v.versiones.map((x) => (
                      <tr
                        key={x.id}
                        onClick={() => setAbierta(x.id)}
                        className="cursor-pointer hover:bg-slate-50"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setAbierta(x.id)}
                      >
                        <td className="px-3 py-2 font-bold tabular-nums">{x.numero}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1.5 break-words">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" aria-hidden="true" />
                            {x.nombreArchivo}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 font-bold whitespace-nowrap ${ESTADO_VERSION[x.estado].clase}`}>
                            {ESTADO_VERSION[x.estado].etiqueta}
                          </span>
                          {x.errores > 0 && <span className="block mt-0.5 text-red-700">{x.errores} error(es)</span>}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{x.totalLineas || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {x.cargadaPor} · {fechaCorta(x.cargadaAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
        </>
      )}

      <Modal
        isOpen={carga !== null}
        onClose={() => !cargando && setCarga(null)}
        title="Cargar el PAA de un territorio"
        description="Del archivo salen sus regiones y su documento; solo falta decir de qué año es"
        size="small"
        icon={<Upload className="w-5 h-5" />}
        footer={
          <>
            <button
              type="button"
              onClick={cargar}
              disabled={cargando || !carga?.archivo || !carga.anio.trim()}
              className="px-3.5 py-2 text-xs font-extrabold rounded-lg text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm disabled:opacity-50"
            >
              {cargando ? 'Validando el archivo…' : 'Cargar'}
            </button>
            <button
              type="button"
              onClick={() => setCarga(null)}
              disabled={cargando}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700"
            >
              Cancelar
            </button>
          </>
        }
      >
        {carga && (
          <div className="space-y-3">
            <div>
              <label htmlFor="paa-archivo" className="block text-xs font-bold text-gray-600 mb-1">
                Archivo del PAA (.xlsx)
              </label>
              <input
                ref={archivo}
                id="paa-archivo"
                type="file"
                accept=".xlsx"
                onChange={(e) => setCarga({ ...carga, archivo: e.target.files?.[0] ?? null })}
                className="block w-full text-xs text-slate-700"
              />
            </div>
            <div>
              <label htmlFor="paa-anio" className="block text-xs font-bold text-gray-600 mb-1">
                Vigencia
              </label>
              <input
                id="paa-anio"
                inputMode="numeric"
                value={carga.anio}
                onChange={(e) => setCarga({ ...carga, anio: e.target.value })}
                className={CLASE_CAMPO}
              />
              <p className="m-0 mt-1 text-xs text-gray-500">
                Si el territorio no tenía ese año, se abre sin ser el vigente: lo declaras vigente después de activar su versión.
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={abierta !== null}
        onClose={() => setAbierta(null)}
        title="Versión del Plan Anual de Adquisiciones"
        description="Validación, cambios frente a la activa y procesos que toca"
        size="xlarge"
        icon={<FileSpreadsheet className="w-5 h-5" />}
      >
        {abierta && <DetalleVersion versionId={abierta} onCambio={() => leer()} />}
      </Modal>
    </div>
  );
}
