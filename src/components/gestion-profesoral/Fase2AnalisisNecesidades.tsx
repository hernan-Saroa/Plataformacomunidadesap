import { motion } from 'motion/react';
import { useState } from 'react';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Users,
  Building2,
  GraduationCap,
  Calculator,
  PieChart,
  BarChart3,
  Download,
  RefreshCw,
  ChevronRight,
  Info,
  AlertTriangle,
  Target,
  Activity,
  FileText,
  Send,
  Eye
} from 'lucide-react';
import { CardSIGL } from '../design-system/CardSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import { PLANIFICACION_2025_1, identificarNecesidadesConvocatorias } from '../../data/planificacionSemestralData';

interface NecesidadPorSede {
  sede: string;
  codigoSede: string;
  docentesNecesarios: number;
  docentesDisponibles: number;
  deficit: number;
  planta: {
    necesarios: number;
    disponibles: number;
    deficit: number;
  };
  catedra: {
    necesarios: number;
    disponibles: number;
    deficit: number;
  };
  programasAfectados: string[];
  prioridad: 'alta' | 'media' | 'baja';
}

interface ConvocatoriaRecomendada {
  id: string;
  tipo: 'planta' | 'catedra';
  alcance: 'nacional' | 'territorial' | 'sede';
  plazas: number;
  sedes: string[];
  perfiles: string[];
  urgencia: 'alta' | 'media' | 'baja';
  presupuestoEstimado: number;
  fechaInicioPropuesta: string;
  fechaFinPropuesta: string;
}

