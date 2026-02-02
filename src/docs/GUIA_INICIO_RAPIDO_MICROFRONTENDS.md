# 🚀 GUÍA DE INICIO RÁPIDO - MIGRACIÓN A MICRO-FRONTENDS

## 📋 Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Fase 1: Preparación](#fase-1-preparación)
3. [Fase 2: Creación de Estructura](#fase-2-creación-de-estructura)
4. [Fase 3: Migración de Módulos](#fase-3-migración-de-módulos)
5. [Fase 4: Testing y Validación](#fase-4-testing-y-validación)
6. [Fase 5: Despliegue](#fase-5-despliegue)
7. [Checklist de Migración](#checklist-de-migración)

---

## 🎯 Resumen Ejecutivo

### Objetivo
Migrar el Backoffice ESAP de una arquitectura monolítica a **Micro-Frontends** para mejorar:
- ✅ **Escalabilidad** del proyecto
- ✅ **Mantenibilidad** del código
- ✅ **Performance** de carga
- ✅ **Seguridad** por aislamiento
- ✅ **Independencia** de equipos

### Tiempo Estimado
- **Fase 1**: 2 horas (Preparación)
- **Fase 2**: 4 horas (Estructura base)
- **Fase 3**: 40-60 horas (Migración gradual de módulos)
- **Fase 4**: 8 horas (Testing)
- **Fase 5**: 4 horas (Despliegue)

**Total**: ~60-80 horas de trabajo

### Estrategia
**Migración GRADUAL** - Mover módulo por módulo sin romper funcionalidad existente

---

## 📦 FASE 1: Preparación (2 horas)

### 1.1. Backup del Proyecto Actual

```bash
# Crear rama de backup
git checkout -b backup-antes-microfrontends
git add .
git commit -m "Backup antes de migración a micro-frontends"
git push origin backup-antes-microfrontends

# Crear rama de desarrollo
git checkout -b feature/micro-frontends-migration
```

### 1.2. Instalar Dependencias Necesarias

```bash
# Ya están instaladas, pero verificar versiones
npm list react react-dom react-router-dom
```

### 1.3. Analizar Estructura Actual

```bash
# Generar reporte de tamaño de módulos
npx source-map-explorer 'dist/**/*.js' > analysis/bundle-size.txt

# Contar líneas por módulo
find components/esap/control-interno -name "*.tsx" | xargs wc -l
find components/certificados-laborales -name "*.tsx" | xargs wc -l
```

---

## 🏗️ FASE 2: Creación de Estructura (4 horas)

### 2.1. Crear Carpeta de Módulos

```bash
# Crear estructura base
mkdir -p modules/core/components
mkdir -p modules/core/hooks
mkdir -p modules/core/services
mkdir -p modules/core/contexts
mkdir -p modules/core/types

mkdir -p shared/components/ui
mkdir -p shared/hooks
mkdir -p shared/services
mkdir -p shared/utils
mkdir -p shared/types
mkdir -p shared/contexts

mkdir -p config
```

### 2.2. Mover Componentes Compartidos (Shared)

```bash
# Mover componentes UI (Shadcn)
mv components/ui/* shared/components/ui/

# Mover componentes compartidos
mv components/shared/* shared/components/shared/

# Mover componentes de diseño
mv components/design-system/* shared/components/design-system/

# Mover componentes Figma
mv components/figma/* shared/components/figma/

# Mover ErrorBoundary
mv components/ErrorBoundary.tsx shared/components/ErrorBoundary.tsx
```

### 2.3. Crear Módulo Core (Shell)

```bash
# Mover componentes principales a core
mv components/esap/BackofficeApp.tsx modules/core/components/
mv components/esap/LoginPage.tsx modules/core/components/
mv components/esap/TopBar.tsx modules/core/components/
mv components/esap/SidebarPremium.tsx modules/core/components/
mv components/esap/UserMenu.tsx modules/core/components/

# Mover hooks de autenticación
mv hooks/useAuth.ts modules/core/hooks/
mv hooks/useRoles.ts modules/core/hooks/

# Mover servicios de autenticación
mv services/api/auth.service.ts modules/core/services/
mv services/api/client.ts modules/core/services/
mv services/api/config.ts modules/core/services/

# Mover contexto de notificaciones
mv components/esap/NotificationsContext.tsx modules/core/contexts/
mv contexts/NotificacionesContext.tsx modules/core/contexts/
```

### 2.4. Crear archivo index.ts para Core

```typescript
// modules/core/index.ts
export { BackofficeApp } from './components/BackofficeApp';
export { LoginPage } from './components/LoginPage';
export { TopBar } from './components/TopBar';
export { SidebarPremium } from './components/SidebarPremium';

export { useAuth } from './hooks/useAuth';
export { useRoles } from './hooks/useRoles';

export type { User, AuthState } from './types/core.types';
```

### 2.5. Actualizar Imports en Archivos Movidos

```bash
# Usar herramienta de búsqueda y reemplazo en VSCode
# Buscar: from '../ui/
# Reemplazar con: from '@/shared/components/ui/

# Buscar: from '../../ui/
# Reemplazar con: @/shared/components/ui/
```

---

## 🔄 FASE 3: Migración de Módulos (40-60 horas)

### Orden de Migración Recomendado

1. ✅ **Estructura Organizacional** (más simple, pocas dependencias)
2. ✅ **Roles y Permisos** (base para otros módulos)
3. ✅ **Personas** (usado por muchos módulos)
4. ✅ **Certificados Laborales** (independiente)
5. ✅ **Gestión Profesoral** (complejidad media)
6. ✅ **Control Interno** (más complejo, muchos subcomponentes)
7. ✅ **Gestión Legal**
8. ✅ **Arquitectura Empresarial**
9. ✅ **Firma Electrónica**
10. ✅ **Registro Académico**
11. ✅ **Enrolamiento**
12. ✅ **Auditoría Sistema**
13. ✅ **Portal Público**

---

### 3.1. MIGRAR MÓDULO: ESTRUCTURA ORGANIZACIONAL

```bash
# Crear estructura del módulo
mkdir -p modules/estructura-organizacional/components
mkdir -p modules/estructura-organizacional/hooks
mkdir -p modules/estructura-organizacional/services
mkdir -p modules/estructura-organizacional/types
mkdir -p modules/estructura-organizacional/data

# Mover componentes
mv components/estructura-organizacional/* modules/estructura-organizacional/components/

# Mover servicios
mv services/api/estructura.service.ts modules/estructura-organizacional/services/

# Mover tipos
mv types/estructura-organizacional.types.ts modules/estructura-organizacional/types/

# Mover datos
mv data/estructura-organizacional-completa.ts modules/estructura-organizacional/data/
mv data/territoriales-cetap-completo.ts modules/estructura-organizacional/data/
```

**Crear archivo index.ts:**

```typescript
// modules/estructura-organizacional/index.ts
import { lazy } from 'react';

export default lazy(() => import('./components/EstructuraOrganizacionalModule'));

// Exportaciones necesarias para otros módulos
export { SelectorTerritorialYSede } from './components/SelectorTerritorialYSede';
export { BadgesSedesUsuario } from './components/BadgesSedesUsuario';
export type { Sede, Territorial } from './types/estructura-organizacional.types';
```

**Actualizar imports dentro del módulo:**

```typescript
// modules/estructura-organizacional/components/EstructuraOrganizacionalModule.tsx

// ❌ ANTES
import { Button } from '../../ui/button';
import { estructuraCompleta } from '../../data/estructura-organizacional-completa';

// ✅ DESPUÉS
import { Button } from '@/shared/components/ui/button';
import { estructuraCompleta } from '../data/estructura-organizacional-completa';
```

---

### 3.2. MIGRAR MÓDULO: CONTROL INTERNO

```bash
# Crear estructura
mkdir -p modules/control-interno/components
mkdir -p modules/control-interno/components/listas-chequeo
mkdir -p modules/control-interno/components/modals
mkdir -p modules/control-interno/hooks
mkdir -p modules/control-interno/services
mkdir -p modules/control-interno/contexts
mkdir -p modules/control-interno/types
mkdir -p modules/control-interno/utils
mkdir -p modules/control-interno/data

# Mover componentes
cp -r components/esap/control-interno/* modules/control-interno/components/

# Mover hooks
mv hooks/useIntegracionControlInterno.ts modules/control-interno/hooks/
mv hooks/useAuditQueries.ts modules/control-interno/hooks/

# Mover servicios
mv services/api/controlInternoService.ts modules/control-interno/services/

# Mover contextos
# (Ya están en components/esap/control-interno, se mueven automáticamente)

# Mover tipos
mv types/control-interno.ts modules/control-interno/types/
```

**Crear index.ts:**

```typescript
// modules/control-interno/index.ts
import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ControlInternoContext } from './contexts/ControlInternoContext';

const DashboardEjecutivoCIG = lazy(() => import('./components/DashboardEjecutivoCIG'));
const ProgramaAnualCIG = lazy(() => import('./components/ProgramaAnualCIG'));
const GestionAuditoriasKanbanSimple = lazy(() => import('./components/GestionAuditoriasKanbanSimple'));
const PlanesMejoramientoModuleRediseno = lazy(() => import('./components/PlanesMejoramientoModuleRediseno'));
const ExpedientesModulePremium = lazy(() => import('./components/ExpedientesModulePremium'));

export default function ControlInternoModule() {
  return (
    <ControlInternoContext.Provider>
      <Routes>
        <Route index element={<DashboardEjecutivoCIG />} />
        <Route path="programa-anual" element={<ProgramaAnualCIG />} />
        <Route path="auditorias" element={<GestionAuditoriasKanbanSimple />} />
        <Route path="planes-mejoramiento" element={<PlanesMejoramientoModuleRediseno />} />
        <Route path="expedientes" element={<ExpedientesModulePremium />} />
      </Routes>
    </ControlInternoContext.Provider>
  );
}

export { ControlInternoContext } from './contexts/ControlInternoContext';
export { HallazgosContext } from './contexts/HallazgosContext';
export { TareasContext } from './contexts/TareasContext';
export type { Auditoria, PlanMejoramiento, Hallazgo } from './types/control-interno';
```

---

### 3.3. MIGRAR MÓDULO: CERTIFICADOS LABORALES

```bash
# Crear estructura
mkdir -p modules/certificados-laborales/components
mkdir -p modules/certificados-laborales/hooks
mkdir -p modules/certificados-laborales/services
mkdir -p modules/certificados-laborales/types
mkdir -p modules/certificados-laborales/data

# Mover componentes
mv components/certificados-laborales/* modules/certificados-laborales/components/

# Mover servicios
mv services/api/certificados.service.ts modules/certificados-laborales/services/
mv lib/api/certificadosAPI.ts modules/certificados-laborales/services/

# Mover tipos
mv types/certificados.ts modules/certificados-laborales/types/

# Mover datos
mv data/empleadosElegiblesCertificados.ts modules/certificados-laborales/data/
mv data/permissions-certificados-registro-granular.ts modules/certificados-laborales/data/
```

**Crear index.ts:**

```typescript
// modules/certificados-laborales/index.ts
import { lazy } from 'react';

export default lazy(() => import('./components/CertificadosLaboralesRouter'));

export type { Certificado, SolicitudCertificado } from './types/certificados';
```

---

### 3.4. Repetir para Todos los Módulos

Aplicar el mismo proceso para:
- ✅ Personas
- ✅ Roles y Permisos  
- ✅ Gestión Profesoral
- ✅ Gestión Legal
- ✅ Arquitectura Empresarial
- ✅ Firma Electrónica
- ✅ Registro Académico
- ✅ Enrolamiento
- ✅ Auditoría Sistema
- ✅ Portal Público

---

## 🧪 FASE 4: Testing y Validación (8 horas)

### 4.1. Verificar que Todo Compila

```bash
# Limpiar y reconstruir
rm -rf node_modules dist
npm install
npm run build

# Verificar errores
npm run type-check
npm run lint
```

### 4.2. Probar Carga de Módulos

```bash
# Modo desarrollo
npm run dev

# Abrir en navegador y verificar:
# 1. Login funciona
# 2. Sidebar muestra todos los módulos
# 3. Cada módulo carga correctamente
# 4. No hay errores en consola
# 5. Performance es buena
```

### 4.3. Testing Funcional

**Crear suite de tests:**

```typescript
// tests/modules/control-interno.test.tsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ControlInternoModule from '@/modules/control-interno';

describe('Control Interno Module', () => {
  it('should load without crashing', async () => {
    render(
      <BrowserRouter>
        <ControlInternoModule />
      </BrowserRouter>
    );
    
    // Esperar a que cargue
    await screen.findByText(/Control Interno/i);
  });
});
```

### 4.4. Performance Testing

```bash
# Analizar bundle size
npm run build
npx source-map-explorer 'dist/**/*.js'

# Verificar que los módulos se cargan lazy
# Debe haber archivos separados para cada módulo
ls -lh dist/assets/
```

**Objetivos de Performance:**
- ✅ Bundle inicial < 500 KB
- ✅ Cada módulo < 200 KB
- ✅ First Contentful Paint < 1.5s
- ✅ Time to Interactive < 3s

---

## 🚀 FASE 5: Despliegue (4 horas)

### 5.1. Configurar Vite para Módulos

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@modules': path.resolve(__dirname, './modules'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'core': ['./modules/core/index.ts'],
          'control-interno': ['./modules/control-interno/index.ts'],
          'certificados': ['./modules/certificados-laborales/index.ts'],
          'personas': ['./modules/personas/index.ts'],
          'gestion-profesoral': ['./modules/gestion-profesoral/index.ts'],
          // ... más módulos
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

### 5.2. Configurar tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@modules/*": ["./modules/*"],
      "@shared/*": ["./shared/*"],
      "@core/*": ["./modules/core/*"]
    }
  },
  "include": [
    "modules/**/*.ts",
    "modules/**/*.tsx",
    "shared/**/*.ts",
    "shared/**/*.tsx",
    "App.tsx",
    "main.tsx"
  ],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 5.3. Build y Deploy

```bash
# Build de producción
npm run build

# Verificar tamaño
du -sh dist

# Deploy a staging
npm run deploy:staging

# Pruebas en staging
npm run test:e2e:staging

# Deploy a producción
npm run deploy:production
```

---

## ✅ CHECKLIST DE MIGRACIÓN

### Pre-Migración
- [ ] Backup del proyecto actual
- [ ] Crear rama de desarrollo
- [ ] Documentar dependencias actuales
- [ ] Analizar estructura de carpetas
- [ ] Identificar dependencias entre módulos

### Estructura Base
- [ ] Crear carpeta `modules/`
- [ ] Crear carpeta `shared/`
- [ ] Crear módulo `core`
- [ ] Mover componentes UI compartidos
- [ ] Configurar aliases en tsconfig.json
- [ ] Configurar aliases en vite.config.ts

### Migración de Módulos (Por cada módulo)
- [ ] Crear estructura de carpetas del módulo
- [ ] Mover componentes
- [ ] Mover hooks
- [ ] Mover servicios
- [ ] Mover tipos
- [ ] Mover datos mock
- [ ] Crear archivo index.ts
- [ ] Actualizar imports internos
- [ ] Probar compilación
- [ ] Probar funcionalidad

### Testing
- [ ] Tests unitarios pasan
- [ ] Tests de integración pasan
- [ ] No hay errores en consola
- [ ] Performance es aceptable
- [ ] Bundle size es correcto
- [ ] Lazy loading funciona

### Documentación
- [ ] Actualizar README.md
- [ ] Documentar estructura de módulos
- [ ] Crear guías de desarrollo
- [ ] Documentar comunicación entre módulos
- [ ] Actualizar diagramas de arquitectura

### Despliegue
- [ ] Configurar CI/CD
- [ ] Deploy a staging exitoso
- [ ] Pruebas en staging
- [ ] Deploy a producción
- [ ] Monitoreo activo
- [ ] Rollback plan preparado

---

## 📊 KPIs de Éxito

### Antes vs Después

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|---------|
| Bundle inicial | ~2.5 MB | ~500 KB | **80%** |
| Tiempo de carga | ~5s | ~1.5s | **70%** |
| Módulos independientes | 0 | 13 | **∞** |
| Acoplamiento | Alto | Bajo | **↓ 90%** |
| Despliegues/mes | 2 | 20+ | **↑ 10x** |

### Objetivos Post-Migración

- ✅ **Bundle inicial < 500 KB**
- ✅ **Cada módulo desplegable independientemente**
- ✅ **Zero downtime deployments**
- ✅ **Rollback en < 2 minutos**
- ✅ **Performance Score > 90**

---

## 🆘 Troubleshooting

### Problema: Imports no resuelven

```bash
# Limpiar cache
rm -rf node_modules/.vite
npm run dev
```

### Problema: Errores de tipos TypeScript

```bash
# Regenerar tipos
npm run type-check
```

### Problema: Módulo no carga

```typescript
// Verificar que el index.ts exporta correctamente
// modules/nombre-modulo/index.ts
export default lazy(() => import('./components/MainComponent'));
```

### Problema: Performance degradada

```bash
# Analizar bundle
npx source-map-explorer 'dist/**/*.js'

# Verificar lazy loading
# Deben existir chunks separados en dist/assets/
```

---

## 📞 Soporte

**Equipo de Arquitectura Frontend**
- 📧 arquitectura@esap.edu.co
- 💬 Slack: #micro-frontends
- 📖 Wiki: https://wiki.esap.edu.co

---

## 📚 Recursos Adicionales

- [ARQUITECTURA_MICRO_FRONTENDS.md](./ARQUITECTURA_MICRO_FRONTENDS.md) - Documentación técnica completa
- [React Lazy](https://react.dev/reference/react/lazy)
- [Vite Code Splitting](https://vitejs.dev/guide/features.html#code-splitting)
- [Module Federation](https://webpack.js.org/concepts/module-federation/)

---

**Guía de Inicio Rápido v1.0 - Enero 2026**  
**ESAP - Backoffice Administrativo ComUNIdad**
