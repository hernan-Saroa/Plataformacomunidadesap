# 📋 DATOS DE PRUEBA: Verificación de Títulos ESAP

## 🎯 Objetivo
Probar el módulo de verificación de títulos con dos casos específicos:
1. **Caso EXITOSO**: Usuario registrado que puede descargar certificado
2. **Caso FALLIDO**: Usuario no registrado que requiere revisión manual

## ✅ SINCRONIZACIÓN AUTOMÁTICA

**IMPORTANTE:** Los datos de graduados ahora se sincronizan automáticamente desde el módulo de **Gestión de Personas - Administración de Perfiles**.

### Arquitectura de Datos
```
GESTIÓN DE PERSONAS (Administración de Perfiles)
        ↓ (Sincronización automática)
REGISTRO ACADÉMICO (Verificación de títulos)
```

- **Fuente Única de Verdad**: `/data/mockUsersWithSedes.ts`
- **Sincronización**: `/data/graduatesSync.ts`
- **Consumidor**: `/components/esap/GraduateVerificationModulePremium.tsx`

### Cómo Funciona
1. Los usuarios se crean SOLO en "Gestión de Personas - Administración de Perfiles"
2. Si un usuario tiene rol "Graduado" o "Egresado", aparece automáticamente en "Registro Académico"
3. Los cambios en Gestión de Personas se reflejan instantáneamente en Registro Académico

---

## ✅ CASO DE PRUEBA 1: VERIFICACIÓN EXITOSA

### Datos del Graduado
```
Nombre:                     María Alejandra González Pérez
Cédula:                     1012345678
Fecha de Expedición:        2002-03-15  ✅ VALIDACIÓN REQUERIDA
Programa:                   Pregrado en Administración Pública
Fecha de Graduación:        2024-11-15
Estado:                     REGISTRADO EN LA BASE DE DATOS ✓
```

### Comportamiento Esperado
1. Al buscar la cédula **1012345678** en el sistema, el graduado **SÍ** se encuentra
2. El sistema **valida la fecha de expedición** del documento (2002-03-15)
3. Si la fecha coincide, muestra la información del graduado inmediatamente
4. El certificado se puede **descargar instantáneamente**
5. Se genera un certificado con código QR
6. NO se requiere revisión manual
7. El proceso es automático e inmediato

### Flujo de Prueba
```
1. Ir al módulo "Registro Académico" → "Verificación de títulos"
2. Ingresar cédula: 1012345678
3. Ingresar fecha de expedición: 2002-03-15  ✅ PASO DE VALIDACIÓN
4. Click en "Solicitar Certificado de Verificación"
5. ✅ Sistema valida: Cédula Y Fecha de expedición coinciden
6. ✅ El sistema muestra: "María Alejandra González Pérez - Administración Pública"
7. ✅ Botón "Descargar Certificado" disponible inmediatamente
8. ✅ El certificado se descarga con QR de verificación
```

### Validaciones del Sistema
- **Cédula**: 1012345678 → ✅ Existe en BD
- **Fecha Expedición**: 2002-03-15 → ✅ Coincide con registro
- **Resultado**: Verificación EXITOSA - Descarga inmediata

---

## ❌ CASO DE PRUEBA 2: VERIFICACIÓN FALLIDA

### Datos del Usuario
```
Nombre:                     Juan Carlos Ramírez Ortiz (ejemplo)
Cédula:                     9876543210
Fecha de Expedición:        2010-06-20
Programa:                   Desconocido (no en BD)
Estado:                     NO REGISTRADO EN LA BASE DE DATOS ✗
```

### Comportamiento Esperado
1. Al buscar la cédula **9876543210** en el sistema, el graduado **NO** se encuentra
2. El sistema muestra mensaje: "Usuario NO encontrado en la base de datos"
3. Se ofrece opción para **crear solicitud de revisión manual**
4. El plazo de revisión es de **48-72 horas**
5. Se genera un caso en "Solicitudes de Revisión Pendientes"
6. El usuario debe esperar la validación manual del equipo de Registro Académico

