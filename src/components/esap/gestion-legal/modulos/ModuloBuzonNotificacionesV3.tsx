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
import { notificacionesMock } from '../data/datosNotificaciones';
import { toast } from 'sonner@2.0.3';

type TabBandejaType = 'pendientes' | 'leidas' | 'archivadas' | 'urgentes';

export function ModuloBuzonNotificacionesV3() {
  const [tabActiva, setTabActiva] = useState<TabBandejaType>('pendientes');
  const [busqueda, setBusqueda] = useState('');
  const [notificacionSeleccionada, setNotificacionSeleccionada] = useState<Notificacion | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());

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
        resultado = resultado.filter(n => n.urgencia === 'URGENTE');
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

    return resultado;
  }, [tabActiva, busqueda]);

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
  const totalUrgentes = notificacionesMock.filter(n => n.urgencia === 'URGENTE').length;
  const totalArchivadas = notificacionesMock.filter(n => n.etapa === 'ARCHIVADA').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1">
          <h2 className="font-black leading-tight" style={{ color: '#003DA5', fontSize: '1.5rem' }}>
            Buzón de Notificaciones Judiciales
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Gestión de notificaciones y comunicaciones oficiales
          </p>
        </div>

        <button className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-400 transition-all" style={{ color: '#003DA5' }}>
          <Plus className="w-4 h-4" />Registrar Notificación
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 p-3">
            <div className="p-2.5 rounded-lg bg-blue-50 flex-shrink-0">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1.75rem' }}>
                {totalPendientes}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">No Leídas</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 p-3">
            <div className="p-2.5 rounded-lg bg-red-50 flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1.75rem' }}>
                {totalUrgentes}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Urgentes</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 p-3">
            <div className="p-2.5 rounded-lg bg-gray-50 flex-shrink-0">
              <Archive className="w-5 h-5 text-gray-600" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1.75rem' }}>
                {totalArchivadas}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Archivadas</p>
            </div>
          </div>
        </Card>
      </div>

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
          {notificacion.urgencia === 'URGENTE' && (
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
            {new Date(notificacion.fechaRecepcion).toLocaleDateString()}
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
            {notificacion.urgencia === 'URGENTE' && (
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
              {new Date(notificacion.fechaRecepcion).toLocaleDateString()}
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
