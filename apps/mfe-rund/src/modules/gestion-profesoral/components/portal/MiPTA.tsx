import React, { useState } from 'react';
import { BookOpen, Plus, Eye, Edit, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Componente "Mi PTA" para DOCENTES
 * 
 * Vista personal del Plan de Trabajo Académico del docente.
 * Solo muestra el PTA del usuario autenticado.
 */
export function MiPTA() {
  const [ptaActual, setPtaActual] = useState<any>(null); // TODO: Tipo PTA

  // TODO: Cargar PTA del usuario desde API
  // const { data: pta, isLoading } = usePTADocente(userId);

  // Mock de estado
  const estadoPTA = 'PENDIENTE'; // PENDIENTE | EN_REVISION | APROBADO | RECHAZADO

  const getEstadoConfig = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <Clock className="w-4 h-4" />,
          texto: 'Pendiente de crear'
        };
      case 'EN_REVISION':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <AlertCircle className="w-4 h-4" />,
          texto: 'En revisión'
        };
      case 'APROBADO':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle2 className="w-4 h-4" />,
          texto: 'Aprobado'
        };
      case 'RECHAZADO':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <AlertCircle className="w-4 h-4" />,
          texto: 'Requiere ajustes'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <Clock className="w-4 h-4" />,
          texto: 'Desconocido'
        };
    }
  };

  const estadoConfig = getEstadoConfig(estadoPTA);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E0EDFF] via-white to-[#FFF8E1]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-light">Mi PTA</h1>
              <p className="text-white/80 text-sm">
                Plan de Trabajo Académico - Periodo 2024-1
              </p>
            </div>
          </div>

          {/* Estado Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm">
            {estadoConfig.icon}
            <span className="text-sm font-medium">{estadoConfig.texto}</span>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {estadoPTA === 'PENDIENTE' ? (
          // Vista: Sin PTA creado
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-[#E0EDFF] rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-[#2962FF]" />
            </div>
            
            <h2 className="text-2xl font-light text-[#003DA5] mb-3">
              No has creado tu PTA aún
            </h2>
            
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Crea tu Plan de Trabajo Académico para el periodo actual. 
              Incluye actividades de docencia, investigación y extensión.
            </p>

            <button
              onClick={() => window.location.href = '/portal/pta/crear'}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#2962FF] text-white rounded-lg hover:bg-[#003DA5] transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Crear mi PTA
            </button>

            {/* Información adicional */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                ¿Qué incluye el PTA?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="bg-[#E0EDFF] rounded-lg p-4">
                  <h4 className="text-sm font-medium text-[#003DA5] mb-2">
                    Docencia
                  </h4>
                  <p className="text-xs text-gray-600">
                    Asignaturas, preparación, evaluación, tutorías
                  </p>
                </div>
                <div className="bg-[#FFF8E1] rounded-lg p-4">
                  <h4 className="text-sm font-medium text-[#F57C00] mb-2">
                    Investigación
                  </h4>
                  <p className="text-xs text-gray-600">
                    Proyectos, publicaciones, ponencias
                  </p>
                </div>
                <div className="bg-[#E0EDFF] rounded-lg p-4">
                  <h4 className="text-sm font-medium text-[#003DA5] mb-2">
                    Extensión
                  </h4>
                  <p className="text-xs text-gray-600">
                    Consultorías, asesorías, proyección social
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Vista: PTA Existente
          <div className="space-y-6">
            {/* Card Principal del PTA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-medium text-[#003DA5] mb-2">
                      PTA Periodo 2024-1
                    </h2>
                    <p className="text-sm text-gray-600">
                      Última actualización: Hace 2 días
                    </p>
                  </div>
                  
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${estadoConfig.color}`}>
                    {estadoConfig.icon}
                    <span className="text-sm font-medium">{estadoConfig.texto}</span>
                  </div>
                </div>

                {/* Resumen de Horas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-[#E0EDFF] to-[#E0EDFF]/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Docencia</p>
                    <p className="text-2xl font-light text-[#003DA5]">24h</p>
                  </div>
                  <div className="bg-gradient-to-br from-[#FFF8E1] to-[#FFF8E1]/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Investigación</p>
                    <p className="text-2xl font-light text-[#F57C00]">8h</p>
                  </div>
                  <div className="bg-gradient-to-br from-[#E0EDFF] to-[#E0EDFF]/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Extensión</p>
                    <p className="text-2xl font-light text-[#003DA5]">6h</p>
                  </div>
                  <div className="bg-gradient-to-br from-[#2962FF] to-[#003DA5] rounded-lg p-4 text-white">
                    <p className="text-sm text-white/80 mb-1">Total</p>
                    <p className="text-2xl font-light">38h</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-3">
                  <button
                    onClick={() => window.location.href = '/portal/pta/ver'}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#E0EDFF] text-[#003DA5] rounded-lg hover:bg-[#2962FF] hover:text-white transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Ver Detalles
                  </button>
                  
                  {estadoPTA !== 'APROBADO' && (
                    <button
                      onClick={() => window.location.href = '/portal/pta/editar'}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#2962FF] text-white rounded-lg hover:bg-[#003DA5] transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Editar PTA
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Alertas o Mensajes */}
            {estadoPTA === 'RECHAZADO' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-red-900 mb-2">
                      Se requieren ajustes en tu PTA
                    </h3>
                    <p className="text-sm text-red-700 mb-4">
                      Tu PTA fue revisado y requiere algunos ajustes antes de su aprobación.
                    </p>
                    <div className="bg-white rounded-lg p-4 border border-red-200">
                      <p className="text-sm text-gray-800 font-medium mb-2">
                        Comentarios del aprobador:
                      </p>
                      <p className="text-sm text-gray-600 italic">
                        "Por favor, ajustar la distribución de horas en el componente de investigación. 
                        Actualmente excede el límite permitido."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
