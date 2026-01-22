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
import { toast } from 'sonner@2.0.3';
import { ConfirmationDialog } from '../../ui/confirmation-dialog';

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
  autor: string;
  cargoAutor: string;
  fecha: string;
  hora: string;
  importante: boolean;
  editada: boolean;
  fechaEdicion?: string;
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

// ============ DATOS MOCK ============

const NOTAS_MOCK: Record<string, Nota[]> = {
  'aud-001': [
    {
      id: 'nota-001',
      auditoriaId: 'aud-001',
      contenido: 'Se realizó reunión de apertura con el equipo territorial. Todos los participantes confirmaron disponibilidad para las fechas programadas.',
      categoria: 'General',
      autor: 'Juan Pérez Gómez',
      cargoAutor: 'Auditor Senior',
      fecha: '2025-01-05',
      hora: '09:30',
      importante: false,
      editada: false
    },
    {
      id: 'nota-002',
      auditoriaId: 'aud-001',
      contenido: 'Se identificó faltante en la documentación del proceso de contratación del Q4 2024. Se solicitó al área responsable enviar los documentos faltantes antes del 10 de enero.',
      categoria: 'Hallazgo',
      autor: 'Ana María López Silva',
      cargoAutor: 'Auditor Junior',
      fecha: '2025-01-08',
      hora: '14:20',
      importante: true,
      editada: false
    },
    {
      id: 'nota-003',
      auditoriaId: 'aud-001',
      contenido: 'Revisar normativa actualizada sobre gestión documental según Ley 594 de 2000 y Decreto 1080 de 2015.',
      categoria: 'Recomendación',
      autor: 'Juan Pérez Gómez',
      cargoAutor: 'Auditor Senior',
      fecha: '2025-01-10',
      hora: '11:15',
      importante: false,
      editada: false
    },
    {
      id: 'nota-004',
      auditoriaId: 'aud-001',
      contenido: 'Se recibieron los documentos faltantes. Se procede a validar su contenido y conformidad.',
      categoria: 'Seguimiento',
      autor: 'Ana María López Silva',
      cargoAutor: 'Auditor Junior',
      fecha: '2025-01-12',
      hora: '10:45',
      importante: false,
      editada: true,
      fechaEdicion: '2025-01-12 16:30'
    }
  ],
  'aud-004': [
    {
      id: 'nota-005',
      auditoriaId: 'aud-004',
      contenido: 'Reunión de apertura realizada. Se presentó el equipo auditor y se explicó el alcance de la auditoría al Director de Recursos Humanos.',
      categoria: 'General',
      autor: 'Carlos Ramírez Díaz',
      cargoAutor: 'Auditor Senior',
      fecha: '2025-01-08',
      hora: '09:00',
      importante: false,
      editada: false
    },
    {
      id: 'nota-006',
      auditoriaId: 'aud-004',
      contenido: 'CRÍTICO: Se detectó que el 45% de las evaluaciones de desempeño del 2024 no se realizaron dentro del plazo establecido por la normativa.',
      categoria: 'Hallazgo',
      autor: 'Carlos Ramírez Díaz',
      cargoAutor: 'Auditor Senior',
      fecha: '2025-01-10',
      hora: '15:30',
      importante: true,
      editada: false
    },
    {
      id: 'nota-007',
      auditoriaId: 'aud-004',
      contenido: 'Se solicitó al área de Gestión Humana el plan de capacitación para 2025 y el informe de ejecución del plan 2024.',
      categoria: 'Observación',
      autor: 'Patricia Gómez Silva',
      cargoAutor: 'Auditor',
      fecha: '2025-01-12',
      hora: '11:20',
      importante: false,
      editada: false
    },
    {
      id: 'nota-008',
      auditoriaId: 'aud-004',
      contenido: 'Se revisaron 150 hojas de vida y se encontraron inconsistencias en 12 de ellas (8%). Principalmente falta de documentos de soporte de estudios.',
      categoria: 'Evidencia',
      autor: 'Patricia Gómez Silva',
      cargoAutor: 'Auditor',
      fecha: '2025-01-14',
      hora: '16:45',
      importante: true,
      editada: false
    },
    {
      id: 'nota-009',
      auditoriaId: 'aud-004',
      contenido: 'Recomendar implementar un sistema de alertas automáticas para evaluaciones de desempeño pendientes.',
      categoria: 'Recomendación',
      autor: 'Carlos Ramírez Díaz',
      cargoAutor: 'Auditor Senior',
      fecha: '2025-01-15',
      hora: '10:00',
      importante: false,
      editada: false
    },
    {
      id: 'nota-010',
      auditoriaId: 'aud-004',
      contenido: 'El área de Gestión Humana presentó el cronograma de recuperación de evaluaciones pendientes. Se realizará seguimiento quincenal.',
      categoria: 'Seguimiento',
      autor: 'Carlos Ramírez Díaz',
      cargoAutor: 'Auditor Senior',
      fecha: '2025-01-18',
      hora: '14:30',
      importante: false,
      editada: false
    }
  ]
};

