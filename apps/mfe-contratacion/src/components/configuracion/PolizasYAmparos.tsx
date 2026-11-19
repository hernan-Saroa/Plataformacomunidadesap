import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Pencil, Plus, Shield, Umbrella, Undo2, X } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { TipoAmparoConfigurable, TipoPolizaConfigurable } from '../../types';

const campo =
  'w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-gray-300 bg-white focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20 disabled:bg-slate-50 disabled:text-slate-500';

const botonPrimario =
  'inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all';

const botonCancelar =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-all';

/** Lo que se edita en el formulario; sirve para los dos catálogos. */
interface Borrador {
  codigo: string;
  nombre: string;
  descripcion: string;
  tiposPoliza: string[];
  amparaTrasElContrato: boolean;
}

const VACIO: Borrador = {
  codigo: '',
  nombre: '',
  descripcion: '',
  tiposPoliza: [],
  amparaTrasElContrato: false,
};

/**
 * Tipos de póliza y de amparo de la 8.4 (145).
 *
 * Lo sembrado sale del Decreto 1082, pero pueden aparecer clases de garantía o
 * coberturas nuevas y cada una pedía una migración. Aquí se crean, se ajustan y
 * se retiran; no se borran, porque las pólizas ya registradas los referencian.
 */
export function PolizasYAmparos() {
  const [polizas, setPolizas] = useState<TipoPolizaConfigurable[]>([]);
  const [amparos, setAmparos] = useState<TipoAmparoConfigurable[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  /** Qué formulario está abierto: uno a la vez, nuevo o sobre un código. */
  const [editando, setEditando] = useState<
    { catalogo: 'poliza' | 'amparo'; codigo: string | null } | null
  >(null);
  const [borrador, setBorrador] = useState<Borrador>(VACIO);

  const leer = () =>
    Promise.all([contratacionService.tiposPoliza(), contratacionService.tiposAmparo()])
      .then(([p, a]) => {
        setPolizas(p);
        setAmparos(a);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    leer();
  }, []);

  const abrir = (catalogo: 'poliza' | 'amparo', tipo?: TipoPolizaConfigurable | TipoAmparoConfigurable) => {
    setEditando({ catalogo, codigo: tipo?.codigo ?? null });
    setBorrador(
      tipo
        ? {
            codigo: tipo.codigo,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion ?? '',
            tiposPoliza: 'tiposPoliza' in tipo ? tipo.tiposPoliza : [],
            amparaTrasElContrato: 'amparaTrasElContrato' in tipo ? tipo.amparaTrasElContrato : false,
          }
        : VACIO,
    );
  };

  const cerrar = () => {
    setEditando(null);
    setBorrador(VACIO);
  };

  const guardar = async () => {
    if (!editando || !borrador.codigo.trim() || !borrador.nombre.trim()) return;
    const base = {
      codigo: borrador.codigo.trim(),
      nombre: borrador.nombre.trim(),
      descripcion: borrador.descripcion.trim(),
    };

    setGuardando(true);
    try {
      if (editando.catalogo === 'poliza') {
        await contratacionService.guardarTipoPoliza(base);
      } else {
        await contratacionService.guardarTipoAmparo({
          ...base,
          tiposPoliza: borrador.tiposPoliza,
          amparaTrasElContrato: borrador.amparaTrasElContrato,
        });
      }
      await leer();
      toast.success(editando.codigo ? 'Cambios guardados' : 'Disponible para las pólizas nuevas');
      cerrar();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async (
    catalogo: 'poliza' | 'amparo',
    tipo: TipoPolizaConfigurable | TipoAmparoConfigurable,
  ) => {
    setGuardando(true);
    try {
      if (tipo.activo) {
        await (catalogo === 'poliza'
          ? contratacionService.retirarTipoPoliza(tipo.codigo)
          : contratacionService.retirarTipoAmparo(tipo.codigo));
        toast.success('Retirado; las pólizas que ya lo usaron lo conservan');
      } else {
        const datos = { codigo: tipo.codigo, nombre: tipo.nombre, activo: true };
        await (catalogo === 'poliza'
          ? contratacionService.guardarTipoPoliza(datos)
          : contratacionService.guardarTipoAmparo(datos));
        toast.success('Vuelve a ofrecerse');
      }
      await leer();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <p className="text-[11.5px] text-slate-400 m-0">Cargando las pólizas y los amparos…</p>;
  }

  if (error) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-red-800 m-0">{error}</p>
      </div>
    );
  }

  const nombrePoliza = (codigo: string) => polizas.find((p) => p.codigo === codigo)?.nombre ?? codigo;

  const alternarPolizaDelAmparo = (codigo: string) =>
    setBorrador((b) => ({
      ...b,
      tiposPoliza: b.tiposPoliza.includes(codigo)
        ? b.tiposPoliza.filter((c) => c !== codigo)
        : [...b.tiposPoliza, codigo],
    }));

  const formulario = (catalogo: 'poliza' | 'amparo') => {
    const nuevo = editando?.codigo === null;
    const prefijo = catalogo === 'poliza' ? 'pol' : 'amp';
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
        <p className="text-[12.5px] font-bold text-slate-800 m-0">
          {nuevo
            ? catalogo === 'poliza'
              ? 'Nuevo tipo de póliza'
              : 'Nuevo amparo'
            : `Editar ${borrador.nombre || borrador.codigo}`}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label htmlFor={`${prefijo}-codigo`} className="block text-xs font-bold text-gray-600 mb-1.5">
              Código <span className="text-red-600">*</span>
            </label>
            <input
              id={`${prefijo}-codigo`}
              type="text"
              value={borrador.codigo}
              disabled={!nuevo}
              onChange={(e) => setBorrador((b) => ({ ...b, codigo: e.target.value }))}
              placeholder={catalogo === 'poliza' ? 'SEGURO_DE_CAUCION' : 'PAGO_ANTICIPADO'}
              className={campo}
            />
            {nuevo ? (
              <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">
                No se cambia después: las pólizas registradas lo referencian.
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor={`${prefijo}-nombre`} className="block text-xs font-bold text-gray-600 mb-1.5">
              Nombre <span className="text-red-600">*</span>
            </label>
            <input
              id={`${prefijo}-nombre`}
              type="text"
              value={borrador.nombre}
              onChange={(e) => setBorrador((b) => ({ ...b, nombre: e.target.value }))}
              className={campo}
            />
          </div>
        </div>

        <div>
          <label htmlFor={`${prefijo}-desc`} className="block text-xs font-bold text-gray-600 mb-1.5">
            {catalogo === 'poliza' ? 'Qué respalda' : 'Qué ampara'}
          </label>
          <textarea
            id={`${prefijo}-desc`}
            rows={2}
            value={borrador.descripcion}
            onChange={(e) => setBorrador((b) => ({ ...b, descripcion: e.target.value }))}
            className={campo}
          />
        </div>

        {catalogo === 'amparo' ? (
          <>
            <fieldset className="m-0 p-0 border-0">
              <legend className="block text-xs font-bold text-gray-600 mb-1.5">
                En qué tipos de póliza se ofrece
              </legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {polizas
                  .filter((p) => p.activo || borrador.tiposPoliza.includes(p.codigo))
                  .map((p) => (
                    <label key={p.codigo} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={borrador.tiposPoliza.includes(p.codigo)}
                        onChange={() => alternarPolizaDelAmparo(p.codigo)}
                        className="w-4 h-4 rounded border-gray-300 text-[#003DA5] focus:ring-[#003DA5]"
                      />
                      <span className="text-[11.5px] text-slate-700">{p.nombre}</span>
                    </label>
                  ))}
              </div>
              <p className="text-[11px] text-slate-500 m-0 mt-1">
                Sin ninguno marcado se ofrece en todos.
              </p>
            </fieldset>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={borrador.amparaTrasElContrato}
                onChange={(e) => setBorrador((b) => ({ ...b, amparaTrasElContrato: e.target.checked }))}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#003DA5] focus:ring-[#003DA5]"
              />
              <span className="text-[11.5px] text-slate-700 leading-relaxed">
                Sigue amparando después de liquidado el contrato (como estabilidad o calidad): el
                cierre definitivo espera a que venza.
              </span>
            </label>
          </>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={guardando || !borrador.codigo.trim() || !borrador.nombre.trim()}
            onClick={guardar}
            className={botonPrimario}
          >
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
            Guardar
          </button>
          <button type="button" disabled={guardando} onClick={cerrar} className={botonCancelar}>
            <Undo2 className="w-3.5 h-3.5" />
            Cancelar
          </button>
        </div>
      </div>
    );
  };

  const acciones = (
    catalogo: 'poliza' | 'amparo',
    tipo: TipoPolizaConfigurable | TipoAmparoConfigurable,
  ) => (
    <div className="flex items-center gap-1 flex-shrink-0">
      {tipo.activo ? (
        <button
          type="button"
          disabled={guardando || editando !== null}
          onClick={() => abrir(catalogo, tipo)}
          aria-label={`Editar ${tipo.nombre}`}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-slate-500 hover:text-[#003DA5] hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          <Pencil className="w-3 h-3" />
          Editar
        </button>
      ) : null}
      <button
        type="button"
        disabled={guardando}
        onClick={() => alternarActivo(catalogo, tipo)}
        aria-label={`${tipo.activo ? 'Retirar' : 'Volver a ofrecer'} ${tipo.nombre}`}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border border-transparent transition-colors disabled:opacity-50 ${
          tipo.activo
            ? 'text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100'
            : 'text-[#003DA5] bg-blue-50/60 hover:bg-blue-100 border-blue-100'
        }`}
      >
        {tipo.activo ? (
          <>
            <X className="w-3 h-3" />
            Retirar
          </>
        ) : (
          <>
            <Check className="w-3 h-3" strokeWidth={3} />
            Ofrecer
          </>
        )}
      </button>
    </div>
  );

  const fila = (
    catalogo: 'poliza' | 'amparo',
    tipo: TipoPolizaConfigurable | TipoAmparoConfigurable,
    detalle?: React.ReactNode,
  ) =>
    editando?.catalogo === catalogo && editando.codigo === tipo.codigo ? (
      <li key={tipo.codigo} className="px-3.5 py-3">
        {formulario(catalogo)}
      </li>
    ) : (
      <li key={tipo.codigo} className={`px-3.5 py-3 ${tipo.activo ? '' : 'bg-slate-50'}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className={`text-[12.5px] font-bold m-0 break-words ${
                tipo.activo ? 'text-slate-800' : 'text-slate-400 line-through'
              }`}
            >
              {tipo.nombre}
            </p>
            <code className="inline-block mt-1 text-[10.5px] font-mono text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 break-all">
              {tipo.codigo}
            </code>
            {tipo.descripcion ? (
              <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed break-words">
                {tipo.descripcion}
              </p>
            ) : null}
            {detalle}
          </div>
          {acciones(catalogo, tipo)}
        </div>
      </li>
    );

  const seccion = (
    catalogo: 'poliza' | 'amparo',
    titulo: string,
    explicacion: string,
    icono: React.ReactNode,
    etiquetaAgregar: string,
    filas: React.ReactNode,
  ) => (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-2">
          {icono}
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold text-slate-800 m-0">{titulo}</p>
            <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">{explicacion}</p>
          </div>
        </div>
        {editando === null ? (
          <button type="button" onClick={() => abrir(catalogo)} className={botonPrimario}>
            <Plus className="w-3.5 h-3.5" />
            {etiquetaAgregar}
          </button>
        ) : null}
      </div>

      {editando?.catalogo === catalogo && editando.codigo === null ? formulario(catalogo) : null}

      <ul className="m-0 p-0 list-none rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
        {filas}
      </ul>
    </section>
  );

  return (
    <div className="space-y-6">
      {seccion(
        'poliza',
        'Tipos de póliza',
        'La clase de garantía que el contratista constituye y que se registra en la actividad 8.4.',
        <Shield className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />,
        'Agregar tipo de póliza',
        polizas.map((p) => fila('poliza', p)),
      )}

      {seccion(
        'amparo',
        'Amparos',
        'Las coberturas que puede incluir cada póliza, cada una con su valor y su vigencia.',
        <Umbrella className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />,
        'Agregar amparo',
        amparos.map((a) =>
          fila(
            'amparo',
            a,
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {a.tiposPoliza.length === 0 ? (
                <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-[10.5px] font-bold text-slate-600">
                  En todos los tipos de póliza
                </span>
              ) : (
                a.tiposPoliza.map((c) => (
                  <span
                    key={c}
                    className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-[10.5px] font-bold text-slate-600"
                  >
                    {nombrePoliza(c)}
                  </span>
                ))
              )}
              {a.amparaTrasElContrato ? (
                <span className="px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-[10.5px] font-bold text-amber-800">
                  Ampara tras el contrato
                </span>
              ) : null}
            </div>,
          ),
        ),
      )}
    </div>
  );
}
