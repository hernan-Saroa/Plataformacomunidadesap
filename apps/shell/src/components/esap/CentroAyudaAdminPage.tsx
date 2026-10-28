/**
 * Administración de los recursos del Centro de Ayuda (EFDS-2399).
 *
 * Aquí se cargan y actualizan manuales, videos, documentación, cursos, atajos y
 * mejores prácticas sin intervención de desarrollo. La entrada del menú y los
 * endpoints exigen el permiso centro-ayuda.recursos.gestionar, que se asigna
 * desde Roles y Permisos.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  FolderOpen,
  LifeBuoy,
  Loader2,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CATEGORIAS_CENTRO_AYUDA,
  centroAyudaService,
  type CategoriaCentroAyuda,
  type DatosRecurso,
  type RecursoCentroAyuda,
} from '../../services/api/centroAyuda.service';
import { IconoRecurso, tamanoLegible, tipoDeRecurso } from './centro-ayuda/IconoRecurso';
import { buscarRecursos } from './centro-ayuda/busqueda';
import { VisorRecurso } from './centro-ayuda/VisorRecurso';
import { SIN_TRANSICION_CSS, SOLO_TRANSICION_DE_COLOR } from './centro-ayuda/estilosAnimacion';

// Mismo límite que auth-service (TAMANO_MAXIMO_ARCHIVO).
const TAMANO_MAXIMO_ARCHIVO = 500 * 1024 * 1024;

const nombreCategoria = (categoria: CategoriaCentroAyuda) =>
  CATEGORIAS_CENTRO_AYUDA.find((c) => c.id === categoria)?.nombre || categoria;

const EXT_DOCUMENTO = '.pdf,.doc,.docx,.odt,.rtf,.txt,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp';
const EXT_VIDEO = '.mp4,.webm,.ogg,.ogv';

const ACEPTA: Record<CategoriaCentroAyuda, string> = {
  manual: '.pdf',
  videos: EXT_VIDEO,
  atajos: '',
  documentacion: EXT_DOCUMENTO,
  cursos: `${EXT_DOCUMENTO},${EXT_VIDEO}`,
  practicas: EXT_DOCUMENTO,
};

const AYUDA_CATEGORIA: Record<CategoriaCentroAyuda, string> = {
  documentacion: 'Guía de un módulo: archivo, enlace o texto. Se agrupa por el módulo que indique.',
  videos: 'Archivo de video (MP4, WebM u OGG) o enlace al video publicado.',
  atajos: 'Combinación de teclas, por ejemplo: Ctrl + K.',
  manual: 'PDF del manual. Solo hay un manual vigente: al activar uno, el anterior se desactiva.',
  cursos: 'Programa de capacitación: enlace a la plataforma del curso, archivo o texto.',
  practicas: 'Recomendación de uso: texto, archivo o enlace.',
};

const datosDe = (r: RecursoCentroAyuda): DatosRecurso => ({
  categoria: r.categoria,
  titulo: r.titulo,
  descripcion: r.descripcion ?? '',
  modulo: r.modulo ?? '',
  contenido: r.contenido ?? '',
  enlace: r.enlace ?? '',
  version: r.version ?? '',
  orden: r.orden,
  activo: r.activo,
});

const campo =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-[#1e5da8] focus:outline-none';
const campoConError = campo.replace('border-slate-300', 'border-red-400').replace('focus:border-[#1e5da8]', 'focus:border-red-500');
const etiqueta = 'mb-1 block text-xs font-medium text-slate-700';
const tituloSeccion = 'text-[11px] font-semibold uppercase tracking-wider text-slate-500';

type CampoValidado = 'titulo' | 'version' | 'contenido' | 'enlace' | 'archivo';
type Errores = Partial<Record<CampoValidado, string>>;

/** Orden en que se revisan los campos y a cuál se lleva el foco si fallan. */
const ID_DE_CAMPO: Record<CampoValidado, string> = {
  titulo: 'ca-titulo',
  version: 'ca-version',
  contenido: 'ca-contenido',
  enlace: 'ca-enlace',
  archivo: 'ca-archivo',
};

