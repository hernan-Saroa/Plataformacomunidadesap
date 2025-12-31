# 📱 PORTAL TRANSACCIONAL DE FIRMA ELECTRÓNICA

## 🎯 **VISTA DEL USUARIO: funcionario@esap.edu.co**

---

## 📋 **DESCRIPCIÓN GENERAL**

El **Portal Transaccional de Firma** es la interfaz donde los usuarios (administrativos, docentes, estudiantes) reciben y gestionan los documentos pendientes de firma que les han sido compartidos.

### **Usuario de Ejemplo:**
- **Nombre:** Juan Carlos Pérez
- **Email:** funcionario@esap.edu.co
- **Cargo:** Coordinador Académico
- **Tipo:** Administrativo

---

## 🖥️ **INTERFAZ PRINCIPAL**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📄 PORTAL TRANSACCIONAL                       👤 Juan Carlos Pérez   │
│  Documentos Pendientes de Firma                   funcionario@esap.edu.co│
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [📄 Total: 3]  [⏰ Pendientes: 2]  [👁️ Vistos: 1]  [✅ Firmados: 0]    │
│                 [↩️ Devueltos: 0]                                       │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  [🔍 Buscar documentos...]         [Todos los estados ▼]               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ⚠️ Tienes 2 documentos pendientes de firma                            │
│  Por favor revisa y firma los documentos a la mayor brevedad posible.   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  📄 ⏰ PENDIENTE - DOC-2024-001                        [⚠️ URGENTE]     │
│  Hace 2 horas                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Contrato de Prestación de Servicios Profesionales 2024            │ │
│  │ Contrato para servicios profesionales del primer trimestre 2024.  │ │
│  │ Requiere revisión y firma urgente.                                │ │
│  │                                                                    │ │
│  │ ID: DOC-2024-001  │  Tipo: Contrato                              │ │
│  │ Remitente: María González  │  Director Administrativa             │ │
│  │ Recibido: 23/12/2024  │  Límite: 30/12/2024 (3d)               │ │
│  │                                                                    │ │
│  │ 📄 12 páginas • 2.4 MB  │  🏷️ Prioridad: ALTA                   │ │
│  │                                                                    │ │
│  │ [👁️ Ver y Firmar]  [❌ Devolver con Comentarios]               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  📄 👁️ VISTO - DOC-2024-002                                             │
│  Hace 2 días                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Acta de Reunión Comité Académico - Noviembre 2024                 │ │
│  │ Acta de la última reunión del comité académico.                   │ │
│  │                                                                    │ │
│  │ ID: DOC-2024-002  │  Tipo: Acta                                  │ │
│  │ Remitente: Carlos Mendoza  │  Secretario Académico               │ │
│  │ Recibido: 20/12/2024  │  Límite: 27/12/2024                    │ │
│  │                                                                    │ │
│  │ 📄 8 páginas • 1.2 MB  │  🏷️ Prioridad: MEDIA                  │ │
│  │                                                                    │ │
│  │ [👁️ Ver y Firmar]  [❌ Devolver con Comentarios]               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 **FLUJO COMPLETO: FIRMAR DOCUMENTO**

### **PASO 1: Click en "Ver y Firmar"**

```
┌──────────────────────────────────────────────────────────────────┐
│  🔐 ACCESO SEGURO AL DOCUMENTO                               [×] │
│  Verifica tu identidad con el código de acceso                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ℹ️  Documento solicitado:                                       │
│  📄 Contrato de Prestación de Servicios Profesionales 2024     │
│      ID: DOC-2024-001                                           │
│      Remitente: María González                                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Ingresa tu código de acceso                               │ │
│  │  Se envió un código de 4 dígitos a tu correo electrónico  │ │
│  │                                                             │ │
│  │  📧 funcionario@esap.edu.co                                │ │
│  │                                                             │ │
│  │       ┌───┐ ┌───┐ ┌───┐ ┌───┐                              │ │
│  │       │ 7 │ │ 4 │ │ 8 │ │ 3 │                              │ │
│  │       └───┘ └───┘ └───┘ └───┘                              │ │
│  │                                                             │ │
│  │  ⚠️  Tienes 3 intentos restantes                           │ │
│  │                                                             │ │
│  │  📧 ¿No recibiste el código? Reenviar                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  🔧 Modo Desarrollo: Código de prueba: 7483                     │
│                                                                  │
│  [Cancelar]                             [✓ Verificar Código]    │
└──────────────────────────────────────────────────────────────────┘
```

