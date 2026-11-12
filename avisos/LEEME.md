# SIPRESTA — Avisos automáticos (correo + notificación en el teléfono)

Script de Google Apps Script que revisa los préstamos cada 10 minutos y envía:
- un recordatorio **1 hora antes** del vencimiento;
- un aviso cuando el préstamo **ya está atrasado** (desactivable con `AVISAR_ATRASO = false`).

Llega por **correo** y, si el estudiante aceptó «Activar» en la app, como **notificación en su teléfono**
(Firebase Cloud Messaging; en iPhone requiere haber agregado SIPRESTA a la pantalla de inicio, iOS 16.4+).
Cada préstamo queda marcado en Firestore (`aviso1h`, `avisoAtraso`) para no repetir avisos.
Los dispositivos se guardan en la colección `push/{uid}`.

## Instalación
1. https://script.google.com con la cuenta que enviará los correos → **Nuevo proyecto**.
2. Pega `Codigo.gs` reemplazando todo.
3. ⚙️ Configuración del proyecto → **Mostrar el archivo de manifiesto "appsscript.json"** → pega `appsscript.json`.
4. Esa cuenta debe tener rol **Editor** en el proyecto Firebase `sipresta-talca` (Usuarios y permisos).
5. Ejecuta **probar** y acepta los permisos → «Conexión OK».
6. Ejecuta **instalar**. Para detener: **desinstalar**.
7. (Opcional) En `probarNotificacion` escribe tu correo y ejecútala para recibir una notificación de prueba.
