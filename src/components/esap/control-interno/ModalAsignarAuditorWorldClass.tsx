/**
 * ============================================
 * ASIGNAR AUDITORES - WORLD CLASS
 * ============================================
 * 
 * Modal para asignar auditores a una auditoría
 * Usa ModalWorldClass como base + diseño corporativo ESAP
 * 
 * FUNCIONALIDADES:
 * - Selección de Auditor Líder
 * - Selección de Auditor Asignado
 * - Búsqueda de auditores disponibles
 * - Validación en tiempo real
 * - Información detallada de auditores
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Enero 2025
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Search, CheckCircle, AlertCircle, Award, Shield,
  User, X, Info, Sparkles
} from 'lucide-react';
import { ModalWorldClass } from './ModalWorldClass';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

interface Persona {
  nombre: string;
  cargo: string;
  iniciales: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA';
  numeroIdentificacion: string;
}

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
  estado: string;
  territorial: string;
  auditorLider: Persona;
  auditorAsignado: Persona;
}

interface AuditorDisponible {
  id: string;
  nombre: string;
  cargo: string;
  iniciales: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA';
  numeroIdentificacion: string;
  especialidad: string;
  auditoriasConducto: number;
  disponibilidad: 'Disponible' | 'Parcial' | 'No disponible';
}

interface ModalAsignarAuditorProps {
  isOpen: boolean;
  onClose: () => void;
  auditoria: Auditoria | null;
  onAsignar: (auditoriaId: string, auditorLider: Persona, auditorAsignado: Persona) => void;
}

// ============ DATOS MOCK ============

const AUDITORES_DISPONIBLES: AuditorDisponible[] = [
  {
    id: 'aud-001',
    nombre: 'Juan Pérez Gómez',
    cargo: 'Auditor Senior',
    iniciales: 'JP',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '80123456',
    especialidad: 'Gestión Administrativa',
    auditoriasConducto: 5,
    disponibilidad: 'Disponible'
  },
  {
    id: 'aud-002',
    nombre: 'Ana María López Silva',
    cargo: 'Auditor Junior',
    iniciales: 'AL',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '52987654',
    especialidad: 'Procesos Financieros',
    auditoriasConducto: 3,
    disponibilidad: 'Disponible'
  },
  {
    id: 'aud-003',
    nombre: 'Roberto Torres Sánchez',
    cargo: 'Auditor Líder',
    iniciales: 'RT',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '79456789',
    especialidad: 'Auditoría Financiera',
    auditoriasConducto: 8,
    disponibilidad: 'Parcial'
  },
  {
    id: 'aud-004',
    nombre: 'Diana Patricia López Vargas',
    cargo: 'Auditor Senior',
    iniciales: 'DL',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '52123456',
    especialidad: 'Control Interno',
    auditoriasConducto: 6,
    disponibilidad: 'Disponible'
  },
  {
    id: 'aud-005',
    nombre: 'Sandra Montero Ruiz',
    cargo: 'Auditor Especialista TI',
    iniciales: 'SM',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '52345678',
    especialidad: 'Seguridad Informática',
    auditoriasConducto: 4,
    disponibilidad: 'Disponible'
  },
  {
    id: 'aud-006',
    nombre: 'Mario Bernal Castro',
    cargo: 'Auditor TI',
    iniciales: 'MB',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '80987654',
    especialidad: 'Sistemas de Información',
    auditoriasConducto: 2,
    disponibilidad: 'Disponible'
  },
  {
    id: 'aud-007',
    nombre: 'Carlos Ramírez Díaz',
    cargo: 'Auditor Senior',
    iniciales: 'CR',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '94123456',
    especialidad: 'Recursos Humanos',
    auditoriasConducto: 7,
    disponibilidad: 'Parcial'
  },
  {
    id: 'aud-008',
    nombre: 'Patricia González Martínez',
    cargo: 'Auditor Junior',
    iniciales: 'PG',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '1094567890',
    especialidad: 'Procesos Académicos',
    auditoriasConducto: 1,
    disponibilidad: 'Disponible'
  }
];

// ============ COMPONENTES AUXILIARES ============

interface AuditorCardProps {
  auditor: AuditorDisponible;
  tipo: 'lider' | 'asignado';
  onCambiar: () => void;
}

function AuditorCard({ auditor, tipo, onCambiar }: AuditorCardProps) {
  const colorScheme = tipo === 'lider' 
    ? { bg: 'bg-blue-50', border: 'border-blue-200', avatar: 'bg-blue-600', text: 'text-blue-700' }
    : { bg: 'bg-green-50', border: 'border-green-200', avatar: 'bg-green-600', text: 'text-green-700' };

  const disponibilidadColor = 
    auditor.disponibilidad === 'Disponible' ? 'bg-green-100 text-green-800 border-green-300' :
    auditor.disponibilidad === 'Parcial' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
    'bg-red-100 text-red-800 border-red-300';

  return (
    <div className={`p-4 ${colorScheme.bg} border-2 ${colorScheme.border} rounded-lg`}>
      <div className="flex items-start gap-3">
        {/* Avatar circular */}
        <div className={`w-12 h-12 ${colorScheme.avatar} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
          {auditor.iniciales}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{auditor.nombre}</p>
              <p className="text-sm text-gray-600">{auditor.cargo}</p>
            </div>
            <button
              onClick={onCambiar}
              className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs transition-colors flex items-center gap-1 flex-shrink-0"
            >
              <Search className="w-3 h-3" />
              Cambiar
            </button>
          </div>
          
          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-gray-600">
              <span className="font-semibold">ID:</span> {auditor.tipoIdentificacion} {auditor.numeroIdentificacion}
            </p>
            <p className="text-xs text-gray-600">
              <span className="font-semibold">Especialidad:</span> {auditor.especialidad}
            </p>
            <p className="text-xs text-gray-600">
              <span className="font-semibold">Auditorías en curso:</span> {auditor.auditoriasConducto}
            </p>
          </div>
          
          <div className="mt-3">
            <span className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium ${disponibilidadColor}`}>
              {auditor.disponibilidad}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EmptyAuditorCardProps {
  tipo: 'lider' | 'asignado';
  onSeleccionar: () => void;
}

