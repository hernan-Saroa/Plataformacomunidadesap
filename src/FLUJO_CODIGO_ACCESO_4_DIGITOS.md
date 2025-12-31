# 🔐 SISTEMA DE CÓDIGO DE ACCESO DE 4 DÍGITOS

## 📋 **FLUJO COMPLETO DE SEGURIDAD**

El sistema de Firma Electrónica de ESAP implementa **doble capa de seguridad**:

1. **Código de Acceso de 4 dígitos** → Para acceder al documento
2. **OTP de 6 dígitos** → Para confirmar la firma

---

## 🔄 **FLUJO PASO A PASO**

### **PASO 1: Compartir Documento** 📤

**Usuario que comparte (Ej: María González):**

1. Sube documento a la plataforma
2. Click en botón "Compartir"
3. Agrega firmantes:
   ```
   Firmante 1:
   - Nombre: Carlos Mendoza
   - Cargo: Director Jurídico
   - Correo: carlos.mendoza@esap.gov.co
   
   Firmante 2:
   - Nombre: Ana Martínez
   - Cargo: Directora General
   - Correo: ana.martinez@esap.gov.co
   ```
4. (Opcional) Agrega mensaje personalizado
5. Click "Compartir Documento"

**Sistema automáticamente:**
- ✅ Genera código de 4 dígitos único para cada firmante
- ✅ Envía email a cada correo con:
  - Link al documento
  - Código de acceso de 4 dígitos
  - Mensaje personalizado (si existe)
  - Instrucciones de uso

**Consola muestra (modo desarrollo):**
```
🔐 CÓDIGOS DE ACCESO GENERADOS:
1. Carlos Mendoza (carlos.mendoza@esap.gov.co): 7483
2. Ana Martínez (ana.martinez@esap.gov.co): 2156
```

---

### **PASO 2: Correo Recibido** 📧

**Email que recibe cada firmante:**

```
┌────────────────────────────────────────────────────┐
│ De: Sistema ESAP <noreply@esap.gov.co>            │
│ Para: carlos.mendoza@esap.gov.co                  │
│ Asunto: [ESAP] Documento pendiente de firma       │
├────────────────────────────────────────────────────┤
│                                                    │
│ Hola Carlos Mendoza,                              │
│                                                    │
│ María González te ha compartido el documento:      │
│                                                    │
│ 📄 Contrato de Prestación de Servicios           │
│    ID: DOC-2024-001                               │
│    Tipo: Contrato                                 │
│                                                    │
│ ┌──────────────────────────────────────────┐      │
│ │  🔐 TU CÓDIGO DE ACCESO                  │      │
│ │                                          │      │
│ │         7  4  8  3                       │      │
│ │                                          │      │
│ │  Este código es único y personal        │      │
│ │  Válido por 72 horas                     │      │
│ └──────────────────────────────────────────┘      │
│                                                    │
│ Mensaje de María González:                        │
│ "Por favor revisa y firma a la mayor brevedad"    │
│                                                    │
│ [Ver Documento]  ← Link al sistema                │
│                                                    │
│ Instrucciones:                                     │
│ 1. Click en "Ver Documento"                       │
│ 2. Ingresa tu código de 4 dígitos: 7483          │
│ 3. Revisa el documento                            │
│ 4. Firma con tu rúbrica digital                   │
│ 5. Confirma con código OTP de 6 dígitos          │
│                                                    │
│ Si no solicitaste esto, ignora este correo.       │
│                                                    │
│ Saludos,                                          │
│ Sistema de Firma Electrónica ESAP                 │
└────────────────────────────────────────────────────┘
```

---

### **PASO 3: Acceso al Documento** 🔓

**Firmante hace click en el link:**

