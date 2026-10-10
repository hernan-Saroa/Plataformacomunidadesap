# Integración Codex — instrucción v2 (9 de octubre de 2026)

## Entrega y alcance

✅ Rama `feature/pa/ronda-codex`, carpeta `Plataforma-pa-codex`, base `b3ccebf9c`. Esta instrucción sustituye el informe anterior. La sección «Continuación» documenta el desbloqueo y la implementación de EFDS-2309, EFDS-2312 y EFDS-2314. EFDS-2306 y todo el backend quedan con Claude. No se ha copiado ni retirado el importador; aulas quedan fuera de esta ronda. Se conserva el alta manual de asignaturas y se llama al servicio existente sobre el periodo único.

✅ Se implementó el mecanismo común y EFDS-2310 en archivos propios. EFDS-2307 y EFDS-2308 se probaron mediante cambios LOCALES del archivo compartido `ProgramacionAcademicaModule.tsx`: ese archivo NO se incluye en los commits. Claude debe aplicar el parche exacto al final de este documento, adaptándolo a su rama antes de validar con servidor real.

✅ La modificación preexistente del usuario en `.gitignore` se preserva. Aunque ignora este documento, la v2 exige commitearlo: se añade específicamente con `git add -f INTEGRACION-codex.md`, sin editar ni commitear `.gitignore`.

## Mecanismo común para Claude

Archivo: `apps/mfe-programacion-academica/src/services/actualizacionProgramacion.ts`.

`catalogoApi.ts` invalida después de una respuesta HTTP exitosa y válida a cualquier escritura. Un GET o una escritura rechazada no emite invalidación. Admite respuestas 204. Las revisiones solo indican que hay que repetir una lectura: no contienen datos ni sustituyen la persistencia del servidor.

Contrato de recursos:

| Escritura | Recursos invalidados |
| --- | --- |
| Todas las del cliente | `programacion` y la entidad de la ruta |
| `grupos/:id` | además `horarios`, `grupo:<id>` |
| `horarios/grupo/:id/periodo` | además `grupos`, `grupo:<id>` |
| horarios, asignaciones, publicaciones, portal-docente, jefatura | además `horarios`, `publicaciones`, `portal-docente`, `acumulado`, `jefatura` |
| aulas | además `horarios` |

Para el cliente independiente de concertación:

```tsx
import { invalidarProgramacion, useRevisionProgramacion } from '../services/actualizacionProgramacion';

// Solo DESPUÉS de confirmar la escritura. No emitir si falla.
await guardarConcertacion(datos);
invalidarProgramacion('programacion', 'jefatura', 'portal-docente', 'acumulado');

// En cada componente que debe leer otra vez:
const revision = useRevisionProgramacion('jefatura');
useEffect(() => {
  let vigente = true;
  consultarConcertacion(idPeriodo)
    .then(datos => { if (vigente) setDatos(datos); })
    .catch(error => { if (vigente) setError(error.message); });
  return () => { vigente = false; };
}, [idPeriodo, revision]);
```

✅ Las lecturas ocurren al montar y al cambiar la revisión; reabrir un componente siempre consulta el servidor. La limpieza del efecto evita aplicar respuestas de un grupo anterior o de un componente desmontado. Para corregir datos de un grupo desde otro cliente, emitir también `grupo:<id>`. La función de escritura no espera a que todos los componentes terminen de refrescar: cada pantalla maneja carga y errores de su lectura.

⚠️ El mecanismo opera dentro de la instancia cargada del MFE. No sincroniza navegadores, pestañas ni otros equipos; no se ha añadido polling ni persistencia local. Claude debe importar el mismo módulo desde concertación, sin copiarlo. No se conecta todavía el selector de periodos, por EFDS-2312 en espera.

## Resultados por subtarea

### EFDS-2310 — fechas del ciclo

✅ Veredicto: interfaz. Las props conservadas por los padres quedaban obsoletas después de guardar.

