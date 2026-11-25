import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Check, FileText, ListOrdered, Pencil, Plus, Trash2, Undo2, X } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  AccionModificacion,
  CadenaModificacionConfig,
  DocumentoRequeridoConfig,
  EfectoModificacion,
  EscalonModificacion,
  TipoModificacionConfigurable,
} from '../../types';

const campo =
  'w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-gray-300 bg-white focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20 disabled:bg-slate-50 disabled:text-slate-500';

const botonPrimario =
  'inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all';

const botonCancelar =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-all';

const botonEnlace = 'inline-flex items-center gap-1 text-[11.5px] font-bold text-[#003DA5] hover:underline disabled:opacity-50';

/** Lo que el código sabe hacerle al contrato al perfeccionarse: la lista es cerrada. */
export const EFECTOS: { valor: EfectoModificacion; nombre: string; ayuda: string }[] = [
  { valor: 'ADICION', nombre: 'Suma valor', ayuda: 'Pide valor adicionado y CDP; al firmar, el RP' },
  { valor: 'PRORROGA', nombre: 'Suma plazo', ayuda: 'Pide los días de prórroga' },
  { valor: 'CESION', nombre: 'Cambia el contratista', ayuda: 'Pide los datos del cesionario' },
  { valor: 'SUSPENSION', nombre: 'Suspende el contrato', ayuda: 'Pide desde cuándo; va sola' },
  { valor: 'REANUDACION', nombre: 'Reanuda el contrato', ayuda: 'Devuelve al plazo los días suspendidos; va sola' },
  { valor: 'TERMINACION_ANTICIPADA', nombre: 'Termina el contrato', ayuda: 'Pide causal y fecha; va sola' },
  { valor: 'ACLARATORIO', nombre: 'Aclara, no cambia nada', ayuda: 'Queda el registro y el acto' },
  { valor: 'OTRO', nombre: 'Otro, no cambia nada', ayuda: 'Pide una descripción del cambio' },
];

const nombreEfecto = (efecto: EfectoModificacion) => EFECTOS.find((e) => e.valor === efecto)?.nombre ?? efecto;

interface Borrador {
  codigo: string;
  nombre: string;
  descripcion: string;
  efecto: EfectoModificacion;
  vaSola: boolean;
}

const VACIO: Borrador = { codigo: '', nombre: '', descripcion: '', efecto: 'OTRO', vaSola: false };
const VAN_SOLOS: EfectoModificacion[] = ['SUSPENSION', 'REANUDACION', 'TERMINACION_ANTICIPADA'];

/**
 * Tipos de modificación, sus documentos y las dos cadenas (150).
 *
 * Un tipo nuevo se crea aquí sin migración, pero su efecto sale de una lista
 * cerrada: es lo único que el código sabe aplicarle al contrato. Los documentos
 * son los del catálogo único de la 9.5, filtrados por tipo: los generales se
 * piden siempre y los de un tipo solo cuando se radica ese tipo.
 */
