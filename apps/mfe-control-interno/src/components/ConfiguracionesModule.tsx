/**
 * ============================================
 * MÓDULO: CONFIGURACIONES - CONTROL INTERNO
 * ============================================
 * 
 * Configuración global del módulo:
 * - Personalización de PDF
 * - Datos institucionales
 * - Colores corporativos
 * - Firmas predeterminadas
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Settings, FileText, Palette, Upload, Save, RotateCcw,
  CheckCircle, AlertCircle, Image as ImageIcon, User, 
  Building, Mail, Phone, Globe, MapPin, Eye
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { toast } from 'sonner';
import { Container4K } from '@esap-mfe/shared-ui';

// ============================================
// TIPOS
// ============================================

export interface ConfiguracionPDF {
  // Logo
  logoUrl: string;
  logoAncho: number;
  logoAlto: number;
  
  // Colores corporativos
  colorPrimario: string;
  colorSecundario: string;
  colorAcento: string;
  
  // Datos institucionales
  nombreInstitucion: string;
  nit: string;
  direccion: string;
  telefono: string;
  email: string;
  sitioWeb: string;
  
  // Firmas predeterminadas
  jefeOCINombre: string;
  jefeOCICargo: string;
  jefeOCIEmail: string;
  
  // Configuración del documento
  incluirMarcaAgua: boolean;
  textoMarcaAgua: string;
  incluirIndice: boolean;
  incluirMarcoNormativo: boolean;
  
  // Footer
  textoFooterIzquierdo: string;
  textoFooterDerecho: string;
  mostrarFechaGeneracion: boolean;
  mostrarPaginacion: boolean;
}

// Configuración por defecto
const CONFIGURACION_DEFAULT: ConfiguracionPDF = {
  logoUrl: '',
  logoAncho: 60,
  logoAlto: 30,
  
  colorPrimario: '#003DA5',
  colorSecundario: '#2962FF',
  colorAcento: '#F57C00',
  
  nombreInstitucion: 'Escuela Superior de Administración Pública - ESAP',
  nit: '899.999.061-6',
  direccion: 'Calle 44 No. 53-37, Bogotá D.C.',
  telefono: '+57 (1) 220 2790',
  email: 'oci@esap.edu.co',
  sitioWeb: 'www.esap.edu.co',
  
  jefeOCINombre: 'Fernando Ávila García',
  jefeOCICargo: 'Jefe de la Oficina de Control Interno',
  jefeOCIEmail: 'fernando.avila@esap.edu.co',
  
  incluirMarcaAgua: false,
  textoMarcaAgua: 'BORRADOR',
  incluirIndice: false,
  incluirMarcoNormativo: true,
  
  textoFooterIzquierdo: 'Oficina de Control Interno - ESAP',
  textoFooterDerecho: 'Documento Oficial',
  mostrarFechaGeneracion: true,
  mostrarPaginacion: true
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ConfiguracionesModule() {
  const [config, setConfig] = useState<ConfiguracionPDF>(CONFIGURACION_DEFAULT);
  const [seccionActiva, setSeccionActiva] = useState<'general' | 'pdf' | 'firmas'>('pdf');
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = () => {
    setGuardando(true);

    // Simular guardado
    setTimeout(() => {
      // Guardar en localStorage
      localStorage.setItem('esap_config_pdf', JSON.stringify(config));

      toast.success('✅ Configuración guardada', {
        description: 'Los cambios se aplicarán en los próximos documentos generados',
        duration: 5000
      });

      setGuardando(false);
    }, 1000);
  };

  const handleRestablecer = () => {
    setConfig(CONFIGURACION_DEFAULT);
    toast.info('🔄 Configuración restablecida', {
      description: 'Se han restaurado los valores predeterminados'
    });
  };

  const handleSubirLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('❌ Archivo inválido', {
        description: 'Solo se permiten imágenes (PNG, JPG, SVG)'
      });
      return;
    }

    // Validar tamaño (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('❌ Archivo muy grande', {
        description: 'El logo debe pesar menos de 2MB'
      });
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setConfig({ ...config, logoUrl: base64 });
      
      toast.success('✅ Logo cargado', {
        description: 'El logo se aplicará en los PDFs generados'
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePrevisualizarPDF = () => {
    toast.info('🔍 Previsualización', {
      description: 'Generando PDF de ejemplo con la configuración actual...'
    });
    
    // TODO: Implementar previsualización
  };

  return (
    <Container4K>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl bg-blue-50">
              <Settings className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">
                Configuraciones
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Personaliza la generación de documentos PDF y datos institucionales
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRestablecer}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restablecer
            </Button>
            
            <Button
              onClick={handleGuardar}
              className="gap-2"
              style={{ background: '#003DA5' }}
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setSeccionActiva('general')}
            className={`px-6 py-3 font-semibold transition-all ${
              seccionActiva === 'general'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building className="w-4 h-4 inline mr-2" />
            Datos Institucionales
          </button>
          
          <button
            onClick={() => setSeccionActiva('pdf')}
            className={`px-6 py-3 font-semibold transition-all ${
              seccionActiva === 'pdf'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Personalización de PDF
          </button>
          
          <button
            onClick={() => setSeccionActiva('firmas')}
            className={`px-6 py-3 font-semibold transition-all ${
              seccionActiva === 'firmas'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Firmas Predeterminadas
          </button>
        </div>

        {/* CONTENIDO */}
        <motion.div
          key={seccionActiva}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {seccionActiva === 'general' && (
            <SeccionDatosInstitucionales config={config} setConfig={setConfig} />
          )}
          
          {seccionActiva === 'pdf' && (
            <SeccionPersonalizacionPDF 
              config={config} 
              setConfig={setConfig}
              onSubirLogo={handleSubirLogo}
              onPrevisualizar={handlePrevisualizarPDF}
            />
          )}
          
          {seccionActiva === 'firmas' && (
            <SeccionFirmas config={config} setConfig={setConfig} />
          )}
        </motion.div>
      </div>
    </Container4K>
  );
}

