import { motion } from 'motion/react';
import { useState } from 'react';
import {
  ClipboardCheck,
  Search,
  Filter,
  Plus,
  Eye,
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { CardSIGL } from '../design-system/CardSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import { procesosGestion } from '../../data/procesosAdministrativos';

export function ControlGestionModule() {
  const [busqueda, setBusqueda] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ClipboardCheck className="w-8 h-8 text-blue-600" />
            <h1 className="text-slate-900">Control Interno de Gestión</h1>
          </div>
          <p className="text-slate-600">
            Auditorías, planes de mejoramiento y seguimiento MECI
          </p>
        </div>
        <ButtonSIGL variant="primary" size="md">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Proceso
        </ButtonSIGL>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <ClipboardCheck className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-600 mb-1">
              {procesosGestion.length}
            </p>
            <p className="text-sm text-slate-600">Procesos Activos</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-red-600 mb-1">
              {procesosGestion.reduce((sum, p) => sum + p.hallazgos.length, 0)}
            </p>
            <p className="text-sm text-slate-600">Hallazgos Activos</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-600 mb-1">
              {procesosGestion.filter(p => p.planMejoramiento).length}
            </p>
            <p className="text-sm text-slate-600">Planes Mejoramiento</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-purple-600 mb-1">
              {procesosGestion.filter(p => p.planMejoramiento).reduce((sum, p) => sum + (p.planMejoramiento?.porcentajeAvance || 0), 0) / procesosGestion.filter(p => p.planMejoramiento).length || 0}%
            </p>
            <p className="text-sm text-slate-600">Avance Promedio</p>
          </div>
        </CardSIGL>
      </div>

      {/* Filtros */}
      <CardSIGL>
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar procesos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <ButtonSIGL variant="outline" size="md">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </ButtonSIGL>
        </div>
      </CardSIGL>

      {/* Lista de Procesos */}
      <div className="space-y-4">
        {procesosGestion.map((proceso, index) => (
          <motion.div
            key={proceso.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <CardSIGL variant="elevated" className="hover:shadow-lg transition-all">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-slate-900 font-semibold">{proceso.titulo}</h3>
                      <BadgeSIGL variant="primary">{proceso.estado.toUpperCase()}</BadgeSIGL>
                      <BadgeSIGL variant={
                        proceso.nivelRiesgo === 'critico' ? 'danger' :
                        proceso.nivelRiesgo === 'alto' ? 'warning' :
                        proceso.nivelRiesgo === 'moderado' ? 'info' :
                        'default'
                      }>
                        Riesgo: {proceso.nivelRiesgo}
                      </BadgeSIGL>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      {proceso.codigo} • Área: {proceso.areaAfectada}
                    </p>
                    <p className="text-sm text-slate-700 mb-4">{proceso.descripcion}</p>
                  </div>
                </div>

                {/* Hallazgos */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-900 mb-2">
                    Hallazgos ({proceso.hallazgos.length})
                  </p>
                  <div className="space-y-2">
                    {proceso.hallazgos.map((hallazgo) => (
                      <div key={hallazgo.id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-sm text-slate-900 flex-1">{hallazgo.descripcion}</p>
                          <BadgeSIGL variant={
                            hallazgo.estado === 'implementado' ? 'success' :
                            hallazgo.estado === 'en_implementacion' ? 'primary' :
                            hallazgo.estado === 'verificado' ? 'success' :
                            'warning'
                          }>
                            {hallazgo.estado}
                          </BadgeSIGL>
                        </div>
                        <p className="text-xs text-slate-600">
                          Responsable: {hallazgo.responsable} • Límite: {hallazgo.fechaLimiteImplementacion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan de Mejoramiento */}
                {proceso.planMejoramiento && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-blue-900">Plan de Mejoramiento</p>
                      <span className="text-sm font-bold text-blue-600">
                        {proceso.planMejoramiento.porcentajeAvance}% Completado
                      </span>
                    </div>
                    <div className="h-2 bg-blue-200 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${proceso.planMejoramiento.porcentajeAvance}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600">
                      {proceso.planMejoramiento.acciones.length} acciones • 
                      {proceso.planMejoramiento.acciones.filter(a => a.estado === 'completada').length} completadas
                    </p>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <ButtonSIGL variant="primary" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalles
                  </ButtonSIGL>
                  <ButtonSIGL variant="outline" size="sm">
                    Generar Informe
                  </ButtonSIGL>
                </div>
              </div>
            </CardSIGL>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
