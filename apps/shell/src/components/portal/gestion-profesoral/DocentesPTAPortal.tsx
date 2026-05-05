/**
 * ════════════════════════════════════════════════════════════════════════════
 * PORTAL DOCENTES - PLAN DE TRABAJO ACADÉMICO (PTA)
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Vista del portal transaccional para que los docentes gestionen su PTA:
 * - Visualizar actividades asignadas
 * - Registrar cumplimiento de horas
 * - Subir evidencias
 * - Ver estadísticas personales
 * 
 * COHERENTE CON: Módulo de Gestión Profesoral del Backoffice
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Calendar, Clock, CheckCircle2, AlertCircle, TrendingUp,
  BookOpen, Users, FileText, Upload, Download, Activity, Target,
  Award, BarChart3, Filter, Search, Eye, Edit, Plus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Separator } from '../../ui/separator';

interface DocentesPTAPortalProps {
  onVolver: () => void;
}

interface ActividadPTA {
  id: string;
  categoria: 'Docencia' | 'Investigación' | 'Extensión' | 'Administrativa';
  actividad: string;
  horasAsignadas: number;
  horasEjecutadas: number;
  estado: 'Pendiente' | 'En Progreso' | 'Completada' | 'Atrasada';
  fechaLimite: string;
  evidencias: number;
}

// Mock data
const ACTIVIDADES_MOCK: ActividadPTA[] = [
  {
    id: 'ACT-001',
    categoria: 'Docencia',
    actividad: 'Administración Pública I - Grupo A',
    horasAsignadas: 64,
    horasEjecutadas: 48,
    estado: 'En Progreso',
    fechaLimite: '2025-06-30',
    evidencias: 8,
  },
  {
    id: 'ACT-002',
    categoria: 'Docencia',
    actividad: 'Teoría del Estado - Grupo B',
    horasAsignadas: 48,
    horasEjecutadas: 36,
    estado: 'En Progreso',
    fechaLimite: '2025-06-30',
    evidencias: 6,
  },
  {
    id: 'ACT-003',
    categoria: 'Investigación',
    actividad: 'Proyecto: Gestión Pública Digital',
    horasAsignadas: 120,
    horasEjecutadas: 95,
    estado: 'En Progreso',
    fechaLimite: '2025-12-15',
    evidencias: 12,
  },
  {
    id: 'ACT-004',
    categoria: 'Extensión',
    actividad: 'Seminario de Actualización',
    horasAsignadas: 16,
    horasEjecutadas: 16,
    estado: 'Completada',
    fechaLimite: '2025-03-20',
    evidencias: 4,
  },
  {
    id: 'ACT-005',
    categoria: 'Administrativa',
    actividad: 'Comité Curricular',
    horasAsignadas: 24,
    horasEjecutadas: 18,
    estado: 'En Progreso',
    fechaLimite: '2025-12-31',
    evidencias: 3,
  },
];

export function DocentesPTAPortal({ onVolver }: DocentesPTAPortalProps) {
  const [actividades, setActividades] = useState<ActividadPTA[]>(ACTIVIDADES_MOCK);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todas');
  const [busqueda, setBusqueda] = useState<string>('');

  // Calcular estadísticas
  const totalHorasAsignadas = actividades.reduce((sum, act) => sum + act.horasAsignadas, 0);
  const totalHorasEjecutadas = actividades.reduce((sum, act) => sum + act.horasEjecutadas, 0);
  const porcentajeCumplimiento = Math.round((totalHorasEjecutadas / totalHorasAsignadas) * 100);
  const actividadesCompletadas = actividades.filter(a => a.estado === 'Completada').length;
  const actividadesPendientes = actividades.filter(a => a.estado !== 'Completada').length;

  // Filtrar actividades
  const actividadesFiltradas = actividades.filter(act => {
    const matchCategoria = filtroCategoria === 'Todas' || act.categoria === filtroCategoria;
    const matchBusqueda = act.actividad.toLowerCase().includes(busqueda.toLowerCase());
    return matchCategoria && matchBusqueda;
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20 md:pb-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={onVolver}
            variant="ghost"
            className="mb-4 gap-2 hover:bg-blue-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Portal
          </Button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                Mi Plan de Trabajo Académico
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Gestiona tus actividades y horas PTA del período actual
              </p>
            </div>
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-sm font-semibold">
              Período 2025-1
            </Badge>
          </div>
        </div>

        {/* KPIs Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Horas */}
          <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Horas</p>
              <p className="text-2xl font-black text-blue-700">{totalHorasAsignadas}h</p>
              <p className="text-xs text-gray-500 mt-1">Asignadas período</p>
            </CardContent>
          </Card>

          {/* Horas Ejecutadas */}
          <Card className="shadow-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-purple-600" />
                </div>
                <Badge className="bg-purple-500 text-white text-xs">{porcentajeCumplimiento}%</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-1">Horas Ejecutadas</p>
              <p className="text-2xl font-black text-purple-700">{totalHorasEjecutadas}h</p>
              <p className="text-xs text-gray-500 mt-1">de {totalHorasAsignadas}h totales</p>
            </CardContent>
          </Card>

          {/* Actividades Completadas */}
          <Card className="shadow-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Completadas</p>
              <p className="text-2xl font-black text-green-700">{actividadesCompletadas}</p>
              <p className="text-xs text-gray-500 mt-1">actividades</p>
            </CardContent>
          </Card>

          {/* Actividades Pendientes */}
          <Card className="shadow-lg border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Pendientes</p>
              <p className="text-2xl font-black text-orange-700">{actividadesPendientes}</p>
              <p className="text-xs text-gray-500 mt-1">en proceso</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y Búsqueda */}
        <Card className="shadow-lg mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Búsqueda */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar actividad..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Filtro Categoría */}
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Todas">Todas las categorías</option>
                <option value="Docencia">Docencia</option>
                <option value="Investigación">Investigación</option>
                <option value="Extensión">Extensión</option>
                <option value="Administrativa">Administrativa</option>
              </select>

              {/* Botones Acción */}
              <Button className="bg-[#1e5da8] hover:bg-[#1557a0] gap-2">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Actividades */}
        <div className="space-y-4">
          {actividadesFiltradas.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No se encontraron actividades</p>
              </CardContent>
            </Card>
          ) : (
            actividadesFiltradas.map((actividad) => {
              const porcentaje = Math.round((actividad.horasEjecutadas / actividad.horasAsignadas) * 100);
              
              const estadoConfig = {
                'Completada': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-500' },
                'En Progreso': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-500' },
                'Pendiente': { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-500' },
                'Atrasada': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-500' },
              };

              const config = estadoConfig[actividad.estado];

              const categoriaConfig = {
                'Docencia': { icon: <BookOpen className="w-5 h-5" />, color: 'text-blue-600' },
                'Investigación': { icon: <Target className="w-5 h-5" />, color: 'text-purple-600' },
                'Extensión': { icon: <Users className="w-5 h-5" />, color: 'text-green-600' },
                'Administrativa': { icon: <FileText className="w-5 h-5" />, color: 'text-orange-600' },
              };

              const catConfig = categoriaConfig[actividad.categoria];

              return (
                <Card key={actividad.id} className={`shadow-lg border-2 ${config.border} ${config.bg}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Info Actividad */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-10 h-10 bg-white rounded-lg flex items-center justify-center ${catConfig.color} flex-shrink-0`}>
                            {catConfig.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-black text-gray-900 break-words">{actividad.actividad}</h3>
                              <Badge className={`${config.badge} text-white text-xs font-semibold flex-shrink-0`}>
                                {actividad.estado}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {actividad.categoria} • {actividad.id}
                            </p>
                          </div>
                        </div>

                        {/* Barra de Progreso */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">Progreso de Horas</span>
                            <span className="text-xs font-bold text-gray-900">
                              {actividad.horasEjecutadas}h / {actividad.horasAsignadas}h ({porcentaje}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`${config.badge} h-2 rounded-full transition-all duration-300`}
                              style={{ width: `${Math.min(porcentaje, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Límite: {new Date(actividad.fechaLimite).toLocaleDateString('es-CO')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>{actividad.evidencias} evidencias</span>
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 lg:flex-col lg:items-stretch">
                        <Button variant="outline" size="sm" className="flex-1 lg:flex-initial gap-1">
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">Ver</span>
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 lg:flex-initial gap-1">
                          <Upload className="w-4 h-4" />
                          <span className="hidden sm:inline">Subir</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
