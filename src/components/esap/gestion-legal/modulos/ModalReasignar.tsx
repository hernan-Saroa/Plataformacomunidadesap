/**
 * ModalReasignar - Modal para reasignar un requerimiento a otro responsable
 * ✅ Diseño corporativo ESAP 2025 con ModalHeaderClean
 * ✅ Estructura estándar con header + content + footer
 */

import { useState } from 'react';
import { X, User, Search, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Card } from '../../../ui/card';

interface ResponsableESAP {
  id: string;
  nombre: string;
  cargo: string;
  area: string;
  correo: string;
  foto?: string;
}

interface ModalReasignarProps {
  isOpen: boolean;
  onClose: () => void;
  requerimientoId: string;
  responsableActual: string;
  onReasignacion?: (nuevoResponsable: ResponsableESAP) => void;
}

export function ModalReasignar({
  isOpen,
  onClose,
  requerimientoId,
  responsableActual,
  onReasignacion
}: ModalReasignarProps) {
  const [busqueda, setBusqueda] = useState('');
  const [responsableSeleccionado, setResponsableSeleccionado] = useState<ResponsableESAP | null>(null);
  const [justificacion, setJustificacion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock de responsables disponibles
  const responsablesDisponibles: ResponsableESAP[] = [
    {
      id: '1',
      nombre: 'Dra. María Fernández',
      cargo: 'Jefe Oficina Jurídica',
      area: 'Área Jurídica',
      correo: 'maria.fernandez@esap.edu.co'
    },
    {
      id: '2',
      nombre: 'Dr. Carlos Pérez',
      cargo: 'Abogado Senior',
      area: 'Área Jurídica',
      correo: 'carlos.perez@esap.edu.co'
    },
    {
      id: '3',
      nombre: 'Dra. Ana Rodríguez',
      cargo: 'Abogada Contratación',
      area: 'Área de Contratación',
      correo: 'ana.rodriguez@esap.edu.co'
    },
    {
      id: '4',
      nombre: 'Dr. Luis Martínez',
      cargo: 'Abogado Disciplinario',
      area: 'Oficina de Control Interno Disciplinario',
      correo: 'luis.martinez@esap.edu.co'
    },
    {
      id: '5',
      nombre: 'Dra. Patricia Gómez',
      cargo: 'Coordinadora Legal',
      area: 'Área Jurídica',
      correo: 'patricia.gomez@esap.edu.co'
    },
    {
      id: '6',
      nombre: 'Dr. Jorge Ramírez',
      cargo: 'Abogado Junior',
      area: 'Área Jurídica',
      correo: 'jorge.ramirez@esap.edu.co'
    }
  ];

  const responsablesFiltrados = responsablesDisponibles.filter(
    r => r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
         r.cargo.toLowerCase().includes(busqueda.toLowerCase()) ||
         r.area.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!responsableSeleccionado) {
      toast.error('⚠️ Debe seleccionar un responsable');
      return;
    }

    if (!justificacion.trim()) {
      toast.error('⚠️ Debe ingresar una justificación');
      return;
    }

    setIsSubmitting(true);

    // Simular llamada a API
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success(`✅ Requerimiento reasignado exitosamente a ${responsableSeleccionado.nombre}`);
    
    if (onReasignacion) {
      onReasignacion(responsableSeleccionado);
    }

    setIsSubmitting(false);
    setResponsableSeleccionado(null);
    setJustificacion('');
    setBusqueda('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">
          Reasignar Requerimiento - {requerimientoId}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Reasignar requerimiento {requerimientoId} a otro responsable
        </DialogDescription>

        {/* HEADER - flex-shrink-0 (siempre visible) */}
        <ModalHeaderClean
          icono={Users}
          colorIcono="purple"
          titulo="Reasignar Requerimiento"
          subtitulo={requerimientoId}
          badgePrincipal="Cambio de Responsable"
          onClose={onClose}
        />

        {/* CONTENIDO - flex-1 overflow-y-auto (solo esto hace scroll) */}
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
                  placeholder="Buscar por nombre, cargo o área..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Lista de Responsables */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-900">
                Responsables Disponibles ({responsablesFiltrados.length})
              </Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                {responsablesFiltrados.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No se encontraron responsables</p>
                  </div>
                ) : (
                  responsablesFiltrados.map((responsable) => (
                    <button
                      key={responsable.id}
                      type="button"
                      onClick={() => setResponsableSeleccionado(responsable)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        responsableSeleccionado?.id === responsable.id
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {responsable.nombre.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900">{responsable.nombre}</p>
                            {responsableSeleccionado?.id === responsable.id && (
                              <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600">{responsable.cargo}</p>
                          <p className="text-xs text-purple-600 mt-0.5">📧 {responsable.correo}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Justificación */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-900">
                Justificación de la Reasignación <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                placeholder="Ingrese la justificación para reasignar este requerimiento..."
                rows={4}
                className="resize-none"
                required
              />
            </div>

            {/* Alerta informativa */}
            {responsableSeleccionado && (
              <Card className="p-4 bg-amber-50 border-amber-200">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Importante</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Se notificará automáticamente a <strong>{responsableSeleccionado.nombre}</strong> sobre la asignación de este requerimiento. 
                      El responsable actual ({responsableActual}) recibirá una notificación del cambio.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </form>
        </div>

        {/* FOOTER - flex-shrink-0 (siempre visible) */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-600">
            Los campos marcados con <span className="text-red-500 font-bold">*</span> son obligatorios
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !responsableSeleccionado || !justificacion.trim()}
              style={{ background: '#8B5CF6', color: '#FFFFFF' }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Reasignando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Reasignar Requerimiento
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}