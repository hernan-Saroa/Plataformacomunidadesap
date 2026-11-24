import React, { useEffect, useState } from 'react';
import { Check, Pencil, Users } from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonTable } from '@esap-mfe/shared-ui/skeleton';

import { contratacionService } from '../../services/contratacionService';
import { ParametroAlerta, UmbralesComite } from '../../types';
import { PERMISOS } from '../../auth/permisos';
import { useAlcance } from '../../auth/alcance';
import { Modal } from '../shared/Modal';

/** La fila de `parametros_alerta` que guarda la cuantía general (126). */
export const CLAVE_CUANTIA_COMITE = 'cuantia_minima_comite';

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const campo =
  'w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-gray-300 bg-white focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20';

/**
 * Cuánto debe valer un proceso para ir al Comité de Contratación (EFDS-1147).
 *
 * Vivía entre los plazos de las alertas porque se guarda en la misma tabla,
 * pero no es una alerta: decide si la 3.7 se convoca. Aquí está junto a lo que
 * manda sobre ella —las modalidades con umbral propio, que hoy es la directa—,
 * para que quien la cambia sepa dónde no rige.
 */
export function CuantiaDelComite() {
  const { tiene } = useAlcance();
  const puedeEditar = tiene(PERMISOS.configurar);
  const [general, setGeneral] = useState<ParametroAlerta | null | undefined>(undefined);
  const [propios, setPropios] = useState<UmbralesComite | null>(null);
  const [editando, setEditando] = useState(false);

  const leerGeneral = (lista: ParametroAlerta[]) =>
    setGeneral(lista.find((p) => p.clave === CLAVE_CUANTIA_COMITE) ?? null);

  useEffect(() => {
    contratacionService
      .parametrosAlerta()
      .then(leerGeneral)
      .catch((err: any) => {
        toast.error('No se pudo cargar la cuantía del comité', { description: err.message });
        setGeneral(null);
      });
    contratacionService
      .umbralesComite()
      .then(setPropios)
      .catch(() => setPropios({ smmlv: null, umbrales: [] }));
  }, []);

  const smmlv = propios?.smmlv ?? null;
  const enPesos = (valor: number, unidad: 'SMMLV' | 'PESOS') =>
    unidad === 'PESOS' ? pesos.format(valor) : smmlv ? pesos.format(valor * smmlv.valor) : null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10.5px] font-black uppercase tracking-wide text-slate-500 m-0">
          Cuantía para ir al Comité de Contratación
        </p>
        <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
          La actividad 3.7 solo se convoca si el valor estimado del proceso supera esta cuantía. Las
          modalidades que la matriz excluye del comité no pasan por él, sea cual sea su valor.
        </p>
      </div>

      {general === undefined ? (
        <SkeletonTable rows={2} />
      ) : general === null ? (
        <p className="text-[12px] text-slate-600 bg-white border border-gray-200 rounded-xl px-4 py-3 m-0">
          La cuantía general no está configurada: todo proceso que la matriz lleve al comité pasa por
          él. Falta aplicar la migración 126.
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-start gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-slate-800 m-0">General · todas las modalidades</p>
            <p className="text-[13px] text-slate-900 m-0 mt-0.5 tabular-nums">
              Más de {general.valor.toLocaleString('es-CO')} SMMLV
              {enPesos(general.valor, 'SMMLV') ? (
                <span className="text-slate-500">
                  {' '}
                  · {enPesos(general.valor, 'SMMLV')} con el salario de {smmlv!.anio}
                  {smmlv!.confirmado ? '' : ' (sin confirmar)'}
                </span>
              ) : null}
            </p>
          </div>
          {puedeEditar && (
            <button
              type="button"
              onClick={() => setEditando(true)}
              aria-label="Cambiar la cuantía general del comité"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md border border-gray-200 text-slate-600 hover:border-[#003DA5] hover:text-[#003DA5] transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Cambiar
            </button>
          )}
        </div>
      )}

      {propios && propios.umbrales.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
            Estas modalidades tienen umbral propio y <strong>no siguen la cuantía general</strong>:
          </p>
          <ul className="list-none m-0 p-0 bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {propios.umbrales.map((u) => (
              <li key={u.modalidad} className="px-4 py-2.5">
                <p className="text-[12.5px] font-bold text-slate-800 m-0">
                  {u.modalidadNombre}
                  {!u.confirmado && (
                    <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      Sin confirmar
                    </span>
                  )}
                </p>
                <p className="text-[12px] text-slate-700 m-0 mt-0.5 tabular-nums">
                  Más de {u.unidad === 'PESOS' ? pesos.format(u.valor) : `${u.valor.toLocaleString('es-CO')} SMMLV`}
                  {u.unidad === 'SMMLV' && enPesos(u.valor, u.unidad) ? (
                    <span className="text-slate-500"> · {enPesos(u.valor, u.unidad)}</span>
                  ) : null}
                </p>
                {u.fundamento && (
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed">{u.fundamento}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        isOpen={editando && !!general}
        onClose={() => setEditando(false)}
        title="Cuantía para ir al Comité de Contratación"
        description="Rige para los procesos que lleguen a la 3.7 desde ahora"
        icon={<Users className="w-5 h-5 text-white" />}
        color="#003DA5"
        size="medium"
      >
        {general && (
          <EditorCuantia
            parametro={general}
            onListo={(lista) => {
              leerGeneral(lista);
              setEditando(false);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function EditorCuantia({
  parametro,
  onListo,
}: {
  parametro: ParametroAlerta;
  onListo: (lista: ParametroAlerta[]) => void;
}) {
  const [texto, setTexto] = useState(String(parametro.valor));
  const [guardando, setGuardando] = useState(false);

  const numero = Number(texto);
  const valido =
    texto !== '' && Number.isInteger(numero) && numero >= parametro.minimo && numero <= parametro.maximo;

  const guardar = async () => {
    setGuardando(true);
    try {
      // Se guarda con los parámetros de las alertas: es la misma tabla (126).
      const lista = await contratacionService.guardarParametrosAlerta({ [parametro.clave]: numero });
      toast.success('Cuantía del comité actualizada');
      onListo(lista);
    } catch (err: any) {
      toast.error('No se pudo guardar la cuantía', { description: err.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="block text-xs font-bold text-slate-600 mb-1">SMMLV</span>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
          aria-label="Cuantía para ir al Comité de Contratación"
          className={`${campo} tabular-nums`}
        />
        <span className="block text-[11px] text-slate-500 mt-1 leading-relaxed">
          {parametro.descripcion}. Entre {parametro.minimo.toLocaleString('es-CO')} y{' '}
          {parametro.maximo.toLocaleString('es-CO')}.
        </span>
      </label>

      <button
        type="button"
        disabled={guardando || !valido}
        onClick={guardar}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all"
      >
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
        Guardar cuantía
      </button>
    </div>
  );
}