// ============ UTILIDADES ============

const formatearFecha = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-CO', {
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

  // Cargar notas cuando se abre el modal
  useEffect(() => {
    if (auditoria && open) {
      setNotas(NOTAS_MOCK[auditoria.id] || []);
    }
  }, [auditoria, open]);

  if (!auditoria) return null;

  // Usuario actual (mock)
  const usuarioActual = 'Juan Pérez Gómez';

  // Filtrar notas
  const notasFiltradas = notas.filter(nota => {
    const cumpleBusqueda = nota.contenido.toLowerCase().includes(busqueda.toLowerCase()) ||
                          nota.autor.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleCategoria = filtroCategoria === 'Todas' || nota.categoria === filtroCategoria;
    const cumpleImportante = !soloImportantes || nota.importante;
    
    return cumpleBusqueda && cumpleCategoria && cumpleImportante;
  });

  // Handlers
  const handleAgregarNota = () => {
    if (!nuevaNota.trim()) {
      toast.error('El contenido de la nota no puede estar vacío');
      return;
    }

    const ahora = new Date();
    const nota: Nota = {
      id: `nota-${Date.now()}`,
      auditoriaId: auditoria.id,
      contenido: nuevaNota,
      categoria: categoriaSeleccionada,
      autor: usuarioActual,
      cargoAutor: 'Auditor Senior',
      fecha: ahora.toISOString().split('T')[0],
      hora: ahora.toTimeString().slice(0, 5),
      importante: false,
      editada: false
    };

    setNotas([nota, ...notas]);
    setNuevaNota('');
    setCategoriaSeleccionada('General');
    setModoEdicion(false);
    toast.success('Nota agregada exitosamente');
  };

  const handleToggleImportante = (notaId: string) => {
    setNotas(notas.map(nota =>
      nota.id === notaId
        ? { ...nota, importante: !nota.importante }
        : nota
    ));
    toast.success('Nota actualizada');
  };

  const handleEliminarNota = (notaId: string) => {
    setNotas(notas.filter(nota => nota.id !== notaId));
    setMostrarConfirmEliminar(null);
    toast.success('Nota eliminada');
  };

  const handleEditarNota = (notaId: string, nuevoContenido: string) => {
    if (!nuevoContenido.trim()) {
      toast.error('El contenido no puede estar vacío');
      return;
    }

    const ahora = new Date();
    setNotas(notas.map(nota =>
      nota.id === notaId
        ? {
            ...nota,
            contenido: nuevoContenido,
            editada: true,
            fechaEdicion: `${ahora.toISOString().split('T')[0]} ${ahora.toTimeString().slice(0, 5)}`
          }
        : nota
    ));
    setNotaEditando(null);
    toast.success('Nota actualizada');
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
                  <Button
                    onClick={() => setModoEdicion(true)}
                    style={{ backgroundColor: '#003DA5' }}
                    className="text-white gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Nota
                  </Button>
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
                      
                      <div className="space-y-3">
                        {/* Categoría */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">
                            Categoría <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={categoriaSeleccionada}
                            onChange={(e) => setCategoriaSeleccionada(e.target.value as CategoriaNota)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                          <label className="text-sm font-medium text-gray-700 block mb-1">
                            Contenido <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={nuevaNota}
                            onChange={(e) => setNuevaNota(e.target.value)}
                            placeholder="Escriba aquí el contenido de la nota..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">
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
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* LISTADO DE NOTAS */}
              <div className="flex-1 overflow-y-auto p-6">
                {notasFiltradas.length === 0 ? (
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
                      const esPropia = nota.autor === usuarioActual;
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
                                  onClick={() => {
                                    const textarea = document.getElementById(`edit-${nota.id}`) as HTMLTextAreaElement;
                                    handleEditarNota(nota.id, textarea.value);
                                  }}
                                >
                                  <Save className="w-3 h-3 mr-1" />
                                  Guardar
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
                                <span className="font-medium">{nota.autor}</span>
                                <span className="text-gray-400">({nota.cargoAutor})</span>
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
                                Editada el {nota.fechaEdicion}
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