/**
 * ETAPA DE EJECUCIÓN - RF006
 * Gestión de listas de chequeo, hallazgos y evidencias
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ClipboardCheck, AlertTriangle, Upload, FileText, CheckCircle2,
  Plus, Eye, Download, Edit, Trash2, Calendar, Users
} from 'lucide-react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { ResponsiveModal } from '../../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';

interface Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
}

interface ListaChequeo {
  id: string;
  nombre: string;
  proceso: string;
  totalItems: number;
  itemsCompletados: number;
  estado: 'pendiente' | 'en-progreso' | 'completada';
  fechaAplicacion?: string;
}

interface Hallazgo {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  tipo: 'no-conformidad' | 'observacion' | 'oportunidad-mejora';
  gravedad: 'Crítica' | 'Alta' | 'Media' | 'Baja';
  normativaIncumplida?: string;
  evidencias: number;
  estado: 'identificado' | 'validado' | 'en-controversia';
}

interface Evidencia {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: string;
  fechaCarga: string;
  hallazgoId?: string;
}

interface EjecucionFormProps {
  auditoria: Auditoria;
  onVolver: () => void;
}

export function EjecucionForm({ auditoria, onVolver }: EjecucionFormProps) {
  const [listasChequeo, setListasChequeo] = useState<ListaChequeo[]>([
    {
      id: '1',
      nombre: 'Lista de Verificación - Gestión Financiera',
      proceso: 'Gestión Financiera',
      totalItems: 25,
      itemsCompletados: 25,
      estado: 'completada',
      fechaAplicacion: '2024-12-05'
    },
    {
      id: '2',
      nombre: 'Lista de Verificación - Control Presupuestal',
      proceso: 'Control Presupuestal',
      totalItems: 20,
      itemsCompletados: 15,
      estado: 'en-progreso',
      fechaAplicacion: '2024-12-08'
    },
    {
      id: '3',
      nombre: 'Lista de Verificación - Tesorería',
      proceso: 'Tesorería',
      totalItems: 18,
      itemsCompletados: 0,
      estado: 'pendiente'
    }
  ]);

  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([
    {
      id: '1',
      codigo: 'HAL-2024-001',
      titulo: 'Incumplimiento en conciliaciones bancarias',
      descripcion: 'No se realizaron las conciliaciones bancarias mensuales durante los meses de agosto y septiembre',
      tipo: 'no-conformidad',
      gravedad: 'Alta',
      normativaIncumplida: 'Procedimiento FIN-003 - Conciliaciones Bancarias',
      evidencias: 2,
      estado: 'validado'
    },
    {
      id: '2',
      codigo: 'HAL-2024-002',
      titulo: 'Falta de segregación de funciones',
      descripcion: 'El mismo funcionario realiza la aprobación y el pago de cuentas',
      tipo: 'no-conformidad',
      gravedad: 'Crítica',
      normativaIncumplida: 'Decreto 1084 de 2015 - Art. 45',
      evidencias: 1,
      estado: 'identificado'
    },
    {
      id: '3',
      codigo: 'HAL-2024-003',
      titulo: 'Oportunidad de mejora en reportes',
      descripcion: 'Los reportes financieros mensuales podrían generarse automáticamente',
      tipo: 'oportunidad-mejora',
      gravedad: 'Baja',
      evidencias: 0,
      estado: 'identificado'
    }
  ]);

  const [evidencias, setEvidencias] = useState<Evidencia[]>([
    {
      id: '1',
      nombre: 'Extractos_bancarios_agosto.pdf',
      tipo: 'PDF',
      tamaño: '2.5 MB',
      fechaCarga: '2024-12-10',
      hallazgoId: '1'
    },
    {
      id: '2',
      nombre: 'Conciliaciones_pendientes.xlsx',
      tipo: 'Excel',
      tamaño: '156 KB',
      fechaCarga: '2024-12-10',
      hallazgoId: '1'
    }
  ]);

  const [modalNuevoHallazgo, setModalNuevoHallazgo] = useState(false);
  const [modalEvidencias, setModalEvidencias] = useState(false);
  const [hallazgoSeleccionado, setHallazgoSeleccionado] = useState<Hallazgo | null>(null);

  const [formHallazgo, setFormHallazgo] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'no-conformidad' as const,
    gravedad: 'Media' as const,
    normativa: ''
  });

  const handleCrearHallazgo = () => {
    if (!formHallazgo.titulo || !formHallazgo.descripcion) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    const nuevoHallazgo: Hallazgo = {
      id: Date.now().toString(),
      codigo: `HAL-2024-${String(hallazgos.length + 1).padStart(3, '0')}`,
      titulo: formHallazgo.titulo,
      descripcion: formHallazgo.descripcion,
      tipo: formHallazgo.tipo,
      gravedad: formHallazgo.gravedad,
      normativaIncumplida: formHallazgo.normativa || undefined,
      evidencias: 0,
      estado: 'identificado'
    };

    setHallazgos([...hallazgos, nuevoHallazgo]);
    toast.success('Hallazgo registrado exitosamente');
    setModalNuevoHallazgo(false);
    setFormHallazgo({ titulo: '', descripcion: '', tipo: 'no-conformidad', gravedad: 'Media', normativa: '' });
  };

  const getTipoHallazgoColor = (tipo: string) => {
    switch (tipo) {
      case 'no-conformidad': return '#EF4444';
      case 'observacion': return '#F59E0B';
      case 'oportunidad-mejora': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getTipoHallazgoLabel = (tipo: string) => {
    switch (tipo) {
      case 'no-conformidad': return 'No Conformidad';
      case 'observacion': return 'Observación';
      case 'oportunidad-mejora': return 'Oportunidad de Mejora';
      default: return tipo;
    }
  };

  const getGravedadColor = (gravedad: string) => {
    switch (gravedad) {
      case 'Crítica': return '#DC2626';
      case 'Alta': return '#EF4444';
      case 'Media': return '#F59E0B';
      case 'Baja': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getEstadoListaColor = (estado: string) => {
    switch (estado) {
      case 'completada': return '#10B981';
      case 'en-progreso': return '#3B82F6';
      case 'pendiente': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const porcentajeListasCompletas = Math.round(
    (listasChequeo.filter(l => l.estado === 'completada').length / listasChequeo.length) * 100
  );

  const porcentajeHallazgosValidados = Math.round(
    (hallazgos.filter(h => h.estado === 'validado').length / hallazgos.length) * 100
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
            <ClipboardCheck className="w-6 h-6" style={{ color: '#F59E0B' }} />
          </div>
          <div>
            <h2 className="text-xl font-black" style={{ color: '#1F2937' }}>
              Etapa de Ejecución
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {auditoria.codigo} - {auditoria.nombre}
            </p>
          </div>
        </div>
      </div>

      {/* MÉTRICAS DE LA ETAPA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          className="p-5 rounded-xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg" style={{ background: '#DBEAFE' }}>
              <ClipboardCheck className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <span className="text-2xl font-black" style={{ color: '#3B82F6' }}>
              {porcentajeListasCompletas}%
            </span>
          </div>
          <h4 className="text-sm font-semibold" style={{ color: '#6B7280' }}>Listas Completadas</h4>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
            {listasChequeo.filter(l => l.estado === 'completada').length} de {listasChequeo.length}
          </p>
        </motion.div>

        <motion.div
          className="p-5 rounded-xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg" style={{ background: '#FEE2E2' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
            </div>
            <span className="text-2xl font-black" style={{ color: '#EF4444' }}>
              {hallazgos.length}
            </span>
          </div>
          <h4 className="text-sm font-semibold" style={{ color: '#6B7280' }}>Hallazgos Identificados</h4>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
            {hallazgos.filter(h => h.tipo === 'no-conformidad').length} no conformidades
          </p>
        </motion.div>

        <motion.div
          className="p-5 rounded-xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg" style={{ background: '#DBEAFE' }}>
              <Upload className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <span className="text-2xl font-black" style={{ color: '#3B82F6' }}>
              {evidencias.length}
            </span>
          </div>
          <h4 className="text-sm font-semibold" style={{ color: '#6B7280' }}>Evidencias Cargadas</h4>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
            Documentos de soporte
          </p>
        </motion.div>
      </div>

      {/* LISTAS DE CHEQUEO */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black" style={{ color: '#1F2937' }}>
              Listas de Chequeo
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Aplicación de listas de verificación por proceso
            </p>
          </div>
          <Button
            style={{ background: '#3B82F6', color: '#FFFFFF' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Lista
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {listasChequeo.map((lista) => (
            <motion.div
              key={lista.id}
              className="p-5 rounded-xl border-2 hover:shadow-md transition-all"
              style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="mb-3">
                <h4 className="font-bold text-sm mb-2" style={{ color: '#1F2937' }}>
                  {lista.nombre}
                </h4>
                <Badge
                  style={{
                    background: `${getEstadoListaColor(lista.estado)}20`,
                    color: getEstadoListaColor(lista.estado)
                  }}
                >
                  {lista.estado === 'completada' ? 'Completada' :
                   lista.estado === 'en-progreso' ? 'En Progreso' : 'Pendiente'}
                </Badge>
              </div>

              <div className="text-xs mb-3" style={{ color: '#6B7280' }}>
                <div className="font-semibold mb-1">Proceso: {lista.proceso}</div>
                {lista.fechaAplicacion && (
                  <div>Aplicada: {new Date(lista.fechaAplicacion).toLocaleDateString('es-CO')}</div>
                )}
              </div>

              <div className="space-y-1 mb-4">
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#6B7280' }}>Progreso</span>
                  <span className="font-bold" style={{ color: '#3B82F6' }}>
                    {lista.itemsCompletados}/{lista.totalItems}
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      background: '#3B82F6',
                      width: `${(lista.itemsCompletados / lista.totalItems) * 100}%`
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="w-4 h-4 mr-1" />
                  Ver
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* HALLAZGOS IDENTIFICADOS */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black" style={{ color: '#1F2937' }}>
              Hallazgos Identificados
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Registro detallado de hallazgos de auditoría
            </p>
          </div>
          <Button
            onClick={() => setModalNuevoHallazgo(true)}
            style={{ background: '#EF4444', color: '#FFFFFF' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Hallazgo
          </Button>
        </div>

        <div className="space-y-4">
          {hallazgos.map((hallazgo) => (
            <motion.div
              key={hallazgo.id}
              className="p-5 rounded-xl border-2 hover:shadow-md transition-all"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-sm" style={{ color: '#6B7280' }}>
                      {hallazgo.codigo}
                    </span>
                    <Badge
                      style={{
                        background: `${getTipoHallazgoColor(hallazgo.tipo)}20`,
                        color: getTipoHallazgoColor(hallazgo.tipo)
                      }}
                    >
                      {getTipoHallazgoLabel(hallazgo.tipo)}
                    </Badge>
                    <Badge
                      style={{
                        background: `${getGravedadColor(hallazgo.gravedad)}20`,
                        color: getGravedadColor(hallazgo.gravedad)
                      }}
                    >
                      Gravedad: {hallazgo.gravedad}
                    </Badge>
                  </div>
                  <h4 className="font-bold mb-2" style={{ color: '#1F2937' }}>
                    {hallazgo.titulo}
                  </h4>
                  <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                    {hallazgo.descripcion}
                  </p>

                  {hallazgo.normativaIncumplida && (
                    <div className="mb-3 p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: '#92400E' }}>
                        Normativa/Procedimiento Incumplido:
                      </div>
                      <div className="text-xs" style={{ color: '#78350F' }}>
                        {hallazgo.normativaIncumplida}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs" style={{ color: '#6B7280' }}>
                    <div className="flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>{hallazgo.evidencias} evidencias</span>
                    </div>
                    <div>
                      Estado: <span className="font-semibold">
                        {hallazgo.estado === 'validado' ? 'Validado' :
                         hallazgo.estado === 'identificado' ? 'Identificado' : 'En Controversia'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setHallazgoSeleccionado(hallazgo);
                      setModalEvidencias(true);
                    }}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" style={{ color: '#EF4444' }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {hallazgo.estado === 'identificado' && (
                <Button
                  size="sm"
                  onClick={() => {
                    const updatedHallazgos = hallazgos.map(h =>
                      h.id === hallazgo.id ? { ...h, estado: 'validado' as const } : h
                    );
                    setHallazgos(updatedHallazgos);
                    toast.success('Hallazgo validado');
                  }}
                  style={{ background: '#10B981', color: '#FFFFFF' }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Validar Hallazgo
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* MODAL NUEVO HALLAZGO */}
      <ResponsiveModal
        isOpen={modalNuevoHallazgo}
        onClose={() => {
          setModalNuevoHallazgo(false);
          setFormHallazgo({ titulo: '', descripcion: '', tipo: 'no-conformidad', gravedad: 'Media', normativa: '' });
        }}
        title="Registrar Nuevo Hallazgo"
        subtitle="Completa la información del hallazgo identificado"
        icon={<AlertTriangle className="w-6 h-6" style={{ color: '#EF4444' }} />}
        maxWidth="2xl"
        footer={
          <div className="flex items-center gap-3">
            <button
              onClick={handleCrearHallazgo}
              className="flex-1 px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#EF4444', color: '#FFFFFF' }}
            >
              Registrar Hallazgo
            </button>
            <button
              onClick={() => {
                setModalNuevoHallazgo(false);
                setFormHallazgo({ titulo: '', descripcion: '', tipo: 'no-conformidad', gravedad: 'Media', normativa: '' });
              }}
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#F3F4F6', color: '#4B5563' }}
            >
              Cancelar
            </button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Título del Hallazgo *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#EF4444]"
              style={{ borderColor: '#E5E7EB' }}
              value={formHallazgo.titulo}
              onChange={(e) => setFormHallazgo({ ...formHallazgo, titulo: e.target.value })}
              placeholder="Ej: Incumplimiento en conciliaciones bancarias"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Descripción Detallada *
            </label>
            <textarea
              rows={4}
              required
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#EF4444]"
              style={{ borderColor: '#E5E7EB' }}
              value={formHallazgo.descripcion}
              onChange={(e) => setFormHallazgo({ ...formHallazgo, descripcion: e.target.value })}
              placeholder="Describe el hallazgo en detalle..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Tipo de Hallazgo *
              </label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#EF4444]"
                style={{ borderColor: '#E5E7EB' }}
                value={formHallazgo.tipo}
                onChange={(e) => setFormHallazgo({ ...formHallazgo, tipo: e.target.value as any })}
              >
                <option value="no-conformidad">No Conformidad</option>
                <option value="observacion">Observación</option>
                <option value="oportunidad-mejora">Oportunidad de Mejora</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Gravedad *
              </label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#EF4444]"
                style={{ borderColor: '#E5E7EB' }}
                value={formHallazgo.gravedad}
                onChange={(e) => setFormHallazgo({ ...formHallazgo, gravedad: e.target.value as any })}
              >
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
                <option value="Crítica">Crítica</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Normativa/Procedimiento Incumplido
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#EF4444]"
              style={{ borderColor: '#E5E7EB' }}
              value={formHallazgo.normativa}
              onChange={(e) => setFormHallazgo({ ...formHallazgo, normativa: e.target.value })}
              placeholder="Ej: Decreto 1084 de 2015 - Art. 45"
            />
          </div>
        </div>
      </ResponsiveModal>

      {/* MODAL EVIDENCIAS */}
      <ResponsiveModal
        isOpen={modalEvidencias}
        onClose={() => {
          setModalEvidencias(false);
          setHallazgoSeleccionado(null);
        }}
        title="Gestionar Evidencias"
        subtitle={`Evidencias del hallazgo ${hallazgoSeleccionado?.codigo}`}
        icon={<Upload className="w-6 h-6" style={{ color: '#3B82F6' }} />}
        footer={
          <button
            onClick={() => {
              setModalEvidencias(false);
              setHallazgoSeleccionado(null);
            }}
            className="w-full px-6 py-3 rounded-xl font-semibold"
            style={{ background: '#F3F4F6', color: '#4B5563' }}
          >
            Cerrar
          </button>
        }
      >
        <div className="space-y-4 p-1">
          <div
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-all"
            style={{ borderColor: '#D1D5DB' }}
          >
            <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: '#9CA3AF' }} />
            <p className="text-sm font-semibold mb-1" style={{ color: '#4B5563' }}>
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              PDF, Word, Excel, imágenes (máx. 10MB)
            </p>
          </div>

          {evidencias.filter(e => e.hallazgoId === hallazgoSeleccionado?.id).length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-3" style={{ color: '#1F2937' }}>
                Evidencias Cargadas
              </h4>
              <div className="space-y-2">
                {evidencias
                  .filter(e => e.hallazgoId === hallazgoSeleccionado?.id)
                  .map((evidencia) => (
                    <div
                      key={evidencia.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: '#F9FAFB' }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-5 h-5" style={{ color: '#6B7280' }} />
                        <div>
                          <div className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                            {evidencia.nombre}
                          </div>
                          <div className="text-xs" style={{ color: '#9CA3AF' }}>
                            {evidencia.tipo} • {evidencia.tamaño} • {new Date(evidencia.fechaCarga).toLocaleDateString('es-CO')}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" style={{ color: '#EF4444' }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </ResponsiveModal>
    </div>
  );
}
