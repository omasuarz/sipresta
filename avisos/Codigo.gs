/**
 * SIPRESTA — Avisos automáticos por correo
 * Taller de Herramientas y Materiales · Escuela de Arquitectura · Universidad de Talca
 *
 * Revisa los préstamos cada 5 minutos y envía:
 *   1) recordatorios 1 hora, 30 minutos y 15 minutos antes del vencimiento;
 *   2) (opcional) un aviso cuando el préstamo ya está atrasado.
 * Por correo y, si el estudiante los activó, como notificación en su teléfono.
 * Cada préstamo queda marcado (aviso60 / aviso30 / aviso15 / avisoAtraso) para no repetir avisos.
 *
 * Instalación: ver LEEME en esta misma carpeta. Primero ejecuta «probar», luego «instalar».
 */

// ---------- Ajustes ----------
const PROYECTO = 'sipresta-talca';          // ID del proyecto Firebase
// Minutos antes del vencimiento en que se avisa, por correo y en el teléfono.
// (Un Gmail normal envía ~100 correos al día: si el taller presta mucho, deja el correo solo en [60, 15].)
const AVISOS_CORREO = [60, 30, 15];
const AVISOS_TELEFONO = [60, 30, 15];
const AVISAR_ATRASO = true;                 // también avisar cuando ya está atrasado
const NOMBRE_REMITENTE = 'SIPRESTA · Taller de Herramientas y Materiales';
const URL_APP = 'https://omasuarz.github.io/sipresta/';
const ZONA = 'America/Santiago';
// Si quieres recibir copia de cada aviso, escribe aquí un correo (o deja '').
const COPIA_A = '';

// ---------- Tareas ----------
function revisarVencimientos() {
  const ahora = Date.now();
  const prestamos = consultar_('prestamos', 'estado', 'entregado');
  if (!prestamos.length) return;

  // Para cuidar la cuota gratuita de Firestore (50.000 lecturas/día) solo se leen
  // los préstamos activos en cada revisión; estudiante, herramienta y ajustes se leen
  // únicamente cuando hay que enviar un aviso.
  let cfg = null;
  const cache = {};
  let enviados = 0;

  prestamos.forEach(function (p) {
    const vence = Date.parse(p.venceEn || '');
    if (!vence) return;
    const falta = vence - ahora;
    let tipo = null, min = 0, marcas = [];
    if (falta > 0) {
      const cortes = UMBRALES_.filter(function (m) { return falta <= m * 60000; });   // ej.: faltan 25 min → [60, 30]
      if (!cortes.length) return;
      min = cortes[cortes.length - 1];                                                 // el aviso más cercano que corresponde
      if (yaAvisado_(p, min)) return;
      tipo = 'aviso' + min;
      marcas = cortes.filter(function (m) { return !yaAvisado_(p, m); }).map(function (m) { return 'aviso' + m; });
    } else if (AVISAR_ATRASO && !p.avisoAtraso && -falta < 3 * 24 * 3600000) { tipo = 'avisoAtraso'; marcas = [tipo]; }
    if (!tipo) return;
    const porCorreo = tipo === 'avisoAtraso' || AVISOS_CORREO.indexOf(min) >= 0;
    const porTelefono = tipo === 'avisoAtraso' || AVISOS_TELEFONO.indexOf(min) >= 0;

    if (!cfg) cfg = leer_('ajustes/general') || {};
    const est = buscarEstudiante_(p);
    const uid = (est && est.uid) || p.estudianteId || (est && est._id) || '';
    if ((!est || !est.correo) && !tieneTelefono_(uid)) { marcar_(p._id, marcas, 'sin-correo'); return; }

    const t = cache[p.herramientaId] || (cache[p.herramientaId] = leer_('herramientas/' + p.herramientaId) || {});
    const herr = (t.nombre || 'la herramienta') + (t.codigo ? ' (' + t.codigo + ')' : '');
    const hora = fechaES_(new Date(vence));
    const primera = function (x) { return String(x || '').trim().split(/\s+/)[0] || ''; };
    const nombre = est ? ((est.nombres && est.apellidos) ? primera(est.nombres) + ' ' + primera(est.apellidos) : String(est.nombre || '').trim()) : '';
    const faltaTxt = min >= 60 ? '1 hora' : Math.max(1, Math.round(falta / 60000)) + ' minutos';
    const queda = (min >= 60 ? 'Queda ' : 'Quedan ') + faltaTxt;
    const contacto = [cfg.horario ? 'Horario: ' + cfg.horario : '', cfg.ubicacion ? 'Ubicación: ' + cfg.ubicacion : '',
      cfg.telefono ? 'Teléfono: ' + cfg.telefono : '', cfg.correo ? 'Correo: ' + cfg.correo : ''].filter(String).join('\n');

    let asunto, cuerpo;
    if (tipo !== 'avisoAtraso') {
      asunto = (min <= 15 ? queda + ': ' : 'Recordatorio: ') + 'devuelve ' + (t.nombre || 'tu herramienta') + ' antes de las ' + Utilities.formatDate(new Date(vence), ZONA, 'HH:mm');
      cuerpo = 'Hola ' + (nombre || '') + ',\n\nTe recordamos que el préstamo de ' + herr + ' vence el ' + hora + ' (en ' + faltaTxt + ').\n\n'
        + 'Devuélvela a tiempo en el Taller de Herramientas y Materiales para evitar una sanción.';
    } else {
      asunto = 'Préstamo atrasado: ' + (t.nombre || 'herramienta');
      cuerpo = 'Hola ' + (nombre || '') + ',\n\nEl préstamo de ' + herr + ' venció el ' + hora + ' y aún no se registra su devolución.\n\n'
        + 'Devuélvela lo antes posible en el Taller de Herramientas y Materiales. Los atrasos generan sanciones según el reglamento del taller.';
    }
    cuerpo += '\n\nRevisa tus préstamos en ' + URL_APP + (contacto ? '\n\n' + contacto : '')
      + '\n\nTaller de Herramientas y Materiales\nEscuela de Arquitectura · Universidad de Talca\n\n(Este es un mensaje automático de SIPRESTA.)';

    if (porCorreo && est && est.correo) {
      const op = { name: NOMBRE_REMITENTE };
      if (cfg.correo) op.replyTo = cfg.correo;
      if (COPIA_A) op.bcc = COPIA_A;
      MailApp.sendEmail(est.correo, asunto, cuerpo, op);
    }
    const hhmm = Utilities.formatDate(new Date(vence), ZONA, 'HH:mm');
    if (porTelefono) notificar_(uid, tipo !== 'avisoAtraso' ? queda + ' · devuelve ' + (t.nombre || 'tu herramienta') : 'Préstamo atrasado',
      tipo !== 'avisoAtraso' ? 'Tu préstamo de ' + herr + ' vence a las ' + hhmm + '. Devuélvelo en el Taller de Herramientas y Materiales.'
        : 'El préstamo de ' + herr + ' venció a las ' + hhmm + '. Devuélvelo lo antes posible.');
    marcar_(p._id, marcas, new Date().toISOString());
    enviados++;
  });
  if (enviados) console.log('Avisos enviados: ' + enviados);
}

