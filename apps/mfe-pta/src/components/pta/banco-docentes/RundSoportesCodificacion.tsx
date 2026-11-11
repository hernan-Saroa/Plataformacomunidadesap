import { Eye, Pencil, Plus, Trash2, UploadCloud } from 'lucide-react';
import type { RundSupportGroup } from './RundSupportList';
import { filasSoportes, type RundFilaSoporte } from '../../../utils/rundSoportesTabla';
import './RundSoportesCodificacion.css';

type Props = {
  grupos: RundSupportGroup[];
  disabled?: boolean;
  onUpload: (file: File, grupo: RundSupportGroup, evidencia?: any) => void;
  onView: (evidencia: any, grupo: RundSupportGroup, numero: number) => void;
  onDelete?: (evidencia: any, grupo: RundSupportGroup) => void;
};

/** Abre el selector de PDF sin dejar controles de archivo en la página. */
function seleccionarPdf(alSeleccionar: (file: File) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/pdf,.pdf';
  input.onchange = () => { const file = input.files?.[0]; if (file) alSeleccionar(file); };
  input.click();
}

const claseEstado: Record<string, string> = {
  'Sin cargar': 'sin-cargar', 'En revisión': 'revision', Aprobado: 'aprobado', Devuelto: 'devuelto',
};

/**
 * Soportes documentales según la codificación del GGP: una fila por soporte con código, nomenclatura,
 * archivo, estado y acción. Cada soporte puede tener varios archivos: «Agregar otro» añade una fila más.
 */
export function RundSoportesCodificacion({ grupos, disabled, onUpload, onView, onDelete }: Props) {
  const filas = filasSoportes(grupos);
  if (!filas.length) return null;

  const fila = (item: RundFilaSoporte) => {
    const etiqueta = `${item.soporte}${item.codigo !== '—' ? ` ${item.codigo}` : ''}`;
    return (
      <tr key={item.clave} data-estado={item.estado}>
        <td className="rund-soportes__codigo">{item.codigo}</td>
        <th scope="row" className="rund-soportes__soporte">
          <span>{item.soporte}</span>
          {item.grupo.dataSummary && item.numero === 1 && <small title={item.grupo.dataSummary}>{item.grupo.dataSummary}</small>}
        </th>
        <td className="rund-soportes__nomenclatura"><code>{item.nomenclatura}</code></td>
        <td className="rund-soportes__archivo">{item.archivo ?? <span className="rund-soportes__vacio">Sin archivo</span>}</td>
        <td><span className={`rund-soportes__estado rund-soportes__estado--${claseEstado[item.estado]}`}>{item.estado}</span></td>
        <td className="rund-soportes__acciones">
          {item.evidencia ? (
            <>
              <button type="button" className="rund-soportes__accion" aria-label={`Ver ${etiqueta}`}
                onClick={() => onView(item.evidencia, item.grupo, item.numero)}><Eye size={13} aria-hidden="true" /> Ver</button>
              {item.puedeCargar && <button type="button" className="rund-soportes__icono" aria-label={`Reemplazar ${etiqueta}`} title="Editar: reemplazar el archivo"
                disabled={disabled} onClick={() => seleccionarPdf(file => onUpload(file, item.grupo, item.evidencia))}><Pencil size={13} aria-hidden="true" /></button>}
              {item.grupo.canManage && onDelete && <button type="button" className="rund-soportes__icono rund-soportes__icono--peligro" aria-label={`Eliminar ${etiqueta}`} title="Eliminar este archivo"
                disabled={disabled} onClick={() => onDelete(item.evidencia, item.grupo)}><Trash2 size={13} aria-hidden="true" /></button>}
            </>
          ) : item.puedeCargar ? (
            <button type="button" className="rund-soportes__accion rund-soportes__accion--cargar" aria-label={`Cargar ${etiqueta}`}
              disabled={disabled} onClick={() => seleccionarPdf(file => onUpload(file, item.grupo))}><UploadCloud size={13} aria-hidden="true" /> Cargar</button>
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
        <button type="button" aria-label={`Agregar otro ${item.grupo.fields.length === 1 ? item.grupo.field.campo : item.soporte}`}
          disabled={disabled} onClick={() => seleccionarPdf(file => onUpload(file, item.grupo))}>
          <Plus size={13} aria-hidden="true" /> Agregar otro
        </button>
      </td>
    </tr>
  );

  return (
    <section className="rund-soportes" aria-label="Soportes documentales según codificación">
      <header className="rund-soportes__encabezado">
        <div>
          <h4>Soportes documentales según codificación</h4>
          <p>Cada subcarpeta del archivo de codificación tiene su espacio de cargue. Puedes agregar más archivos en cada una.</p>
        </div>
      </header>
      <div className="rund-soportes__contenedor">
        <table className="rund-soportes__tabla">
          <thead>
            <tr><th scope="col">Código</th><th scope="col">Soporte</th><th scope="col">Nomenclatura</th><th scope="col">Archivo</th><th scope="col">Estado</th><th scope="col">Acción</th></tr>
          </thead>
          <tbody>{filas.flatMap(item => (item.ultima && item.puedeAgregar ? [fila(item), agregarOtro(item)] : [fila(item)]))}</tbody>
        </table>
      </div>
    </section>
  );
}
