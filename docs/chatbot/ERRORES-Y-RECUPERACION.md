# Errores y recuperación del chatbot temporal

La interfaz actual consulta orientación general sin autenticación ni historial persistente. El contrato vigente se describe en [Sesión y gateway](SESION-Y-GATEWAY.md).

- Al abrir muestra la bienvenida sin consultar historial o permisos.
- El envío utiliza solo el texto de la consulta, sin identidad ni cookies. La entrada queda bloqueada durante la consulta y no se permiten envíos duplicados.
- Un fallo conserva el borrador y no inventa una respuesta. El usuario puede reintentar con «Enviar»; no hay reintentos automáticos.
- Un HTTP 401/403 del endpoint general indica que el servicio no está disponible; no ofrece iniciar sesión ni renovar cookies para usar el chatbot.
- Si el módulo está deshabilitado, la consulta se rechaza y se informa de su indisponibilidad.
- La conversación se mantiene en memoria al navegar, minimizar, cambiar de vista o iniciar sesión dentro del documento. Una recarga completa la reinicia.
- «Nueva conversación» limpia los mensajes, el borrador y el error de todas las vistas de ese gateway. Una respuesta tardía anterior no puede repoblar un estado reiniciado.
- El panel mantiene el campo de escritura y los controles dentro del área visible, con desplazamiento interno para los mensajes.

Los endpoints antiguos de conversaciones conservan su autenticación y sus pruebas de aislamiento. La interfaz temporal no los usa ni elimina los datos que ya estaban guardados.
