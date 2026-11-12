# SIPRESTA — Avisos automáticos por correo

Script de Google Apps Script que revisa los préstamos cada 10 minutos y envía:
- un recordatorio **1 hora antes** del vencimiento;
- un aviso cuando el préstamo **ya está atrasado** (se puede desactivar con `AVISAR_ATRASO = false`).

Cada préstamo queda marcado en Firestore (`aviso1h`, `avisoAtraso`) para no repetir correos.
El correo del estudiante se toma de su ficha en `usuarios`.

## Instalación
1. Entra a https://script.google.com con la cuenta Gmail que enviará los correos → **Nuevo proyecto**.
2. Pega el contenido de `Codigo.gs` reemplazando todo.
3. ⚙️ Configuración del proyecto → activa **Mostrar el archivo de manifiesto "appsscript.json"** → pega `appsscript.json`.
4. Esa cuenta debe tener acceso al proyecto Firebase `sipresta-talca`
   (si no es la que lo creó: Firebase → ⚙️ Usuarios y permisos → Agregar miembro → rol **Editor**).
5. Elige la función **probar** → Ejecutar → acepta los permisos. Debe decir «Conexión OK».
6. Elige la función **instalar** → Ejecutar. Listo.

Para detenerlo: ejecuta **desinstalar**.
