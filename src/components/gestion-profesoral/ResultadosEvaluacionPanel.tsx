import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Download,
  Star,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  FileText,
  Award,
  AlertCircle,
  ThumbsUp,
  MessageSquare
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ResultadosEvaluacionPanelProps {
  evaluacion: any;
  onBack: () => void;
  className?: string;
}

export function ResultadosEvaluacionPanel({
  evaluacion,
  onBack,
  className = ''
}: ResultadosEvaluacionPanelProps) {
  const [vistaActual, setVistaActual] = useState<'resumen' | 'detalle' | 'comparativa'>('resumen');

  // Mock data de resultados por criterio
  const resultadosCriterios = [
    { nombre: 'Dominio del Contenido', puntaje: 4.5, peso: 20 },
    { nombre: 'Metodología', puntaje: 4.3, peso: 15 },
    { nombre: 'Comunicación', puntaje: 4.6, peso: 15 },
    { nombre: 'Evaluación Justa', puntaje: 4.2, peso: 10 },
    { nombre: 'Puntualidad', puntaje: 4.4, peso: 10 },
    { nombre: 'Disponibilidad', puntaje: 4.3, peso: 10 },
    { nombre: 'Materiales', puntaje: 4.1, peso: 10 },
    { nombre: 'Motivación', puntaje: 4.5, peso: 10 }
  ];

  // Data para radar chart
  const radarData = resultadosCriterios.map(r => ({
    criterio: r.nombre.split(' ')[0],
    puntaje: r.puntaje,
    maximo: 5
  }));

  // Distribución de calificaciones
  const distribucionData = [
    { rango: '5.0', cantidad: 35, porcentaje: 45 },
    { rango: '4.0-4.9', cantidad: 25, porcentaje: 32 },
    { rango: '3.0-3.9', cantidad: 10, porcentaje: 13 },
    { rango: '2.0-2.9', cantidad: 5, porcentaje: 6 },
    { rango: '1.0-1.9', cantidad: 3, porcentaje: 4 }
  ];

  // Tendencia histórica
  const tendenciaData = [
    { periodo: '2024-I', puntaje: 4.1 },
    { periodo: '2024-II', puntaje: 4.3 },
    { periodo: '2025-I', puntaje: 4.5 }
  ];

  // Comparativa con promedio institucional
  const comparativaData = [
    { aspecto: 'Dominio', docente: 4.5, promedio: 4.2 },
    { aspecto: 'Metodología', docente: 4.3, promedio: 4.1 },
    { aspecto: 'Comunicación', docente: 4.6, promedio: 4.3 },
    { aspecto: 'Evaluación', docente: 4.2, promedio: 4.0 },
    { aspecto: 'Puntualidad', docente: 4.4, promedio: 4.2 }
  ];

  // Comentarios destacados (mock)
  const comentariosDestacados = [
    {
      id: '1',
      texto: 'Excelente docente, muy claro en sus explicaciones y siempre dispuesto a ayudar.',
      calificacion: 5.0,
      fecha: '2025-04-10'
    },
    {
      id: '2',
      texto: 'Domina muy bien el tema y los materiales son de alta calidad.',
      calificacion: 5.0,
      fecha: '2025-04-12'
    },
    {
      id: '3',
      texto: 'Muy buen profesor, aunque a veces podría ser más puntual.',
      calificacion: 4.0,
      fecha: '2025-04-08'
    }
  ];

  const COLORS = ['#1e5da8', '#2a6dbd', '#3d7fc7', '#5191d1', '#65a3db'];

  const getInitials = (nombre: string) => {
    const parts = nombre.split(' ');
    return parts.length >= 2
      ? `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
      : nombre.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calcularProgreso = (completados: number, esperados: number): number => {
    return esperados > 0 ? Math.round((completados / esperados) * 100) : 0;
  };

  const getPuntajeColor = (puntaje: number) => {
    if (puntaje >= 4.5) return 'text-green-600';
    if (puntaje >= 4.0) return 'text-blue-600';
    if (puntaje >= 3.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const getTendencia = () => {
    if (tendenciaData.length < 2) return null;
    const ultimo = tendenciaData[tendenciaData.length - 1].puntaje;
    const penultimo = tendenciaData[tendenciaData.length - 2].puntaje;
    const diferencia = ultimo - penultimo;
    return {
      diferencia,
      porcentaje: Math.abs((diferencia / penultimo) * 100).toFixed(1),
      tipo: diferencia > 0 ? 'positiva' : diferencia < 0 ? 'negativa' : 'neutral'
    };
  };

  const tendencia = getTendencia();
  const progreso = calcularProgreso(
    evaluacion.participantes_completados,
    evaluacion.participantes_esperados
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Resultados de Evaluación
          </h1>
          <p className="text-gray-600 mt-1">
            {evaluacion.docente_nombre} - {evaluacion.periodo}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Info de la Evaluación */}
      <Card className="p-6">
        <div className="flex items-start gap-6">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="bg-[#1e5da8] text-white text-xl">
              {getInitials(evaluacion.docente_nombre)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {evaluacion.docente_nombre}
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{evaluacion.periodo}</Badge>
                  <Badge className="bg-purple-100 text-purple-700">
                    {evaluacion.tipo}
                  </Badge>
                  <Badge className="bg-green-100 text-green-700">
                    {evaluacion.estado}
                  </Badge>
                </div>
              </div>

              {evaluacion.puntaje_promedio && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
                    <span className={`text-4xl font-bold ${getPuntajeColor(evaluacion.puntaje_promedio)}`}>
                      {evaluacion.puntaje_promedio.toFixed(1)}
                    </span>
                    <span className="text-gray-600 text-xl">/5.0</span>
                  </div>
                  {tendencia && tendencia.tipo !== 'neutral' && (
                    <div
                      className={`flex items-center justify-center gap-1 text-sm ${
                        tendencia.tipo === 'positiva' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tendencia.tipo === 'positiva' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>{tendencia.porcentaje}% vs periodo anterior</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Periodo</p>
                  <p className="font-medium text-gray-900 text-sm">
                    {formatDate(evaluacion.fecha_inicio)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Participación</p>
                  <p className="font-medium text-gray-900 text-sm">
                    {evaluacion.participantes_completados}/{evaluacion.participantes_esperados} ({progreso}%)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Aspectos</p>
                  <p className="font-medium text-gray-900 text-sm">
                    {evaluacion.aspectos_evaluados} criterios
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Award className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Ranking</p>
                  <p className="font-medium text-gray-900 text-sm">
                    Top 15% institucional
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setVistaActual('resumen')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            vistaActual === 'resumen'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Resumen
        </button>
        <button
          onClick={() => setVistaActual('detalle')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            vistaActual === 'detalle'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Detalle por Criterio
        </button>
        <button
          onClick={() => setVistaActual('comparativa')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            vistaActual === 'comparativa'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Comparativa
        </button>
      </div>

      {/* Vista Resumen */}
      {vistaActual === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Radar */}
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">
              Evaluación por Criterios
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="criterio" />
                <PolarRadiusAxis domain={[0, 5]} />
                <Radar
                  name="Puntaje"
                  dataKey="puntaje"
                  stroke="#1e5da8"
                  fill="#1e5da8"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Distribución de Calificaciones */}
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">
              Distribución de Calificaciones
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distribucionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rango" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#1e5da8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Tendencia Histórica */}
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">
              Tendencia Histórica
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={tendenciaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="puntaje"
                  stroke="#1e5da8"
                  strokeWidth={3}
                  dot={{ fill: '#1e5da8', r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Comentarios Destacados */}
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comentarios Destacados
            </h3>
            <div className="space-y-3">
              {comentariosDestacados.map((comentario) => (
                <div
                  key={comentario.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(comentario.calificacion)
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600">
                      {formatDate(comentario.fecha)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{comentario.texto}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Vista Detalle */}
      {vistaActual === 'detalle' && (
        <div className="space-y-4">
          {resultadosCriterios.map((criterio, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-gray-900">{criterio.nombre}</h4>
                      <Badge variant="secondary">{criterio.peso}% del total</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                      <span className={`text-3xl font-bold ${getPuntajeColor(criterio.puntaje)}`}>
                        {criterio.puntaje.toFixed(1)}
                      </span>
                      <span className="text-gray-600">/5.0</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progreso</span>
                    <span className="font-medium text-gray-900">
                      {((criterio.puntaje / 5) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        criterio.puntaje >= 4.5
                          ? 'bg-green-500'
                          : criterio.puntaje >= 4.0
                          ? 'bg-blue-500'
                          : criterio.puntaje >= 3.5
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${(criterio.puntaje / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Vista Comparativa */}
      {vistaActual === 'comparativa' && (
        <div className="grid grid-cols-1 gap-6">
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">
              Comparativa con Promedio Institucional
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={comparativaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="aspecto" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="docente" fill="#1e5da8" name="Este Docente" radius={[8, 8, 0, 0]} />
                <Bar dataKey="promedio" fill="#94a3b8" name="Promedio Institucional" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Fortalezas y Áreas de Mejora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-green-600" />
                Principales Fortalezas
              </h3>
              <div className="space-y-3">
                {resultadosCriterios
                  .sort((a, b) => b.puntaje - a.puntaje)
                  .slice(0, 3)
                  .map((criterio, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 font-bold">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{criterio.nombre}</p>
                        <p className="text-xs text-gray-600">
                          Puntaje: {criterio.puntaje.toFixed(1)}/5.0
                        </p>
                      </div>
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    </div>
                  ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Áreas de Mejora
              </h3>
              <div className="space-y-3">
                {resultadosCriterios
                  .sort((a, b) => a.puntaje - b.puntaje)
                  .slice(0, 3)
                  .map((criterio, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-600 font-bold">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{criterio.nombre}</p>
                        <p className="text-xs text-gray-600">
                          Puntaje: {criterio.puntaje.toFixed(1)}/5.0
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
