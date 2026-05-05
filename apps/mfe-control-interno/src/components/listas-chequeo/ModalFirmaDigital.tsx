import { useState } from "react";
import { X, PenTool, CheckCircle, AlertCircle, User, Calendar } from "lucide-react";
import { ListaAplicada, FirmaDigital } from "./ListasChequeoContext";
import { PlantillaLista } from "./plantillas-predefinidas";
import { toast } from "sonner";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODAL FIRMA DIGITAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ModalFirmaDigitalProps {
  isOpen: boolean;
  onClose: () => void;
  onFirmar: (firma: FirmaDigital) => void;
  lista: ListaAplicada;
  plantilla: PlantillaLista;
}

export function ModalFirmaDigital({
  isOpen,
  onClose,
  onFirmar,
  lista,
  plantilla,
}: ModalFirmaDigitalProps) {
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [cargo, setCargo] = useState("");
  const [acepto, setAcepto] = useState(false);

  if (!isOpen) return null;

  const handleFirmar = () => {
    // Validaciones
    if (!nombreCompleto.trim()) {
      toast.error("El nombre completo es obligatorio");
      return;
    }
    if (!cargo.trim()) {
      toast.error("El cargo es obligatorio");
      return;
    }
    if (!acepto) {
      toast.error("Debe aceptar la declaración de veracidad");
      return;
    }

    const firma: FirmaDigital = {
      nombreCompleto: nombreCompleto.trim(),
      cargo: cargo.trim(),
      fecha: new Date().toLocaleDateString("es-CO"),
      timestamp: new Date().toISOString(),
    };

    onFirmar(firma);
  };

  const itemsRespondidos = lista.respuestas.filter((r) => r.respuesta !== "n-a").length;
  const totalItems = plantilla.items.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Firma Digital</h2>
              <p className="text-green-100 text-sm mt-1">
                Confirma la finalización del registro de biblioteca
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Resumen de la lista */}
          <div className="bg-gradient-to-r from-[#E0EDFF] to-[#F0F7FF] rounded-lg p-4 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3">
              Resumen del Registro
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Plantilla:</span>
                <span className="font-medium text-slate-900">{plantilla.nombre}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Código:</span>
                <span className="font-mono text-[#003DA5]">{lista.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Auditoría:</span>
                <span className="font-medium text-slate-900">
                  {lista.auditoriaCodigo}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Ítems completados:</span>
                <span className="font-semibold text-green-600">
                  {itemsRespondidos}/{totalItems}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Progreso:</span>
                <span className="font-semibold text-green-600">100%</span>
              </div>
            </div>
          </div>

          {/* Información de confirmación */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-900 mb-1">
                Lista completada correctamente
              </p>
              <p className="text-sm text-green-700">
                Has respondido todos los ítems obligatorios. Al firmar esta lista,
                confirmas que la información proporcionada es precisa y completa.
              </p>
            </div>
          </div>

          {/* Formulario de firma */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Datos del Firmante</h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Ej: Juan Pérez García"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cargo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Ej: Jefe de Control Interno"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fecha y Hora de Firma
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={new Date().toLocaleString("es-CO")}
                  readOnly
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Declaración de veracidad */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-900 mb-2">
                  Declaración de Veracidad
                </p>
                <p className="text-sm text-amber-800 mb-3">
                  Al firmar este registro de biblioteca, declaro que:
                </p>
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside mb-3">
                  <li>He revisado todos los ítems de verificación</li>
                  <li>Las respuestas proporcionadas son veraces y precisas</li>
                  <li>Las evidencias adjuntas son auténticas y válidas</li>
                  <li>
                    Asumo responsabilidad por la información declarada
                  </li>
                </ul>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acepto}
                    onChange={(e) => setAcepto(e.target.checked)}
                    className="mt-1 w-4 h-4 text-green-600 border-amber-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-amber-900 font-medium">
                    Acepto la declaración de veracidad y confirmo que los datos
                    son correctos
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Vista previa de firma */}
          {nombreCompleto && cargo && acepto && (
            <div className="bg-slate-50 rounded-lg p-6 border-2 border-dashed border-slate-300">
              <p className="text-xs text-slate-600 mb-4 text-center">
                Vista Previa de Firma Digital
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Firmado por:</span>
                  <span className="font-semibold text-slate-900">
                    {nombreCompleto}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Cargo:</span>
                  <span className="font-medium text-slate-900">{cargo}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Fecha:</span>
                  <span className="font-medium text-slate-900">
                    {new Date().toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-300">
                  <p className="text-xs text-slate-500 text-center">
                    Este documento será marcado como firmado digitalmente
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
          <div className="text-sm text-slate-600">
            Firma digital con validez probatoria
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleFirmar}
              disabled={!nombreCompleto || !cargo || !acepto}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PenTool className="w-4 h-4" />
              Firmar y Finalizar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