**Características:**
- ✅ Inputs auto-focus con tabulación automática
- ✅ Solo acepta números
- ✅ Soporte para pegar código (Ctrl+V)
- ✅ Límite de 3 intentos
- ✅ Bloqueo temporal después de 3 fallos
- ✅ Botón reenviar código

---

### **PASO 2: Visualizar Documento**

Una vez validado el código de 4 dígitos:

```
┌──────────────────────────────────────────────────────────────────┐
│  👁️ VISTA DEL DOCUMENTO                    [📥 Descargar]   [×] │
│  Contrato de Prestación de Servicios Profesionales 2024         │
├──────────────────────────────────────────────────────────────────┤
│  [████████████░░░░░░░░] Paso 1/4                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│      📄 Vista Previa del Documento                              │
│                                                                  │
│      [ÁREA DE VISUALIZACIÓN DEL PDF]                            │
│                                                                  │
│      ID: DOC-2024-001                                           │
│      Tipo: Contrato                                             │
│      Tamaño: 2.4 MB                                             │
│      Fecha: 23/12/2024                                          │
│                                                                  │
│      📄 El visor de PDF se integraría aquí                      │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  Revisa el documento antes de firmar                            │
│  [Cancelar] [↩️ Devolver con Comentarios] [✍️ Continuar a Firma]│
└──────────────────────────────────────────────────────────────────┘
```

**Opciones disponibles:**
1. **Descargar:** Descarga el PDF
2. **Devolver con Comentarios:** Rechaza y envía comentarios
3. **Continuar a Firma:** Procede al proceso de firma

---

### **PASO 3A: Firmar Documento**

Si el usuario elige "Continuar a Firma":

```
┌──────────────────────────────────────────────────────────────────┐
│  ✍️ FIRMA DIGITAL                                            [×] │
│  Contrato de Prestación de Servicios Profesionales 2024         │
├──────────────────────────────────────────────────────────────────┤
│  [████████████████████████░░░░░░░░] Paso 2/4                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ℹ️  Instrucciones de Firma                                      │
│  Dibuja tu firma en el recuadro usando el mouse o tu dedo.      │
│  Esta firma será vinculada legalmente al documento.             │
│                                                                  │
│  ✍️ Dibuja tu Firma Digital                                      │
│  Firma en el área gris a continuación                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │         [ÁREA DE CANVAS PARA DIBUJAR FIRMA]               │ │
│  │                                                            │ │
│  │         [Firma del usuario dibujada]                      │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [🗑️ Limpiar Firma]                      ✓ Firma capturada     │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  Dibuja tu firma para continuar                                 │
│  [Volver]                        [🛡️ Continuar a Verificación]  │
└──────────────────────────────────────────────────────────────────┘
```

**Características:**
- ✅ Canvas HTML5 interactivo
- ✅ Soporte mouse y touch (táctil)
- ✅ Botón limpiar firma
- ✅ Validación de firma no vacía

---

### **PASO 3B: Devolver Documento (Alternativa)**

