import { useState } from "react";
import {
  X,
  Download,
  Printer,
  Share2,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  User,
  Building2,
  PenTool,
} from "lucide-react";
import { ListaAplicada } from "./ListasChequeoContext";
import { PlantillaLista } from "./plantillas-predefinidas";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VISUALIZADOR Y GENERADOR DE PDF
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface VisualizadorPDFProps {
  isOpen: boolean;
  onClose: () => void;
  lista: ListaAplicada;
  plantilla: PlantillaLista;
}

export function VisualizadorPDF({
  isOpen,
  onClose,
  lista,
  plantilla,
}: VisualizadorPDFProps) {
  const [vistaPDF, setVistaPDF] = useState(false);

  if (!isOpen) return null;

  const handleDescargarPDF = () => {
    // En producción, aquí se generaría el PDF real con una librería como jsPDF o react-pdf
    const contenidoPDF = generarContenidoPDF(lista, plantilla);
    
    // Simulación de descarga
    const blob = new Blob([contenidoPDF], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${lista.id}_${plantilla.codigo}_${new Date().toISOString().split("T")[0]}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Vista Previa - PDF</h2>
              <p className="text-blue-100 text-sm mt-1">
                {plantilla.nombre} - {lista.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDescargarPDF}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Descargar</span>
            </button>
            <button
              onClick={handleImprimir}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
            >
              <Printer className="w-4 h-4" />
              <span className="text-sm">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido PDF */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
            <PDFContent lista={lista} plantilla={plantilla} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTENIDO DEL PDF
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PDFContentProps {
  lista: ListaAplicada;
  plantilla: PlantillaLista;
}

function PDFContent({ lista, plantilla }: PDFContentProps) {
  const itemsRespondidos = lista.respuestas.filter((r) => r.respuesta !== "n-a");
  const itemsCumple = lista.respuestas.filter(
    (r) => r.respuesta === "cumple" || r.respuesta === "si"
  );
  const itemsNoCumple = lista.respuestas.filter(
    (r) => r.respuesta === "no-cumple" || r.respuesta === "no"
  );

  const porcentajeCumplimiento = Math.round(
    (itemsCumple.length / itemsRespondidos.length) * 100
  );

  return (
    <div className="p-8 space-y-6">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ENCABEZADO INSTITUCIONAL */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="border-b-4 border-[#003DA5] pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#003DA5] to-[#0051D5] flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#003DA5]">
                  ESAP - Control Interno
                </h1>
                <p className="text-sm text-slate-600">
                  Escuela Superior de Administración Pública
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-600">Código de documento</p>
            <p className="text-sm font-mono font-bold text-[#003DA5]">
              {lista.id}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Generado: {new Date().toLocaleDateString("es-CO")}
            </p>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* INFORMACIÓN GENERAL */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#003DA5]" />
          Lista de Chequeo - {plantilla.nombre}
        </h2>

        <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4">
          <div>
            <p className="text-xs text-slate-600 mb-1">Plantilla</p>
            <p className="font-semibold text-slate-900">{plantilla.nombre}</p>
            <p className="text-xs text-slate-500 font-mono mt-1">
              {plantilla.codigo} - v{plantilla.version}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Auditoría</p>
            <p className="font-semibold text-slate-900">{lista.auditoriaCodigo}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Proceso</p>
            <p className="font-semibold text-slate-900">
              {plantilla.procesoAsociado}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Fecha de completado</p>
            <p className="font-semibold text-slate-900">
              {lista.fechaCompletado || "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* RESUMEN EJECUTIVO */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-3">
          Resumen Ejecutivo
        </h3>
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">
              {itemsRespondidos.length}
            </p>
            <p className="text-xs text-blue-600 mt-1">Total Ítems</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">
              {itemsCumple.length}
            </p>
            <p className="text-xs text-green-600 mt-1">Cumple</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-700">
              {itemsNoCumple.length}
            </p>
            <p className="text-xs text-red-600 mt-1">No Cumple</p>
          </div>
          <div className="bg-[#E0EDFF] border border-[#003DA5] rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-[#003DA5]">
              {porcentajeCumplimiento}%
            </p>
            <p className="text-xs text-[#003DA5] mt-1">Cumplimiento</p>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* DETALLE DE ÍTEMS */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-3">
          Detalle de Verificación
        </h3>
        <div className="space-y-3">
          {plantilla.items.map((item, index) => {
            const respuesta = lista.respuestas.find((r) => r.itemId === item.id);
            if (!respuesta) return null;

            const esPositivo =
              respuesta.respuesta === "cumple" || respuesta.respuesta === "si";
            const esNegativo =
              respuesta.respuesta === "no-cumple" || respuesta.respuesta === "no";

            return (
              <div
                key={item.id}
                className="border border-slate-200 rounded-lg p-4 break-inside-avoid"
              >
                {/* Header del ítem */}
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#003DA5] text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-1">
                      {item.titulo}
                    </h4>
                    {item.descripcion && (
                      <p className="text-sm text-slate-600">{item.descripcion}</p>
                    )}
                  </div>
                  {/* Icono de respuesta */}
                  {esPositivo && (
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  )}
                  {esNegativo && (
                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  )}
                </div>

                {/* Respuesta */}
                <div className="ml-11 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">
                      Respuesta:
                    </span>
                    <span
                      className={`text-sm font-semibold px-2 py-0.5 rounded ${
                        esPositivo
                          ? "bg-green-100 text-green-700"
                          : esNegativo
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {respuesta.respuesta.toUpperCase().replace("-", " ")}
                    </span>
                  </div>

                  {/* Observaciones */}
                  {respuesta.observaciones && (
                    <div className="bg-slate-50 rounded p-2">
                      <p className="text-xs font-medium text-slate-600 mb-1">
                        Observaciones:
                      </p>
                      <p className="text-sm text-slate-900">
                        {respuesta.observaciones}
                      </p>
                    </div>
                  )}

                  {/* Evidencias */}
                  {respuesta.evidencias && respuesta.evidencias.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">
                        Evidencias adjuntas ({respuesta.evidencias.length}):
                      </p>
                      <ul className="text-sm text-slate-700 space-y-1">
                        {respuesta.evidencias.map((evidencia) => (
                          <li
                            key={evidencia.id}
                            className="flex items-center gap-2"
                          >
                            <FileText className="w-3 h-3 text-slate-400" />
                            {evidencia.nombre}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* FIRMA DIGITAL */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {lista.firmaDigital && (
        <div className="border-t-2 border-slate-200 pt-6 mt-8">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <PenTool className="w-6 h-6 text-green-700" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-slate-900 mb-3">
                  Firma Digital
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Firmado por:</p>
                    <p className="font-semibold text-slate-900">
                      {lista.firmaDigital.nombreCompleto}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Cargo:</p>
                    <p className="font-semibold text-slate-900">
                      {lista.firmaDigital.cargo}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Fecha:</p>
                    <p className="font-semibold text-slate-900">
                      {lista.firmaDigital.fecha}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Timestamp:</p>
                    <p className="font-mono text-xs text-slate-700">
                      {new Date(lista.firmaDigital.timestamp).toISOString()}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-green-200">
                  <p className="text-xs text-slate-600 italic">
                    Este documento ha sido firmado digitalmente y posee validez
                    probatoria de acuerdo a la normativa vigente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* PIE DE PÁGINA */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="border-t border-slate-200 pt-4 mt-8 text-center text-xs text-slate-500">
        <p>
          Escuela Superior de Administración Pública (ESAP) - Sistema de Control
          Interno de Gestión
        </p>
        <p className="mt-1">
          Documento generado el {new Date().toLocaleDateString("es-CO")} a las{" "}
          {new Date().toLocaleTimeString("es-CO")}
        </p>
        <p className="mt-1">Página 1 de 1</p>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GENERADOR DE CONTENIDO PDF
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generarContenidoPDF(lista: ListaAplicada, plantilla: PlantillaLista): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${lista.id} - ${plantilla.nombre}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #003DA5; }
        .header { border-bottom: 4px solid #003DA5; padding-bottom: 10px; }
        .item { border: 1px solid #ddd; padding: 10px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ESAP - Lista de Chequeo</h1>
        <p><strong>Código:</strong> ${lista.id}</p>
        <p><strong>Plantilla:</strong> ${plantilla.nombre}</p>
      </div>
      ${plantilla.items
        .map((item, index) => {
          const respuesta = lista.respuestas.find((r) => r.itemId === item.id);
          return `
            <div class="item">
              <h3>${index + 1}. ${item.titulo}</h3>
              <p><strong>Respuesta:</strong> ${respuesta?.respuesta || "N/A"}</p>
              ${respuesta?.observaciones ? `<p><strong>Observaciones:</strong> ${respuesta.observaciones}</p>` : ""}
            </div>
          `;
        })
        .join("")}
    </body>
    </html>
  `;
}
