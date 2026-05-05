/**
 * SISTEMA AUTOMÁTICO DE RECORDATORIOS
 * Componente crítico que gestiona recordatorios automáticos
 * Casos de Uso: 3 y 5 (Seguimiento Trimestral + Informes de Ley)
 * 
 * Funcionalidades:
 * - Recordatorios automáticos 7 días antes (configurable)
 * - Notificaciones en el sistema
 * - Emails automáticos
 * - Escalamiento si no se atiende
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, Calendar, Mail, AlertTriangle, Clock, User,
  Send, CheckCircle, XCircle, TrendingUp, Eye, Archive
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';
import { InformeLeyNormativo, calcularProximaFechaGeneracion } from './CatalogoInformesLey';

// ============ TIPOS ============

export type TipoRecordatorio = 'informe-ley' | 'seguimiento-trimestral' | 'plan-mejoramiento' | 'auditoria';
export type PrioridadRecordatorio = 'baja' | 'media' | 'alta' | 'critica';
export type EstadoRecordatorio = 'pendiente' | 'notificado' | 'visto' | 'completado' | 'vencido' | 'cancelado';

export interface Recordatorio {
  id: string;
  tipo: TipoRecordatorio;
  titulo: string;
  descripcion: string;
  destinatario: string; // Usuario responsable
  destinatarioEmail: string;
  fechaLimite: string; // Fecha límite de la tarea
  fechaRecordatorio: string; // Fecha en que se debe enviar el recordatorio
  diasAnticipacion: number;
  prioridad: PrioridadRecordatorio;
  estado: EstadoRecordatorio;
  referencia: string; // ID del informe, plan, auditoría, etc.
  accion: string; // Acción esperada (ej: "Generar Informe")
  urlAccion: string; // URL donde realizar la acción
  notificacionEnviada: boolean;
  emailEnviado: boolean;
  fechaNotificacion: string | null;
  fechaVisualizacion: string | null;
  observaciones: string;
  requiereEscalamiento: boolean;
  escaladoA: string | null; // Si se escaló, a quién
}

interface SistemaRecordatoriosProps {
  recordatoriosActivos: Recordatorio[];
  onRecordatorioCreado?: (recordatorio: Recordatorio) => void;
  onRecordatorioCompletado?: (recordatorioId: string) => void;
}

// ============ FUNCIONES DE GENERACIÓN DE RECORDATORIOS ============

/**
 * Genera recordatorios automáticos para informes de ley
 */
export function generarRecordatorioInformeLey(informe: InformeLeyNormativo): Recordatorio {
  const fechaLimite = calcularProximaFechaGeneracion(informe);
  const fechaRecordatorio = new Date(fechaLimite);
  fechaRecordatorio.setDate(fechaRecordatorio.getDate() - informe.diasAnticipacion);

  // Determinar prioridad según días de anticipación
  let prioridad: PrioridadRecordatorio;
  if (informe.diasAnticipacion <= 3) {
    prioridad = 'critica';
  } else if (informe.diasAnticipacion <= 7) {
    prioridad = 'alta';
  } else if (informe.diasAnticipacion <= 15) {
    prioridad = 'media';
  } else {
    prioridad = 'baja';
  }

  return {
    id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tipo: 'informe-ley',
    titulo: `Informe de Ley Pendiente: ${informe.nombreCorto}`,
    descripcion: `Debe generar el informe "${informe.nombre}" antes del ${fechaLimite.toLocaleDateString('es-CO')}`,
    destinatario: informe.responsableRol,
    destinatarioEmail: `${informe.responsableRol.toLowerCase().replace(/\s/g, '.')}@esap.edu.co`,
    fechaLimite: fechaLimite.toISOString(),
    fechaRecordatorio: fechaRecordatorio.toISOString(),
    diasAnticipacion: informe.diasAnticipacion,
    prioridad,
    estado: 'pendiente',
    referencia: informe.codigo,
    accion: 'Generar Informe',
    urlAccion: `/control-interno/informes-documental-completo?generar=${informe.codigo}`,
    notificacionEnviada: false,
    emailEnviado: false,
    fechaNotificacion: null,
    fechaVisualizacion: null,
    observaciones: `Base normativa: ${informe.baseNormativa}`,
    requiereEscalamiento: prioridad === 'critica',
    escaladoA: prioridad === 'critica' ? 'Jefe OCI' : null
  };
}

/**
 * Genera recordatorios para seguimiento trimestral de planes
 */
