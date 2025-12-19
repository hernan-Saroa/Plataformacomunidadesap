/**
 * ============================================
 * SELECTOR DE MÓDULO - KANBAN
 * ============================================
 * 
 * Pantalla inicial donde el usuario selecciona
 * qué módulo desea visualizar en el tablero Kanban
 */

import {
  Scale,
  Shield,
  FileQuestion,
  Gavel,
  DollarSign,
  Mail,
  MessageSquare,
  Target,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Activity,
} from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

// ============================================
// TIPOS
// ============================================

interface Modulo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  icon: any;
  color: string;
  bgColor: string;
  cantidadCasos: number;
  alertas: number;
  vencidos: number;
}

interface SelectorModuloKanbanProps {
  onSeleccionarModulo: (moduloId: string) => void;
  onVolver?: () => void;
}

// ============================================
// CONFIGURACIÓN DE MÓDULOS
// ============================================

const MODULOS: Modulo[] = [
  {
    id: 'mod-01',
    codigo: 'MOD-01',
    nombre: 'Defensa Judicial',
    descripcion: 'Gestión de procesos judiciales en todas las jurisdicciones',
    icon: Scale,
    color: '#003DA5',
    bgColor: '#EFF6FF',
    cantidadCasos: 47,
    alertas: 5,
    vencidos: 2,
  },
  {
    id: 'mod-02',
    codigo: 'MOD-02',
    nombre: 'Órganos de Control',
    descripcion: 'Requerimientos de Contraloría, Procuraduría y CGR',
    icon: Shield,
    color: '#DC2626',
    bgColor: '#FEF2F2',
    cantidadCasos: 23,
    alertas: 3,
    vencidos: 1,
  },
  {
    id: 'mod-03',
    codigo: 'MOD-03',
    nombre: 'Asesoría Jurídica',
    descripcion: 'Control de 30 días hábiles para asesorías jurídicas',
    icon: FileQuestion,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    cantidadCasos: 34,
    alertas: 2,
    vencidos: 0,
  },
  {
    id: 'mod-04',
    codigo: 'MOD-04',
    nombre: 'Juzgamiento Disciplinario',
    descripcion: 'Procesos disciplinarios internos en primera instancia',
    icon: Gavel,
    color: '#EA580C',
    bgColor: '#FFF7ED',
    cantidadCasos: 5,
    alertas: 1,
    vencidos: 0,
  },
  {
    id: 'mod-05',
    codigo: 'MOD-05',
    nombre: 'Procesos Coactivos',
    descripcion: 'Gestión de cobro coactivo de deudas a favor de ESAP',
    icon: DollarSign,
    color: '#059669',
    bgColor: '#F0FDF4',
    cantidadCasos: 7,
    alertas: 2,
    vencidos: 1,
  },
  {
    id: 'mod-06',
    codigo: 'MOD-06',
    nombre: 'Buzón de Notificaciones',
    descripcion: 'Control de notificaciones y términos procesales',
    icon: Mail,
    color: '#0891B2',
    bgColor: '#ECFEFF',
    cantidadCasos: 10,
    alertas: 4,
    vencidos: 1,
  },
  {
    id: 'mod-07',
    codigo: 'MOD-07',
    nombre: 'Buzón Oficina Jurídica',
    descripcion: 'Comunicaciones y escalación a asesorías formales',
    icon: MessageSquare,
    color: '#0066CC',
    bgColor: '#EFF6FF',
    cantidadCasos: 8,
    alertas: 1,
    vencidos: 0,
  },
  {
    id: 'mod-08',
    codigo: 'MOD-08',
    nombre: 'Plan de Acción',
    descripcion: 'Acciones correctivas por incumplimientos',
    icon: Target,
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    cantidadCasos: 7,
    alertas: 1,
    vencidos: 0,
  },
  {
    id: 'mod-09',
    codigo: 'MOD-09',
    nombre: 'Riesgos',
    descripcion: 'Identificación y gestión de riesgos jurídicos',
    icon: AlertTriangle,
    color: '#DC2626',
    bgColor: '#FEF2F2',
    cantidadCasos: 12,
    alertas: 3,
    vencidos: 0,
  },
  {
    id: 'mod-10',
    codigo: 'MOD-10',
    nombre: 'Planes de Mejoramiento',
    descripcion: 'Seguimiento a planes de mejoramiento legal',
    icon: TrendingUp,
    color: '#059669',
    bgColor: '#F0FDF4',
    cantidadCasos: 9,
    alertas: 2,
    vencidos: 0,
  },
  {
    id: 'mod-11',
    codigo: 'MOD-11',
    nombre: 'Términos para Informes',
    descripcion: 'Control de términos para presentación de informes',
    icon: Calendar,
    color: '#0066CC',
    bgColor: '#EFF6FF',
    cantidadCasos: 15,
    alertas: 4,
    vencidos: 1,
  },
];

