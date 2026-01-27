# 📋 DATOS DE PRUEBA ACTUALIZADOS - VERIFICACIÓN DE TÍTULOS ESAP
**Última actualización:** Enero 2026

---

## 🔍 FLUJOS DE VERIFICACIÓN

### ✅ FLUJO 1: "Soy el graduado"
Cuando el graduado solicita su propio certificado:

**🎯 Estructura del Formulario:**

**PASO 1: ¿Quién solicita el certificado?**
- Selección: ⭕ "Soy el graduado"
- ℹ️ Mensaje informativo: "Ingresa tus datos como graduado en la siguiente sección"

**PASO 2: Datos del Graduado** (TODOS juntos en una sección)
- 👤 Nombre Completo del Graduado *(ancho completo)*
- 🆔 Número de Cédula | 📅 Fecha de Grado *(2 columnas)*
- 📧 Tu Correo Electrónico *(ancho completo)*

**✨ MEJORA CLAVE:** 
- ✅ Todos los datos del graduado están agrupados en UNA SOLA SECCIÓN
- ✅ El correo del graduado está junto con sus otros datos (cédula, fecha, nombre)
- ✅ Diseño más limpio y organizado
- ✅ Grid de 2 columnas para cédula y fecha (mejor aprovechamiento del espacio)

---

### ✅ FLUJO 2: "Soy Empresa"
Cuando una empresa verifica a un candidato:

**🎯 Estructura del Formulario:**

**PASO 1: ¿Quién solicita el certificado?**
- Selección: ⭕ "Soy Empresa"
- 🏢 Nombre de la Empresa | 📋 NIT *(2 columnas)*
- 👤 Persona que Solicita | 📧 Correo Electrónico *(2 columnas)*
- ℹ️ Nota: "El certificado será enviado a este correo electrónico"

**PASO 2: Datos del Graduado**
- 👤 Nombre Completo del Graduado *(ancho completo)*
- 🆔 Número de Cédula | 📅 Fecha de Grado *(2 columnas)*
- (El correo NO aparece aquí, ya está en la sección de empresa)

---

## 🧪 BASE DE DATOS DE GRADUADOS (12 registros)

### 👤 GRADUADO 1 - Laura Marcela Rodríguez Gutiérrez ⭐ (CASO PRINCIPAL DE TESTING)
```
Cédula: 52987654
Fecha de Grado: 2024-12-01
Nombre Completo: Laura Marcela Rodríguez Gutiérrez

Programa: Administración Pública Territorial
Título: Pregrado en Administración Pública Territorial
Promedio: 4.5
Sede: Bogotá | Territorial: Cundinamarca
```

**Variaciones válidas del nombre:**
- `Laura Marcela Rodríguez Gutiérrez` ✅
- `laura marcela rodriguez gutierrez` ✅ (sin mayúsculas ni tildes)
- `LAURA MARCELA RODRÍGUEZ GUTIÉRREZ` ✅
- `Laura Marcela Rodriguez Gutierrez` ✅

**✨ Para testing rápido, puedes usar solo:**
- `Rodríguez Gutiérrez` ✅ (apellidos)

---

### 👤 GRADUADO 2 - Juan Carlos Pérez Martínez
```
Cédula: 9876543210
Fecha de Grado: 2023-06-10
Nombre Completo: Juan Carlos Pérez Martínez

Programa: Especialización en Gestión Pública
Título: Especialización en Gestión Pública
Promedio: 4.8
Sede: Medellín | Territorial: Antioquia
```

---

### 👤 GRADUADO 3 - Ana María González López
```
Cédula: 1122334455
Fecha de Grado: 2024-11-25
Nombre Completo: Ana María González López

Programa: Maestría en Administración y Políticas Públicas
Título: Maestría en Administración y Políticas Públicas
Promedio: 4.9
Sede: Cali | Territorial: Valle del Cauca
```

---