```
┌─────────────────────────────────────────────────────┐
│  🔐 ACCESO SEGURO AL DOCUMENTO                      │
│  Verifica tu identidad                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📄 Contrato de Prestación de Servicios            │
│     ID: DOC-2024-001                                │
│                                                     │
│  Ingresa tu código de acceso de 4 dígitos:         │
│                                                     │
│       ┌───┐ ┌───┐ ┌───┐ ┌───┐                      │
│       │ 7 │ │ 4 │ │ 8 │ │ 3 │                      │
│       └───┘ └───┘ └───┘ └───┘                      │
│                                                     │
│  ℹ️  Revisa tu correo: carlos.mendoza@esap.gov.co  │
│                                                     │
│  ⚠️  Tienes 3 intentos restantes                   │
│                                                     │
│  [Verificar Código]                                 │
│                                                     │
│  ¿No recibiste el código? [Reenviar]               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Sistema valida:**
- ✅ Código correcto → Acceso concedido
- ❌ Código incorrecto → "Código inválido, 2 intentos restantes"
- ❌ 3 intentos fallidos → Bloqueo temporal (15 minutos)

---

### **PASO 4: Visualización del Documento** 👁️

**Una vez validado el código de 4 dígitos:**

```
┌─────────────────────────────────────────────────────┐
│  ✅ Código verificado correctamente                 │
│  Bienvenido, Carlos Mendoza                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [PDF Preview del documento]                        │
│                                                     │
│  ────────────────────────────────────────          │
│  │ CONTRATO DE PRESTACIÓN DE SERVICIOS │          │
│  │                                     │          │
│  │ Entre... [contenido del PDF]...    │          │
│  │                                     │          │
│  ────────────────────────────────────────          │
│                                                     │
│  Página 1 de 5                                      │
│                                                     │
│  [< Anterior]  [Siguiente >]                        │
│                                                     │
│  [Descargar PDF]  [Continuar a Firma]              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**El firmante puede:**
- ✅ Ver todas las páginas del documento
- ✅ Descargar una copia
- ✅ Continuar al proceso de firma

---

### **PASO 5: Proceso de Firma Digital** ✍️

**Click en "Continuar a Firma":**

```
┌─────────────────────────────────────────────────────┐
│  ✍️ FIRMA DIGITAL                                   │
│  Dibuja tu firma con el mouse o dedo (táctil)       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Canvas interactivo para dibujar firma]            │
│  ┌─────────────────────────────────────────┐       │
│  │                                         │       │
│  │     [Firma dibujada por el usuario]     │       │
│  │                                         │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
│  O selecciona una firma guardada:                   │
│  [Firma Oficial] [Firma Rápida] [+ Nueva]          │
│                                                     │
│  [Limpiar]  [Volver]  [Continuar a Verificación]   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### **PASO 6: Verificación OTP de 6 Dígitos** 🔐

**Sistema genera y envía OTP:**

```
┌─────────────────────────────────────────────────────┐
│  🔒 VERIFICACIÓN DE SEGURIDAD                       │
│  Firma Digital                                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│        🛡️ VERIFICACIÓN DE SEGURIDAD                 │
│                                                     │
│  Se ha enviado un código de verificación a:         │
│  📧 carlos.mendoza@esap.gov.co                      │
│                                                     │
│  Ingresa el código de 6 dígitos:                    │
│                                                     │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐             │
│  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │             │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘             │
│                                                     │
│  Tiempo restante: 4:52                              │
│                                                     │
│  📧 Reenviar código                                 │
│                                                     │
│  ⚠️ Modo Desarrollo: Código mostrado en consola    │
│                                                     │
│  [Volver]  [✓ Verificar y Firmar]                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Consola muestra (modo desarrollo):**
```
🔐 OTP GENERADO PARA FIRMA:
Usuario: Carlos Mendoza
Email: carlos.mendoza@esap.gov.co
Código: 856234
Válido por: 5 minutos
```

---

### **PASO 7: Confirmación de Firma** ✅

**Firma exitosa:**

