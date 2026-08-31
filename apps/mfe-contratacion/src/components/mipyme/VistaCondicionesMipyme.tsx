import React, { useEffect, useState } from 'react';
import { Building2, Pencil, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonTable } from '@esap-mfe/shared-ui/skeleton';

import { contratacionService } from '../../services/contratacionService';
import { CondicionesMipymeConfig, ParametroMipyme } from '../../types';
import { ModuleHeader } from '../shared/ModuleHeader';
import { Modal } from '../shared/Modal';
import { EditorCondicionMipyme } from './EditorCondicionMipyme';

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Cómo se lee cada cifra. El número solo no dice de qué está hablando. */
function comoSeLee(parametro: ParametroMipyme): string {
  if (parametro.clave === 'MINIMO_MANIFESTACIONES') {
    return `${parametro.valor} ${parametro.valor === 1 ? 'MIPYME' : 'MIPYME distintas'}`;
  }
  return parametro.unidad === 'PESOS'
    ? pesos.format(parametro.valor)
    : `${parametro.valor.toLocaleString('es-CO')} SMMLV`;
}

/**
 * Administración de las condiciones de la limitación a MIPYME (EFDS-1393).
 *
 * Los dos parámetros viven en base de datos desde EFDS-1388, pero sin esta
 * pantalla la única forma de tocarlos sería un UPDATE en SQL, y quien tiene que
 * validarlos —la Dirección de Contratación— no tiene acceso a la base. Es el
 * mismo hueco que hubo que cerrar con EFDS-1387 para los plazos de publicidad;
 * aquí se contempla desde el principio.
 */
export function VistaCondicionesMipyme() {
  const [datos, setDatos] = useState<CondicionesMipymeConfig | null>(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<ParametroMipyme | null>(null);

  const cargar = async () => {
    setCargando(true);
    try {
      setDatos(await contratacionService.condicionesMipyme());
    } catch (err: any) {
      toast.error('No se pudieron cargar las condiciones', {
        id: 'condiciones-mipyme-carga',
        description: err.message,
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const parametros = datos?.parametros ?? [];
  const sinConfirmar = parametros.filter((p) => !p.confirmado).length;
  const puedeEditar = datos?.puedeEditar === true;

  // Las mismas celdas en la tabla de escritorio y en las tarjetas de móvil:
  // definirlas una vez evita que las dos vistas cuenten cosas distintas.
  const valorDe = (parametro: ParametroMipyme) => (
    <>
      {comoSeLee(parametro)}
      {/* El tope se guarda en SMMLV y nadie que lo valide piensa en salarios
          mínimos: ver el equivalente al lado es lo que permite notar que una
          cifra está mal. */}
      {parametro.clave === 'TOPE_VALOR' && parametro.unidad === 'SMMLV' && (
        <span className="block text-xs text-slate-500 mt-0.5">
          {datos?.topeEnPesos !== null && datos?.topeEnPesos !== undefined
            ? `equivale hoy a ${pesos.format(datos.topeEnPesos)}`
            : 'no hay salario mínimo del año para convertirlo'}
        </span>
      )}
    </>
  );

  const botonEditar = (parametro: ParametroMipyme) =>
    puedeEditar ? (
      <button
        type="button"
        onClick={() => setEditando(parametro)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md border border-gray-200 text-slate-600 hover:border-[#003DA5] hover:text-[#003DA5] transition-colors"
      >
        <Pencil className="w-3 h-3" />
        Cambiar
      </button>
    ) : null;

  return (
    <div className="space-y-3 md:space-y-4">
      <ModuleHeader
        title="Limitación a MIPYME"
        subtitle="Condiciones que habilitan limitar la convocatoria"
        icon={<Building2 className="w-5 h-5" />}
        color="#7C3AED"
      />

      {/* De estas dos cifras depende a quién se le deja participar en un
          proceso público, así que que estén sin validar no es un detalle. */}
      {sinConfirmar > 0 && !cargando && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-2.5"
        >
          <ShieldAlert className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-800 m-0">
              {sinConfirmar === 1
                ? '1 condición sin confirmar'
                : `${sinConfirmar} condiciones sin confirmar`}
            </p>
            <p className="text-xs text-amber-900 m-0 mt-0.5 leading-relaxed">
              Ninguna de las dos cifras viene de un documento fuente: son supuestos del equipo
              derivados del Decreto 1082 de 2015. Mientras no se confirmen, la evaluación de cada
              proceso avisa de que corre sobre parámetros provisionales.
            </p>
          </div>
        </div>
      )}

      {cargando ? (
        <SkeletonTable rows={2} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Tarjetas en móvil y tabla en escritorio, como auditoría y control
              interno: el fundamento legal es largo y no cabe en columna. */}
          <ul className="lg:hidden m-0 p-0 list-none divide-y divide-gray-100">
            {parametros.map((parametro) => (
              <li key={parametro.clave} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 m-0">{parametro.descripcion}</p>
                    {!parametro.confirmado && (
                      <span className="text-xs font-bold text-amber-700">valor sin confirmar</span>
                    )}
                  </div>
                  {botonEditar(parametro)}
                </div>
                <p className="text-xs text-slate-700 tabular-nums m-0 mt-1">{valorDe(parametro)}</p>
                {parametro.fundamento && (
                  <p className="text-xs text-slate-500 m-0 mt-0.5 leading-relaxed">
                    {parametro.fundamento}
                  </p>
                )}
              </li>
            ))}
          </ul>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50">
                  <th className="px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-500">
                    Condición
                  </th>
                  <th className="px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-500">
                    Valor
                  </th>
                  <th className="px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-500">
                    Fundamento
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {parametros.map((parametro) => (
                  <tr key={parametro.clave} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-bold text-slate-800 m-0">
                        {parametro.descripcion}
                      </p>
                      {!parametro.confirmado && (
                        <span className="text-xs font-bold text-amber-700">
                          valor sin confirmar
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-700 tabular-nums">
                      {valorDe(parametro)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {parametro.fundamento ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">{botonEditar(parametro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {datos?.smmlvAplicado && (
            <div className="border-t border-gray-200 bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-600 m-0 leading-relaxed">
                Conversión hecha con el salario mínimo de {datos.smmlvAplicado.anio}:{' '}
                <span className="font-bold tabular-nums">
                  {pesos.format(datos.smmlvAplicado.valor)}
                </span>
                {!datos.smmlvAplicado.confirmado && ' (sin confirmar)'}. Se administra desde
                Umbrales.
              </p>
            </div>
          )}
        </div>
      )}

      {!puedeEditar && !cargando && (
        <p className="text-xs text-gray-500 m-0 leading-relaxed">
          Solo la Dirección de Contratación puede modificar estas condiciones. Un cambio no afecta
          a un proceso sino a todos los que se evalúen después.
        </p>
      )}

      <Modal
        isOpen={editando !== null}
        onClose={() => setEditando(null)}
        title={editando?.descripcion ?? ''}
        description="No afecta a las decisiones ya tomadas: cada una congeló los parámetros con los que se evaluó"
        icon={<Building2 className="w-5 h-5 text-white" />}
        color="#003DA5"
        size="medium"
      >
        {editando && (
          <EditorCondicionMipyme
            parametro={editando}
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
