import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Pencil, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonTable } from '@esap-mfe/shared-ui/skeleton';

import { contratacionService } from '../../services/contratacionService';
import { ModalidadConPlazo, PlazosPublicacion } from '../../types';
import { ModuleHeader } from '../shared/ModuleHeader';
import { Modal } from '../shared/Modal';
import { EditorPlazo } from './EditorPlazo';

/**
 * Administración de los plazos de publicidad del proyecto de pliego
 * (EFDS-1387).
 *
 * Antes de esta pantalla el plazo vivía en base de datos pero solo se podía
 * tocar con SQL, y quien tiene que validarlo —la Dirección de Contratación— no
 * tiene acceso a la base. Sin esto, EFDS-1385 dependía de que alguien de
 * desarrollo ejecutara un UPDATE cada vez.
 */
export function VistaPlazosPublicacion() {
  const [datos, setDatos] = useState<PlazosPublicacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<ModalidadConPlazo | null>(null);

  const cargar = async () => {
    setCargando(true);
    try {
      setDatos(await contratacionService.plazosPublicacion());
    } catch (err: any) {
      toast.error('No se pudieron cargar los plazos', {
        id: 'plazos-carga',
        description: err.message,
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const conPliego = useMemo(
    () => (datos?.modalidades ?? []).filter((m) => m.aplicaPublicacion),
    [datos],
  );
  const sinPliego = useMemo(
    () => (datos?.modalidades ?? []).filter((m) => !m.aplicaPublicacion),
    [datos],
  );

  const sinConfirmar = conPliego.filter((m) => m.plazo && !m.plazo.confirmado).length;
  const sinConfigurar = conPliego.filter((m) => !m.plazo).length;
  const puedeEditar = datos?.puedeEditar === true;

  // Las mismas celdas en la tabla de escritorio y en las tarjetas de móvil:
  // definirlas una vez evita que las dos vistas cuenten cosas distintas.
  const plazoDe = (m: ModalidadConPlazo) =>
    m.plazo ? (
      `${m.plazo.diasHabiles} ${m.plazo.diasHabiles === 1 ? 'día hábil' : 'días hábiles'}`
    ) : (
      // Ausencia real, no un hueco de la pantalla: es justamente lo que hay
      // que resolver.
      <span className="text-gray-400">sin configurar</span>
    );

  const botonEditar = (m: ModalidadConPlazo) =>
    puedeEditar ? (
      <button
        type="button"
        onClick={() => setEditando(m)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md border border-gray-200 text-slate-600 hover:border-[#003DA5] hover:text-[#003DA5] transition-colors"
      >
        <Pencil className="w-3 h-3" />
        {m.plazo ? 'Cambiar' : 'Configurar'}
      </button>
    ) : null;

  return (
    <div className="space-y-3 md:space-y-4">
      <ModuleHeader
        title="Plazos de publicidad"
        subtitle="Días hábiles del proyecto de pliego por modalidad"
        icon={<CalendarClock className="w-5 h-5" />}
        color="#7C3AED"
      />

      {/* El aviso es del conjunto: de él depende si estas cifras se pueden usar
          de verdad, y es el trabajo que EFDS-1385 tiene que cerrar. */}
      {(sinConfirmar > 0 || sinConfigurar > 0) && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-2.5"
        >
          <ShieldAlert className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-800 m-0">
              {[
                sinConfirmar > 0
                  ? `${sinConfirmar} ${sinConfirmar === 1 ? 'plazo provisional' : 'plazos provisionales'}`
                  : null,
                sinConfigurar > 0
                  ? `${sinConfigurar} ${sinConfigurar === 1 ? 'modalidad sin plazo' : 'modalidades sin plazo'}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p className="text-[11px] text-amber-900 m-0 mt-0.5 leading-relaxed">
              Solo el de licitación pública viene de la historia de usuario. El resto son supuestos
              del equipo derivados del Decreto 1082 de 2015 y deben confirmarse con la Dirección de
              Contratación antes de usarse.
            </p>
          </div>
        </div>
      )}

      {cargando ? (
        <SkeletonTable rows={5} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Tarjetas en móvil y tabla en escritorio, como auditoría y control
              interno: el fundamento legal es largo y no cabe en columna. */}
          <ul className="lg:hidden m-0 p-0 list-none divide-y divide-gray-100">
            {conPliego.map((m) => (
              <li key={m.modalidad} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-slate-800 m-0">{m.nombre}</p>
                    {m.plazo && !m.plazo.confirmado && (
                      <span className="text-[10px] font-bold text-amber-700">
                        valor sin confirmar
                      </span>
                    )}
                  </div>
                  {botonEditar(m)}
                </div>
                <p className="text-[12px] text-slate-700 tabular-nums m-0 mt-1">{plazoDe(m)}</p>
                {m.plazo?.fundamento && (
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed">
                    {m.plazo.fundamento}
                  </p>
                )}
              </li>
            ))}
          </ul>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50">
                  <th className="px-4 py-2.5 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                    Modalidad
                  </th>
                  <th className="px-4 py-2.5 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                    Plazo
                  </th>
                  <th className="px-4 py-2.5 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                    Fundamento
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {conPliego.map((m) => (
                  <tr key={m.modalidad} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="text-[12.5px] font-bold text-slate-800 m-0">{m.nombre}</p>
                      {m.plazo && !m.plazo.confirmado && (
                        <span className="text-[10px] font-bold text-amber-700">
                          valor sin confirmar
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-slate-700 tabular-nums">
                      {plazoDe(m)}
                    </td>
                    <td className="px-4 py-2.5 text-[11.5px] text-slate-600">
                      {m.plazo?.fundamento ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">{botonEditar(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Las que no llevan pliego se listan, no se esconden: que no tengan
              plazo es información, no un pendiente por llenar. */}
          {sinPliego.length > 0 && (
            <div className="border-t border-gray-200 bg-slate-50 px-4 py-3">
              <p className="text-[10.5px] font-black uppercase tracking-wide text-slate-500 m-0 mb-1.5">
                Sin proyecto de pliego que publicar
              </p>
              <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
                {sinPliego.map((m) => m.nombre).join(' · ')}
              </p>
              <p className="text-[11px] text-gray-500 m-0 mt-1 leading-relaxed">
                No pasan por la actividad de publicación, así que no corre plazo alguno por este
                concepto.
              </p>
            </div>
          )}
        </div>
      )}

      {!puedeEditar && !cargando && (
        <p className="text-[11px] text-gray-500 m-0 leading-relaxed">
          Solo la Dirección de Contratación puede modificar los plazos. Un cambio no afecta a un
          proceso sino a todos los que se publiquen después.
        </p>
      )}

      <Modal
        isOpen={editando !== null}
        onClose={() => setEditando(null)}
        title={editando ? `Plazo de ${editando.nombre}` : ''}
        description="Aplica a las publicaciones que se registren desde ahora; las anteriores conservan el suyo"
        icon={<CalendarClock className="w-5 h-5 text-white" />}
        color="#003DA5"
        size="medium"
      >
        {editando && (
          <EditorPlazo
            modalidad={editando}
            onListo={async () => {
              setEditando(null);
              await cargar();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