```
┌─────────────────────────────────────────────────────┐
│  ✅ ¡FIRMA COMPLETADA EXITOSAMENTE!                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│           ┌─────────────────┐                       │
│           │        ✓        │                       │
│           │                 │                       │
│           │  Documento      │                       │
│           │   Firmado       │                       │
│           └─────────────────┘                       │
│                                                     │
│  Documento: Contrato de Prestación de Servicios    │
│  ID: DOC-2024-001                                   │
│                                                     │
│  Tu firma ha sido registrada exitosamente           │
│                                                     │
│  Detalles de la firma:                              │
│  • Firmante: Carlos Mendoza                         │
│  • Cargo: Director Jurídico                         │
│  • Fecha: 26/12/2024                                │
│  • Hora: 14:35 PM                                   │
│  • Método: Firma Digital + OTP                      │
│  • IP: 192.168.1.105                                │
│                                                     │
│  Recibirás una copia del documento firmado          │
│  en tu correo electrónico.                          │
│                                                     │
│  [Descargar Certificado]  [Cerrar]                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### **PASO 8: Notificaciones Automáticas** 📬

**Email a Carlos (quien firmó):**
```
✅ Has firmado el documento DOC-2024-001
📄 Adjunto: Certificado de firma digital
🔐 Hash SHA-256: a3f8e9d2...
```

**Email a María (quien compartió):**
```
🔔 Carlos Mendoza ha firmado el documento DOC-2024-001
📊 Progreso: 1 de 3 firmas completadas (33%)
⏰ Pendientes: Ana Martínez
```

---

## 🔒 **CAPAS DE SEGURIDAD**

### **Nivel 1: Código de Acceso (4 dígitos)**
- **Propósito:** Verificar identidad antes de ver el documento
- **Vigencia:** 72 horas
- **Intentos:** 3 intentos máximo
- **Bloqueo:** 15 minutos después de 3 fallos
- **Correo:** Directorio Activo o correo ingresado al compartir

### **Nivel 2: OTP de Firma (6 dígitos)**
- **Propósito:** Confirmar la firma digital
- **Vigencia:** 5 minutos
- **Intentos:** 3 intentos máximo
- **Reenvío:** Permitido cada 60 segundos
- **Correo:** Mismo del código de acceso

### **Nivel 3: Trazabilidad Completa**
- **Registros:**
  - IP de acceso
  - Dispositivo utilizado
  - Fecha y hora exacta
  - Geolocalización (opcional)
  - Hash del documento
  - Hash de la firma

---

## 📊 **TRAZABILIDAD DEL DOCUMENTO**

**Timeline completo registrado:**

```
📍 23/12/2024 09:15 AM - Documento creado
   Usuario: María González
   IP: 192.168.1.100
   Dispositivo: Web - Chrome

📍 23/12/2024 09:20 AM - Código de acceso enviado
   Destinatario: carlos.mendoza@esap.gov.co
   Código: 7483
   Válido hasta: 26/12/2024 09:20 AM

📍 23/12/2024 10:15 AM - Código de acceso utilizado
   Usuario: Carlos Mendoza
   IP: 192.168.1.105
   Dispositivo: Web - Safari
   Intentos: 1/3 (exitoso)

📍 23/12/2024 10:16 AM - Documento visualizado
   Usuario: Carlos Mendoza
   Páginas vistas: 5/5
   Tiempo de lectura: 12 minutos

📍 23/12/2024 10:30 AM - Firma iniciada
   Usuario: Carlos Mendoza
   Tipo: Firma dibujada manualmente

📍 23/12/2024 10:30 AM - OTP enviado
   Código: 856234
   Email: carlos.mendoza@esap.gov.co

📍 23/12/2024 10:31 AM - OTP validado
   Usuario: Carlos Mendoza
   Intentos: 1/3 (exitoso)

📍 23/12/2024 10:31 AM - Documento firmado
   Usuario: Carlos Mendoza
   Hash firma: 8f7e2c1d...
   Hash documento: a3f8e9d2...
   Método: Firma Digital + OTP
```

---

## 🎯 **CASOS DE USO**

### **Caso 1: Firma Individual**
1. Usuario sube documento
2. Sistema genera código de 4 dígitos
3. Envía email al usuario
4. Usuario ingresa código → ve documento
5. Usuario firma → recibe OTP
6. Usuario ingresa OTP → firma confirmada

### **Caso 2: Firma Múltiple (Workflow)**
1. Usuario comparte con 3 firmantes
2. Sistema genera 3 códigos únicos de 4 dígitos
3. Envía 3 emails personalizados
4. Firmante 1 completa proceso → Notificación
5. Firmante 2 completa proceso → Notificación
6. Firmante 3 completa proceso → Documento completado
7. Todos reciben certificado final

### **Caso 3: Código Expirado**
1. Usuario recibe email con código
2. Espera más de 72 horas
3. Intenta acceder → "Código expirado"
4. Sistema muestra: "Solicita nuevo código al remitente"
5. Remitente puede reenviar desde la plataforma

### **Caso 4: Código Incorrecto**
1. Usuario ingresa código incorrecto
2. Sistema: "Código inválido, 2 intentos restantes"
3. Usuario ingresa código incorrecto nuevamente
4. Sistema: "Código inválido, 1 intento restante"
5. Usuario ingresa código incorrecto por tercera vez
6. Sistema: "Bloqueado por 15 minutos"

---

## 💻 **INTEGRACIÓN CON BACKEND**

### **API de Generación de Código:**
```typescript
POST /api/firma/generar-codigo-acceso
Body: {
  documentoId: "DOC-2024-001",
  firmante: {
    nombre: "Carlos Mendoza",
    cargo: "Director Jurídico",
    email: "carlos.mendoza@esap.gov.co"
  }
}

