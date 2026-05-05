import { useState } from "react";
import { FileText, AlertTriangle, ArrowRight, CheckCircle, X } from "lucide-react";
import { ListaAplicada } from "../listas-chequeo/ListasChequeoContext";
import { toast } from "sonner";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODAL: GENERAR HALLAZGO DESDE LISTA DE CHEQUEO
// Integración RF007 (Listas) → RF013 (Expedientes)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ModalGenerarHallazgoProps {
  isOpen: boolean;
  onClose: () => void;
  lista: ListaAplicada;
}

export function ModalGenerarHallazgo({
  isOpen,
  onClose,
  lista,
}: ModalGenerarHallazgoProps) {
  const [itemsSeleccionados, setItemsSeleccionados] = useState<string[]>([]);
  const [descripcionHallazgo, setDescripcionHallazgo] = useState("");
  const [criterio, setCriterio] = useState("");
  const [causaRaiz, setCausaRaiz] = useState("");

  if (!isOpen) return null;

  // Filtrar ítems con no cumple
  const itemsNoCumplen = lista.respuestas.filter(
    (r) => r.respuesta === "no-cumple" || r.respuesta === "no"
  );

  const handleToggleItem = (itemId: string) => {
    setItemsSeleccionados((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleGenerarHallazgo = () => {
    if (itemsSeleccionados.length === 0) {
      toast.error("Debe seleccionar al menos un ítem");
      return;
    }

    if (!descripcionHallazgo.trim()) {
      toast.error("La descripción del hallazgo es obligatoria");
      return;
    }

    // Simular creación de hallazgo
    const hallazgo = {
      id: `HAL-${Date.now()}`,
      titulo: `Hallazgo - ${lista.plantillaNombre}`,
      descripcion: descripcionHallazgo,
      criterio: criterio || "Criterio basado en lista de chequeo",
      causaRaiz: causaRaiz || "A determinar",
      auditoria: lista.auditoriaCodigo,
      listaChequeo: lista.id,
      itemsRelacionados: itemsSeleccionados,
      estado: "abierto",
      severidad: "media",
      fechaDeteccion: new Date().toLocaleDateString("es-CO"),
    };

    console.log("Hallazgo generado:", hallazgo);

    toast.success("Hallazgo generado correctamente", {
      description: `Se creó el hallazgo ${hallazgo.id} y se agregó al expediente`,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Generar Hallazgo</h2>
              <p className="text-orange-100 text-sm mt-1">
                Desde biblioteca: {lista.id}
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
          {/* Info de la lista */}
          <div className="bg-gradient-to-r from-[#E0EDFF] to-[#F0F7FF] rounded-lg p-4 border border-slate-200">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-[#003DA5] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">
                  {lista.plantillaNombre}
                </h3>
                <p className="text-sm text-slate-600">
                  Auditoría: {lista.auditoriaCodigo}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-slate-600">
                    Total ítems: {lista.respuestas.length}
                  </span>
                  <span className="text-orange-600 font-medium">
                    No cumplen: {itemsNoCumplen.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Advertencia si no hay ítems que no cumplen */}
          {itemsNoCumplen.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 mb-1">
                  Lista sin hallazgos detectados
                </p>
                <p className="text-sm text-green-700">
                  Todos los ítems de verificación han sido cumplidos correctamente.
                  No es necesario generar hallazgos.
                </p>
              </div>
            </div>
          )}

          {/* Selección de ítems */}
          {itemsNoCumplen.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">
                Seleccionar Ítems para el Hallazgo
              </h3>
              <p className="text-sm text-slate-600 mb-3">
                Selecciona los ítems que deseas incluir en el hallazgo:
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {itemsNoCumplen.map((respuesta, index) => (
                  <label
                    key={respuesta.itemId}
                    className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-all duration-200"
                  >
                    <input
                      type="checkbox"
                      checked={itemsSeleccionados.includes(respuesta.itemId)}
                      onChange={() => handleToggleItem(respuesta.itemId)}
                      className="mt-1 w-4 h-4 text-[#003DA5] border-slate-300 rounded focus:ring-[#003DA5]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-400">
                          #{index + 1}
                        </span>
                        <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          No Cumple
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        Ítem: {respuesta.itemId}
                      </p>
                      {respuesta.observaciones && (
                        <p className="text-sm text-slate-600">
                          {respuesta.observaciones}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Formulario de hallazgo */}
          {itemsNoCumplen.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">
                Información del Hallazgo
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descripción del Hallazgo <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={descripcionHallazgo}
                  onChange={(e) => setDescripcionHallazgo(e.target.value)}
                  placeholder="Describe el hallazgo detectado..."
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Criterio (Normativa o estándar incumplido)
                </label>
                <input
                  type="text"
                  value={criterio}
                  onChange={(e) => setCriterio(e.target.value)}
                  placeholder="Ej: Artículo 2.2.9. del Decreto 1499 de 2017"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Causa Raíz (Opcional)
                </label>
                <textarea
                  value={causaRaiz}
                  onChange={(e) => setCausaRaiz(e.target.value)}
                  placeholder="Describe la causa raíz del hallazgo..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent resize-none"
                />
              </div>
            </div>
          )}

          {/* Flujo de integración */}
          {itemsSeleccionados.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#003DA5] text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <span className="font-medium text-slate-900">
                    Lista de Chequeo
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold">
                    2
                  </div>
                  <span className="font-medium text-slate-900">Hallazgo</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                    3
                  </div>
                  <span className="font-medium text-slate-900">Expediente</span>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-3">
                El hallazgo se agregará automáticamente al expediente de la auditoría{" "}
                {lista.auditoriaCodigo}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
          <div className="text-sm text-slate-600">
            {itemsSeleccionados.length} ítem(s) seleccionado(s)
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerarHallazgo}
              disabled={itemsNoCumplen.length === 0 || itemsSeleccionados.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AlertTriangle className="w-4 h-4" />
              Generar Hallazgo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
