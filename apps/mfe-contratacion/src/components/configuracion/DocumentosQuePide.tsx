import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  ActividadCatalogo,
  DatosDocumentoRequerido,
  DocumentoRequeridoConfig,
  Modalidad,
  PlantillaFormato,
} from '../../types';

interface Props {
  numeral: string;
  modalidades: Modalidad[];
}

/** Word, PDF o Excel: es como el SIG publica sus formatos. */
const EXTENSIONES = '.pdf,.doc,.docx,.xls,.xlsx';

const CLASE_ENTRADA =
  'w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]';

const BOTON_ICONO =
  'flex-shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#003DA5] disabled:opacity-40';

/** El formulario de alta o edición, con lo que el área escribe. */
interface Borrador {
  nombre: string;
  descripcion: string;
  plantillaCodigo: string;
  obligatorio: boolean;
  modalidades: string[];
  tipologias: string[];
}

const VACIO: Borrador = {
  nombre: '',
  descripcion: '',
  plantillaCodigo: '',
  obligatorio: true,
  modalidades: [],
  tipologias: [],
};

/**
 * Los documentos que pide una actividad: su lista de chequeo (EFDS-2066).
 *
 * Cada fila es lo que el gestor verá en la actividad —nombre, para qué sirve,
 * si es obligatorio y la plantilla que descarga—, y se decide aquí sin
 * desplegar. Antes eso estaba sembrado por migración para la 3.1 y la 5.1, y
 * para el resto solo se podía asignar un formato, que lo exigía siempre y sin
 * decir para qué.
 *
 * Los formatos se siguen subiendo a la biblioteca, que guarda sus versiones;
 * aquí se elige cuál acompaña a cada documento, y se puede subir uno nuevo sin
 * salir cuando todavía no está.
 */
