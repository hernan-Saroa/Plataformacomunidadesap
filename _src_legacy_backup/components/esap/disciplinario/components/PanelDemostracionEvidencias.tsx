/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  PANEL DE DEMOSTRACIÓN: NUEVO SISTEMA DE NOMBRE Y DESCRIPCIÓN          ║
 * ║  Para Carga de Evidencias en Control Interno Disciplinario             ║
 * ║  📋 Implementado: 10 de Febrero de 2026                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import { Info, FileText, CheckCircle, AlertCircle, Upload, ArrowRight } from 'lucide-react';

interface EjemploEvidencia {
  tipo: string;
  nombreCorrecto: string;
  nombreIncorrecto: string;
  descripcionCorrecto: string;
  razonamiento: string;
}

const EJEMPLOS: EjemploEvidencia[] = [
  {
    tipo: 'Declaración',
    nombreCorrecto: 'Declaración Testigo Juan Pérez',
    nombreIncorrecto: 'Documento 1',
    descripcionCorrecto: 'Declaración rendida el 15/01/2025 por el testigo Juan Pérez, quien manifiesta haber presenciado los hechos en la oficina del segundo piso. Aporta detalles sobre horarios y personas involucradas.',
    razonamiento: 'El nombre debe identificar claramente QUÉ ES el documento y QUIÉN lo aporta o protagoniza.'
  },
  {
    tipo: 'Oficio',
    nombreCorrecto: 'Oficio Respuesta Secretaría General',
    nombreIncorrecto: 'Respuesta.pdf',
    descripcionCorrecto: 'Oficio No. SG-2025-0456 con fecha 20/01/2025 mediante el cual la Secretaría General responde solicitud de información sobre contratos vigentes del año 2024.',
    razonamiento: 'El nombre debe indicar el TIPO de documento (Oficio) y la ENTIDAD u ORIGEN.'
  },
  {
    tipo: 'Fotografía',
    nombreCorrecto: 'Fotografía Evidencia Daño Equipos Sede Norte',
    nombreIncorrecto: 'IMG_2025.jpg',
    descripcionCorrecto: 'Fotografía tomada el 10/01/2025 que muestra el estado de los equipos de cómputo dañados en la Sede Norte, ubicados en el área de sistemas. Se observa claramente el deterioro por falta de mantenimiento.',
    razonamiento: 'Las fotografías deben tener un nombre descriptivo del CONTENIDO y UBICACIÓN.'
  },
  {
    tipo: 'Acta',
    nombreCorrecto: 'Acta Diligencia Inspección Ocular Sede Central',
    nombreIncorrecto: 'Acta',
    descripcionCorrecto: 'Acta de diligencia de inspección ocular realizada el 25/01/2025 en la Sede Central, primer piso, oficina de contabilidad. Se verificaron las condiciones de almacenamiento de documentos y se encontraron irregularidades.',
    razonamiento: 'El nombre debe especificar el TIPO de acta y el LUGAR o MOTIVO de la diligencia.'
  }
];

