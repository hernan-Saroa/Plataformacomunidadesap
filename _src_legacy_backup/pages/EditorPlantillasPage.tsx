import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { disciplinaryService } from '../services/api/disciplinary.service';
import { toast } from 'sonner';

export function EditorPlantillasPage() {
  const navigate = useNavigate();
  const [plantillaConfig, setPlantillaConfig] = useState<any>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Cargar configuración de plantilla
  useEffect(() => {
    const cargarPlantilla = async () => {
      try {
        const config = await disciplinaryService.getConfiguracionPlantillaAuto();
        setPlantillaConfig(config);
        setEditedContent(config.htmlContent || '');
      } catch (error) {
        console.error('Error al cargar configuración de plantilla:', error);
        // Crear plantilla por defecto en BD
        const defaultConfig = {
          id: '',
          htmlContent: `<p>En el proceso disciplinario [RADICADO], iniciado el [FECHA_QUEJA], se ha determinado lo siguiente:</p>

<p><strong>HECHOS:</strong></p>
<p>[HECHOS]</p>

<p><strong>DENUNCIANTE:</strong> [DENUNCIANTE_NOMBRE] - [DENUNCIANTE_DOCUMENTO]</p>
<p><strong>DISCIPLINABLE:</strong> [DISCIPLINABLE_NOMBRE] - [DISCIPLINABLE_DOCUMENTO] - [DISCIPLINABLE_CARGO]</p>

<p>Por lo anterior, se resuelve:</p>

<p>PRIMERO: Iniciar proceso disciplinario contra [DISCIPLINABLE_NOMBRE] por los hechos descritos.</p>

<p>SEGUNDO: Notificar al investigado de los cargos formulados.</p>

<p>TERCERO: Designar abogado instructor para el proceso.</p>

<p>Dado en Bogotá D.C., a los [FECHA_ACTUAL].</p>`,
          estado: 'activo',
          nombre: 'Plantilla General de Autos',
          descripcion: 'Plantilla por defecto para la generación de autos disciplinarios'
        };

        try {
          // Intentar guardar la plantilla por defecto en BD
          await disciplinaryService.updateConfiguracionPlantillaAuto(defaultConfig);
          setPlantillaConfig(defaultConfig);
          setEditedContent(defaultConfig.htmlContent);
          toast.success('Plantilla por defecto creada en la base de datos');
        } catch (saveError) {
          console.error('Error al guardar plantilla por defecto:', saveError);
          // Si no se puede guardar, usar valores locales
          setPlantillaConfig(defaultConfig);
          setEditedContent(defaultConfig.htmlContent);
        }
      }
    };

    cargarPlantilla();
  }, []);

  const handleGuardarPlantilla = async () => {
    if (!plantillaConfig) return;

    try {
      setIsSaving(true);
      const updatedConfig = {
        ...plantillaConfig,
        autoContentHtml: editedContent
      };
      await disciplinaryService.updateConfiguracionPlantillaAuto(updatedConfig);
      setPlantillaConfig(updatedConfig);
      toast.success('Plantilla guardada exitosamente');
    } catch (error) {
      console.error('Error al guardar plantilla:', error);
      toast.error('Error al guardar la plantilla');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVolver = () => {
    window.history.back();
  };

  // Función para reemplazar variables con datos de ejemplo
  const reemplazarVariablesPreview = (html: string): string => {
    const reemplazos: Record<string, string> = {
      '[RADICADO]': '2024-001-ABC',
      '[FECHA_QUEJA]': '15/01/2024',
      '[HECHOS]': 'El día 10 de enero de 2024, el servidor público identificado con cédula 12345678 realizó conductas contrarias al régimen disciplinario consistentes en faltas de respeto hacia sus superiores jerárquicos.',
      '[DENUNCIANTE_NOMBRE]': 'Juan Pérez López',
      '[DENUNCIANTE_DOCUMENTO]': '12345678',
      '[DISCIPLINABLE_NOMBRE]': 'María González Rodríguez',
      '[DISCIPLINABLE_DOCUMENTO]': '87654321',
      '[DISCIPLINABLE_CARGO]': 'Profesional Universitario',
      '[FECHA_ACTUAL]': new Date().toLocaleDateString('es-CO'),
      '[NUMERO_AUTO]': '001-2024',
      '[TIPO_AUTO]': 'Auto de Inicio'
    };

    let resultado = html;
    Object.entries(reemplazos).forEach(([variable, valor]) => {
      const regex = new RegExp(variable.replace(/[[\]]/g, '\\$&'), 'g');
      resultado = resultado.replace(regex, valor);
    });
    return resultado;
  };

  if (!plantillaConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003DA5] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración de plantilla...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVolver}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Editor de Plantillas de Autos
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? 'Ocultar Preview' : 'Mostrar Preview'}
              </Button>
              <Button
                onClick={handleGuardarPlantilla}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Variables disponibles */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Variables Disponibles
              </h2>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">[RADICADO]</span>
                  <span className="text-gray-500 ml-2">- Número del proceso</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">[FECHA_QUEJA]</span>
                  <span className="text-gray-500 ml-2">- Fecha de la queja</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">[HECHOS]</span>
                  <span className="text-gray-500 ml-2">- Descripción de los hechos</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">[DENUNCIANTE_NOMBRE]</span>
                  <span className="text-gray-500 ml-2">- Nombre del denunciante</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">[DENUNCIANTE_DOCUMENTO]</span>
                  <span className="text-gray-500 ml-2">- Documento del denunciante</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">[DISCIPLINABLE_NOMBRE]</span>
                  <span className="text-gray-500 ml-2">- Nombre del disciplinable</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">[DISCIPLINABLE_DOCUMENTO]</span>
                  <span className="text-gray-500 ml-2">- Documento del disciplinable</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">[DISCIPLINABLE_CARGO]</span>
                  <span className="text-gray-500 ml-2">- Cargo del disciplinable</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">[FECHA_ACTUAL]</span>
                  <span className="text-gray-500 ml-2">- Fecha actual</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">[NUMERO_AUTO]</span>
                  <span className="text-gray-500 ml-2">- Número del auto</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">[TIPO_AUTO]</span>
                  <span className="text-gray-500 ml-2">- Tipo del auto</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Las variables se reemplazan automáticamente con los datos del auto específico cuando se genera el documento.
                </p>
              </div>
            </div>
          </div>

          {/* Editor y Preview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Editor */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Editor HTML
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Edite el contenido HTML de la plantilla usando las variables disponibles
                </p>
              </div>
              <div className="p-6">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-96 font-mono text-sm border border-gray-300 rounded-md p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ingrese el contenido HTML de la plantilla..."
                />
              </div>
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Vista Previa con Variables
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Cómo se verá el contenido con variables reemplazadas (datos de ejemplo)
                  </p>
                </div>
                <div className="p-6">
                  <div
                    className="border border-gray-200 rounded-md p-4 bg-gray-50 min-h-48 prose prose-sm max-w-none"
                    style={{
                      fontFamily: 'Times New Roman, serif',
                      fontSize: '12pt',
                      lineHeight: '1.5'
                    }}
                    dangerouslySetInnerHTML={{
                      __html: reemplazarVariablesPreview(editedContent)
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}