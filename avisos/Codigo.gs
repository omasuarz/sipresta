/**
 * SIPRESTA — Avisos automáticos por correo
 * Taller de Herramientas y Materiales · Escuela de Arquitectura · Universidad de Talca
 *
 * Revisa los préstamos cada 10 minutos y envía:
 *   1) un recordatorio 1 hora antes del vencimiento;
 *   2) (opcional) un aviso cuando el préstamo ya está atrasado.
 * Cada préstamo queda marcado (aviso1h / avisoAtraso) para no repetir el correo.
 *
 * Instalación: ver LEEME en esta misma carpeta. Primero ejecuta «probar», luego «instalar».
 */

// ---------- Ajustes ----------
const PROYECTO = 'sipresta-talca';          // ID del proyecto Firebase
const MINUTOS_ANTES = 60;                   // cuánto antes del vencimiento se avisa
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

  const usuarios = listar_('usuarios');
  const cfg = leer_('ajustes/general') || {};
  const cache = {};
  let enviados = 0;

  prestamos.forEach(function (p) {
    const vence = Date.parse(p.venceEn || '');
    if (!vence) return;
    const falta = vence - ahora;
    let tipo = null;
    if (!p.aviso1h && falta > 0 && falta <= MINUTOS_ANTES * 60000) tipo = 'aviso1h';
    else if (AVISAR_ATRASO && !p.avisoAtraso && falta <= 0 && -falta < 3 * 24 * 3600000) tipo = 'avisoAtraso';
    if (!tipo) return;

    const est = buscarEstudiante_(p, usuarios);
    if (!est || !est.correo) { marcar_(p._id, tipo, 'sin-correo'); return; }

    const t = cache[p.herramientaId] || (cache[p.herramientaId] = leer_('herramientas/' + p.herramientaId) || {});
    const herr = (t.nombre || 'la herramienta') + (t.codigo ? ' (' + t.codigo + ')' : '');
    const hora = fechaES_(new Date(vence));
    const nombre = (est.nombres || est.nombre || '').split(' ')[0] || 'Hola';
    const contacto = [cfg.horario ? 'Horario: ' + cfg.horario : '', cfg.ubicacion ? 'Ubicación: ' + cfg.ubicacion : '',
      cfg.telefono ? 'Teléfono: ' + cfg.telefono : '', cfg.correo ? 'Correo: ' + cfg.correo : ''].filter(String).join('\n');

    let asunto, cuerpo;
    if (tipo === 'aviso1h') {
      asunto = 'Recordatorio: devuelve ' + (t.nombre || 'tu herramienta') + ' antes de las ' + Utilities.formatDate(new Date(vence), ZONA, 'HH:mm');
      cuerpo = nombre + ',\n\nTe recordamos que el préstamo de ' + herr + ' vence el ' + hora + ' (en menos de una hora).\n\n'
        + 'Devuélvela a tiempo en el Taller de Herramientas y Materiales para evitar una sanción.';
    } else {
      asunto = 'Préstamo atrasado: ' + (t.nombre || 'herramienta');
      cuerpo = nombre + ',\n\nEl préstamo de ' + herr + ' venció el ' + hora + ' y aún no se registra su devolución.\n\n'
        + 'Devuélvela lo antes posible en el Taller de Herramientas y Materiales. Los atrasos generan sanciones según el reglamento del taller.';
    }
    cuerpo += '\n\nRevisa tus préstamos en ' + URL_APP + (contacto ? '\n\n' + contacto : '')
      + '\n\nTaller de Herramientas y Materiales\nEscuela de Arquitectura · Universidad de Talca\n\n(Este es un mensaje automático de SIPRESTA.)';

    const op = { name: NOMBRE_REMITENTE };
    if (cfg.correo) op.replyTo = cfg.correo;
    if (COPIA_A) op.bcc = COPIA_A;
    MailApp.sendEmail(est.correo, asunto, cuerpo, op);
    marcar_(p._id, tipo, new Date().toISOString());
    enviados++;
  });
  if (enviados) console.log('Avisos enviados: ' + enviados);
}

/** Ejecuta una vez para comprobar el acceso (no envía correos). */
function probar() {
  const p = consultar_('prestamos', 'estado', 'entregado');
  const u = listar_('usuarios');
  console.log('Conexión OK. Préstamos activos: ' + p.length + ' · Usuarios: ' + u.length + ' · Correos disponibles hoy: ' + MailApp.getRemainingDailyQuota());
  p.forEach(function (x) {
    const e = buscarEstudiante_(x, u);
    console.log('- vence ' + x.venceEn + ' · ' + (e ? (e.nombre || '') + ' <' + (e.correo || 'sin correo') + '>' : (x.estudianteTexto || 'estudiante no encontrado')) + (x.aviso1h ? ' · ya avisado' : ''));
  });
}

/** Ejecuta una vez para activar la revisión automática cada 10 minutos. */
function instalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('revisarVencimientos').timeBased().everyMinutes(10).create();
  console.log('Listo: SIPRESTA revisará los vencimientos cada 10 minutos.');
}

/** Para detener los avisos. */
function desinstalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  console.log('Avisos automáticos detenidos.');
}

// ---------- Fecha en español ----------
function fechaES_(d) {
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const f = function (x) { return Utilities.formatDate(d, ZONA, x); };
  return DIAS[Number(f('u')) % 7] + ' ' + Number(f('d')) + ' de ' + MESES[Number(f('M')) - 1] + ' a las ' + f('HH:mm');
}

// ---------- Estudiante ----------
function buscarEstudiante_(p, usuarios) {
  const limpiaRun = function (r) { return String(r || '').replace(/[^0-9kK]/g, '').toUpperCase(); };
  const limpia = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); };
  let u = null;
  if (p.estudianteId) u = usuarios.find(function (x) { return x._id === p.estudianteId || x.uid === p.estudianteId; });
  if (!u && p.estudianteRun) u = usuarios.find(function (x) { return x.run && limpiaRun(x.run) === limpiaRun(p.estudianteRun); });
  if (!u && p.estudianteTexto) u = usuarios.find(function (x) { return limpia(x.nombre) === limpia(p.estudianteTexto); });
  return u || null;
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
function consultar_(col, campo, valor) {
  const r = pedir_(BASE_ + ':runQuery', 'post', { structuredQuery: { from: [{ collectionId: col }],
    where: { fieldFilter: { field: { fieldPath: campo }, op: 'EQUAL', value: { stringValue: valor } } } } });
  return (r || []).filter(function (x) { return x.document; }).map(function (x) { return doc_(x.document); });
}
function marcar_(id, campo, valor) {
  pedir_(BASE_ + '/prestamos/' + id + '?updateMask.fieldPaths=' + campo, 'patch', { fields: { [campo]: { stringValue: valor } } });
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
