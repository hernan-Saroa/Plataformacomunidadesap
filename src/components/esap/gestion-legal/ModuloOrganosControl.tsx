/**
 * ============================================
 * MÓDULO ÓRGANOS DE CONTROL - VISTA LISTA
 * ============================================
 * 
 * REQ-MOD02-001/002: Gestionar requerimientos y respuestas a Organismos de Control
 * 
 * Esta es la VISTA DE LISTA (tabla detallada) del módulo.
 * Los botones KANBAN/LISTA están en ModuloConKanban (wrapper).
 * 
 * Oficina Asesora Jurídica - ESAP
 */

import { useState, useMemo } from 'react';
import {
  Shield,
  Plus,
  Download,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  TrendingUp,
  Building2,
  Search,
  Filter,
  Edit,
  Send,
  Calendar,
  User,
  Paperclip,
  MessageSquare,
  CheckCheck,
} from 'lucide-react';
import { CardSIGL, BadgeSIGL, ModalSIGL } from './design-system';
import { useToast } from './design-system/ToastSIGL';
import { FormularioRequerimientoOrganoControl } from './defensa-judicial/FormularioRequerimientoOrganoControl';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

// ==================== TIPOS ====================

type OrganoControl = 
  | 'Contraloría General de la República'
  | 'Procuraduría General de la Nación'
  | 'Defensoría del Pueblo'
  | 'DANE'
  | 'Superintendencia de Educación'
  | 'Otro';

type TipoRequerimiento = 'INFORMACION' | 'AJUSTE';

type EstadoRequerimiento = 
  | 'RECIBIDO'
  | 'EN_PREPARACION'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'ENVIADA'
  | 'RESUELTA';

type ColorAlerta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';

interface Requerimiento {
  id: string;
  organoControl: OrganoControl;
  tipo: TipoRequerimiento;
  numeroRadicado: string;
  fechaRecepcion: Date;
  fechaVencimiento: Date;
  diasTotales: number;
  diasRestantes: number;
  porcentajeRestante: number;
  colorAlerta: ColorAlerta;
  descripcion: string;
  respuestaDraft: string;
  abogadoAsignado: string;
  estado: EstadoRequerimiento;
  territorial: string;
  documentosAdjuntos: number;
  observacionesRevision?: string;
  fechaEnvio?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== DATOS MOCK ====================

const REQUERIMIENTOS_MOCK: Requerimiento[] = [
  {
    id: 'REQ-001',
    organoControl: 'Contraloría General de la República',
    tipo: 'INFORMACION',
    numeroRadicado: 'CGR-2024-001234',
    fechaRecepcion: new Date('2024-01-15'),
    fechaVencimiento: new Date('2024-02-14'),
    diasTotales: 30,
    diasRestantes: 15,
    porcentajeRestante: 50,
    colorAlerta: 'AMARILLO',
    descripcion: 'Informe sobre ejecución presupuestal 2023',
    respuestaDraft: '',
    abogadoAsignado: 'Dr. Carlos Méndez',
    estado: 'EN_PREPARACION',
    territorial: 'Nacional',
    documentosAdjuntos: 3,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
  },
  {
    id: 'REQ-002',
    organoControl: 'Procuraduría General de la Nación',
    tipo: 'AJUSTE',
    numeroRadicado: 'PGN-2024-005678',
    fechaRecepcion: new Date('2024-01-20'),
    fechaVencimiento: new Date('2024-01-30'),
    diasTotales: 10,
    diasRestantes: 2,
    porcentajeRestante: 20,
    colorAlerta: 'ROJO',
    descripcion: 'Ajuste plan anticorrupción',
    respuestaDraft: '',
    abogadoAsignado: 'Dra. Ana García',
    estado: 'EN_REVISION',
    territorial: 'Territorial 1',
    documentosAdjuntos: 5,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date(),
  },
];

// ==================== COMPONENTE PRINCIPAL ====================

export function ModuloOrganosControl() {
  const { showToast } = useToast();
  const [requerimientos, setRequerimientos] = useState<Requerimiento[]>(REQUERIMIENTOS_MOCK);
  const [filtroEstado, setFiltroEstado] = useState<EstadoRequerimiento | 'TODOS'>('TODOS');
  const [filtroOrgano, setFiltroOrgano] = useState<OrganoControl | 'TODOS'>('TODOS');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [modalNuevoVisible, setModalNuevoVisible] = useState(false);
  const [requerimientoSeleccionado, setRequerimientoSeleccionado] = useState<Requerimiento | null>(null);
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);

