/**
 * ModalReasignar - Modal para reasignar un requerimiento a otro responsable
 * ✅ Diseño corporativo ESAP 2025 - Abogados desde DB
 */

import { useState, useEffect } from 'react';
import { X, User, Search, CheckCircle, AlertCircle, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Card } from '../../../ui/card';
import { legalService, ocService } from '../../../../services/api/legal.service';

interface Abogado {
  id: string;
  nombreCompleto: string;
  email?: string;
  especialidad?: string;
}

interface ModalReasignarProps {
  isOpen: boolean;
  onClose: () => void;
  requerimientoId: string;
  responsableActual: string;
  onReasignacion?: (nuevoResponsable: Abogado) => void;
}

export function ModalReasignar({
  isOpen,
  onClose,
  requerimientoId,
  responsableActual,
  onReasignacion
}: ModalReasignarProps) {
  const [busqueda, setBusqueda] = useState('');
  const [responsableSeleccionado, setResponsableSeleccionado] = useState<Abogado | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [abogados, setAbogados] = useState<Abogado[]>([]);
  const [loadingAbogados, setLoadingAbogados] = useState(true);

  // Cargar abogados desde la DB
  useEffect(() => {
    if (isOpen) {
      loadAbogados();
    }
  }, [isOpen]);

  const loadAbogados = async () => {
    setLoadingAbogados(true);
    try {
      const lawyers = await legalService.getAbogados();
      setAbogados(lawyers.map((a: any) => ({
        id: a.id,
        nombreCompleto: a.nombreCompleto || a.nombre || `${a.nombres} ${a.apellidos}`,
        email: a.email,
        especialidad: a.especialidad
      })));
    } catch (error) {
      console.error('Error cargando abogados:', error);
      toast.error('Error al cargar la lista de abogados');
    } finally {
      setLoadingAbogados(false);
    }
  };

  const abogadosFiltrados = abogados.filter(
    a => a.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
      (a.especialidad?.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!responsableSeleccionado) {
      toast.error('⚠️ Debe seleccionar un responsable');
      return;
    }

    setIsSubmitting(true);

    try {
      // Llamar al API para reasignar
      await ocService.reasignarRequerimiento(requerimientoId, responsableSeleccionado.id);

      toast.success(`✅ Requerimiento reasignado a ${responsableSeleccionado.nombreCompleto}`);

      if (onReasignacion) {
        onReasignacion(responsableSeleccionado);
      }

      setResponsableSeleccionado(null);
      setBusqueda('');
      onClose();
    } catch (error: any) {
      console.error('Error reasignando:', error);
      toast.error(error.message || 'Error al reasignar el requerimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogTitle className="sr-only">
          Reasignar Requerimiento - {requerimientoId}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Reasignar requerimiento {requerimientoId} a otro responsable
        </DialogDescription>

        {/* HEADER */}
        <ModalHeaderClean
          icono={Users}
          colorIcono="purple"
          titulo="Reasignar Requerimiento"
          subtitulo={requerimientoId}
          badgePrincipal="Cambio de Responsable"
          onClose={onClose}
        />

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Responsable Actual */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-blue-600 font-bold">Responsable Actual</p>
                  <p className="text-sm font-bold text-blue-900">
                    {responsableActual}
                  </p>
                </div>
              </div>
            </Card>

            {/* Búsqueda */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-900">
                Buscar Nuevo Responsable <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o especialidad..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Lista de Abogados */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-900">
                Abogados Disponibles ({abogadosFiltrados.length})
              </Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                {loadingAbogados ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    <span className="ml-2 text-sm text-gray-600">Cargando abogados...</span>
                  </div>
                ) : abogadosFiltrados.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No se encontraron abogados</p>
                  </div>
                ) : (
                  abogadosFiltrados.map((abogado) => (
                    <button
                      key={abogado.id}
                      type="button"
                      onClick={() => setResponsableSeleccionado(abogado)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${responsableSeleccionado?.id === abogado.id
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {abogado.nombreCompleto.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900">{abogado.nombreCompleto}</p>
                            {responsableSeleccionado?.id === abogado.id && (
                              <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            )}
                          </div>
                          {abogado.especialidad && (
                            <p className="text-xs text-gray-600">{abogado.especialidad}</p>
                          )}
                          {abogado.email && (
                            <p className="text-xs text-purple-600 mt-0.5">📧 {abogado.email}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Alerta informativa */}
            {responsableSeleccionado && (
              <Card className="p-4 bg-amber-50 border-amber-200">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Importante</p>
                    <p className="text-xs text-amber-700 mt-1">
                      El nuevo responsable <strong>{responsableSeleccionado.nombreCompleto}</strong> será
                      notificado y tendrá acceso completo al requerimiento.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </form>
        </div>

        {/* FOOTER */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-t flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={!responsableSeleccionado || isSubmitting}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reasignando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Reasignación
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