### 👤 GRADUADO 4 - Carlos Andrés Gómez Rincón
```
Cédula: 1020304050
Fecha de Grado: 2025-12-18
Nombre Completo: Carlos Andrés Gómez Rincón

Programa: Administración Pública Territorial
Título: Pregrado en Administración Pública Territorial
Promedio: 4.3
Sede: Barranquilla | Territorial: Atlántico
```

---

### 👤 GRADUADO 5 - Laura Sofía Martínez Díaz
```
Cédula: 5566778899
Fecha de Grado: 2025-11-30
Nombre Completo: Laura Sofía Martínez Díaz

Programa: Especialización en Alta Gerencia
Título: Especialización en Alta Gerencia
Promedio: 4.7
Sede: Bucaramanga | Territorial: Santander
```

---

### 👤 GRADUADO 6 - Diego Fernando Torres Vargas
```
Cédula: 3344556677
Fecha de Grado: 2024-06-28
Nombre Completo: Diego Fernando Torres Vargas

Programa: Maestría en Gobierno y Políticas Públicas
Título: Maestría en Gobierno y Políticas Públicas
Promedio: 4.85
Sede: Bogotá | Territorial: Cundinamarca
```

---

### 👤 GRADUADO 7 - Claudia Patricia Jiménez Sánchez
```
Cédula: 7788990011
Fecha de Grado: 2025-07-20
Nombre Completo: Claudia Patricia Jiménez Sánchez

Programa: Especialización en Gerencia Social
Título: Especialización en Gerencia Social
Promedio: 4.6
Sede: Cartagena | Territorial: Bolívar
```

---

### 👤 GRADUADO 8 - Andrés Felipe Castro Moreno
```
Cédula: 4455667788
Fecha de Grado: 2024-03-15
Nombre Completo: Andrés Felipe Castro Moreno

Programa: Administración Pública
Título: Pregrado en Administración Pública
Promedio: 4.4
Sede: Pereira | Territorial: Risaralda
```

---

### 👤 GRADUADO 9 - Paula Andrea Hernández Ruiz
```
Cédula: 2233445566
Fecha de Grado: 2023-12-10
Nombre Completo: Paula Andrea Hernández Ruiz

Programa: Maestría en Planeación para el Desarrollo
Título: Maestría en Planeación para el Desarrollo
Promedio: 4.75
Sede: Manizales | Territorial: Caldas
```

---

### 👤 GRADUADO 10 - José Miguel Ramírez Ortiz
```
Cédula: 6677889900
Fecha de Grado: 2025-06-12
Nombre Completo: José Miguel Ramírez Ortiz

Programa: Especialización en Gestión de Proyectos
Título: Especialización en Gestión de Proyectos
Promedio: 4.55
Sede: Pasto | Territorial: Nariño
```

---

### 👤 GRADUADO 11 - Sandra Milena López Ríos
```
Cédula: 8899001122
Fecha de Grado: 2024-08-22
Nombre Completo: Sandra Milena López Ríos

Programa: Administración Pública Territorial
Título: Pregrado en Administración Pública Territorial
Promedio: 4.65
Sede: Ibagué | Territorial: Tolima
```

---

### 👤 GRADUADO 12 - Ricardo Javier Montoya Cardona
```
Cédula: 3366778899
Fecha de Grado: 2023-11-18
Nombre Completo: Ricardo Javier Montoya Cardona

Programa: Maestría en Gobierno y Políticas Públicas
Título: Maestría en Gobierno y Políticas Públicas
Promedio: 4.8
Sede: Armenia | Territorial: Quindío
```

---

## 🔴 CASOS DE PRUEBA - ERROR

### ❌ CASO 1: Graduado NO existe en BD
```
Cédula: 9999999999
Fecha de Grado: 2024-01-01
Nombre Completo: Persona Inexistente Test
```
**Resultado esperado:** ⏳ Solicitud de revisión manual (48-72 horas)

---

