import { useState } from 'react';
import { motion } from 'motion/react';
import {
  UserCheck,
  Clock,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  FileText,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Users
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner@2.0.3';

interface Modulo4HoraCatedraProps {
  className?: string;
}

// Mock data
interface DocenteCatedra {
  id: string;
  nombre: string;
  documento: string;
  territorial: string;
  programa: string;
  asignaturas: string[];
  horasAsignadas: number;
  horasDictadas: number;
  valorHora: number;
  totalPagar: number;
  estado: 'Activo' | 'Inactivo' | 'Suspendido';
  resolucion: string;
  fechaInicio: string;
  fechaFin: string;
}

const docentesCatedraMock: DocenteCatedra[] = [
  {
    id: 'catedra-001',
    nombre: 'María Elena González',
    documento: '52.123.456',
    territorial: 'Bogotá',
    programa: 'Administración Pública',
    asignaturas: ['Derecho Constitucional', 'Derecho Administrativo'],
    horasAsignadas: 12,
    horasDictadas: 12,
    valorHora: 85000,
    totalPagar: 1020000,
    estado: 'Activo',
    resolucion: 'RES-2025-0123',
    fechaInicio: '2025-02-01',
    fechaFin: '2025-06-30'
  },
  {
    id: 'catedra-002',
    nombre: 'Carlos Andrés Martínez',
    documento: '80.234.567',
    territorial: 'Medellín',
    programa: 'Economía Pública',
    asignaturas: ['Microeconomía'],
    horasAsignadas: 6,
    horasDictadas: 4,
    valorHora: 90000,
    totalPagar: 360000,
    estado: 'Activo',
    resolucion: 'RES-2025-0124',
    fechaInicio: '2025-02-01',
    fechaFin: '2025-06-30'
  },
  {
    id: 'catedra-003',
    nombre: 'Ana Patricia Rojas',
    documento: '41.345.678',
    territorial: 'Bogotá',
    programa: 'Derecho Público',
    asignaturas: ['Derecho Penal', 'Derecho Procesal'],
    horasAsignadas: 16,
    horasDictadas: 16,
    valorHora: 95000,
    totalPagar: 1520000,
    estado: 'Activo',
    resolucion: 'RES-2025-0125',
    fechaInicio: '2025-02-01',
    fechaFin: '2025-06-30'
  }
];

export function Modulo4HoraCatedra({ className = '' }: Modulo4HoraCatedraProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<string>('docentes');
  const [selectedTerritorial, setSelectedTerritorial] = useState<string>('todas');

  // Stats
  const stats = [
    {
      label: 'Docentes Hora Cátedra',
      value: '1,200',
      subtext: '80-85% del total',
      icon: UserCheck,
      color: 'bg-emerald-500',
      trend: '+45'
    },
    {
      label: 'Horas Totales Mes',
      value: '18,450',
      subtext: 'Diciembre 2024',
      icon: Clock,
      color: 'bg-blue-500',
      trend: '+320'
    },
    {
      label: 'Pagos Pendientes',
      value: '$186M',
      subtext: 'Este periodo',
      icon: DollarSign,
      color: 'bg-amber-500',
      trend: null
    },
    {
      label: 'Activos 2025-I',
      value: '987',
      subtext: 'De 1,200 total',
      icon: TrendingUp,
      color: 'bg-purple-500',
      trend: null
    }
  ];

  const filteredDocentes = docentesCatedraMock.filter(docente => {
    const matchesSearch = docente.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         docente.documento.includes(searchQuery) ||
                         docente.programa.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTerritorial = selectedTerritorial === 'todas' || docente.territorial === selectedTerritorial;
    return matchesSearch && matchesTerritorial;
  });

  const getEstadoBadge = (estado: DocenteCatedra['estado']) => {
    const variants = {
      'Activo': 'bg-green-100 text-green-700 border-green-200',
      'Inactivo': 'bg-gray-100 text-gray-700 border-gray-200',
      'Suspendido': 'bg-red-100 text-red-700 border-red-200'
    };
    return variants[estado];
  };

  const calcularProgreso = (dictadas: number, asignadas: number) => {
    return (dictadas / asignadas) * 100;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <UserCheck className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Docentes de Hora Cátedra</h1>
              <p className="text-sm opacity-90 mt-1">
                Gestión de ~1,200 docentes catedráticos (80-85% del cuerpo docente)
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="bg-white text-emerald-600 hover:bg-gray-100"
            onClick={() => toast.success('Abriendo formulario de nuevo docente...')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Docente
          </Button>
        </div>

        {/* Alert importante */}
        <div className="bg-amber-500/20 border border-amber-300/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm mb-1">Nota Importante</p>
              <p className="text-sm opacity-95">
                Los docentes de hora cátedra están <strong>EXCLUIDOS del PTA</strong>. Su resolución de vinculación funciona como su plan de trabajo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      {stat.trend && (
                        <span className={`text-xs font-medium ${
                          stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.trend}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{stat.subtext}</p>
                  </div>
                  <div className={`p-2 ${stat.color} rounded-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="docentes" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Docentes</span>
          </TabsTrigger>
          <TabsTrigger value="asignaciones" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Asignaciones</span>
          </TabsTrigger>
          <TabsTrigger value="pagos" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span>Pagos</span>
            <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">
              Pendiente
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="docentes" className="mt-6">
          <Card className="p-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar docentes por nombre, documento o programa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={selectedTerritorial}
                onChange={(e) => setSelectedTerritorial(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="todas">Todas las territoriales</option>
                <option value="Bogotá">Bogotá</option>
                <option value="Medellín">Medellín</option>
                <option value="Cali">Cali</option>
                <option value="Barranquilla">Barranquilla</option>
              </select>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>

            {/* Docentes List */}
            <div className="space-y-4">
              {filteredDocentes.map((docente) => {
                const progreso = calcularProgreso(docente.horasDictadas, docente.horasAsignadas);
                
                return (
                  <motion.div
                    key={docente.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{docente.nombre}</h3>
                          <Badge className={getEstadoBadge(docente.estado)}>
                            {docente.estado}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">CC: {docente.documento}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            <span>{docente.territorial}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>{docente.programa}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{docente.horasDictadas}/{docente.horasAsignadas} horas</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span>${docente.totalPagar.toLocaleString('es-CO')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Asignaturas */}
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Asignaturas asignadas:</p>
                      <div className="flex flex-wrap gap-2">
                        {docente.asignaturas.map((asignatura, index) => (
                          <Badge key={index} variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            {asignatura}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Progreso de horas ({progreso.toFixed(0)}%)
                        </span>
                        <span className="text-sm text-gray-600">
                          Resolución: {docente.resolucion}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            progreso === 100 ? 'bg-green-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${progreso}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                        <span>Inicio: {new Date(docente.fechaInicio).toLocaleDateString('es-CO')}</span>
                        <span>Fin: {new Date(docente.fechaFin).toLocaleDateString('es-CO')}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {filteredDocentes.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No se encontraron docentes</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="asignaciones" className="mt-6">
          <Card className="p-6">
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Gestión de Asignaciones
              </h3>
              <p className="text-gray-600 mb-4">
                Administra la asignación de carga horaria para docentes de hora cátedra
              </p>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Asignación
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pagos" className="mt-6">
          <Card className="p-6">
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Control de Pagos
              </h3>
              <p className="text-gray-600 mb-4">
                Total pendiente de pago: <strong className="text-amber-600">$186.450.000</strong>
              </p>
              <div className="flex gap-3 justify-center">
                <Button className="bg-amber-600 hover:bg-amber-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Procesar Pagos
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Reporte
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
