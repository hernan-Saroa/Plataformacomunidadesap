import { FileText, Trash2 } from 'lucide-react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import './RundDocumentManager.css';

export type ConfirmacionEliminar = {
  titulo: string;
  descripcion: string;
  /** Nombre del archivo o del título que se elimina, en el recuadro del diálogo. */
  objeto: string;
  detalle?: string;
  confirmar: () => void | Promise<void>;
};

/**
 * Confirmación de eliminación con el mismo diseño del diálogo de «Eliminar documento» de la ficha
 * (reemplaza el `window.confirm` del navegador, que muestra la URL de la página).
 */
export function RundConfirmarEliminacion({ confirmacion, ocupado, onCancelar }: {
  confirmacion: ConfirmacionEliminar | null; ocupado?: boolean; onCancelar: () => void;
}) {
  return (
    <AlertDialog.Root open={!!confirmacion} onOpenChange={abierto => { if (!abierto && !ocupado) onCancelar(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="rund-document-delete__overlay" />
        <AlertDialog.Content className="rund-document-delete" aria-busy={!!ocupado} onEscapeKeyDown={event => { if (ocupado) event.preventDefault(); }}>
          <div className="rund-document-delete__icon"><Trash2 size={23} aria-hidden="true" /></div>
          <AlertDialog.Title className="rund-document-delete__title">{confirmacion?.titulo}</AlertDialog.Title>
          <AlertDialog.Description className="rund-document-delete__description">{confirmacion?.descripcion}</AlertDialog.Description>
          <div className="rund-document-delete__file">
            <FileText size={20} aria-hidden="true" />
            <div><strong>{confirmacion?.objeto}</strong>{confirmacion?.detalle && <span>{confirmacion.detalle}</span>}</div>
          </div>
          <div className="rund-document-delete__actions">
            <AlertDialog.Cancel disabled={ocupado}>Cancelar</AlertDialog.Cancel>
            <AlertDialog.Action className="rund-document-delete__confirm" disabled={ocupado}
              onClick={event => { event.preventDefault(); void confirmacion?.confirmar(); }}>
              {ocupado ? 'Eliminando…' : titulo(confirmacion)}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

const titulo = (confirmacion: ConfirmacionEliminar | null) => (confirmacion?.titulo.toLowerCase().includes('título') ? 'Eliminar título' : 'Eliminar archivo');
