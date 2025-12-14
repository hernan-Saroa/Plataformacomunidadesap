/**
 * DASHBOARD JUZGAMIENTO - Gestión Legal
 * Vista ejecutiva con métricas y lista de expedientes
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Scale, AlertTriangle, Clock, Users, TrendingUp, TrendingDown,
  FileText, Calendar, Search, Filter, Download, Eye, MoreVertical,
  ArrowUpRight, CheckCircle, XCircle, List, LayoutGrid, X, MapPin,
  Mail, Phone, Gavel, History, Paperclip
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { DashboardKanbanJuzgamiento } from './DashboardKanbanJuzgamiento';

interface Expediente {
  id: string;
  numero: string;
  investigado: string;
  cedula: string;
  cargo: string;
  etapaActual: string;
  abogadoAsignado: string;
  diasParaPrescripcion: number;
  diasRestantesTermino: number;
  tipoFalta: 'Leve' | 'Grave' | 'Gravísima';
  sancionProyectada: string;
  fechaCreacion: string;
  ultimaActuacion: string;
}

const EXPEDIENTES_DATA: Expediente[] = [
  {
    id: '1',
    numero: 'PD-2025-0125',
    investigado: 'Ana María López Martínez',
    cedula: '52123456',
    cargo: 'Profesional Universitario',
    etapaActual: 'Traslado Descargos',
    abogadoAsignado: 'Dr. Carlos Mendoza',
    diasParaPrescripcion: 45,
    diasRestantesTermino: 7,
    tipoFalta: 'Grave',
    sancionProyectada: 'Destitución',
    fechaCreacion: '2025-01-02',
    ultimaActuacion: 'Auto avocamiento notificado'
  },
  {
    id: '2',
    numero: 'PD-2025-0098',
    investigado: 'Roberto Sánchez Cruz',
    cedula: '77385960',
    cargo: 'Técnico Administrativo',
    etapaActual: 'Recibido',
    abogadoAsignado: 'Dra. María Torres',
    diasParaPrescripcion: 520,
    diasRestantesTermino: 2,
    tipoFalta: 'Gravísima',
    sancionProyectada: 'Destitución + Inhabilidad',
    fechaCreacion: '2025-01-28',
    ultimaActuacion: 'Expediente recibido de OCID'
  },
  {
    id: '3',
    numero: 'PD-2024-0234',
    investigado: 'Patricia Herrera Gómez',
    cedula: '33445556',
    cargo: 'Secretaria Ejecutiva',
    etapaActual: 'Práctica Pruebas',
    abogadoAsignado: 'Dr. Luis Ramírez',
    diasParaPrescripcion: 280,
    diasRestantesTermino: 18,
    tipoFalta: 'Grave',
    sancionProyectada: 'Suspensión 6 meses',
    fechaCreacion: '2024-08-15',
    ultimaActuacion: 'Auto decreto de pruebas'
  },
  {
    id: '4',
    numero: 'PD-2025-0156',
    investigado: 'Jorge Ramírez Silva',
    cedula: '11223334',
    cargo: 'Conductor',
    etapaActual: 'Descargos Presentados',
    abogadoAsignado: 'Dr. Carlos Mendoza',
    diasParaPrescripcion: 745,
    diasRestantesTermino: 15,
    tipoFalta: 'Leve',
    sancionProyectada: 'Amonestación',
    fechaCreacion: '2025-01-15',
    ultimaActuacion: 'Descargos presentados'
  },
  {
    id: '5',
    numero: 'PD-2024-0189',
    investigado: 'Sandra Milena Díaz',
    cedula: '22334455',
    cargo: 'Profesional Especializado',
    etapaActual: 'Proyecto Fallo',
    abogadoAsignado: 'Dra. María Torres',
    diasParaPrescripcion: 605,
    diasRestantesTermino: 5,
    tipoFalta: 'Gravísima',
    sancionProyectada: 'Destitución + Inhabilidad 15 años',
    fechaCreacion: '2024-05-20',
    ultimaActuacion: 'Fallo proyectado'
  }
];

export function DashboardJuzgamiento() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<string | null>(null);
  const [vistaActiva, setVistaActiva] = useState<'lista' | 'kanban'>('lista');
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState<typeof EXPEDIENTES_DATA[0] | null>(null);

  const expedientesFiltrados = EXPEDIENTES_DATA.filter(exp => {
    const matchBusqueda = exp.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
                         exp.investigado.toLowerCase().includes(busqueda.toLowerCase());
    const matchEtapa = !filtroEtapa || exp.etapaActual === filtroEtapa;
    return matchBusqueda && matchEtapa;
  });

  const totalExpedientes = EXPEDIENTES_DATA.length;
  const enRiesgoPrescripcion = EXPEDIENTES_DATA.filter(e => e.diasParaPrescripcion < 180).length;
  const terminosPorVencer = EXPEDIENTES_DATA.filter(e => e.diasRestantesTermino < 5).length;
  const abogadosActivos = [...new Set(EXPEDIENTES_DATA.map(e => e.abogadoAsignado))].length;

  const getSemaforoPrescripcion = (dias: number) => {
    if (dias < 90) return { color: '#DC2626', bg: '#FEE2E2', label: '🚨 Crítico' };
    if (dias < 180) return { color: '#F59E0B', bg: '#FEF3C7', label: '⚠️ Atención' };
    return { color: '#10B981', bg: '#D1FAE5', label: '✓ Normal' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#6F42C1' }}>
          Dashboard Ejecutivo - Gestión de Expedientes
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Gestión, control y seguimiento de expedientes en primera instancia
        </p>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expedientes Activos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-5 border-2 hover:shadow-lg transition-shadow cursor-pointer" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ background: '#F3E8FF' }}>
                <Scale className="w-6 h-6" style={{ color: '#6F42C1' }} />
              </div>
              <Badge className="text-xs font-bold" style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                <TrendingUp className="w-3 h-3 mr-1" />
                +15%
              </Badge>
            </div>
            <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
              {totalExpedientes}
            </p>
            <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
              Expedientes Activos
            </p>
          </Card>
        </motion.div>

        {/* Términos por Vencer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="p-5 border-2 hover:shadow-lg transition-shadow cursor-pointer" style={{ borderColor: '#FEF3C7' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
                <Clock className="w-6 h-6" style={{ color: '#F59E0B' }} />
              </div>
              <Badge className="text-xs font-bold" style={{ background: '#FEF3C7', color: '#92400E' }}>
                ⚠️ Crítico
              </Badge>
            </div>
            <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
              {terminosPorVencer}
            </p>
            <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
              Términos por Vencer
            </p>
          </Card>
        </motion.div>

        {/* Riesgo de Prescripción */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="p-5 border-2 hover:shadow-lg transition-shadow cursor-pointer" style={{ borderColor: '#FEE2E2' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
                <AlertTriangle className="w-6 h-6" style={{ color: '#DC2626' }} />
              </div>
              <Badge className="text-xs font-bold" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                🚨 Urgente
              </Badge>
            </div>
            <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
              {enRiesgoPrescripcion}
            </p>
            <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
              En Riesgo de Prescripción
            </p>
          </Card>
        </motion.div>

        {/* Abogados Activos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="p-5 border-2 hover:shadow-lg transition-shadow cursor-pointer" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ background: '#E0EDFF' }}>
                <Users className="w-6 h-6" style={{ color: '#003DA5' }} />
              </div>
              <Badge className="text-xs font-bold" style={{ background: '#D1FAE5', color: '#065F46' }}>
                Activos
              </Badge>
            </div>
            <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
              {abogadosActivos}
            </p>
            <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
              Abogados Sustanciadores
            </p>
          </Card>
        </motion.div>
      </div>

      {/* Alertas Críticas */}
      {enRiesgoPrescripcion > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-4 border-2" style={{ borderColor: '#FEE2E2', background: '#FEF2F2' }}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg flex-shrink-0" style={{ background: '#DC2626' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: '#FFFFFF' }} />
              </div>
              <div className="flex-1">
                <p className="font-bold mb-1" style={{ color: '#991B1B' }}>
                  🚨 ALERTA DE PRESCRIPCIÓN
                </p>
                <p className="text-sm" style={{ color: '#7F1D1D' }}>
                  Hay <strong>{enRiesgoPrescripcion} expediente(s)</strong> con riesgo de prescripción (menos de 6 meses). 
                  Revisa y prioriza estos casos inmediatamente.
                </p>
              </div>
              <Button 
                className="flex-shrink-0"
                style={{ background: '#DC2626', color: '#FFFFFF' }}
              >
                Ver Expedientes
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Barra de Búsqueda y Filtros */}
      <Card className="p-4 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
            <Input
              placeholder="Buscar por número de expediente o nombre del investigado..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 border-2"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-2" style={{ borderColor: '#E5E7EB' }}>
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline" className="border-2" style={{ borderColor: '#E5E7EB' }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            {/* Botones de Vista Lista/Kanban */}
            <div className="flex border-2 rounded-lg overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
              <button
                onClick={() => setVistaActiva('lista')}
                className="px-4 py-2 flex items-center gap-2 font-bold text-sm transition-all"
                style={{
                  background: vistaActiva === 'lista' ? '#6F42C1' : '#FFFFFF',
                  color: vistaActiva === 'lista' ? '#FFFFFF' : '#6B7280'
                }}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
              <button
                onClick={() => setVistaActiva('kanban')}
                className="px-4 py-2 flex items-center gap-2 font-bold text-sm transition-all border-l-2"
                style={{
                  background: vistaActiva === 'kanban' ? '#6F42C1' : '#FFFFFF',
                  color: vistaActiva === 'kanban' ? '#FFFFFF' : '#6B7280',
                  borderColor: '#E5E7EB'
                }}
              >
                <LayoutGrid className="w-4 h-4" />
                Kanban
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Contenido según vista activa */}
      {vistaActiva === 'lista' ? (
        <Card className="border-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-4 border-b-2" style={{ borderColor: '#E5E7EB' }}>
            <h3 className="font-bold" style={{ color: '#1F2937' }}>
              Expedientes Activos ({expedientesFiltrados.length})
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: '#E5E7EB' }}>
            {expedientesFiltrados.map((expediente, index) => {
              const semaforoPrescripcion = getSemaforoPrescripcion(expediente.diasParaPrescripcion);
              
              return (
                <motion.div
                  key={expediente.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar Abogado */}
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback style={{ background: '#F3E8FF', color: '#6F42C1' }}>
                        {expediente.abogadoAsignado.split(' ').slice(1, 3).map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info Principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold" style={{ color: '#6F42C1' }}>
                              {expediente.numero}
                            </p>
                            <Badge 
                              className="text-xs"
                              style={{ 
                                background: expediente.tipoFalta === 'Gravísima' ? '#FEE2E2' : 
                                           expediente.tipoFalta === 'Grave' ? '#FEF3C7' : '#DBEAFE',
                                color: expediente.tipoFalta === 'Gravísima' ? '#991B1B' : 
                                       expediente.tipoFalta === 'Grave' ? '#92400E' : '#1E40AF'
                              }}
                            >
                              {expediente.tipoFalta}
                            </Badge>
                          </div>
                          <p className="font-medium mb-1" style={{ color: '#1F2937' }}>
                            {expediente.investigado}
                          </p>
                          <p className="text-sm" style={{ color: '#6B7280' }}>
                            {expediente.cargo} • CC {expediente.cedula}
                          </p>
                        </div>
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4" style={{ color: '#6B7280' }} />
                        </button>
                      </div>

                      {/* Métricas */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                        {/* Estado */}
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg" style={{ background: '#F3E8FF' }}>
                            <FileText className="w-4 h-4" style={{ color: '#6F42C1' }} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                              ESTADO
                            </p>
                            <p className="text-sm font-bold" style={{ color: '#1F2937' }}>
                              {expediente.etapaActual}
                            </p>
                          </div>
                        </div>

                        {/* Prescripción */}
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg" style={{ background: semaforoPrescripcion.bg }}>
                            <AlertTriangle className="w-4 h-4" style={{ color: semaforoPrescripcion.color }} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                              PRESCRIPCIÓN
                            </p>
                            <p className="text-sm font-bold" style={{ color: semaforoPrescripcion.color }}>
                              {expediente.diasParaPrescripcion}d restantes
                            </p>
                          </div>
                        </div>

                        {/* Término */}
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg" style={{ background: '#E0F2FE' }}>
                            <Clock className="w-4 h-4" style={{ color: '#0284C7' }} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                              TÉRMINO
                            </p>
                            <p className="text-sm font-bold" style={{ color: '#1F2937' }}>
                              {expediente.diasRestantesTermino}d restantes
                            </p>
                          </div>
                        </div>

                        {/* Abogado */}
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg" style={{ background: '#E0EDFF' }}>
                            <Users className="w-4 h-4" style={{ color: '#003DA5' }} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                              ABOGADO
                            </p>
                            <p className="text-sm font-bold truncate" style={{ color: '#1F2937' }}>
                              {expediente.abogadoAsignado.split(' ').slice(1).join(' ')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Sanción Proyectada */}
                      <div className="mt-3 p-2 rounded-lg" style={{ background: '#F9FAFB' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Scale className="w-4 h-4" style={{ color: '#6F42C1' }} />
                            <span className="text-sm font-medium" style={{ color: '#4B5563' }}>
                              Sanción proyectada: <strong>{expediente.sancionProyectada}</strong>
                            </span>
                          </div>
                          <Button size="sm" variant="ghost" style={{ color: '#6F42C1' }} onClick={() => setExpedienteSeleccionado(expediente)}>
                            <Eye className="w-4 h-4 mr-1" />
                            Ver Detalles
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      ) : (
        <DashboardKanbanJuzgamiento />
      )}

      {/* MODAL DE DETALLES DEL EXPEDIENTE */}
      <AnimatePresence>
        {expedienteSeleccionado && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpedienteSeleccionado(null)}
              className="fixed inset-0 bg-black/50 z-[150]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="fixed inset-4 md:inset-10 lg:inset-20 bg-white rounded-2xl shadow-2xl z-[200] overflow-hidden flex flex-col"
            >
              {/* Header del Modal */}
              <div className="p-6 border-b-2" style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl" style={{ background: '#F3E8FF' }}>
                      <Scale className="w-8 h-8" style={{ color: '#6F42C1' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-black" style={{ color: '#6F42C1' }}>
                          {expedienteSeleccionado.numero}
                        </h2>
                        <Badge 
                          className="text-xs font-bold"
                          style={{ 
                            background: expedienteSeleccionado.tipoFalta === 'Gravísima' ? '#FEE2E2' : 
                                       expedienteSeleccionado.tipoFalta === 'Grave' ? '#FEF3C7' : '#DBEAFE',
                            color: expedienteSeleccionado.tipoFalta === 'Gravísima' ? '#991B1B' : 
                                   expedienteSeleccionado.tipoFalta === 'Grave' ? '#92400E' : '#1E40AF'
                          }}
                        >
                          {expedienteSeleccionado.tipoFalta}
                        </Badge>
                        <Badge 
                          className="text-xs font-bold"
                          style={{ background: '#F3E8FF', color: '#6F42C1' }}
                        >
                          {expedienteSeleccionado.etapaActual}
                        </Badge>
                      </div>
                      <p className="text-sm" style={{ color: '#6B7280' }}>
                        Detalle completo del expediente disciplinario
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpedienteSeleccionado(null)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" style={{ color: '#6B7280' }} />
                  </button>
                </div>
              </div>

              {/* Contenido del Modal */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                  {/* Información del Investigado */}
                  <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <Users className="w-5 h-5" style={{ color: '#6F42C1' }} />
                      <h3 className="font-black" style={{ color: '#1F2937' }}>
                        INFORMACIÓN DEL INVESTIGADO
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                          NOMBRE COMPLETO
                        </p>
                        <p className="font-bold text-lg" style={{ color: '#1F2937' }}>
                          {expedienteSeleccionado.investigado}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                          CÉDULA
                        </p>
                        <p className="font-bold text-lg" style={{ color: '#1F2937' }}>
                          {expedienteSeleccionado.cedula}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                          CARGO
                        </p>
                        <p className="font-bold" style={{ color: '#1F2937' }}>
                          {expedienteSeleccionado.cargo}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                          SEDE
                        </p>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" style={{ color: '#6B7280' }} />
                          <p className="font-bold" style={{ color: '#1F2937' }}>
                            Dirección Nacional - Bogotá
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Métricas del Expediente */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-5 border-2" style={{ borderColor: getSemaforoPrescripcion(expedienteSeleccionado.diasParaPrescripcion).bg }}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-lg" style={{ background: getSemaforoPrescripcion(expedienteSeleccionado.diasParaPrescripcion).bg }}>
                          <AlertTriangle className="w-5 h-5" style={{ color: getSemaforoPrescripcion(expedienteSeleccionado.diasParaPrescripcion).color }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                            PRESCRIPCIÓN
                          </p>
                          <p className="text-2xl font-black" style={{ color: getSemaforoPrescripcion(expedienteSeleccionado.diasParaPrescripcion).color }}>
                            {expedienteSeleccionado.diasParaPrescripcion} días
                          </p>
                        </div>
                      </div>
                      <Badge 
                        className="text-xs font-bold w-full justify-center"
                        style={{ 
                          background: getSemaforoPrescripcion(expedienteSeleccionado.diasParaPrescripcion).bg,
                          color: getSemaforoPrescripcion(expedienteSeleccionado.diasParaPrescripcion).color
                        }}
                      >
                        {getSemaforoPrescripcion(expedienteSeleccionado.diasParaPrescripcion).label}
                      </Badge>
                    </Card>

                    <Card className="p-5 border-2" style={{ borderColor: '#E0F2FE' }}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-lg" style={{ background: '#E0F2FE' }}>
                          <Clock className="w-5 h-5" style={{ color: '#0284C7' }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                            TÉRMINO PROCESAL
                          </p>
                          <p className="text-2xl font-black" style={{ color: '#0284C7' }}>
                            {expedienteSeleccionado.diasRestantesTermino} días
                          </p>
                        </div>
                      </div>
                      <p className="text-xs font-medium" style={{ color: '#6B7280' }}>
                        Días restantes para esta etapa
                      </p>
                    </Card>

                    <Card className="p-5 border-2" style={{ borderColor: '#E0EDFF' }}>
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback style={{ background: '#F3E8FF', color: '#6F42C1' }}>
                            {expedienteSeleccionado.abogadoAsignado.split(' ').slice(1, 3).map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                            ABOGADO SUSTANCIADOR
                          </p>
                          <p className="text-sm font-black" style={{ color: '#1F2937' }}>
                            {expedienteSeleccionado.abogadoAsignado}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                        <Mail className="w-3 h-3" />
                        <span>carlos.mendoza@esap.edu.co</span>
                      </div>
                    </Card>
                  </div>

                  {/* Sanción Proyectada */}
                  <Card className="p-6 border-2" style={{ borderColor: '#FEE2E2', background: '#FEF2F2' }}>
                    <div className="flex items-start gap-3">
                      <div className="p-3 rounded-xl" style={{ background: '#DC2626' }}>
                        <Gavel className="w-6 h-6" style={{ color: '#FFFFFF' }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-black mb-2" style={{ color: '#991B1B' }}>
                          SANCIÓN PROYECTADA
                        </h3>
                        <p className="text-xl font-bold" style={{ color: '#7F1D1D' }}>
                          {expedienteSeleccionado.sancionProyectada}
                        </p>
                        <p className="text-sm mt-2" style={{ color: '#991B1B' }}>
                          De acuerdo a la gravedad de la falta y la tipificación disciplinaria
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Timeline / Historial */}
                  <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-center gap-3 mb-6">
                      <History className="w-5 h-5" style={{ color: '#6F42C1' }} />
                      <h3 className="font-black" style={{ color: '#1F2937' }}>
                        HISTORIAL DE ACTUACIONES
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {/* Actuación 1 */}
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full" style={{ background: '#6F42C1' }} />
                          <div className="w-0.5 h-full" style={{ background: '#E5E7EB' }} />
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold" style={{ color: '#1F2937' }}>
                              {expedienteSeleccionado.ultimaActuacion}
                            </p>
                            <Badge className="text-xs" style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                              Actual
                            </Badge>
                          </div>
                          <p className="text-sm mb-2" style={{ color: '#6B7280' }}>
                            {expedienteSeleccionado.fechaCreacion}
                          </p>
                          <p className="text-sm" style={{ color: '#4B5563' }}>
                            Expediente en etapa de {expedienteSeleccionado.etapaActual.toLowerCase()}. Se notificó al disciplinado y se dio traslado para presentación de descargos.
                          </p>
                        </div>
                      </div>

                      {/* Actuación 2 */}
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full" style={{ background: '#9CA3AF' }} />
                          <div className="w-0.5 h-full" style={{ background: '#E5E7EB' }} />
                        </div>
                        <div className="flex-1 pb-6">
                          <p className="font-bold mb-1" style={{ color: '#1F2937' }}>
                            Expediente recibido de Control Interno
                          </p>
                          <p className="text-sm mb-2" style={{ color: '#6B7280' }}>
                            15 de enero de 2025
                          </p>
                          <p className="text-sm" style={{ color: '#4B5563' }}>
                            Radicado y asignado al abogado sustanciador para inicio de primera instancia.
                          </p>
                        </div>
                      </div>

                      {/* Actuación 3 */}
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full" style={{ background: '#9CA3AF' }} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold mb-1" style={{ color: '#1F2937' }}>
                            Fallo de segunda instancia
                          </p>
                          <p className="text-sm mb-2" style={{ color: '#6B7280' }}>
                            10 de enero de 2025
                          </p>
                          <p className="text-sm" style={{ color: '#4B5563' }}>
                            Se confirmó la apertura de investigación disciplinaria y se remitió a primera instancia.
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Documentos Anexos */}
                  <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <Paperclip className="w-5 h-5" style={{ color: '#6F42C1' }} />
                      <h3 className="font-black" style={{ color: '#1F2937' }}>
                        DOCUMENTOS ANEXOS
                      </h3>
                      <Badge style={{ background: '#F3E8FF', color: '#6F42C1' }}>
                        12 archivos
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { nombre: 'Auto de avocamiento', fecha: '02/01/2025', tipo: 'PDF' },
                        { nombre: 'Pliego de cargos', fecha: '02/01/2025', tipo: 'PDF' },
                        { nombre: 'Notificación al disciplinado', fecha: '05/01/2025', tipo: 'PDF' },
                        { nombre: 'Pruebas documentales', fecha: '10/12/2024', tipo: 'ZIP' },
                      ].map((doc, i) => (
                        <div key={i} className="p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border" style={{ borderColor: '#E5E7EB' }}>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg" style={{ background: '#FEF3C7' }}>
                              <FileText className="w-5 h-5" style={{ color: '#F59E0B' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate" style={{ color: '#1F2937' }}>
                                {doc.nombre}
                              </p>
                              <p className="text-xs" style={{ color: '#6B7280' }}>
                                {doc.tipo} • {doc.fecha}
                              </p>
                            </div>
                            <Eye className="w-4 h-4 flex-shrink-0" style={{ color: '#6B7280' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Fechas Importantes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-5 border-2" style={{ borderColor: '#E5E7EB' }}>
                      <div className="flex items-center gap-3 mb-3">
                        <Calendar className="w-5 h-5" style={{ color: '#6F42C1' }} />
                        <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                          FECHA DE CREACIÓN
                        </p>
                      </div>
                      <p className="text-xl font-black" style={{ color: '#1F2937' }}>
                        {expedienteSeleccionado.fechaCreacion}
                      </p>
                    </Card>
                    <Card className="p-5 border-2" style={{ borderColor: '#FEE2E2' }}>
                      <div className="flex items-center gap-3 mb-3">
                        <AlertTriangle className="w-5 h-5" style={{ color: '#DC2626' }} />
                        <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                          FECHA DE PRESCRIPCIÓN
                        </p>
                      </div>
                      <p className="text-xl font-black" style={{ color: '#DC2626' }}>
                        15 de junio de 2025
                      </p>
                    </Card>
                  </div>
                </div>
              </div>

              {/* Footer con Acciones */}
              <div className="p-6 border-t-2 flex items-center justify-between" style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}>
                <Button variant="outline" onClick={() => setExpedienteSeleccionado(null)}>
                  Cerrar
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" style={{ borderColor: '#6F42C1', color: '#6F42C1' }}>
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Expediente
                  </Button>
                  <Button style={{ background: '#6F42C1', color: '#FFFFFF' }}>
                    Editar Expediente
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}