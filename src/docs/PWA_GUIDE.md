# 📱 Guía Completa de PWA - La Comunidad ESAP

## 🎯 ¿Qué es una PWA?

Una **Progressive Web App (PWA)** es una aplicación web que se comporta como una app nativa, ofreciendo:

- ✅ **Instalación** sin App Store/Google Play
- ✅ **Funciona offline** con Service Workers
- ✅ **Push Notifications** (notificaciones push)
- ✅ **Experiencia nativa** (pantalla completa, icono en home)
- ✅ **Menos consumo de datos** (caché inteligente)
- ✅ **Actualizaciones automáticas** sin intervención del usuario

---

## 🚀 Implementación Actual

### Archivos PWA Implementados

```
/public/
├── manifest.json              # Configuración PWA
├── service-worker.js          # Service Worker (caché offline)
├── offline.html              # Página offline fallback
└── index.html                # Meta tags PWA

/components/shared/
├── PWAInstallPrompt.tsx      # Prompt de instalación
├── PWAUpdateNotification.tsx # Notificación de actualización
└── OfflineIndicator.tsx      # Indicador sin conexión

/hooks/
└── usePWA.ts                 # Hooks React para PWA

/utils/
└── pwa-register.ts           # Utilidades de registro
```

---

## 📋 Checklist de Implementación

### ✅ Ya Implementado

- [x] Manifest.json configurado
- [x] Service Worker con estrategias de caché
- [x] Página offline fallback
- [x] Meta tags PWA en HTML
- [x] Componente de instalación (Android/iOS)
- [x] Notificación de actualización
- [x] Indicador offline/online
- [x] Hooks React personalizados
- [x] Registro automático del SW

### ⚠️ Pendiente (Requiere Configuración)

- [ ] **Iconos PWA** (generar todos los tamaños)
- [ ] **Splash screens** (iOS/Android)
- [ ] **VAPID keys** (para push notifications)
- [ ] **Backend para notificaciones** push
- [ ] **HTTPS** (requerido en producción)
- [ ] **Screenshots** para manifest

---

## 🎨 Generación de Iconos

### Iconos Requeridos

Necesitas un **logo cuadrado de 512x512px** en formato PNG con fondo del color de marca ESAP (#1e5da8).

#### Tamaños a Generar:

```
/public/icons/
├── icon-16x16.png
├── icon-32x32.png
├── icon-48x48.png
├── icon-57x57.png
├── icon-60x60.png
├── icon-72x72.png
├── icon-76x76.png
├── icon-96x96.png
├── icon-114x114.png
├── icon-120x120.png
├── icon-128x128.png
├── icon-144x144.png
├── icon-152x152.png
├── icon-180x180.png
├── icon-192x192.png
├── icon-384x384.png
├── icon-512x512.png
├── apple-touch-icon.png (180x180)
├── favicon.ico
└── badge-72x72.png
```

### Herramientas Recomendadas

1. **PWA Asset Generator** (automático)
   ```bash
   npx pwa-asset-generator logo.png ./public/icons
   ```

2. **RealFaviconGenerator** (web)
   https://realfavicongenerator.net/

3. **PWA Builder** (Microsoft)
   https://www.pwabuilder.com/imageGenerator

---

## 🔔 Push Notifications

### Configuración Paso a Paso

#### 1. Generar VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Esto genera:
- **Public Key**: Para el frontend
- **Private Key**: Para el backend (¡NUNCA expongas esto!)

#### 2. Actualizar Hook usePWA.ts

```typescript
// En /hooks/usePWA.ts línea 85
const vapidPublicKey = 'TU_CLAVE_PUBLICA_VAPID_AQUI';
```

#### 3. Backend (Ejemplo Node.js)

```javascript
const webpush = require('web-push');

// Configurar VAPID
webpush.setVapidDetails(
  'mailto:soporte@esap.edu.co',
  'TU_CLAVE_PUBLICA_VAPID',
  'TU_CLAVE_PRIVADA_VAPID'
);

// Enviar notificación
app.post('/api/notifications/send', async (req, res) => {
  const { subscription, payload } = req.body;
  
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 4. Suscribir Usuario (Frontend)

```typescript
import { usePushNotifications } from '@/hooks/usePWA';

function MyComponent() {
  const { requestPermission, subscribe } = usePushNotifications();
  
  const handleSubscribe = async () => {
    const granted = await requestPermission();
    if (granted) {
      const subscription = await subscribe();
      // Enviar subscription al backend
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
      });
    }
  };
  
  return <button onClick={handleSubscribe}>Activar Notificaciones</button>;
}
```

---

## 🌐 Estrategias de Caché

El Service Worker implementa estas estrategias:

### 1. **Network First** (API)
- Intenta red primero
- Si falla, usa caché
- Ideal para: datos dinámicos, dashboard

### 2. **Cache First** (Imágenes/Fuentes)
- Usa caché primero
- Si no existe, descarga
- Ideal para: assets estáticos

### 3. **Network Only** (Formularios)
- Siempre usa red
- No caché
- Ideal para: POST/PUT/DELETE

### 4. **Cache with Network Update** (HTML)
- Muestra caché inmediatamente
- Actualiza en segundo plano
- Ideal para: navegación rápida

---

## 📱 Instalación iOS vs Android

### Android/Desktop

```javascript
// Automático con beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  // Mostrar botón de instalación personalizado
});
```

### iOS (Safari)

No hay API, se requiere **instrucciones manuales**:

1. Tocar botón "Compartir" en Safari
2. Seleccionar "Añadir a pantalla de inicio"
3. Confirmar

El componente `<PWAInstallPrompt />` maneja ambos casos automáticamente.

---

## 🔧 Comandos Útiles

### Limpiar Caché

```typescript
import { clearAllCaches } from '@/utils/pwa-register';

