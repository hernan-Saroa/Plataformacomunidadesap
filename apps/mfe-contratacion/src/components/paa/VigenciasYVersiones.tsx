import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarPlus, CheckCircle2, FileSpreadsheet, Flag, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { VigenciaPaa } from '../../types';
import { Modal } from '../shared/Modal';
import { Permitido } from '../shared/Permitido';
import { useDialogo } from '../shared/useDialogo';
import { DetalleVersion } from './DetalleVersion';
import { ESTADO_VERSION, fechaCorta } from './formato';

/**
 * Las vigencias del PAA y el historial de versiones de cada una.
 *
 * Cargar una versión no la activa: la valida y la compara, y se abre su
 * detalle para que quien la cargó vea qué cambia antes de decidir. Declarar
 * vigente un año nuevo es otra cosa —no actualiza ningún proceso— y por eso
 * tiene su propio botón y su propia confirmación.
 */
export function VigenciasYVersiones() {
  const dialogo = useDialogo();
  const [vigencias, setVigencias] = useState<VigenciaPaa[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [cargandoEn, setCargandoEn] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const destino = useRef<string | null>(null);

  const leer = () =>
    contratacionService.paa
      .vigencias()
      .then((v) => {
        setVigencias(v);
        setError(null);
      })
      .catch((err: any) => setError(err.message));

  useEffect(() => {
    leer();
  }, []);

  const nuevaVigencia = async () => {
    const datos = await dialogo.pedirDatos({
      titulo: 'Abrir una vigencia',
      descripcion:
        'Nace sin ser la vigente: los procesos siguen saliendo del año actual hasta que cargues su PAA, lo actives y la declares vigente.',
      campos: [{ nombre: 'anio', etiqueta: 'Año', multilinea: false, minimo: 4, placeholder: String(new Date().getFullYear() + 1) }],
      confirmar: 'Abrir vigencia',
    });
    if (!datos) return;
    const anio = Number(datos.anio);
    if (!Number.isInteger(anio)) {
      toast.error('La vigencia es un año, como 2027');
      return;
    }
    try {
      await contratacionService.paa.crearVigencia(anio);
      toast.success(`Vigencia ${anio} abierta`);
      await leer();
    } catch (err: any) {
      toast.error('No se abrió la vigencia', { description: err.message });
    }
  };

  const elegirArchivo = (vigenciaId: string) => {
    destino.current = vigenciaId;
    archivo.current?.click();
  };

  const cargar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const elegido = e.target.files?.[0];
    e.target.value = '';
    const vigenciaId = destino.current;
    if (!elegido || !vigenciaId) return;

    setCargandoEn(vigenciaId);
    try {
      const version = await contratacionService.paa.cargarVersion(vigenciaId, elegido);
      if (version.estado === 'INVALIDA') {
        toast.error(`La versión ${version.numero} tiene ${version.errores.length} error(es)`, {
          description: 'No se puede activar. Revisa el detalle, corrige el archivo y cárgalo de nuevo.',
        });
      } else {
        toast.success(`Versión ${version.numero} validada`, { description: 'Revisa qué cambia antes de activarla.' });
      }
      await leer();
      setAbierta(version.id);
    } catch (err: any) {
      toast.error('No se pudo cargar el archivo', { description: err.message });
    } finally {
      setCargandoEn(null);
    }
  };

  const declararVigente = async (v: VigenciaPaa) => {
    let descripcion = `Los procesos nuevos saldrán del PAA ${v.anio}.`;
    try {
      const afectados = await contratacionService.paa.afectadosPorCambioDeVigencia(v.id);
      descripcion +=
        afectados.procesos.length > 0
          ? ` ${afectados.procesos.length} proceso(s) en curso del año anterior no cambian sus datos: cada uno queda detenido con una evaluación por cambio anual para su abogado (continuar, devolver, migrar o cancelar).`
          : ' No hay procesos en curso de años anteriores que evaluar.';
    } catch {
      /* la confirmación sigue teniendo sentido sin el conteo */
    }
    const ok = await dialogo.confirmar({
      titulo: `Declarar vigente el PAA ${v.anio}`,
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
  if (!vigencias) return <p className="text-xs text-gray-400 m-0">Cargando las vigencias…</p>;

  return (
    <div className="space-y-3">
      {dialogo.elemento}
      <input ref={archivo} type="file" accept=".xlsx" className="hidden" onChange={cargar} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-xs text-gray-600">
          Cada vigencia tiene su propio historial. Solo una es la vigente, y de ella nacen los procesos nuevos.
        </p>
        <Permitido accion="editar" punto="PAA">
          <button
            type="button"
            onClick={nuevaVigencia}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-gray-300 bg-white text-slate-700 hover:border-[#003DA5] hover:text-[#003DA5]"
          >
            <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
            Nueva vigencia
          </button>
        </Permitido>
      </div>

      {vigencias.length === 0 && (
        <p className="m-0 rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-xs text-gray-500">
          Todavía no hay vigencias. Abre la del año en curso y carga su Plan Anual de Adquisiciones.
        </p>
      )}

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
              <Permitido accion="editar" punto="PAA">
                <button
                  type="button"
                  onClick={() => elegirArchivo(v.id)}
                  disabled={cargandoEn !== null}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-lg text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  {cargandoEn === v.id ? 'Validando el archivo…' : 'Cargar versión'}
                </button>
              </Permitido>
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

      <Modal
        isOpen={abierta !== null}
        onClose={() => setAbierta(null)}
        title="Versión del Plan Anual de Adquisiciones"
        description="Validación, cambios frente a la activa y procesos que toca"
        size="xlarge"
        icon={<FileSpreadsheet className="w-5 h-5" />}
      >
        {abierta && <DetalleVersion versionId={abierta} onCambio={leer} />}
      </Modal>
    </div>
  );
}
