# ⚡ CASOS DE PRUEBA RÁPIDOS - COPY & PASTE
**Actualizado con nuevo diseño UX v2.0**

---

## ✅ CASOS EXITOSOS - "SOY EL GRADUADO"

### 🎯 CASO 1 - Graduado reciente (RECOMENDADO PARA TESTING)
```
PASO 1: ¿Quién solicita?
✅ Seleccionar "Soy el graduado"

PASO 2: Datos del Graduado (todos juntos):
Nombre Completo: Rodríguez Gutiérrez
Cédula: 52987654
Fecha: 2024-12-01
Email: test@gmail.com
```
✅ **Resultado esperado:** Laura Marcela Rodríguez Gutiérrez - Administración Pública Territorial

### 🎯 CASO 2 - Especialización
```
PASO 1: ¿Quién solicita?
✅ Seleccionar "Soy el graduado"

PASO 2: Datos del Graduado:
Nombre Completo: Juan Carlos Pérez Martínez
Cédula: 9876543210
Fecha: 2023-06-10
Email: prueba@hotmail.com
```

### 🎯 CASO 3 - Maestría
```
PASO 1: ¿Quién solicita?
✅ Seleccionar "Soy el graduado"

PASO 2: Datos del Graduado:
Nombre Completo: Ana María González López
Cédula: 1122334455
Fecha: 2024-11-25
Email: graduado@test.com
```

### 🎯 CASO 4 - Test con tildes
```
PASO 1: ¿Quién solicita?
✅ Seleccionar "Soy el graduado"

PASO 2: Datos del Graduado:
Nombre Completo: Laura Sofía Martínez Díaz
Cédula: 5566778899
Fecha: 2025-11-30
Email: laura@gmail.com
```
Prueba también sin tildes: `Laura Sofia Martinez Diaz` ✅

### 🎯 CASO 5 - Test mayúsculas
```
PASO 1: ¿Quién solicita?
✅ Seleccionar "Soy el graduado"

PASO 2: Datos del Graduado:
Nombre Completo: DIEGO FERNANDO TORRES VARGAS
Cédula: 3344556677
Fecha: 2024-06-28
Email: diego@test.com
```
Prueba con: `diego fernando torres vargas` ✅

---

## ✅ CASOS EXITOSOS - "SOY EMPRESA"

### 🏢 CASO EMPRESA 1
```
PASO 1: ¿Quién solicita?
✅ Seleccionar "Soy Empresa"

DATOS DE LA EMPRESA:
Nombre Empresa: Tech Solutions S.A.S.
NIT: 900123456-7
Persona: Carolina Ruiz
Email: rrhh@empresa.com

PASO 2: Datos del Graduado:
Nombre Completo: María Fernanda Rodríguez García
Cédula: 1234567890
Fecha: 2024-12-15
Email Graduado: maria.rodriguez@gmail.com  ⬅️ NUEVO (para notificación)
```
**✉️ Emails enviados:**
1. Certificado → rrhh@empresa.com
2. Notificación de transparencia → maria.rodriguez@gmail.com

### 🏢 CASO EMPRESA 2
```
PASO 1: ¿Quién solicita?
✅ Seleccionar "Soy Empresa"

DATOS DE LA EMPRESA:
Nombre Empresa: Corporativo XYZ Ltda
NIT: 800987654-3
Persona: Roberto Gómez
Email: talento@corp.com

PASO 2: Datos del Graduado:
Nombre Completo: Juan Carlos Pérez Martínez
Cédula: 9876543210
Fecha: 2023-06-10
Email Graduado: juan.perez@gmail.com  ⬅️ NUEVO (para notificación)
```
**✉️ Emails enviados:**
1. Certificado → talento@corp.com
2. Notificación de transparencia → juan.perez@gmail.com

---

## ❌ CASOS DE ERROR

### 🔴 ERROR 1 - Cédula no existe (CASO DE TESTING PRINCIPAL)
```
PASO 1: ¿Quién solicita?
✅ Seleccionar "Soy el graduado"

PASO 2: Datos del Graduado:
Nombre Completo: NoExiste
Cédula: 9999999999
Fecha: 2015-12-10
Email: test@gmail.com
```
**Esperado:** ⏳ Solicitud de revisión manual (48-72 horas)
**Mensaje:** "Este graduado NO está registrado - Se creará solicitud de revisión manual (48-72h)"

