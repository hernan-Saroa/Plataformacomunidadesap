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
 * - 📤 Enviados: Comunicaciones enviadas
 * - ⚠️ Urgentes: Todas las comunicaciones urgentes
 * - 📦 Archivadas: Todas las archivadas
 */

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Mail, MailOpen, Inbox, Archive, AlertTriangle, CheckCircle,
  Eye, Plus, Search, XCircle, Send, FileText, Download,
  Circle, Check, Sparkles, User, Building, Clock, List, Columns3,
  Filter, Star, Gavel, Scale, Briefcase, Paperclip, ChevronLeft, ChevronRight,
  RefreshCw, Loader2, Reply, ArrowRight, Link2, Pencil, Trash2, PenLine
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Checkbox } from '@esap-mfe/shared-ui/checkbox';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import { toast } from 'sonner';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { ModalNuevaComunicacion, NuevaComunicacionData, DraftSavePayload } from './ModalNuevaComunicacion';
import { ModalResponderCorreo, CorreoOriginalData } from './ModalResponderCorreo';
import { ModalExpedienteComunicacion } from './ModalExpedienteComunicacion';
import { DetalleCorreoModal } from './DetalleCorreoModal';
import { correosJuridicosService, CorreoJuridico, borradoresCorreosService, BorradorCorreo as BorradorCorreoDTO, BorradorAdjunto } from '../../../../services/api/legal.service';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import { VistaArchivados, ItemArchivado, EstadoArchivado } from '../design-system/VistaArchivados';
import { usePermisos, PERMISOS } from '../config/PermisosContext';

// TIPOS UNIFICADOS
type TipoComunicacion = 'JUDICIAL' | 'CORREO' | 'OFICIO' | 'ENVIADO';
type EstadoComunicacion = 'PENDIENTE' | 'LEIDA' | 'ARCHIVADA' | 'ENVIADA';

interface ComunicacionUnificada {
  id: string;
  tipo: TipoComunicacion;
  buzon?: string; // bandeja de origen: JUDICIAL | CORREOS
  tipoProceso?: string;
  asunto: string;
  descripcion: string;
  remitente: string;
  remitenteEmail?: string;
  destinatario?: string; // Para comunicaciones enviadas
  cc?: string; // CC — correos en copia (comunicaciones enviadas)
  cco?: string; // CCO — correos en copia oculta (comunicaciones enviadas)
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
  // Threading
  isReplied?: boolean;
  parentEmailId?: string;
  categoria?: string;
  // NLP entities
  procesoIdSugerido?: string;
  implicadoSugerido?: string;
  submoduloSugerido?: string;
  moduloSugerido?: string;
  confianzaClasificacion?: number;
  cuerpoHtml?: string;
  expedienteId?: string;
}

interface ModuloDestinoUI {
  id: string;
  nombre: string;
  nombreCorto: string;
  color: string;
  aliases: string[];
}

// Normaliza una lista de correos guardada en BD a una cadena legible "a@x.com, b@y.com".
// Es tolerante a las distintas formas en que se persiste este dato:
//   - arreglo JSON de strings           → correos enviados (CC/CCO)
//   - arreglo JSON de objetos de Graph   → correos recibidos ({ emailAddress: { address } })
//   - texto plano separado por comas
// Devuelve '' si no hay datos.
function parseListaCorreos(raw?: string | null): string {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item: any) =>
          typeof item === 'string'
            ? item
            : (item?.emailAddress?.address || item?.address || item?.email || '')
        )
        .filter(Boolean)
        .join(', ');
    }
  } catch {
    // No era JSON: se asume texto plano ya separado por comas
  }
  return String(raw);
}

const MODULOS_DESTINO_UI: ModuloDestinoUI[] = [
  {
    id: 'defensa-judicial',
    nombre: 'Defensa Judicial',
    nombreCorto: 'Defensa',
    color: '#DC2626',
    aliases: ['defensa judicial', 'defensa', 'judicial']
  },
  {
    id: 'asesoria-juridica',
    nombre: 'Asesoría Jurídica',
    nombreCorto: 'Asesoría',
    color: '#7C3AED',
    aliases: ['asesoria juridica', 'asesoría jurídica', 'asesoria', 'consultas']
  },
  {
    id: 'juzgamiento',
    nombre: 'Juzgamiento Disciplinario',
    nombreCorto: 'Disciplinario',
    color: '#EA580C',
    aliases: ['juzgamiento', 'disciplinario']
  },
  {
    id: 'organos-control',
    nombre: 'Órganos de Control',
    nombreCorto: 'Org. Control',
    color: '#0284C7',
    aliases: ['organos de control', 'órganos de control', 'control']
  },
  {
    id: 'procesos-coactivos',
    nombre: 'Procesos Coactivos',
    nombreCorto: 'Coactivos',
    color: '#059669',
    aliases: ['procesos coactivos', 'coactivos']
  },
  {
    id: 'terminos-informes',
    nombre: 'Términos e Informes',
    nombreCorto: 'Términos',
    color: '#6B7280',
    aliases: ['terminos e informes', 'términos e informes', 'terminos', 'informes']
  }
];

const normalizarTexto = (value?: string) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getConfianzaPercent = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return value <= 1 ? Math.round(value * 100) : Math.round(value);
};

const getModuloDestinoUI = (moduloSugerido?: string): ModuloDestinoUI | undefined => {
  const normalized = normalizarTexto(moduloSugerido);
  if (!normalized) return undefined;

  return MODULOS_DESTINO_UI.find((mod) =>
    normalizarTexto(mod.id) === normalized ||
    normalizarTexto(mod.nombre) === normalized ||
    normalizarTexto(mod.nombreCorto) === normalized ||
    mod.aliases.some((alias) => normalizarTexto(alias) === normalized)
  );
};

type TabUnificadaType = 'judiciales' | 'correos' | 'oficios' | 'enviados' | 'respuestas' | 'urgentes' | 'archivadas' | 'borradores';
type VistaModulo = 'inbox' | 'lista';