export function TiposDeModificacion() {
  const [tipos, setTipos] = useState<TipoModificacionConfigurable[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoRequeridoConfig[]>([]);
  const [cadenas, setCadenas] = useState<CadenaModificacionConfig[]>([]);
  const [roles, setRoles] = useState<{ code: string; name: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState<string | null | undefined>(undefined);
  const [borrador, setBorrador] = useState<Borrador>(VACIO);
  /** Dónde se está agregando un documento: un código de tipo, o '' para los generales. */
  const [nuevoDocEn, setNuevoDocEn] = useState<string | null>(null);
  const [nuevoDoc, setNuevoDoc] = useState({ nombre: '', descripcion: '', obligatorio: true });

  const leer = () =>
    Promise.all([
      contratacionService.tiposModificacion(),
      contratacionService.documentosRequeridos('9.5'),
      contratacionService.cadenasModificacion(),
      contratacionService.rolesAprobadores().catch(() => []),
    ])
      .then(([t, d, c, r]) => {
        setTipos(t);
        setDocumentos(d);
        setCadenas(c);
        setRoles(r);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    leer();
  }, []);

  const abrir = (tipo?: TipoModificacionConfigurable) => {
    setEditando(tipo?.codigo ?? null);
    setBorrador(
      tipo
        ? { codigo: tipo.codigo, nombre: tipo.nombre, descripcion: tipo.descripcion ?? '', efecto: tipo.efecto, vaSola: tipo.vaSola }
        : VACIO,
    );
  };

  const guardar = async () => {
    if (!borrador.codigo.trim() || !borrador.nombre.trim()) return;
    setGuardando(true);
    try {
      await contratacionService.guardarTipoModificacion({
        codigo: borrador.codigo.trim(),
        nombre: borrador.nombre.trim(),
        descripcion: borrador.descripcion.trim(),
        efecto: borrador.efecto,
        vaSola: borrador.vaSola,
      });
      await leer();
      toast.success(editando ? 'Cambios guardados' : 'El tipo ya se puede radicar');
      setEditando(undefined);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async (tipo: TipoModificacionConfigurable) => {
    setGuardando(true);
    try {
      if (tipo.activo) {
        await contratacionService.retirarTipoModificacion(tipo.codigo);
        toast.success('Retirado; las modificaciones que ya lo usaron lo conservan');
      } else {
        await contratacionService.guardarTipoModificacion({
          codigo: tipo.codigo,
          nombre: tipo.nombre,
          efecto: tipo.efecto,
          activo: true,
        });
        toast.success('Vuelve a ofrecerse');
      }
      await leer();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const agregarDocumento = async () => {
    if (nuevoDocEn === null || !nuevoDoc.nombre.trim()) return;
    setGuardando(true);
    try {
      await contratacionService.crearDocumentoRequerido({
        numeral: '9.5',
        nombre: nuevoDoc.nombre.trim(),
        descripcion: nuevoDoc.descripcion.trim() || null,
        obligatorio: nuevoDoc.obligatorio,
        tiposModificacion: nuevoDocEn ? [nuevoDocEn] : [],
      });
      await leer();
      setNuevoDocEn(null);
      setNuevoDoc({ nombre: '', descripcion: '', obligatorio: true });
      toast.success('Se pedirá en las modificaciones que se radiquen desde ahora');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const ajustarDocumento = async (doc: DocumentoRequeridoConfig, cambios: { obligatorio?: boolean; activo?: boolean }) => {
    setGuardando(true);
    try {
      await contratacionService.actualizarDocumentoRequerido(doc.id, cambios);
      await leer();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <p className="text-[11.5px] text-slate-400 m-0">Cargando los tipos de modificación…</p>;
  if (error) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-red-800 m-0">{error}</p>
      </div>
    );
  }

  const docsDe = (codigo: string | null) =>
    documentos.filter((d) =>
      codigo === null ? (d.tiposModificacion ?? []).length === 0 : (d.tiposModificacion ?? []).includes(codigo),
    );

  const listaDocumentos = (codigo: string | null) => {
    const docs = docsDe(codigo);
    const clave = codigo ?? '';
    return (
      <div className="space-y-1.5">
        {docs.length === 0 && (
          <p className="text-[11px] text-slate-500 m-0">
            {codigo === null ? 'Ningún documento se pide a todos los tipos.' : 'Sin documentos propios de este tipo.'}
          </p>
        )}
        {docs.map((d) => (
          <div key={d.id} className={`flex items-center gap-2 flex-wrap ${d.activo ? '' : 'opacity-60'}`}>
            <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-[11.5px] text-slate-800 font-semibold">{d.nombre}</span>
            <span className={`text-[10px] font-bold ${d.obligatorio ? 'text-red-700' : 'text-slate-500'}`}>
              {d.activo ? (d.obligatorio ? 'obligatorio' : 'opcional') : 'ya no se pide'}
            </span>
            {d.activo && (
              <button type="button" disabled={guardando} className={botonEnlace} onClick={() => ajustarDocumento(d, { obligatorio: !d.obligatorio })}>
                {d.obligatorio ? 'Volver opcional' : 'Volver obligatorio'}
              </button>
            )}
            <button type="button" disabled={guardando} className={botonEnlace} onClick={() => ajustarDocumento(d, { activo: !d.activo })}>
              {d.activo ? 'Dejar de pedir' : 'Volver a pedir'}
            </button>
          </div>
        ))}
        {nuevoDocEn === clave ? (
          <div className="rounded-md border border-gray-200 bg-slate-50 px-3 py-2.5 space-y-2">
            <input
              aria-label="Nombre del documento"
              placeholder="Nombre del documento"
              value={nuevoDoc.nombre}
              onChange={(e) => setNuevoDoc((n) => ({ ...n, nombre: e.target.value }))}
              className={campo}
            />
            <input
              aria-label="Qué debe contener"
              placeholder="Qué debe contener (opcional)"
              value={nuevoDoc.descripcion}
              onChange={(e) => setNuevoDoc((n) => ({ ...n, descripcion: e.target.value }))}
              className={campo}
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={nuevoDoc.obligatorio}
                onChange={(e) => setNuevoDoc((n) => ({ ...n, obligatorio: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-[#003DA5] focus:ring-[#003DA5]"
              />
              <span className="text-[11.5px] text-slate-700">Obligatorio para radicar</span>
            </label>
            <div className="flex gap-2">
              <button type="button" className={botonPrimario} disabled={guardando || !nuevoDoc.nombre.trim()} onClick={agregarDocumento}>
                <Check className="w-3.5 h-3.5" /> Agregar
              </button>
              <button type="button" className={botonCancelar} onClick={() => setNuevoDocEn(null)}>
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={botonEnlace} onClick={() => setNuevoDocEn(clave)}>
            <Plus className="w-3.5 h-3.5" /> Pedir un documento
          </button>
        )}
      </div>
    );
  };

  const formulario = (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
      <p className="text-[12.5px] font-bold text-slate-800 m-0">
        {editando ? `Editar ${borrador.nombre || borrador.codigo}` : 'Nuevo tipo de modificación'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label htmlFor="tmod-codigo" className="block text-xs font-bold text-gray-600 mb-1.5">
            Código <span className="text-red-600">*</span>
          </label>
          <input
            id="tmod-codigo"
            value={borrador.codigo}
            disabled={!!editando}
            onChange={(e) => setBorrador((b) => ({ ...b, codigo: e.target.value }))}
            placeholder="REDUCCION_DE_VALOR"
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="tmod-nombre" className="block text-xs font-bold text-gray-600 mb-1.5">
            Nombre <span className="text-red-600">*</span>
          </label>
          <input
            id="tmod-nombre"
            value={borrador.nombre}
            onChange={(e) => setBorrador((b) => ({ ...b, nombre: e.target.value }))}
            className={campo}
          />
        </div>
      </div>
      <div>
        <label htmlFor="tmod-desc" className="block text-xs font-bold text-gray-600 mb-1.5">
          Descripción
        </label>
        <textarea
          id="tmod-desc"
          rows={2}
          value={borrador.descripcion}
          onChange={(e) => setBorrador((b) => ({ ...b, descripcion: e.target.value }))}
          className={campo}
        />
      </div>
      <div>
        <label htmlFor="tmod-efecto" className="block text-xs font-bold text-gray-600 mb-1.5">
          Qué le hace al contrato al perfeccionarse
        </label>
        <select
          id="tmod-efecto"
          value={borrador.efecto}
          onChange={(e) => {
            const efecto = e.target.value as EfectoModificacion;
            setBorrador((b) => ({ ...b, efecto, vaSola: VAN_SOLOS.includes(efecto) ? true : b.vaSola }));
          }}
          className={campo}
        >
          {EFECTOS.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.nombre}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500 m-0 mt-1">{EFECTOS.find((e) => e.valor === borrador.efecto)?.ayuda}</p>
      </div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={borrador.vaSola}
          disabled={VAN_SOLOS.includes(borrador.efecto)}
          onChange={(e) => setBorrador((b) => ({ ...b, vaSola: e.target.checked }))}
          className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#003DA5] focus:ring-[#003DA5]"
        />
        <span className="text-[11.5px] text-slate-700 leading-relaxed">
          Va sola: no se combina con otros cambios en la misma minuta
        </span>
      </label>
      <div className="flex gap-2">
        <button type="button" className={botonPrimario} disabled={guardando || !borrador.codigo.trim() || !borrador.nombre.trim()} onClick={guardar}>
          <Check className="w-3.5 h-3.5" /> Guardar
        </button>
        <button type="button" className={botonCancelar} onClick={() => setEditando(undefined)}>
          <X className="w-3.5 h-3.5" /> Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-[13px] font-extrabold text-slate-800 m-0">Tipos de modificación</h3>
            <p className="text-[11.5px] text-slate-500 m-0">
              Lo que el área puede radicar. Varios se combinan en una misma minuta, salvo los que van solos.
            </p>
          </div>
          {editando === undefined && (
            <button type="button" className={botonPrimario} onClick={() => abrir()}>
              <Plus className="w-3.5 h-3.5" /> Nuevo tipo
            </button>
          )}
        </div>

        {editando === null && formulario}

        <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
          {tipos.map((t) => (
            <div key={t.codigo} className={`px-3.5 py-3 space-y-2 ${t.activo ? '' : 'bg-slate-50'}`}>
              {editando === t.codigo ? (
                formulario
              ) : (
                <div className="flex items-start gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-bold text-slate-800 m-0">
                      {t.nombre}
                      {!t.activo && <span className="ml-2 text-[10px] font-bold text-slate-500">retirado</span>}
                      {t.vaSola && <span className="ml-2 text-[10px] font-bold text-amber-700">va sola</span>}
                    </p>
                    <p className="text-[11px] text-slate-500 m-0">
                      {nombreEfecto(t.efecto)}
                      {t.descripcion ? ` · ${t.descripcion}` : ''}
                    </p>
                  </div>
                  <button type="button" className={botonEnlace} onClick={() => abrir(t)}>
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button type="button" className={botonEnlace} disabled={guardando} onClick={() => alternarActivo(t)}>
                    {t.activo ? <Trash2 className="w-3.5 h-3.5" /> : <Undo2 className="w-3.5 h-3.5" />}
                    {t.activo ? 'Retirar' : 'Volver a ofrecer'}
                  </button>
                </div>
              )}
              {t.activo && editando !== t.codigo && <div className="pl-1">{listaDocumentos(t.codigo)}</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-[13px] font-extrabold text-slate-800 m-0">Documentos que se piden siempre</h3>
        <p className="text-[11.5px] text-slate-500 m-0">
          Se piden en toda modificación, sea cual sea el tipo, también en la notificación de un contrato antiguo.
        </p>
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">{listaDocumentos(null)}</div>
      </section>

      {cadenas.map((c) => (
        <EditorCadena key={c.fase} cadena={c} roles={roles} onGuardada={leer} />
      ))}
    </div>
  );
}

const ACCIONES: { valor: AccionModificacion; nombre: string }[] = [
  { valor: 'APROBAR', nombre: 'Aprobar' },
  { valor: 'DEVOLVER', nombre: 'Devolver' },
  { valor: 'NEGAR', nombre: 'Negar' },
];

/** Una de las dos cadenas: quién decide cada escalón y qué puede hacer. */
function EditorCadena({
  cadena,
  roles,
  onGuardada,
}: {
  cadena: CadenaModificacionConfig;
  roles: { code: string; name: string }[];
  onGuardada: () => void;
}) {
  const [escalones, setEscalones] = useState<EscalonModificacion[]>(cadena.escalones);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => setEscalones(cadena.escalones), [cadena]);

  const titulo = cadena.fase === 'REVISION' ? 'Cadena de revisión' : 'Cadena de visto bueno';
  const ayuda =
    cadena.fase === 'REVISION'
      ? 'Revisa lo radicado. Si devuelve, va al área; al reenviar empieza otra vez desde el primer escalón. Aprobada, el abogado elabora la minuta.'
      : 'Revisa la minuta. Si devuelve, va al abogado. Aprobada, pasa a firma del área.';

  const cambiar = (i: number, cambio: Partial<EscalonModificacion>) =>
    setEscalones((lista) => lista.map((e, j) => (j === i ? { ...e, ...cambio } : e)));
  const mover = (i: number, d: number) =>
    setEscalones((lista) => {
      const copia = [...lista];
      const [e] = copia.splice(i, 1);
      copia.splice(i + d, 0, e);
      return copia;
    });

  const guardar = async () => {
    setGuardando(true);
    try {
      await contratacionService.guardarCadenaModificacion(cadena.fase, escalones);
      toast.success('Cadena guardada; las modificaciones que ya están en curso siguen con la anterior');
      onGuardada();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <ListOrdered className="w-4 h-4 text-[#003DA5]" />
        <h3 className="text-[13px] font-extrabold text-slate-800 m-0">{titulo}</h3>
        {!cadena.confirmado && <span className="text-[10px] font-bold text-amber-700">propuesta sin confirmar</span>}
      </div>
      <p className="text-[11.5px] text-slate-500 m-0">{ayuda}</p>
      <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
        {escalones.map((e, i) => (
          <div key={i} className="px-3.5 py-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black text-slate-500 w-5">{i + 1}.</span>
              <input
                aria-label={`Nombre del escalón ${i + 1}`}
                value={e.nombre}
                onChange={(ev) => cambiar(i, { nombre: ev.target.value })}
                className={`${campo} flex-1`}
                style={{ minWidth: 160 }}
              />
              <select
                aria-label={`Quién decide el escalón ${i + 1}`}
                value={e.papel ?? 'ROL'}
                onChange={(ev) =>
                  cambiar(i, { papel: ev.target.value === 'ROL' ? null : (ev.target.value as 'ABOGADO' | 'REVISOR') })
                }
                className={campo}
                style={{ width: 220 }}
              >
                <option value="ABOGADO">El abogado asignado</option>
                <option value="REVISOR">El revisor asignado</option>
                <option value="ROL">Quien tenga un rol</option>
              </select>
              <button type="button" aria-label="Subir" className={botonEnlace} disabled={i === 0} onClick={() => mover(i, -1)}>
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" aria-label="Bajar" className={botonEnlace} disabled={i === escalones.length - 1} onClick={() => mover(i, 1)}>
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Quitar escalón"
                className={botonEnlace}
                disabled={escalones.length === 1}
                onClick={() => setEscalones((l) => l.filter((_, j) => j !== i))}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {e.papel === null && (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 pl-7">
                {roles.map((r) => (
                  <label key={r.code} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={e.roles.includes(r.code)}
                      onChange={() =>
                        cambiar(i, {
                          roles: e.roles.includes(r.code) ? e.roles.filter((x) => x !== r.code) : [...e.roles, r.code],
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-[#003DA5] focus:ring-[#003DA5]"
                    />
                    <span className="text-[11.5px] text-slate-700">{r.name}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pl-7">
              {ACCIONES.map((a) => (
                <label key={a.valor} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={e.acciones.includes(a.valor)}
                    disabled={a.valor === 'APROBAR'}
                    onChange={() =>
                      cambiar(i, {
                        acciones: e.acciones.includes(a.valor)
                          ? e.acciones.filter((x) => x !== a.valor)
                          : [...e.acciones, a.valor],
                      })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-[#003DA5] focus:ring-[#003DA5]"
                  />
                  <span className="text-[11.5px] text-slate-700">{a.nombre}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className={botonEnlace}
          onClick={() =>
            setEscalones((l) => [...l, { nombre: `Escalón ${l.length + 1}`, papel: null, roles: [], acciones: ['APROBAR', 'DEVOLVER'] }])
          }
        >
          <Plus className="w-3.5 h-3.5" /> Agregar escalón
        </button>
        <button type="button" className={botonPrimario} disabled={guardando} onClick={guardar}>
          <Check className="w-3.5 h-3.5" /> Guardar la cadena
        </button>
      </div>
    </section>
  );
}