/** Ejecuta una vez para comprobar el acceso (no envía correos). */
function probar() {
  const p = consultar_('prestamos', 'estado', 'entregado');
  console.log('Conexión OK. Préstamos activos: ' + p.length + ' · Correos disponibles hoy: ' + MailApp.getRemainingDailyQuota());
  p.forEach(function (x) {
    const e = buscarEstudiante_(x);
    const uid = (e && e.uid) || x.estudianteId || (e && e._id) || '';
    console.log('- vence ' + x.venceEn + ' · ' + (e ? (e.nombre || '') + ' <' + (e.correo || 'sin correo') + '>' : (x.estudianteTexto || 'estudiante no encontrado'))
      + (tieneTelefono_(uid) ? ' · avisos en teléfono: sí' : '') + (UMBRALES_.filter(function (m) { return yaAvisado_(x, m); }).length ? ' · avisado: ' + UMBRALES_.filter(function (m) { return yaAvisado_(x, m); }).join(', ') + ' min' : ''));
  });
}

/** Ejecuta una vez para activar la revisión automática cada 5 minutos. */
function instalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('revisarVencimientos').timeBased().everyMinutes(5).create();
  console.log('Listo: SIPRESTA revisará los vencimientos cada 5 minutos.');
}

/** Para detener los avisos. */
function desinstalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  console.log('Avisos automáticos detenidos.');
}

// ---------- Notificaciones en el teléfono (Firebase Cloud Messaging) ----------
function tokens_(uid) { if (!uid) return []; const d = leer_('push/' + uid); return (d && d.tokens) || []; }
function tieneTelefono_(uid) { return tokens_(uid).length > 0; }
function notificar_(uid, titulo, cuerpo) {
  const toks = tokens_(uid); if (!toks.length) return;
  const vivos = [];
  toks.forEach(function (tok) {
    const r = UrlFetchApp.fetch('https://fcm.googleapis.com/v1/projects/' + PROYECTO + '/messages:send', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({ message: { token: tok, notification: { title: titulo, body: cuerpo },
        webpush: { notification: { icon: URL_APP + 'icono-192.png' }, fcm_options: { link: URL_APP } } } })
    });
    const c = r.getResponseCode();
    if (c === 404 || (c === 400 && /UNREGISTERED|INVALID_ARGUMENT/.test(r.getContentText()))) return; // teléfono que ya no existe
    if (c >= 300) console.log('FCM ' + c + ': ' + r.getContentText().slice(0, 200));
    vivos.push(tok);
  });
  if (vivos.length !== toks.length) pedir_(BASE_ + '/push/' + uid + '?updateMask.fieldPaths=tokens', 'patch',
    { fields: { tokens: { arrayValue: { values: vivos.map(function (x) { return { stringValue: x }; }) } } } });
}