✅ Corrección: `getGrupo(id)` consulta el endpoint existente. `CalendarioHorario` lee al montar y después de invalidar `grupo:<id>`; las props antiguas quedan solo por compatibilidad. Guardar ciclo, crear y borrar sesiones dependen del mismo mecanismo; se quitaron recargas manuales duplicadas. Los campos y el botón de guardar quedan deshabilitados hasta leer el grupo y mientras se guarda. Se ignoran respuestas de efectos reemplazados.

✅ Navegador Chromium + API simulada: guardar fechas, verificar que el grupo y Programación General vuelven a consultar, cerrar y reabrir el MISMO grupo sin recargar la página ni actualizar las props simuladas. Conserva 2026-10-12/2026-11-12. Otra prueba verifica que un 409 no invalida ni modifica la persistencia simulada. Una tercera prueba verifica la invalidación explícita por recurso para el cliente de concertación.

✅ Horas reales de ejecución de esas tres pruebas en la última corrida: 2,179 s / 3600 = 0,000605 h. Implementación, diseño y revisión: incluidos en el tramo compartido descrito abajo, no sumados otra vez.

### EFDS-2307 — alertas

✅ Veredicto: interfaz. El panel usaba `historico.resumen.total`.

✅ Corrección LOCAL para integración: contador vivo separado (`0`, conforme a la regla del servidor que rechaza cruces), texto «Programación viva · sin cruces». El badge de Validación y su detalle siguen usando el conteo histórico. No se ocultan los 27 cruces históricos ni se comparan nombres de docentes/aulas en el navegador.

⚠️ El cero representa la invariante de la API; no se implementó un detector nuevo ni hay un endpoint de conflictos vivos en esta rama. Si Claude cambia esa garantía, deberá aportar un conteo vivo explícito. La validación real del servidor corresponde a Claude.

✅ Navegador + API simulada: histórico con 27, panel vivo con 0, cambio a Validación conserva 27 y el panel sigue en 0.

✅ Horas reales de ejecución de prueba: 0,027 s / 3600 = 0,0000075 h. Implementación/revisión: tramo compartido.

### EFDS-2308 — Distancia

✅ Veredicto: interfaz. Faltaba la opción del código DISTANCIA.

✅ Corrección LOCAL para integración: opción `value="DISTANCIA"`, etiqueta Distancia. Se mantiene `FIN_DE_SEMANA`. La comparación existente sigue siendo exacta contra el código `item.jornada`; no se normalizan etiquetas históricas ni se deduce modalidad por el nombre.

✅ Navegador + API simulada: tres franjas con DIURNA/DISTANCIA/FIN_DE_SEMANA; elegir Distancia muestra solo la segunda, Fin de semana solo la tercera y Todas devuelve las tres.

⚠️ Claude debe suministrar DISTANCIA como código del backend. No se modificó backend ni se mezclaron etiquetas del histórico con la programación viva.

✅ Horas reales de ejecución de prueba: 0,043 s / 3600 = 0,0000119 h. Implementación/revisión: tramo compartido.

### EFDS-2313 — sede, solo comprobación

✅ Consulta de solo lectura al contenedor 55432: qa.docente conserva `auth.personas.id_seccional = NULL`, `Docente.territorialId = DT-009`, territorial HUILA unida por código. El shell de esta rama conserva dos literales «Sede Central - Bogotá».

✅ Navegador contra el servicio auth: `/portal/perfil/:id` responde 200 (la primera ruta intentada con `/api/v1` respondió 404). No se modificaron datos ni roles.

⚠️ No se completó una sesión autenticada en la interfaz del shell con usuarios reales. Por tanto, NO se declara resuelto por la restauración; los datos de QA y el código siguen indicando el problema. Se reporta para Claude sin editar el shell. Tiempo de investigación incluido en el tramo compartido; no se atribuye tiempo ficticio por usuario.

## Verificación y reproducción

✅ Cinco pruebas de navegador pasan sin errores de React. Se interceptan todas las peticiones de negocio; ninguna escritura de prueba llega al backend. El mock simula persistencia del servidor en el proceso de pruebas, no un arreglo basado en localStorage del producto.

