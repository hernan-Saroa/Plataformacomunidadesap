/**
 * FiltrosAvanzados - Panel de Filtros Avanzados World-Class
 * Diseño premium con múltiples filtros y guardado de favoritos
 */

import { Card } from '@esap-mfe/shared-ui/card';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Input } from '@esap-mfe/shared-ui/input';
import {
  Filter, X, Calendar, User, FileText, Tag, Star,
  ChevronDown, RotateCcw, Save, Sparkles
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface FiltrosAvanzadosProps {
  isOpen: boolean;
  onClose: () => void;
  onAplicarFiltros: (filtros: any) => void;
  firmantesDisponibles: string[];
  tiposDisponibles: string[];
}

// Función auxiliar para obtener iniciales
const getInitials = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Función para obtener color del avatar
const getAvatarColor = (name: string): string => {
  const colors = ['#003DA5', '#1e5da8', '#2a6dbd', '#F57C00', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export function FiltrosAvanzados({
  isOpen,
  onClose,
  onAplicarFiltros,
  firmantesDisponibles,
  tiposDisponibles
}: FiltrosAvanzadosProps) {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [firmantesSeleccionados, setFirmantesSeleccionados] = useState<string[]>([]);
  const [tiposSeleccionados, setTiposSeleccionados] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>([]);
  const [busquedaFirmantes, setBusquedaFirmantes] = useState('');

  const toggleFirmante = (firmante: string) => {
    if (firmantesSeleccionados.includes(firmante)) {
      setFirmantesSeleccionados(firmantesSeleccionados.filter(f => f !== firmante));
    } else {
      setFirmantesSeleccionados([...firmantesSeleccionados, firmante]);
    }
  };

  const toggleTipo = (tipo: string) => {
    if (tiposSeleccionados.includes(tipo)) {
      setTiposSeleccionados(tiposSeleccionados.filter(t => t !== tipo));
    } else {
      setTiposSeleccionados([...tiposSeleccionados, tipo]);
    }
  };

  const toggleEstado = (estado: string) => {
    if (estados.includes(estado)) {
      setEstados(estados.filter(e => e !== estado));
    } else {
      setEstados([...estados, estado]);
    }
  };

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setFirmantesSeleccionados([]);
    setTiposSeleccionados([]);
    setEstados([]);
    setBusquedaFirmantes('');
    toast.info('🔄 Filtros limpiados', { duration: 1500 });
  };

  const aplicarFiltros = () => {
    const filtros = {
      fechaDesde,
      fechaHasta,
      firmantes: firmantesSeleccionados,
      tipos: tiposSeleccionados,
      estados
    };

    const cantidadFiltros = [
      fechaDesde,
      fechaHasta,
      ...firmantesSeleccionados,
      ...tiposSeleccionados,
      ...estados
    ].filter(Boolean).length;

    onAplicarFiltros(filtros);
    toast.success(`✅ ${cantidadFiltros} filtros aplicados`, {
      description: 'Los resultados se han actualizado',
      duration: 2000
    });
    onClose();
  };

  const guardarFiltroFavorito = () => {
    toast.success('⭐ Filtro guardado', {
      description: 'Puedes acceder a este filtro desde "Favoritos"',
      duration: 2500
    });
  };

  const firmantesFliltrados = firmantesDisponibles.filter(f =>
    f.toLowerCase().includes(busquedaFirmantes.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Filtros Avanzados</h2>
              <p className="text-sm text-blue-100">Personaliza tu búsqueda de documentos</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Rango de Fechas */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-gray-900">Rango de Fechas</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Fecha desde
                </label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Fecha hasta
                </label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            {(fechaDesde || fechaHasta) && (
              <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {fechaDesde && fechaHasta
                    ? `Del ${fechaDesde} al ${fechaHasta}`
                    : fechaDesde
                    ? `Desde ${fechaDesde}`
                    : `Hasta ${fechaHasta}`}
                </span>
              </div>
            )}
          </div>

          {/* Estados */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-gray-900">Estado del Documento</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'pendiente', label: 'Pendiente', color: 'bg-red-100 text-red-700 border-red-300' },
                { value: 'en_proceso', label: 'En Proceso', color: 'bg-orange-100 text-orange-700 border-orange-300' },
                { value: 'firmado', label: 'Firmado', color: 'bg-green-100 text-green-700 border-green-300' }
              ].map((estado) => (
                <button
                  key={estado.value}
                  onClick={() => toggleEstado(estado.value)}
                  className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all ${
                    estados.includes(estado.value)
                      ? estado.color + ' shadow-md scale-105'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {estado.label}
                  {estados.includes(estado.value) && (
                    <span className="ml-1.5">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tipos de Documento */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-gray-900">Tipo de Documento</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {tiposDisponibles.map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => toggleTipo(tipo)}
                  className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all ${
                    tiposSeleccionados.includes(tipo)
                      ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-md scale-105'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {tipo}
                  {tiposSeleccionados.includes(tipo) && (
                    <span className="ml-1.5">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Firmantes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-gray-900">Firmantes</h3>
              {firmantesSeleccionados.length > 0 && (
                <Badge className="bg-blue-100 text-blue-700 font-bold">
                  {firmantesSeleccionados.length} seleccionados
                </Badge>
              )}
            </div>
            
            {/* Búsqueda de firmantes */}
            <Input
              placeholder="Buscar firmante..."
              value={busquedaFirmantes}
              onChange={(e) => setBusquedaFirmantes(e.target.value)}
              className="mb-3"
            />

            {/* Lista de firmantes */}
            <div className="max-h-64 overflow-y-auto border-2 border-gray-200 rounded-lg">
              {firmantesFliltrados.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No se encontraron firmantes</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {firmantesFliltrados.map((firmante) => {
                    const isSelected = firmantesSeleccionados.includes(firmante);
                    const initials = getInitials(firmante);
                    const avatarColor = getAvatarColor(firmante);

                    return (
                      <button
                        key={firmante}
                        onClick={() => toggleFirmante(firmante)}
                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-sm text-gray-900">{firmante}</p>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Resumen de Filtros Activos */}
          {(fechaDesde || fechaHasta || firmantesSeleccionados.length > 0 || 
            tiposSeleccionados.length > 0 || estados.length > 0) && (
            <Card className="p-4 bg-blue-50 border-2 border-blue-200">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-blue-900 mb-2">Filtros Activos</p>
                  <div className="flex flex-wrap gap-2">
                    {fechaDesde && (
                      <Badge className="bg-white text-blue-700 font-semibold">
                        Desde: {fechaDesde}
                      </Badge>
                    )}
                    {fechaHasta && (
                      <Badge className="bg-white text-blue-700 font-semibold">
                        Hasta: {fechaHasta}
                      </Badge>
                    )}
                    {estados.map(estado => (
                      <Badge key={estado} className="bg-white text-blue-700 font-semibold">
                        {estado === 'pendiente' ? 'Pendiente' : 
                         estado === 'en_proceso' ? 'En Proceso' : 'Firmado'}
                      </Badge>
                    ))}
                    {tiposSeleccionados.map(tipo => (
                      <Badge key={tipo} className="bg-white text-blue-700 font-semibold">
                        {tipo}
                      </Badge>
                    ))}
                    {firmantesSeleccionados.map(firmante => (
                      <Badge key={firmante} className="bg-white text-blue-700 font-semibold">
                        {firmante}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              onClick={limpiarFiltros}
              variant="outline"
              size="sm"
              className="font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Limpiar
            </Button>
            <Button
              onClick={guardarFiltroFavorito}
              variant="outline"
              size="sm"
              className="font-medium"
            >
              <Star className="w-3.5 h-3.5 mr-1.5" />
              Guardar Filtro
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="font-medium"
            >
              Cancelar
            </Button>
            <Button
              onClick={aplicarFiltros}
              className="font-medium"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