// ============================================
// COMPONENTE
// ============================================

export function SelectorModuloKanban({
  onSeleccionarModulo,
  onVolver,
}: SelectorModuloKanbanProps) {
  // Calcular totales
  const totales = {
    casos: MODULOS.reduce((sum, m) => sum + m.cantidadCasos, 0),
    alertas: MODULOS.reduce((sum, m) => sum + m.alertas, 0),
    vencidos: MODULOS.reduce((sum, m) => sum + m.vencidos, 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="mb-8">
        {onVolver && (
          <Button variant="ghost" onClick={onVolver} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al menú SIGL
          </Button>
        )}

        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Sistema Integrado de Gestión Legal
            </h1>
            <p className="text-gray-600">
              Selecciona el módulo SIGL para visualizar y gestionar casos
            </p>
          </div>
        </div>

        {/* Métricas Globales */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {totales.casos}
              </div>
              <div className="text-sm text-gray-600">Casos Totales</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">
                {totales.alertas}
              </div>
              <div className="text-sm text-gray-600">Alertas Activas</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-red-600 mb-2">
                {totales.vencidos}
              </div>
              <div className="text-sm text-gray-600">Casos Vencidos</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Banner Informativo */}
      <Card className="mb-8 border-l-4 border-blue-600 bg-gradient-to-r from-blue-50 to-purple-50 shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-bold text-lg text-gray-900 mb-3">
            💡 ¿Cómo funciona el Kanban Colaborativo?
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span>Arrastra casos entre columnas para cambiar su estado</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span>Asigna responsables con un solo click</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span>Visualiza la carga de trabajo del equipo en tiempo real</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span>Filtra por estado, prioridad y responsable</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MODULOS.map((modulo) => {
          const Icon = modulo.icon;

          return (
            <Card
              key={modulo.id}
              className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group bg-white"
              onClick={() => onSeleccionarModulo(modulo.id)}
            >
              <CardContent className="p-6">
                {/* Header con icono */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: modulo.color }}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                </div>

                {/* Código */}
                <Badge
                  variant="outline"
                  className="mb-2"
                  style={{ borderColor: modulo.color, color: modulo.color }}
                >
                  {modulo.codigo}
                </Badge>

                {/* Título y descripción */}
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  {modulo.nombre}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {modulo.descripcion}
                </p>

                {/* Métricas */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {modulo.cantidadCasos}
                    </div>
                    <div className="text-xs text-gray-500">Casos</div>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-2xl font-bold ${
                        modulo.alertas > 0 ? 'text-orange-600' : 'text-gray-900'
                      }`}
                    >
                      {modulo.alertas}
                    </div>
                    <div className="text-xs text-gray-500">Alertas</div>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-2xl font-bold ${
                        modulo.vencidos > 0 ? 'text-red-600' : 'text-gray-900'
                      }`}
                    >
                      {modulo.vencidos}
                    </div>
                    <div className="text-xs text-gray-500">Vencidos</div>
                  </div>
                </div>

                {/* Alerta de vencidos */}
                {modulo.vencidos > 0 && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-700 font-medium">
                      {modulo.vencidos} caso{modulo.vencidos > 1 ? 's' : ''} vencido
                      {modulo.vencidos > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
