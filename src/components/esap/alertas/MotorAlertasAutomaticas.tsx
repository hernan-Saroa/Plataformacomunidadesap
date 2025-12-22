/**
 * 🤖 MOTOR DE ALERTAS AUTOMÁTICAS - REQ-MOD01-002
 * 
 * Sistema ejecuta cálculo diario de alertas:
 * - Calcula días restantes para cada expediente
 * - Asigna color dinámico (VERDE/AMARILLO/ROJO/VENCIDO)
 * - Detecta cambios de estado
 * - Envía notificaciones por canales configurados
 * - Escala casos vencidos
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, RefreshCw, CheckCircle, AlertTriangle, Clock,
  TrendingUp, TrendingDown, Zap, Activity, Bell, Send,
  Database, Mail, MessageSquare, Smartphone, Eye, Calendar,
  BarChart3, Filter, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

type EstadoAlerta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';

type Expediente = {
  id: string;
  tipo: string;
  numeroRadicado: string;
  fechaVencimiento: Date;
  diasTotales: number;
  diasRestantes: number;
  porcentajeRestante: number;
  estadoActual: EstadoAlerta;
  estadoAnterior: EstadoAlerta | null;
  responsable: string;
  modulo: string;
  cambioDetectado: boolean;
};

type NotificacionEnviada = {
  expedienteId: string;
  canal: 'EMAIL' | 'TEAMS' | 'SMS' | 'IN_APP';
  timestamp: Date;
  destinatario: string;
  estado: 'ENVIADA' | 'FALLIDA' | 'PENDIENTE';
};

type EjecucionJob = {
  id: string;
  timestamp: Date;
  expedientesProcesados: number;
  cambiosDetectados: number;
  notificacionesEnviadas: number;
  duracionMs: number;
  estado: 'COMPLETADO' | 'ERROR' | 'EN_PROCESO';
};

// Mock de expedientes activos
const EXPEDIENTES_MOCK: Expediente[] = [
  {
    id: 'PJ-2025-00123',
    tipo: 'Defensa Judicial',
    numeroRadicado: '2025-123-JZ',
    fechaVencimiento: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 días
    diasTotales: 60,
    diasRestantes: 25,
    porcentajeRestante: 41.67,
    estadoActual: 'AMARILLO',
    estadoAnterior: 'VERDE',
    responsable: 'Dr. Juan Pérez',
    modulo: 'DEFENSA_JUDICIAL',
    cambioDetectado: true,
  },
  {
    id: 'OC-2025-00045',
    tipo: 'Órganos de Control',
    numeroRadicado: '2025-045-CT',
    fechaVencimiento: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 días
    diasTotales: 30,
    diasRestantes: 5,
    porcentajeRestante: 16.67,
    estadoActual: 'ROJO',
    estadoAnterior: 'AMARILLO',
    responsable: 'Dra. María López',
    modulo: 'ORGANOS_CONTROL',
    cambioDetectado: true,
  },
  {
    id: 'AJ-2025-00078',
    tipo: 'Asesoría Jurídica',
    numeroRadicado: '2025-078-AJ',
    fechaVencimiento: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // -2 días (vencido)
    diasTotales: 30,
    diasRestantes: -2,
    porcentajeRestante: -6.67,
    estadoActual: 'VENCIDO',
    estadoAnterior: 'ROJO',
    responsable: 'Dr. Carlos Ramírez',
    modulo: 'ASESORIA_JURIDICA',
    cambioDetectado: true,
  },
  {
    id: 'PJ-2025-00156',
    tipo: 'Defensa Judicial',
    numeroRadicado: '2025-156-JZ',
    fechaVencimiento: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 días
    diasTotales: 60,
    diasRestantes: 45,
    porcentajeRestante: 75,
    estadoActual: 'VERDE',
    estadoAnterior: 'VERDE',
    responsable: 'Dra. Ana Martínez',
    modulo: 'DEFENSA_JUDICIAL',
    cambioDetectado: false,
  },
];

export function MotorAlertasAutomaticas() {
  const [motorActivo, setMotorActivo] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);
  const [expedientes, setExpedientes] = useState<Expediente[]>(EXPEDIENTES_MOCK);
  const [notificaciones, setNotificaciones] = useState<NotificacionEnviada[]>([]);
  const [historialEjecuciones, setHistorialEjecuciones] = useState<EjecucionJob[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<EstadoAlerta | 'TODOS'>('TODOS');
  const [mostrarSoloConCambios, setMostrarSoloConCambios] = useState(false);
  const [ultimaEjecucion, setUltimaEjecucion] = useState<Date | null>(null);
  const [seccionExpandida, setSeccionExpandida] = useState<string>('monitor');

  // Simular ejecución del motor diario
  const ejecutarMotor = async () => {
    setEjecutando(true);
    const inicioEjecucion = Date.now();

    toast.info('🤖 Iniciando motor de alertas...', {
      description: 'Calculando días restantes y estados',
    });

    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Calcular nuevos estados
    const expedientesActualizados = expedientes.map(exp => {
      const diasRestantes = Math.ceil(
        (exp.fechaVencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const porcentajeRestante = (diasRestantes / exp.diasTotales) * 100;
      
      let nuevoEstado: EstadoAlerta;
      if (diasRestantes <= 0) {
        nuevoEstado = 'VENCIDO';
      } else if (porcentajeRestante < 25) {
        nuevoEstado = 'ROJO';
      } else if (porcentajeRestante < 50) {
        nuevoEstado = 'AMARILLO';
      } else {
        nuevoEstado = 'VERDE';
      }

      const cambioDetectado = exp.estadoActual !== nuevoEstado;

      return {
        ...exp,
        diasRestantes,
        porcentajeRestante,
        estadoAnterior: exp.estadoActual,
        estadoActual: nuevoEstado,
        cambioDetectado,
      };
    });

    const cambiosDetectados = expedientesActualizados.filter(e => e.cambioDetectado).length;

    // Simular envío de notificaciones para cambios detectados
    const nuevasNotificaciones: NotificacionEnviada[] = [];
    expedientesActualizados.forEach(exp => {
      if (exp.cambioDetectado) {
        ['EMAIL', 'IN_APP'].forEach(canal => {
          nuevasNotificaciones.push({
            expedienteId: exp.id,
            canal: canal as any,
            timestamp: new Date(),
            destinatario: exp.responsable,
            estado: 'ENVIADA',
          });
        });
      }
    });

    const duracionMs = Date.now() - inicioEjecucion;

    // Registrar ejecución
    const nuevaEjecucion: EjecucionJob = {
      id: `EXEC-${Date.now()}`,
      timestamp: new Date(),
      expedientesProcesados: expedientesActualizados.length,
      cambiosDetectados,
      notificacionesEnviadas: nuevasNotificaciones.length,
      duracionMs,
      estado: 'COMPLETADO',
    };

    setExpedientes(expedientesActualizados);
    setNotificaciones([...nuevasNotificaciones, ...notificaciones].slice(0, 50));
    setHistorialEjecuciones([nuevaEjecucion, ...historialEjecuciones].slice(0, 10));
    setUltimaEjecucion(new Date());
    setEjecutando(false);

    toast.success('✅ Motor ejecutado exitosamente', {
      description: `${cambiosDetectados} cambios detectados, ${nuevasNotificaciones.length} notificaciones enviadas`,
    });
  };

  // Auto-ejecutar si el motor está activo
  useEffect(() => {
    if (motorActivo && !ejecutando) {
      const interval = setInterval(() => {
        ejecutarMotor();
      }, 60000); // Cada 60 segundos (para demo, en producción sería diario)

      return () => clearInterval(interval);
    }
  }, [motorActivo, ejecutando]);

  const getColorEstado = (estado: EstadoAlerta) => {
    switch (estado) {
      case 'VERDE': return 'bg-green-500';
      case 'AMARILLO': return 'bg-yellow-500';
      case 'ROJO': return 'bg-red-500';
      case 'VENCIDO': return 'bg-gray-900';
    }
  };

  const getIconoEstado = (estado: EstadoAlerta) => {
    switch (estado) {
      case 'VERDE': return CheckCircle;
      case 'AMARILLO': return Clock;
      case 'ROJO': return AlertTriangle;
      case 'VENCIDO': return AlertTriangle;
    }
  };

  const expedientesFiltrados = expedientes.filter(exp => {
    if (filtroEstado !== 'TODOS' && exp.estadoActual !== filtroEstado) return false;
    if (mostrarSoloConCambios && !exp.cambioDetectado) return false;
    return true;
  });

  const estadisticas = {
    total: expedientes.length,
    verde: expedientes.filter(e => e.estadoActual === 'VERDE').length,
    amarillo: expedientes.filter(e => e.estadoActual === 'AMARILLO').length,
    rojo: expedientes.filter(e => e.estadoActual === 'ROJO').length,
    vencido: expedientes.filter(e => e.estadoActual === 'VENCIDO').length,
    cambiosHoy: expedientes.filter(e => e.cambioDetectado).length,
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header con controles principales */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-7 h-7 text-blue-600" />
              Motor de Alertas Automáticas
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Sistema de monitoreo en tiempo real • REQ-MOD01-002
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Estado del motor */}
            <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${motorActivo ? 'bg-green-100' : 'bg-gray-100'}`}>
              <div className={`w-2 h-2 rounded-full ${motorActivo ? 'bg-green-600 animate-pulse' : 'bg-gray-400'}`} />
              <span className={`text-sm font-bold ${motorActivo ? 'text-green-900' : 'text-gray-700'}`}>
                {motorActivo ? 'Motor Activo' : 'Motor Inactivo'}
              </span>
            </div>

            {/* Botón activar/desactivar */}
            <Button
              onClick={() => setMotorActivo(!motorActivo)}
              variant={motorActivo ? 'outline' : 'default'}
              className={motorActivo ? '' : 'bg-blue-600 hover:bg-blue-700 text-white'}
            >
              {motorActivo ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Detener Motor
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Motor
                </>
              )}
            </Button>

            {/* Botón ejecutar manualmente */}
            <Button
              onClick={ejecutarMotor}
              disabled={ejecutando}
              variant="outline"
            >
              {ejecutando ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Ejecutando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Ejecutar Ahora
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Última ejecución */}
        {ultimaEjecucion && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>
              Última ejecución: {ultimaEjecucion.toLocaleTimeString('es-CO', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>
        )}
      </div>

      {/* Contenido principal con scroll */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Estadísticas generales */}
          <div className="grid grid-cols-6 gap-4">
            <Card className="p-4 bg-white border-2 border-gray-200">
              <div className="text-center">
                <Database className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-gray-900">{estadisticas.total}</div>
                <div className="text-xs text-gray-600 mt-1">Total Expedientes</div>
              </div>
            </Card>

            <Card className="p-4 bg-green-50 border-2 border-green-200">
              <div className="text-center">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-green-900">{estadisticas.verde}</div>
                <div className="text-xs text-green-700 mt-1">Verde (&gt;50%)</div>
              </div>
            </Card>

            <Card className="p-4 bg-yellow-50 border-2 border-yellow-200">
              <div className="text-center">
                <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-yellow-900">{estadisticas.amarillo}</div>
                <div className="text-xs text-yellow-700 mt-1">Amarillo (25-50%)</div>
              </div>
            </Card>

            <Card className="p-4 bg-red-50 border-2 border-red-200">
              <div className="text-center">
                <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-red-900">{estadisticas.rojo}</div>
                <div className="text-xs text-red-700 mt-1">Rojo (&lt;25%)</div>
              </div>
            </Card>

            <Card className="p-4 bg-gray-900 text-white border-2 border-gray-700">
              <div className="text-center">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
                <div className="text-3xl font-bold">{estadisticas.vencido}</div>
                <div className="text-xs mt-1 opacity-90">Vencidos</div>
              </div>
            </Card>

            <Card className="p-4 bg-orange-50 border-2 border-orange-200">
              <div className="text-center">
                <Bell className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-orange-900">{estadisticas.cambiosHoy}</div>
                <div className="text-xs text-orange-700 mt-1">Cambios Hoy</div>
              </div>
            </Card>
          </div>

          {/* Monitor de Expedientes */}
          <Card className="bg-white border-2 border-gray-200">
            <div 
              className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setSeccionExpandida(seccionExpandida === 'monitor' ? '' : 'monitor')}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  Monitor de Expedientes en Tiempo Real
                </h3>
                {seccionExpandida === 'monitor' ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </div>
            </div>

            <AnimatePresence>
              {seccionExpandida === 'monitor' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-4">
                    {/* Filtros */}
                    <div className="flex items-center gap-3 mb-4">
                      <Filter className="w-4 h-4 text-gray-600" />
                      <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value as any)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="TODOS">Todos los estados</option>
                        <option value="VERDE">Verde</option>
                        <option value="AMARILLO">Amarillo</option>
                        <option value="ROJO">Rojo</option>
                        <option value="VENCIDO">Vencido</option>
                      </select>

                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={mostrarSoloConCambios}
                          onChange={(e) => setMostrarSoloConCambios(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        Solo con cambios detectados
                      </label>

                      <div className="ml-auto text-sm text-gray-600">
                        Mostrando {expedientesFiltrados.length} de {expedientes.length}
                      </div>
                    </div>

                    {/* Lista de expedientes */}
                    <div className="space-y-2">
                      {expedientesFiltrados.map(exp => {
                        const IconoEstado = getIconoEstado(exp.estadoActual);
                        
                        return (
                          <motion.div
                            key={exp.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 rounded-lg border-2 ${
                              exp.cambioDetectado 
                                ? 'bg-orange-50 border-orange-300 shadow-md' 
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              {/* Indicador de estado */}
                              <div className={`p-3 rounded-lg ${getColorEstado(exp.estadoActual)}`}>
                                <IconoEstado className="w-6 h-6 text-white" />
                              </div>

                              {/* Información del expediente */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-gray-900">{exp.id}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {exp.tipo}
                                  </Badge>
                                  {exp.cambioDetectado && (
                                    <Badge className="bg-orange-500 text-white text-xs">
                                      <TrendingDown className="w-3 h-3 mr-1" />
                                      Cambio detectado
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  Radicado: {exp.numeroRadicado} • Responsable: {exp.responsable}
                                </p>
                                
                                {/* Barra de progreso */}
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full transition-all duration-500 ${getColorEstado(exp.estadoActual)}`}
                                        style={{ width: `${Math.max(0, Math.min(100, exp.porcentajeRestante))}%` }}
                                      />
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-sm font-bold ${
                                      exp.diasRestantes <= 0 ? 'text-gray-900' :
                                      exp.diasRestantes < 10 ? 'text-red-600' :
                                      exp.diasRestantes < 15 ? 'text-yellow-600' :
                                      'text-green-600'
                                    }`}>
                                      {exp.diasRestantes <= 0 ? 'VENCIDO' : `${exp.diasRestantes} días`}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {exp.porcentajeRestante.toFixed(1)}%
                                    </div>
                                  </div>
                                </div>

                                {/* Transición de estado */}
                                {exp.cambioDetectado && exp.estadoAnterior && (
                                  <div className="mt-2 flex items-center gap-2 text-xs text-orange-700">
                                    <TrendingDown className="w-3 h-3" />
                                    <span>
                                      Cambió de <strong>{exp.estadoAnterior}</strong> → <strong>{exp.estadoActual}</strong>
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Botón ver detalle */}
                              <Button variant="outline" size="sm">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Notificaciones Enviadas */}
          <Card className="bg-white border-2 border-gray-200">
            <div 
              className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setSeccionExpandida(seccionExpandida === 'notificaciones' ? '' : 'notificaciones')}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  Notificaciones Enviadas ({notificaciones.length})
                </h3>
                {seccionExpandida === 'notificaciones' ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </div>
            </div>

            <AnimatePresence>
              {seccionExpandida === 'notificaciones' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-4">
                    {notificaciones.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No hay notificaciones enviadas aún</p>
                        <p className="text-sm mt-1">Ejecuta el motor para generar notificaciones</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {notificaciones.slice(0, 10).map((notif, idx) => {
                          const IconoCanal = 
                            notif.canal === 'EMAIL' ? Mail :
                            notif.canal === 'TEAMS' ? MessageSquare :
                            notif.canal === 'SMS' ? Smartphone :
                            Bell;

                          return (
                            <div 
                              key={idx}
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                            >
                              <div className={`p-2 rounded-lg ${
                                notif.estado === 'ENVIADA' ? 'bg-green-100' :
                                notif.estado === 'FALLIDA' ? 'bg-red-100' :
                                'bg-yellow-100'
                              }`}>
                                <IconoCanal className={`w-4 h-4 ${
                                  notif.estado === 'ENVIADA' ? 'text-green-600' :
                                  notif.estado === 'FALLIDA' ? 'text-red-600' :
                                  'text-yellow-600'
                                }`} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-gray-900">
                                    {notif.expedienteId}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {notif.canal}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600">
                                  {notif.destinatario} • {notif.timestamp.toLocaleTimeString('es-CO')}
                                </p>
                              </div>

                              <Badge className={
                                notif.estado === 'ENVIADA' ? 'bg-green-100 text-green-800' :
                                notif.estado === 'FALLIDA' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {notif.estado}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Historial de Ejecuciones */}
          <Card className="bg-white border-2 border-gray-200">
            <div 
              className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setSeccionExpandida(seccionExpandida === 'historial' ? '' : 'historial')}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Historial de Ejecuciones
                </h3>
                {seccionExpandida === 'historial' ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </div>
            </div>

            <AnimatePresence>
              {seccionExpandida === 'historial' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 1, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-4">
                    {historialEjecuciones.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No hay ejecuciones registradas</p>
                        <p className="text-sm mt-1">El historial aparecerá cuando ejecutes el motor</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {historialEjecuciones.map((ejecucion) => (
                          <div 
                            key={ejecucion.id}
                            className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg ${
                                  ejecucion.estado === 'COMPLETADO' ? 'bg-green-500' :
                                  ejecucion.estado === 'ERROR' ? 'bg-red-500' :
                                  'bg-yellow-500'
                                }`}>
                                  {ejecucion.estado === 'COMPLETADO' ? (
                                    <CheckCircle className="w-4 h-4 text-white" />
                                  ) : ejecucion.estado === 'ERROR' ? (
                                    <AlertTriangle className="w-4 h-4 text-white" />
                                  ) : (
                                    <RefreshCw className="w-4 h-4 text-white animate-spin" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-gray-900">
                                    {ejecucion.timestamp.toLocaleString('es-CO')}
                                  </h4>
                                  <p className="text-xs text-gray-600">
                                    ID: {ejecucion.id}
                                  </p>
                                </div>
                              </div>

                              <Badge className={
                                ejecucion.estado === 'COMPLETADO' ? 'bg-green-100 text-green-800' :
                                ejecucion.estado === 'ERROR' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {ejecucion.estado}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                              <div className="text-center p-2 bg-white rounded-lg">
                                <Database className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                                <div className="text-lg font-bold text-gray-900">
                                  {ejecucion.expedientesProcesados}
                                </div>
                                <div className="text-xs text-gray-600">Procesados</div>
                              </div>

                              <div className="text-center p-2 bg-white rounded-lg">
                                <TrendingDown className="w-4 h-4 text-orange-600 mx-auto mb-1" />
                                <div className="text-lg font-bold text-gray-900">
                                  {ejecucion.cambiosDetectados}
                                </div>
                                <div className="text-xs text-gray-600">Cambios</div>
                              </div>

                              <div className="text-center p-2 bg-white rounded-lg">
                                <Send className="w-4 h-4 text-green-600 mx-auto mb-1" />
                                <div className="text-lg font-bold text-gray-900">
                                  {ejecucion.notificacionesEnviadas}
                                </div>
                                <div className="text-xs text-gray-600">Notificaciones</div>
                              </div>

                              <div className="text-center p-2 bg-white rounded-lg">
                                <Clock className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                                <div className="text-lg font-bold text-gray-900">
                                  {ejecucion.duracionMs}ms
                                </div>
                                <div className="text-xs text-gray-600">Duración</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </div>
    </div>
  );
}