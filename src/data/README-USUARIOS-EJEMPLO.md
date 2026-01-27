# 📚 Usuarios de Ejemplo - Backoffice ESAP

## 📋 Descripción

Este archivo contiene **12 usuarios de ejemplo** (uno por cada rol del sistema) para facilitar el desarrollo y pruebas del Backoffice Administrativo de ESAP.

## ✅ Optimización Realizada

**ANTES:** ~400 usuarios mock con datos extensos (~5,000+ líneas)  
**AHORA:** 12 usuarios (1 por rol) (~430 líneas)  
**REDUCCIÓN:** ~92% del tamaño original

---

## 👥 Lista de Usuarios de Ejemplo

| # | Rol | Nombre | Email | Alcance | Sede |
|---|-----|--------|-------|---------|------|
| 1 | Super Administrador | Ana María López | ana.lopez@esap.edu.co | Nacional | Bogotá |
| 2 | Admin Sistema | Carlos Andrés Ruiz | carlos.ruiz@esap.edu.co | Nacional | Bogotá |
| 3 | Director Nacional | María Fernanda Torres | maria.torres@esap.edu.co | Nacional | Bogotá |
| 4 | Director Territorial | Jorge Luis Martínez | jorge.martinez@esap.edu.co | Territorial | Medellín |
| 5 | Coordinador CETAP | Claudia Patricia Hernández | claudia.hernandez@esap.edu.co | CETAP | Ibagué |
| 6 | Docente | Pedro Antonio Vargas | pedro.vargas@esap.edu.co | Territorial | Cali |
| 7 | Estudiante | Laura Valentina Cardona | laura.cardona@estudiantes.esap.edu.co | Territorial | Medellín |
| 8 | Graduado | Andrés Felipe Gómez | andres.gomez@graduados.esap.edu.co | Nacional | Bogotá |
| 9 | Coord. Académico | Diana Carolina Rojas | diana.rojas@esap.edu.co | Territorial | Bucaramanga |
| 10 | Secretario Académico | Roberto Carlos Salazar | roberto.salazar@esap.edu.co | Territorial | Cartagena |
| 11 | Coord. Certificados | Sandra Milena Quintero | sandra.quintero@esap.edu.co | Territorial | Pasto |
| 12 | Coord. Arq. Empresarial | Luis Fernando Parra | luis.parra@esap.edu.co | Nacional | Bogotá |

---

## 💻 Cómo Usar

### **Importar en Componentes**

```typescript
import { USUARIOS_EJEMPLO } from '../data/usuarios-ejemplo';

// Obtener todos los usuarios
const usuarios = USUARIOS_EJEMPLO;
```

### **Buscar Usuario por Rol**

```typescript
import { obtenerUsuarioPorRol } from '../data/usuarios-ejemplo';

// Obtener el usuario con rol de docente
const docente = obtenerUsuarioPorRol('DOCENTE');
console.log(docente?.email); // pedro.vargas@esap.edu.co
```

### **Buscar Usuario por Email**

```typescript
import { obtenerUsuarioPorEmail } from '../data/usuarios-ejemplo';

const usuario = obtenerUsuarioPorEmail('ana.lopez@esap.edu.co');
console.log(usuario?.roles[0].name); // Super Administrador
```

### **Filtrar por Alcance**

```typescript
import { obtenerUsuariosPorAlcance } from '../data/usuarios-ejemplo';

// Obtener todos los usuarios territoriales
const territoriales = obtenerUsuariosPorAlcance('territorial');
console.log(territoriales.length); // 6 usuarios
```

### **Obtener Estadísticas**

```typescript
import { obtenerEstadisticasUsuarios } from '../data/usuarios-ejemplo';

const stats = obtenerEstadisticasUsuarios();
console.log(stats);
// {
//   total: 12,
//   activos: 12,
//   bloqueados: 0,
//   pendientes: 0,
//   porAlcance: {
//     nacional: 4,
//     territorial: 7,
//     cetap: 1
//   }
// }
```

---

## 🔐 Roles Disponibles

### **1. Roles de Sistema**
- `SUPER_ADMIN` - Super Administrador (Ana López)
- `ADMIN_SISTEMA` - Administrador de Sistema (Carlos Ruiz)

### **2. Roles Directivos**
- `DIRECTOR_NACIONAL` - Director Nacional (María Torres)
- `DIRECTOR_TERRITORIAL` - Director Territorial (Jorge Martínez)
- `COORDINADOR_CETAP` - Coordinador CETAP (Claudia Hernández)

### **3. Roles Académicos**
- `DOCENTE` - Docente (Pedro Vargas)
- `ESTUDIANTE` - Estudiante (Laura Cardona)
- `GRADUADO` - Graduado (Andrés Gómez)

### **4. Roles Operativos**
- `COORD_ACADEMICO` - Coordinador Académico (Diana Rojas)
- `SECRETARIO_ACADEMICO` - Secretario Académico (Roberto Salazar)
- `COORD_CERTIFICADOS` - Coordinador de Certificados (Sandra Quintero)
- `COORD_ARQ_EMPRESARIAL` - Coordinador de Arquitectura Empresarial (Luis Parra)

---

## 📍 Distribución Geográfica

### **Sede Central - Bogotá**
- Ana López (Super Admin)
- Carlos Ruiz (Admin Sistema)
- María Torres (Director Nacional)
- Andrés Gómez (Graduado)
- Luis Parra (Coord. Arq. Empresarial)

