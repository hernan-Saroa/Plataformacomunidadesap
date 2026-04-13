/**
 * RESUMEN DE DATOS MOCK - MÓDULO GESTIÓN LEGAL
 * Dashboard ejecutivo para verificar carga de datos de prueba
 */

import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { 
  Scale, Users, AlertTriangle, Building, DollarSign, 
  FileText, CheckCircle, Clock, Archive 
} from 'lucide-react';

export function ResumenDatosMock() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📊 Resumen de Datos Mock - Sistema SIGL
        </h1>
        <p className="text-gray-600">
          Estado de la carga de datos de prueba para demo con cliente
        </p>
      </div>

      {/* Grid de módulos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* MOD-01: DEFENSA JUDICIAL */}
        <Card className="p-6 border-l-4 border-l-blue-600">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Scale className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Defensa Judicial</h3>
                <p className="text-sm text-gray-600">MOD-01</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700">✅ Listo</Badge>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total expedientes:</span>
              <span className="font-bold text-gray-900">18</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Notificadas:</span>
              <span className="font-semibold text-red-600">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Contestadas:</span>
              <span className="font-semibold text-orange-600">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">En pruebas:</span>
              <span className="font-semibold text-yellow-600">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Alegatos:</span>
              <span className="font-semibold text-blue-600">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sentencia I Instancia:</span>
              <span className="font-semibold text-purple-600">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Segunda Instancia:</span>
              <span className="font-semibold text-indigo-600">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ejecutoriadas:</span>
              <span className="font-semibold text-green-600">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Archivadas:</span>
              <span className="font-semibold text-gray-600">2</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-gray-500">
              Tipos: Nulidad y Restablecimiento, Tutela, Acción Popular, Reparación Directa, Controversias Contractuales
            </div>
          </div>
        </Card>

        {/* MOD-02: JUZGAMIENTO DISCIPLINARIO */}
        <Card className="p-6 border-l-4 border-l-purple-600">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Juzgamiento Disciplinario</h3>
                <p className="text-sm text-gray-600">MOD-02</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700">✅ Listo</Badge>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total procesos:</span>
              <span className="font-bold text-gray-900">20</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Indagación preliminar:</span>
              <span className="font-semibold text-yellow-600">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Investigación:</span>
              <span className="font-semibold text-orange-600">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Formulación cargos:</span>
              <span className="font-semibold text-red-600">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Descargos:</span>
              <span className="font-semibold text-purple-600">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pruebas:</span>
              <span className="font-semibold text-blue-600">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Decisión:</span>
              <span className="font-semibold text-indigo-600">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sancionados:</span>
              <span className="font-semibold text-green-600">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Archivados:</span>
              <span className="font-semibold text-gray-600">3</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-gray-500">
              Faltas: Leves, Graves y Gravísimas. Incluye casos de negligencia, acoso, hurto, falsedad
            </div>
          </div>
        </Card>

        {/* MOD-03: ASESORÍA JURÍDICA */}
        <Card className="p-6 border-l-4 border-l-green-600">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Asesoría Jurídica</h3>
                <p className="text-sm text-gray-600">MOD-03</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700">✅ Listo</Badge>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total consultas:</span>
              <span className="font-bold text-gray-900">20</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pendientes:</span>
              <span className="font-semibold text-red-600">6</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">En análisis:</span>
              <span className="font-semibold text-yellow-600">5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Respondidas:</span>
              <span className="font-semibold text-green-600">9</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-gray-500">
              Temas: Contratación, Laboral, Académico, Administrativo, Disciplinario
            </div>
          </div>
        </Card>

        {/* MOD-04: CENTRO COMUNICACIONES JURÍDICAS */}
        <Card className="p-6 border-l-4 border-l-blue-600">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Centro Comunicaciones</h3>
                <p className="text-sm text-gray-600">MOD-04</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700">✅ Listo</Badge>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total comunicaciones:</span>
              <span className="font-bold text-gray-900">33</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Judiciales:</span>
              <span className="font-semibold text-blue-600">5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Correos (con IA):</span>
              <span className="font-semibold text-purple-600">6</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Oficios:</span>
              <span className="font-semibold text-green-600">5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Enviados:</span>
              <span className="font-semibold text-gray-600">5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Urgentes:</span>
              <span className="font-semibold text-red-600">8</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Archivadas:</span>
              <span className="font-semibold text-gray-600">3</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-gray-500">
              ✨ Incluye clasificación IA con % de confianza y módulo sugerido
            </div>
          </div>
        </Card>

        {/* MOD-05: TÉRMINOS E INFORMES */}
        <Card className="p-6 border-l-4 border-l-orange-600">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Términos e Informes</h3>
                <p className="text-sm text-gray-600">MOD-05</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700">✅ Listo</Badge>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total solicitudes:</span>
              <span className="font-bold text-gray-900">15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pendientes:</span>
              <span className="font-semibold text-red-600">5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">En elaboración:</span>
              <span className="font-semibold text-yellow-600">4</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Entregados:</span>
              <span className="font-semibold text-green-600">6</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-gray-500">
              Incluye informes para órganos de control, entidades judiciales y administrativas
            </div>
          </div>
        </Card>

        {/* MOD-06: ÓRGANOS DE CONTROL */}
        <Card className="p-6 border-l-4 border-l-red-600">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <Building className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Órganos de Control</h3>
                <p className="text-sm text-gray-600">MOD-06</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700">✅ Listo</Badge>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total requerimientos:</span>
              <span className="font-bold text-gray-900">18</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Contraloría:</span>
              <span className="font-semibold text-red-600">4</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Procuraduría:</span>
              <span className="font-semibold text-purple-600">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Contaduría:</span>
              <span className="font-semibold text-blue-600">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fiscalía:</span>
              <span className="font-semibold text-orange-600">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Otros:</span>
              <span className="font-semibold text-green-600">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">⚠️ VENCIDOS:</span>
              <span className="font-semibold text-red-600">2</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-gray-500">
              Incluye auditorías, requerimientos, investigaciones y visitas de control
            </div>
          </div>
        </Card>

        {/* MOD-07: PROCESOS COACTIVOS */}
        <Card className="p-6 border-l-4 border-l-yellow-600">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Procesos Coactivos</h3>
                <p className="text-sm text-gray-600">MOD-07</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700">✅ Listo</Badge>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total procesos:</span>
              <span className="font-bold text-gray-900">25</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cobro persuasivo:</span>
              <span className="font-semibold text-yellow-600">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mandamiento pago:</span>
              <span className="font-semibold text-orange-600">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Embargo:</span>
              <span className="font-semibold text-red-600">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Remate:</span>
              <span className="font-semibold text-purple-600">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Acuerdo de pago:</span>
              <span className="font-semibold text-blue-600">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Finalizados:</span>
              <span className="font-semibold text-green-600">4</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Archivados:</span>
              <span className="font-semibold text-gray-600">2</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-gray-500">
              💰 Valor total adeudado activo: $429.8 millones
            </div>
          </div>
        </Card>
      </div>

      {/* Resumen general */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sistema Completo y Listo</h2>
            <p className="text-gray-700">Todos los módulos cargados con datos realistas</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-blue-600 mb-1">149</div>
            <div className="text-sm text-gray-600">Registros totales</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-green-600 mb-1">7</div>
            <div className="text-sm text-gray-600">Módulos activos</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-purple-600 mb-1">100%</div>
            <div className="text-sm text-gray-600">Datos completos</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-orange-600 mb-1">✓</div>
            <div className="text-sm text-gray-600">Listo para demo</div>
          </div>
        </div>
      </Card>

      {/* Notas importantes */}
      <Card className="p-6 bg-yellow-50 border-2 border-yellow-300">
        <div className="flex gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-yellow-900 mb-2">Notas para la Demo con Cliente</h3>
            <ul className="space-y-2 text-sm text-yellow-800">
              <li>✅ Todos los datos son ficticios pero realistas basados en casos tipo ESAP</li>
              <li>✅ Las fechas están ajustadas a enero-febrero 2025 para mostrar casos recientes</li>
              <li>✅ Incluye casos en diferentes etapas procesales para demostrar flujos completos</li>
              <li>✅ Los montos y cuantías son representativos de casos reales</li>
              <li>✅ La clasificación IA en Centro de Comunicaciones muestra % de confianza realistas</li>
              <li>✅ Hay casos urgentes y vencidos para probar alertas y notificaciones</li>
              <li>⚠️ Los nombres de funcionarios y personas son ficticios</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