  // Filtrado de requerimientos
  const requerimientosFiltrados = useMemo(() => {
    return requerimientos.filter((req) => {
      const matchEstado = filtroEstado === 'TODOS' || req.estado === filtroEstado;
      const matchOrgano = filtroOrgano === 'TODOS' || req.organoControl === filtroOrgano;
      const matchBusqueda = 
        req.numeroRadicado.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
        req.descripcion.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
        req.abogadoAsignado.toLowerCase().includes(filtroBusqueda.toLowerCase());
      
      return matchEstado && matchOrgano && matchBusqueda;
    });
  }, [requerimientos, filtroEstado, filtroOrgano, filtroBusqueda]);

  // Handlers
  const handleVerDetalle = (requerimiento: Requerimiento) => {
    setRequerimientoSeleccionado(requerimiento);
    setModalDetalleVisible(true);
  };

  const handleCrearRequerimiento = (data: any) => {
    console.log('Crear requerimiento:', data);
    showToast('Requerimiento creado exitosamente', 'success');
    setModalNuevoVisible(false);
  };

  // Métricas
  const metricas = useMemo(() => {
    return {
      total: requerimientos.length,
      vencidos: requerimientos.filter((r) => r.colorAlerta === 'VENCIDO').length,
      criticos: requerimientos.filter((r) => r.colorAlerta === 'ROJO').length,
      resueltos: requerimientos.filter((r) => r.estado === 'RESUELTA').length,
    };
  }, [requerimientos]);

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6">
      {/* Header con Métricas */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Órganos de Control</h2>
            <p className="text-gray-600">Vista detallada de requerimientos</p>
          </div>
          <Button onClick={() => setModalNuevoVisible(true)} className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Requerimiento
          </Button>
        </div>

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-4 gap-4">
          <CardSIGL>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{metricas.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </CardSIGL>
          <CardSIGL>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{metricas.vencidos}</p>
              <p className="text-sm text-gray-600">Vencidos</p>
            </div>
          </CardSIGL>
          <CardSIGL>
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">{metricas.criticos}</p>
              <p className="text-sm text-gray-600">Críticos</p>
            </div>
          </CardSIGL>
          <CardSIGL>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{metricas.resueltos}</p>
              <p className="text-sm text-gray-600">Resueltos</p>
            </div>
          </CardSIGL>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="mb-6 flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por radicado, descripción o responsable..."
            value={filtroBusqueda}
            onChange={(e) => setFiltroBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-48">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="RECIBIDO">Recibido</option>
            <option value="EN_PREPARACION">Análisis</option>
            <option value="EN_REVISION">Elaboración</option>
            <option value="APROBADA">Revisión</option>
            <option value="ENVIADA">Enviado</option>
            <option value="RESUELTA">Resuelta</option>
          </select>
        </div>
        <div className="w-64">
          <select
            value={filtroOrgano}
            onChange={(e) => setFiltroOrgano(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos los órganos</option>
            <option value="Contraloría General de la República">Contraloría</option>
            <option value="Procuraduría General de la Nación">Procuraduría</option>
            <option value="Defensoría del Pueblo">Defensoría</option>
            <option value="DANE">DANE</option>
            <option value="Superintendencia de Educación">Superintendencia</option>
          </select>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Tabla de Requerimientos */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-white sticky top-0 shadow-sm">
            <tr className="border-b border-gray-200">
              <th className="text-left p-4 font-semibold text-gray-700">Alerta</th>
              <th className="text-left p-4 font-semibold text-gray-700">Radicado</th>
              <th className="text-left p-4 font-semibold text-gray-700">Órgano</th>
              <th className="text-left p-4 font-semibold text-gray-700">Tipo</th>
              <th className="text-left p-4 font-semibold text-gray-700">Descripción</th>
              <th className="text-left p-4 font-semibold text-gray-700">Estado</th>
              <th className="text-left p-4 font-semibold text-gray-700">Responsable</th>
              <th className="text-left p-4 font-semibold text-gray-700">Días Rest.</th>
              <th className="text-left p-4 font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {requerimientosFiltrados.map((req) => (
              <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        req.colorAlerta === 'VERDE' ? '#10B981' :
                        req.colorAlerta === 'AMARILLO' ? '#F59E0B' :
                        req.colorAlerta === 'ROJO' ? '#EF4444' :
                        '#9CA3AF',
                    }}
                    title={req.colorAlerta}
                  />
                </td>
                <td className="p-4">
                  <p className="font-mono text-sm text-gray-900">{req.numeroRadicado}</p>
                  <p className="text-xs text-gray-500">{req.id}</p>
                </td>
                <td className="p-4">
                  <p className="text-sm text-gray-900">{req.organoControl}</p>
                </td>
                <td className="p-4">
                  <BadgeSIGL variant={req.tipo === 'INFORMACION' ? 'info' : 'warning'}>
                    {req.tipo === 'INFORMACION' ? 'INFO' : 'AJUSTE'}
                  </BadgeSIGL>
                </td>
                <td className="p-4">
                  <p className="text-sm text-gray-900 max-w-xs truncate">{req.descripcion}</p>
                </td>
                <td className="p-4">
                  <BadgeSIGL
                    variant={
                      req.estado === 'RESUELTA' ? 'success' :
                      req.estado === 'ENVIADA' ? 'info' :
                      req.estado === 'APROBADA' ? 'warning' :
                      'default'
                    }
                  >
                    {req.estado}
                  </BadgeSIGL>
                </td>
                <td className="p-4">
                  <p className="text-sm text-gray-900">{req.abogadoAsignado}</p>
                </td>
                <td className="p-4">
                  <p
                    className={`text-sm font-semibold ${
                      req.diasRestantes < 0 ? 'text-red-600' :
                      req.diasRestantes <= 5 ? 'text-orange-600' :
                      'text-gray-900'
                    }`}
                  >
                    {req.diasRestantes > 0 ? `${req.diasRestantes} días` : 'VENCIDO'}
                  </p>
                </td>
                <td className="p-4">
                  <Button variant="outline" size="sm" onClick={() => handleVerDetalle(req)}>
                    <Eye className="w-4 h-4 mr-1" />
                    Ver
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {requerimientosFiltrados.length === 0 && (
          <div className="text-center py-12 bg-white">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron requerimientos</p>
          </div>
        )}
      </div>

      {/* Modal Nuevo Requerimiento */}
      <ModalSIGL
        isOpen={modalNuevoVisible}
        onClose={() => setModalNuevoVisible(false)}
        title="Nuevo Requerimiento - Órgano de Control"
        size="large"
      >
        <FormularioRequerimientoOrganoControl
          onSubmit={handleCrearRequerimiento}
          onCancel={() => setModalNuevoVisible(false)}
        />
      </ModalSIGL>

      {/* Modal Detalle (simplificado por ahora) */}
      <ModalSIGL
        isOpen={modalDetalleVisible}
        onClose={() => setModalDetalleVisible(false)}
        title="Detalle del Requerimiento"
        size="large"
      >
        {requerimientoSeleccionado && (
          <div className="space-y-4">
            <p><strong>Radicado:</strong> {requerimientoSeleccionado.numeroRadicado}</p>
            <p><strong>Órgano:</strong> {requerimientoSeleccionado.organoControl}</p>
            <p><strong>Descripción:</strong> {requerimientoSeleccionado.descripcion}</p>
            <p><strong>Estado:</strong> {requerimientoSeleccionado.estado}</p>
            <p><strong>Responsable:</strong> {requerimientoSeleccionado.abogadoAsignado}</p>
          </div>
        )}
      </ModalSIGL>
    </div>
  );
}