```powershell
# Terminal 1, desde apps/mfe-programacion-academica
node ../../node_modules/vite/bin/vite.js --port 3126 --strictPort

# Terminal 2, desde la raíz; requiere el parche compartido de abajo
node apps/mfe-programacion-academica/tests/ronda-v2.browser.mjs

# Compilación, desde apps/mfe-programacion-academica
node ../../node_modules/vite/bin/vite.js build
```

✅ Build Vite de producción completado (1626 módulos). `git diff --check` sin errores de espacios. No se instalaron paquetes ni se cambió package.json.

⚠️ `npx tsc --noEmit` falla con 102 diagnósticos por los tipos de React 18/19 incompatibles y `import.meta.env` sin declaración, ya observados en la ronda anterior. No hay diagnósticos en `catalogoApi.ts` ni `actualizacionProgramacion.ts`. No se anuncia TypeScript como aprobado.

✅ Según v2, la validación con servidor real se delega a Claude al integrar. El gateway compartido está permitido para la interfaz; la restricción anterior de obligar a usar 3023 para toda verificación queda sustituida. No se cerró ningún periodo ni se ejecutaron migraciones.

## Tiempo y desviaciones

✅ Cronómetro de esta ronda iniciado 2026-10-09 22:54:18 America/Bogota (03:54:18 UTC del día siguiente). Las pruebas registran inicio y duración individual por subtarea en consola. No son estimaciones de trabajo humano.

⚠️ Desviación: el diseño, las ediciones breves del módulo compartido, las pruebas comunes y la comprobación de datos se hicieron intercalados; el tramo de trabajo compartido no se puede distribuir retrospectivamente por HU sin inventar precisión. Se registra una sola vez como tiempo conjunto, separado de las duraciones de pruebas de arriba (que están contenidas en él). No sumar ambos. No se trasladan las estimaciones de aulas de la instrucción anterior a horas trabajadas.

✅ Tramo conjunto medido de implementación, pruebas, auditoría y documentación: 22:54:18–23:02:35 America/Bogota del 9 de octubre de 2026: **497 segundos = 0,1381 horas**. No incluye la entrega Git posterior. Las duraciones de pruebas por HU están incluidas, no son adicionales.

## Continuación — contrato de periodo único entregado

✅ Se leyó `INTEGRACION-claude.md` del commit remoto `11997ae26495deb78ac388c58f471bcdd010e487`, sin cambiar de rama ni modificar la carpeta de Claude. Su contrato `GET /programacion-academica/api/v1/periodos` desbloqueó EFDS-2309, EFDS-2312 y EFDS-2314.

### EFDS-2309 — cerrar solo la programación

✅ Veredicto: interfaz. La tarjeta antigua se alimentaba de periodos propios y llamaba cerrar sin consultar el modelo unificado. `GestionOfertas.tsx` ahora usa `programacion.estado`, `programable` y `permisos.cerrarProgramacion` de `GET /periodos`; el botón dice «Cerrar programación». Con pendientes permanece visible, deshabilitado, explicado y con acceso a la lista. Tras 2xx vuelve a consultar los periodos. Un 409 muestra el mensaje del servidor. El backend es responsable de preservar el estado del periodo de plataforma.

✅ Navegador con API simulada: botón visible/deshabilitado con dos pendientes; otra tarjeta sin pendientes cierra la programación, vuelve a pedir `GET /periodos` y mantiene el estado de plataforma `en_curso`. El test anterior del cierre fue adaptado al contrato nuevo.

### EFDS-2312 — selector y creación/activación

✅ Veredicto: interfaz. El selector anterior consultaba `/ofertas` una sola vez. Ahora consulta `GET /periodos` al montar y tras invalidar `periodos`, prefiere `esActivo`, conserva una selección válida y agrupa los legados aparte. Permite consultar los no programables. Muestra errores de consulta.

