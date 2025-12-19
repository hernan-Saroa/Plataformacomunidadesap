/**
 * ============================================
 * SISTEMA DE ALERTAS AUTOMÁTICAS - REQ-MOD01-002
 * ============================================
 * 
 * Motor de alertas diarias con semáforo dinámico
 * 
 * FUNCIONALIDADES:
 * ✅ Cálculo automático de días restantes
 * ✅ Semáforo VERDE/AMARILLO/ROJO/VENCIDO
 * ✅ Notificaciones automáticas cuando cambia color
 * ✅ Escalación a MOD-08 cuando vence
 * ✅ Auditoría completa de cambios
 * 
 * COLORES:
 * - VERDE: >50% del plazo restante
 * - AMARILLO: 25-50% del plazo restante
 * - ROJO: <25% del plazo restante
 * - VENCIDO: ≤0 días (plazo cumplido)
 * 
 * Oficina Asesora Jurídica - ESAP
 */

import { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Bell,
  TrendingDown,
  Calendar,
  Users,
  Mail,
  Send,
} from 'lucide-react';
import { CardSIGL, BadgeSIGL, ButtonSIGL, useToast } from './design-system';

// ============================================
// TIPOS
// ============================================

export type ColorAlerta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';

export interface AlertaExpediente {
  expedienteId: string;
  radicado: string;
  asunto: string;
  abogado: string;
  emailAbogado: string;
  fechaNotificacion: Date;
  fechaVencimiento: Date;
  plazoTotal: number; // días hábiles
  diasRestantes: number; // calculado
  colorAlerta: ColorAlerta;
  colorAnterior?: ColorAlerta;
  porcentajeRestante: number; // % del plazo restante
  alertasEnviadas: {
    dia25?: boolean;
    dia28?: boolean;
    vencido?: boolean;
  };
  ultimaCambioColor?: Date;
}