### 🔴 ERROR 2 - Fecha incorrecta
```
PASO 1: ¿Quién solicita?
✅ Seleccionar "Soy el graduado"

PASO 2: Datos del Graduado:
Nombre Completo: María Fernanda Rodríguez García
Cédula: 1234567890
Fecha: 2023-01-01  ❌ (debería ser 2024-12-15)
Email: test@gmail.com
```
**Esperado:** 🚫 "La fecha de grado no coincide con nuestros registros"

### 🔴 ERROR 3 - Nombre incorrecto
```
PASO 1: ¿Quién solicita?
✅ Seleccionar "Soy el graduado"

PASO 2: Datos del Graduado:
Nombre Completo: María Rodríguez  ❌ (incompleto)
Cédula: 1234567890
Fecha: 2024-12-15
Email: test@gmail.com
```
**Esperado:** 🚫 "El nombre completo no coincide con nuestros registros"

### 🔴 ERROR 4 - Nombre incompleto
```
PASO 1: ¿Quién solicita?
✅ Seleccionar "Soy el graduado"

PASO 2: Datos del Graduado:
Nombre Completo: Juan Carlos  ❌ (falta: Pérez Martínez)
Cédula: 9876543210
Fecha: 2023-06-10
Email: test@gmail.com
```
**Esperado:** 🚫 "El nombre completo no coincide con nuestros registros"

---

## 📧 EMAILS DE PRUEBA

Para graduados:
```
test@gmail.com
prueba@hotmail.com
graduado@test.com
maria.rodriguez@yahoo.com
```

Para empresas:
```
rrhh@empresa.com
talento@test.com.co
verificaciones@corp.co
seleccion@organizacion.com
```

---

## 🚀 SECUENCIA DE TESTING RECOMENDADA

### PASO 1: Verificar flujo "Soy el graduado"
1. ✅ Seleccionar "Soy el graduado"
2. ✅ Verificar mensaje informativo (NO pide datos aquí)
3. ✅ Ir a "Datos del Graduado"
4. ✅ Verificar que TODOS los campos están juntos (Nombre, Cédula, Fecha, Email)
5. ✅ Ingresar Caso 1 (graduado reciente)
6. ✅ Verificar certificado generado con nombre correcto

### PASO 2: Verificar organización visual
7. ✅ Verificar que el Nombre está PRIMERO (ancho completo)
8. ✅ Verificar que Cédula y Fecha están en 2 columnas
9. ✅ Verificar que Email está debajo (ancho completo, solo si es graduado)

### PASO 3: Verificar normalización
10. ✅ Caso 4 - Test sin tildes
11. ✅ Caso 5 - Test mayúsculas

### PASO 4: Verificar flujo "Soy Empresa"
12. ✅ Cambiar a "Soy Empresa"
13. ✅ Verificar que pide TODOS los campos de empresa (Nombre, NIT, Persona, Email)
14. ✅ Ir a "Datos del Graduado"
15. ✅ Verificar que pide Email del Graduado (para notificación)
16. ✅ Ingresar Caso Empresa 1
17. ✅ Verificar que se envían 2 emails (certificado + notificación)
18. ✅ Verificar toast: "Se ha notificado al graduado"

### PASO 5: Verificar errores
17. ❌ Error 1 - Cédula no existe
18. ❌ Error 2 - Fecha incorrecta
19. ❌ Error 3 - Nombre incorrecto

### PASO 6: Verificar responsive
20. 📱 Móvil - Verificar que todo se apila correctamente
21. 💻 Desktop - Verificar grid de 2 columnas funciona

---

## 📋 CHECKLIST DE VERIFICACIÓN v2.0

### Flujo "Soy el graduado"
- [ ] Solo muestra mensaje informativo (sin campos)
- [ ] Sección "Datos del Graduado" agrupa TODO
- [ ] Nombre Completo está PRIMERO (ancho completo)
- [ ] Cédula y Fecha en grid 2 columnas
- [ ] Email del graduado está al final (ancho completo)
- [ ] Certificado usa el nombre del graduado correctamente

