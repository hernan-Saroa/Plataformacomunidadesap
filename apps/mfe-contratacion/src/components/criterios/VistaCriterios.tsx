import React, { useEffect, useMemo, useState } from 'react';
import { ListChecks, Pencil, Plus, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonTable } from '@esap-mfe/shared-ui/skeleton';

import { contratacionService } from '../../services/contratacionService';
import { CatalogoCriterios, CriterioCatalogo } from '../../types';
import { ModuleHeader } from '../shared/ModuleHeader';
import { Modal } from '../shared/Modal';
import { EditorCriterio } from './EditorCriterio';

/**
 * Administración del catálogo de criterios de evaluación (EFDS-1443).
 *
 * Los criterios y sus pesos son los que deciden quién queda habilitado y quién
 * gana. Hasta esta pantalla vivían en la base sembrados como supuesto del
 * equipo, y corregir uno exigía un UPDATE: quien tiene que ratificarlos —la
 * Dirección de Contratación— no tiene acceso a la base.
 */
export function VistaCriterios() {
  const [datos, setDatos] = useState<CatalogoCriterios | null>(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<CriterioCatalogo | null>(null);
  const [agregando, setAgregando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      setDatos(await contratacionService.criteriosEvaluacion());
    } catch (err: any) {
      toast.error('No se pudo cargar el catálogo de criterios', {
        id: 'criterios-carga',
        description: err.message,
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const puedeEditar = datos?.puedeEditar === true;
  const sinConfirmar = (datos?.criterios ?? []).filter((c) => c.activo && !c.confirmado).length;

  /** Agrupados por dimensión, que es como se lee un pliego. */
  const porDimension = useMemo(() => {
    if (!datos) return [];
    return datos.dimensiones.map((d) => ({
      ...d,
      criterios: datos.criterios.filter((c) => c.dimension === d.codigo),
    }));
  }, [datos]);

  const retirar = async (criterio: CriterioCatalogo) => {
    try {
      setDatos(await contratacionService.cambiarActivoCriterio(criterio.id, !criterio.activo));
      toast.success(criterio.activo ? 'Criterio retirado' : 'Criterio devuelto al catálogo');
    } catch (err: any) {
      toast.error('No se pudo cambiar el criterio', { description: err.message });
    }
  };

  return (
    <div className="space-y-3 md:space-y-4">
      <ModuleHeader
        title="Criterios de evaluación"
        subtitle="Habilitantes y ponderables por dimensión y modalidad"
        icon={<ListChecks className="w-5 h-5" />}
        color="#7C3AED"
      />

      {/* El aviso es del conjunto: mientras haya criterios sin ratificar, la
          calificación que sale de ellos no se puede presentar como definitiva. */}
      {sinConfirmar > 0 && !cargando && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-2.5"
        >
          <ShieldAlert className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-800 m-0">
              {sinConfirmar} {sinConfirmar === 1 ? 'criterio' : 'criterios'} sin confirmar
            </p>
            <p className="text-[11px] text-amber-900 m-0 mt-0.5 leading-relaxed">
              Ninguno de los criterios sembrados sale de los documentos fuente: RF-PUB-07 dice que
              la evaluación es jurídica, financiera, técnica y económica, pero no qué criterios hay
              ni cuánto pesan. Son supuestos del equipo hasta que la Dirección de Contratación los
              ratifique.
            </p>
          </div>
        </div>
      )}

      {cargando ? (
        <SkeletonTable rows={6} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
              Los criterios sin modalidad aplican a todas. La dimensión económica no la califica una
              persona: se calcula sobre el valor ofertado.
            </p>
            {puedeEditar && (
              <button
                type="button"
                onClick={() => setAgregando(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 transition-all flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                Agregar criterio
              </button>
            )}
          </div>

          {porDimension.map((dimension) => (
            <div
              key={dimension.codigo}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <div className="px-4 py-2.5 bg-slate-50 border-b border-gray-200 flex items-center justify-between gap-2">
                <p className="text-[10.5px] font-black uppercase tracking-wide text-slate-500 m-0">
                  {dimension.nombre}
                </p>
                {dimension.calculada && (
                  <span className="text-[10px] font-bold text-slate-500">
                    la calcula el sistema sobre el precio ofertado
                  </span>
                )}
              </div>

              {dimension.criterios.length === 0 ? (
                <p className="px-4 py-3 text-[11.5px] text-gray-400 m-0">
                  Sin criterios configurados en esta dimensión.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-2 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                          Criterio
                        </th>
                        <th className="px-4 py-2 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                          Modalidad
                        </th>
                        <th className="px-4 py-2 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                          Tipo
                        </th>
                        <th className="px-4 py-2 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                          Puntaje
                        </th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {dimension.criterios.map((c) => (
                        <tr
                          key={c.id}
                          className={`border-b border-gray-100 last:border-0 ${c.activo ? '' : 'bg-slate-50/60'}`}
                        >
                          <td className="px-4 py-2.5">
                            <p
                              className={`text-[12.5px] font-bold m-0 ${c.activo ? 'text-slate-800' : 'text-slate-400 line-through'}`}
                            >
                              {c.nombre}
                            </p>
                            {c.descripcion && (
                              <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed">
                                {c.descripcion}
                              </p>
                            )}
                            <span className="text-[10px] font-bold text-amber-700">
                              {c.activo && !c.confirmado ? 'sin confirmar' : ''}
                            </span>
                            {c.evaluacionesQueLoUsan > 0 && (
                              <span className="text-[10px] text-slate-400 ml-1.5">
                                usado en {c.evaluacionesQueLoUsan}{' '}
                                {c.evaluacionesQueLoUsan === 1 ? 'evaluación' : 'evaluaciones'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-[11.5px] text-slate-600">
                            {c.modalidadNombre ?? (
                              <span className="text-slate-400">todas las modalidades</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-[11.5px] text-slate-600">
                            {c.tipo === 'HABILITANTE' ? 'Habilitante' : 'Ponderable'}
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-slate-700 tabular-nums">
                            {c.puntajeMaximo ?? <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            {puedeEditar && (
                              <span className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditando(c)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md border border-gray-200 text-slate-600 hover:border-[#003DA5] hover:text-[#003DA5] transition-colors"
                                >
                                  <Pencil className="w-3 h-3" />
                                  Editar
                                </button>
                                {/* No hay borrado: lo evaluado tiene que poder
                                    explicarse con la regla que lo calificó. */}
                                <button
                                  type="button"
                                  onClick={() => retirar(c)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md border border-gray-200 text-slate-600 hover:border-amber-500 hover:text-amber-700 transition-colors"
                                >
                                  {c.activo ? (
                                    <>
                                      <XCircle className="w-3 h-3" />
                                      Retirar
                                    </>
                                  ) : (
                                    <>
                                      <RotateCcw className="w-3 h-3" />
                                      Devolver
                                    </>
                                  )}
                                </button>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {/* La suma de los ponderables es la escala contra la que se lee toda
              calificación: si no da lo que fijó el pliego, la nota de una
              oferta no significa lo que parece. */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-gray-200">
              <p className="text-[10.5px] font-black uppercase tracking-wide text-slate-500 m-0">
                Puntaje máximo por modalidad
              </p>
            </div>
            <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
              {(datos?.totales ?? []).map((t) => (
                <p key={t.modalidad} className="text-[11.5px] text-slate-600 m-0">
                  {t.nombre}:{' '}
                  <span className="font-bold text-slate-800 tabular-nums">{t.total}</span>
                  {t.propios > 0 && (
                    <span className="text-slate-400">
                      {' '}
                      · {t.propios} {t.propios === 1 ? 'propio' : 'propios'}
                    </span>
                  )}
                </p>
              ))}
            </div>
          </div>
        </>
      )}

      {!puedeEditar && !cargando && (
        <p className="text-[11px] text-gray-500 m-0 leading-relaxed">
          Solo la Dirección de Contratación modifica los criterios. Quien evalúa no reescribe la
          regla con la que se le evalúa.
        </p>
      )}

      <Modal
        isOpen={editando !== null || agregando}
        onClose={() => {
          setEditando(null);
          setAgregando(false);
        }}
        title={editando ? editando.nombre : 'Nuevo criterio de evaluación'}
        description="Aplica a las evaluaciones que se registren desde ahora"
        icon={<ListChecks className="w-5 h-5 text-white" />}
        color="#003DA5"
        size="medium"
      >
        {datos && (
          <EditorCriterio
            criterio={editando}
            catalogo={datos}
            onListo={(tras) => {
              setDatos(tras);
              setEditando(null);
              setAgregando(false);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
