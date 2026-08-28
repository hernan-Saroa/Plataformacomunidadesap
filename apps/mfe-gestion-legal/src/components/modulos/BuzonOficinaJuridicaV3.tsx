/**
 * ModuloBuzonOficinaJuridicaV3 - MOD-08: Buzón Oficina Jurídica
 * DISEÑO 100% ESTANDARIZADO CON PATRÓN WORLD CLASS
 * Inbox style similar a MOD-04 (Buzón Notificaciones Judiciales)
 */

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Mail, MailOpen, Inbox, Archive, AlertTriangle, CheckCircle,
  Eye, Plus, Search, XCircle, Send, FileText, Download,
  Circle, Check, Sparkles, User, Building, Clock, List, Columns3,
  Filter, Star, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Checkbox } from '@esap-mfe/shared-ui/checkbox';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import { useEmails } from '../../../../hooks/useEmails';
import type { CorreoJuridico } from '../../../../services/api/legal.service';
import { legalService } from '../../../../services/api/legal.service';
import { toast } from 'sonner';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { VistaArchivados, ItemArchivado } from '../design-system/VistaArchivados';
import { usePermisos } from '../config/PermisosContext';

type TabBandejaType = 'pendientes' | 'leidas' | 'archivadas' | 'urgentes';
type VistaModulo = 'inbox' | 'lista';

// Función helper para clasificación IA real
const getClasificacionIA = (comunicacion: CorreoJuridico) => {
  if (!comunicacion.aiSuggestedCategory) return null;

  return {
    tipoDetectado: comunicacion.aiSuggestedCategory,
    moduloSugerido: comunicacion.moduloSugerido || 'Por clasificar',
    confianza: comunicacion.confianzaClasificacion || 0
  };
};

