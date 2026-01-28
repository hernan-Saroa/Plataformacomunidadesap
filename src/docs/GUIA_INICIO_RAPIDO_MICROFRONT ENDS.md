# 🚀 GUÍA DE INICIO RÁPIDO - MICRO FRONTENDS ESAP

## Implementación Paso a Paso

---

## 📋 PRE-REQUISITOS

Antes de comenzar, asegúrate de tener instalado:

```bash
# Node.js 20+
node --version  # v20.x.x

# PNPM 8+
pnpm --version  # 8.15.0

# Git
git --version
```

Si no tienes PNPM:
```bash
npm install -g pnpm@8.15.0
```

---

## 🎯 FASE 1: SETUP INICIAL DEL MONOREPO

### Paso 1: Crear estructura base

```bash
# 1. Crear directorio raíz
mkdir esap-backoffice-monorepo
cd esap-backoffice-monorepo

# 2. Inicializar Git
git init
git branch -M main

# 3. Inicializar PNPM
pnpm init

# 4. Crear estructura de carpetas
mkdir -p packages/{shell,shared,mf-portal,mf-personas,mf-control-interno}
mkdir -p tools/{scripts,configs}
mkdir -p docs
mkdir -p .github/workflows
```

### Paso 2: Configurar PNPM Workspace

Crear `pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
```

### Paso 3: Configurar Root `package.json`

Editar `package.json`:
```json
{
  "name": "esap-backoffice-monorepo",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@8.15.0",
  "scripts": {
    "dev": "turbo run dev --parallel",
    "dev:shell": "pnpm --filter shell dev",
    "dev:portal": "pnpm --filter mf-portal dev",
    "dev:personas": "pnpm --filter mf-personas dev",
    "build": "turbo run build",
    "build:shell": "pnpm --filter shell build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^1.12.0",
    "typescript": "^5.3.0",
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

### Paso 4: Configurar Turborepo

Crear `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### Paso 5: Instalar dependencias raíz

```bash
pnpm install
```

---

## 📦 FASE 2: CREAR SHARED LIBRARY

### Paso 1: Inicializar package shared

```bash
cd packages/shared
pnpm init
```

### Paso 2: Configurar `package.json`

```json
{
  "name": "@esap/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./components": "./src/components/index.ts",
    "./hooks": "./src/hooks/index.ts",
    "./utils": "./src/utils/index.ts",
    "./types": "./src/types/index.ts"
  },
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

### Paso 3: Crear estructura de shared

```bash
mkdir -p src/{components,hooks,utils,types,styles}
touch src/index.ts
```

### Paso 4: Configurar TypeScript

Crear `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

### Paso 5: Mover componentes compartidos actuales

```bash
# Desde el proyecto original, copiar a shared:
# - components/ui/* → packages/shared/src/components/ui/
# - hooks/* → packages/shared/src/components/hooks/
# - utils/* → packages/shared/src/utils/
# - types/* → packages/shared/src/types/
```

---

## 🏠 FASE 3: CREAR SHELL (HOST)

### Paso 1: Inicializar proyecto Vite

```bash
cd packages/shell
pnpm create vite . --template react-ts
```

### Paso 2: Instalar dependencias

```bash
pnpm add react-router-dom zustand @tanstack/react-query
pnpm add -D @originjs/vite-plugin-federation
```

### Paso 3: Configurar `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        mfPortal: {
          external: 'http://localhost:5001/assets/remoteEntry.js',
          format: 'esm',
          from: 'vite',
        },
        mfPersonas: {
          external: 'http://localhost:5002/assets/remoteEntry.js',
          format: 'esm',
          from: 'vite',
        },
        mfControlInterno: {
          external: 'http://localhost:5003/assets/remoteEntry.js',
          format: 'esm',
          from: 'vite',
        },
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.2.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.2.0',
        },
        'react-router-dom': {
          singleton: true,
        },
      },
    }),
  ],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
  },
  server: {
    port: 5000,
    cors: true,
  },
});
```

### Paso 4: Crear App.tsx

```typescript
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

