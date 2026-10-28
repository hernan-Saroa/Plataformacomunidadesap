/**
 * Administración del Centro de Ayuda (EFDS-2399).
 *
 * Aquí se crean y ordenan las secciones de la pestaña Recursos y se carga su
 * contenido (manuales, videos, documentos, enlaces, textos y atajos) sin
 * intervención de desarrollo. Cada acción es un permiso que se asigna desde
 * Roles y Permisos; los botones se muestran según lo que el usuario puede
 * hacer. Las secciones se listan a la izquierda, en el orden en que las ve el
 * usuario; eliminar envía a la papelera, de donde se puede restaurar.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, MotionConfig, Reorder, motion, useDragControls } from 'motion/react';
import {
  AlignLeft,
  ArchiveRestore,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FolderOpen,
  GripVertical,
  LifeBuoy,
  Link2,
  Loader2,
  Lock,
  Paperclip,
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
  TIPOS_SECCION,
  centroAyudaService,
  type DatosRecurso,
  type DatosSeccion,
  type ElementoEnPapelera,
  type Papelera,
  type PermisosCentroAyuda,
  type RecursoCentroAyuda,
  type SeccionAdministrada,
  type TipoSeccion,
} from '../../services/api/centroAyuda.service';
import { IconoRecurso, tamanoLegible, tipoDeRecurso } from './centro-ayuda/IconoRecurso';
import { ICONOS_SECCION, IconoSeccion } from './centro-ayuda/IconoSeccion';
import { buscarRecursos } from './centro-ayuda/busqueda';
import { VisorRecurso } from './centro-ayuda/VisorRecurso';
import { SIN_TRANSICION_CSS, SOLO_TRANSICION_DE_COLOR } from './centro-ayuda/estilosAnimacion';

// Mismo límite que auth-service (TAMANO_MAXIMO_ARCHIVO).
const TAMANO_MAXIMO_ARCHIVO = 500 * 1024 * 1024;

const EXT_DOCUMENTO = '.pdf,.doc,.docx,.odt,.rtf,.txt,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp';
const EXT_VIDEO = '.mp4,.webm,.ogg,.ogv';

const ACEPTA: Record<TipoSeccion, string> = {
  manual: '.pdf',
  videos: EXT_VIDEO,
  atajos: '',
  general: `${EXT_DOCUMENTO},${EXT_VIDEO}`,
};

const nombreDeTipo = (tipo: TipoSeccion) => TIPOS_SECCION.find((t) => t.id === tipo)?.nombre ?? tipo;
const ayudaDeTipo = (tipo: TipoSeccion) => TIPOS_SECCION.find((t) => t.id === tipo)?.ayuda ?? '';

const SIN_PERMISOS: PermisosCentroAyuda = {
  ver: false,
  crearSecciones: false,
  editarSecciones: false,
  eliminarSecciones: false,
  crearRecursos: false,
  editarRecursos: false,
  eliminarRecursos: false,
};

const datosDe = (r: RecursoCentroAyuda): DatosRecurso => ({
  idSeccion: r.idSeccion,
  titulo: r.titulo,
  descripcion: r.descripcion ?? '',
  modulo: r.modulo ?? '',
  contenido: r.contenido ?? '',
  enlace: r.enlace ?? '',
  version: r.version ?? '',
  orden: r.orden,
  activo: r.activo,
});

const datosDeSeccion = (s: SeccionAdministrada): DatosSeccion => ({
  nombre: s.nombre,
  descripcion: s.descripcion ?? '',
  icono: s.icono,
  tipo: s.tipo,
  activo: s.activo,
});

const fecha = (valor: string) =>
  new Date(valor).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

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

/** Fondo y entrada de las ventanas de esta página. */
function Ventana({ children, onCerrar, ocupado, etiquetaId, rol = 'dialog', ancho }: {
  children: React.ReactNode;
  onCerrar: () => void;
  ocupado: boolean;
  etiquetaId?: string;
  rol?: 'dialog' | 'alertdialog';
  ancho: string;
}) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !ocupado) onCerrar();
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCerrar, ocupado]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role={rol}
      aria-modal="true"
      aria-labelledby={etiquetaId}
      onClick={() => !ocupado && onCerrar()}
      style={SIN_TRANSICION_CSS}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[92vh] w-full ${ancho} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}
        style={SIN_TRANSICION_CSS}
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

