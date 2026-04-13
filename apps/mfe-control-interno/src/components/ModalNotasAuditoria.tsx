/**
 * ============================================
 * MODAL DE NOTAS DE AUDITORÍA - COMPLETO
 * ============================================
 * 
 * Componente modal para gestionar notas y observaciones
 * de auditorías con editor completo.
 * 
 * FUNCIONALIDADES:
 * 1. Agregar nueva nota
 * 2. Ver historial de notas
 * 3. Editar notas propias
 * 4. Eliminar notas (con confirmación)
 * 5. Categorización de notas
 * 6. Búsqueda y filtrado
 * 7. Marcado de notas importantes
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Plus, Edit2, Trash2, Save, XCircle, MessageSquare,
  FileText, Calendar, User, Tag, Search, Filter, Star,
  StarOff, Clock, CheckCircle
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { toast } from 'sonner';
import { ConfirmationDialog } from '../../ui/confirmation-dialog';
import { auditoriasApi } from './services/api';
import { authService } from '../../../services/api/authService';
import { Permissions } from '../../../enums/permissions';

// ============ TIPOS ============

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
}

interface Nota {
  id: string;
  auditoriaId: string;
  contenido: string;
  categoria: CategoriaNota;
  autor?: string;
  autorNombre?: string;
  cargoAutor?: string;
  autorCargo?: string;
  fecha: string | Date;
  hora: string;
  importante: boolean;
  editada: boolean;
  fechaEdicion?: string | Date;
}

type CategoriaNota = 
  | 'General'
  | 'Hallazgo'
  | 'Seguimiento'
  | 'Evidencia'
  | 'Observación'
  | 'Recomendación';

interface ModalNotasProps {
  auditoria: Auditoria | null;
  open: boolean;
  onClose: () => void;
}

// ============ UTILIDADES ============

const formatearFecha = (fecha: string | Date) => {
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  if (isNaN(fechaObj.getTime())) {
    return 'Fecha inválida';
  }
  return fechaObj.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const getCategoriaColor = (categoria: CategoriaNota) => {
  const colores = {
    'General': 'bg-gray-100 text-gray-700 border-gray-200',
    'Hallazgo': 'bg-red-100 text-red-700 border-red-200',
    'Seguimiento': 'bg-blue-100 text-blue-700 border-blue-200',
    'Evidencia': 'bg-purple-100 text-purple-700 border-purple-200',
    'Observación': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Recomendación': 'bg-green-100 text-green-700 border-green-200'
  };
  return colores[categoria];
};

const getCategoriaIcon = (categoria: CategoriaNota) => {
  const iconos = {
    'General': <MessageSquare className="w-4 h-4" />,
    'Hallazgo': <XCircle className="w-4 h-4" />,
    'Seguimiento': <CheckCircle className="w-4 h-4" />,
    'Evidencia': <FileText className="w-4 h-4" />,
    'Observación': <Tag className="w-4 h-4" />,
    'Recomendación': <Star className="w-4 h-4" />
  };
  return iconos[categoria];
};

// ============ COMPONENTE PRINCIPAL ============

export function ModalNotasAuditoria({ auditoria, open, onClose }: ModalNotasProps) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [notaEditando, setNotaEditando] = useState<string | null>(null);
  const [nuevaNota, setNuevaNota] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaNota>('General');
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaNota | 'Todas'>('Todas');
  const [soloImportantes, setSoloImportantes] = useState(false);
  const [mostrarConfirmEliminar, setMostrarConfirmEliminar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Cargar notas desde la BD cuando se abre el modal
  useEffect(() => {
    if (auditoria && open) {
      cargarNotas();
    } else {
      // Limpiar notas al cerrar
      setNotas([]);
    }
  }, [auditoria, open]);

  const cargarNotas = async () => {
    if (!auditoria) return;
    
    setLoading(true);
    try {
      const response = await auditoriasApi.getNotas(auditoria.id);
      if (response.success && response.data) {
        // Mapear datos del backend al formato del componente
        const notasMapeadas: Nota[] = response.data.map((nota: any) => {
          // Manejar fecha: puede venir como string o Date
          let fecha: string | Date = nota.fecha;
          if (typeof fecha === 'string' && fecha.includes('T')) {
            // Si viene como ISO string, convertir a Date
            fecha = new Date(fecha);
          } else if (typeof fecha === 'string') {
            // Si viene como YYYY-MM-DD, mantener como string
            fecha = fecha;
          }

          // Manejar fechaEdicion
          let fechaEdicion: string | Date | undefined = nota.fechaEdicion;
          if (fechaEdicion && typeof fechaEdicion === 'string' && fechaEdicion.includes('T')) {
            fechaEdicion = new Date(fechaEdicion);
          }

          return {
            id: nota.id,
            auditoriaId: nota.auditoriaId,
            contenido: nota.contenido,
            categoria: nota.categoria,
            autor: nota.autorNombre || nota.autor || 'Usuario Desconocido',
            cargoAutor: nota.autorCargo || nota.cargoAutor || 'Auditor',
            fecha: fecha,
            hora: nota.hora || '00:00',
            importante: nota.importante || false,
            editada: nota.editada || false,
            fechaEdicion: fechaEdicion,
          };
        });
        setNotas(notasMapeadas);
      } else {
        toast.error('Error al cargar notas', {
          description: response.error || 'No se pudieron cargar las notas',
        });
        setNotas([]);
      }
    } catch (error) {
      console.error('Error al cargar notas:', error);
      toast.error('Error al cargar notas', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
      setNotas([]);
    } finally {
      setLoading(false);
    }
  };

  if (!auditoria) return null;

  // Usuario actual (TODO: Obtener del contexto de autenticación)
  const usuarioActual = 'Juan Pérez Gómez';

  // Filtrar notas
  const notasFiltradas = notas.filter(nota => {
    const autorNombre = nota.autor || nota.autorNombre || '';
    const cumpleBusqueda = nota.contenido.toLowerCase().includes(busqueda.toLowerCase()) ||
                          autorNombre.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleCategoria = filtroCategoria === 'Todas' || nota.categoria === filtroCategoria;
    const cumpleImportante = !soloImportantes || nota.importante;
    
    return cumpleBusqueda && cumpleCategoria && cumpleImportante;
  });

  // Handlers
  const handleAgregarNota = async () => {
    if (!nuevaNota.trim() || nuevaNota.trim().length < 10) {
      toast.error('El contenido de la nota debe tener al menos 10 caracteres');
      return;
    }

    if (!auditoria) return;

    setGuardando(true);
    try {
      const response = await auditoriasApi.createNota(auditoria.id, {
        contenido: nuevaNota,
        categoria: categoriaSeleccionada,
        importante: false,
      });

      console.log('[handleAgregarNota] Response completa:', response);
      console.log('[handleAgregarNota] response.success:', response.success);
      console.log('[handleAgregarNota] response.data:', response.data);

      if (response.success) {
        // El backend puede devolver la nota directamente o dentro de data
        const notaData = response.data;
        if (!notaData) {
          // Si no hay data, recargar las notas desde el servidor
          await cargarNotas();
          setNuevaNota('');
          setCategoriaSeleccionada('General');
          setModoEdicion(false);
          toast.success('Nota agregada exitosamente');
          return;
        }

        const notaNueva: Nota = {
          id: notaData.id,
          auditoriaId: notaData.auditoriaId,
          contenido: notaData.contenido,
          categoria: notaData.categoria,
          autor: notaData.autorNombre || notaData.autor || 'Usuario Desconocido',
          cargoAutor: notaData.autorCargo || notaData.cargoAutor || 'Auditor',
          fecha: notaData.fecha,
          hora: notaData.hora || new Date().toTimeString().slice(0, 5),
          importante: notaData.importante || false,
          editada: false,
        };
        setNotas([notaNueva, ...notas]);
        setNuevaNota('');
        setCategoriaSeleccionada('General');
        setModoEdicion(false);
        toast.success('Nota agregada exitosamente');
      } else {
        throw new Error(response.error || 'Error al crear la nota');
      }
    } catch (error) {
      console.error('Error al agregar nota:', error);
      toast.error('Error al agregar nota', {
        description: error instanceof Error ? error.message : 'No se pudo guardar la nota',
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleImportante = async (notaId: string) => {
    if (!auditoria) return;

    try {
      const response = await auditoriasApi.toggleImportanteNota(auditoria.id, notaId);
      if (response.success && response.data) {
        setNotas(notas.map(nota =>
          nota.id === notaId
            ? { ...nota, importante: response.data.importante }
            : nota
        ));
        toast.success('Nota actualizada');
      } else {
        throw new Error(response.error || 'Error al actualizar la nota');
      }
    } catch (error) {
      console.error('Error al actualizar nota:', error);
      toast.error('Error al actualizar nota', {
        description: error instanceof Error ? error.message : 'No se pudo actualizar la nota',
      });
    }
  };

  const handleEliminarNota = async (notaId: string) => {
    if (!auditoria) return;

    try {
      const response = await auditoriasApi.deleteNota(auditoria.id, notaId);
      if (response.success) {
        setNotas(notas.filter(nota => nota.id !== notaId));
        setMostrarConfirmEliminar(null);
        toast.success('Nota eliminada');
      } else {
        throw new Error(response.error || 'Error al eliminar la nota');
      }
    } catch (error) {
      console.error('Error al eliminar nota:', error);
      toast.error('Error al eliminar nota', {
        description: error instanceof Error ? error.message : 'No se pudo eliminar la nota',
      });
    }
  };

  const handleEditarNota = async (notaId: string, nuevoContenido: string) => {
    if (!nuevoContenido.trim()) {
      toast.error('El contenido no puede estar vacío');
      return;
    }

    if (!auditoria) return;

    setGuardando(true);
    try {
      const notaOriginal = notas.find(n => n.id === notaId);
      if (!notaOriginal) return;

      const response = await auditoriasApi.updateNota(auditoria.id, notaId, {
        contenido: nuevoContenido,
        categoria: notaOriginal.categoria,
      });

      if (response.success && response.data) {
        setNotas(notas.map(nota =>
          nota.id === notaId
            ? {
                ...nota,
                contenido: response.data.contenido,
                editada: response.data.editada || true,
                fechaEdicion: response.data.fechaEdicion,
              }
            : nota
        ));
        setNotaEditando(null);
        toast.success('Nota actualizada');
      } else {
        throw new Error(response.error || 'Error al actualizar la nota');
      }
    } catch (error) {
      console.error('Error al editar nota:', error);
      toast.error('Error al editar nota', {
        description: error instanceof Error ? error.message : 'No se pudo actualizar la nota',
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelarEdicion = () => {
    setModoEdicion(false);
    setNuevaNota('');
    setCategoriaSeleccionada('General');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[110]"
            onClick={onClose}
          />

          {/* MODAL */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[111] w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] lg:w-full lg:max-w-5xl max-h-[90vh]"
          >
            <div className="bg-white rounded-lg shadow-2xl w-full h-full max-h-[90vh] flex flex-col">
              {/* HEADER */}
              <div className="flex items-start justify-between p-6 border-b border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="w-6 h-6" style={{ color: '#003DA5' }} />
                    <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                      Notas y Observaciones
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="text-sm font-mono">
                      {auditoria.codigo}
                    </Badge>
                    <span className="text-sm text-gray-600">{auditoria.titulo}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="ml-4"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* TOOLBAR */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col lg:flex-row gap-3">
                  {/* Búsqueda */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar en notas..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Filtro de categoría */}
                  <select
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value as CategoriaNota | 'Todas')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Todas">Todas las categorías</option>
                    <option value="General">General</option>
                    <option value="Hallazgo">Hallazgo</option>
                    <option value="Seguimiento">Seguimiento</option>
                    <option value="Evidencia">Evidencia</option>
                    <option value="Observación">Observación</option>
                    <option value="Recomendación">Recomendación</option>
                  </select>

                  {/* Filtro importantes */}
                  <Button
                    variant={soloImportantes ? 'default' : 'outline'}
                    onClick={() => setSoloImportantes(!soloImportantes)}
                    className="gap-2"
                  >
                    <Star className="w-4 h-4" />
                    Importantes
                  </Button>

                  {/* Botón nueva nota */}
                  {authService.hasPermission(Permissions.CONTROL_INTERNO_AUDITORIA_NOTAS_CREATE) && (
                  <Button
                    onClick={() => {
                      setModoEdicion(true);
                      setNuevaNota('');
                      setCategoriaSeleccionada('General');
                    }}
                    style={{ backgroundColor: modoEdicion ? '#6B7280' : '#003DA5' }}
                    className="text-white gap-2"
                    disabled={modoEdicion}
                  >
                    <Plus className="w-4 h-4" />
                    {modoEdicion ? 'Agregando nota...' : 'Nueva Nota'}
                  </Button>
                  )}
                </div>

                {/* Contador de resultados */}
                {busqueda && (
                  <p className="text-xs text-gray-600 mt-2">
                    {notasFiltradas.length} resultado{notasFiltradas.length !== 1 ? 's' : ''} encontrado{notasFiltradas.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* FORMULARIO NUEVA NOTA */}
              <AnimatePresence>
                {modoEdicion && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-b border-gray-200"
                  >
                    <div className="p-4 bg-blue-50 max-h-[50vh] overflow-y-auto">
                      <h3 className="font-bold text-sm mb-3 sticky top-0 bg-blue-50 pb-2" style={{ color: '#003DA5' }}>
                        Nueva Nota
                      </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelarEdicion}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                    <div className="space-y-4 bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      {/* Categoría */}
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                          Categoría <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={categoriaSeleccionada}
                          onChange={(e) => setCategoriaSeleccionada(e.target.value as CategoriaNota)}
                          disabled={guardando}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                        >
                          <option value="General">General</option>
                          <option value="Hallazgo">Hallazgo</option>
                          <option value="Seguimiento">Seguimiento</option>
                          <option value="Evidencia">Evidencia</option>
                          <option value="Observación">Observación</option>
                          <option value="Recomendación">Recomendación</option>
                        </select>
                      </div>

                      {/* Contenido */}
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                          Contenido <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={nuevaNota}
                          onChange={(e) => setNuevaNota(e.target.value)}
                          placeholder="Escriba aquí el contenido de la nota..."
                          rows={5}
                          disabled={guardando}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-500">
                            {nuevaNota.length} caracteres
                          </p>
                        </div>

                        {/* Botones - Sticky en mobile */}
                        <div className="flex gap-2 justify-end pt-2 pb-1 sticky bottom-0 bg-blue-50">
                          <Button
                            variant="outline"
                            onClick={handleCancelarEdicion}
                            className="min-w-[90px]"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleAgregarNota}
                            style={{ backgroundColor: '#003DA5' }}
                            className="text-white gap-2 min-w-[120px]"
                            disabled={!nuevaNota.trim()}
                          >
                            <Save className="w-4 h-4" />
                            <span className="hidden sm:inline">Guardar Nota</span>
                            <span className="sm:hidden">Guardar</span>
                          </Button>
                        </div>
                      </div>

                      {/* Botones */}
                      <div className="flex gap-3 justify-end pt-2 border-t border-gray-200">
                        <Button
                          variant="outline"
                          onClick={handleCancelarEdicion}
                          disabled={guardando}
                          className="min-w-[100px]"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleAgregarNota}
                          style={{ backgroundColor: '#003DA5' }}
                          className="text-white gap-2 min-w-[140px]"
                          disabled={!nuevaNota.trim() || nuevaNota.trim().length < 10 || guardando}
                        >
                          {guardando ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              Guardando...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Guardar Nota
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* LISTADO DE NOTAS */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Cargando notas...</p>
                  </div>
                ) : notasFiltradas.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">
                      {busqueda || filtroCategoria !== 'Todas' || soloImportantes
                        ? 'No se encontraron notas con los filtros aplicados'
                        : 'No hay notas registradas para esta auditoría'}
                    </p>
                    {!modoEdicion && (
                      <Button
                        onClick={() => setModoEdicion(true)}
                        variant="outline"
                        className="mt-4"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar primera nota
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notasFiltradas.map((nota) => {
                      const autorNombre = nota.autor || nota.autorNombre || 'Usuario Desconocido';
                      const cargoAutor = nota.cargoAutor || nota.autorCargo || 'Auditor';
                      const esPropia = autorNombre === usuarioActual; // TODO: Comparar con ID real del usuario
                      const estaEditando = notaEditando === nota.id;

                      return (
                        <motion.div
                          key={nota.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`bg-white rounded-lg border-2 p-4 ${
                            nota.importante 
                              ? 'border-yellow-300 bg-yellow-50' 
                              : 'border-gray-200'
                          }`}
                        >
                          {/* Header de la nota */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge 
                                className={`${getCategoriaColor(nota.categoria)} flex items-center gap-1`}
                                variant="outline"
                              >
                                {getCategoriaIcon(nota.categoria)}
                                {nota.categoria}
                              </Badge>
                              {nota.importante && (
                                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-current" />
                                  Importante
                                </Badge>
                              )}
                              {nota.editada && (
                                <Badge variant="outline" className="text-xs text-gray-500">
                                  Editada
                                </Badge>
                              )}
                            </div>

                            <div className="flex gap-1">
                              {/* Marcar como importante */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleImportante(nota.id)}
                                title={nota.importante ? 'Desmarcar importante' : 'Marcar como importante'}
                              >
                                {nota.importante ? (
                                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                ) : (
                                  <StarOff className="w-4 h-4" />
                                )}
                              </Button>

                              {/* Editar (solo notas propias) */}
                              {esPropia && !estaEditando && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setNotaEditando(nota.id)}
                                  title="Editar nota"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Eliminar (solo notas propias) */}
                              {esPropia && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setMostrarConfirmEliminar(nota.id)}
                                  title="Eliminar nota"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Contenido de la nota */}
                          {estaEditando ? (
                            <div className="space-y-2">
                              <textarea
                                defaultValue={nota.contenido}
                                id={`edit-${nota.id}`}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                              />
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setNotaEditando(null)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  style={{ backgroundColor: '#003DA5' }}
                                  className="text-white"
                                  disabled={guardando}
                                  onClick={() => {
                                    const textarea = document.getElementById(`edit-${nota.id}`) as HTMLTextAreaElement;
                                    handleEditarNota(nota.id, textarea.value);
                                  }}
                                >
                                  {guardando ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                      Guardando...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3 h-3 mr-1" />
                                      Guardar
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-700 mb-3 whitespace-pre-line">
                              {nota.contenido}
                            </p>
                          )}

                          {/* Footer de la nota */}
                          <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span className="font-medium">{autorNombre}</span>
                                <span className="text-gray-400">({cargoAutor})</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatearFecha(nota.fecha)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {nota.hora}
                              </span>
                            </div>
                            {nota.editada && nota.fechaEdicion && (
                              <span className="text-gray-400 italic">
                                Editada el {formatearFecha(nota.fechaEdicion)}
                              </span>
                            )}
                          </div>

                          {/* Confirmación de eliminación */}
                          {mostrarConfirmEliminar === nota.id && (
                            <ConfirmationDialog
                              open={true}
                              onClose={() => setMostrarConfirmEliminar(null)}
                              onConfirm={() => handleEliminarNota(nota.id)}
                              title="¿Eliminar esta nota?"
                              description="Esta acción no se puede deshacer. La nota será eliminada permanentemente del sistema."
                              confirmText="Sí, eliminar"
                              cancelText="Cancelar"
                              variant="danger"
                            />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-600">
                  {notasFiltradas.length} nota{notasFiltradas.length !== 1 ? 's' : ''} 
                  {filtroCategoria !== 'Todas' && ` en categoría ${filtroCategoria}`}
                </div>
                <Button variant="outline" onClick={onClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}