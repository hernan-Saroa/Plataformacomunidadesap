/**
 * VistaArchivados - Componente Reutilizable para Archivados y Eliminados
 * ✅ Control de acceso por permisos
 * ✅ Funcionalidad de Restaurar/Eliminar Permanentemente
 * ✅ Diseño corporativo ESAP
 * ✅ Auditoría completa con timestamps y usuario
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import {
  Archive,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  Clock,
  Shield,
  X,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { ModalHeaderClean } from '../modulos/ModalHeaderClean';

// ==================== TIPOS ====================
export type EstadoArchivado = 'ARCHIVADO' | 'ELIMINADO';
export type TipoAccion = 'RESTAURAR' | 'ELIMINAR_PERMANENTE';

export interface ItemArchivado {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string; // "Proceso Judicial", "Expediente Disciplinario", etc.
  estado: EstadoArchivado;
  fechaArchivado: Date;
  usuarioArchivo: string;
  motivoArchivo: string;
  metadatos?: Record<string, any>; // Información adicional del item
}

interface VistaArchivadosProps {
  items: ItemArchivado[];
  moduloNombre: string;
  onRestaurar: (itemId: string) => Promise<void>;
  onEliminarPermanente: (itemId: string) => Promise<void>;
  permisoRequerido?: string; // Permiso necesario para acceder
  usuarioActual?: {
    nombre: string;
    permisos: string[];
  };
}

// ==================== COMPONENTE PRINCIPAL ====================
export function VistaArchivados({
  items,
  moduloNombre,
  onRestaurar,
  onEliminarPermanente,
  permisoRequerido = 'VER_ARCHIVADOS',
  usuarioActual = {
    nombre: 'Dr. Carlos Méndez',
    permisos: ['VER_ARCHIVADOS', 'RESTAURAR_ITEMS', 'ELIMINAR_PERMANENTE']
  }
}: VistaArchivadosProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoArchivado | 'TODOS'>('TODOS');
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemArchivado | null>(null);
  const [accionModal, setAccionModal] = useState<TipoAccion | null>(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);

  // ✅ CONTROL DE PERMISOS
  const tienePermiso = (permiso: string): boolean => {
    return usuarioActual.permisos.includes(permiso);
  };

  const puedeRestar = tienePermiso('RESTAURAR_ITEMS');
  const puedeEliminarPermanente = tienePermiso('ELIMINAR_PERMANENTE');

  // ✅ Verificar acceso a la sección
  if (!tienePermiso(permisoRequerido)) {
    return (
      <Card className="p-12 text-center">
        <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-black text-gray-900 mb-2">Acceso Restringido</h3>
        <p className="text-gray-600 mb-4">
          No tiene permisos para acceder a la sección de Archivados y Eliminados.
        </p>
        <p className="text-sm text-gray-500">
          Contacte al administrador del sistema para solicitar acceso.
        </p>
      </Card>
    );
  }

  // ✅ FILTRADO
  const itemsFiltrados = useMemo(() => {
    let resultado = [...items];

    if (busqueda) {
      resultado = resultado.filter(item =>
        item.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.tipo.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.usuarioArchivo.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    if (filtroEstado !== 'TODOS') {
      resultado = resultado.filter(item => item.estado === filtroEstado);
    }

    return resultado.sort((a, b) => b.fechaArchivado.getTime() - a.fechaArchivado.getTime());
  }, [items, busqueda, filtroEstado]);

  // ✅ ESTADÍSTICAS
  const stats = useMemo(() => {
    const archivados = items.filter(i => i.estado === 'ARCHIVADO').length;
    const eliminados = items.filter(i => i.estado === 'ELIMINADO').length;
    return { total: items.length, archivados, eliminados };
  }, [items]);

  // ✅ FUNCIONES DE ACCIÓN
  const confirmarRestaurar = async () => {
    if (!itemSeleccionado) return;

    try {
      await onRestaurar(itemSeleccionado.id);
      toast.success('Item restaurado exitosamente', {
        description: `"${itemSeleccionado.codigo}" ha sido restaurado al módulo ${moduloNombre}`,
        duration: 4000
      });
      setAccionModal(null);
      setItemSeleccionado(null);
    } catch (error) {
      toast.error('Error al restaurar el item', {
        description: 'Por favor intente nuevamente',
        duration: 4000
      });
    }
  };

  const confirmarEliminarPermanente = async () => {
    if (!itemSeleccionado) return;

    try {
      await onEliminarPermanente(itemSeleccionado.id);
      toast.success('Item eliminado permanentemente', {
        description: `"${itemSeleccionado.codigo}" ha sido eliminado de forma permanente`,
        duration: 4000
      });
      setAccionModal(null);
      setItemSeleccionado(null);
    } catch (error) {
      toast.error('Error al eliminar permanentemente', {
        description: 'Por favor intente nuevamente',
        duration: 4000
      });
    }
  };

  const formatearFecha = (fecha: Date): string => {
    return fecha.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Header con Estadísticas */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
              <Archive className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#F57C00' }} />
              Archivados y Eliminados
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Gestión de items archivados y eliminados del módulo {moduloNombre}
            </p>
          </div>
          <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Protegido
          </Badge>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
            <p className="text-2xl sm:text-3xl font-black text-gray-900">{stats.total}</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Total</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 sm:p-4 text-center">
            <p className="text-2xl sm:text-3xl font-black" style={{ color: '#2962FF' }}>{stats.archivados}</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Archivados</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 sm:p-4 text-center">
            <p className="text-2xl sm:text-3xl font-black text-red-600">{stats.eliminados}</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Eliminados</p>
          </div>
        </div>
      </Card>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por código, nombre, tipo o usuario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filtroEstado === 'TODOS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('TODOS')}
            >
              Todos
            </Button>
            <Button
              variant={filtroEstado === 'ARCHIVADO' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('ARCHIVADO')}
              className={filtroEstado === 'ARCHIVADO' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              Archivados
            </Button>
            <Button
              variant={filtroEstado === 'ELIMINADO' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('ELIMINADO')}
              className={filtroEstado === 'ELIMINADO' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Eliminados
            </Button>
          </div>
        </div>

        {itemsFiltrados.length > 0 && (
          <p className="text-xs text-gray-500 mt-3">
            Mostrando {itemsFiltrados.length} de {items.length} items
          </p>
        )}
      </Card>

      {/* Lista de Items */}
      <div className="space-y-3">
        {itemsFiltrados.length === 0 ? (
          <Card className="p-12 text-center">
            <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron items archivados o eliminados</p>
          </Card>
        ) : (
          itemsFiltrados.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Fila 1: Código + Estado */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-mono font-bold text-gray-900">{item.codigo}</span>
                      <Badge
                        className={
                          item.estado === 'ARCHIVADO'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-red-100 text-red-700'
                        }
                      >
                        {item.estado === 'ARCHIVADO' ? (
                          <>
                            <Archive className="w-3 h-3 mr-1" />
                            Archivado
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3 h-3 mr-1" />
                            Eliminado
                          </>
                        )}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.tipo}
                      </Badge>
                    </div>

                    {/* Fila 2: Nombre */}
                    <h3 className="font-semibold text-gray-900 mb-2">{item.nombre}</h3>

                    {/* Fila 3: Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatearFecha(item.fechaArchivado)}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.usuarioArchivo}
                      </div>
                      {item.motivoArchivo && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-orange-500" />
                          <span className="truncate">{item.motivoArchivo}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setItemSeleccionado(item);
                        setModalDetalleAbierto(true);
                      }}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>

                    {puedeRestar && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setItemSeleccionado(item);
                          setAccionModal('RESTAURAR');
                        }}
                        className="text-green-600 hover:bg-green-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    )}

                    {puedeEliminarPermanente && item.estado === 'ELIMINADO' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setItemSeleccionado(item);
                          setAccionModal('ELIMINAR_PERMANENTE');
                        }}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal: Detalle del Item */}
      <Dialog open={modalDetalleAbierto} onOpenChange={setModalDetalleAbierto}>
        <DialogContent hideCloseButton className="!max-w-[500px] p-0">
          <DialogTitle className="sr-only">Detalle del Item Archivado</DialogTitle>
          <DialogDescription className="sr-only">Información completa del item archivado o eliminado</DialogDescription>

          <ModalHeaderClean
            titulo="Detalle del Item"
            subtitulo="Información completa"
            icono={Eye}
            colorIcono="blue"
            onClose={() => setModalDetalleAbierto(false)}
          />

          {itemSeleccionado && (
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Código</label>
                <p className="text-sm font-mono font-bold text-gray-900 mt-1">{itemSeleccionado.codigo}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Nombre</label>
                <p className="text-sm text-gray-900 mt-1">{itemSeleccionado.nombre}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Tipo</label>
                  <p className="text-sm text-gray-900 mt-1">{itemSeleccionado.tipo}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Estado</label>
                  <Badge
                    className={`mt-1 ${itemSeleccionado.estado === 'ARCHIVADO'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-red-100 text-red-700'
                      }`}
                  >
                    {itemSeleccionado.estado}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Fecha de Archivo/Eliminación</label>
                <p className="text-sm text-gray-900 mt-1">{formatearFecha(itemSeleccionado.fechaArchivado)}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Usuario</label>
                <p className="text-sm text-gray-900 mt-1">{itemSeleccionado.usuarioArchivo}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Motivo</label>
                <p className="text-sm text-gray-900 mt-1">{itemSeleccionado.motivoArchivo || 'Sin especificar'}</p>
              </div>

              {itemSeleccionado.metadatos && Object.keys(itemSeleccionado.metadatos).length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase mb-2 block">Información Adicional</label>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    {Object.entries(itemSeleccionado.metadatos).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-gray-600">{key}:</span>
                        <span className="text-gray-900 font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar Restaurar */}
      {accionModal === 'RESTAURAR' && itemSeleccionado && (
        <Dialog open={true} onOpenChange={() => setAccionModal(null)}>
          <DialogContent hideCloseButton className="!max-w-[450px] p-0">
            <DialogTitle className="sr-only">Confirmar Restauración</DialogTitle>
            <DialogDescription className="sr-only">Confirme que desea restaurar este item</DialogDescription>

            <ModalHeaderClean
              titulo="Restaurar Item"
              subtitulo="Confirmar acción"
              icono={RotateCcw}
              colorIcono="green"
              onClose={() => setAccionModal(null)}
            />

            <div className="px-6 pb-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">¿Restaurar este item?</h4>
                    <p className="text-sm text-green-800 mb-3">
                      El item será restaurado y volverá a estar activo en el módulo {moduloNombre}.
                    </p>
                    <div className="bg-white rounded p-3 space-y-1">
                      <p className="text-sm"><strong>Código:</strong> {itemSeleccionado.codigo}</p>
                      <p className="text-sm"><strong>Nombre:</strong> {itemSeleccionado.nombre}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setAccionModal(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={confirmarRestaurar}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Confirmar Eliminar Permanentemente */}
      {accionModal === 'ELIMINAR_PERMANENTE' && itemSeleccionado && (
        <Dialog open={true} onOpenChange={() => setAccionModal(null)}>
          <DialogContent hideCloseButton className="!max-w-[450px] p-0">
            <DialogTitle className="sr-only">Confirmar Eliminación Permanente</DialogTitle>
            <DialogDescription className="sr-only">Confirme que desea eliminar permanentemente este item</DialogDescription>

            <ModalHeaderClean
              titulo="Eliminar Permanentemente"
              subtitulo="¡Acción irreversible!"
              icono={AlertTriangle}
              colorIcono="red"
              onClose={() => setAccionModal(null)}
            />

            <div className="px-6 pb-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 mb-1">⚠️ Eliminar Permanentemente</h4>
                    <p className="text-sm text-red-800 mb-3">
                      Esta acción es <strong>IRREVERSIBLE</strong>. El item será eliminado permanentemente de la base de datos y no podrá ser recuperado.
                    </p>
                    <div className="bg-white rounded p-3 space-y-1">
                      <p className="text-sm"><strong>Código:</strong> {itemSeleccionado.codigo}</p>
                      <p className="text-sm"><strong>Nombre:</strong> {itemSeleccionado.nombre}</p>
                    </div>
                  </div>
                </div>
              </div>


              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setAccionModal(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={confirmarEliminarPermanente}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Permanentemente
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
