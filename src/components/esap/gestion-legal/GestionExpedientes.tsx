/**
 * GESTIÓN DE EXPEDIENTES - CRUD Completo
 * Recepción, edición y seguimiento de expedientes disciplinarios
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, Filter, Download, Eye, Edit, Trash2, FileText,
  X, Calendar, User, Scale, AlertTriangle, Clock, FolderOpen,
  CheckCircle, Upload, Save
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { toast } from 'sonner@2.0.3';

interface Expediente {
  id: string;
  numero: string;
  procesoOCID: string;
  investigado: string;
  cedula: string;
  cargo: string;
  dependencia: string;
  email: string;
  telefono: string;
  etapaActual: string;
  abogadoAsignado: string;
  fechaHechos: string;
  fechaRecepcion: string;
  fechaPrescripcion: string;
  diasParaPrescripcion: number;
  tipoFalta: 'Leve' | 'Grave' | 'Gravísima';
  sancionProyectada: string;
  normatividad: 'Ley 1952/2019' | 'Ley 734/2002';
  documentos: number;
  ultimaActuacion: string;
  observaciones: string;
}

const EXPEDIENTES_MOCK: Expediente[] = [
  {
    id: '1',
    numero: 'PD-2025-0125',
    procesoOCID: 'OCID-2024-0456',
    investigado: 'Ana María López Martínez',
    cedula: '52123456',
    cargo: 'Profesional Universitario',
    dependencia: 'Dirección Académica',
    email: 'ana.lopez@esap.edu.co',
    telefono: '3201234567',
    etapaActual: 'Traslado Descargos',
    abogadoAsignado: 'Dr. Carlos Mendoza',
    fechaHechos: '2020-03-20',
    fechaRecepcion: '2025-01-02',
    fechaPrescripcion: '2025-03-20',
    diasParaPrescripcion: 45,
    tipoFalta: 'Grave',
    sancionProyectada: 'Destitución',
    normatividad: 'Ley 1952/2019',
    documentos: 15,
    ultimaActuacion: 'Auto avocamiento notificado el 05/01/2025',
    observaciones: 'Caso prioritario por cercanía a prescripción'
  },
  {
    id: '2',
    numero: 'PD-2025-0098',
    procesoOCID: 'OCID-2024-0312',
    investigado: 'Roberto Sánchez Cruz',
    cedula: '77385960',
    cargo: 'Técnico Administrativo',
    dependencia: 'Gestión Financiera',
    email: 'roberto.sanchez@esap.edu.co',
    telefono: '3109876543',
    etapaActual: 'Recibido',
    abogadoAsignado: 'Dra. María Torres',
    fechaHechos: '2021-06-15',
    fechaRecepcion: '2025-01-28',
    fechaPrescripcion: '2026-06-15',
    diasParaPrescripcion: 520,
    tipoFalta: 'Gravísima',
    sancionProyectada: 'Destitución + Inhabilidad',
    normatividad: 'Ley 1952/2019',
    documentos: 8,
    ultimaActuacion: 'Expediente recibido de OCID el 28/01/2025',
    observaciones: 'Pendiente asignación de abogado sustanciador'
  }
];

const ABOGADOS_DISPONIBLES = [
  'Dr. Carlos Mendoza',
  'Dra. María Torres',
  'Dr. Luis Ramírez',
  'Dra. Patricia González',
  'Dr. Andrés Castillo'
];

type ModalMode = 'crear' | 'editar' | 'ver' | null;

export function GestionExpedientes() {
  const [expedientes, setExpedientes] = useState<Expediente[]>(EXPEDIENTES_MOCK);
  const [busqueda, setBusqueda] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [expedienteActual, setExpedienteActual] = useState<Expediente | null>(null);

  // Formulario
  const [formData, setFormData] = useState<Partial<Expediente>>({});

  const expedientesFiltrados = expedientes.filter(exp =>
    exp.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
    exp.investigado.toLowerCase().includes(busqueda.toLowerCase()) ||
    exp.cedula.includes(busqueda)
  );

  const handleNuevoExpediente = () => {
    setModalMode('crear');
    setFormData({
      normatividad: 'Ley 1952/2019',
      etapaActual: 'Recibido',
      tipoFalta: 'Grave'
    });
    setModalOpen(true);
  };

  const handleEditarExpediente = (expediente: Expediente) => {
    setModalMode('editar');
    setExpedienteActual(expediente);
    setFormData(expediente);
    setModalOpen(true);
  };

  const handleVerExpediente = (expediente: Expediente) => {
    setModalMode('ver');
    setExpedienteActual(expediente);
    setModalOpen(true);
  };

  const handleEliminarExpediente = (id: string) => {
    if (confirm('¿Está seguro de eliminar este expediente?')) {
      setExpedientes(expedientes.filter(e => e.id !== id));
      toast.success('Expediente eliminado correctamente');
    }
  };

  const handleGuardarExpediente = () => {
    if (modalMode === 'crear') {
      const nuevoExpediente: Expediente = {
        id: Date.now().toString(),
        numero: `PD-2025-${String(expedientes.length + 1).padStart(4, '0')}`,
        ...formData as Expediente,
        fechaRecepcion: new Date().toISOString().split('T')[0],
        documentos: 0,
        ultimaActuacion: 'Expediente creado'
      };
      setExpedientes([...expedientes, nuevoExpediente]);
      toast.success('Expediente creado correctamente', {
        description: `Número: ${nuevoExpediente.numero}`
      });
    } else if (modalMode === 'editar' && expedienteActual) {
      setExpedientes(expedientes.map(e =>
        e.id === expedienteActual.id ? { ...e, ...formData } : e
      ));
      toast.success('Expediente actualizado correctamente');
    }
    setModalOpen(false);
    setFormData({});
  };

  const getSemaforoPrescripcion = (dias: number) => {
    if (dias < 90) return { color: '#DC2626', bg: '#FEE2E2', label: '🚨 Crítico' };
    if (dias < 180) return { color: '#F59E0B', bg: '#FEF3C7', label: '⚠️ Atención' };
    return { color: '#10B981', bg: '#D1FAE5', label: '✓ Normal' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#6F42C1' }}>
            Gestión de Expedientes
          </h2>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Administración completa de expedientes disciplinarios
          </p>
        </div>
        <Button
          onClick={handleNuevoExpediente}
          className="font-bold"
          style={{ background: '#6F42C1', color: '#FFFFFF' }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Expediente
        </Button>
      </div>

      {/* Barra de Búsqueda */}
      <Card className="p-4 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
            <Input
              placeholder="Buscar por número, investigado o cédula..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 border-2"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>
          <Button variant="outline" className="border-2" style={{ borderColor: '#E5E7EB' }}>
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" className="border-2" style={{ borderColor: '#E5E7EB' }}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </Card>

      {/* Tabla de Expedientes */}
      <Card className="border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                <th className="text-left p-4 text-xs font-bold" style={{ color: '#6B7280' }}>EXPEDIENTE</th>
                <th className="text-left p-4 text-xs font-bold" style={{ color: '#6B7280' }}>INVESTIGADO</th>
                <th className="text-left p-4 text-xs font-bold" style={{ color: '#6B7280' }}>ETAPA</th>
                <th className="text-left p-4 text-xs font-bold" style={{ color: '#6B7280' }}>PRESCRIPCIÓN</th>
                <th className="text-left p-4 text-xs font-bold" style={{ color: '#6B7280' }}>ABOGADO</th>
                <th className="text-right p-4 text-xs font-bold" style={{ color: '#6B7280' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {expedientesFiltrados.map((expediente, index) => {
                const semaforo = getSemaforoPrescripcion(expediente.diasParaPrescripcion);
                
                return (
                  <motion.tr
                    key={expediente.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="border-b hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#E5E7EB' }}
                  >
                    {/* Expediente */}
                    <td className="p-4">
                      <p className="font-bold text-sm" style={{ color: '#6F42C1' }}>
                        {expediente.numero}
                      </p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        OCID: {expediente.procesoOCID}
                      </p>
                    </td>

                    {/* Investigado */}
                    <td className="p-4">
                      <p className="font-medium text-sm" style={{ color: '#1F2937' }}>
                        {expediente.investigado}
                      </p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>
                        CC {expediente.cedula} • {expediente.cargo}
                      </p>
                    </td>

                    {/* Etapa */}
                    <td className="p-4">
                      <Badge
                        className="text-xs"
                        style={{ background: '#F3E8FF', color: '#6F42C1' }}
                      >
                        {expediente.etapaActual}
                      </Badge>
                    </td>

                    {/* Prescripción */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: semaforo.color }}
                        />
                        <div>
                          <p className="text-sm font-bold" style={{ color: semaforo.color }}>
                            {expediente.diasParaPrescripcion}d
                          </p>
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>
                            {semaforo.label}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Abogado */}
                    <td className="p-4">
                      <p className="text-sm font-medium" style={{ color: '#4B5563' }}>
                        {expediente.abogadoAsignado}
                      </p>
                    </td>

                    {/* Acciones */}
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleVerExpediente(expediente)}
                        >
                          <Eye className="w-4 h-4" style={{ color: '#6F42C1' }} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditarExpediente(expediente)}
                        >
                          <Edit className="w-4 h-4" style={{ color: '#0284C7' }} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEliminarExpediente(expediente.id)}
                        >
                          <Trash2 className="w-4 h-4" style={{ color: '#DC2626' }} />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Expediente */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setModalOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] overflow-y-auto z-50"
            >
              <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
                {/* Header Modal */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl" style={{ background: '#F3E8FF' }}>
                      <FileText className="w-6 h-6" style={{ color: '#6F42C1' }} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black" style={{ color: '#6F42C1' }}>
                        {modalMode === 'crear' ? 'Nuevo Expediente' :
                         modalMode === 'editar' ? 'Editar Expediente' :
                         'Detalle de Expediente'}
                      </h3>
                      {expedienteActual && (
                        <p className="text-sm" style={{ color: '#6B7280' }}>
                          {expedienteActual.numero}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Formulario */}
                {modalMode !== 'ver' ? (
                  <div className="space-y-6">
                    {/* Datos del Expediente */}
                    <div>
                      <h4 className="font-bold mb-4" style={{ color: '#1F2937' }}>
                        Datos del Expediente
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-bold mb-2" style={{ color: '#4B5563' }}>
                            Número Proceso OCID *
                          </Label>
                          <Input
                            placeholder="OCID-2025-XXXX"
                            value={formData.procesoOCID || ''}
                            onChange={(e) => setFormData({ ...formData, procesoOCID: e.target.value })}
                            className="border-2"
                            style={{ borderColor: '#E5E7EB' }}
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-bold mb-2" style={{ color: '#4B5563' }}>
                            Fecha de Hechos *
                          </Label>
                          <Input
                            type="date"
                            value={formData.fechaHechos || ''}
                            onChange={(e) => setFormData({ ...formData, fechaHechos: e.target.value })}
                            className="border-2"
                            style={{ borderColor: '#E5E7EB' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Datos del Investigado */}
                    <div>
                      <h4 className="font-bold mb-4" style={{ color: '#1F2937' }}>
                        Datos del Investigado
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label className="text-sm font-bold mb-2" style={{ color: '#4B5563' }}>
                            Nombre Completo *
                          </Label>
                          <Input
                            placeholder="Nombres y apellidos"
                            value={formData.investigado || ''}
                            onChange={(e) => setFormData({ ...formData, investigado: e.target.value })}
                            className="border-2"
                            style={{ borderColor: '#E5E7EB' }}
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-bold mb-2" style={{ color: '#4B5563' }}>
                            Cédula *
                          </Label>
                          <Input
                            placeholder="Número de cédula"
                            value={formData.cedula || ''}
                            onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                            className="border-2"
                            style={{ borderColor: '#E5E7EB' }}
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-bold mb-2" style={{ color: '#4B5563' }}>
                            Cargo *
                          </Label>
                          <Input
                            placeholder="Cargo del investigado"
                            value={formData.cargo || ''}
                            onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                            className="border-2"
                            style={{ borderColor: '#E5E7EB' }}
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-bold mb-2" style={{ color: '#4B5563' }}>
                            Email
                          </Label>
                          <Input
                            type="email"
                            placeholder="correo@esap.edu.co"
                            value={formData.email || ''}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="border-2"
                            style={{ borderColor: '#E5E7EB' }}
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-bold mb-2" style={{ color: '#4B5563' }}>
                            Teléfono
                          </Label>
                          <Input
                            placeholder="3001234567"
                            value={formData.telefono || ''}
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                            className="border-2"
                            style={{ borderColor: '#E5E7EB' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Asignación y Clasificación */}
                    <div>
                      <h4 className="font-bold mb-4" style={{ color: '#1F2937' }}>
                        Asignación y Clasificación
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-bold mb-2" style={{ color: '#4B5563' }}>
                            Abogado Sustanciador *
                          </Label>
                          <select
                            value={formData.abogadoAsignado || ''}
                            onChange={(e) => setFormData({ ...formData, abogadoAsignado: e.target.value })}
                            className="w-full p-2 border-2 rounded-lg"
                            style={{ borderColor: '#E5E7EB' }}
                          >
                            <option value="">Seleccionar...</option>
                            {ABOGADOS_DISPONIBLES.map(abogado => (
                              <option key={abogado} value={abogado}>{abogado}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-sm font-bold mb-2" style={{ color: '#4B5563' }}>
                            Tipo de Falta *
                          </Label>
                          <select
                            value={formData.tipoFalta || 'Grave'}
                            onChange={(e) => setFormData({ ...formData, tipoFalta: e.target.value as any })}
                            className="w-full p-2 border-2 rounded-lg"
                            style={{ borderColor: '#E5E7EB' }}
                          >
                            <option value="Leve">Leve</option>
                            <option value="Grave">Grave</option>
                            <option value="Gravísima">Gravísima</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-sm font-bold mb-2" style={{ color: '#4B5563' }}>
                            Normatividad Aplicable *
                          </Label>
                          <select
                            value={formData.normatividad || 'Ley 1952/2019'}
                            onChange={(e) => setFormData({ ...formData, normatividad: e.target.value as any })}
                            className="w-full p-2 border-2 rounded-lg"
                            style={{ borderColor: '#E5E7EB' }}
                          >
                            <option value="Ley 1952/2019">Ley 1952/2019 (CGD)</option>
                            <option value="Ley 734/2002">Ley 734/2002 (Anterior)</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-sm font-bold mb-2" style={{ color: '#4B5563' }}>
                            Sanción Proyectada
                          </Label>
                          <Input
                            placeholder="Ej: Destitución"
                            value={formData.sancionProyectada || ''}
                            onChange={(e) => setFormData({ ...formData, sancionProyectada: e.target.value })}
                            className="border-2"
                            style={{ borderColor: '#E5E7EB' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Observaciones */}
                    <div>
                      <Label className="text-sm font-bold mb-2" style={{ color: '#4B5563' }}>
                        Observaciones
                      </Label>
                      <textarea
                        placeholder="Observaciones o notas importantes del expediente..."
                        value={formData.observaciones || ''}
                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                        rows={3}
                        className="w-full p-3 border-2 rounded-lg"
                        style={{ borderColor: '#E5E7EB' }}
                      />
                    </div>

                    {/* Botones */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t-2" style={{ borderColor: '#E5E7EB' }}>
                      <Button
                        variant="outline"
                        onClick={() => setModalOpen(false)}
                        className="border-2"
                        style={{ borderColor: '#E5E7EB' }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleGuardarExpediente}
                        className="font-bold"
                        style={{ background: '#6F42C1', color: '#FFFFFF' }}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Guardar Expediente
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Vista de Detalle
                  <div className="space-y-6">
                    {expedienteActual && (
                      <>
                        {/* Información General */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-4 rounded-lg" style={{ background: '#F9FAFB' }}>
                            <p className="text-xs font-bold mb-1" style={{ color: '#9CA3AF' }}>
                              INVESTIGADO
                            </p>
                            <p className="font-bold" style={{ color: '#1F2937' }}>
                              {expedienteActual.investigado}
                            </p>
                            <p className="text-sm" style={{ color: '#6B7280' }}>
                              CC {expedienteActual.cedula}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg" style={{ background: '#F9FAFB' }}>
                            <p className="text-xs font-bold mb-1" style={{ color: '#9CA3AF' }}>
                              ETAPA ACTUAL
                            </p>
                            <Badge style={{ background: '#F3E8FF', color: '#6F42C1' }}>
                              {expedienteActual.etapaActual}
                            </Badge>
                          </div>
                          <div className="p-4 rounded-lg" style={{ background: getSemaforoPrescripcion(expedienteActual.diasParaPrescripcion).bg }}>
                            <p className="text-xs font-bold mb-1" style={{ color: '#9CA3AF' }}>
                              PRESCRIPCIÓN
                            </p>
                            <p className="font-bold" style={{ color: getSemaforoPrescripcion(expedienteActual.diasParaPrescripcion).color }}>
                              {expedienteActual.diasParaPrescripcion} días
                            </p>
                            <p className="text-sm" style={{ color: '#6B7280' }}>
                              {getSemaforoPrescripcion(expedienteActual.diasParaPrescripcion).label}
                            </p>
                          </div>
                        </div>

                        {/* Más detalles... */}
                        <div className="text-center py-8">
                          <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#6F42C1' }} />
                          <p className="font-bold" style={{ color: '#1F2937' }}>
                            Vista de detalle completa
                          </p>
                          <p className="text-sm" style={{ color: '#6B7280' }}>
                            Aquí se mostraría toda la información del expediente
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
