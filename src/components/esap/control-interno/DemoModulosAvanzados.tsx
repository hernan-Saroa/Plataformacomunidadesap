/**
 * DEMO DE MÓDULOS AVANZADOS
 * Página de demostración que muestra todos los módulos avanzados creados en la Opción 3
 * 
 * Incluye:
 * - Dashboard Ejecutivo Consolidado
 * - Sistema de Exportación
 * - Panel de Analytics Avanzado
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard, Download, BarChart3, ChevronRight,
  Award, Zap, TrendingUp, Home
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { DashboardEjecutivoConsolidado } from './DashboardEjecutivoConsolidado';
import { SistemaExportacion } from './SistemaExportacion';
import { PanelAnalyticsAvanzado } from './PanelAnalyticsAvanzado';

// ============ TIPOS ============

type ModuloAvanzado = 'inicio' | 'dashboard' | 'exportacion' | 'analytics';

interface OpcionModulo {
  id: ModuloAvanzado;
  nombre: string;
  descripcion: string;
  icono: any;
  color: string;
  destacado?: boolean;
}

// ============ OPCIONES DE MÓDULOS ============

const MODULOS_AVANZADOS: OpcionModulo[] = [
  {
    id: 'dashboard',
    nombre: 'Dashboard Ejecutivo',
    descripcion: 'Vista consolidada con KPIs, gráficos y alertas ejecutivas',
    icono: LayoutDashboard,
    color: '#003DA5',
    destacado: true
  },
  {
    id: 'exportacion',
    nombre: 'Sistema de Exportación',
    descripcion: 'Exporta informes y datos en PDF, Excel, CSV y JSON',
    icono: Download,
    color: '#10B981',
    destacado: true
  },
  {
    id: 'analytics',
    nombre: 'Panel de Analytics',
    descripcion: 'Análisis avanzado con tendencias, correlaciones y predicciones',
    icono: BarChart3,
    color: '#8B5CF6',
    destacado: true
  }
];

// ============ COMPONENTES ============

function PaginaInicio({ onSeleccionarModulo }: { onSeleccionarModulo: (modulo: ModuloAvanzado) => void }) {
  return (
    <div className="space-y-8">
      {/* HERO */}
      <Card className="p-8 text-center border-2" style={{ borderColor: '#003DA5', background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 rounded-full" style={{ background: '#003DA5' }}>
              <Zap className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-3">
            Módulos Avanzados
          </h1>
          <p className="text-xl text-gray-700 mb-2">
            Control Interno de Gestión - ESAP
          </p>
          <p className="text-gray-600">
            Funcionalidades adicionales para análisis, exportación y visualización de datos
          </p>

          <div className="flex items-center justify-center gap-4 mt-6">
            <Badge className="bg-green-100 text-green-800 border-green-300 text-sm py-1 px-3">
              <Award className="w-4 h-4 mr-1" />
              3 Módulos Disponibles
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-sm py-1 px-3">
              <TrendingUp className="w-4 h-4 mr-1" />
              100% Funcional
            </Badge>
          </div>
        </div>
      </Card>

      {/* GRID DE MÓDULOS */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 mb-6">
          Selecciona un módulo para explorar
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MODULOS_AVANZADOS.map(modulo => {
            const Icon = modulo.icono;

            return (
              <motion.div
                key={modulo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <Card 
                  className="p-6 cursor-pointer border-2 hover:shadow-2xl transition-all"
                  style={{ borderColor: modulo.color }}
                  onClick={() => onSeleccionarModulo(modulo.id)}
                >
                  <div className="text-center">
                    <div 
                      className="inline-flex p-4 rounded-2xl mb-4"
                      style={{ background: `${modulo.color}20` }}
                    >
                      <Icon className="w-12 h-12" style={{ color: modulo.color }} />
                    </div>

                    {modulo.destacado && (
                      <Badge className="mb-3 bg-yellow-100 text-yellow-800 border-yellow-300">
                        <Award className="w-3 h-3 mr-1" />
                        Destacado
                      </Badge>
                    )}

                    <h3 className="text-xl font-black text-gray-900 mb-2">
                      {modulo.nombre}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {modulo.descripcion}
                    </p>

                    <Button 
                      className="w-full"
                      style={{ background: modulo.color }}
                    >
                      Explorar
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* CARACTERÍSTICAS */}
      <Card className="p-6">
        <h3 className="text-xl font-black text-gray-900 mb-4">
          Características de los Módulos Avanzados
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <LayoutDashboard className="w-8 h-8 text-blue-600 mb-3" />
            <h4 className="font-black text-gray-900 mb-2">Dashboard Ejecutivo</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 6 KPIs principales</li>
              <li>• Gráficos interactivos</li>
              <li>• Alertas ejecutivas</li>
              <li>• Exportación de reportes</li>
              <li>• Actualización en tiempo real</li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <Download className="w-8 h-8 text-green-600 mb-3" />
            <h4 className="font-black text-gray-900 mb-2">Sistema de Exportación</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 8 plantillas predefinidas</li>
              <li>• Exportación PDF, Excel, CSV</li>
              <li>• Configuración personalizada</li>
              <li>• Portadas y firmas oficiales</li>
              <li>• Backup en JSON</li>
            </ul>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
            <BarChart3 className="w-8 h-8 text-purple-600 mb-3" />
            <h4 className="font-black text-gray-900 mb-2">Panel de Analytics</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Tendencias temporales</li>
              <li>• Análisis comparativo</li>
              <li>• Gráficos radar</li>
              <li>• Correlaciones de datos</li>
              <li>• Métricas avanzadas</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* INFO */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-black text-gray-900 mb-2">
              Módulos de Funcionalidades Adicionales
            </h4>
            <p className="text-gray-700 mb-3">
              Estos módulos fueron creados en la <strong>Opción 3</strong> del desarrollo del sistema.
              Proporcionan herramientas avanzadas para análisis, exportación y visualización de datos
              del Sistema de Control Interno de la ESAP.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-bold text-gray-900">Componentes</p>
                <p className="text-gray-600">3 módulos</p>
              </div>
              <div>
                <p className="font-bold text-gray-900">Plantillas</p>
                <p className="text-gray-600">8 exportación</p>
              </div>
              <div>
                <p className="font-bold text-gray-900">Gráficos</p>
                <p className="text-gray-600">12+ tipos</p>
              </div>
              <div>
                <p className="font-bold text-gray-900">Formatos</p>
                <p className="text-gray-600">PDF, Excel, CSV</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============ COMPONENTE PRINCIPAL ============

export function DemoModulosAvanzados() {
  const [moduloActivo, setModuloActivo] = useState<ModuloAvanzado>('inicio');

  const moduloInfo = MODULOS_AVANZADOS.find(m => m.id === moduloActivo);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* BREADCRUMB / NAVEGACIÓN */}
        {moduloActivo !== 'inicio' && (
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setModuloActivo('inicio')}
              className="font-bold"
            >
              <Home className="w-4 h-4 mr-1" />
              Volver al Inicio
            </Button>
          </div>
        )}

        {/* CONTENIDO */}
        {moduloActivo === 'inicio' && (
          <PaginaInicio onSeleccionarModulo={setModuloActivo} />
        )}

        {moduloActivo === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <DashboardEjecutivoConsolidado />
          </motion.div>
        )}

        {moduloActivo === 'exportacion' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SistemaExportacion />
          </motion.div>
        )}

        {moduloActivo === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <PanelAnalyticsAvanzado />
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default DemoModulosAvanzados;
