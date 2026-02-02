# 🎯 CÓDIGO PARA AGREGAR EJES ESTRATÉGICOS EN CONFIGURACIONES

## 📋 Instrucciones

Este código debe agregarse al archivo `/components/esap/gestion-legal/modulos/ConfiguracionesSIGL.tsx`

---

## 1️⃣ PASO 1: Agregar "Plan de Acción" en el Sidebar

**Ubicación:** Dentro del `<div className="p-3 sm:p-4">` del sidebar, después de la sección "Módulos Kanban"

```tsx
{/* Después del cierre de la primera sección */}
</div>

{/* 🆕 AGREGAR ESTA SECCIÓN COMPLETA */}
<div className="p-3 sm:p-4 border-t border-gray-200">
  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 sm:mb-3">
    Configuraciones Globales
  </h3>
  <div className="space-y-1">
    <button
      onClick={() => setModuloActivo('plan-accion')}
      className={`w-full text-left px-3 py-2 sm:py-2.5 rounded-lg transition-colors ${ moduloActivo === 'plan-accion'
          ? 'bg-blue-50 text-blue-900 font-semibold'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4" />
        <span className="text-xs sm:text-sm">Plan de Acción</span>
      </div>
      <div className="flex items-center gap-2 mt-1 ml-6">
        <span className="text-xs text-gray-500">
          {ejesEstrategicos.filter(e => e.activo).length} ejes activos
        </span>
      </div>
    </button>
  </div>
</div>
```

---

## 2️⃣ PASO 2: Agregar el Panel de Gestión de Ejes Estratégicos

**Ubicación:** Dentro del `{/* Panel Principal */}`, agregar un condicional ANTES de `{moduloActual && (`

```tsx
{/* Panel Principal */}
<div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
  
  {/* 🆕 AGREGAR ESTA SECCIÓN COMPLETA - Panel de Plan de Acción */}
  {moduloActivo === 'plan-accion' && (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Configuración de Ejes Estratégicos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-3 sm:p-4 lg:p-6">
          <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                Ejes Estratégicos del PEI
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Configurar los ejes estratégicos que estarán disponibles en el formulario de Nuevo Indicador
              </p>
            </div>
            <button
              onClick={() => setShowModalAgregarEje(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
              style={{ 
                background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Eje</span>
            </button>
          </div>

          <div className="space-y-3">
            {ejesEstrategicos.map((eje, index) => (
              <div 
                key={eje.id}
                className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200"
              >
                {/* Fila 1: Orden + Ícono + Nombre + Eliminar */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center font-bold text-xs sm:text-sm text-gray-700 flex-shrink-0">
                    {index + 1}
                  </div>

                  <input
                    type="text"
                    value={eje.icono}
                    onChange={(e) => {
                      const nuevosEjes = ejesEstrategicos.map(e => 
                        e.id === eje.id ? { ...e, icono: e.target.value } : e
                      );
                      actualizarEjesEstrategicos(nuevosEjes);
                    }}
                    className="w-12 sm:w-14 px-2 py-1.5 text-center text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="🏛️"
                    maxLength={2}
                  />

                  <input
                    type="text"
                    value={eje.nombre}
                    onChange={(e) => {
                      const nuevosEjes = ejesEstrategicos.map(e => 
                        e.id === eje.id ? { ...e, nombre: e.target.value } : e
                      );
                      actualizarEjesEstrategicos(nuevosEjes);
                    }}
                    className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre del eje estratégico"
                  />

                  <button
                    onClick={() => {
                      setEjeAEliminar(eje);
                      setShowModalEliminarEje(true);
                    }}
                    className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Fila 2: Descripción */}
                <div className="mb-3">
                  <textarea
                    value={eje.descripcion}
                    onChange={(e) => {
                      const nuevosEjes = ejesEstrategicos.map(e => 
                        e.id === eje.id ? { ...e, descripcion: e.target.value } : e
                      );
                      actualizarEjesEstrategicos(nuevosEjes);
                    }}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Descripción del eje estratégico..."
                    rows={2}
                  />
                </div>

                {/* Fila 3: Color + Activo */}
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  {/* Color */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <label className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">
                      Color:
                    </label>
                    <input
                      type="color"
                      value={eje.color}
                      onChange={(e) => {
                        const nuevosEjes = ejesEstrategicos.map(e => 
                          e.id === eje.id ? { ...e, color: e.target.value } : e
                        );
                        actualizarEjesEstrategicos(nuevosEjes);
                      }}
                      className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                    />
                    <span className="text-xs text-gray-600">{eje.color}</span>
                  </div>

                  {/* Toggle Activo */}
                  <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={eje.activo}
                      onChange={(e) => {
                        const nuevosEjes = ejesEstrategicos.map(e => 
                          e.id === eje.id ? { ...e, activo: e.target.checked } : e
                        );
                        actualizarEjesEstrategicos(nuevosEjes);
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs sm:text-sm text-gray-700 font-medium">
                      Activo
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info adicional */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 bg-blue-50 border-l-4 border-blue-500">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                Información Importante
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Los ejes estratégicos se utilizan en el módulo de Plan de Acción</li>
                <li>• Solo los ejes activos aparecerán en el formulario de Nuevo Indicador</li>
                <li>• El ícono debe ser un emoji (copia y pega desde emojipedia.org)</li>
                <li>• Los cambios se guardarán al hacer click en "Guardar Cambios"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* YA EXISTE - Panel de módulos Kanban */}
  {moduloActual && (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ... resto del código existente ... */}
    </div>
  )}
</div>
```

---

## 3️⃣ PASO 3: Agregar Modal de Agregar Eje Estratégico

**Ubicación:** Junto con los otros modales, después del modal de eliminar tipo de auto

```tsx
{/* 🆕 AGREGAR ESTOS MODALES */}

{/* Modal: Agregar Eje Estratégico */}
{showModalAgregarEje && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Agregar Nuevo Eje Estratégico</h3>
            <p className="text-sm text-gray-600 mt-1">
              ¿Desea agregar un nuevo eje estratégico al Plan de Acción?
            </p>
          </div>
          <button
            onClick={() => setShowModalAgregarEje(false)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            Se creará un nuevo eje con valores predeterminados que podrá personalizar posteriormente. Estará disponible en el formulario de Nuevo Indicador PEI.
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setShowModalAgregarEje(false)}
            className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              const nuevoEje: EjeEstrategico = {
                id: `eje-${Date.now()}`,
                nombre: 'Nuevo Eje Estratégico',
                icono: '🎯',
                descripcion: 'Descripción del nuevo eje estratégico',
                color: '#2962FF',
                activo: true,
                orden: ejesEstrategicos.length + 1
              };
              actualizarEjesEstrategicos([...ejesEstrategicos, nuevoEje]);
              setShowModalAgregarEje(false);
              
              toast.success('Eje estratégico agregado correctamente', {
                description: 'Se ha agregado un nuevo eje al Plan de Acción',
                duration: 3000
              });
            }}
            className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
              boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
            }}
          >
            Agregar Eje
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* Modal: Eliminar Eje Estratégico */}
{showModalEliminarEje && ejeAEliminar && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Eliminar Eje Estratégico</h3>
            <p className="text-sm text-gray-600 mt-1">
              ¿Está seguro de eliminar el siguiente eje estratégico?
            </p>
          </div>
          <button
            onClick={() => setShowModalEliminarEje(false)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-red-900 mb-2">
            {ejeAEliminar.icono} {ejeAEliminar.nombre}
          </p>
          <p className="text-xs text-red-700 mb-3">
            {ejeAEliminar.descripcion}
          </p>
          <p className="text-sm text-red-800">
            <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer. Los indicadores asociados a este eje deberán ser reasignados a otro eje estratégico.
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setShowModalEliminarEje(false)}
            className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              const nuevosEjes = ejesEstrategicos.filter(e => e.id !== ejeAEliminar.id);
              actualizarEjesEstrategicos(nuevosEjes);
              setShowModalEliminarEje(false);
              setEjeAEliminar(null);
              
              toast.success('Eje estratégico eliminado correctamente', {
                description: `"${ejeAEliminar.nombre}" ha sido eliminado del Plan de Acción`,
                duration: 3000
              });
            }}
            className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all"
          >
            Eliminar Eje
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

---

## ✅ RESULTADO ESPERADO

Después de agregar este código, en el módulo de **Configuraciones del Sistema** verás:

### Sidebar:
- **Módulos Kanban** (ya existe)
  - Defensa Judicial
  - Tutelas y Derechos de Petición
  - Órganos de Control
  - etc.
- **Configuraciones Globales** (🆕 NUEVO)
  - **Plan de Acción** ← Al hacer click aquí se mostrará la gestión de ejes

### Panel Principal (al seleccionar "Plan de Acción"):
- Lista de los 4 ejes estratégicos predefinidos
- Cada eje permite editar:
  - Ícono (emoji)
  - Nombre
  - Descripción
  - Color
  - Estado (Activo/Inactivo)
- Botón "+ Agregar Eje" para crear nuevos ejes
- Botón de eliminar en cada eje

---

## 🐛 VERIFICACIÓN

1. Abre **Gestión Legal** → **Configuraciones del Sistema**
2. En el sidebar debería aparecer la nueva sección "Configuraciones Globales"
3. Click en "Plan de Acción"
4. Deberías ver los 4 ejes estratégicos con sus íconos, nombres y opciones de edición
5. Prueba editar un eje (cambiar el nombre)
6. Click en "Guardar Cambios" en el header
7. Recarga la página - los cambios deberían persistir

---

## 📝 NOTAS IMPORTANTES

- Los cambios se guardan en `localStorage` automáticamente
- El dropdown de "Eje Estratégico" en el formulario de Nuevo Indicador leerá dinámicamente estos ejes
- Solo los ejes con `activo: true` aparecerán en el formulario
- El orden se determina por el campo `orden` de cada eje
