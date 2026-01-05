/**
 * 📊 HISTORIAL DE ALERTAS - SISTEMA SIGL
 * 
 * Registro completo y auditable de todas las alertas enviadas
 * - Timeline visual de alertas
 * - Filtros avanzados multidimensionales
 * - Búsqueda en tiempo real
 * - Exportación a Excel/PDF
 * - Vista de detalle con trazabilidad
 * - Estadísticas y métricas
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, Search, Filter, Download, Eye, Mail, MessageSquare,
  Smartphone, Bell, CheckCircle, XCircle, AlertCircle, Clock3,
  Calendar, User, FileText, Tag, BarChart3, TrendingUp, RefreshCw,
  ChevronDown, ChevronRight, ExternalLink, Archive, Trash2,
  Check, X, AlertTriangle, Info
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '../../../utils/clipboard';

type CanalNotificacion = 'EMAIL' | 'TEAMS' | 'SMS' | 'IN_APP';
type NivelAlerta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';
type EstadoEnvio = 'ENVIADA' | 'LEIDA' | 'FALLIDA' | 'PENDIENTE';

interface AlertaHistorial {
  id: string;
  fecha: Date;
  modulo: string;
  expediente: string;
  responsable: string;
  nivel: NivelAlerta;
  canal: CanalNotificacion;
  estado: EstadoEnvio;
  asunto?: string;
  mensaje: string;
  destinatarios: string[];
  diasRestantes: number;
  fechaVencimiento: Date;
  fechaLectura?: Date;
  errorMensaje?: string;
  metadata: {
    ip?: string;
    dispositivo?: string;
    navegador?: string;
  };
}

// Datos de ejemplo realistas
const ALERTAS_EJEMPLO: AlertaHistorial[] = [
  {
    id: 'ALT-2024-001',
    fecha: new Date('2024-12-20T09:15:00'),
    modulo: 'Defensa Judicial',
    expediente: '2024-001234',
    responsable: 'Juan Pérez García',
    nivel: 'ROJO',
    canal: 'EMAIL',
    estado: 'LEIDA',
    asunto: '🔥 Defensa Judicial - URGENTE: Quedan 3 días',
    mensaje: 'El proceso de Defensa Judicial con radicado 2024-001234 está próximo a vencerse...',
    destinatarios: ['juan.perez@esap.gov.co', 'jefe.juridica@esap.gov.co'],
    diasRestantes: 3,
    fechaVencimiento: new Date('2024-12-23'),
    fechaLectura: new Date('2024-12-20T10:30:00'),
    metadata: {
      ip: '192.168.1.100',
      dispositivo: 'Windows 11',
      navegador: 'Chrome 120'
    }
  },
  {
    id: 'ALT-2024-002',
    fecha: new Date('2024-12-20T09:15:00'),
    modulo: 'Defensa Judicial',
    expediente: '2024-001234',
    responsable: 'Juan Pérez García',
    nivel: 'ROJO',
    canal: 'TEAMS',
    estado: 'LEIDA',
    mensaje: '🔥 ALERTA ROJA - Defensa Judicial\n\n📋 Expediente: 2024-001234\n👤 Responsable: Juan Pérez García\n📅 Quedan: 3 días',
    destinatarios: ['juan.perez@esap.gov.co'],
    diasRestantes: 3,
    fechaVencimiento: new Date('2024-12-23'),
    fechaLectura: new Date('2024-12-20T09:45:00'),
    metadata: {}
  },
  {
    id: 'ALT-2024-003',
    fecha: new Date('2024-12-20T08:00:00'),
    modulo: 'Órganos de Control',
    expediente: '2024-OC-456',
    responsable: 'María López Sánchez',
    nivel: 'AMARILLO',
    canal: 'EMAIL',
    estado: 'ENVIADA',
    asunto: '⚠ Órganos de Control - PRECAUCIÓN: Quedan 8 días',
    mensaje: 'El proceso de Órganos de Control con radicado 2024-OC-456 requiere su atención...',
    destinatarios: ['maria.lopez@esap.gov.co', 'director.juridica@esap.gov.co'],
    diasRestantes: 8,
    fechaVencimiento: new Date('2024-12-28'),
    metadata: {}
  },
  {
    id: 'ALT-2024-004',
    fecha: new Date('2024-12-19T16:30:00'),
    modulo: 'Procesos Coactivos',
    expediente: '2024-PC-789',
    responsable: 'Carlos Rodríguez',
    nivel: 'VENCIDO',
    canal: 'SMS',
    estado: 'FALLIDA',
    mensaje: 'VENCIDO Procesos Coactivos: Exp 2024-PC-789 venció 19/12/2024. Contacte supervisor. SIGL-ESAP',
    destinatarios: ['+57 310 123 4567'],
    diasRestantes: -1,
    fechaVencimiento: new Date('2024-12-19'),
    errorMensaje: 'Número de teléfono no disponible',
    metadata: {}
  },
  {
    id: 'ALT-2024-005',
    fecha: new Date('2024-12-19T14:00:00'),
    modulo: 'Juzgamiento Disciplinario',
    expediente: '2024-JD-321',
    responsable: 'Ana Martínez',
    nivel: 'ROJO',
    canal: 'IN_APP',
    estado: 'LEIDA',
    mensaje: 'URGENTE: El proceso 2024-JD-321 de Juzgamiento Disciplinario vence en 2 días. Requiere acción inmediata.',
    destinatarios: ['Ana Martínez'],
    diasRestantes: 2,
    fechaVencimiento: new Date('2024-12-21'),
    fechaLectura: new Date('2024-12-19T14:15:00'),
    metadata: {}
  },
  {
    id: 'ALT-2024-006',
    fecha: new Date('2024-12-19T10:00:00'),
    modulo: 'Asesoría Jurídica',
    expediente: '2024-AJ-555',
    responsable: 'Pedro Gómez',
    nivel: 'VERDE',
    canal: 'EMAIL',
    estado: 'LEIDA',
    asunto: '✓ Asesoría Jurídica - Término dentro del plazo (18 días)',
    mensaje: 'Le informamos que el proceso de Asesoría Jurídica con radicado 2024-AJ-555 se encuentra en estado VERDE...',
    destinatarios: ['pedro.gomez@esap.gov.co'],
    diasRestantes: 18,
    fechaVencimiento: new Date('2025-01-06'),
    fechaLectura: new Date('2024-12-19T11:20:00'),
    metadata: {}
  },
  {
    id: 'ALT-2024-007',
    fecha: new Date('2024-12-18T15:30:00'),
    modulo: 'Defensa Judicial',
    expediente: '2024-001234',
    responsable: 'Juan Pérez García',
    nivel: 'AMARILLO',
    canal: 'TEAMS',
    estado: 'LEIDA',
    mensaje: '⚠ ALERTA AMARILLA - Defensa Judicial\n\n📋 Expediente: 2024-001234\n👤 Responsable: Juan Pérez García\n📅 Quedan: 5 días',
    destinatarios: ['juan.perez@esap.gov.co'],
    diasRestantes: 5,
    fechaVencimiento: new Date('2024-12-23'),
    fechaLectura: new Date('2024-12-18T16:00:00'),
    metadata: {}
  },
  {
    id: 'ALT-2024-008',
    fecha: new Date('2024-12-18T09:00:00'),
    modulo: 'Riesgos',
    expediente: '2024-RG-888',
    responsable: 'Laura Fernández',
    nivel: 'ROJO',
    canal: 'EMAIL',
    estado: 'ENVIADA',
    asunto: '🔥 Riesgos - URGENTE: Quedan 4 días',
    mensaje: 'El proceso de Riesgos con radicado 2024-RG-888 está próximo a vencerse...',
    destinatarios: ['laura.fernandez@esap.gov.co', 'comite.riesgos@esap.gov.co'],
    diasRestantes: 4,
    fechaVencimiento: new Date('2024-12-22'),
    metadata: {}
  },
  {
    id: 'ALT-2024-009',
    fecha: new Date('2024-12-17T12:00:00'),
    modulo: 'Plan de Acción',
    expediente: '2024-PA-999',
    responsable: 'Roberto Silva',
    nivel: 'VERDE',
    canal: 'IN_APP',
    estado: 'PENDIENTE',
    mensaje: 'Recordatorio: El proceso 2024-PA-999 de Plan de Acción vence en 25 días.',
    destinatarios: ['Roberto Silva'],
    diasRestantes: 25,
    fechaVencimiento: new Date('2025-01-11'),
    metadata: {}
  },
  {
    id: 'ALT-2024-010',
    fecha: new Date('2024-12-17T08:30:00'),
    modulo: 'Buzón de Notificaciones',
    expediente: '2024-BN-111',
    responsable: 'Sofía Ramírez',
    nivel: 'ROJO',
    canal: 'EMAIL',
    estado: 'LEIDA',
    asunto: '🔥 Buzón de Notificaciones - URGENTE: Quedan 1 días',
    mensaje: 'El proceso de Buzón de Notificaciones con radicado 2024-BN-111 está próximo a vencerse...',
    destinatarios: ['sofia.ramirez@esap.gov.co'],
    diasRestantes: 1,
    fechaVencimiento: new Date('2024-12-18'),
    fechaLectura: new Date('2024-12-17T09:15:00'),
    metadata: {}
  },
];

const ICONOS_CANAL = {
  EMAIL: Mail,
  TEAMS: MessageSquare,
  SMS: Smartphone,
  IN_APP: Bell,
};

const COLORES_NIVEL = {
  VERDE: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', solid: '#10B981' },
  AMARILLO: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', solid: '#EAB308' },
  ROJO: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', solid: '#EF4444' },
  VENCIDO: { bg: 'bg-gray-900', text: 'text-white', border: 'border-gray-700', solid: '#1F2937' },
};

const ICONOS_ESTADO = {
  ENVIADA: { icono: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
  LEIDA: { icono: Check, color: 'text-green-600', bg: 'bg-green-100' },
  FALLIDA: { icono: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  PENDIENTE: { icono: Clock3, color: 'text-yellow-600', bg: 'bg-yellow-100' },
};

export function HistorialAlertas() {
  const [alertas] = useState<AlertaHistorial[]>(ALERTAS_EJEMPLO);
  const [alertaSeleccionada, setAlertaSeleccionada] = useState<AlertaHistorial | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroModulo, setFiltroModulo] = useState<string>('TODOS');
  const [filtroCanal, setFiltroCanal] = useState<CanalNotificacion | 'TODOS'>('TODOS');
  const [filtroNivel, setFiltroNivel] = useState<NivelAlerta | 'TODOS'>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<EstadoEnvio | 'TODOS'>('TODOS');
  const [rangoFecha, setRangoFecha] = useState<'HOY' | 'SEMANA' | 'MES' | 'TODOS'>('TODOS');
  const [ordenPor, setOrdenPor] = useState<'FECHA_DESC' | 'FECHA_ASC' | 'MODULO' | 'ESTADO'>('FECHA_DESC');

  // Filtrar alertas
  const alertasFiltradas = useMemo(() => {
    let resultado = [...alertas];

    // Filtro por búsqueda
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter(a => 
        a.expediente.toLowerCase().includes(termino) ||
        a.responsable.toLowerCase().includes(termino) ||
        a.modulo.toLowerCase().includes(termino) ||
        a.mensaje.toLowerCase().includes(termino)
      );
    }

    // Filtro por módulo
    if (filtroModulo !== 'TODOS') {
      resultado = resultado.filter(a => a.modulo === filtroModulo);
    }

    // Filtro por canal
    if (filtroCanal !== 'TODOS') {
      resultado = resultado.filter(a => a.canal === filtroCanal);
    }

    // Filtro por nivel
    if (filtroNivel !== 'TODOS') {
      resultado = resultado.filter(a => a.nivel === filtroNivel);
    }

    // Filtro por estado
    if (filtroEstado !== 'TODOS') {
      resultado = resultado.filter(a => a.estado === filtroEstado);
    }

    // Filtro por rango de fecha
    const ahora = new Date();
    if (rangoFecha === 'HOY') {
      resultado = resultado.filter(a => {
        const diff = ahora.getTime() - a.fecha.getTime();
        return diff < 24 * 60 * 60 * 1000;
      });
    } else if (rangoFecha === 'SEMANA') {
      resultado = resultado.filter(a => {
        const diff = ahora.getTime() - a.fecha.getTime();
        return diff < 7 * 24 * 60 * 60 * 1000;
      });
    } else if (rangoFecha === 'MES') {
      resultado = resultado.filter(a => {
        const diff = ahora.getTime() - a.fecha.getTime();
        return diff < 30 * 24 * 60 * 60 * 1000;
      });
    }

    // Ordenar
    switch (ordenPor) {
      case 'FECHA_DESC':
        resultado.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        break;
      case 'FECHA_ASC':
        resultado.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
        break;
      case 'MODULO':
        resultado.sort((a, b) => a.modulo.localeCompare(b.modulo));
        break;
      case 'ESTADO':
        resultado.sort((a, b) => a.estado.localeCompare(b.estado));
        break;
    }

    return resultado;
  }, [alertas, busqueda, filtroModulo, filtroCanal, filtroNivel, filtroEstado, rangoFecha, ordenPor]);

  // Estadísticas
  const estadisticas = useMemo(() => {
    return {
      total: alertas.length,
      enviadas: alertas.filter(a => a.estado === 'ENVIADA').length,
      leidas: alertas.filter(a => a.estado === 'LEIDA').length,
      fallidas: alertas.filter(a => a.estado === 'FALLIDA').length,
      pendientes: alertas.filter(a => a.estado === 'PENDIENTE').length,
      email: alertas.filter(a => a.canal === 'EMAIL').length,
      teams: alertas.filter(a => a.canal === 'TEAMS').length,
      sms: alertas.filter(a => a.canal === 'SMS').length,
      inApp: alertas.filter(a => a.canal === 'IN_APP').length,
      tasaExito: ((alertas.filter(a => a.estado === 'ENVIADA' || a.estado === 'LEIDA').length / alertas.length) * 100).toFixed(1),
    };
  }, [alertas]);

  const modulosUnicos = Array.from(new Set(alertas.map(a => a.modulo)));

  const handleExportar = () => {
    const csv = [
      ['ID', 'Fecha', 'Módulo', 'Expediente', 'Responsable', 'Nivel', 'Canal', 'Estado', 'Asunto/Mensaje'].join(','),
      ...alertasFiltradas.map(a => [
        a.id,
        a.fecha.toLocaleString(),
        a.modulo,
        a.expediente,
        a.responsable,
        a.nivel,
        a.canal,
        a.estado,
        `"${a.asunto || a.mensaje.substring(0, 50)}..."`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historial-alertas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('📥 Historial exportado', {
      description: `${alertasFiltradas.length} registros descargados en formato CSV`
    });
  };

  const formatearFecha = (fecha: Date) => {
    return fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearFechaRelativa = (fecha: Date) => {
    const ahora = new Date();
    const diff = ahora.getTime() - fecha.getTime();
    const minutos = Math.floor(diff / (1000 * 60));
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas} h`;
    if (dias < 7) return `Hace ${dias} días`;
    return formatearFecha(fecha);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroModulo('TODOS');
    setFiltroCanal('TODOS');
    setFiltroNivel('TODOS');
    setFiltroEstado('TODOS');
    setRangoFecha('TODOS');
    toast.info('🔄 Filtros limpiados');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header con Estadísticas */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-6 h-6 text-orange-600" />
              Historial de Alertas
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Registro completo y auditable de todas las notificaciones enviadas
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={limpiarFiltros}
              className="hover:bg-gray-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Limpiar Filtros
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportar}
              className="hover:bg-green-50 hover:border-green-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar ({alertasFiltradas.length})
            </Button>
          </div>
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
          <Card className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="text-xs text-blue-700 font-semibold mb-1">Total</div>
            <div className="text-2xl font-extrabold text-blue-900">{estadisticas.total}</div>
          </Card>
          
          <Card className="p-3 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="text-xs text-green-700 font-semibold mb-1">Leídas</div>
            <div className="text-2xl font-extrabold text-green-900">{estadisticas.leidas}</div>
          </Card>
          
          <Card className="p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="text-xs text-yellow-700 font-semibold mb-1">Enviadas</div>
            <div className="text-2xl font-extrabold text-yellow-900">{estadisticas.enviadas}</div>
          </Card>
          
          <Card className="p-3 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="text-xs text-red-700 font-semibold mb-1">Fallidas</div>
            <div className="text-2xl font-extrabold text-red-900">{estadisticas.fallidas}</div>
          </Card>

          <Card className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="text-xs text-purple-700 font-semibold mb-1">
              <Mail className="w-3 h-3 inline mr-1" />Email
            </div>
            <div className="text-2xl font-extrabold text-purple-900">{estadisticas.email}</div>
          </Card>

          <Card className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <div className="text-xs text-indigo-700 font-semibold mb-1">
              <MessageSquare className="w-3 h-3 inline mr-1" />Teams
            </div>
            <div className="text-2xl font-extrabold text-indigo-900">{estadisticas.teams}</div>
          </Card>

          <Card className="p-3 bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
            <div className="text-xs text-teal-700 font-semibold mb-1">
              <Smartphone className="w-3 h-3 inline mr-1" />SMS
            </div>
            <div className="text-2xl font-extrabold text-teal-900">{estadisticas.sms}</div>
          </Card>

          <Card className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="text-xs text-orange-700 font-semibold mb-1">Éxito</div>
            <div className="text-2xl font-extrabold text-orange-900">{estadisticas.tasaExito}%</div>
          </Card>
        </div>

        {/* Filtros */}
        <div className="space-y-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por expediente, responsable, módulo o mensaje..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Filtros Rápidos */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Rango de Fecha */}
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              {['TODOS', 'HOY', 'SEMANA', 'MES'].map((rango) => (
                <Button
                  key={rango}
                  variant="outline"
                  size="sm"
                  onClick={() => setRangoFecha(rango as any)}
                  className={`${rangoFecha === rango ? 'bg-orange-50 border-orange-300 text-orange-700' : ''}`}
                >
                  {rango === 'TODOS' ? 'Todos' : rango === 'HOY' ? 'Hoy' : rango === 'SEMANA' ? 'Esta semana' : 'Este mes'}
                </Button>
              ))}
            </div>

            <div className="h-6 w-px bg-gray-300" />

            {/* Canal */}
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-gray-500" />
              {(['TODOS', 'EMAIL', 'TEAMS', 'SMS', 'IN_APP'] as const).map((canal) => {
                const Icon = canal !== 'TODOS' ? ICONOS_CANAL[canal] : null;
                return (
                  <Button
                    key={canal}
                    variant="outline"
                    size="sm"
                    onClick={() => setFiltroCanal(canal)}
                    className={`${filtroCanal === canal ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
                  >
                    {Icon && <Icon className="w-3 h-3 mr-1" />}
                    {canal === 'TODOS' ? 'Todos' : canal === 'IN_APP' ? 'In-App' : canal}
                  </Button>
                );
              })}
            </div>

            <div className="h-6 w-px bg-gray-300" />

            {/* Estado */}
            {(['TODOS', 'LEIDA', 'ENVIADA', 'PENDIENTE', 'FALLIDA'] as const).map((estado) => (
              <Button
                key={estado}
                variant="outline"
                size="sm"
                onClick={() => setFiltroEstado(estado)}
                className={`${filtroEstado === estado ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
              >
                {estado === 'TODOS' ? 'Todos los estados' : estado.charAt(0) + estado.slice(1).toLowerCase()}
              </Button>
            ))}

            <div className="ml-auto text-sm text-gray-600">
              {alertasFiltradas.length} de {alertas.length} alertas
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-12 gap-6 p-6 h-full">
          {/* Timeline de Alertas */}
          <div className="col-span-12 lg:col-span-7">
            <Card className="h-full flex flex-col bg-white shadow-lg">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                  Timeline de Alertas
                </h3>
                
                <select
                  value={ordenPor}
                  onChange={(e) => setOrdenPor(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="FECHA_DESC">Más recientes primero</option>
                  <option value="FECHA_ASC">Más antiguas primero</option>
                  <option value="MODULO">Por módulo</option>
                  <option value="ESTADO">Por estado</option>
                </select>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                <AnimatePresence>
                  {alertasFiltradas.map((alerta, idx) => {
                    const IconoCanal = ICONOS_CANAL[alerta.canal];
                    const colorNivel = COLORES_NIVEL[alerta.nivel];
                    const estadoInfo = ICONOS_ESTADO[alerta.estado];
                    const IconoEstado = estadoInfo.icono;
                    const isSelected = alertaSeleccionada?.id === alerta.id;
                    
                    return (
                      <motion.div
                        key={alerta.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: idx * 0.02 }}
                      >
                        <button
                          onClick={() => setAlertaSeleccionada(alerta)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'bg-orange-50 border-orange-400 shadow-md'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow'
                          }`}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="p-2 rounded-lg"
                                style={{ borderLeft: `3px solid ${colorNivel.solid}` }}
                              >
                                <IconoCanal className="w-4 h-4 text-orange-600" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-gray-900">{alerta.modulo}</p>
                                <p className="text-xs text-gray-600">{formatearFechaRelativa(alerta.fecha)}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${colorNivel.bg} ${colorNivel.text}`}>
                                {alerta.nivel}
                              </Badge>
                              <div className={`p-1.5 rounded-full ${estadoInfo.bg}`}>
                                <IconoEstado className={`w-3 h-3 ${estadoInfo.color}`} />
                              </div>
                            </div>
                          </div>

                          {/* Contenido */}
                          <div className="mb-2">
                            <p className="text-xs text-gray-600 mb-1">
                              <FileText className="w-3 h-3 inline mr-1" />
                              Expediente: <span className="font-semibold text-gray-900">{alerta.expediente}</span>
                            </p>
                            <p className="text-xs text-gray-600 mb-2">
                              <User className="w-3 h-3 inline mr-1" />
                              {alerta.responsable}
                            </p>
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {alerta.asunto || alerta.mensaje}
                            </p>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Tag className="w-3 h-3" />
                              <span>{alerta.destinatarios.length} destinatario{alerta.destinatarios.length > 1 ? 's' : ''}</span>
                            </div>
                            
                            {alerta.fechaLectura && (
                              <span className="text-xs text-green-700">
                                ✓ Leída {formatearFechaRelativa(alerta.fechaLectura)}
                              </span>
                            )}
                            
                            {alerta.errorMensaje && (
                              <span className="text-xs text-red-700 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Error
                              </span>
                            )}
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {alertasFiltradas.length === 0 && (
                  <div className="text-center py-12">
                    <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900 mb-2">No se encontraron alertas</h3>
                    <p className="text-sm text-gray-600">
                      Intenta ajustar los filtros de búsqueda
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Panel de Detalle */}
          <div className="col-span-12 lg:col-span-5">
            <AnimatePresence mode="wait">
              {alertaSeleccionada ? (
                <motion.div
                  key={alertaSeleccionada.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-full"
                >
                  <Card className="h-full flex flex-col bg-white shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">Detalle de Alerta</h3>
                        <Badge className="bg-orange-600 text-white">
                          {alertaSeleccionada.id}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        {formatearFecha(alertaSeleccionada.fecha)}
                      </p>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                      {/* Información Principal */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-gray-700 mb-1 block">Módulo</label>
                          <p className="text-sm text-gray-900">{alertaSeleccionada.modulo}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-gray-700 mb-1 block">Expediente</label>
                            <p className="text-sm text-gray-900">{alertaSeleccionada.expediente}</p>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-700 mb-1 block">Nivel</label>
                            <Badge className={`${COLORES_NIVEL[alertaSeleccionada.nivel].bg} ${COLORES_NIVEL[alertaSeleccionada.nivel].text}`}>
                              {alertaSeleccionada.nivel}
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-700 mb-1 block">Responsable</label>
                          <p className="text-sm text-gray-900">{alertaSeleccionada.responsable}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-gray-700 mb-1 block">Canal</label>
                            <div className="flex items-center gap-2">
                              {React.createElement(ICONOS_CANAL[alertaSeleccionada.canal], {
                                className: 'w-4 h-4 text-orange-600'
                              })}
                              <span className="text-sm text-gray-900">{alertaSeleccionada.canal}</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-700 mb-1 block">Estado</label>
                            <div className="flex items-center gap-2">
                              {React.createElement(ICONOS_ESTADO[alertaSeleccionada.estado].icono, {
                                className: `w-4 h-4 ${ICONOS_ESTADO[alertaSeleccionada.estado].color}`
                              })}
                              <span className="text-sm text-gray-900">{alertaSeleccionada.estado}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-gray-700 mb-1 block">Días Restantes</label>
                            <p className={`text-sm font-bold ${alertaSeleccionada.diasRestantes < 0 ? 'text-red-700' : alertaSeleccionada.diasRestantes < 5 ? 'text-orange-700' : 'text-green-700'}`}>
                              {alertaSeleccionada.diasRestantes} días
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-700 mb-1 block">Fecha Vencimiento</label>
                            <p className="text-sm text-gray-900">
                              {alertaSeleccionada.fechaVencimiento.toLocaleDateString('es-CO')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Mensaje */}
                      <Card className="bg-gray-50 border-gray-200 p-4">
                        <label className="text-xs font-bold text-gray-700 mb-2 block">
                          {alertaSeleccionada.asunto ? 'Asunto' : 'Mensaje'}
                        </label>
                        {alertaSeleccionada.asunto && (
                          <p className="text-sm font-semibold text-gray-900 mb-2">
                            {alertaSeleccionada.asunto}
                          </p>
                        )}
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                          {alertaSeleccionada.mensaje}
                        </pre>
                      </Card>

                      {/* Destinatarios */}
                      <div>
                        <label className="text-xs font-bold text-gray-700 mb-2 block">
                          Destinatarios ({alertaSeleccionada.destinatarios.length})
                        </label>
                        <div className="space-y-1">
                          {alertaSeleccionada.destinatarios.map((dest, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                              <User className="w-3 h-3 text-gray-600" />
                              <span className="text-sm text-gray-900">{dest}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tracking */}
                      {alertaSeleccionada.fechaLectura && (
                        <Card className="bg-green-50 border-green-200 p-3">
                          <label className="text-xs font-bold text-green-900 mb-1 block flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Fecha de Lectura
                          </label>
                          <p className="text-sm text-green-800">
                            {formatearFecha(alertaSeleccionada.fechaLectura)}
                          </p>
                        </Card>
                      )}

                      {/* Error */}
                      {alertaSeleccionada.errorMensaje && (
                        <Card className="bg-red-50 border-red-200 p-3">
                          <label className="text-xs font-bold text-red-900 mb-1 block flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Error de Envío
                          </label>
                          <p className="text-sm text-red-800">
                            {alertaSeleccionada.errorMensaje}
                          </p>
                        </Card>
                      )}

                      {/* Metadata */}
                      {Object.keys(alertaSeleccionada.metadata).length > 0 && (
                        <Card className="bg-blue-50 border-blue-200 p-3">
                          <label className="text-xs font-bold text-blue-900 mb-2 block flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            Metadata de Lectura
                          </label>
                          <div className="space-y-1">
                            {alertaSeleccionada.metadata.ip && (
                              <p className="text-xs text-blue-800">
                                <span className="font-semibold">IP:</span> {alertaSeleccionada.metadata.ip}
                              </p>
                            )}
                            {alertaSeleccionada.metadata.dispositivo && (
                              <p className="text-xs text-blue-800">
                                <span className="font-semibold">Dispositivo:</span> {alertaSeleccionada.metadata.dispositivo}
                              </p>
                            )}
                            {alertaSeleccionada.metadata.navegador && (
                              <p className="text-xs text-blue-800">
                                <span className="font-semibold">Navegador:</span> {alertaSeleccionada.metadata.navegador}
                              </p>
                            )}
                          </div>
                        </Card>
                      )}
                    </div>

                    {/* Footer con Acciones */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={async () => {
                            const copiado = await copyToClipboard(JSON.stringify(alertaSeleccionada, null, 2));
                            if (copiado) {
                              toast.success('✓ Copiado al portapapeles');
                            } else {
                              toast.error('✗ No se pudo copiar');
                            }
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Copiar JSON
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAlertaSeleccionada(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full"
                >
                  <Card className="h-full flex items-center justify-center bg-white shadow-lg">
                    <div className="text-center p-12">
                      <Eye className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                      <h3 className="font-bold text-xl text-gray-900 mb-2">
                        Selecciona una Alerta
                      </h3>
                      <p className="text-sm text-gray-600">
                        Haz clic en cualquier alerta del timeline para ver sus detalles completos
                      </p>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
