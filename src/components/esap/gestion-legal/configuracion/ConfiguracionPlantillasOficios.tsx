/**
 * ConfiguracionPlantillasOficios - Configuración de Plantillas y Logos para Oficios
 * ✅ Permite subir plantillas PDF personalizadas
 * ✅ Cambiar logo corporativo
 * ✅ Configurar información de la entidad
 * ✅ Vista previa en tiempo real
 * ✅ Diseño corporativo ESAP 2025
 */

import { useState, useRef } from 'react';
import { 
  FileText, Upload, Image as ImageIcon, Save, RotateCcw, 
  Eye, Download, Trash2, AlertCircle, CheckCircle, Building2, MapPin, Phone, Mail 
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

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

  const [cambiosPendientes, setHayCambiosPendientes] = useState(false);
  const [vistaPreviaActiva, setVistaPreviaActiva] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const plantillaInputRef = useRef<HTMLInputElement>(null);

  // Manejar subida de logo
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('❌ Formato no válido', {
        description: 'Solo se permiten archivos de imagen (PNG, JPG, SVG)'
      });
      return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('❌ Archivo muy grande', {
        description: 'El tamaño máximo permitido es 2 MB'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setConfig(prev => ({ ...prev, logo: event.target?.result as string }));
      setHayCambiosPendientes(true);
      toast.success('✅ Logo cargado correctamente');
    };
    reader.readAsDataURL(file);
  };

  // Manejar subida de plantilla PDF
  const handlePlantillaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (file.type !== 'application/pdf') {
      toast.error('❌ Formato no válido', {
        description: 'Solo se permiten archivos PDF'
      });
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('❌ Archivo muy grande', {
        description: 'El tamaño máximo permitido es 5 MB'
      });
      return;
    }

    setConfig(prev => ({ 
      ...prev, 
      plantillaPDF: file,
      usarPlantillaPredeterminada: false 
    }));
    setHayCambiosPendientes(true);
    toast.success('✅ Plantilla PDF cargada', {
      description: file.name
    });
  };

  // Eliminar logo
  const eliminarLogo = () => {
    setConfig(prev => ({ ...prev, logo: null }));
    setHayCambiosPendientes(true);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
    toast.info('📎 Logo eliminado');
  };

  // Eliminar plantilla PDF
  const eliminarPlantilla = () => {
    setConfig(prev => ({ 
      ...prev, 
      plantillaPDF: null,
      usarPlantillaPredeterminada: true 
    }));
    setHayCambiosPendientes(true);
    if (plantillaInputRef.current) {
      plantillaInputRef.current.value = '';
    }
    toast.info('📎 Plantilla PDF eliminada, usando plantilla predeterminada');
  };

  // Guardar configuración
  const guardarConfiguracion = () => {
    toast.loading('⏳ Guardando configuración...', { id: 'guardar-config' });

    setTimeout(() => {
      // Aquí iría la lógica para guardar en el backend/localStorage
      localStorage.setItem('config-plantillas-oficios', JSON.stringify(config));
      
      setHayCambiosPendientes(false);
      toast.success('✅ Configuración guardada', {
        id: 'guardar-config',
        description: 'Los cambios se aplicarán en los próximos oficios generados'
      });
    }, 1000);
  };

  // Restablecer valores por defecto
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

    setHayCambiosPendientes(true);
    toast.success('✅ Valores restablecidos por defecto');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
              Configuración de Plantillas de Oficios
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Personaliza el logo, plantilla PDF y la información de la entidad para los oficios generados
            </p>
          </div>
          
          {cambiosPendientes && (
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              Cambios sin guardar
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel Izquierdo: Configuración */}
        <div className="space-y-6">
          
          {/* Logo Corporativo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4" style={{ color: '#003DA5' }} />
              Logo Corporativo
            </h3>

            {!config.logo ? (
              <div 
                onClick={() => logoInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm font-bold text-gray-700 mb-1">
                  Haz clic para subir el logo
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG o SVG • Máximo 2 MB
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                  <img 
                    src={config.logo} 
                    alt="Logo" 
                    className="max-h-32 object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="flex-1 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Cambiar Logo
                  </button>
                  <button
                    onClick={eliminarLogo}
                    className="px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4" style={{ color: '#003DA5' }} />
              Plantilla PDF Personalizada
            </h3>

            {/* Toggle: Plantilla predeterminada vs. personalizada */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.usarPlantillaPredeterminada}
                  onChange={(e) => {
                    setConfig(prev => ({ ...prev, usarPlantillaPredeterminada: e.target.checked }));
                    setHayCambiosPendientes(true);
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Usar plantilla predeterminada de ESAP
                </span>
              </label>
            </div>

            {!config.usarPlantillaPredeterminada && (
              <>
                {!config.plantillaPDF ? (
                  <div 
                    onClick={() => plantillaInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm font-bold text-gray-700 mb-1">
                      Haz clic para subir plantilla PDF
                    </p>
                    <p className="text-xs text-gray-500">
                      Formato PDF • Máximo 5 MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-red-100">
                          <FileText className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{config.plantillaPDF.name}</p>
                          <p className="text-xs text-gray-600">
                            {(config.plantillaPDF.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => plantillaInputRef.current?.click()}
                        className="flex-1 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        Cambiar Plantilla
                      </button>
                      <button
                        onClick={eliminarPlantilla}
                        className="px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
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
                      Solo se aplicará el logo personalizado si lo has configurado.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Información de la Entidad */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
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
                    setHayCambiosPendientes(true);
                  }}
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    setHayCambiosPendientes(true);
                  }}
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Dirección física"
                />
              </div>

              {/* Teléfono */}
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
                    setHayCambiosPendientes(true);
                  }}
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Número de teléfono"
                />
              </div>

              {/* Email */}
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
                    setHayCambiosPendientes(true);
                  }}
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="correo@entidad.gov.co"
                />
              </div>
            </div>
          </div>

          {/* Colores Corporativos */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4" style={{ color: '#003DA5' }} />
              Colores Corporativos
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Color Primario */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color Primario
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.colorPrimario}
                    onChange={(e) => {
                      setConfig(prev => ({ ...prev, colorPrimario: e.target.value }));
                      setHayCambiosPendientes(true);
                    }}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.colorPrimario}
                    onChange={(e) => {
                      setConfig(prev => ({ ...prev, colorPrimario: e.target.value }));
                      setHayCambiosPendientes(true);
                    }}
                    className="flex-1 px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Color Secundario */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color Secundario
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.colorSecundario}
                    onChange={(e) => {
                      setConfig(prev => ({ ...prev, colorSecundario: e.target.value }));
                      setHayCambiosPendientes(true);
                    }}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.colorSecundario}
                    onChange={(e) => {
                      setConfig(prev => ({ ...prev, colorSecundario: e.target.value }));
                      setHayCambiosPendientes(true);
                    }}
                    className="flex-1 px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Derecho: Vista Previa */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Eye className="w-4 h-4" style={{ color: '#003DA5' }} />
                Vista Previa del Oficio
              </h3>
            </div>

            {/* Vista previa simulada */}
            <div 
              className="border-2 border-gray-300 rounded-lg overflow-hidden"
              style={{ aspectRatio: '8.5 / 11' }}
            >
              <div className="p-6 bg-white h-full flex flex-col">
                {/* Header con logo */}
                <div 
                  className="pb-4 mb-4 border-b-2"
                  style={{ borderColor: config.colorPrimario }}
                >
                  {config.logo ? (
                    <img 
                      src={config.logo} 
                      alt="Logo" 
                      className="h-16 object-contain mb-2"
                    />
                  ) : (
                    <div className="h-16 bg-gray-200 flex items-center justify-center rounded mb-2">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="text-xs space-y-0.5">
                    <p className="font-bold" style={{ color: config.colorPrimario }}>
                      {config.nombreEntidad}
                    </p>
                    <p className="text-gray-600">{config.direccion}</p>
                    <p className="text-gray-600">{config.telefono} • {config.email}</p>
                  </div>
                </div>

                {/* Contenido del oficio (simulado) */}
                <div className="flex-1 space-y-3 text-xs text-gray-700">
                  <div className="flex justify-between">
                    <span className="font-bold">Oficio No.:</span>
                    <span>ESAP-GL-001-2025</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Fecha:</span>
                    <span>{new Date().toLocaleDateString('es-CO')}</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="font-bold">Para:</p>
                    <p className="text-gray-600">[Destinatario]</p>
                    <p className="font-bold mt-3">Asunto:</p>
                    <p className="text-gray-600">[Asunto del oficio]</p>
                    <p className="mt-4 text-justify">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                      Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua...
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-4 mt-4 border-t text-xs text-center text-gray-500">
                  <p>Este es un ejemplo de vista previa</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={restablecerDefecto}
            className="px-4 py-2 rounded-lg font-semibold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restablecer por Defecto
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setVistaPreviaActiva(true)}
              className="px-4 py-2 rounded-lg font-semibold text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Vista Previa Completa
            </button>

            <button
              onClick={guardarConfiguracion}
              disabled={!cambiosPendientes}
              className="px-6 py-2 rounded-lg font-semibold text-sm text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                background: cambiosPendientes 
                  ? 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' 
                  : '#94A3B8'
              }}
            >
              <Save className="w-4 h-4" />
              Guardar Configuración
            </button>
          </div>
        </div>

        {/* Info de ayuda */}
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900 mb-1">
                💡 Información importante
              </p>
              <ul className="text-xs text-amber-800 space-y-1">
                <li>• El logo se utilizará en todas las plantillas de oficios generadas</li>
                <li>• Si subes una plantilla PDF personalizada, debe incluir marcadores para {'{FECHA}'}, {'{DESTINATARIO}'}, {'{ASUNTO}'} y {'{CONTENIDO}'}</li>
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
