import React, { useCallback, useRef, useState } from 'react';
import { AlertTriangle, Check, MessageSquareText } from 'lucide-react';

import { Modal } from './Modal';
import { Boton, campo } from './PiezasPanel';

/** Un dato que hay que pedir antes de ejecutar la acción. */
export interface CampoDialogo {
  /** La clave con la que vuelve en el resultado. */
  nombre: string;
  etiqueta: string;
  /**
   * Un motivo se escribe en varias líneas; una referencia o un nombre, no.
   *
   * Por defecto sí: la inmensa mayoría de estos textos son motivos, y los
   * únicos de una línea del módulo son la referencia del pago y quién rechaza
   * la minuta en nombre del proponente.
   */
  multilinea?: boolean;
  opcional?: boolean;
  /**
   * Longitud mínima cuando es obligatorio.
   *
   * Por defecto diez en los campos de varias líneas: un motivo de tres letras
   * cumple el requisito y no explica nada, y estos textos quedan en el
   * expediente para que alguien los lea dentro de dos años. `window.prompt` no
   * comprobaba ni que no estuvieran vacíos —bastaba un espacio—.
   */
  minimo?: number;
  placeholder?: string;
  ayuda?: string;
}

export interface PeticionDialogo {
  titulo: string;
  /** Qué implica confirmar, cuando no es evidente desde el botón. */
  descripcion?: string;
  /** Sin campos es una confirmación, no un formulario. */
  campos?: CampoDialogo[];
  /** El texto del botón, que dice lo que va a pasar. */
  confirmar: string;
  /** `peligro` para lo que deshace algo ya hecho o no tiene vuelta atrás. */
  tono?: 'normal' | 'peligro';
}

/** Lo que pide el caso corriente: un motivo y nada más. */
interface PeticionMotivo extends Omit<PeticionDialogo, 'campos'> {
  etiqueta?: string;
  placeholder?: string;
  ayuda?: string;
  opcional?: boolean;
  minimo?: number;
}

const MINIMO_MULTILINEA = 10;

/** `multilinea` sin declarar es multilínea: es lo que pide casi todo el módulo. */
const esMultilinea = (c: CampoDialogo) => c.multilinea !== false;

const minimoDe = (c: CampoDialogo) => c.minimo ?? (esMultilinea(c) ? MINIMO_MULTILINEA : 1);

/**
 * Pedir un motivo —o una confirmación— sin diálogos del navegador.
 *
 * Veintitrés acciones del módulo pedían su texto con `window.prompt` y una con
 * `window.confirm`: el cuadro gris del sistema operativo, que no se puede
 * estilar, que bloquea la pestaña entera mientras está abierto y que no valida
 * nada. Y casi ninguno de esos textos es un trámite de la interfaz: son lo que
 * queda en el expediente explicando por qué se anuló una adenda o se revocó una
 * adjudicación, y se estaban pidiendo en una caja de una línea que aceptaba un
 * espacio en blanco.
 *
 * **Devuelve una promesa** en vez de envolver la acción, al contrario que
 * `useFirma`. No es capricho: así cada sitio sustituye su `window.prompt` por
 * una línea equivalente y conserva intacto el `try/catch` y el `guardando` que
 * ya tenía. Veintitrés paneles reestructurados para meter un modal habrían sido
 * veintitrés ocasiones de romper algo que funcionaba.
 *
 *     const dialogo = useDialogo();
 *     …
 *     const motivo = await dialogo.pedirMotivo({
 *       titulo: `¿Por qué se anula la adenda ${adenda.numero}?`,
 *       confirmar: 'Anular la adenda',
 *       tono: 'peligro',
 *     });
 *     if (!motivo) return;
 *     …
 *     {dialogo.elemento}
 */