### ❌ CASO 2: Cédula correcta pero fecha incorrecta
```
Cédula: 1234567890  ✅
Fecha de Grado: 2023-01-01  ❌ (debería ser 2024-12-15)
Nombre Completo: María Fernanda Rodríguez García  ✅
```
**Resultado esperado:** 🚫 "La fecha de grado no coincide con nuestros registros"

---

### ❌ CASO 3: Cédula y fecha correctos pero nombre incorrecto
```
Cédula: 1234567890  ✅
Fecha de Grado: 2024-12-15  ✅
Nombre Completo: Otro Nombre Diferente  ❌
```
**Resultado esperado:** 🚫 "El nombre completo no coincide con nuestros registros"

---

### ❌ CASO 4: Solo primer nombre (incompleto)
```
Cédula: 9876543210  ✅
Fecha de Grado: 2023-06-10  ✅
Nombre Completo: Juan Carlos  ❌ (falta: Pérez Martínez)
```
**Resultado esperado:** 🚫 "El nombre completo no coincide con nuestros registros"

---

## 📧 EJEMPLOS DE CORREOS

### Para "Soy el graduado":
```
mariafernanda@gmail.com
juan.carlos@hotmail.com
ana.gonzalez@yahoo.com
graduado2025@outlook.com
```

### Para "Soy Empresa":
```
rrhh@empresaabc.com.co
talento@companiaxyz.com
seleccion@corporativo.co
verificaciones@empresa.com.co
contratacion@organizacion.gov.co
```

---

## 🎯 VALIDACIONES DEL SISTEMA

### ✅ 1. Normalización de Nombres
El sistema normaliza automáticamente:
- ✅ Ignora mayúsculas/minúsculas
- ✅ Ignora tildes y acentos (á → a, é → e, etc.)
- ✅ Elimina espacios extra

**Ejemplos de normalización exitosa:**
```
Input: "MARÍA FERNANDA RODRÍGUEZ GARCÍA"
BD:    "María Fernanda Rodríguez García"
✅ COINCIDE (normalizado: maria fernanda rodriguez garcia)

Input: "maria fernanda rodriguez garcia"
BD:    "María Fernanda Rodríguez García"
✅ COINCIDE (normalizado: maria fernanda rodriguez garcia)

Input: "María  Fernanda   Rodríguez García" (espacios extra)
BD:    "María Fernanda Rodríguez García"
✅ COINCIDE (normalizado y limpiado)
```

---

### ✅ 2. Validación de Email
Formato válido: `usuario@dominio.extension`

**Válidos:**
- ✅ `maria@gmail.com`
- ✅ `juan.perez@esap.edu.co`
- ✅ `rrhh@empresa.com.co`

**Inválidos:**
- ❌ `correosindominio`
- ❌ `correo@sinextension`
- ❌ `@dominio.com`

---

### ✅ 3. Validación de Fecha de Grado
- **Formato requerido:** `YYYY-MM-DD` (ej: 2024-12-15)
- ⚠️ Debe coincidir **exactamente** con la fecha registrada en BD
- ❌ No se aceptan fechas aproximadas

---

### ✅ 4. Validación de Cédula
- Debe existir en la base de datos
- Se busca coincidencia exacta del número
- No se valida formato (puede contener puntos o guiones)

---

## 🔄 FLUJO COMPLETO DE VERIFICACIÓN

### ✅ Flujo Exitoso (Graduado ENCONTRADO)
```
1️⃣ Usuario selecciona "Soy el graduado"
2️⃣ Ve mensaje informativo (no hay campos en esta sección)
3️⃣ Pasa a "Datos del Graduado"
4️⃣ Ingresa: Nombre Completo (ancho completo)
5️⃣ Ingresa: Cédula | Fecha (2 columnas)
6️⃣ Ingresa: Correo Electrónico (ancho completo)
7️⃣ Sistema busca en BD (2 segundos - simulado)
8️⃣ ✅ Encuentra graduado por cédula
9️⃣ ✅ Valida fecha de grado
🔟 ✅ Valida nombre completo (normalizado)
1️⃣1️⃣ ✅ Usa el nombre del graduado como nombre del solicitante
1️⃣2️⃣ 🎉 Genera certificado INSTANTÁNEAMENTE
1️⃣3️⃣ 📄 Muestra certificado con código QR único
1️⃣4️⃣ 📧 Envía email con PDF adjunto
```

