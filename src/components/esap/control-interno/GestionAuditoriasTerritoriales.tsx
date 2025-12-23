/**
 * RF018 - GESTIÓN DE AUDITORÍAS TERRITORIALES
 * Sistema de gestión diferenciada para las 16 Territoriales ESAP
 * 
 * Características:
 * - 16 Territoriales diferenciadas
 * - Cronogramas especiales (ejecución 4 días vs 30 días regulares)
 * - Equipos de 3 personas típicamente
 * - Reportes consolidados por territorial
 * - Visualización geográfica
 * - Comparativos entre territoriales
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Calendar, Users, Clock, TrendingUp, BarChart3,
  Building2, CheckCircle, AlertTriangle, XCircle, Map,
  FileText, Download, Eye, Edit, Plus, Search, Filter,
  Target, Award, AlertCircle, ArrowRight, Briefcase,
  Globe, Navigation, ChevronRight, Settings, Activity,
  List, PieChart, LineChart, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';
import { WizardAuditoriaTerritorial } from './WizardAuditoriaTerritorial';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line
} from 'recharts';

// ============ TIPOS ============

type EstadoAuditoriaTerritorial = 
  | 'Planeación' 
  | 'Ejecución' 
  | 'Comunicación' 
  | 'Finalizada' 
  | 'Cancelada';

type TipoAuditoria = 'Territorial' | 'Sede Principal';

interface Territorial {
  id: string;
  nombre: string;
  departamento: string;
  ciudad: string;
  region: string;
  codigo: string;
  coordenadas: {
    lat: number;
    lng: number;
  };
  color: string;
  activa: boolean;
  director: string;
  email: string;
  telefono: string;
}

interface CronogramaTerritorial {
  tipo: TipoAuditoria;
  etapas: {
    planeacion: {
      dias: number;
      descripcion: string;
    };
    ejecucion: {
      dias: number;
      descripcion: string;
      modalidad: 'Presencial' | 'Virtual' | 'Mixta';
    };
    comunicacion: {
      dias: number;
      descripcion: string;
    };
  };
  totalDias: number;
}

interface EquipoAuditor {
  lider: string;
  miembros: string[];
  totalPersonas: number;
}

interface AuditoriaTerritorial {
  id: string;
  codigo: string;
  territorialId: string;
  territorial: string;
  tipo: TipoAuditoria;
  titulo: string;
  objetivoGeneral: string;
  alcance: string;
  estado: EstadoAuditoriaTerritorial;
  progreso: number;
  fechaInicio: string;
  fechaFin: string;
  cronograma: CronogramaTerritorial;
  equipo: EquipoAuditor;
  hallazgosEncontrados: number;
  riesgo: 'Alto' | 'Medio' | 'Bajo';
  cumplimiento: number;
  presupuesto: number;
  gastoReal: number;
  etapaActual: {
    nombre: string;
    diasRestantes: number;
    alertas: number;
  };
}

// ============ DATOS - 16 TERRITORIALES ESAP ============

const TERRITORIALES: Territorial[] = [
  {
    id: 'terr-001',
    nombre: 'ESAP Antioquia',
    departamento: 'Antioquia',
    ciudad: 'Medellín',
    region: 'Región Noroccidente',
    codigo: 'ANT',
    coordenadas: { lat: 6.2476, lng: -75.5658 },
    color: '#3B82F6',
    activa: true,
    director: 'Carlos Andrés López',
    email: 'antioquia@esap.edu.co',
    telefono: '(604) 444-5566'
  },
  {
    id: 'terr-002',
    nombre: 'ESAP Atlántico',
    departamento: 'Atlántico',
    ciudad: 'Barranquilla',
    region: 'Región Caribe',
    codigo: 'ATL',
    coordenadas: { lat: 10.9639, lng: -74.7964 },
    color: '#10B981',
    activa: true,
    director: 'María Fernanda Gómez',
    email: 'atlantico@esap.edu.co',
    telefono: '(605) 358-7799'
  },
  {
    id: 'terr-003',
    nombre: 'ESAP Bolívar',
    departamento: 'Bolívar',
    ciudad: 'Cartagena',
    region: 'Región Caribe',
    codigo: 'BOL',
    coordenadas: { lat: 10.3910, lng: -75.4794 },
    color: '#F59E0B',
    activa: true,
    director: 'Jorge Luis Martínez',
    email: 'bolivar@esap.edu.co',
    telefono: '(605) 664-4488'
  },
  {
    id: 'terr-004',
    nombre: 'ESAP Boyacá',
    departamento: 'Boyacá',
    ciudad: 'Tunja',
    region: 'Región Centro-Oriente',
    codigo: 'BOY',
    coordenadas: { lat: 5.5353, lng: -73.3678 },
    color: '#8B5CF6',
    activa: true,
    director: 'Diana Patricia Rojas',
    email: 'boyaca@esap.edu.co',
    telefono: '(608) 742-5533'
  },
  {
    id: 'terr-005',
    nombre: 'ESAP Caldas',
    departamento: 'Caldas',
    ciudad: 'Manizales',
    region: 'Región Eje Cafetero',
    codigo: 'CAL',
    coordenadas: { lat: 5.0700, lng: -75.5138 },
    color: '#EC4899',
    activa: true,
    director: 'Alberto Hernández',
    email: 'caldas@esap.edu.co',
    telefono: '(606) 887-7799'
  },
  {
    id: 'terr-006',
    nombre: 'ESAP Cauca',
    departamento: 'Cauca',
    ciudad: 'Popayán',
    region: 'Región Suroccidente',
    codigo: 'CAU',
    coordenadas: { lat: 2.4419, lng: -76.6063 },
    color: '#14B8A6',
    activa: true,
    director: 'Sandra Milena Torres',
    email: 'cauca@esap.edu.co',
    telefono: '(602) 824-5566'
  },
  {
    id: 'terr-007',
    nombre: 'ESAP Cesar',
    departamento: 'Cesar',
    ciudad: 'Valledupar',
    region: 'Región Caribe',
    codigo: 'CES',
    coordenadas: { lat: 10.4631, lng: -73.2532 },
    color: '#F97316',
    activa: true,
    director: 'Roberto Carlos Díaz',
    email: 'cesar@esap.edu.co',
    telefono: '(605) 574-4488'
  },
  {
    id: 'terr-008',
    nombre: 'ESAP Córdoba',
    departamento: 'Córdoba',
    ciudad: 'Montería',
    region: 'Región Caribe',
    codigo: 'COR',
    coordenadas: { lat: 8.7479, lng: -75.8814 },
    color: '#84CC16',
    activa: true,
    director: 'Patricia Elena Mejía',
    email: 'cordoba@esap.edu.co',
    telefono: '(604) 782-3344'
  },
  {
    id: 'terr-009',
    nombre: 'ESAP Huila',
    departamento: 'Huila',
    ciudad: 'Neiva',
    region: 'Región Sur',
    codigo: 'HUI',
    coordenadas: { lat: 2.9273, lng: -75.2819 },
    color: '#06B6D4',
    activa: true,
    director: 'Luis Fernando Vargas',
    email: 'huila@esap.edu.co',
    telefono: '(608) 871-5566'
  },
  {
    id: 'terr-010',
    nombre: 'ESAP Magdalena',
    departamento: 'Magdalena',
    ciudad: 'Santa Marta',
    region: 'Región Caribe',
    codigo: 'MAG',
    coordenadas: { lat: 11.2408, lng: -74.1990 },
    color: '#A855F7',
    activa: true,
    director: 'Andrea Carolina Suárez',
    email: 'magdalena@esap.edu.co',
    telefono: '(605) 421-6677'
  },
  {
    id: 'terr-011',
    nombre: 'ESAP Meta',
    departamento: 'Meta',
    ciudad: 'Villavicencio',
    region: 'Región Orinoquía',
    codigo: 'MET',
    coordenadas: { lat: 4.1420, lng: -73.6266 },
    color: '#EF4444',
    activa: true,
    director: 'Germán Andrés Castro',
    email: 'meta@esap.edu.co',
    telefono: '(608) 662-4488'
  },
  {
    id: 'terr-012',
    nombre: 'ESAP Nariño',
    departamento: 'Nariño',
    ciudad: 'Pasto',
    region: 'Región Suroccidente',
    codigo: 'NAR',
    coordenadas: { lat: 1.2136, lng: -77.2811 },
    color: '#6366F1',
    activa: true,
    director: 'Clara Isabel Narváez',
    email: 'narino@esap.edu.co',
    telefono: '(602) 721-5533'
  },
  {
    id: 'terr-013',
    nombre: 'ESAP Norte de Santander',
    departamento: 'Norte de Santander',
    ciudad: 'Cúcuta',
    region: 'Región Nororiental',
    codigo: 'NSA',
    coordenadas: { lat: 7.8939, lng: -72.5078 },
    color: '#D946EF',
    activa: true,
    director: 'Pedro Antonio Ramírez',
    email: 'nortesantander@esap.edu.co',
    telefono: '(607) 575-8899'
  },
  {
    id: 'terr-014',
    nombre: 'ESAP Quindío',
    departamento: 'Quindío',
    ciudad: 'Armenia',
    region: 'Región Eje Cafetero',
    codigo: 'QUI',
    coordenadas: { lat: 4.5389, lng: -75.6811 },
    color: '#0EA5E9',
    activa: true,
    director: 'Mónica Alejandra Valencia',
    email: 'quindio@esap.edu.co',
    telefono: '(606) 746-5544'
  },
  {
    id: 'terr-015',
    nombre: 'ESAP Santander',
    departamento: 'Santander',
    ciudad: 'Bucaramanga',
    region: 'Región Nororiental',
    codigo: 'SAN',
    coordenadas: { lat: 7.1193, lng: -73.1227 },
    color: '#22C55E',
    activa: true,
    director: 'Ricardo José Moreno',
    email: 'santander@esap.edu.co',
    telefono: '(607) 643-7788'
  },
  {
    id: 'terr-016',
    nombre: 'ESAP Valle del Cauca',
    departamento: 'Valle del Cauca',
    ciudad: 'Cali',
    region: 'Región Suroccidente',
    codigo: 'VAL',
    coordenadas: { lat: 3.4516, lng: -76.5320 },
    color: '#F43F5E',
    activa: true,
    director: 'Juliana María Ospina',
    email: 'valle@esap.edu.co',
    telefono: '(602) 485-9966'
  }
];

// ============ CRONOGRAMAS DIFERENCIADOS ============

const CRONOGRAMAS: Record<TipoAuditoria, CronogramaTerritorial> = {
  'Territorial': {
    tipo: 'Territorial',
    etapas: {
      planeacion: {
        dias: 10,
        descripcion: 'Planeación inicial y preparación de documentos'
      },
      ejecucion: {
        dias: 4,
        descripcion: 'Visita presencial a la territorial (4 días / 1 semana)',
        modalidad: 'Presencial'
      },
      comunicacion: {
        dias: 5,
        descripcion: 'Comunicación de hallazgos y elaboración de informe'
      }
    },
    totalDias: 19
  },
  'Sede Principal': {
    tipo: 'Sede Principal',
    etapas: {
      planeacion: {
        dias: 15,
        descripcion: 'Planeación detallada y coordinación'
      },
      ejecucion: {
        dias: 30,
        descripcion: 'Ejecución extendida con seguimiento continuo',
        modalidad: 'Mixta'
      },
      comunicacion: {
        dias: 10,
        descripcion: 'Comunicación formal y reportes detallados'
      }
    },
    totalDias: 55
  }
};

// ============ DATOS MOCK - AUDITORÍAS TERRITORIALES ============

const AUDITORIAS_TERRITORIALES: AuditoriaTerritorial[] = [
  {
    id: 'aud-terr-001',
    codigo: 'AT-2025-001',
    territorialId: 'terr-001',
    territorial: 'ESAP Antioquia',
    tipo: 'Territorial',
    titulo: 'Auditoría de Gestión Administrativa Territorial Antioquia 2025',
    objetivoGeneral: 'Evaluar la eficiencia de los procesos administrativos y financieros',
    alcance: 'Procesos administrativos, financieros y académicos del primer semestre 2025',
    estado: 'Ejecución',
    progreso: 45,
    fechaInicio: '2025-01-10',
    fechaFin: '2025-01-29',
    cronograma: CRONOGRAMAS['Territorial'],
    equipo: {
      lider: 'Mario Bernal',
      miembros: ['Sandra Montero', 'Carlos Ramírez'],
      totalPersonas: 3
    },
    hallazgosEncontrados: 3,
    riesgo: 'Medio',
    cumplimiento: 78,
    presupuesto: 8500000,
    gastoReal: 6200000,
    etapaActual: {
      nombre: 'Ejecución',
      diasRestantes: 2,
      alertas: 0
    }
  },
  {
    id: 'aud-terr-002',
    codigo: 'AT-2025-002',
    territorialId: 'terr-002',
    territorial: 'ESAP Atlántico',
    tipo: 'Territorial',
    titulo: 'Auditoría de Procesos Académicos Territorial Atlántico',
    objetivoGeneral: 'Verificar la calidad de los programas académicos ofertados',
    alcance: 'Programas de pregrado y posgrado vigentes',
    estado: 'Finalizada',
    progreso: 100,
    fechaInicio: '2024-12-15',
    fechaFin: '2025-01-03',
    cronograma: CRONOGRAMAS['Territorial'],
    equipo: {
      lider: 'Sandra Montero',
      miembros: ['Diana López', 'Roberto Torres'],
      totalPersonas: 3
    },
    hallazgosEncontrados: 5,
    riesgo: 'Bajo',
    cumplimiento: 92,
    presupuesto: 7800000,
    gastoReal: 7500000,
    etapaActual: {
      nombre: 'Finalizada',
      diasRestantes: 0,
      alertas: 0
    }
  },
  {
    id: 'aud-terr-003',
    codigo: 'AT-2025-003',
    territorialId: 'terr-016',
    territorial: 'ESAP Valle del Cauca',
    tipo: 'Territorial',
    titulo: 'Auditoría de Gestión Financiera Territorial Valle',
    objetivoGeneral: 'Evaluar el manejo de recursos financieros y presupuestales',
    alcance: 'Ejecución presupuestal 2024 y primer trimestre 2025',
    estado: 'Planeación',
    progreso: 25,
    fechaInicio: '2025-01-20',
    fechaFin: '2025-02-08',
    cronograma: CRONOGRAMAS['Territorial'],
    equipo: {
      lider: 'Carlos Ramírez',
      miembros: ['Patricia Gómez', 'Luis Vargas'],
      totalPersonas: 3
    },
    hallazgosEncontrados: 0,
    riesgo: 'Alto',
    cumplimiento: 0,
    presupuesto: 9200000,
    gastoReal: 1500000,
    etapaActual: {
      nombre: 'Planeación',
      diasRestantes: 8,
      alertas: 1
    }
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function GestionAuditoriasTerritoriales() {
  const [vistaActual, setVistaActual] = useState<'mapa' | 'lista' | 'comparativo' | 'reportes'>('mapa');
  const [territorialSeleccionada, setTerritorialSeleccionada] = useState<string | null>(null);
  const [auditorias, setAuditorias] = useState<AuditoriaTerritorial[]>(AUDITORIAS_TERRITORIALES);
  const [filtroEstado, setFiltroEstado] = useState<string>('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [modalCrear, setModalCrear] = useState(false);

  // Filtrar auditorías
  const auditoriasFiltradas = auditorias.filter(aud => {
    const cumpleBusqueda = aud.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
                           aud.territorial.toLowerCase().includes(busqueda.toLowerCase()) ||
                           aud.codigo.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleEstado = filtroEstado === 'Todas' || aud.estado === filtroEstado;
    const cumpleTerritorial = !territorialSeleccionada || aud.territorialId === territorialSeleccionada;
    return cumpleBusqueda && cumpleEstado && cumpleTerritorial;
  });

  // Estadísticas
  const stats = {
    totalAuditorias: auditorias.length,
    enEjecucion: auditorias.filter(a => a.estado === 'Ejecución').length,
    finalizadas: auditorias.filter(a => a.estado === 'Finalizada').length,
    territoriales: new Set(auditorias.map(a => a.territorialId)).size,
    hallazgosTotales: auditorias.reduce((sum, a) => sum + a.hallazgosEncontrados, 0),
    cumplimientoPromedio: Math.round(
      auditorias.reduce((sum, a) => sum + a.cumplimiento, 0) / auditorias.length
    )
  };

  return (
    <div className="space-y-6">
      {/* ACCIONES PRINCIPALES */}
      <div className="flex justify-end gap-2">
        <Button onClick={() => setModalCrear(true)} style={{ background: '#003DA5' }}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Auditoría Territorial
        </Button>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 border-b overflow-x-auto">
        <button
          onClick={() => setVistaActual('mapa')}
          className={`px-4 py-2 font-bold border-b-2 transition-colors whitespace-nowrap ${
            vistaActual === 'mapa'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Map className="w-4 h-4 inline mr-2" />
          Mapa Geográfico
        </button>
        <button
          onClick={() => setVistaActual('lista')}
          className={`px-4 py-2 font-bold border-b-2 transition-colors whitespace-nowrap ${
            vistaActual === 'lista'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <List className="w-4 h-4 inline mr-2" />
          Lista de Auditorías ({auditorias.length})
        </button>
        <button
          onClick={() => setVistaActual('comparativo')}
          className={`px-4 py-2 font-bold border-b-2 transition-colors whitespace-nowrap ${
            vistaActual === 'comparativo'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Comparativo Territoriales
        </button>
        <button
          onClick={() => setVistaActual('reportes')}
          className={`px-4 py-2 font-bold border-b-2 transition-colors whitespace-nowrap ${
            vistaActual === 'reportes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Reportes Consolidados
        </button>
      </div>

      {/* ESTADÍSTICAS GENERALES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#003DA5' }}>
          <p className="text-xs text-gray-600">Total Auditorías</p>
          <p className="text-2xl font-black text-gray-900">{stats.totalAuditorias}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#3B82F6' }}>
          <p className="text-xs text-gray-600">En Ejecución</p>
          <p className="text-2xl font-black text-blue-600">{stats.enEjecucion}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <p className="text-xs text-gray-600">Finalizadas</p>
          <p className="text-2xl font-black text-green-600">{stats.finalizadas}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#F59E0B' }}>
          <p className="text-xs text-gray-600">Territoriales</p>
          <p className="text-2xl font-black text-amber-600">{stats.territoriales}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#EF4444' }}>
          <p className="text-xs text-gray-600">Hallazgos</p>
          <p className="text-2xl font-black text-red-600">{stats.hallazgosTotales}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#8B5CF6' }}>
          <p className="text-xs text-gray-600">Cumplimiento</p>
          <p className="text-2xl font-black text-purple-600">{stats.cumplimientoPromedio}%</p>
        </Card>
      </div>

      {/* CONTENIDO */}
      <AnimatePresence mode="wait">
        {vistaActual === 'mapa' && (
          <VistaMapaGeografico
            territoriales={TERRITORIALES}
            auditorias={auditorias}
            onSelectTerritorial={setTerritorialSeleccionada}
            territorialSeleccionada={territorialSeleccionada}
          />
        )}

        {vistaActual === 'lista' && (
          <VistaListaAuditorias
            auditorias={auditoriasFiltradas}
            territoriales={TERRITORIALES}
            busqueda={busqueda}
            onBusquedaChange={setBusqueda}
            filtroEstado={filtroEstado}
            onFiltroEstadoChange={setFiltroEstado}
          />
        )}

        {vistaActual === 'comparativo' && (
          <VistaComparativoTerritoriales
            territoriales={TERRITORIALES}
            auditorias={auditorias}
          />
        )}

        {vistaActual === 'reportes' && (
          <VistaReportesConsolidados
            auditorias={auditorias}
            territoriales={TERRITORIALES}
          />
        )}
      </AnimatePresence>

      {/* MODALES */}
      <AnimatePresence>
        {modalCrear && (
          <WizardAuditoriaTerritorial
            territoriales={TERRITORIALES}
            onSubmit={(data) => {
              // Crear nueva auditoría con los datos del wizard
              const nuevaAuditoria: AuditoriaTerritorial = {
                id: `aud-terr-${Date.now()}`,
                codigo: `AUD-TERR-${auditorias.length + 1}`,
                territorialId: data.territorialId,
                territorial: data.territorial?.nombre || '',
                tipo: 'Territorial',
                titulo: data.titulo,
                objetivoGeneral: data.objetivoGeneral,
                alcance: data.alcance,
                estado: 'Planeación',
                progreso: 0,
                fechaInicio: data.fechaInicio,
                fechaFin: data.fechaFinComunicacion,
                cronograma: {
                  tipo: 'Territorial',
                  etapas: {
                    planeacion: {
                      dias: 5,
                      descripcion: 'Preparación y planificación de la auditoría'
                    },
                    ejecucion: {
                      dias: 4,
                      descripcion: 'Ejecución presencial en la territorial',
                      modalidad: 'Presencial'
                    },
                    comunicacion: {
                      dias: 10,
                      descripcion: 'Elaboración y comunicación del informe'
                    }
                  },
                  totalDias: 19
                },
                equipo: {
                  lider: data.lider,
                  miembros: data.miembros,
                  totalPersonas: 1 + data.miembros.length
                },
                hallazgosEncontrados: 0,
                riesgo: 'Medio',
                cumplimiento: 0,
                presupuesto: data.presupuestoEstimado,
                gastoReal: 0,
                etapaActual: {
                  nombre: 'Planeación',
                  diasRestantes: 5,
                  alertas: 0
                }
              };
              
              setAuditorias([...auditorias, nuevaAuditoria]);
              setModalCrear(false);
            }}
            onClose={() => setModalCrear(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ VISTA: MAPA GEOGRÁFICO ============

function VistaMapaGeografico({ territoriales, auditorias, onSelectTerritorial, territorialSeleccionada }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-black text-gray-900 mb-2">
            Visualización Geográfica de Territoriales
          </h3>
          <p className="text-sm text-gray-600">
            Selecciona una territorial para ver sus auditorías activas
          </p>
        </div>

        {/* Mapa de Colombia con Territoriales */}
        <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 min-h-[600px] border-2 border-dashed border-gray-300">
          <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg">
            <p className="text-xs font-bold text-gray-700 mb-2">Regiones:</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: '#3B82F6' }} />
                <span>Caribe (5)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: '#10B981' }} />
                <span>Andina (6)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: '#F59E0B' }} />
                <span>Pacífico (3)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: '#EF4444' }} />
                <span>Orinoquía (2)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {territoriales.map((terr: Territorial) => {
              const auditoriasActivas = auditorias.filter(
                (a: AuditoriaTerritorial) => a.territorialId === terr.id && a.estado !== 'Finalizada'
              ).length;

              return (
                <motion.div
                  key={terr.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelectTerritorial(terr.id === territorialSeleccionada ? null : terr.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${
                    territorialSeleccionada === terr.id
                      ? 'ring-2 ring-blue-500 shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                  style={{
                    background: territorialSeleccionada === terr.id
                      ? terr.color + '20'
                      : 'white',
                    borderLeft: `4px solid ${terr.color}`
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <MapPin className="w-5 h-5" style={{ color: terr.color }} />
                    {auditoriasActivas > 0 && (
                      <Badge
                        style={{
                          background: '#EF4444',
                          color: 'white'
                        }}
                      >
                        {auditoriasActivas}
                      </Badge>
                    )}
                  </div>
                  <p className="font-bold text-gray-900 text-sm mb-1">{terr.ciudad}</p>
                  <p className="text-xs text-gray-600">{terr.departamento}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-bold">{terr.codigo}</span> • {terr.region}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Información de Territorial Seleccionada */}
        {territorialSeleccionada && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4"
          >
            {(() => {
              const terr = territoriales.find((t: Territorial) => t.id === territorialSeleccionada);
              const audsActivas = auditorias.filter(
                (a: AuditoriaTerritorial) => a.territorialId === territorialSeleccionada
              );

              return (
                <Card className="p-4" style={{ borderLeft: `4px solid ${terr?.color}` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-black text-gray-900">{terr?.nombre}</h4>
                      <p className="text-sm text-gray-600">{terr?.director} • Director(a)</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {terr?.email} • {terr?.telefono}
                      </p>
                    </div>
                    <Button
                      onClick={() => onSelectTerritorial(null)}
                      variant="outline"
                      size="sm"
                    >
                      Cerrar
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-700">
                      Auditorías Activas: {audsActivas.length}
                    </p>
                    {audsActivas.map((aud: AuditoriaTerritorial) => (
                      <div key={aud.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-sm text-gray-900">{aud.codigo}</p>
                            <p className="text-xs text-gray-600 line-clamp-1">{aud.titulo}</p>
                          </div>
                          <EstadoBadge estado={aud.estado} />
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {aud.cronograma.totalDias} días
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {aud.equipo.totalPersonas} personas
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {aud.progreso}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })()}
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}

// ============ VISTA: LISTA DE AUDITORÍAS ============

function VistaListaAuditorias({ auditorias, territoriales, busqueda, onBusquedaChange, filtroEstado, onFiltroEstadoChange }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* FILTROS */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Buscar auditoría
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              placeholder="Buscar por código, título o territorial..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Filtrar por estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => onFiltroEstadoChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todas">Todas</option>
              <option value="Planeación">Planeación</option>
              <option value="Ejecución">Ejecución</option>
              <option value="Comunicación">Comunicación</option>
              <option value="Finalizada">Finalizada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
        </div>
      </Card>

      {/* LISTA */}
      <div className="space-y-3">
        {auditorias.map((aud: AuditoriaTerritorial) => (
          <AuditoriaCard key={aud.id} auditoria={aud} />
        ))}
      </div>

      {auditorias.length === 0 && (
        <Card className="p-12 text-center">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No se encontraron auditorías territoriales</p>
        </Card>
      )}
    </motion.div>
  );
}

// ============ COMPONENTE: TARJETA DE AUDITORÍA ============

function AuditoriaCard({ auditoria }: { auditoria: AuditoriaTerritorial }) {
  const [expandido, setExpandido] = useState(false);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Icono de Territorial */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: TERRITORIALES.find(t => t.id === auditoria.territorialId)?.color + '20'
            }}
          >
            <MapPin
              className="w-6 h-6"
              style={{
                color: TERRITORIALES.find(t => t.id === auditoria.territorialId)?.color
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono text-xs">
                    {auditoria.codigo}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      background: '#DBEAFE',
                      color: '#1E40AF',
                      border: 'none'
                    }}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {auditoria.cronograma.totalDias} días
                  </Badge>
                </div>
                <h3 className="font-bold text-gray-900 line-clamp-1">{auditoria.titulo}</h3>
                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                  <Building2 className="w-3 h-3" />
                  {auditoria.territorial}
                </p>
              </div>
              <EstadoBadge estado={auditoria.estado} />
            </div>

            {/* Métricas Rápidas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Progreso</p>
                  <p className="text-sm font-bold text-gray-900">{auditoria.progreso}%</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Equipo</p>
                  <p className="text-sm font-bold text-gray-900">{auditoria.equipo.totalPersonas} personas</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Hallazgos</p>
                  <p className="text-sm font-bold text-gray-900">{auditoria.hallazgosEncontrados}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Cumplimiento</p>
                  <p className="text-sm font-bold text-gray-900">{auditoria.cumplimiento}%</p>
                </div>
              </div>
            </div>

            {/* Barra de Progreso */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Etapa: {auditoria.etapaActual.nombre}</span>
                <span>{auditoria.etapaActual.diasRestantes} días restantes</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${auditoria.progreso}%`,
                    background: auditoria.progreso >= 75 ? '#10B981' : auditoria.progreso >= 50 ? '#3B82F6' : '#F59E0B'
                  }}
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setExpandido(!expandido)}
                variant="outline"
                size="sm"
              >
                {expandido ? 'Menos detalles' : 'Ver detalles'}
                <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${expandido ? 'rotate-90' : ''}`} />
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="w-3 h-3 mr-1" />
                Abrir
              </Button>
              <Button variant="outline" size="sm">
                <Edit className="w-3 h-3 mr-1" />
                Editar
              </Button>
            </div>
          </div>
        </div>

        {/* Detalles Expandidos */}
        <AnimatePresence>
          {expandido && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-2">Cronograma Territorial</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span className="text-sm text-gray-700">Planeación</span>
                      <span className="text-sm font-bold text-blue-600">
                        {auditoria.cronograma.etapas.planeacion.dias} días
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <span className="text-sm text-gray-700">
                        Ejecución ({auditoria.cronograma.etapas.ejecucion.modalidad})
                      </span>
                      <span className="text-sm font-bold text-purple-600">
                        {auditoria.cronograma.etapas.ejecucion.dias} días
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm text-gray-700">Comunicación</span>
                      <span className="text-sm font-bold text-green-600">
                        {auditoria.cronograma.etapas.comunicacion.dias} días
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-2">Equipo Auditor</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-amber-50 rounded">
                      <Award className="w-4 h-4 text-amber-600" />
                      <div>
                        <p className="text-xs text-gray-600">Líder</p>
                        <p className="text-sm font-bold text-gray-900">{auditoria.equipo.lider}</p>
                      </div>
                    </div>
                    {auditoria.equipo.miembros.map((miembro, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <Users className="w-4 h-4 text-gray-600" />
                        <div>
                          <p className="text-xs text-gray-600">Miembro {idx + 1}</p>
                          <p className="text-sm font-bold text-gray-900">{miembro}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

// ============ VISTA: COMPARATIVO TERRITORIALES ============

function VistaComparativoTerritoriales({ territoriales, auditorias }: any) {
  // Calcular métricas por territorial
  const metricasPorTerritorial = territoriales.map((terr: Territorial) => {
    const audsTerritoriales = auditorias.filter((a: AuditoriaTerritorial) => a.territorialId === terr.id);
    return {
      territorial: terr.nombre,
      codigo: terr.codigo,
      color: terr.color,
      totalAuditorias: audsTerritoriales.length,
      finalizadas: audsTerritoriales.filter((a: AuditoriaTerritorial) => a.estado === 'Finalizada').length,
      enEjecucion: audsTerritoriales.filter((a: AuditoriaTerritorial) => a.estado === 'Ejecución').length,
      hallazgos: audsTerritoriales.reduce((sum: number, a: AuditoriaTerritorial) => sum + a.hallazgosEncontrados, 0),
      cumplimientoPromedio: audsTerritoriales.length > 0
        ? Math.round(audsTerritoriales.reduce((sum: number, a: AuditoriaTerritorial) => sum + a.cumplimiento, 0) / audsTerritoriales.length)
        : 0
    };
  }).filter(m => m.totalAuditorias > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          Comparativo de Desempeño por Territorial
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Territorial</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Finalizadas</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">En Ejecución</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Hallazgos</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Cumplimiento</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Tendencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metricasPorTerritorial.map((metrica, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: metrica.color }}
                      />
                      <div>
                        <p className="font-bold text-sm text-gray-900">{metrica.codigo}</p>
                        <p className="text-xs text-gray-600">{metrica.territorial}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-gray-900">{metrica.totalAuditorias}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge style={{ background: '#D1FAE5', color: '#065F46' }}>
                      {metrica.finalizadas}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                      {metrica.enEjecucion}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge style={{ background: '#FEE2E2', color: '#991B1B' }}>
                      {metrica.hallazgos}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{metrica.cumplimientoPromedio}%</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${metrica.cumplimientoPromedio}%`,
                            background: metrica.cumplimientoPromedio >= 80 ? '#10B981' : metrica.cumplimientoPromedio >= 60 ? '#F59E0B' : '#EF4444'
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {metrica.cumplimientoPromedio >= 80 ? (
                      <ArrowUpRight className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-600 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Gráfico de Barras Visual */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          Auditorías por Territorial
        </h3>
        <div className="space-y-3">
          {metricasPorTerritorial.map((metrica, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-bold text-gray-900">{metrica.codigo}</span>
                <span className="text-gray-600">{metrica.totalAuditorias} auditorías</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(metrica.totalAuditorias / Math.max(...metricasPorTerritorial.map(m => m.totalAuditorias))) * 100}%` }}
                  transition={{ duration: 1, delay: idx * 0.1 }}
                  className="h-6 rounded-full flex items-center justify-end px-2"
                  style={{ background: metrica.color }}
                >
                  <span className="text-xs font-bold text-white">{metrica.totalAuditorias}</span>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

// ============ VISTA: REPORTES CONSOLIDADOS ============

function VistaReportesConsolidados({ auditorias, territoriales }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900">Reportes Consolidados</h3>
            <p className="text-sm text-gray-600 mt-1">
              Descarga reportes y análisis de auditorías territoriales
            </p>
          </div>
          <Button style={{ background: '#003DA5' }}>
            <Download className="w-4 h-4 mr-2" />
            Generar Reporte General
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Reporte 1 */}
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
            <FileText className="w-8 h-8 text-blue-600 mb-3" />
            <h4 className="font-bold text-gray-900 mb-1">Consolidado General</h4>
            <p className="text-sm text-gray-600 mb-3">
              Reporte completo de todas las auditorías territoriales
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <Download className="w-3 h-3 mr-1" />
              Descargar PDF
            </Button>
          </div>

          {/* Reporte 2 */}
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer">
            <BarChart3 className="w-8 h-8 text-green-600 mb-3" />
            <h4 className="font-bold text-gray-900 mb-1">Comparativo por Región</h4>
            <p className="text-sm text-gray-600 mb-3">
              Análisis comparativo entre regiones geográficas
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <Download className="w-3 h-3 mr-1" />
              Descargar Excel
            </Button>
          </div>

          {/* Reporte 3 */}
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer">
            <PieChart className="w-8 h-8 text-purple-600 mb-3" />
            <h4 className="font-bold text-gray-900 mb-1">Hallazgos Consolidados</h4>
            <p className="text-sm text-gray-600 mb-3">
              Reporte de hallazgos por territorial y categoría
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <Download className="w-3 h-3 mr-1" />
              Descargar PDF
            </Button>
          </div>

          {/* Reporte 4 */}
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-amber-500 hover:bg-amber-50 transition-all cursor-pointer">
            <Clock className="w-8 h-8 text-amber-600 mb-3" />
            <h4 className="font-bold text-gray-900 mb-1">Cronogramas y Tiempos</h4>
            <p className="text-sm text-gray-600 mb-3">
              Análisis de cumplimiento de cronogramas territoriales
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <Download className="w-3 h-3 mr-1" />
              Descargar Excel
            </Button>
          </div>

          {/* Reporte 5 */}
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all cursor-pointer">
            <Users className="w-8 h-8 text-red-600 mb-3" />
            <h4 className="font-bold text-gray-900 mb-1">Equipos Auditores</h4>
            <p className="text-sm text-gray-600 mb-3">
              Composición y desempeño de equipos por territorial
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <Download className="w-3 h-3 mr-1" />
              Descargar PDF
            </Button>
          </div>

          {/* Reporte 6 */}
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer">
            <Target className="w-8 h-8 text-indigo-600 mb-3" />
            <h4 className="font-bold text-gray-900 mb-1">Indicadores de Gestión</h4>
            <p className="text-sm text-gray-600 mb-3">
              KPIs y métricas de desempeño territorial
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <Download className="w-3 h-3 mr-1" />
              Descargar Dashboard
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ MODAL: CREAR AUDITORÍA TERRITORIAL ============

function ModalCrearAuditoriaTerritorial({ territoriales, cronogramas, onCrear, onCerrar }: any) {
  const [paso, setPaso] = useState(1);
  const [formData, setFormData] = useState({
    territorialId: '',
    titulo: '',
    objetivoGeneral: '',
    alcance: '',
    fechaInicio: '',
    lider: '',
    miembros: ['', '']
  });

  const handleCrear = () => {
    const territorial = territoriales.find((t: Territorial) => t.id === formData.territorialId);
    
    const nuevaAuditoria: AuditoriaTerritorial = {
      id: `aud-terr-${Date.now()}`,
      codigo: `AT-2025-${String(Date.now()).slice(-3)}`,
      territorialId: formData.territorialId,
      territorial: territorial.nombre,
      tipo: 'Territorial',
      titulo: formData.titulo,
      objetivoGeneral: formData.objetivoGeneral,
      alcance: formData.alcance,
      estado: 'Planeación',
      progreso: 0,
      fechaInicio: formData.fechaInicio,
      fechaFin: calcularFechaFin(formData.fechaInicio, cronogramas['Territorial'].totalDias),
      cronograma: cronogramas['Territorial'],
      equipo: {
        lider: formData.lider,
        miembros: formData.miembros.filter(m => m),
        totalPersonas: 1 + formData.miembros.filter(m => m).length
      },
      hallazgosEncontrados: 0,
      riesgo: 'Medio',
      cumplimiento: 0,
      presupuesto: 8000000,
      gastoReal: 0,
      etapaActual: {
        nombre: 'Planeación',
        diasRestantes: cronogramas['Territorial'].etapas.planeacion.dias,
        alertas: 0
      }
    };

    onCrear(nuevaAuditoria);
  };

  const calcularFechaFin = (fechaInicio: string, dias: number) => {
    const fecha = new Date(fechaInicio);
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <h3 className="text-lg font-black text-gray-900">Nueva Auditoría Territorial</h3>
          <p className="text-sm text-gray-600 mt-1">
            Cronograma: 10 días planeación + 4 días ejecución + 5 días comunicación = 19 días total
          </p>
        </div>

        <div className="p-6 space-y-4">
          {paso === 1 && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Territorial</label>
                <select
                  value={formData.territorialId}
                  onChange={(e) => setFormData({ ...formData, territorialId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar territorial...</option>
                  {territoriales.map((terr: Territorial) => (
                    <option key={terr.id} value={terr.id}>
                      {terr.codigo} - {terr.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Título de la Auditoría</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ej: Auditoría de Gestión Administrativa 2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Objetivo General</label>
                <textarea
                  value={formData.objetivoGeneral}
                  onChange={(e) => setFormData({ ...formData, objetivoGeneral: e.target.value })}
                  placeholder="Describir el objetivo principal..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Alcance</label>
                <textarea
                  value={formData.alcance}
                  onChange={(e) => setFormData({ ...formData, alcance: e.target.value })}
                  placeholder="Definir el alcance de la auditoría..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Fecha de Inicio</label>
                <input
                  type="date"
                  value={formData.fechaInicio}
                  onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {paso === 2 && (
            <>
              <div className="p-4 bg-blue-50 rounded-lg mb-4">
                <p className="text-sm text-blue-900">
                  <strong>Equipo típico territorial:</strong> 3 personas (1 líder + 2 miembros)
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Líder del Equipo</label>
                <input
                  type="text"
                  value={formData.lider}
                  onChange={(e) => setFormData({ ...formData, lider: e.target.value })}
                  placeholder="Nombre del líder auditor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Miembro 1</label>
                <input
                  type="text"
                  value={formData.miembros[0]}
                  onChange={(e) => {
                    const nuevos = [...formData.miembros];
                    nuevos[0] = e.target.value;
                    setFormData({ ...formData, miembros: nuevos });
                  }}
                  placeholder="Nombre del primer miembro"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Miembro 2</label>
                <input
                  type="text"
                  value={formData.miembros[1]}
                  onChange={(e) => {
                    const nuevos = [...formData.miembros];
                    nuevos[1] = e.target.value;
                    setFormData({ ...formData, miembros: nuevos });
                  }}
                  placeholder="Nombre del segundo miembro"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t flex gap-3">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cancelar
          </Button>
          {paso === 1 ? (
            <Button
              onClick={() => setPaso(2)}
              disabled={!formData.territorialId || !formData.titulo || !formData.fechaInicio}
              className="flex-1"
              style={{ background: '#003DA5' }}
            >
              Siguiente
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleCrear}
              disabled={!formData.lider}
              className="flex-1"
              style={{ background: '#003DA5' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Auditoría
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ============ COMPONENTE: BADGE DE ESTADO ============

function EstadoBadge({ estado }: { estado: EstadoAuditoriaTerritorial }) {
  const configs = {
    'Planeación': { bg: '#DBEAFE', color: '#1E40AF', icon: Calendar },
    'Ejecución': { bg: '#DDD6FE', color: '#6B21A8', icon: Activity },
    'Comunicación': { bg: '#FEF3C7', color: '#92400E', icon: FileText },
    'Finalizada': { bg: '#D1FAE5', color: '#065F46', icon: CheckCircle },
    'Cancelada': { bg: '#FEE2E2', color: '#991B1B', icon: XCircle }
  };

  const config = configs[estado];
  const Icon = config.icon;

  return (
    <Badge style={{ background: config.bg, color: config.color }}>
      <Icon className="w-3 h-3 mr-1" />
      {estado}
    </Badge>
  );
}
