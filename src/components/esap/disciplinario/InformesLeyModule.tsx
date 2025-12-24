/**
 * ============================================
 * INFORMES DE LEY - Control Interno Disciplinario
 * ============================================
 * 
 * Módulo para gestión del catálogo normativo de informes obligatorios
 * Diseño unificado con Proceso de Auditoría
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, ChevronDown, Eye, Download, Search, Filter, Plus,
  Calendar, Clock, CheckCircle2, AlertTriangle, Send
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Design System
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { HeaderModuloCIG } from '../control-interno/HeaderModuloCIG';

// ============ TIPOS ============

interface InformeLey {
  id: string;
  nombre: string;
  normativa: string;
  tipo: 'RF-ANUAL' | 'Trimestral' | 'Semestral' | 'Bimestral';
  estado: 'Pendiente' | 'En Progreso' | 'Enviado' | 'Atrasado';
  destinatario: string;
  plazoEntrega: string;
  responsable: string;
  fechaEnvio?: string;
  ultimaActualizacion?: string;
}

// ============ DATOS MOCK ============

const INFORMES_LEY_MOCK: InformeLey[] = [
  {
    id: '1',
    nombre: 'Informe Pormenorizado',
    normativa: 'Ley 1474 de 2011 (Estatuto Anticorrupción) - Art. 9 - Informe Pormenorizado',
    tipo: 'Trimestral',
    estado: 'Enviado',
    destinatario: 'Consejo Superior, DAFP, Contraloría General',
    plazoEntrega: 'Últimos 5 días hábiles de febrero y agosto',
    responsable: 'Jefe OCI',
    fechaEnvio: '28 de febrero de 2025',
    ultimaActualizacion: '24/12/2024'
  },
  {
    id: '2',
    nombre: 'Informe Anual OCI',
    normativa: 'Decreto 648 de 2017 - Art. 14 - Informes de la Oficina de Control Interno',
    tipo: 'RF-ANUAL',
    estado: 'En Progreso',
    destinatario: 'Rectoría, Comunidad Universitaria',
    plazoEntrega: 'Antes del 28 de febrero',
    responsable: 'Jefe OCI',
    ultimaActualizacion: '23/12/2024'
  },
  {
    id: '3',
    nombre: 'Informe de Gestión Anual',
    normativa: 'Ley 1952 de 2019 (Código Disciplinario Único) - Gestión Disciplinaria',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Procuraduría General de la Nación',
    plazoEntrega: '31 de marzo de cada año',
    responsable: 'Jefe OCI'
  },
  {
    id: '4',
    nombre: 'Reporte de Procesos Disciplinarios',
    normativa: 'Circular Externa 100-008 de 2021 - PGN - Reporte SIDEIP',
    tipo: 'Trimestral',
    estado: 'Pendiente',
    destinatario: 'Procuraduría General - SIDEIP',
    plazoEntrega: '15 días después de cerrar trimestre',
    responsable: 'Jefe OCI'
  },
  {
    id: '5',
    nombre: 'Informe Ejecutivo Trimestral',
    normativa: 'Manual Interno OCI - ESAP - Seguimiento y Control',
    tipo: 'Trimestral',
    estado: 'Enviado',
    destinatario: 'Rectoría, Vicerrectoría',
    plazoEntrega: 'Primeros 10 días del mes siguiente',
    responsable: 'Jefe OCI',
    fechaEnvio: '18 de febrero de 2025',
    ultimaActualizacion: '22/12/2024'
  },
  {
    id: '6',
    nombre: 'Informe de Rendición de Cuentas',
    normativa: 'Ley 1474 de 2011 - Art. 78 - Rendición de Cuentas',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Ciudadanía, Grupos de Interés',
    plazoEntrega: 'Antes del 30 de abril',
    responsable: 'Jefe OCI'
  },
  {
    id: '7',
    nombre: 'Balance Social',
    normativa: 'Decreto 1083 de 2015 - Gestión Pública',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Comunidad Universitaria, DAFP',
    plazoEntrega: 'Antes del 31 de marzo',
    responsable: 'Jefe OCI'
  },
  {
    id: '8',
    nombre: 'Informe de Control Interno Contable',
    normativa: 'Resolución 357 de 2008 CGN - Control Interno Contable',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Contaduría General de la Nación',
    plazoEntrega: 'Antes del 28 de febrero',
    responsable: 'Jefe OCI'
  },
  {
    id: '9',
    nombre: 'Informe de Evaluación del Sistema de Control Interno',
    normativa: 'Ley 87 de 1993 - Sistema de Control Interno',
    tipo: 'RF-ANUAL',
    estado: 'En Progreso',
    destinatario: 'Rectoría, Consejo Superior',
    plazoEntrega: 'Antes del 31 de marzo',
    responsable: 'Jefe OCI',
    ultimaActualizacion: '20/12/2024'
  },
  {
    id: '10',
    nombre: 'Plan Anual de Auditoría',
    normativa: 'Decreto 648 de 2017 - Planificación de Auditorías',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Rectoría, Alta Dirección',
    plazoEntrega: 'Antes del 31 de enero',
    responsable: 'Jefe OCI'
  },
  {
    id: '11',
    nombre: 'Seguimiento a Planes de Mejoramiento',
    normativa: 'Ley 1474 de 2011 - Planes de Mejoramiento',
    tipo: 'Trimestral',
    estado: 'Pendiente',
    destinatario: 'Áreas auditadas, Alta Dirección',
    plazoEntrega: 'Últimos 5 días del trimestre',
    responsable: 'Jefe OCI'
  },
  {
    id: '12',
    nombre: 'Informe de Riesgos Institucionales',
    normativa: 'Decreto 1499 de 2017 - Gestión de Riesgos',
    tipo: 'Semestral',
    estado: 'Pendiente',
    destinatario: 'Comité Institucional de Riesgos',
    plazoEntrega: 'Antes del 15 de julio y 15 de enero',
    responsable: 'Jefe OCI'
  },
  {
    id: '13',
    nombre: 'Evaluación de la Gestión de Calidad',
    normativa: 'Decreto 1072 de 2015 - Sistema de Gestión de Calidad',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Alta Dirección, Representante de Calidad',
    plazoEntrega: 'Antes del 31 de marzo',
    responsable: 'Jefe OCI'
  },
  {
    id: '14',
    nombre: 'Informe de Auditorías Realizadas',
    normativa: 'Manual de Auditoría Interna - ESAP',
    tipo: 'Trimestral',
    estado: 'Pendiente',
    destinatario: 'Rectoría, Áreas Auditadas',
    plazoEntrega: 'Primeros 10 días del mes siguiente',
    responsable: 'Jefe OCI'
  },
  {
    id: '15',
    nombre: 'Evaluación del Código de Integridad',
    normativa: 'Ley 1952 de 2019 - Código de Integridad',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Talento Humano, Alta Dirección',
    plazoEntrega: 'Antes del 28 de febrero',
    responsable: 'Jefe OCI'
  },
  {
    id: '16',
    nombre: 'Informe de Transparencia y Acceso a la Información',
    normativa: 'Ley 1712 de 2014 - Transparencia y Derecho de Acceso',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Ciudadanía, Procuraduría',
    plazoEntrega: 'Antes del 31 de enero',
    responsable: 'Jefe OCI'
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function InformesLeyModule() {
  const [informeExpandido, setInformeExpandido] = useState<string | null>('1');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('Todos');
  const [filtroPeriodicidad, setFiltroPeriodicidad] = useState<string>('Todas');

  const toggleInforme = (id: string) => {
    setInformeExpandido(informeExpandido === id ? null : id);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Enviado': return '#10b981';
      case 'En Progreso': return '#f59e0b';
      case 'Pendiente': return '#6b7280';
      case 'Atrasado': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'Enviado': return <CheckCircle2 className="w-5 h-5" />;
      case 'En Progreso': return <Clock className="w-5 h-5" />;
      case 'Pendiente': return <AlertTriangle className="w-5 h-5" />;
      case 'Atrasado': return <AlertTriangle className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  // Estadísticas
  const totalInformes = INFORMES_LEY_MOCK.length;
  const informesEnviados = INFORMES_LEY_MOCK.filter(i => i.estado === 'Enviado').length;
  const informesEnProgreso = INFORMES_LEY_MOCK.filter(i => i.estado === 'En Progreso').length;
  const informesPendientes = INFORMES_LEY_MOCK.filter(i => i.estado === 'Pendiente').length;
  const porcentajeCompletado = Math.round((informesEnviados / totalInformes) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Unificado */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <HeaderModuloCIG
          titulo="Informes de Ley"
          subtitulo="Catálogo normativo de informes obligatorios del Control Interno Disciplinario"
        />
      </div>

      {/* Barra de Progreso */}
      <div className="bg-white border-b px-6 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">Progreso General de Informes</span>
            <span className="text-sm text-gray-900">{porcentajeCompletado}% ({informesEnviados} de {totalInformes})</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-full bg-[#1e5da8] rounded-full transition-all" 
              style={{ width: `${porcentajeCompletado}%` }} 
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>{totalInformes} informes totales</span>
            <span>{informesEnviados} enviados • {informesEnProgreso} en progreso • {informesPendientes} pendientes</span>
          </div>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            titulo="Total Informes"
            valor={totalInformes}
            icono={<FileText className="w-5 h-5" />}
            color="#1e5da8"
          />
          <StatCard
            titulo="Enviados"
            valor={informesEnviados}
            icono={<CheckCircle2 className="w-5 h-5" />}
            color="#10b981"
          />
          <StatCard
            titulo="En Progreso"
            valor={informesEnProgreso}
            icono={<Clock className="w-5 h-5" />}
            color="#f59e0b"
          />
          <StatCard
            titulo="Pendientes"
            valor={informesPendientes}
            icono={<AlertTriangle className="w-5 h-5" />}
            color="#6b7280"
          />
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Barra de Búsqueda y Filtros */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar informes por nombre o normativa..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Todos los estados</option>
            <option>Enviado</option>
            <option>En Progreso</option>
            <option>Pendiente</option>
            <option>Atrasado</option>
          </select>
          <select
            value={filtroPeriodicidad}
            onChange={(e) => setFiltroPeriodicidad(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Todas las periodicidades</option>
            <option>RF-ANUAL</option>
            <option>Trimestral</option>
            <option>Semestral</option>
            <option>Bimestral</option>
          </select>
        </div>

        {/* Lista de Informes */}
        <div className="space-y-3">
          {INFORMES_LEY_MOCK.map((informe) => (
            <CardSIGL key={informe.id} className="overflow-hidden">
              {/* Header de Informe */}
              <button
                onClick={() => toggleInforme(informe.id)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: getEstadoColor(informe.estado) }}
                >
                  {getEstadoIcon(informe.estado)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm text-gray-900 mb-1 font-medium">{informe.nombre}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <BadgeSIGL variant="outline" size="sm">{informe.tipo}</BadgeSIGL>
                    <span>•</span>
                    <BadgeSIGL 
                      variant="outline" 
                      size="sm"
                      style={{ 
                        borderColor: getEstadoColor(informe.estado),
                        color: getEstadoColor(informe.estado)
                      }}
                    >
                      {informe.estado}
                    </BadgeSIGL>
                    {informe.ultimaActualizacion && (
                      <>
                        <span>•</span>
                        <span>Actualizado: {informe.ultimaActualizacion}</span>
                      </>
                    )}
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: informeExpandido === informe.id ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </motion.div>
              </button>

              {/* Detalle del Informe */}
              <AnimatePresence>
                {informeExpandido === informe.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t bg-gray-50"
                  >
                    <div className="p-5 space-y-4">
                      {/* Información del Informe */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block font-medium">Normativa Base</label>
                          <p className="text-sm text-gray-900">{informe.normativa}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block font-medium">Destinatario</label>
                          <p className="text-sm text-gray-900">{informe.destinatario}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block font-medium">Plazo de Entrega</label>
                          <p className="text-sm text-gray-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {informe.plazoEntrega}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block font-medium">Responsable</label>
                          <p className="text-sm text-gray-900">{informe.responsable}</p>
                        </div>
                        {informe.fechaEnvio && (
                          <div className="md:col-span-2">
                            <label className="text-xs text-gray-500 mb-1 block font-medium">Fecha de Envío</label>
                            <p className="text-sm text-green-700 flex items-center gap-2">
                              <Send className="w-4 h-4" />
                              {informe.fechaEnvio}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex gap-2 pt-3 border-t">
                        <ButtonSIGL variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalle
                        </ButtonSIGL>
                        <ButtonSIGL variant="default" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          Generar Informe
                        </ButtonSIGL>
                        <ButtonSIGL variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Descargar
                        </ButtonSIGL>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardSIGL>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ COMPONENTE: STAT CARD ============

function StatCard({
  titulo,
  valor,
  icono,
  color
}: {
  titulo: string;
  valor: number;
  icono: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {icono}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">{titulo}</p>
          <p className="text-2xl font-bold text-gray-900">{valor}</p>
        </div>
      </div>
    </div>
  );
}
