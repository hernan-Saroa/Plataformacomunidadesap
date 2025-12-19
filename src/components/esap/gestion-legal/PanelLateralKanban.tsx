/**
 * ============================================
 * PANEL LATERAL - KANBAN
 * ============================================
 * 
 * Panel lateral con:
 * - Vista del equipo y carga de trabajo
 * - Filtros por responsable
 * - Estadísticas rápidas
 * - Acciones rápidas
 */

import {
  X,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Progress } from '../../ui/progress';

// ============================================
// TIPOS
// ============================================

interface Responsable {
  id: string;
  nombre: string;
  iniciales: string;
  color: string;
  rol: string;
}

interface Caso {
  id: string;
  estado: string;
  prioridad: string;
  responsable: Responsable;
  diasRestantes: number;
}

interface PanelLateralKanbanProps {
  casos: Caso[];
  responsables: Responsable[];
  filtroResponsable: string | null;
  onFiltrarResponsable: (responsableId: string | null) => void;
  onCerrar: () => void;
}

// ============================================
// UTILIDADES
// ============================================

const calcularEstadisticasResponsable = (responsable: Responsable, casos: Caso[]) => {
  const casosResponsable = casos.filter((c) => c.responsable.id === responsable.id);
  
  return {
    total: casosResponsable.length,
    vencidos: casosResponsable.filter((c) => c.diasRestantes < 0).length,
    criticos: casosResponsable.filter((c) => c.diasRestantes <= 3).length,
    completados: casosResponsable.filter((c) => c.estado === 'completado').length,
    enProceso: casosResponsable.filter((c) => 
      c.estado !== 'completado' && c.estado !== 'inicial'
    ).length,
  };
};

const calcularCargaTrabajo = (casos: number) => {
  if (casos === 0) return { nivel: 'Sin carga', porcentaje: 0, color: '#10B981' };
  if (casos <= 3) return { nivel: 'Baja', porcentaje: 25, color: '#10B981' };
  if (casos <= 6) return { nivel: 'Media', porcentaje: 50, color: '#F59E0B' };
  if (casos <= 10) return { nivel: 'Alta', porcentaje: 75, color: '#EA580C' };
  return { nivel: 'Crítica', porcentaje: 100, color: '#DC2626' };
};

// ============================================
// COMPONENTE
// ============================================

export function PanelLateralKanban({
  casos,
  responsables,
  filtroResponsable,
  onFiltrarResponsable,
  onCerrar,
}: PanelLateralKanbanProps) {
  // Calcular estadísticas por responsable
  const responsablesConStats = responsables.map((responsable) => ({
    ...responsable,
    stats: calcularEstadisticasResponsable(responsable, casos),
  }));

  // Ordenar por carga de trabajo
  const responsablesOrdenados = [...responsablesConStats].sort(
    (a, b) => b.stats.total - a.stats.total
  );

  return (
    <div className="w-96 bg-white border-l flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#003DA5]" />
          <h2 className="font-bold">Vista del Equipo</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onCerrar}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Estadísticas Globales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resumen del Equipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {responsables.length}
                </p>
                <p className="text-xs text-gray-600">Miembros</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {casos.filter((c) => c.estado === 'completado').length}
                </p>
                <p className="text-xs text-gray-600">Completados</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {casos.filter((c) => c.diasRestantes <= 3 && c.diasRestantes >= 0).length}
                </p>
                <p className="text-xs text-gray-600">Próximos</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {casos.filter((c) => c.diasRestantes < 0).length}
                </p>
                <p className="text-xs text-gray-600">Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtros Activos */}
        {filtroResponsable && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-sm flex-1">Filtrando por responsable</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFiltrarResponsable(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Lista de Responsables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Carga de Trabajo Individual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {responsablesOrdenados.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay miembros del equipo
              </p>
            ) : (
              responsablesOrdenados.map((responsable) => {
                const carga = calcularCargaTrabajo(responsable.stats.enProceso);
                const estaFiltrado = filtroResponsable === responsable.id;

                return (
                  <div
                    key={responsable.id}
                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      estaFiltrado
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() =>
                      onFiltrarResponsable(estaFiltrado ? null : responsable.id)
                    }
                  >
                    {/* Header: Avatar y Nombre */}
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar
                        className="w-10 h-10"
                        style={{ backgroundColor: responsable.color }}
                      >
                        <AvatarFallback className="text-white font-semibold">
                          {responsable.iniciales}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {responsable.nombre}
                        </p>
                        <p className="text-xs text-gray-500">{responsable.rol}</p>
                      </div>
                      {estaFiltrado && (
                        <Badge className="bg-blue-500">Activo</Badge>
                      )}
                    </div>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center">
                        <p className="text-lg font-bold">{responsable.stats.total}</p>
                        <p className="text-xs text-gray-500">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-orange-600">
                          {responsable.stats.enProceso}
                        </p>
                        <p className="text-xs text-gray-500">En Proceso</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">
                          {responsable.stats.completados}
                        </p>
                        <p className="text-xs text-gray-500">Completados</p>
                      </div>
                    </div>

                    {/* Alertas */}
                    {(responsable.stats.vencidos > 0 || responsable.stats.criticos > 0) && (
                      <div className="flex items-center gap-2 mb-3">
                        {responsable.stats.vencidos > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {responsable.stats.vencidos} vencidos
                          </Badge>
                        )}
                        {responsable.stats.criticos > 0 && (
                          <Badge className="text-xs bg-orange-500">
                            <Clock className="w-3 h-3 mr-1" />
                            {responsable.stats.criticos} críticos
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Barra de Carga */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Carga de Trabajo</span>
                        <span
                          className="font-semibold"
                          style={{ color: carga.color }}
                        >
                          {carga.nivel}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${carga.porcentaje}%`,
                            backgroundColor: carga.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Distribución de Prioridades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribución por Prioridad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { prioridad: 'critica', label: 'Crítica', color: '#DC2626' },
                { prioridad: 'alta', label: 'Alta', color: '#EA580C' },
                { prioridad: 'media', label: 'Media', color: '#F59E0B' },
                { prioridad: 'baja', label: 'Baja', color: '#10B981' },
              ].map(({ prioridad, label, color }) => {
                const cantidad = casos.filter((c) => c.prioridad === prioridad).length;
                const porcentaje = casos.length > 0 ? (cantidad / casos.length) * 100 : 0;

                return (
                  <div key={prioridad}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{label}</span>
                      <span className="font-bold" style={{ color }}>
                        {cantidad}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${porcentaje}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Acciones Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <TrendingUp className="w-4 h-4 mr-2" />
              Ver Reportes
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Users className="w-4 h-4 mr-2" />
              Gestionar Equipo
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Casos Completados
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