Si el usuario elige "Devolver con Comentarios":

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ↩️ DEVOLVER DOCUMENTO CON COMENTARIOS                               [×] │
│  Explica el motivo de la devolución para que el remitente pueda corregir │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📄 Documento a devolver:                                               │
│  Nombre: Contrato de Prestación de Servicios Profesionales 2024        │
│  ID: DOC-2024-001                                                       │
│  Remitente: María González - Directora Administrativa                  │
│                                                                          │
│  ⚠️ Importante antes de devolver:                                       │
│  • El remitente será notificado inmediatamente                         │
│  • Tus comentarios serán visibles para el remitente                    │
│  • El documento volverá al remitente para correcciones                 │
│  • Debes proporcionar comentarios claros y específicos                 │
│                                                                          │
│  ──────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  Motivo de Devolución *                                                 │
│  ┌─────────────────────┐  ┌────────────────────────┐                   │
│  │✓ Información        │  │  Datos incorrectos     │                   │
│  │  incompleta         │  │                        │                   │
│  └─────────────────────┘  └────────────────────────┘                   │
│  ┌─────────────────────┐  ┌────────────────────────┐                   │
│  │  Requiere           │  │  Falta documentación   │                   │
│  │  modificaciones     │  │  adjunta               │                   │
│  └─────────────────────┘  └────────────────────────┘                   │
│  ┌─────────────────────┐  ┌────────────────────────┐                   │
│  │  No corresponde     │  │  Otro motivo           │                   │
│  │  a mi área          │  │                        │                   │
│  └─────────────────────┘  └────────────────────────┘                   │
│                                                                          │
│  Comentarios Detallados *                                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ El documento presenta las siguientes observaciones:              │   │
│  │                                                                   │   │
│  │ 1. En la cláusula tercera, falta especificar el plazo de        │   │
│  │    ejecución.                                                     │   │
│  │ 2. El valor del contrato no coincide con el presupuesto         │   │
│  │    aprobado.                                                      │   │
│  │ 3. Falta anexar el certificado de disponibilidad presupuestal.   │   │
│  │                                                                   │   │
│  │ Por favor, corregir estos puntos y reenviar el documento.       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│  245 / 1000 caracteres • Mínimo 20 caracteres ✓ Comentario suficiente  │
│                                                                          │
│  📊 Resumen de Devolución                                               │
│  Documento: DOC-2024-001                                                │
│  Se notificará a: María González                                        │
│  Motivo: Información incompleta                                         │
│  Método: Correo electrónico                                             │
│                                                                          │
│  ──────────────────────────────────────────────────────────────────────  │
│  * Campos obligatorios                                                  │
│  [Cancelar]                                    [📤 Devolver Documento]  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Validaciones:**
- ✅ Motivo obligatorio
- ✅ Comentarios mínimo 20 caracteres
- ✅ Confirmación antes de enviar
- ✅ Notificación automática al remitente

**Después de devolver:**
```
✅ Documento devuelto exitosamente
Se notificó a María González sobre tu devolución

🔔 El remitente recibirá un email con:
- Tu motivo de devolución
- Tus comentarios detallados
- Enlace para corregir y reenviar
```

---

### **PASO 4: Verificación OTP (Continuación de Firma)**

```
┌──────────────────────────────────────────────────────────────────┐
│  🛡️ VERIFICACIÓN DE SEGURIDAD                                [×] │
│  Contrato de Prestación de Servicios Profesionales 2024         │
├──────────────────────────────────────────────────────────────────┤
│  [████████████████████████████████████░░] Paso 3/4              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│      🛡️ VERIFICACIÓN DE SEGURIDAD                               │
│                                                                  │
│      Se ha enviado un código de verificación a:                 │
│      📧 funcionario@esap.edu.co                                 │
│                                                                  │
│      Ingresa el código de 6 dígitos para confirmar tu firma    │
│                                                                  │
│      ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                      │
│      │ 8 │ │ 5 │ │ 6 │ │ 2 │ │ 3 │ │ 4 │                      │
│      └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                      │
│                                                                  │
│      Tiempo restante: 4:52                                      │
│                                                                  │
│      📧 Reenviar código                                         │
│                                                                  │
│      💡 Modo Desarrollo:                                        │
│      El código OTP se muestra en la consola                     │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  Verifica tu identidad con el código OTP                        │
│  [Volver]                          [✅ Verificar y Firmar]      │
└──────────────────────────────────────────────────────────────────┘
```

**Consola muestra:**
```
🔐 OTP GENERADO PARA FIRMA:
Usuario: Juan Carlos Pérez
Email: funcionario@esap.edu.co
Código: 856234
Válido por: 5 minutos
```

---

### **PASO 5: Firma Completada**