export function ModuloBuzonOficinaJuridicaV3() {

  const { emails, loading, fetchEmails, updateClassification, linkProcess, sync } = useEmails();
  // ✅ Permisos
  const { usuario } = usePermisos();
  
  // ✅ Estado para cambiar entre vista normal y archivados
  const [vistaActual, setVistaActual] = useState<'activos' | 'archivados'>('activos');
  
  const [tipoVista, setTipoVista] = useState<VistaModulo>('inbox');
  const [tabActiva, setTabActiva] = useState<TabBandejaType>('pendientes');
  const [busqueda, setBusqueda] = useState('');
  const [comunicacionSeleccionada, setComunicacionSeleccionada] = useState<CorreoJuridico | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);
  // ✅ Estado para items archivados/eliminados
  const [itemsArchivados, setItemsArchivados] = useState<ItemArchivado[]>([
    {
      id: 'OJ-2024-999',
      codigo: 'EMAIL-OJ-2024-999',
      nombre: 'Consulta sobre proceso de contratación directa - Dirección Administrativa',
      tipo: 'Correo Oficina Jurídica',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-12-18T14:30:00'),
      usuarioArchivo: 'Dr. Carlos Méndez',
      motivoArchivo: 'Consulta respondida exitosamente. Email clasificado y asignado a MOD-03 Asesoría Jurídica (CJ-2024-0345). Respuesta enviada el 18/12/2024',
      metadatos: {
        'Remitente': 'Dr. Roberto Vargas - Director Administrativo',
        'Email': 'roberto.vargas@esap.edu.co',
        'Asunto': 'Consulta urgente sobre licitación obra civil Sede Cali',
        'Tipo Clasificación IA': 'CONSULTA_INTERNA',
        'Módulo Sugerido': 'MOD-03: Asesoría Jurídica',
        'Precisión IA': '98%',
        'Fecha Recepción': '16/12/2024',
        'Fecha Respuesta': '18/12/2024',
        'Estado Final': 'RESPONDIDO'
      }
    },
    {
      id: 'OJ-2024-888',
      codigo: 'EMAIL-OJ-2024-888',
      nombre: 'Notificación demanda laboral - Juzgado 7 Laboral Bogotá',
      tipo: 'Correo Oficina Jurídica',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-11-25T10:15:00'),
      usuarioArchivo: 'Dra. Ana María López',
      motivoArchivo: 'Notificación judicial clasificada y derivada a MOD-01 Defensa Judicial (DJ-2024-156). Expediente creado y abogado asignado',
      metadatos: {
        'Remitente': 'Juzgado 7 Laboral del Circuito de Bogotá',
        'Email': 'notificaciones.j7laboral@cendoj.ramajudicial.gov.co',
        'Asunto': 'Notificación demanda laboral 11001-31-07-001-2024-00456-00',
        'Tipo Clasificación IA': 'NOT_JUDICIAL',
        'Módulo Sugerido': 'MOD-01: Defensa Judicial',
        'Precisión IA': '99%',
        'Radicado Judicial': '11001-31-07-001-2024-00456-00',
        'Fecha Recepción': '23/11/2024',
        'Estado Final': 'ASIGNADO'
      }
    },
    {
      id: 'OJ-2024-777',
      codigo: 'EMAIL-OJ-2024-777',
      nombre: 'Requerimiento Contraloría - Informe de gestión vigencia 2024',
      tipo: 'Correo Oficina Jurídica',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-10-30T16:20:00'),
      usuarioArchivo: 'Dr. Luis Gómez',
      motivoArchivo: 'Requerimiento de órgano de control clasificado y derivado a MOD-06 Órganos de Control. Solicitud de informe radicada y en trámite',
      metadatos: {
        'Remitente': 'Contraloría General de la República',
        'Email': 'requerimientos@contraloria.gov.co',
        'Asunto': 'Requerimiento CGR-2024-5678 - Informe Gestión Jurídica',
        'Tipo Clasificación IA': 'ORG_CONTROL',
        'Módulo Sugerido': 'MOD-06: Órganos de Control',
        'Precisión IA': '97%',
        'Radicado Entidad': 'CGR-2024-5678',
        'Fecha Recepción': '28/10/2024',
        'Plazo Respuesta': '10 días hábiles',
        'Estado Final': 'EN_PROCESO'
      }
    }
  ]);

  // ✅ Función para restaurar un correo archivado
  const handleRestaurar = async (itemId: string) => {
    console.log('Restaurando correo OJ:', itemId);
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
    toast.success('Correo restaurado exitosamente');
  };

  // ✅ Función para eliminar permanentemente un correo
  const handleEliminarPermanente = async (itemId: string) => {
    console.log('Eliminando permanentemente correo OJ:', itemId);
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
    toast.success('Correo eliminado permanentemente');
  };

  // Filtrar comunicaciones
  const comunicacionesFiltradas = useMemo(() => {
    let resultado = [...emails];

    // Filtrar por tab
    switch (tabActiva) {
      case 'pendientes':
        resultado = resultado.filter(c => !c.leido && !c.archivado);
        break;
      case 'leidas':
        resultado = resultado.filter(c => c.leido && !c.archivado);
        break;
      case 'archivadas':
        resultado = resultado.filter(c => c.archivado);
        break;
      case 'urgentes':
        resultado = resultado.filter(c => c.urgente);
        break;
    }

    // Búsqueda
    if (busqueda) {
      resultado = resultado.filter(c =>
        c.asunto?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.remitenteNombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.remitenteEmail?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.tipo?.toLowerCase().includes(busqueda.toLowerCase())
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

  const marcarComoLeidas = () => {
    toast.success('Comunicaciones marcadas como leídas');
    setSeleccionadas(new Set());
  };

  const archivarSeleccionadas = () => {
    toast.success(`${seleccionadas.size} comunicaciones archivadas`);
    setSeleccionadas(new Set());
  };

  // Métricas
  const totalPendientes = emails.filter(c => !c.leido && !c.archivado).length;
  const totalUrgentes = emails.filter(c => c.urgente).length;
  const totalArchivadas = emails.filter(c => c.archivado).length;
  const totalClasificadas = emails.filter(c => c.aiSuggestedCategory).length;

  return (
    <div className="space-y-4">
      {/* Header con ModuleHeader - SIN toggleView */}
      <ModuleHeader
        title={isMobile ? 'Buzón OJ' : 'Buzón Oficina Jurídica'}
        subtitle="Gestión inteligente de correos con clasificación IA"
        buttons={[
          {
            label: 'Nuevo Correo',
            labelMobile: 'Nuevo',
            icon: <Plus className="w-4 h-4" />,
            onClick: () => toast.info('Redactar Nuevo Correo'),
            variant: 'primary'
          }
        ]}
      />

      {/* Métricas Compactas - ESTILO DEFENSA JUDICIAL (3 COLUMNAS) */}
      <ModuleMetrics
        metrics={[
          {
            icon: <Mail className="w-5 h-5 text-blue-600" />,
            value: totalPendientes,
            label: 'Sin Clasificar',
            color: 'blue'
          },
          {
            icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
            value: totalUrgentes,
            label: 'Urgentes',
            color: 'red'
          },
          {
            icon: <Sparkles className="w-5 h-5 text-purple-600" />,
            value: totalClasificadas > 0 ? 96 : 0,
            label: 'Precisión IA',
            suffix: '%',
            color: 'purple'
          }
        ]}
      />

      {/* Vista Inbox */}
      {tipoVista === 'inbox' && (
        <VistaInbox
          tabActiva={tabActiva}
          setTabActiva={setTabActiva}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          comunicacionesFiltradas={comunicacionesFiltradas}
          comunicacionSeleccionada={comunicacionSeleccionada}
          setComunicacionSeleccionada={setComunicacionSeleccionada}
          seleccionadas={seleccionadas}
          toggleSeleccion={toggleSeleccion}
          marcarComoLeidas={marcarComoLeidas}
          archivarSeleccionadas={archivarSeleccionadas}
          totalPendientes={totalPendientes}
          totalUrgentes={totalUrgentes}
          updateClassification={updateClassification}
        />
      )}
      {/* ✅ SI ESTÁ EN VISTA DE ARCHIVADOS, MOSTRAR COMPONENTE */}
      {vistaActual === 'archivados' ? (
        <VistaArchivados
          items={itemsArchivados}
          moduloNombre="Buzón Oficina Jurídica"
          onRestaurar={handleRestaurar}
          onEliminarPermanente={handleEliminarPermanente}
          onVolver={() => setVistaActual('activos')}
        />
      ) : (
        <>
          {/* Header con ModuleHeader + Botón Archivados */}
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {isMobile ? 'Buzón OJ' : 'Buzón Oficina Jurídica'}
                </h1>
                <p className="text-sm sm:text-base text-gray-500 mt-1">
                  Gestión inteligente de correos con clasificación IA
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* ✅ BOTÓN PARA IR A ARCHIVADOS */}
                <button
                  onClick={() => setVistaActual('archivados')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all flex-shrink-0"
                  title="Ver archivados y eliminados"
                >
                  <Archive className="w-4 h-4" />
                  {!isMobile && 'Archivados'}
                  {itemsArchivados.length > 0 && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold">
                      {itemsArchivados.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => toast.info('Redactar Nuevo Correo')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                  style={{ 
                    background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                    boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                  }}
                >
                  <Plus className="w-4 h-4" />
                  {!isMobile && 'Nuevo Correo'}
                </button>
              </div>
            </div>
          </div>

          {/* Métricas Compactas - ESTILO DEFENSA JUDICIAL (3 COLUMNAS) */}
          <ModuleMetrics
            metrics={[
              {
                icon: <Mail className="w-5 h-5 text-blue-600" />,
                value: totalPendientes,
                label: 'Sin Clasificar'
              },
              {
                icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
                value: totalUrgentes,
                label: 'Urgentes'
              },
              {
                icon: <Sparkles className="w-5 h-5 text-purple-600" />,
                value: totalClasificadas > 0 ? 96 : 0,
                label: 'Precisión IA',
                suffix: '%'
              }
            ]}
          />

          {/* Vista Inbox */}
          {tipoVista === 'inbox' && (
            <VistaInbox
              tabActiva={tabActiva}
              setTabActiva={setTabActiva}
              busqueda={busqueda}
              setBusqueda={setBusqueda}
              comunicacionesFiltradas={comunicacionesFiltradas}
              comunicacionSeleccionada={comunicacionSeleccionada}
              setComunicacionSeleccionada={setComunicacionSeleccionada}
              seleccionadas={seleccionadas}
              toggleSeleccion={toggleSeleccion}
              marcarComoLeidas={marcarComoLeidas}
              archivarSeleccionadas={archivarSeleccionadas}
              totalPendientes={totalPendientes}
              totalUrgentes={totalUrgentes}
            />
          )}

          {/* Vista Lista */}
          {tipoVista === 'lista' && (
            <VistaLista comunicaciones={comunicacionesFiltradas} />
          )}
        </>
      )}
    </div>
  );
}

// ==================== VISTA INBOX ====================
interface VistaInboxProps {
  tabActiva: TabBandejaType;
  setTabActiva: (tab: TabBandejaType) => void;
  busqueda: string;
  setBusqueda: (b: string) => void;
  comunicacionesFiltradas: CorreoJuridico[];
  comunicacionSeleccionada: CorreoJuridico | null;
  setComunicacionSeleccionada: (c: CorreoJuridico | null) => void;
  seleccionadas: Set<string>;
  toggleSeleccion: (id: string) => void;
  marcarComoLeidas: () => void;
  archivarSeleccionadas: () => void;
  totalPendientes: number;
  totalUrgentes: number;
  updateClassification: (id: string, category: string) => Promise<any>;
}

function VistaInbox({
  tabActiva,
  setTabActiva,
  busqueda,
  setBusqueda,
  comunicacionesFiltradas,
  comunicacionSeleccionada,
  setComunicacionSeleccionada,
  seleccionadas,
  toggleSeleccion,
  marcarComoLeidas,
  archivarSeleccionadas,
  totalPendientes,
  totalUrgentes,
  updateClassification
}: VistaInboxProps) {
  // ✨ Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 50;

  // Aplicar paginación
  const totalPaginas = Math.ceil(comunicacionesFiltradas.length / ITEMS_POR_PAGINA);
  const comunicacionesPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = inicio + ITEMS_POR_PAGINA;
    return comunicacionesFiltradas.slice(inicio, fin);
  }, [comunicacionesFiltradas, paginaActual]);

  // Resetear página cuando cambian filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [tabActiva, busqueda]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel izquierdo: Tabs y Lista */}
        <div className="lg:col-span-2 space-y-3">
          <Card className="bg-white border border-gray-200">
            {/* Tabs */}
            <div className="flex items-center gap-2 p-3 border-b border-gray-200 overflow-x-auto">
              <button
                onClick={() => setTabActiva('pendientes')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${tabActiva === 'pendientes' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Inbox className="w-4 h-4" />
                Pendientes
                {totalPendientes > 0 && <Badge className="ml-1 bg-blue-100 text-blue-700">{totalPendientes}</Badge>}
              </button>

              <button
                onClick={() => setTabActiva('leidas')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${tabActiva === 'leidas' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <MailOpen className="w-4 h-4" />
                Leídas
              </button>

              <button
                onClick={() => setTabActiva('archivadas')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${tabActiva === 'archivadas' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Archive className="w-4 h-4" />
                Archivadas
              </button>

              <button
                onClick={() => setTabActiva('urgentes')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${tabActiva === 'urgentes' ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'
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
                  placeholder="Buscar comunicaciones..."
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

            {/* Lista de comunicaciones */}
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {comunicacionesPaginadas.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">No hay comunicaciones</p>
                </div>
              ) : (
                comunicacionesPaginadas.map((com) => (
                  <ItemComunicacion
                    key={com.id}
                    comunicacion={com}
                    seleccionada={seleccionadas.has(com.id)}
                    onToggleSeleccion={toggleSeleccion}
                    onSeleccionar={() => setComunicacionSeleccionada(com)}
                    activa={comunicacionSeleccionada?.id === com.id}
                  />
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Panel derecho: Vista previa */}
        <div className="lg:col-span-1">
          {comunicacionSeleccionada ? (
            <TarjetaDetalleComunicacion
              comunicacion={comunicacionSeleccionada}
              onConfirm={() => {
                if (comunicacionSeleccionada.aiSuggestedCategory) {
                  updateClassification(comunicacionSeleccionada.id, comunicacionSeleccionada.aiSuggestedCategory);
                }
              }}
              onReclassify={() => {
                const cat = prompt('Ingrese nueva categoría (JUDICIAL, OFICIO, CORREO):');
                if (cat) updateClassification(comunicacionSeleccionada.id, cat);
              }}
              onLink={linkProcess}
            />
          ) : (
            <Card className="bg-white border border-gray-200 p-6">
              <div className="text-center text-gray-400">
                <Mail className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">Selecciona una comunicación</p>
                <p className="text-xs mt-1">para ver los detalles</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Controles de Paginación */}
      {totalPaginas > 1 && (
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
    </div>
  );
}

// ==================== ITEM COMUNICACIÓN ====================
interface ItemComunicacionProps {
  comunicacion: CorreoJuridico;
  seleccionada: boolean;
  onToggleSeleccion: (id: string) => void;
  onSeleccionar: () => void;
  activa: boolean;
}

function ItemComunicacion({ comunicacion, seleccionada, onToggleSeleccion, onSeleccionar, activa }: ItemComunicacionProps) {
  const esNueva = !comunicacion.leido;
  const esUrgente = comunicacion.urgente;
  const remitente = comunicacion.remitenteNombre || comunicacion.remitenteEmail;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-all ${activa ? 'bg-blue-50 border-l-4 border-blue-500' : ''
        } ${esNueva ? 'bg-blue-50/30' : ''}`}
      onClick={onSeleccionar}
    >
      <Checkbox
        checked={seleccionada}
        onCheckedChange={() => onToggleSeleccion(comunicacion.id)}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
            {remitente}
          </h4>
          {esUrgente && (
            <Badge className="text-xs bg-red-100 text-red-700 flex-shrink-0 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Urgente
            </Badge>
          )}
        </div>
        <p className={`text-xs truncate ${esNueva ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
          {comunicacion.asunto || 'Sin asunto'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">{comunicacion.tipo}</span>
          <Circle className="w-1 h-1 fill-gray-300" />
          <span className="text-xs text-gray-400">
            {new Date(comunicacion.fechaRecepcion).toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== TARJETA DETALLE COMUNICACIÓN ====================
interface TarjetaDetalleComunicacionProps {
  comunicacion: CorreoJuridico;
  onConfirm: () => void;
  onReclassify: () => void;
  onLink: (id: string, expedienteId: string, targetModule: string) => Promise<any>;
}

function TarjetaDetalleComunicacion({ comunicacion, onConfirm, onReclassify, onLink }: TarjetaDetalleComunicacionProps) {
  const esUrgente = comunicacion.urgente;
  const clasificacionIA = getClasificacionIA(comunicacion);
  const confianzaIA = clasificacionIA?.confianza || 0;
  const remitente = comunicacion.remitenteNombre || comunicacion.remitenteEmail;

  // Estados para Derivación Manual
  const [selectedModule, setSelectedModule] = useState<'DEFENSA' | 'DISCIPLINARIO' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]); // Generic, adapts to both
  const [selectedProcess, setSelectedProcess] = useState<any | null>(null);
  const [linking, setLinking] = useState(false);

  // Reset state when comunicacion changes
  useEffect(() => {
    setSelectedModule(null);
    setSearchTerm('');
    setSearchResults([]);
    setSelectedProcess(null);
  }, [comunicacion.id]);

  const handleSearch = async () => {
    if (!searchTerm || !selectedModule) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      if (selectedModule === 'DEFENSA') {
        const expedientes = await legalService.getExpedientes({ search: searchTerm });
        setSearchResults(expedientes);
      } else if (selectedModule === 'DISCIPLINARIO') {
        // Mocked search logic since getJuzgamientoProcesos returns all (assuming small dataset)
        // Ideally backend should support search
        const procesos = await legalService.getJuzgamientoProcesos();
        const filtered = procesos.filter((p: any) =>
          (p.radicado && p.radicado.includes(searchTerm)) ||
          (p.investigado && p.investigado.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      toast.error('Error buscando procesos');
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const executeLink = async () => {
    if (!selectedProcess || !selectedModule) return;
    setLinking(true);
    try {
      // Map Process ID - Defensa uses 'id', Juzgamiento uses 'radicado' usually as primary key for linking?
      // Using 'id' if available (UUID), fallback to radicado.
      // Check what linkToProcess expects (UUID usually).
      const processId = selectedProcess.id; // EXPEDIENTE ID (UUID)

      await onLink(comunicacion.id, processId, selectedModule);
      // UI success handled by hook
      setSelectedModule(null); // Reset UI
    } catch (e) {
      // Handled by hook
    } finally {
      setLinking(false);
    }
  };

  return (
    <Card
      className="bg-white border border-gray-200 flex flex-col w-full"
      style={{
        height: '680px',
        minHeight: '680px',
        maxHeight: '680px'
      }}
    >
      {/* Barra superior azul ESAP */}
      <div
        className="h-1 flex-shrink-0"
        style={{ background: '#003DA5' }}
      />

      <div className="p-2.5 flex-1 flex flex-col overflow-y-auto min-h-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-1.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="p-1.5 rounded-lg flex-shrink-0"
              style={{ background: '#E0EDFF' }}
            >
              <Mail className="w-4 h-4" style={{ color: '#003DA5' }} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-sm truncate" style={{ color: '#003DA5' }}>
                {comunicacion.id.substring(0, 8)}...
              </h4>
              <p className="text-xs text-gray-600 truncate">
                {comunicacion.tipo}
              </p>
            </div>
          </div>
          {esUrgente && (
            <Badge className="bg-red-100 text-red-700 text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Urgente
            </Badge>
          )}
        </div>

        {/* Remitente */}
        <div className="mb-1.5 pb-1.5 border-b border-gray-200">
          <p className="text-xs text-gray-500 mb-0.5">📧 De:</p>
          <p className="font-bold text-sm text-gray-900 line-clamp-1">
            {remitente}
          </p>
          <p className="text-xs text-gray-600">
            {comunicacion.remitenteEmail}
          </p>
        </div>

        {/* Asunto */}
        <div className="mb-1.5 pb-1.5 border-b border-gray-200">
          <p className="text-xs text-gray-500 mb-0.5">📋 Asunto:</p>
          <p className="font-bold text-sm text-gray-900">
            {comunicacion.asunto || 'Sin asunto'}
          </p>
        </div>

        {/* Clasificación IA */}
        {clasificacionIA && (
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">🤖 Clasificación IA:</p>
              <Badge
                className="text-xs font-semibold"
                style={{
                  background: confianzaIA >= 95 ? '#10B981' :
                    confianzaIA >= 85 ? '#F59E0B' : '#DC2626',
                  color: 'white'
                }}
              >
                {confianzaIA.toFixed(1)}%
              </Badge>
            </div>
            <p className="font-bold text-sm text-gray-900">
              {clasificacionIA.tipoDetectado}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              → {clasificacionIA.moduloSugerido}
            </p>
          </div>
        )}

        {/* Contenido */}
        <div className="mb-1.5 pb-1.5 border-b border-gray-200 flex-1 overflow-y-auto max-h-[150px]">
          <p className="text-xs text-gray-500 mb-0.5">✉️ Contenido:</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {comunicacion.cuerpoTexto || 'Sin contenido disponible'}
          </p>
        </div>

        {/* --- SECCIÓN DE DERIVACIÓN MANUAL --- */}
        <div className="mt-auto bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h5 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
            <Send className="w-3 h-3" />
            Derivación / Vinculación
          </h5>

          {/* Selector de Módulo */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => setSelectedModule('DEFENSA')}
              className={`text-xs py-1.5 px-2 rounded-md border text-center transition-all ${selectedModule === 'DEFENSA'
                  ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
            >
              Defensa Judicial
            </button>
            <button
              onClick={() => setSelectedModule('DISCIPLINARIO')}
              className={`text-xs py-1.5 px-2 rounded-md border text-center transition-all ${selectedModule === 'DISCIPLINARIO'
                  ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
            >
              Disciplinario
            </button>
          </div>

          {/* Buscador (Solo si hay módulo seleccionado) */}
          {selectedModule && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex gap-1">
                <Input
                  placeholder={selectedModule === 'DEFENSA' ? "Buscar por radicado, demandante..." : "Buscar por radicado, investigado..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs bg-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button size="sm" onClick={handleSearch} disabled={isSearching} className="h-8 w-8 p-0" variant="outline">
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {/* Resultados */}
              {searchResults.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-md max-h-[120px] overflow-y-auto">
                  {searchResults.map((proc) => (
                    <div
                      key={proc.id}
                      onClick={() => setSelectedProcess(proc)}
                      className={`p-2 text-xs border-b border-gray-100 cursor-pointer hover:bg-blue-50 ${selectedProcess?.id === proc.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                        }`}
                    >
                      <p className="font-bold">{proc.radicado}</p>
                      <p className="text-gray-500 truncate">
                        {selectedModule === 'DEFENSA' ? proc.demandante : proc.investigado || proc.nombreInvestigado}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.length === 0 && searchTerm && !isSearching && (
                <p className="text-xs text-gray-400 text-center italic">No se encontraron resultados</p>
              )}

              {/* Botón Acción Final */}
              <Button
                className="w-full h-8 text-xs mt-2"
                style={{ background: '#003DA5' }}
                disabled={!selectedProcess || linking}
                onClick={executeLink}
              >
                {linking ? 'Vinculando...' : 'Vincular y Mover'}
              </Button>
            </div>
          )}

          {!selectedModule && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={onReclassify}>
                Reclasificar
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs text-gray-500" onClick={onConfirm}>
                Confirmar (Rápido)
              </Button>
            </div>
          )}

        </div>
      </div>
    </Card>
  );
}

// ==================== VISTA LISTA ====================
interface VistaListaProps {
  comunicaciones: CorreoJuridico[];
}

function VistaLista({ comunicaciones }: VistaListaProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const getSemaforoColor = (com: CorreoJuridico) => {
    if (!com.leido) return '#DC2626';
    if (!com.isTrained) return '#F59E0B';
    return '#10B981';
  };

  const getEstadoLabel = (com: CorreoJuridico) => {
    if (!com.leido) return 'NO LEÍDO';
    if (!com.isTrained) return 'PEND. CLASIFICAR';
    return 'PROCESADO';
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'NA';
  };

  const filteredComunicaciones = comunicaciones.filter(c =>
    c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.remitenteNombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.remitenteEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ID o remitente..."
            className="flex-1 bg-transparent border-none outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </div>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Remitente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Asunto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Fecha</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredComunicaciones.map((com) => (
                <tr
                  key={com.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-bold" style={{ color: '#003DA5' }}>
                    {com.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 truncate max-w-xs" title={com.remitenteNombre || com.remitenteEmail}>
                    {com.remitenteNombre || com.remitenteEmail}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-xs">
                    {com.asunto || 'Sin asunto'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {com.tipo}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className="text-xs flex items-center gap-1 w-fit"
                      style={{ color: getSemaforoColor(com) }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: getSemaforoColor(com) }}
                      />
                      {getEstadoLabel(com)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(com.fechaRecepcion).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px]"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px]"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
