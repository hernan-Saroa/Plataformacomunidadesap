import { motion } from 'motion/react';
import { useState } from 'react';
import {
  Gavel,
  Search,
  Filter,
  Plus,
  Eye,
  FileText,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  Download,
  Calendar
} from 'lucide-react';
import { CardSIGL } from '../design-system/CardSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import { procesosDisciplinarios, type ProcesoDisciplinario } from '../../data/procesosAdministrativos';

export function ControlDisciplinarioModule() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoDisciplinario | null>(null);

  const procesosFiltrados = procesosDisciplinarios.filter(proceso => {
    const matchBusqueda = proceso.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
                         proceso.codigo.toLowerCase().includes(busqueda.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || proceso.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'iniciado': return { variant: 'info' as const, label: 'Iniciado' };
      case 'en_investigacion': return { variant: 'primary' as const, label: 'En Investigación' };
      case 'resuelto': return { variant: 'success' as const, label: 'Resuelto' };
      case 'archivado': return { variant: 'default' as const, label: 'Archivado' };
      default: return { variant: 'default' as const, label: estado };
    }
  };

  const getPrioridadBadge = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return { variant: 'danger' as const, label: '🔴 URGENTE' };
      case 'alta': return { variant: 'warning' as const, label: 'Alta' };
      case 'media': return { variant: 'info' as const, label: 'Media' };
      case 'baja': return { variant: 'default' as const, label: 'Baja' };
      default: return { variant: 'default' as const, label: prioridad };
    }
  };

  const getTipoFaltaBadge = (tipoFalta: string) => {
    switch (tipoFalta) {
      case 'gravisima': return { variant: 'danger' as const, label: 'Gravísima' };
      case 'grave': return { variant: 'warning' as const, label: 'Grave' };
      case 'leve': return { variant: 'info' as const, label: 'Leve' };
      default: return { variant: 'default' as const, label: tipoFalta };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Gavel className="w-8 h-8 text-indigo-600" />
            <h1 className="text-slate-900">Control Interno Disciplinario</h1>
          </div>
          <p className="text-slate-600">
            Gestión de procesos disciplinarios según Ley 734 de 2002
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
            <FileText className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-600 mb-1">
              {procesosDisciplinarios.length}
            </p>
            <p className="text-sm text-slate-600">Total Procesos</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-red-600 mb-1">
              {procesosDisciplinarios.filter(p => p.prioridad === 'urgente').length}
            </p>
            <p className="text-sm text-slate-600">Urgentes</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-yellow-600 mb-1">
              {procesosDisciplinarios.filter(p => p.estado === 'en_investigacion').length}
            </p>
            <p className="text-sm text-slate-600">En Investigación</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-600 mb-1">
              {procesosDisciplinarios.filter(p => p.estado === 'resuelto').length}
            </p>
            <p className="text-sm text-slate-600">Resueltos</p>
          </div>
        </CardSIGL>
      </div>

      {/* Filtros y Búsqueda */}
      <CardSIGL>
        <div className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por título o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="todos">Todos los estados</option>
            <option value="iniciado">Iniciados</option>
            <option value="en_investigacion">En Investigación</option>
            <option value="resuelto">Resueltos</option>
            <option value="archivado">Archivados</option>
          </select>
          <ButtonSIGL variant="outline" size="md">
            <Filter className="w-4 h-4 mr-2" />
            Más Filtros
          </ButtonSIGL>
          <ButtonSIGL variant="outline" size="md">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </ButtonSIGL>
        </div>
      </CardSIGL>

      {/* Lista de Procesos */}
      <div className="space-y-4">
        {procesosFiltrados.map((proceso, index) => (
          <motion.div
            key={proceso.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <CardSIGL
              variant="elevated"
              className={`${proceso.prioridad === 'urgente' ? 'border-l-4 border-l-red-500' : ''} hover:shadow-lg transition-all`}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-slate-900 font-semibold">{proceso.titulo}</h3>
                      <BadgeSIGL {...getEstadoBadge(proceso.estado)} />
                      <BadgeSIGL {...getPrioridadBadge(proceso.prioridad)} />
                      <BadgeSIGL {...getTipoFaltaBadge(proceso.tipoFalta)} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                      <span>{proceso.codigo}</span>
                      <span>•</span>
                      <span>Queja: {proceso.numeroQueja}</span>
                      <span>•</span>
                      <span>Etapa: {proceso.etapaActual.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-slate-700 mb-3">{proceso.descripcion}</p>
                  </div>
                </div>

                {/* Información Principal */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Responsable</p>
                    <p className="text-sm font-semibold text-slate-900">{proceso.responsable.nombre}</p>
                    <p className="text-xs text-slate-600">{proceso.responsable.cargo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Fechas</p>
                    <p className="text-sm text-slate-900">Inicio: {proceso.fechaInicio}</p>
                    <p className="text-sm text-slate-900">Cierre estimado: {proceso.fechaEstimadaCierre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Tiempo</p>
                    <p className="text-sm text-slate-900">Transcurridos: {proceso.diasTranscurridos} días</p>
                    <p className="text-sm font-semibold text-blue-600">Restantes: {proceso.diasRestantes} días</p>
                  </div>
                </div>

                {/* Involucrados */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-900 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Involucrados ({proceso.involucrados.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {proceso.involucrados.map((inv) => (
                      <div
                        key={inv.id}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm"
                      >
                        <span className="font-semibold text-slate-900">{inv.nombre}</span>
                        <span className="text-slate-500">•</span>
                        <BadgeSIGL variant="default">{inv.rol}</BadgeSIGL>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actividades Recientes */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-900 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Actividades Recientes
                  </p>
                  <div className="space-y-2">
                    {proceso.actividades.slice(-3).map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg"
                      >
                        <div className={`
                          w-2 h-2 rounded-full flex-shrink-0
                          ${act.estado === 'completada' ? 'bg-green-500' :
                            act.estado === 'en_progreso' ? 'bg-blue-500' :
                            'bg-gray-300'}
                        `} />
                        <div className="flex-1">
                          <p className="text-sm text-slate-900">{act.descripcion}</p>
                          <p className="text-xs text-slate-500">{act.fecha} • {act.responsable}</p>
                        </div>
                        <BadgeSIGL variant={
                          act.estado === 'completada' ? 'success' :
                          act.estado === 'en_progreso' ? 'primary' :
                          'default'
                        }>
                          {act.estado}
                        </BadgeSIGL>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Documentos */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-900 mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Documentos ({proceso.documentos.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {proceso.documentos.map((doc) => (
                      <div
                        key={doc.id}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-50 cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-slate-900">{doc.nombre}</span>
                        <BadgeSIGL variant="info">{doc.tipo}</BadgeSIGL>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sanción (si existe) */}
                {proceso.sancionAplicada && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-900 mb-1">
                      ⚖️ Sanción Aplicada
                    </p>
                    <p className="text-sm text-slate-700">{proceso.sancionAplicada.descripcion}</p>
                    {proceso.sancionAplicada.fechaAplicacion && (
                      <p className="text-xs text-slate-600 mt-1">
                        Fecha: {proceso.sancionAplicada.fechaAplicacion}
                      </p>
                    )}
                  </div>
                )}

                {/* Observaciones */}
                {proceso.observaciones && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      💡 Observaciones
                    </p>
                    <p className="text-sm text-slate-700">{proceso.observaciones}</p>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <ButtonSIGL variant="primary" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Expediente Completo
                  </ButtonSIGL>
                  <ButtonSIGL variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Generar Informe
                  </ButtonSIGL>
                  <ButtonSIGL variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Descargar
                  </ButtonSIGL>
                </div>
              </div>
            </CardSIGL>
          </motion.div>
        ))}
      </div>

      {/* Sin resultados */}
      {procesosFiltrados.length === 0 && (
        <CardSIGL>
          <div className="p-12 text-center">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">No se encontraron procesos</p>
            <p className="text-sm text-slate-500">
              Intenta cambiar los filtros de búsqueda
            </p>
          </div>
        </CardSIGL>
      )}
    </div>
  );
}
