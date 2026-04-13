import { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Eye,
  AlertCircle,
} from "lucide-react";
import { ItemLista, PlantillaLista } from "./plantillas-predefinidas";
import { useListasChequeo } from "./ListasChequeoContext";
import { toast } from "sonner@2.0.3";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODAL CREAR/EDITAR PLANTILLA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ModalCrearPlantillaProps {
  isOpen: boolean;
  onClose: () => void;
  plantillaEditar?: PlantillaLista;
  modo: "crear" | "editar" | "duplicar" | "ver";
}

export function ModalCrearPlantilla({
  isOpen,
  onClose,
  plantillaEditar,
  modo,
}: ModalCrearPlantillaProps) {
  const { crearPlantilla, actualizarPlantilla, duplicarPlantilla } = useListasChequeo();

  // Estado del formulario
  const [codigo, setCodigo] = useState(plantillaEditar?.codigo || "");
  const [nombre, setNombre] = useState(plantillaEditar?.nombre || "");
  const [descripcion, setDescripcion] = useState(plantillaEditar?.descripcion || "");
  const [procesoAsociado, setProcesoAsociado] = useState(
    plantillaEditar?.procesoAsociado || ""
  );
  const [version, setVersion] = useState(plantillaEditar?.version || "1.0");
  const [items, setItems] = useState<ItemLista[]>(plantillaEditar?.items || []);

  // Estados UI
  const [vistaPrevia, setVistaPrevia] = useState(modo === "ver");
  const [itemEditando, setItemEditando] = useState<number | null>(null);

  const esModoDuplicar = modo === "duplicar";
  const esModoVer = modo === "ver";
  const esSoloLectura = esModoVer;

  // Procesos disponibles
  const procesosDisponibles = [
    "Gestión Financiera",
    "Gestión Administrativa",
    "Formación para la Vida",
    "Adquisición Bienes",
    "Gestión Talento Humano",
    "Efectividad Institucional",
    "Evaluación Control Mejora",
    "Modelo Seguridad Privacidad",
    "Transformación Digital",
    "Otro",
  ];

  if (!isOpen) return null;

  // ──────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────

  const handleAgregarItem = () => {
    const nuevoItem: ItemLista = {
      id: `ITEM-${Date.now()}`,
      orden: items.length + 1,
      titulo: "",
      descripcion: "",
      tipoRespuesta: "cumple-no-cumple",
      requiereEvidencia: false,
      esObligatorio: true,
      categoria: "",
    };
    setItems([...items, nuevoItem]);
    setItemEditando(items.length);
  };

  const handleEliminarItem = (index: number) => {
    const nuevosItems = items.filter((_, i) => i !== index);
    // Reordenar
    const reordenados = nuevosItems.map((item, i) => ({
      ...item,
      orden: i + 1,
    }));
    setItems(reordenados);
  };

  const handleActualizarItem = (index: number, itemActualizado: Partial<ItemLista>) => {
    const nuevosItems = [...items];
    nuevosItems[index] = { ...nuevosItems[index], ...itemActualizado };
    setItems(nuevosItems);
  };

  const handleMoverItem = (index: number, direccion: "arriba" | "abajo") => {
    if (
      (direccion === "arriba" && index === 0) ||
      (direccion === "abajo" && index === items.length - 1)
    ) {
      return;
    }

    const nuevosItems = [...items];
    const targetIndex = direccion === "arriba" ? index - 1 : index + 1;
    [nuevosItems[index], nuevosItems[targetIndex]] = [
      nuevosItems[targetIndex],
      nuevosItems[index],
    ];

    // Reordenar números
    const reordenados = nuevosItems.map((item, i) => ({
      ...item,
      orden: i + 1,
    }));
    setItems(reordenados);
  };

  const handleGuardar = () => {
    // Validaciones
    if (!codigo.trim()) {
      toast.error("El código es obligatorio");
      return;
    }
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (!procesoAsociado.trim()) {
      toast.error("Debe seleccionar un proceso");
      return;
    }
    if (items.length === 0) {
      toast.error("Debe agregar al menos un ítem");
      return;
    }

    // Validar que todos los ítems tengan título
    const itemsSinTitulo = items.filter((item) => !item.titulo.trim());
    if (itemsSinTitulo.length > 0) {
      toast.error(`Hay ${itemsSinTitulo.length} ítem(s) sin título`);
      return;
    }

    try {
      if (modo === "crear" || modo === "duplicar") {
        crearPlantilla({
          codigo,
          nombre,
          descripcion,
          procesoAsociado,
          version,
          items,
          activa: true,
        });
        toast.success("Plantilla creada exitosamente");
      } else if (modo === "editar" && plantillaEditar) {
        actualizarPlantilla(plantillaEditar.id, {
          codigo,
          nombre,
          descripcion,
          procesoAsociado,
          version,
          items,
        });
        toast.success("Plantilla actualizada exitosamente");
      }

      onClose();
    } catch (error) {
      toast.error("Error al guardar la plantilla");
      console.error(error);
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {modo === "crear"
                ? "Crear Nueva Plantilla"
                : modo === "editar"
                ? "Editar Plantilla"
                : "Duplicar Plantilla"}
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {modo === "crear"
                ? "Define los ítems de verificación para tu lista de chequeo"
                : modo === "editar"
                ? "Modifica los ítems de la plantilla existente"
                : "Crea una copia de la plantilla para personalizar"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVistaPrevia(!vistaPrevia)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {vistaPrevia ? "Editar" : "Vista Previa"}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {vistaPrevia ? (
            <VistaPrevia
              codigo={codigo}
              nombre={nombre}
              descripcion={descripcion}
              procesoAsociado={procesoAsociado}
              items={items}
            />
          ) : (
            <div className="space-y-6">
              {/* Información básica */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-slate-900 mb-3">
                  Información Básica
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Código <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      placeholder="Ej: PLT-001"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                      readOnly={esSoloLectura}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Versión
                    </label>
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="Ej: 1.0"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                      readOnly={esSoloLectura}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre de la Plantilla <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Auditoría de Gestión Financiera"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                    readOnly={esSoloLectura}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Describe el propósito de esta lista de chequeo"
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent resize-none"
                    readOnly={esSoloLectura}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Proceso Asociado <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={procesoAsociado}
                    onChange={(e) => setProcesoAsociado(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                    disabled={esSoloLectura}
                  >
                    <option value="">Seleccionar proceso...</option>
                    {procesosDisponibles.map((proceso) => (
                      <option key={proceso} value={proceso}>
                        {proceso}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ítems */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Ítems de Verificación
                    </h3>
                    <p className="text-sm text-slate-600">
                      {items.length} ítem{items.length !== 1 ? "s" : ""} agregado
                      {items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={handleAgregarItem}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white rounded-lg hover:shadow-md transition-all duration-200"
                    disabled={esSoloLectura}
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Ítem
                  </button>
                </div>

                <div className="space-y-3">
                  {items.length === 0 ? (
                    <div className="bg-slate-50 rounded-lg p-8 text-center">
                      <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 mb-2">
                        No hay ítems agregados
                      </p>
                      <p className="text-sm text-slate-500">
                        Haz clic en "Agregar Ítem" para comenzar
                      </p>
                    </div>
                  ) : (
                    items.map((item, index) => (
                      <ItemEditor
                        key={item.id}
                        item={item}
                        index={index}
                        isExpanded={itemEditando === index}
                        onToggle={() =>
                          setItemEditando(itemEditando === index ? null : index)
                        }
                        onUpdate={(itemActualizado) =>
                          handleActualizarItem(index, itemActualizado)
                        }
                        onDelete={() => handleEliminarItem(index)}
                        onMoveUp={() => handleMoverItem(index, "arriba")}
                        onMoveDown={() => handleMoverItem(index, "abajo")}
                        canMoveUp={index > 0}
                        canMoveDown={index < items.length - 1}
                        readOnly={esSoloLectura}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
          <div className="text-sm text-slate-600">
            {items.length} ítem{items.length !== 1 ? "s" : ""} •{" "}
            {items.filter((i) => i.esObligatorio).length} obligatorio
            {items.filter((i) => i.esObligatorio).length !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white rounded-lg hover:shadow-md transition-all duration-200"
              disabled={esSoloLectura}
            >
              <Save className="w-4 h-4" />
              {modo === "crear" || modo === "duplicar" ? "Crear Plantilla" : "Guardar Cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENTE: EDITOR DE ÍTEM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ItemEditorProps {
  item: ItemLista;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (item: Partial<ItemLista>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  readOnly: boolean;
}

function ItemEditor({
  item,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  readOnly,
}: ItemEditorProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Header del ítem */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-mono text-slate-600 w-8">
            #{item.orden}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">
            {item.titulo || (
              <span className="text-slate-400 italic">Sin título...</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {item.esObligatorio && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
              Obligatorio
            </span>
          )}
          {item.requiereEvidencia && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              Evidencia
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            disabled={readOnly}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenido expandido */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Título del Ítem <span className="text-red-500">*</span>
            </label>
            <textarea
              value={item.titulo}
              onChange={(e) => onUpdate({ titulo: e.target.value })}
              placeholder="Ej: ¿Se cumple con el presupuesto asignado?"
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent resize-none"
              readOnly={readOnly}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descripción (Opcional)
            </label>
            <textarea
              value={item.descripcion || ""}
              onChange={(e) => onUpdate({ descripcion: e.target.value })}
              placeholder="Agrega contexto o instrucciones adicionales..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent resize-none"
              readOnly={readOnly}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de Respuesta
              </label>
              <select
                value={item.tipoRespuesta}
                onChange={(e) =>
                  onUpdate({
                    tipoRespuesta: e.target.value as ItemLista["tipoRespuesta"],
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                disabled={readOnly}
              >
                <option value="cumple-no-cumple">Cumple / No Cumple / N/A</option>
                <option value="si-no">Sí / No</option>
                <option value="texto-libre">Texto Libre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Categoría
              </label>
              <input
                type="text"
                value={item.categoria || ""}
                onChange={(e) => onUpdate({ categoria: e.target.value })}
                placeholder="Ej: Control Interno"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                readOnly={readOnly}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={item.esObligatorio}
                onChange={(e) => onUpdate({ esObligatorio: e.target.checked })}
                className="w-4 h-4 text-[#003DA5] border-slate-300 rounded focus:ring-[#003DA5]"
                disabled={readOnly}
              />
              <span className="text-sm text-slate-700">Es obligatorio</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={item.requiereEvidencia}
                onChange={(e) => onUpdate({ requiereEvidencia: e.target.checked })}
                className="w-4 h-4 text-[#003DA5] border-slate-300 rounded focus:ring-[#003DA5]"
                disabled={readOnly}
              />
              <span className="text-sm text-slate-700">Requiere evidencia</span>
            </label>
          </div>

          {/* Botones de ordenamiento */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp || readOnly}
              className="px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ↑ Subir
            </button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown || readOnly}
              className="px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ↓ Bajar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENTE: VISTA PREVIA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface VistaPreviaProps {
  codigo: string;
  nombre: string;
  descripcion: string;
  procesoAsociado: string;
  items: ItemLista[];
}

function VistaPrevia({
  codigo,
  nombre,
  descripcion,
  procesoAsociado,
  items,
}: VistaPreviaProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#E0EDFF] to-[#F0F7FF] rounded-lg p-6 border border-slate-200">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-xs font-mono text-[#003DA5] bg-white px-2 py-0.5 rounded">
            {codigo || "PLT-XXX"}
          </span>
          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
            Vista Previa
          </span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {nombre || "Nombre de la plantilla"}
        </h3>
        <p className="text-sm text-slate-600 mb-3">
          {descripcion || "Sin descripción"}
        </p>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-slate-600">Proceso:</span>
            <span className="ml-2 font-medium text-slate-900">
              {procesoAsociado || "Sin asignar"}
            </span>
          </div>
          <div>
            <span className="text-slate-600">Ítems:</span>
            <span className="ml-2 font-medium text-slate-900">{items.length}</span>
          </div>
        </div>
      </div>

      {/* Ítems */}
      <div className="space-y-3">
        <h4 className="font-semibold text-slate-900">Ítems de Verificación</h4>
        {items.length === 0 ? (
          <div className="bg-slate-50 rounded-lg p-8 text-center">
            <p className="text-slate-500">No hay ítems para previsualizar</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-sm font-mono text-slate-600 mt-0.5">
                  #{item.orden}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 mb-1">{item.titulo}</p>
                  {item.descripcion && (
                    <p className="text-sm text-slate-600 mb-2">{item.descripcion}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {item.tipoRespuesta === "cumple-no-cumple"
                        ? "Cumple/No Cumple/N/A"
                        : item.tipoRespuesta === "si-no"
                        ? "Sí/No"
                        : "Texto Libre"}
                    </span>
                    {item.esObligatorio && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        Obligatorio
                      </span>
                    )}
                    {item.requiereEvidencia && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        Evidencia
                      </span>
                    )}
                    {item.categoria && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        {item.categoria}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}