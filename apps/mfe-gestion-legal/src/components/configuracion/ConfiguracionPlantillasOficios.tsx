/**
 * ConfiguracionPlantillasOficios - Configuración de Plantillas y Logos para Oficios
 * ✅ REFACTORIZADO COMPLETAMENTE - UX/UI Mobile-First Premium
 * ✅ Vista previa optimizada - sticky desktop / sección mobile
 * ✅ Color pickers con contenedor controlado
 * ✅ Usabilidad y responsive world-class
 */

import { useState, useRef } from 'react';
import { 
  FileText, Upload, Image as ImageIcon, Save, RotateCcw, 
  Eye, Download, Trash2, AlertCircle, CheckCircle, Building2, MapPin, Phone, Mail 
} from 'lucide-react';
import { toast } from 'sonner';
import { useResponsive } from '../../../../hooks/useResponsive';

interface PlantillaConfig {
  logo: string | null;
  plantillaPDF: File | null;
  nombreEntidad: string;
  direccion: string;
  telefono: string;
  email: string;
  colorPrimario: string;
  colorSecundario: string;
  usarPlantillaPredeterminada: boolean;
}

export function ConfiguracionPlantillasOficios() {
  const { isMobile, isTablet } = useResponsive();

  const [config, setConfig] = useState<PlantillaConfig>({
    logo: null,
    plantillaPDF: null,
    nombreEntidad: 'Escuela Superior de Administración Pública - ESAP',
    direccion: 'Calle 44 No. 53-37, Bogotá D.C.',
    telefono: '(601) 220 2790',
    email: 'contacto@esap.edu.co',
    colorPrimario: '#003DA5',
    colorSecundario: '#F57C00',
    usarPlantillaPredeterminada: true
  });

  // const [cambiosPendientes, setHayCambiosPendientes] = useState(false);
  // const [vistaPreviaActiva, setVistaPreviaActiva] = useState(false);

  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [vistaPreviewModal, setVistaPreviewModal] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const plantillaInputRef = useRef<HTMLInputElement>(null);

  // Manejar subida de logo
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Formato no válido', {
        description: 'Solo se permiten archivos de imagen (PNG, JPG, SVG)'
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Archivo muy grande', {
        description: 'El tamaño máximo permitido es 2 MB'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setConfig(prev => ({ ...prev, logo: event.target?.result as string }));
      setCambiosPendientes(true);
      toast.success('Logo cargado correctamente');
    };
    reader.readAsDataURL(file);
  };

  // Manejar subida de plantilla PDF
  const handlePlantillaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Formato no válido', {
        description: 'Solo se permiten archivos PDF'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Archivo muy grande', {
        description: 'El tamaño máximo permitido es 5 MB'
      });
      return;
    }

    setConfig(prev => ({ 
      ...prev, 
      plantillaPDF: file,
      usarPlantillaPredeterminada: false 
    }));
    setCambiosPendientes(true);
    toast.success('Plantilla PDF cargada', {
      description: file.name
    });
  };

  const eliminarLogo = () => {
    setConfig(prev => ({ ...prev, logo: null }));
    setCambiosPendientes(true);
    if (logoInputRef.current) logoInputRef.current.value = '';
    toast.info('Logo eliminado');
  };

  const eliminarPlantilla = () => {
    setConfig(prev => ({ 
      ...prev, 
      plantillaPDF: null,
      usarPlantillaPredeterminada: true 
    }));
    setCambiosPendientes(true);
    if (plantillaInputRef.current) plantillaInputRef.current.value = '';
    toast.info('Plantilla PDF eliminada, usando plantilla predeterminada');
  };

  const guardarConfiguracion = () => {
    toast.loading('Guardando configuración...', { id: 'guardar-config' });

    setTimeout(() => {
      localStorage.setItem('config-plantillas-oficios', JSON.stringify(config));
      setCambiosPendientes(false);
      toast.success('Configuración guardada', {
        id: 'guardar-config',
        description: 'Los cambios se aplicarán en los próximos oficios generados'
      });
    }, 1000);
  };

  const restablecerDefecto = () => {
    if (!confirm('¿Estás seguro de restablecer los valores por defecto? Se perderán todos los cambios.')) {
      return;
    }

    setConfig({
      logo: null,
      plantillaPDF: null,
      nombreEntidad: 'Escuela Superior de Administración Pública - ESAP',
      direccion: 'Calle 44 No. 53-37, Bogotá D.C.',
      telefono: '(601) 220 2790',
      email: 'contacto@esap.edu.co',
      colorPrimario: '#003DA5',
      colorSecundario: '#F57C00',
      usarPlantillaPredeterminada: true
    });

    if (logoInputRef.current) logoInputRef.current.value = '';
    if (plantillaInputRef.current) plantillaInputRef.current.value = '';

    setCambiosPendientes(true);
    toast.success('Valores restablecidos por defecto');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 flex-shrink-0" style={{ color: '#003DA5' }} />
              <span className="truncate">Configuración de Plantillas</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Personaliza el logo, plantilla PDF y la información de la entidad
            </p>
          </div>
          
          {cambiosPendientes && (
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-orange-600 bg-orange-50 px-3 py-2 rounded-lg flex-shrink-0">
              <AlertCircle className="w-4 h-4" />
              <span>Cambios sin guardar</span>
            </div>
          )}
        </div>
      </div>

      {/* Layout Principal - Grid Responsive */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Panel Principal: Configuración - 2 columnas en XL */}
        <div className="xl:col-span-2 space-y-4 sm:space-y-6">
          
          {/* Logo Corporativo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4" style={{ color: '#003DA5' }} />
              Logo Corporativo
            </h3>

            {!config.logo ? (
              <div 
                onClick={() => logoInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-all"
              >
                <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm font-bold text-gray-700 mb-1">
                  {isMobile ? 'Toca para subir el logo' : 'Haz clic para subir el logo'}
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG o SVG • Máximo 2 MB
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center min-h-[120px]">
                  <img 
                    src={config.logo} 
                    alt="Logo" 
                    className="max-h-32 object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg transition-colors"
                  >
                    Cambiar Logo
                  </button>
                  <button
                    onClick={eliminarLogo}
                    className="px-4 py-2.5 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>

          {/* Plantilla PDF */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4" style={{ color: '#003DA5' }} />
              Plantilla PDF Personalizada
            </h3>

            <div className="mb-4">
              <label className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.usarPlantillaPredeterminada}
                  onChange={(e) => {
                    setConfig(prev => ({ ...prev, usarPlantillaPredeterminada: e.target.checked }));
                    setCambiosPendientes(true);
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0 mt-0.5"
                />
                <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">
                  Usar plantilla predeterminada de ESAP
                </span>
              </label>
            </div>

            {!config.usarPlantillaPredeterminada && (
              <>
                {!config.plantillaPDF ? (
                  <div 
                    onClick={() => plantillaInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-all"
                  >
                    <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm font-bold text-gray-700 mb-1">
                      {isMobile ? 'Toca para subir plantilla PDF' : 'Haz clic para subir plantilla PDF'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Formato PDF • Máximo 5 MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-red-100 flex-shrink-0">
                          <FileText className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {config.plantillaPDF.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {(config.plantillaPDF.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => plantillaInputRef.current?.click()}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg transition-colors"
                      >
                        Cambiar Plantilla
                      </button>
                      <button
                        onClick={eliminarPlantilla}
                        className="px-4 py-2.5 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={plantillaInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handlePlantillaChange}
                  className="hidden"
                />
              </>
            )}

            {config.usarPlantillaPredeterminada && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-blue-900 mb-1">
                      Plantilla predeterminada activa
                    </p>
                    <p className="text-xs text-blue-800">
                      Se utilizará la plantilla corporativa oficial de ESAP con los colores y diseño institucional.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Información de la Entidad */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4" style={{ color: '#003DA5' }} />
              Información de la Entidad
            </h3>

            <div className="space-y-4">
              {/* Nombre Entidad */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre de la Entidad
                </label>
                <input
                  type="text"
                  value={config.nombreEntidad}
                  onChange={(e) => {
                    setConfig(prev => ({ ...prev, nombreEntidad: e.target.value }));
                    setCambiosPendientes(true);
                  }}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre completo de la entidad"
                />
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Dirección
                </label>
                <input
                  type="text"
                  value={config.direccion}
                  onChange={(e) => {
                    setConfig(prev => ({ ...prev, direccion: e.target.value }));
                    setCambiosPendientes(true);
                  }}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Dirección física"
                />
              </div>

              {/* Grid: Teléfono + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={config.telefono}
                    onChange={(e) => {
                      setConfig(prev => ({ ...prev, telefono: e.target.value }));
                      setCambiosPendientes(true);
                    }}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Número de teléfono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={config.email}
                    onChange={(e) => {
                      setConfig(prev => ({ ...prev, email: e.target.value }));
                      setCambiosPendientes(true);
                    }}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="correo@esap.edu.co"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Colores Corporativos - REFACTORIZADO */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4" style={{ color: '#003DA5' }} />
              Colores Corporativos
            </h3>

            <div className="space-y-5">
              {/* Color Primario */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color Primario
                </label>
                <div className="flex items-center gap-3">
                  {/* Color Picker - Tamaño fijo controlado */}
                  <div className="flex-shrink-0">
                    <input
                      type="color"
                      value={config.colorPrimario}
                      onChange={(e) => {
                        setConfig(prev => ({ ...prev, colorPrimario: e.target.value }));
                        setCambiosPendientes(true);
                      }}
                      className="w-14 h-14 rounded-lg border-2 border-gray-300 cursor-pointer overflow-hidden"
                      style={{ padding: '2px' }}
                      title="Seleccionar color primario"
                    />
                  </div>
                  
                  {/* Input de Texto */}
                  <input
                    type="text"
                    value={config.colorPrimario}
                    onChange={(e) => {
                      setConfig(prev => ({ ...prev, colorPrimario: e.target.value }));
                      setCambiosPendientes(true);
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    placeholder="#003DA5"
                    maxLength={7}
                  />

                  {/* Preview pequeño */}
                  <div 
                    className="w-14 h-14 rounded-lg border-2 border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: config.colorPrimario }}
                    title={config.colorPrimario}
                  />
                </div>
              </div>

              {/* Color Secundario */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color Secundario
                </label>
                <div className="flex items-center gap-3">
                  {/* Color Picker - Tamaño fijo controlado */}
                  <div className="flex-shrink-0">
                    <input
                      type="color"
                      value={config.colorSecundario}
                      onChange={(e) => {
                        setConfig(prev => ({ ...prev, colorSecundario: e.target.value }));
                        setCambiosPendientes(true);
                      }}
                      className="w-14 h-14 rounded-lg border-2 border-gray-300 cursor-pointer overflow-hidden"
                      style={{ padding: '2px' }}
                      title="Seleccionar color secundario"
                    />
                  </div>
                  
                  {/* Input de Texto */}
                  <input
                    type="text"
                    value={config.colorSecundario}
                    onChange={(e) => {
                      setConfig(prev => ({ ...prev, colorSecundario: e.target.value }));
                      setCambiosPendientes(true);
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    placeholder="#F57C00"
                    maxLength={7}
                  />

                  {/* Preview pequeño */}
                  <div 
                    className="w-14 h-14 rounded-lg border-2 border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: config.colorSecundario }}
                    title={config.colorSecundario}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Derecho: Vista Previa REDISEÑADA */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 xl:sticky xl:top-6 space-y-4">
            {/* Header con botón de vista completa */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" style={{ color: '#003DA5' }} />
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Vista Previa
                </h3>
              </div>
              <button
                onClick={() => setVistaPreviewModal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                Ver Completo
              </button>
            </div>

            {/* Mini preview - Simplificada */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
              {/* Encabezado simulado */}
              <div 
                className="mb-3 pb-3 border-b-2"
                style={{ borderColor: config.colorPrimario }}
              >
                {config.logo ? (
                  <div className="flex justify-center mb-2">
                    <img 
                      src={config.logo} 
                      alt="Logo" 
                      className="h-12 object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-12 bg-white rounded flex items-center justify-center mb-2">
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="text-center">
                  <p 
                    className="text-xs font-bold line-clamp-1"
                    style={{ color: config.colorPrimario }}
                  >
                    {config.nombreEntidad}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{config.direccion}</p>
                </div>
              </div>

              {/* Contenido simulado */}
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between text-gray-700">
                  <span className="font-semibold">Oficio:</span>
                  <span>ESAP-GL-001-2025</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="font-semibold">Fecha:</span>
                  <span>{new Date().toLocaleDateString('es-CO')}</span>
                </div>
                
                <div className="pt-2 space-y-1">
                  <p className="font-semibold text-gray-900">Para: [Destinatario]</p>
                  <p className="font-semibold text-gray-900">Asunto: [Asunto]</p>
                  <p className="text-gray-600 mt-2 leading-relaxed">
                    Contenido del oficio con la información corporativa personalizada...
                  </p>
                </div>
              </div>

              {/* Footer simulado */}
              <div className="mt-3 pt-2 border-t text-[9px] text-center text-gray-500">
                {config.telefono} • {config.email}
              </div>
            </div>

            {/* Información de colores */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg border border-gray-200">
                <p className="text-[10px] text-gray-600 mb-1">Color Primario</p>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: config.colorPrimario }}
                  />
                  <span className="text-xs font-mono">{config.colorPrimario}</span>
                </div>
              </div>
              <div className="p-2 rounded-lg border border-gray-200">
                <p className="text-[10px] text-gray-600 mb-1">Color Secundario</p>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: config.colorSecundario }}
                  />
                  <span className="text-xs font-mono">{config.colorSecundario}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Vista Previa Completa */}
      {vistaPreviewModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setVistaPreviewModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5" style={{ color: '#003DA5' }} />
                <h3 className="text-lg font-bold text-gray-900">
                  Vista Previa Completa del Oficio
                </h3>
              </div>
              <button
                onClick={() => setVistaPreviewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido del Modal - Oficio Realista */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div 
                className="bg-white border-2 border-gray-300 rounded-lg mx-auto shadow-lg"
                style={{ maxWidth: '21cm', aspectRatio: '8.5 / 11' }}
              >
                <div className="p-8 sm:p-12 h-full flex flex-col">
                  {/* Encabezado del Oficio */}
                  <div 
                    className="pb-6 mb-6 border-b-4"
                    style={{ borderColor: config.colorPrimario }}
                  >
                    {config.logo ? (
                      <div className="flex justify-center mb-4">
                        <img 
                          src={config.logo} 
                          alt="Logo" 
                          className="h-20 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-20 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="text-center space-y-1">
                      <h1 
                        className="text-lg font-bold"
                        style={{ color: config.colorPrimario }}
                      >
                        {config.nombreEntidad}
                      </h1>
                      <p className="text-sm text-gray-600">{config.direccion}</p>
                      <p className="text-sm text-gray-600">{config.telefono} • {config.email}</p>
                    </div>
                  </div>

                  {/* Información del Oficio */}
                  <div className="space-y-4 text-sm mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-bold text-gray-900">Oficio No.:</span>
                        <p className="text-gray-700">ESAP-GL-001-2025</p>
                      </div>
                      <div>
                        <span className="font-bold text-gray-900">Fecha:</span>
                        <p className="text-gray-700">{new Date().toLocaleDateString('es-CO', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</p>
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-gray-900">Para:</span>
                      <p className="text-gray-700 mt-1">[Nombre del Destinatario]</p>
                      <p className="text-gray-600 text-xs">[Cargo del Destinatario]</p>
                    </div>

                    <div>
                      <span className="font-bold text-gray-900">Asunto:</span>
                      <p className="text-gray-700 mt-1">[Asunto principal del oficio]</p>
                    </div>
                  </div>

                  {/* Cuerpo del Oficio */}
                  <div className="flex-1 space-y-4 text-sm text-gray-700">
                    <p className="text-justify">
                      Mediante el presente oficio, nos dirigimos a usted con el propósito de 
                      comunicar [información relevante]. En cumplimiento de las normativas 
                      vigentes y en ejercicio de nuestras funciones institucionales, procedemos 
                      a informar lo siguiente:
                    </p>

                    <p className="text-justify">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
                      tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
                      quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                    </p>

                    <p className="text-justify">
                      Agradecemos su atención y quedamos atentos a cualquier requerimiento adicional.
                    </p>

                    <div className="mt-8">
                      <p className="text-sm">Cordialmente,</p>
                      <div className="mt-12 pt-4 border-t border-gray-400 inline-block min-w-[200px]">
                        <p className="font-bold text-sm">[Nombre del Firmante]</p>
                        <p className="text-xs text-gray-600">[Cargo]</p>
                      </div>
                    </div>
                  </div>

                  {/* Pie de Página */}
                  <div 
                    className="mt-6 pt-4 border-t-2 text-xs text-center text-gray-600"
                    style={{ borderColor: config.colorSecundario }}
                  >
                    <p className="font-semibold" style={{ color: config.colorPrimario }}>
                      {config.nombreEntidad}
                    </p>
                    <p>{config.direccion} • {config.telefono} • {config.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setVistaPreviewModal(false)}
                className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            onClick={restablecerDefecto}
            className="px-4 py-2.5 rounded-lg font-semibold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restablecer por Defecto
          </button>

          <button
            onClick={guardarConfiguracion}
            disabled={!cambiosPendientes}
            className="px-6 py-3 rounded-lg font-semibold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            style={{ 
              background: cambiosPendientes 
                ? 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' 
                : '#94A3B8',
              minHeight: '48px'
            }}
          >
            <Save className="w-4 h-4" />
            Guardar Configuración
          </button>
        </div>

        {/* Info de ayuda */}
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900 mb-1">
                Información importante
              </p>
              <ul className="text-xs text-amber-800 space-y-1">
                <li>• El logo se utilizará en todas las plantillas de oficios generadas</li>
                <li>• Si subes una plantilla PDF personalizada, debe incluir marcadores para campos dinámicos</li>
                <li>• Los colores corporativos se aplicarán en la plantilla predeterminada</li>
                <li>• Los cambios solo se aplicarán a los oficios creados después de guardar la configuración</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}