/** Envía una notificación de prueba a tus propios teléfonos (los del correo indicado). */
function probarNotificacion() {
  const correo = 'ESCRIBE_AQUI_TU_CORREO_DE_SIPRESTA';
  const docs = consultar_('push', 'correo', correo.trim().toLowerCase());
  if (!docs.length) { console.log('Ese correo aún no activó avisos en ningún teléfono.'); return; }
  docs.forEach(function (d) { notificar_(d._id, 'Prueba de SIPRESTA', 'Si ves esto, los avisos en el teléfono funcionan.'); });
  console.log('Notificación de prueba enviada a ' + docs.length + ' cuenta(s).');
}

// ---------- Fecha en español ----------
function fechaES_(d) {
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const f = function (x) { return Utilities.formatDate(d, ZONA, x); };
  return DIAS[Number(f('u')) % 7] + ' ' + Number(f('d')) + ' de ' + MESES[Number(f('M')) - 1] + ' a las ' + f('HH:mm');
}

// ---------- Umbrales ----------
const UMBRALES_ = AVISOS_CORREO.concat(AVISOS_TELEFONO).filter(function (m, i, a) { return a.indexOf(m) === i; }).sort(function (a, b) { return b - a; });
function yaAvisado_(p, m) { return !!(p['aviso' + m] || (m === 60 && p.aviso1h)); }

// ---------- Estudiante ----------
function buscarEstudiante_(p) {
  // Lee solo la ficha de este estudiante (no toda la colección de usuarios).
  let u = null;
  if (p.estudianteId) u = leer_('usuarios/' + p.estudianteId) || consultar_('usuarios', 'uid', p.estudianteId, 1)[0] || null;
  if (!u && p.estudianteRun) u = consultar_('usuarios', 'run', p.estudianteRun, 1)[0] || null;
  if (!u && p.estudianteTexto) u = consultar_('usuarios', 'nombre', String(p.estudianteTexto).trim(), 1)[0] || null;
  return u;
}

// ---------- Firestore (REST) ----------
const BASE_ = 'https://firestore.googleapis.com/v1/projects/' + PROYECTO + '/databases/(default)/documents';
function pedir_(url, metodo, cuerpo) {
  const op = { method: metodo || 'get', muteHttpExceptions: true, contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } };
  if (cuerpo) op.payload = JSON.stringify(cuerpo);
  const r = UrlFetchApp.fetch(url, op), c = r.getResponseCode();
  if (c === 404) return null;
  if (c >= 300) throw new Error('Firestore ' + c + ': ' + r.getContentText().slice(0, 300));
  return JSON.parse(r.getContentText() || '{}');
}
function leer_(ruta) { const d = pedir_(BASE_ + '/' + ruta); return d ? doc_(d) : null; }
function listar_(col) {
  let out = [], tok = '';
  do {
    const d = pedir_(BASE_ + '/' + col + '?pageSize=300' + (tok ? '&pageToken=' + encodeURIComponent(tok) : ''));
    (d && d.documents || []).forEach(function (x) { out.push(doc_(x)); });
    tok = d && d.nextPageToken;
  } while (tok);
  return out;
}
function consultar_(col, campo, valor, limite) {
  const q = { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: campo }, op: 'EQUAL', value: { stringValue: valor } } } };
  if (limite) q.limit = limite;
  const r = pedir_(BASE_ + ':runQuery', 'post', { structuredQuery: q });
  return (r || []).filter(function (x) { return x.document; }).map(function (x) { return doc_(x.document); });
}
function marcar_(id, campos, valor) {
  campos = [].concat(campos); if (!campos.length) return;
  const f = {}; campos.forEach(function (c) { f[c] = { stringValue: valor }; });
  pedir_(BASE_ + '/prestamos/' + id + '?' + campos.map(function (c) { return 'updateMask.fieldPaths=' + c; }).join('&'), 'patch', { fields: f });
}
function doc_(d) { const o = val_({ mapValue: { fields: d.fields || {} } }); o._id = d.name.split('/').pop(); return o; }
function val_(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(val_);
  if ('mapValue' in v) { const o = {}, f = v.mapValue.fields || {}; Object.keys(f).forEach(function (k) { o[k] = val_(f[k]); }); return o; }
  return null;
}
