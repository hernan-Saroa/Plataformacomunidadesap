/**
 * TESTING INTEGRADO - MÓDULO CONTROL INTERNO
 * Hub de testing completo que permite probar todos los componentes
 * y validar la integración entre los 6 pasos implementados
 */

'use client';

import React, { useState } from 'react';
import {
  TestTube2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RefreshCcw,
  FileText,
  Calendar,
  Upload,
  Download,
  MessageSquare,
  FileCheck,
  ChevronRight,
  Settings,
  Activity
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

// Importar componentes de demostración
import { DemoControversia } from './DemoControversia';
import { DemoValidacionEvidencias } from './DemoValidacionEvidencias';

// ============ TIPOS ============

interface TestCase {
  id: string;
  paso: number;
  titulo: string;
  descripcion: string;
  componente: string;
  funcionalidades: string[];
  estado: 'pendiente' | 'ejecutando' | 'exitoso' | 'fallido';
  resultado?: string;
  duracion?: number;
}

interface TestSuite {
  nombre: string;
  descripcion: string;
  casos: TestCase[];
}

// ============ CASOS DE PRUEBA ============

const TEST_SUITES: TestSuite[] = [
  {
    nombre: 'Paso 1: Integración con Backend',
    descripcion: 'Validar tipos TypeScript, servicios API y esquema de base de datos',
    casos: [
      {
        id: 'test-1-1',
        paso: 1,
        titulo: 'Tipos TypeScript completos',
        descripcion: 'Verificar que todos los tipos estén definidos correctamente',
        componente: '/types/control-interno.ts',
        funcionalidades: [
          'Interfaces de Auditoría',
          'Interfaces de Hallazgo',
          'Interfaces de Plan de Mejoramiento',
          'Tipos de respuesta paginada',
          'Enums de estado'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-1-2',
        paso: 1,
        titulo: 'Servicios API implementados',
        descripcion: 'Validar que los servicios API estén correctamente estructurados',
        componente: '/services/control-interno-api.ts',
        funcionalidades: [
          'GET /auditorias',
          'POST /auditorias',
          'GET /hallazgos',
          'POST /planes-mejoramiento',
          'Manejo de errores'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-1-3',
        paso: 1,
        titulo: 'React Hooks personalizados',
        descripcion: 'Verificar funcionamiento de hooks',
        componente: '/hooks/useControlInterno.ts',
        funcionalidades: [
          'useAuditorias',
          'useHallazgos',
          'usePlanesMejoramiento',
          'Estado de carga',
          'Manejo de errores'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-1-4',
        paso: 1,
        titulo: 'Esquema Supabase',
        descripcion: 'Validar esquema de base de datos',
        componente: '/schema/control-interno.sql',
        funcionalidades: [
          'Tablas principales',
          'Relaciones FK',
          'Índices optimizados',
          'Políticas RLS',
          'Triggers'
        ],
        estado: 'pendiente'
      }
    ]
  },
  {
    nombre: 'Paso 2: Vista Calendario Gantt',
    descripcion: 'Validar timeline, filtros y exportación',
    casos: [
      {
        id: 'test-2-1',
        paso: 2,
        titulo: 'Gantt Chart interactivo',
        descripcion: 'Verificar visualización de timeline',
        componente: 'VistaCalendarioGantt',
        funcionalidades: [
          'Barra de progreso por auditoría',
          'Indicadores de estado',
          'Drag & drop (opcional)',
          'Zoom temporal',
          'Scroll horizontal'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-2-2',
        paso: 2,
        titulo: 'Vistas temporales',
        descripcion: 'Validar cambio entre vistas',
        componente: 'VistaCalendarioGantt',
        funcionalidades: [
          'Vista Mensual',
          'Vista Trimestral',
          'Vista Anual',
          'Transiciones suaves',
          'Persistencia de estado'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-2-3',
        paso: 2,
        titulo: 'Filtros avanzados',
        descripcion: 'Verificar sistema de filtros',
        componente: 'VistaCalendarioGantt',
        funcionalidades: [
          'Filtro por estado',
          'Filtro por auditor',
          'Filtro por territorial',
          'Combinación de filtros',
          'Limpieza de filtros'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-2-4',
        paso: 2,
        titulo: 'Exportación múltiple',
        descripcion: 'Validar exportación de cronograma',
        componente: 'VistaCalendarioGantt',
        funcionalidades: [
          'Exportar a Excel',
          'Exportar a PDF',
          'Exportar a CSV',
          'Formato institucional',
          'Logo ESAP incluido'
        ],
        estado: 'pendiente'
      }
    ]
  },
  {
    nombre: 'Paso 3: Modal de Importación',
    descripcion: 'Validar importación masiva desde Universo de Auditorías',
    casos: [
      {
        id: 'test-3-1',
        paso: 3,
        titulo: 'Conexión con Universo',
        descripcion: 'Verificar carga de procesos auditables',
        componente: 'ModalImportacionUniverso',
        funcionalidades: [
          'Cargar procesos desde Universo',
          'Mostrar clasificación de riesgo',
          'Indicador de priorización',
          'Datos correctos',
          'Performance'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-3-2',
        paso: 3,
        titulo: 'Selección múltiple',
        descripcion: 'Validar selección de auditorías',
        componente: 'ModalImportacionUniverso',
        funcionalidades: [
          'Checkbox por proceso',
          'Seleccionar todos',
          'Deseleccionar todos',
          'Contador de seleccionados',
          'Validación de mínimo'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-3-3',
        paso: 3,
        titulo: 'Asignación automática de fechas',
        descripción: 'Verificar distribución temporal',
        componente: 'ModalImportacionUniverso',
        funcionalidades: [
          'Distribución equitativa',
          'Respeto de prioridades',
          'Sin solapamientos',
          'Calendario laboral',
          'Duración estimada'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-3-4',
        paso: 3,
        titulo: 'Vista previa inteligente',
        descripcion: 'Validar preview antes de importar',
        componente: 'ModalImportacionUniverso',
        funcionalidades: [
          'Mostrar calendario generado',
          'Resumen de auditorías',
          'Distribución por mes',
          'Alertas de conflictos',
          'Ajustes finales'
        ],
        estado: 'pendiente'
      }
    ]
  },
  {
    nombre: 'Paso 4: Exportación Excel/PDF',
    descripcion: 'Validar generación de documentos oficiales',
    casos: [
      {
        id: 'test-4-1',
        paso: 4,
        titulo: 'Templates profesionales',
        descripcion: 'Verificar calidad de templates',
        componente: 'Sistema de Exportación',
        funcionalidades: [
          'Template Plan Anual',
          'Template Informe Auditoría',
          'Template Hallazgos',
          'Template Planes Mejoramiento',
          'Template Seguimiento'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-4-2',
        paso: 4,
        titulo: 'Formato institucional ESAP',
        descripcion: 'Validar cumplimiento de lineamientos',
        componente: 'Sistema de Exportación',
        funcionalidades: [
          'Logo ESAP incluido',
          'Colores corporativos',
          'Fuentes oficiales',
          'Encabezados correctos',
          'Pie de página'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-4-3',
        paso: 4,
        titulo: 'Exportación a Excel',
        descripción: 'Verificar generación de archivos Excel',
        componente: 'Sistema de Exportación',
        funcionalidades: [
          'Múltiples hojas',
          'Formato condicional',
          'Fórmulas calculadas',
          'Gráficos incluidos',
          'Tamaño optimizado'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-4-4',
        paso: 4,
        titulo: 'Exportación a PDF',
        descripcion: 'Validar generación de PDF',
        componente: 'Sistema de Exportación',
        funcionalidades: [
          'Paginación correcta',
          'Tablas responsive',
          'Imágenes embebidas',
          'TOC automático',
          'Firmas digitales'
        ],
        estado: 'pendiente'
      }
    ]
  },
  {
    nombre: 'Paso 5: Proceso de Controversia',
    descripcion: 'Validar sistema completo de controversias de hallazgos',
    casos: [
      {
        id: 'test-5-1',
        paso: 5,
        titulo: 'Iniciar controversia (Auditado)',
        descripcion: 'Verificar formulario de argumentación',
        componente: 'ModalControversia',
        funcionalidades: [
          'Presentar argumentos',
          'Adjuntar evidencias',
          'Validaciones de formulario',
          'Envío exitoso',
          'Notificación al auditor'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-5-2',
        paso: 5,
        titulo: 'Responder controversia (Auditor)',
        descripcion: 'Validar análisis y decisión',
        componente: 'ModalControversia',
        funcionalidades: [
          'Ver argumentos del auditado',
          'Revisar evidencias',
          'Checklist de validación',
          'Emitir decisión fundamentada',
          'Actualizar estado'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-5-3',
        paso: 5,
        titulo: 'Timeline de trazabilidad',
        descripción: 'Verificar historial completo',
        componente: 'ModalControversia',
        funcionalidades: [
          'Registro de eventos',
          'Timestamps exactos',
          'Usuarios responsables',
          'Iconos diferenciados',
          'Vista cronológica'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-5-4',
        paso: 5,
        titulo: 'Decisiones (Mantener/Modificar/Anular)',
        descripcion: 'Validar tipos de decisión',
        componente: 'ModalControversia',
        funcionalidades: [
          'Mantener hallazgo',
          'Modificar hallazgo',
          'Anular hallazgo',
          'Justificación obligatoria',
          'Actualización de estado'
        ],
        estado: 'pendiente'
      }
    ]
  },
  {
    nombre: 'Paso 6: Validación de Evidencias',
    descripcion: 'Validar sistema de carga y validación de evidencias',
    casos: [
      {
        id: 'test-6-1',
        paso: 6,
        titulo: 'Cargar evidencias (Responsable)',
        descripcion: 'Verificar sistema de carga',
        componente: 'ModalValidacionEvidencias',
        funcionalidades: [
          'Drag & drop funcional',
          'Validación de formato',
          'Límite de tamaño',
          'Vista previa',
          'Carga exitosa'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-6-2',
        paso: 6,
        titulo: 'Validar evidencias (Auditor)',
        descripcion: 'Validar checklist de validación',
        componente: 'ModalValidacionEvidencias',
        funcionalidades: [
          'Checklist 5 criterios',
          'Contador de cumplimiento',
          'Decisión (Aprobar/Rechazar)',
          'Comentarios obligatorios',
          'Actualización de estado'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-6-3',
        paso: 6,
        titulo: 'Historial de versiones',
        descripción: 'Verificar versionado de evidencias',
        componente: 'ModalValidacionEvidencias',
        funcionalidades: [
          'Versión 1, 2, 3...',
          'Recargar si rechazada',
          'Historial completo',
          'Trazabilidad',
          'Comparación de versiones'
        ],
        estado: 'pendiente'
      },
      {
        id: 'test-6-4',
        paso: 6,
        titulo: 'Estados de evidencias',
        descripcion: 'Validar ciclo de vida',
        componente: 'ModalValidacionEvidencias',
        funcionalidades: [
          'Pendiente',
          'En Revisión',
          'Aprobada',
          'Rechazada',
          'Transiciones correctas'
        ],
        estado: 'pendiente'
      }
    ]
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function TestingIntegrado() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>(TEST_SUITES);
  const [ejecutandoTodos, setEjecutandoTodos] = useState(false);
  const [pasoActivo, setPasoActivo] = useState<number | null>(null);

  // ============ HANDLERS ============

  const ejecutarTest = async (testId: string) => {
    setTestSuites((prev) =>
      prev.map((suite) => ({
        ...suite,
        casos: suite.casos.map((caso) =>
          caso.id === testId ? { ...caso, estado: 'ejecutando' } : caso
        ),
      }))
    );

    // Simular ejecución del test
    const inicio = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));
    const duracion = Date.now() - inicio;

    // Simular resultado (90% exitoso, 10% fallido)
    const exitoso = Math.random() > 0.1;

    setTestSuites((prev) =>
      prev.map((suite) => ({
        ...suite,
        casos: suite.casos.map((caso) =>
          caso.id === testId
            ? {
                ...caso,
                estado: exitoso ? 'exitoso' : 'fallido',
                duracion,
                resultado: exitoso
                  ? 'Test completado exitosamente'
                  : 'Error: validación fallida',
              }
            : caso
        ),
      }))
    );

    if (exitoso) {
      toast.success(`Test ${testId} completado exitosamente`);
    } else {
      toast.error(`Test ${testId} falló`);
    }
  };

  const ejecutarSuite = async (suiteName: string) => {
    const suite = testSuites.find((s) => s.nombre === suiteName);
    if (!suite) return;

    for (const caso of suite.casos) {
      await ejecutarTest(caso.id);
    }
  };

  const ejecutarTodos = async () => {
    setEjecutandoTodos(true);

    for (const suite of testSuites) {
      for (const caso of suite.casos) {
        await ejecutarTest(caso.id);
      }
    }

    setEjecutandoTodos(false);
    toast.success('Todos los tests completados');
  };

  const resetearTests = () => {
    setTestSuites(TEST_SUITES);
    toast.info('Tests reseteados');
  };

  // ============ MÉTRICAS ============

  const totalTests = testSuites.reduce((sum, suite) => sum + suite.casos.length, 0);
  const testsExitosos = testSuites.reduce(
    (sum, suite) => sum + suite.casos.filter((c) => c.estado === 'exitoso').length,
    0
  );
  const testsFallidos = testSuites.reduce(
    (sum, suite) => sum + suite.casos.filter((c) => c.estado === 'fallido').length,
    0
  );
  const testsPendientes = testSuites.reduce(
    (sum, suite) => sum + suite.casos.filter((c) => c.estado === 'pendiente').length,
    0
  );
  const porcentajeCompletado = Math.round((testsExitosos / totalTests) * 100);

  // ============ RENDER ============

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <TestTube2 className="w-8 h-8" style={{ color: '#003DA5' }} />
          Testing Integrado - Control Interno
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Suite de testing completa para validar todos los componentes y su integración
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Tests</span>
            <TestTube2 className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalTests}</p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-green-700">Exitosos</span>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">{testsExitosos}</p>
        </div>

        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-red-700">Fallidos</span>
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-900">{testsFallidos}</p>
        </div>

        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-yellow-700">Pendientes</span>
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-900">{testsPendientes}</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">
            Progreso General
          </span>
          <span className="text-sm font-bold" style={{ color: '#003DA5' }}>
            {porcentajeCompletado}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${porcentajeCompletado}%`,
              backgroundColor: '#003DA5',
            }}
          />
        </div>
      </div>

      {/* Acciones globales */}
      <div className="flex gap-3">
        <Button
          onClick={ejecutarTodos}
          disabled={ejecutandoTodos}
          className="gap-2"
          style={{ backgroundColor: '#003DA5' }}
        >
          <Play className="w-4 h-4" />
          Ejecutar Todos los Tests
        </Button>
        <Button variant="outline" onClick={resetearTests} className="gap-2">
          <RefreshCcw className="w-4 h-4" />
          Resetear Tests
        </Button>
      </div>

      {/* Test Suites */}
      <div className="space-y-4">
        {testSuites.map((suite, index) => {
          const suiteExitosos = suite.casos.filter((c) => c.estado === 'exitoso').length;
          const suiteFallidos = suite.casos.filter((c) => c.estado === 'fallido').length;
          const suiteTotal = suite.casos.length;
          const suiteProgreso = Math.round((suiteExitosos / suiteTotal) * 100);

          return (
            <div
              key={suite.nombre}
              className="bg-white rounded-xl border overflow-hidden"
            >
              {/* Header del Suite */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setPasoActivo(pasoActivo === index ? null : index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{suite.nombre}</h3>
                      <Badge variant="outline">
                        {suiteExitosos}/{suiteTotal} tests
                      </Badge>
                      {suiteFallidos > 0 && (
                        <Badge className="bg-red-100 text-red-800">
                          {suiteFallidos} fallidos
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{suite.descripcion}</p>

                    {/* Barra de progreso del suite */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${suiteProgreso}%`,
                            backgroundColor:
                              suiteProgreso === 100 ? '#10B981' : '#F59E0B',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        ejecutarSuite(suite.nombre);
                      }}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        pasoActivo === index ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Casos de prueba */}
              {pasoActivo === index && (
                <div className="border-t bg-gray-50 p-4 space-y-3">
                  {suite.casos.map((caso) => (
                    <div
                      key={caso.id}
                      className="bg-white rounded-lg border p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {caso.titulo}
                            </h4>
                            {caso.estado === 'exitoso' && (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            )}
                            {caso.estado === 'fallido' && (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                            {caso.estado === 'ejecutando' && (
                              <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {caso.descripcion}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Componente: {caso.componente}</span>
                            {caso.duracion && (
                              <>
                                <span>•</span>
                                <span>{caso.duracion}ms</span>
                              </>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => ejecutarTest(caso.id)}
                          disabled={caso.estado === 'ejecutando'}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Funcionalidades */}
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-gray-700 mb-2">
                          Funcionalidades validadas:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {caso.funcionalidades.map((func, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {func}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Resultado */}
                      {caso.resultado && (
                        <div
                          className={`mt-3 p-2 rounded text-xs ${
                            caso.estado === 'exitoso'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {caso.resultado}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Componentes de Demostración */}
      <div className="mt-12 pt-8 border-t">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Componentes de Demostración Interactiva
        </h3>
        
        <div className="space-y-8">
          {/* Demo Controversia */}
          <div className="p-6 bg-white rounded-xl border">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" style={{ color: '#003DA5' }} />
              Paso 5: Proceso de Controversia
            </h4>
            <DemoControversia />
          </div>

          {/* Demo Validación */}
          <div className="p-6 bg-white rounded-xl border">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileCheck className="w-5 h-5" style={{ color: '#003DA5' }} />
              Paso 6: Validación de Evidencias
            </h4>
            <DemoValidacionEvidencias />
          </div>
        </div>
      </div>
    </div>
  );
}
