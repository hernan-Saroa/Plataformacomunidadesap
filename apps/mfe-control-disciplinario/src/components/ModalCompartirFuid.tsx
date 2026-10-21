/**
 * MODAL: COMPARTIR FUID (EI-FO-003)
 * Remite por correo electrónico el Formato Único de Inventario Documental (FUID)
 * como archivo adjunto (.xlsx). No comparte el Índice Electrónico ni enlaces al expediente.
 */

import { useState } from 'react';
import { Send, Loader2, FileSpreadsheet, Download, AlertCircle } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { toast } from 'sonner';
import { ResponsiveModalWrapper } from './ResponsiveModalWrapper';
import { useResponsive } from './hooks/useResponsive';
import { disciplinaryService } from '../../../services/api/disciplinary.service';

const validarEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

interface ModalCompartirFuidProps {
  /** Ítems FUID ya construidos (una fila por expediente) */
  items: Array<{ radicado: string; [key: string]: any }>;
  header?: { elaboradoPor?: string; cargoElaboradoPor?: string; [key: string]: any };
  filename: string;
  onClose: () => void;
}

export function ModalCompartirFuid({ items, header, filename, onClose }: ModalCompartirFuidProps) {
  const [emailDestino, setEmailDestino] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const { isMobile } = useResponsive();

  const radicados = items.map(i => i.radicado);
  const subtitulo = items.length === 1
    ? `Expediente ${radicados[0]}`
    : `${items.length} expedientes seleccionados`;

  const enviar = async () => {
    if (!validarEmail(emailDestino)) {
      toast.error('Ingrese un correo electrónico válido');
      return;
    }
    setEnviando(true);
    try {
      const result = await disciplinaryService.compartirFuidPorCorreo({
        items,
        header,
        emailDestinatario: emailDestino.trim(),
        mensaje: mensaje.trim() || undefined,
        filename,
      });
      toast.success('FUID compartido', {
        description: result?.message || `Enviado a ${emailDestino.trim()}`,
      });
      onClose();
    } catch (error: any) {
      console.error('Error al compartir FUID:', error);
      toast.error('Error al compartir FUID', { description: error?.message });
    } finally {
      setEnviando(false);
    }
  };

  const descargar = async () => {
    setDescargando(true);
    try {
      await disciplinaryService.descargarFuidLote(items, header, filename);
      toast.success('FUID descargado', { description: filename });
    } catch (error: any) {
      toast.error('Error al descargar FUID', { description: error?.message });
    } finally {
      setDescargando(false);
    }
  };

  return (
    <ResponsiveModalWrapper
      isOpen={true}
      onClose={onClose}
      title="Compartir FUID"
      subtitle={subtitulo}
      maxWidth="2xl"
      showBackButton={true}
    >
      <div className="space-y-5 bg-white">
        {/* Archivo a compartir */}
        <div className="flex items-center gap-3 p-4 rounded-lg border border-emerald-200 bg-emerald-50">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-600 text-white flex-shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{filename}</p>
            <p className="text-xs text-gray-600">
              Formato Único de Inventario Documental (EI-FO-003) · {items.length} expediente(s)
            </p>
          </div>
        </div>

        {items.length > 1 && (
          <p className="text-xs text-gray-600 break-words">
            <strong>Radicados:</strong> {radicados.join(', ')}
          </p>
        )}

        <div>
          <label htmlFor="fuid-share-email" className="block text-sm font-medium text-gray-700 mb-2">
            Correo del destinatario *
          </label>
          <input
            id="fuid-share-email"
            type="email"
            value={emailDestino}
            onChange={(e) => setEmailDestino(e.target.value)}
            placeholder="gestion.documental@esap.edu.co"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
          {emailDestino && !validarEmail(emailDestino) && (
            <p className="text-xs text-red-600 mt-1">Ingrese un correo electrónico válido</p>
          )}
        </div>

        <div>
          <label htmlFor="fuid-share-mensaje" className="block text-sm font-medium text-gray-700 mb-2">
            Mensaje adicional (opcional)
          </label>
          <textarea
            id="fuid-share-mensaje"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={4}
            placeholder="Incluya un mensaje para el destinatario..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
          />
        </div>

        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            Se enviará un correo con el archivo FUID adjunto. No se comparte el Índice Electrónico
            ni el acceso al expediente.
          </p>
        </div>
      </div>

      <div className={`flex-shrink-0 flex ${isMobile ? 'flex-col gap-2' : 'flex-row justify-between items-center'} px-6 py-4 border-t border-gray-200 bg-gray-50`}>
        <Button onClick={onClose} variant="outline" className={isMobile ? 'w-full' : ''}>
          Cancelar
        </Button>
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2`}>
          <Button
            onClick={descargar}
            variant="outline"
            disabled={descargando || enviando}
            className={`border-emerald-600 text-emerald-700 hover:bg-emerald-50 ${isMobile ? 'w-full' : ''}`}
          >
            {descargando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Descargar FUID
          </Button>
          <Button
            onClick={enviar}
            disabled={enviando || !validarEmail(emailDestino)}
            style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)', color: '#FFFFFF' }}
            className={isMobile ? 'w-full' : ''}
          >
            {enviando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar FUID
              </>
            )}
          </Button>
        </div>
      </div>
    </ResponsiveModalWrapper>
  );
}
