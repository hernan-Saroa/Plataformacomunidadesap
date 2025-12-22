/**
 * ============================================
 * UNIVERSO DE AUDITORÍAS - PLACEHOLDER
 * ============================================
 * RF004: Definición del Universo de Auditorías
 */

import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Layers, AlertCircle, CheckCircle2 } from 'lucide-react';

export function UniversoAuditoriasPlaceholder() {
  return (
    <div className="space-y-6">
      {/* Estado de desarrollo */}
      <Card className="p-6 border-l-4 border-l-yellow-500 bg-yellow-50/50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-100 rounded-lg flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-bold text-gray-900">Módulo en Desarrollo</h3>
              <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
                En Roadmap
              </Badge>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              Este módulo está parte del <strong>Proceso Completo de Auditorías (RF004-009)</strong> y se desarrollará próximamente.
            </p>
            <p className="text-xs text-gray-600">
              RF004: Definición del Universo Auditable - Registro de procesos y unidades auditables con evaluación de riesgos
            </p>
          </div>
        </div>
      </Card>

      {/* Proceso completo de auditorías */}
      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-4">
          Proceso Completo de Auditorías (RF004-009)
        </h3>
        
        <div className="space-y-3">
          {/* Etapa 1: PLANEAR */}
          <div className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50/30">
            <p className="text-sm font-bold text-purple-700 mb-2">📋 ETAPA 1: PLANEAR</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                <span className="text-gray-700">RF004: Universo de Auditorías (Pendiente)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">RF005: Programa Anual ✅ Implementado</span>
              </div>
            </div>
          </div>

          {/* Etapa 2: EJECUTAR */}
          <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50/30">
            <p className="text-sm font-bold text-green-700 mb-2">🔍 ETAPA 2: EJECUTAR</p>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">RF006-007: Ejecución (Kanban) ✅ Implementado</span>
            </div>
          </div>

          {/* Etapa 3: INFORMAR */}
          <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50/30">
            <p className="text-sm font-bold text-blue-700 mb-2">📄 ETAPA 3: INFORMAR</p>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">RF008-009: Informes y Seguimiento ✅ Implementado</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Funcionalidades planeadas */}
      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-600" />
          Funcionalidades Planeadas para RF004
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: 'Áreas Auditables', desc: 'Registro de procesos y unidades auditables de ESAP' },
            { title: 'Matriz de Riesgos', desc: 'Evaluación y priorización de áreas por nivel de riesgo' },
            { title: 'Integración Organizacional', desc: 'Conexión automática con estructura territorial' },
            { title: 'Historial de Auditorías', desc: 'Trazabilidad de auditorías realizadas por área' }
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-purple-600">{idx + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
