import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Pencil, Plus, Trash2, UploadCloud } from 'lucide-react';
import type { RundSupportGroup } from './RundSupportList';
import { esSoporteDeTitulo, filasSoportes, type RundFilaSoporte } from '../../../utils/rundSoportesTabla';
import { MAX_LONGITUD_TITULO } from '../../../utils/titulosFormacion';
import { RUND_MAX_ARCHIVO_BYTES, RUND_MAX_ARCHIVO_MB } from '../../../utils/rundEvidenceRules';
import './RundSoportesCodificacion.css';

type Props = {
  grupos: RundSupportGroup[];
  disabled?: boolean;
  /** `titulo` solo viaja cuando el usuario lo escribe en el formulario de un diploma de nivel. */
  onUpload: (file: File, grupo: RundSupportGroup, evidencia?: any, titulo?: string) => void | Promise<unknown>;
  onView: (evidencia: any, grupo: RundSupportGroup, numero: number) => void;
  onDelete?: (evidencia: any, grupo: RundSupportGroup) => void;
  /** Cambia el nombre de un título de la lista (diplomas de nivel). Devuelve false si no se pudo guardar. */
  onEditTitle?: (grupo: RundSupportGroup, tituloAnterior: string, tituloNuevo: string) => Promise<boolean> | boolean;
  /** Elimina un título de la lista junto con su archivo, si lo tiene. */
  onDeleteTitle?: (grupo: RundSupportGroup, titulo: string, evidencia?: any) => void;
  /** La tabla va dentro de la sección «Documentos de <carpeta>»: sin encabezado ni marco propios. */
  incrustada?: boolean;
  /** Acciones adicionales por archivo (descargar, versiones…), a la izquierda de reemplazar y eliminar. */
  accionesExtra?: (evidencia: any, grupo: RundSupportGroup) => ReactNode;
};

/** Abre el selector de PDF sin dejar controles de archivo en la página. */
function seleccionarPdf(alSeleccionar: (file: File) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/pdf,.pdf';
  input.onchange = () => { const file = input.files?.[0]; if (file) alSeleccionar(file); };
  input.click();
}

/**
 * Comportamiento común de los formularios modales: Esc los cierra (salvo mientras hay una acción en curso) y,
 * al cerrarse, el foco vuelve al botón que los abrió.
 */