await clearAllCaches();
```

### Verificar Tamaño de Caché

```typescript
import { getCacheSize } from '@/utils/pwa-register';

const size = await getCacheSize();
console.log(`Usando ${size.percentage}% del espacio disponible`);
```

### Forzar Actualización

```typescript
import { sendMessageToServiceWorker } from '@/utils/pwa-register';

sendMessageToServiceWorker({ type: 'SKIP_WAITING' });
window.location.reload();
```

### Desregistrar Service Worker

```typescript
import { unregisterServiceWorker } from '@/utils/pwa-register';

unregisterServiceWorker();
```

---

## 🧪 Testing

### 1. Localhost Testing

Service Workers funcionan en:
- `https://` (producción)
- `http://localhost` (desarrollo)

### 2. Chrome DevTools

1. Abrir DevTools (F12)
2. Ir a **Application** tab
3. Verificar:
   - **Service Workers**: Estado activo
   - **Cache Storage**: Contenido cacheado
   - **Manifest**: Validación

### 3. Lighthouse Audit

```bash
# Instalar Lighthouse CLI
npm install -g lighthouse

# Correr audit PWA
lighthouse https://lacomunidad.esap.edu.co --view --preset=pwa
```

Target Score: **90+/100**

### 4. Simular Offline

En DevTools:
1. **Network tab** > Throttling
2. Seleccionar "Offline"
3. Recargar página
4. Debe mostrar `offline.html` o contenido cacheado

---

## 📊 Métricas de Éxito

### KPIs a Monitorear

- **Install Rate**: % de usuarios que instalan
- **Retention**: Usuarios que vuelven después de instalar
- **Offline Usage**: % de interacciones offline
- **Load Time**: Tiempo de carga con caché
- **Data Saved**: MB ahorrados por caché

### Google Analytics

```javascript
// Trackear instalación
window.addEventListener('appinstalled', () => {
  gtag('event', 'pwa_installed', {
    event_category: 'PWA',
    event_label: 'App Installed'
  });
});

// Trackear navegación offline
if (!navigator.onLine) {
  gtag('event', 'offline_usage', {
    event_category: 'PWA',
    event_label: 'Offline Navigation'
  });
}
```

---

## 🐛 Troubleshooting

### Service Worker no se registra

```javascript
// Verificar en consola
if ('serviceWorker' in navigator) {
  console.log('✅ Service Workers soportados');
} else {
  console.log('❌ Service Workers NO soportados');
}
```

**Solución**: Verificar HTTPS y browser support.

### Caché no se actualiza

```javascript
// Forzar actualización
navigator.serviceWorker.ready.then(registration => {
  registration.update();
});
```

### Botón de instalación no aparece

**Causas comunes**:
- Ya está instalada la app
- No cumple criterios PWA (manifest, SW, HTTPS)
- Usuario ya rechazó el prompt

**Solución**: Revisar DevTools > Application > Manifest

### iOS no muestra icono correcto

**Causa**: Falta `apple-touch-icon`

**Solución**:
```html
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">
```

---

## 🚀 Deployment

### Nginx Configuration

```nginx
# Service Worker debe tener header correcto
location /service-worker.js {
  add_header Cache-Control 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
  add_header Service-Worker-Allowed '/';
}

# Manifest
location /manifest.json {
  add_header Content-Type 'application/manifest+json';
}

# Forzar HTTPS
server {
  listen 80;
  return 301 https://$host$request_uri;
}
```

### Apache Configuration

```apache
# .htaccess
<IfModule mod_headers.c>
  # Service Worker
  <Files "service-worker.js">
    Header set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
    Header set Service-Worker-Allowed "/"
  </Files>
  
  # Manifest
  <Files "manifest.json">
    Header set Content-Type "application/manifest+json"
  </Files>
</IfModule>

# Forzar HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## 📚 Recursos

### Documentación Oficial
- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Google - PWA Checklist](https://web.dev/pwa-checklist/)
- [Apple - Web App Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios/overview/themes/)

### Herramientas
- [PWA Builder](https://www.pwabuilder.com/)
- [Workbox](https://developers.google.com/web/tools/workbox) - Service Worker library
- [Maskable.app](https://maskable.app/) - Test adaptive icons

### Testing
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [PWA Compat](https://github.com/GoogleChromeLabs/pwa-compat)

---

## 🎓 Next Steps

1. **Generar iconos** de todos los tamaños
2. **Configurar VAPID keys** para push notifications
3. **Crear splash screens** para iOS
4. **Hacer audit con Lighthouse** (target: 90+)
5. **Configurar HTTPS** en producción
6. **Monitorear métricas** de instalación

---

## 💡 Tips de UX

### Cuándo mostrar install prompt

❌ **No hacer**:
- Inmediatamente al entrar
- En medio de una tarea
- Más de 1 vez por sesión

✅ **Hacer**:
- Después de 2-3 visitas
- Después de completar acción importante
- Con opción de "Recordarme después"

### Personalizar mensaje

```typescript
// Buen mensaje
"¡Instala La Comunidad ESAP y accede más rápido desde tu pantalla de inicio!"

// Mal mensaje  
"Instalar app"
```

---

## 📝 Changelog

### v1.0.0 (2025-11-14)
- ✅ Implementación inicial PWA
- ✅ Service Worker con caché estratégico
- ✅ Install prompt para Android/iOS
- ✅ Offline fallback
- ✅ Update notification
- ⏳ Pendiente: Iconos y push notifications

---

¿Preguntas? Contacta al equipo de desarrollo en **desarrollo@esap.edu.co**