// @ts-ignore - Module Federation
const PortalApp = lazy(() => import('mfPortal/App'));
// @ts-ignore
const PersonasApp = lazy(() => import('mfPersonas/App'));
// @ts-ignore
const ControlInternoApp = lazy(() => import('mfControlInterno/App'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando módulo...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/portal/*"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <PortalApp />
              </Suspense>
            }
          />
          <Route
            path="/personas/*"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <PersonasApp />
              </Suspense>
            }
          />
          <Route
            path="/control-interno/*"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ControlInternoApp />
              </Suspense>
            }
          />
          <Route
            path="/"
            element={
              <div className="p-8">
                <h1 className="text-3xl font-bold mb-4">Backoffice ESAP</h1>
                <nav className="space-y-2">
                  <a href="/portal" className="block text-blue-600 hover:underline">
                    → Portal Público
                  </a>
                  <a href="/personas" className="block text-blue-600 hover:underline">
                    → Gestión de Personas
                  </a>
                  <a href="/control-interno" className="block text-blue-600 hover:underline">
                    → Control Interno
                  </a>
                </nav>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

---

## 🌐 FASE 4: CREAR PRIMER REMOTE (MF-PORTAL)

### Paso 1: Inicializar proyecto

```bash
cd packages/mf-portal
pnpm create vite . --template react-ts
```

### Paso 2: Instalar dependencias

```bash
pnpm add react-router-dom
pnpm add -D @originjs/vite-plugin-federation
```

### Paso 3: Configurar `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfPortal',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App.tsx',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.2.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.2.0',
        },
        'react-router-dom': {
          singleton: true,
        },
      },
    }),
  ],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: false,
  },
  server: {
    port: 5001,
    cors: true,
  },
});
```

### Paso 4: Crear estructura de rutas

```bash
mkdir -p src/routes
```

Crear `src/App.tsx`:
```typescript
import React from 'react';
import { Routes, Route } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Portal Público ESAP</h1>
      <p>Bienvenido al portal de la comunidad universitaria</p>
    </div>
  );
}

function PortalApp() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<div>Login Page</div>} />
    </Routes>
  );
}

export default PortalApp;
```

### Paso 5: Modificar `src/main.tsx` para modo standalone

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Solo renderizar en modo desarrollo standalone
if (import.meta.env.DEV) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

export default App;
```

---

## 🚀 FASE 5: PROBAR LA INTEGRACIÓN

### Paso 1: Instalar dependencias de todos los packages

```bash
# Desde la raíz del monorepo
pnpm install
```

### Paso 2: Iniciar todos los servicios

Opción A: Manualmente en diferentes terminales

```bash
# Terminal 1: Shell
cd packages/shell
pnpm dev

# Terminal 2: Portal
cd packages/mf-portal
pnpm dev

# Terminal 3: Personas (cuando lo crees)
cd packages/mf-personas
pnpm dev
```

Opción B: Usar Turborepo

```bash
# Desde la raíz
pnpm dev
```

### Paso 3: Verificar funcionamiento

1. Abrir http://localhost:5000 (Shell)
2. Navegar a http://localhost:5000/portal
3. Verificar que carga el módulo remoto

### Paso 4: Verificar modo standalone

1. Abrir http://localhost:5001 (Portal directo)
2. Debe funcionar independientemente

---

## 🔄 FASE 6: MIGRAR CÓDIGO EXISTENTE

### Paso 1: Identificar componentes del Portal

```bash
# En el proyecto actual, componentes de Portal:
components/portal/
├── LandingPage.tsx
├── LoginPage.tsx
├── EnrollmentQRLandingUnified.tsx
├── PublicNavbar.tsx
└── ...
```

### Paso 2: Copiar archivos

```bash
# Copiar componentes del portal
cp -r ../esap-original/components/portal/* packages/mf-portal/src/routes/

# Copiar assets necesarios
cp -r ../esap-original/public/* packages/mf-portal/public/
```

### Paso 3: Actualizar imports

Cambiar todos los imports de componentes compartidos:

```typescript
// ❌ Antes
import { Button } from '../ui/button';
import { useAuth } from '../hooks/useAuth';

// ✅ Después
import { Button } from '@esap/shared/components/ui/button';
import { useAuth } from '@esap/shared/hooks/useAuth';
```

### Paso 4: Configurar alias de imports

En `vite.config.ts` de cada módulo:

```typescript
import path from 'path';

export default defineConfig({
  // ...
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@esap/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
```

---

## 📝 CHECKLIST DE VERIFICACIÓN

### Para cada micro frontend creado:

- [ ] ✅ Package.json configurado correctamente
- [ ] ✅ vite.config.ts con Module Federation
- [ ] ✅ Puerto único asignado (5001, 5002, etc.)
- [ ] ✅ Exposes configurados en federation
- [ ] ✅ Shared dependencies configuradas
- [ ] ✅ App.tsx con rutas propias
- [ ] ✅ Modo standalone funciona
- [ ] ✅ Se carga correctamente desde Shell
- [ ] ✅ Imports de @esap/shared funcionan
- [ ] ✅ Build genera remoteEntry.js
- [ ] ✅ No hay errores en consola

---

## 🐛 TROUBLESHOOTING COMÚN

### Error: "Shared module is not available"

**Solución:** Verificar que las versiones de React coincidan:

```bash
# En Shell y todos los remotes
pnpm add react@18.2.0 react-dom@18.2.0 --save-exact
```

### Error: "Failed to fetch dynamically imported module"

**Solución:** Verificar que el servidor del remote esté corriendo y el puerto sea correcto.

### Error: CORS

**Solución:** Asegurarse de que `cors: true` esté en todos los vite.config.ts:

```typescript
server: {
  port: 5001,
  cors: true,
}
```

### Build production no funciona

**Solución:** Usar URLs absolutas en producción:

```typescript
// vite.config.ts
const isProd = process.env.NODE_ENV === 'production';

remotes: {
  mfPortal: isProd 
    ? 'https://portal.esap.edu.co/assets/remoteEntry.js'
    : 'http://localhost:5001/assets/remoteEntry.js',
}
```

---

## 📊 SCRIPTS ÚTILES

### Script: Crear nuevo micro frontend

Crear `tools/scripts/create-mf.sh`:

```bash
#!/bin/bash

NAME=$1
PORT=$2

if [ -z "$NAME" ] || [ -z "$PORT" ]; then
  echo "Usage: ./create-mf.sh <name> <port>"
  echo "Example: ./create-mf.sh mf-legal 5004"
  exit 1
fi

echo "Creating micro frontend: $NAME on port $PORT..."

cd packages
pnpm create vite $NAME --template react-ts

cd $NAME
pnpm add react-router-dom
pnpm add -D @originjs/vite-plugin-federation

echo "✅ Micro frontend $NAME created on port $PORT"
echo "Next steps:"
echo "1. Configure vite.config.ts"
echo "2. Add to shell remotes"
echo "3. Run: pnpm dev"
```

Uso:
```bash
chmod +x tools/scripts/create-mf.sh
./tools/scripts/create-mf.sh mf-legal 5004
```

---

## 🎓 PRÓXIMOS PASOS

1. **Completar Shell:**
   - Agregar AuthProvider
   - Crear Layout global
   - Implementar sidebar

2. **Migrar Portal completo:**
   - LandingPage
   - LoginPage
   - Enrolamiento
   - Validaciones públicas

3. **Crear mf-personas:**
   - Módulo de gestión de personas
   - CRUD de usuarios
   - Roles y permisos

4. **Crear mf-control-interno:**
   - Programa anual
   - Auditorías Kanban
   - Planes de mejoramiento

5. **Optimizar:**
   - Code splitting
   - Lazy loading
   - Performance

---

## 📞 SOPORTE

Si tienes problemas:

1. Revisar logs de consola en navegador
2. Verificar que todos los servicios estén corriendo
3. Consultar [documentación de Module Federation](https://module-federation.github.io/)
4. Revisar issues en GitHub

---

**¡Éxito en la migración! 🚀**
