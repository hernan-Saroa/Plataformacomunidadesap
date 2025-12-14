/**
 * Componente: Gestión de Riesgos TI
 * Matriz de riesgos, registro y planes de mitigación
 */

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Plus,
  Eye
} from 'lucide-react';
import { motion } from 'motion/react';

interface GestionRiesgosTIProps {
  canEdit?: boolean;
}

export function GestionRiesgosTI({ canEdit = true }: GestionRiesgosTIProps) {
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todos');

  // Métricas de Riesgos
  const metricas = [
    {
      label: 'Riesgos Activos',
      value: '28',
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      label: 'Críticos',
      value: '5',
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      label: 'Mitigados',
      value: '42',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Exposición Total',
      value: '$1.2M',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  // Categorías de riesgos
  const categorias = [
    { id: 'todos', name: 'Todos', count: 28 },
    { id: 'operacional', name: 'Operacional', count: 8 },
    { id: 'seguridad', name: 'Seguridad', count: 10 },
    { id: 'cumplimiento', name: 'Cumplimiento', count: 5 },
    { id: 'estrategico', name: 'Estratégico', count: 5 }
  ];

  // Riesgos identificados
  const riesgos = [
    {
      id: 'R-001',
      titulo: 'Ataque de Ransomware',
      categoria: 'seguridad',
      probabilidad: 'Alta',
      impacto: 'Crítico',
      nivelRiesgo: 'Crítico',
      exposicion: '$450,000',
      estado: 'Activo',
      responsable: 'CISO',
      controles: [
        'Backup diario automatizado',
        'Segmentación de red',
        'Capacitación en phishing',
        'EDR en endpoints'
      ],
      planMitigacion: 'Implementación de SOC 24/7 y simulacros trimestrales'
    },
    {
      id: 'R-002',
      titulo: 'Falla en Infraestructura Crítica',
      categoria: 'operacional',
      probabilidad: 'Media',
      impacto: 'Alto',
      nivelRiesgo: 'Alto',
      exposicion: '$280,000',
      estado: 'En Mitigación',
      responsable: 'Infraestructura',
      controles: [
        'Redundancia de servidores',
        'Plan de contingencia',
        'Monitoreo 24/7',
        'Mantenimiento preventivo'
      ],
      planMitigacion: 'Migración a infraestructura cloud híbrida con alta disponibilidad'
    },
    {
      id: 'R-003',
      titulo: 'Incumplimiento Ley de Protección de Datos',
      categoria: 'cumplimiento',
      probabilidad: 'Media',
      impacto: 'Alto',
      nivelRiesgo: 'Alto',
      exposicion: '$320,000',
      estado: 'Activo',
      responsable: 'DPO',
      controles: [
        'Política de tratamiento de datos',
        'Registro de bases de datos',
        'Consentimientos informados',
        'Auditorías periódicas'
      ],
      planMitigacion: 'Implementación de sistema DLP y capacitación continua en privacidad'
    },
    {
      id: 'R-004',
      titulo: 'Obsolescencia Tecnológica',
      categoria: 'estrategico',
      probabilidad: 'Alta',
      impacto: 'Medio',
      nivelRiesgo: 'Alto',
      exposicion: '$180,000',
      estado: 'Activo',
      responsable: 'CTO',
      controles: [
        'Roadmap de actualización',
        'Evaluación trimestral de tecnologías',
        'Presupuesto de renovación',
        'Monitoreo de EOL'
      ],
      planMitigacion: 'Plan de modernización tecnológica 2025-2027 con presupuesto asignado'
    },
    {
      id: 'R-005',
      titulo: 'Fuga de Información Sensible',
      categoria: 'seguridad',
      probabilidad: 'Media',
      impacto: 'Crítico',
      nivelRiesgo: 'Crítico',
      exposicion: '$520,000',
      estado: 'En Mitigación',
      responsable: 'CISO',
      controles: [
        'Clasificación de información',
        'Control de acceso basado en roles',
        'Cifrado de datos',
        'Monitoreo de accesos'
      ],
      planMitigacion: 'Implementación de DLP y certificación ISO 27001'
    }
  ];

  const riesgosFiltrados = selectedCategoria === 'todos' 
    ? riesgos 
    : riesgos.filter(r => r.categoria === selectedCategoria);

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'Crítico': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
      case 'Alto': return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' };
      case 'Medio': return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' };
      case 'Bajo': return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Activo': return 'bg-red-100 text-red-700';
      case 'En Mitigación': return 'bg-blue-100 text-blue-700';
      case 'Mitigado': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
              <AlertTriangle className="w-8 h-8" />
              <h2 className="text-2xl font-black">Gestión de Riesgos TI</h2>
            </div>
            <p className="text-blue-100">
              Registro, evaluación y mitigación de riesgos tecnológicos institucionales
            </p>
          </div>
          {canEdit && (
            <button className="px-4 py-2 bg-white text-[#003DA5] rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Registrar Riesgo
            </button>
          )}
        </div>
      </motion.div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricas.map((metrica, index) => {
          const Icon = metrica.icon;
          return (
            <motion.div
              key={metrica.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${metrica.bgColor} rounded-xl p-6 border border-gray-200`}
            >
              <div className="mb-3">
                <Icon className={`w-6 h-6 ${metrica.color}`} />
              </div>
              <p className="text-sm text-gray-600 mb-1">{metrica.label}</p>
              <p className={`text-2xl font-black ${metrica.color}`}>
                {metrica.value}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Matriz de Riesgos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <h3 className="font-bold text-gray-900 mb-4">Matriz de Riesgos (Probabilidad vs Impacto)</h3>
        <div className="grid grid-cols-4 gap-2">
          {/* Headers */}
          <div></div>
          <div className="text-center text-xs font-semibold text-gray-600 p-2">Bajo</div>
          <div className="text-center text-xs font-semibold text-gray-600 p-2">Medio</div>
          <div className="text-center text-xs font-semibold text-gray-600 p-2">Alto</div>
          <div className="text-center text-xs font-semibold text-gray-600 p-2">Crítico</div>

          {/* Alta Probabilidad */}
          <div className="text-xs font-semibold text-gray-600 p-2 flex items-center justify-end">Alta</div>
          <div className="bg-yellow-100 border border-yellow-300 rounded p-3 min-h-[80px]"></div>
          <div className="bg-orange-100 border border-orange-300 rounded p-3 min-h-[80px] flex flex-col gap-1">
            <span className="text-xs font-mono text-orange-700">R-004</span>
          </div>
          <div className="bg-red-100 border border-red-300 rounded p-3 min-h-[80px] flex flex-col gap-1">
            <span className="text-xs font-mono text-red-700">R-001</span>
          </div>
          <div className="bg-red-200 border border-red-400 rounded p-3 min-h-[80px]"></div>

          {/* Media Probabilidad */}
          <div className="text-xs font-semibold text-gray-600 p-2 flex items-center justify-end">Media</div>
          <div className="bg-green-100 border border-green-300 rounded p-3 min-h-[80px]"></div>
          <div className="bg-yellow-100 border border-yellow-300 rounded p-3 min-h-[80px]"></div>
          <div className="bg-orange-100 border border-orange-300 rounded p-3 min-h-[80px] flex flex-col gap-1">
            <span className="text-xs font-mono text-orange-700">R-002</span>
            <span className="text-xs font-mono text-orange-700">R-003</span>
          </div>
          <div className="bg-red-100 border border-red-300 rounded p-3 min-h-[80px] flex flex-col gap-1">
            <span className="text-xs font-mono text-red-700">R-005</span>
          </div>

          {/* Baja Probabilidad */}
          <div className="text-xs font-semibold text-gray-600 p-2 flex items-center justify-end">Baja</div>
          <div className="bg-green-100 border border-green-300 rounded p-3 min-h-[80px]"></div>
          <div className="bg-green-100 border border-green-300 rounded p-3 min-h-[80px]"></div>
          <div className="bg-yellow-100 border border-yellow-300 rounded p-3 min-h-[80px]"></div>
          <div className="bg-orange-100 border border-orange-300 rounded p-3 min-h-[80px]"></div>
        </div>
      </motion.div>

      {/* Filtros */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-700">Categoría:</span>
        </div>
        {categorias.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoria(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedCategoria === cat.id
                ? 'bg-[#003DA5] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {cat.name}
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-white/20 rounded">
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* Lista de Riesgos */}
      <div className="space-y-4">
        {riesgosFiltrados.map((riesgo) => {
          const nivelColors = getNivelColor(riesgo.nivelRiesgo);
          
          return (
            <motion.div
              key={riesgo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm font-bold text-gray-600">{riesgo.id}</span>
                    <h3 className="font-bold text-gray-900">{riesgo.titulo}</h3>
                    <span className={`px-3 py-1 text-xs font-bold rounded border ${nivelColors.bg} ${nivelColors.text} ${nivelColors.border}`}>
                      {riesgo.nivelRiesgo}
                    </span>
                    <span className={`px-2 py-1 text-xs font-bold rounded ${getEstadoColor(riesgo.estado)}`}>
                      {riesgo.estado}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                    <span className="capitalize px-3 py-1 bg-blue-50 text-blue-700 rounded font-semibold">
                      {riesgo.categoria}
                    </span>
                    <span>Probabilidad: <strong>{riesgo.probabilidad}</strong></span>
                    <span>•</span>
                    <span>Impacto: <strong>{riesgo.impacto}</strong></span>
                    <span>•</span>
                    <span>Exposición: <strong>{riesgo.exposicion}</strong></span>
                    <span>•</span>
                    <span>Responsable: <strong>{riesgo.responsable}</strong></span>
                  </div>

                  {/* Controles */}
                  <div className="mb-3">
                    <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Controles Implementados
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      {riesgo.controles.map((control, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {control}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Plan de Mitigación */}
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="text-xs font-bold text-blue-900 mb-1">Plan de Mitigación</h4>
                    <p className="text-sm text-blue-800">{riesgo.planMitigacion}</p>
                  </div>
                </div>

                {canEdit && (
                  <button className="ml-4 p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
