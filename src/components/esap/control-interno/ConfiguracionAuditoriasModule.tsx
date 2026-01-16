/**
 * ============================================
 * CONFIGURACIÓN AUDITORÍAS - MÓDULO INDEPENDIENTE
 * ============================================
 * 
 * Tipos, listas y parámetros de auditoría:
 * - Tipos de Auditoría (5 tipos principales)
 * - Listas de Chequeo (plantillas de verificación)
 * 
 * ÚLTIMA ACTUALIZACIÓN: 4 Enero 2026 - FUNCIONALIDAD COMPLETA
 * ✅ CRUD completo de tipos de auditoría
 * ✅ CRUD completo de listas de chequeo
 * ✅ Guardar cambios con confirmación
 * ✅ Modales de edición y creación
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target, CheckSquare, List, ChevronRight, Info, Save,
  Plus, Edit, Eye, Clock, Users, HelpCircle, X, Trash2, AlertCircle,
  FileText, Check, GripVertical, Loader
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { toast } from 'sonner@2.0.3';
import {
  cargarTiposAuditoria,
  crearTipoAuditoria,
  actualizarTipoAuditoria,
  eliminarTipoAuditoria,
  mapearTipoAuditoriaBackendAFrontend,
  mapearTipoAuditoriaFrontendABackend
} from './services/tiposAuditoriaService';
import {
  cargarListasChequeo,
  crearListaChequeo,
  actualizarListaChequeo,
  eliminarListaChequeo,
  mapearListaChequeoBackendAFrontend,
  mapearListaChequeoFrontendABackend
} from './services/listasChequeoService';

// ====================================
// TIPOS
// ====================================

type TabActiva = 'tipos' | 'listas';

interface TabConfig {
  id: TabActiva;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  badge?: number;
}

// TABS_CONFIG se actualizará dinámicamente

// ====================================
// DATOS MOCK
// ====================================

interface TipoAuditoria {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  alcance: string;
  duracionPromedio: number;
  equipoPromedio: number;
  color: string;
  activa: boolean;
  auditoriasProgramadas: number;
}

interface ItemChequeo {
  id: string;
  texto: string;
  categoria: string;
  obligatorio: boolean;
}

interface ListaChequeo {
  id: string;
  nombre: string;
  tipoAuditoria: string;
  descripcion: string;
  items: ItemChequeo[];
  activa: boolean;
  usosProgramados: number;
  fechaCreacion: string;
  ultimaActualizacion: string;
}

const TIPOS_AUDITORIA_INICIAL: TipoAuditoria[] = [
  {
    id: 'tipo-001',
    codigo: 'AUD-REG',
    nombre: 'Regular',
    descripcion: 'Auditoría de tipo regular',
    alcance: 'Procesos administrativos, académicos y financieros',
    duracionPromedio: 30,
    equipoPromedio: 3,
    color: '#3B82F6',
    activa: true,
    auditoriasProgramadas: 8
  },
  {
    id: 'tipo-002',
    codigo: 'AUD-TERR',
    nombre: 'Territorial',
    descripcion: 'Auditoría a sedes territoriales',
    alcance: 'Procesos de territoriales',
    duracionPromedio: 45,
    equipoPromedio: 4,
    color: '#10B981',
    activa: true,
    auditoriasProgramadas: 4
  },
  {
    id: 'tipo-003',
    codigo: 'AUD-ESP',
    nombre: 'Especial',
    descripcion: 'Auditoría de tipo especial',
    alcance: 'Procesos específicos según requiera',
    duracionPromedio: 20,
    equipoPromedio: 2,
    color: '#F59E0B',
    activa: true,
    auditoriasProgramadas: 12
  }
];

const LISTAS_CHEQUEO_INICIAL: ListaChequeo[] = [
  {
    id: 'lista-001',
    nombre: 'Lista de Chequeo #1',
    tipoAuditoria: 'Regular',
    descripcion: 'Verificación de procesos administrativos',
    items: [
      { id: 'item-1', texto: '¿Existe documentación de procesos?', categoria: 'Documentación', obligatorio: true },
      { id: 'item-2', texto: '¿Se cumplen los tiempos establecidos?', categoria: 'Cumplimiento', obligatorio: true },
      { id: 'item-3', texto: '¿Hay registro de actividades?', categoria: 'Control', obligatorio: false }
    ],
    activa: true,
    usosProgramados: 3,
    fechaCreacion: '2025-01-01',
    ultimaActualizacion: '2025-01-04'
  },
  {
    id: 'lista-002',
    nombre: 'Lista de Chequeo #2',
    tipoAuditoria: 'Regular',
    descripcion: 'Control de calidad en servicios',
    items: [
      { id: 'item-4', texto: '¿Se miden indicadores de calidad?', categoria: 'Medición', obligatorio: true },
      { id: 'item-5', texto: '¿Existe plan de mejora?', categoria: 'Mejora', obligatorio: true }
    ],
    activa: true,
    usosProgramados: 2,
    fechaCreacion: '2025-01-02',
    ultimaActualizacion: '2025-01-03'
  },
  {
    id: 'lista-003',
    nombre: 'Lista de Chequeo #3',
    tipoAuditoria: 'Territorial',
    descripcion: 'Revisión de recursos humanos',
    items: [
      { id: 'item-6', texto: '¿Personal capacitado?', categoria: 'Capacitación', obligatorio: true },
      { id: 'item-7', texto: '¿Evaluaciones periódicas?', categoria: 'Evaluación', obligatorio: true }
    ],
    activa: true,
    usosProgramados: 1,
    fechaCreacion: '2024-12-28',
    ultimaActualizacion: '2025-01-02'
  },
  {
    id: 'lista-004',
    nombre: 'Lista de Chequeo #4',
    tipoAuditoria: 'Especial',
    descripcion: 'Verificación financiera básica',
    items: [
      { id: 'item-8', texto: '¿Presupuesto documentado?', categoria: 'Financiero', obligatorio: true }
    ],
    activa: true,
    usosProgramados: 0,
    fechaCreacion: '2024-12-20',
    ultimaActualizacion: '2024-12-30'
  },
  {
    id: 'lista-005',
    nombre: 'Lista de Chequeo #5',
    tipoAuditoria: 'Regular',
    descripcion: 'Control de inventarios',
    items: [
      { id: 'item-9', texto: '¿Inventario actualizado?', categoria: 'Inventario', obligatorio: true }
    ],
    activa: true,
    usosProgramados: 4,
    fechaCreacion: '2024-12-15',
    ultimaActualizacion: '2024-12-29'
  },
  {
    id: 'lista-006',
    nombre: 'Lista de Chequeo #6',
    tipoAuditoria: 'Regular',
    descripcion: 'Seguridad y salud en el trabajo',
    items: [
      { id: 'item-10', texto: '¿Plan de emergencias?', categoria: 'Seguridad', obligatorio: true }
    ],
    activa: true,
    usosProgramados: 2,
    fechaCreacion: '2024-12-10',
    ultimaActualizacion: '2024-12-28'
  },
  {
    id: 'lista-007',
    nombre: 'Lista de Chequeo #7',
    tipoAuditoria: 'Territorial',
    descripcion: 'Gestión documental',
    items: [
      { id: 'item-11', texto: '¿Sistema de archivo adecuado?', categoria: 'Documental', obligatorio: true }
    ],
    activa: true,
    usosProgramados: 1,
    fechaCreacion: '2024-12-05',
    ultimaActualizacion: '2024-12-27'
  },
  {
    id: 'lista-008',
    nombre: 'Lista de Chequeo #8',
    tipoAuditoria: 'Regular',
    descripcion: 'Atención al usuario',
    items: [
      { id: 'item-12', texto: '¿Protocolo de atención definido?', categoria: 'Servicio', obligatorio: true }
    ],
    activa: true,
    usosProgramados: 3,
    fechaCreacion: '2024-12-01',
    ultimaActualizacion: '2024-12-26'
  }
];

const COLORES_DISPONIBLES = [
  { valor: '#3B82F6', nombre: 'Azul' },
  { valor: '#10B981', nombre: 'Verde' },
  { valor: '#F59E0B', nombre: 'Naranja' },
  { valor: '#8B5CF6', nombre: 'Morado' },
  { valor: '#EC4899', nombre: 'Rosa' },
  { valor: '#EF4444', nombre: 'Rojo' },
  { valor: '#14B8A6', nombre: 'Turquesa' },
  { valor: '#F97316', nombre: 'Naranja Oscuro' }
];

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export function ConfiguracionAuditoriasModule() {
  const [tabActiva, setTabActiva] = useState<TabActiva>('listas'); // Cambio a 'listas' por defecto
  const [tipos, setTipos] = useState<TipoAuditoria[]>([]);
  const [listas, setListas] = useState<ListaChequeo[]>([]);
  const [cambiosSinGuardar, setCambiosSinGuardar] = useState(false);
  const [cargandoTipos, setCargandoTipos] = useState(true);
  const [cargandoListas, setCargandoListas] = useState(true);

  // Cargar datos desde el backend
  useEffect(() => {
    async function cargarDatos() {
      setCargandoTipos(true);
      setCargandoListas(true);
      try {
        // Cargar tipos de auditoría
        const tiposCargados = await cargarTiposAuditoria();
        const tiposMapeados = tiposCargados.map(mapearTipoAuditoriaBackendAFrontend);
        setTipos(tiposMapeados);

        // Cargar listas de chequeo
        const listasCargadas = await cargarListasChequeo();
        setListas(listasCargadas);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setCargandoTipos(false);
        setCargandoListas(false);
      }
    }
    cargarDatos();
  }, []);

  const handleGuardarCambios = () => {
    // Los cambios ya se guardan automáticamente, este botón ya no es necesario
    // pero lo mantenemos por compatibilidad con el UI
    toast.success('✅ Todos los cambios están guardados', {
      description: `Hay ${tipos.length} tipos y ${listas.length} listas de chequeo`
    });
    setCambiosSinGuardar(false);
  };

  const handleActualizarTipos = (nuevosTipos: TipoAuditoria[]) => {
    // Esta función se mantiene para compatibilidad, pero los cambios ya se guardan automáticamente
    setTipos(nuevosTipos);
    setCambiosSinGuardar(false);
  };

  const handleActualizarListas = (nuevasListas: ListaChequeo[]) => {
    setListas(nuevasListas);
    setCambiosSinGuardar(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="max-w-[1600px] mx-auto p-6">
        
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#059669] to-[#047857] rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Configuración de Auditorías
                </h1>
                <p className="text-sm text-gray-600">
                  Tipos, listas y parámetros de auditoría
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {cambiosSinGuardar && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-orange-600 text-sm"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Cambios sin guardar</span>
                </motion.div>
              )}
              <Button 
                onClick={handleGuardarCambios} 
                style={{ background: '#003DA5' }}
                disabled={!cambiosSinGuardar}
                className={!cambiosSinGuardar ? 'opacity-50 cursor-not-allowed' : ''}
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-2 mt-6">
            {[
              {
                id: 'tipos' as TabActiva,
                label: 'Tipos de Auditoría',
                description: 'Regular, Territorial, Especial',
                icon: CheckSquare,
                color: '#10B981',
                badge: tipos.length
              },
              {
                id: 'listas' as TabActiva,
                label: 'Listas de Chequeo',
                description: 'Plantillas de verificación estándar',
                icon: List,
                color: '#3B82F6',
                badge: listas.length
              }
            ].map((tab) => {
              const isActive = tabActiva === tab.id;
              const Icon = tab.icon;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setTabActiva(tab.id)}
                  className={`
                    relative flex items-center gap-3 px-5 py-3 rounded-xl transition-all flex-1
                    ${isActive ? 'bg-white shadow-lg ring-2 ring-[#003DA5]/20' : 'hover:bg-white/50'}
                  `}
                  whileHover={{ y: -2 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r rounded-xl opacity-5"
                      style={{ background: `linear-gradient(135deg, ${tab.color}20, ${tab.color}10)` }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div
                    className="relative p-2 rounded-lg"
                    style={{ background: isActive ? `${tab.color}15` : 'transparent' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: isActive ? tab.color : '#6B7280' }} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className={`font-semibold text-sm ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                      {tab.label}
                    </span>
                    <p className="text-xs text-gray-500">{tab.description}</p>
                  </div>
                  {tab.badge && (
                    <Badge variant={isActive ? 'default' : 'outline'} className="text-xs">{tab.badge}</Badge>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* CONTENIDO */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tabActiva}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {tabActiva === 'tipos' && (
              <SeccionTiposAuditoria 
                tipos={tipos} 
                onActualizar={handleActualizarTipos}
              />
            )}
            {tabActiva === 'listas' && (
              <SeccionListasChequeo 
                listas={listas}
                onActualizar={handleActualizarListas}
                tiposAuditoria={tipos}
                cargandoListas={cargandoListas}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ====================================
// SECCIÓN TIPOS DE AUDITORÍA
// ====================================

interface SeccionTiposAuditoriaProps {
  tipos: TipoAuditoria[];
  onActualizar: (tipos: TipoAuditoria[]) => void;
  cargandoTipos?: boolean;
}

function SeccionTiposAuditoria({ tipos, onActualizar, cargandoTipos }: SeccionTiposAuditoriaProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoEditando, setTipoEditando] = useState<TipoAuditoria | null>(null);

  const handleNuevoTipo = () => {
    setTipoEditando(null);
    setModalAbierto(true);
  };

  const handleEditarTipo = (tipo: TipoAuditoria) => {
    setTipoEditando(tipo);
    setModalAbierto(true);
  };

  const handleGuardarTipo = async (tipoNuevo: TipoAuditoria) => {
    const datosBackend = mapearTipoAuditoriaFrontendABackend(tipoNuevo);
    
    if (tipoEditando) {
      // Actualizar tipo existente
      const tipoActualizado = await actualizarTipoAuditoria(tipoEditando.id, datosBackend);
      if (tipoActualizado) {
        const tipoMapeado = mapearTipoAuditoriaBackendAFrontend(tipoActualizado);
        const tiposActualizados = tipos.map(t => 
          t.id === tipoEditando.id ? tipoMapeado : t
        );
        onActualizar(tiposActualizados);
      }
    } else {
      // Crear nuevo tipo
      const nuevoTipo = await crearTipoAuditoria(datosBackend);
      if (nuevoTipo) {
        const tipoMapeado = mapearTipoAuditoriaBackendAFrontend(nuevoTipo);
        onActualizar([...tipos, tipoMapeado]);
      }
    }
    
    if (tipoEditando || !tipos.find(t => t.id === tipoNuevo.id)) {
      setModalAbierto(false);
      setTipoEditando(null);
    }
  };

  const handleEliminarTipo = async (tipoId: string) => {
    const tipo = tipos.find(t => t.id === tipoId);
    if (tipo && tipo.auditoriasProgramadas > 0) {
      toast.error('❌ No se puede eliminar un tipo con auditorías programadas', {
        description: `Este tipo tiene ${tipo.auditoriasProgramadas} auditorías asociadas`
      });
      return;
    }

    const eliminado = await eliminarTipoAuditoria(tipoId);
    if (eliminado) {
      onActualizar(tipos.filter(t => t.id !== tipoId));
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Tipos de Auditoría</h3>
            <p className="text-sm text-gray-600 mt-1">Gestiona los tipos de auditoría disponibles</p>
          </div>
          <Button onClick={handleNuevoTipo} style={{ background: '#003DA5' }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Tipo
          </Button>
        </div>

        {cargandoTipos ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Cargando tipos de auditoría...</span>
          </div>
        ) : tipos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No hay tipos de auditoría configurados</p>
            <p className="text-sm mt-2">Haz clic en "Nuevo Tipo" para crear uno</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tipos.map((tipo) => (
              <motion.div
                key={tipo.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 border-2 rounded-xl"
                style={{
                  borderColor: tipo.activa ? tipo.color : '#E5E7EB',
                  background: tipo.activa ? tipo.color + '10' : '#F9FAFB'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Badge variant="outline" className="mb-2" style={{ background: tipo.color + '20', color: tipo.color, border: 'none' }}>
                      {tipo.codigo}
                    </Badge>
                    <h4 className="font-bold text-gray-900">{tipo.nombre}</h4>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditarTipo(tipo)}
                      title="Editar tipo"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEliminarTipo(tipo.id)}
                      title="Eliminar tipo"
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{tipo.descripcion}</p>
                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>{tipo.duracionPromedio} días</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Users className="w-3 h-3" />
                    <span>{tipo.equipoPromedio} personas</span>
                  </div>
                </div>
                {tipo.auditoriasProgramadas > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      {tipo.auditoriasProgramadas} auditorías programadas
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      <AnimatePresence>
        {modalAbierto && (
          <ModalTipoAuditoria
            tipo={tipoEditando}
            onGuardar={handleGuardarTipo}
            onCerrar={() => {
              setModalAbierto(false);
              setTipoEditando(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ====================================
// MODAL TIPO DE AUDITORÍA
// ====================================

interface ModalTipoAuditoriaProps {
  tipo: TipoAuditoria | null;
  onGuardar: (tipo: TipoAuditoria) => void;
  onCerrar: () => void;
}

function ModalTipoAuditoria({ tipo, onGuardar, onCerrar }: ModalTipoAuditoriaProps) {
  const [formData, setFormData] = useState<TipoAuditoria>(
    tipo || {
      id: '',
      codigo: '',
      nombre: '',
      descripcion: '',
      alcance: '',
      duracionPromedio: 30,
      equipoPromedio: 3,
      color: '#3B82F6',
      activa: true,
      auditoriasProgramadas: 0
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.codigo.trim() || !formData.nombre.trim()) {
      toast.error('❌ Completa los campos obligatorios');
      return;
    }

    onGuardar(formData);
  };

  const handleChange = (field: keyof TipoAuditoria, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {tipo ? 'Editar Tipo de Auditoría' : 'Nuevo Tipo de Auditoría'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {tipo ? 'Modifica los datos del tipo de auditoría' : 'Crea un nuevo tipo de auditoría'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onCerrar}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código * <span className="text-xs text-gray-500">(ej: AUD-GEST)</span>
              </label>
              <Input
                value={formData.codigo}
                onChange={(e) => handleChange('codigo', e.target.value.toUpperCase())}
                placeholder="AUD-GEST"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex gap-2">
                {COLORES_DISPONIBLES.map(color => (
                  <button
                    key={color.valor}
                    type="button"
                    onClick={() => handleChange('color', color.valor)}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      formData.color === color.valor 
                        ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ background: color.valor }}
                    title={color.nombre}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Tipo *
            </label>
            <Input
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Regular"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              placeholder="Evaluación de la eficiencia y eficacia de los procesos..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alcance
            </label>
            <textarea
              value={formData.alcance}
              onChange={(e) => handleChange('alcance', e.target.value)}
              placeholder="Procesos administrativos, académicos y financieros..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duración Promedio (días)
              </label>
              <Input
                type="number"
                value={formData.duracionPromedio}
                onChange={(e) => handleChange('duracionPromedio', parseInt(e.target.value))}
                min="1"
                max="365"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Equipo Promedio (personas)
              </label>
              <Input
                type="number"
                value={formData.equipoPromedio}
                onChange={(e) => handleChange('equipoPromedio', parseInt(e.target.value))}
                min="1"
                max="20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activa"
              checked={formData.activa}
              onChange={(e) => handleChange('activa', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="activa" className="text-sm text-gray-700">
              Tipo activo (disponible para auditorías)
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onCerrar}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              style={{ background: '#003DA5' }}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {tipo ? 'Actualizar' : 'Crear Tipo'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ====================================
// SECCIÓN LISTAS DE CHEQUEO
// ====================================

interface SeccionListasChequeoProps {
  listas: ListaChequeo[];
  onActualizar: (listas: ListaChequeo[]) => void;
  cargandoListas?: boolean;
  tiposAuditoria: TipoAuditoria[];
}

function SeccionListasChequeo({ listas, onActualizar, cargandoListas, tiposAuditoria }: SeccionListasChequeoProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [listaEditando, setListaEditando] = useState<ListaChequeo | null>(null);
  const [modalVistaAbierto, setModalVistaAbierto] = useState(false);
  const [listaViendo, setListaViendo] = useState<ListaChequeo | null>(null);

  const handleNuevaLista = () => {
    setListaEditando(null);
    setModalAbierto(true);
  };

  const handleVerLista = (lista: ListaChequeo) => {
    setListaViendo(lista);
    setModalVistaAbierto(true);
  };

  const handleEditarLista = (lista: ListaChequeo) => {
    setListaEditando(lista);
    setModalAbierto(true);
  };

  const handleGuardarLista = async (listaNueva: ListaChequeo) => {
    const datosBackend = mapearListaChequeoFrontendABackend(listaNueva);
    
    if (listaEditando) {
      // Actualizar lista existente
      const listaActualizada = await actualizarListaChequeo(listaEditando.id, datosBackend);
      if (listaActualizada) {
        const listasActualizadas = listas.map(l => 
          l.id === listaEditando.id ? listaActualizada : l
        );
        onActualizar(listasActualizadas);
      }
    } else {
      // Crear nueva lista
      const nuevaLista = await crearListaChequeo(datosBackend);
      if (nuevaLista) {
        onActualizar([...listas, nuevaLista]);
      }
    }
    
    if (listaEditando || !listas.find(l => l.id === listaNueva.id)) {
      setModalAbierto(false);
      setListaEditando(null);
    }
  };

  const handleEliminarLista = async (listaId: string) => {
    const lista = listas.find(l => l.id === listaId);
    if (lista && lista.usosProgramados > 0) {
      toast.error('❌ No se puede eliminar una lista con usos programados', {
        description: `Esta lista tiene ${lista.usosProgramados} usos programados`
      });
      return;
    }

    const eliminado = await eliminarListaChequeo(listaId);
    if (eliminado) {
      onActualizar(listas.filter(l => l.id !== listaId));
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Listas de Chequeo Estándar</h3>
            <p className="text-sm text-gray-600 mt-1">Administra listas de verificación</p>
          </div>
          <Button onClick={handleNuevaLista} style={{ background: '#003DA5' }}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Lista
          </Button>
        </div>

        {cargandoListas ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Cargando listas de chequeo...</span>
          </div>
        ) : listas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <List className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No hay listas de chequeo configuradas</p>
            <p className="text-sm mt-2">Haz clic en "Nueva Lista" para crear una</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listas.map((lista) => (
            <motion.div
              key={lista.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer bg-white"
            >
              <div className="flex items-start justify-between mb-3">
                <CheckSquare className="w-8 h-8 text-blue-600" />
                <div className="flex gap-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleVerLista(lista)}
                    title="Ver lista"
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditarLista(lista)}
                    title="Editar lista"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEliminarLista(lista.id)}
                    title="Eliminar lista"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <h4 className="font-bold text-gray-900 mb-1">{lista.nombre}</h4>
              <p className="text-sm text-gray-600 mb-3">{lista.tipoAuditoria}</p>
              
              <div className="space-y-2 mb-3">
                <p className="text-xs text-gray-500">{lista.descripcion}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {lista.items.length} ítems
                </span>
                {lista.usosProgramados > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {lista.usosProgramados} usos
                  </Badge>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        )}
      </Card>

      <AnimatePresence>
        {modalAbierto && (
          <ModalListaChequeo
            lista={listaEditando}
            onGuardar={handleGuardarLista}
            onCerrar={() => {
              setModalAbierto(false);
              setListaEditando(null);
            }}
            tiposAuditoria={tiposAuditoria}
          />
        )}
        {modalVistaAbierto && listaViendo && (
          <ModalVistaListaChequeo
            lista={listaViendo}
            onCerrar={() => {
              setModalVistaAbierto(false);
              setListaViendo(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ====================================
// MODAL LISTA DE CHEQUEO
// ====================================

interface ModalListaChequeoProps {
  lista: ListaChequeo | null;
  onGuardar: (lista: ListaChequeo) => void;
  onCerrar: () => void;
  tiposAuditoria: TipoAuditoria[];
}

function ModalListaChequeo({ lista, onGuardar, onCerrar, tiposAuditoria }: ModalListaChequeoProps) {
  const [formData, setFormData] = useState<ListaChequeo>(
    lista || {
      id: '',
      nombre: '',
      tipoAuditoria: 'Regular',
      descripcion: '',
      items: [],
      activa: true,
      usosProgramados: 0,
      fechaCreacion: '',
      ultimaActualizacion: ''
    }
  );

  const [nuevoItem, setNuevoItem] = useState('');
  const [categoriaItem, setCategoriaItem] = useState('General');
  const [obligatorioItem, setObligatorioItem] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim() || formData.items.length === 0) {
      toast.error('❌ Completa el nombre y agrega al menos un ítem');
      return;
    }

    onGuardar(formData);
  };

  const handleChange = (field: keyof ListaChequeo, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAgregarItem = () => {
    if (!nuevoItem.trim()) {
      toast.error('❌ Escribe el texto del ítem');
      return;
    }

    const item: ItemChequeo = {
      id: `item-${Date.now()}`,
      texto: nuevoItem,
      categoria: categoriaItem,
      obligatorio: obligatorioItem
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));

    setNuevoItem('');
    setCategoriaItem('General');
    setObligatorioItem(true);
    toast.success('✅ Ítem agregado');
  };

  const handleEliminarItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId)
    }));
    toast.success('✅ Ítem eliminado');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {lista ? 'Editar Lista de Chequeo' : 'Nueva Lista de Chequeo'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {lista ? 'Modifica los datos de la lista' : 'Crea una nueva lista de verificación'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onCerrar}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Lista *
            </label>
            <Input
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Lista de Chequeo #1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Auditoría
              </label>
              <select
                value={formData.tipoAuditoria}
                onChange={(e) => handleChange('tipoAuditoria', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar tipo...</option>
                {tiposAuditoria.map((tipo) => (
                  <option key={tipo.id} value={tipo.nombre}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <div className="flex items-center gap-2 h-10">
                <input
                  type="checkbox"
                  id="activa-lista"
                  checked={formData.activa}
                  onChange={(e) => handleChange('activa', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="activa-lista" className="text-sm text-gray-700">
                  Lista activa
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              placeholder="Breve descripción de la lista de chequeo..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
          </div>

          {/* SECCIÓN DE ÍTEMS */}
          <div className="border-t pt-4">
            <h3 className="font-bold text-gray-900 mb-3">Ítems de Verificación ({formData.items.length})</h3>
            
            {/* AGREGAR NUEVO ÍTEM */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agregar nuevo ítem
              </label>
              <div className="space-y-2">
                <Input
                  value={nuevoItem}
                  onChange={(e) => setNuevoItem(e.target.value)}
                  placeholder="¿Existe documentación de procesos?"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAgregarItem())}
                />
                <div className="flex gap-2">
                  <Input
                    value={categoriaItem}
                    onChange={(e) => setCategoriaItem(e.target.value)}
                    placeholder="Categoría"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2 px-3 border border-gray-300 rounded-lg bg-white">
                    <input
                      type="checkbox"
                      id="obligatorio"
                      checked={obligatorioItem}
                      onChange={(e) => setObligatorioItem(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="obligatorio" className="text-sm text-gray-700 whitespace-nowrap">
                      Obligatorio
                    </label>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAgregarItem}
                    style={{ background: '#10B981' }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar
                  </Button>
                </div>
              </div>
            </div>

            {/* LISTA DE ÍTEMS */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CheckSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay ítems agregados</p>
                </div>
              ) : (
                formData.items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded text-blue-600 text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{item.texto}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.categoria}
                        </Badge>
                        {item.obligatorio && (
                          <Badge variant="default" className="text-xs bg-red-100 text-red-700 border-red-200">
                            Obligatorio
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEliminarItem(item.id)}
                      className="text-red-600 hover:bg-red-50 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onCerrar}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              style={{ background: '#003DA5' }}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {lista ? 'Actualizar' : 'Crear Lista'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ====================================
// MODAL VISTA LISTA DE CHEQUEO
// ====================================

interface ModalVistaListaChequeoProps {
  lista: ListaChequeo;
  onCerrar: () => void;
}

function ModalVistaListaChequeo({ lista, onCerrar }: ModalVistaListaChequeoProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{lista.nombre}</h2>
            <p className="text-sm text-gray-600 mt-1">{lista.tipoAuditoria}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onCerrar}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Descripción</h3>
            <p className="text-sm text-gray-600">{lista.descripcion}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 py-3 bg-gray-50 rounded-lg px-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{lista.items.length}</p>
              <p className="text-xs text-gray-600">Ítems totales</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {lista.items.filter(i => i.obligatorio).length}
              </p>
              <p className="text-xs text-gray-600">Obligatorios</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{lista.usosProgramados}</p>
              <p className="text-xs text-gray-600">Usos programados</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Ítems de Verificación</h3>
            <div className="space-y-2">
              {lista.items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-600 rounded text-white text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{item.texto}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.categoria}
                      </Badge>
                      {item.obligatorio && (
                        <Badge className="text-xs bg-red-100 text-red-700 border-red-200">
                          Obligatorio
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-gray-300" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Button onClick={onCerrar} className="w-full" style={{ background: '#003DA5' }}>
              Cerrar
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ConfiguracionAuditoriasModule;
