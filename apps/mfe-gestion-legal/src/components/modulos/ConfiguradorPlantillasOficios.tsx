/**
 * ConfiguradorPlantillasOficios - Editor de plantillas de oficios judiciales
 * ✅ Diseño corporativo ESAP 2025
 * ✅ Editor WYSIWYG de membrete y formato
 * ✅ Vista previa en tiempo real
 * ✅ Guardado en localStorage
 */

import { useState, useEffect } from 'react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { 
  FileText, Save, RotateCcw, Eye, Settings, Image as ImageIcon,
  Type, AlignLeft, Mail, CheckCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ConfiguracionPlantilla {
  nombreEntidad: string;
  subtituloEntidad: string;
  dependencia: string;
  direccion: string;
  telefono: string;
  email: string;
  website: string;
  colorPrimario: string;
  colorSecundario: string;
  tamañoFuente: string;
  estiloFuente: string;
  margenSuperior: string;
  margenInferior: string;
  margenLateral: string;
  includirLogo: boolean;
  includirBordeSuperior: boolean;
  textoPiePagina: string;
}

const CONFIGURACION_DEFAULT: ConfiguracionPlantilla = {
  nombreEntidad: 'ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA',
  subtituloEntidad: 'ESAP - República de Colombia',
  dependencia: 'Oficina Jurídica',
  direccion: 'Calle 44 No. 53-37, Bogotá D.C., Colombia',
  telefono: '(601) 220-2790',
  email: 'juridica@esap.edu.co',
  website: 'www.esap.edu.co',
  colorPrimario: '#003DA5',
  colorSecundario: '#F57C00',
  tamañoFuente: '14px',
  estiloFuente: 'Arial, sans-serif',
  margenSuperior: '2cm',
  margenInferior: '2cm',
  margenLateral: '2.5cm',
  includirLogo: true,
  includirBordeSuperior: true,
  textoPiePagina: 'Documento oficial generado por el Sistema de Gestión Legal ESAP'
};

export function ConfiguradorPlantillasOficios() {
  const [config, setConfig] = useState<ConfiguracionPlantilla>(CONFIGURACION_DEFAULT);
  const [modoVista, setModoVista] = useState<'editar' | 'preview'>('editar');
  const [guardando, setGuardando] = useState(false);

  // Cargar configuración guardada al montar
  useEffect(() => {
    const configGuardada = localStorage.getItem('esap_plantilla_oficios');
    if (configGuardada) {
      try {
        const configParsed = JSON.parse(configGuardada);
        setConfig({ ...CONFIGURACION_DEFAULT, ...configParsed });
        toast.success('⚙️ Configuración cargada', {
          description: 'Plantilla personalizada recuperada',
          duration: 2000
        });
      } catch (error) {
        console.error('Error al cargar configuración:', error);
      }
    }
  }, []);

  /**
   * Guardar configuración
   */
  const handleGuardar = () => {
    setGuardando(true);
    toast.loading('💾 Guardando configuración...', { id: 'guardar-config' });

    setTimeout(() => {
      try {
        localStorage.setItem('esap_plantilla_oficios', JSON.stringify(config));
        
        toast.success('✅ Configuración guardada', {
          id: 'guardar-config',
          description: 'La plantilla ha sido actualizada correctamente',
          duration: 4000
        });

        console.log('📊 Configuración de plantilla guardada:', {
          timestamp: new Date().toISOString(),
          config
        });
      } catch (error) {
        toast.error('❌ Error al guardar', {
          id: 'guardar-config',
          description: 'No se pudo guardar la configuración'
        });
        console.error('Error:', error);
      } finally {
        setGuardando(false);
      }
    }, 1000);
  };

  /**
   * Restaurar valores por defecto
   */
  const handleRestaurar = () => {
    if (confirm('¿Estás seguro de restaurar la configuración por defecto? Se perderán los cambios actuales.')) {
      setConfig(CONFIGURACION_DEFAULT);
      localStorage.removeItem('esap_plantilla_oficios');
      toast.success('🔄 Configuración restaurada', {
        description: 'Se aplicaron los valores por defecto',
        duration: 3000
      });
    }
  };

  /**
   * Actualizar campo de configuración
   */
  const updateConfig = (campo: keyof ConfiguracionPlantilla, valor: any) => {
    setConfig(prev => ({ ...prev, [campo]: valor }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-blue-900 mb-2 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Configurador de Plantillas de Oficios
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Personaliza el membrete, formato y diseño de los oficios judiciales oficiales. 
              Los cambios se aplicarán automáticamente a todos los nuevos oficios que se redacten.
            </p>
          </div>
          <Badge variant="outline" className="bg-white font-bold border-blue-300 text-blue-700">
            <Settings className="w-3 h-3 mr-1" />
            Defensa Judicial
          </Badge>
        </div>
      </Card>

      {/* Tabs de vista */}
      <div className="flex items-center gap-2">
        <Button
          variant={modoVista === 'editar' ? 'default' : 'outline'}
          onClick={() => setModoVista('editar')}
          className="font-bold"
          style={modoVista === 'editar' ? { background: '#003DA5' } : {}}
        >
          <Settings className="w-4 h-4 mr-2" />
          Editar Configuración
        </Button>
        <Button
          variant={modoVista === 'preview' ? 'default' : 'outline'}
          onClick={() => setModoVista('preview')}
          className="font-bold"
          style={modoVista === 'preview' ? { background: '#003DA5' } : {}}
        >
          <Eye className="w-4 h-4 mr-2" />
          Vista Previa
        </Button>
      </div>

      {/* Contenido */}
      {modoVista === 'editar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna izquierda: Información de la entidad */}
          <Card className="p-6">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <Type className="w-5 h-5" />
              Información de la Entidad
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Nombre de la Entidad *
                </label>
                <Input
                  value={config.nombreEntidad}
                  onChange={(e) => updateConfig('nombreEntidad', e.target.value)}
                  placeholder="ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA"
                  className="font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Subtítulo de la Entidad
                </label>
                <Input
                  value={config.subtituloEntidad}
                  onChange={(e) => updateConfig('subtituloEntidad', e.target.value)}
                  placeholder="ESAP - República de Colombia"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Dependencia
                </label>
                <Input
                  value={config.dependencia}
                  onChange={(e) => updateConfig('dependencia', e.target.value)}
                  placeholder="Oficina Jurídica"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Dirección
                </label>
                <Input
                  value={config.direccion}
                  onChange={(e) => updateConfig('direccion', e.target.value)}
                  placeholder="Calle 44 No. 53-37, Bogotá D.C."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <Input
                    value={config.telefono}
                    onChange={(e) => updateConfig('telefono', e.target.value)}
                    placeholder="(601) 220-2790"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Email
                  </label>
                  <Input
                    value={config.email}
                    onChange={(e) => updateConfig('email', e.target.value)}
                    placeholder="juridica@esap.edu.co"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Sitio Web
                </label>
                <Input
                  value={config.website}
                  onChange={(e) => updateConfig('website', e.target.value)}
                  placeholder="www.esap.edu.co"
                />
              </div>
            </div>
          </Card>

          {/* Columna derecha: Diseño y formato */}
          <Card className="p-6">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <AlignLeft className="w-5 h-5" />
              Diseño y Formato
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Color Primario
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.colorPrimario}
                      onChange={(e) => updateConfig('colorPrimario', e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={config.colorPrimario}
                      onChange={(e) => updateConfig('colorPrimario', e.target.value)}
                      placeholder="#003DA5"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Color Secundario
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.colorSecundario}
                      onChange={(e) => updateConfig('colorSecundario', e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={config.colorSecundario}
                      onChange={(e) => updateConfig('colorSecundario', e.target.value)}
                      placeholder="#F57C00"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Tamaño de Fuente
                </label>
                <select
                  value={config.tamañoFuente}
                  onChange={(e) => updateConfig('tamañoFuente', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                >
                  <option value="12px">12px - Pequeño</option>
                  <option value="14px">14px - Mediano</option>
                  <option value="16px">16px - Grande</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Estilo de Fuente
                </label>
                <select
                  value={config.estiloFuente}
                  onChange={(e) => updateConfig('estiloFuente', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                >
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="Calibri, sans-serif">Calibri</option>
                  <option value="Georgia, serif">Georgia</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Margen Superior
                  </label>
                  <Input
                    value={config.margenSuperior}
                    onChange={(e) => updateConfig('margenSuperior', e.target.value)}
                    placeholder="2cm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Margen Inferior
                  </label>
                  <Input
                    value={config.margenInferior}
                    onChange={(e) => updateConfig('margenInferior', e.target.value)}
                    placeholder="2cm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Margen Lateral
                  </label>
                  <Input
                    value={config.margenLateral}
                    onChange={(e) => updateConfig('margenLateral', e.target.value)}
                    placeholder="2.5cm"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includirLogo}
                    onChange={(e) => updateConfig('includirLogo', e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm font-bold text-gray-700">
                    Incluir logo de la entidad
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includirBordeSuperior}
                    onChange={(e) => updateConfig('includirBordeSuperior', e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm font-bold text-gray-700">
                    Incluir borde superior decorativo
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Texto del Pie de Página
                </label>
                <textarea
                  value={config.textoPiePagina}
                  onChange={(e) => updateConfig('textoPiePagina', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 text-sm border rounded-lg resize-none"
                  placeholder="Texto que aparecerá en el pie de página..."
                />
              </div>
            </div>
          </Card>
        </div>
      ) : (
        /* Vista Previa */
        <Card className="max-w-4xl mx-auto">
          {/* Encabezado con configuración aplicada */}
          <div 
            className="p-8 border-b-4 bg-gradient-to-b from-white to-blue-50"
            style={{ 
              borderBottomColor: config.colorPrimario,
              fontFamily: config.estiloFuente,
              fontSize: config.tamañoFuente
            }}
          >
            <div className="text-center">
              {config.includirLogo && (
                <div className="mb-4">
                  <div 
                    className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white font-black text-2xl"
                    style={{ background: config.colorPrimario }}
                  >
                    ESAP
                  </div>
                </div>
              )}
              <h1 
                className="text-2xl font-black mb-1"
                style={{ color: config.colorPrimario }}
              >
                {config.nombreEntidad}
              </h1>
              <p className="text-sm text-gray-600 font-bold">{config.subtituloEntidad}</p>
              <p className="text-xs text-gray-500 mt-1">{config.dependencia}</p>
              {config.includirBordeSuperior && (
                <div className="mt-4 h-1 w-24 mx-auto rounded" style={{ background: config.colorSecundario }} />
              )}
            </div>
          </div>

          {/* Contenido de ejemplo */}
          <div className="p-8 space-y-6" style={{ fontFamily: config.estiloFuente, fontSize: config.tamañoFuente }}>
            <div className="grid grid-cols-2 gap-4 text-sm pb-4 border-b">
              <div>
                <p className="text-gray-600 font-bold">OFICIO No:</p>
                <p className="text-gray-900 font-black">OF-ESAP-2025-001</p>
              </div>
              <div>
                <p className="text-gray-600 font-bold">FECHA:</p>
                <p className="text-gray-900 font-black">
                  {new Date().toLocaleDateString('es-CO', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600 font-bold">PARA:</p>
                <p className="text-gray-900">Juzgado 1° Administrativo de Bogotá D.C.</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600 font-bold">ASUNTO:</p>
                <p className="text-gray-900">Solicitud de Prórroga para Contestación de Demanda</p>
              </div>
            </div>

            <div className="text-sm leading-relaxed text-justify">
              <p className="mb-4">Respetado(a) Doctor(a),</p>
              <p className="mb-4">
                De manera atenta me dirijo a su Despacho con el propósito de solicitar comedidamente 
                se nos conceda una prórroga de 10 días calendario adicionales para presentar la 
                contestación a la demanda en el proceso de referencia.
              </p>
              <p>
                Esta solicitud se fundamenta en las razones técnicas y jurídicas que se exponen 
                de manera detallada en el presente documento, garantizando así el debido proceso 
                y el derecho de defensa de la entidad.
              </p>
            </div>

            <div className="pt-8 mt-8 border-t">
              <p className="font-bold text-gray-900">Cordialmente,</p>
              <div className="mt-4">
                <p className="font-bold text-gray-900">OFICINA JURÍDICA</p>
                <p className="text-sm text-gray-600">{config.dependencia}</p>
                <p className="text-sm text-gray-600">{config.nombreEntidad}</p>
                <div className="mt-3 text-xs text-gray-500">
                  <p>📍 {config.direccion}</p>
                  <p>📞 {config.telefono} • ✉️ {config.email}</p>
                  <p>🌐 {config.website}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 border-t text-center text-xs text-gray-500">
            <p>{config.textoPiePagina}</p>
          </div>
        </Card>
      )}

      {/* Botones de acción */}
      <Card className="p-4 bg-gray-50">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleRestaurar}
            disabled={guardando}
            className="font-bold"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar por Defecto
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-bold">
              <CheckCircle className="w-3 h-3 mr-1" />
              Cambios se aplican automáticamente
            </Badge>
            <Button
              onClick={handleGuardar}
              disabled={guardando}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
              className="font-bold"
            >
              {guardando ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Información adicional */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-blue-900 mb-1">
              💡 Información importante
            </p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• La configuración se guarda localmente en tu navegador</li>
              <li>• Los cambios se aplican automáticamente a todos los nuevos oficios</li>
              <li>• Los oficios ya creados mantienen el formato con el que fueron generados</li>
              <li>• Puedes previsualizar los cambios antes de guardar</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
