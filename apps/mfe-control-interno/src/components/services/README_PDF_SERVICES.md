# Servicios de Generación de PDF - Control Interno

## 📋 Descripción

Se han creado dos servicios separados para la generación de PDFs institucionales:

### 1. `pdfESAPHeader.ts` - Encabezado Institucional
Utilidades para generar el encabezado estándar ESAP según formato EM-PT-004:

```
+--------+---------------------------+-----------------+
| LOGO   | PROCEDIMIENTO             | CÓDIGO: EM-PT-004|
| ESAP   | AUDITORÍAS INTERNAS       | VERSIÓN: 3       |
|        |                           | FECHA: 24/Oct/25 |
+--------+---------------------------+-----------------+
| PROCESO: EVALUACIÓN CONTROL Y MEJORA                 |
+------------------------------------------------------+
```

### 2. `pdfAuditoriaDocs.ts` - Documentos de Auditoría
Lógica separada para generar los 4 documentos oficiales de inicio de auditorías:
- Oficio de Anuncio
- Carta de Representación OCI
- Carta de Compromiso OCI
- Programa Individual de Auditoría

---

## 🚀 Uso en Componentes React

### Importar Servicios

```typescript
import { 
  generarOficioAnuncio,
  generarCartaRepresentacion,
  generarCartaCompromiso,
  generarProgramaIndividual,
  descargarPDF,
  type DatosAuditoria 
} from './services/pdfAuditoriaDocs';

// También importar las imágenes institucionales
import logoESAP from '../../../assets/1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png';
```

### Preparar Datos de Auditoría

```typescript
const datosAuditoria: DatosAuditoria = {
  codigo: 'AUD-2026-001',
  nombre: 'Auditoría al Proceso de Contratación',
  tipo: 'Sede',
  areaAuditable: 'Gestión Contractual',
  procesoNombre: 'Gestión de Contratación',
  responsableArea: {
    nombre: 'Juan Pérez García',
    cargo: 'Jefe de Área de Contratación',
    email: 'juan.perez@esap.edu.co'
  },
  auditorLider: {
    nombre: 'María López Rodríguez',
    email: 'maria.lopez@esap.edu.co'
  },
  equipoAuditores: [
    { nombre: 'Carlos Martínez', email: 'carlos.martinez@esap.edu.co' },
    { nombre: 'Ana Silva', email: 'ana.silva@esap.edu.co' }
  ],
  fechaInicio: new Date('2026-03-01'),
  duracionDias: {
    planeacion: 10,
    ejecucion: 15,
    comunicacion: 5
  },
  alcance: 'Contratación de servicios y adquisición de bienes durante 2025',
  criteriosAuditoria: [
    'Ley 1474 de 2011 - Estatuto Anticorrupción',
    'Decreto 1082 de 2015 - Contratación Pública',
    'Manual de Contratación ESAP'
  ],
  logoImg: logoESAP  // ⚠️ IMPORTANTE: Incluir la imagen del logo
};
```

### Generar y Descargar un Documento

```typescript
const handleGenerarOficio = () => {
  try {
    // Generar el PDF
    const pdfDoc = generarOficioAnuncio(datosAuditoria);
    
    // Descargar
    descargarPDF(pdfDoc, `Oficio_Anuncio_${datosAuditoria.codigo}.pdf`);
    
    toast.success('Oficio generado exitosamente');
  } catch (error) {
    console.error('Error al generar oficio:', error);
    toast.error('Error al generar el documento');
  }
};
```

### Generar Todos los Documentos

```typescript
import { generarTodosLosDocumentos } from './services/pdfAuditoriaDocs';

const handleGenerarTodos = () => {
  try {
    generarTodosLosDocumentos(datosAuditoria);
    toast.success('Generando 4 documentos oficiales...');
  } catch (error) {
    console.error('Error:', error);
    toast.error('Error al generar los documentos');
  }
};
```

---

## 🛠️ API de Servicios

### `pdfESAPHeader.ts`

#### `dibujarEncabezadoInstitucional(doc, config, yInicio)`
Dibuja el encabezado estándar en un documento jsPDF.

**Parámetros:**
- `doc` (jsPDF): Documento PDF
- `config` (ConfiguracionDocumento): Configuración del encabezado
- `yInicio` (number, opcional): Posición Y inicial (default: 10)

**Retorna:** `number` - Posición Y donde termina el encabezado

**Ejemplo:**
```typescript
import { dibujarEncabezadoInstitucional } from './services/pdfESAPHeader';
import logoESAP from '../../../assets/1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png';

const doc = new jsPDF();
const yPos = dibujarEncabezadoInstitucional(doc, {
  codigo: 'EM-PT-004',
  version: 3,
  fecha: '24/Oct/2025',
  titulo: 'PROCEDIMIENTO AUDITORÍAS INTERNAS',
  proceso: 'EVALUACIÓN CONTROL Y MEJORA',
  logoImg: logoESAP  // ⚠️ IMPORTANTE
});

// Continuar con el contenido desde yPos...
```

#### `dibujarPieInstitucional(doc, numeroPagina, incluirContacto)`
Dibuja el pie de página institucional.

**Parámetros:**
- `doc` (jsPDF): Documento PDF
- `numeroPagina` (number): Número de página actual
- `incluirContacto` (boolean, opcional): Incluir info de contacto (default: true)

**Ejemplo:**
```typescript
dibujarPieInstitucional(doc, 1, true);
```

