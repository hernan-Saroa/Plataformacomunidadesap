/**
 * ============================================
 * MODAL DE ASIGNACIÓN DE AUDITOR EN LOTE
 * ============================================
 * 
 * Modal para asignar auditor a múltiples auditorías.
 * 
 * CARACTERÍSTICAS:
 * 1. Búsqueda de auditores
 * 2. Lista de auditorías seleccionadas
 * 3. Preview de cambios
 * 4. Confirmación antes de aplicar
 * 5. Estados de carga
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Search, User, UserCheck, AlertCircle, CheckCircle, ChevronRight
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { LoadingSpinner } from '../../ui/loading-spinner';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

interface Auditor {
  id: string;
  nombre: string;
  cargo: string;
  iniciales: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA';
  numeroIdentificacion: string;
  especialidad: string;
  auditoriasCargadas: number;
  disponibilidad: 'Alta' | 'Media' | 'Baja';
}

interface AuditoriaResumen {
  id: string;
  codigo: string;
  titulo: string;
  auditorActual: string;
}

export interface ModalAsignarAuditorLoteProps {
  open: boolean;
  onClose: () => void;
  auditorias: AuditoriaResumen[];
  onAsignar: (auditorId: string) => Promise<void>;
}

// ============ DATOS MOCK DE AUDITORES ============

const AUDITORES_DISPONIBLES: Auditor[] = [
  {
    id: 'aud-001',
    nombre: 'Juan Pérez Gómez',
    cargo: 'Auditor Senior',
    iniciales: 'JP',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '80123456',
    especialidad: 'Gestión Administrativa',
    auditoriasCargadas: 3,
    disponibilidad: 'Media'
  },
  {
    id: 'aud-002',
    nombre: 'Ana María López Silva',
    cargo: 'Auditor Junior',
    iniciales: 'AL',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '52987654',
    especialidad: 'Gestión Financiera',
    auditoriasCargadas: 2,
    disponibilidad: 'Alta'
  },
  {
    id: 'aud-003',
    nombre: 'Roberto Torres Sánchez',
    cargo: 'Auditor Líder',
    iniciales: 'RT',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '79456789',
    especialidad: 'Gestión de Riesgos',
    auditoriasCargadas: 5,
    disponibilidad: 'Baja'
  },
  {
    id: 'aud-004',
    nombre: 'Diana Patricia López Vargas',
    cargo: 'Auditor Senior',
    iniciales: 'DL',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '52123456',
    especialidad: 'Sistemas de Información',
    auditoriasCargadas: 4,
    disponibilidad: 'Media'
  },
  {
    id: 'aud-005',
    nombre: 'Carlos Ramírez Díaz',
    cargo: 'Auditor Senior',
    iniciales: 'CR',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '94123456',
    especialidad: 'Recursos Humanos',
    auditoriasCargadas: 1,
    disponibilidad: 'Alta'
  },
  {
    id: 'aud-006',
    nombre: 'Sandra Montero Ruiz',
    cargo: 'Auditor Especialista TI',
    iniciales: 'SM',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '52345678',
    especialidad: 'Seguridad Informática',
    auditoriasCargadas: 2,
    disponibilidad: 'Alta'
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function ModalAsignarAuditorLote({
  open,
  onClose,
  auditorias,
  onAsignar
}: ModalAsignarAuditorLoteProps) {
  const [busqueda, setBusqueda] = useState('');
  const [auditorSeleccionado, setAuditorSeleccionado] = useState<Auditor | null>(null);
  const [cargando, setCargando] = useState(false);

  // Filtrar auditores
  const auditoresFiltrados = useMemo(() => {
    return AUDITORES_DISPONIBLES.filter(auditor =>
      auditor.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      auditor.cargo.toLowerCase().includes(busqueda.toLowerCase()) ||
      auditor.especialidad.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [busqueda]);

  // Manejar asignación
  const handleAsignar = async () => {
    if (!auditorSeleccionado) return;

    setCargando(true);
    try {
      await onAsignar(auditorSeleccionado.id);
      toast.success(
        `${auditorias.length} auditoría(s) asignada(s) a ${auditorSeleccionado.nombre}`
      );
      onClose();
    } catch (error) {
      toast.error('Error al asignar auditor');
    } finally {
      setCargando(false);
    }
  };

  // Resetear al cerrar
  const handleClose = () => {
    setBusqueda('');
    setAuditorSeleccionado(null);
    onClose();
  };

  const disponibilidadColor = {
    Alta: '#10b981',
    Media: '#f59e0b',
    Baja: '#ef4444'
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
            className="fixed inset-0 bg-black/60 z-50"
            onClick={handleClose}
          />

          {/* MODAL */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* HEADER */}
              <div 
                className="px-6 py-4 border-b flex items-center justify-between"
                style={{ background: '#F8FAFC' }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: '#E0EDFF' }}
                  >
                    <UserCheck className="w-5 h-5" style={{ color: '#003DA5' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black" style={{ color: '#003DA5' }}>
                      Asignar Auditor en Lote
                    </h2>
                    <p className="text-sm text-gray-600">
                      {auditorias.length} {auditorias.length === 1 ? 'auditoría seleccionada' : 'auditorías seleccionadas'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* CONTENIDO */}
              <div className="flex-1 overflow-hidden flex">
                {/* PANEL IZQUIERDO: SELECCIÓN DE AUDITOR */}
                <div className="flex-1 p-6 overflow-y-auto border-r">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-700 mb-2">
                      1. Selecciona un auditor
                    </h3>
                    
                    {/* Búsqueda */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Buscar por nombre, cargo o especialidad..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Lista de Auditores */}
                  <div className="space-y-2">
                    {auditoresFiltrados.map((auditor) => {
                      const isSelected = auditorSeleccionado?.id === auditor.id;

                      return (
                        <motion.div
                          key={auditor.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setAuditorSeleccionado(auditor)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <Avatar className="w-12 h-12">
                              <AvatarFallback
                                style={{
                                  background: isSelected ? '#003DA5' : '#E0EDFF',
                                  color: isSelected ? '#FFFFFF' : '#003DA5'
                                }}
                              >
                                {auditor.iniciales}
                              </AvatarFallback>
                            </Avatar>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-sm text-gray-900 truncate">
                                    {auditor.nombre}
                                  </h4>
                                  <p className="text-xs text-gray-600">
                                    {auditor.cargo}
                                  </p>
                                </div>
                                {isSelected && (
                                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                )}
                              </div>

                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {auditor.especialidad}
                                </Badge>
                                <Badge
                                  className="text-xs"
                                  style={{
                                    backgroundColor: `${disponibilidadColor[auditor.disponibilidad]}20`,
                                    color: disponibilidadColor[auditor.disponibilidad],
                                    borderColor: disponibilidadColor[auditor.disponibilidad]
                                  }}
                                >
                                  {auditor.disponibilidad} disponibilidad
                                </Badge>
                              </div>

                              <p className="text-xs text-gray-500">
                                {auditor.tipoIdentificacion} {auditor.numeroIdentificacion} • {auditor.auditoriasCargadas} auditorías activas
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}

                    {auditoresFiltrados.length === 0 && (
                      <div className="text-center py-8">
                        <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          No se encontraron auditores
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* PANEL DERECHO: PREVIEW */}
                <div className="w-96 p-6 bg-gray-50 overflow-y-auto">
                  <h3 className="text-sm font-bold text-gray-700 mb-4">
                    2. Verifica los cambios
                  </h3>

                  {auditorSeleccionado ? (
                    <div className="space-y-4">
                      {/* Auditor Seleccionado */}
                      <div className="bg-white rounded-lg border-2 border-blue-200 p-4">
                        <p className="text-xs text-gray-500 mb-2">Auditor a asignar:</p>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback style={{ background: '#003DA5', color: '#FFFFFF' }}>
                              {auditorSeleccionado.iniciales}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-sm text-gray-900">
                              {auditorSeleccionado.nombre}
                            </p>
                            <p className="text-xs text-gray-600">
                              {auditorSeleccionado.cargo}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Advertencia si tiene muchas auditorías */}
                      {auditorSeleccionado.auditoriasCargadas >= 4 && (
                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
                          <p className="text-xs text-yellow-800 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            Este auditor ya tiene {auditorSeleccionado.auditoriasCargadas} auditorías activas. Considera su carga de trabajo.
                          </p>
                        </div>
                      )}

                      {/* Lista de auditorías afectadas */}
                      <div>
                        <p className="text-xs font-bold text-gray-700 mb-2">
                          Auditorías que se asignarán ({auditorias.length}):
                        </p>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {auditorias.map((auditoria) => (
                            <div
                              key={auditoria.id}
                              className="bg-white rounded-lg border border-gray-200 p-3"
                            >
                              <div className="flex items-start gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {auditoria.codigo}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-900 font-medium line-clamp-2 mb-2">
                                {auditoria.titulo}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{auditoria.auditorActual}</span>
                                <ChevronRight className="w-3 h-3" />
                                <span className="font-bold text-blue-600">
                                  {auditorSeleccionado.nombre}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        Selecciona un auditor de la lista
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* FOOTER */}
              <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {auditorSeleccionado
                    ? `Se asignarán ${auditorias.length} auditoría(s) a ${auditorSeleccionado.nombre}`
                    : 'Selecciona un auditor para continuar'}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleClose} disabled={cargando}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAsignar}
                    disabled={!auditorSeleccionado || cargando}
                    style={{ background: '#003DA5' }}
                    className="text-white gap-2"
                  >
                    {cargando ? (
                      <>
                        <LoadingSpinner size="xs" color="white" />
                        Asignando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Asignar auditor
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}