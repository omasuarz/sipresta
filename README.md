# SIPRESTA · Taller de Herramientas y Materiales

Sistema de préstamo de herramientas del Taller de Herramientas y Materiales,
Escuela de Arquitectura, Universidad de Talca.

- **App publicada:** https://omasuarz.github.io/sipresta/
- **Datos e inicio de sesión:** Firebase (proyecto `sipresta-talca`)

## Estructura

| Ruta | Qué es |
|---|---|
| `docs/` | Lo que publica GitHub Pages (la app lista para usar) |
| `src/index-claude.html` | Versión original que corre dentro de Claude |
| `src/adaptador.js` | Conecta la app con Firebase (datos, sesión con Google, fotos) |
| `firebase-config.js` | Configuración pública del proyecto Firebase |
| `firestore.rules` | Reglas de seguridad de la base de datos |
| `build.py` | Genera `docs/index.html` desde la versión de Claude |

## Quién puede entrar

- Correos `@utalca.cl`, `@alumnos.utalca.cl` y `@gmail.com`.
- **Dueño:** omar.suarez@utalca.cl (todos los permisos).
- **Encargados y administradores:** se asignan en la app, sección *Usuarios*, con el rol
  «Encargado del taller» o «Administrador de la plataforma» y el correo de la persona.

## Actualizar la app

```bash
python3 build.py src/index-claude.html   # regenera docs/index.html
git add -A && git commit -m "Actualiza SIPRESTA" && git push
```

## Respaldo

En la app: *Configuración → Datos → Respaldo completo → Descargar respaldo*.
El mismo archivo se carga con *Restaurar respaldo*.
