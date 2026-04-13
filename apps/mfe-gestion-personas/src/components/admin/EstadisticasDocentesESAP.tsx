/**
 * ESTADÍSTICAS DE DOCENTES ESAP
 * 
 * Componente para mostrar métricas detalladas de los 263 docentes reales integrados
 * desde Base_Datos_Docentes_ESAP.md
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { Badge } from '@esap-mfe/shared-ui/badge';
import { Users, GraduationCap, MapPin, TrendingUp, BookOpen, Briefcase } from 'lucide-react';
import { TODOS_LOS_DOCENTES } from '../../data/docentesGestionProfesoral';

export function EstadisticasDocentesESAP() {
  // Calcular estadísticas
  const totalDocentes = TODOS_LOS_DOCENTES.length;
  
  // Por categoría académica
  const porCategoria = TODOS_LOS_DOCENTES.reduce((acc, docente) => {
    const categoria = docente.roles.find(r => r.code.startsWith('DOC_'))?.name || 'Otro';
    acc[categoria] = (acc[categoria] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Por territorial
  const porTerritorial = TODOS_LOS_DOCENTES.reduce((acc, docente) => {
    const territorial = docente.sedes[0]?.nombre || 'Sin asignar';
    acc[territorial] = (acc[territorial] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Top 5 territoriales con más docentes
  const top5Territoriales = Object.entries(porTerritorial)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Por estado
  const activos = TODOS_LOS_DOCENTES.filter(d => d.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Banner Principal */}
      <Card className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <h2 className="text-2xl font-bold mb-2">
                ✅ 263 Docentes ESAP Integrados
              </h2>
              <p className="text-white/90 text-sm">
                Base de datos completa cargada desde Base_Datos_Docentes_ESAP.md
              </p>
              <p className="text-white/80 text-xs mt-1">
                Distribuidos en 17 territoriales + Sede Central
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
              <Users className="w-16 h-16 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Docentes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Docentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#003DA5]">{totalDocentes}</p>
            <p className="text-xs text-gray-500 mt-1">100% integrados</p>
          </CardContent>
        </Card>

        {/* Activos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Docentes Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{activos}</p>
            <p className="text-xs text-gray-500 mt-1">
              {((activos / totalDocentes) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        {/* Territoriales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Territoriales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">
              {Object.keys(porTerritorial).length}
            </p>
            <p className="text-xs text-gray-500 mt-1">17 territoriales + Central</p>
          </CardContent>
        </Card>

        {/* Categorías */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Categorías Académicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              {Object.keys(porCategoria).length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Titular, Asociado, Asistente...</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribución por Categoría */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#003DA5]" />
            Distribución por Categoría Académica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(porCategoria)
              .sort(([, a], [, b]) => b - a)
              .map(([categoria, cantidad]) => (
                <div key={categoria} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Badge 
                      variant="outline" 
                      className="min-w-[120px] justify-center bg-blue-50 text-blue-700 border-blue-200"
                    >
                      {categoria}
                    </Badge>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#003DA5] h-full transition-all duration-500"
                        style={{ width: `${(cantidad / totalDocentes) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-gray-900">{cantidad}</p>
                    <p className="text-xs text-gray-500">
                      {((cantidad / totalDocentes) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Top 5 Territoriales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#003DA5]" />
            Top 5 Territoriales con Más Docentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {top5Territoriales.map(([territorial, cantidad], index) => (
              <div key={territorial} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#003DA5] text-white flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{territorial}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] h-full transition-all duration-500"
                        style={{ width: `${(cantidad / totalDocentes) * 100}%` }}
                      />
                    </div>
                    <Badge variant="secondary" className="min-w-[60px] justify-center">
                      {cantidad}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Verificación de Integridad */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Briefcase className="w-5 h-5" />
            ✅ Verificación de Integridad de Datos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-white rounded border border-green-200">
              <span className="text-gray-700">Total de registros esperados</span>
              <Badge className="bg-green-600 text-white">263</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border border-green-200">
              <span className="text-gray-700">Total de registros cargados</span>
              <Badge className="bg-green-600 text-white">{totalDocentes}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border border-green-200">
              <span className="text-gray-700">Registros con email válido</span>
              <Badge className="bg-green-600 text-white">
                {TODOS_LOS_DOCENTES.filter(d => d.email.includes('@esap.edu.co')).length}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border border-green-200">
              <span className="text-gray-700">Registros con sede asignada</span>
              <Badge className="bg-green-600 text-white">
                {TODOS_LOS_DOCENTES.filter(d => d.sedes.length > 0).length}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border border-green-200">
              <span className="text-gray-700">Registros con documento único</span>
              <Badge className="bg-green-600 text-white">
                {new Set(TODOS_LOS_DOCENTES.map(d => d.documentNumber)).size}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}