### Flujo de Prueba
```
1. Ir al módulo "Registro Académico" → "Verificación de títulos"
2. Ingresar cédula: 9876543210
3. Ingresar fecha de expedición: 2010-06-20
4. Click en "Solicitar Certificado de Verificación"
5. ❌ El sistema muestra: "Usuario NO encontrado en la base de datos"
6. ⚠️ Aparece formulario para "Solicitud de Revisión Manual"
7. ⚠️ Se informa: "Tiempo de revisión: 48-72 horas"
8. El administrador debe revisar manualmente el caso
```

### Validaciones del Sistema
- **Cédula**: 9876543210 → ❌ NO existe en BD
- **Fecha Expedición**: 2010-06-20 → ⚠️ Sin validar (usuario no existe)
- **Resultado**: Verificación FALLIDA - Requiere solicitud manual

---

## ⚠️ CASO DE PRUEBA 3: DATOS INCORRECTOS (NUEVO)

### Datos de Prueba
```
Cédula:                     1012345678  ✅ Existe en BD
Fecha de Expedición:        2010-01-01  ❌ FECHA INCORRECTA
Estado:                     VALIDACIÓN FALLIDA POR FECHA
```

### Comportamiento Esperado
1. El sistema encuentra el usuario con la cédula
2. Pero la fecha de expedición NO coincide con el registro
3. Muestra mensaje: "Los datos ingresados no coinciden con nuestros registros"
4. Se ofrece opción de revisión manual o intentar nuevamente

### Flujo de Prueba
```
1. Ingresar cédula: 1012345678
2. Ingresar fecha de expedición INCORRECTA: 2010-01-01
3. Click en "Solicitar Certificado"
4. ⚠️ Sistema detecta: Cédula existe PERO fecha no coincide
5. ⚠️ Mensaje: "Los datos no coinciden. Verifique la fecha de expedición de su documento"
6. ⚠️ Opciones: Intentar nuevamente o crear solicitud manual
```

### Validaciones del Sistema
- **Cédula**: 1012345678 → ✅ Existe en BD
- **Fecha Expedición**: 2010-01-01 → ❌ NO coincide (esperada: 2002-03-15)
- **Resultado**: Validación FALLIDA por fecha incorrecta

---

## 🔍 Cómo Verificar los Casos

### Desde el Portal Público (verificacion-titulos)
```
URL: /verificacion
Módulo: Verificación Oficial de Títulos - Graduados ESAP
```

### Desde el Backoffice Administrativo
```
URL: /backoffice
Módulo: Registro Académico → Verificación de títulos
Vista Admin: Ver lista completa de graduados registrados
```

---

## 📊 Graduados de Ejemplo en el Sistema

| Nombre                       | Cédula      | Fecha Expedición | Fecha Grado | Programa                    | Estado  |
|------------------------------|-------------|------------------|-------------|-----------------------------|---------|
| **María Alejandra González** | 1012345678  | **2002-03-15**   | 2024-11-15  | Administración Pública      | ✅ EN BD |
| Laura Marcela Rodríguez      | 52987654    | 2013-04-15       | 2024-06-01  | Admin. Pública Territorial  | ✅ EN BD |
| Miguel Ángel Sánchez         | 1098234567  | 2011-11-22       | 2024-05-28  | Esp. Gestión Pública        | ✅ EN BD |
| Diana Carolina Martínez      | 31876543    | 2014-07-08       | 2024-07-03  | Admin. Pública Territorial  | ✅ EN BD |
| Andrés Felipe Gómez          | 72456789    | 2012-03-12       | 2024-05-30  | Tec. Gestión Pública        | ✅ EN BD |
| Paola Andrea Hernández       | 63234567    | 2010-09-18       | 2024-06-02  | Administración Pública      | ✅ EN BD |
| Carlos Eduardo López         | 1134567890  | 2015-01-30       | 2024-08-02  | Admin. Pública Territorial  | ✅ EN BD |
| Valentina Torres             | 42789012    | 2013-12-05       | 2024-05-18  | Administración Municipal    | ✅ EN BD |
| Juan Sebastián Díaz          | 10567890    | 2011-05-18       | 2024-04-29  | Esp. Gestión Pública        | ✅ EN BD |
| María Fernanda Vargas        | 59345678    | 2014-10-22       | 2024-07-04  | Tec. Gestión Pública        | ✅ EN BD |
| Javier Alonso Ruiz           | 88456789    | 2012-08-14       | 2024-06-01  | Admin. Pública Territorial  | ✅ EN BD |
| **Usuario Prueba Fallido**   | 9876543210  | 2010-06-20       | N/A         | **NO EXISTE**               | ❌ NO BD |