### Flujo "Soy Empresa" v2.1
- [ ] Muestra todos los campos de empresa (Nombre, NIT, Persona, Email)
- [ ] Email de la empresa está en la sección de empresa
- [ ] Sección "Datos del Graduado" pide Email del Graduado
- [ ] Email del graduado es OBLIGATORIO (campo requerido)
- [ ] Nota de transparencia visible: "Se notificará al graduado..."
- [ ] Certificado usa el nombre de la empresa correctamente
- [ ] Se envían 2 emails: uno a empresa, otro a graduado
- [ ] Toast de confirmación aparece: "Se ha notificado al graduado"

### Validaciones
- [ ] Normalización ignora mayúsculas ✅
- [ ] Normalización ignora tildes ✅
- [ ] Error específico para cédula no encontrada
- [ ] Error específico para fecha incorrecta
- [ ] Error específico para nombre incorrecto

### Diseño UX v2.0
- [ ] Gradientes corporativos ESAP aplicados
- [ ] Tarjetas individuales por campo
- [ ] Íconos en cada label
- [ ] Sombras sutiles en tarjetas
- [ ] Campos más grandes (h-14)
- [ ] Responsive en móvil (320px+)
- [ ] Responsive en tablet (768px+)
- [ ] Responsive en desktop (1024px+)
- [ ] Grid de 2 columnas funciona correctamente

---

## 🎨 DIFERENCIAS ENTRE FLUJOS (NUEVO DISEÑO)

### "Soy el graduado" 👤
```
┌─────────────────────────────────────┐
│ 🟢 ¿QUIÉN SOLICITA EL CERTIFICADO?  │
│                                     │
│ ⭕ Soy el graduado                  │
│                                     │
│ ℹ️ Ingresa tus datos como graduado │
│    en la siguiente sección          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔵 DATOS DEL GRADUADO               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Nombre Completo (ancho full) │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌───────────┐    ┌───────────────┐ │
│ │ 📄 Cédula │    │ 📅 Fecha      │ │
│ └───────────┘    └───────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📧 Email (ancho full)           │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### "Soy Empresa" 🏢
```
┌─────────────────────────────────────┐
│ 🟢 ¿QUIÉN SOLICITA EL CERTIFICADO?  │
│                                     │
│ ⭕ Soy Empresa                       │
│                                     │
│ ┌─────────────┐    ┌─────────────┐ │
│ │ 🏢 Empresa  │    │ 📋 NIT      │ │
│ └─────────────┘    └─────────────┘ │
│                                     │
│ ┌─────────────┐    ┌─────────────┐ │
│ │ 👤 Persona  │    │ 📧 Email    │ │
│ └─────────────┘    └─────────────┘ │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔵 DATOS DEL GRADUADO               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Nombre Completo (ancho full) │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌───────────┐    ┌───────────────┐ │
│ │ 📄 Cédula │    │ 📅 Fecha      │ │
│ └───────────┘    └───────────────┘ │
│                                     │
│ (NO muestra email aquí)             │
└─────────────────────────────────────┘
```

---

## 🎯 ORDEN DE CAMPOS POR FLUJO

### "Soy el graduado" (nuevo orden)
```
1. Selección de tipo ⭕
2. Nombre Completo      ⬅️ PRIMERO (prominente)
3. Cédula | Fecha       ⬅️ Grid 2 columnas
4. Email                ⬅️ Junto con otros datos
```

### "Soy Empresa" (con email del graduado)
```
1. Selección de tipo ⭕
2. Nombre Empresa | NIT
3. Persona | Email Empresa
4. ─────────────────────
5. Nombre Graduado
6. Cédula | Fecha
7. Email Graduado        ⬅️ NUEVO (para notificación)
```

---

## 📧 EMAIL DE NOTIFICACIÓN AL GRADUADO (NUEVO)

### 🔔 ¿Cuándo se envía?
Solo en el flujo **"Soy Empresa"**, después de generar el certificado exitosamente.

### 🎯 Propósito
**Transparencia y protección de datos:** El graduado debe saber quién solicitó verificación de su título.

### ✉️ Contenido del Email
```
Para: [Email del Graduado]
Asunto: Notificación de Solicitud de Certificado - [Nombre Empresa]

