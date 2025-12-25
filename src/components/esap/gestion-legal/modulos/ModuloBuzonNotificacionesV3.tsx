/**
 * ModuloBuzonNotificacionesV3 - MOD-04: Buzón de Notificaciones
 * DISEÑO INBOX STYLE (TIPO GMAIL/OUTLOOK)
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Mail, MailOpen, Inbox, Archive, Star, StarOff, Clock, AlertTriangle,
  CheckCircle, Eye, Plus, Search, Filter, XCircle, Send, Trash2,
  FileText, Download, Circle, Check
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Checkbox } from '../../../ui/checkbox';
import { Notificacion } from '../core/types';
import { toast } from 'sonner@2.0.3';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';

// DATOS MOCK INLINE (temporales para demo)
const notificacionesMock: any[] = [
  {
    id: 'NOT-2025-001',
    etapa: 'PENDIENTE_VERIFICACIÓN',
    tipo: 'NUEVA_DEMANDA',
    tipoProceso: 'Acción Popular',
    asunto: 'Nueva demanda radicada - Acción Popular',
    descripcion: 'Se ha radicado nueva demanda por acción popular contra ESAP',
    fechaRadicacion: new Date('2024-12-24'),
    remitente: 'Juzgado 10 Administrativo Bogotá',
    despachoOrigen: 'Juzgado 10 Admin. Bogotá',
    radicadoExterno: '25000-33-10-001-2024-00234-00',
    urgente: true,
    leida: false,
    documentosAdjuntos: ['demanda.pdf', 'anexos.pdf']
  },
  {
    id: 'NOT-2025-002',
    etapa: 'PENDIENTE_VERIFICACIÓN',
    tipo: 'TERMINO_CERCANO',
    tipoProceso: 'Laboral',
    asunto: 'Término cercano - Contestación demanda DJ-2024-089',
    descripcion: 'Quedan 3 días para contestar demanda DJ-2024-089',
    fechaRadicacion: new Date('2024-12-24'),
    remitente: 'Juzgado 3 Laboral Circuito Bogotá',
    despachoOrigen: 'Juzgado 3 Laboral Bogotá',
    radicadoExterno: '11001-31-03-002-2024-00567-00',
    urgente: true,
    leida: false,
    documentosAdjuntos: ['notificacion.pdf']
  },
  {
    id: 'NOT-2025-003',
    etapa: 'CLASIFICADA',
    tipo: 'AUDIENCIA',
    tipoProceso: 'NRD',
    asunto: 'Audiencia programada - Proceso DJ-2024-045',
    descripcion: 'Audiencia de conciliación el 15 de enero de 2025',
    fechaRadicacion: new Date('2024-12-23'),
    remitente: 'Tribunal Administrativo de Cundinamarca',
    despachoOrigen: 'Tribunal Admin. Cundinamarca',
    radicadoExterno: '25000-23-42-000-2024-01234-01',
    urgente: false,
    leida: false,
    documentosAdjuntos: ['citacion_audiencia.pdf']
  },
  {
    id: 'NOT-2024-156',
    etapa: 'CLASIFICADA',
    tipo: 'AUTO_ADMISORIO',
    tipoProceso: 'Laboral',
    asunto: 'Auto admisorio notificado - DJ-2024-102',
    descripcion: 'Se notificó auto admisorio de demanda laboral',
    fechaRadicacion: new Date('2024-12-22'),
    remitente: 'Juzgado 5 Laboral Circuito Bogotá',
    despachoOrigen: 'Juzgado 5 Laboral Bogotá',
    radicadoExterno: '11001-31-05-001-2024-00789-00',
    urgente: false,
    leida: false,
    documentosAdjuntos: ['auto_admisorio.pdf']
  },
  {
    id: 'NOT-2024-155',
    etapa: 'CLASIFICADA',
    tipo: 'DOCUMENTO_RECIBIDO',
    tipoProceso: 'Consulta Jurídica',
    asunto: 'Documento recibido - Oficina Jurídica',
    descripcion: 'Concepto jurídico sobre contratación directa',
    fechaRadicacion: new Date('2024-12-21'),
    remitente: 'Contraloría General de la República',
    despachoOrigen: 'Contraloría General',
    radicadoExterno: 'CGR-DOC-2024-1567',
    urgente: false,
    leida: false,
    documentosAdjuntos: ['concepto_contratacion.pdf']
  },
  {
    id: 'NOT-2024-154',
    etapa: 'DISTRIBUIDA',
    tipo: 'NUEVA_DEMANDA',
    tipoProceso: 'Reparación Directa',
    asunto: 'Demanda distribuida a abogado externo',
    descripcion: 'DJ-2024-098 asignada a Dr. Carlos Mendoza',
    fechaRadicacion: new Date('2024-12-20'),
    remitente: 'Juzgado 15 Administrativo Bogotá',
    despachoOrigen: 'Juzgado 15 Admin. Bogotá',
    radicadoExterno: '25000-33-15-001-2024-00456-00',
    urgente: false,
    leida: true,
    documentosAdjuntos: ['demanda.pdf']
  },
  {
    id: 'NOT-2024-153',
    etapa: 'DISTRIBUIDA',
    tipo: 'AUDIENCIA',
    tipoProceso: 'NRD',
    asunto: 'Audiencia finalizada - DJ-2024-045',
    descripcion: 'Audiencia de conciliación sin acuerdo',
    fechaRadicacion: new Date('2024-12-19'),
    remitente: 'Tribunal Administrativo de Cundinamarca',
    despachoOrigen: 'Tribunal Admin. Cundinamarca',
    radicadoExterno: '25000-23-42-000-2024-01234-01',
    urgente: false,
    leida: true,
    documentosAdjuntos: ['acta_audiencia.pdf']
  },
  {
    id: 'NOT-2024-152',
    etapa: 'DISTRIBUIDA',
    tipo: 'FALLO',
    tipoProceso: 'Laboral',
    asunto: 'Sentencia notificada - DJ-2023-078',
    descripcion: 'Sentencia desfavorable en primera instancia',
    fechaRadicacion: new Date('2024-12-18'),
    remitente: 'Juzgado 7 Laboral Circuito Bogotá',
    despachoOrigen: 'Juzgado 7 Laboral Bogotá',
    radicadoExterno: '11001-31-07-001-2023-00987-00',
    urgente: false,
    leida: true,
    documentosAdjuntos: ['sentencia.pdf', 'argumentos.pdf']
  },
  {
    id: 'NOT-2024-151',
    etapa: 'ARCHIVADA',
    tipo: 'TERMINO_VENCIDO',
    tipoProceso: 'NRD',
    asunto: 'Término vencido - Desistimiento aceptado',
    descripcion: 'Proceso DJ-2024-012 terminado por desistimiento',
    fechaRadicacion: new Date('2024-12-15'),
    remitente: 'Juzgado 8 Administrativo Bogotá',
    despachoOrigen: 'Juzgado 8 Admin. Bogotá',
    radicadoExterno: '25000-33-08-001-2024-00123-00',
    urgente: false,
    leida: true,
    documentosAdjuntos: ['desistimiento.pdf']
  },
  {
    id: 'NOT-2024-150',
    etapa: 'ARCHIVADA',
    tipo: 'ARCHIVO',
    tipoProceso: 'Acción de Tutela',
    asunto: 'Proceso archivado - DJ-2024-003',
    descripcion: 'Proceso archivado por falta de competencia',
    fechaRadicacion: new Date('2024-12-10'),
    remitente: 'Juzgado 12 Penal Municipal Bogotá',
    despachoOrigen: 'Juzgado 12 Penal Bogotá',
    radicadoExterno: '11001-60-00-2024-00789-00',
    urgente: false,
    leida: true,
    documentosAdjuntos: ['auto_archivo.pdf']
  }
];

type TabBandejaType = 'pendientes' | 'leidas' | 'archivadas' | 'urgentes';

export function ModuloBuzonNotificacionesV3() {
  const [tabActiva, setTabActiva] = useState<TabBandejaType>('pendientes');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>('TODOS');
  const [notificacionSeleccionada, setNotificacionSeleccionada] = useState<Notificacion | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const notificacionesFiltradas = useMemo(() => {
    let resultado = [...notificacionesMock];

    // Filtrar por tab
    switch (tabActiva) {
      case 'pendientes':
        resultado = resultado.filter(n => n.etapa === 'PENDIENTE_VERIFICACIÓN' || n.etapa === 'CLASIFICADA');
        break;
      case 'leidas':
        resultado = resultado.filter(n => n.etapa === 'DISTRIBUIDA');
        break;
      case 'archivadas':
        resultado = resultado.filter(n => n.etapa === 'ARCHIVADA');
        break;
      case 'urgentes':
        resultado = resultado.filter(n => n.urgente === true);
        break;
    }

    // Búsqueda
    if (busqueda) {
      resultado = resultado.filter(n =>
        n.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        n.asunto?.toLowerCase().includes(busqueda.toLowerCase()) ||
        n.remitente.toLowerCase().includes(busqueda.toLowerCase()) ||
        n.despachoOrigen.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Filtros
    if (filtroEstado !== 'TODOS') {
      resultado = resultado.filter(n => n.etapa === filtroEstado);
    }
    if (filtroUrgencia !== 'TODOS') {
      resultado = resultado.filter(n => n.urgente === (filtroUrgencia === 'URGENTE'));
    }

    return resultado;
  }, [tabActiva, busqueda, filtroEstado, filtroUrgencia]);

  const toggleSeleccion = (id: string) => {
    const nuevaSeleccion = new Set(seleccionadas);
    if (nuevaSeleccion.has(id)) {
      nuevaSeleccion.delete(id);
    } else {
      nuevaSeleccion.add(id);
    }
    setSeleccionadas(nuevaSeleccion);
  };

  const seleccionarTodas = () => {
    if (seleccionadas.size === notificacionesFiltradas.length) {
      setSeleccionadas(new Set());
    } else {
      setSeleccionadas(new Set(notificacionesFiltradas.map(n => n.id)));
    }
  };

  const marcarComoLeidas = () => {
    toast.success('Notificaciones marcadas como leídas');
    setSeleccionadas(new Set());
  };

  const archivarSeleccionadas = () => {
    toast.success(`${seleccionadas.size} notificaciones archivadas`);
    setSeleccionadas(new Set());
  };

  // Métricas
  const totalPendientes = notificacionesMock.filter(n => n.etapa === 'PENDIENTE_VERIFICACIÓN' || n.etapa === 'CLASIFICADA').length;
  const totalUrgentes = notificacionesMock.filter(n => n.urgente === true).length;
  const totalArchivadas = notificacionesMock.filter(n => n.etapa === 'ARCHIVADA').length;

  return (
    <div className="space-y-4">
      {/* Header con ModuleHeader - SIN toggleView */}
      <ModuleHeader
        title={isMobile ? 'Buzón Notificaciones' : 'Buzón de Notificaciones Judiciales'}
        subtitle="Gestión de notificaciones y comunicaciones oficiales"
        buttons={[
          {
            label: 'Registrar Notificación',
            labelMobile: 'Nuevo',
            icon: <Plus className="w-4 h-4" />,
            onClick: () => toast.info('Registrar Nueva Notificación'),
            variant: 'primary'
          }
        ]}
      />

      {/* Métricas */}
      <ModuleMetrics
        metrics={[
          {
            icon: <Mail className="w-5 h-5 text-blue-600" />,
            value: totalPendientes,
            label: 'No Leídas'
          },
          {
            icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
            value: totalUrgentes,
            label: 'Urgentes'
          },
          {
            icon: <Archive className="w-5 h-5 text-gray-600" />,
            value: totalArchivadas,
            label: 'Archivadas'
          }
        ]}
      />

      {/* Layout tipo Gmail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel izquierdo: Tabs y Lista */}
        <div className="lg:col-span-2 space-y-3">
          {/* Tabs */}
          <Card className="bg-white border border-gray-200">
            <div className="flex items-center gap-2 p-3 border-b border-gray-200">
              <button
                onClick={() => setTabActiva('pendientes')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                  tabActiva === 'pendientes' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Inbox className="w-4 h-4" />
                Pendientes
                <Badge className="ml-1 bg-blue-100 text-blue-700">{totalPendientes}</Badge>
              </button>

              <button
                onClick={() => setTabActiva('leidas')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                  tabActiva === 'leidas' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <MailOpen className="w-4 h-4" />
                Leídas
              </button>

              <button
                onClick={() => setTabActiva('archivadas')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                  tabActiva === 'archivadas' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Archive className="w-4 h-4" />
                Archivadas
              </button>

              <button
                onClick={() => setTabActiva('urgentes')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                  tabActiva === 'urgentes' ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Urgentes
                {totalUrgentes > 0 && <Badge className="ml-1 bg-red-100 text-red-700">{totalUrgentes}</Badge>}
              </button>
            </div>

            {/* Búsqueda y acciones masivas */}
            <div className="p-3 space-y-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar notificaciones..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>

              {seleccionadas.size > 0 && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <span className="text-sm font-semibold text-blue-700">
                    {seleccionadas.size} seleccionada{seleccionadas.size > 1 ? 's' : ''}
                  </span>
                  <Button
                    onClick={marcarComoLeidas}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Marcar como leídas
                  </Button>
                  <Button
                    onClick={archivarSeleccionadas}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    <Archive className="w-3 h-3 mr-1" />
                    Archivar
                  </Button>
                </div>
              )}
            </div>

            {/* Filtros */}
            <ModuleFilters
              filters={[
                {
                  label: 'Estado',
                  options: [
                    { value: 'TODOS', label: 'Todos' },
                    { value: 'PENDIENTE_VERIFICACIÓN', label: 'Pendientes' },
                    { value: 'DISTRIBUIDA', label: 'Leídas' },
                    { value: 'ARCHIVADA', label: 'Archivadas' }
                  ],
                  selected: filtroEstado,
                  onChange: setFiltroEstado
                },
                {
                  label: 'Urgencia',
                  options: [
                    { value: 'TODOS', label: 'Todos' },
                    { value: 'URGENTE', label: 'Urgentes' }
                  ],
                  selected: filtroUrgencia,
                  onChange: setFiltroUrgencia
                }
              ]}
            />

            {/* Lista de notificaciones */}
            <div className="divide-y divide-gray-200">
              {notificacionesFiltradas.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">No hay notificaciones</p>
                </div>
              ) : (
                notificacionesFiltradas.map((notif) => (
                  <ItemNotificacion
                    key={notif.id}
                    notificacion={notif}
                    seleccionada={seleccionadas.has(notif.id)}
                    onToggleSeleccion={toggleSeleccion}
                    onSeleccionar={() => setNotificacionSeleccionada(notif)}
                    activa={notificacionSeleccionada?.id === notif.id}
                  />
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Panel derecho: Vista previa */}
        <div className="lg:col-span-1">
          {notificacionSeleccionada ? (
            <VistaPreviaNotificacion notificacion={notificacionSeleccionada} />
          ) : (
            <Card className="bg-white border border-gray-200 p-6">
              <div className="text-center text-gray-400">
                <Mail className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">Selecciona una notificación</p>
                <p className="text-xs mt-1">para ver los detalles</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface ItemNotificacionProps {
  notificacion: Notificacion;
  seleccionada: boolean;
  onToggleSeleccion: (id: string) => void;
  onSeleccionar: () => void;
  activa: boolean;
}

function ItemNotificacion({ notificacion, seleccionada, onToggleSeleccion, onSeleccionar, activa }: ItemNotificacionProps) {
  const esNueva = notificacion.etapa === 'PENDIENTE_VERIFICACIÓN';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-all ${
        activa ? 'bg-blue-50 border-l-4 border-blue-500' : ''
      } ${esNueva ? 'bg-blue-50/30' : ''}`}
      onClick={onSeleccionar}
    >
      <Checkbox
        checked={seleccionada}
        onCheckedChange={() => onToggleSeleccion(notificacion.id)}
        onClick={(e) => e.stopPropagation()}
      />

      <div className="flex-shrink-0">
        {esNueva ? (
          <Mail className="w-5 h-5 text-blue-600" />
        ) : (
          <MailOpen className="w-5 h-5 text-gray-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={`text-sm truncate ${esNueva ? 'font-bold text-gray-900' : 'font-normal text-gray-700'}`}>
            {notificacion.remitente}
          </h4>
          {notificacion.urgente && (
            <Badge className="text-xs bg-red-100 text-red-700 flex-shrink-0">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Urgente
            </Badge>
          )}
        </div>
        <p className={`text-xs truncate ${esNueva ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
          {notificacion.asunto || 'Sin asunto'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">{notificacion.despachoOrigen}</span>
          <Circle className="w-1 h-1 fill-gray-300" />
          <span className="text-xs text-gray-400">
            {new Date(notificacion.fechaRadicacion).toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

interface VistaPreviaNotificacionProps {
  notificacion: Notificacion;
}

function VistaPreviaNotificacion({ notificacion }: VistaPreviaNotificacionProps) {
  return (
    <Card className="bg-white border border-gray-200 sticky top-4">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-sm" style={{ color: '#003DA5' }}>
              {notificacion.id}
            </h3>
            {notificacion.urgente && (
              <Badge className="mt-1 text-xs bg-red-100 text-red-700">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Urgente
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-500">De:</span>
            <p className="font-semibold text-gray-900">{notificacion.remitente}</p>
          </div>

          <div>
            <span className="text-gray-500">Despacho:</span>
            <p className="font-semibold text-gray-900">{notificacion.despachoOrigen}</p>
          </div>

          <div>
            <span className="text-gray-500">Fecha:</span>
            <p className="font-semibold text-gray-900">
              {new Date(notificacion.fechaRadicacion).toLocaleDateString()}
            </p>
          </div>

          {notificacion.radicadoExterno && (
            <div>
              <span className="text-gray-500">Radicado:</span>
              <p className="font-semibold text-gray-900">{notificacion.radicadoExterno}</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h4 className="text-xs font-bold text-gray-500 mb-1">ASUNTO</h4>
          <p className="text-sm text-gray-900">{notificacion.asunto || 'Sin asunto'}</p>
        </div>

        <div>
          <h4 className="text-xs font-bold text-gray-500 mb-1">TIPO PROCESO</h4>
          <Badge className="text-xs bg-gray-100 text-gray-700">
            {notificacion.tipoProceso}
          </Badge>
        </div>

        <div>
          <h4 className="text-xs font-bold text-gray-500 mb-1">DOCUMENTOS ADJUNTOS</h4>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            <span>{notificacion.documentosAdjuntos?.length || 0} archivo(s)</span>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-200 space-y-2">
          <Button
            onClick={() => toast.success('Abriendo expediente', { description: notificacion.id })}
            className="w-full"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver Expediente Completo
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => toast.info('Documentos', { description: notificacion.id })}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Descargar
            </Button>
            <Button
              onClick={() => toast.success('Archivado')}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Archive className="w-3 h-3 mr-1" />
              Archivar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}