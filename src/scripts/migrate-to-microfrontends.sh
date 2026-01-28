#!/bin/bash

# ========================================================================
# SCRIPT DE MIGRACIÓN A MICRO-FRONTENDS
# ========================================================================
# Este script automatiza la migración del proyecto a arquitectura
# de micro-frontends siguiendo la guía oficial de ESAP
# ========================================================================

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de utilidad
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Banner
echo "================================================================"
echo "  🏗️  MIGRACIÓN A MICRO-FRONTENDS - BACKOFFICE ESAP"
echo "================================================================"
echo ""

# ========================================================================
# FASE 1: VALIDACIONES PRE-MIGRACIÓN
# ========================================================================

log_info "FASE 1: Validaciones pre-migración..."

# Verificar que estamos en la raíz del proyecto
if [ ! -f "package.json" ]; then
    log_error "No se encontró package.json. Ejecuta este script desde la raíz del proyecto."
    exit 1
fi

log_success "Directorio de trabajo correcto"

# Verificar que Git está instalado
if ! command -v git &> /dev/null; then
    log_error "Git no está instalado. Por favor instálalo primero."
    exit 1
fi

log_success "Git disponible"

# Verificar que no hay cambios sin commitear
if [[ -n $(git status -s) ]]; then
    log_warning "Hay cambios sin commitear. Se creará un backup automático."
    read -p "¿Deseas continuar? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        log_error "Migración cancelada por el usuario"
        exit 1
    fi
fi

# ========================================================================
# FASE 2: BACKUP
# ========================================================================

log_info "FASE 2: Creando backup..."

# Crear rama de backup
BACKUP_BRANCH="backup-antes-microfrontends-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BACKUP_BRANCH"
git add .
git commit -m "Backup antes de migración a micro-frontends" || true
log_success "Backup creado en rama: $BACKUP_BRANCH"

# Volver a la rama principal y crear rama de trabajo
git checkout main || git checkout master
WORK_BRANCH="feature/micro-frontends-migration-$(date +%Y%m%d)"
git checkout -b "$WORK_BRANCH"
log_success "Rama de trabajo creada: $WORK_BRANCH"

# ========================================================================
# FASE 3: CREAR ESTRUCTURA BASE
# ========================================================================

log_info "FASE 3: Creando estructura de carpetas..."

# Crear carpetas principales
mkdir -p modules/core/{components,hooks,services,contexts,types}
mkdir -p shared/{components,hooks,services,utils,types,contexts}
mkdir -p shared/components/{ui,design-system,figma,shared}
mkdir -p config

log_success "Estructura base creada"

# ========================================================================
# FASE 4: MOVER COMPONENTES COMPARTIDOS
# ========================================================================

log_info "FASE 4: Moviendo componentes compartidos..."