export function PanelDemostracionEvidencias() {
  const [ejemploSeleccionado, setEjemploSeleccionado] = useState<number>(0);

  const ejemplo = EJEMPLOS[ejemploSeleccionado];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Sistema Mejorado de Carga de Evidencias
            </h2>
            <p className="text-blue-100 text-sm">
              Ahora cada evidencia requiere un <strong>nombre identificador</strong> y opcionalmente una <strong>descripción detallada</strong>. 
              Esto mejora la organización, trazabilidad y cumplimiento normativo.
            </p>
          </div>
        </div>
      </div>

      {/* Estructura de Campos */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" />
          Estructura del Formulario de Carga
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 mb-1">
                Nombre de la Evidencia <span className="text-red-600">*</span>
              </p>
              <p className="text-sm text-gray-600">
                Campo <strong>OBLIGATORIO</strong>. Identifica de forma clara y concisa el documento. 
                Debe responder: ¿Qué es? ¿De quién es? ¿Para qué sirve?
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 mb-1">
                Descripción Detallada (Opcional)
              </p>
              <p className="text-sm text-gray-600">
                Campo <strong>OPCIONAL</strong>. Proporciona contexto adicional: fecha de elaboración, 
                contenido relevante, importancia probatoria, relación con los hechos investigados.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              3
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 mb-1">
                Archivo Digital <span className="text-red-600">*</span>
              </p>
              <p className="text-sm text-gray-600">
                El archivo en formato PDF, DOCX, JPG, PNG, etc. Máximo 10 MB.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ejemplos Prácticos */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Ejemplos Prácticos
        </h3>

        {/* Selector de Ejemplos */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {EJEMPLOS.map((ej, index) => (
            <button
              key={index}
              onClick={() => setEjemploSeleccionado(index)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                ejemploSeleccionado === index
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {ej.tipo}
            </button>
          ))}
        </div>

        {/* Comparación: Incorrecto vs Correcto */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* ❌ Incorrecto */}
          <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h4 className="font-bold text-red-900">❌ Incorrecto</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nombre de la Evidencia
                </label>
                <input
                  type="text"
                  value={ejemplo.nombreIncorrecto}
                  disabled
                  className="w-full px-3 py-2 text-sm border border-red-300 rounded-md bg-white"
                />
                <p className="text-xs text-red-700 mt-1 font-medium">
                  ⚠️ Muy genérico, no identifica el contenido
                </p>
              </div>
            </div>
          </div>

          {/* ✅ Correcto */}
          <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h4 className="font-bold text-green-900">✅ Correcto</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nombre de la Evidencia
                </label>
                <input
                  type="text"
                  value={ejemplo.nombreCorrecto}
                  disabled
                  className="w-full px-3 py-2 text-sm border border-green-300 rounded-md bg-white"
                />
                <p className="text-xs text-green-700 mt-1 font-medium">
                  ✅ Descriptivo, claro y específico
                </p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Descripción Detallada
                </label>
                <textarea
                  value={ejemplo.descripcionCorrecto}
                  disabled
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-green-300 rounded-md bg-white"
                />
                <p className="text-xs text-green-700 mt-1 font-medium">
                  ✅ Proporciona contexto completo y relevancia probatoria
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Razonamiento */}
        <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900 mb-1">💡 ¿Por qué es importante?</p>
              <p className="text-sm text-blue-800">{ejemplo.razonamiento}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dónde se Registra */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-purple-600" />
          ¿Dónde se Registra esta Información?
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Expediente Electrónico</p>
              <p className="text-sm text-gray-600">
                El nombre aparece en la vista cronológica principal, facilitando la identificación rápida.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Hoja de Control (10 Campos)</p>
              <p className="text-sm text-gray-600">
                El nombre se registra en "DESCRIPCIÓN DEL DOCUMENTO PRINCIPAL" y la descripción en "ANEXOS DEL DOCUMENTO PRINCIPAL".
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Sistema de Trazabilidad</p>
              <p className="text-sm text-gray-600">
                Se registra quién cargó la evidencia, cuándo y con qué nombre/descripción, garantizando la cadena de custodia.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tips Finales */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-300 p-6">
        <h3 className="text-lg font-bold text-amber-900 mb-4">
          📌 Tips para Nombrar Evidencias Correctamente
        </h3>
        <ul className="space-y-2 text-sm text-amber-900">
          <li className="flex items-start gap-2">
            <span className="text-amber-600 font-bold">1.</span>
            <span><strong>Sé específico:</strong> "Declaración Testigo María López" en lugar de "Declaración"</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600 font-bold">2.</span>
            <span><strong>Incluye fechas clave:</strong> "Oficio Respuesta 15-Enero-2025" si la fecha es relevante</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600 font-bold">3.</span>
            <span><strong>Indica la fuente:</strong> "Fotografía Evidencia Oficina Contabilidad Sede Norte"</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600 font-bold">4.</span>
            <span><strong>Evita códigos genéricos:</strong> Nada de "Doc1", "Archivo2", "IMG_001"</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600 font-bold">5.</span>
            <span><strong>Usa la descripción para detalles:</strong> El nombre debe ser corto, la descripción puede ser extensa</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
