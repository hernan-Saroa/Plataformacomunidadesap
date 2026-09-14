import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Pencil, Scale, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonTable } from '@esap-mfe/shared-ui/skeleton';

import { contratacionService } from '../../services/contratacionService';
import { ModalidadConUmbral, SmmlvAnual, UmbralesVigentes } from '../../types';
import { ModuleHeader } from '../shared/ModuleHeader';
import { Modal } from '../shared/Modal';
import { EditorUmbral } from './EditorUmbral';
import { EditorSmmlv } from './EditorSmmlv';

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** "1.000 SMMLV" o "$ 45.000.000", según cómo se configuró el umbral. */
function limite(valor: number | null, unidad: string, sufijo: string): string {
  if (valor === null) return sufijo;
  return unidad === 'SMMLV'
    ? `${valor.toLocaleString('es-CO')} SMMLV`
    : formatoPesos.format(valor);
}

/**
 * Administración de los umbrales que determinan la modalidad por cuantía
 * (EFDS-1331).
 *
 * Muestra la cifra tal como se configuró y su equivalente en pesos: la primera
 * es la que se edita, la segunda la que de verdad se compara contra el valor
 * del proceso, y verlas juntas es lo que permite detectar un umbral mal puesto.
 */
export function VistaUmbrales() {
  const [datos, setDatos] = useState<UmbralesVigentes | null>(null);
  const [salarios, setSalarios] = useState<SmmlvAnual[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<ModalidadConUmbral | null>(null);
  const [editandoSmmlv, setEditandoSmmlv] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const [umbrales, smmlv] = await Promise.all([
        contratacionService.umbrales(),
        contratacionService.smmlv(),
      ]);
      setDatos(umbrales);
      setSalarios(smmlv);
    } catch (err: any) {
      toast.error('No se pudieron cargar los umbrales', {
        id: 'umbrales-carga',
        description: err.message,
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const porCuantia = useMemo(
    () => (datos?.modalidades ?? []).filter((m) => m.determinadaPorCuantia),
    [datos],
  );
  const porCausal = useMemo(
    () => (datos?.modalidades ?? []).filter((m) => !m.determinadaPorCuantia),
    [datos],
  );

  const sinConfirmar = porCuantia.filter((m) => m.umbral && !m.umbral.confirmado).length;
  const salarioVigente = salarios.find((s) => s.anio === new Date().getFullYear()) ?? null;
  const puedeEditar = datos?.puedeEditar === true;

  // Las mismas celdas en la tabla de escritorio y en las tarjetas de móvil:
  // definirlas una vez evita que las dos vistas cuenten cosas distintas.
  const rangoDe = (m: ModalidadConUmbral) =>
    m.umbral ? (
      `${limite(m.umbral.limiteInferior, m.umbral.unidad, 'sin piso')} — ${limite(m.umbral.limiteSuperior, m.umbral.unidad, 'sin techo')}`
    ) : (
      // Ausencia legítima: la causal manda sobre el monto y su rango hay que
      // confirmarlo aparte.
      <span className="text-gray-400">sin configurar</span>
    );

  const pesosDe = (m: ModalidadConUmbral) => {
    const u = m.umbral;
    if (u?.enPesos) {
      return `${u.enPesos.inferior === null ? 'sin piso' : formatoPesos.format(u.enPesos.inferior)} — ${
        u.enPesos.superior === null ? 'sin techo' : formatoPesos.format(u.enPesos.superior)
      }`;
    }
    if (u?.advertencia) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
          <AlertTriangle className="w-3 h-3" />
          {u.advertencia}
        </span>
      );
    }
    return <span className="text-gray-400">—</span>;
  };

  const botonEditar = (m: ModalidadConUmbral) =>
    puedeEditar ? (
      <button
        type="button"
        onClick={() => setEditando(m)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md border border-gray-200 text-slate-600 hover:border-[#003DA5] hover:text-[#003DA5] transition-colors"
      >
        <Pencil className="w-3 h-3" />
        {m.umbral ? 'Cambiar' : 'Configurar'}
      </button>
    ) : null;

  return (
    <div className="space-y-3 md:space-y-4">
      <ModuleHeader
        title="Umbrales de cuantía"
        subtitle="Rangos que determinan la modalidad de selección"
        icon={<Scale className="w-5 h-5" />}
        color="#7C3AED"
      />

      {/* El aviso va arriba y no junto a cada fila: es el estado del conjunto,
          y de él depende si estas cifras pueden usarse de verdad. */}
      {sinConfirmar > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-2.5"
        >
          <ShieldAlert className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-800 m-0">
              {sinConfirmar} {sinConfirmar === 1 ? 'umbral provisional' : 'umbrales provisionales'}
            </p>
            <p className="text-[11px] text-amber-900 m-0 mt-0.5 leading-relaxed">
              Los documentos fuente no traen las cifras. Estos valores son un supuesto del equipo de
              desarrollo y deben confirmarse con la Dirección de Contratación antes de usarse.
            </p>
          </div>
        </div>
      )}

      {/* Salario mínimo: de él dependen todos los umbrales en SMMLV, así que se
          muestra aparte y no escondido en una fila. */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <Scale className="w-4 h-4 text-[#003DA5] flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-gray-600 m-0">
            Salario mínimo {new Date().getFullYear()}
          </p>
          <p className="text-sm font-black text-slate-900 m-0 tabular-nums">
            {salarioVigente ? formatoPesos.format(salarioVigente.valor) : 'Sin registrar'}
            {salarioVigente && !salarioVigente.confirmado && (
              <span className="ml-2 text-[10px] font-bold text-amber-700 align-middle">
                sin confirmar
              </span>
            )}
          </p>
        </div>
        {!salarioVigente && (
          <p className="text-[11px] text-red-600 font-bold m-0">
            Sin él, los umbrales en SMMLV no se pueden convertir a pesos
          </p>
        )}
        {puedeEditar && (
          <button
            type="button"
            onClick={() => setEditandoSmmlv(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
            Registrar
          </button>
        )}
      </div>

      {cargando ? (
        <SkeletonTable rows={5} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Tarjetas en móvil y tabla en escritorio, como auditoría y control
              interno: cuatro columnas con cifras no caben en un teléfono. */}
          <ul className="lg:hidden m-0 p-0 list-none divide-y divide-gray-100">
            {porCuantia.map((m) => (
              <li key={m.modalidad} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-slate-800 m-0">{m.nombre}</p>
                    {m.umbral && !m.umbral.confirmado && (
                      <span className="text-[10px] font-bold text-amber-700">
                        valor sin confirmar
                      </span>
                    )}
                  </div>
                  {botonEditar(m)}
                </div>
                <dl className="m-0 mt-1.5 space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[11px] font-bold text-slate-500">Rango</dt>
                    <dd className="text-[12px] text-slate-700 tabular-nums m-0 text-right">
                      {rangoDe(m)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[11px] font-bold text-slate-500">En pesos</dt>
                    <dd className="text-[12px] text-slate-700 tabular-nums m-0 text-right">
                      {pesosDe(m)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[11px] font-bold text-slate-500">Vigente desde</dt>
                    <dd className="text-[12px] text-slate-500 tabular-nums m-0 text-right">
                      {m.umbral?.vigenciaDesde ?? '—'}
                    </dd>
                  </div>
                </dl>
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
                    Rango configurado
                  </th>
                  <th className="px-4 py-2.5 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                    Equivale en pesos
                  </th>
                  <th className="px-4 py-2.5 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                    Vigente desde
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {porCuantia.map((m) => {
                  const u = m.umbral;
                  return (
                    <tr key={m.modalidad} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2.5">
                        <p className="text-[12.5px] font-bold text-slate-800 m-0">{m.nombre}</p>
                        {u && !u.confirmado && (
                          <span className="text-[10px] font-bold text-amber-700">
                            valor sin confirmar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-slate-700 tabular-nums">
                        {rangoDe(m)}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-slate-700 tabular-nums">
                        {pesosDe(m)}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-slate-500 tabular-nums">
                        {u?.vigenciaDesde ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">{botonEditar(m)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Las de causal se listan, no se esconden: que no tengan umbral es
              información, no un hueco por llenar. */}
          {porCausal.length > 0 && (
            <div className="border-t border-gray-200 bg-slate-50 px-4 py-3">
              <p className="text-[10.5px] font-black uppercase tracking-wide text-slate-500 m-0 mb-1.5">
                No se determinan por cuantía
              </p>
              <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
                {porCausal.map((m) => m.nombre).join(' · ')}
              </p>
              <p className="text-[11px] text-gray-500 m-0 mt-1 leading-relaxed">
                Se eligen por la causal y proceden cualquiera sea el monto, así que no admiten
                umbral.
              </p>
            </div>
          )}
        </div>
      )}

      {!puedeEditar && !cargando && (
        <p className="text-[11px] text-gray-500 m-0 leading-relaxed">
          Solo la Dirección de Contratación puede modificar los umbrales. Un cambio no afecta a un
          proceso sino a todos los que se creen después.
        </p>
      )}

      <Modal
        isOpen={editando !== null}
        onClose={() => setEditando(null)}
        title={editando ? `Umbral de ${editando.nombre}` : ''}
        description="Se cierra el umbral vigente y se abre uno nuevo, para no reescribir la regla con la que nacieron los procesos anteriores"
        icon={<Scale className="w-5 h-5 text-white" />}
        color="#003DA5"
        size="medium"
      >
        {editando && (
          <EditorUmbral
            modalidad={editando}
            onListo={async () => {
              setEditando(null);
              await cargar();
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={editandoSmmlv}
        onClose={() => setEditandoSmmlv(false)}
        title="Salario mínimo"
        description="De él dependen todos los umbrales expresados en SMMLV"
        icon={<Scale className="w-5 h-5 text-white" />}
        color="#003DA5"
        size="small"
      >
        <EditorSmmlv
          salarios={salarios}
          onListo={async () => {
            setEditandoSmmlv(false);
            await cargar();
          }}
        />
      </Modal>
    </div>
  );
}