const extensionDe = (nombre: string) => (nombre.split('.').pop() || '').toLowerCase();

function ErrorDeCampo({ campo, errores }: { campo: CampoValidado; errores: Errores }) {
  if (!errores[campo]) return null;
  return (
    <p id={`${ID_DE_CAMPO[campo]}-error`} className="mt-1 text-xs text-red-600">
      {errores[campo]}
    </p>
  );
}
const botonPrimario =
  'inline-flex items-center gap-2 rounded-lg bg-[#1e5da8] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#174a87] hover:shadow active:scale-[0.98] disabled:opacity-60';
const botonSecundario =
  'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60';

/** Zona para soltar o elegir el archivo del recurso. */
function ZonaArchivo({ acepta, archivo, actual, quitarActual, onArchivo, onQuitarActual, puedeQuitar, conError }: {
  acepta: string;
  archivo: File | null;
  actual: RecursoCentroAyuda['archivo'];
  quitarActual: boolean;
  onArchivo: (archivo: File | null) => void;
  onQuitarActual: (quitar: boolean) => void;
  puedeQuitar: boolean;
  conError: boolean;
}) {
  const entradaRef = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);

  const recibir = (lista: FileList | null) => {
    const elegido = lista?.[0] ?? null;
    if (!elegido) return;
    if (elegido.size > TAMANO_MAXIMO_ARCHIVO) {
      toast.error('El archivo supera el máximo permitido de 500 MB');
      return;
    }
    onArchivo(elegido);
    onQuitarActual(false);
  };

  if (archivo) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5"
        style={SIN_TRANSICION_CSS}
      >
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{archivo.name}</p>
          <p className="text-xs text-slate-600">{tamanoLegible(archivo.size)} · listo para subir</p>
        </div>
        <button
          type="button"
          onClick={() => onArchivo(null)}
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-red-600"
          aria-label="Quitar el archivo elegido"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        id={ID_DE_CAMPO.archivo}
        role="button"
        tabIndex={0}
        aria-invalid={conError || undefined}
        aria-describedby={conError ? `${ID_DE_CAMPO.archivo}-error` : undefined}
        onClick={() => entradaRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            entradaRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          recibir(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-all ${
          arrastrando
            ? 'border-[#1e5da8] bg-blue-50'
            : conError
              ? 'border-red-400 bg-red-50 hover:border-[#1e5da8]'
              : 'border-slate-300 bg-white hover:border-[#1e5da8] hover:bg-blue-50/50'
        }`}
      >
        <UploadCloud className={`h-7 w-7 transition-colors ${arrastrando ? 'text-[#1e5da8]' : 'text-slate-400'}`} />
        <p className="text-sm text-slate-700">
          <span className="font-medium text-[#1e5da8]">Elija un archivo</span> o arrástrelo aquí
        </p>
        <p className="text-[11px] text-slate-500">{acepta.replace(/\./g, '').replace(/,/g, ', ').toUpperCase()} · hasta 500 MB</p>
        <input ref={entradaRef} type="file" accept={acepta} className="sr-only" onChange={(e) => recibir(e.target.files)} />
      </div>

      {actual && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
          <span className={`truncate ${quitarActual ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
            Actual: {actual.nombre} ({tamanoLegible(actual.tamano)})
          </span>
          {puedeQuitar && (
            <label className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 text-slate-600">
              <input type="checkbox" checked={quitarActual} onChange={(e) => onQuitarActual(e.target.checked)} />
              Quitar
            </label>
          )}
        </div>
      )}
    </div>
  );
}

interface FormularioProps {
  recurso: RecursoCentroAyuda | null;
  categoriaInicial: CategoriaCentroAyuda;
  onCerrar: () => void;
  onGuardado: () => void;
}

