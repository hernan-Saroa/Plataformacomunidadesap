/**
 * ModuloAsesoriaJuridicaV3 - MOD-03: Asesoría Jurídica
 * DISEÑO DATATABLE PROFESIONAL CON FILTROS AVANZADOS
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Scale, FileText, Clock, AlertTriangle, CheckCircle, User, Building,
  Eye, Edit, Plus, Download, Filter, Search, Calendar, TrendingUp,
  Archive, MessageSquare, History, Send, FileCheck, Mail, Columns3, List,
  AlertCircle, FolderOpen, FileQuestion, SortAsc, SortDesc, XCircle
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { Input } from '../../../ui/input';
import { ConsultaJuridica } from '../core/types';
import { consultasJuridicasMock, estadisticasAsesoriaJuridica } from '../data/datosConsultasJuridicas';
import { toast } from 'sonner@2.0.3';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { ModalNuevaConsulta, NuevaConsultaData } from './ModalNuevaConsulta';
import { ModalExpedienteConsulta } from './ModalExpedienteConsulta';

type VistaModulo = 'tabla' | 'tarjetas';
type OrdenColumna = 'id' | 'fecha' | 'dias' | 'tema';

export function ModuloAsesoriaJuridicaV3() {
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

  const consultasFiltradas = useMemo(() => {
    let resultado = [...consultasJuridicasMock];

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
  }, [busqueda, filtroEtapa, filtroSemaforo, orden, direccionOrden]);

  const handleOrdenar = (columna: OrdenColumna) => {
    if (orden === columna) {
      setDireccionOrden(direccionOrden === 'asc' ? 'desc' : 'asc');
    } else {
      setOrden(columna);
      setDireccionOrden('asc');
    }
  };

  const handleNuevaConsulta = (data: NuevaConsultaData) => {
    console.log('Nueva consulta registrada:', data);
    // Aquí se integraría con el backend
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
            onClick: () => setModalNuevaConsultaOpen(true),
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
            value: consultasJuridicasMock.length,
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
        totalItems={consultasJuridicasMock.length}
        filteredItems={consultasFiltradas.length}
        onClearFilters={() => {
          setBusqueda('');
          setFiltroEtapa('TODAS');
          setFiltroSemaforo('TODOS');
        }}
        counterText={`Mostrando ${consultasFiltradas.length} de ${consultasJuridicasMock.length} consultas`}
      />

      {/* Tabla o Tarjetas */}
      {tipoVista === 'tabla' ? (
        <TablaConsultas 
          consultas={consultasFiltradas}
          orden={orden}
          direccionOrden={direccionOrden}
          onOrdenar={handleOrdenar}
          onAbrirExpediente={handleAbrirExpediente}
        />
      ) : (
        <TarjetasConsultas 
          consultas={consultasFiltradas}
          onAbrirExpediente={handleAbrirExpediente}
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
        />
      )}
    </div>
  );
}

interface TablaConsultasProps {
  consultas: ConsultaJuridica[];
  orden: OrdenColumna;
  direccionOrden: 'asc' | 'desc';
  onOrdenar: (columna: OrdenColumna) => void;
  onAbrirExpediente: (consulta: ConsultaJuridica) => void;
}

function TablaConsultas({ consultas, orden, direccionOrden, onOrdenar, onAbrirExpediente }: TablaConsultasProps) {
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
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onAbrirExpediente(consulta);
                  }}
                  size="sm"
                  className="w-full text-xs font-bold truncate"
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <Archive className="w-3 h-3 mr-1 flex-shrink-0" /><span className="truncate">Expediente</span>
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
}

function TarjetasConsultas({ consultas, onAbrirExpediente }: TarjetasConsultasProps) {
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
              <Button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onAbrirExpediente(consulta);
                }}
                size="sm"
                className="w-full text-xs font-bold truncate"
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Archive className="w-3 h-3 mr-1 flex-shrink-0" /><span className="truncate">Expediente</span>
              </Button>

              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    onClick={(e) => { e.stopPropagation(); toast.info('Documentos Soporte', { description: consulta.id }); }}
                    size="sm"
                    variant="outline"
                    className="text-[11px] px-2 justify-start truncate min-w-0"
                  >
                    <FileText className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Soporte</span>
                  </Button>
                  <Button
                    onClick={(e) => { e.stopPropagation(); toast.info('Normativa Aplicable', { description: consulta.id }); }}
                    size="sm"
                    variant="outline"
                    className="text-[11px] px-2 justify-start truncate min-w-0"
                  >
                    <Archive className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Normativa</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <Button
                    onClick={(e) => { e.stopPropagation(); toast.info('Oficios', { description: consulta.id }); }}
                    size="sm"
                    variant="outline"
                    className="text-[11px] px-2 justify-start truncate min-w-0"
                  >
                    <Mail className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Oficios</span>
                  </Button>
                  <Button
                    onClick={(e) => { e.stopPropagation(); toast.info('Respuesta', { description: consulta.id }); }}
                    size="sm"
                    variant="outline"
                    className="text-[11px] px-2 justify-start truncate min-w-0"
                  >
                    <Send className="w-3 h-3 mr-0.5 flex-shrink-0" /><span className="truncate">Respuesta</span>
                  </Button>
                </div>

                <Button
                  onClick={(e) => { e.stopPropagation(); toast.info('Comentarios de la Consulta', { description: consulta.id }); }}
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