```
┌──────────────────────────────────────────────────────────────────┐
│  ✅ FIRMA COMPLETADA                                         [×] │
│  Contrato de Prestación de Servicios Profesionales 2024         │
├──────────────────────────────────────────────────────────────────┤
│  [████████████████████████████████████████████] Paso 4/4        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│            ┌─────────────────────────┐                          │
│            │          ✓              │                          │
│            │                         │                          │
│            │   ¡Firma Registrada    │                          │
│            │    Exitosamente!        │                          │
│            └─────────────────────────┘                          │
│                                                                  │
│      Tu firma digital ha sido validada y registrada             │
│                                                                  │
│      Documento: DOC-2024-001                                    │
│      Fecha y Hora: 26/12/2024 14:35                            │
│      Firmante Verificado: Juan Carlos Pérez                    │
│                                                                  │
│      🛡️ Firma validada con certificación digital ESAP          │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  Proceso completado exitosamente                [Cerrar]       │
└──────────────────────────────────────────────────────────────────┘
```

**Notificaciones enviadas:**

**Email a Juan Carlos (quien firmó):**
```
✅ Has firmado el documento DOC-2024-001
📄 Adjunto: Certificado de firma digital
🔐 Hash SHA-256: a3f8e9d2...
```

**Email a María (quien compartió):**
```
🔔 Juan Carlos Pérez ha firmado el documento DOC-2024-001
📊 Progreso: 1 de 3 firmas completadas (33%)
⏰ Pendientes: Ana Martínez, Carlos Mendoza
```

---

## 📊 **ESTADOS DE DOCUMENTOS**

### **1️⃣ PENDIENTE (Naranja)**
```
⏰ PENDIENTE - No ha sido abierto
- Usuario no ha ingresado el código de acceso
- Alertas de urgencia si faltan pocos días
```

### **2️⃣ VISTO (Azul)**
```
👁️ VISTO - Documento visualizado pero no firmado
- Usuario ingresó código y vio el documento
- Aún no ha firmado
```

### **3️⃣ FIRMADO (Verde)**
```
✅ FIRMADO - Proceso completado
- Firma digital registrada
- Certificado generado
- No se puede modificar
```

### **4️⃣ DEVUELTO (Púrpura)**
```
↩️ DEVUELTO - Documento rechazado con comentarios
- Usuario devolvió con observaciones
- Remitente fue notificado
- Documento vuelve al remitente para corrección
```

---

## 🔍 **FILTROS Y BÚSQUEDA**

### **Barra de Búsqueda:**
```
🔍 Buscar documentos por nombre, ID o remitente...
```

### **Filtro por Estado:**
```
[Todos los estados ▼]
- Todos los estados
- Pendientes
- Vistos
- Firmados
- Devueltos
```

---

## ⚡ **CARACTERÍSTICAS PREMIUM**

### **1. Alertas de Urgencia**
```
⚠️ URGENTE - Documentos que vencen en 3 días o menos
- Border rojo
- Badge "URGENTE"
- Días restantes visibles
```

### **2. Contadores en Tiempo Real**
```
📊 KPI Cards en el header:
- Total de documentos
- Pendientes de firma
- Vistos
- Firmados
- Devueltos
```

### **3. Notificaciones Push**
```
🔔 Tienes 2 documentos pendientes de firma
Por favor revisa y firma los documentos a la mayor brevedad.
```

### **4. Responsive Design**
```
✅ Desktop: Vista completa con grid
✅ Tablet: Cards optimizadas
✅ Mobile: Stack vertical, touch-optimized
```

---

## 🔐 **SEGURIDAD IMPLEMENTADA**

### **Doble Factor de Autenticación:**
1. **Código de 4 dígitos** → Acceso al documento
2. **OTP de 6 dígitos** → Confirmación de firma

### **Trazabilidad:**
- IP de acceso registrada
- Dispositivo utilizado
- Fecha y hora exacta
- Hash del documento
- Hash de la firma

### **Límites de Seguridad:**
- 3 intentos máximo para código de acceso
- Bloqueo temporal de 15 minutos
- OTP válido por 5 minutos
- Reenvío de código cada 60 segundos

---

## 📧 **EMAILS AUTOMATIZADOS**

### **Email de Documento Compartido:**
```
De: Sistema ESAP <noreply@esap.edu.co>
Para: funcionario@esap.edu.co
Asunto: [ESAP] Documento pendiente de firma

Hola Juan Carlos Pérez,

María González te ha compartido un documento para firma:

📄 Contrato de Prestación de Servicios Profesionales 2024
ID: DOC-2024-001

🔐 TU CÓDIGO DE ACCESO: 7483
Válido por 72 horas

[Ver Documento]

Instrucciones:
1. Click en "Ver Documento"
2. Ingresa código: 7483
3. Revisa el documento
4. Firma digitalmente
5. Confirma con OTP de 6 dígitos
```