export function Fase2AnalisisNecesidades() {
  const [calculando, setCalculando] = useState(false);
  const [analisisCompleto, setAnalisisCompleto] = useState(false);
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string | null>(null);

  const planificacion = PLANIFICACION_2025_1;
  const necesidadesGlobales = identificarNecesidadesConvocatorias(planificacion);

  // Calcular necesidades detalladas por sede
  const necesidadesPorSede: NecesidadPorSede[] = planificacion.sedes.map(sede => {
    const totalDeficit = sede.programas.reduce((sum, p) => sum + (p.deficit || 0), 0);
    
    // Calcular proporción planta/cátedra basado en asignaturas
    let totalAsignaturas = 0;
    let asignaturasPlanta = 0;
    let asignaturasCatedra = 0;

    sede.programas.forEach(programa => {
      programa.asignaturas.forEach(asig => {
        totalAsignaturas++;
        if (asig.requiereDocente === 'planta') asignaturasPlanta++;
        else if (asig.requiereDocente === 'catedra') asignaturasCatedra++;
        else {
          asignaturasPlanta += 0.5;
          asignaturasCatedra += 0.5;
        }
      });
    });

    const proporcionPlanta = asignaturasPlanta / totalAsignaturas;
    const deficitPlanta = Math.ceil(totalDeficit * proporcionPlanta);
    const deficitCatedra = Math.floor(totalDeficit * (1 - proporcionPlanta));

    return {
      sede: sede.nombre,
      codigoSede: sede.codigo,
      docentesNecesarios: sede.totalDocentes,
      docentesDisponibles: sede.docentesPlanta + sede.docentesCatedra,
      deficit: totalDeficit,
      planta: {
        necesarios: Math.ceil(sede.totalDocentes * proporcionPlanta),
        disponibles: sede.docentesPlanta,
        deficit: deficitPlanta
      },
      catedra: {
        necesarios: Math.floor(sede.totalDocentes * (1 - proporcionPlanta)),
        disponibles: sede.docentesCatedra,
        deficit: deficitCatedra
      },
      programasAfectados: sede.programas
        .filter(p => p.deficit && p.deficit > 0)
        .map(p => p.nombre),
      prioridad: totalDeficit >= 5 ? 'alta' : totalDeficit >= 2 ? 'media' : 'baja'
    };
  });

  // Generar convocatorias recomendadas
  const convocatoriasRecomendadas: ConvocatoriaRecomendada[] = [];

  // Convocatoria Nacional de Planta
  if (necesidadesGlobales.planta > 0) {
    convocatoriasRecomendadas.push({
      id: 'CONV-2025-1-PLANTA',
      tipo: 'planta',
      alcance: 'nacional',
      plazas: necesidadesGlobales.planta,
      sedes: necesidadesGlobales.sedes,
      perfiles: ['Doctor en Administración Pública', 'Doctor en Ciencia Política', 'Magíster en Gestión Pública'],
      urgencia: necesidadesGlobales.planta >= 5 ? 'alta' : 'media',
      presupuestoEstimado: necesidadesGlobales.planta * 85000000, // 85M por docente/año
      fechaInicioPropuesta: '2025-01-15',
      fechaFinPropuesta: '2025-02-15'
    });
  }

  // Convocatoria Nacional de Cátedra
  if (necesidadesGlobales.catedra > 0) {
    convocatoriasRecomendadas.push({
      id: 'CONV-2025-1-CATEDRA',
      tipo: 'catedra',
      alcance: 'nacional',
      plazas: necesidadesGlobales.catedra,
      sedes: necesidadesGlobales.sedes,
      perfiles: ['Especialista en áreas afines', 'Magíster con experiencia docente', 'Profesionales con experiencia'],
      urgencia: necesidadesGlobales.catedra >= 5 ? 'alta' : 'media',
      presupuestoEstimado: necesidadesGlobales.catedra * 15000000, // 15M por docente/semestre
      fechaInicioPropuesta: '2025-01-20',
      fechaFinPropuesta: '2025-02-20'
    });
  }

  const handleRecalcular = () => {
    setCalculando(true);
    setTimeout(() => {
      setCalculando(false);
      setAnalisisCompleto(true);
    }, 2000);
  };

  const handleGenerarConvocatoria = (convocatoria: ConvocatoriaRecomendada) => {
    alert(`Generando convocatoria: ${convocatoria.id}\nPlazas: ${convocatoria.plazas}\nTipo: ${convocatoria.tipo}`);
  };

  const handleDescargarAnalisis = () => {
    alert('Descargando análisis detallado en PDF...');
  };

  const totalDeficitGlobal = necesidadesPorSede.reduce((sum, n) => sum + n.deficit, 0);
  const totalPlantaDeficit = necesidadesPorSede.reduce((sum, n) => sum + n.planta.deficit, 0);
  const totalCatedraDeficit = necesidadesPorSede.reduce((sum, n) => sum + n.catedra.deficit, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <h1 className="text-slate-900">Fase 2: Análisis de Necesidades Docentes</h1>
          </div>
          <p className="text-slate-600">
            Periodo {planificacion.periodo} • Cálculo inteligente de déficit y recomendaciones
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonSIGL
            variant="outline"
            size="md"
            onClick={handleRecalcular}
            disabled={calculando}
          >
            {calculando ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                Recalcular
              </>
            )}
          </ButtonSIGL>
          <ButtonSIGL variant="primary" size="md" onClick={handleDescargarAnalisis}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Análisis
          </ButtonSIGL>
        </div>
      </div>

      {/* Resumen Ejecutivo */}
      <CardSIGL variant="elevated">
        <div className="p-6">
          <h2 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Resumen Ejecutivo del Análisis
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-red-600 mb-1">{totalDeficitGlobal}</p>
              <p className="text-sm text-slate-600">Déficit Total</p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
              <Users className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-indigo-600 mb-1">{totalPlantaDeficit}</p>
              <p className="text-sm text-slate-600">Planta Faltantes</p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <GraduationCap className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-purple-600 mb-1">{totalCatedraDeficit}</p>
              <p className="text-sm text-slate-600">Cátedra Faltantes</p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-600 mb-1">{convocatoriasRecomendadas.length}</p>
              <p className="text-sm text-slate-600">Convocatorias Sugeridas</p>
            </div>
          </div>

          {/* Método de Cálculo */}
          <CardSIGL variant="info">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-slate-900 font-semibold mb-2">Metodología de Cálculo</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    El análisis se basa en la distribución de asignaturas por tipo de docente requerido, 
                    considerando la carga académica, modalidad y nivel de los programas.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="p-3 bg-white rounded-lg">
                      <p className="font-semibold text-slate-900 mb-1">1. Asignaturas por Tipo</p>
                      <p className="text-slate-600">Análisis de requisitos por materia</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="font-semibold text-slate-900 mb-1">2. Proporción Planta/Cátedra</p>
                      <p className="text-slate-600">Cálculo basado en perfiles académicos</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="font-semibold text-slate-900 mb-1">3. Proyección de Demanda</p>
                      <p className="text-slate-600">Grupos y estudiantes por programa</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardSIGL>
        </div>
      </CardSIGL>

      {/* Análisis por Sede */}
      <div className="space-y-4">
        <h2 className="text-slate-900 font-semibold">Análisis Detallado por Sede</h2>
        
        {necesidadesPorSede.map((necesidad, index) => (
          <motion.div
            key={necesidad.codigoSede}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <CardSIGL
              variant="elevated"
              className={`
                ${sedeSeleccionada === necesidad.codigoSede ? 'ring-2 ring-blue-500' : ''}
                ${necesidad.prioridad === 'alta' ? 'border-l-4 border-l-red-500' :
                  necesidad.prioridad === 'media' ? 'border-l-4 border-l-yellow-500' :
                  'border-l-4 border-l-green-500'}
              `}
            >
              <div className="p-6">
                {/* Header de Sede */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`
                      p-3 rounded-lg
                      ${necesidad.prioridad === 'alta' ? 'bg-red-100' :
                        necesidad.prioridad === 'media' ? 'bg-yellow-100' :
                        'bg-green-100'}
                    `}>
                      <Building2 className={`
                        w-6 h-6
                        ${necesidad.prioridad === 'alta' ? 'text-red-600' :
                          necesidad.prioridad === 'media' ? 'text-yellow-600' :
                          'text-green-600'}
                      `} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-slate-900 font-semibold">{necesidad.sede}</h3>
                        <BadgeSIGL 
                          variant={
                            necesidad.prioridad === 'alta' ? 'danger' :
                            necesidad.prioridad === 'media' ? 'warning' :
                            'success'
                          }
                        >
                          Prioridad {necesidad.prioridad.toUpperCase()}
                        </BadgeSIGL>
                        {necesidad.deficit > 0 && (
                          <BadgeSIGL variant="danger">
                            Déficit: {necesidad.deficit} docentes
                          </BadgeSIGL>
                        )}
                      </div>
                      
                      {necesidad.programasAfectados.length > 0 && (
                        <p className="text-sm text-slate-600 mb-3">
                          Programas afectados: {necesidad.programasAfectados.join(', ')}
                        </p>
                      )}

                      {/* Análisis Planta vs Cátedra */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Docentes de Planta */}
                        <div className="p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <Users className="w-5 h-5 text-indigo-600" />
                            <p className="font-semibold text-slate-900">Docentes de Planta</p>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Necesarios:</span>
                              <span className="font-semibold text-slate-900">{necesidad.planta.necesarios}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Disponibles:</span>
                              <span className="font-semibold text-green-600">{necesidad.planta.disponibles}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-200">
                              <span className="text-slate-600">Déficit:</span>
                              <span className={`font-semibold ${necesidad.planta.deficit > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {necesidad.planta.deficit > 0 ? `-${necesidad.planta.deficit}` : '✓ Cubierto'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Docentes de Cátedra */}
                        <div className="p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <GraduationCap className="w-5 h-5 text-purple-600" />
                            <p className="font-semibold text-slate-900">Docentes de Cátedra</p>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Necesarios:</span>
                              <span className="font-semibold text-slate-900">{necesidad.catedra.necesarios}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Disponibles:</span>
                              <span className="font-semibold text-green-600">{necesidad.catedra.disponibles}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-200">
                              <span className="text-slate-600">Déficit:</span>
                              <span className={`font-semibold ${necesidad.catedra.deficit > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {necesidad.catedra.deficit > 0 ? `-${necesidad.catedra.deficit}` : '✓ Cubierto'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ButtonSIGL
                    variant="outline"
                    size="sm"
                    onClick={() => setSedeSeleccionada(
                      sedeSeleccionada === necesidad.codigoSede ? null : necesidad.codigoSede
                    )}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {sedeSeleccionada === necesidad.codigoSede ? 'Ocultar' : 'Ver Más'}
                  </ButtonSIGL>
                </div>

                {/* Detalles Expandidos */}
                {sedeSeleccionada === necesidad.codigoSede && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border-t border-slate-200 pt-4 mt-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-slate-600 mb-1">Cobertura Actual</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {Math.round((necesidad.docentesDisponibles / necesidad.docentesNecesarios) * 100)}%
                        </p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-slate-600 mb-1">Programas Afectados</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {necesidad.programasAfectados.length}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-slate-600 mb-1">Acción Requerida</p>
                        <p className="text-sm font-semibold text-green-600">
                          {necesidad.deficit > 0 ? 'Convocatoria' : 'No requerida'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </CardSIGL>
          </motion.div>
        ))}
      </div>

      {/* Convocatorias Recomendadas */}
      <CardSIGL variant="warning">
        <div className="p-6">
          <h2 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-yellow-600" />
            Convocatorias Recomendadas
          </h2>
          
          <div className="space-y-4">
            {convocatoriasRecomendadas.map((convocatoria, index) => (
              <motion.div
                key={convocatoria.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.2 }}
                className="p-5 bg-white rounded-lg border-2 border-yellow-200 hover:border-yellow-400 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-slate-900 font-semibold">{convocatoria.id}</h3>
                      <BadgeSIGL variant={convocatoria.tipo === 'planta' ? 'primary' : 'info'}>
                        {convocatoria.tipo.toUpperCase()}
                      </BadgeSIGL>
                      <BadgeSIGL variant={
                        convocatoria.urgencia === 'alta' ? 'danger' :
                        convocatoria.urgencia === 'media' ? 'warning' : 'success'
                      }>
                        Urgencia: {convocatoria.urgencia}
                      </BadgeSIGL>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-slate-600 mb-2">📍 Alcance</p>
                        <p className="font-semibold text-slate-900 capitalize">{convocatoria.alcance}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 mb-2">👥 Plazas Disponibles</p>
                        <p className="font-semibold text-slate-900">{convocatoria.plazas} docentes</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 mb-2">🏢 Sedes Incluidas</p>
                        <p className="font-semibold text-slate-900">{convocatoria.sedes.join(', ')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 mb-2">💰 Presupuesto Estimado</p>
                        <p className="font-semibold text-slate-900">
                          ${(convocatoria.presupuestoEstimado / 1000000).toFixed(1)}M COP
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm text-slate-600 mb-2">🎓 Perfiles Requeridos</p>
                      <div className="flex flex-wrap gap-2">
                        {convocatoria.perfiles.map((perfil, idx) => (
                          <BadgeSIGL key={idx} variant="default">{perfil}</BadgeSIGL>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-600">📅 Inicio Propuesto:</p>
                        <p className="font-semibold text-slate-900">{convocatoria.fechaInicioPropuesta}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">📅 Cierre Propuesto:</p>
                        <p className="font-semibold text-slate-900">{convocatoria.fechaFinPropuesta}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                  <ButtonSIGL
                    variant="primary"
                    size="md"
                    onClick={() => handleGenerarConvocatoria(convocatoria)}
                    className="flex-1"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Generar Convocatoria
                  </ButtonSIGL>
                  <ButtonSIGL variant="outline" size="md">
                    <Eye className="w-4 h-4 mr-2" />
                    Vista Previa
                  </ButtonSIGL>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardSIGL>

      {/* Siguiente Paso */}
      <CardSIGL variant="success">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div className="flex-1">
              <h3 className="text-slate-900 font-semibold mb-1">
                Análisis Completado al 60%
              </h3>
              <p className="text-slate-600">
                Se han identificado {convocatoriasRecomendadas.length} convocatorias necesarias 
                para cubrir el déficit de {totalDeficitGlobal} docentes. 
                Proceder a publicar las convocatorias en la Fase 3.
              </p>
            </div>
            <ButtonSIGL variant="success" size="lg">
              Ir a Convocatorias (Fase 3)
              <ChevronRight className="w-5 h-5 ml-2" />
            </ButtonSIGL>
          </div>
        </div>
      </CardSIGL>
    </div>
  );
}