export function DocumentosQuePide({ numeral, modalidades }: Props) {
  const [filas, setFilas] = useState<DocumentoRequeridoConfig[]>([]);
  const [plantillas, setPlantillas] = useState<PlantillaFormato[]>([]);
  const [actividades, setActividades] = useState<ActividadCatalogo[]>([]);
  const [tipologias, setTipologias] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  /** La fila que se edita, 'nueva' para el alta, o null si no hay formulario. */
  const [editando, setEditando] = useState<string | 'nueva' | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [verRetirados, setVerRetirados] = useState(false);

  const leer = () =>
    contratacionService
      .documentosRequeridos(numeral)
      .then(setFilas)
      .catch(() => setFilas([]));

  const leerPlantillas = () =>
    contratacionService
      .plantillas()
      .then(setPlantillas)
      .catch(() => setPlantillas([]));

  useEffect(() => {
    setCargando(true);
    setEditando(null);
    Promise.all([
      leer(),
      leerPlantillas(),
      contratacionService
        .catalogoActividades()
        .then((etapas) => setActividades(etapas.flatMap((e) => e.actividades)))
        .catch(() => setActividades([])),
      // Las tipologías son las opciones del campo de la 3.1, que es donde el
      // proceso la guarda: filtrar por otra lista no casaría nunca.
      contratacionService
        .campos('3.1')
        .then((campos) => {
          const campo = campos.find((c) => c.codigo === 'tipologia_contractual');
          setTipologias(Array.isArray(campo?.opciones) ? campo!.opciones! : []);
        })
        .catch(() => setTipologias([])),
    ]).finally(() => setCargando(false));
  }, [numeral]);

  /** Un formato por código, en su versión activa más reciente. */
  const formatos = useMemo(() => {
    const porCodigo = new Map<string, PlantillaFormato>();
    for (const p of plantillas) {
      if (!p.activo) continue;
      const hay = porCodigo.get(p.codigo);
      if (!hay || Number(p.version) > Number(hay.version)) porCodigo.set(p.codigo, p);
    }
    return [...porCodigo.values()].sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [plantillas]);

  const activos = filas.filter((f) => f.activo);
  const retirados = filas.filter((f) => !f.activo);

  const guardar = async (id: string | 'nueva', b: Borrador) => {
    const datos: DatosDocumentoRequerido = {
      nombre: b.nombre.trim(),
      descripcion: b.descripcion.trim() || null,
      plantillaCodigo: b.plantillaCodigo || null,
      obligatorio: b.obligatorio,
      modalidades: b.modalidades,
      tipologias: b.tipologias,
    };
    setOcupado(id);
    try {
      if (id === 'nueva') {
        await contratacionService.crearDocumentoRequerido({
          ...datos,
          numeral,
          nombre: datos.nombre!,
        });
        toast.success('Documento agregado a la actividad');
      } else {
        await contratacionService.actualizarDocumentoRequerido(id, datos);
        toast.success('Documento actualizado');
      }
      setEditando(null);
      await leer();
    } catch (e: any) {
      toast.error(e.message ?? 'No pudimos guardar el documento. Inténtalo de nuevo.');
    } finally {
      setOcupado(null);
    }
  };

  const cambiar = async (fila: DocumentoRequeridoConfig, datos: DatosDocumentoRequerido, ok: string) => {
    setOcupado(fila.id);
    try {
      await contratacionService.actualizarDocumentoRequerido(fila.id, datos);
      toast.success(ok);
      await leer();
    } catch (e: any) {
      toast.error(e.message ?? 'No pudimos guardar el cambio. Inténtalo de nuevo.');
    } finally {
      setOcupado(null);
    }
  };

  /**
   * Sube o baja una fila intercambiando su orden con la vecina.
   *
   * Dos escrituras y no una renumeración de toda la lista: el orden solo se
   * compara, y tocar filas que no se movieron ensuciaría su historia.
   */
  const mover = async (i: number, hacia: -1 | 1) => {
    const a = activos[i];
    const b = activos[i + hacia];
    if (!a || !b) return;
    setOcupado(a.id);
    try {
      // Si comparten orden, el intercambio no movería nada: se separan.
      const ordenA = a.orden === b.orden ? b.orden + hacia : b.orden;
      await contratacionService.actualizarDocumentoRequerido(a.id, { orden: Math.max(0, ordenA) });
      await contratacionService.actualizarDocumentoRequerido(b.id, { orden: a.orden });
      await leer();
    } catch (e: any) {
      toast.error(e.message ?? 'No pudimos cambiar el orden. Inténtalo de nuevo.');
    } finally {
      setOcupado(null);
    }
  };

  const copiar = async (fila: DocumentoRequeridoConfig, destino: string) => {
    setOcupado(fila.id);
    try {
      await contratacionService.copiarDocumentoRequerido(fila.id, destino);
      toast.success(`Listo: la actividad ${destino} también pedirá este documento`);
    } catch (e: any) {
      toast.error(e.message ?? 'No pudimos copiar el documento a esa actividad.');
    } finally {
      setOcupado(null);
    }
  };

  if (cargando) {
    return (
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800 m-0">Documentos que pide esta actividad</p>
          <p className="text-[11px] text-gray-500 mt-0.5 mb-0 leading-relaxed">
            Es la lista de chequeo que verá el gestor en la actividad. Los obligatorios deben estar
            cargados para poder avanzar; los opcionales se pueden cargar si se tienen.
          </p>
        </div>
        {editando !== 'nueva' && (
          <button
            type="button"
            onClick={() => setEditando('nueva')}
            className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#003DA5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#002e7d]"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar documento
          </button>
        )}
      </div>

      {editando === 'nueva' && (
        <Formulario
          inicial={VACIO}
          formatos={formatos}
          modalidades={modalidades}
          tipologias={tipologias}
          ocupado={ocupado === 'nueva'}
          onCancelar={() => setEditando(null)}
          onGuardar={(b) => guardar('nueva', b)}
          onPlantillaSubida={leerPlantillas}
        />
      )}

      {activos.length === 0 && editando !== 'nueva' ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center">
          <FileText className="w-5 h-5 text-gray-400 mx-auto" />
          <p className="text-sm text-gray-600 m-0 mt-1.5">Esta actividad todavía no pide documentos</p>
          <p className="text-[11px] text-gray-500 mt-1 mb-0">
            Usa «Agregar documento» para indicar qué debe entregar el gestor y, si existe, con qué plantilla.
          </p>
        </div>
      ) : (
        <ul className="m-0 p-0 list-none space-y-1.5">
          {activos.map((fila, i) =>
            editando === fila.id ? (
              <li key={fila.id}>
                <Formulario
                  inicial={{
                    nombre: fila.nombre,
                    descripcion: fila.descripcion ?? '',
                    plantillaCodigo: fila.plantillaCodigo ?? '',
                    obligatorio: fila.obligatorio,
                    modalidades: fila.modalidades,
                    tipologias: fila.tipologias,
                  }}
                  formatos={formatos}
                  modalidades={modalidades}
                  tipologias={tipologias}
                  ocupado={ocupado === fila.id}
                  onCancelar={() => setEditando(null)}
                  onGuardar={(b) => guardar(fila.id, b)}
                  onPlantillaSubida={leerPlantillas}
                />
              </li>
            ) : (
              <Fila
                key={fila.id}
                fila={fila}
                modalidades={modalidades}
                actividades={actividades}
                numeral={numeral}
                ocupada={ocupado === fila.id}
                primera={i === 0}
                ultima={i === activos.length - 1}
                onEditar={() => setEditando(fila.id)}
                onSubir={() => mover(i, -1)}
                onBajar={() => mover(i, 1)}
                onRetirar={() => cambiar(fila, { activo: false }, 'Listo: el documento ya no se pide en esta actividad')}
                onCopiar={(destino) => copiar(fila, destino)}
              />
            ),
          )}
        </ul>
      )}

      {/* Lo retirado no se borra: los procesos que ya lo entregaron tienen que
          poder mostrar qué se les pidió. Se ofrece reactivarlo. */}
      {retirados.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setVerRetirados((v) => !v)}
            className="text-[11px] font-semibold text-gray-500 hover:text-gray-800"
          >
            {verRetirados ? 'Ocultar' : 'Ver'} documentos retirados ({retirados.length})
          </button>
          {verRetirados && (
            <ul className="m-0 mt-1.5 p-0 list-none space-y-1">
              {retirados.map((fila) => (
                <li
                  key={fila.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <p className="min-w-0 flex-1 text-sm text-gray-500 m-0 truncate">{fila.nombre}</p>
                  <button
                    type="button"
                    disabled={ocupado === fila.id}
                    onClick={() => cambiar(fila, { activo: true }, 'Listo: el documento vuelve a pedirse')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#003DA5] hover:underline disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Volver a pedirlo
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Un documento que la actividad pide, con sus acciones. */
function Fila({
  fila,
  modalidades,
  actividades,
  numeral,
  ocupada,
  primera,
  ultima,
  onEditar,
  onSubir,
  onBajar,
  onRetirar,
  onCopiar,
}: {
  fila: DocumentoRequeridoConfig;
  modalidades: Modalidad[];
  actividades: ActividadCatalogo[];
  numeral: string;
  ocupada: boolean;
  primera: boolean;
  ultima: boolean;
  onEditar: () => void;
  onSubir: () => void;
  onBajar: () => void;
  onRetirar: () => void;
  onCopiar: (destino: string) => void;
}) {
  const [copiando, setCopiando] = useState(false);
  const [destino, setDestino] = useState('');

  // Vacío significa todas: es lo habitual, y listar once nombres para decirlo
  // ocuparía más que el propio documento.
  const alcance =
    fila.modalidades.length === 0
      ? 'Todas las modalidades'
      : fila.modalidades.map((c) => modalidades.find((m) => m.codigo === c)?.nombre ?? c).join(' · ');

  return (
    <li className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md bg-[#E0EDFF] text-[#003DA5]">
          <FileText className="w-4 h-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-900 m-0 leading-snug">
            {fila.nombre}
            {!fila.confirmado && (
              <span className="text-amber-600" title="Tomado del procedimiento; falta confirmarlo con el formato oficial">
                {' '}◦
              </span>
            )}
            <span
              className={`ml-2 text-[10px] font-semibold ${
                fila.obligatorio ? 'text-amber-700' : 'text-gray-500'
              }`}
            >
              {fila.obligatorio ? 'Obligatorio' : 'Opcional'}
            </span>
          </p>
          {fila.descripcion && (
            <p className="text-[11px] text-gray-600 m-0 mt-0.5 leading-relaxed">{fila.descripcion}</p>
          )}
          <p className="text-[11px] text-gray-500 m-0 mt-0.5 leading-snug">
            {fila.plantillaCodigo
              ? fila.plantilla
                ? `Plantilla ${fila.plantilla.codigo} v${fila.plantilla.version}${
                    fila.plantilla.tieneArchivo ? '' : ' (aún sin archivo)'
                  }`
                : `Plantilla ${fila.plantillaCodigo} (ya no está en la biblioteca)`
              : 'Sin plantilla'}
            {' · '}
            {alcance}
            {fila.tipologias.length > 0 && ` · Solo para ${fila.tipologias.join(' · ')}`}
          </p>
        </div>

        <div className="flex items-center">
          <button type="button" title="Mover arriba" disabled={primera || ocupada} onClick={onSubir} className={BOTON_ICONO}>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Mover abajo" disabled={ultima || ocupada} onClick={onBajar} className={BOTON_ICONO}>
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Editar" disabled={ocupada} onClick={onEditar} className={BOTON_ICONO}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Pedirlo también en otra actividad"
            disabled={ocupada}
            onClick={() => setCopiando((v) => !v)}
            className={BOTON_ICONO}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Quitar de la lista"
            disabled={ocupada}
            onClick={onRetirar}
            className="flex-shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {copiando && (
        <div className="mt-2 flex items-center gap-2">
          <select
            aria-label="Actividad a la que se copia"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className={CLASE_ENTRADA}
          >
            <option value="">Elige a qué actividad copiarlo…</option>
            {actividades
              .filter((a) => a.numeral !== numeral)
              .map((a) => (
                <option key={a.numeral} value={a.numeral}>
                  {a.numeral} · {a.nombre}
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={!destino || ocupada}
            onClick={() => {
              onCopiar(destino);
              setCopiando(false);
              setDestino('');
            }}
            className="flex-shrink-0 rounded-lg bg-[#003DA5] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Copiar
          </button>
        </div>
      )}
    </li>
  );
}

/** Alta y edición de un documento, con su plantilla y su alcance. */
function Formulario({
  inicial,
  formatos,
  modalidades,
  tipologias,
  ocupado,
  onCancelar,
  onGuardar,
  onPlantillaSubida,
}: {
  inicial: Borrador;
  formatos: PlantillaFormato[];
  modalidades: Modalidad[];
  tipologias: string[];
  ocupado: boolean;
  onCancelar: () => void;
  onGuardar: (b: Borrador) => void;
  onPlantillaSubida: () => Promise<unknown>;
}) {
  const [b, setB] = useState<Borrador>(inicial);
  const [subiendo, setSubiendo] = useState(false);
  const [codigoNuevo, setCodigoNuevo] = useState('');
  const archivo = useRef<HTMLInputElement>(null);

  const alternar = (lista: string[], valor: string) =>
    lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];

  const elegida = formatos.find((f) => f.codigo === b.plantillaCodigo);

  /**
   * Sube un formato nuevo a la biblioteca y lo deja elegido.
   *
   * Pasa por la biblioteca y no se guarda aparte: es la que lleva las
   * versiones, y un formato subido aquí tiene que poder usarse en cualquier
   * otra actividad.
   */
  const subir = async (fichero: File) => {
    const codigo = codigoNuevo.trim();
    if (!codigo) {
      toast.error('Antes de subir el archivo, escribe el código del formato en el SIG (ej.: BS-FO-047)');
      return;
    }
    setSubiendo(true);
    try {
      const cuerpo = new FormData();
      cuerpo.append('codigo', codigo);
      cuerpo.append('nombre', b.nombre.trim() || fichero.name);
      cuerpo.append('file', fichero);
      await contratacionService.guardarPlantilla(cuerpo);
      await onPlantillaSubida();
      setB((x) => ({ ...x, plantillaCodigo: codigo }));
      setCodigoNuevo('');
      toast.success(`Listo: el formato ${codigo} quedó en la biblioteca y ya está elegido`);
    } catch (e: any) {
      toast.error(e.message ?? 'No pudimos subir el formato. Inténtalo de nuevo.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="rounded-lg border border-[#003DA5] bg-white px-3.5 py-3 space-y-3">
      <label className="block">
        <span className="text-[11px] font-semibold text-gray-600">Nombre del documento</span>
        <input
          className={CLASE_ENTRADA}
          value={b.nombre}
          onChange={(e) => setB({ ...b, nombre: e.target.value })}
          placeholder="Ej.: Memorando de solicitud firmado"
        />
      </label>

      <label className="block">
        <span className="text-[11px] font-semibold text-gray-600">
          Qué debe contener o para qué sirve (opcional)
        </span>
        <textarea
          className={CLASE_ENTRADA}
          rows={2}
          value={b.descripcion}
          onChange={(e) => setB({ ...b, descripcion: e.target.value })}
          placeholder="El gestor verá este texto en la lista antes de cargar el documento."
        />
      </label>

      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-gray-600">Plantilla</span>
        <div className="flex items-center gap-2">
          <select
            aria-label="Plantilla"
            className={CLASE_ENTRADA}
            value={b.plantillaCodigo}
            onChange={(e) => setB({ ...b, plantillaCodigo: e.target.value })}
          >
            <option value="">Sin plantilla</option>
            {formatos.map((f) => (
              <option key={f.codigo} value={f.codigo}>
                {f.codigo} · {f.nombre} (v{f.version})
              </option>
            ))}
          </select>
          {elegida?.archivoUrl && (
            <a
              href={contratacionService.urlDescarga(elegida.archivoUrl)}
              target="_blank"
              rel="noreferrer"
              title="Descargar la plantilla"
              className={BOTON_ICONO}
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            className={CLASE_ENTRADA}
            value={codigoNuevo}
            onChange={(e) => setCodigoNuevo(e.target.value)}
            placeholder="¿No está en la lista? Escribe su código del SIG (ej.: BS-FO-047)"
            aria-label="Código del formato nuevo"
          />
          <input
            ref={archivo}
            type="file"
            className="hidden"
            accept={EXTENSIONES}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) subir(f);
            }}
          />
          <button
            type="button"
            disabled={subiendo || !codigoNuevo.trim()}
            onClick={() => archivo.current?.click()}
            className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#003DA5] hover:text-[#003DA5] disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            {subiendo ? 'Subiendo…' : 'Subir formato'}
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={b.obligatorio}
          onChange={(e) => setB({ ...b, obligatorio: e.target.checked })}
        />
        Obligatorio: la actividad no avanza sin este documento
      </label>

      <fieldset className="m-0 p-0 border-0">
        <legend className="text-[11px] font-semibold text-gray-600">
          Modalidades en las que se pide (si no marcas ninguna, se pide en todas)
        </legend>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {modalidades.map((m) => (
            <label key={m.codigo} className="flex items-center gap-1.5 text-[11px] text-gray-700">
              <input
                type="checkbox"
                checked={b.modalidades.includes(m.codigo)}
                onChange={() => setB({ ...b, modalidades: alternar(b.modalidades, m.codigo) })}
              />
              {m.nombre}
            </label>
          ))}
        </div>
      </fieldset>

      {tipologias.length > 0 && (
        <fieldset className="m-0 p-0 border-0">
          <legend className="text-[11px] font-semibold text-gray-600">
            Tipologías contractuales (si no marcas ninguna, aplica a todas)
          </legend>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {tipologias.map((t) => (
              <label key={t} className="flex items-center gap-1.5 text-[11px] text-gray-700">
                <input
                  type="checkbox"
                  checked={b.tipologias.includes(t)}
                  onChange={() => setB({ ...b, tipologias: alternar(b.tipologias, t) })}
                />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={ocupado || !b.nombre.trim()}
          onClick={() => onGuardar(b)}
          className="rounded-lg bg-[#003DA5] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {ocupado ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