### **Email de Firma Completada:**
```
De: Sistema ESAP <noreply@esap.edu.co>
Para: funcionario@esap.edu.co
Asunto: [ESAP] Firma registrada exitosamente

Hola Juan Carlos Pérez,

✅ Has firmado exitosamente el documento:
📄 DOC-2024-001 - Contrato de Prestación de Servicios

Detalles:
- Fecha: 26/12/2024 14:35
- Método: Firma Digital + OTP
- Hash: a3f8e9d2...

Adjunto:
📄 Certificado de firma digital
```

### **Email de Documento Devuelto:**
```
De: Sistema ESAP <noreply@esap.edu.co>
Para: maria.gonzalez@esap.edu.co
Asunto: [ESAP] Documento devuelto con comentarios

Hola María González,

↩️ Juan Carlos Pérez ha devuelto el documento:
📄 DOC-2024-001 - Contrato de Prestación de Servicios

Motivo: Información incompleta

Comentarios:
"El documento presenta las siguientes observaciones:
1. En la cláusula tercera, falta especificar el plazo...
2. El valor del contrato no coincide...
3. Falta anexar el certificado..."

[Ver Comentarios Completos]
```

---

## 🎯 **CASOS DE USO REALES**

### **Caso 1: Firma Rápida**
```
1. Usuario recibe email con código 7483
2. Entra al portal → Click "Ver y Firmar"
3. Ingresa código 7483 → Validado ✓
4. Ve documento → Click "Continuar a Firma"
5. Dibuja firma → Click "Continuar a Verificación"
6. Recibe OTP 856234 en email
7. Ingresa OTP → Verificado ✓
8. Firma completada ✅

Tiempo total: ~2 minutos
```

### **Caso 2: Devolución con Comentarios**
```
1. Usuario recibe documento
2. Ingresa código de acceso
3. Revisa documento → Encuentra errores
4. Click "Devolver con Comentarios"
5. Selecciona motivo: "Información incompleta"
6. Escribe comentarios detallados (250 caracteres)
7. Click "Devolver Documento"
8. Sistema notifica al remitente
9. Documento vuelve al remitente

Tiempo total: ~5 minutos
```

### **Caso 3: Documento Urgente**
```
1. Usuario ve alerta: "⚠️ URGENTE - Vence en 2 días"
2. Prioriza ese documento
3. Firma inmediatamente
4. Remitente recibe notificación
5. Proceso acelerado completado

Urgencia visible en todo momento
```

---

## ✅ **VENTAJAS DEL SISTEMA**

### **Para el Usuario:**
- ✅ Interfaz simple y clara
- ✅ Solo 2 acciones: Firmar o Devolver
- ✅ Sin complejidad innecesaria
- ✅ Mobile-friendly
- ✅ Notificaciones claras
- ✅ Trazabilidad visible

### **Para la Organización:**
- ✅ 100% paperless
- ✅ Seguridad enterprise
- ✅ Trazabilidad completa
- ✅ Cumplimiento normativo
- ✅ Flujos eficientes
- ✅ Reducción de tiempos

---

## 🚀 **RESULTADO FINAL**

El Portal Transaccional de Firma Electrónica ESAP proporciona:

1. **Experiencia de Usuario Premium**
   - Interfaz limpia y profesional
   - Flujo intuitivo de 4 pasos
   - Feedback visual constante

2. **Seguridad World-Class**
   - Doble factor de autenticación
   - Trazabilidad completa
   - Cumplimiento normativo

3. **Eficiencia Operativa**
   - Firma en 2 minutos
   - Devoluciones con comentarios claros
   - Notificaciones automáticas

4. **Diseño Corporativo ESAP**
   - Colores institucionales
   - Tipografía oficial
   - Responsive y mobile-first

**Un sistema de firma electrónica comparable a DocuSign o Adobe Sign, pero diseñado específicamente para las necesidades de ESAP.** 🎯✨

---

*Generado: 26 de Diciembre de 2024*  
*Portal Transaccional ESAP - Versión 2.0.0*
