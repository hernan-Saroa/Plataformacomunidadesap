import { motion } from 'motion/react';
import { useState } from 'react';
import {
  Building2,
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Download,
  Eye,
  ChevronRight
} from 'lucide-react';
import { CardSIGL } from '../design-system/CardSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import { PLANIFICACION_2025_1, generarReportePlanificacion } from '../../data/planificacionSemestralData';

export function Fase1PlanificacionSemestral() {
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const planificacion = PLANIFICACION_2025_1;
  const reporte = generarReportePlanificacion(planificacion);

  const sedesFiltradas = planificacion.sedes.filter(sede =>
    sede.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    sede.departamento.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleGenerarReporte = () => {
    console.log('Reporte generado:', reporte);
    alert('Reporte de planificación generado exitosamente');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-slate-900">Fase 1: Planificación Semestral</h1>
          </div>
          <p className="text-slate-600">
            Periodo {planificacion.periodo} • {planificacion.fechaInicio} hasta {planificacion.fechaFin}
          </p>
        </div>
        <BadgeSIGL variant="primary">En Planificación</BadgeSIGL>
      </div>

      {/* Métricas Globales */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <Building2 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-600 mb-1">
              {planificacion.resumenGlobal.sedesActivas}
            </p>
            <p className="text-sm text-slate-600">Sedes Activas</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <GraduationCap className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-purple-600 mb-1">
              {planificacion.resumenGlobal.programasActivos}
            </p>
            <p className="text-sm text-slate-600">Programas Activos</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-600 mb-1">
              {planificacion.resumenGlobal.totalEstudiantes.toLocaleString()}
            </p>
            <p className="text-sm text-slate-600">Estudiantes</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <BookOpen className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-indigo-600 mb-1">
              {planificacion.resumenGlobal.totalGrupos}
            </p>
            <p className="text-sm text-slate-600">Grupos Programados</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <Users className="w-6 h-6 text-teal-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-teal-600 mb-1">
              {planificacion.resumenGlobal.docentesNecesarios}
            </p>
            <p className="text-sm text-slate-600">Docentes Necesarios</p>
          </div>
        </CardSIGL>
      </div>

      {/* Filtros y Búsqueda */}
      <CardSIGL>
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por sede o departamento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <ButtonSIGL variant="outline" size="md">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </ButtonSIGL>
          <ButtonSIGL variant="primary" size="md" onClick={handleGenerarReporte}>
            <Download className="w-4 h-4 mr-2" />
            Generar Reporte
          </ButtonSIGL>
        </div>
      </CardSIGL>

      {/* Lista de Sedes */}
      <div className="space-y-4">
        <h2 className="text-slate-900 font-semibold">Sedes Planificadas</h2>
        
        {sedesFiltradas.map((sede) => (
          <motion.div
            key={sede.codigo}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CardSIGL 
              variant="elevated"
              className={`
                ${sedeSeleccionada === sede.codigo ? 'ring-2 ring-blue-500' : ''}
                hover:shadow-lg transition-all duration-200
              `}
            >
              <div className="p-6">
                {/* Header de Sede */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-slate-900 font-semibold mb-1">
                        {sede.nombre}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {sede.departamento} • {sede.ciudad}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {sede.activa ? (
                          <BadgeSIGL variant="success">Activa</BadgeSIGL>
                        ) : (
                          <BadgeSIGL variant="default">Inactiva</BadgeSIGL>
                        )}
                        {sede.necesidadConvocatoria && (
                          <BadgeSIGL variant="warning">Requiere Convocatoria</BadgeSIGL>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <ButtonSIGL
                    variant="outline"
                    size="sm"
                    onClick={() => setSedeSeleccionada(
                      sedeSeleccionada === sede.codigo ? null : sede.codigo
                    )}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {sedeSeleccionada === sede.codigo ? 'Ocultar' : 'Ver Detalles'}
                  </ButtonSIGL>
                </div>

                {/* Métricas de Sede */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900">
                      {sede.programas.length}
                    </p>
                    <p className="text-xs text-slate-600">Programas</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900">
                      {sede.totalEstudiantes}
                    </p>
                    <p className="text-xs text-slate-600">Estudiantes</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900">
                      {sede.docentesPlanta}
                    </p>
                    <p className="text-xs text-slate-600">Planta</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900">
                      {sede.docentesCatedra}
                    </p>
                    <p className="text-xs text-slate-600">Cátedra</p>
                  </div>
                </div>

                {/* Programas de la Sede */}
                {sedeSeleccionada === sede.codigo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-slate-200 pt-4 mt-4"
                  >
                    <h4 className="text-slate-900 font-semibold mb-3">
                      Programas Académicos
                    </h4>
                    <div className="space-y-3">
                      {sede.programas.map((programa) => (
                        <div
                          key={programa.codigo}
                          className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <GraduationCap className="w-5 h-5 text-purple-600" />
                                <p className="font-semibold text-slate-900">
                                  {programa.nombre}
                                </p>
                                <BadgeSIGL variant="info">{programa.nivel}</BadgeSIGL>
                                <BadgeSIGL variant="default">{programa.modalidad}</BadgeSIGL>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                                <div>
                                  <p className="text-xs text-slate-500">Asignaturas</p>
                                  <p className="font-semibold text-slate-900">
                                    {programa.asignaturas.length}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500">Grupos</p>
                                  <p className="font-semibold text-slate-900">
                                    {programa.grupos.length}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500">Estudiantes</p>
                                  <p className="font-semibold text-slate-900">
                                    {programa.estudiantesActivos}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500">Docentes Necesarios</p>
                                  <p className="font-semibold text-slate-900">
                                    {programa.docentesNecesarios}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500">Disponibles</p>
                                  <p className={`font-semibold ${
                                    programa.deficit && programa.deficit > 0 
                                      ? 'text-red-600' 
                                      : 'text-green-600'
                                  }`}>
                                    {programa.docentesDisponibles}
                                    {programa.deficit && programa.deficit > 0 && (
                                      <span className="text-xs ml-1">
                                        (-{programa.deficit})
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </CardSIGL>
          </motion.div>
        ))}
      </div>

      {/* Análisis de Necesidades */}
      <CardSIGL variant="warning">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-slate-900 font-semibold mb-2">
                Análisis de Necesidades Docentes
              </h3>
              <p className="text-slate-600 mb-4">
                Basado en la planificación académica del periodo {planificacion.periodo}, 
                se identificó un déficit de <strong>{planificacion.resumenGlobal.deficit} docentes</strong>.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {planificacion.resumenGlobal.docentesNecesarios}
                  </p>
                  <p className="text-xs text-slate-600">Necesarios</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {planificacion.resumenGlobal.docentesPlantaDisponibles + 
                     planificacion.resumenGlobal.docentesCatedraDisponibles}
                  </p>
                  <p className="text-xs text-slate-600">Disponibles</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {planificacion.resumenGlobal.deficit}
                  </p>
                  <p className="text-xs text-slate-600">Déficit</p>
                </div>
              </div>
              <ButtonSIGL variant="warning" size="md" className="w-full">
                <TrendingUp className="w-4 h-4 mr-2" />
                Pasar a Análisis de Necesidades (Fase 2)
                <ChevronRight className="w-4 h-4 ml-2" />
              </ButtonSIGL>
            </div>
          </div>
        </div>
      </CardSIGL>

      {/* Resumen de Completitud */}
      <CardSIGL variant="success">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="text-slate-900 font-semibold mb-1">
                Planificación Completada al 75%
              </h3>
              <p className="text-slate-600">
                La planificación semestral está lista. Se han identificado {planificacion.resumenGlobal.sedesActivas} sedes 
                activas con {planificacion.resumenGlobal.programasActivos} programas académicos y {planificacion.resumenGlobal.totalGrupos} grupos.
              </p>
            </div>
          </div>
        </div>
      </CardSIGL>
    </div>
  );
}
