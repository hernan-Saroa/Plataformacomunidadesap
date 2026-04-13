/**
 * SEMÁFORO AUTOMÁTICO PARA PLANES DE MEJORAMIENTO
 * Componente crítico que calcula y muestra el estado automático
 * Casos de Uso: 3 (Seguimiento Trimestral)
 * 
 * Lógica del semáforo:
 * - ROJO (Crítico): Hay acciones vencidas
 * - AMARILLO (Atención): 50-79% de avance
 * - VERDE (Cumplimiento): 80%+ de avance
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown,
  Activity, Target, Calendar, Bell, Shield, Flag, XCircle
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

export type ColorSemaforo = 'verde' | 'amarillo' | 'rojo';
export type EstadoAccionSemaforo = 'pendiente' | 'en-progreso' | 'completada' | 'vencida';

export interface AccionParaSemaforo {
  id: string;
  descripcion: string;
  estado: EstadoAccionSemaforo;
  fechaFin: string;
  progreso: number;
}

export interface PlanParaSemaforo {
  id: string;
  codigo: string;
  titulo: string;
  acciones: AccionParaSemaforo[];
  fechaFinProgramada: string;
}

export interface ResultadoSemaforo {
  color: ColorSemaforo;
  estado: string;
  porcentajeAvance: number;
  totalAcciones: number;
  accionesCompletadas: number;
  accionesEnProgreso: number;
  accionesPendientes: number;
  accionesVencidas: number;
  alertas: string[];
  recomendaciones: string[];
  diasRestantes: number;
  tendencia: 'positiva' | 'neutral' | 'negativa';
}

interface SemaforoAutomaticoProps {
  plan: PlanParaSemaforo;
  mostrarDetalles?: boolean;
  onAlertaGenerada?: (alerta: string) => void;
  onNotificarJefeOCI?: (mensaje: string) => void;
}

// ============ COMPONENTE PRINCIPAL ============

export function SemaforoAutomatico({
  plan,
  mostrarDetalles = true,
  onAlertaGenerada,
  onNotificarJefeOCI
}: SemaforoAutomaticoProps) {
  const [semaforo, setSemaforo] = useState<ResultadoSemaforo | null>(null);
  const [notificacionEnviada, setNotificacionEnviada] = useState(false);

  // ============ CÁLCULO DEL SEMÁFORO ============

  const calcularSemaforo = (): ResultadoSemaforo => {
    const totalAcciones = plan.acciones.length;
    const accionesCompletadas = plan.acciones.filter(a => a.estado === 'completada').length;
    const accionesEnProgreso = plan.acciones.filter(a => a.estado === 'en-progreso').length;
    const accionesPendientes = plan.acciones.filter(a => a.estado === 'pendiente').length;
    const accionesVencidas = plan.acciones.filter(a => {
      return a.estado !== 'completada' && new Date(a.fechaFin) < new Date();
    }).length;

    // Calcular porcentaje de avance basado en acciones completadas
    const porcentajeAvance = totalAcciones > 0 
      ? (accionesCompletadas / totalAcciones) * 100 
      : 0;

    // Calcular días restantes hasta la fecha fin del plan
    const hoy = new Date();
    const fechaFin = new Date(plan.fechaFinProgramada);
    const diasRestantes = Math.ceil((fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    // ============ LÓGICA DEL SEMÁFORO ============
    let color: ColorSemaforo;
    let estado: string;
    const alertas: string[] = [];
    const recomendaciones: string[] = [];

    // REGLA 1: Si hay acciones vencidas → ROJO
    if (accionesVencidas > 0) {
      color = 'rojo';
      estado = 'Crítico - Acciones Vencidas';
      alertas.push(`${accionesVencidas} acción(es) vencida(s)`);
      alertas.push('Notificar inmediatamente a Jefe OCI');
      recomendaciones.push('Programar reunión urgente con responsables');
      recomendaciones.push('Solicitar justificación de incumplimiento');
      recomendaciones.push('Evaluar necesidad de ajuste al plan');
    }
    // REGLA 2: Si el avance es >= 80% → VERDE
    else if (porcentajeAvance >= 80) {
      color = 'verde';
      estado = 'En Cumplimiento';
      recomendaciones.push('Mantener el ritmo de ejecución');
      recomendaciones.push('Documentar lecciones aprendidas');
    }
    // REGLA 3: Si el avance está entre 50-79% → AMARILLO
    else if (porcentajeAvance >= 50) {
      color = 'amarillo';
      estado = 'Requiere Atención';
      alertas.push('Avance por debajo del 80%');
      recomendaciones.push('Acelerar ejecución de acciones pendientes');
      recomendaciones.push('Identificar y mitigar obstáculos');
      
      // Si queda poco tiempo y el avance es bajo → AMARILLO CRÍTICO
      if (diasRestantes < 30 && porcentajeAvance < 70) {
        alertas.push(`Solo quedan ${diasRestantes} días`);
        recomendaciones.push('Priorizar acciones críticas');
      }
    }
    // REGLA 4: Si el avance es < 50% → ROJO
    else {
      color = 'rojo';
      estado = 'En Riesgo';
      alertas.push('Avance insuficiente (< 50%)');
      if (diasRestantes < 60) {
        alertas.push(`Tiempo crítico: ${diasRestantes} días restantes`);
      }
      recomendaciones.push('Reunión urgente con responsable del plan');
      recomendaciones.push('Evaluar viabilidad de cumplimiento');
      recomendaciones.push('Considerar reprogramación o ajuste del plan');
    }

    // Calcular tendencia
    const progresoPromedio = plan.acciones.reduce((sum, a) => sum + a.progreso, 0) / totalAcciones;
    let tendencia: 'positiva' | 'neutral' | 'negativa';
    
    if (porcentajeAvance >= 80 || progresoPromedio >= 70) {
      tendencia = 'positiva';
    } else if (accionesVencidas > 0 || porcentajeAvance < 30) {
      tendencia = 'negativa';
    } else {
      tendencia = 'neutral';
    }

    return {
      color,
      estado,
      porcentajeAvance,
      totalAcciones,
      accionesCompletadas,
      accionesEnProgreso,
      accionesPendientes,
      accionesVencidas,
      alertas,
      recomendaciones,
      diasRestantes,
      tendencia
    };
  };

  // ============ EFECTOS ============

  useEffect(() => {
    const resultado = calcularSemaforo();
    setSemaforo(resultado);

    // Notificar alertas
    if (resultado.alertas.length > 0) {
      resultado.alertas.forEach(alerta => {
        if (onAlertaGenerada) {
          onAlertaGenerada(alerta);
        }
      });

      // Si hay acciones vencidas, notificar al Jefe OCI
      if (resultado.accionesVencidas > 0 && !notificacionEnviada) {
        const mensaje = `⚠️ ALERTA CRÍTICA: El plan "${plan.codigo}" tiene ${resultado.accionesVencidas} acción(es) vencida(s)`;
        if (onNotificarJefeOCI) {
          onNotificarJefeOCI(mensaje);
        }
        setNotificacionEnviada(true);
      }
    }
  }, [plan]);

  // ============ FUNCIONES AUXILIARES ============

  const getColorHex = (color: ColorSemaforo): string => {
    switch (color) {
      case 'verde': return '#10B981';
      case 'amarillo': return '#F59E0B';
      case 'rojo': return '#EF4444';
    }
  };

  const getIconoTendencia = () => {
    if (!semaforo) return null;
    
    switch (semaforo.tendencia) {
      case 'positiva':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'negativa':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  if (!semaforo) return null;

  // ============ RENDER ============

  return (
    <div className="space-y-4">
      {/* Semáforo principal */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Círculo del semáforo */}
            <motion.div
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: getColorHex(semaforo.color) }}
              animate={{
                scale: semaforo.color === 'rojo' ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: 1,
                repeat: semaforo.color === 'rojo' ? Infinity : 0,
              }}
            >
              {semaforo.color === 'verde' && <CheckCircle className="w-8 h-8 text-white" />}
              {semaforo.color === 'amarillo' && <AlertTriangle className="w-8 h-8 text-white" />}
              {semaforo.color === 'rojo' && <XCircle className="w-8 h-8 text-white" />}
            </motion.div>

            {/* Estado */}
            <div>
              <h4 className="font-black text-lg text-gray-800">{semaforo.estado}</h4>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-600">Plan: {plan.codigo}</p>
                {getIconoTendencia()}
              </div>
            </div>
          </div>

          {/* Porcentaje de avance */}
          <div className="text-right">
            <p className="text-3xl font-black" style={{ color: getColorHex(semaforo.color) }}>
              {semaforo.porcentajeAvance.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600">Avance</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mb-3">
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: getColorHex(semaforo.color) }}
              initial={{ width: 0 }}
              animate={{ width: `${semaforo.porcentajeAvance}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-5 gap-2">
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-xs text-gray-600">Total</p>
            <p className="text-lg font-black text-gray-800">{semaforo.totalAcciones}</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <p className="text-xs text-gray-600">Completadas</p>
            <p className="text-lg font-black text-green-600">{semaforo.accionesCompletadas}</p>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <p className="text-xs text-gray-600">En Progreso</p>
            <p className="text-lg font-black text-blue-600">{semaforo.accionesEnProgreso}</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-xs text-gray-600">Pendientes</p>
            <p className="text-lg font-black text-gray-600">{semaforo.accionesPendientes}</p>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <p className="text-xs text-gray-600">Vencidas</p>
            <p className="text-lg font-black text-red-600">{semaforo.accionesVencidas}</p>
          </div>
        </div>

        {/* Días restantes */}
        <div className="mt-3 flex items-center justify-center gap-2 p-2 bg-gray-50 rounded">
          <Calendar className="w-4 h-4 text-gray-600" />
          <p className="text-sm text-gray-700">
            <strong>{semaforo.diasRestantes}</strong> días restantes hasta fecha límite
          </p>
        </div>
      </Card>

      {/* Alertas y recomendaciones */}
      {mostrarDetalles && (
        <>
          {/* Alertas */}
          {semaforo.alertas.length > 0 && (
            <Card className="p-4 border-2" style={{ borderColor: getColorHex(semaforo.color) }}>
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-5 h-5" style={{ color: getColorHex(semaforo.color) }} />
                <h5 className="font-black text-gray-800">Alertas Activas</h5>
              </div>
              <div className="space-y-2">
                {semaforo.alertas.map((alerta, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-2 p-2 rounded"
                    style={{ background: getColorHex(semaforo.color) + '20' }}
                  >
                    <AlertTriangle 
                      className="w-4 h-4 mt-0.5 flex-shrink-0" 
                      style={{ color: getColorHex(semaforo.color) }} 
                    />
                    <p className="text-sm text-gray-800">{alerta}</p>
                  </motion.div>
                ))}
              </div>
            </Card>
          )}

          {/* Recomendaciones */}
          {semaforo.recomendaciones.length > 0 && (
            <Card className="p-4 bg-blue-50">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-blue-600" />
                <h5 className="font-black text-gray-800">Recomendaciones</h5>
              </div>
              <div className="space-y-2">
                {semaforo.recomendaciones.map((rec, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-2"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-gray-800">{rec}</p>
                  </motion.div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Botón de acción para casos críticos */}
      {semaforo.color === 'rojo' && semaforo.accionesVencidas > 0 && (
        <Card className="p-4 bg-red-50 border-2 border-red-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-black text-red-900">Acción requerida</p>
                <p className="text-xs text-red-700">
                  Este plan requiere intervención inmediata del Jefe OCI
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                if (onNotificarJefeOCI) {
                  const mensaje = `Plan ${plan.codigo}: ${semaforo.accionesVencidas} acción(es) vencida(s). Estado: ${semaforo.estado}`;
                  onNotificarJefeOCI(mensaje);
                  toast.success('Notificación enviada al Jefe OCI');
                }
              }}
              style={{ background: '#EF4444' }}
            >
              <Bell className="w-4 h-4 mr-2" />
              Notificar a Jefe OCI
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============ COMPONENTE COMPACTO ============

export function SemaforoCompacto({ plan }: { plan: PlanParaSemaforo }) {
  const calcularSemaforoSimple = (): { color: ColorSemaforo; porcentaje: number } => {
    const totalAcciones = plan.acciones.length;
    const accionesCompletadas = plan.acciones.filter(a => a.estado === 'completada').length;
    const accionesVencidas = plan.acciones.filter(a => {
      return a.estado !== 'completada' && new Date(a.fechaFin) < new Date();
    }).length;

    const porcentaje = totalAcciones > 0 ? (accionesCompletadas / totalAcciones) * 100 : 0;

    let color: ColorSemaforo;
    if (accionesVencidas > 0) {
      color = 'rojo';
    } else if (porcentaje >= 80) {
      color = 'verde';
    } else if (porcentaje >= 50) {
      color = 'amarillo';
    } else {
      color = 'rojo';
    }

    return { color, porcentaje };
  };

  const { color, porcentaje } = calcularSemaforoSimple();
  const colorHex = color === 'verde' ? '#10B981' : color === 'amarillo' ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-3 h-3 rounded-full"
        style={{ background: colorHex }}
      />
      <span className="text-sm font-bold" style={{ color: colorHex }}>
        {porcentaje.toFixed(0)}%
      </span>
    </div>
  );
}