export function useDialogo() {
  const [peticion, setPeticion] = useState<PeticionDialogo | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const responder = useRef<((v: Record<string, string> | null) => void) | null>(null);

  /** La forma general: varios campos. Resuelve `null` si se cancela. */
  const pedirDatos = useCallback((nueva: PeticionDialogo) => {
    // Si quedara una promesa colgando de una petición anterior, quien la
    // esperaba no volvería nunca: se cancela antes de abrir la nueva.
    responder.current?.(null);
    setValores(Object.fromEntries((nueva.campos ?? []).map((c) => [c.nombre, ''])));
    setPeticion(nueva);
    return new Promise<Record<string, string> | null>((resolver) => {
      responder.current = resolver;
    });
  }, []);

  /**
   * El caso corriente: un motivo.
   *
   * Devuelve el texto ya recortado, o `null` si se canceló. Un motivo opcional
   * confirmado en blanco devuelve `''`, que es distinto de cancelar: lo mismo
   * que distinguía `window.prompt` entre Aceptar vacío y Cancelar.
   */
  const pedirMotivo = useCallback(
    async (o: PeticionMotivo): Promise<string | null> => {
      const datos = await pedirDatos({
        titulo: o.titulo,
        descripcion: o.descripcion,
        confirmar: o.confirmar,
        tono: o.tono,
        campos: [
          {
            nombre: 'motivo',
            etiqueta: o.etiqueta ?? 'Motivo',
            placeholder: o.placeholder,
            ayuda: o.ayuda,
            opcional: o.opcional,
            minimo: o.minimo,
          },
        ],
      });
      return datos ? (datos.motivo ?? '') : null;
    },
    [pedirDatos],
  );

  /** Sin campos: solo «¿seguro?». */
  const confirmar = useCallback(
    async (o: Omit<PeticionDialogo, 'campos'>): Promise<boolean> =>
      (await pedirDatos({ ...o, campos: [] })) !== null,
    [pedirDatos],
  );

  const campos = peticion?.campos ?? [];
  const completo = campos.every(
    (c) => c.opcional || (valores[c.nombre]?.trim().length ?? 0) >= minimoDe(c),
  );

  const cerrar = () => {
    responder.current?.(null);
    responder.current = null;
    setPeticion(null);
  };

  const aceptar = () => {
    if (!completo) return;
    responder.current?.(
      Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, v.trim()])),
    );
    responder.current = null;
    setPeticion(null);
  };

  const peligro = peticion?.tono === 'peligro';

  const elemento = (
    <Modal
      isOpen={peticion !== null}
      onClose={cerrar}
      title={peticion?.titulo ?? ''}
      description={peticion?.descripcion}
      size="small"
      color={peligro ? '#B91C1C' : '#003DA5'}
      icon={
        peligro ? <AlertTriangle className="w-5 h-5" /> : <MessageSquareText className="w-5 h-5" />
      }
      footer={
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={cerrar}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <Boton
            icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
            disabled={!completo}
            onClick={aceptar}
          >
            {peticion?.confirmar ?? 'Confirmar'}
          </Boton>
        </div>
      }
    >
      {campos.length === 0 ? (
        <p className="text-sm text-slate-700 m-0 leading-relaxed">
          {peticion?.descripcion ? '' : 'Confirma para continuar.'}
        </p>
      ) : (
        <div className="space-y-3">
          {campos.map((c) => {
            const escrito = valores[c.nombre] ?? '';
            const minimo = minimoDe(c);
            // Cuánto falta, mientras falta. Un botón apagado sin decir por qué
            // es lo que hacía dudar de si el formulario estaba roto.
            const corto = !c.opcional && escrito.trim().length > 0 && escrito.trim().length < minimo;

            return (
              <div key={c.nombre}>
                <label
                  htmlFor={`dialogo-${c.nombre}`}
                  className="block text-xs font-bold text-gray-600 mb-1.5"
                >
                  {c.etiqueta}{' '}
                  {c.opcional ? (
                    <span className="font-normal text-gray-400">(opcional)</span>
                  ) : (
                    <span className="text-red-600">*</span>
                  )}
                </label>
                {esMultilinea(c) ? (
                  <textarea
                    id={`dialogo-${c.nombre}`}
                    rows={3}
                    value={escrito}
                    placeholder={c.placeholder}
                    onChange={(e) => setValores((v) => ({ ...v, [c.nombre]: e.target.value }))}
                    className={campo}
                  />
                ) : (
                  <input
                    id={`dialogo-${c.nombre}`}
                    value={escrito}
                    placeholder={c.placeholder}
                    onChange={(e) => setValores((v) => ({ ...v, [c.nombre]: e.target.value }))}
                    className={campo}
                  />
                )}
                {corto ? (
                  <p className="text-[11px] text-amber-700 m-0 mt-1">
                    Escribe al menos {minimo} caracteres.
                  </p>
                ) : c.ayuda ? (
                  <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">{c.ayuda}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );

  return { pedirMotivo, pedirDatos, confirmar, elemento };
}
