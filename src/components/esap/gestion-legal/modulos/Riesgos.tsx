/**
 * MOD-10: RIESGOS
 * DISEÑO MATRIZ DE RIESGOS 2x2 PROFESIONAL + TABLA DETALLE
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { 
  AlertTriangle,
  Shield,
  Activity,
  CheckCircle2,
  Grid3x3,
  List,
  Plus,
  Search,
  Filter,
  XCircle,
  Eye,
  TrendingUp,
  TrendingDown,
  Circle
} from 'lucide-react';
import type { Riesgo, EtapaRiesgo } from '../core/types';
import { riesgos } from '../data/datosRiesgos';
import { toast } from 'sonner@2.0.3';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { ModalNuevoRiesgo } from './ModalNuevoRiesgo';
import { ModalDetalleRiesgo } from './ModalDetalleRiesgo';

type VistaModulo = 'matriz' | 'tabla';

const ZONA_RIESGO_CONFIG = {
  EXTREMO: { color: '#DC2626', label: '🔴 Extremo', bg: '#FEE2E2', border: '#DC2626' },
  ALTO: { color: '#EA580C', label: '🟠 Alto', bg: '#FFEDD5', border: '#EA580C' },
  MODERADO: { color: '#F59E0B', label: '🟡 Moderado', bg: '#FEF3C7', border: '#F59E0B' },
  BAJO: { color: '#10B981', label: '🟢 Bajo', bg: '#D1FAE5', border: '#10B981' }
};

const TIPO_RIESGO_MAP = {
  GESTION: '📊 Gestión',
  CORRUPCION: '⚠️ Corrupción',
  SEGURIDAD_DIGITAL: '🔒 Seguridad Digital',
  FISCAL: '💰 Fiscal'
};

export function Riesgos() {
  const [vistaActual, setVistaActual] = useState<VistaModulo>('matriz');
  const [busqueda, setBusqueda] = useState('');
  const [filtroZona, setFiltroZona] = useState<string>('TODAS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [modalNuevoRiesgo, setModalNuevoRiesgo] = useState(false);
  const [modalDetalleRiesgo, setModalDetalleRiesgo] = useState<Riesgo | null>(null);

  // Handlers
  const handleNuevoRiesgo = () => {
    setModalNuevoRiesgo(true);
  };

  const handleGuardarRiesgo = (data: any) => {
    console.log('Nuevo riesgo:', data);
    // Aquí se integraría con el backend
  };

  const handleVerDetalleRiesgo = (riesgo: Riesgo) => {
    setModalDetalleRiesgo(riesgo);
  };

  const riesgosFiltrados = useMemo(() => {
    let resultado = [...riesgos].filter(r => r.estado === 'ACTIVO');

    if (busqueda) {
      resultado = resultado.filter(r =>
        r.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.proceso.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    if (filtroZona !== 'TODAS') {
      resultado = resultado.filter(r => r.zonaResidual === filtroZona);
    }

    if (filtroTipo !== 'TODOS') {
      resultado = resultado.filter(r => r.tipoRiesgo === filtroTipo);
    }

    return resultado;
  }, [busqueda, filtroZona, filtroTipo]);

  // Métricas
  const totalRiesgos = riesgos.filter(r => r.estado === 'ACTIVO').length;
  const extremos = riesgos.filter(r => r.zonaResidual === 'EXTREMO').length;
  const altos = riesgos.filter(r => r.zonaResidual === 'ALTO').length;
  const moderados = riesgos.filter(r => r.zonaResidual === 'MODERADO').length;

  return (
    <div className="space-y-4">
      {/* Header con ModuleHeader */}
      <ModuleHeader
        title="Matriz de Riesgos"
        subtitle="Gestión y seguimiento de riesgos institucionales"
        toggleView={{
          current: vistaActual,
          onChange: (view) => setVistaActual(view as VistaModulo),
          options: [
            { label: 'Matriz', icon: <Grid3x3 className="w-4 h-4" />, value: 'matriz' },
            { label: 'Tabla', icon: <List className="w-4 h-4" />, value: 'tabla' }
          ]
        }}
        buttons={[
          {
            label: 'Nuevo Riesgo',
            labelMobile: 'Nuevo',
            icon: <Plus className="w-4 h-4" />,
            onClick: handleNuevoRiesgo,
            variant: 'primary'
          }
        ]}
        infoTooltip={
          <ModuleInfoTooltip
            title="Guía de Gestión de Riesgos"
            variant="icon"
            sections={[
              {
                label: "🛡️ Propósito del Módulo",
                content: "Identificación, evaluación y seguimiento de riesgos institucionales que puedan afectar la gestión jurídica de ESAP. Permite priorizar controles y acciones preventivas mediante una matriz de probabilidad × impacto según metodología DAFP (Departamento Administrativo de la Función Pública).",
                type: "default"
              },
              {
                label: "📊 Matriz de Riesgos 5x5",
                content: "La matriz cruza PROBABILIDAD (Raro, Improbable, Posible, Probable, Casi Seguro) con IMPACTO (Insignificante, Menor, Moderado, Mayor, Catastrófico) para clasificar riesgos en 4 zonas: 🟢 Bajo, 🟡 Moderado, 🟠 Alto, 🔴 Extremo.",
                type: "premium"
              },
              {
                label: "🗂️ Tipos de Riesgos (4 Categorías)",
                content: "📊 GESTIÓN: Procesos, recursos, planeación | ⚠️ CORRUPCIÓN: Fraude, soborno, conflicto de interés | 🔒 SEGURIDAD DIGITAL: Ciberseguridad, pérdida de datos | 💰 FISCAL: Sanciones, multas, pérdidas económicas.",
                type: "info"
              },
              {
                label: "🚦 Zonas de Riesgo y Acciones",
                content: "🔴 EXTREMO (20-25): Acción inmediata obligatoria, escalamiento a Alta Dirección | 🟠 ALTO (12-19): Plan de tratamiento prioritario | 🟡 MODERADO (5-11): Monitoreo mensual, controles preventivos | 🟢 BAJO (1-4): Seguimiento trimestral.",
                type: "warning"
              },
              {
                label: "📋 Etapas del Ciclo de Gestión",
                content: "1️⃣ IDENTIFICADO: Riesgo detectado y documentado | 2️⃣ EVALUADO: Probabilidad e impacto cuantificados | 3️⃣ EN TRATAMIENTO: Controles implementándose | 4️⃣ MONITOREADO: Seguimiento activo de controles | 5️⃣ CERRADO: Riesgo mitigado o materializado.",
                type: "default"
              },
              {
                label: "🎯 Metodología DAFP",
                content: "Este módulo implementa la Guía de Administración del Riesgo del DAFP. Los riesgos se identifican por proceso, se evalúan con probabilidad × impacto, se diseñan controles y se monitorean trimestralmente. Requerido por el MECI (Modelo Estándar de Control Interno).",
                type: "success"
              },
              {
                label: "🔗 Integración con Otros Módulos",
                content: "Los riesgos se vinculan con: • Planes de Mejoramiento (acciones correctivas) • Órganos de Control (hallazgos de auditorías) • Defensa Judicial (riesgos de procesos judiciales) • Juzgamiento (riesgos de conductas irregulares).",
                type: "success"
              },
              {
                label: "💡 Cómo Usar",
                content: "1️⃣ Vista 'Matriz': Visualiza distribución de riesgos por probabilidad e impacto → 2️⃣ Vista 'Tabla': Lista completa con filtros → 3️⃣ Filtra por zona (Extremo, Alto, etc.) o tipo → 4️⃣ Click 'Ver Detalle' para análisis completo y controles → 5️⃣ Actualiza probabilidades e impactos según cambios en contexto.",
                type: "default"
              },
              {
                label: "⏭️ Siguiente Paso",
                content: "Los riesgos Extremos y Altos se escalan automáticamente al módulo 'Planes de Mejoramiento' para gestión de acciones correctivas. Los informes de riesgos se presentan trimestralmente al Comité de Riesgos y a Órganos de Control.",
                type: "info"
              }
            ]}
          />
        }
      />

      {/* Métricas */}
      <ModuleMetrics
        metrics={[
          {
            label: 'Riesgos Activos',
            value: totalRiesgos,
            icon: <Shield className="w-5 h-5 text-blue-600" />,
            color: 'blue'
          },
          {
            label: 'Extremos',
            value: extremos,
            icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
            color: 'red'
          },
          {
            label: 'Altos',
            value: altos,
            icon: <Activity className="w-5 h-5 text-orange-600" />,
            color: 'orange'
          },
          {
            label: 'Moderados',
            value: moderados,
            icon: <CheckCircle2 className="w-5 h-5 text-yellow-600" />,
            color: 'yellow'
          }
        ]}
      />

      {/* Filtros */}
      <ModuleFilters
        onSearchChange={(value) => setBusqueda(value)}
        onZoneChange={(value) => setFiltroZona(value)}
        onTypeChange={(value) => setFiltroTipo(value)}
        zones={[
          { value: 'TODAS', label: 'Todas las zonas' },
          { value: 'EXTREMO', label: '🔴 Extremo' },
          { value: 'ALTO', label: '🟠 Alto' },
          { value: 'MODERADO', label: '🟡 Moderado' },
          { value: 'BAJO', label: '🟢 Bajo' }
        ]}
        types={[
          { value: 'TODOS', label: 'Todos los tipos' },
          { value: 'GESTION', label: '📊 Gestión' },
          { value: 'CORRUPCION', label: '⚠️ Corrupción' },
          { value: 'SEGURIDAD_DIGITAL', label: '🔒 Seguridad Digital' },
          { value: 'FISCAL', label: '💰 Fiscal' }
        ]}
        searchPlaceholder="Buscar por ID, descripción, proceso..."
        filteredCount={riesgosFiltrados.length}
        totalCount={totalRiesgos}
        onClearFilters={() => {
          setBusqueda('');
          setFiltroZona('TODAS');
          setFiltroTipo('TODOS');
        }}
      />

      {/* Contenido principal */}
      {vistaActual === 'matriz' ? (
        <MatrizRiesgos riesgos={riesgosFiltrados} onVerDetalle={handleVerDetalleRiesgo} />
      ) : (
        <TablaRiesgos riesgos={riesgosFiltrados} onVerDetalle={handleVerDetalleRiesgo} />
      )}

      {/* Modal Nuevo Riesgo */}
      <ModalNuevoRiesgo
        isOpen={modalNuevoRiesgo}
        onClose={() => setModalNuevoRiesgo(false)}
        onGuardar={handleGuardarRiesgo}
      />

      {/* Modal Detalle Riesgo */}
      <ModalDetalleRiesgo
        isOpen={modalDetalleRiesgo !== null}
        onClose={() => setModalDetalleRiesgo(null)}
        riesgo={modalDetalleRiesgo}
      />
    </div>
  );
}

