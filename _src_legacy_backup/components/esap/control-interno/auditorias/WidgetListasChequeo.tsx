import { useState } from "react";
import {
  ClipboardCheck,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  FileText,
} from "lucide-react";
import { useListasChequeo } from "../listas-chequeo/ListasChequeoContext";
import { ModalAplicarLista } from "../listas-chequeo/ModalAplicarLista";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WIDGET: LISTAS DE CHEQUEO EN AUDITORÍA
// Integración con el Kanban de Auditorías - RF007 ↔ RF008
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface WidgetListasChequeoProps {
  auditoriaId: string;
  auditoriaCodigo: string;
  onIrALlenarLista?: (listaId: string) => void;
}

export function WidgetListasChequeo({
  auditoriaId,
  auditoriaCodigo,
  onIrALlenarLista,
}: WidgetListasChequeoProps) {
  const { obtenerListasPorAuditoria, plantillas } = useListasChequeo();
  const [modalAplicarOpen, setModalAplicarOpen] = useState(false);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<any>(null);

  const listas = obtenerListasPorAuditoria(auditoriaId);
  const listasEnProceso = listas.filter(
    (l) => l.estado === "en-proceso" || l.estado === "borrador"
  );
  const listasCompletadas = listas.filter((l) => l.estado === "completada");

  const progresoPorLista = listas.map((lista) => ({
    ...lista,
    porcentajeProgreso: lista.progreso,
  }));

  const progresoTotal =
    listas.length > 0
      ? Math.round(
          progresoPorLista.reduce((sum, l) => sum + l.porcentajeProgreso, 0) /
            listas.length
        )
      : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#003DA5] to-[#0051D5] flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Listas de Chequeo</h3>
            <p className="text-xs text-slate-600">
              {listas.length} lista{listas.length !== 1 ? "s" : ""} aplicada
              {listas.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            // Mostrar selector de plantilla
            setModalAplicarOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white text-sm rounded-lg hover:shadow-md transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Aplicar Lista
        </button>
      </div>

      {/* Indicador de progreso general */}
      {listas.length > 0 && (
        <div className="bg-gradient-to-r from-[#E0EDFF] to-[#F0F7FF] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Progreso General
            </span>
            <span className="text-sm font-bold text-[#003DA5]">
              {progresoTotal}%
            </span>
          </div>
          <div className="w-full h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#003DA5] to-[#0051D5] rounded-full transition-all duration-500"
              style={{ width: `${progresoTotal}%` }}
            />
          </div>
        </div>
      )}

      {/* Resumen de estados */}
      {listas.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <FileText className="w-4 h-4 text-slate-600" />
              <span className="text-xl font-bold text-slate-900">
                {listas.length}
              </span>
            </div>
            <p className="text-xs text-slate-600">Total</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-xl font-bold text-orange-700">
                {listasEnProceso.length}
              </span>
            </div>
            <p className="text-xs text-orange-600">En Proceso</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xl font-bold text-green-700">
                {listasCompletadas.length}
              </span>
            </div>
            <p className="text-xs text-green-600">Completadas</p>
          </div>
        </div>
      )}

      {/* Lista de listas aplicadas */}
      {listas.length > 0 ? (
        <div className="space-y-2">
          {listas.map((lista) => (
            <div
              key={lista.id}
              className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-all duration-200 cursor-pointer"
              onClick={() => {
                if (lista.estado !== "completada" && onIrALlenarLista) {
                  onIrALlenarLista(lista.id);
                }
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-[#003DA5] bg-[#E0EDFF] px-2 py-0.5 rounded">
                      {lista.id}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        lista.estado === "completada"
                          ? "bg-green-100 text-green-700"
                          : lista.estado === "en-proceso"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {lista.estado === "completada"
                        ? "✓ Completada"
                        : lista.estado === "en-proceso"
                        ? "En Proceso"
                        : "Borrador"}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">
                    {lista.plantillaNombre}
                  </p>
                </div>
                {lista.estado !== "completada" && (
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
              </div>

              {/* Barra de progreso */}
              {lista.estado !== "completada" && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Progreso</span>
                    <span className="font-semibold text-slate-900">
                      {lista.progreso}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#003DA5] to-[#0051D5] rounded-full transition-all duration-300"
                      style={{ width: `${lista.progreso}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Info adicional para completadas */}
              {lista.estado === "completada" && lista.fechaCompletado && (
                <div className="text-xs text-slate-500 mt-2">
                  Completada el {lista.fechaCompletado}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-lg p-6 text-center">
          <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900 mb-1">
            Sin listas aplicadas
          </p>
          <p className="text-xs text-slate-600 mb-3">
            Aplica una plantilla de lista de chequeo para comenzar la verificación
          </p>
          <button
            onClick={() => setModalAplicarOpen(true)}
            className="text-sm text-[#003DA5] font-medium hover:underline"
          >
            Aplicar primera lista →
          </button>
        </div>
      )}

      {/* Modal para aplicar lista */}
      {modalAplicarOpen && (
        <ModalSelectorPlantilla
          isOpen={modalAplicarOpen}
          onClose={() => setModalAplicarOpen(false)}
          auditoriaId={auditoriaId}
          auditoriaCodigo={auditoriaCodigo}
        />
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODAL: SELECTOR DE PLANTILLA SIMPLIFICADO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ModalSelectorPlantillaProps {
  isOpen: boolean;
  onClose: () => void;
  auditoriaId: string;
  auditoriaCodigo: string;
}

function ModalSelectorPlantilla({
  isOpen,
  onClose,
  auditoriaId,
  auditoriaCodigo,
}: ModalSelectorPlantillaProps) {
  const { plantillas, aplicarPlantilla } = useListasChequeo();
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<any>(null);
  const [mostrarModalAplicar, setMostrarModalAplicar] = useState(false);

  if (!isOpen) return null;

  const handleSeleccionar = (plantilla: any) => {
    setPlantillaSeleccionada(plantilla);
    setMostrarModalAplicar(true);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white px-6 py-4">
            <h2 className="text-xl font-bold">Seleccionar Plantilla</h2>
            <p className="text-blue-100 text-sm mt-1">
              Elige una plantilla para aplicar a la auditoría {auditoriaCodigo}
            </p>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plantillas.map((plantilla) => (
                <button
                  key={plantilla.id}
                  onClick={() => handleSeleccionar(plantilla)}
                  className="text-left bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-[#003DA5] hover:bg-[#E0EDFF] transition-all duration-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-[#003DA5] bg-white px-2 py-0.5 rounded">
                      {plantilla.codigo}
                    </span>
                    {plantilla.esPlantillaSistema && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                        Sistema
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">
                    {plantilla.nombre}
                  </h4>
                  <p className="text-sm text-slate-600 mb-2">
                    {plantilla.descripcion}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{plantilla.items.length} ítems</span>
                    <span>{plantilla.procesoAsociado}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de aplicar lista */}
      {mostrarModalAplicar && plantillaSeleccionada && (
        <ModalAplicarLista
          isOpen={mostrarModalAplicar}
          onClose={() => {
            setMostrarModalAplicar(false);
            onClose();
          }}
          plantilla={plantillaSeleccionada}
        />
      )}
    </>
  );
}