✅ Crear llama `POST /pta/api/v1/periodos-academicos` con año, semestre y fechas; nace en planeación y reaparece en el selector sin recargar. Activar lee primero `GET /pta/api/v1/periodos-academicos/:id/impacto-activacion`, confirma los PTA por periodo y los periodos afectados, muestra `advertencia` cuando exista, y solo entonces llama al PATCH. El botón se muestra únicamente si `permisos.activar` es true.

✅ Navegador con API simulada: impacto de 37 PTA (35 de 2026-1 y 2 de 2025-2) aparece en la confirmación antes del PATCH; periodo creado por el servicio PTA aparece en el selector sin recargar.

### EFDS-2314 — carga masiva asociada al periodo

✅ Veredicto: el importador existente ya trabajaba con `periodo_codigo` del PTA; faltaba ofrecerlo al crear el periodo de Programación. `CargaAsignaturasPeriodo.tsx` llama al mismo servicio `POST /pta/api/v1/asignaturas-import/upload`, primero `dry_run=true` y, si la validación es correcta y el usuario confirma, `dry_run=false`. El código proviene exclusivamente de `GET /periodos`, nunca de un campo libre. Muestra nuevas/actualizadas/omitidas y mensajes de error/advertencia por fila según el DTO. Un resultado de validación con `success:false` deshabilita confirmar. Se conserva el alta manual en Programas Académicos → plan de estudios; no se modificó ni duplicó ese flujo.

✅ Navegador con API simulada: archivo rechazado informa «Fila 7: código de programa inexistente» y bloquea confirmar; archivo válido ejecuta validación y confirmación con `periodo_codigo=2031-1` obtenido del periodo recién creado.

⚠️ No se creó un periodo de prueba real: el contrato propone `2099-2` para Codex pero dice expresamente que espera aprobación de Tomás. Todas las pruebas anteriores interceptaron HTTP; Claude validará la integración con servidor real. El MFE construye con Vite; la comprobación de TypeScript conserva los diagnósticos de React/`import.meta.env` ya reportados. No se modificó backend, PTA ni archivos de Claude.

⚠️ Tiempo de esta continuación: las pruebas en navegador se midieron en ejecución por el proceso de tests; no se inició cronómetro de implementación por subtarea antes de recibir el contrato. Para no inventar horas, no se atribuyen tiempos manuales a EFDS-2309/2312/2314. La entrega anterior conserva sus 0,1381 h medidas por tramo conjunto; no deben sumarse a esta continuación.

### Integración del módulo compartido

✅ El parche completo siguiente actualiza el selector al contrato y conserva el parche anterior de EFDS-2307/2308. `ProgramacionAcademicaModule.tsx` sigue **sin commitear** en la rama Codex. Claude debe incorporar este diff en su archivo propio, adaptando cualquier cambio concurrente de concertación y conteo vivo. La prueba `periodo-unico.browser.mjs` requiere este parche local para ejecutarse; después de integrarlo, Claude puede correrla contra su módulo con API simulada.

## Parche exacto del archivo compartido

✅ Este diff corresponde exclusivamente a cambios locales de Codex sobre la base indicada. Claude debe integrarlo en su versión del módulo. No reemplazar el archivo entero ni aplicar a ciegas si su contexto cambió.