### **Territoriales**
- **Medellín:** Jorge Martínez (Director), Laura Cardona (Estudiante)
- **Cali:** Pedro Vargas (Docente)
- **Bucaramanga:** Diana Rojas (Coord. Académico)
- **Cartagena:** Roberto Salazar (Secretario Académico)
- **Pasto:** Sandra Quintero (Coord. Certificados)

### **CETAP**
- **Ibagué:** Claudia Hernández (Coordinador CETAP)

---

## ⚙️ Configuración de Desarrollo

### **Usar en Hooks**

Si tienes un hook que usa usuarios mock, actualízalo así:

**ANTES:**
```typescript
import { MOCK_USERS_WITH_SEDES } from '../data/mockUsersWithSedes';

const usuarios = MOCK_USERS_WITH_SEDES; // Array vacío []
```

**DESPUÉS:**
```typescript
import { USUARIOS_EJEMPLO } from '../data/usuarios-ejemplo';

const usuarios = USUARIOS_EJEMPLO; // 12 usuarios reales
```

### **Re-exportación Automática**

El archivo `mockUsersWithSedes.ts` ya re-exporta automáticamente los usuarios de ejemplo:

```typescript
import { USUARIOS_EJEMPLO } from '../data/mockUsersWithSedes';
// Funciona igual que importar desde usuarios-ejemplo.ts
```

---

## 🧪 Casos de Uso en Testing

### **Probar Permisos por Rol**

```typescript
import { USUARIOS_EJEMPLO } from '../data/usuarios-ejemplo';

// Probar que Super Admin tiene acceso total
const superAdmin = USUARIOS_EJEMPLO[0];
expect(superAdmin.roles[0].code).toBe('SUPER_ADMIN');

// Probar que Estudiante tiene acceso limitado
const estudiante = USUARIOS_EJEMPLO.find(u => 
  u.roles.some(r => r.code === 'ESTUDIANTE')
);
expect(estudiante?.roles[0].alcance).toBe('territorial');
```

### **Simular Login por Rol**

```typescript
import { obtenerUsuarioPorRol } from '../data/usuarios-ejemplo';

function simularLogin(codigoRol: string) {
  const usuario = obtenerUsuarioPorRol(codigoRol);
  if (usuario) {
    localStorage.setItem('currentUser', JSON.stringify(usuario));
    return true;
  }
  return false;
}

// Simular login como docente
simularLogin('DOCENTE');
```

---

## 📊 Estructura de Datos

Cada usuario tiene la siguiente estructura:

```typescript
{
  id: string;              // Identificador único del usuario
  personId: string;        // ID en el módulo de Personas
  firstName: string;       // Nombre
  lastName: string;        // Apellido
  email: string;           // Correo electrónico
  phone: string;           // Teléfono
  status: 'active' | 'blocked' | 'pending'; // Estado
  roles: Array<{          // Roles asignados
    id: string;
    name: string;
    code: string;
    alcance: 'nacional' | 'territorial' | 'cetap';
    unidadOrganizacionalId?: string;
  }>;
  location: string;        // Ciudad
  sedes: Array<{          // Sedes asignadas
    id: string;
    codigo: string;
    nombre: string;
    nivel: 'sede-central' | 'territorial' | 'cetap';
    esPrincipal: boolean;
  }>;
  enrollmentMethod: 'qr' | 'manual' | 'massive'; // Método de registro
  enrollmentDate: string;  // Fecha de registro
  lastLogin?: string;      // Último acceso
  documentType: string;    // Tipo de documento (CC, CE, etc.)
  documentNumber: string;  // Número de documento
  birthDate?: string;      // Fecha de nacimiento
  address?: string;        // Dirección
  program?: string;        // Programa académico (si aplica)
}
```

---

## ⚠️ Notas Importantes

1. **Datos NO Reales:** Estos usuarios son **ficticios** para desarrollo/pruebas
2. **Producción:** En producción, usar la API real del módulo de Personas
3. **Seguridad:** NO usar estos usuarios en ambiente productivo
4. **Actualización:** Si se agregan nuevos roles, agregar usuarios correspondientes

---

## 🔄 Migración desde Datos Antiguos

Si tu código usaba `MOCK_USERS_WITH_SEDES` (el array de 400+ usuarios):

### **Paso 1: Actualizar Import**
```typescript
// ❌ ANTES
import { MOCK_USERS_WITH_SEDES } from '../data/mockUsersWithSedes';

// ✅ AHORA
import { USUARIOS_EJEMPLO } from '../data/usuarios-ejemplo';
```

### **Paso 2: Actualizar Variable**
```typescript
// ❌ ANTES
const usuarios = MOCK_USERS_WITH_SEDES;

// ✅ AHORA
const usuarios = USUARIOS_EJEMPLO;
```

### **Paso 3: Verificar Lógica**
Si tu código asumía muchos usuarios, actualiza la lógica:

```typescript
// ❌ ANTES - Asumía 400+ usuarios
const primerPaginaUsuarios = MOCK_USERS_WITH_SEDES.slice(0, 50);

// ✅ AHORA - Solo 12 usuarios
const todosLosUsuarios = USUARIOS_EJEMPLO;
```

---

## 📞 Soporte

Si tienes preguntas sobre los usuarios de ejemplo:
- Revisa el código fuente: `/data/usuarios-ejemplo.ts`
- Consulta las funciones helper incluidas
- Lee la documentación de roles: `/types/roles-sistema.types.ts`

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0  
**Proyecto:** Backoffice Administrativo ESAP
