/**
 * ModalVistaPreviaRespuesta - Modal para mostrar vista previa del oficio de respuesta
 * DISEÑO LIMPIO ESAP 2025
 */

import { X, Download, Printer, FileText, Calendar, User, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface DatosRespuesta {
  tipoRespuesta: 'completa' | 'parcial';
  destinatario: string;
  cargo: string;
  plantillaOficial: boolean;
  contenidoRespuesta: string;
  numeroRespuesta: string;
  fechaRespuesta: string;
  requerimiento: {
    id: string;
    numeroOficio: string;
    organismo: string;
    asunto: string;
  };
}

interface ModalVistaPreviaRespuestaProps {
  isOpen: boolean;
  onClose: () => void;
  datos: DatosRespuesta;
}

export function ModalVistaPreviaRespuesta({
  isOpen,
  onClose,
  datos
}: ModalVistaPreviaRespuestaProps) {
  
  const handleDescargarPDF = () => {
    toast.success('📄 Descargando vista previa en PDF');
    // Aquí iría la lógica real de generación de PDF
  };

  const handleImprimir = () => {
    window.print();
    toast.info('🖨️ Preparando para imprimir');
  };

  if (!isOpen) return null;

  // Formatear fecha para el documento
  const fechaFormateada = new Date(datos.fechaRespuesta).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[9998]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl bg-white rounded-2xl shadow-2xl z-[9999] max-h-[95vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Vista Previa del Documento Oficial</h2>
                  <p className="text-xs text-blue-100">
                    {datos.requerimiento.id} - Respuesta a {datos.requerimiento.organismo}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDescargarPDF}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Descargar PDF"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={handleImprimir}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Imprimir"
                >
                  <Printer className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Cerrar"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Contenido - Documento con scroll */}
            <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
              <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
                
                {/* Membrete Oficial ESAP */}
                <div className="border-b-4 border-blue-600">
                  {/* Header institucional */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                          <span className="text-2xl font-bold text-blue-600">ESAP</span>
                        </div>
                        <div>
                          <h1 className="text-xl font-bold">
                            ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA
                          </h1>
                          <p className="text-sm text-blue-100 mt-1">
                            Establecimiento Público del Orden Nacional
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Información institucional */}
                  <div className="bg-gray-50 px-8 py-3 text-xs text-gray-600 border-b">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>Dirección:</strong> Calle 44 No. 53-37 CAN, Bogotá D.C.
                      </div>
                      <div>
                        <strong>Teléfono:</strong> (601) 220 2790
                      </div>
                      <div>
                        <strong>NIT:</strong> 899.999.029-4
                      </div>
                      <div>
                        <strong>Web:</strong> www.esap.edu.co
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cuerpo del documento */}
                <div className="px-12 py-8 space-y-6">
                  
                  {/* Información del oficio */}
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <p className="text-gray-600">
                        <strong className="text-gray-900">PARA:</strong>
                      </p>
                      <p className="text-gray-900 mt-1 font-semibold">
                        {datos.destinatario}
                      </p>
                      <p className="text-gray-600 text-xs mt-0.5">
                        {datos.cargo}
                      </p>
                      <p className="text-gray-600 text-xs">
                        {datos.requerimiento.organismo}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600">
                        <strong className="text-gray-900">OFICIO No.:</strong>
                      </p>
                      <p className="text-gray-900 mt-1 font-mono font-bold">
                        {datos.numeroRespuesta}
                      </p>
                      <p className="text-gray-600 text-xs mt-2">
                        <strong>FECHA:</strong>
                      </p>
                      <p className="text-gray-900 text-xs">
                        Bogotá D.C., {fechaFormateada}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm">
                      <strong className="text-gray-900">ASUNTO:</strong>
                      <span className="text-gray-700 ml-2">
                        Respuesta a {datos.tipoRespuesta === 'completa' ? 'requerimiento' : 'solicitud'} - 
                        Oficio {datos.requerimiento.numeroOficio}
                      </span>
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm">
                      <strong className="text-gray-900">REFERENCIA:</strong>
                      <span className="text-gray-700 ml-2">
                        {datos.requerimiento.asunto}
                      </span>
                    </p>
                  </div>

                  {/* Saludo formal */}
                  <div className="pt-4">
                    <p className="text-sm text-gray-700">
                      Respetado(a) {datos.destinatario.split(' ')[0]}:
                    </p>
                  </div>

                  {/* Contenido de la respuesta */}
                  <div className="space-y-4 text-sm text-gray-800 leading-relaxed text-justify">
                    {datos.contenidoRespuesta.split('\n').map((parrafo, idx) => {
                      // Detectar si es un item numerado
                      if (parrafo.trim().match(/^\d+\./)) {
                        return (
                          <p key={idx} className="ml-4">
                            <strong>{parrafo.trim()}</strong>
                          </p>
                        );
                      }
                      // Detectar si está entre corchetes (indica contenido de respuesta)
                      if (parrafo.trim().startsWith('[') && parrafo.trim().endsWith(']')) {
                        return (
                          <p key={idx} className="ml-6 italic text-gray-600">
                            {parrafo.trim()}
                          </p>
                        );
                      }
                      // Párrafo normal
                      return parrafo.trim() && <p key={idx}>{parrafo.trim()}</p>;
                    })}
                  </div>

                  {/* Cierre formal */}
                  <div className="pt-6 space-y-3 text-sm text-gray-700">
                    <p>
                      Para mayor información, se adjuntan los siguientes documentos:
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-xs">
                      <li>Anexo 1 - Respuesta detallada al requerimiento</li>
                      <li>Anexo 2 - Soportes documentales</li>
                      <li>Anexo 3 - Certificaciones y documentos oficiales</li>
                    </ul>
                  </div>

                  <div className="pt-4 text-sm text-gray-700">
                    <p>Cordialmente,</p>
                  </div>

                  {/* Firma */}
                  <div className="pt-16 pb-8">
                    <div className="border-t-2 border-gray-300 pt-2 inline-block min-w-[300px]">
                      <p className="font-bold text-sm text-gray-900">
                        [FIRMA DIGITAL]
                      </p>
                      <p className="text-sm text-gray-700 mt-2">
                        <strong>NOMBRE DEL FIRMANTE</strong>
                      </p>
                      <p className="text-xs text-gray-600">
                        Director(a) de Área Jurídica
                      </p>
                      <p className="text-xs text-gray-600">
                        Escuela Superior de Administración Pública - ESAP
                      </p>
                    </div>
                  </div>

                  {/* Información adicional */}
                  <div className="border-t pt-4 text-xs text-gray-500">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p><strong>Proyectó:</strong> [Iniciales funcionario]</p>
                        <p><strong>Revisó:</strong> [Iniciales supervisor]</p>
                      </div>
                      <div>
                        <p><strong>Archivo:</strong> {datos.numeroRespuesta}</p>
                        <p><strong>Radicado SIGL:</strong> {datos.requerimiento.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Nota legal */}
                  <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800 italic">
                      <strong>NOTA:</strong> Este documento ha sido generado electrónicamente por el Sistema Integrado de Gestión Legal (SIGL) de la ESAP. 
                      La información contenida en este documento tiene carácter oficial y está sujeta a las disposiciones legales vigentes.
                    </p>
                  </div>
                </div>

                {/* Footer del documento */}
                <div className="bg-gray-50 px-8 py-4 border-t text-center text-xs text-gray-500">
                  <p>
                    Este documento es una vista previa del oficio de respuesta oficial. 
                    Una vez confirmado el envío, se generará el documento final con firma digital.
                  </p>
                  <p className="mt-2 text-gray-400">
                    Generado el {fechaHoy} • SIGL ESAP v2.0
                  </p>
                </div>
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>
                  Vista previa generada • {datos.tipoRespuesta === 'completa' ? 'Respuesta Completa' : 'Respuesta Parcial'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDescargarPDF}
                  className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
                >
                  Cerrar Vista Previa
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
