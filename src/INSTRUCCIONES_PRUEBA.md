# 📋 INSTRUCCIONES DE PRUEBA - Módulo de Certificación de Títulos

## 🏢 Prueba como EMPRESA

### Orden de Campos:
1. **NIT de la Empresa** → Se digita manualmente
2. **Nombre de la Empresa** → Se carga automáticamente (NO editable)
3. **Correo Empresarial** → Se carga automáticamente (NO editable)
4. **Persona que Solicita** → Se digita manualmente

### Empresas de Prueba:

| NIT | Nombre de la Empresa | Correo Empresarial |
|-----|---------------------|-------------------|
| `900123456-7` | Accenture Colombia S.A.S. | rrhh@accenture.com.co |
| `860123456-1` | Ecopetrol S.A. | talento@ecopetrol.com.co |
| `900987654-3` | Bancolombia S.A. | seleccion@bancolombia.com.co |
| `800456789-2` | Ministerio de Hacienda y Crédito Público | gestionhumana@minhacienda.gov.co |
| `899999063-3` | Departamento Administrativo de la Función Pública | talento@funcionpublica.gov.co |

### Pasos para Probar:

1. Seleccionar **"Empresa"** como tipo de solicitante
2. Ingresar el **NIT** (por ejemplo: `900123456-7`)
3. Esperar a que se carguen automáticamente:
   - Nombre de la Empresa
   - Correo Empresarial (a donde llegará el certificado)
4. Completar **"Persona que Solicita"** (ej: María Fernández)
5. Completar datos del graduado:
   - Número de Cédula
   - Fecha de Grado
   - Nombre Completo
6. ✅ **Aceptar los términos y condiciones** (OBLIGATORIO)
7. Hacer clic en **"Enviar Solicitud"**

### ⚠️ Notas Importantes:

- ❌ **NO se solicita** correo electrónico del graduado cuando es empresa
- ✅ El certificado se envía **ÚNICAMENTE** al correo empresarial autocargado
- 🔒 Los campos autocargados **NO son editables**
- 📜 **OBLIGATORIO** aceptar términos y condiciones para enviar

---

## 👤 Prueba como GRADUADO

### Campos:
- Número de Cédula del Graduado
- Fecha de Grado
- Nombre Completo del Graduado
- Correo Electrónico (donde recibirá el certificado)

### Pasos:
1. Seleccionar **"Graduado"** como tipo de solicitante
2. Completar todos los datos personales
3. ✅ **Aceptar los términos y condiciones** (OBLIGATORIO)
4. Hacer clic en **"Enviar Solicitud"**

---

## 📜 Términos y Condiciones - Habeas Data

### Ley 1581 de 2012 y Decreto 1377 de 2013

El sistema incluye un checkbox obligatorio donde el usuario autoriza a la ESAP para:

- ✅ Verificar la autenticidad de la información académica del graduado
- ✅ Generar y expedir certificados de verificación de títulos
- ✅ Enviar el certificado al correo electrónico registrado
- ✅ Mantener un registro histórico de las solicitudes realizadas

**Si no se acepta, el botón "Enviar Solicitud" permanece deshabilitado.**

---

## 🎨 Diseño Corporativo ESAP

- Colores: Azul `#003DA5` / `#2962FF` y Naranja `#F57C00`
- Estilo: Clean, profesional, similar a SAP Fiori
- Responsive: Mobile-first
- Sin componentes de design-system, solo HTML/Tailwind puro
