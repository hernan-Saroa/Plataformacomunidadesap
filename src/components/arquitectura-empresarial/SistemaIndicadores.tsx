/**
 * Componente: Sistema de Indicadores
 * KPIs y métricas de seguimiento de Arquitectura Empresarial
 */

import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp,
  Target,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';

interface SistemaIndicadoresProps {
  canEdit?: boolean;
}

export function SistemaIndicadores({ canEdit = true }: SistemaIndicadoresProps) {
  const [selectedDominio, setSelectedDominio] = useState<string>('general');

  // Dominios
  const dominios = [
    { id: 'general', name: 'General' },
    { id: 'estrategia', name: 'Estrategia TI' },
    { id: 'informacion', name: 'Información' },
    { id: 'sistemas', name: 'Sistemas' },
    { id: 'servicios', name: 'Servicios' },
    { id: 'uso', name: 'Uso y Apropiación' }
  ];

  // KPIs Generales
  const kpisGenerales = [
    {
      id: 'madurez',
      nombre: 'Nivel de Madurez Organizacional',
      valor: 3.2,
      meta: 4.0,
      unidad: '/5.0',
      tendencia: '+0.3',
      estado: 'En Progreso',
      descripcion: 'Evaluación global del nivel de madurez en arquitectura empresarial'
    },
    {
      id: 'cumplimiento',
      nombre: 'Cumplimiento MRAE MinTIC',
      valor: 76,
      meta: 90,
      unidad: '%',
      tendencia: '+8%',
      estado: 'En Progreso',
      descripcion: 'Porcentaje de requisitos MinTIC implementados'
    },
    {
      id: 'proyectos',
      nombre: 'Proyectos de AE en Tiempo',
      valor: 82,
      meta: 90,
      unidad: '%',
      tendencia: '+5%',
      estado: 'Cumpliendo',
      descripcion: 'Proyectos ejecutados dentro del cronograma'
    },
    {
      id: 'artefactos',
      nombre: 'Artefactos Documentados',
      valor: 69,
      meta: 85,
      unidad: '',
      tendencia: '+12',
      estado: 'En Progreso',
      descripcion: 'Total de artefactos MRAE documentados'
    },
    {
      id: 'roi',
      nombre: 'ROI en Iniciativas TI',
      valor: 145,
      meta: 150,
      unidad: '%',
      tendencia: '+18%',
      estado: 'Cumpliendo',
      descripcion: 'Retorno de inversión en proyectos tecnológicos'
    },
    {
      id: 'satisfaccion',
      nombre: 'Satisfacción de Stakeholders',
      valor: 87,
      meta: 90,
      unidad: '%',
      tendencia: '+3%',
      estado: 'Cumpliendo',
      descripcion: 'Nivel de satisfacción de usuarios internos'
    }
  ];

  // KPIs por Dominio - Estrategia TI
  const kpisEstrategia = [
    {
      nombre: 'Alineación Estratégica',
      valor: 85,
      meta: 90,
      unidad: '%',
      tendencia: '+5%',
      descripcion: 'Alineación entre objetivos TI y objetivos institucionales'
    },
    {
      nombre: 'Inversión TI / Presupuesto Total',
      valor: 12.5,
      meta: 15,
      unidad: '%',
      tendencia: '+2%',
      descripcion: 'Porcentaje del presupuesto institucional asignado a TI'
    },
    {
      nombre: 'Tiempo de Respuesta a Iniciativas',
      valor: 15,
      meta: 10,
      unidad: ' días',
      tendencia: '-3',
      descripcion: 'Días promedio para aprobación de iniciativas'
    }
  ];

  // KPIs - Información
  const kpisInformacion = [
    {
      nombre: 'Calidad de Datos',
      valor: 88,
      meta: 95,
      unidad: '%',
      tendencia: '+6%',
      descripcion: 'Nivel de calidad en datos institucionales'
    },
    {
      nombre: 'Integración de Fuentes',
      valor: 72,
      meta: 85,
      unidad: '%',
      tendencia: '+8%',
      descripcion: 'Fuentes de datos integradas en el catálogo'
    },
    {
      nombre: 'Uso de Analytics',
      valor: 65,
      meta: 80,
      unidad: '%',
      tendencia: '+12%',
      descripcion: 'Áreas que utilizan analytics para decisiones'
    }
  ];

  // KPIs - Sistemas de Información
  const kpisSistemas = [
    {
      nombre: 'Disponibilidad de Sistemas',
      valor: 99.2,
      meta: 99.5,
      unidad: '%',
      tendencia: '+0.3%',
      descripcion: 'Uptime de sistemas críticos'
    },
    {
      nombre: 'Tiempo de Respuesta Promedio',
      valor: 1.8,
      meta: 2.0,
      unidad: ' seg',
      tendencia: '-0.2',
      descripcion: 'Tiempo de respuesta de aplicaciones'
    },
    {
      nombre: 'Satisfacción con Aplicaciones',
      valor: 82,
      meta: 85,
      unidad: '%',
      tendencia: '+4%',
      descripcion: 'Satisfacción de usuarios con sistemas'
    }
  ];

  // KPIs - Servicios Tecnológicos
  const kpisServicios = [
    {
      nombre: 'Cumplimiento de SLA',
      valor: 94,
      meta: 95,
      unidad: '%',
      tendencia: '+2%',
      descripcion: 'Cumplimiento de acuerdos de nivel de servicio'
    },
    {
      nombre: 'Incidentes Resueltos en Primer Contacto',
      valor: 68,
      meta: 75,
      unidad: '%',
      tendencia: '+5%',
      descripcion: 'Resolución en primera llamada'
    },
    {
      nombre: 'Tiempo Medio de Resolución',
      valor: 4.2,
      meta: 4.0,
      unidad: ' hrs',
      tendencia: '-0.5',
      descripcion: 'Horas promedio para resolver incidentes'
    }
  ];

  // KPIs - Uso y Apropiación
  const kpisUso = [
    {
      nombre: 'Adopción de Herramientas',
      valor: 78,
      meta: 85,
      unidad: '%',
      tendencia: '+8%',
      descripcion: 'Usuarios activos de herramientas TI'
    },
    {
      nombre: 'Capacitaciones Completadas',
      valor: 520,
      meta: 600,
      unidad: '',
      tendencia: '+85',
      descripcion: 'Número de capacitaciones realizadas'
    },
    {
      nombre: 'Satisfacción con Capacitación',
      valor: 89,
      meta: 90,
      unidad: '%',
      tendencia: '+3%',
      descripcion: 'Calificación de programas de capacitación'
    }
  ];

  const getKPIs = () => {
    switch (selectedDominio) {
      case 'estrategia': return kpisEstrategia;
      case 'informacion': return kpisInformacion;
      case 'sistemas': return kpisSistemas;
      case 'servicios': return kpisServicios;
      case 'uso': return kpisUso;
      default: return kpisGenerales;
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Cumpliendo': return 'bg-green-100 text-green-700';
      case 'En Progreso': return 'bg-blue-100 text-blue-700';
      case 'Crítico': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getProgreso = (valor: number, meta: number) => {
    return Math.min((valor / meta) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#003DA5] to-[#0052cc] rounded-xl p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-8 h-8" />
              <h2 className="text-2xl font-black">Sistema de Indicadores</h2>
            </div>
            <p className="text-blue-100">
              KPIs y métricas de seguimiento de Arquitectura Empresarial
            </p>
          </div>
        </div>
      </motion.div>

      {/* Selector de Dominio */}
      <div className="flex items-center gap-2 flex-wrap">
        {dominios.map((dominio) => (
          <button
            key={dominio.id}
            onClick={() => setSelectedDominio(dominio.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedDominio === dominio.id
                ? 'bg-[#003DA5] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {dominio.name}
          </button>
        ))}
      </div>

      {/* KPIs */}
      {selectedDominio === 'general' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpisGenerales.map((kpi, index) => {
            const progreso = getProgreso(kpi.valor, kpi.meta);
            const cumpleMeta = kpi.valor >= kpi.meta;
            
            return (
              <motion.div
                key={kpi.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{kpi.nombre}</h3>
                    <p className="text-xs text-gray-600 mb-3">{kpi.descripcion}</p>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className={`text-3xl font-black ${cumpleMeta ? 'text-green-600' : 'text-blue-600'}`}>
                        {kpi.valor}
                      </span>
                      <span className="text-sm text-gray-600">{kpi.unidad}</span>
                      <span className="text-sm text-gray-400">/ {kpi.meta}{kpi.unidad}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        kpi.tendencia.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {kpi.tendencia}
                      </span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${getEstadoColor(kpi.estado)}`}>
                        {kpi.estado}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      cumpleMeta 
                        ? 'bg-gradient-to-r from-green-500 to-green-600' 
                        : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}
                    style={{ width: `${progreso}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">{progreso.toFixed(1)}% de la meta</p>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getKPIs().map((kpi, index) => {
            const progreso = getProgreso(kpi.valor, kpi.meta);
            const cumpleMeta = kpi.valor >= kpi.meta;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl border border-gray-200 p-6"
              >
                <h3 className="font-bold text-gray-900 mb-1">{kpi.nombre}</h3>
                <p className="text-xs text-gray-600 mb-3">{kpi.descripcion}</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-3xl font-black ${cumpleMeta ? 'text-green-600' : 'text-blue-600'}`}>
                    {kpi.valor}
                  </span>
                  <span className="text-sm text-gray-600">{kpi.unidad}</span>
                  <span className="text-sm text-gray-400">/ {kpi.meta}{kpi.unidad}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    kpi.tendencia.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {kpi.tendencia}
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      cumpleMeta 
                        ? 'bg-gradient-to-r from-green-500 to-green-600' 
                        : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}
                    style={{ width: `${progreso}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">{progreso.toFixed(1)}% de la meta</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Resumen */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 border border-gray-200"
      >
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-600" />
          Resumen de Indicadores
        </h3>
        <div className="prose prose-sm max-w-none text-gray-700">
          <p>
            El sistema de indicadores de Arquitectura Empresarial monitorea <strong>24 KPIs</strong> distribuidos 
            en 6 dimensiones estratégicas. El nivel de madurez organizacional actual es de <strong>3.2/5.0</strong>, 
            con tendencia positiva de +0.3 puntos en el último trimestre.
          </p>
          <p className="mt-3">
            Los dominios con mejor desempeño son <strong>Sistemas de Información (99.2% disponibilidad)</strong> y 
            <strong>Estrategia TI (85% alineación)</strong>. Se recomienda enfocar esfuerzos en mejorar la adopción 
            de herramientas (78%) y la integración de fuentes de datos (72%).
          </p>
        </div>
      </motion.div>
    </div>
  );
}
