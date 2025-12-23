/**
 * ============================================
 * RF020: AUDITORÍA DE CAMBIOS (AUDIT TRAIL)
 * ============================================
 * 
 * Módulo de auditoría de cambios para compliance normativo
 * Registro completo de quién-cuándo-qué en todas las operaciones
 * 
 * COMPLIANCE:
 * - Ley 1581/2012 (Protección de Datos)
 * - Decreto 2106/2019 (Transparencia)
 * - ISO 27001 (Seguridad)
 * - MECI (Modelo Estándar Control Interno)
 * 
 * CARACTERÍSTICAS:
 * - Tabla paginada de logs
 * - Filtros avanzados (6 filtros)
 * - Modal detalle con diff viewer
 * - Estadísticas con Recharts (4 gráficos)
 * - Exportación a Excel/PDF
 * - Búsqueda en tiempo real
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Search, Filter, Download, Eye, Calendar,
  User, FileText, Activity, BarChart3, TrendingUp,
  Clock, AlertCircle, CheckCircle, XCircle, Edit,
  Trash2, ArrowRightCircle, PlusCircle, X, ChevronLeft,
  ChevronRight, Save, AlertTriangle, Info
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import {
  auditLogService,
  type AuditLog,
  type AuditLogFiltros,
  type AuditLogStats,
  type TipoAccion,
  type TipoEntidad
} from './services/auditLogService';

// ============ TIPOS ============

type VistaActiva = 'logs' | 'estadisticas';

// ============ DATOS MOCK ============

// Generar logs de ejemplo al cargar
const generarLogsMock = () => {
  const usuarios = [
    { id: 'u1', nombre: 'María González', email: 'mgonzalez@esap.edu.co', rol: 'Jefe OCI' },
    { id: 'u2', nombre: 'Carlos Rodríguez', email: 'crodriguez@esap.edu.co', rol: 'Auditor Líder' },
    { id: 'u3', nombre: 'Ana Martínez', email: 'amartinez@esap.edu.co', rol: 'Auditor Operativo' },
    { id: 'u4', nombre: 'Jorge Pérez', email: 'jperez@esap.edu.co', rol: 'Área Auditada' },
    { id: 'u5', nombre: 'Laura Sánchez', email: 'lsanchez@esap.edu.co', rol: 'Auditor Líder' }
  ];

  const acciones: { 
    accion: TipoAccion; 
    descripcion: string; 
    tabla: TipoEntidad; 
    registroId: string;
    cambios: any;
  }[] = [
    {
      accion: 'aprobar',
      descripcion: 'Aprobar Plan Anual 2025',
      tabla: 'plan_anual',
      registroId: 'plan-2025-001',
      cambios: {
        antes: { estado: 'EN_REVISION' },
        despues: { estado: 'APROBADO', fechaAprobacion: '2025-12-22' }
      }
    },
    {
      accion: 'crear',
      descripcion: 'Crear auditoría AUD-2025-015',
      tabla: 'auditoria',
      registroId: 'aud-2025-015',
      cambios: {
        despues: { codigo: 'AUD-2025-015', nombre: 'Auditoría Gestión Financiera', estado: 'PLANEACION' }
      }
    },
    {
      accion: 'actualizar',
      descripcion: 'Actualizar actividad "Revisión de Riesgos"',
      tabla: 'actividad',
      registroId: 'act-2025-045',
      cambios: {
        antes: { porcentaje: 50, estado: 'EN_EJECUCION' },
        despues: { porcentaje: 75, estado: 'EN_EJECUCION' }
      }
    },
    {
      accion: 'crear',
      descripcion: 'Registrar hallazgo crítico en auditoría',
      tabla: 'hallazgo',
      registroId: 'hall-2025-023',
      cambios: {
        despues: { tipo: 'NO_CONFORMIDAD', criticidad: 'CRITICA', descripcion: 'Falta de segregación de funciones' }
      }
    },
    {
      accion: 'validar',
      descripcion: 'Validar evidencia de plan de mejoramiento',
      tabla: 'evidencia',
      registroId: 'ev-2025-089',
      cambios: {
        antes: { estado: 'CARGADA' },
        despues: { estado: 'VALIDADA', validadoPor: 'María González' }
      }
    },
    {
      accion: 'cambiar_estado',
      descripcion: 'Cambiar estado de auditoría a Ejecución',
      tabla: 'auditoria',
      registroId: 'aud-2025-012',
      cambios: {
        antes: { estado: 'PLANEACION' },
        despues: { estado: 'EJECUCION', fechaInicio: '2025-12-20' }
      }
    },
    {
      accion: 'generar',
      descripción: 'Generar Informe Preliminar de Auditoría',
      tabla: 'auditoria',
      registroId: 'aud-2025-012',
      cambios: {
        despues: { informePreliminar: 'informe-prelim-aud-012.pdf', fechaGeneracion: '2025-12-21' }
      }
    },
    {
      accion: 'asignar',
      descripcion: 'Asignar equipo auditor a auditoría',
      tabla: 'auditoria',
      registroId: 'aud-2025-016',
      cambios: {
        antes: { equipo: [] },
        despues: { equipo: ['Carlos Rodríguez', 'Ana Martínez', 'Laura Sánchez'], lider: 'Carlos Rodríguez' }
      }
    },
    {
      accion: 'rechazar',
      descripcion: 'Rechazar evidencia del plan de mejoramiento',
      tabla: 'evidencia',
      registroId: 'ev-2025-091',
      cambios: {
        antes: { estado: 'EN_REVISION' },
        despues: { estado: 'RECHAZADA', motivo: 'Documento incompleto, falta firma del responsable' }
      }
    },
    {
      accion: 'actualizar',
      descripcion: 'Actualizar porcentaje de acción correctiva',
      tabla: 'accion_correctiva',
      registroId: 'ac-2025-034',
      cambios: {
        antes: { porcentajeAvance: 60 },
        despues: { porcentajeAvance: 85 }
      }
    },
    {
      accion: 'crear',
      descripcion: 'Crear Informe de Ley - Informe Pormenorizado',
      tabla: 'informe_ley',
      registroId: 'il-2025-003',
      cambios: {
        despues: { codigo: 'IL-2025-003', tipo: 'PORMENORIZADO', periodo: '2025-Q1' }
      }
    },
    {
      accion: 'exportar',
      descripcion: 'Exportar Reporte Ejecutivo a PDF',
      tabla: 'reporte',
      registroId: 'rep-2025-089',
      cambios: {
        despues: { formato: 'PDF', archivo: 'reporte-ejecutivo-dic-2025.pdf' }
      }
    }
  ];

  // Generar logs de los últimos 30 días
  const logs: Promise<AuditLog>[] = [];
  const hoy = new Date();
  
  for (let i = 0; i < 60; i++) {
    const usuario = usuarios[Math.floor(Math.random() * usuarios.length)];
    const accionData = acciones[Math.floor(Math.random() * acciones.length)];
    const diasAtras = Math.floor(Math.random() * 30);
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - diasAtras);
    fecha.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

    // Crear log con timestamp personalizado
    const logPromise = auditLogService.registrar(
      usuario.id,
      usuario.nombre,
      usuario.email,
      usuario.rol,
      accionData.accion,
      accionData.descripcion,
      accionData.tabla,
      accionData.registroId,
      accionData.cambios,
      {
        modulo: obtenerModuloPorTabla(accionData.tabla),
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`
      }
    ).then(log => {
      // Ajustar timestamp
      log.timestamp = fecha.toISOString();
      return log;
    });

    logs.push(logPromise);
  }

  return Promise.all(logs);
};

const obtenerModuloPorTabla = (tabla: TipoEntidad): string => {
  const mapeo: Record<TipoEntidad, string> = {
    plan_anual: 'Planificación',
    actividad: 'Planificación',
    auditoria: 'Proceso Auditoría',
    programa_anual: 'Planificación',
    hallazgo: 'Proceso Auditoría',
    evidencia: 'Proceso Auditoría',
    plan_mejoramiento: 'Planes de Mejoramiento',
    accion_correctiva: 'Planes de Mejoramiento',
    informe_ley: 'Soporte',
    documento: 'Soporte',
    notificacion: 'Soporte',
    usuario: 'Configuración',
    rol: 'Configuración',
    permiso: 'Configuración',
    configuracion: 'Configuración',
    reporte: 'Soporte'
  };
  return mapeo[tabla] || 'Sistema';
};

// ============ COMPONENTE PRINCIPAL ============

export function AuditoriaCambiosModule() {
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('logs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logSeleccionado, setLogSeleccionado] = useState<AuditLog | null>(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Filtros
  const [filtros, setFiltros] = useState<AuditLogFiltros>({
    usuarioId: undefined,
    fechaInicio: undefined,
    fechaFin: undefined,
    accion: 'todas',
    tabla: 'todas',
    criticidad: 'todas',
    busqueda: '',
    pagina: 1,
    registrosPorPagina: 20
  });

  // Estadísticas
  const [estadisticas, setEstadisticas] = useState<AuditLogStats | null>(null);

  // Cargar logs mock al montar
  useEffect(() => {
    generarLogsMock().then(() => {
      cargarLogs();
    });
  }, []);

  // Cargar logs cuando cambien los filtros
  useEffect(() => {
    cargarLogs();
  }, [filtros]);

  const cargarLogs = async () => {
    setCargando(true);
    try {
      const response = await auditLogService.obtenerLogs(filtros);
      setLogs(response.logs);
    } catch (error) {
      toast.error('Error al cargar logs de auditoría');
    } finally {
      setCargando(false);
    }
  };

  const cargarEstadisticas = async () => {
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    try {
      const stats = await auditLogService.obtenerEstadisticas(hace30Dias, hoy);
      setEstadisticas(stats);
    } catch (error) {
      toast.error('Error al cargar estadísticas');
    }
  };

  useEffect(() => {
    if (vistaActiva === 'estadisticas') {
      cargarEstadisticas();
    }
  }, [vistaActiva]);

  const handleVerDetalle = (log: AuditLog) => {
    setLogSeleccionado(log);
    setModalDetalleAbierto(true);
  };

  const handleExportarExcel = async () => {
    try {
      toast.info('Generando archivo Excel...');
      await auditLogService.exportarExcel(filtros);
      toast.success('Archivo Excel descargado correctamente');
    } catch (error) {
      toast.error('Error al exportar a Excel');
    }
  };

  const handleExportarPDF = async () => {
    try {
      toast.info('Generando archivo PDF...');
      await auditLogService.exportarPDF(filtros);
      toast.success('Archivo PDF descargado correctamente');
    } catch (error) {
      toast.error('Error al exportar a PDF');
    }
  };

  const handleCambiarPagina = (nuevaPagina: number) => {
    setFiltros(prev => ({ ...prev, pagina: nuevaPagina }));
  };

  const totalLogs = useMemo(() => {
    return auditLogService.obtenerTodos().length;
  }, [logs]);

  const estadisticasRapidas = useMemo(() => {
    const todosLogs = auditLogService.obtenerTodos();
    const hoy = new Date();
    const hace24h = new Date(hoy.getTime() - 24 * 60 * 60 * 1000);

    return {
      total: todosLogs.length,
      ultimas24h: todosLogs.filter(l => new Date(l.timestamp) >= hace24h).length,
      criticos: todosLogs.filter(l => l.criticidad === 'critica').length,
      usuarios: new Set(todosLogs.map(l => l.usuarioId)).size
    };
  }, [logs]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 border-l-4 border-l-blue-600">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    Auditoría de Cambios
                  </h1>
                  <p className="text-sm text-gray-600">
                    Registro completo de operaciones del sistema para compliance normativo
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handleExportarExcel}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleExportarPDF}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </Button>
              </div>
            </div>

            {/* ESTADÍSTICAS RÁPIDAS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-900">
                  {estadisticasRapidas.total}
                </div>
                <div className="text-xs text-blue-700">Total de Registros</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-900">
                  {estadisticasRapidas.ultimas24h}
                </div>
                <div className="text-xs text-green-700">Últimas 24 horas</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-900">
                  {estadisticasRapidas.criticos}
                </div>
                <div className="text-xs text-red-700">Eventos Críticos</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-900">
                  {estadisticasRapidas.usuarios}
                </div>
                <div className="text-xs text-purple-700">Usuarios Activos</div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* TABS */}
        <Card className="p-1">
          <div className="flex gap-1">
            <button
              onClick={() => setVistaActiva('logs')}
              className={`flex-1 px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                vistaActiva === 'logs'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="font-medium">Registros de Auditoría</span>
            </button>
            <button
              onClick={() => setVistaActiva('estadisticas')}
              className={`flex-1 px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                vistaActiva === 'estadisticas'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="font-medium">Estadísticas</span>
            </button>
          </div>
        </Card>

        {/* CONTENIDO */}
        <AnimatePresence mode="wait">
          {vistaActiva === 'logs' && (
            <VistaLogs
              logs={logs}
              filtros={filtros}
              onCambiarFiltros={setFiltros}
              onVerDetalle={handleVerDetalle}
              onCambiarPagina={handleCambiarPagina}
              cargando={cargando}
            />
          )}

          {vistaActiva === 'estadisticas' && (
            <VistaEstadisticas estadisticas={estadisticas} />
          )}
        </AnimatePresence>

        {/* MODAL DETALLE */}
        {modalDetalleAbierto && logSeleccionado && (
          <ModalDetalleLog
            log={logSeleccionado}
            onClose={() => setModalDetalleAbierto(false)}
          />
        )}
      </div>
    </div>
  );
}

