# Pruebas unitarias de control disciplinario

Este ecosistema ejecuta pruebas unitarias aisladas del backend real. Los tests mockean `apiClient` y validan el contrato del servicio disciplinario para flujos frecuentes:

- Crear una noticia disciplinaria.
- Convertir una noticia en proceso asignando un profesional.
- Consultar noticias.
- Consultar procesos.
- Consultar noticias y procesos por profesional.

## Comandos

```bash
npm run test:unit
npm run test:unit:watch
```

`npm run test:unit` usa `test/run-unit-tests.mjs`, un runner local sin backend real que transpila el servicio con TypeScript y mockea `apiClient`.

Tambien queda disponible `npm run test:unit:vitest`, con configuracion en `test/vitest.config.cjs`, para ejecutar los mismos casos en Vitest cuando el entorno Node/Vitest no choque con `esbuild`.