---

### ⏳ Flujo de Revisión Manual (Graduado NO ENCONTRADO)
```
1️⃣ Usuario ingresa datos
2️⃣ Sistema busca en BD (2 segundos - simulado)
3️⃣ ❌ NO encuentra graduado por cédula
4️⃣ ⚠️ Crea solicitud de revisión manual
5️⃣ 📋 Genera número de solicitud: REV-2025-XXXX
6️⃣ 🕐 Muestra mensaje: "Tiempo estimado: 48-72 horas"
7️⃣ 📧 Envía email de confirmación de solicitud
8️⃣ 👥 Equipo administrativo revisa manualmente
9️⃣ 📊 Opciones:
   ✅ Si encuentra al graduado → Lo agrega a BD y genera certificado
   ❌ Si NO lo encuentra → Informa que no es graduado ESAP
```

---

## 🧩 EJEMPLOS DE PRUEBA COMPLETOS

### 📝 EJEMPLO 1: Graduado solicita su propio certificado (NUEVO DISEÑO)
```
FLUJO: "Soy el graduado"

PASO 1: ¿QUIÉN SOLICITA EL CERTIFICADO?
✅ Selección: "Soy el graduado"
ℹ️ Solo muestra mensaje informativo

PASO 2: DATOS DEL GRADUADO (todos juntos)
- Nombre Completo del Graduado: María Fernanda Rodríguez García
- Número de Cédula: 1234567890
- Fecha de Grado: 2024-12-15
- Tu Correo Electrónico: maria.rodriguez@gmail.com

RESULTADO: ✅ Certificado generado instantáneamente
NOMBRE DEL SOLICITANTE EN CERTIFICADO: María Fernanda Rodríguez García
```

**🎨 Diseño Visual:**
```
┌─────────────────────────────────────┐
│  🟢 ¿QUIÉN SOLICITA EL CERTIFICADO? │
│  ⭕ Soy el graduado                 │
│  ℹ️ Ingresa tus datos en la        │
│     siguiente sección               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🔵 DATOS DEL GRADUADO              │
│  ┌───────────────────────────────┐  │
│  │  👤 Nombre: María F. R. García│  │
│  └───────────────────────────────┘  │
│  ┌─────────┐    ┌────────────────┐  │
│  │ Cédula  │    │ Fecha de Grado │  │
│  └─────────┘    └────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  📧 Correo: maria@gmail.com   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

### 📝 EJEMPLO 2: Empresa verifica candidato
```
FLUJO: "Soy Empresa"

PASO 1: ¿QUIÉN SOLICITA EL CERTIFICADO?
✅ Selección: "Soy Empresa"
- Nombre de la Empresa: Tech Solutions S.A.S.
- NIT: 900123456-7
- Persona que Solicita: Carolina Ruiz
- Correo Electrónico: rrhh@techsolutions.com.co

PASO 2: DATOS DEL GRADUADO
- Nombre Completo del Graduado: Juan Carlos Pérez Martínez
- Número de Cédula: 9876543210
- Fecha de Grado: 2023-06-10
(NO pide correo aquí - ya está arriba)

