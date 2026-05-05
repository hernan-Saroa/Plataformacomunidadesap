# 🏛️ ESAP Backoffice - Sistema Administrativo Universitario

Sistema integral de gestión administrativa para la **Escuela Superior de Administración Pública (ESAP)**, optimizado para pantallas 4K con diseño mobile-first.

---

## 🚀 **Características Principales**

### **Arquitectura Responsive**
- ✅ **100% Mobile-First** - Optimizado para dispositivos móviles
- ✅ **4K Ready** - Interfaz escalable hasta 3840px
- ✅ **Componentes Reutilizables** - Container4K, ResponsiveHeader, TouchButton
- ✅ **Design System ESAP** - Colores corporativos (#003DA5, #F57C00)

### **Módulos Principales**
- 👥 **Gestión de Usuarios** - Sistema Usuario-Persona con roles múltiples
- 📚 **Programas Académicos** - Administración de oferta académica
- 🎓 **Gestión de Graduados** - Certificados y verificación de títulos
- 📊 **Motor de Reportes V2** - 45+ reportes predefinidos
- 🏢 **Estructura Organizacional** - Gestión territorial y sedes
- 📋 **Control Interno** - Auditorías, planes de mejoramiento
- ⚖️ **Gestión Legal** - SIGL completo
- 💼 **Bolsa de Empleo** - Ofertas laborales para graduados

---

## 🛠️ **Stack Tecnológico**

```
Frontend:  React + TypeScript + Tailwind CSS v4
Backend:   Supabase (PostgreSQL + Edge Functions)
Auth:      Supabase Auth
Storage:   Supabase Storage
UI:        Motion (Framer Motion), Lucide Icons, Recharts
```

---

## 📦 **Instalación**

```bash
# Clonar repositorio
git clone [repo-url]

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Iniciar desarrollo
npm run dev
```

---

## 📁 **Estructura del Proyecto**

```
/components
  /esap              # Módulos principales
  /ui                # Componentes reutilizables
  /shared            # Componentes compartidos
  /portal            # Portal público/usuarios
/data                # Datos mock y configuración
/services            # APIs y servicios
/hooks               # Custom React hooks
/types               # TypeScript types
/utils               # Utilidades
/supabase            # Backend functions
```

---

## 🎨 **Design System**

### **Colores Corporativos**
- Azul Principal: `#003DA5` / `#2962FF`
- Naranja: `#F57C00`
- Fondos: `#E0EDFF` / `#F5F5F5`

### **Tipografía**
- Font Family: `Inter`
- Base: `18px` (optimizado 4K)
- Pesos: 400, 500, 600, 700, 800, 900

### **Componentes Responsive**
```tsx
import { Container4K, ResponsiveHeader } from '@/components/ui';
```

---

## 📊 **Métricas**

- **Módulos:** 20+ módulos principales
- **Componentes:** 500+ componentes
- **Cobertura Responsive:** 96%
- **Optimización 4K:** 100%
- **Mobile-Friendly:** 97%

---

## 🔐 **Autenticación**

El sistema utiliza **Supabase Auth** con:
- Login por email/password
- Roles y permisos granulares
- Sesiones persistentes
- Social login (Google, Facebook)

---

## 📝 **Documentación**

Ver [`CHANGELOG_RESPONSIVE.md`](./CHANGELOG_RESPONSIVE.md) para detalles de optimizaciones responsive.

Ver [`guidelines/Guidelines.md`](./guidelines/Guidelines.md) para estándares de desarrollo.

---

## 🤝 **Contribución**

1. Fork el proyecto
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'feat: nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crea un Pull Request

---

## 📄 **Licencia**

Propiedad de ESAP - Escuela Superior de Administración Pública

---

## 👥 **Equipo**

Desarrollado por el equipo de Transformación Digital ESAP

**Versión:** 1.5.0  
**Última actualización:** Enero 2026