interface MatrizRiesgosProps {
  riesgos: Riesgo[];
  onVerDetalle: (riesgo: Riesgo) => void;
}

function MatrizRiesgos({ riesgos, onVerDetalle }: MatrizRiesgosProps) {
  // Matriz 5x5 (Probabilidad x Impacto)
  const probabilidades = ['Raro', 'Improbable', 'Posible', 'Probable', 'Casi Seguro'];
  const impactos = ['Insignificante', 'Menor', 'Moderado', 'Mayor', 'Catastrófico'];

  // Mapeo de nivel de riesgo por celda (Probabilidad, Impacto)
  const getNivelRiesgo = (prob: number, imp: number): 'BAJO' | 'MODERADO' | 'ALTO' | 'EXTREMO' => {
    const valor = prob * imp;
    if (valor >= 20) return 'EXTREMO';
    if (valor >= 12) return 'ALTO';
    if (valor >= 5) return 'MODERADO';
    return 'BAJO';
  };

  return (
    <Card className="bg-white border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="font-bold text-lg" style={{ color: '#003DA5' }}>
          Matriz de Riesgos (Probabilidad × Impacto)
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Distribución de riesgos según probabilidad e impacto
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Tabla de la matriz */}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2 bg-gray-50 text-xs font-bold text-gray-600 w-24">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Prob. / Imp.
                  </div>
                </th>
                {impactos.map((impacto, idx) => (
                  <th key={impacto} className="border border-gray-300 p-2 bg-gray-50 text-xs font-bold text-gray-600">
                    {impacto}
                    <div className="text-[10px] text-gray-400">({idx + 1})</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {probabilidades.map((prob, probIdx) => (
                <tr key={prob}>
                  <td className="border border-gray-300 p-2 bg-gray-50 text-xs font-bold text-gray-600">
                    {prob}
                    <div className="text-[10px] text-gray-400">({5 - probIdx})</div>
                  </td>
                  {impactos.map((imp, impIdx) => {
                    const nivelRiesgo = getNivelRiesgo(5 - probIdx, impIdx + 1);
                    const config = ZONA_RIESGO_CONFIG[nivelRiesgo];
                    const riesgosEnCelda = riesgos.filter(r => 
                      Math.abs((r.probabilidadInherente || 1) - (5 - probIdx)) <= 0.5 &&
                      Math.abs((r.impactoInherente || 1) - (impIdx + 1)) <= 0.5
                    );

                    return (
                      <td
                        key={`${prob}-${imp}`}
                        className="border border-gray-300 p-2 text-center relative"
                        style={{ 
                          backgroundColor: config.bg,
                          minHeight: '60px',
                          minWidth: '100px'
                        }}
                      >
                        {riesgosEnCelda.length > 0 && (
                          <div className="space-y-1">
                            <Badge
                              className="text-xs font-bold"
                              style={{ 
                                backgroundColor: config.color,
                                color: '#FFFFFF'
                              }}
                            >
                              {riesgosEnCelda.length} riesgo{riesgosEnCelda.length > 1 ? 's' : ''}
                            </Badge>
                            <div className="text-[10px] text-gray-600">
                              {riesgosEnCelda.slice(0, 2).map(r => (
                                <div key={r.id} className="truncate">{r.id}</div>
                              ))}
                              {riesgosEnCelda.length > 2 && (
                                <div>+{riesgosEnCelda.length - 2} más</div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
        {Object.entries(ZONA_RIESGO_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-xs font-semibold text-gray-700">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Lista de riesgos debajo de la matriz */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-bold text-sm text-gray-900 mb-3">Detalle de Riesgos</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {riesgos.slice(0, 6).map(riesgo => (
            <TarjetaRiesgoCompacta key={riesgo.id} riesgo={riesgo} onVerDetalle={onVerDetalle} />
          ))}
        </div>
      </div>
    </Card>
  );
}

interface TablaRiesgosProps {
  riesgos: Riesgo[];
  onVerDetalle: (riesgo: Riesgo) => void;
}

function TablaRiesgos({ riesgos, onVerDetalle }: TablaRiesgosProps) {
  return (
    <Card className="bg-white border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">ID</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Descripción</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Proceso</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Tipo</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Nivel</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Etapa</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {riesgos.map((riesgo) => {
              const config = ZONA_RIESGO_CONFIG[riesgo.zonaResidual];
              return (
                <tr key={riesgo.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{riesgo.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="line-clamp-2">{riesgo.descripcion}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{riesgo.proceso}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {TIPO_RIESGO_MAP[riesgo.tipoRiesgo]}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className="text-xs font-bold"
                      style={{ 
                        backgroundColor: config.color,
                        color: '#FFFFFF'
                      }}
                    >
                      {config.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{riesgo.etapa}</td>
                  <td className="px-4 py-3">
                    <Button
                      onClick={() => onVerDetalle(riesgo)}
                      size="sm"
                      style={{ background: '#003DA5', color: '#FFFFFF' }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Ver
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface TarjetaRiesgoCompactaProps {
  riesgo: Riesgo;
  onVerDetalle: (riesgo: Riesgo) => void;
}

function TarjetaRiesgoCompacta({ riesgo, onVerDetalle }: TarjetaRiesgoCompactaProps) {
  const config = ZONA_RIESGO_CONFIG[riesgo.zonaResidual];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-3 hover:shadow-md transition-all"
      style={{ borderColor: config.border, borderWidth: '2px' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h5 className="font-bold text-sm" style={{ color: '#003DA5' }}>{riesgo.id}</h5>
          <p className="text-xs text-gray-600 line-clamp-2">{riesgo.descripcion}</p>
        </div>
        <Badge
          className="text-xs font-bold flex-shrink-0"
          style={{ 
            backgroundColor: config.color,
            color: '#FFFFFF'
          }}
        >
          {config.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Proceso:</span>
          <p className="font-semibold text-gray-900 truncate">{riesgo.proceso}</p>
        </div>
        <div>
          <span className="text-gray-500">Tipo:</span>
          <p className="font-semibold text-gray-900">{TIPO_RIESGO_MAP[riesgo.tipoRiesgo]}</p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-200">
        <Button
          onClick={() => onVerDetalle(riesgo)}
          size="sm"
          className="w-full"
          style={{ background: '#003DA5', color: '#FFFFFF' }}
        >
          <Eye className="w-3 h-3 mr-1" />
          Ver Detalle
        </Button>
      </div>
    </motion.div>
  );
}