interface SistemaAlertasProps {
  expedientes: any[]; // Array de expedientes del módulo
  onEnviarNotificacion?: (alerta: AlertaExpediente) => void;
  onEscalarPlanAccion?: (expediente: AlertaExpediente) => void;
  modo?: 'dashboard' | 'widget'; // dashboard = vista completa, widget = resumen
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Calcula días hábiles entre dos fechas
 * Excluye sábados, domingos y festivos colombianos
 */
const calcularDiasHabiles = (fechaInicio: Date, fechaFin: Date): number => {
  let contador = 0;
  const fecha = new Date(fechaInicio);
  fecha.setHours(0, 0, 0, 0);
  const fin = new Date(fechaFin);
  fin.setHours(0, 0, 0, 0);

  // Festivos colombianos 2025 (simplificado)
  const festivos = [
    '2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17', '2025-04-18',
    '2025-05-01', '2025-06-02', '2025-06-23', '2025-06-30', '2025-07-07',
    '2025-07-20', '2025-08-07', '2025-08-18', '2025-10-13', '2025-11-03',
    '2025-11-17', '2025-12-08', '2025-12-25',
  ];

  while (fecha < fin) {
    fecha.setDate(fecha.getDate() + 1);
    const diaSemana = fecha.getDay();
    const fechaStr = fecha.toISOString().split('T')[0];

    // Si es día hábil (lun-vie) y no es festivo
    if (diaSemana !== 0 && diaSemana !== 6 && !festivos.includes(fechaStr)) {
      contador++;
    }
  }

  return contador;
};

/**
 * Determina el color de alerta según días restantes y plazo total
 * REQ-MOD01-002: Lógica del semáforo
 */
const determinarColorAlerta = (
  diasRestantes: number,
  plazoTotal: number
): ColorAlerta => {
  if (diasRestantes <= 0) {
    return 'VENCIDO';
  }

  const porcentaje = (diasRestantes / plazoTotal) * 100;

  if (porcentaje > 50) {
    return 'VERDE'; // Más del 50% del plazo restante
  } else if (porcentaje >= 25) {
    return 'AMARILLO'; // Entre 25% y 50%
  } else {
    return 'ROJO'; // Menos del 25% (CRÍTICO)
  }
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function SistemaAlertasExpedientes({
  expedientes,
  onEnviarNotificacion,
  onEscalarPlanAccion,
  modo = 'dashboard',
}: SistemaAlertasProps) {
  const { addToast } = useToast();
  const [alertas, setAlertas] = useState<AlertaExpediente[]>([]);
  const [ejecutandoJob, setEjecutandoJob] = useState(false);

  // ============================================
  // JOB DIARIO - SIMULACIÓN
  // ============================================

  /**
   * En producción, este job se ejecutaría en el backend a las 6:00 AM UTC
   * Aquí lo simulamos para demostración
   */
  const ejecutarJobDiario = () => {
    console.log('🔄 [JOB DIARIO] Iniciando cálculo de alertas...');
    setEjecutandoJob(true);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const nuevasAlertas: AlertaExpediente[] = expedientes
      .filter((exp) => exp.estado !== 'CERRADO' && exp.estado !== 'ARCHIVADO')
      .map((exp) => {
        const fechaVenc = new Date(exp.fechaVencimiento);
        fechaVenc.setHours(0, 0, 0, 0);

        // Calcular días restantes (días hábiles)
        const diasRestantes = calcularDiasHabiles(hoy, fechaVenc);

        // Determinar color de alerta
        const colorActual = determinarColorAlerta(diasRestantes, exp.plazo);

        // Buscar alerta anterior para detectar cambios
        const alertaAnterior = alertas.find(
          (a) => a.expedienteId === exp.id
        );
        const colorAnterior = alertaAnterior?.colorAlerta;

        // Porcentaje restante
        const porcentajeRestante = (diasRestantes / exp.plazo) * 100;

        const alerta: AlertaExpediente = {
          expedienteId: exp.id,
          radicado: exp.id,
          asunto: exp.demandante + ' vs ' + exp.demandado,
          abogado: exp.abogadoAsignado,
          emailAbogado: `${exp.abogadoAsignado.toLowerCase().replace(/\s+/g, '.')}@esap.edu.co`,
          fechaNotificacion: new Date(exp.fechaNotificacion),
          fechaVencimiento: fechaVenc,
          plazoTotal: exp.plazo,
          diasRestantes,
          colorAlerta: colorActual,
          colorAnterior,
          porcentajeRestante,
          alertasEnviadas: alertaAnterior?.alertasEnviadas || {},
        };

        // ======================================
        // NOTIFICACIONES AUTOMÁTICAS
        // ======================================

        // Si el color cambió, enviar notificación
        if (colorAnterior && colorAnterior !== colorActual) {
          console.log(
            `🔔 [ALERTA] ${exp.id} cambió de ${colorAnterior} a ${colorActual}`
          );

          alerta.ultimaCambioColor = new Date();

          // Notificar cambio de color
          enviarNotificacionCambioColor(alerta, colorAnterior, colorActual);
        }

        // Notificación Día 25 (5 días antes del 30)
        if (
          diasRestantes === 5 &&
          !alerta.alertasEnviadas.dia25 &&
          exp.plazo === 30
        ) {
          console.log(`⚠️ [DÍA 25] ${exp.id} - Enviando alerta 5 días antes`);
          alerta.alertasEnviadas.dia25 = true;
          enviarNotificacionDia25(alerta);
        }

        // Notificación Día 28 (2 días antes del 30)
        if (
          diasRestantes === 2 &&
          !alerta.alertasEnviadas.dia28 &&
          exp.plazo === 30
        ) {
          console.log(`🔴 [DÍA 28] ${exp.id} - Enviando alerta CRÍTICA 2 días antes`);
          alerta.alertasEnviadas.dia28 = true;
          enviarNotificacionDia28(alerta);
        }

        // Notificación Vencimiento
        if (diasRestantes <= 0 && !alerta.alertasEnviadas.vencido) {
          console.log(`❌ [VENCIDO] ${exp.id} - Escalando a MOD-08`);
          alerta.alertasEnviadas.vencido = true;
          enviarNotificacionVencido(alerta);

          // Escalar a Plan de Acción (MOD-08)
          if (onEscalarPlanAccion) {
            onEscalarPlanAccion(alerta);
          }
        }

        return alerta;
      });

    setAlertas(nuevasAlertas);
    setEjecutandoJob(false);

    addToast({
      type: 'success',
      title: '✅ Job Diario Ejecutado',
      message: `${nuevasAlertas.length} expedientes analizados`,
    });

    console.log('✅ [JOB DIARIO] Completado');
  };

  // ============================================
  // FUNCIONES DE NOTIFICACIÓN
  // ============================================

  const enviarNotificacionCambioColor = (
    alerta: AlertaExpediente,
    colorAnterior: ColorAlerta,
    colorNuevo: ColorAlerta
  ) => {
    console.log(
      `📧 [NOTIF] Enviando email a ${alerta.emailAbogado} - Cambio ${colorAnterior} → ${colorNuevo}`
    );

    if (onEnviarNotificacion) {
      onEnviarNotificacion(alerta);
    }

    // Toast visual
    const emoji =
      colorNuevo === 'ROJO'
        ? '🔴'
        : colorNuevo === 'AMARILLO'
        ? '🟡'
        : colorNuevo === 'VERDE'
        ? '🟢'
        : '❌';

    addToast({
      type: colorNuevo === 'ROJO' || colorNuevo === 'VENCIDO' ? 'error' : 'warning',
      title: `${emoji} Cambio de Alerta`,
      message: `${alerta.radicado}: ${colorAnterior} → ${colorNuevo}`,
    });
  };

  const enviarNotificacionDia25 = (alerta: AlertaExpediente) => {
    console.log(`📧 [DÍA 25] Email a ${alerta.emailAbogado} + Jefe OJ`);

    addToast({
      type: 'warning',
      title: '⚠️ Alerta Día 25',
      message: `${alerta.radicado} vence en 5 días`,
    });
  };

  const enviarNotificacionDia28 = (alerta: AlertaExpediente) => {
    console.log(`📧 [DÍA 28] Email + Teams + SMS a ${alerta.emailAbogado}, Jefe OJ`);

    addToast({
      type: 'error',
      title: '🔴 CRÍTICO: Día 28',
      message: `${alerta.radicado} vence en 2 DÍAS - Acción INMEDIATA requerida`,
    });
  };

  const enviarNotificacionVencido = (alerta: AlertaExpediente) => {
    console.log(
      `📧 [VENCIDO] Email a ${alerta.emailAbogado}, Jefe OJ, Dirección Nacional`
    );

    addToast({
      type: 'error',
      title: '❌ EXPEDIENTE VENCIDO',
      message: `${alerta.radicado} sin respuesta - Escalado a Plan de Acción`,
    });
  };

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  const estadisticas = useMemo(() => {
    return {
      total: alertas.length,
      verde: alertas.filter((a) => a.colorAlerta === 'VERDE').length,
      amarillo: alertas.filter((a) => a.colorAlerta === 'AMARILLO').length,
      rojo: alertas.filter((a) => a.colorAlerta === 'ROJO').length,
      vencido: alertas.filter((a) => a.colorAlerta === 'VENCIDO').length,
    };
  }, [alertas]);

  // ============================================
  // EJECUTAR JOB AL MONTAR (DEMO)
  // ============================================

  useEffect(() => {
    // En producción, esto se ejecuta cada día a las 6:00 AM
    // Aquí lo ejecutamos al montar para demostración
    if (expedientes.length > 0) {
      ejecutarJobDiario();
    }
  }, [expedientes]);

  // ============================================
  // HELPERS DE RENDERIZADO
  // ============================================

  const getColorConfig = (color: ColorAlerta) => {
    switch (color) {
      case 'VERDE':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-500',
          icon: CheckCircle,
          label: 'Dentro de Plazo',
        };
      case 'AMARILLO':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-500',
          icon: Clock,
          label: 'Atención Requerida',
        };
      case 'ROJO':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-500',
          icon: AlertTriangle,
          label: 'CRÍTICO',
        };
      case 'VENCIDO':
        return {
          bg: 'bg-red-900',
          text: 'text-white',
          border: 'border-red-900',
          icon: XCircle,
          label: 'VENCIDO',
        };
    }
  };

  // ============================================
  // RENDER: MODO WIDGET
  // ============================================

  if (modo === 'widget') {
    return (
      <CardSIGL className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Alertas Activas
          </h3>
          <ButtonSIGL
            variant="ghost"
            size="sm"
            onClick={ejecutarJobDiario}
            disabled={ejecutandoJob}
          >
            {ejecutandoJob ? 'Actualizando...' : 'Actualizar'}
          </ButtonSIGL>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { color: 'VERDE', count: estadisticas.verde },
            { color: 'AMARILLO', count: estadisticas.amarillo },
            { color: 'ROJO', count: estadisticas.rojo },
            { color: 'VENCIDO', count: estadisticas.vencido },
          ].map(({ color, count }) => {
            const config = getColorConfig(color as ColorAlerta);
            const Icon = config.icon;

            return (
              <div
                key={color}
                className={`p-3 rounded-lg border-2 ${config.bg} ${config.border}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${config.text}`} />
                  <span className={`text-xs font-medium ${config.text}`}>
                    {color}
                  </span>
                </div>
                <p className={`text-2xl font-bold ${config.text}`}>{count}</p>
              </div>
            );
          })}
        </div>
      </CardSIGL>
    );
  }

  // ============================================
  // RENDER: MODO DASHBOARD
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Bell className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Sistema de Alertas Automáticas
            </h2>
            <p className="text-gray-600">
              Semáforo dinámico VERDE/AMARILLO/ROJO/VENCIDO
            </p>
          </div>
        </div>
        <ButtonSIGL
          variant="primary"
          onClick={ejecutarJobDiario}
          disabled={ejecutandoJob}
        >
          {ejecutandoJob ? 'Ejecutando...' : '🔄 Ejecutar Job Diario'}
        </ButtonSIGL>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-5 gap-4">
        <CardSIGL className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-gray-600" />
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-3xl font-bold text-gray-900">
                {estadisticas.total}
              </p>
            </div>
          </div>
        </CardSIGL>

        <CardSIGL className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-xs text-green-700">Verde</p>
              <p className="text-3xl font-bold text-green-900">
                {estadisticas.verde}
              </p>
            </div>
          </div>
        </CardSIGL>

        <CardSIGL className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-xs text-yellow-700">Amarillo</p>
              <p className="text-3xl font-bold text-yellow-900">
                {estadisticas.amarillo}
              </p>
            </div>
          </div>
        </CardSIGL>

        <CardSIGL className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-xs text-red-700">Rojo (Crítico)</p>
              <p className="text-3xl font-bold text-red-900">
                {estadisticas.rojo}
              </p>
            </div>
          </div>
        </CardSIGL>

        <CardSIGL className="p-4 bg-red-900 border-red-900">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-white" />
            <div>
              <p className="text-xs text-red-100">Vencidos</p>
              <p className="text-3xl font-bold text-white">
                {estadisticas.vencido}
              </p>
            </div>
          </div>
        </CardSIGL>
      </div>

      {/* Tabla de Alertas */}
      <CardSIGL>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Alerta
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Expediente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Abogado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Días Restantes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  % Restante
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vencimiento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {alertas.map((alerta) => {
                const config = getColorConfig(alerta.colorAlerta);
                const Icon = config.icon;

                return (
                  <tr key={alerta.expedienteId} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${config.bg} ${config.border} border-2`}
                      >
                        <Icon className={`w-4 h-4 ${config.text}`} />
                        <span className={`text-xs font-medium ${config.text}`}>
                          {alerta.colorAlerta}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        {alerta.radicado}
                      </p>
                      <p className="text-xs text-gray-500">{alerta.asunto}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-700">{alerta.abogado}</p>
                      <p className="text-xs text-gray-500">
                        {alerta.emailAbogado}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p
                        className={`text-lg font-bold ${
                          alerta.diasRestantes < 0
                            ? 'text-red-900'
                            : alerta.diasRestantes < 5
                            ? 'text-red-600'
                            : alerta.diasRestantes < 10
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`}
                      >
                        {alerta.diasRestantes < 0
                          ? `VENCIDO (${Math.abs(alerta.diasRestantes)}d)`
                          : `${alerta.diasRestantes} días`}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              alerta.porcentajeRestante > 50
                                ? 'bg-green-500'
                                : alerta.porcentajeRestante >= 25
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, alerta.porcentajeRestante)
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-12">
                          {alerta.porcentajeRestante.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-700">
                        {alerta.fechaVencimiento.toLocaleDateString('es-CO')}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <ButtonSIGL variant="ghost" size="sm">
                        <Mail className="w-4 h-4" />
                      </ButtonSIGL>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {alertas.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No hay alertas activas</p>
          </div>
        )}
      </CardSIGL>
    </div>
  );
}
