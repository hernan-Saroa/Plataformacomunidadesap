import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner@2.0.3';
import { CONVOCATORIAS_ESAP, getEstadisticasConvocatorias, type Convocatoria } from '../../data/convocatoriasData';

interface Modulo2ConvocatoriasProps {
  className?: string;
}

export function Modulo2Convocatorias({ className = '' }: Modulo2ConvocatoriasProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<string>('convocatorias');
  const [selectedEstado, setSelectedEstado] = useState<string>('todas');

  // Stats - usando estadísticas centralizadas
  const estadisticas = getEstadisticasConvocatorias();
  
  const stats = [
    {
      label: 'Convocatorias Activas',
      value: String(estadisticas.convocatoriasAbiertas),
      subtext: '2025',
      icon: FileText,
      color: 'bg-blue-500',
      trend: null
    },
    {
      label: 'Total Postulados',
      value: String(estadisticas.candidatosPendientes + estadisticas.candidatosEnEvaluacion),
      subtext: 'En proceso',
      icon: Users,
      color: 'bg-purple-500',
      trend: null
    },
    {
      label: 'En Evaluación',
      value: String(estadisticas.convocatoriasEnEvaluacion),
      subtext: 'Requieren calificación',
      icon: Clock,
      color: 'bg-amber-500',
      trend: null
    },
    {
      label: 'Banco de Elegibles',
      value: String(estadisticas.bancoElegibles),
      subtext: 'Docentes disponibles',
      icon: Award,
      color: 'bg-green-500',
      trend: null
    }
  ];

  const filteredConvocatorias = CONVOCATORIAS_ESAP.filter(conv => {
    const matchesSearch = conv.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.territorial.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEstado = selectedEstado === 'todas' || conv.estado === selectedEstado;
    return matchesSearch && matchesEstado;
  });

  const getEstadoBadge = (estado: Convocatoria['estado']) => {
    const variants = {
      'Abierta': 'bg-green-100 text-green-700 border-green-200',
      'En Evaluación': 'bg-amber-100 text-amber-700 border-amber-200',
      'Cerrada': 'bg-gray-100 text-gray-700 border-gray-200',
      'Cancelada': 'bg-red-100 text-red-700 border-red-200'
    };
    return variants[estado];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Convocatorias Docentes</h1>
              <p className="text-sm opacity-90 mt-1">
                Gestión de convocatorias, evaluación y banco de elegibles (~270 docentes PTA)
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="bg-white text-purple-600 hover:bg-gray-100"
            onClick={() => toast.success('Abriendo formulario de nueva convocatoria...')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Convocatoria
          </Button>
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
          <TabsTrigger value="convocatorias" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Convocatorias</span>
          </TabsTrigger>
          <TabsTrigger value="postulados" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Postulados</span>
            <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-700">
              {stats[1].value}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="elegibles" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            <span>Banco Elegibles</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="convocatorias" className="mt-6">
          <Card className="p-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar convocatorias..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={selectedEstado}
                onChange={(e) => setSelectedEstado(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="todas">Todos los estados</option>
                <option value="Abierta">Abierta</option>
                <option value="En Evaluación">En Evaluación</option>
                <option value="Cerrada">Cerrada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>

            {/* Convocatorias List */}
            <div className="space-y-4">
              {filteredConvocatorias.map((conv) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{conv.titulo}</h3>
                        <Badge className={getEstadoBadge(conv.estado)}>
                          {conv.estado}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{conv.codigo}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          <span>{conv.territorial.nombre}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          <span>{conv.programa}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{conv.postulados} postulados / {conv.vacantes} vacantes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(conv.fechaCierre).toLocaleDateString('es-CO')}</span>
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
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="text-gray-700">
                      <strong>Perfil requerido:</strong> {conv.perfilRequerido}
                    </p>
                  </div>
                </motion.div>
              ))}

              {filteredConvocatorias.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No se encontraron convocatorias</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="postulados" className="mt-6">
          <Card className="p-6">
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Gestión de Postulados
              </h3>
              <p className="text-gray-600 mb-4">
                Revisa y evalúa las postulaciones recibidas para cada convocatoria
              </p>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Search className="w-4 h-4 mr-2" />
                Ver Postulados
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="elegibles" className="mt-6">
          <Card className="p-6">
            <div className="text-center py-12">
              <Award className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Banco de Elegibles
              </h3>
              <p className="text-gray-600 mb-4">
                156 docentes en banco de elegibles disponibles para vinculación
              </p>
              <Button className="bg-green-600 hover:bg-green-700">
                <Users className="w-4 h-4 mr-2" />
                Ver Banco de Elegibles
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}