### 🔑 Leyenda de Datos de Prueba

- **Caso EXITOSO**: Cédula `1012345678` + Fecha Expedición `2002-03-15`
- **Caso FALLIDO**: Cédula `9876543210` + Fecha Expedición `2010-06-20`
- **Caso DATOS INCORRECTOS**: Cédula `1012345678` + Fecha Expedición `2010-01-01` (fecha incorrecta)

---

## 🎨 Diferencias Visuales

### ✅ Verificación EXITOSA
- **Color**: Verde / Azul
- **Ícono**: ✓ Check / Award
- **Mensaje**: "Certificado instantáneo generado"
- **Botón**: "Descargar Certificado" (activo)
- **QR**: Generado automáticamente

### ❌ Verificación FALLIDA
- **Color**: Naranja / Amarillo (warning)
- **Ícono**: ⚠ Alerta / Reloj
- **Mensaje**: "Solicitud de revisión creada (48-72h)"
- **Botón**: "Crear Solicitud de Revisión Manual"
- **QR**: No disponible hasta aprobación

---

## 🛠 Acciones Administrativas

### Para el Caso EXITOSO
```javascript
handleDownloadCertificate(graduate: {
  nombre: "María Alejandra González Pérez",
  documento: "1012345678",
  programa: "Administración Pública",
  fechaGrado: "2024-11-15"
});
// → Descarga PDF instantánea con QR
```

### Para el Caso FALLIDO
```javascript
createManualReviewRequest({
  documento: "9876543210",
  fechaExpedicion: "2010-06-20",
  estado: "Pendiente",
  plazoRevision: "48-72 horas"
});
// → Crea ticket en módulo de Solicitudes Pendientes
```

---

## 📝 Notas Importantes

1. **Búsqueda por Cédula**: El sistema busca coincidencia exacta en el campo `documento`
2. **Fecha de Expedición**: Se usa para validación adicional pero no es obligatoria
3. **Certificados Descargados**: El contador incrementa cada vez que se descarga
4. **Trazabilidad**: Todas las descargas quedan registradas con fecha y hora
5. **QR Único**: Cada certificado tiene un código QR único verificable

---

## 🎯 Objetivo de las Pruebas

- ✅ Validar flujo exitoso de verificación instantánea
- ✅ Validar flujo de revisión manual para casos no encontrados
- ✅ Comprobar mensajes de error y advertencia apropiados
- ✅ Verificar generación correcta de certificados con QR
- ✅ Asegurar que las solicitudes pendientes se crean correctamente
- ✅ Validar tiempos de respuesta y UX del sistema

---

## 📞 Contacto

Para más información sobre el módulo de Verificación de Títulos:
- **Módulo**: Registro Académico
- **Sección**: Gestión Académica
- **Ubicación**: SidebarPremium.tsx → "Registro Académico" → "Verificación de títulos"

---

**Fecha de Creación**: 14 de diciembre de 2025  
**Última Actualización**: 14 de diciembre de 2025  
**Versión**: 1.0