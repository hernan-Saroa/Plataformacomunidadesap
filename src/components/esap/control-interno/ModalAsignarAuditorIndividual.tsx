/**
 * ==============================================
 * MODAL ASIGNAR AUDITOR INDIVIDUAL
 * ==============================================
 * 
 * Modal para asignar o reasignar auditores a una auditoría específica
 * - Permite seleccionar Auditor Líder
 * - Permite seleccionar Auditor Asignado
 * - Muestra información del auditor seleccionado
 * - Validación de campos requeridos
 * - Búsqueda de auditores disponibles
 */

import { useState, useEffect } from 'react';
import { X, User, Search, CheckCircle, AlertCircle, Users, Award, Shield } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';

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
  auditorLider?: Persona;
  auditorAsignado?: Persona;
  auditorLiderId?: number;
  auditorAsignadoId?: number;
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
  idPersona?: number; // ID_TERCERO de auth.personas (para guardar en BD)
}

// DATOS MOCK de auditores disponibles
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

interface ModalAsignarAuditorIndividualProps {
  isOpen: boolean;
  onClose: () => void;
  auditoria: Auditoria | null;
  onAsignar: (auditoriaId: string, auditorLider: Persona, auditorAsignado: Persona) => void;
}

export function ModalAsignarAuditorIndividual({
  isOpen,
  onClose,
  auditoria,
  onAsignar
}: ModalAsignarAuditorIndividualProps) {
  const [auditorLiderSeleccionado, setAuditorLiderSeleccionado] = useState<AuditorDisponible | null>(null);
  const [auditorAsignadoSeleccionado, setAuditorAsignadoSeleccionado] = useState<AuditorDisponible | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [modoSeleccion, setModoSeleccion] = useState<'lider' | 'asignado' | null>(null);
  const [auditoresDisponibles, setAuditoresDisponibles] = useState<AuditorDisponible[]>([]);
  const [cargandoAuditores, setCargandoAuditores] = useState(false);

  // Cargar auditores disponibles desde el backend
  useEffect(() => {
    const cargarAuditoresDisponibles = async () => {
      try {
        setCargandoAuditores(true);
        const { auditoriasApi } = await import('./services/api');
        const response = await auditoriasApi.getPersonasDisponibles();

        if (response.success && response.data) {
          const personas = response.data;
          setAuditoresDisponibles(personas);
        } else {
          console.error('Error al cargar auditores disponibles:', response.error);
          toast.error('Error al cargar auditores disponibles', {
            description: response.error || 'No se pudieron cargar los auditores'
          });
          // Si falla, usar lista mock como fallback
          setAuditoresDisponibles(AUDITORES_DISPONIBLES);
        }
      } catch (error) {
        console.error('Error al cargar auditores:', error);
        // Si falla, usar lista mock como fallback
        setAuditoresDisponibles(AUDITORES_DISPONIBLES);
      } finally {
        setCargandoAuditores(false);
      }
    };

    if (isOpen) {
      cargarAuditoresDisponibles();
    }
  }, [isOpen]);

  // Cargar auditores actuales cuando se abre el modal y cuando los auditores disponibles estén cargados
  useEffect(() => {
    if (isOpen && auditoria && auditoresDisponibles.length > 0) {
      // Buscar el auditor líder actual en la lista de disponibles
      let liderActual = auditoresDisponibles.find(
        aud => aud.numeroIdentificacion === auditoria.auditorLider?.numeroIdentificacion
      );
      
      // Si no está en la lista, crear un objeto temporal con los datos reales
      if (!liderActual && auditoria.auditorLider) {
        liderActual = {
          id: `temp-${auditoria.auditorLider.numeroIdentificacion}`,
          nombre: auditoria.auditorLider.nombre,
          cargo: auditoria.auditorLider.cargo,
          iniciales: auditoria.auditorLider.iniciales,
          tipoIdentificacion: auditoria.auditorLider.tipoIdentificacion,
          numeroIdentificacion: auditoria.auditorLider.numeroIdentificacion,
          especialidad: 'No especificada',
          auditoriasConducto: 0,
          disponibilidad: 'Disponible',
          idPersona: auditoria.auditorLiderId // Preservar el ID numérico de la BD
        };
      }
      
      if (liderActual) {
        setAuditorLiderSeleccionado(liderActual);
      }

      // Buscar el auditor asignado actual en la lista de disponibles
      let asignadoActual = auditoresDisponibles.find(
        aud => aud.numeroIdentificacion === auditoria.auditorAsignado?.numeroIdentificacion
      );
      
      // Si no está en la lista, crear un objeto temporal con los datos reales
      if (!asignadoActual && auditoria.auditorAsignado) {
        asignadoActual = {
          id: `temp-${auditoria.auditorAsignado.numeroIdentificacion}`,
          nombre: auditoria.auditorAsignado.nombre,
          cargo: auditoria.auditorAsignado.cargo,
          iniciales: auditoria.auditorAsignado.iniciales,
          tipoIdentificacion: auditoria.auditorAsignado.tipoIdentificacion,
          numeroIdentificacion: auditoria.auditorAsignado.numeroIdentificacion,
          especialidad: 'No especificada',
          auditoriasConducto: 0,
          disponibilidad: 'Disponible',
          idPersona: auditoria.auditorAsignadoId // Preservar el ID numérico de la BD
        };
      }
      
      if (asignadoActual) {
        setAuditorAsignadoSeleccionado(asignadoActual);
      }
    }
  }, [isOpen, auditoria, auditoresDisponibles]);

  // Filtrar auditores disponibles según búsqueda
  const auditoresFiltrados = auditoresDisponibles.filter(auditor => {
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

    // Convertir AuditorDisponible a Persona
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

  if (!isOpen || !auditoria) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[111] p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200" style={{ background: 'linear-gradient(135deg, #1e5da8 0%, #2a6dbd 100%)' }}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">
                    Asignar Auditores
                  </h2>
                  <p className="text-sm text-white/80 mt-0.5">
                    {auditoria.codigo} - {auditoria.titulo}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-white/20 text-white border-white/30">
                  {auditoria.estado}
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30">
                  {auditoria.territorial}
                </Badge>
              </div>
            </div>
            <button
              onClick={handleCerrar}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Auditor Líder */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-gray-900">Auditor Líder</h3>
                  <span className="text-xs text-red-600">*</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModoSeleccion('lider')}
                  className="text-xs"
                >
                  <Search className="w-3 h-3 mr-1" />
                  Cambiar
                </Button>
              </div>

              {auditorLiderSeleccionado ? (
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 border-2 border-blue-400">
                      <AvatarFallback className="bg-blue-600 text-white font-bold">
                        {auditorLiderSeleccionado.iniciales}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">
                        {auditorLiderSeleccionado.nombre}
                      </p>
                      <p className="text-sm text-gray-600">
                        {auditorLiderSeleccionado.cargo}
                      </p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-500">
                          <span className="font-semibold">ID:</span> {auditorLiderSeleccionado.tipoIdentificacion} {auditorLiderSeleccionado.numeroIdentificacion}
                        </p>
                        <p className="text-xs text-gray-500">
                          <span className="font-semibold">Especialidad:</span> {auditorLiderSeleccionado.especialidad}
                        </p>
                        <p className="text-xs text-gray-500">
                          <span className="font-semibold">Auditorías en curso:</span> {auditorLiderSeleccionado.auditoriasConducto}
                        </p>
                      </div>
                      <Badge 
                        className={`mt-2 text-xs ${
                          auditorLiderSeleccionado.disponibilidad === 'Disponible' 
                            ? 'bg-green-100 text-green-800' 
                            : auditorLiderSeleccionado.disponibilidad === 'Parcial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {auditorLiderSeleccionado.disponibilidad}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No hay auditor líder asignado</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setModoSeleccion('lider')}
                    className="mt-3"
                  >
                    Seleccionar Auditor Líder
                  </Button>
                </div>
              )}
            </div>

            {/* Auditor Asignado */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-gray-900">Auditor Asignado</h3>
                  <span className="text-xs text-red-600">*</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModoSeleccion('asignado')}
                  className="text-xs"
                >
                  <Search className="w-3 h-3 mr-1" />
                  Cambiar
                </Button>
              </div>

              {auditorAsignadoSeleccionado ? (
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 border-2 border-green-400">
                      <AvatarFallback className="bg-green-600 text-white font-bold">
                        {auditorAsignadoSeleccionado.iniciales}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">
                        {auditorAsignadoSeleccionado.nombre}
                      </p>
                      <p className="text-sm text-gray-600">
                        {auditorAsignadoSeleccionado.cargo}
                      </p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-500">
                          <span className="font-semibold">ID:</span> {auditorAsignadoSeleccionado.tipoIdentificacion} {auditorAsignadoSeleccionado.numeroIdentificacion}
                        </p>
                        <p className="text-xs text-gray-500">
                          <span className="font-semibold">Especialidad:</span> {auditorAsignadoSeleccionado.especialidad}
                        </p>
                        <p className="text-xs text-gray-500">
                          <span className="font-semibold">Auditorías en curso:</span> {auditorAsignadoSeleccionado.auditoriasConducto}
                        </p>
                      </div>
                      <Badge 
                        className={`mt-2 text-xs ${
                          auditorAsignadoSeleccionado.disponibilidad === 'Disponible' 
                            ? 'bg-green-100 text-green-800' 
                            : auditorAsignadoSeleccionado.disponibilidad === 'Parcial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {auditorAsignadoSeleccionado.disponibilidad}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No hay auditor asignado</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setModoSeleccion('asignado')}
                    className="mt-3"
                  >
                    Seleccionar Auditor Asignado
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Panel de Selección de Auditores */}
          {modoSeleccion && (
            <div className="mt-6 p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">
                  Seleccionar {modoSeleccion === 'lider' ? 'Auditor Líder' : 'Auditor Asignado'}
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setModoSeleccion(null);
                    setBusqueda('');
                  }}
                >
                  Cancelar
                </Button>
              </div>

              {/* Buscador */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar por nombre, cargo, especialidad o documento..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Lista de Auditores */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {cargandoAuditores ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p className="text-sm text-gray-500">Cargando auditores disponibles...</p>
                  </div>
                ) : auditoresFiltrados.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No se encontraron auditores</p>
                  </div>
                ) : (
                  auditoresFiltrados.map((auditor) => (
                    <button
                      key={auditor.id}
                      onClick={() => handleSeleccionarAuditor(auditor)}
                      className="w-full p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                            {auditor.iniciales}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 truncate">
                                {auditor.nombre}
                              </p>
                              <p className="text-sm text-gray-600">
                                {auditor.cargo}
                              </p>
                            </div>
                            <Badge 
                              className={`text-xs flex-shrink-0 ${
                                auditor.disponibilidad === 'Disponible' 
                                  ? 'bg-green-100 text-green-800' 
                                  : auditor.disponibilidad === 'Parcial'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {auditor.disponibilidad}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                            <span>{auditor.tipoIdentificacion} {auditor.numeroIdentificacion}</span>
                            <span>•</span>
                            <span>{auditor.especialidad}</span>
                            <span>•</span>
                            <span>{auditor.auditoriasConducto} auditorías</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Mensajes de Validación */}
          {auditorLiderSeleccionado && auditorAsignadoSeleccionado && auditorLiderSeleccionado.id === auditorAsignadoSeleccionado.id && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Error de validación</p>
                <p className="text-xs text-red-700 mt-0.5">
                  El Auditor Líder y el Auditor Asignado no pueden ser la misma persona
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <AlertCircle className="w-4 h-4" />
              <span>Los campos marcados con * son obligatorios</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCerrar}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGuardar}
                style={{ background: '#1e5da8' }}
                className="text-white"
                disabled={
                  !auditorLiderSeleccionado || 
                  !auditorAsignadoSeleccionado || 
                  auditorLiderSeleccionado.id === auditorAsignadoSeleccionado.id
                }
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Guardar Asignación
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}