# Mover UI components
if [ -d "components/ui" ]; then
    mv components/ui/* shared/components/ui/ 2>/dev/null || true
    log_success "UI components movidos"
fi

# Mover componentes compartidos
if [ -d "components/shared" ]; then
    mv components/shared/* shared/components/shared/ 2>/dev/null || true
    log_success "Componentes compartidos movidos"
fi

# Mover design system
if [ -d "components/design-system" ]; then
    mv components/design-system/* shared/components/design-system/ 2>/dev/null || true
    log_success "Design system movido"
fi

# Mover componentes Figma
if [ -d "components/figma" ]; then
    mv components/figma/* shared/components/figma/ 2>/dev/null || true
    log_success "Componentes Figma movidos"
fi

# Mover ErrorBoundary
if [ -f "components/ErrorBoundary.tsx" ]; then
    mv components/ErrorBoundary.tsx shared/components/
    log_success "ErrorBoundary movido"
fi

# ========================================================================
# FASE 5: CREAR MÓDULO CORE
# ========================================================================

log_info "FASE 5: Creando módulo CORE..."

# Mover componentes principales
CORE_COMPONENTS=(
    "BackofficeApp.tsx"
    "LoginPage.tsx"
    "TopBar.tsx"
    "SidebarPremium.tsx"
    "UserMenu.tsx"
    "SystemSwitcher.tsx"
)

for component in "${CORE_COMPONENTS[@]}"; do
    if [ -f "components/esap/$component" ]; then
        mv "components/esap/$component" modules/core/components/
        log_success "Movido: $component"
    fi
done

# Mover hooks de core
CORE_HOOKS=(
    "useAuth.ts"
    "useRoles.ts"
    "useNotifications.ts"
)

for hook in "${CORE_HOOKS[@]}"; do
    if [ -f "hooks/$hook" ]; then
        mv "hooks/$hook" modules/core/hooks/
        log_success "Movido hook: $hook"
    fi
done

# Mover servicios de core
CORE_SERVICES=(
    "auth.service.ts"
    "client.ts"
    "config.ts"
)

for service in "${CORE_SERVICES[@]}"; do
    if [ -f "services/api/$service" ]; then
        mv "services/api/$service" modules/core/services/
        log_success "Movido servicio: $service"
    fi
done

# Crear index.ts para core
cat > modules/core/index.ts << 'EOF'
// Core Module - Shell Application
export { BackofficeApp } from './components/BackofficeApp';
export { LoginPage } from './components/LoginPage';
export { TopBar } from './components/TopBar';
export { SidebarPremium } from './components/SidebarPremium';

export { useAuth } from './hooks/useAuth';
export { useRoles } from './hooks/useRoles';
export { useNotifications } from './hooks/useNotifications';

export type { User, AuthState } from './types/core.types';
EOF

log_success "Módulo CORE creado"

# ========================================================================
# FASE 6: CREAR MÓDULOS INDIVIDUALES
# ========================================================================

log_info "FASE 6: Creando módulos individuales..."

# Función para crear módulo
create_module() {
    local module_name=$1
    local source_path=$2
    
    log_info "Creando módulo: $module_name"
    
    # Crear estructura
    mkdir -p "modules/$module_name"/{components,hooks,services,types,data,contexts}
    
    # Copiar componentes
    if [ -d "$source_path" ]; then
        cp -r "$source_path"/* "modules/$module_name/components/" 2>/dev/null || true
        log_success "Componentes de $module_name copiados"
    fi
    
    # Crear index.ts básico
    cat > "modules/$module_name/index.ts" << EOF
import { lazy } from 'react';

export default lazy(() => import('./components/${module_name^}Module'));

// Exportar tipos si son necesarios para otros módulos
// export type { ... } from './types/${module_name}.types';
EOF
    
    log_success "Módulo $module_name creado"
}

# Crear módulos principales
create_module "estructura-organizacional" "components/estructura-organizacional"
create_module "control-interno" "components/esap/control-interno"
create_module "certificados-laborales" "components/certificados-laborales"
create_module "gestion-profesoral" "components/gestion-profesoral"
create_module "gestion-legal" "components/esap/gestion-legal"
create_module "arquitectura-empresarial" "components/arquitectura-empresarial"
create_module "firma-electronica" "components/esap/firma-electronica"

# ========================================================================
# FASE 7: CONFIGURAR ALIASES
# ========================================================================

log_info "FASE 7: Configurando aliases de TypeScript..."

# Backup de tsconfig.json
cp tsconfig.json tsconfig.json.backup

# Actualizar tsconfig.json (básico, puede necesitar ajustes manuales)
cat > tsconfig.json << 'EOF'
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
EOF

log_success "tsconfig.json actualizado (backup en tsconfig.json.backup)"

# ========================================================================
# FASE 8: ACTUALIZAR VITE CONFIG
# ========================================================================

log_info "FASE 8: Actualizando vite.config.ts..."

# Backup de vite.config.ts
if [ -f "vite.config.ts" ]; then
    cp vite.config.ts vite.config.ts.backup
fi

cat > vite.config.ts << 'EOF'
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
      '@core': path.resolve(__dirname, './modules/core'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'core': ['./modules/core/index.ts'],
          'control-interno': ['./modules/control-interno/index.ts'],
          'certificados': ['./modules/certificados-laborales/index.ts'],
          'gestion-profesoral': ['./modules/gestion-profesoral/index.ts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
});
EOF

log_success "vite.config.ts actualizado"

# ========================================================================
# FASE 9: COMPILACIÓN DE PRUEBA
# ========================================================================

log_info "FASE 9: Probando compilación..."

npm install || {
    log_error "Error al instalar dependencias"
    exit 1
}

log_success "Dependencias instaladas"

# Intentar build (puede fallar, es normal)
log_warning "Intentando build (pueden aparecer errores de imports)..."
npm run build || log_warning "Build falló (esperado en primera ejecución)"

# ========================================================================
# FASE 10: CREAR DOCUMENTACIÓN
# ========================================================================

log_info "FASE 10: Creando documentación..."

cat > MIGRATION_REPORT.md << EOF
# 📊 REPORTE DE MIGRACIÓN A MICRO-FRONTENDS

**Fecha**: $(date +%Y-%m-%d)
**Rama de trabajo**: $WORK_BRANCH
**Rama de backup**: $BACKUP_BRANCH

## ✅ Tareas Completadas

- [x] Backup del proyecto
- [x] Estructura de carpetas creada
- [x] Componentes compartidos movidos a /shared
- [x] Módulo CORE creado
- [x] Módulos individuales creados
- [x] Configuración de TypeScript actualizada
- [x] Configuración de Vite actualizada

## 📋 Próximos Pasos Manuales

### 1. Actualizar Imports

Debes actualizar los imports en todos los archivos movidos:

\`\`\`typescript
// ❌ ANTES
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';

// ✅ DESPUÉS
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/modules/core/hooks/useAuth';
\`\`\`

### 2. Crear Componentes de Entrada para Módulos

Cada módulo necesita un componente principal de enrutamiento:

\`\`\`typescript
// modules/control-interno/components/ControlInternoModule.tsx
import { Routes, Route } from 'react-router-dom';

export default function ControlInternoModule() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="auditorias" element={<Auditorias />} />
      // ...
    </Routes>
  );
}
\`\`\`

### 3. Actualizar App.tsx

Actualiza el punto de entrada principal para cargar módulos lazy:

\`\`\`typescript
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const ControlInternoModule = lazy(() => import('./modules/control-interno'));
const CertificadosModule = lazy(() => import('./modules/certificados-laborales'));
// ...

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/control-interno/*" element={
          <Suspense fallback={<Loading />}>
            <ControlInternoModule />
          </Suspense>
        } />
        // ...
      </Routes>
    </BrowserRouter>
  );
}
\`\`\`

### 4. Testing

\`\`\`bash
# Compilar
npm run build

# Verificar errores de tipos
npm run type-check

# Verificar linting
npm run lint

# Ejecutar en desarrollo
npm run dev
\`\`\`

## 📚 Documentación

Consulta los siguientes documentos para más detalles:

- [ARQUITECTURA_MICRO_FRONTENDS.md](/docs/ARQUITECTURA_MICRO_FRONTENDS.md)
- [GUIA_INICIO_RAPIDO_MICROFRONTENDS.md](/docs/GUIA_INICIO_RAPIDO_MICROFRONTENDS.md)

## 🔄 Rollback

Si necesitas revertir los cambios:

\`\`\`bash
git checkout $BACKUP_BRANCH
\`\`\`

---

**Generado automáticamente por migrate-to-microfrontends.sh**
EOF

log_success "MIGRATION_REPORT.md creado"

# ========================================================================
# RESUMEN FINAL
# ========================================================================

echo ""
echo "================================================================"
echo "  ✅ MIGRACIÓN COMPLETADA PARCIALMENTE"
echo "================================================================"
echo ""
log_success "Estructura base de micro-frontends creada"
log_success "Componentes compartidos movidos"
log_success "Módulos individuales creados"
log_success "Configuraciones actualizadas"
echo ""
log_warning "⚠️  TAREAS MANUALES REQUERIDAS:"
echo ""
echo "  1. Actualizar imports en archivos movidos"
echo "  2. Crear componentes de entrada para módulos"
echo "  3. Actualizar App.tsx con lazy loading"
echo "  4. Probar compilación y funcionalidad"
echo ""
log_info "📖 Consulta MIGRATION_REPORT.md para instrucciones detalladas"
echo ""
log_info "📋 Ramas creadas:"
echo "    - Backup: $BACKUP_BRANCH"
echo "    - Trabajo: $WORK_BRANCH (actual)"
echo ""
log_info "🚀 Para continuar:"
echo "    1. Revisa MIGRATION_REPORT.md"
echo "    2. Actualiza los imports"
echo "    3. Ejecuta: npm run build"
echo ""
echo "================================================================"