#### `agregarPaginaConEncabezado(doc, config, numeroPagina)`
Agrega una nueva página con encabezado y pie institucional.

**Retorna:** `number` - Posición Y donde inicia el contenido

**Ejemplo:**
```typescript
// Agregar nueva página con encabezado
const yPos = agregarPaginaConEncabezado(doc, {
  codigo: 'EM-PT-004',
  version: 3,
  fecha: '24/Oct/2025',
  logoImg: logoESAP
}, 2);
```

#### `DOCUMENTOS_PREDEFINIDOS`
Configuraciones predefinidas para documentos comunes:
- `CARTA_REPRESENTACION`
- `CARTA_COMPROMISO`
- `OFICIO_ANUNCIO`
- `PROGRAMA_INDIVIDUAL`
- `PLAN_ANUAL`

### `pdfAuditoriaDocs.ts`

#### `generarOficioAnuncio(auditoria)`
Genera el Oficio de Anuncio.

**Retorna:** `jsPDF` - Documento PDF generado

#### `generarCartaRepresentacion(auditoria)`
Genera la Carta de Representación del área auditada.

**Retorna:** `jsPDF` - Documento PDF generado

#### `generarCartaCompromiso(auditoria)`
Genera la Carta de Compromiso del auditor líder.

**Retorna:** `jsPDF` - Documento PDF generado

#### `generarProgramaIndividual(auditoria)`
Genera el Programa Individual de Auditoría.

**Retorna:** `jsPDF` - Documento PDF generado

#### `descargarPDF(doc, nombreArchivo)`
Descarga un documento PDF generado.

**Parámetros:**
- `doc` (jsPDF): Documento a descargar
- `nombreArchivo` (string): Nombre del archivo

#### `generarTodosLosDocumentos(auditoria)`
Genera y descarga automáticamente los 4 documentos oficiales.

---

## ✅ Ventajas de esta Arquitectura

### 🔄 Separación de Responsabilidades
- **Lógica de negocio** (generación de PDF) → `pdfAuditoriaDocs.ts`
- **Vista previa** (componente React) → `InicioAuditoriaWizard.tsx`
- **Utilidades comunes** (encabezado) → `pdfESAPHeader.ts`

### 🧪 Testeable
Los servicios se pueden probar independientemente sin necesidad del DOM o React.

### ♻️ Reutilizable
El encabezado institucional puede usarse en cualquier PDF de Control Interno:
- Plan Anual de Auditoría
- Informes de Auditoría
- Actas de Reunión OCI
- Certificaciones

### 📦 Mantenible
Si cambia el formato institucional, solo se actualiza `pdfESAPHeader.ts`.

---

## 🎨 Ejemplo Completo en Componente React

```tsx
import { useState } from 'react';
import { Button } from '../../ui/button';
import { Download, Eye } from 'lucide-react';
import {
  generarOficioAnuncio,
  generarCartaRepresentacion,
  descargarPDF,
  type DatosAuditoria
} from './services/pdfAuditoriaDocs';
import logoESAP from '../../../assets/1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png';

export function GeneradorDocumentosAuditoria() {
  const [loading, setLoading] = useState<string | null>(null);

  const datosAuditoria: DatosAuditoria = {
    codigo: 'AUD-2026-001',
    nombre: 'Auditoría Proceso Contratación',
    // ... resto de datos
    logoImg: logoESAP  // ⚠️ IMPORTANTE
  };

  const handleDescargarOficio = async () => {
    setLoading('oficio');
    try {
      const pdf = generarOficioAnuncio(datosAuditoria);
      descargarPDF(pdf, `Oficio_${datosAuditoria.codigo}.pdf`);
      toast.success('Oficio descargado');
    } catch (error) {
      toast.error('Error al generar oficio');
    } finally {
      setLoading(null);
    }
  };

  const handleDescargarCarta = async () => {
    setLoading('carta');
    try {
      const pdf = generarCartaRepresentacion(datosAuditoria);
      descargarPDF(pdf, `Carta_${datosAuditoria.codigo}.pdf`);
      toast.success('Carta descargada');
    } catch (error) {
      toast.error('Error al generar carta');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={handleDescargarOficio}
        disabled={loading === 'oficio'}
      >
        <Download className="w-4 h-4 mr-2" />
        Descargar Oficio de Anuncio
      </Button>

      <Button 
        onClick={handleDescargarCarta}
        disabled={loading === 'carta'}
      >
        <Download className="w-4 h-4 mr-2" />
        Descargar Carta de Representación
      </Button>
    </div>
  );
}
```

---

## ⚠️ Notas Importantes

1. **Logo ESAP**: Siempre incluir `logoImg` en los datos de auditoría para que aparezca en el encabezado.

2. **Fechas**: Las fechas deben ser objetos `Date` de JavaScript.

3. **Validación**: Los servicios no validan los datos de entrada. Validar en el componente antes de llamar a las funciones.

4. **Formato Institucional**: No modificar el formato del encabezado sin aprobación de Control Interno.

5. **Timeouts**: `generarTodosLosDocumentos()` usa timeouts para evitar bloquear el navegador con 4 descargas simultáneas.

---

## 🔜 Próximos Pasos

1. ✅ Crear servicios de encabezado y documentos
2. ⏳ Actualizar `InicioAuditoriaWizard.tsx` para usar los servicios
3. ⏳ Crear componente de vista previa separado
4. ⏳ Agregar tests unitarios a los servicios
5. ⏳ Implementar firma digital en PDFs
