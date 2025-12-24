/**
 * MÓDULO: ASPIRANTES (LEADS DE CONTACTO)
 * Diseño EXACTAMENTE igual al módulo de Usuarios
 * Sistema simple de gestión de leads que llegan desde el Landing Page
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Download, 
  Mail, 
  Phone, 
  Eye,
  CheckCircle,
  Clock,
  UserPlus,
  GraduationCap,
  Calendar,
  MessageSquare,
  X,
  ExternalLink,
  Users,
  TrendingUp,
  AlertCircle,
  Filter
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { PaginationPremium } from '../shared/PaginationPremium';
import React from 'react';

// Tipo de Aspirante (Lead de contacto desde Landing Page)
interface Aspirante {
  id: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  carreraInteres: string;
  fechaRegistro: string;
  estado: 'no-atendido' | 'atendido';
  observaciones?: string;
}

export function AspirantesModule() {
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAspirante, setSelectedAspirante] = useState<Aspirante | null>(null);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const itemsPerPage = 10;

  // Mock data: Aspirantes que llegan desde el Landing Page
  const [aspirantes, setAspirantes] = useState<Aspirante[]>([
    {
      id: '1',
      nombreCompleto: 'María Alejandra González Pérez',
      email: 'maria.gonzalez@email.com',
      telefono: '300 123 4567',
      carreraInteres: 'Administración Pública - Pregrado',
      fechaRegistro: '2025-11-28T10:30:00',
      estado: 'no-atendido'
    },
    {
      id: '2',
      nombreCompleto: 'Carlos Eduardo Ramírez Silva',
      email: 'carlos.ramirez@email.com',
      telefono: '310 987 6543',
      carreraInteres: 'Gestión Pública - Especialización',
      fechaRegistro: '2025-11-27T14:20:00',
      estado: 'atendido',
      observaciones: 'Contactado vía email. Solicitó información sobre proceso de admisión.'
    },
    {
      id: '3',
      nombreCompleto: 'Ana Patricia Martínez López',
      email: 'ana.martinez@email.com',
      telefono: '320 555 5555',
      carreraInteres: 'Políticas Públicas - Maestría',
      fechaRegistro: '2025-11-26T09:15:00',
      estado: 'no-atendido'
    },
    {
      id: '4',
      nombreCompleto: 'Luis Fernando Rodríguez Castro',
      email: 'luis.rodriguez@email.com',
      telefono: '315 444 3333',
      carreraInteres: 'Administración Pública - Pregrado',
      fechaRegistro: '2025-11-25T16:45:00',
      estado: 'atendido',
      observaciones: 'Llamada telefónica realizada. Interesado en matrícula 2026-1.'
    },
    {
      id: '5',
      nombreCompleto: 'Diana Carolina Morales Gutiérrez',
      email: 'diana.morales@email.com',
      telefono: '301 222 1111',
      carreraInteres: 'Gestión Pública - Especialización',
      fechaRegistro: '2025-11-24T11:00:00',
      estado: 'no-atendido'
    },
  ]);

  // Stats - Igual que módulo de usuarios
  const stats = {
    total: aspirantes.length,
    noAtendidos: aspirantes.filter(a => a.estado === 'no-atendido').length,
    atendidos: aspirantes.filter(a => a.estado === 'atendido').length,
    tasaConversion: aspirantes.length > 0 ? ((aspirantes.filter(a => a.estado === 'atendido').length / aspirantes.length) * 100).toFixed(1) : '0'
  };

  // Filtros
  const filteredAspirantes = aspirantes.filter(asp => {
    const matchesSearch = 
      asp.nombreCompleto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asp.telefono.includes(searchQuery) ||
      asp.carreraInteres.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEstado = estadoFilter === 'all' || asp.estado === estadoFilter;
    
    return matchesSearch && matchesEstado;
  });

  // Paginación
  const totalPages = Math.ceil(filteredAspirantes.length / itemsPerPage);
  const paginatedAspirantes = filteredAspirantes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const hasActiveFilters = searchQuery || estadoFilter !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setEstadoFilter('all');
  };

  const handleCambiarEstado = (id: string, nuevoEstado: 'no-atendido' | 'atendido') => {
    setAspirantes(prev => prev.map(asp => 
      asp.id === id ? { ...asp, estado: nuevoEstado } : asp
    ));
    toast.success(`Estado actualizado a: ${nuevoEstado === 'atendido' ? 'Atendido ✓' : 'No Atendido'}`);
  };

  const handleAgregarObservacion = (id: string, observacion: string) => {
    setAspirantes(prev => prev.map(asp => 
      asp.id === id ? { ...asp, observaciones: observacion } : asp
    ));
    toast.success('Observación guardada correctamente');
  };

  const handleVerDetalle = (aspirante: Aspirante) => {
    setSelectedAspirante(aspirante);
    setIsDetalleOpen(true);
  };

  const handleExport = () => {
    toast.success('Exportación Iniciada', {
      description: 'Descargando lista de aspirantes a Excel...'
    });
  };

  const getEstadoBadge = (estado: string) => {
    if (estado === 'atendido') {
      return (
        <Badge className="bg-[#ECFDF5] text-[#065F46] border-[#10B981] border">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Atendido</span>
          </div>
        </Badge>
      );
    }
    return (
      <Badge className="bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA] border">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">No Atendido</span>
        </div>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header - EXACTAMENTE como Usuarios */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)'
              }}
            >
              <UserPlus className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            {/* H1: 32px Bold, line-height 40px, letter-spacing -0.25px */}
            <h1 
              className="font-bold tracking-tight"
              style={{
                fontSize: '32px',
                lineHeight: '40px',
                letterSpacing: '-0.25px',
                color: '#1F2937'
              }}
            >
              Aspirantes
            </h1>
          </div>
          {/* Body: 14px Regular, line-height 20px */}
          <p 
            className="font-normal"
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              color: '#6B7280'
            }}
          >
            Gestión de contactos de personas interesadas en estudiar en ESAP
          </p>
        </div>

        {/* Botones de Acción - Igual que Usuarios */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            onClick={handleExport}
            variant="outline"
            className="gap-2"
            style={{
              borderColor: '#D1D5DB',
              color: '#374151',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards - EXACTAMENTE como Usuarios */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Total Aspirantes */}
        <Card className="p-5 border border-gray-200 bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div 
              className="p-2.5 rounded-lg"
              style={{
                background: '#EFF6FF'
              }}
            >
              <Users className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
          </div>
          <div>
            <p 
              className="font-medium mb-1"
              style={{
                fontSize: '13px',
                lineHeight: '18px',
                color: '#6B7280'
              }}
            >
              Total Aspirantes
            </p>
            <p 
              className="font-bold"
              style={{
                fontSize: '28px',
                lineHeight: '36px',
                color: '#111827'
              }}
            >
              {stats.total}
            </p>
          </div>
        </Card>

        {/* No Atendidos */}
        <Card className="p-5 border border-gray-200 bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div 
              className="p-2.5 rounded-lg"
              style={{
                background: '#FFF7ED'
              }}
            >
              <Clock className="w-5 h-5" style={{ color: '#F59E0B' }} />
            </div>
            <Badge 
              className="border-0"
              style={{
                background: '#FEF3C7',
                color: '#92400E',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              Pendientes
            </Badge>
          </div>
          <div>
            <p 
              className="font-medium mb-1"
              style={{
                fontSize: '13px',
                lineHeight: '18px',
                color: '#6B7280'
              }}
            >
              No Atendidos
            </p>
            <p 
              className="font-bold"
              style={{
                fontSize: '28px',
                lineHeight: '36px',
                color: '#111827'
              }}
            >
              {stats.noAtendidos}
            </p>
          </div>
        </Card>

        {/* Atendidos */}
        <Card className="p-5 border border-gray-200 bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div 
              className="p-2.5 rounded-lg"
              style={{
                background: '#D1FAE5'
              }}
            >
              <CheckCircle className="w-5 h-5" style={{ color: '#059669' }} />
            </div>
            <Badge 
              className="border-0"
              style={{
                background: '#D1FAE5',
                color: '#065F46',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              Completados
            </Badge>
          </div>
          <div>
            <p 
              className="font-medium mb-1"
              style={{
                fontSize: '13px',
                lineHeight: '18px',
                color: '#6B7280'
              }}
            >
              Atendidos
            </p>
            <p 
              className="font-bold"
              style={{
                fontSize: '28px',
                lineHeight: '36px',
                color: '#111827'
              }}
            >
              {stats.atendidos}
            </p>
          </div>
        </Card>

        {/* Tasa de Conversión */}
        <Card className="p-5 border border-gray-200 bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div 
              className="p-2.5 rounded-lg"
              style={{
                background: '#F3E8FF'
              }}
            >
              <TrendingUp className="w-5 h-5" style={{ color: '#9333EA' }} />
            </div>
          </div>
          <div>
            <p 
              className="font-medium mb-1"
              style={{
                fontSize: '13px',
                lineHeight: '18px',
                color: '#6B7280'
              }}
            >
              Tasa de Conversión
            </p>
            <p 
              className="font-bold"
              style={{
                fontSize: '28px',
                lineHeight: '36px',
                color: '#111827'
              }}
            >
              {stats.tasaConversion}
              <span 
                style={{
                  fontSize: '16px',
                  color: '#6B7280',
                  fontWeight: 500
                }}
              >
                %
              </span>
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Banner Informativo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="border-2 rounded-xl p-5"
        style={{
          background: '#EFF6FF',
          borderColor: '#93C5FD'
        }}
      >
        <div className="flex items-start gap-4">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#DBEAFE' }}
          >
            <UserPlus className="w-5 h-5" style={{ color: '#3B82F6' }} strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <h3 
              className="font-bold mb-1"
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                color: '#1E3A8A'
              }}
            >
              💡 Leads desde Landing Page
            </h3>
            <p 
              className="font-normal"
              style={{ 
                fontSize: '14px',
                lineHeight: '20px',
                color: '#1E3A8A'
              }}
            >
              Estos contactos provienen del formulario de interés del Landing Page público. Contacta a los aspirantes dentro de las primeras 24 horas para mejorar la tasa de conversión. Puedes marcarlos como "Atendido" y agregar observaciones del seguimiento.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Búsqueda y Filtros - Igual que Usuarios */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-white border border-gray-200 rounded-xl p-5"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, email, teléfono o carrera..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
              style={{
                borderColor: '#D1D5DB',
                borderRadius: '8px'
              }}
            />
          </div>

          {/* Filtro Estado */}
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="border-2 rounded-lg px-4 py-2"
            style={{
              fontSize: '14px',
              color: '#1F2937',
              borderColor: '#D1D5DB',
              minWidth: '180px',
              height: '40px',
              outline: 'none'
            }}
          >
            <option value="all">Todos los estados</option>
            <option value="no-atendido">No Atendidos</option>
            <option value="atendido">Atendidos</option>
          </select>
        </div>
      </motion.div>

      {/* Tabla de Aspirantes - Estilo Usuarios */}
      <Card className="border border-gray-200 bg-white overflow-hidden">
        {/* Header de tabla */}
        <div 
          className="border-b px-6 py-4"
          style={{
            background: '#F9FAFB',
            borderBottom: '2px solid #E5E7EB'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 
                className="font-bold"
                style={{
                  fontSize: '18px',
                  lineHeight: '24px',
                  color: '#1F2937'
                }}
              >
                Lista de Aspirantes
              </h2>
              <p 
                className="mt-0.5"
                style={{
                  fontSize: '12px',
                  lineHeight: '16px',
                  color: '#6B7280'
                }}
              >
                Mostrando {paginatedAspirantes.length} de {filteredAspirantes.length} aspirantes
              </p>
            </div>
            <Badge variant="outline" className="font-semibold">
              Total: {filteredAspirantes.length}
            </Badge>
          </div>
        </div>

        {/* Vista Desktop - Table */}
        {paginatedAspirantes.length > 0 ? (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
                <thead 
                  style={{
                    background: '#F9FAFB',
                    borderBottom: '2px solid #E5E7EB'
                  }}
                >
                  <tr>
                    <th 
                      className="text-left font-semibold uppercase"
                      style={{
                        padding: '12px 16px',
                        fontSize: '12px',
                        lineHeight: '16px',
                        color: '#6B7280',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Nombre Completo
                    </th>
                    <th 
                      className="text-left font-semibold uppercase"
                      style={{
                        padding: '12px 16px',
                        fontSize: '12px',
                        lineHeight: '16px',
                        color: '#6B7280',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Email
                    </th>
                    <th 
                      className="text-left font-semibold uppercase"
                      style={{
                        padding: '12px 16px',
                        fontSize: '12px',
                        lineHeight: '16px',
                        color: '#6B7280',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Teléfono
                    </th>
                    <th 
                      className="text-left font-semibold uppercase"
                      style={{
                        padding: '12px 16px',
                        fontSize: '12px',
                        lineHeight: '16px',
                        color: '#6B7280',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Carrera de Interés
                    </th>
                    <th 
                      className="text-left font-semibold uppercase"
                      style={{
                        padding: '12px 16px',
                        fontSize: '12px',
                        lineHeight: '16px',
                        color: '#6B7280',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Fecha Registro
                    </th>
                    <th 
                      className="text-left font-semibold uppercase"
                      style={{
                        padding: '12px 16px',
                        fontSize: '12px',
                        lineHeight: '16px',
                        color: '#6B7280',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Estado
                    </th>
                    <th 
                      className="text-right font-semibold uppercase"
                      style={{
                        padding: '12px 16px',
                        fontSize: '12px',
                        lineHeight: '16px',
                        color: '#6B7280',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedAspirantes.map((aspirante) => (
                    <tr 
                      key={aspirante.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Nombre */}
                      <td style={{ padding: '16px' }}>
                        <p 
                          className="font-medium"
                          style={{
                            fontSize: '14px',
                            lineHeight: '20px',
                            color: '#111827'
                          }}
                        >
                          {aspirante.nombreCompleto}
                        </p>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '16px' }}>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-blue-600" />
                          <p 
                            className="truncate"
                            style={{
                              fontSize: '14px',
                              lineHeight: '20px',
                              color: '#374151'
                            }}
                          >
                            {aspirante.email}
                          </p>
                        </div>
                      </td>

                      {/* Teléfono */}
                      <td style={{ padding: '16px' }}>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-[#1e5da8]" />
                          <p 
                            style={{
                              fontSize: '14px',
                              lineHeight: '20px',
                              color: '#374151'
                            }}
                          >
                            {aspirante.telefono}
                          </p>
                        </div>
                      </td>

                      {/* Carrera */}
                      <td style={{ padding: '16px' }}>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-purple-600" />
                          <p 
                            style={{
                              fontSize: '14px',
                              lineHeight: '20px',
                              color: '#374151'
                            }}
                          >
                            {aspirante.carreraInteres}
                          </p>
                        </div>
                      </td>

                      {/* Fecha */}
                      <td style={{ padding: '16px' }}>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <p 
                              style={{
                                fontSize: '14px',
                                lineHeight: '20px',
                                color: '#374151'
                              }}
                            >
                              {new Date(aspirante.fechaRegistro).toLocaleDateString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '16px' }}>
                        <select
                          value={aspirante.estado}
                          onChange={(e) => handleCambiarEstado(aspirante.id, e.target.value as 'no-atendido' | 'atendido')}
                          className="text-sm border-2 rounded-lg px-2 py-1 cursor-pointer transition-all font-medium"
                          style={{
                            borderColor: aspirante.estado === 'atendido' ? '#86EFAC' : '#FED7AA',
                            background: aspirante.estado === 'atendido' ? '#F0FDF4' : '#FFF7ED',
                            color: aspirante.estado === 'atendido' ? '#166534' : '#9A3412'
                          }}
                        >
                          <option value="no-atendido">No Atendido</option>
                          <option value="atendido">Atendido</option>
                        </select>
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleVerDetalle(aspirante)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-5 h-5 text-[#003DA5]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista Mobile - Cards */}
            <div className="lg:hidden divide-y divide-gray-200">
              {paginatedAspirantes.map((aspirante) => (
                <div key={aspirante.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">{aspirante.nombreCompleto}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{aspirante.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{aspirante.telefono}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleVerDetalle(aspirante)}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-5 h-5 text-[#003DA5]" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4 text-purple-600" />
                    <p className="text-sm text-gray-700">{aspirante.carreraInteres}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    {getEstadoBadge(aspirante.estado)}
                    <p className="text-xs text-gray-500">
                      {new Date(aspirante.fechaRegistro).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <PaginationPremium
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredAspirantes.length}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 px-6">
            <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No se encontraron aspirantes
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {hasActiveFilters 
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Los contactos de personas interesadas aparecerán aquí cuando se registren desde el Landing Page'}
            </p>
            {hasActiveFilters && (
              <Button
                onClick={clearAllFilters}
                style={{
                  background: '#003DA5',
                  color: 'white'
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Modal de Detalle */}
      <AnimatePresence>
        {isDetalleOpen && selectedAspirante && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetalleOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-white shadow-2xl rounded-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#003DA5] via-[#0052CC] to-[#3B82F6] px-6 py-5">
                <div className="relative flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-extrabold text-white">Detalle del Aspirante</h3>
                    <p className="text-sm text-white/80 mt-0.5">Información de contacto</p>
                  </div>
                  <button
                    onClick={() => setIsDetalleOpen(false)}
                    className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all border border-white/20"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Información Personal */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-[#003DA5]" />
                    </div>
                    <h4 className="font-bold text-gray-900">Información Personal</h4>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Nombre Completo</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedAspirante.nombreCompleto}</p>
                  </div>
                </div>

                {/* Información de Contacto */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-[#1e5da8]" />
                    </div>
                    <h4 className="font-bold text-gray-900">Información de Contacto</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Correo Electrónico</p>
                      <p className="text-sm font-medium text-gray-900 break-all">{selectedAspirante.email}</p>
                      <a 
                        href={`mailto:${selectedAspirante.email}`}
                        className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Enviar email
                      </a>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Teléfono</p>
                      <p className="text-sm font-medium text-gray-700">{selectedAspirante.telefono}</p>
                      <a 
                        href={`tel:${selectedAspirante.telefono.replace(/\s/g, '')}`}
                        className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Llamar
                      </a>
                    </div>
                  </div>
                </div>

                {/* Información Académica */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-purple-600" />
                    </div>
                    <h4 className="font-bold text-gray-900">Información Académica</h4>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Carrera de Interés</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedAspirante.carreraInteres}</p>
                  </div>
                </div>

                {/* Estado y Fecha */}
                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-blue-700 mb-1">Fecha de Registro</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(selectedAspirante.fechaRegistro).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 mb-1">Estado Actual</p>
                      {getEstadoBadge(selectedAspirante.estado)}
                    </div>
                  </div>
                </div>

                {/* Observaciones */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-amber-600" />
                    </div>
                    <h4 className="font-bold text-gray-900">Observaciones</h4>
                  </div>
                  <textarea
                    defaultValue={selectedAspirante.observaciones || ''}
                    onBlur={(e) => handleAgregarObservacion(selectedAspirante.id, e.target.value)}
                    placeholder="Agrega observaciones sobre el seguimiento realizado..."
                    className="w-full border-2 border-gray-200 rounded-lg p-3 text-sm resize-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/10 outline-none transition-all"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-2">Las observaciones se guardan automáticamente al salir del campo</p>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsDetalleOpen(false)}
                >
                  Cerrar
                </Button>
                <Button
                  style={{
                    background: '#003DA5',
                    color: 'white'
                  }}
                  onClick={() => {
                    handleCambiarEstado(
                      selectedAspirante.id,
                      selectedAspirante.estado === 'atendido' ? 'no-atendido' : 'atendido'
                    );
                  }}
                >
                  {selectedAspirante.estado === 'atendido' ? 'Marcar como No Atendido' : 'Marcar como Atendido'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}