```diff
diff --git a/apps/mfe-programacion-academica/src/components/ProgramacionAcademicaModule.tsx b/apps/mfe-programacion-academica/src/components/ProgramacionAcademicaModule.tsx
index b34ce6139..c317fa74b 100644
--- a/apps/mfe-programacion-academica/src/components/ProgramacionAcademicaModule.tsx
+++ b/apps/mfe-programacion-academica/src/components/ProgramacionAcademicaModule.tsx
@@ -37,6 +37,8 @@ import { AsignacionDocente } from './AsignacionDocente';
 import { DisponibilidadAulas } from './DisponibilidadAulas';
 import { GestionOfertas } from './GestionOfertas';
 import { AprobacionJefatura } from './AprobacionJefatura';
+import { useRevisionProgramacion } from '../services/actualizacionProgramacion';
+import { getPeriodos, type PeriodoVista } from '../services/api/periodosApi';

 interface FranjaHoraria {
   id: string;
@@ -105,6 +107,8 @@ function sesionAFranja(s: FranjaConContexto): FranjaHoraria {
 }

 export function ProgramacionAcademicaModule() {
+  const revisionProgramacion = useRevisionProgramacion('programacion');
+  const revisionPeriodos = useRevisionProgramacion('periodos');
   const [seccion, setSeccion] = useState<Seccion>('horarios');
   const [searchTerm, setSearchTerm] = useState('');
   const [selectedJornada, setSelectedJornada] = useState<string>('TODAS');
@@ -124,23 +128,31 @@ export function ProgramacionAcademicaModule() {

   // §1.0 — El periodo como CONTEXTO. Todo lo que se ve debajo pertenece al
   // periodo seleccionado en la cabecera; se persiste entre recargas.
-  const [periodos, setPeriodos] = useState<Oferta[]>([]);
+  const [periodos, setPeriodos] = useState<PeriodoVista[]>([]);
+  const [periodoError, setPeriodoError] = useState('');
   const [periodoSel, setPeriodoSel] = useState<string>(() => {
     try { return localStorage.getItem('prog-periodo-sel') || ''; } catch { return ''; }
   });
   const periodoActual = periodos.find((p) => p.idPeriodo === periodoSel) || null;
+  const periodoProgramable = periodoActual?.modelo === 'plataforma'
+    ? periodoActual.programable
+    : periodoActual?.estado !== 'cerrado';

   useEffect(() => {
-    getOfertas().then((lista) => {
+    let vigente = true;
+    getPeriodos().then((respuesta) => {
+      if (!vigente) return;
+      const lista: PeriodoVista[] = [...respuesta.periodos, ...respuesta.legado];
+      setPeriodoError('');
       setPeriodos(lista);
       setPeriodoSel((actual) => {
         if (actual && lista.some((p) => p.idPeriodo === actual)) return actual;
-        // Por defecto, el primer periodo activo; si no hay, el primero.
-        const def = lista.find((p) => p.estado === 'activo') || lista[0];
+        const def = respuesta.periodos.find((p) => p.esActivo) || respuesta.periodos[0] || respuesta.legado[0];
         return def ? def.idPeriodo : '';
       });
-    }).catch(() => {});
-  }, []);
+    }).catch((e) => { if (vigente) setPeriodoError(e?.message || 'No se pudieron consultar los periodos.'); });
+    return () => { vigente = false; };
+  }, [revisionPeriodos]);

   const elegirPeriodo = (id: string) => {
     setPeriodoSel(id);
@@ -191,15 +203,17 @@ export function ProgramacionAcademicaModule() {
       .catch(() => { if (vivo) setTotalAulas(null); })
       .finally(() => { if (vivo) setCargando(false); });
     return () => { vivo = false; };
-  }, [periodoSel, periodos]);
+  }, [periodoSel, periodos, revisionProgramacion]);

   // Form state

   const totalFranjas = scheduleList.length;
   // Confirmadas = aprobadas por la jefatura (estado real, no el inventado 'CONFIRMADO').
   const totalConfirmados = scheduleList.filter(s => s.estado === 'APROBADA').length;
-  // Alertas de cruce = las de validación del periodo (0 en un periodo nuevo).
-  const totalConflictos = historico?.resumen?.total ?? 0;
+  // EFDS-2307: la API impide cruces en programación viva. No hay endpoint
+  // de conflictos vivos; el cero expresa esa regla, no un conteo del histórico.
+  const totalConflictos = 0;
+  const totalConflictosHistoricos = historico?.resumen?.total ?? 0;

   const gruposNav: MenuGroup[] = [
     {
@@ -249,7 +263,7 @@ export function ProgramacionAcademicaModule() {
           subtitle: 'Alertas y traslapes de horario',
           icon: <AlertTriangle className="w-5 h-5" />,
           color: '#D97706',
-          badge: totalConflictos > 0 ? totalConflictos : undefined,
+          badge: totalConflictosHistoricos > 0 ? totalConflictosHistoricos : undefined,
         },
         // EFDS-1939 — solo para jefaturas territoriales.
         ...(esJefatura ? [{
@@ -293,21 +307,33 @@ export function ProgramacionAcademicaModule() {
             onChange={(e) => elegirPeriodo(e.target.value)}
             className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-[#003DA5] focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20"
           >
-            {periodos.length === 0 && <option value="">Cargando…</option>}
-            {periodos.map((p) => (
+            {periodos.length === 0 && <option value="">Sin periodos</option>}
+            <optgroup label="Periodos de la plataforma">
+            {periodos.filter((p) => p.modelo === 'plataforma').map((p) => (
               <option key={p.idPeriodo} value={p.idPeriodo}>
-                {p.codigo} — {p.estado === 'activo' ? 'Activo' : p.estado === 'cerrado' ? 'Cerrado' : 'En planeación'}
+                {p.codigo} — {p.esActivo ? 'Activo' : p.estadoPlataforma.replace('_', ' ')}{p.programacion.estado === 'cerrada' ? ' · programación cerrada' : ''}
               </option>
             ))}
+            </optgroup>
+            {periodos.some((p) => p.modelo === 'legado') && (
+              <optgroup label="Periodos anteriores al modelo único">
+                {periodos.filter((p) => p.modelo === 'legado').map((p) => (
+                  <option key={p.idPeriodo} value={p.idPeriodo}>{p.codigo} — {p.nombre}</option>
+                ))}
+              </optgroup>
+            )}
           </select>
           {periodoActual && (
-            <span className="text-xs text-slate-500 hidden sm:inline">{periodoActual.nombre}</span>
+            <span className="text-xs text-slate-500 hidden sm:inline">
+              {periodoActual.modelo === 'plataforma' ? (periodoActual.programable ? 'Programación abierta' : 'Solo consulta') : periodoActual.motivo}
+            </span>
           )}
         </div>
         <p className="text-[11px] text-slate-400">
           Todo lo que ves —franjas, validación, disponibilidad— pertenece a este periodo.
         </p>
       </div>
+      {periodoError && <p role="alert" className="mb-4 text-sm text-red-700">{periodoError}</p>}

       {/* ── KPI HEADER ── */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
@@ -337,7 +363,7 @@ export function ProgramacionAcademicaModule() {
           <div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alertas de Cruce</p>
             <h3 className="text-2xl font-black text-slate-800 mt-1">{totalConflictos}</h3>
-            <p className="text-xs text-amber-600 font-medium mt-1">Requieren resolución</p>
+            <p className="text-xs text-amber-600 font-medium mt-1">Programación viva · sin cruces</p>
           </div>
           <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
             <AlertTriangle className="w-6 h-6" />
@@ -357,7 +383,7 @@ export function ProgramacionAcademicaModule() {
       </div>

       {/* ── PUBLICAR EL PERIODO (§1.2) — desde la vista de programación ── */}
-      {seccion === 'horarios' && estadoPub && periodoActual && periodoActual.estado !== 'cerrado' && (
+      {seccion === 'horarios' && estadoPub && periodoActual && periodoProgramable && (
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-4">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
             <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
@@ -417,12 +443,13 @@ export function ProgramacionAcademicaModule() {
               className="bg-transparent font-semibold text-slate-800 focus:outline-none"
             >
               {/* §2.1 — Los valores deben ser los del dato del backend
-                  (DIURNA/NOCTURNA/FIN_DE_SEMANA), no 'Diurna': la comparacion es
+                  (DIURNA/NOCTURNA/FIN_DE_SEMANA/DISTANCIA), no 'Diurna': la comparacion es
                   exacta y con la etiqueta bonita nunca casaba. */}
               <option value="TODAS">Todas las jornadas</option>
               <option value="DIURNA">Diurna</option>
               <option value="NOCTURNA">Nocturna</option>
               <option value="FIN_DE_SEMANA">Fin de semana</option>
+              <option value="DISTANCIA">Distancia</option>
             </select>
           </div>

```
