/**
 * ModuloAsesoriaJuridicaV3 - MOD-03: Asesoría Jurídica
 * DISEÑO DATATABLE PROFESIONAL CON FILTROS AVANZADOS
 * ✅ CONECTADO CON CONFIGURACIONES CENTRALIZADAS
 */

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Scale, FileText, Clock, AlertTriangle, CheckCircle, User, Building,
  Eye, Edit, Plus, Download, Filter, Search, Calendar, TrendingUp,
  Archive, MessageSquare, History, Send, FileCheck, Mail, Columns3, List,
  AlertCircle, FolderOpen, FileQuestion, SortAsc, SortDesc, XCircle, Trash2, Settings
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { Input } from '../../../ui/input';
import { Textarea } from '../../../ui/textarea';
import { Label } from '../../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { toast } from 'sonner';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { legalService } from '../../../../services/api/legal.service';
import { ModalNuevaConsulta, NuevaConsultaData } from './ModalNuevaConsulta';
import { ModalExpedienteConsulta } from './ModalExpedienteConsulta';

// ✅ Importar configuraciones centralizadas
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';

type VistaModulo = 'tabla' | 'tarjetas';
type OrdenColumna = 'id' | 'fecha' | 'dias' | 'tema';

export function ModuloAsesoriaJuridicaV3() {
  // ✅ Obtener configuraciones desde el Context API
  const { estadosActivos } = useConfiguracionModulo('asesoria-juridica');
  
  const [tipoVista, setTipoVista] = useState<VistaModulo>('tabla');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODAS');
  const [filtroSemaforo, setFiltroSemaforo] = useState<string>('TODOS');
  const [orden, setOrden] = useState<OrdenColumna>('dias');
  const [direccionOrden, setDireccionOrden] = useState<'asc' | 'desc'>('asc');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Estados para modales
  const [modalNuevaConsultaOpen, setModalNuevaConsultaOpen] = useState(false);
  const [modalExpedienteOpen, setModalExpedienteOpen] = useState(false);
  const [consultaSeleccionada, setConsultaSeleccionada] = useState<ConsultaJuridica | null>(null);

  // Data from API
  const [consultas, setConsultas] = useState<any[]>([]);
  const [abogados, setAbogados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState<any>(null);
  const [isExpedienteOpen, setIsExpedienteOpen] = useState(false);
  const [newConsultaData, setNewConsultaData] = useState({
    tipoSolicitud: 'consulta',
    canalEntrada: 'correo_electronico',
    dependenciaSolicitante: '',
    nombreSolicitante: '',
    cargoSolicitante: '',
    emailSolicitante: '',
    telefonoSolicitante: '',
    tipoUsuario: 'interno',
    materiaJuridica: 'administrativo',
    descripcion: '',
    antecedentes: '',
    abogadoAsignadoId: '' // Abogado will be assigned from DB
    // prioridad removed - calculated automatically based on time
  });

  // Load data from API
  useEffect(() => {
    loadConsultas();
    loadAbogados();
  }, []);

  const loadAbogados = async () => {
    try {
      const data = await legalService.getAbogadosDashboard();
      setAbogados(data || []);
    } catch (error) {
      console.error('Error loading abogados:', error);
      setAbogados([]);
    }
  };

  const loadConsultas = async () => {
    try {
      setLoading(true);
      const data = await legalService.getConsultasJuridicas();

      if (!Array.isArray(data)) {
        console.error('Error: La respuesta no es un array', data);
        setConsultas([]);
        return;
      }

      // Map backend data to frontend format
      const mapped = data.map((c: any) => ({
        id: c.numeroRadicado,
        uuid: c.id,
        etapa: mapEstadoToEtapa(c.estado),
        temaJuridico: c.materiaJuridica || 'Administrativo',
        solicitante: c.dependenciaSolicitante || 'Sin dependencia',
        funcionarioSolicitante: c.nombreSolicitante || 'Sin asignar',
        emailSolicitante: c.emailSolicitante || '',
        consulta: c.descripcion || '',
        fechaRadicacion: new Date(c.fechaRecepcion),
        diasTotales: c.terminoLegalDias || 30,
        diasRestantes: c.diasRestantes || 30,
        abogadoAsignado: c.abogadoAsignado?.nombreCompleto || 'Sin asignar',
        abogadoAsignadoId: c.abogadoAsignadoId || c.abogadoAsignado?.id || '', // ID needed for Select
        prioridad: c.prioridad || 'media',
        normativaAplicable: [],
        documentosAdjuntos: []
      }));
      setConsultas(mapped);
    } catch (error) {
      console.error('Error loading consultas:', error);
      toast.error('Error al cargar consultas');
      setConsultas([]);
    } finally {
      setLoading(false);
    }
  };

  const mapEstadoToEtapa = (estado: string): string => {
    const map: Record<string, string> = {
      'en_radicacion': 'RADICADA',
      'asignado': 'ANÁLISIS',
      'en_analisis': 'ANÁLISIS',
      'en_revision': 'RESPUESTA',
      'respondido': 'ENVIADA',
      'cerrado': 'ENVIADA',
      'vencido': 'VENCIDA'
    };
    return map[estado] || 'RADICADA';
  };

  const formatMateriaJuridica = (materia: string): string => {
    const map: Record<string, string> = {
      'laboral': 'Laboral',
      'contractual': 'Contractual',
      'administrativo': 'Administrativo',
      'disciplinario': 'Disciplinario',
      'presupuestal': 'Presupuestal',
      'academico': 'Académico',
      'otra': 'Otra'
    };
    return map[materia?.toLowerCase()] || materia || 'Sin clasificar';
  };

  const formatPrioridad = (prioridad: string): { label: string; color: string; bg: string } => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      'alta': { label: '🔴 Alta', color: '#DC2626', bg: '#FEE2E2' },
      'media': { label: '🟡 Media', color: '#D97706', bg: '#FEF3C7' },
      'baja': { label: '🟢 Baja', color: '#059669', bg: '#D1FAE5' }
    };
    return map[prioridad?.toLowerCase()] || { label: prioridad || 'N/A', color: '#6B7280', bg: '#F3F4F6' };
  };




  const handleCreateConsulta = async () => {
    if (!newConsultaData.descripcion || !newConsultaData.nombreSolicitante || !newConsultaData.abogadoAsignadoId) {
      toast.error('Completa los campos obligatorios (incluyendo Abogado)');
      return;
    }
    const toastId = toast.loading('Creando consulta...');
    try {
      await legalService.createConsultaJuridica({
        ...newConsultaData,
        // Calculate days if not provided
        terminoLegalDias: 30
      });
      toast.success('Consulta creada exitosamente', { id: toastId });
      setIsCreateOpen(false);
      setNewConsultaData({
        tipoSolicitud: 'consulta',
        canalEntrada: 'correo_electronico',
        dependenciaSolicitante: '',
        nombreSolicitante: '',
        cargoSolicitante: '',
        emailSolicitante: '',
        telefonoSolicitante: '',
        tipoUsuario: 'interno',
        materiaJuridica: 'administrativo',
        descripcion: '',
        antecedentes: '',
        abogadoAsignadoId: ''
      });
      loadConsultas();
    } catch (error) {
      console.error(error);
      toast.error('Error al crear consulta', { id: toastId });
    }
  };

  const handleDeleteConsulta = async (uuid: string) => {
    if (!confirm('¿Estás seguro de eliminar esta consulta? Esta acción no se puede deshacer.')) return;
    const toastId = toast.loading('Eliminando consulta...');
    try {
      await legalService.deleteConsultaJuridica(uuid);
      toast.success('Consulta eliminada', { id: toastId });
      setModalExpedienteOpen(false);
      setConsultaSeleccionada(null);
      loadConsultas();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar', { id: toastId });
    }
  };

  const consultasFiltradas = useMemo(() => {
    let resultado = [...consultas];

    // Filtro de búsqueda
    if (busqueda) {
      resultado = resultado.filter(c =>
        c.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.temaJuridico.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.solicitante.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.abogadoAsignado.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Filtro por etapa
    if (filtroEtapa !== 'TODAS') {
      resultado = resultado.filter(c => c.etapa === filtroEtapa);
    }

    // Filtro por semáforo
    if (filtroSemaforo !== 'TODOS') {
      resultado = resultado.filter(c => {
        if (filtroSemaforo === 'ROJO') return c.diasRestantes <= 3;
        if (filtroSemaforo === 'AMARILLO') return c.diasRestantes > 3 && c.diasRestantes <= 5;
        if (filtroSemaforo === 'VERDE') return c.diasRestantes > 5;
        return true;
      });
    }

    // Ordenamiento
    resultado.sort((a, b) => {
      let comparacion = 0;
      switch (orden) {
        case 'id':
          comparacion = a.id.localeCompare(b.id);
          break;
        case 'fecha':
          comparacion = new Date(a.fechaRadicacion).getTime() - new Date(b.fechaRadicacion).getTime();
          break;
        case 'dias':
          comparacion = a.diasRestantes - b.diasRestantes;
          break;
        case 'tema':
          comparacion = a.temaJuridico.localeCompare(b.temaJuridico);
          break;
      }
      return direccionOrden === 'asc' ? comparacion : -comparacion;
    });

    return resultado;
  }, [consultas, busqueda, filtroEtapa, filtroSemaforo, orden, direccionOrden]);

  const handleOrdenar = (columna: OrdenColumna) => {
    if (orden === columna) {
      setDireccionOrden(direccionOrden === 'asc' ? 'desc' : 'asc');
    } else {
      setOrden(columna);
      setDireccionOrden('asc');
    }
  };

  const handleNuevaConsulta = async (data: NuevaConsultaData) => {
    try {
      const response = await legalService.createConsultaJuridica({
        materiaJuridica: data.temaJuridico.toLowerCase(),
        dependenciaSolicitante: data.solicitante,
        nombreSolicitante: data.funcionarioSolicitante,
        emailSolicitante: data.emailSolicitante,
        cargoSolicitante: data.cargo,
        descripcion: data.consulta,
        prioridad: data.prioridad.toLowerCase(),
        terminoLegalDias: 30
      });

      // Recargar listado de consultas
      await loadConsultas();

      toast.success('✅ Consulta creada exitosamente', {
        description: `${response.numeroRadicado} - ${data.temaJuridico}`
      });
    } catch (error) {
      console.error('Error al crear consulta:', error);
      toast.error('Error al crear la consulta');
    }
  };

  const handleAbrirExpediente = (consulta: ConsultaJuridica) => {
    setConsultaSeleccionada(consulta);
    setModalExpedienteOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header con ModuleHeader - SIN toggleView */}
      <ModuleHeader
        title="Asesoría Jurídica"
        subtitle="Seguimiento a consultas y términos de respuesta"
        buttons={[
          {
            label: 'Nueva Consulta',
            labelMobile: 'Nueva',
            icon: <Plus className="w-4 h-4" />,
            onClick: () => setIsCreateOpen(true),
            // onClick: () => setModalNuevaConsultaOpen(true),
            variant: 'primary'
          }
        ]}
        infoTooltip={
          <ModuleInfoTooltip
            title="Guía de Asesoría Jurídica"
            variant="icon"
            sections={[
              {
                label: "🔗 Procedencia del Flujo",
                content: "Las consultas llegan de dos formas: 1) Correos clasificados por IA desde Centro de Comunicaciones, 2) Solicitudes directas de áreas administrativas de ESAP (Contratación, Talento Humano, Académica, etc.).",
                type: "info"
              },
              {
                label: "⚖️ Propósito del Módulo",
                content: "Gestión de consultas jurídicas internas sobre: contratación pública, laboral, administrativo, disciplinario, regulatorio, propiedad intelectual y demás temas legales que requieran conceptos técnicos especializados.",
                type: "default"
              },
              {
                label: "🔄 Flujo de Trabajo (5 Etapas)",
                content: "1️⃣ PENDIENTE: Consulta recibida, pendiente de asignación → 2️⃣ EN ANÁLISIS: Profesional asignado investiga normativa y jurisprudencia → 3️⃣ BORRADOR: Concepto redactado, pendiente de revisión → 4️⃣ REVISIÓN: Coordinador jurídico valida concepto → 5️⃣ CONCEPTO EMITIDO: Respuesta enviada al área solicitante.",
                type: "premium"
              },
              {
                label: "⏰ SLA (Service Level Agreement)",
                content: "Plazos de respuesta según prioridad: 🔴 URGENTE: 24 horas | 🟠 ALTA: 3 días | 🟡 MEDIA: 5 días | 🟢 BAJA: 10 días. El sistema alerta 1 día antes del vencimiento.",
                type: "warning"
              },
              {
                label: "📊 Temas de Consulta",
                content: "Clasificación automática por materia: Contratación (35%), Laboral (25%), Administrativo (20%), Disciplinario (10%), Otros (10%). Permite análisis de demanda de asesoría por área.",
                type: "default"
              },
              {
                label: "👨‍💼 Asignación Inteligente",
                content: "El sistema sugiere el profesional más adecuado según: 1) Especialización en el tema, 2) Carga de trabajo actual, 3) Experiencia previa en temas similares.",
                type: "premium"
              },
              {
                label: "🔗 Integración con Otros Módulos",
                content: "Se conecta con: • Centro Comunicaciones (recepción de consultas) • Defensa Judicial (conceptos para contestación de demandas) • Juzgamiento (conceptos sobre calificación de faltas) • Términos e Informes (SLA tracking).",
                type: "success"
              },
              {
                label: "💡 Cómo Usar",
                content: "1️⃣ Click 'Nueva Consulta' si llega por canal no digital → 2️⃣ Sistema asigna automáticamente o asigna manualmente → 3️⃣ Profesional mueve a 'En Análisis' al iniciar → 4️⃣ Redacta concepto y mueve a 'Borrador' → 5️⃣ Coordinador revisa y aprueba → 6️⃣ Sistema notifica al solicitante.",
                type: "default"
              },
              {
                label: "⏭️ Siguiente Paso",
                content: "Cuando el concepto emitido recomienda acciones legales: • Si es demanda → Derivar a Defensa Judicial • Si es proceso disciplinario → Derivar a Juzgamiento • Si es contrato → Coordinar con Contratación.",
                type: "info"
              }
            ]}
          />
        }
      />

      {/* Métricas */}
      <ModuleMetrics
        metrics={[
          {
            icon: <FileQuestion className="w-5 h-5 text-purple-600" />,
            value: consultas.length,
            label: 'Consultas Totales'
          },
          {
            icon: <AlertCircle className="w-5 h-5 text-red-600" />,
            value: consultasFiltradas.filter(c => c.diasRestantes <= 3).length,
            label: 'Críticas'
          },
          {
            icon: <CheckCircle className="w-5 h-5 text-green-600" />,
            value: consultasFiltradas.filter(c => c.diasRestantes > 5).length,
            label: 'En Término'
          }
        ]}
      />

      {/* Filtros y búsqueda */}
      <ModuleFilters
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        searchPlaceholder="Buscar por ID, tema, solicitante, abogado..."
        filters={[
          {
            type: 'select',
            value: filtroEtapa,
            onChange: setFiltroEtapa,
            options: [
              { value: 'TODAS', label: 'Todas las etapas' },
              { value: 'RADICADA', label: 'Radicada' },
              { value: 'ANÁLISIS', label: 'En Análisis' },
              { value: 'RESPUESTA', label: 'En Respuesta' },
              { value: 'ENVIADA', label: 'Enviada' }
            ]
          },
          {
            type: 'select',
            value: filtroSemaforo,
            onChange: setFiltroSemaforo,
            options: [
              { value: 'TODOS', label: 'Todas las prioridades' },
              { value: 'ROJO', label: '🔴 Críticas (≤3 días)' },
              { value: 'AMARILLO', label: '🟡 Urgentes (4-5 días)' },
              { value: 'VERDE', label: '🟢 En término (>5 días)' }
            ]
          }
        ]}
        totalItems={consultas.length}
        filteredItems={consultasFiltradas.length}
        onClearFilters={() => {
          setBusqueda('');
          setFiltroEtapa('TODAS');
          setFiltroSemaforo('TODOS');
        }}
        counterText={`Mostrando ${consultasFiltradas.length} de ${consultas.length} consultas`}
      />

      {/* Tabla o Tarjetas */}
      {tipoVista === 'tabla' ? (
        <TablaConsultas
          consultas={consultasFiltradas}
          orden={orden}
          direccionOrden={direccionOrden}
          onOrdenar={handleOrdenar}
          onAbrirExpediente={handleAbrirExpediente}
          onEliminar={handleDeleteConsulta}
        />
      ) : (
        <TarjetasConsultas
          consultas={consultasFiltradas}
          onAbrirExpediente={handleAbrirExpediente}
          onEliminar={handleDeleteConsulta}
        />
      )}

      {/* MODALES */}
      {modalNuevaConsultaOpen && (
        <ModalNuevaConsulta
          isOpen={modalNuevaConsultaOpen}
          onClose={() => setModalNuevaConsultaOpen(false)}
          onSubmit={handleNuevaConsulta}
        />
      )}

      {modalExpedienteOpen && consultaSeleccionada && (
        <ModalExpedienteConsulta
          isOpen={modalExpedienteOpen}
          onClose={() => {
            setModalExpedienteOpen(false);
            setConsultaSeleccionada(null);
          }}
          consulta={consultaSeleccionada}
          onUpdate={loadConsultas}
        />
      )}

      {/* Modal Expediente */}
      {/* Modal Expediente eliminado (usar ModalExpedienteConsulta) */}

      {/* Dialog para crear nueva consulta */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-600" />
              Nueva Consulta Jurídica
            </DialogTitle>
            <DialogDescription>Registra una nueva solicitud de asesoría jurídica.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Tipo y Canal */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo de Solicitud *</Label>
                <Select
                  value={newConsultaData.tipoSolicitud}
                  onValueChange={(v: string) => setNewConsultaData({ ...newConsultaData, tipoSolicitud: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="consulta">Consulta</SelectItem>
                    <SelectItem value="concepto_juridico">Concepto Jurídico</SelectItem>
                    <SelectItem value="control_legalidad">Control de Legalidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Canal de Entrada</Label>
                <Select
                  value={newConsultaData.canalEntrada}
                  onValueChange={(v: string) => setNewConsultaData({ ...newConsultaData, canalEntrada: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="correo_electronico">Correo Electrónico</SelectItem>
                    <SelectItem value="active_document">Active Document</SelectItem>
                    <SelectItem value="ventanilla_unica">Ventanilla Única</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Solicitante */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Dependencia Solicitante</Label>
                <Input
                  placeholder="Ej: Dirección de Contratación"
                  value={newConsultaData.dependenciaSolicitante}
                  onChange={e => setNewConsultaData({ ...newConsultaData, dependenciaSolicitante: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Nombre del Solicitante *</Label>
                <Input
                  placeholder="Nombre completo"
                  value={newConsultaData.nombreSolicitante}
                  onChange={e => setNewConsultaData({ ...newConsultaData, nombreSolicitante: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Cargo</Label>
                <Input
                  placeholder="Cargo del solicitante"
                  value={newConsultaData.cargoSolicitante}
                  onChange={e => setNewConsultaData({ ...newConsultaData, cargoSolicitante: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="correo@esap.edu.co"
                  value={newConsultaData.emailSolicitante}
                  onChange={e => setNewConsultaData({ ...newConsultaData, emailSolicitante: e.target.value })}
                />
              </div>
            </div>

            {/* Materia y Abogado Asignado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Materia Jurídica</Label>
                <Select
                  value={newConsultaData.materiaJuridica}
                  onValueChange={(v: string) => setNewConsultaData({ ...newConsultaData, materiaJuridica: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="laboral">Laboral</SelectItem>
                    <SelectItem value="contractual">Contractual</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="disciplinario">Disciplinario</SelectItem>
                    <SelectItem value="presupuestal">Presupuestal</SelectItem>
                    <SelectItem value="academico">Académico</SelectItem>
                    <SelectItem value="otra">Otra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Abogado Asignado *</Label>
                <Select
                  value={newConsultaData.abogadoAsignadoId || 'none'}
                  onValueChange={(v: string) => setNewConsultaData({ ...newConsultaData, abogadoAsignadoId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar abogado..." /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {abogados.map((abogado) => (
                      <SelectItem key={abogado.id} value={abogado.id}>
                        {abogado.nombreCompleto || abogado.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descripción */}
            <div className="grid gap-2">
              <Label>Descripción de la Consulta *</Label>
              <Textarea
                placeholder="Describe detalladamente la consulta o solicitud..."
                value={newConsultaData.descripcion}
                onChange={e => setNewConsultaData({ ...newConsultaData, descripcion: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            {/* Antecedentes */}
            <div className="grid gap-2">
              <Label>Antecedentes (opcional)</Label>
              <Textarea
                placeholder="Antecedentes relevantes si los hay..."
                value={newConsultaData.antecedentes}
                onChange={e => setNewConsultaData({ ...newConsultaData, antecedentes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateConsulta} style={{ background: '#003DA5' }}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Consulta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

interface TablaConsultasProps {
  consultas: ConsultaJuridica[];
  orden: OrdenColumna;
  direccionOrden: 'asc' | 'desc';
  onOrdenar: (columna: OrdenColumna) => void;
  onAbrirExpediente: (consulta: ConsultaJuridica) => void;
  onEliminar: (uuid: string) => void;
}

function TablaConsultas({ consultas, orden, direccionOrden, onOrdenar, onAbrirExpediente, onEliminar }: TablaConsultasProps) {
  return (
    <Card className="bg-white border border-gray-200">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">
              <button
                className="flex items-center gap-1"
                onClick={() => onOrdenar('id')}
              >
                ID
                {orden === 'id' && (
                  <span className="text-xs">
                    {direccionOrden === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
                  </span>
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">
              <button
                className="flex items-center gap-1"
                onClick={() => onOrdenar('fecha')}
              >
                Fecha
                {orden === 'fecha' && (
                  <span className="text-xs">
                    {direccionOrden === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
                  </span>
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">
              <button
                className="flex items-center gap-1"
                onClick={() => onOrdenar('dias')}
              >
                Días Restantes
                {orden === 'dias' && (
                  <span className="text-xs">
                    {direccionOrden === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
                  </span>
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">
              <button
                className="flex items-center gap-1"
                onClick={() => onOrdenar('tema')}
              >
                Tema Jurídico
                {orden === 'tema' && (
                  <span className="text-xs">
                    {direccionOrden === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
                  </span>
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Solicitante</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Abogado Asignado</th>
            <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {consultas.map((consulta) => (
            <tr key={consulta.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-500">{consulta.id}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{new Date(consulta.fechaRadicacion).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                <Badge
                  className="text-xs flex items-center gap-1 font-semibold"
                  style={{
                    background: consulta.diasRestantes <= 3 ? '#DC2626' : consulta.diasRestantes <= 5 ? '#F59E0B' : '#10B981',
                    color: '#FFFFFF',
                    border: 'none'
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-white" />
                  {consulta.diasRestantes} días
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{consulta.temaJuridico}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{consulta.solicitante}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{consulta.abogadoAsignado}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                <Button
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); onAbrirExpediente(consulta); }}
                  // onClick={(e: React.MouseEvent) => { 
                  //   e.stopPropagation(); 
                  //   onAbrirExpediente(consulta);
                  // }}
                  size="sm"
                  className="w-full text-xs font-bold truncate"
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <Archive className="w-3 h-3 mr-1 flex-shrink-0" /><span className="truncate">Expediente</span>
                </Button>
                <Button
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEliminar(consulta.uuid); }}
                  size="sm"
                  variant="outline"
                  className="mt-1 w-full text-xs text-red-600 bg-red-50 hover:bg-red-100 border-red-200"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

interface TarjetasConsultasProps {
  consultas: ConsultaJuridica[];
  onAbrirExpediente: (consulta: ConsultaJuridica) => void;
  onEliminar: (uuid: string) => void;
}

function TarjetasConsultas({ consultas, onAbrirExpediente, onEliminar }: TarjetasConsultasProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {consultas.map((consulta) => (
        <Card key={consulta.id} className="bg-white border border-gray-200 hover:shadow-md transition-all flex flex-col w-full" style={{ height: '680px', minHeight: '680px', maxHeight: '680px' }}>
          <div className="h-1 flex-shrink-0" style={{ background: '#003DA5' }} />

          <div className="p-2.5 flex-1 flex flex-col overflow-y-auto min-h-0">
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: '#E0EDFF' }}>
                  <FileQuestion className="w-4 h-4" style={{ color: '#003DA5' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm truncate" style={{ color: '#003DA5' }}>{consulta.id}</h4>
                  <p className="text-xs text-gray-600 truncate">{consulta.temaJuridico}</p>
                </div>
              </div>
            </div>

            <div className="mb-1.5 pb-1.5 border-b border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5">👤 Solicitante:</p>
              <p className="font-bold text-sm text-gray-900 line-clamp-1">{consulta.solicitante}</p>
              <p className="text-xs text-gray-600">{consulta.funcionarioSolicitante}</p>
            </div>

            <div className="mb-1.5 pb-1.5 border-b border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5">📋 Consulta:</p>
              <p className="font-bold text-sm text-gray-900 line-clamp-2">{consulta.consulta?.substring(0, 100) || 'Sin descripción'}...</p>
            </div>

            <div className="mb-1.5 pb-1.5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarFallback className="text-xs" style={{ background: '#E0EDFF', color: '#003DA5' }}>
                    {consulta.abogadoAsignado.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">👨‍💼 Profesional:</p>
                  <p className="font-bold text-sm text-gray-900 line-clamp-1">{consulta.abogadoAsignado}</p>
                  <p className="text-xs text-gray-600">CC 80123456</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <Badge
                className="text-xs flex items-center gap-1 font-semibold"
                style={{
                  background: consulta.diasRestantes <= 3 ? '#DC2626' : consulta.diasRestantes <= 5 ? '#F59E0B' : '#10B981',
                  color: '#FFFFFF',
                  border: 'none'
                }}
              >
                <div className="w-2 h-2 rounded-full bg-white" />
                {consulta.diasRestantes} días
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-1.5">
              <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-xs font-bold text-gray-700">{consulta.documentosAdjuntos?.length || 0}</p>
                <p className="text-xs text-gray-500">Docs</p>
              </div>
              <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-xs font-bold text-gray-700">{consulta.normativaAplicable?.length || 0}</p>
                <p className="text-xs text-gray-500">Normas</p>
              </div>
              <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-xs font-bold text-gray-700">{Math.round(((consulta.diasTotales - consulta.diasRestantes) / consulta.diasTotales) * 100)}%</p>
                <p className="text-xs text-gray-500">Tiempo</p>
              </div>
            </div>

            <div className="mb-1.5">
              <p className="text-xs text-gray-500 mb-0.5">Normativa:</p>
              <p className="text-xs text-gray-700 line-clamp-1">{consulta.normativaAplicable?.[0] || 'N/A'}</p>
            </div>

            <div className="space-y-1 pt-2 border-t border-gray-200 mt-auto flex-shrink-0">
              <div className="flex gap-2">
                <Button
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); onAbrirExpediente(consulta); }}
                  size="sm"
                  className="flex-1 text-xs font-bold truncate"
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <Archive className="w-3 h-3 mr-1 flex-shrink-0" /><span className="truncate">Expediente</span>
                </Button>
                <Button
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEliminar(consulta.uuid); }}
                  size="sm"
                  variant="outline"
                  className="px-2 bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                  title="Eliminar Consulta"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); toast.info('Documentos Soporte', { description: consulta.id }); }}
                    size="sm"
                    variant="outline"
                    className="text-[11px] px-2 justify-start truncate min-w-0"
                  >
                    <FileText className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Soporte</span>
                  </Button>
                  <Button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); toast.info('Normativa Aplicable', { description: consulta.id }); }}
                    size="sm"
                    variant="outline"
                    className="text-[11px] px-2 justify-start truncate min-w-0"
                  >
                    <Archive className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Normativa</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <Button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); toast.info('Oficios', { description: consulta.id }); }}
                    size="sm"
                    variant="outline"
                    className="text-[11px] px-2 justify-start truncate min-w-0"
                  >
                    <Mail className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Oficios</span>
                  </Button>
                  <Button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); toast.info('Respuesta', { description: consulta.id }); }}
                    size="sm"
                    variant="outline"
                    className="text-[11px] px-2 justify-start truncate min-w-0"
                  >
                    <Send className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Respuesta</span>
                  </Button>
                </div>

                <Button
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); toast.info('Comentarios de la Consulta', { description: consulta.id }); }}
                  size="sm"
                  className="w-full text-[11px] py-2 font-bold"
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                  <span className="truncate">💬 Comentarios de la Consulta</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