Response: {
  success: true,
  codigoAcceso: "7483",
  validoHasta: "2024-12-26T09:20:00Z",
  emailEnviado: true
}
```

### **API de Validación de Código:**
```typescript
POST /api/firma/validar-codigo-acceso
Body: {
  documentoId: "DOC-2024-001",
  email: "carlos.mendoza@esap.gov.co",
  codigoAcceso: "7483"
}

Response: {
  success: true,
  tokenAcceso: "eyJhbGciOiJIUzI1NiIs...",
  firmante: {
    nombre: "Carlos Mendoza",
    cargo: "Director Jurídico"
  },
  documento: {
    id: "DOC-2024-001",
    nombre: "Contrato...",
    url: "https://..."
  }
}
```

### **API de Generación OTP:**
```typescript
POST /api/firma/generar-otp
Body: {
  documentoId: "DOC-2024-001",
  email: "carlos.mendoza@esap.gov.co",
  firmaData: "[base64 de la firma dibujada]"
}

Response: {
  success: true,
  otpId: "otp-123456",
  validoHasta: "2024-12-26T10:36:00Z",
  emailEnviado: true
}
```

### **API de Validación OTP y Firma Final:**
```typescript
POST /api/firma/validar-otp-y-firmar
Body: {
  documentoId: "DOC-2024-001",
  otpId: "otp-123456",
  otp: "856234",
  firmaData: "[base64 de la firma]"
}

Response: {
  success: true,
  firmaId: "firma-789",
  certificado: {
    url: "https://...",
    hash: "a3f8e9d2...",
    timestamp: "2024-12-26T10:31:00Z"
  },
  documentoCompletado: false,
  progresoFirmas: "1/3"
}
```

---

## 🔐 **SEGURIDAD Y CUMPLIMIENTO**

### **Normativas:**
- ✅ Ley 527 de 1999 (Firma Digital en Colombia)
- ✅ Decreto 2364 de 2012 (Firma Electrónica)
- ✅ GDPR (Protección de datos)
- ✅ ISO 27001 (Seguridad de la información)

### **Características de Seguridad:**
- ✅ Códigos únicos no reutilizables
- ✅ Expiración automática
- ✅ Límite de intentos
- ✅ Bloqueo temporal
- ✅ Registro completo de trazabilidad
- ✅ Hash SHA-256 de documentos
- ✅ Timestamp certificado
- ✅ Almacenamiento encriptado
- ✅ Transmisión HTTPS/TLS
- ✅ Auditoría completa

---

## ✅ **RESUMEN EJECUTIVO**

**Este sistema implementa:**

1. **Doble Factor de Autenticación:**
   - Código de 4 dígitos (acceso)
   - OTP de 6 dígitos (firma)

2. **Correos del Directorio Activo o Ingresados:**
   - Prioridad: Directorio Activo
   - Fallback: Correo ingresado al compartir
   - Validación de formato email

3. **Trazabilidad 100% Completa:**
   - Cada acción registrada
   - Timestamp certificado
   - Geolocalización e IP
   - Hash de integridad

4. **Seguridad Enterprise:**
   - Códigos únicos
   - Expiración automática
   - Bloqueo por intentos
   - Encriptación end-to-end

**Resultado: Sistema de firma electrónica de nivel world-class que cumple normativa colombiana y estándares internacionales.** 🎯🔒✨

---

*Generado: 26 de Diciembre de 2024*  
*Sistema de Firma Electrónica ESAP - Versión 2.0.0*
