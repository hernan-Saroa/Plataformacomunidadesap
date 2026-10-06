import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Receipt, Save, Trash2 } from 'lucide-react';
import {
  CONDICIONES_SOPORTE_LEGALIZACION,
  ItemConfigChecklistLegalizacion,
  RequisitoSoporte,
  legalizacionService,
} from '../services/api/legalizacionService';
import { viaticosService } from '../services/api/viaticosService';
import type { ConfigTipoComisionado, TipoDocumentoSoporte } from '../types/parametrizacion';

interface Fila {
  codigo: string;
  nombre: string;
  tipoRequisito: RequisitoSoporte;
  condicion: string | null;
}

const CODIGO_VALIDO = /^[A-Z0-9_-]{2,50}$/;

/**
 * EFDS-1309 — Soportes que se exigen para legalizar, por tipo de comisionado.
 *
 * Es el checklist de la legalización (config_legalizacion_documentos), distinto
 * del de radicación. Usa el mismo catálogo de tipos de documento: un documento
 * nuevo creado aquí queda en el catálogo y solo se exige en la legalización.
 * Quitar un soporte lo desactiva; los que ya se cargaron siguen existiendo.
 */
export default function ConfigSoportesLegalizacion() {
  const [tipos, setTipos] = useState<ConfigTipoComisionado[]>([]);
  const [catalogo, setCatalogo] = useState<TipoDocumentoSoporte[]>([]);
  const [config, setConfig] = useState<ItemConfigChecklistLegalizacion[]>([]);
  const [tipo, setTipo] = useState('');
  const [filas, setFilas] = useState<Fila[]>([]);
  const [agregar, setAgregar] = useState('');
  const [nuevo, setNuevo] = useState({ codigo: '', nombre: '', descripcion: '' });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cambios, setCambios] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [t, c, cfg] = await Promise.all([
        viaticosService.obtenerTodasConfiguraciones(),
        viaticosService.obtenerTiposDocumentoSoporte(),
        legalizacionService.obtenerConfig(),
      ]);
      setTipos(t);
      setCatalogo(c.filter((d) => d.activo));
      setConfig(cfg.checklist);
      setTipo((actual) => actual || t[0]?.tipoComisionado || '');
    } catch (e: any) {
      setError(e?.message || 'No fue posible cargar la configuración de legalización.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    setFilas(
      config
        .filter((i) => i.tipo_comisionado === tipo && i.activo)
        .sort((a, b) => a.orden - b.orden)
        .map((i) => ({ codigo: i.codigo, nombre: i.nombre, tipoRequisito: i.tipo_requisito, condicion: i.condicion })),
    );
    setCambios(false);
  }, [config, tipo]);

  const disponibles = useMemo(
    () => catalogo.filter((d) => !filas.some((f) => f.codigo === d.codigo)),
    [catalogo, filas],
  );

  const editar = (next: Fila[]) => {
    setFilas(next);
    setCambios(true);
    setMensaje('');
  };
  const cambiar = (i: number, parcial: Partial<Fila>) => editar(filas.map((f, j) => (j === i ? { ...f, ...parcial } : f)));
  const mover = (i: number, d: -1 | 1) => {
    const next = [...filas];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    editar(next);
  };

  const agregarDelCatalogo = () => {
    const doc = catalogo.find((d) => d.codigo === agregar);
    if (!doc) return;
    editar([...filas, { codigo: doc.codigo, nombre: doc.nombre, tipoRequisito: 'OBLIGATORIO', condicion: null }]);
    setAgregar('');
  };

  const crearDocumento = async () => {
    setError('');
    const codigo = nuevo.codigo.trim().toUpperCase();
    if (!CODIGO_VALIDO.test(codigo)) {
      setError('El código debe tener de 2 a 50 caracteres: mayúsculas, números, guiones o guiones bajos.');
      return;
    }
    if (nuevo.nombre.trim().length < 2) {
      setError('El nombre del documento debe tener al menos 2 caracteres.');
      return;
    }
    setGuardando(true);
    try {
      const creado = await viaticosService.crearTipoDocumentoSoporte({
        codigo,
        nombre: nuevo.nombre.trim(),
        ...(nuevo.descripcion.trim() && { descripcion: nuevo.descripcion.trim() }),
      });
      if (creado) {
        setCatalogo((c) => [...c, creado]);
        editar([...filas, { codigo: creado.codigo, nombre: creado.nombre, tipoRequisito: 'OBLIGATORIO', condicion: null }]);
        setNuevo({ codigo: '', nombre: '', descripcion: '' });
        setMensaje(`Documento ${creado.nombre} creado. Guarde para exigirlo en la legalización.`);
      }
    } catch (e: any) {
      setError(e?.message || 'No fue posible crear el documento.');
    } finally {
      setGuardando(false);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    setError('');
    try {
      await legalizacionService.reemplazarChecklist(
        tipo,
        filas.map((f, i) => ({ codigo: f.codigo, tipoRequisito: f.tipoRequisito, condicion: f.condicion, orden: i + 1 })),
      );
      const cfg = await legalizacionService.obtenerConfig();
      setConfig(cfg.checklist);
      setMensaje('Soportes de legalización guardados.');
    } catch (e: any) {
      setError(e?.message || 'No fue posible guardar los soportes de legalización.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <p className="text-sm text-slate-500">Cargando soportes de legalización…</p>;

  return (
    <section aria-labelledby="titulo-soportes-legalizacion" className="space-y-4">
      <div>
        <h3 id="titulo-soportes-legalizacion" className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-amber-600" />
          Soportes de legalización
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Documentos que el comisionado debe cargar para legalizar, por tipo de comisionado. Son independientes de
          los documentos de radicación.
        </p>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</p>}
      {mensaje && <p role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">{mensaje}</p>}

      <label className="block text-sm font-semibold text-slate-700">
        Tipo de comisionado
        <select
          className="mt-1 block w-full sm:w-80 rounded-lg border border-slate-300 p-2 text-sm"
          value={tipo}
          onChange={(e) => { setTipo(e.target.value); setMensaje(''); }}
          disabled={guardando}
        >
          {tipos.map((t) => (
            <option key={t.tipoComisionado} value={t.tipoComisionado}>{t.tipoComisionado}</option>
          ))}
        </select>
      </label>

      {filas.length === 0 ? (
        <p className="text-sm text-slate-500">Este tipo de comisionado no tiene soportes de legalización.</p>
      ) : (
        <ol className="space-y-2">
          {filas.map((f, i) => (
            <li key={f.codigo} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-3">
              <span className="flex-1 min-w-[12rem] text-sm font-semibold text-slate-800">
                {i + 1}. {f.nombre} <span className="font-mono text-xs text-slate-400">{f.codigo}</span>
              </span>
              <label className="text-xs text-slate-600">
                Requisito
                <select
                  aria-label={`Requisito de ${f.nombre}`}
                  className="ml-1 rounded border border-slate-300 p-1 text-xs"
                  value={f.tipoRequisito}
                  onChange={(e) => cambiar(i, { tipoRequisito: e.target.value as RequisitoSoporte })}
                  disabled={guardando}
                >
                  <option value="OBLIGATORIO">Obligatorio</option>
                  <option value="OPCIONAL">Opcional</option>
                </select>
              </label>
              <label className="text-xs text-slate-600">
                Se exige
                <select
                  aria-label={`Condición de ${f.nombre}`}
                  className="ml-1 rounded border border-slate-300 p-1 text-xs"
                  value={f.condicion ?? ''}
                  onChange={(e) => cambiar(i, { condicion: e.target.value || null })}
                  disabled={guardando}
                >
                  <option value="">Siempre</option>
                  {CONDICIONES_SOPORTE_LEGALIZACION.map((c) => (
                    <option key={c.valor} value={c.valor}>{c.etiqueta}</option>
                  ))}
                </select>
              </label>
              <button type="button" aria-label={`Subir ${f.nombre}`} disabled={guardando || i === 0} onClick={() => mover(i, -1)}
                className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
              <button type="button" aria-label={`Bajar ${f.nombre}`} disabled={guardando || i === filas.length - 1} onClick={() => mover(i, 1)}
                className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
              <button type="button" aria-label={`Quitar ${f.nombre}`} disabled={guardando} onClick={() => editar(filas.filter((_, j) => j !== i))}
                className="p-1 rounded text-red-500 hover:bg-red-50 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm font-semibold text-slate-700">
          Agregar documento del catálogo
          <select
            className="mt-1 block w-full sm:w-80 rounded-lg border border-slate-300 p-2 text-sm"
            value={agregar}
            onChange={(e) => setAgregar(e.target.value)}
            disabled={guardando || disponibles.length === 0}
          >
            <option value="">Seleccione…</option>
            {disponibles.map((d) => (
              <option key={d.codigo} value={d.codigo}>{d.nombre}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={agregarDelCatalogo} disabled={guardando || !agregar}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      <fieldset className="rounded-lg border border-dashed border-slate-300 p-3 space-y-2">
        <legend className="px-1 text-sm font-semibold text-slate-700">Crear documento nuevo</legend>
        <div className="flex flex-wrap gap-2">
          <label className="text-xs text-slate-600">
            Código
            <input className="mt-1 block w-44 rounded border border-slate-300 p-2 text-sm font-mono uppercase" value={nuevo.codigo}
              onChange={(e) => setNuevo({ ...nuevo, codigo: e.target.value.toUpperCase() })} maxLength={50} disabled={guardando} placeholder="CERT_ASISTENCIA" />
          </label>
          <label className="text-xs text-slate-600 flex-1 min-w-[12rem]">
            Nombre
            <input className="mt-1 block w-full rounded border border-slate-300 p-2 text-sm" value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} maxLength={100} disabled={guardando} />
          </label>
          <label className="text-xs text-slate-600 w-full">
            Descripción (opcional)
            <input className="mt-1 block w-full rounded border border-slate-300 p-2 text-sm" value={nuevo.descripcion}
              onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} maxLength={255} disabled={guardando} />
          </label>
        </div>
        <button type="button" onClick={() => void crearDocumento()} disabled={guardando || !nuevo.codigo || !nuevo.nombre}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
          <Plus className="w-4 h-4" /> Crear y agregar
        </button>
      </fieldset>

      <button type="button" onClick={() => void guardar()} disabled={guardando || !cambios || !tipo}
        className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-40">
        <Save className="w-4 h-4" /> {guardando ? 'Guardando…' : 'Guardar soportes de legalización'}
      </button>
    </section>
  );
}