┌──────────────────────────────────────┐
│ 🔔 NOTIFICACIÓN DE SOLICITUD         │
│                                      │
│ Estimado(a) [Nombre Graduado],       │
│                                      │
│ Te informamos que la empresa:        │
│ 🏢 [Nombre Empresa]                  │
│ NIT: [NIT]                           │
│                                      │
│ Ha solicitado verificación de tu     │
│ título académico en ESAP.            │
│                                      │
│ Persona de contacto:                 │
│ 👤 [Nombre Persona]                  │
│ 📧 [Email Empresa]                   │
│                                      │
│ Código: [Código Certificado]         │
│ Fecha: [Fecha Solicitud]             │
│                                      │
│ Si no reconoces esta empresa,        │
│ contáctanos inmediatamente.          │
│                                      │
│ [📧 Contactar a ESAP]                │
└──────────────────────────────────────┘
```

### 🔒 Datos incluidos en el email:
✅ Nombre de la empresa
✅ NIT de la empresa
✅ Nombre de la persona de contacto
✅ Email de la empresa
✅ Fecha de solicitud
✅ Código del certificado

### ❌ Datos NO incluidos:
❌ Número de cédula del graduado
❌ Dirección del graduado
❌ Teléfono del graduado
❌ Información académica detallada

### 🧪 Testing del Email
Verificar que:
- [ ] Email se envía solo en flujo "Empresa"
- [ ] Email NO se envía en flujo "Graduado"
- [ ] Todos los datos de la empresa están correctos
- [ ] Email del graduado es válido
- [ ] Toast aparece: "Se ha notificado al graduado"
- [ ] Template HTML se genera correctamente

---

## 💡 NOTAS IMPORTANTES v2.0

### 🔥 CAMBIOS RECIENTES

**v2.1 - Email de Notificación al Graduado:**
1. ✅ Nuevo campo: Email del graduado en flujo "Empresa"
2. ✅ Email automático de notificación enviado al graduado
3. ✅ Template HTML corporativo con diseño ESAP
4. ✅ Transparencia y protección de datos personales
5. ✅ Campos adicionales: NIT y Persona de Contacto

**v2.0 - Reorganización UX Avanzada:**
1. ✅ Correo del graduado movido a su sección (junto con todos sus datos)
2. ✅ Grid de 2 columnas para optimizar espacio (Cédula | Fecha)
3. ✅ Diseño con gradientes corporativos ESAP
4. ✅ Tarjetas individuales por campo
5. ✅ Íconos en cada label para mejor UX
6. ✅ Campos más grandes (h-14) para mejor usabilidad móvil

**v1.0 - Eliminación de duplicación:**
1. ✅ Ya NO se pide el nombre dos veces en "Soy el graduado"
2. ✅ El sistema usa automáticamente el nombre del graduado

### 🎨 Paleta de Colores
- **Solicitante:** Emerald (#10b981) - Verde para acciones
- **Graduado:** Azul ESAP (#003DA5, #2962FF) - Corporativo
- **Fondos:** Gradientes sutiles para jerarquía visual

---

## 📱 PRUEBAS RESPONSIVE

### Móvil (320px - 767px)
- [ ] Todo se apila verticalmente
- [ ] Email ocupa ancho completo
- [ ] Cédula y Fecha se apilan (no grid)
- [ ] Botones son táctiles (h-14)
- [ ] Texto legible

### Tablet (768px - 1023px)
- [ ] Grid de 2 columnas activo
- [ ] Email sigue ancho completo
- [ ] Espaciado adecuado
- [ ] Campos bien distribuidos

### Desktop (1024px+)
- [ ] Grid de 2 columnas optimizado
- [ ] Máximo ancho del formulario
- [ ] Tarjetas bien alineadas
- [ ] Espaciado profesional

---

**Tip:** Usa este archivo para copiar y pegar rápidamente durante las pruebas. Todos los casos están organizados por el NUEVO flujo v2.0 con el correo del graduado en su sección correspondiente.