function EmptyAuditorCard({ tipo, onSeleccionar }: EmptyAuditorCardProps) {
  const titulo = tipo === 'lider' ? 'Auditor Líder' : 'Auditor Asignado';
  
  return (
    <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
      <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
      <p className="text-sm text-gray-500 mb-3">No hay {titulo.toLowerCase()} asignado</p>
      <button
        onClick={onSeleccionar}
        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors"
      >
        Seleccionar {titulo}
      </button>
    </div>
  );
}

interface AuditorListItemProps {
  auditor: AuditorDisponible;
  onSelect: () => void;
}

function AuditorListItem({ auditor, onSelect }: AuditorListItemProps) {
  const disponibilidadColor = 
    auditor.disponibilidad === 'Disponible' ? 'bg-green-100 text-green-800 border-green-300' :
    auditor.disponibilidad === 'Parcial' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
    'bg-red-100 text-red-800 border-red-300';

  return (
    <button
      onClick={onSelect}
      className="w-full p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {auditor.iniciales}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                {auditor.nombre}
              </p>
              <p className="text-sm text-gray-600">{auditor.cargo}</p>
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium flex-shrink-0 ${disponibilidadColor}`}>
              {auditor.disponibilidad}
            </span>
          </div>
          <div className="mt-2 flex items-center flex-wrap gap-2 text-xs text-gray-500">
            <span>{auditor.tipoIdentificacion} {auditor.numeroIdentificacion}</span>
            <span>•</span>
            <span>{auditor.especialidad}</span>
            <span>•</span>
            <span>{auditor.auditoriasConducto} auditorías</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ============ COMPONENTE PRINCIPAL ============

export function ModalAsignarAuditorWorldClass({
  isOpen,
  onClose,
  auditoria,
  onAsignar
}: ModalAsignarAuditorProps) {
  const [auditorLiderSeleccionado, setAuditorLiderSeleccionado] = useState<AuditorDisponible | null>(null);
  const [auditorAsignadoSeleccionado, setAuditorAsignadoSeleccionado] = useState<AuditorDisponible | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [modoSeleccion, setModoSeleccion] = useState<'lider' | 'asignado' | null>(null);

  // Cargar auditores actuales cuando se abre el modal
  useEffect(() => {
    if (isOpen && auditoria) {
      const liderActual = AUDITORES_DISPONIBLES.find(
        aud => aud.numeroIdentificacion === auditoria.auditorLider.numeroIdentificacion
      );
      if (liderActual) {
        setAuditorLiderSeleccionado(liderActual);
      }

      const asignadoActual = AUDITORES_DISPONIBLES.find(
        aud => aud.numeroIdentificacion === auditoria.auditorAsignado.numeroIdentificacion
      );
      if (asignadoActual) {
        setAuditorAsignadoSeleccionado(asignadoActual);
      }
    }
  }, [isOpen, auditoria]);

  // Filtrar auditores según búsqueda
  const auditoresFiltrados = AUDITORES_DISPONIBLES.filter(auditor => {
    if (!busqueda.trim()) return true;
    const searchTerm = busqueda.toLowerCase();
    return (
      auditor.nombre.toLowerCase().includes(searchTerm) ||
      auditor.cargo.toLowerCase().includes(searchTerm) ||
      auditor.especialidad.toLowerCase().includes(searchTerm) ||
      auditor.numeroIdentificacion.includes(searchTerm)
    );
  });

  const handleSeleccionarAuditor = (auditor: AuditorDisponible) => {
    if (modoSeleccion === 'lider') {
      setAuditorLiderSeleccionado(auditor);
      toast.success('Auditor Líder seleccionado', {
        description: `${auditor.nombre} - ${auditor.cargo}`
      });
    } else if (modoSeleccion === 'asignado') {
      setAuditorAsignadoSeleccionado(auditor);
      toast.success('Auditor Asignado seleccionado', {
        description: `${auditor.nombre} - ${auditor.cargo}`
      });
    }
    setModoSeleccion(null);
    setBusqueda('');
  };

  const handleGuardar = () => {
    // Validación
    if (!auditorLiderSeleccionado) {
      toast.error('Error de validación', {
        description: 'Debe seleccionar un Auditor Líder'
      });
      return;
    }

    if (!auditorAsignadoSeleccionado) {
      toast.error('Error de validación', {
        description: 'Debe seleccionar un Auditor Asignado'
      });
      return;
    }

    if (auditorLiderSeleccionado.id === auditorAsignadoSeleccionado.id) {
      toast.error('Error de validación', {
        description: 'El Auditor Líder y el Auditor Asignado no pueden ser la misma persona'
      });
      return;
    }

    if (!auditoria) return;

    // Convertir a Persona
    const lider: Persona = {
      nombre: auditorLiderSeleccionado.nombre,
      cargo: auditorLiderSeleccionado.cargo,
      iniciales: auditorLiderSeleccionado.iniciales,
      tipoIdentificacion: auditorLiderSeleccionado.tipoIdentificacion,
      numeroIdentificacion: auditorLiderSeleccionado.numeroIdentificacion
    };

    const asignado: Persona = {
      nombre: auditorAsignadoSeleccionado.nombre,
      cargo: auditorAsignadoSeleccionado.cargo,
      iniciales: auditorAsignadoSeleccionado.iniciales,
      tipoIdentificacion: auditorAsignadoSeleccionado.tipoIdentificacion,
      numeroIdentificacion: auditorAsignadoSeleccionado.numeroIdentificacion
    };

    onAsignar(auditoria.id, lider, asignado);
    handleCerrar();
  };

  const handleCerrar = () => {
    setAuditorLiderSeleccionado(null);
    setAuditorAsignadoSeleccionado(null);
    setBusqueda('');
    setModoSeleccion(null);
    onClose();
  };

  if (!auditoria) return null;

  // Validar si hay error de misma persona
  const errorMismaPersona = auditorLiderSeleccionado && auditorAsignadoSeleccionado && 
    auditorLiderSeleccionado.id === auditorAsignadoSeleccionado.id;

  // Badges dinámicos
  const badges = [
    { label: auditoria.estado, variant: 'info' as const },
    { label: auditoria.territorial, variant: 'default' as const }
  ];

  if (auditorLiderSeleccionado && auditorAsignadoSeleccionado && !errorMismaPersona) {
    badges.push({
      label: 'Listo para guardar',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      variant: 'success' as const
    });
  }

  return (
    <ModalWorldClass
      isOpen={isOpen}
      onClose={handleCerrar}
      titulo="Asignar Auditores"
      codigo={auditoria.codigo}
      subtitulo={auditoria.titulo}
      icono={<Users className="w-6 h-6" />}
      badges={badges}
      size="xl"
      closeOnOverlay={false}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4" />
            <span>Ambos auditores son obligatorios y deben ser diferentes</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCerrar}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={!auditorLiderSeleccionado || !auditorAsignadoSeleccionado || errorMismaPersona}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Guardar Asignación
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Grid de Auditores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Auditor Líder */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Auditor Líder</h3>
              <span className="text-xs text-red-600">*</span>
            </div>
            
            {auditorLiderSeleccionado ? (
              <AuditorCard
                auditor={auditorLiderSeleccionado}
                tipo="lider"
                onCambiar={() => setModoSeleccion('lider')}
              />
            ) : (
              <EmptyAuditorCard
                tipo="lider"
                onSeleccionar={() => setModoSeleccion('lider')}
              />
            )}
          </div>

          {/* Auditor Asignado */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-gray-900">Auditor Asignado</h3>
              <span className="text-xs text-red-600">*</span>
            </div>
            
            {auditorAsignadoSeleccionado ? (
              <AuditorCard
                auditor={auditorAsignadoSeleccionado}
                tipo="asignado"
                onCambiar={() => setModoSeleccion('asignado')}
              />
            ) : (
              <EmptyAuditorCard
                tipo="asignado"
                onSeleccionar={() => setModoSeleccion('asignado')}
              />
            )}
          </div>
        </div>

        {/* Panel de Selección */}
        <AnimatePresence>
          {modoSeleccion && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-gray-50 border-2 border-gray-300 rounded-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-600" />
                  Seleccionar {modoSeleccion === 'lider' ? 'Auditor Líder' : 'Auditor Asignado'}
                </h3>
                <button
                  onClick={() => {
                    setModoSeleccion(null);
                    setBusqueda('');
                  }}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Buscador */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, cargo, especialidad o documento..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Lista de Auditores */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {auditoresFiltrados.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No se encontraron auditores</p>
                  </div>
                ) : (
                  auditoresFiltrados.map((auditor) => (
                    <AuditorListItem
                      key={auditor.id}
                      auditor={auditor}
                      onSelect={() => handleSeleccionarAuditor(auditor)}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mensaje de Error de Validación */}
        <AnimatePresence>
          {errorMismaPersona && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Error de validación</p>
                <p className="text-xs text-red-700 mt-0.5">
                  El Auditor Líder y el Auditor Asignado no pueden ser la misma persona
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ModalWorldClass>
  );
}