function EncabezadoVentana({ id, titulo, subtitulo, onCerrar }: {
  id: string;
  titulo: string;
  subtitulo?: string;
  onCerrar: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
      <div>
        <h2 id={id} className="text-base font-semibold text-slate-900">{titulo}</h2>
        {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
      </div>
      <button type="button" onClick={onCerrar} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900" aria-label="Cerrar">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

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

/** Icono con el que nace una sección según su tipo; se puede cambiar después. */
const ICONO_POR_TIPO: Record<TipoSeccion, string> = {
  general: 'BookOpen',
  videos: 'Video',
  atajos: 'Keyboard',
  manual: 'FileText',
};

function FormularioSeccion({ seccion, onCerrar, onGuardado }: {
  seccion: SeccionAdministrada | null;
  onCerrar: () => void;
  onGuardado: (id: number) => void;
}) {
  const [datos, setDatos] = useState<DatosSeccion>(
    seccion ? datosDeSeccion(seccion) : { nombre: '', descripcion: '', icono: ICONO_POR_TIPO.general, tipo: 'general', activo: true },
  );
  // Mientras no se elija un icono a mano, el icono sigue al tipo.
  const [iconoAMano, setIconoAMano] = useState(Boolean(seccion));
  const [verIconos, setVerIconos] = useState(false);
  const [errorNombre, setErrorNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  // Con recursos cargados el tipo no se cambia: sus reglas dejarían de cumplirse.
  const tipoBloqueado = Boolean(seccion && seccion.totalRecursos > 0);

  const elegirTipo = (tipo: TipoSeccion) =>
    setDatos((d) => ({ ...d, tipo, icono: iconoAMano ? d.icono : ICONO_POR_TIPO[tipo] }));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datos.nombre.trim()) {
      setErrorNombre('Escriba el nombre de la sección');
      document.getElementById('cs-nombre')?.focus();
      return;
    }
    setGuardando(true);
    try {
      const guardada = seccion
        ? await centroAyudaService.actualizarSeccion(seccion.id, datos)
        : await centroAyudaService.crearSeccion(datos);
      toast.success(seccion ? 'Sección actualizada' : 'Sección creada', {
        description: datos.activo ? 'Ya aparece en la pestaña Recursos del Centro de Ayuda.' : 'Está oculta: los usuarios aún no la ven.',
      });
      onGuardado(guardada.id);
    } catch {
      // apiClient ya muestra el mensaje del servidor
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Ventana onCerrar={onCerrar} ocupado={guardando} etiquetaId="cs-titulo" ancho="max-w-xl">
      <form onSubmit={guardar} className="flex min-h-0 flex-1 flex-col">
        <EncabezadoVentana
          id="cs-titulo"
          titulo={seccion ? 'Editar sección' : 'Agregar sección'}
          subtitulo="Será una nueva opción en la pestaña Recursos del botón de ayuda."
          onCerrar={onCerrar}
        />
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div>
            <label className={etiqueta} htmlFor="cs-nombre">Nombre de la sección <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1e5da8]">
                <IconoSeccion nombre={datos.icono} />
              </span>
              <input
                id="cs-nombre"
                className={errorNombre ? campoConError : campo}
                maxLength={100}
                autoFocus
                placeholder="Ej.: Preguntas de nómina"
                value={datos.nombre}
                aria-invalid={errorNombre ? true : undefined}
                aria-describedby={errorNombre ? 'cs-nombre-error' : undefined}
                onChange={(e) => {
                  setDatos((d) => ({ ...d, nombre: e.target.value }));
                  setErrorNombre('');
                }}
              />
            </div>
            {errorNombre && <p id="cs-nombre-error" className="mt-1 text-xs text-red-600">{errorNombre}</p>}
          </div>

          <fieldset>
            <legend className={etiqueta}>¿Qué va a tener?</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
              {TIPOS_SECCION.map((t) => {
                const elegido = datos.tipo === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={elegido}
                    disabled={tipoBloqueado && !elegido}
                    onClick={() => elegirTipo(t.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border-2 px-2 py-3 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      elegido ? 'border-[#1e5da8] bg-blue-50 text-[#1e5da8]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <IconoSeccion nombre={ICONO_POR_TIPO[t.id]} />
                    <span className="text-xs font-medium">{t.nombre}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-600">
              {tipoBloqueado ? (
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <Lock className="h-3.5 w-3.5" />
                  El tipo no se puede cambiar mientras la sección tenga recursos.
                </span>
              ) : (
                ayudaDeTipo(datos.tipo)
              )}
            </p>
          </fieldset>

          <div>
            <label className={etiqueta} htmlFor="cs-descripcion">Descripción <span className="font-normal text-slate-500">(opcional)</span></label>
            <input
              id="cs-descripcion"
              className={campo}
              maxLength={300}
              placeholder="Lo que encuentra el usuario aquí"
              value={datos.descripcion ?? ''}
              onChange={(e) => setDatos((d) => ({ ...d, descripcion: e.target.value }))}
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setVerIconos((v) => !v)}
              aria-expanded={verIconos}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1e5da8] hover:underline"
            >
              {verIconos ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Cambiar el icono
            </button>
            <AnimatePresence initial={false}>
              {verIconos && (
                <motion.div
                  key="iconos"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                  style={SIN_TRANSICION_CSS}
                >
                  <div className="flex flex-wrap gap-2 pt-3">
                    {Object.entries(ICONOS_SECCION).map(([clave, { Icono, nombre }]) => {
                      const elegido = datos.icono === clave;
                      return (
                        <button
                          key={clave}
                          type="button"
                          title={nombre}
                          aria-label={nombre}
                          aria-pressed={elegido}
                          onClick={() => {
                            setIconoAMano(true);
                            setDatos((d) => ({ ...d, icono: clave }));
                          }}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 transition-colors ${
                            elegido ? 'border-[#1e5da8] bg-blue-50 text-[#1e5da8]' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <Icono className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={datos.activo ?? true}
              onChange={(e) => setDatos((d) => ({ ...d, activo: e.target.checked }))}
            />
            Visible para los usuarios
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button type="button" onClick={onCerrar} disabled={guardando} className={botonSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className={botonPrimario}>
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            {guardando ? 'Guardando...' : seccion ? 'Guardar cambios' : 'Agregar sección'}
          </button>
        </div>
      </form>
    </Ventana>
  );
}

interface FormularioProps {
  recurso: RecursoCentroAyuda | null;
  secciones: SeccionAdministrada[];
  seccionInicial: number;
  onCerrar: () => void;
  onGuardado: () => void;
}

type Formato = 'archivo' | 'enlace' | 'texto';

const FORMATOS: Record<Formato, { nombre: string; Icono: typeof Paperclip }> = {
  archivo: { nombre: 'Archivo', Icono: Paperclip },
  enlace: { nombre: 'Enlace', Icono: Link2 },
  texto: { nombre: 'Texto', Icono: AlignLeft },
};

/** Qué formatos admite cada tipo de sección; los atajos solo llevan la combinación de teclas. */
const FORMATOS_POR_TIPO: Record<TipoSeccion, Formato[]> = {
  general: ['archivo', 'enlace', 'texto'],
  videos: ['archivo', 'enlace'],
  manual: ['archivo'],
  atajos: [],
};

const formatoDe = (recurso: RecursoCentroAyuda | null, tipo: TipoSeccion): Formato => {
  const permitidos = FORMATOS_POR_TIPO[tipo];
  const actual: Formato | null = recurso?.archivo ? 'archivo' : recurso?.enlace ? 'enlace' : recurso?.contenido ? 'texto' : null;
  return actual && permitidos.includes(actual) ? actual : permitidos[0] ?? 'texto';
};

function FormularioRecurso({ recurso, secciones, seccionInicial, onCerrar, onGuardado }: FormularioProps) {
  const [datos, setDatos] = useState<DatosRecurso>(
    recurso ? datosDe(recurso) : { idSeccion: seccionInicial, titulo: '', orden: 0, activo: true },
  );
  const seccion = secciones.find((s) => s.id === datos.idSeccion);
  const tipo: TipoSeccion = seccion?.tipo ?? 'general';

  const [formato, setFormato] = useState<Formato>(() => formatoDe(recurso, tipo));
  const [archivo, setArchivo] = useState<File | null>(null);
  const [quitarArchivo, setQuitarArchivo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Errores>({});

  const formatos = FORMATOS_POR_TIPO[tipo];
  // Si se mueve a una sección que no admite el formato elegido, pasa al primero que sí.
  const formatoVigente: Formato = formatos.includes(formato) ? formato : formatos[0] ?? 'texto';

  const limpiarError = (...campos: CampoValidado[]) =>
    setErrores((previos) => {
      if (!campos.some((c) => previos[c])) return previos;
      const siguientes = { ...previos };
      campos.forEach((c) => delete siguientes[c]);
      return siguientes;
    });

  const cambiar = (cambios: Partial<DatosRecurso>) => {
    setDatos((d) => ({ ...d, ...cambios }));
    if ('idSeccion' in cambios) setErrores({});
    if ('titulo' in cambios) limpiarError('titulo');
    if ('version' in cambios) limpiarError('version');
    if ('contenido' in cambios) limpiarError('contenido');
    if ('enlace' in cambios) limpiarError('enlace');
  };
  const elegirArchivo = (nuevo: File | null) => {
    setArchivo(nuevo);
    limpiarError('archivo');
  };

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
    const conArchivo = Boolean(archivo) || (Boolean(recurso?.archivo) && !quitarArchivo);
    const extension = archivo ? extensionDe(archivo.name) : recurso?.archivo ? extensionDe(recurso.archivo.nombre) : '';

    if (!datos.titulo.trim()) encontrados.titulo = 'Escriba un título';
    if (tipo === 'manual' && !datos.version?.trim()) encontrados.version = 'Indique la versión del sistema';
    if (tipo === 'atajos') {
      if (!datos.contenido?.trim()) encontrados.contenido = 'Escriba la combinación de teclas';
      return encontrados;
    }
    switch (formatoVigente) {
      case 'archivo':
        if (!conArchivo) encontrados.archivo = tipo === 'manual' ? 'Cargue el PDF del manual' : 'Elija el archivo';
        else if (tipo === 'manual' && extension !== 'pdf') encontrados.archivo = 'El manual debe ser un PDF';
        else if (tipo === 'videos' && !['mp4', 'webm', 'ogg', 'ogv'].includes(extension)) {
          encontrados.archivo = 'El video debe ser MP4, WebM u OGG';
        }
        break;
      case 'enlace':
        if (!enlace) encontrados.enlace = 'Escriba el enlace';
        else if (!/^https?:\/\/\S+$/i.test(enlace)) encontrados.enlace = 'El enlace debe empezar por http:// o https://';
        break;
      default:
        if (!datos.contenido?.trim()) encontrados.contenido = 'Escriba el texto';
    }
    return encontrados;
  };

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
      // Solo se guarda el contenido del formato elegido; lo demás queda vacío.
      const usaArchivo = tipo !== 'atajos' && formatoVigente === 'archivo';
      const envio: DatosRecurso = {
        ...datos,
        enlace: tipo !== 'atajos' && formatoVigente === 'enlace' ? datos.enlace : '',
        contenido: tipo === 'atajos' || formatoVigente === 'texto' ? datos.contenido : '',
        modulo: tipo === 'atajos' ? '' : datos.modulo,
        version: tipo === 'manual' ? datos.version : '',
        archivo: usaArchivo ? archivo : null,
        quitarArchivo: !archivo && Boolean(recurso?.archivo) && (quitarArchivo || !usaArchivo),
      };
      if (recurso) {
        await centroAyudaService.actualizarRecurso(recurso.id, envio);
        toast.success('Recurso actualizado');
      } else {
        await centroAyudaService.crearRecurso(envio);
        toast.success('Recurso publicado', { description: `Ya aparece en «${seccion?.nombre ?? ''}» del Centro de Ayuda.` });
      }
      onGuardado();
    } catch {
      // apiClient ya muestra el mensaje del servidor
    } finally {
      setGuardando(false);
    }
  };

  const aparece = { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: 'auto' }, exit: { opacity: 0, height: 0 } };

  return (
    <Ventana onCerrar={onCerrar} ocupado={guardando} etiquetaId="ca-form-titulo" ancho="max-w-4xl">
      <form onSubmit={guardar} className="flex min-h-0 flex-1 flex-col">
        <EncabezadoVentana
          id="ca-form-titulo"
          titulo={recurso ? 'Editar recurso' : 'Nuevo recurso'}
          subtitulo={ayudaDeTipo(tipo)}
          onCerrar={onCerrar}
        />

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-5 md:grid-cols-2">
            <section className="space-y-4 p-5" aria-labelledby="ca-seccion-datos">
              <h3 id="ca-seccion-datos" className={tituloSeccion}>Datos del recurso</h3>
              <div>
                <label className={etiqueta} htmlFor="ca-seccion">Sección del Centro de Ayuda</label>
                <select
                  id="ca-seccion"
                  className={campo}
                  value={datos.idSeccion}
                  onChange={(e) => cambiar({ idSeccion: Number(e.target.value) })}
                >
                  {secciones.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} · {nombreDeTipo(s.tipo)}{s.activo ? '' : ' (oculta)'}
                    </option>
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
                {tipo !== 'atajos' && (
                  <motion.div key="modulo" {...aparece} className="overflow-hidden" style={SIN_TRANSICION_CSS}>
                    <label className={etiqueta} htmlFor="ca-modulo">Módulo del sistema <span className="font-normal text-slate-500">(opcional)</span></label>
                    <input id="ca-modulo" className={campo} maxLength={100} placeholder="Ej.: Contratación" value={datos.modulo ?? ''} onChange={(e) => cambiar({ modulo: e.target.value })} />
                    <p className="mt-1 text-[11px] text-slate-500">En el panel de ayuda los recursos se agrupan por este módulo.</p>
                  </motion.div>
                )}

                {tipo === 'manual' && (
                  <motion.div key="version" {...aparece} className="overflow-hidden" style={SIN_TRANSICION_CSS}>
                    <label className={etiqueta} htmlFor="ca-version">Versión del sistema <span className="text-red-500">*</span></label>
                    <input {...propsDeCampo('version')} maxLength={30} placeholder="Ej.: 2.1" value={datos.version ?? ''} onChange={(e) => cambiar({ version: e.target.value })} />
                    <ErrorDeCampo campo="version" errores={errores} />
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <section className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-5" aria-labelledby="ca-seccion-contenido">
              <h3 id="ca-seccion-contenido" className={tituloSeccion}>Contenido y publicación</h3>

              {formatos.length > 1 && (
                <fieldset>
                  <legend className={etiqueta}>¿Qué es este recurso?</legend>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup">
                    {formatos.map((f) => {
                      const { nombre, Icono } = FORMATOS[f];
                      const elegido = formatoVigente === f;
                      return (
                        <button
                          key={f}
                          type="button"
                          role="radio"
                          aria-checked={elegido}
                          onClick={() => {
                            setFormato(f);
                            setErrores((previos) => ({ titulo: previos.titulo, version: previos.version }));
                          }}
                          className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2.5 text-xs font-medium transition-colors ${
                            elegido ? 'border-[#1e5da8] bg-white text-[#1e5da8]' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <Icono className="h-4 w-4" />
                          {nombre}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <AnimatePresence initial={false} mode="wait">
                {tipo === 'atajos' ? (
                  <motion.div key="teclas" {...aparece} className="overflow-hidden" style={SIN_TRANSICION_CSS}>
                    <label className={etiqueta} htmlFor="ca-contenido">Combinación de teclas <span className="text-red-500">*</span></label>
                    <input
                      {...propsDeCampo('contenido')}
                      className={`${errores.contenido ? campoConError : campo} font-mono`}
                      placeholder="Ctrl + B"
                      value={datos.contenido ?? ''}
                      onChange={(e) => cambiar({ contenido: e.target.value })}
                    />
                    <ErrorDeCampo campo="contenido" errores={errores} />
                  </motion.div>
                ) : formatoVigente === 'archivo' ? (
                  <motion.div key="archivo" {...aparece} className="overflow-hidden" style={SIN_TRANSICION_CSS}>
                    <label className={etiqueta}>
                      {tipo === 'manual' ? 'Archivo PDF' : 'Archivo'} <span className="text-red-500">*</span>
                    </label>
                    <ZonaArchivo
                      acepta={ACEPTA[tipo]}
                      archivo={archivo}
                      actual={recurso?.archivo ?? null}
                      quitarActual={quitarArchivo}
                      onArchivo={elegirArchivo}
                      onQuitarActual={setQuitarArchivo}
                      puedeQuitar={false}
                      conError={Boolean(errores.archivo)}
                    />
                    <ErrorDeCampo campo="archivo" errores={errores} />
                  </motion.div>
                ) : formatoVigente === 'enlace' ? (
                  <motion.div key="enlace" {...aparece} className="overflow-hidden" style={SIN_TRANSICION_CSS}>
                    <label className={etiqueta} htmlFor="ca-enlace">Enlace <span className="text-red-500">*</span></label>
                    <input {...propsDeCampo('enlace')} type="url" placeholder="https://" value={datos.enlace ?? ''} onChange={(e) => cambiar({ enlace: e.target.value })} />
                    <ErrorDeCampo campo="enlace" errores={errores} />
                    <p className="mt-1 text-[11px] text-slate-500">El usuario lo abre en una pestaña nueva.</p>
                  </motion.div>
                ) : (
                  <motion.div key="texto" {...aparece} className="overflow-hidden" style={SIN_TRANSICION_CSS}>
                    <label className={etiqueta} htmlFor="ca-contenido">Texto <span className="text-red-500">*</span></label>
                    <textarea {...propsDeCampo('contenido')} rows={7} value={datos.contenido ?? ''} onChange={(e) => cambiar({ contenido: e.target.value })} />
                    <ErrorDeCampo campo="contenido" errores={errores} />
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
      </form>
    </Ventana>
  );
}

function ConfirmarEliminar({ titulo, mensaje, onCancelar, onConfirmar }: {
  titulo: string;
  mensaje: string;
  onCancelar: () => void;
  onConfirmar: () => Promise<void>;
}) {
  const [eliminando, setEliminando] = useState(false);
  return (
    <Ventana onCerrar={onCancelar} ocupado={eliminando} rol="alertdialog" etiquetaId="ca-eliminar-titulo" ancho="max-w-sm">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50">
            <Trash2 className="h-5 w-5 text-red-600" />
          </span>
          <div>
            <h2 id="ca-eliminar-titulo" className="text-base font-semibold text-slate-900">{titulo}</h2>
            <p className="mt-1 text-sm text-slate-700">{mensaje}</p>
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
            Enviar a la papelera
          </button>
        </div>
      </div>
    </Ventana>
  );
}

function FilaPapelera({ elemento, detalle, bloqueo, puedeRestaurar, onRestaurar }: {
  elemento: ElementoEnPapelera;
  detalle: string;
  bloqueo?: string;
  puedeRestaurar: boolean;
  onRestaurar: () => Promise<void>;
}) {
  const [restaurando, setRestaurando] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{elemento.titulo}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {detalle}Eliminado el {fecha(elemento.eliminadoEn)}{elemento.eliminadoPor ? ` por ${elemento.eliminadoPor}` : ''}
        </p>
        {bloqueo && <p className="mt-1 text-xs text-amber-700">{bloqueo}</p>}
      </div>
      {puedeRestaurar && (
        <button
          disabled={restaurando || Boolean(bloqueo)}
          onClick={async () => {
            setRestaurando(true);
            try {
              await onRestaurar();
            } finally {
              setRestaurando(false);
            }
          }}
          className={botonSecundario}
        >
          {restaurando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
          Restaurar
        </button>
      )}
    </div>
  );
}

/** La papelera se ve en el panel derecho, como una sección más. */
function PanelPapelera({ papelera, permisos, onRestaurado }: {
  papelera: Papelera;
  permisos: PermisosCentroAyuda;
  onRestaurado: () => void;
}) {
  const restaurar = async (accion: () => Promise<void>, mensaje: string) => {
    try {
      await accion();
      toast.success(mensaje, { description: 'Quedó oculto: revíselo y márquelo como visible cuando esté listo.' });
      onRestaurado();
    } catch {
      // apiClient ya muestra el mensaje del servidor
    }
  };

  const vacia = papelera.secciones.length === 0 && papelera.recursos.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Trash2 className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Papelera</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Lo que se elimina no se borra: queda aquí y se puede restaurar. Vuelve oculto para revisarlo antes de publicarlo.
          </p>
        </div>
      </div>

      {vacia ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 border border-slate-200">
            <Trash2 className="h-6 w-6 text-slate-400" />
          </span>
          <p className="text-sm font-medium text-slate-800">La papelera está vacía</p>
        </div>
      ) : (
        <>
          {papelera.secciones.length > 0 && (
            <div className="space-y-2">
              <p className={tituloSeccion}>Secciones</p>
              {papelera.secciones.map((s) => (
                <FilaPapelera
                  key={`s${s.id}`}
                  elemento={s}
                  detalle=""
                  puedeRestaurar={permisos.eliminarSecciones}
                  onRestaurar={() => restaurar(() => centroAyudaService.restaurarSeccion(s.id), 'Sección restaurada')}
                />
              ))}
            </div>
          )}
          {papelera.recursos.length > 0 && (
            <div className="space-y-2">
              <p className={tituloSeccion}>Recursos</p>
              {papelera.recursos.map((r) => (
                <FilaPapelera
                  key={`r${r.id}`}
                  elemento={r}
                  detalle={r.seccion ? `En «${r.seccion}» · ` : ''}
                  bloqueo={r.seccionEnPapelera ? `Restaure primero la sección «${r.seccion}».` : undefined}
                  puedeRestaurar={permisos.eliminarRecursos}
                  onRestaurar={() => restaurar(() => centroAyudaService.restaurarRecurso(r.id), 'Recurso restaurado')}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const botonFila =
  'rounded-lg p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-[#1e5da8] focus-visible:ring-2 focus-visible:ring-[#003DA5] focus-visible:ring-offset-2 disabled:opacity-60';
const botonFilaPeligro =
  'rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-[#003DA5] focus-visible:ring-offset-2 disabled:opacity-60';
/** Acciones de la sección: con texto, para que se entienda qué hace cada una. */
const botonAccion =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#1e5da8] hover:text-[#1e5da8] disabled:cursor-not-allowed disabled:opacity-60';
const botonAccionPeligro =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60';

/** Una sección de la lista; se arrastra desde el asa para cambiar su orden. */
function ItemSeccion({ seccion, activa, puedeOrdenar, onElegir, onSoltar }: {
  seccion: SeccionAdministrada;
  activa: boolean;
  puedeOrdenar: boolean;
  onElegir: () => void;
  onSoltar: () => void;
}) {
  const controles = useDragControls();
  return (
    <Reorder.Item
      as="li"
      value={seccion}
      dragListener={false}
      dragControls={controles}
      onDragEnd={onSoltar}
      whileDrag={{ scale: 1.02, boxShadow: '0 10px 24px rgba(15, 23, 42, 0.14)', zIndex: 10 }}
      className={`relative flex items-center rounded-lg ${activa ? 'bg-blue-50' : 'bg-white'}`}
      style={{ ...SIN_TRANSICION_CSS, position: 'relative' }}
    >
      {puedeOrdenar && (
        <span
          onPointerDown={(e) => controles.start(e)}
          title="Arrastre para cambiar el orden"
          aria-hidden
          className="flex h-10 w-5 flex-shrink-0 items-center justify-center text-slate-400 hover:text-slate-900"
          style={{ cursor: 'grab', touchAction: 'none' }}
        >
          <GripVertical className="h-4 w-4" />
        </span>
      )}
      <button
        onClick={onElegir}
        aria-current={activa ? 'true' : undefined}
        className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 pr-3 text-left transition-colors ${puedeOrdenar ? 'pl-1' : 'pl-3'} ${
          activa ? 'text-[#1e5da8]' : 'text-slate-700 hover:bg-slate-50'
        }`}
      >
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
            activa ? 'bg-white text-[#1e5da8] shadow-sm' : seccion.activo ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-400'
          }`}
        >
          <IconoSeccion nombre={seccion.icono} className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-medium ${seccion.activo || activa ? '' : 'text-slate-400'}`}>{seccion.nombre}</span>
          {!seccion.activo && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <EyeOff className="h-3 w-3" />
              Oculta
            </span>
          )}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${activa ? 'bg-white text-[#1e5da8]' : 'bg-slate-100 text-slate-600'}`}>
          {seccion.totalRecursos}
        </span>
      </button>
    </Reorder.Item>
  );
}

type PorEliminar =
  | { tipo: 'recurso'; recurso: RecursoCentroAyuda }
  | { tipo: 'seccion'; seccion: SeccionAdministrada };

/** Lo que muestra el panel derecho: una sección o la papelera. */
type Vista = { tipo: 'seccion'; id: number } | { tipo: 'papelera' };

export default function CentroAyudaAdminPage() {
  const [permisos, setPermisos] = useState<PermisosCentroAyuda | null>(null);
  const [secciones, setSecciones] = useState<SeccionAdministrada[] | null>(null);
  const [recursos, setRecursos] = useState<RecursoCentroAyuda[] | null>(null);
  const [papelera, setPapelera] = useState<Papelera>({ secciones: [], recursos: [] });
  const [vista, setVista] = useState<Vista | null>(null);
  const [editando, setEditando] = useState<RecursoCentroAyuda | 'nuevo' | null>(null);
  const [editandoSeccion, setEditandoSeccion] = useState<SeccionAdministrada | 'nueva' | null>(null);
  const [porEliminar, setPorEliminar] = useState<PorEliminar | null>(null);
  const [enVisor, setEnVisor] = useState<RecursoCentroAyuda | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [consulta, setConsulta] = useState('');
  // Orden que tiene el servidor, para guardar solo si el arrastre lo cambió.
  const ordenGuardado = useRef<number[]>([]);
  const seccionesEnPantalla = useRef<SeccionAdministrada[]>([]);
  seccionesEnPantalla.current = secciones ?? [];

  const cargar = useCallback(async () => {
    setErrorCarga(false);
    try {
      const [listaSecciones, listaRecursos, enPapelera] = await Promise.all([
        centroAyudaService.listarSecciones(),
        centroAyudaService.listarRecursos(),
        centroAyudaService.papelera(),
      ]);
      setSecciones(listaSecciones);
      ordenGuardado.current = listaSecciones.map((s) => s.id);
      setRecursos(listaRecursos);
      setPapelera(enPapelera);
      // si la sección elegida ya no existe, se pasa a la primera
      setVista((actual) => {
        if (actual?.tipo === 'papelera') return actual;
        if (actual && listaSecciones.some((s) => s.id === actual.id)) return actual;
        return listaSecciones[0] ? { tipo: 'seccion', id: listaSecciones[0].id } : null;
      });
    } catch {
      setErrorCarga(true);
    }
  }, []);

  useEffect(() => {
    centroAyudaService.misPermisos().then(setPermisos).catch(() => setPermisos(SIN_PERMISOS));
    cargar();
  }, [cargar]);

  const p = permisos ?? SIN_PERMISOS;
  const filtro = vista?.tipo === 'seccion' ? vista.id : null;
  const seccionActual = secciones?.find((s) => s.id === filtro) ?? null;
  const seccionPorId = useMemo(() => new Map((secciones || []).map((s) => [s.id, s])), [secciones]);
  const nombreDeSeccion = (id: number) => seccionPorId.get(id)?.nombre ?? '';
  const enPapelera = papelera.secciones.length + papelera.recursos.length;

  // Mientras se busca, la lista muestra coincidencias de todas las secciones.
  const buscando = consulta.trim().length > 0;
  const visibles = buscando
    ? buscarRecursos(recursos || [], consulta, nombreDeSeccion)
    : (recursos || []).filter((r) => r.idSeccion === filtro);

  const verSeccion = (id: number) => {
    setVista({ tipo: 'seccion', id });
    setConsulta('');
  };

  const alternarActivo = async (recurso: RecursoCentroAyuda) => {
    try {
      await centroAyudaService.cambiarVisibilidadRecurso(recurso.id, !recurso.activo);
      toast.success(recurso.activo ? 'El recurso quedó oculto' : 'El recurso ya es visible');
      cargar();
    } catch {
      // apiClient ya muestra el mensaje del servidor
    }
  };

  const alternarSeccion = async (seccion: SeccionAdministrada) => {
    try {
      await centroAyudaService.cambiarVisibilidadSeccion(seccion.id, !seccion.activo);
      toast.success(seccion.activo ? 'La sección quedó oculta' : 'La sección ya es visible', {
        description: seccion.activo ? 'Los usuarios dejan de verla, con todos sus recursos.' : undefined,
      });
      cargar();
    } catch {
      // apiClient ya muestra el mensaje del servidor
    }
  };

  const guardarOrden = async (ids: number[]) => {
    if (ids.join() === ordenGuardado.current.join()) return;
    try {
      const ordenadas = await centroAyudaService.ordenarSecciones(ids);
      ordenGuardado.current = ordenadas.map((s) => s.id);
      setSecciones(ordenadas);
      toast.success('Orden guardado', { description: 'Así aparecen ahora en el botón de ayuda.' });
    } catch {
      cargar();
    }
  };

  const moverSeccion = (seccion: SeccionAdministrada, paso: -1 | 1) => {
    if (!secciones) return;
    const ids = secciones.map((s) => s.id);
    const desde = ids.indexOf(seccion.id);
    const hasta = desde + paso;
    if (hasta < 0 || hasta >= ids.length) return;
    [ids[desde], ids[hasta]] = [ids[hasta], ids[desde]];
    // se reordena de una vez para que la lista no salte mientras responde el servidor
    setSecciones(ids.map((id) => seccionPorId.get(id)!));
    guardarOrden(ids);
  };

  const indiceActual = seccionActual && secciones ? secciones.findIndex((s) => s.id === seccionActual.id) : -1;

  if (permisos && !permisos.ver) {
    return (
      <div className="flex h-full items-center justify-center p-8" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Lock className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-900">No tiene permiso para administrar el Centro de Ayuda</p>
          <p className="mt-1 text-xs text-slate-500">Pida el permiso «Ver la administración del Centro de Ayuda» en Roles y Permisos.</p>
        </div>
      </div>
    );
  }

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
                Secciones y recursos que ven los usuarios en el botón de ayuda.
              </p>
            </div>
          </div>
          {p.crearRecursos && (
            <button onClick={() => setEditando('nuevo')} className={botonPrimario} disabled={!secciones || secciones.length === 0}>
              <Plus className="h-4 w-4" />
              Nuevo recurso
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          {secciones === null || recursos === null ? (
            errorCarga ? (
              <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-700">
                No se pudo cargar el Centro de Ayuda.{' '}
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
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Secciones: el mismo orden en que las ve el usuario */}
            <aside className="w-full flex-shrink-0 lg:w-72">
              <nav className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Secciones del Centro de Ayuda">
                <div className="flex items-baseline justify-between gap-2 px-3 pb-2 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Secciones · {secciones.length}</p>
                  {p.editarSecciones && secciones.length > 1 && (
                    <p className="text-[10px] text-slate-400">Arrastre para ordenar</p>
                  )}
                </div>
                <Reorder.Group as="ul" axis="y" values={secciones} onReorder={setSecciones} className="space-y-0.5">
                  {secciones.map((s) => (
                    <ItemSeccion
                      key={s.id}
                      seccion={s}
                      activa={filtro === s.id && !buscando}
                      puedeOrdenar={p.editarSecciones}
                      onElegir={() => verSeccion(s.id)}
                      onSoltar={() => guardarOrden(seccionesEnPantalla.current.map((x) => x.id))}
                    />
                  ))}
                </Reorder.Group>

                {p.crearSecciones && (
                  <button
                    onClick={() => setEditandoSeccion('nueva')}
                    className="mt-1 flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-[#1e5da8] hover:text-[#1e5da8]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center">
                      <Plus className="h-4 w-4" />
                    </span>
                    Agregar sección
                  </button>
                )}

                <div className="mt-2 border-t border-slate-100 pt-2">
                  <button
                    onClick={() => {
                      setVista({ tipo: 'papelera' });
                      setConsulta('');
                    }}
                    aria-current={vista?.tipo === 'papelera' ? 'true' : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                      vista?.tipo === 'papelera' ? 'bg-blue-50 text-[#1e5da8]' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center">
                      <Trash2 className="h-4 w-4" />
                    </span>
                    <span className="flex-1">Papelera</span>
                    {enPapelera > 0 && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">{enPapelera}</span>
                    )}
                  </button>
                </div>
              </nav>
            </aside>

            <section className="min-w-0 flex-1">
              {vista?.tipo === 'papelera' ? (
                <PanelPapelera papelera={papelera} permisos={p} onRestaurado={cargar} />
              ) : secciones.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 border border-slate-200">
                    <FolderOpen className="h-6 w-6 text-slate-400" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">No hay secciones</p>
                    <p className="mt-1 text-xs text-slate-500">Los usuarios ven «Contenido no disponible por el momento».</p>
                  </div>
                  {p.crearSecciones && (
                    <button onClick={() => setEditandoSeccion('nueva')} className={botonPrimario}>
                      <Plus className="h-4 w-4" />
                      Agregar la primera sección
                    </button>
                  )}
                </div>
              ) : (
              <>
              {seccionActual && !buscando && (
                <motion.div
                  key={`detalle-${seccionActual.id}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  style={SIN_TRANSICION_CSS}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${seccionActual.activo ? 'bg-blue-50 text-[#1e5da8]' : 'bg-slate-100 text-slate-400'}`}>
                      <IconoSeccion nombre={seccionActual.icono} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-900">{seccionActual.nombre}</h2>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {nombreDeTipo(seccionActual.tipo)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            seccionActual.activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {seccionActual.activo ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {seccionActual.activo ? 'Visible' : 'Oculta'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {seccionActual.descripcion || ayudaDeTipo(seccionActual.tipo)}
                      </p>
                    </div>
                  </div>

                  {(p.editarSecciones || p.eliminarSecciones) && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                      {p.editarSecciones && (
                        <>
                          <button onClick={() => setEditandoSeccion(seccionActual)} className={botonAccion}>
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button onClick={() => alternarSeccion(seccionActual)} className={botonAccion}>
                            {seccionActual.activo ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            {seccionActual.activo ? 'Ocultar' : 'Mostrar'}
                          </button>
                          <button onClick={() => moverSeccion(seccionActual, -1)} disabled={indiceActual <= 0} className={botonAccion}>
                            <ChevronUp className="h-3.5 w-3.5" />
                            Subir
                          </button>
                          <button onClick={() => moverSeccion(seccionActual, 1)} disabled={indiceActual >= secciones.length - 1} className={botonAccion}>
                            <ChevronDown className="h-3.5 w-3.5" />
                            Bajar
                          </button>
                        </>
                      )}
                      {p.eliminarSecciones && (
                        <button
                          onClick={() => setPorEliminar({ tipo: 'seccion', seccion: seccionActual })}
                          disabled={seccionActual.totalRecursos > 0}
                          className={botonAccionPeligro}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      )}
                      {p.eliminarSecciones && seccionActual.totalRecursos > 0 && (
                        <span className="text-[11px] text-slate-500">
                          Para eliminarla, primero mueva o elimine {seccionActual.totalRecursos === 1 ? 'su recurso' : `sus ${seccionActual.totalRecursos} recursos`}.
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              <div className="mb-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-600">
                  {buscando
                    ? `${visibles.length} ${visibles.length === 1 ? 'resultado' : 'resultados'} en todas las secciones`
                    : seccionActual
                      ? `${seccionActual.totalRecursos} ${seccionActual.totalRecursos === 1 ? 'recurso' : 'recursos'}, ${seccionActual.recursosVisibles} ${seccionActual.recursosVisibles === 1 ? 'visible' : 'visibles'}`
                      : ''}
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      inputMode="search"
                      placeholder="Buscar en todas las secciones..."
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
                  {p.crearRecursos && seccionActual && !buscando && (
                    <button onClick={() => setEditando('nuevo')} className={`${botonSecundario} flex-shrink-0`}>
                      <Plus className="h-4 w-4" />
                      Agregar recurso
                    </button>
                  )}
                </div>
              </div>

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
                      <p className="text-sm font-medium text-slate-800">Aún no hay contenido en «{seccionActual?.nombre}»</p>
                      <p className="mt-1 text-xs text-slate-500">Los usuarios ven «Contenido no disponible por el momento».</p>
                    </div>
                    {p.crearRecursos && (
                      <button onClick={() => setEditando('nuevo')} className={botonPrimario}>
                        <Plus className="h-4 w-4" />
                        Cargar el primero
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="lista" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-2" style={SIN_TRANSICION_CSS}>
                    <AnimatePresence initial={false}>
                      {visibles.map((r, i) => {
                        const seccion = seccionPorId.get(r.idSeccion);
                        const esAtajo = seccion?.tipo === 'atajos';
                        const tipo = tipoDeRecurso(r, seccion);
                        const resumen = [
                          esAtajo ? r.contenido : tipo.etiqueta,
                          r.archivo ? `${r.archivo.nombre} (${tamanoLegible(r.archivo.tamano)})` : null,
                          r.enlace,
                          // el comienzo del texto dice más que un «con texto»
                          !esAtajo && r.contenido ? r.contenido.replace(/\s+/g, ' ') : null,
                        ].filter(Boolean).join(' · ');
                        // un recurso visible dentro de una sección oculta tampoco lo ven los usuarios
                        const publicado = r.activo && Boolean(seccion?.activo);
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
                            <IconoRecurso recurso={r} seccion={seccion} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-slate-900">{r.titulo}</p>
                                {buscando && (
                                  <button
                                    onClick={() => verSeccion(r.idSeccion)}
                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-blue-50 hover:text-[#1e5da8]"
                                    title="Ir a la sección"
                                  >
                                    {seccion?.nombre}
                                  </button>
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
                              {publicado && r.archivo && (r.archivo.esVideo || r.archivo.previsualizable) && (
                                <button onClick={() => setEnVisor(r)} className={botonFila} title="Ver" aria-label={`Ver ${r.titulo}`}>
                                  <Eye className="h-4 w-4" />
                                </button>
                              )}
                              {p.editarRecursos && (
                                <>
                                  <button onClick={() => alternarActivo(r)} className={botonFila} title={r.activo ? 'Ocultar' : 'Mostrar'} aria-label={`${r.activo ? 'Ocultar' : 'Mostrar'} ${r.titulo}`}>
                                    {r.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </button>
                                  <button onClick={() => setEditando(r)} className={botonFila} title="Editar" aria-label={`Editar ${r.titulo}`}>
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {p.eliminarRecursos && (
                                <button onClick={() => setPorEliminar({ tipo: 'recurso', recurso: r })} className={botonFilaPeligro} title="Eliminar" aria-label={`Eliminar ${r.titulo}`}>
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
              </>
              )}
            </section>
          </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {editando && secciones && (
          <FormularioRecurso
            key="formulario"
            recurso={editando === 'nuevo' ? null : editando}
            secciones={secciones}
            seccionInicial={filtro ?? secciones[0]?.id ?? 0}
            onCerrar={() => setEditando(null)}
            onGuardado={() => {
              setEditando(null);
              cargar();
            }}
          />
        )}
        {editandoSeccion && (
          <FormularioSeccion
            key="formulario-seccion"
            seccion={editandoSeccion === 'nueva' ? null : editandoSeccion}
            onCerrar={() => setEditandoSeccion(null)}
            onGuardado={(id) => {
              setEditandoSeccion(null);
              verSeccion(id);
              cargar();
            }}
          />
        )}
        {porEliminar && (
          <ConfirmarEliminar
            key="eliminar"
            titulo={porEliminar.tipo === 'recurso' ? '¿Eliminar este recurso?' : '¿Eliminar esta sección?'}
            mensaje={
              porEliminar.tipo === 'recurso'
                ? `«${porEliminar.recurso.titulo}» deja de verse en el Centro de Ayuda y pasa a la papelera, de donde se puede restaurar. Si solo quiere esconderlo un tiempo, ocúltelo.`
                : `La sección «${porEliminar.seccion.nombre}» deja de verse en el Centro de Ayuda y pasa a la papelera, de donde se puede restaurar.`
            }
            onCancelar={() => setPorEliminar(null)}
            onConfirmar={async () => {
              try {
                if (porEliminar.tipo === 'recurso') {
                  await centroAyudaService.eliminarRecurso(porEliminar.recurso.id);
                  toast.success('Recurso enviado a la papelera');
                } else {
                  await centroAyudaService.eliminarSeccion(porEliminar.seccion.id);
                  toast.success('Sección enviada a la papelera');
                }
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