function FormularioRecurso({ recurso, categoriaInicial, onCerrar, onGuardado }: FormularioProps) {
  const [datos, setDatos] = useState<DatosRecurso>(
    recurso ? datosDe(recurso) : { categoria: categoriaInicial, titulo: '', orden: 0, activo: true },
  );
  const [archivo, setArchivo] = useState<File | null>(null);
  const [quitarArchivo, setQuitarArchivo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Errores>({});

  const limpiarError = (...campos: CampoValidado[]) =>
    setErrores((previos) => {
      if (!campos.some((c) => previos[c])) return previos;
      const siguientes = { ...previos };
      campos.forEach((c) => delete siguientes[c]);
      return siguientes;
    });

  const cambiar = (cambios: Partial<DatosRecurso>) => {
    setDatos((d) => ({ ...d, ...cambios }));
    if ('categoria' in cambios) setErrores({});
    if ('titulo' in cambios) limpiarError('titulo');
    if ('version' in cambios) limpiarError('version');
    // en documentación, cursos y prácticas basta con texto, enlace o archivo
    if ('contenido' in cambios || 'enlace' in cambios) limpiarError('contenido', 'enlace', 'archivo');
  };
  const elegirArchivo = (nuevo: File | null) => {
    setArchivo(nuevo);
    limpiarError('archivo', 'contenido');
  };
  const categoria = datos.categoria;
  const admiteArchivo = categoria !== 'atajos';

  const propsDeCampo = (campoValidado: CampoValidado) => ({
    id: ID_DE_CAMPO[campoValidado],
    className: errores[campoValidado] ? campoConError : campo,
    'aria-invalid': errores[campoValidado] ? true : undefined,
    'aria-describedby': errores[campoValidado] ? `${ID_DE_CAMPO[campoValidado]}-error` : undefined,
  });

  /** Mismas reglas que auth-service (CentroAyudaService.validar), para avisar antes de enviar. */
  const validar = (): Errores => {
    const encontrados: Errores = {};
    const enlace = (datos.enlace ?? '').trim();
    const usaEnlace = categoria !== 'atajos' && categoria !== 'manual';
    const conArchivo = Boolean(archivo) || (Boolean(recurso?.archivo) && !quitarArchivo);
    const extension = archivo ? extensionDe(archivo.name) : recurso?.archivo ? extensionDe(recurso.archivo.nombre) : '';

    if (!datos.titulo.trim()) encontrados.titulo = 'Escriba un título';
    if (usaEnlace && enlace && !/^https?:\/\/\S+$/i.test(enlace)) {
      encontrados.enlace = 'El enlace debe empezar por http:// o https://';
    }
    switch (categoria) {
      case 'manual':
        if (!datos.version?.trim()) encontrados.version = 'Indique la versión del sistema';
        if (!conArchivo) encontrados.archivo = 'Cargue el PDF del manual';
        else if (extension !== 'pdf') encontrados.archivo = 'El manual debe ser un PDF';
        break;
      case 'videos':
        if (conArchivo && !['mp4', 'webm', 'ogg', 'ogv'].includes(extension)) {
          encontrados.archivo = 'El video debe ser MP4, WebM u OGG';
        } else if (!conArchivo && !enlace) {
          encontrados.archivo = 'Cargue el video o escriba su enlace';
        }
        break;
      case 'atajos':
        if (!datos.contenido?.trim()) encontrados.contenido = 'Escriba la combinación de teclas';
        break;
      default:
        if (!conArchivo && !enlace && !datos.contenido?.trim()) {
          encontrados.contenido = 'Agregue un texto, un enlace o un archivo';
        }
    }
    return encontrados;
  };

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardando) onCerrar();
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCerrar, guardando]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const encontrados = validar();
    const primero = (Object.keys(ID_DE_CAMPO) as CampoValidado[]).find((c) => encontrados[c]);
    if (primero) {
      setErrores(encontrados);
      document.getElementById(ID_DE_CAMPO[primero])?.focus();
      return;
    }
    setGuardando(true);
    try {
      const envio: DatosRecurso = {
        ...datos,
        archivo: admiteArchivo ? archivo : null,
        quitarArchivo: !archivo && (quitarArchivo || (!admiteArchivo && Boolean(recurso?.archivo))),
      };
      if (recurso) {
        await centroAyudaService.actualizar(recurso.id, envio);
        toast.success('Recurso actualizado');
      } else {
        await centroAyudaService.crear(envio);
        toast.success('Recurso publicado', { description: `Ya aparece en «${nombreCategoria(categoria)}» del Centro de Ayuda.` });
      }
      onGuardado();
    } catch {
      // apiClient ya muestra el mensaje del servidor
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ca-form-titulo"
      onClick={() => !guardando && onCerrar()}
      style={SIN_TRANSICION_CSS}
    >
      <motion.form
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onSubmit={guardar}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={SIN_TRANSICION_CSS}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="ca-form-titulo" className="text-base font-semibold text-slate-900">
              {recurso ? 'Editar recurso' : 'Nuevo recurso'}
            </h2>
            <p className="text-xs text-slate-500">{AYUDA_CATEGORIA[categoria]}</p>
          </div>
          <button type="button" onClick={onCerrar} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-5 md:grid-cols-2">
            <section className="space-y-4 p-5" aria-labelledby="ca-seccion-datos">
              <h3 id="ca-seccion-datos" className={tituloSeccion}>Datos del recurso</h3>
              <div>
                <label className={etiqueta} htmlFor="ca-categoria">Opción del Centro de Ayuda</label>
                <select
                  id="ca-categoria"
                  className={campo}
                  value={categoria}
                  onChange={(e) => cambiar({ categoria: e.target.value as CategoriaCentroAyuda })}
                >
                  {CATEGORIAS_CENTRO_AYUDA.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={etiqueta} htmlFor="ca-titulo">Título <span className="text-red-500">*</span></label>
                <input {...propsDeCampo('titulo')} maxLength={200} autoFocus value={datos.titulo} onChange={(e) => cambiar({ titulo: e.target.value })} />
                <ErrorDeCampo campo="titulo" errores={errores} />
              </div>

              <div>
                <label className={etiqueta} htmlFor="ca-descripcion">Descripción</label>
                <textarea id="ca-descripcion" className={campo} rows={2} value={datos.descripcion ?? ''} onChange={(e) => cambiar({ descripcion: e.target.value })} />
              </div>

              <AnimatePresence initial={false}>
                {categoria === 'documentacion' && (
                  <motion.div key="modulo" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden" style={SIN_TRANSICION_CSS}>
                    <label className={etiqueta} htmlFor="ca-modulo">Módulo del sistema</label>
                    <input id="ca-modulo" className={campo} maxLength={100} placeholder="Ej.: Contratación" value={datos.modulo ?? ''} onChange={(e) => cambiar({ modulo: e.target.value })} />
                  </motion.div>
                )}

                {categoria === 'manual' && (
                  <motion.div key="version" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden" style={SIN_TRANSICION_CSS}>
                    <label className={etiqueta} htmlFor="ca-version">Versión del sistema <span className="text-red-500">*</span></label>
                    <input {...propsDeCampo('version')} maxLength={30} placeholder="Ej.: 2.1" value={datos.version ?? ''} onChange={(e) => cambiar({ version: e.target.value })} />
                    <ErrorDeCampo campo="version" errores={errores} />
                  </motion.div>
                )}

                {categoria === 'atajos' ? (
                  <motion.div key="teclas" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden" style={SIN_TRANSICION_CSS}>
                    <label className={etiqueta} htmlFor="ca-contenido">Combinación de teclas <span className="text-red-500">*</span></label>
                    <input
                      {...propsDeCampo('contenido')}
                      className={`${errores.contenido ? campoConError : campo} font-mono`}
                      placeholder="Ctrl + K"
                      value={datos.contenido ?? ''}
                      onChange={(e) => cambiar({ contenido: e.target.value })}
                    />
                    <ErrorDeCampo campo="contenido" errores={errores} />
                  </motion.div>
                ) : categoria !== 'manual' && (
                  <motion.div key="texto" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden" style={SIN_TRANSICION_CSS}>
                    <label className={etiqueta} htmlFor="ca-contenido">Texto</label>
                    <textarea {...propsDeCampo('contenido')} rows={6} value={datos.contenido ?? ''} onChange={(e) => cambiar({ contenido: e.target.value })} />
                    <ErrorDeCampo campo="contenido" errores={errores} />
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <section className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-5" aria-labelledby="ca-seccion-contenido">
              <h3 id="ca-seccion-contenido" className={tituloSeccion}>
                {categoria === 'atajos' ? 'Publicación' : 'Contenido y publicación'}
              </h3>
              <AnimatePresence initial={false}>
                {categoria !== 'atajos' && categoria !== 'manual' && (
                  <motion.div key="enlace" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden" style={SIN_TRANSICION_CSS}>
                    <label className={etiqueta} htmlFor="ca-enlace">Enlace</label>
                    <input {...propsDeCampo('enlace')} type="url" placeholder="https://" value={datos.enlace ?? ''} onChange={(e) => cambiar({ enlace: e.target.value })} />
                    <ErrorDeCampo campo="enlace" errores={errores} />
                  </motion.div>
                )}

                {admiteArchivo && (
                  <motion.div key="archivo" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden" style={SIN_TRANSICION_CSS}>
                    <label className={etiqueta}>
                      {categoria === 'manual' ? <>Archivo PDF <span className="text-red-500">*</span></> : 'Archivo'}
                    </label>
                    <ZonaArchivo
                      acepta={ACEPTA[categoria]}
                      archivo={archivo}
                      actual={recurso?.archivo ?? null}
                      quitarActual={quitarArchivo}
                      onArchivo={elegirArchivo}
                      onQuitarActual={setQuitarArchivo}
                      puedeQuitar={categoria !== 'manual'}
                      conError={Boolean(errores.archivo)}
                    />
                    <ErrorDeCampo campo="archivo" errores={errores} />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-6">
                <div className="w-28">
                  <label className={etiqueta} htmlFor="ca-orden">Orden</label>
                  <input id="ca-orden" type="number" min={0} className={campo} value={datos.orden ?? 0} onChange={(e) => cambiar({ orden: Number(e.target.value) || 0 })} />
                </div>
                <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={datos.activo ?? true} onChange={(e) => cambiar({ activo: e.target.checked })} className="h-4 w-4" />
                  Visible para los usuarios
                </label>
              </div>
            </section>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button type="button" onClick={onCerrar} disabled={guardando} className={botonSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className={botonPrimario}>
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            {guardando ? 'Guardando...' : recurso ? 'Guardar cambios' : 'Publicar'}
          </button>
        </div>
      </motion.form>
    </motion.div>,
    document.body,
  );
}

function ConfirmarEliminar({ recurso, onCancelar, onConfirmar }: {
  recurso: RecursoCentroAyuda;
  onCancelar: () => void;
  onConfirmar: () => Promise<void>;
}) {
  const [eliminando, setEliminando] = useState(false);
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      onClick={() => !eliminando && onCancelar()}
      style={SIN_TRANSICION_CSS}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        style={SIN_TRANSICION_CSS}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50">
            <Trash2 className="h-5 w-5 text-red-600" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">¿Eliminar este recurso?</h2>
            <p className="mt-1 text-sm text-slate-700">
              «{recurso.titulo}» dejará de aparecer en el Centro de Ayuda{recurso.archivo ? ' y su archivo se borrará' : ''}.
              Si solo quiere ocultarlo, desactívelo.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancelar} disabled={eliminando} className={botonSecundario}>
            Cancelar
          </button>
          <button
            disabled={eliminando}
            onClick={async () => {
              setEliminando(true);
              try {
                await onConfirmar();
              } finally {
                setEliminando(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-red-700 active:scale-[0.98] disabled:opacity-60"
          >
            {eliminando && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

const botonFila =
  'rounded-lg p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-[#1e5da8] focus-visible:ring-2 focus-visible:ring-[#003DA5] focus-visible:ring-offset-2';

export default function CentroAyudaAdminPage() {
  const [recursos, setRecursos] = useState<RecursoCentroAyuda[] | null>(null);
  const [filtro, setFiltro] = useState<CategoriaCentroAyuda>('documentacion');
  const [editando, setEditando] = useState<RecursoCentroAyuda | 'nuevo' | null>(null);
  const [porEliminar, setPorEliminar] = useState<RecursoCentroAyuda | null>(null);
  const [enVisor, setEnVisor] = useState<RecursoCentroAyuda | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [consulta, setConsulta] = useState('');

  const cargar = async () => {
    setErrorCarga(false);
    try {
      setRecursos(await centroAyudaService.listarParaAdministrar());
    } catch {
      setErrorCarga(true);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const conteo = useMemo(() => {
    const total: Record<string, number> = {};
    (recursos || []).forEach((r) => {
      total[r.categoria] = (total[r.categoria] || 0) + 1;
    });
    return total;
  }, [recursos]);

  // Mientras se busca, la lista muestra coincidencias de todas las opciones.
  const buscando = consulta.trim().length > 0;
  const visibles = buscando
    ? buscarRecursos(recursos || [], consulta)
    : (recursos || []).filter((r) => r.categoria === filtro);

  const alternarActivo = async (recurso: RecursoCentroAyuda) => {
    try {
      await centroAyudaService.actualizar(recurso.id, { ...datosDe(recurso), activo: !recurso.activo });
      toast.success(recurso.activo ? 'El recurso quedó oculto' : 'El recurso ya es visible');
      cargar();
    } catch {
      // apiClient ya muestra el mensaje del servidor
    }
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex h-full flex-col" style={{ minHeight: '100%', backgroundColor: '#F8FAFC' }}>
      <header className="border-b px-6 py-5 shadow-sm" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex-shrink-0 rounded-xl p-2.5 text-white shadow-sm" style={{ backgroundColor: '#003DA5' }}>
              <LifeBuoy className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl" style={{ color: '#0F172A' }}>
                Centro de Ayuda
              </h1>
              <p className="mt-0.5 text-xs font-medium" style={{ color: '#64748B' }}>
                Manuales, videos, documentación, cursos, atajos y mejores prácticas que ven los usuarios en el botón de ayuda.
              </p>
            </div>
          </div>
          <button onClick={() => setEditando('nuevo')} className={botonPrimario}>
            <Plus className="h-4 w-4" />
            Nuevo recurso
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm border border-slate-200" role="tablist">
            {CATEGORIAS_CENTRO_AYUDA.map((c) => {
              const activa = filtro === c.id;
              return (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={activa}
                  onClick={() => setFiltro(c.id)}
                  className={`relative rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    activa ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {activa && (
                    <motion.span
                      layoutId="ca-pestana"
                      className="absolute inset-0 rounded-lg bg-[#1e5da8] shadow-sm"
                      transition={{ type: 'spring', damping: 30, stiffness: 380 }}
                      style={SIN_TRANSICION_CSS}
                    />
                  )}
                  <span className="relative">
                    {c.nombre}
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${activa ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                      {conteo[c.id] || 0}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mb-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-600">
              {buscando
                ? `${visibles.length} ${visibles.length === 1 ? 'resultado' : 'resultados'} en todas las opciones`
                : AYUDA_CATEGORIA[filtro]}
            </p>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                inputMode="search"
                placeholder="Buscar recurso..."
                aria-label="Buscar recurso"
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setConsulta('');
                }}
                className={campo.replace('px-3', 'pl-9 pr-10')}
              />
              {consulta && (
                <button
                  onClick={() => setConsulta('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-gray-700"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {recursos === null ? (
            errorCarga ? (
              <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-700">
                No se pudieron cargar los recursos.{' '}
                <button onClick={cargar} className="font-medium text-[#1e5da8] underline">Reintentar</button>
              </div>
            ) : (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-white border border-slate-200" />
                ))}
              </div>
            )
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              {visibles.length === 0 && buscando ? (
                <motion.div
                  key="sin-resultados"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center"
                  style={SIN_TRANSICION_CSS}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 border border-slate-200">
                    <SearchX className="h-6 w-6 text-slate-400" />
                  </span>
                  <p className="text-sm font-medium text-slate-800">Ningún recurso coincide con «{consulta.trim()}»</p>
                  <button onClick={() => setConsulta('')} className={botonSecundario}>
                    Limpiar búsqueda
                  </button>
                </motion.div>
              ) : visibles.length === 0 ? (
                <motion.div
                  key={`vacio-${filtro}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center"
                  style={SIN_TRANSICION_CSS}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 border border-slate-200">
                    <FolderOpen className="h-6 w-6 text-slate-400" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Aún no hay contenido en «{nombreCategoria(filtro)}»</p>
                    <p className="mt-1 text-xs text-slate-500">Los usuarios ven «Contenido no disponible por el momento».</p>
                  </div>
                  <button onClick={() => setEditando('nuevo')} className={botonPrimario}>
                    <Plus className="h-4 w-4" />
                    Cargar el primero
                  </button>
                </motion.div>
              ) : (
                <motion.div key={buscando ? 'lista-busqueda' : `lista-${filtro}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-2" style={SIN_TRANSICION_CSS}>
                  <AnimatePresence initial={false}>
                    {visibles.map((r, i) => {
                      const tipo = tipoDeRecurso(r);
                      const resumen = [
                        r.categoria === 'atajos' ? r.contenido : tipo.etiqueta,
                        r.archivo ? `${r.archivo.nombre} (${tamanoLegible(r.archivo.tamano)})` : null,
                        r.enlace,
                        // el comienzo del texto dice más que un «con texto»
                        r.categoria !== 'atajos' && r.contenido ? r.contenido.replace(/\s+/g, ' ') : null,
                      ].filter(Boolean).join(' · ');
                      return (
                        <motion.div
                          key={r.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.03 } }}
                          exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
                          className={`flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 border transition-shadow hover:shadow-md ${
                            r.activo ? 'border-slate-200' : 'border-slate-200 opacity-70'
                          }`}
                          style={SOLO_TRANSICION_DE_COLOR}
                        >
                          <IconoRecurso recurso={r} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-slate-900">{r.titulo}</p>
                              {buscando && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                  {nombreCategoria(r.categoria)}
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  r.activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {r.activo ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                {r.activo ? 'Visible' : 'Oculto'}
                              </span>
                              {r.version && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#1e5da8] border border-blue-100">v{r.version}</span>}
                              {r.modulo && <span className="text-[11px] text-slate-500">· {r.modulo}</span>}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-slate-500">{resumen || r.descripcion || 'Sin contenido'}</p>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {r.activo && r.archivo && (r.archivo.esVideo || r.archivo.previsualizable) && (
                              <button onClick={() => setEnVisor(r)} className={botonFila} title="Ver" aria-label={`Ver ${r.titulo}`}>
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                            <button onClick={() => alternarActivo(r)} className={botonFila} title={r.activo ? 'Ocultar' : 'Mostrar'} aria-label={`${r.activo ? 'Ocultar' : 'Mostrar'} ${r.titulo}`}>
                              {r.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button onClick={() => setEditando(r)} className={botonFila} title="Editar" aria-label={`Editar ${r.titulo}`}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => setPorEliminar(r)} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-[#003DA5] focus-visible:ring-offset-2" title="Eliminar" aria-label={`Eliminar ${r.titulo}`}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      <AnimatePresence>
        {editando && (
          <FormularioRecurso
            key="formulario"
            recurso={editando === 'nuevo' ? null : editando}
            categoriaInicial={filtro}
            onCerrar={() => setEditando(null)}
            onGuardado={() => {
              setEditando(null);
              cargar();
            }}
          />
        )}
        {porEliminar && (
          <ConfirmarEliminar
            key="eliminar"
            recurso={porEliminar}
            onCancelar={() => setPorEliminar(null)}
            onConfirmar={async () => {
              try {
                await centroAyudaService.eliminar(porEliminar.id);
                toast.success('Recurso eliminado');
                setPorEliminar(null);
                cargar();
              } catch {
                // apiClient ya muestra el mensaje del servidor
              }
            }}
          />
        )}
        {enVisor && <VisorRecurso key="visor" recurso={enVisor} onCerrar={() => setEnVisor(null)} />}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
