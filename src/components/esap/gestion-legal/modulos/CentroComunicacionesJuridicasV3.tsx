/**
 * CentroComunicacionesJuridicasV3 - MÓDULO UNIFICADO
 * UNIFICA: Buzón Notificaciones (MOD-04) + Buzón Oficina Jurídica (MOD-08)
 * 
 * DISEÑO 100% ESTANDARIZADO CON PATRÓN WORLD CLASS
 * Layout tipo Gmail/Outlook Premium con clasificación inteligente
 * 
 * TABS UNIFICADOS:
 * - 📬 Judiciales: Notificaciones oficiales de juzgados
 * - 📧 Correos: Emails entrantes con clasificación IA
 * - 📄 Oficios: Comunicaciones internas
 * - ⚠️ Urgentes: Todas las comunicaciones urgentes
 * - 📦 Archivadas: Todas las archivadas
 */

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Mail, MailOpen, Inbox, Archive, AlertTriangle, CheckCircle,
  Eye, Plus, Search, XCircle, Send, FileText, Download,
  Circle, Check, Sparkles, User, Building, Clock, List, Columns3,
  Filter, Star, Gavel, Scale, Briefcase, Paperclip
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Checkbox } from '../../../ui/checkbox';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { ModalNuevaComunicacion, NuevaComunicacionData } from './ModalNuevaComunicacion';
import { ModalExpedienteComunicacion } from './ModalExpedienteComunicacion';
import { correosJuridicosService, CorreoJuridico } from '../../../../services/api/legal.service';
import { RefreshCw, Loader2 } from 'lucide-react';

// TIPOS UNIFICADOS
type TipoComunicacion = 'JUDICIAL' | 'CORREO' | 'OFICIO';
type EstadoComunicacion = 'PENDIENTE' | 'LEIDA' | 'ARCHIVADA';

interface ComunicacionUnificada {
  id: string;
  tipo: TipoComunicacion;
  tipoProceso?: string;
  asunto: string;
  descripcion: string;
  remitente: string;
  despachoOrigen?: string;
  radicadoExterno?: string;
  fechaRadicacion: Date;
  urgente: boolean;
  leida: boolean;
  estado: EstadoComunicacion;
  documentosAdjuntos: string[];
  clasificacionIA?: {
    tipoDetectado: string;
    moduloSugerido: string;
    confianza: number;
  };
}

type TabUnificadaType = 'judiciales' | 'correos' | 'oficios' | 'urgentes' | 'archivadas';
type VistaModulo = 'inbox' | 'lista';