export function ModuloCentroComunicacionesJuridicasV3() {
  console.log('🔄 ModuloCentroComunicacionesJuridicasV3 renderizado');

  // ✅ Obtener permisos del usuario actual
  const { usuario } = usePermisos();

  // ── Acceso por buzón institucional (segregación de funciones) ──
  // Cada buzón (Judicial / Correos Institucional) es administrado por funcionarios
  // distintos; el usuario solo ve y gestiona las comunicaciones de los buzones que
  // le fueron asignados según sus permisos.
  const puedeBuzonJudicial = authService.hasPermission(Permissions.GESTION_LEGAL_COMUNICACIONES_BUZON_JUDICIAL);
  const puedeBuzonCorreos = authService.hasPermission(Permissions.GESTION_LEGAL_COMUNICACIONES_BUZON_CORREOS);
  // Poder redactar/guardar borradores requiere permiso de creación de comunicaciones.
  const puedeCrear = authService.hasPermission(Permissions.GESTION_LEGAL_COMUNICACIONES_CREATE);
  const buzonesPermitidos: string[] = [
    ...(puedeBuzonJudicial ? ['JUDICIAL'] : []),
    ...(puedeBuzonCorreos ? ['CORREOS'] : []),
  ];
  const buzonPermitido = (c: ComunicacionUnificada): boolean =>
    buzonesPermitidos.includes(((c.buzon as string) || 'JUDICIAL').toUpperCase());
  // Los tabs Judiciales/Oficios pertenecen al buzón JUDICIAL; Correos al buzón CORREOS.
  // Los tabs generales (enviados/respuestas/urgentes/archivadas) muestran los buzones permitidos.
  const tabPermitida = (tab: TabUnificadaType): boolean => {
    if (tab === 'judiciales' || tab === 'oficios') return puedeBuzonJudicial;
    if (tab === 'correos') return puedeBuzonCorreos;
    if (tab === 'borradores') return puedeCrear && buzonesPermitidos.length > 0;
    return buzonesPermitidos.length > 0;
  };

  const [tabActiva, setTabActiva] = useState<TabUnificadaType>(
    () => (puedeBuzonJudicial ? 'judiciales' : puedeBuzonCorreos ? 'correos' : 'enviados')
  );
  const [busqueda, setBusqueda] = useState('');
  const [comunicacionSeleccionada, setComunicacionSeleccionada] = useState<ComunicacionUnificada | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
    const [comunicacionesUnificadasDataData, setComunicacionesUnificadasData] = useState<ComunicacionUnificada[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchComunicaciones = async () => {
      setIsLoading(true);
      try {
        const correos = await correosJuridicosService.getCorreos();
        const mapped = correos.map(c => ({
          id: c.id,
          tipo: c.tipo === 'JUDICIAL' ? 'JUDICIAL' : c.tipo === 'OFICIO' ? 'CONCEPTO_OFICIO' : 'OTRO',
          tipoProceso: c.categoria || 'General',
          asunto: c.asunto,
          descripcion: c.cuerpoTexto || 'Sin descripción',
          remitente: c.remitenteNombre || c.remitenteEmail,
          remitenteEmail: c.remitenteEmail,
          despachoOrigen: 'Despacho',
          radicadoExterno: c.graphMessageId,
          fechaRadicacion: new Date(c.fechaRecepcion || Date.now()),
          urgente: c.urgente,
          leida: c.leido,
          estado: c.archivado ? 'ARCHIVADO' : c.leido ? 'ATENDIDO' : 'NUEVO',
          documentosAdjuntos: c.tieneAdjuntos ? ['Adjunto'] : []
        })) as any[];
        setComunicacionesUnificadasData(mapped);
      } catch (error) {
        console.error('Error fetching comunicaciones:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchComunicaciones();
  }, []);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [tipoVista, setTipoVista] = useState<VistaModulo>('inbox');

  // Estado reactivo para las comunicaciones
  const [comunicaciones, setComunicaciones] = useState<ComunicacionUnificada[]>([]);

  // Estados para modales
  const [modalNuevaComunicacionOpen, setModalNuevaComunicacionOpen] = useState(false);

  // ── Borradores de correos (privados por usuario) ──
  const [borradores, setBorradores] = useState<BorradorCorreoDTO[]>([]);
  const [borradorEnEdicion, setBorradorEnEdicion] = useState<BorradorCorreoDTO | null>(null);
  const [modalExpedienteOpen, setModalExpedienteOpen] = useState(false);
  const [comunicacionParaExpediente, setComunicacionParaExpediente] = useState<ComunicacionUnificada | null>(null);

  // Estado para DetalleCorreoModal
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [correoParaDetalle, setCorreoParaDetalle] = useState<ComunicacionUnificada | null>(null);

  // Estado para reply pre-populate
  const [replyData, setReplyData] = useState<{ to: string; subject: string; body: string } | null>(null);

  // Filtro adicional: Medios de Control (filtra correos cuyo origen es un órgano de control)
  const [filtroMedioControl, setFiltroMedioControl] = useState<string>('todos');

  // Filtro interno por BUZÓN (cuenta de correo): aplica en los tabs generales
  // (Respondidos/Urgentes/Enviados/Archivados) para distinguir Judicial vs Correos.
  const [filtroBuzon, setFiltroBuzon] = useState<'todos' | 'JUDICIAL' | 'CORREOS'>('todos');

  // Estado para el nuevo modal de responder
  const [modalResponderOpen, setModalResponderOpen] = useState(false);
  const [correoParaResponder, setCorreoParaResponder] = useState<CorreoOriginalData | null>(null);

  // Estados para carga de datos desde API
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  // ✨ Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 50;

  // Debug: Monitorear cambios en el estado del modal
  useEffect(() => {
    console.log('📊 Estado modalExpedienteOpen:', modalExpedienteOpen);
    console.log('📊 Estado comunicacionParaExpediente:', comunicacionParaExpediente);
  }, [modalExpedienteOpen, comunicacionParaExpediente]);

  // Función para mapear correos de API a formato UI
  const mapCorreoToUI = (correo: CorreoJuridico): ComunicacionUnificada => {
    const isSent = correo.direccion === 'ENVIADO';
    // Distinguir respuestas/reenvíos de correos enviados nuevos
    const isReplyOrForward = isSent && (correo.categoria === 'RESPUESTA' || correo.categoria === 'REENVIO' || !!correo.parentEmailId);
    // Solo mapear como ENVIADO los correos nuevos, no las respuestas/reenvíos
    const tipoFinal = isSent && !isReplyOrForward ? 'ENVIADO' : (correo.tipo as TipoComunicacion);
    return {
      id: correo.id,
      tipo: tipoFinal,
      buzon: (correo as any).buzon || 'JUDICIAL',
      asunto: correo.asunto,
      descripcion: correo.cuerpoTexto || '',
      remitente: correo.remitenteNombre || correo.remitenteEmail,
      remitenteEmail: correo.remitenteEmail,
      destinatario: isSent ? (correo.destinatariosTo || '') : undefined,
      cc: isSent ? parseListaCorreos(correo.destinatarios) : undefined,
      cco: isSent ? parseListaCorreos(correo.destinatariosCco) : undefined,
      fechaRadicacion: new Date(correo.fechaRecepcion),
      urgente: correo.urgente,
      leida: correo.leido,
      estado: correo.archivado ? 'ARCHIVADA' : (isSent ? 'ENVIADA' : (correo.leido ? 'LEIDA' : 'PENDIENTE')),
      documentosAdjuntos: (correo.adjuntos && correo.adjuntos.length > 0) ? correo.adjuntos.map(a => a.nombre) : (correo.tieneAdjuntos ? ['adjunto'] : []),
      clasificacionIA: correo.moduloSugerido ? {
        tipoDetectado: correo.categoria || 'Correo',
        moduloSugerido: correo.moduloSugerido,
        confianza: correo.confianzaClasificacion || 70
      } : undefined,
      // Threading
      isReplied: correo.isReplied,
      parentEmailId: correo.parentEmailId || undefined,
      categoria: correo.categoria || undefined,
      // NLP entities
      procesoIdSugerido: correo.procesoIdSugerido || undefined,
      implicadoSugerido: correo.implicadoSugerido || undefined,
      submoduloSugerido: correo.submoduloSugerido || undefined,
      moduloSugerido: correo.moduloSugerido || undefined,
      confianzaClasificacion: correo.confianzaClasificacion || undefined,
      cuerpoHtml: correo.cuerpoHtml || undefined,
      expedienteId: correo.expedienteId || undefined,
    };
  };

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

  // ── Borradores: carga, apertura, guardado y eliminación ──

  // Convierte un adjunto base64 del borrador de vuelta a un objeto File para el modal.
  const base64ToFile = (a: BorradorAdjunto): File => {
    const byteChars = atob(a.contentBytes || '');
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    return new File([bytes], a.name, { type: a.contentType || 'application/octet-stream' });
  };

  // Mapea un borrador persistido a los datos iniciales del modal Redactar Correo.
  const mapBorradorToInitialData = (b: BorradorCorreoDTO): Partial<NuevaComunicacionData> => ({
    para: parseListaCorreos(b.destinatariosTo),
    cc: parseListaCorreos(b.destinatariosCc),
    cco: parseListaCorreos(b.destinatariosCco),
    asunto: b.asunto || '',
    cuerpo: b.cuerpo || '',
    archivos: (b.adjuntos || []).map(base64ToFile),
    solicitarAcuse: b.solicitarAcuse,
    borradorId: b.id,
  });

  const ordenarBorradores = (list: BorradorCorreoDTO[]) =>
    [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const loadBorradores = async () => {
    const u = authService.getCurrentUser();
    if (!u?.id || !puedeCrear) { setBorradores([]); return; }
    try {
      const data = await borradoresCorreosService.getBorradores(u.id);
      setBorradores(ordenarBorradores(data || []));
    } catch (error) {
      console.error('Error cargando borradores:', error);
    }
  };

  // Guarda/actualiza el borrador (autoguardado o al cerrar). Devuelve el id persistido.
  const handleSaveDraft = async (payload: DraftSavePayload): Promise<string | undefined> => {
    const u = authService.getCurrentUser();
    if (!u?.id) {
      toast.error('No fue posible identificar la sesión para guardar el borrador');
      return undefined;
    }
    try {
      const saved = await borradoresCorreosService.saveBorrador({
        id: payload.id,
        usuarioId: u.id,
        usuarioNombre: (u as any).fullName || (u as any).nombre || u.email,
        buzon: payload.buzon,
        para: payload.para,
        cc: payload.cc,
        cco: payload.cco,
        asunto: payload.asunto,
        cuerpo: payload.cuerpo,
        adjuntos: payload.adjuntos,
        solicitarAcuse: payload.solicitarAcuse,
      });
      // Refleja el cambio en la lista local (contador + última edición) sin refetch.
      setBorradores(prev => {
        const idx = prev.findIndex(x => x.id === saved.id);
        const next = idx >= 0 ? prev.map(x => (x.id === saved.id ? saved : x)) : [saved, ...prev];
        return ordenarBorradores(next);
      });
      return saved.id;
    } catch (error) {
      console.error('Error guardando borrador:', error);
      return undefined;
    }
  };

  const handleAbrirBorrador = (b: BorradorCorreoDTO) => {
    setReplyData(null);
    setBorradorEnEdicion(b);
    setModalNuevaComunicacionOpen(true);
  };

  const handleEliminarBorrador = async (id: string) => {
    const u = authService.getCurrentUser();
    setBorradores(prev => prev.filter(x => x.id !== id)); // optimista
    try {
      await borradoresCorreosService.deleteBorrador(id, u?.id);
      toast.success('Borrador eliminado', { icon: <Trash2 className="w-4 h-4" /> });
    } catch (error) {
      console.error('Error eliminando borrador:', error);
      toast.error('No se pudo eliminar el borrador');
      loadBorradores(); // re-sincronizar ante fallo
    }
  };

  // Sincronizar con Microsoft Graph de forma progresiva.
  // Itera sobre cada BUZÓN configurado (JUDICIAL y, cuando exista, CORREOS).
  const handleSyncCorreos = async () => {
    setSyncing(true);
    let totalSynced = 0;
    let totalErrors = 0;
    const MAX_PAGES = 10; // Límite de 500 correos por buzón (10 * 50)

    try {
      toast.info("Iniciando sincronización de correos...");

      // Buzones configurados en el backend; si falla, se usa JUDICIAL por defecto.
      let buzones: string[] = [];
      try {
        const mailboxes = await correosJuridicosService.getMailboxes();
        buzones = (mailboxes || []).map(m => m.buzon).filter(Boolean);
      } catch { /* fallback abajo */ }
      if (buzones.length === 0) buzones = ['JUDICIAL'];

      // Restringir la sincronización a los buzones que el usuario tiene permitido ver.
      buzones = buzones.filter(b => buzonesPermitidos.includes(String(b).toUpperCase()));
      if (buzones.length === 0) {
        toast.dismiss();
        return; // el finally restablece el estado de sincronización
      }

      for (const buzon of buzones) {
        let nextLink: string | null | undefined = undefined;
        let pagesProcessed = 0;
        do {
          if (pagesProcessed > 0 || buzones.length > 1) {
            toast.loading(`Sincronizando buzón ${buzon} (lote ${pagesProcessed + 1})...`, { id: 'sync-progress', duration: 2000 });
          }

          const result = await correosJuridicosService.syncCorreos(nextLink ?? undefined, buzon);

          totalSynced += result.synced;
          totalErrors += result.errors;
          nextLink = result.nextLink;
          pagesProcessed++;

          // Refrescar la lista de a poco para efecto progresivo
          if (result.synced > 0) {
            await loadCorreosFromAPI();
          }
        } while (nextLink && pagesProcessed < MAX_PAGES);
      }

      toast.dismiss('sync-progress');
      toast.success(`✅ Sincronización completada: ${totalSynced} correos nuevos procesados`, {
        description: totalErrors > 0 ? `${totalErrors} errores` : undefined
      });

      // After sync, reclassify ALL emails with updated heuristics
      toast.loading('Reclasificando correos con heurísticas actualizadas...', { id: 'reclassify-progress' });
      try {
        const reclassResult = await correosJuridicosService.reclassifyAll();
        toast.dismiss('reclassify-progress');
        toast.success(`Reclasificación: ${reclassResult.updated} correos actualizados, ${reclassResult.unchanged} sin cambio`);
      } catch (reclassError) {
        toast.dismiss('reclassify-progress');
        console.error('Error reclasificando:', reclassError);
      }

    } catch (error) {
      console.error('Error sincronizando:', error);
      toast.error('Error al sincronizar con Microsoft 365');
    } finally {
      setSyncing(false);
      // Asegurar que tenemos la última versión
      loadCorreosFromAPI();
    }
  };

  // Cargar datos al montar + auto-polling cada 2 minutos
  useEffect(() => {
    loadCorreosFromAPI();
    loadBorradores();

    // Auto-polling: refresca la lista silenciosamente cada 2 minutos
    const pollInterval = setInterval(async () => {
      try {
        const correos = await correosJuridicosService.getCorreos();
        if (correos && correos.length > 0) {
          setComunicaciones(correos.map(mapCorreoToUI));
        }
      } catch (error) {
        // Silent fail — don't disrupt user experience
        console.warn('Auto-poll failed:', error);
      }
    }, 2 * 60 * 1000); // Every 2 minutes

    return () => clearInterval(pollInterval);
  }, []);



  // ¿Hay más de un buzón con datos? Si es así, los tabs Judiciales/Oficios se
  // restringen al buzón JUDICIAL y Correos al buzón CORREOS (separación por cuenta).
  // Con un solo buzón (estado actual) se mantiene el filtrado por tipo para no
  // ocultar nada. Al configurar la segunda cuenta, la separación es automática.
  // Solo las comunicaciones de los buzones que el usuario tiene permitido ver.
  // Es la fuente de verdad para la lista visible y para los contadores/estadísticas,
  // evitando que se filtre información de un buzón ajeno a las funciones del usuario.
  const comunicacionesVisibles = useMemo(
    () => comunicaciones.filter(buzonPermitido),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [comunicaciones, puedeBuzonJudicial, puedeBuzonCorreos]
  );

  const buzonesPresentes = useMemo(() => {
    const set = new Set<string>();
    comunicacionesVisibles.forEach(c => set.add((c.buzon || 'JUDICIAL').toUpperCase()));
    return set;
  }, [comunicacionesVisibles]);
  const multiBuzon = buzonesPresentes.size > 1;

  const comunicacionesFiltradas = useMemo(() => {
    let resultado = [...comunicacionesVisibles];
    const esBuzon = (c: ComunicacionUnificada, b: string) => (c.buzon || 'JUDICIAL').toUpperCase() === b;

    // Filtrar por tab
    switch (tabActiva) {
      case 'judiciales':
        resultado = resultado.filter(c => c.tipo === 'JUDICIAL' && c.estado !== 'ARCHIVADA' && c.categoria !== 'RESPUESTA' && c.categoria !== 'REENVIO'
          && (!multiBuzon || esBuzon(c, 'JUDICIAL')));
        break;
      case 'correos':
        // Si hay dos buzones, el tab Correos muestra TODO el buzón CORREOS (cualquier tipo).
        // Con un solo buzón, se mantiene el filtro por tipo CORREO (comportamiento actual).
        resultado = multiBuzon
          ? resultado.filter(c => esBuzon(c, 'CORREOS') && c.estado !== 'ARCHIVADA' && c.categoria !== 'RESPUESTA' && c.categoria !== 'REENVIO')
          : resultado.filter(c => c.tipo === 'CORREO' && c.estado !== 'ARCHIVADA' && c.categoria !== 'RESPUESTA' && c.categoria !== 'REENVIO');
        break;
      case 'oficios':
        resultado = resultado.filter(c => c.tipo === 'OFICIO' && c.estado !== 'ARCHIVADA' && c.categoria !== 'RESPUESTA' && c.categoria !== 'REENVIO'
          && (!multiBuzon || esBuzon(c, 'JUDICIAL')));
        break;
      case 'enviados':
        resultado = resultado.filter(c => c.tipo === 'ENVIADO' && c.estado !== 'ARCHIVADA' && c.categoria !== 'RESPUESTA' && c.categoria !== 'REENVIO');
        break;
      case 'respuestas':
        // Mostrar los correos enviados como respuesta (categoria RESPUESTA), no los originales
        resultado = resultado.filter(c => c.categoria === 'RESPUESTA' && c.estado !== 'ARCHIVADA');
        break;
      case 'urgentes':
        resultado = resultado.filter(c => c.urgente && c.estado !== 'ARCHIVADA');
        break;
      case 'archivadas':
        resultado = resultado.filter(c => c.estado === 'ARCHIVADA');
        break;
      case 'borradores':
        // Los borradores no son comunicaciones sincronizadas; se listan aparte
        // (VistaBorradores). Aquí no aplica el listado/paginación de correos.
        resultado = [];
        break;
    }

    // Filtro interno por BUZÓN en los tabs generales (no en los tabs ya específicos de buzón).
    const TABS_GENERALES = ['enviados', 'respuestas', 'urgentes', 'archivadas'];
    if (filtroBuzon !== 'todos' && TABS_GENERALES.includes(tabActiva)) {
      resultado = resultado.filter(c => esBuzon(c, filtroBuzon));
    }

    // Filtrar por Medios de Control (solo aplica en tab 'correos')
    if (tabActiva === 'correos' && filtroMedioControl !== 'todos') {
      const ORGANOS_CONTROL_KEYWORDS: Record<string, string[]> = {
        contraloria: ['contralor', 'cgr', 'contraloría', 'contraloria'],
        procuraduria: ['procuradur', 'pgn', 'procuraduría'],
        personeria: ['personero', 'personería', 'personeria'],
        defensoria: ['defensor', 'defensoría', 'defensoria del pueblo'],
        fiscalia: ['fiscal', 'fiscalía', 'fiscalia'],
      };
      const keywords = ORGANOS_CONTROL_KEYWORDS[filtroMedioControl] || [];
      resultado = resultado.filter(c => {
        const haystack = `${c.remitente} ${c.remitenteEmail || ''} ${c.moduloSugerido || ''}`.toLowerCase();
        return keywords.some(kw => haystack.includes(kw));
      });
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

    // Ordenar por fecha (más recientes primero). No se reordena por estado de lectura
    // para evitar que un correo "desaparezca" de la vista al marcarlo como leído.
    return resultado.sort((a, b) => {
      return b.fechaRadicacion.getTime() - a.fechaRadicacion.getTime();
    });
  }, [comunicacionesVisibles, tabActiva, busqueda, filtroMedioControl, filtroBuzon, multiBuzon]);

  // ✨ Aplicar paginación
  const totalPaginas = Math.ceil(comunicacionesFiltradas.length / ITEMS_POR_PAGINA);
  const comunicacionesPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = inicio + ITEMS_POR_PAGINA;
    return comunicacionesFiltradas.slice(inicio, fin);
  }, [comunicacionesFiltradas, paginaActual, ITEMS_POR_PAGINA]);

  // Resetear página y filtros adicionales cuando cambia el tab
  useEffect(() => {
    setPaginaActual(1);
    setFiltroMedioControl('todos');
    setFiltroBuzon('todos');
  }, [tabActiva, busqueda]);

  // Si el tab activo pertenece a un buzón que el usuario no puede ver, redirigir
  // al primer tab permitido (evita quedar en un tab vacío tras cambiar permisos).
  useEffect(() => {
    if (!tabPermitida(tabActiva)) {
      const primera = (['judiciales', 'correos', 'enviados'] as TabUnificadaType[]).find(tabPermitida);
      if (primera) setTabActiva(primera);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActiva, puedeBuzonJudicial, puedeBuzonCorreos]);

  // Calcular estadísticas (solo sobre los buzones permitidos)
  const totalNoLeidas = comunicacionesVisibles.filter(c => !c.leida && c.estado !== 'ARCHIVADA').length;
  const totalUrgentes = comunicacionesVisibles.filter(c => c.urgente && c.estado !== 'ARCHIVADA').length;
  const totalArchivadas = comunicacionesVisibles.filter(c => c.estado === 'ARCHIVADA').length;
  const totalIAAltaConfianza = comunicacionesVisibles.filter(
    (c) => c.estado !== 'ARCHIVADA' && c.clasificacionIA && getConfianzaPercent(c.clasificacionIA.confianza) >= 90
  ).length;

  const contadoresTabs = {
    judiciales: comunicacionesVisibles.filter(c => c.tipo === 'JUDICIAL' && c.estado !== 'ARCHIVADA').length,
    correos: comunicacionesVisibles.filter(c => c.tipo === 'CORREO' && c.estado !== 'ARCHIVADA').length,
    oficios: comunicacionesVisibles.filter(c => c.tipo === 'OFICIO' && c.estado !== 'ARCHIVADA').length,
    enviados: comunicacionesVisibles.filter(c => c.tipo === 'ENVIADO' && c.estado !== 'ARCHIVADA').length,
    respuestas: comunicacionesVisibles.filter(c => c.categoria === 'RESPUESTA' && c.estado !== 'ARCHIVADA').length,
    urgentes: totalUrgentes,
    archivadas: totalArchivadas,
    borradores: borradores.length
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

  const handleDesarchivar = async (id: string) => {
    console.log('📤 Desarchivando comunicación:', id);

    // Actualizar estado local inmediatamente
    setComunicaciones(prevComs =>
      prevComs.map(com =>
        com.id === id
          ? { ...com, estado: (com.tipo === 'ENVIADO' ? 'ENVIADA' : 'LEIDA') as EstadoComunicacion }
          : com
      )
    );

    // Llamar API
    try {
      await correosJuridicosService.unarchive(id);
    } catch (error) {
      console.error('Error desarchivando en API:', error);
    }

    toast.success('Comunicación restaurada correctamente', {
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

  const handleMarcarLeidasSeleccionadas = async () => {
    console.log('🔵 Marcando como leídas:', Array.from(seleccionadas));
    // Optimistic update
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
    const ids = Array.from(seleccionadas);
    setSeleccionadas(new Set());
    // Persist to backend (non-blocking)
    for (const id of ids) {
      try {
        await correosJuridicosService.markAsRead(id);
      } catch (error) {
        console.error('Error marcando como leída en API:', id, error);
      }
    }
  };

  const handleArchivarSeleccionadas = async () => {
    console.log('📦 Archivando:', Array.from(seleccionadas));
    // Optimistic update
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
    const ids = Array.from(seleccionadas);
    setSeleccionadas(new Set());
    // Persist to backend (non-blocking)
    for (const id of ids) {
      try {
        await correosJuridicosService.archive(id);
      } catch (error) {
        console.error('Error archivando en API:', id, error);
      }
    }
  };

  const addBtnsPermission = () => {
    const arrayBtns: any[] = [];
    arrayBtns.push({
      label: syncing ? 'Sincronizando...' : 'Sincronizar',
      labelMobile: syncing ? '...' : 'Sync',
      icon: syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />,
      onClick: handleSyncCorreos,
      variant: 'outline' as const,
      disabled: syncing
    });
    if (authService.hasPermission(Permissions.GESTION_LEGAL_COMUNICACIONES_CREATE)) {
      arrayBtns.push({
        label: 'Nueva Comunicación',
        labelMobile: 'Nueva',
        icon: <Plus className="w-4 h-4" />,
        onClick: () => {
          // Composición nueva y limpia (sin borrador ni reenvío previos).
          setBorradorEnEdicion(null);
          setReplyData(null);
          setModalNuevaComunicacionOpen(true);
        },
        variant: 'primary' as const
      })
    }
    return arrayBtns
  };

  const linkProcess = async (id: string, expedienteId: string, targetModule?: string) => {
    try {
      const updated = await correosJuridicosService.vincularProceso(id, expedienteId, targetModule);

      // Update local state without archiving so it remains visible as "Asociado"
      setComunicaciones(prev => prev.map(c => c.id === id ? { ...c, expedienteId } : c));

      // Actualizar también la comunicación seleccionada si es la misma
      if (comunicacionSeleccionada?.id === id) {
        setComunicacionSeleccionada(prev => prev ? { ...prev, expedienteId } : prev);
      }

      if (comunicacionParaExpediente?.id === id) setComunicacionParaExpediente(null); // Close if open

      toast.success('Correo vinculado al proceso correctamente');
      setModalExpedienteOpen(false); // Close modal on success
      return updated;
    } catch (err: any) {
      console.error('Error linking process:', err);
      toast.error('Error al vincular proceso');
      throw err;
    }
  };

  const handleDirectReply = (com: ComunicacionUnificada) => {
    setCorreoParaResponder({
      id: com.id,
      remitenteEmail: com.remitenteEmail || com.remitente,
      remitenteNombre: com.remitente,
      asunto: com.asunto,
      fechaRecepcion: com.fechaRadicacion,
      cuerpoTexto: com.descripcion,
      cuerpoHtml: com.cuerpoHtml,
    });
    setModalResponderOpen(true);
  };

  const handleDirectForward = (com: ComunicacionUnificada) => {
    const formattedDate = com.fechaRadicacion.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const forwardSubject = com.asunto.startsWith('RV:') || com.asunto.startsWith('FW:') ? com.asunto : `RV: ${com.asunto}`;
    const originalBody = `
<br/><br/>
<hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;"/>
<p style="color: #666; font-size: 12px;">
    <strong>De:</strong> ${com.remitente}<br/>
    <strong>Fecha:</strong> ${formattedDate}<br/>
    <strong>Asunto:</strong> ${com.asunto}
</p>
<blockquote style="border-left: 3px solid #ccc; padding-left: 12px; margin: 12px 0; color: #555;">
    ${com.descripcion}
</blockquote>`;

    setReplyData({
      to: '',
      subject: forwardSubject,
      body: originalBody,
      isForward: true,
      originalCorreoId: com.id
    } as any);
    setModalNuevaComunicacionOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <ModuleHeader
            title={isMobile ? 'Centro Clasificación' : 'Centro de Clasificación y Despacho'}
            subtitle="Clasifique y enrute comunicaciones al módulo jurídico correspondiente"
            toggleView={{
              current: tipoVista,
              onChange: (view) => setTipoVista(view as VistaModulo),
              options: [
                { label: 'Bandeja', icon: <Inbox className="w-4 h-4" />, value: 'inbox' },
                { label: 'Lista', icon: <List className="w-4 h-4" />, value: 'lista' }
              ]
            }}
            buttons={addBtnsPermission()}
          />
        </div>

        {/* Info Tooltip - Discreto pero útil */}
        <div className="flex-shrink-0 pt-1">
          <ModuleInfoTooltip
            title="Acerca de este módulo"
            variant="icon"
            sections={[
              {
                label: "Propósito",
                content: "Este módulo no reemplaza el correo institucional. Centraliza notificaciones judiciales, oficios y correos jurídicos para su clasificación y enrutamiento.",
                type: "info"
              },
              {
                label: "Clasificación IA",
                content: "Cada comunicación se analiza para sugerir tipo, módulo destino y nivel de confianza. El usuario valida y continúa la gestión.",
                type: "premium"
              },
              {
                label: "Despacho",
                content: "Desde el expediente de comunicación se puede vincular directamente al proceso o submódulo objetivo sin cambiar el backend actual.",
                type: "success"
              },
              {
                label: "Alertas y prioridad",
                content: "La vista prioriza urgentes y no leídas, facilitando la atención de términos críticos y requerimientos externos.",
                type: "warning"
              }
            ]}
          />
        </div>
      </div>

      {/* Métricas */}
      <ModuleMetrics
        metrics={[
          {
            label: 'Por Clasificar',
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
            label: 'IA Alta Confianza',
            value: totalIAAltaConfianza,
            icon: <Sparkles className="w-5 h-5 text-purple-600" />,
            color: '#7C3AED'
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
          {/* Buzón Judicial */}
          {puedeBuzonJudicial && (
            <TabButton
              active={tabActiva === 'judiciales'}
              onClick={() => setTabActiva('judiciales')}
              icon={<Gavel className="w-4 h-4" />}
              label="Judiciales"
              count={contadoresTabs.judiciales}
              color="#003DA5"
            />
          )}
          {/* Buzón Correos (Institucional) */}
          {puedeBuzonCorreos && (
            <TabButton
              active={tabActiva === 'correos'}
              onClick={() => setTabActiva('correos')}
              icon={<Mail className="w-4 h-4" />}
              label="Correos"
              count={contadoresTabs.correos}
              color="#6B7280"
            />
          )}
          {/* Buzón Judicial */}
          {puedeBuzonJudicial && (
            <TabButton
              active={tabActiva === 'oficios'}
              onClick={() => setTabActiva('oficios')}
              icon={<FileText className="w-4 h-4" />}
              label="Oficios"
              count={contadoresTabs.oficios}
              color="#6B7280"
            />
          )}
          {/* Tabs generales — sobre los buzones permitidos */}
          {buzonesPermitidos.length > 0 && (
            <TabButton
              active={tabActiva === 'enviados'}
              onClick={() => setTabActiva('enviados')}
              icon={<Send className="w-4 h-4" />}
              label="Enviados"
              count={contadoresTabs.enviados}
              color="#6B7280"
            />
          )}
          {buzonesPermitidos.length > 0 && (
            <TabButton
              active={tabActiva === 'respuestas'}
              onClick={() => setTabActiva('respuestas')}
              icon={<Reply className="w-4 h-4" />}
              label="Respondidos"
              count={contadoresTabs.respuestas}
              color="#059669"
            />
          )}
          {buzonesPermitidos.length > 0 && (
            <TabButton
              active={tabActiva === 'urgentes'}
              onClick={() => setTabActiva('urgentes')}
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Urgentes"
              count={contadoresTabs.urgentes}
              color="#DC2626"
              urgent
            />
          )}
          {buzonesPermitidos.length > 0 && (
            <TabButton
              active={tabActiva === 'archivadas'}
              onClick={() => setTabActiva('archivadas')}
              icon={<Archive className="w-4 h-4" />}
              label="Archivadas"
              count={contadoresTabs.archivadas}
              color="#6B7280"
            />
          )}
          {/* Borradores — composiciones sin enviar (privadas por usuario) */}
          {puedeCrear && buzonesPermitidos.length > 0 && (
            <TabButton
              active={tabActiva === 'borradores'}
              onClick={() => setTabActiva('borradores')}
              icon={<PenLine className="w-4 h-4" />}
              label="Borradores"
              count={contadoresTabs.borradores}
              color="#B45309"
            />
          )}
        </div>
      </Card>

      {/* Búsqueda y Acciones Masivas */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por asunto, remitente, ID o tipo detectado..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Filtro Medios de Control — visible solo en tab Correos */}
          {tabActiva === 'correos' && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <select
                value={filtroMedioControl}
                onChange={(e) => setFiltroMedioControl(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filtrar por medio de control"
              >
                <option value="todos">Todos los remitentes</option>
                <option value="contraloria">Contraloría General</option>
                <option value="procuraduria">Procuraduría General</option>
                <option value="personeria">Personería</option>
                <option value="defensoria">Defensoría del Pueblo</option>
                <option value="fiscalia">Fiscalía General</option>
              </select>
            </div>
          )}

          {/* Filtro interno por BUZÓN — visible en tabs generales solo si el usuario
              tiene acceso a AMBOS buzones (si solo tiene uno, los datos ya vienen filtrados). */}
          {['enviados', 'respuestas', 'urgentes', 'archivadas'].includes(tabActiva) && buzonesPermitidos.length > 1 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <select
                value={filtroBuzon}
                onChange={(e) => setFiltroBuzon(e.target.value as 'todos' | 'JUDICIAL' | 'CORREOS')}
                className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filtrar por buzón"
              >
                <option value="todos">Ambos buzones</option>
                <option value="JUDICIAL">Buzón Judicial</option>
                <option value="CORREOS">Buzón Correos</option>
              </select>
            </div>
          )}
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

      {/* Vista Borradores — composiciones sin enviar */}
      {tabActiva === 'borradores' && (
        <VistaBorradores
          borradores={borradores}
          onAbrir={handleAbrirBorrador}
          onEliminar={handleEliminarBorrador}
        />
      )}

      {/* Vista Inbox (Gmail style) */}
      {tipoVista === 'inbox' && tabActiva !== 'borradores' && (
        <VistaInbox
          comunicaciones={comunicacionesPaginadas}
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
          onDesarchivar={handleDesarchivar}
          onVerExpediente={handleVerExpediente}
          onVerDetalle={(com) => {
            setCorreoParaDetalle(com);
            setDetalleModalOpen(true);
          }}
          onDirectReply={handleDirectReply}
          onDirectForward={handleDirectForward}
        />
      )}

      {/* Vista Lista */}
      {tipoVista === 'lista' && tabActiva !== 'borradores' && (
        <VistaLista
          comunicaciones={comunicacionesPaginadas}
          onMarcarLeida={handleMarcarLeida}
          onArchivar={handleArchivar}
          onDesarchivar={handleDesarchivar}
          onVerDetalle={(com) => {
            setCorreoParaDetalle(com);
            setDetalleModalOpen(true);
          }}
          onDirectReply={handleDirectReply}
          onDirectForward={handleDirectForward}
        />
      )}

      {/* Controles de Paginación */}
      {comunicacionesFiltradas.length > 0 && (
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Mostrando {((paginaActual - 1) * ITEMS_POR_PAGINA) + 1} - {Math.min(paginaActual * ITEMS_POR_PAGINA, comunicacionesFiltradas.length)} de {comunicacionesFiltradas.length} comunicaciones
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                disabled={paginaActual === 1 || totalPaginas <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  let pageNum;
                  if (totalPaginas <= 5) {
                    pageNum = i + 1;
                  } else if (paginaActual <= 3) {
                    pageNum = i + 1;
                  } else if (paginaActual >= totalPaginas - 2) {
                    pageNum = totalPaginas - 4 + i;
                  } else {
                    pageNum = paginaActual - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={paginaActual === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaginaActual(pageNum)}
                      className={paginaActual === pageNum ? 'bg-[#003DA5]' : ''}
                      disabled={totalPaginas <= 1}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                disabled={paginaActual === totalPaginas || totalPaginas <= 1}
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Modal Nueva Comunicación */}
      <ModalNuevaComunicacion
        isOpen={modalNuevaComunicacionOpen}
        onClose={() => {
          // Al cerrar, el modal ya intentó autoguardar el borrador (si aplicaba).
          setModalNuevaComunicacionOpen(false);
          setBorradorEnEdicion(null);
          setReplyData(null);
          loadBorradores();
        }}
        // Al editar un borrador, se restaura su cuenta remitente original.
        buzon={
          borradorEnEdicion
            ? borradorEnEdicion.buzon
            // Cuenta remitente según el tab activo: Correos → CORREOS; Judiciales/Oficios → JUDICIAL;
            // en tabs generales respeta el filtro interno de buzón y, si no hay filtro, usa el
            // primer buzón permitido del usuario (evita componer desde un buzón sin acceso).
            : tabActiva === 'correos'
              ? 'CORREOS'
              : tabActiva === 'judiciales' || tabActiva === 'oficios'
                ? 'JUDICIAL'
                : (['enviados', 'respuestas', 'urgentes', 'archivadas'].includes(tabActiva) && filtroBuzon !== 'todos'
                    ? filtroBuzon
                    : (buzonesPermitidos[0] || 'JUDICIAL'))
        }
        initialData={
          borradorEnEdicion
            ? mapBorradorToInitialData(borradorEnEdicion)
            : replyData
              ? {
                  para: (replyData as any).to || '',
                  asunto: (replyData as any).subject || '',
                  cuerpo: (replyData as any).body || '',
                  isForward: (replyData as any).isForward,
                  isReply: (replyData as any).isReply,
                  originalCorreoId: (replyData as any).originalCorreoId,
                }
              : undefined
        }
        onSaveDraft={handleSaveDraft}
        onSubmit={async (data) => {
          console.log('Nueva comunicación enviada:', data);
          toast.success('Comunicación registrada exitosamente');
          setModalNuevaComunicacionOpen(false);
          setBorradorEnEdicion(null);
          // Si se envió desde un borrador, eliminarlo de Borradores.
          if (data.borradorId) {
            setBorradores(prev => prev.filter(x => x.id !== data.borradorId));
            try {
              await borradoresCorreosService.deleteBorrador(data.borradorId, authService.getCurrentUser()?.id);
            } catch (error) {
              console.error('Error eliminando borrador tras enviar:', error);
            }
          }
          // Si fue una respuesta, marcar optimisticamente isReplied en el correo original
          if (data.isReply && data.originalCorreoId) {
            setComunicaciones(prev =>
              prev.map(com =>
                com.id === data.originalCorreoId
                  ? { ...com, isReplied: true }
                  : com
              )
            );
          }
          // Refrescar la lista inmediatamente para mostrar el correo enviado
          await loadCorreosFromAPI();
        }}
      />

      {/* Modal Responder Correo */}
      <ModalResponderCorreo
        isOpen={modalResponderOpen}
        onClose={() => { setModalResponderOpen(false); setCorreoParaResponder(null); }}
        correoOriginal={correoParaResponder}
        onSuccess={async () => {
          // Marcar optimisticamente isReplied en el correo original
          if (correoParaResponder) {
            setComunicaciones(prev =>
              prev.map(com =>
                com.id === correoParaResponder.id
                  ? { ...com, isReplied: true }
                  : com
              )
            );
          }
          await loadCorreosFromAPI();
        }}
      />

      {/* Modal Expediente Comunicación */}

      {comunicacionParaExpediente && (
        <ModalExpedienteComunicacion
          isOpen={modalExpedienteOpen}
          onClose={() => setModalExpedienteOpen(false)}
          comunicacion={comunicacionParaExpediente}
          onMarcarLeida={handleMarcarLeida}
          onArchivar={handleArchivar}
          onLink={linkProcess}
        />
      )}

      {/* Modal Detalle Correo (Reply + IA + Vincular) */}
      {correoParaDetalle && (
        <DetalleCorreoModal
          isOpen={detalleModalOpen}
          onClose={() => { setDetalleModalOpen(false); setCorreoParaDetalle(null); }}
          notificacion={correoParaDetalle}
          onReply={(correoId, destinatario, asunto, cuerpoOriginal) => {
            setDetalleModalOpen(false);
            const original = correoParaDetalle;
            setCorreoParaDetalle(null);
            setCorreoParaResponder({
              id: correoId,
              remitenteEmail: destinatario,
              remitenteNombre: original?.remitente || destinatario,
              asunto: original?.asunto || asunto,
              fechaRecepcion: original?.fechaRadicacion || new Date(),
              cuerpoTexto: original?.descripcion,
              cuerpoHtml: original?.cuerpoHtml,
            });
            setModalResponderOpen(true);
          }}
          onForward={async (correoId, asunto, cuerpoOriginal) => {
            // Reutilizamos el modal de nueva comunicación para que el usuario escriba a quién se lo reenvía
            setDetalleModalOpen(false);
            setCorreoParaDetalle(null);
            setReplyData({
              to: '',
              subject: asunto,
              body: cuerpoOriginal,
              isForward: true, // we might need this param to know if we should call forward or send, or we just let ModalNuevaComunicacion call forward if we pass the original correoId. But wait, ModalNuevaComunicacion only handles 'sendEmail'.
              originalCorreoId: correoId
            } as any);
            setModalNuevaComunicacionOpen(true);
          }}
          onVincular={async (correoId, expedienteId, targetModule) => {
            try {
              await correosJuridicosService.vincularProceso(correoId, expedienteId, targetModule);
              toast.success('Oficio vinculado exitosamente');
              setDetalleModalOpen(false);
              setCorreoParaDetalle(null);
              await loadCorreosFromAPI();
            } catch (err) {
              toast.error('Error vinculando oficio');
            }
          }}
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

// ==================== VISTA BORRADORES ====================
interface VistaBorradoresProps {
  borradores: BorradorCorreoDTO[];
  onAbrir: (b: BorradorCorreoDTO) => void;
  onEliminar: (id: string) => void;
}

function VistaBorradores({ borradores, onAbrir, onEliminar }: VistaBorradoresProps) {
  const formatFecha = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  if (borradores.length === 0) {
    return (
      <Card className="p-10">
        <div className="flex flex-col items-center justify-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
            <PenLine className="w-7 h-7 text-amber-600" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No tienes borradores</h3>
          <p className="text-sm text-gray-500 max-w-md">
            Cuando empieces a redactar una comunicación y salgas sin enviarla, se guardará
            aquí automáticamente para que puedas retomarla luego.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-gray-100 overflow-hidden">
      {borradores.map((b) => {
        const para = parseListaCorreos(b.destinatariosTo);
        const nAdjuntos = Array.isArray(b.adjuntos) ? b.adjuntos.length : 0;
        return (
          <div
            key={b.id}
            className="group flex items-start gap-3 px-4 py-3 hover:bg-amber-50/40 transition-colors cursor-pointer"
            onClick={() => onAbrir(b)}
          >
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <PenLine className="w-4 h-4 text-amber-700" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {b.asunto?.trim() || '(Sin asunto)'}
                </p>
                <Badge className="bg-amber-100 text-amber-800 text-[10px]">Borrador</Badge>
                {b.buzon && (
                  <Badge className="bg-gray-100 text-gray-600 text-[10px]">
                    {b.buzon === 'CORREOS' ? 'Correos' : 'Judicial'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {para ? <>Para: {para}</> : <span className="italic">Sin destinatarios</span>}
                {b.cuerpo?.trim() ? ` · ${b.cuerpo.trim().slice(0, 90)}` : ''}
              </p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Editado {formatFecha(b.updatedAt)}
                </span>
                {nAdjuntos > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Paperclip className="w-3 h-3" /> {nAdjuntos} adjunto{nAdjuntos > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={(e) => { e.stopPropagation(); onAbrir(b); }}
              >
                <Pencil className="w-3 h-3 mr-1" />
                Continuar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                onClick={(e) => { e.stopPropagation(); onEliminar(b.id); }}
                aria-label="Eliminar borrador"
                title="Eliminar borrador"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

// ==================== VISTA INBOX (Gmail Style) ====================
interface VistaInboxProps {
  comunicaciones: ComunicacionUnificada[];
  comunicacionSeleccionada: ComunicacionUnificada | null;
  onSeleccionar: (comunicacion: ComunicacionUnificada) => void;
  seleccionadas: Set<string>;
  onToggleSeleccion: (id: string) => void;
  onSeleccionarTodas: () => void;
  onMarcarLeida: (id: string) => void;
  onArchivar: (id: string) => void;
  onDesarchivar: (id: string) => void;
  onVerExpediente: (com: ComunicacionUnificada) => void;
  onVerDetalle: (com: ComunicacionUnificada) => void;
  onDirectReply: (com: ComunicacionUnificada) => void;
  onDirectForward: (com: ComunicacionUnificada) => void;
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
  onDesarchivar,
  onVerExpediente,
  onVerDetalle,
  onDirectReply,
  onDirectForward
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
            <div>
              <p className="text-sm font-semibold text-gray-700">Comunicaciones pendientes</p>
              <p className="text-xs text-gray-500">{comunicaciones.length} comunicación(es)</p>
            </div>
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
                onDesarchivar={onDesarchivar}
                onVerExpediente={onVerExpediente}
                onVerDetalle={onVerDetalle}
                onDirectReply={onDirectReply}
                onDirectForward={onDirectForward}
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
    OFICIO: <FileText className="w-4 h-4 text-gray-600" />,
    ENVIADO: <Send className="w-4 h-4 text-gray-600" />
  };
  const moduloSugerido = getModuloDestinoUI(comunicacion.clasificacionIA?.moduloSugerido);
  const confianzaPct = getConfianzaPercent(comunicacion.clasificacionIA?.confianza);

  return (
    <div
      className={`
        p-3 cursor-pointer transition-colors flex gap-3 border-l-4
        ${seleccionada ? 'bg-blue-50 border-l-[#003DA5]' : 'hover:bg-gray-50 border-l-transparent'}
        ${!comunicacion.leida ? 'bg-blue-50/30' : ''}
      `}
      onClick={() => onSeleccionar(comunicacion)}
    >
      <div className="pt-1">
        <Checkbox
          checked={marcada}
          onCheckedChange={() => onToggleMarcada(comunicacion.id)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5">
            {iconoTipo[comunicacion.tipo]}
            <span className={`text-sm truncate ${!comunicacion.leida ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
              {comunicacion.remitente}
            </span>
            {comunicacion.urgente && (
              <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0">
                Urgente
              </Badge>
            )}
            {comunicacion.isReplied && (
              <span title="Respondido"><Reply className="w-3 h-3 text-green-600" /></span>
            )}
            {!comunicacion.leida && <div className="w-2 h-2 rounded-full bg-[#003DA5]" />}
          </div>
          <span className="text-[10px] text-gray-400 flex-shrink-0">
            {comunicacion.fechaRadicacion.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div className="mb-1">
          <p className={`text-sm truncate ${!comunicacion.leida ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
            {comunicacion.asunto}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          {(comunicacion.despachoOrigen || comunicacion.destinatario) && (
            <span className="truncate">{comunicacion.despachoOrigen || comunicacion.destinatario}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-1">
          {comunicacion.expedienteId ? (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
              title={`Asociado al proceso: ${comunicacion.expedienteId}`}
            >
              <Link2 className="w-3 h-3" />
              Asociado ({comunicacion.expedienteId})
            </div>
          ) : moduloSugerido ? (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
              style={{ backgroundColor: `${moduloSugerido.color}15`, color: moduloSugerido.color }}
            >
              <Sparkles className="w-3 h-3" />
              {moduloSugerido.nombreCorto}
            </div>
          ) : null}
          {!comunicacion.expedienteId && !!comunicacion.clasificacionIA && (
            <span className={`text-[10px] font-semibold ${confianzaPct >= 90 ? 'text-green-600' : confianzaPct >= 80 ? 'text-yellow-600' : 'text-gray-400'
              }`}>
              {confianzaPct}% confianza
            </span>
          )}
          {comunicacion.documentosAdjuntos.length > 0 && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5 ml-auto">
              <Paperclip className="w-3 h-3" />
              {comunicacion.documentosAdjuntos.length}
            </span>
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
  onDesarchivar: (id: string) => void;
  onVerExpediente: (com: ComunicacionUnificada) => void;
  onVerDetalle: (com: ComunicacionUnificada) => void;
  onDirectReply: (com: ComunicacionUnificada) => void;
  onDirectForward: (com: ComunicacionUnificada) => void;
}

function VistaPreviaComunicacion({
  comunicacion,
  onMarcarLeida,
  onArchivar,
  onDesarchivar,
  onVerExpediente,
  onVerDetalle,
  onDirectReply,
  onDirectForward
}: VistaPreviaComunicacionProps) {
  const badgeTipo = {
    JUDICIAL: { label: 'Judicial', color: 'bg-blue-100 text-blue-700' },
    CORREO: { label: 'Correo', color: 'bg-gray-100 text-gray-700' },
    OFICIO: { label: 'Oficio', color: 'bg-green-100 text-green-700' },
    ENVIADO: { label: 'Enviado', color: 'bg-gray-100 text-gray-700' }
  };
  const moduloSugerido = getModuloDestinoUI(comunicacion.clasificacionIA?.moduloSugerido);
  const confianzaPct = getConfianzaPercent(comunicacion.clasificacionIA?.confianza);

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

      {comunicacion.expedienteId ? (
        <div className="mb-4 p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-indigo-100">
              <Link2 className="w-4 h-4 text-indigo-700" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-black text-indigo-900">Comunicación Asociada</span>
              <p className="text-xs text-indigo-700 font-medium">Vinculada exitosamente a un proceso</p>
            </div>
            <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200">
              Proceso Activo
            </Badge>
          </div>
          <div className="p-3 rounded-lg bg-white border border-indigo-100 text-xs flex justify-between items-center">
            <div>
              <p className="text-gray-500 mb-1">ID del Expediente / Proceso</p>
              <p className="font-bold text-indigo-700 text-sm">
                {comunicacion.expedienteId}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
              onClick={() => onVerExpediente(comunicacion)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver Expediente
            </Button>
          </div>
        </div>
      ) : comunicacion.clasificacionIA && (
        <div className="mb-4 p-4 rounded-xl border-2" style={{
          borderColor: `${(moduloSugerido?.color || '#7C3AED')}30`,
          backgroundColor: `${(moduloSugerido?.color || '#7C3AED')}08`
        }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-purple-100">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-bold text-purple-900">Clasificación IA</span>
              <p className="text-xs text-gray-500">{comunicacion.clasificacionIA.tipoDetectado}</p>
            </div>
            <Badge className={`text-xs ${confianzaPct >= 90 ? 'bg-green-100 text-green-700' : confianzaPct >= 80 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
              }`}>
              {confianzaPct}% confianza
            </Badge>
          </div>
          <div className="p-3 rounded-lg bg-white border border-gray-200 text-xs space-y-2">
            <div>
              <p className="text-gray-500 mb-1">Módulo sugerido</p>
              <p className="font-semibold" style={{ color: moduloSugerido?.color || '#374151' }}>
                {moduloSugerido?.nombre || comunicacion.clasificacionIA.moduloSugerido}
              </p>
            </div>

            {(comunicacion.procesoIdSugerido || comunicacion.implicadoSugerido) && (
              <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2">
                {comunicacion.procesoIdSugerido && (
                  <div>
                    <p className="text-gray-500 mb-1">Proceso sugerido</p>
                    <p className="font-mono font-bold text-blue-700">{comunicacion.procesoIdSugerido}</p>
                  </div>
                )}
                {comunicacion.implicadoSugerido && (
                  <div>
                    <p className="text-gray-500 mb-1">Implicado detectado</p>
                    <p className="font-semibold text-gray-800">{comunicacion.implicadoSugerido}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
          <p className="text-xs text-gray-500 mb-1">Medio de Control:</p>
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
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={() => onDirectReply(comunicacion)}
            title="Responder"
          >
            <Reply className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            onClick={() => onDirectForward(comunicacion)}
            title="Reenviar"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          className="w-full"
          style={{ background: '#003DA5' }}
          onClick={() => onVerExpediente(comunicacion)}
        >
          <Eye className="w-4 h-4 mr-2" />
          Ver Expediente Completo
        </Button>
        {!comunicacion.leida && authService.hasPermission(Permissions.GESTION_LEGAL_COMUNICACIONES_LEIDO) && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onMarcarLeida(comunicacion.id)}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Marcar como Leída
          </Button>
        )}
        {comunicacion.estado === 'ARCHIVADA' && authService.hasPermission(Permissions.GESTION_LEGAL_COMUNICACIONES_ARCHIVAR) && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onDesarchivar(comunicacion.id)}
          >
            <Archive className="w-4 h-4 mr-2" />
            Desarchivar
          </Button>
        )}
        {comunicacion.estado !== 'ARCHIVADA' && authService.hasPermission(Permissions.GESTION_LEGAL_COMUNICACIONES_ARCHIVAR) && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onArchivar(comunicacion.id)}
          >
            <Archive className="w-4 h-4 mr-2" />
            Archivar
          </Button>
        )}
      </div>
    </div>
  );
}

// ==================== VISTA LISTA ====================
interface VistaListaProps {
  comunicaciones: ComunicacionUnificada[];
  onMarcarLeida: (id: string) => void;
  onArchivar: (id: string) => void;
  onDesarchivar: (id: string) => void;
  onVerDetalle: (com: ComunicacionUnificada) => void;
  onDirectReply: (com: ComunicacionUnificada) => void;
  onDirectForward: (com: ComunicacionUnificada) => void;
}

function VistaLista({ comunicaciones, onMarcarLeida, onArchivar, onDesarchivar, onVerDetalle, onDirectReply, onDirectForward }: VistaListaProps) {
  const badgeTipo = {
    JUDICIAL: { label: 'Judicial', color: 'bg-blue-100 text-blue-700' },
    CORREO: { label: 'Correo', color: 'bg-gray-100 text-gray-700' },
    OFICIO: { label: 'Oficio', color: 'bg-green-100 text-green-700' },
    ENVIADO: { label: 'Enviado', color: 'bg-gray-100 text-gray-700' }
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
                    <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => onVerDetalle(com)} title="Ver Detalle">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => onDirectReply(com)} title="Responder">
                      <Reply className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => onDirectForward(com)} title="Reenviar">
                      <ArrowRight className="w-4 h-4" />
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
                    {com.estado === 'ARCHIVADA' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onDesarchivar(com.id)}
                        title="Desarchivar"
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onArchivar(com.id)}
                        title="Archivar"
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    )}
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
