
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Folder, FolderOpen, FileText, Upload, Download, Search, Eye,
  ChevronRight, ChevronDown, Plus, Filter, Calendar, User,
  Archive, CheckCircle2, AlertCircle, Clock,
  File, FolderCheck, FileCheck, Scale, Gavel, FileQuestion,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { ModalSIGL } from '../design-system/ModalSIGL';
import { legalService } from '../../../../services/api/legal.service';


// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type TipoProceso =
  | 'DEFENSA_JUDICIAL'
  | 'JUZGAMIENTO'
  | 'ASESORIA'
  | 'PROCESOS_COACTIVOS'
  | 'ORGANOS_CONTROL'
  | 'OTRO';

type TipoDocumento =
  | 'DEMANDA'
  | 'CONTESTACION'
  | 'PRUEBAS'
  | 'SENTENCIAS'
  | 'TUTELAS'
  | 'RECURSOS'
  | 'CONCEPTOS'
  | 'ACTAS'
  | 'NOTIFICACIONES'
  | 'OFICIOS'
  | 'OTROS';

interface Documento {
  id: string;
  nombre: string;
  tipo: TipoDocumento;
  tipoArchivo: string;
  tamanio: string;
  fechaCreacion: string;
  autor: string;
  // Campos adicionales para lógica de negocio
  url?: string;
}

interface Expediente {
  id: string;
  radicado: string;
  nombreProceso: string;
  tipoProceso: TipoProceso;
  fechaInicio: string;
  fechaActualizacion: string;
  estado: 'ACTIVO' | 'EN_PROCESO' | 'FINALIZADO';
  responsable: string;
  totalDocumentos: number;
  documentos: Documento[];
}

type VistaActual = 'expedientes' | 'estadisticas';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE TIPOS DE DOCUMENTOS
// ════════════════════════════════════════════════════════════════════════════

const TIPOS_DOCUMENTO = [
  {
    id: 'DEMANDA' as TipoDocumento,
    nombre: 'Demandas',
    descripcion: 'Demandas presentadas contra ESAP',
    color: 'red',
    icon: Scale
  },
  {
    id: 'CONTESTACION' as TipoDocumento,
    nombre: 'Contestaciones',
    descripcion: 'Contestaciones y respuestas a demandas',
    color: 'blue',
    icon: FileText
  },
  {
    id: 'PRUEBAS' as TipoDocumento,
    nombre: 'Pruebas',
    descripcion: 'Documentos probatorios, evidencias, anexos',
    color: 'green',
    icon: FolderCheck
  },
  {
    id: 'SENTENCIAS' as TipoDocumento,
    nombre: 'Sentencias y Fallos',
    descripcion: 'Sentencias, autos, providencias judiciales',
    color: 'purple',
    icon: Gavel
  },
  {
    id: 'TUTELAS' as TipoDocumento,
    nombre: 'Tutelas',
    descripcion: 'Acciones de tutela y respuestas',
    color: 'orange',
    icon: AlertCircle
  },
  {
    id: 'RECURSOS' as TipoDocumento,
    nombre: 'Recursos',
    descripcion: 'Recursos de apelación, reposición, casación',
    color: 'indigo',
    icon: FileCheck
  },
  {
    id: 'CONCEPTOS' as TipoDocumento,
    nombre: 'Conceptos Jurídicos',
    descripcion: 'Conceptos, memoriales, alegatos',
    color: 'cyan',
    icon: FileQuestion
  },
  {
    id: 'ACTAS' as TipoDocumento,
    nombre: 'Actas',
    descripcion: 'Actas de audiencias, reuniones, diligencias',
    color: 'yellow',
    icon: FileText
  },
  {
    id: 'NOTIFICACIONES' as TipoDocumento,
    nombre: 'Notificaciones',
    descripcion: 'Notificaciones judiciales y extrajudiciales',
    color: 'pink',
    icon: Archive
  },
  {
    id: 'OFICIOS' as TipoDocumento,
    nombre: 'Oficios',
    descripcion: 'Oficios enviados y recibidos',
    color: 'teal',
    icon: File
  },
  {
    id: 'OTROS' as TipoDocumento,
    nombre: 'Otros Documentos',
    descripcion: 'Documentos varios no clasificados',
    color: 'gray',
    icon: File
  }
];