// ============================================
// SECCIÓN: DATOS INSTITUCIONALES
// ============================================

interface SeccionProps {
  config: ConfiguracionPDF;
  setConfig: (config: ConfiguracionPDF) => void;
}

function SeccionDatosInstitucionales({ config, setConfig }: SeccionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <Building className="w-5 h-5 text-blue-600" />
          Información Institucional
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre de la Institución
            </label>
            <Input
              value={config.nombreInstitucion}
              onChange={(e) => setConfig({ ...config, nombreInstitucion: e.target.value })}
              placeholder="Escuela Superior de Administración Pública"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              NIT
            </label>
            <Input
              value={config.nit}
              onChange={(e) => setConfig({ ...config, nit: e.target.value })}
              placeholder="899.999.061-6"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Dirección
            </label>
            <Input
              value={config.direccion}
              onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
              placeholder="Calle 44 No. 53-37, Bogotá D.C."
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-blue-600" />
          Datos de Contacto
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Teléfono
            </label>
            <Input
              value={config.telefono}
              onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
              placeholder="+57 (1) 220 2790"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Institucional
            </label>
            <Input
              type="email"
              value={config.email}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              placeholder="oci@esap.edu.co"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Globe className="w-4 h-4 inline mr-1" />
              Sitio Web
            </label>
            <Input
              value={config.sitioWeb}
              onChange={(e) => setConfig({ ...config, sitioWeb: e.target.value })}
              placeholder="www.esap.edu.co"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================
// SECCIÓN: PERSONALIZACIÓN PDF
// ============================================

interface SeccionPDFProps extends SeccionProps {
  onSubirLogo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPrevisualizar: () => void;
}

function SeccionPersonalizacionPDF({ config, setConfig, onSubirLogo, onPrevisualizar }: SeccionPDFProps) {
  return (
    <div className="space-y-6">
      {/* LOGO */}
      <Card className="p-6">
        <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-blue-600" />
          Logo Institucional
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Sube el logo oficial de ESAP que aparecerá en el header del PDF.
              Formatos aceptados: PNG, JPG, SVG (máx. 2MB)
            </p>

            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">
                  Clic para seleccionar logo
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG o SVG - Máx. 2MB
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={onSubirLogo}
                className="hidden"
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ancho (px)
                </label>
                <Input
                  type="number"
                  value={config.logoAncho}
                  onChange={(e) => setConfig({ ...config, logoAncho: parseInt(e.target.value) })}
                  min={20}
                  max={200}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Alto (px)
                </label>
                <Input
                  type="number"
                  value={config.logoAlto}
                  onChange={(e) => setConfig({ ...config, logoAlto: parseInt(e.target.value) })}
                  min={10}
                  max={100}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Vista Previa
            </p>
            
            <div className="border-2 border-gray-200 rounded-lg p-8 bg-gradient-to-r from-blue-600 to-blue-800 min-h-[200px] flex items-center justify-center">
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt="Logo ESAP"
                  style={{
                    width: `${config.logoAncho}px`,
                    height: `${config.logoAlto}px`,
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <div className="text-center">
                  <ImageIcon className="w-12 h-12 text-white/50 mx-auto mb-2" />
                  <p className="text-white/70 text-sm">
                    No hay logo cargado
                  </p>
                </div>
              )}
            </div>

            {config.logoUrl && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => setConfig({ ...config, logoUrl: '' })}
              >
                Eliminar Logo
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* COLORES CORPORATIVOS */}
      <Card className="p-6">
        <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-blue-600" />
          Colores Corporativos
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Color Primario (Header)
            </label>
            <div className="flex gap-3">
              <Input
                type="color"
                value={config.colorPrimario}
                onChange={(e) => setConfig({ ...config, colorPrimario: e.target.value })}
                className="w-20 h-12 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={config.colorPrimario}
                onChange={(e) => setConfig({ ...config, colorPrimario: e.target.value })}
                placeholder="#003DA5"
                className="flex-1"
              />
            </div>
            <div 
              className="mt-2 h-12 rounded-lg border-2"
              style={{ backgroundColor: config.colorPrimario }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Color Secundario (Acentos)
            </label>
            <div className="flex gap-3">
              <Input
                type="color"
                value={config.colorSecundario}
                onChange={(e) => setConfig({ ...config, colorSecundario: e.target.value })}
                className="w-20 h-12 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={config.colorSecundario}
                onChange={(e) => setConfig({ ...config, colorSecundario: e.target.value })}
                placeholder="#2962FF"
                className="flex-1"
              />
            </div>
            <div 
              className="mt-2 h-12 rounded-lg border-2"
              style={{ backgroundColor: config.colorSecundario }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Color Acento (Énfasis)
            </label>
            <div className="flex gap-3">
              <Input
                type="color"
                value={config.colorAcento}
                onChange={(e) => setConfig({ ...config, colorAcento: e.target.value })}
                className="w-20 h-12 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={config.colorAcento}
                onChange={(e) => setConfig({ ...config, colorAcento: e.target.value })}
                placeholder="#F57C00"
                className="flex-1"
              />
            </div>
            <div 
              className="mt-2 h-12 rounded-lg border-2"
              style={{ backgroundColor: config.colorAcento }}
            />
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>Nota:</strong> Los colores se aplicarán en el header del PDF, 
              badges de cumplimiento, y tablas de roles. Se recomienda usar colores 
              con buen contraste para legibilidad.
            </div>
          </div>
        </div>
      </Card>

      {/* OPCIONES DEL DOCUMENTO */}
      <Card className="p-6">
        <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Opciones del Documento
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.incluirIndice}
                onChange={(e) => setConfig({ ...config, incluirIndice: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <span className="font-semibold text-gray-900">Incluir Índice</span>
                <p className="text-xs text-gray-600">Tabla de contenido al inicio</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.incluirMarcoNormativo}
                onChange={(e) => setConfig({ ...config, incluirMarcoNormativo: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <span className="font-semibold text-gray-900">Incluir Marco Normativo</span>
                <p className="text-xs text-gray-600">Leyes y decretos aplicables</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.incluirMarcaAgua}
                onChange={(e) => setConfig({ ...config, incluirMarcaAgua: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <span className="font-semibold text-gray-900">Incluir Marca de Agua</span>
                <p className="text-xs text-gray-600">Para documentos en borrador</p>
              </div>
            </label>

            {config.incluirMarcaAgua && (
              <div className="ml-8">
                <Input
                  value={config.textoMarcaAgua}
                  onChange={(e) => setConfig({ ...config, textoMarcaAgua: e.target.value })}
                  placeholder="BORRADOR"
                  className="mt-2"
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.mostrarFechaGeneracion}
                onChange={(e) => setConfig({ ...config, mostrarFechaGeneracion: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <span className="font-semibold text-gray-900">Mostrar Fecha de Generación</span>
                <p className="text-xs text-gray-600">En el footer del documento</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.mostrarPaginacion}
                onChange={(e) => setConfig({ ...config, mostrarPaginacion: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <span className="font-semibold text-gray-900">Mostrar Paginación</span>
                <p className="text-xs text-gray-600">"Página X de Y" en footer</p>
              </div>
            </label>
          </div>
        </div>
      </Card>

      {/* FOOTER PERSONALIZADO */}
      <Card className="p-6">
        <h3 className="font-bold text-lg text-gray-900 mb-4">
          Textos del Footer
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Texto Izquierdo
            </label>
            <Input
              value={config.textoFooterIzquierdo}
              onChange={(e) => setConfig({ ...config, textoFooterIzquierdo: e.target.value })}
              placeholder="Oficina de Control Interno - ESAP"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Texto Derecho
            </label>
            <Input
              value={config.textoFooterDerecho}
              onChange={(e) => setConfig({ ...config, textoFooterDerecho: e.target.value })}
              placeholder="Documento Oficial"
            />
          </div>
        </div>
      </Card>

      {/* PREVISUALIZACIÓN */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-gray-900 mb-1">
              Previsualizar Configuración
            </h3>
            <p className="text-sm text-gray-600">
              Genera un PDF de ejemplo para ver cómo quedará el diseño
            </p>
          </div>
          
          <Button
            onClick={onPrevisualizar}
            variant="outline"
            className="gap-2 bg-white"
          >
            <Eye className="w-4 h-4" />
            Previsualizar PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ============================================
// SECCIÓN: FIRMAS PREDETERMINADAS
// ============================================

function SeccionFirmas({ config, setConfig }: SeccionProps) {
  return (
    <Card className="p-6">
      <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-blue-600" />
        Jefe de OCI Predeterminado
      </h3>

      <p className="text-sm text-gray-600 mb-6">
        Esta información se usará como firma predeterminada en los documentos PDF.
        Puedes cambiarla en cada plan individual si es necesario.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nombre Completo
          </label>
          <Input
            value={config.jefeOCINombre}
            onChange={(e) => setConfig({ ...config, jefeOCINombre: e.target.value })}
            placeholder="Fernando Ávila García"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Cargo
          </label>
          <Input
            value={config.jefeOCICargo}
            onChange={(e) => setConfig({ ...config, jefeOCICargo: e.target.value })}
            placeholder="Jefe de la Oficina de Control Interno"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Email Institucional
          </label>
          <Input
            type="email"
            value={config.jefeOCIEmail}
            onChange={(e) => setConfig({ ...config, jefeOCIEmail: e.target.value })}
            placeholder="fernando.avila@esap.edu.co"
          />
        </div>
      </div>

      {/* Vista Previa de Firma */}
      <div className="mt-6 bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
        <p className="text-xs font-semibold text-gray-600 mb-4">
          VISTA PREVIA DE FIRMA EN PDF:
        </p>
        
        <div className="max-w-md">
          <div className="border-t-2 border-gray-400 pt-3">
            <p className="font-bold text-gray-900">
              {config.jefeOCINombre || '___________________________'}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              {config.jefeOCICargo || 'Cargo'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {config.jefeOCIEmail || 'email@esap.edu.co'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