function useCierreModal(onCancel: () => void, bloqueado?: boolean) {
  // El botón de origen se toma durante el primer render: después el campo con autoFocus ya habría robado el foco.
  const [origen] = useState(() => (typeof document !== 'undefined' ? document.activeElement as HTMLElement | null : null));
  useEffect(() => () => { if (origen?.isConnected) origen.focus(); }, [origen]);
  useEffect(() => {
    const alPulsar = (event: KeyboardEvent) => { if (event.key === 'Escape' && !bloqueado) { event.stopPropagation(); onCancel(); } };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [onCancel, bloqueado]);
}

type FormularioTitulo = { grupo: RundSupportGroup; nombre: string };
type EdicionTitulo = { grupo: RundSupportGroup; nombre: string; titulo: string; evidencia?: any };

const PDF_MAXIMO = RUND_MAX_ARCHIVO_BYTES;

/** Pide el título al que corresponde el diploma y el PDF; ambos se envían juntos para que el soporte nunca quede sin dato. */
function FormularioTituloSoporte({ nombre, ocupado, onCancel, onConfirm }: {
  nombre: string; ocupado?: boolean; onCancel: () => void; onConfirm: (file: File, titulo: string) => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState('');
  useCierreModal(onCancel, ocupado);
  const confirmar = () => {
    const limpio = titulo.replace(/\s+/g, ' ').trim();
    if (!limpio) { setError(`Escriba el título de ${nombre}.`); return; }
    if (!archivo) { setError('Seleccione el documento en PDF.'); return; }
    if (!archivo.name.toLowerCase().endsWith('.pdf') || archivo.type !== 'application/pdf' || archivo.size > PDF_MAXIMO) {
      setError(`Seleccione un PDF válido de máximo ${RUND_MAX_ARCHIVO_MB} MB.`); return;
    }
    onConfirm(archivo, limpio);
  };
  return createPortal(
    <div className="rund-soportes-modal" role="dialog" aria-modal="true" aria-label={`Cargar ${nombre}`}>
      <div className="rund-soportes-modal__caja">
        <h3>Cargar {nombre}</h3>
        <p>Escriba a qué título corresponde el documento y adjúntelo. El título queda registrado en la ficha del docente.</p>
        <label htmlFor="rund-soporte-titulo">Título de {nombre}</label>
        <input id="rund-soporte-titulo" autoFocus value={titulo} maxLength={MAX_LONGITUD_TITULO} placeholder={`Ej.: ${nombre} en …`}
          onChange={event => { setTitulo(event.target.value); setError(''); }} />
        <label htmlFor="rund-soporte-archivo">Documento (PDF, máximo {RUND_MAX_ARCHIVO_MB} MB)</label>
        <input id="rund-soporte-archivo" type="file" accept="application/pdf,.pdf"
          onChange={event => { setArchivo(event.target.files?.[0] ?? null); setError(''); }} />
        {error && <p role="alert" className="rund-soportes-modal__error">{error}</p>}
        <footer>
          <button type="button" onClick={onCancel} disabled={ocupado}>Cancelar</button>
          <button type="button" className="rund-soportes-modal__confirmar" onClick={confirmar} disabled={ocupado}>Cargar documento</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/** Cambia el nombre del título de una fila y, opcionalmente, reemplaza o adjunta su documento. */
function FormularioEditarTitulo({ nombre, tituloActual, tieneArchivo, ocupado, onCancel, onConfirm }: {
  nombre: string; tituloActual: string; tieneArchivo: boolean; ocupado?: boolean; onCancel: () => void;
  onConfirm: (titulo: string, archivo: File | null) => void | Promise<unknown>;
}) {
  const [titulo, setTitulo] = useState(tituloActual);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState('');
  useCierreModal(onCancel, ocupado);
  const confirmar = () => {
    const limpio = titulo.replace(/\s+/g, ' ').trim();
    if (!limpio) { setError(`Escriba el título de ${nombre}.`); return; }
    if (archivo && (!archivo.name.toLowerCase().endsWith('.pdf') || archivo.type !== 'application/pdf' || archivo.size > PDF_MAXIMO)) {
      setError(`Seleccione un PDF válido de máximo ${RUND_MAX_ARCHIVO_MB} MB.`); return;
    }
    void onConfirm(limpio, archivo);
  };
  return createPortal(
    <div className="rund-soportes-modal" role="dialog" aria-modal="true" aria-label={`Editar ${nombre}`}>
      <div className="rund-soportes-modal__caja">
        <h3>Editar {nombre}</h3>
        <p>Cambie el nombre del título. Si lo desea, también puede {tieneArchivo ? 'reemplazar' : 'adjuntar'} el documento.</p>
        <label htmlFor="rund-soporte-titulo-editar">Título de {nombre}</label>
        <input id="rund-soporte-titulo-editar" autoFocus value={titulo} maxLength={MAX_LONGITUD_TITULO}
          onChange={event => { setTitulo(event.target.value); setError(''); }} />
        <label htmlFor="rund-soporte-archivo-editar">{tieneArchivo ? 'Reemplazar documento' : 'Adjuntar documento'} (PDF, máximo {RUND_MAX_ARCHIVO_MB} MB, opcional)</label>
        <input id="rund-soporte-archivo-editar" type="file" accept="application/pdf,.pdf"
          onChange={event => { setArchivo(event.target.files?.[0] ?? null); setError(''); }} />
        {error && <p role="alert" className="rund-soportes-modal__error">{error}</p>}
        <footer>
          <button type="button" onClick={onCancel} disabled={ocupado}>Cancelar</button>
          <button type="button" className="rund-soportes-modal__confirmar" onClick={confirmar} disabled={ocupado}>Guardar cambios</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

const claseEstado: Record<string, string> = {
  'Sin cargar': 'sin-cargar', 'En revisión': 'revision', Aprobado: 'aprobado', Devuelto: 'devuelto',
};

/**
 * Soportes documentales según la codificación del GGP: una fila por soporte con código, nomenclatura,
 * archivo, estado y acción. Cada soporte puede tener varios archivos: «Agregar otro» añade una fila más.
 */
export function RundSoportesCodificacion({ grupos, disabled, onUpload, onView, onDelete, onEditTitle, onDeleteTitle, incrustada = false, accionesExtra }: Props) {
  const [formulario, setFormulario] = useState<FormularioTitulo | null>(null);
  const [edicion, setEdicion] = useState<EdicionTitulo | null>(null);
  const filas = filasSoportes(grupos);
  if (!filas.length) return null;

  const fila = (item: RundFilaSoporte) => {
    const etiqueta = `${item.soporte}${item.codigo !== '—' ? ` ${item.codigo}` : ''}`;
    // Fila de un título registrado: se puede renombrar y eliminar (junto con su archivo, si lo tiene).
    const filaTitulo = !!item.titulo && item.grupo.canManage && !!onEditTitle && !!onDeleteTitle;
    const botonEditarTitulo = filaTitulo && <button type="button" className="rund-soportes__icono" aria-label={`Editar título ${etiqueta}`} title="Editar el título o reemplazar el documento"
      disabled={disabled} onClick={() => setEdicion({ grupo: item.grupo, nombre: item.etiquetaAgregar, titulo: item.titulo!, evidencia: item.evidencia })}><Pencil size={13} aria-hidden="true" /></button>;
    const botonEliminarTitulo = filaTitulo && <button type="button" className="rund-soportes__icono rund-soportes__icono--peligro" aria-label={`Eliminar título ${etiqueta}`} title="Eliminar el título y su documento"
      disabled={disabled} onClick={() => onDeleteTitle!(item.grupo, item.titulo!, item.evidencia)}><Trash2 size={13} aria-hidden="true" /></button>;
    return (
      <tr key={item.clave} data-estado={item.estado}>
        <td className="rund-soportes__codigo">{item.codigo}</td>
        <th scope="row" className="rund-soportes__soporte">
          <span>{item.soporte}</span>
          {item.grupo.titulos
            ? (item.titulo && <small title={item.titulo}>{item.titulo}</small>)
            : item.grupo.dataSummary && item.numero === 1 && <small title={item.grupo.dataSummary}>{item.grupo.dataSummary}</small>}
        </th>
        <td className="rund-soportes__nomenclatura"><code>{item.nomenclatura}</code></td>
        <td className="rund-soportes__archivo">{item.archivo ?? <span className="rund-soportes__vacio">Sin archivo</span>}</td>
        <td><span className={`rund-soportes__estado rund-soportes__estado--${claseEstado[item.estado]}`}>{item.estado}</span></td>
        <td className="rund-soportes__acciones">
          {item.evidencia ? (
            <>
              <button type="button" className="rund-soportes__accion" aria-label={`Ver ${etiqueta}`}
                onClick={() => onView(item.evidencia, item.grupo, item.numero)}><Eye size={13} aria-hidden="true" /> Ver</button>
              {accionesExtra?.(item.evidencia, item.grupo)}
              {filaTitulo ? botonEditarTitulo : item.puedeCargar && <button type="button" className="rund-soportes__icono" aria-label={`Reemplazar ${etiqueta}`} title="Editar: reemplazar el archivo"
                disabled={disabled} onClick={() => seleccionarPdf(file => onUpload(file, item.grupo, item.evidencia))}><Pencil size={13} aria-hidden="true" /></button>}
              {filaTitulo ? botonEliminarTitulo : item.grupo.canManage && onDelete && <button type="button" className="rund-soportes__icono rund-soportes__icono--peligro" aria-label={`Eliminar ${etiqueta}`} title="Eliminar este archivo"
                disabled={disabled} onClick={() => onDelete(item.evidencia, item.grupo)}><Trash2 size={13} aria-hidden="true" /></button>}
            </>
          ) : item.puedeCargar ? (
            <>
              <button type="button" className="rund-soportes__accion rund-soportes__accion--cargar" aria-label={`Cargar ${etiqueta}`}
                disabled={disabled} onClick={() => (item.pideTitulo
                  ? setFormulario({ grupo: item.grupo, nombre: item.etiquetaAgregar })
                  : seleccionarPdf(file => onUpload(file, item.grupo)))}><UploadCloud size={13} aria-hidden="true" /> Cargar</button>
              {botonEditarTitulo}
              {botonEliminarTitulo}
            </>
          ) : (
            <span className="rund-soportes__bloqueado" title={item.grupo.canManage ? 'Registra primero el dato en Editar datos para habilitar la carga.' : 'No tienes permiso para cargar documentos.'}>
              {item.grupo.canManage ? 'Sin dato' : 'Solo consulta'}
            </span>
          )}
        </td>
      </tr>
    );
  };

  const agregarOtro = (item: RundFilaSoporte) => (
    <tr key={`${item.clave}:agregar`} className="rund-soportes__agregar">
      <td colSpan={6}>
        <button type="button" aria-label={`Agregar otro ${item.etiquetaAgregar}`}
          disabled={disabled} onClick={() => (esSoporteDeTitulo(item.tipoSoporte)
            ? setFormulario({ grupo: item.grupo, nombre: item.etiquetaAgregar })
            : seleccionarPdf(file => onUpload(file, item.grupo)))}>
          <Plus size={13} aria-hidden="true" /> Agregar otro {item.etiquetaAgregar}
        </button>
      </td>
    </tr>
  );

  return (
    <section className={`rund-soportes${incrustada ? ' rund-soportes--incrustada' : ''}`} aria-label="Soportes documentales según codificación">
      {!incrustada && <header className="rund-soportes__encabezado">
        <div>
          <h4>Soportes documentales según codificación</h4>
          <p>Cada subcarpeta del archivo de codificación tiene su espacio de cargue. Puedes agregar más archivos en cada una.</p>
        </div>
      </header>}
      <div className="rund-soportes__contenedor">
        <table className="rund-soportes__tabla">
          <thead>
            <tr><th scope="col">Código</th><th scope="col">Soporte</th><th scope="col">Nomenclatura</th><th scope="col">Archivo</th><th scope="col">Estado</th><th scope="col">Acción</th></tr>
          </thead>
          <tbody>{filas.flatMap(item => (item.ultima && item.puedeAgregar ? [fila(item), agregarOtro(item)] : [fila(item)]))}</tbody>
        </table>
      </div>
      {edicion && <FormularioEditarTitulo nombre={edicion.nombre} tituloActual={edicion.titulo} tieneArchivo={!!edicion.evidencia} ocupado={disabled}
        onCancel={() => setEdicion(null)}
        onConfirm={async (titulo, archivo) => {
          const actual = edicion;
          setEdicion(null);
          if (titulo !== actual.titulo) {
            const guardado = await onEditTitle!(actual.grupo, actual.titulo, titulo);
            if (guardado === false) return;
          }
          if (archivo) await onUpload(archivo, actual.grupo, actual.evidencia);
        }} />}
      {formulario && <FormularioTituloSoporte nombre={formulario.nombre} ocupado={disabled} onCancel={() => setFormulario(null)}
        onConfirm={(file, titulo) => { onUpload(file, formulario.grupo, undefined, titulo); setFormulario(null); }} />}
    </section>
  );
}
