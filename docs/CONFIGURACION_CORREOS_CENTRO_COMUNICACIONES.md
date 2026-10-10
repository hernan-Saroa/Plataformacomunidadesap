# Configuración de correos — Centro de Comunicaciones

## Problema que se resolvió
El buzón **Judiciales** recibía, además del proceso enviado con "Enviar a Jurídica", los correos de
notificaciones de Control Interno Disciplinario (autos aprobados, asignación de profesionales, etc.).

**Causa:** `syncInbox` leía `/users/{cuenta}/messages`, es decir, **todos** los mensajes de la cuenta,
incluida la carpeta *Elementos enviados*. Como la cuenta que envía las notificaciones es la misma del
buzón judicial, cada notificación enviada quedaba en *Enviados* y se importaba como comunicación.

"Enviar a Jurídica" **no** pasa por correo: `juridica-email.service.ts` (disciplinario) lo manda
directo a legal-management, por eso siempre llegó bien.

## Qué cambió en el código
- `microsoft-graph.service.ts` → `getEmailsPage` lee solo la **Bandeja de entrada**
  (`/mailFolders/inbox/messages`). Los envíos hechos desde el Centro se guardan directo en BD como
  `ENVIADO`, no dependen del sync.
- `correos-juridicos.service.ts` → `esRemitenteExcluido` omite en el sync los correos cuyo remitente sea
  `NOTIFICATIONS_EMAIL_ACCOUNT` o esté en `LEGAL_SYNC_EXCLUDED_SENDERS` (nunca excluye la propia cuenta
  del buzón).
- `docker-compose.{dev,pre,qa,prod}.yml` → legal-management ahora recibe `NOTIFICATIONS_EMAIL_ACCOUNT`
  y `LEGAL_SYNC_EXCLUDED_SENDERS`.

Con esto funciona aunque notificaciones y buzón judicial sean la misma cuenta. Separarlas es lo ideal.

## Configuración correcta (paso a paso)
1. **Definir cuentas** (todas distintas, existentes en Microsoft 365):

   | Variable | Función | Ejemplo |
   |---|---|---|
   | `NOTIFICATIONS_EMAIL_ACCOUNT` | Envía notificaciones de la plataforma | `notificaciones@esap.edu.co` |
   | `LEGAL_EMAIL_ACCOUNT_JUDICIAL` | Recibe Judiciales / Jurídica | `desarrollo.ccd@esap.edu.co` |
   | `LEGAL_EMAIL_ACCOUNT_CORREOS` | Segundo buzón, tab Correos (opcional) | otra cuenta o vacío |

   Si `LEGAL_EMAIL_ACCOUNT_CORREOS` repite la judicial, el tab Correos mostrará lo mismo que Judiciales.
2. **Permisos en Azure** (con TI), permisos de aplicación: `Mail.Send` (cuenta de notificaciones) y
   `Mail.ReadWrite` (buzones judicial y correos).
3. **`.env` raíz del servidor**, en cada ambiente:
   ```
   NOTIFICATIONS_EMAIL_ACCOUNT=notificaciones@esap.edu.co
   LEGAL_EMAIL_ACCOUNT=desarrollo.ccd@esap.edu.co
   LEGAL_EMAIL_ACCOUNT_JUDICIAL=desarrollo.ccd@esap.edu.co
   LEGAL_EMAIL_ACCOUNT_CORREOS=
   LEGAL_SYNC_EXCLUDED_SENDERS=
   ```
4. **Desplegar** legal-management y los `docker-compose`; reiniciar legal-management y
   notifications-service.
5. **Limpiar** los correos de notificaciones ya importados en la BD de Judiciales (archivar o borrar);
   el arreglo no los elimina.
6. **Probar:**
   1. Aprobar un auto y asignar un proceso a un profesional.
   2. Sincronizar el Centro: Judiciales no debe mostrar esos correos.
   3. "Enviar a Jurídica": debe llegar con sus adjuntos.
   4. Responder desde el Centro: debe quedar registrada como enviada.

## Si algo sigue apareciendo
Revisar en la bandeja de entrada de la cuenta judicial quién lo envía. Normalmente es una **copia (CC)**
a esa cuenta: quitar la copia o agregar ese remitente a `LEGAL_SYNC_EXCLUDED_SENDERS`.
