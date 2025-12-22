/**
 * ============================================
 * PROGRAMA ANUAL - PLACEHOLDER
 * ============================================
 * RF002-003: Elaboración y Aprobación del Programa Anual
 */

import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Calendar, Target, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export function ProgramaAnualPlaceholder() {
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
                Próximo en Roadmap
              </Badge>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              Este módulo se desarrollará próximamente con el mismo nivel world-class del <strong>Plan Anual (RF001)</strong>.
            </p>
            <p className="text-xs text-gray-600">
              RF002-003: Elaboración y Aprobación del Programa Anual - Definición de auditorías específicas y workflow de aprobación
            </p>
          </div>
        </div>
      </Card>

      {/* Flujo del proceso */}
      <Card className="p-6 bg-blue-50/30">
        <h3 className="font-bold text-gray-900 mb-4">
          Flujo del Proceso
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-sm font-bold text-green-700">RF001: Plan Anual ✅ Implementado</span>
          </div>
          
          <div className="flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-yellow-200">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <span className="text-sm font-bold text-yellow-700">RF002-003: Programa Anual (Pendiente)</span>
          </div>
        </div>

        <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700">
            <strong>Dependencia:</strong> Este módulo se construirá sobre el Plan Anual ya implementado, heredando su arquitectura y diseño world-class.
          </p>
        </div>
      </Card>

      {/* Funcionalidades planeadas */}
      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Funcionalidades Planeadas
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: 'Elaboración del Programa (RF002)', desc: 'Definición detallada de auditorías específicas derivadas del Plan Anual' },
            { title: 'Aprobación y Ajustes (RF003)', desc: 'Workflow de aprobación con posibilidad de modificaciones y observaciones' },
            { title: 'Integración con Plan Anual', desc: 'Conexión automática con RF001 ya implementado' },
            { title: 'Calendario de Auditorías', desc: 'Vista temporal de distribución de auditorías a lo largo del año' }
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-600">{idx + 1}</span>
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
