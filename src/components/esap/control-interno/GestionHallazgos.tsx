/**
 * GESTIÓN DE HALLAZGOS - Todo en Uno
 * Dashboard Ejecutivo + Kanban + Lista integrado
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle, TrendingUp, Clock, CheckCircle2,
  Search, Filter, Download, Plus, LayoutGrid, List as ListIcon,
  Eye, Edit, Trash2, GripVertical, MapPin, Building2, User,
  FileText, X, Save
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';

type VistaActiva = 'kanban' | 'lista';
type EstadoHallazgo = 'identificado' | 'analisis' | 'plan-mejora' | 'verificacion' | 'cerrado';

interface Hallazgo {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  estado: EstadoHallazgo;
  gravedad: 'Crítica' | 'Alta' | 'Media' | 'Baja';
  auditoria: string;
  territorial: string;
  sede: string;
  responsable: string;
  fechaIdentificacion: string;
  fechaCompromiso: string;
  progreso: number;
}

// Data para los selects
const AUDITORIAS = [
  'AUD-2024-001 - Auditoría Financiera Q3',
  'AUD-2024-002 - Auditoría RRHH',
  'AUD-2024-003 - Auditoría Académica',
  'AUD-2024-004 - Auditoría Contratación',
  'AUD-2024-005 - Auditoría TI'
];

const TERRITORIALES = [
  'Cundinamarca', 'Antioquia', 'Valle del Cauca', 'Atlántico', 'Santander',
  'Bolívar', 'Boyacá', 'Caldas', 'Cauca', 'Cesar', 'Córdoba', 'Huila',
  'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander'
];

const SEDES = [
  'Bogotá - Sede Central',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Manizales',
  'Pereira',
  'Ibagué',
  'Pasto'
];

const RESPONSABLES = [
  'Juan Pérez',
  'María González',
  'Carlos Ramírez',
  'Ana Martínez',
  'Luis Pérez',
  'Sandra López',
  'Jorge Castro',
  'Patricia Ruiz'
];

const MOCK_HALLAZGOS: Hallazgo[] = [
  {
    id: '1',
    codigo: 'HAL-2024-001',
    titulo: 'Deficiencias en documentación financiera',
    descripcion: 'Se identificaron inconsistencias en los soportes de gastos del Q3 2024',
    estado: 'analisis',
    gravedad: 'Alta',
    auditoria: 'AUD-2024-001',
    territorial: 'Cundinamarca',
    sede: 'Bogotá - Sede Central',
    responsable: 'Juan Pérez',
    fechaIdentificacion: '2024-11-20',
    fechaCompromiso: '2024-12-20',
    progreso: 40
  },
  {
    id: '2',
    codigo: 'HAL-2024-002',
    titulo: 'Falta de segregación de funciones',
    descripcion: 'El mismo funcionario autoriza y ejecuta pagos en el sistema',
    estado: 'identificado',
    gravedad: 'Crítica',
    auditoria: 'AUD-2024-001',
    territorial: 'Cundinamarca',
    sede: 'Bogotá - Sede Central',
    responsable: 'María González',
    fechaIdentificacion: '2024-11-22',
    fechaCompromiso: '2024-12-15',
    progreso: 10
  },
  {
    id: '3',
    codigo: 'HAL-2024-003',
    titulo: 'Controles débiles en activos fijos',
    descripcion: 'No hay inventario físico actualizado de equipos',
    estado: 'plan-mejora',
    gravedad: 'Media',
    auditoria: 'AUD-2024-001',
    territorial: 'Cundinamarca',
    sede: 'Bogotá - Sede Central',
    responsable: 'Carlos Ramírez',
    fechaIdentificacion: '2024-11-18',
    fechaCompromiso: '2024-12-30',
    progreso: 65
  },
  {
    id: '4',
    codigo: 'HAL-2024-004',
    titulo: 'Registros académicos incompletos',
    descripcion: 'Falta digitalización de actas de grado periodo 2023-2',
    estado: 'verificacion',
    gravedad: 'Media',
    auditoria: 'AUD-2024-003',
    territorial: 'Valle del Cauca',
    sede: 'Cali',
    responsable: 'Ana Martínez',
    fechaIdentificacion: '2024-10-15',
    fechaCompromiso: '2024-11-30',
    progreso: 90
  },
  {
    id: '5',
    codigo: 'HAL-2024-005',
    titulo: 'Procedimientos de selección documentados',
    descripcion: 'Se implementó correctamente el manual de contratación',
    estado: 'cerrado',
    gravedad: 'Baja',
    auditoria: 'AUD-2024-004',
    territorial: 'Atlántico',
    sede: 'Barranquilla',
    responsable: 'Luis Pérez',
    fechaIdentificacion: '2024-09-10',
    fechaCompromiso: '2024-10-31',
    progreso: 100
  }
];

export function GestionHallazgos() {
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('kanban');
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>(MOCK_HALLAZGOS);
  const [hallazgoSeleccionado, setHallazgoSeleccionado] = useState<Hallazgo | null>(null);
  const [modalDetalles, setModalDetalles] = useState(false);
  const [modalNuevoHallazgo, setModalNuevoHallazgo] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    gravedad: 'Media' as 'Crítica' | 'Alta' | 'Media' | 'Baja',
    auditoria: '',
    territorial: '',
    sede: '',
    responsable: '',
    fechaIdentificacion: new Date().toISOString().split('T')[0],
    fechaCompromiso: '',
    estado: 'identificado' as EstadoHallazgo
  });

  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      gravedad: 'Media',
      auditoria: '',
      territorial: '',
      sede: '',
      responsable: '',
      fechaIdentificacion: new Date().toISOString().split('T')[0],
      fechaCompromiso: '',
      estado: 'identificado'
    });
  };

  const handleCrearHallazgo = () => {
    // Validaciones
    if (!formData.titulo || !formData.descripcion || !formData.auditoria || 
        !formData.territorial || !formData.sede || !formData.responsable || 
        !formData.fechaCompromiso) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    // Generar código automático
    const year = new Date().getFullYear();
    const nextNumber = hallazgos.length + 1;
    const codigo = `HAL-${year}-${String(nextNumber).padStart(3, '0')}`;

    // Crear nuevo hallazgo
    const nuevoHallazgo: Hallazgo = {
      id: Date.now().toString(),
      codigo,
      titulo: formData.titulo,
      descripcion: formData.descripcion,
      estado: formData.estado,
      gravedad: formData.gravedad,
      auditoria: formData.auditoria,
      territorial: formData.territorial,
      sede: formData.sede,
      responsable: formData.responsable,
      fechaIdentificacion: formData.fechaIdentificacion,
      fechaCompromiso: formData.fechaCompromiso,
      progreso: 0
    };

    setHallazgos([...hallazgos, nuevoHallazgo]);
    setModalNuevoHallazgo(false);
    resetForm();
    toast.success(`Hallazgo ${codigo} creado exitosamente`);
  };

  // Métricas calculadas
  const totalHallazgos = hallazgos.length;
  const criticos = hallazgos.filter(h => h.gravedad === 'Crítica').length;
  const enSeguimiento = hallazgos.filter(h => !['cerrado'].includes(h.estado)).length;
  const cerrados = hallazgos.filter(h => h.estado === 'cerrado').length;

  const estados: { id: EstadoHallazgo; label: string; color: string }[] = [
    { id: 'identificado', label: 'Identificado', color: '#EF4444' },
    { id: 'analisis', label: 'En Análisis', color: '#F59E0B' },
    { id: 'plan-mejora', label: 'Plan de Mejora', color: '#3B82F6' },
    { id: 'verificacion', label: 'Verificación', color: '#8B5CF6' },
    { id: 'cerrado', label: 'Cerrado', color: '#10B981' }
  ];

  const handleVerDetalles = (hallazgo: Hallazgo) => {
    setHallazgoSeleccionado(hallazgo);
    setModalDetalles(true);
  };

  const getGravedadColor = (gravedad: string) => {
    switch (gravedad) {
      case 'Crítica': return '#DC2626';
      case 'Alta': return '#EF4444';
      case 'Media': return '#F59E0B';
      case 'Baja': return '#10B981';
      default: return '#6B7280';
    }
  };

  return (
    <div className="space-y-6">
      {/* DASHBOARD EJECUTIVO - Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          className="p-6 rounded-2xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Total Hallazgos</p>
              <h3 className="text-3xl font-black" style={{ color: '#1F2937' }}>{totalHallazgos}</h3>
              <p className="text-xs mt-2" style={{ color: '#F59E0B' }}>
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Año 2024
              </p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: '#FFF7ED' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: '#F97316' }} />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="p-6 rounded-2xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Críticos</p>
              <h3 className="text-3xl font-black" style={{ color: '#DC2626' }}>{criticos}</h3>
              <p className="text-xs mt-2" style={{ color: '#DC2626' }}>
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Atención inmediata
              </p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: '#DC2626' }} />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="p-6 rounded-2xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm mb-2" style={{ color: '#6B7280' }}>En Seguimiento</p>
              <h3 className="text-3xl font-black" style={{ color: '#F59E0B' }}>{enSeguimiento}</h3>
              <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                <Clock className="w-3 h-3 inline mr-1" />
                Requieren acción
              </p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
              <Clock className="w-6 h-6" style={{ color: '#F59E0B' }} />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="p-6 rounded-2xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Cerrados</p>
              <h3 className="text-3xl font-black" style={{ color: '#10B981' }}>{cerrados}</h3>
              <p className="text-xs mt-2" style={{ color: '#10B981' }}>
                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                {Math.round((cerrados / totalHallazgos) * 100)}% del total
              </p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: '#F0FDF4' }}>
              <CheckCircle2 className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* BARRA DE HERRAMIENTAS */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 rounded-2xl border-2" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
        {/* Búsqueda */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Buscar hallazgo por código, título, auditoría..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border-2 outline-none transition-colors"
            style={{ borderColor: '#E5E7EB' }}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* Controles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle de vistas */}
          <div className="flex items-center gap-1 p-1 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
            <Button
              size="sm"
              variant={vistaActiva === 'kanban' ? 'default' : 'ghost'}
              onClick={() => setVistaActiva('kanban')}
              style={vistaActiva === 'kanban' ? { background: '#F97316', color: '#FFFFFF' } : {}}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Kanban
            </Button>
            <Button
              size="sm"
              variant={vistaActiva === 'lista' ? 'default' : 'ghost'}
              onClick={() => setVistaActiva('lista')}
              style={vistaActiva === 'lista' ? { background: '#F97316', color: '#FFFFFF' } : {}}
            >
              <ListIcon className="w-4 h-4 mr-1" />
              Lista
            </Button>
          </div>

          <Button variant="outline" size="sm" className="border-2">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>

          <Button variant="outline" size="sm" className="border-2">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>

          <Button 
            size="sm" 
            style={{ background: '#F97316', color: '#FFFFFF' }}
            onClick={() => setModalNuevoHallazgo(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Hallazgo
          </Button>
        </div>
      </div>

      {/* VISTA KANBAN */}
      {vistaActiva === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {estados.map((estado) => {
            const hallazgosEnEstado = hallazgos.filter(h => h.estado === estado.id);
            
            return (
              <div key={estado.id} className="flex flex-col">
                {/* Header de columna */}
                <div className="p-4 rounded-t-2xl border-2 border-b-0" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-black text-sm" style={{ color: estado.color }}>
                      {estado.label}
                    </h3>
                    <Badge style={{ background: `${estado.color}20`, color: estado.color }}>
                      {hallazgosEnEstado.length}
                    </Badge>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: `${estado.color}20` }}>
                    <div className="h-full rounded-full" style={{ background: estado.color, width: '100%' }} />
                  </div>
                </div>

                {/* Tarjetas de hallazgos */}
                <div className="flex-1 p-2 rounded-b-2xl border-2 border-t-0 space-y-3" style={{ background: '#F9FAFB', borderColor: '#E5E7EB', minHeight: '300px' }}>
                  {hallazgosEnEstado.map((hallazgo) => (
                    <motion.div
                      key={hallazgo.id}
                      className="p-4 rounded-xl border-2 cursor-move hover:shadow-lg transition-all"
                      style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleVerDetalles(hallazgo)}
                    >
                      <div className="flex items-start gap-2 mb-3">
                        <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge style={{ background: getGravedadColor(hallazgo.gravedad), color: '#FFFFFF', fontSize: '10px' }}>
                              {hallazgo.gravedad}
                            </Badge>
                            <span className="text-xs" style={{ color: '#6B7280' }}>{hallazgo.codigo}</span>
                          </div>
                          <h4 className="font-bold text-sm mb-2" style={{ color: '#1F2937' }}>
                            {hallazgo.titulo}
                          </h4>
                          
                          <p className="text-xs mb-3 line-clamp-2" style={{ color: '#6B7280' }}>
                            {hallazgo.descripcion}
                          </p>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                              <FileText className="w-3 h-3" />
                              <span className="truncate">{hallazgo.auditoria}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{hallazgo.territorial}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                              <User className="w-3 h-3" />
                              <span className="truncate">{hallazgo.responsable}</span>
                            </div>
                          </div>

                          {/* Progreso */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1" style={{ color: '#6B7280' }}>
                              <span>Cumplimiento</span>
                              <span className="font-bold">{hallazgo.progreso}%</span>
                            </div>
                            <div className="h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                              <div 
                                className="h-full rounded-full transition-all" 
                                style={{ background: estado.color, width: `${hallazgo.progreso}%` }} 
                              />
                            </div>
                          </div>

                          {/* Fecha compromiso */}
                          <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                            <Clock className="w-3 h-3" />
                            <span>Compromiso: {new Date(hallazgo.fechaCompromiso).toLocaleDateString('es-CO')}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA LISTA */}
      {vistaActiva === 'lista' && (
        <div className="rounded-2xl border-2 overflow-hidden" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: '#F9FAFB' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>CÓDIGO</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>TÍTULO</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>GRAVEDAD</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>ESTADO</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>AUDITORÍA</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>RESPONSABLE</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>CUMPLIMIENTO</th>
                  <th className="px-6 py-4 text-left text-xs font-black" style={{ color: '#6B7280' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {hallazgos.map((hallazgo) => {
                  const estado = estados.find(e => e.id === hallazgo.estado);
                  return (
                    <tr 
                      key={hallazgo.id} 
                      className="border-t-2 hover:bg-orange-50 transition-colors cursor-pointer"
                      style={{ borderColor: '#E5E7EB' }}
                      onClick={() => handleVerDetalles(hallazgo)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-bold text-sm" style={{ color: '#1F2937' }}>{hallazgo.codigo}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-sm" style={{ color: '#1F2937' }}>{hallazgo.titulo}</p>
                          <p className="text-xs line-clamp-1" style={{ color: '#6B7280' }}>{hallazgo.descripcion}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge style={{ background: getGravedadColor(hallazgo.gravedad), color: '#FFFFFF' }}>
                          {hallazgo.gravedad}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge style={{ background: `${estado?.color}20`, color: estado?.color }}>
                          {estado?.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm" style={{ color: '#6B7280' }}>{hallazgo.auditoria}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm" style={{ color: '#6B7280' }}>{hallazgo.responsable}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full" style={{ background: '#E5E7EB', maxWidth: '80px' }}>
                            <div 
                              className="h-full rounded-full" 
                              style={{ background: estado?.color, width: `${hallazgo.progreso}%` }} 
                            />
                          </div>
                          <span className="text-sm font-bold" style={{ color: '#6B7280' }}>{hallazgo.progreso}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleVerDetalles(hallazgo); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="w-4 h-4" style={{ color: '#EF4444' }} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLES */}
      <Dialog open={modalDetalles} onOpenChange={setModalDetalles}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: '#FFF7ED' }}>
                <AlertTriangle className="w-6 h-6" style={{ color: '#F97316' }} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-black" style={{ color: '#1F2937' }}>
                  {hallazgoSeleccionado?.titulo}
                </h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {hallazgoSeleccionado?.codigo}
                </p>
              </div>
              <Badge style={{ background: getGravedadColor(hallazgoSeleccionado?.gravedad || 'Media'), color: '#FFFFFF' }}>
                {hallazgoSeleccionado?.gravedad}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {hallazgoSeleccionado && (
            <div className="space-y-6">
              {/* Descripción */}
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: '#6B7280' }}>Descripción del Hallazgo</label>
                <p style={{ color: '#1F2937' }}>{hallazgoSeleccionado.descripcion}</p>
              </div>

              {/* Info General */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Auditoría Origen</label>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{hallazgoSeleccionado.auditoria}</p>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Estado Actual</label>
                  <Badge style={{ background: `${estados.find(e => e.id === hallazgoSeleccionado.estado)?.color}20`, color: estados.find(e => e.id === hallazgoSeleccionado.estado)?.color }}>
                    {estados.find(e => e.id === hallazgoSeleccionado.estado)?.label}
                  </Badge>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Territorial</label>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{hallazgoSeleccionado.territorial}</p>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Sede</label>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{hallazgoSeleccionado.sede}</p>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Responsable</label>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{hallazgoSeleccionado.responsable}</p>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6B7280' }}>Fecha Identificación</label>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{new Date(hallazgoSeleccionado.fechaIdentificacion).toLocaleDateString('es-CO')}</p>
                </div>
              </div>

              {/* Progreso */}
              <div className="p-4 rounded-xl" style={{ background: '#F9FAFB' }}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold" style={{ color: '#6B7280' }}>Cumplimiento del Plan de Acción</label>
                  <span className="font-black" style={{ color: '#F97316' }}>{hallazgoSeleccionado.progreso}%</span>
                </div>
                <div className="h-3 rounded-full mb-3" style={{ background: '#E5E7EB' }}>
                  <div 
                    className="h-full rounded-full transition-all" 
                    style={{ background: '#F97316', width: `${hallazgoSeleccionado.progreso}%` }} 
                  />
                </div>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  Fecha compromiso: {new Date(hallazgoSeleccionado.fechaCompromiso).toLocaleDateString('es-CO')}
                </p>
              </div>

              {/* Acciones */}
              <div className="flex gap-3">
                <Button className="flex-1" style={{ background: '#F97316', color: '#FFFFFF' }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Actualizar Hallazgo
                </Button>
                <Button variant="outline" className="border-2">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Evidencia
                </Button>
                <Button variant="outline" className="border-2" style={{ borderColor: '#EF4444', color: '#EF4444' }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE NUEVO HALLAZGO */}
      <ResponsiveModal
        isOpen={modalNuevoHallazgo}
        onClose={() => {
          setModalNuevoHallazgo(false);
          resetForm();
        }}
        title={modoEdicion ? 'Editar Hallazgo' : 'Nuevo Hallazgo'}
        subtitle="Complete la información del hallazgo identificado"
        icon={<AlertTriangle className="w-6 h-6" style={{ color: '#F97316' }} />}
        maxWidth="3xl"
        headerColor="#F97316"
        zIndex={150}
        footer={
          <div className="flex items-center gap-3">
            <button
              onClick={handleCrearHallazgo}
              className="flex-1 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{ background: '#F97316', color: '#FFFFFF' }}
            >
              <Save className="w-4 h-4" />
              Crear Hallazgo
            </button>
            <button
              onClick={() => {
                setModalNuevoHallazgo(false);
                resetForm();
              }}
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#F3F4F6', color: '#4B5563' }}
            >
              Cancelar
            </button>
          </div>
        }
      >
        <div className="space-y-6 p-1">
          {/* Título y Descripción */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Título del Hallazgo *
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ej: Deficiencias en documentación financiera"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Descripción Detallada *
              </label>
              <textarea
                required
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Describe el hallazgo encontrado de manera detallada..."
              />
            </div>
          </div>

          {/* Clasificación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Nivel de Gravedad *
              </label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formData.gravedad}
                onChange={(e) => setFormData({ ...formData, gravedad: e.target.value as any })}
              >
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
                <option value="Crítica">Crítica</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Estado Inicial *
              </label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value as EstadoHallazgo })}
              >
                <option value="identificado">Identificado</option>
                <option value="analisis">En Análisis</option>
                <option value="plan-mejora">Plan de Mejora</option>
                <option value="verificacion">Verificación</option>
              </select>
            </div>
          </div>

          {/* Auditoría y Ubicación */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Auditoría Origen *
              </label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formData.auditoria}
                onChange={(e) => setFormData({ ...formData, auditoria: e.target.value })}
              >
                <option value="">Seleccione una auditoría...</option>
                {AUDITORIAS.map(aud => (
                  <option key={aud} value={aud.split(' - ')[0]}>{aud}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Territorial *
                </label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.territorial}
                  onChange={(e) => setFormData({ ...formData, territorial: e.target.value })}
                >
                  <option value="">Seleccione...</option>
                  {TERRITORIALES.map(terr => (
                    <option key={terr} value={terr}>{terr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Sede *
                </label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.sede}
                  onChange={(e) => setFormData({ ...formData, sede: e.target.value })}
                >
                  <option value="">Seleccione...</option>
                  {SEDES.map(sede => (
                    <option key={sede} value={sede}>{sede}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Responsable y Fechas */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Responsable de Seguimiento *
              </label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formData.responsable}
                onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
              >
                <option value="">Seleccione responsable...</option>
                {RESPONSABLES.map(resp => (
                  <option key={resp} value={resp}>{resp}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Fecha de Identificación *
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.fechaIdentificacion}
                  onChange={(e) => setFormData({ ...formData, fechaIdentificacion: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Fecha de Compromiso *
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.fechaCompromiso}
                  onChange={(e) => setFormData({ ...formData, fechaCompromiso: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Info adicional */}
          <div className="p-4 rounded-xl" style={{ background: '#FFF7ED', borderLeft: '4px solid #F97316' }}>
            <p className="text-sm" style={{ color: '#92400E' }}>
              <strong>Nota:</strong> El código del hallazgo se generará automáticamente siguiendo el formato HAL-{new Date().getFullYear()}-XXX
            </p>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}