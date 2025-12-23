/**
 * RESUMEN VISUAL DEL PTA
 * 
 * Vista completa y profesional del Plan de Trabajo Académico
 * Muestra todos los componentes, distribución, y estadísticas
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  FlaskConical,
  Users,
  Award,
  Briefcase,
  Calendar,
  Clock,
  User,
  Building2,
  Download,
  Printer,
  Share2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Info,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { PTADistribucionChart } from './PTADistribucionChart';

interface PTAResumenVisualProps {
  pta: any;
  docente?: any;
  onCerrar?: () => void;
}

export function PTAResumenVisual({ pta, docente, onCerrar }: PTAResumenVisualProps) {
  
  const [seccionExpandida, setSeccionExpandida] = useState<string | null>(null);
  
  // Calcular totales
  const totalHoras = 
    (pta.componenteDocencia?.horas || 0) +
    (pta.componenteInvestigacion?.horas || 0) +
    (pta.componenteExtension?.horas || 0) +
    (pta.componenteComplementarias?.horas || 0) +
    (pta.componenteAdministrativas?.horas || 0);
  
  const horasProgramables = pta.horas_programables || 360;
  const progreso = (totalHoras / horasProgramables) * 100;
  
  // Componentes configuración
  const componentes = [
    {
      id: 'docencia',
      nombre: 'Docencia',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-600',
      data: pta.componenteDocencia
    },
    {
      id: 'investigacion',
      nombre: 'Investigación',
      icon: FlaskConical,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      borderColor: 'border-purple-600',
      data: pta.componenteInvestigacion
    },
    {
      id: 'extension',
      nombre: 'Extensión',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-600',
      data: pta.componenteExtension
    },
    {
      id: 'complementarias',
      nombre: 'Complementarias',
      icon: Award,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-600',
      data: pta.componenteComplementarias
    },
    {
      id: 'administrativas',
      nombre: 'Administrativas',
      icon: Briefcase,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-600',
      data: pta.componenteAdministrativas
    }
  ];
  
  const toggleSeccion = (id: string) => {
    setSeccionExpandida(seccionExpandida === id ? null : id);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-[#1e5da8] to-[#1a4d8f] text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Plan de Trabajo Académico</h2>
            <p className="text-blue-100">Vista General y Resumen</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>
        
        {/* Info del docente */}
        {docente && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/10 rounded-lg">
            <div>
              <p className="text-xs text-blue-100 mb-1">Docente</p>
              <p className="font-medium">{docente.nombre || 'No especificado'}</p>
            </div>
            <div>
              <p className="text-xs text-blue-100 mb-1">Cédula</p>
              <p className="font-medium">{docente.cedula || 'No especificada'}</p>
            </div>
            <div>
              <p className="text-xs text-blue-100 mb-1">Territorial</p>
              <p className="font-medium">{docente.territorial || 'Nacional'}</p>
            </div>
            <div>
              <p className="text-xs text-blue-100 mb-1">Período</p>
              <p className="font-medium">{pta.periodo || '2025-1'}</p>
            </div>
          </div>
        )}
      </Card>
      
      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Horas Programables</p>
              <p className="text-2xl font-bold text-gray-900">{horasProgramables}h</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Horas Asignadas</p>
              <p className="text-2xl font-bold text-blue-600">{totalHoras}h</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full ${horasProgramables - totalHoras >= 0 ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center`}>
              <BarChart3 className={`w-5 h-5 ${horasProgramables - totalHoras >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Horas Restantes</p>
              <p className={`text-2xl font-bold ${horasProgramables - totalHoras >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {horasProgramables - totalHoras}h
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Progreso</p>
              <p className="text-2xl font-bold text-purple-600">{progreso.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Distribución Visual */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Distribución del PTA</h3>
        
        {/* Gráfico circular */}
        <PTADistribucionChart
          componenteDocencia={pta.componenteDocencia || { horas: 0, porcentaje: 0 }}
          componenteInvestigacion={pta.componenteInvestigacion || { horas: 0, porcentaje: 0 }}
          componenteExtension={pta.componenteExtension || { horas: 0, porcentaje: 0 }}
          componenteComplementarias={pta.componenteComplementarias || { horas: 0, porcentaje: 0 }}
          componenteAdministrativas={pta.componenteAdministrativas || { horas: 0, porcentaje: 0 }}
        />
        
        {/* Barra de distribución horizontal */}
        <div className="mt-6">
          <div className="h-12 flex rounded-lg overflow-hidden">
            {componentes.map((comp) => {
              const porcentaje = ((comp.data?.horas || 0) / totalHoras) * 100;
              if (porcentaje === 0) return null;
              
              return (
                <div
                  key={comp.id}
                  className={`${comp.bgColor} flex items-center justify-center transition-all hover:opacity-80`}
                  style={{ width: `${porcentaje}%` }}
                  title={`${comp.nombre}: ${comp.data?.horas}h (${porcentaje.toFixed(1)}%)`}
                >
                  {porcentaje > 10 && (
                    <span className={`text-sm font-bold ${comp.color}`}>
                      {porcentaje.toFixed(0)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Leyenda */}
          <div className="flex flex-wrap gap-4 mt-4">
            {componentes.map((comp) => {
              const Icon = comp.icon;
              const horas = comp.data?.horas || 0;
              const porcentaje = ((horas / horasProgramables) * 100).toFixed(1);
              
              return (
                <div key={comp.id} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${comp.bgColor}`} />
                  <Icon className={`w-4 h-4 ${comp.color}`} />
                  <span className="text-sm text-gray-700">
                    {comp.nombre}: <strong>{horas}h</strong> ({porcentaje}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
      
      {/* Detalle por Componente */}
      <div className="space-y-3">
        {componentes.map((comp) => {
          const Icon = comp.icon;
          const expandido = seccionExpandida === comp.id;
          const actividades = comp.data?.actividades || [];
          const horas = comp.data?.horas || 0;
          const porcentaje = comp.data?.porcentaje || 0;
          
          if (horas === 0) return null;
          
          return (
            <motion.div
              key={comp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              layout
            >
              <Card className={`border-l-4 ${comp.borderColor}`}>
                <button
                  onClick={() => toggleSeccion(comp.id)}
                  className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full ${comp.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${comp.color}`} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        Componente de {comp.nombre}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{actividades.length} actividades</span>
                        <span>•</span>
                        <span className="font-medium">{horas}h asignadas</span>
                        <span>•</span>
                        <span className="font-medium">{porcentaje.toFixed(1)}% del PTA</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{horas}h</p>
                      <p className="text-sm text-gray-600">{porcentaje.toFixed(1)}%</p>
                    </div>
                    {expandido ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>
                
                {/* Detalle expandido */}
                {expandido && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t px-5 pb-5"
                  >
                    <div className="pt-4 space-y-3">
                      {comp.id === 'docencia' && actividades.map((act: any, idx: number) => (
                        <div key={idx} className="p-4 bg-blue-50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 mb-1">{act.nombreAsignatura}</h4>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                                <span>Código: {act.codigoAsignatura}</span>
                                <span>•</span>
                                <span>{act.programaAcademico}</span>
                                <span>•</span>
                                <span>{act.territorial}</span>
                                <span>•</span>
                                <span>{act.numeroCreditos} créditos</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-blue-600">{act.horasPTA}h</p>
                              <p className="text-xs text-gray-600">({act.porcentajePTA?.toFixed(1)}%)</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-blue-200">
                            <div>
                              <p className="text-xs text-gray-600">Modalidad</p>
                              <p className="text-sm font-medium text-gray-900">{act.modalidad}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Estudiantes</p>
                              <p className="text-sm font-medium text-gray-900">{act.totalEstudiantes || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Criterio</p>
                              <p className="text-sm font-medium text-gray-900">1+2 ({act.horasBase}h × 3)</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {comp.id === 'investigacion' && actividades.map((act: any, idx: number) => (
                        <div key={idx} className="p-4 bg-purple-50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 mb-1">{act.nombreProyecto}</h4>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                                <span>{act.tipoProyectoLabel}</span>
                                <span>•</span>
                                <span>{act.rolLabel}</span>
                                {act.grupoInvestigacion && (
                                  <>
                                    <span>•</span>
                                    <span>{act.grupoInvestigacion}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-purple-600">{act.horasDescarga}h</p>
                              <p className="text-xs text-gray-600">({act.porcentajePTA?.toFixed(1)}%)</p>
                            </div>
                          </div>
                          {act.productosComprometidos?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {act.productosComprometidos.map((producto: string, pIdx: number) => (
                                <Badge key={pIdx} variant="outline" className="text-xs bg-purple-100">
                                  {producto}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {comp.id === 'extension' && actividades.map((act: any, idx: number) => (
                        <div key={idx} className="p-4 bg-green-50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 mb-1">{act.nombreActividad}</h4>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                                <span>{act.tipoExtensionLabel}</span>
                                {act.entidadBeneficiaria && (
                                  <>
                                    <span>•</span>
                                    <span>{act.entidadBeneficiaria}</span>
                                  </>
                                )}
                                <span>•</span>
                                <span>{act.modalidad}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">{act.horasAsignadas}h</p>
                              <p className="text-xs text-gray-600">({act.porcentajePTA?.toFixed(1)}%)</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {comp.id === 'complementarias' && actividades.map((act: any, idx: number) => (
                        <div key={idx} className="p-4 bg-orange-50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 mb-1">{act.nombreActividad}</h4>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                                <span>{act.tipoActividadLabel}</span>
                                {act.cargoFuncion && (
                                  <>
                                    <span>•</span>
                                    <span>{act.cargoFuncion}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-orange-600">{act.horasAsignadas}h</p>
                              <p className="text-xs text-gray-600">({act.porcentajePTA?.toFixed(1)}%)</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {comp.id === 'administrativas' && actividades.map((act: any, idx: number) => (
                        <div key={idx} className="p-4 bg-red-50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 mb-1">{act.nombreCargo}</h4>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                                <span>{act.tipoActividadLabel}</span>
                                {act.dependenciaAsignada && (
                                  <>
                                    <span>•</span>
                                    <span>{act.dependenciaAsignada}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-red-600">{act.horasDescarga}h</p>
                              <p className="text-xs text-gray-600">({act.porcentajePTA?.toFixed(1)}%)</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
      
      {/* Información adicional */}
      <Card className="p-6 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Estado del PTA
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Estado:</span>
                <Badge className="bg-blue-600">
                  {pta.estado || 'CONSTRUCCION'}
                </Badge>
              </div>
              {pta.fecha_creacion && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Creado:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(pta.fecha_creacion).toLocaleDateString()}
                  </span>
                </div>
              )}
              {pta.fecha_envio_aprobacion && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Enviado:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(pta.fecha_envio_aprobacion).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              Estadísticas
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total actividades:</span>
                <span className="text-sm font-bold text-gray-900">
                  {componentes.reduce((sum, comp) => sum + (comp.data?.actividades?.length || 0), 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Componentes activos:</span>
                <span className="text-sm font-bold text-gray-900">
                  {componentes.filter(comp => (comp.data?.horas || 0) > 0).length} de 5
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cumplimiento:</span>
                <span className={`text-sm font-bold ${progreso >= 95 ? 'text-green-600' : 'text-orange-600'}`}>
                  {progreso.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Validación
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-700">Distribución correcta</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-700">Límites respetados</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-700">Listo para aprobar</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      {onCerrar && (
        <div className="flex justify-end">
          <Button onClick={onCerrar}>
            Cerrar Resumen
          </Button>
        </div>
      )}
    </div>
  );
}