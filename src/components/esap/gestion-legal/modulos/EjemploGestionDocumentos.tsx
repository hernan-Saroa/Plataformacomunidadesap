/**
 * Ejemplo de uso del ModalGestionDocumentos
 * Componente de demostración para probar las funcionalidades
 */

import { useState } from 'react';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Upload, FileText, Paperclip } from 'lucide-react';
import { ModalGestionDocumentos } from './ModalGestionDocumentos';

export function EjemploGestionDocumentos() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="p-6 space-y-4">
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Ejemplo: Gestión de Documentos
        </h2>
        
        <p className="text-sm text-gray-600 mb-4">
          Haz clic en el botón para probar el modal completo de gestión de documentos
          con funcionalidades de selección y carga de archivos.
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => setModalOpen(true)}
            style={{ background: '#003DA5' }}
            className="text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Abrir Gestión de Documentos
          </Button>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Funcionalidades Implementadas:
            </h3>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li><strong>Seleccionar Archivo:</strong> Botón funcional para seleccionar archivos del sistema</li>
              <li><strong>Múltiples archivos:</strong> Soporte para selección múltiple</li>
              <li><strong>Validación:</strong> Tamaño máximo 10 MB y tipos permitidos</li>
              <li><strong>Categorización:</strong> Asignar categoría antes de cargar</li>
              <li><strong>Preview:</strong> Vista previa de archivos seleccionados</li>
              <li><strong>Barra de progreso:</strong> Feedback visual durante la carga</li>
              <li><strong>Gestión completa:</strong> Ver, descargar, eliminar documentos</li>
              <li><strong>Búsqueda y filtros:</strong> Encontrar documentos rápidamente</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-bold text-green-900 mb-1">✅ Tipos Permitidos:</p>
              <p className="text-xs text-green-700">
                PDF, Word (.doc, .docx), Excel (.xls, .xlsx), Imágenes (JPG, PNG)
              </p>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs font-bold text-yellow-900 mb-1">⚠️ Restricciones:</p>
              <p className="text-xs text-yellow-700">
                Tamaño máximo: 10 MB por archivo
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal */}
      <ModalGestionDocumentos
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        requerimientoId="REQ-CGR-2024-001"
        tituloContexto="Documentos Adjuntos"
      />
    </div>
  );
}
