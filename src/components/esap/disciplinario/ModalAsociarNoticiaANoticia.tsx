import React, { useState, useMemo } from 'react';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { ModalButtonPrimary, ModalButtonCancel, ModalButtonGroup } from '@/components/ui/ModalButtons';
import { Search, FileText, AlertCircle, CheckCircle2, Link2 } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
}

interface Noticia {
  id: string;
  numero: string;
  fechaRecepcion: string;
  origen: string;
  denunciante: Persona | string;
  denunciado: Persona | string;
  hechos: string;
  estado: 'pendiente' | 'en-valoracion' | 'asignada' | 'archivada' | 'remitida';
  prioridad: 'alta' | 'media' | 'baja';
  diasPendientes: number;
  tipo: 'noticia';
}

interface ModalAsociarNoticiaANoticiaProps {
  isOpen: boolean;
  onClose: () => void;
  noticia: Noticia | null;
  noticiasDisponibles: Noticia[];
  onAsociar: (noticiaId: string, noticiaDestinoId: string, justificacion: string) => void;
}

export function ModalAsociarNoticiaANoticia({
  isOpen,
  onClose,
  noticia,
  noticiasDisponibles,
  onAsociar
}: ModalAsociarNoticiaANoticiaProps) {
  const [noticiaDestinoSeleccionada, setNoticiaDestinoSeleccionada] = useState<string | null>(null);
  const [justificacion, setJustificacion] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const noticiasFiltradas = useMemo(() => {
    if (!searchTerm) return noticiasDisponibles;

    const term = searchTerm.toLowerCase();
    return noticiasDisponibles.filter(noticiaItem =>
      noticiaItem.numero.toLowerCase().includes(term) ||
      noticiaItem.origen.toLowerCase().includes(term) ||
      (typeof noticiaItem.denunciado === 'string'
        ? noticiaItem.denunciado.toLowerCase().includes(term)
        : noticiaItem.denunciado?.nombre?.toLowerCase().includes(term) || false) ||
      (typeof noticiaItem.denunciante === 'string'
        ? noticiaItem.denunciante.toLowerCase().includes(term)
        : noticiaItem.denunciante?.nombre?.toLowerCase().includes(term) || false)
    );
  }, [noticiasDisponibles, searchTerm]);

  const handleReset = () => {
    setNoticiaDestinoSeleccionada(null);
    setJustificacion('');
    setSearchTerm('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleAsociar = async () => {
    if (!noticiaDestinoSeleccionada) {
      toast.error('Debe seleccionar una noticia de destino');
      return;
    }

    if (!justificacion.trim()) {
      toast.error('Debe ingresar una justificación');
      return;
    }

    if (justificacion.trim().length < 20) {
      toast.error('La justificación debe tener al menos 20 caracteres');
      return;
    }

    if (!noticia) return;

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      onAsociar(noticia.id, noticiaDestinoSeleccionada, justificacion.trim());

      const noticiaDestino = noticiasDisponibles.find(item => item.id === noticiaDestinoSeleccionada);
      toast.success(
        `Noticia ${noticia.numero} asociada a noticia ${noticiaDestino?.numero || ''}`,
        {
          description: 'La asociación se ha registrado correctamente',
          duration: 4000,
        }
      );

      handleClose();
    } catch (error) {
      toast.error('Error al asociar la noticia');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validación más robusta: verificar que la noticia tenga los campos requeridos
  if (!noticia || noticia.tipo !== 'noticia' || !noticia.id || !noticia.numero) {
    return null;
  }

  const noticiaDestinoData = noticiaDestinoSeleccionada
    ? noticiasDisponibles.find(item => item.id === noticiaDestinoSeleccionada)
    : null;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Asociar Noticia a Otra Noticia"
      size="lg"
      zIndex={200}
      disableBackdropClick={isSubmitting}
      disableEscapeKey={isSubmitting}
      footer={
        <ModalButtonGroup>
          <ModalButtonCancel onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </ModalButtonCancel>
          <ModalButtonPrimary
            onClick={handleAsociar}
            isLoading={isSubmitting}
            disabled={!noticiaDestinoSeleccionada || !justificacion.trim()}
          >
            <Link2 className="w-4 h-4 mr-2" />
            Asociar Noticia
          </ModalButtonPrimary>
        </ModalButtonGroup>
      }
    >
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-gray-900 mb-1">
                Noticia: {noticia.numero}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                <div>
                  <span className="font-semibold">Denunciado:</span>{' '}
                  {typeof noticia.denunciado === 'string' ? noticia.denunciado : noticia.denunciado?.nombre}
                </div>
                <div>
                  <span className="font-semibold">Origen:</span> {noticia.origen}
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                {noticia.hechos}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Buscar Noticia Destino
          </label>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por número, origen, denunciado, denunciante..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm touch-target"
            />
          </div>

          {searchTerm && (
            <p className="text-xs text-gray-500 mt-1">
              {noticiasFiltradas.length} {noticiasFiltradas.length === 1 ? 'noticia encontrada' : 'noticias encontradas'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Seleccionar Noticia ({noticiasFiltradas.length})
          </label>

          <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto divide-y divide-gray-200">
            {noticiasFiltradas.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-gray-500">No se encontraron noticias</p>
              </div>
            ) : (
              noticiasFiltradas.map((item) => {
                const isSelected = noticiaDestinoSeleccionada === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setNoticiaDestinoSeleccionada(item.id)}
                    className={`p-4 cursor-pointer transition-all hover:bg-gray-50 ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{item.numero}</h4>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {typeof item.denunciado === 'string' ? item.denunciado : item.denunciado?.nombre || 'Sin info'}
                        </p>
                      </div>
                      <Badge className="text-xs px-2 py-0.5 font-semibold bg-slate-50 border border-slate-200 text-slate-700">
                        {item.origen}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Justificación de la Asociación <span className="text-red-600">*</span>
          </label>

          <textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="Explique por qué esta noticia debe asociarse a la otra noticia. Mínimo 20 caracteres."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none min-h-[100px]"
            maxLength={500}
          />

          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500">
              {justificacion.length < 20 && justificacion.length > 0 && (
                <span className="text-amber-600">Faltan {20 - justificacion.length} caracteres</span>
              )}
              {justificacion.length >= 20 && (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Justificación válida
                </span>
              )}
            </p>
            <p className="text-xs text-gray-400">{justificacion.length}/500</p>
          </div>
        </div>

        {noticiaDestinoData && justificacion.length >= 20 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-green-700" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-green-900 mb-2">Resumen de Asociación</h4>
                <div className="text-xs text-green-800 space-y-1">
                  <p><strong>Noticia origen:</strong> {noticia.numero} → <strong>Noticia destino:</strong> {noticiaDestinoData.numero}</p>
                  <p>
                    <strong>Denunciado destino:</strong>{' '}
                    {typeof noticiaDestinoData.denunciado === 'string' ? noticiaDestinoData.denunciado : noticiaDestinoData.denunciado?.nombre}
                  </p>
                  <p className="pt-1 border-t border-green-200">
                    Esta asociación quedará registrada en el historial y la noticia origen dejará de mostrarse de forma independiente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}

export default ModalAsociarNoticiaANoticia;