// ============ COMPONENTES AUXILIARES ============

function VistaLogs({
  logs,
  filtros,
  onCambiarFiltros,
  onVerDetalle,
  onCambiarPagina,
  cargando
}: {
  logs: AuditLog[];
  filtros: AuditLogFiltros;
  onCambiarFiltros: (filtros: AuditLogFiltros) => void;
  onVerDetalle: (log: AuditLog) => void;
  onCambiarPagina: (pagina: number) => void;
  cargando: boolean;
}) {
  return (
    <motion.div
      key="logs"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      {/* FILTROS */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-900">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Búsqueda */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar en logs..."
                value={filtros.busqueda}
                onChange={(e) => onCambiarFiltros({ ...filtros, busqueda: e.target.value, pagina: 1 })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Fecha Inicio */}
          <input
            type="date"
            value={filtros.fechaInicio || ''}
            onChange={(e) => onCambiarFiltros({ ...filtros, fechaInicio: e.target.value, pagina: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Fecha Fin */}
          <input
            type="date"
            value={filtros.fechaFin || ''}
            onChange={(e) => onCambiarFiltros({ ...filtros, fechaFin: e.target.value, pagina: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Acción */}
          <select
            value={filtros.accion}
            onChange={(e) => onCambiarFiltros({ ...filtros, accion: e.target.value as any, pagina: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Todas las acciones</option>
            <option value="crear">Crear</option>
            <option value="actualizar">Actualizar</option>
            <option value="eliminar">Eliminar</option>
            <option value="aprobar">Aprobar</option>
            <option value="rechazar">Rechazar</option>
            <option value="cambiar_estado">Cambiar Estado</option>
            <option value="asignar">Asignar</option>
            <option value="validar">Validar</option>
            <option value="generar">Generar</option>
            <option value="exportar">Exportar</option>
          </select>

          {/* Criticidad */}
          <select
            value={filtros.criticidad}
            onChange={(e) => onCambiarFiltros({ ...filtros, criticidad: e.target.value as any, pagina: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Todas las criticidades</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </div>
      </Card>

      {/* TABLA */}
      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Timestamp</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Usuario</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Acción</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Descripción</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Entidad</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Criticidad</th>
                <th className="text-right py-3 px-4 text-sm font-bold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Cargando logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <FilaLog 
                    key={log.id} 
                    log={log} 
                    onVerDetalle={onVerDetalle}
                    delay={index * 0.03}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        {logs.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {(filtros.pagina - 1) * filtros.registrosPorPagina + 1} - {Math.min(filtros.pagina * filtros.registrosPorPagina, logs.length)} de {logs.length}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCambiarPagina(filtros.pagina - 1)}
                disabled={filtros.pagina === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium">
                Página {filtros.pagina}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCambiarPagina(filtros.pagina + 1)}
                disabled={logs.length < filtros.registrosPorPagina}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function FilaLog({ 
  log, 
  onVerDetalle, 
  delay 
}: { 
  log: AuditLog; 
  onVerDetalle: (log: AuditLog) => void;
  delay: number;
}) {
  const iconoAccion = obtenerIconoAccion(log.accion);
  const colorAccion = obtenerColorAccion(log.accion);
  const colorCriticidad = obtenerColorCriticidad(log.criticidad || 'media');

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="border-b border-gray-100 hover:bg-gray-50"
    >
      <td className="py-3 px-4 text-sm text-gray-600">
        {new Date(log.timestamp).toLocaleString('es-CO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </td>
      <td className="py-3 px-4">
        <div>
          <div className="text-sm font-medium text-gray-900">{log.usuarioNombre}</div>
          <div className="text-xs text-gray-500">{log.usuarioEmail}</div>
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge style={{ background: colorAccion, color: 'white' }} className="gap-1">
          {iconoAccion}
          {log.accion}
        </Badge>
      </td>
      <td className="py-3 px-4 text-sm text-gray-700 max-w-md truncate">
        {log.accionDescripcion}
      </td>
      <td className="py-3 px-4">
        <Badge variant="outline">
          {log.tabla}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <Badge style={{ background: colorCriticidad, color: 'white' }}>
          {log.criticidad || 'media'}
        </Badge>
      </td>
      <td className="py-3 px-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onVerDetalle(log)}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </td>
    </motion.tr>
  );
}

function VistaEstadisticas({ estadisticas }: { estadisticas: AuditLogStats | null }) {
  if (!estadisticas) {
    return (
      <motion.div
        key="estadisticas"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Card className="p-8 text-center text-gray-500">
          Cargando estadísticas...
        </Card>
      </motion.div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <motion.div
      key="estadisticas"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      {/* GRÁFICO 1: Actividad por Día */}
      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Actividad de los Últimos 30 Días
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={estadisticas.actividadPorDia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="fecha" 
              tickFormatter={(value) => new Date(value).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString('es-CO')}
              formatter={(value: any) => [value, 'Registros']}
            />
            <Line type="monotone" dataKey="cantidad" stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO 2: Top Usuarios */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-green-600" />
            Top 10 Usuarios Más Activos
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={estadisticas.topUsuarios.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="usuarioNombre" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* GRÁFICO 3: Acciones Frecuentes */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Acciones Más Frecuentes
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={estadisticas.accionesFrecuentes}
                dataKey="cantidad"
                nameKey="accion"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {estadisticas.accionesFrecuentes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* GRÁFICO 4: Entidades Modificadas */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-600" />
            Entidades Más Modificadas
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={estadisticas.entidadesMasModificadas}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="entidad" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* GRÁFICO 5: Distribución Criticidad */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Distribución por Criticidad
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={estadisticas.criticidadDistribucion}
                dataKey="cantidad"
                nameKey="criticidad"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {estadisticas.criticidadDistribucion.map((entry, index) => {
                  const color = obtenerColorCriticidad(entry.criticidad as any);
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* RESUMEN */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <h3 className="font-bold text-gray-900 mb-4">Resumen Ejecutivo</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-900">
              {estadisticas.totalRegistros}
            </div>
            <div className="text-sm text-gray-600">Total Registros</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-green-900">
              {estadisticas.topUsuarios.length}
            </div>
            <div className="text-sm text-gray-600">Usuarios Activos</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-900">
              {estadisticas.accionesFrecuentes.length}
            </div>
            <div className="text-sm text-gray-600">Tipos de Acciones</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-900">
              {estadisticas.entidadesMasModificadas.length}
            </div>
            <div className="text-sm text-gray-600">Entidades Afectadas</div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ModalDetalleLog({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Detalle de Auditoría</h2>
              <p className="text-sm text-blue-100">ID: {log.id}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="p-6 space-y-6">
          {/* INFO GENERAL */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Timestamp</div>
              <div className="font-medium text-gray-900">
                {new Date(log.timestamp).toLocaleString('es-CO')}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Criticidad</div>
              <Badge style={{ background: obtenerColorCriticidad(log.criticidad || 'media'), color: 'white' }}>
                {log.criticidad || 'media'}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Usuario</div>
              <div className="font-medium text-gray-900">{log.usuarioNombre}</div>
              <div className="text-sm text-gray-500">{log.usuarioEmail}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Rol</div>
              <Badge variant="outline">{log.usuarioRol}</Badge>
            </div>
          </div>

          {/* ACCIÓN */}
          <Card className="p-4 border-2 border-blue-200 bg-blue-50">
            <div className="text-sm text-blue-700 mb-2 font-medium">Acción Ejecutada</div>
            <div className="flex items-center gap-3">
              {obtenerIconoAccion(log.accion)}
              <div>
                <div className="font-bold text-blue-900">{log.accion.toUpperCase()}</div>
                <div className="text-sm text-blue-700">{log.accionDescripcion}</div>
              </div>
            </div>
          </Card>

          {/* ENTIDAD */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Entidad/Tabla</div>
              <Badge variant="outline">{log.tabla}</Badge>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">ID del Registro</div>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">{log.registroId}</code>
            </div>
          </div>

          {/* CAMBIOS (DIFF) */}
          {(log.cambios.antes || log.cambios.despues) && (
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <ArrowRightCircle className="w-5 h-5 text-orange-600" />
                Cambios Realizados
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* ANTES */}
                {log.cambios.antes && (
                  <Card className="p-4 border-2 border-red-200 bg-red-50">
                    <div className="text-sm font-medium text-red-700 mb-2">❌ Antes</div>
                    <pre className="text-xs text-red-900 whitespace-pre-wrap font-mono overflow-x-auto">
                      {JSON.stringify(log.cambios.antes, null, 2)}
                    </pre>
                  </Card>
                )}

                {/* DESPUÉS */}
                {log.cambios.despues && (
                  <Card className="p-4 border-2 border-green-200 bg-green-50">
                    <div className="text-sm font-medium text-green-700 mb-2">✅ Después</div>
                    <pre className="text-xs text-green-900 whitespace-pre-wrap font-mono overflow-x-auto">
                      {JSON.stringify(log.cambios.despues, null, 2)}
                    </pre>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* METADATOS */}
          {(log.ip || log.modulo) && (
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Metadatos Adicionales</h3>
              <div className="grid grid-cols-2 gap-4">
                {log.modulo && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Módulo</div>
                    <Badge>{log.modulo}</Badge>
                  </div>
                )}
                {log.ip && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Dirección IP</div>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{log.ip}</code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <Button onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ============ UTILIDADES ============

function obtenerIconoAccion(accion: TipoAccion) {
  const iconos: Record<TipoAccion, JSX.Element> = {
    crear: <PlusCircle className="w-4 h-4" />,
    actualizar: <Edit className="w-4 h-4" />,
    eliminar: <Trash2 className="w-4 h-4" />,
    aprobar: <CheckCircle className="w-4 h-4" />,
    rechazar: <XCircle className="w-4 h-4" />,
    cambiar_estado: <ArrowRightCircle className="w-4 h-4" />,
    asignar: <User className="w-4 h-4" />,
    validar: <CheckCircle className="w-4 h-4" />,
    generar: <FileText className="w-4 h-4" />,
    exportar: <Download className="w-4 h-4" />,
    consultar: <Eye className="w-4 h-4" />
  };
  return iconos[accion] || <Activity className="w-4 h-4" />;
}

function obtenerColorAccion(accion: TipoAccion): string {
  const colores: Record<TipoAccion, string> = {
    crear: '#10B981',
    actualizar: '#F59E0B',
    eliminar: '#DC2626',
    aprobar: '#10B981',
    rechazar: '#DC2626',
    cambiar_estado: '#3B82F6',
    asignar: '#8B5CF6',
    validar: '#10B981',
    generar: '#3B82F6',
    exportar: '#6B7280',
    consultar: '#6B7280'
  };
  return colores[accion] || '#6B7280';
}

function obtenerColorCriticidad(criticidad: 'baja' | 'media' | 'alta' | 'critica'): string {
  const colores = {
    baja: '#3B82F6',
    media: '#F59E0B',
    alta: '#EA580C',
    critica: '#DC2626'
  };
  return colores[criticidad];
}

export default AuditoriaCambiosModule;