export function generarRecordatorioSeguimientoTrimestral(
  planCodigo: string,
  planTitulo: string,
  responsable: string,
  fechaSeguimiento: Date
): Recordatorio {
  const fechaRecordatorio = new Date(fechaSeguimiento);
  fechaRecordatorio.setDate(fechaRecordatorio.getDate() - 7); // 7 días antes

  const diasRestantes = Math.ceil((fechaSeguimiento.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return {
    id: `rec-seg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tipo: 'seguimiento-trimestral',
    titulo: `Seguimiento Trimestral - ${planCodigo}`,
    descripcion: `El seguimiento trimestral de su plan de mejoramiento vence en ${diasRestantes} días (${fechaSeguimiento.toLocaleDateString('es-CO')})`,
    destinatario: responsable,
    destinatarioEmail: `${responsable.toLowerCase().replace(/\s/g, '.')}@esap.edu.co`,
    fechaLimite: fechaSeguimiento.toISOString(),
    fechaRecordatorio: fechaRecordatorio.toISOString(),
    diasAnticipacion: 7,
    prioridad: diasRestantes <= 3 ? 'alta' : 'media',
    estado: 'pendiente',
    referencia: planCodigo,
    accion: 'Cargar Evidencias',
    urlAccion: `/control-interno/hallazgos-mejoramiento-completo?plan=${planCodigo}`,
    notificacionEnviada: false,
    emailEnviado: false,
    fechaNotificacion: null,
    fechaVisualizacion: null,
    observaciones: planTitulo,
    requiereEscalamiento: diasRestantes <= 2,
    escaladoA: diasRestantes <= 2 ? 'Jefe OCI' : null
  };
}

// ============ COMPONENTE PRINCIPAL ============

export function SistemaRecordatorios({
  recordatoriosActivos,
  onRecordatorioCreado,
  onRecordatorioCompletado
}: SistemaRecordatoriosProps) {
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>(recordatoriosActivos);
  const [filtro, setFiltro] = useState<EstadoRecordatorio | 'todos'>('todos');
  const [mostrarDetalle, setMostrarDetalle] = useState<Recordatorio | null>(null);

  // ============ EFECTOS - VERIFICACIÓN AUTOMÁTICA ============

  useEffect(() => {
    // Simular servicio que se ejecuta diariamente
    const verificarRecordatorios = () => {
      const hoy = new Date();

      recordatorios.forEach(recordatorio => {
        if (recordatorio.estado === 'pendiente') {
          const fechaRecordatorio = new Date(recordatorio.fechaRecordatorio);

          // Si llegó la fecha del recordatorio
          if (fechaRecordatorio <= hoy && !recordatorio.notificacionEnviada) {
            enviarRecordatorio(recordatorio);
          }

          // Verificar si ya venció
          const fechaLimite = new Date(recordatorio.fechaLimite);
          if (fechaLimite < hoy) {
            marcarComoVencido(recordatorio.id);
          }
        }
      });
    };

    // Ejecutar verificación cada minuto (en producción sería diario con cron)
    const interval = setInterval(verificarRecordatorios, 60000);

    return () => clearInterval(interval);
  }, [recordatorios]);

  // ============ FUNCIONES ============

  const enviarRecordatorio = (recordatorio: Recordatorio) => {
    // Crear notificación en el sistema
    crearNotificacion(recordatorio);

    // Enviar email
    enviarEmail(recordatorio);

    // Actualizar estado
    const recordatoriosActualizados = recordatorios.map(r => {
      if (r.id === recordatorio.id) {
        return {
          ...r,
          estado: 'notificado' as EstadoRecordatorio,
          notificacionEnviada: true,
          emailEnviado: true,
          fechaNotificacion: new Date().toISOString()
        };
      }
      return r;
    });

    setRecordatorios(recordatoriosActualizados);

    toast.success(`Recordatorio enviado a ${recordatorio.destinatario}`);
  };

  const crearNotificacion = (recordatorio: Recordatorio) => {
    // En producción, esto crearía una notificación real en el sistema
    console.log('Creando notificación:', {
      tipo: recordatorio.prioridad,
      titulo: recordatorio.titulo,
      mensaje: recordatorio.descripcion,
      destinatario: recordatorio.destinatario,
      enlace: recordatorio.urlAccion,
      prioridad: recordatorio.prioridad
    });
  };

  const enviarEmail = (recordatorio: Recordatorio) => {
    // En producción, esto enviaría un email real
    const emailHTML = generarEmailRecordatorio(recordatorio);
    
    console.log('Enviando email:', {
      para: recordatorio.destinatarioEmail,
      asunto: `[RECORDATORIO] ${recordatorio.titulo}`,
      cuerpo: emailHTML,
      prioridad: recordatorio.prioridad
    });
  };

  const generarEmailRecordatorio = (recordatorio: Recordatorio): string => {
    const diasRestantes = Math.ceil(
      (new Date(recordatorio.fechaLimite).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003DA5; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">ESAP - Oficina de Control Interno</h1>
        </div>
        
        <div style="padding: 20px; background: #f5f5f5;">
          <h2 style="color: #003DA5;">Recordatorio Automático</h2>
          
          <div style="background: white; padding: 15px; border-left: 4px solid ${getPrioridadColor(recordatorio.prioridad)}; margin: 10px 0;">
            <h3 style="margin-top: 0; color: ${getPrioridadColor(recordatorio.prioridad)};">
              ${recordatorio.titulo}
            </h3>
            <p>${recordatorio.descripcion}</p>
          </div>
          
          <table style="width: 100%; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; background: white;"><strong>Acción requerida:</strong></td>
              <td style="padding: 10px; background: white;">${recordatorio.accion}</td>
            </tr>
            <tr>
              <td style="padding: 10px; background: #f9f9f9;"><strong>Fecha límite:</strong></td>
              <td style="padding: 10px; background: #f9f9f9;">${new Date(recordatorio.fechaLimite).toLocaleDateString('es-CO')}</td>
            </tr>
            <tr>
              <td style="padding: 10px; background: white;"><strong>Días restantes:</strong></td>
              <td style="padding: 10px; background: white; color: ${diasRestantes <= 3 ? 'red' : 'green'}; font-weight: bold;">${diasRestantes} días</td>
            </tr>
            <tr>
              <td style="padding: 10px; background: #f9f9f9;"><strong>Prioridad:</strong></td>
              <td style="padding: 10px; background: #f9f9f9;">
                <span style="background: ${getPrioridadColor(recordatorio.prioridad)}; color: white; padding: 3px 10px; border-radius: 3px;">
                  ${recordatorio.prioridad.toUpperCase()}
                </span>
              </td>
            </tr>
          </table>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${recordatorio.urlAccion}" style="background: #003DA5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              ${recordatorio.accion}
            </a>
          </div>
          
          ${recordatorio.observaciones ? `
            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin: 20px 0;">
              <strong>Observaciones:</strong><br/>
              ${recordatorio.observaciones}
            </div>
          ` : ''}
        </div>
        
        <div style="background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">Este es un correo automático generado por el Sistema de Control Interno de ESAP</p>
          <p style="margin: 5px 0 0 0;">Por favor no responda a este correo</p>
        </div>
      </div>
    `;
  };

  const marcarComoVisto = (recordatorioId: string) => {
    const recordatoriosActualizados = recordatorios.map(r => {
      if (r.id === recordatorioId && r.estado === 'notificado') {
        return {
          ...r,
          estado: 'visto' as EstadoRecordatorio,
          fechaVisualizacion: new Date().toISOString()
        };
      }
      return r;
    });

    setRecordatorios(recordatoriosActualizados);
  };

  const marcarComoCompletado = (recordatorioId: string) => {
    const recordatoriosActualizados = recordatorios.map(r => {
      if (r.id === recordatorioId) {
        return {
          ...r,
          estado: 'completado' as EstadoRecordatorio
        };
      }
      return r;
    });

    setRecordatorios(recordatoriosActualizados);

    if (onRecordatorioCompletado) {
      onRecordatorioCompletado(recordatorioId);
    }

    toast.success('Recordatorio marcado como completado');
  };

  const marcarComoVencido = (recordatorioId: string) => {
    const recordatoriosActualizados = recordatorios.map(r => {
      if (r.id === recordatorioId) {
        return {
          ...r,
          estado: 'vencido' as EstadoRecordatorio
        };
      }
      return r;
    });

    setRecordatorios(recordatoriosActualizados);
  };

  // ============ FUNCIONES AUXILIARES ============

  const getPrioridadColor = (prioridad: PrioridadRecordatorio): string => {
    switch (prioridad) {
      case 'critica': return '#DC2626';
      case 'alta': return '#F59E0B';
      case 'media': return '#3B82F6';
      case 'baja': return '#6B7280';
    }
  };

  const getEstadoColor = (estado: EstadoRecordatorio): string => {
    switch (estado) {
      case 'pendiente': return '#6B7280';
      case 'notificado': return '#3B82F6';
      case 'visto': return '#F59E0B';
      case 'completado': return '#10B981';
      case 'vencido': return '#DC2626';
      case 'cancelado': return '#9CA3AF';
    }
  };

  const recordatoriosFiltrados = filtro === 'todos'
    ? recordatorios
    : recordatorios.filter(r => r.estado === filtro);

  const estadisticas = {
    total: recordatorios.length,
    pendientes: recordatorios.filter(r => r.estado === 'pendiente').length,
    notificados: recordatorios.filter(r => r.estado === 'notificado').length,
    vencidos: recordatorios.filter(r => r.estado === 'vencido').length,
    completados: recordatorios.filter(r => r.estado === 'completado').length
  };

  // ============ RENDER ============

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-lg text-gray-800">Sistema de Recordatorios Automáticos</h3>
            <p className="text-xs text-gray-600 mt-1">
              Gestión centralizada de notificaciones y alertas
            </p>
          </div>
          <Bell className="w-8 h-8 text-blue-600" />
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-5 gap-3">
          <div className="p-3 bg-gray-50 rounded text-center cursor-pointer hover:bg-gray-100" onClick={() => setFiltro('todos')}>
            <p className="text-xs text-gray-600">Total</p>
            <p className="text-2xl font-black text-gray-800">{estadisticas.total}</p>
          </div>
          <div className="p-3 bg-gray-100 rounded text-center cursor-pointer hover:bg-gray-200" onClick={() => setFiltro('pendiente')}>
            <p className="text-xs text-gray-600">Pendientes</p>
            <p className="text-2xl font-black text-gray-600">{estadisticas.pendientes}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded text-center cursor-pointer hover:bg-blue-100" onClick={() => setFiltro('notificado')}>
            <p className="text-xs text-gray-600">Notificados</p>
            <p className="text-2xl font-black text-blue-600">{estadisticas.notificados}</p>
          </div>
          <div className="p-3 bg-red-50 rounded text-center cursor-pointer hover:bg-red-100" onClick={() => setFiltro('vencido')}>
            <p className="text-xs text-gray-600">Vencidos</p>
            <p className="text-2xl font-black text-red-600">{estadisticas.vencidos}</p>
          </div>
          <div className="p-3 bg-green-50 rounded text-center cursor-pointer hover:bg-green-100" onClick={() => setFiltro('completado')}>
            <p className="text-xs text-gray-600">Completados</p>
            <p className="text-2xl font-black text-green-600">{estadisticas.completados}</p>
          </div>
        </div>
      </Card>

      {/* Lista de recordatorios */}
      <div className="space-y-2">
        {recordatoriosFiltrados.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No hay recordatorios {filtro !== 'todos' ? filtro + 's' : ''}</p>
          </Card>
        ) : (
          recordatoriosFiltrados.map(recordatorio => {
            const diasRestantes = Math.ceil(
              (new Date(recordatorio.fechaLimite).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <motion.div
                key={recordatorio.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    {/* Información */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge style={{ background: getPrioridadColor(recordatorio.prioridad), color: 'white' }}>
                          {recordatorio.prioridad.toUpperCase()}
                        </Badge>
                        <Badge style={{ background: getEstadoColor(recordatorio.estado), color: 'white' }}>
                          {recordatorio.estado}
                        </Badge>
                        {diasRestantes <= 3 && recordatorio.estado !== 'completado' && (
                          <Badge style={{ background: '#DC2626', color: 'white' }}>
                            ⚠️ Vence en {diasRestantes} día(s)
                          </Badge>
                        )}
                      </div>

                      <h4 className="font-black text-gray-800 mb-1">{recordatorio.titulo}</h4>
                      <p className="text-sm text-gray-600 mb-2">{recordatorio.descripcion}</p>

                      <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{recordatorio.destinatario}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Vence: {new Date(recordatorio.fechaLimite).toLocaleDateString('es-CO')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{diasRestantes} días restantes</span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-1 ml-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setMostrarDetalle(recordatorio)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>

                      {recordatorio.estado !== 'completado' && recordatorio.estado !== 'cancelado' && (
                        <Button
                          size="sm"
                          style={{ background: '#10B981' }}
                          onClick={() => marcarComoCompletado(recordatorio.id)}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