export function ModuloCentroComunicacionesJuridicasV3() {
  console.log('🔄 ModuloCentroComunicacionesJuridicasV3 renderizado');

  const [tabActiva, setTabActiva] = useState<TabUnificadaType>('judiciales');
  const [busqueda, setBusqueda] = useState('');
  const [comunicacionSeleccionada, setComunicacionSeleccionada] = useState<ComunicacionUnificada | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [tipoVista, setTipoVista] = useState<VistaModulo>('inbox');

  // Estado reactivo para las comunicaciones
  const [comunicaciones, setComunicaciones] = useState<ComunicacionUnificada[]>([]);

  // Estados para modales
  const [modalNuevaComunicacionOpen, setModalNuevaComunicacionOpen] = useState(false);
  const [modalExpedienteOpen, setModalExpedienteOpen] = useState(false);
  const [comunicacionParaExpediente, setComunicacionParaExpediente] = useState<ComunicacionUnificada | null>(null);

  // Estados para carga de datos desde API
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);

  // Función para mapear correos de API a formato UI
  const mapCorreoToUI = (correo: CorreoJuridico): ComunicacionUnificada => ({
    id: correo.id,
    tipo: correo.tipo as TipoComunicacion,
    asunto: correo.asunto,
    descripcion: correo.cuerpoTexto || '',
    remitente: correo.remitenteNombre || correo.remitenteEmail,
    fechaRadicacion: new Date(correo.fechaRecepcion),
    urgente: correo.urgente,
    leida: correo.leido,
    estado: correo.archivado ? 'ARCHIVADA' : (correo.leido ? 'LEIDA' : 'PENDIENTE'),
    documentosAdjuntos: correo.tieneAdjuntos ? ['adjunto'] : [],
    clasificacionIA: correo.moduloSugerido ? {
      tipoDetectado: correo.categoria || 'Correo',
      moduloSugerido: correo.moduloSugerido,
      confianza: correo.confianzaClasificacion || 70
    } : undefined
  });

  // Cargar correos desde API
  const loadCorreosFromAPI = async () => {
    setLoading(true);
    try {
      const correos = await correosJuridicosService.getCorreos();
      if (correos && correos.length > 0) {
        setComunicaciones(correos.map(mapCorreoToUI));
        setApiConnected(true);
        console.log('✅ Correos cargados desde API:', correos.length);
      } else {
        // No hay correos en la API
        setComunicaciones([]);
        console.log('⚠️ Sin datos de API');
      }
    } catch (error) {
      console.error('❌ Error cargando correos:', error);
      setComunicaciones([]);
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar con Microsoft Graph
  const handleSyncCorreos = async () => {
    setSyncing(true);
    try {
      const result = await correosJuridicosService.syncCorreos();
      toast.success(`✅ Sincronización completada: ${result.synced} correos nuevos`, {
        description: result.errors > 0 ? `${result.errors} errores` : undefined
      });
      await loadCorreosFromAPI();
    } catch (error) {
      console.error('Error sincronizando:', error);
      toast.error('Error al sincronizar con Microsoft 365');
    } finally {
      setSyncing(false);
    }
  };

  // Cargar datos al montar
  useEffect(() => {
    loadCorreosFromAPI();
  }, []);



  const comunicacionesFiltradas = useMemo(() => {
    let resultado = [...comunicaciones];

    // Filtrar por tab
    switch (tabActiva) {
      case 'judiciales':
        resultado = resultado.filter(c => c.tipo === 'JUDICIAL' && c.estado !== 'ARCHIVADA');
        break;
      case 'correos':
        resultado = resultado.filter(c => c.tipo === 'CORREO' && c.estado !== 'ARCHIVADA');
        break;
      case 'oficios':
        resultado = resultado.filter(c => c.tipo === 'OFICIO' && c.estado !== 'ARCHIVADA');
        break;
      case 'urgentes':
        resultado = resultado.filter(c => c.urgente && c.estado !== 'ARCHIVADA');
        break;
      case 'archivadas':
        resultado = resultado.filter(c => c.estado === 'ARCHIVADA');
        break;
    }

    // Filtrar por búsqueda
    if (busqueda) {
      resultado = resultado.filter(c =>
        c.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.asunto.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.remitente.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.despachoOrigen?.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Ordenar: no leídas primero, luego por fecha
    return resultado.sort((a, b) => {
      if (a.leida !== b.leida) return a.leida ? 1 : -1;
      return b.fechaRadicacion.getTime() - a.fechaRadicacion.getTime();
    });
  }, [comunicaciones, tabActiva, busqueda]);

  // Calcular estadísticas
  const totalNoLeidas = comunicaciones.filter(c => !c.leida && c.estado !== 'ARCHIVADA').length;
  const totalUrgentes = comunicaciones.filter(c => c.urgente && c.estado !== 'ARCHIVADA').length;
  const totalArchivadas = comunicaciones.filter(c => c.estado === 'ARCHIVADA').length;

  const contadoresTabs = {
    judiciales: comunicaciones.filter(c => c.tipo === 'JUDICIAL' && c.estado !== 'ARCHIVADA').length,
    correos: comunicaciones.filter(c => c.tipo === 'CORREO' && c.estado !== 'ARCHIVADA').length,
    oficios: comunicaciones.filter(c => c.tipo === 'OFICIO' && c.estado !== 'ARCHIVADA').length,
    urgentes: totalUrgentes,
    archivadas: totalArchivadas
  };

  const handleMarcarLeida = async (id: string) => {
    console.log('📘 Marcando como leída:', id);

    // Actualizar estado local inmediatamente
    setComunicaciones(prevComs =>
      prevComs.map(com =>
        com.id === id
          ? { ...com, leida: true, estado: 'LEIDA' as EstadoComunicacion }
          : com
      )
    );

    // Actualizar también la comunicación seleccionada si es la misma
    if (comunicacionSeleccionada?.id === id) {
      setComunicacionSeleccionada(prev =>
        prev ? { ...prev, leida: true, estado: 'LEIDA' as EstadoComunicacion } : null
      );
    }

    // Llamar API (no bloquea UI)
    try {
      await correosJuridicosService.markAsRead(id);
    } catch (error) {
      console.error('Error marcando como leída en API:', error);
    }

    toast.success('Comunicación marcada como leída', {
      icon: <CheckCircle className="w-4 h-4" />
    });
  };

  const handleArchivar = async (id: string) => {
    console.log('📦 Archivando comunicación:', id);

    // Actualizar estado local inmediatamente
    setComunicaciones(prevComs =>
      prevComs.map(com =>
        com.id === id
          ? { ...com, estado: 'ARCHIVADA' as EstadoComunicacion }
          : com
      )
    );

    // Limpiar selección si la comunicación archivada estaba seleccionada
    if (comunicacionSeleccionada?.id === id) {
      setComunicacionSeleccionada(null);
    }

    // Llamar API (no bloquea UI)
    try {
      await correosJuridicosService.archive(id);
    } catch (error) {
      console.error('Error archivando en API:', error);
    }

    toast.success('Comunicación archivada correctamente', {
      icon: <Archive className="w-4 h-4" />
    });
  };

  const handleVerExpediente = (com: ComunicacionUnificada) => {
    console.log('👁️ handleVerExpediente ejecutado:', com.id);
    console.log('👁️ Comunicación completa:', com);
    setComunicacionParaExpediente(com);
    setModalExpedienteOpen(true);
    console.log('👁️ Modal debería estar abierto ahora');
  };

  const handleSeleccionarTodas = () => {
    if (seleccionadas.size === comunicacionesFiltradas.length) {
      setSeleccionadas(new Set());
    } else {
      setSeleccionadas(new Set(comunicacionesFiltradas.map(c => c.id)));
    }
  };

  const handleMarcarLeidasSeleccionadas = () => {
    console.log('🔵 Marcando como leídas:', Array.from(seleccionadas));
    setComunicaciones(prevComs =>
      prevComs.map(com =>
        seleccionadas.has(com.id)
          ? { ...com, leida: true, estado: 'LEIDA' as EstadoComunicacion }
          : com
      )
    );
    toast.success(`${seleccionadas.size} comunicaciones marcadas como leídas`, {
      icon: <CheckCircle className="w-4 h-4" />
    });
    setSeleccionadas(new Set());
  };

  const handleArchivarSeleccionadas = () => {
    console.log('📦 Archivando:', Array.from(seleccionadas));
    setComunicaciones(prevComs =>
      prevComs.map(com =>
        seleccionadas.has(com.id)
          ? { ...com, estado: 'ARCHIVADA' as EstadoComunicacion }
          : com
      )
    );

    // Limpiar selección de comunicación si estaba seleccionada
    if (comunicacionSeleccionada && seleccionadas.has(comunicacionSeleccionada.id)) {
      setComunicacionSeleccionada(null);
    }

    toast.success(`${seleccionadas.size} comunicaciones archivadas correctamente`, {
      icon: <Archive className="w-4 h-4" />
    });
    setSeleccionadas(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <ModuleHeader
            title={isMobile ? 'Centro Comunicaciones' : 'Centro de Comunicaciones Jurídicas'}
            subtitle="Buzón unificado inteligente con clasificación automática"
            toggleView={{
              current: tipoVista,
              onChange: (view) => setTipoVista(view as VistaModulo),
              options: [
                { label: 'Bandeja', icon: <Inbox className="w-4 h-4" />, value: 'inbox' },
                { label: 'Lista', icon: <List className="w-4 h-4" />, value: 'lista' }
              ]
            }}
            buttons={[
              {
                label: syncing ? 'Sincronizando...' : 'Sincronizar',
                labelMobile: syncing ? '...' : 'Sync',
                icon: syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />,
                onClick: handleSyncCorreos,
                variant: 'outline' as const,
                disabled: syncing
              },
              {
                label: 'Nueva Comunicación',
                labelMobile: 'Nueva',
                icon: <Plus className="w-4 h-4" />,
                onClick: () => setModalNuevaComunicacionOpen(true),
                variant: 'primary' as const
              }
            ]}
          />
        </div>

        {/* Info Tooltip - Discreto pero útil */}
        <div className="flex-shrink-0 pt-1">
          <ModuleInfoTooltip
            title="Acerca de este módulo"
            variant="icon"
            sections={[
              {
                label: "Módulo Unificado",
                content: "Este módulo integra dos buzones anteriormente separados: 'Buzón de Notificaciones Judiciales' (notificaciones oficiales de juzgados y despachos) y 'Buzón Oficina Jurídica' (correos electrónicos entrantes con clasificación inteligente).",
                type: "info"
              },
              {
                label: "📬 Judiciales",
                content: "Notificaciones oficiales de juzgados: demandas, autos, citaciones, requerimientos procesales con radicado externo.",
                type: "default"
              },
              {
                label: "📧 Correos",
                content: "Emails entrantes con clasificación IA automática que sugiere el módulo destino según el contenido (Asesoría Jurídica, Órganos de Control, etc.).",
                type: "premium"
              },
              {
                label: "📄 Oficios",
                content: "Comunicaciones internas de ESAP: circulares, oficios, memorandos de áreas administrativas.",
                type: "default"
              },
              {
                label: "Beneficios de la Unificación",
                content: "Un solo punto de acceso para todas las comunicaciones jurídicas, búsqueda global unificada, vista transversal de urgentes y archivadas, y gestión eficiente con acciones masivas.",
                type: "success"
              }
            ]}
          />
        </div>
      </div>

      {/* Métricas */}
      <ModuleMetrics
        metrics={[
          {
            label: 'No Leídas',
            value: totalNoLeidas,
            icon: <Mail className="w-5 h-5 text-blue-600" />,
            color: '#003DA5'
          },
          {
            label: 'Urgentes',
            value: totalUrgentes,
            icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
            color: '#DC2626'
          },
          {
            label: 'Archivadas',
            value: totalArchivadas,
            icon: <Archive className="w-5 h-5 text-gray-600" />,
            color: '#6B7280'
          }
        ]}
      />

      {/* Tabs Unificados */}
      <Card className="p-1">
        <div className="flex gap-1 flex-wrap">
          <TabButton
            active={tabActiva === 'judiciales'}
            onClick={() => setTabActiva('judiciales')}
            icon={<Gavel className="w-4 h-4" />}
            label="Judiciales"
            count={contadoresTabs.judiciales}
            color="#003DA5"
          />
          <TabButton
            active={tabActiva === 'correos'}
            onClick={() => setTabActiva('correos')}
            icon={<Mail className="w-4 h-4" />}
            label="Correos"
            count={contadoresTabs.correos}
            color="#6B7280"
          />
          <TabButton
            active={tabActiva === 'oficios'}
            onClick={() => setTabActiva('oficios')}
            icon={<FileText className="w-4 h-4" />}
            label="Oficios"
            count={contadoresTabs.oficios}
            color="#6B7280"
          />
          <TabButton
            active={tabActiva === 'urgentes'}
            onClick={() => setTabActiva('urgentes')}
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Urgentes"
            count={contadoresTabs.urgentes}
            color="#DC2626"
            urgent
          />
          <TabButton
            active={tabActiva === 'archivadas'}
            onClick={() => setTabActiva('archivadas')}
            icon={<Archive className="w-4 h-4" />}
            label="Archivadas"
            count={contadoresTabs.archivadas}
            color="#6B7280"
          />
        </div>
      </Card>

      {/* Búsqueda y Acciones Masivas */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar comunicaciones..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
          {seleccionadas.size > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarcarLeidasSeleccionadas}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar leídas ({seleccionadas.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchivarSeleccionadas}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archivar ({seleccionadas.size})
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Vista Inbox (Gmail style) */}
      {tipoVista === 'inbox' && (
        <VistaInbox
          comunicaciones={comunicacionesFiltradas}
          comunicacionSeleccionada={comunicacionSeleccionada}
          onSeleccionar={setComunicacionSeleccionada}
          seleccionadas={seleccionadas}
          onToggleSeleccion={(id) => {
            const nuevas = new Set(seleccionadas);
            if (nuevas.has(id)) {
              nuevas.delete(id);
            } else {
              nuevas.add(id);
            }
            setSeleccionadas(nuevas);
          }}
          onSeleccionarTodas={handleSeleccionarTodas}
          onMarcarLeida={handleMarcarLeida}
          onArchivar={handleArchivar}
          onVerExpediente={handleVerExpediente}
        />
      )}

      {/* Vista Lista */}
      {tipoVista === 'lista' && (
        <VistaLista
          comunicaciones={comunicacionesFiltradas}
          onMarcarLeida={handleMarcarLeida}
          onArchivar={handleArchivar}
        />
      )}

      {/* Modal Nueva Comunicación */}
      <ModalNuevaComunicacion
        isOpen={modalNuevaComunicacionOpen}
        onClose={() => setModalNuevaComunicacionOpen(false)}
        onSubmit={(data) => {
          console.log('Nueva comunicación:', data);
          toast.success('Comunicación registrada exitosamente');
          setModalNuevaComunicacionOpen(false);
        }}
      />

      {/* Modal Expediente Comunicación */}
      {comunicacionParaExpediente && (
        <ModalExpedienteComunicacion
          isOpen={modalExpedienteOpen}
          onClose={() => {
            setModalExpedienteOpen(false);
            setComunicacionParaExpediente(null);
          }}
          comunicacion={comunicacionParaExpediente}
        />
      )}
    </div>
  );
}

// ==================== TAB BUTTON ====================
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
  urgent?: boolean;
}

function TabButton({ active, onClick, icon, label, count, color, urgent }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all
        ${active
          ? 'bg-white shadow-sm border border-gray-200'
          : 'hover:bg-gray-50'
        }
      `}
    >
      <div style={{ color: active ? color : '#6B7280' }}>
        {icon}
      </div>
      <span className={`text-sm font-semibold ${active ? 'text-gray-900' : 'text-gray-600'}`}>
        {label}
      </span>
      <Badge
        className={`ml-1 ${urgent && count > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}
      >
        {count}
      </Badge>
    </button>
  );
}

// ==================== VISTA INBOX (Gmail Style) ====================
interface VistaInboxProps {
  comunicaciones: ComunicacionUnificada[];
  comunicacionSeleccionada: ComunicacionUnificada | null;
  onSeleccionar: (com: ComunicacionUnificada) => void;
  seleccionadas: Set<string>;
  onToggleSeleccion: (id: string) => void;
  onSeleccionarTodas: () => void;
  onMarcarLeida: (id: string) => void;
  onArchivar: (id: string) => void;
  onVerExpediente: (com: ComunicacionUnificada) => void;
}

function VistaInbox({
  comunicaciones,
  comunicacionSeleccionada,
  onSeleccionar,
  seleccionadas,
  onToggleSeleccion,
  onSeleccionarTodas,
  onMarcarLeida,
  onArchivar,
  onVerExpediente
}: VistaInboxProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Panel Izquierdo: Lista de Comunicaciones */}
      <div className="lg:col-span-2">
        <Card className="overflow-hidden">
          {/* Header de lista con selección masiva */}
          <div className="p-3 border-b bg-gray-50 flex items-center gap-3">
            <Checkbox
              checked={seleccionadas.size === comunicaciones.length && comunicaciones.length > 0}
              onCheckedChange={onSeleccionarTodas}
            />
            <span className="text-sm text-gray-600">
              {comunicaciones.length} comunicaciones
            </span>
          </div>

          {/* Lista de comunicaciones */}
          <div className="divide-y">
            {comunicaciones.map((com) => (
              <ItemComunicacion
                key={com.id}
                comunicacion={com}
                seleccionada={comunicacionSeleccionada?.id === com.id}
                marcada={seleccionadas.has(com.id)}
                onSeleccionar={onSeleccionar}
                onToggleMarcada={onToggleSeleccion}
              />
            ))}

            {/* Empty state */}
            {comunicaciones.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Inbox className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="font-semibold">No hay comunicaciones</p>
                <p className="text-sm">Selecciona otra categoría o ajusta los filtros</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Panel Derecho: Vista Previa */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4 h-[calc(100vh-200px)]">
          <div className="overflow-y-auto h-full">
            {comunicacionSeleccionada ? (
              <VistaPreviaComunicacion
                comunicacion={comunicacionSeleccionada}
                onMarcarLeida={onMarcarLeida}
                onArchivar={onArchivar}
                onVerExpediente={onVerExpediente}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="font-semibold">Selecciona una comunicación</p>
                  <p className="text-sm">para ver los detalles</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ==================== ITEM COMUNICACIÓN ====================
interface ItemComunicacionProps {
  comunicacion: ComunicacionUnificada;
  seleccionada: boolean;
  marcada: boolean;
  onSeleccionar: (com: ComunicacionUnificada) => void;
  onToggleMarcada: (id: string) => void;
}

function ItemComunicacion({
  comunicacion,
  seleccionada,
  marcada,
  onSeleccionar,
  onToggleMarcada
}: ItemComunicacionProps) {
  const iconoTipo = {
    JUDICIAL: <Gavel className="w-4 h-4 text-blue-600" />,
    CORREO: <Mail className="w-4 h-4 text-gray-600" />,
    OFICIO: <FileText className="w-4 h-4 text-gray-600" />
  };

  return (
    <div
      className={`
        p-3 cursor-pointer transition-colors flex gap-3
        ${seleccionada ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'}
        ${!comunicacion.leida ? 'bg-blue-50/30' : ''}
      `}
      onClick={() => onSeleccionar(comunicacion)}
    >
      <div className="pt-1">
        <Checkbox
          checked={marcada}
          onCheckedChange={() => onToggleMarcada(comunicacion.id)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {iconoTipo[comunicacion.tipo]}
            <span className={`text-sm truncate ${!comunicacion.leida ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
              {comunicacion.remitente}
            </span>
            {comunicacion.urgente && (
              <Badge className="bg-red-100 text-red-700 text-xs">
                Urgente
              </Badge>
            )}
            {comunicacion.clasificacionIA && (
              <Badge className="bg-purple-100 text-purple-700 text-xs flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                IA
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {comunicacion.fechaRadicacion.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div className="mb-1">
          <p className={`text-sm truncate ${!comunicacion.leida ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
            {comunicacion.asunto}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          {comunicacion.despachoOrigen && (
            <span className="truncate">{comunicacion.despachoOrigen}</span>
          )}
          {comunicacion.documentosAdjuntos.length > 0 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {comunicacion.documentosAdjuntos.length}
              </span>
            </>
          )}
        </div>
      </div>

      <div>
        {comunicacion.leida ? (
          <MailOpen className="w-4 h-4 text-gray-400" />
        ) : (
          <Mail className="w-4 h-4 text-blue-600" />
        )}
      </div>
    </div>
  );
}

// ==================== VISTA PREVIA COMUNICACIÓN ====================
interface VistaPreviaComunicacionProps {
  comunicacion: ComunicacionUnificada;
  onMarcarLeida: (id: string) => void;
  onArchivar: (id: string) => void;
  onVerExpediente: (com: ComunicacionUnificada) => void;
}

function VistaPreviaComunicacion({
  comunicacion,
  onMarcarLeida,
  onArchivar,
  onVerExpediente
}: VistaPreviaComunicacionProps) {
  const badgeTipo = {
    JUDICIAL: { label: 'Judicial', color: 'bg-blue-100 text-blue-700' },
    CORREO: { label: 'Correo', color: 'bg-gray-100 text-gray-700' },
    OFICIO: { label: 'Oficio', color: 'bg-green-100 text-green-700' }
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 pb-4 border-b">
        <div className="flex items-start justify-between mb-2">
          <Badge className={badgeTipo[comunicacion.tipo].color}>
            {badgeTipo[comunicacion.tipo].label}
          </Badge>
          {comunicacion.urgente && (
            <Badge className="bg-red-100 text-red-700">
              Urgente
            </Badge>
          )}
        </div>
        <h3 className="font-bold text-gray-900 mb-2">{comunicacion.asunto}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="w-4 h-4" />
          <span>{comunicacion.remitente}</span>
        </div>
        {comunicacion.despachoOrigen && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
            <Building className="w-4 h-4" />
            <span>{comunicacion.despachoOrigen}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
          <Clock className="w-4 h-4" />
          <span>{comunicacion.fechaRadicacion.toLocaleDateString('es-CO', { dateStyle: 'full' })}</span>
        </div>
      </div>

      {/* Clasificación IA - COMENTADO: No implementado aún, pendiente para futuras versiones */}
      {/* 
      {comunicacion.clasificacionIA && (
        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-bold text-purple-900">Clasificación Inteligente</span>
          </div>
          <div className="text-xs text-purple-700 space-y-1">
            <p><strong>Tipo detectado:</strong> {comunicacion.clasificacionIA.tipoDetectado}</p>
            <p><strong>Módulo sugerido:</strong> {comunicacion.clasificacionIA.moduloSugerido}</p>
            <p><strong>Confianza:</strong> {comunicacion.clasificacionIA.confianza}%</p>
          </div>
        </div>
      )}
      */}

      {/* Radicado externo */}
      {comunicacion.radicadoExterno && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Radicado Externo:</p>
          <p className="text-sm font-mono font-bold text-gray-900">{comunicacion.radicadoExterno}</p>
        </div>
      )}

      {/* Tipo de proceso */}
      {comunicacion.tipoProceso && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">Tipo de Proceso:</p>
          <Badge variant="outline">{comunicacion.tipoProceso}</Badge>
        </div>
      )}

      {/* Descripción - Limpia la nota confidencial si existe */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Descripción:</p>
        <p className="text-sm text-gray-700">
          {comunicacion.descripcion.includes('NOTA CONFIDENCIAL')
            ? comunicacion.descripcion.split('NOTA CONFIDENCIAL')[0].trim()
            : comunicacion.descripcion}
        </p>
      </div>

      {/* Nota Confidencial - Se muestra en recuadro separado si existe */}
      {comunicacion.descripcion.includes('NOTA CONFIDENCIAL') && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ Nota de Confidencialidad:</p>
          <p className="text-xs text-amber-700">
            {comunicacion.descripcion.substring(comunicacion.descripcion.indexOf('NOTA CONFIDENCIAL'))}
          </p>
        </div>
      )}

      {/* Documentos adjuntos - Solo indicador, ver detalles en el modal */}
      {comunicacion.documentosAdjuntos.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
            <Paperclip className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">
              Tiene archivos adjuntos
            </span>
            <span className="text-xs text-blue-500 ml-auto">Ver en expediente completo</span>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="space-y-2 pt-4 border-t">
        <Button
          className="w-full"
          style={{ background: '#003DA5' }}
          onClick={() => onVerExpediente(comunicacion)}
        >
          <Eye className="w-4 h-4 mr-2" />
          Ver Expediente Completo
        </Button>
        {!comunicacion.leida && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onMarcarLeida(comunicacion.id)}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Marcar como Leída
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onArchivar(comunicacion.id)}
        >
          <Archive className="w-4 h-4 mr-2" />
          Archivar
        </Button>
      </div>
    </div>
  );
}

// ==================== VISTA LISTA ====================
interface VistaListaProps {
  comunicaciones: ComunicacionUnificada[];
  onMarcarLeida: (id: string) => void;
  onArchivar: (id: string) => void;
}

function VistaLista({ comunicaciones, onMarcarLeida, onArchivar }: VistaListaProps) {
  const badgeTipo = {
    JUDICIAL: { label: 'Judicial', color: 'bg-blue-100 text-blue-700' },
    CORREO: { label: 'Correo', color: 'bg-gray-100 text-gray-700' },
    OFICIO: { label: 'Oficio', color: 'bg-green-100 text-green-700' }
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Asunto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Remitente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Fecha</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Estado</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {comunicaciones.map((com) => (
              <tr key={com.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-bold" style={{ color: '#003DA5' }}>
                  {com.id}
                </td>
                <td className="px-4 py-3">
                  <Badge className={badgeTipo[com.tipo].color}>
                    {badgeTipo[com.tipo].label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">
                  {com.asunto}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {com.remitente}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {com.fechaRadicacion.toLocaleDateString('es-CO')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {!com.leida && (
                      <Badge className="bg-blue-100 text-blue-700 text-xs">
                        No leída
                      </Badge>
                    )}
                    {com.urgente && (
                      <Badge className="bg-red-100 text-red-700 text-xs">
                        Urgente
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {!com.leida && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onMarcarLeida(com.id)}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onArchivar(com.id)}
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
