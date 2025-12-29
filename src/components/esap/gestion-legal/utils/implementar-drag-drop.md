# Guía de Implementación de Drag & Drop en Todos los Módulos Kanban

He implementado drag & drop completo en:

## ✅ Módulos con Drag & Drop FUNCIONAL:

1. **ProcesosCoactivosV3** ✓
2. **ModuloDefensaJudicialV3** ✓ (parcial - necesita drop en columnas)

## 📋 Módulos Pendientes:

3. ModuloJuzgamientoDisciplinarioV3
4. OrganosControl
5. ModuloTerminosInformesV3

## 🔧 Patrón de Implementación:

### 1. Imports necesarios:
```typescript
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
```

### 2. Definir ItemTypes:
```typescript
const ItemTypes = {
  ITEM: 'item'  // Cambiar según el módulo
};
```

### 3. Estado local en el componente principal:
```typescript
const [items, setItems] = useState(itemsMock);

const handleMoverItem = (itemId: string, nuevaEtapa: Etapa) => {
  setItems((prev) => 
    prev.map((item) => 
      item.id === itemId ? { ...item, etapa: nuevaEtapa } : item
    )
  );
  toast.success('Item movido exitosamente');
};
```

### 4. Envolver Kanban con DndProvider:
```tsx
<DndProvider backend={HTML5Backend}>
  {/* Contenido del Kanban */}
</DndProvider>
```

### 5. useDrag en Tarjetas:
```typescript
const [{ isDragging }, drag] = useDrag({
  type: ItemTypes.ITEM,
  item: { id: item.id },
  collect: (monitor) => ({
    isDragging: !!monitor.isDragging(),
  }),
});
```

### 6. useDrop en Columnas:
```typescript
const [{ isOver }, drop] = useDrop({
  accept: ItemTypes.ITEM,
  drop: (item: { id: string }) => onMoverItem(item.id, etapa.valor),
  collect: (monitor) => ({
    isOver: !!monitor.isOver(),
  }),
});
```

### 7. Aplicar refs y estilos:
```tsx
<Card ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
<div ref={drop} style={{ backgroundColor: isOver ? '#F0F7FF' : '#FFFFFF' }}>
```