RESULTADO: ✅ Certificado generado instantáneamente
NOMBRE DEL SOLICITANTE EN CERTIFICADO: Tech Solutions S.A.S.
```

**🎨 Diseño Visual:**
```
┌─────────────────────────────────────┐
│  🟢 ¿QUIÉN SOLICITA EL CERTIFICADO? │
│  ⭕ Soy Empresa                      │
│  ┌──────────┐    ┌──────────┐       │
│  │ Empresa  │    │   NIT    │       │
│  └──────────┘    └──────────┘       │
│  ┌──────────┐    ┌──────────┐       │
│  │ Persona  │    │  Correo  │       │
│  └──────────┘    └──────────┘       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🔵 DATOS DEL GRADUADO              │
│  ┌───────────────────────────────┐  │
│  │  👤 Nombre: Juan C. P. M.     │  │
│  └───────────────────────────────┘  │
│  ┌─────────┐    ┌────────────────┐  │
│  │ Cédula  │    │ Fecha de Grado │  │
│  └─────────┘    └────────────────┘  │
└─────────────────────────────────────┘
```

---

### 📝 EJEMPLO 3: Graduado NO encontrado (Revisión Manual)
```
FLUJO: "Soy el graduado"

PASO 1: ¿QUIÉN SOLICITA EL CERTIFICADO?
✅ Selección: "Soy el graduado"

PASO 2: DATOS DEL GRADUADO
- Nombre Completo del Graduado: Pedro Pablo Pérez
- Número de Cédula: 9999999999
- Fecha de Grado: 2020-06-15
- Tu Correo Electrónico: pedro.perez@gmail.com

RESULTADO: ⏳ Solicitud de revisión manual (48-72h)
NOMBRE DEL SOLICITANTE EN SOLICITUD: Pedro Pablo Pérez
```

---

## 💡 TIPS PARA TESTING

1. **Prueba la normalización de nombres:**
   - Intenta con mayúsculas, minúsculas y sin tildes
   - Todos deberían funcionar correctamente

2. **Verifica ambos flujos:**
   - "Soy el graduado" → Correo en la sección del graduado ✅
   - "Soy Empresa" → Correo en la sección de empresa ✅

3. **Verifica la organización visual:**
   - En "Soy el graduado", todos los datos están juntos
   - Grid de 2 columnas funciona bien en desktop
   - Stack vertical en móvil

4. **Prueba casos de error:**
   - Cédula incorrecta
   - Fecha incorrecta
   - Nombre incorrecto
   - Cada uno debe mostrar un mensaje específico

5. **Verifica el diseño responsive:**
   - Prueba en móvil (320px+)
   - Prueba en tablet (768px+)
   - Prueba en desktop (1024px+)

---

## 📊 RESUMEN DE DATOS

| Total Graduados | Pregrado | Especialización | Maestría |
|----------------|----------|-----------------|----------|
| 12             | 4        | 4               | 4        |

| Sedes          | Cantidad |
|----------------|----------|
| Bogotá         | 2        |
| Otras ciudades | 10       |

---

## ✨ CAMBIOS RECIENTES

### 🔥 v2.0 - Reorganización completa del formulario
**Fecha:** Enero 2026

**CAMBIO 1: Correo del graduado movido a su sección**
- **Antes:** Correo estaba en "Información del Solicitante"
- **Ahora:** Correo está en "Datos del Graduado" junto con cédula, fecha y nombre
- **Beneficio:** Todos los datos del graduado agrupados lógicamente

**CAMBIO 2: Grid de 2 columnas optimizado**
- **Antes:** Campos apilados verticalmente
- **Ahora:** Cédula y Fecha en 2 columnas (mejor uso del espacio)
- **Beneficio:** Formulario más compacto y profesional

**CAMBIO 3: Diseño visual mejorado**
- **Antes:** Diseño plano sin jerarquía
- **Ahora:** Gradientes corporativos, tarjetas individuales, íconos
- **Beneficio:** UX avanzado y moderno

### 🔥 v1.0 - Eliminación de duplicación de datos
- **Antes:** En "Soy el graduado" se pedía el nombre dos veces
- **Ahora:** Solo se pide una vez. El sistema lo usa automáticamente
- **Beneficio:** Experiencia de usuario mejorada

---

**Nota:** Todos estos datos son de prueba y están sincronizados con el módulo de "Gestión de Graduados" del backoffice administrativo.