// Placeholder para Coactivos que no está implementado en backend aún
const EXPEDIENTES_COACTIVOS_MOCK: Expediente[] = [
  {
    id: 'exp-coa-001',
    radicado: 'PC-2025-001',
    nombreProceso: 'Coactivo - Juan Carlos Pérez (Matrícula)',
    tipoProceso: 'PROCESOS_COACTIVOS',
    fechaInicio: '2024-08-15',
    fechaActualizacion: '2024-12-20',
    estado: 'EN_PROCESO',
    responsable: 'Dra. Laura Sánchez',
    totalDocumentos: 1,
    documentos: [
      { id: 'd20', nombre: 'Título Ejecutivo Matrícula.pdf', tipo: 'PRUEBAS', tipoArchivo: 'PDF', tamanio: '345 KB', fechaCreacion: '2024-08-15', autor: 'Oficina Financiera' },
    ]
  },
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ExpedientesModuloSIGL() {
  const [vistaActiva, setVistaActiva] = useState<VistaActual>('expedientes');
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [cargando, setCargando] = useState(true);

  // Helper para mapear estado del backend al frontend
  const mapEstado = (estadoBackend: string = ''): 'ACTIVO' | 'EN_PROCESO' | 'FINALIZADO' => {
    const estado = estadoBackend.toUpperCase();
    if (['FINALIZADO', 'CERRADO', 'ARCHIVADO', 'PRESCRITO', 'RESUELTA', 'RECHAZADA'].some(s => estado.includes(s))) return 'FINALIZADO';
    if (['EN_PROCESO', 'TRAMITE', 'EJECUCION', 'INDAGACION', 'INVESTIGACION', 'VALORACION', 'ASIGNADA'].some(s => estado.includes(s))) return 'EN_PROCESO';
    return 'ACTIVO';
  };

  // Helper para mapear tipo de documento según nombre/tipo backend
  const mapearTipoDocumento = (nombre: string = '', tipo: string = ''): TipoDocumento => {
    const texto = (nombre + ' ' + tipo).toUpperCase();
    if (texto.includes('DEMANDA')) return 'DEMANDA';
    if (texto.includes('CONTESTACION') || texto.includes('RESPUESTA')) return 'CONTESTACION';
    if (texto.includes('PRUEBA') || texto.includes('EVIDENCIA') || texto.includes('TESTIMONIO')) return 'PRUEBAS';
    if (texto.includes('SENTENCIA') || texto.includes('FALLO') || texto.includes('AUTO')) return 'SENTENCIAS';
    if (texto.includes('TUTELA')) return 'TUTELAS';
    if (texto.includes('RECURSO') || texto.includes('APELACION') || texto.includes('REPOSICION')) return 'RECURSOS';
    if (texto.includes('CONCEPTO') || texto.includes('MEMORIAL') || texto.includes('ALEGATO')) return 'CONCEPTOS';
    if (texto.includes('ACTA')) return 'ACTAS';
    if (texto.includes('NOTIFICACION') || texto.includes('CITACION')) return 'NOTIFICACIONES';
    if (texto.includes('OFICIO') || texto.includes('CARTA')) return 'OFICIOS';
    return 'OTROS';
  };

  const cargarExpedientes = async () => {
    try {
      setCargando(true);

      // Fetch concurrent from ALL legal services
      const [legalRes, juzgamientoRes, asesoriaRes, ocRes] = await Promise.allSettled([
        legalService.getExpedientes(),
        legalService.getJuzgamientoProcesos(),
        legalService.getConsultasJuridicas(),
        legalService.getRequerimientosOC()
      ]);

      const nuevosExpedientes: Expediente[] = [];

      // 1. Procesar DEFENSA JUDICIAL (Excluyendo Disciplinario)
      if (legalRes.status === 'fulfilled') {
        const procesosJudiciales = legalRes.value;
        for (const proc of procesosJudiciales) {
          if (proc.jurisdiccion?.toUpperCase() === 'DISCIPLINARIO' || proc.tipoProceso?.toUpperCase() === 'DISCIPLINARIO') {
            continue;
          }

          let docsExp: Documento[] = [];
          try {
            const docs = await legalService.getDocumentos(proc.id);
            if (Array.isArray(docs)) {
              docsExp = docs.map(d => ({
                id: d.id,
                nombre: d.nombre,
                tipo: d.tipo ? mapearTipoDocumento(d.nombre, d.tipo) : mapearTipoDocumento(d.nombre, 'OTROS'),
                tipoArchivo: d.archivoMimeType?.split('/')[1]?.toUpperCase() || 'PDF',
                tamanio: d.archivoTamano ? (d.archivoTamano / 1024).toFixed(0) + ' KB' : 'Unknown',
                fechaCreacion: d.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                autor: d.subidoPor || 'Sistema',
                url: d.archivoUrl
              }));
            }
          } catch (error) {
            console.warn(`Error cargando documentos para expediente judicial ${proc.id}`, error);
          }

          let tipoProc: TipoProceso = 'DEFENSA_JUDICIAL';
          if (proc.tipoProceso === 'Procesos Coactivos') tipoProc = 'PROCESOS_COACTIVOS';
          else if (proc.tipoProceso === 'Otro') tipoProc = 'OTRO';

          nuevosExpedientes.push({
            id: proc.id,
            radicado: proc.radicado,
            nombreProceso: `${proc.jurisdiccion || 'Proceso'} - ${proc.demandante} vs ${proc.demandado}`,
            tipoProceso: tipoProc,
            fechaInicio: proc.createdAt?.split('T')[0],
            fechaActualizacion: proc.updatedAt?.split('T')[0],
            estado: mapEstado(proc.estado),
            responsable: proc.abogadoSustanciador || 'No asignado',
            totalDocumentos: docsExp.length,
            documentos: docsExp
          });
        }
      }

      // 2. Procesar JUZGAMIENTO (Local Legal Service)
      if (juzgamientoRes.status === 'fulfilled') {
        const procesosJuzgamiento = juzgamientoRes.value;
        procesosJuzgamiento.forEach(proc => {
          const docsExp: Documento[] = (proc.documentos || []).map((d: any) => ({
            id: d.id || d.uuid,
            nombre: d.documentoNombre || d.archivoNombre || d.descripcion || 'Documento sin nombre',
            tipo: mapearTipoDocumento(d.documentoNombre || d.archivoNombre || d.descripcion, d.tipoActuacion || d.tipo),
            tipoArchivo: (d.documentoUrl || d.archivoUrl) ? (d.documentoUrl || d.archivoUrl).split('.').pop()?.toUpperCase() : 'PDF',
            tamanio: d.archivoTamano ? (d.archivoTamano / 1024).toFixed(0) + ' KB' : 'Unknown',
            fechaCreacion: d.fechaActuacion?.split('T')[0] || d.fechaPresentacion?.split('T')[0] || new Date().toISOString().split('T')[0],
            autor: d.usuarioResponsable || d.aportadoPor || 'Sistema',
            url: d.documentoUrl || d.archivoUrl
          })).filter((d: any) => d.url);

          nuevosExpedientes.push({
            id: proc.id,
            radicado: proc.radicado,
            nombreProceso: `Disciplinario - ${proc.etapa}`,
            tipoProceso: 'JUZGAMIENTO',
            fechaInicio: new Date().toISOString().split('T')[0],
            fechaActualizacion: new Date().toISOString().split('T')[0],
            estado: 'EN_PROCESO',
            responsable: proc.abogadoAsignado || 'No asignado',
            totalDocumentos: docsExp.length,
            documentos: docsExp
          });
        });
      }

      // 3. Procesar ASESORIA JURIDICA (Consultas)
      if (asesoriaRes.status === 'fulfilled') {
        const consultas = asesoriaRes.value;
        for (const cons of consultas) {
          let docsExp: Documento[] = [];
          try {
            const docs = await legalService.getDocumentosConsulta(cons.id);
            if (Array.isArray(docs)) {
              docsExp = docs.map(d => ({
                id: d.id,
                nombre: d.nombre,
                // Si el tipo viene vacío, intentamos inferirlo del nombre, o default a OTROS
                tipo: d.tipo ? mapearTipoDocumento(d.nombre, d.tipo) : mapearTipoDocumento(d.nombre, 'OTROS'),
                tipoArchivo: d.archivoMimeType?.split('/')[1]?.toUpperCase() || 'PDF', // Default
                tamanio: d.archivoTamano ? (d.archivoTamano / 1024).toFixed(0) + ' KB' : 'Unknown',
                fechaCreacion: d.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                autor: d.subidoPor || 'Sistema',
                url: d.archivoUrl
              }));
            }
          } catch (error) {
            console.warn(`Error cargando documentos para consulta ${cons.id}`, error);
          }

          nuevosExpedientes.push({
            id: cons.id,
            radicado: cons.codigo || cons.id.substring(0, 8).toUpperCase(),
            nombreProceso: cons.asunto || 'Consulta Jurídica',
            tipoProceso: 'ASESORIA',
            fechaInicio: cons.createdAt?.split('T')[0],
            fechaActualizacion: cons.updatedAt?.split('T')[0],
            estado: mapEstado(cons.estado),
            responsable: cons.abogadoResponsable?.nombre || cons.responsable || 'No asignado',
            totalDocumentos: docsExp.length,
            documentos: docsExp
          });
        }
      }

      // 4. Procesar ORGANOS DE CONTROL (Requerimientos)
      if (ocRes.status === 'fulfilled') {
        const requerimientosOC = ocRes.value;
        requerimientosOC.forEach(req => {
          const docsExp: Documento[] = (req.documentos || []).map((d: any) => ({
            id: d.id,
            nombre: d.nombre,
            tipo: mapearTipoDocumento(d.nombre, d.tipoDocumento),
            tipoArchivo: d.archivoUrl ? d.archivoUrl.split('.').pop()?.toUpperCase() : 'PDF',
            tamanio: 'Unknown',
            fechaCreacion: d.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
            autor: d.subidoPor || 'Sistema',
            url: d.archivoUrl
          }));

          nuevosExpedientes.push({
            id: req.id,
            radicado: req.radicadoExterno || req.codigo || req.id.substring(0, 8).toUpperCase(),
            nombreProceso: `OC - ${req.entidad || 'Entidad'} - ${req.asunto}`,
            tipoProceso: 'ORGANOS_CONTROL',
            fechaInicio: req.fechaRadicacion?.split('T')[0] || req.createdAt?.split('T')[0],
            fechaActualizacion: req.updatedAt?.split('T')[0],
            estado: mapEstado(req.estado),
            responsable: req.responsable || 'No asignado',
            totalDocumentos: docsExp.length,
            documentos: docsExp
          });
        });
      }

      // 4. Agregar mock de COACTIVOS (Placeholder) - ELIMINADO por solicitud
      // nuevosExpedientes.push(...EXPEDIENTES_COACTIVOS_MOCK);

      setExpedientes(nuevosExpedientes);

    } catch (error) {
      console.error('Error cargando expedientes:', error);
      toast.error('Error al cargar expedientes electrónicos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarExpedientes();
  }, []);

  const handleDocumentoUpload = async (expediente: Expediente, file: File, tipoId: string) => {
    try {
      toast.promise(
        async () => {
          if (expediente.tipoProceso === 'DEFENSA_JUDICIAL' || expediente.tipoProceso === 'OTRO') {
            // Carga para Defensa Judicial
            const formData = new FormData();
            formData.append('file', file);
            formData.append('expedienteId', expediente.id);
            formData.append('tipo', tipoId); // Enviar el ID del tipo (ej: DEMANDA) como tipo string
            formData.append('nombre', file.name);
            await legalService.crearDocumento(formData);

          } else if (expediente.tipoProceso === 'JUZGAMIENTO') {
            // Carga para Juzgamiento (Legal Service)
            await legalService.uploadJuzgamientoDocumento(
              expediente.radicado, // Usa radicado como ID
              file,
              tipoId, // tipo
              `Cargado desde Expedientes Electrónicos` // descripcion
            );
          } else if (expediente.tipoProceso === 'ASESORIA') {
            // Carga para Asesoría
            const formData = new FormData();
            formData.append('file', file);
            formData.append('tipo', tipoId);
            formData.append('nombre', file.name);
            await legalService.uploadDocumentoConsulta(expediente.id, formData);
          } else if (expediente.tipoProceso === 'PROCESOS_COACTIVOS') {
            throw new Error('Módulo Coactivos no implementado');
          }

          // Recargar expedientes para ver el nuevo documento
          await cargarExpedientes();
        },
        {
          loading: 'Subiendo documento...',
          success: 'Documento cargado exitosamente',
          error: 'Error al cargar documento'
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Expedientes Electrónicos
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Sistema Integrado de Gestión Legal (SIGL v5.0)
          </p>
        </div>

        {/* Navegación Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <TabButton
            active={vistaActiva === 'expedientes'}
            onClick={() => setVistaActiva('expedientes')}
            icon={<Folder className="w-4 h-4" />}
            label="Expedientes por Proceso"
            badge={expedientes.length.toString()}
          />
          <TabButton
            active={vistaActiva === 'estadisticas'}
            onClick={() => setVistaActiva('estadisticas')}
            icon={<BarChart3 className="w-4 h-4" />}
            label="Estadísticas"
          />
        </div>
      </div>

      {/* Contenido */}
      <AnimatePresence mode="wait">
        <motion.div
          key={vistaActiva}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {cargando ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-4 border-[#003DA5] border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">Cargando expedientes...</span>
            </div>
          ) : (
            <>
              {vistaActiva === 'expedientes' &&
                <VistaExpedientes
                  expedientes={expedientes}
                  onUpload={handleDocumentoUpload}
                />
              }
              {vistaActiva === 'estadisticas' &&
                <VistaEstadisticas
                  expedientes={expedientes}
                />
              }
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB BUTTON
// ════════════════════════════════════════════════════════════════════════════

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-4 sm:px-6 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-all
        ${active
          ? 'border-[#003DA5] text-[#003DA5] bg-blue-50/50'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
      `}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(' ')[0]}</span>
      {badge && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${active ? 'bg-[#003DA5] text-white' : 'bg-gray-200 text-gray-700'
          }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: EXPEDIENTES POR PROCESO
// ════════════════════════════════════════════════════════════════════════════

interface VistaExpedientesProps {
  expedientes: Expediente[];
  onUpload: (exp: Expediente, file: File, tipo: string) => Promise<void>;
}

function VistaExpedientes({ expedientes, onUpload }: VistaExpedientesProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'ACTIVO' | 'EN_PROCESO' | 'FINALIZADO'>('TODOS');
  const [expedienteExpandido, setExpedienteExpandido] = useState<string | null>(null);

  const expedientesFiltrados = useMemo(() => {
    let resultado = expedientes;

    if (busqueda) {
      const search = busqueda.toLowerCase();
      resultado = resultado.filter(exp =>
        exp.radicado.toLowerCase().includes(search) ||
        exp.nombreProceso.toLowerCase().includes(search)
      );
    }

    if (filtroEstado !== 'TODOS') {
      resultado = resultado.filter(exp => exp.estado === filtroEstado);
    }

    return resultado;
  }, [busqueda, filtroEstado, expedientes]);

  const estadisticas = useMemo(() => {
    const total = expedientes.length;
    const activos = expedientes.filter(e => e.estado === 'ACTIVO').length;
    const enProceso = expedientes.filter(e => e.estado === 'EN_PROCESO').length;
    const finalizados = expedientes.filter(e => e.estado === 'FINALIZADO').length;
    const totalDocs = expedientes.reduce((acc, exp) => acc + exp.totalDocumentos, 0);

    return { total, activos, enProceso, finalizados, totalDocs };
  }, [expedientes]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Búsqueda y Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por radicado o nombre del proceso..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] text-sm"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterButton
              active={filtroEstado === 'TODOS'}
              onClick={() => setFiltroEstado('TODOS')}
              label="Todos"
              count={estadisticas.total}
            />
            <FilterButton
              active={filtroEstado === 'ACTIVO'}
              onClick={() => setFiltroEstado('ACTIVO')}
              label="Activos"
              count={estadisticas.activos}
              color="green"
            />
            <FilterButton
              active={filtroEstado === 'EN_PROCESO'}
              onClick={() => setFiltroEstado('EN_PROCESO')}
              label="En Proceso"
              count={estadisticas.enProceso}
              color="yellow"
            />
            <FilterButton
              active={filtroEstado === 'FINALIZADO'}
              onClick={() => setFiltroEstado('FINALIZADO')}
              label="Finalizados"
              count={estadisticas.finalizados}
              color="gray"
            />
          </div>
        </div>
      </div>

      {/* Lista de Expedientes */}
      <div className="space-y-4">
        {expedientesFiltrados.map((expediente) => (
          <CardExpediente
            key={expediente.id}
            expediente={expediente}
            expandido={expedienteExpandido === expediente.id}
            onToggleExpand={() => setExpedienteExpandido(
              expedienteExpandido === expediente.id ? null : expediente.id
            )}
            onUpload={onUpload}
          />
        ))}

        {expedientesFiltrados.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No se encontraron expedientes con los filtros seleccionados
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FILTER BUTTON
// ════════════════════════════════════════════════════════════════════════════

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: 'green' | 'yellow' | 'gray';
}

function FilterButton({ active, onClick, label, count, color }: FilterButtonProps) {
  const colorClasses = {
    green: 'border-green-300 bg-green-50 text-green-700',
    yellow: 'border-yellow-300 bg-yellow-50 text-yellow-700',
    gray: 'border-gray-300 bg-gray-50 text-gray-700',
  };

  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap
        ${active
          ? color
            ? colorClasses[color]
            : 'border-[#003DA5] bg-blue-50 text-[#003DA5]'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }
      `}
    >
      {label} ({count})
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CARD EXPEDIENTE
// ════════════════════════════════════════════════════════════════════════════

interface CardExpedienteProps {
  expediente: Expediente;
  expandido: boolean;
  onToggleExpand: () => void;
  onUpload: (exp: Expediente, file: File, tipo: string) => Promise<void>;
}

function CardExpediente({ expediente, expandido, onToggleExpand, onUpload }: CardExpedienteProps) {
  const [modalCargar, setModalCargar] = useState(false);

  const estadoConfig = {
    ACTIVO: { bg: 'bg-green-100', text: 'text-green-700', label: 'Activo' },
    EN_PROCESO: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En Proceso' },
    FINALIZADO: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Finalizado' }
  };

  const tipoProcesoConfig = {
    DEFENSA_JUDICIAL: { label: 'Defensa Judicial', icon: Scale, color: '#10B981' },
    JUZGAMIENTO: { label: 'Juzgamiento Disc.', icon: Gavel, color: '#DC2626' },
    ASESORIA: { label: 'Asesoría Jurídica', icon: FileQuestion, color: '#8B5CF6' },
    PROCESOS_COACTIVOS: { label: 'Procesos Coactivos', icon: FileText, color: '#F59E0B' },
    ORGANOS_CONTROL: { label: 'Órganos de Control', icon: CheckCircle2, color: '#059669' },
    OTRO: { label: 'Otro', icon: File, color: '#6B7280' }
  };

  const config = estadoConfig[expediente.estado];
  const tipoConfig = tipoProcesoConfig[expediente.tipoProceso];
  const TipoIcon = tipoConfig.icon;

  // Agrupar documentos por tipo
  const documentosPorTipo = useMemo(() => {
    const grupos: Record<TipoDocumento, Documento[]> = {
      DEMANDA: [],
      CONTESTACION: [],
      PRUEBAS: [],
      SENTENCIAS: [],
      TUTELAS: [],
      RECURSOS: [],
      CONCEPTOS: [],
      ACTAS: [],
      NOTIFICACIONES: [],
      OFICIOS: [],
      OTROS: []
    };

    expediente.documentos.forEach(doc => {
      grupos[doc.tipo].push(doc);
    });

    return grupos;
  }, [expediente.documentos]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      >
        {/* Header del Expediente */}
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${tipoConfig.color}, ${tipoConfig.color}dd)` }}
              >
                <TipoIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                  <h3 className="text-base sm:text-lg text-gray-900 font-medium">{expediente.radicado}</h3>
                  <span className={`px-2.5 py-0.5 sm:py-1 rounded-lg text-xs font-medium ${config.bg} ${config.text}`}>
                    {config.label}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-3">{expediente.nombreProceso}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <span className="ml-2 text-gray-900">{tipoConfig.label}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Responsable:</span>
                    <span className="ml-2 text-gray-900">{expediente.responsable}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Inicio:</span>
                    <span className="ml-2 text-gray-900">{expediente.fechaInicio}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Documentos:</span>
                    <span className="ml-2 text-gray-900 font-medium">{expediente.totalDocumentos}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setModalCargar(true);
                  if (expediente.tipoProceso === 'PROCESOS_COACTIVOS') {
                    toast.info('Los procesos coactivos se gestionan desde el módulo Financiero');
                    setModalCargar(false);
                  }
                }}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Cargar</span>
              </button>

              <button
                onClick={onToggleExpand}
                className={`
                  flex-1 sm:flex-none px-3 sm:px-4 py-2 border rounded-lg transition-all text-sm flex items-center justify-center gap-2
                  ${expandido
                    ? 'bg-[#003DA5] border-[#003DA5] text-white hover:bg-[#003DA5]/90'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {expandido ? (
                  <>
                    <FolderOpen className="w-4 h-4" />
                    <span className="hidden sm:inline">Cerrar Carpetas</span>
                  </>
                ) : (
                  <>
                    <Folder className="w-4 h-4" />
                    <span className="hidden sm:inline">Ver Carpetas</span>
                  </>
                )}
                {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Carpetas Expandibles */}
        <AnimatePresence>
          {expandido && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-100 bg-gray-50"
            >
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TIPOS_DOCUMENTO.map((tipo) => {
                  const docs = documentosPorTipo[tipo.id];
                  return (
                    <CarpetaTipoDocumento
                      key={tipo.id}
                      tipo={tipo}
                      documentos={docs}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modal Cargar Documento */}
      <ModalCargarDocumento
        isOpen={modalCargar}
        onClose={() => setModalCargar(false)}
        onCargar={(file, tipo) => {
          onUpload(expediente, file, tipo);
          setModalCargar(false);
        }}
        radicado={expediente.radicado}
        tipoProceso={expediente.tipoProceso}
      />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CARPETA TIPO DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

function CarpetaTipoDocumento({ tipo, documentos }: { tipo: typeof TIPOS_DOCUMENTO[0], documentos: Documento[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = tipo.icon;

  return (
    <div className={`
      bg-white rounded-lg border transition-all duration-200
      ${isOpen ? 'ring-2 ring-gray-200 border-transparent shadow-md' : 'border-gray-200 hover:border-gray-300'}
    `}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4"
      >
        <div className={`p-2 rounded-lg bg-${tipo.color}-50 text-${tipo.color}-600`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 text-left">
          <p className="font-medium text-gray-900 text-sm">{tipo.nombre}</p>
          <p className="text-xs text-gray-500">{documentos.length} documento{documentos.length !== 1 ? 's' : ''}</p>
        </div>

        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100"
          >
            <div className="p-2 space-y-1">
              {documentos.length > 0 ? (
                documentos.map(doc => (
                  <div
                    key={doc.id}
                    className="p-2.5 hover:bg-gray-50 rounded-md flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 bg-gray-100 rounded text-gray-500">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 font-medium truncate py-0.5">{doc.nombre}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-2">
                          <span>{doc.fechaCreacion}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span>{doc.tamanio}</span>
                        </p>
                      </div>
                    </div>

                    <button className="p-1.5 text-gray-400 hover:text-[#003DA5] hover:bg-blue-50 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-gray-400 italic">Carpeta vacía</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL CARGAR DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface ModalCargarDocumentoProps {
  isOpen: boolean;
  onClose: () => void;
  onCargar: (file: File, tipo: string) => void;
  radicado: string;
  tipoProceso: TipoProceso;
}

function ModalCargarDocumento({ isOpen, onClose, onCargar, radicado, tipoProceso }: ModalCargarDocumentoProps) {
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState<string>('OTROS');
  const [cargando, setCargando] = useState(false);

  const handleCargar = async () => {
    if (!file) return;
    setCargando(true);
    // Simular delay visual si es necesario, o llamar directamente onCargar
    await onCargar(file, tipo);
    setFile(null);
    setTipo('OTROS');
    setCargando(false);
  };

  return (
    <ModalSIGL
      isOpen={isOpen}
      onClose={onClose}
      title="Cargar Documento"
      description={`Expediente: ${radicado}`}
      size="small"
    >
      <div className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Documento
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5]"
            >
              {TIPOS_DOCUMENTO.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#003DA5] transition-colors cursor-pointer relative">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {file ? file.name : <>Arrastra un archivo o <span className="text-[#003DA5] font-medium">explora</span></>}
              </p>
              <p className="text-xs text-gray-500 mt-1">PDF, DOCX, XLSX (Máx. 10 MB)</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={cargando}
          >
            Cancelar
          </button>
          <button
            onClick={handleCargar}
            className="px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            disabled={cargando || !file}
          >
            {cargando ? 'Cargando...' : 'Cargar Documento'}
          </button>
        </div>
      </div>
    </ModalSIGL>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: ESTADÍSTICAS
// ════════════════════════════════════════════════════════════════════════════

interface VistaEstadisticasProps {
  expedientes: Expediente[];
}

function VistaEstadisticas({ expedientes }: VistaEstadisticasProps) {
  const estadisticasPorTipo = useMemo(() => {
    const stats: Record<TipoProceso, { total: number; docs: number }> = {
      DEFENSA_JUDICIAL: { total: 0, docs: 0 },
      JUZGAMIENTO: { total: 0, docs: 0 },
      ASESORIA: { total: 0, docs: 0 },
      PROCESOS_COACTIVOS: { total: 0, docs: 0 },
      ORGANOS_CONTROL: { total: 0, docs: 0 },
      OTRO: { total: 0, docs: 0 }
    };

    expedientes.forEach(exp => {
      if (stats[exp.tipoProceso]) {
        stats[exp.tipoProceso].total++;
        stats[exp.tipoProceso].docs += exp.totalDocumentos;
      }
    });

    return stats;
  }, [expedientes]);

  const estadisticasPorTipoDoc = useMemo(() => {
    const stats: Record<TipoDocumento, number> = {
      DEMANDA: 0,
      CONTESTACION: 0,
      PRUEBAS: 0,
      SENTENCIAS: 0,
      TUTELAS: 0,
      RECURSOS: 0,
      CONCEPTOS: 0,
      ACTAS: 0,
      NOTIFICACIONES: 0,
      OFICIOS: 0,
      OTROS: 0
    };

    expedientes.forEach(exp => {
      exp.documentos.forEach(doc => {
        if (stats[doc.tipo] !== undefined) {
          stats[doc.tipo]++;
        }
      });
    });

    return stats;
  }, [expedientes]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Estadísticas Generales
        </h2>

        {/* Estadísticas por Tipo de Proceso */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="font-medium text-gray-900 mb-4">Expedientes por Tipo de Proceso</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.entries(estadisticasPorTipo) as [TipoProceso, typeof estadisticasPorTipo[TipoProceso]][]).map(([tipo, stats]) => {
              const tipoConfig = {
                DEFENSA_JUDICIAL: { label: 'Defensa Judicial', color: '#10B981' },
                JUZGAMIENTO: { label: 'Juzgamiento', color: '#DC2626' },
                ASESORIA: { label: 'Asesoría Jurídica', color: '#8B5CF6' },
                PROCESOS_COACTIVOS: { label: 'Procesos Coactivos', color: '#F59E0B' },
                ORGANOS_CONTROL: { label: 'Órganos Control', color: '#2563EB' },
                OTRO: { label: 'Otro', color: '#6B7280' }
              }[tipo];

              if (!tipoConfig) return null;

              return (
                <div key={tipo} className="p-4 rounded-lg border-2" style={{ borderColor: `${tipoConfig.color}40`, background: `${tipoConfig.color}10` }}>
                  <p className="text-sm font-medium text-gray-700">{tipoConfig.label}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: tipoConfig.color }}>{stats.total}</p>
                  <p className="text-xs text-gray-600 mt-1">{stats.docs} documentos</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estadísticas por Tipo de Documento */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Documentos por Tipo</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {(Object.entries(estadisticasPorTipoDoc) as [TipoDocumento, number][]).map(([tipo, cantidad]) => {
              const tipoConfig = TIPOS_DOCUMENTO.find(t => t.id === tipo);
              if (!tipoConfig) return null;

              return (
                <div key={tipo} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 truncate">{tipoConfig.nombre}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{cantidad}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}