/* SIPRESTA · adaptador Firebase
   Entrega a la app la misma interfaz que tenía dentro de Claude (window.claude.use),
   pero sobre Firebase: Firestore (datos), Authentication con Google (sesión) y fotos
   comprimidas guardadas en Firestore (colección «fotos»). */
(function(){
'use strict';
var DUENO='omar.suarez@utalca.cl';
var DOMINIOS=['utalca.cl','alumnos.utalca.cl','gmail.com'];
var GIF='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

firebase.initializeApp(window.SIPRESTA_FIREBASE);
var auth=firebase.auth();
var db=firebase.firestore();
try{db.settings({ignoreUndefinedProperties:true});}catch(e){}

function correo(u){return String((u&&u.email)||'').trim().toLowerCase();}
function dominioOk(mail){var d=mail.split('@')[1]||'';return DOMINIOS.indexOf(d)>=0;}

var sesion=new Promise(function(listo){
  var primero=true;
  auth.onAuthStateChanged(function(u){
    if(u&&!dominioOk(correo(u))){
      auth.signOut();
      alert('La cuenta '+correo(u)+' no está autorizada.\nUsa un correo @utalca.cl, @alumnos.utalca.cl o @gmail.com.');
      u=null;
    }
    if(u&&!u.emailVerified){window.__pendiente=correo(u);u=null;}
    if(primero){primero=false;listo(u);}
  });
});

/* ---------- inicio y cierre de sesión ---------- */
function entrar(){
  var p=new firebase.auth.GoogleAuthProvider();
  p.setCustomParameters({prompt:'select_account'});
  auth.signInWithPopup(p).then(function(r){
    if(r&&r.user&&dominioOk(correo(r.user)))location.reload();
  }).catch(function(e){
    var c=e&&e.code||'';
    if(c==='auth/popup-blocked'||c==='auth/operation-not-supported-in-this-environment')return auth.signInWithRedirect(p);
    if(c==='auth/popup-closed-by-user'||c==='auth/cancelled-popup-request')return;
    if(c==='auth/unauthorized-domain')return alert('Este sitio todavía no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).');
    alert('No se pudo iniciar sesión: '+(e&&e.message||c));
  });
}
function salir(){
  if(!confirm('¿Cerrar sesión en SIPRESTA?'))return;
  auth.signOut().then(function(){location.reload();});
}
window.__logout=salir;
document.addEventListener('click',function(ev){
  var t=ev.target&&ev.target.closest&&ev.target.closest('[data-login],[data-logout],.who .av');
  if(!t)return;
  ev.preventDefault();ev.stopPropagation();
  if(t.hasAttribute('data-login'))entrar();else salir();
},true);


/* ---------- ingreso con correo y contraseña ---------- */
function esc(t){return String(t||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
var modo='entrar';
window.__loginHTML=function(){
  if(window.__pendiente){
    return '<div class="note"><b>Revisa tu correo</b><br>Te enviamos un enlace de verificación a <b>'+esc(window.__pendiente)+'</b>. Ábrelo (revisa también «Spam» o «Correo no deseado») y luego vuelve aquí.'
      +'<div class="actions" style="justify-content:flex-start;margin-top:14px;flex-wrap:wrap"><button class="btn primary" type="button" data-lg="listo">Ya lo verifiqué</button><button class="btn" type="button" data-lg="reenviar">Reenviar correo</button><button class="btn" type="button" data-lg="otra">Usar otra cuenta</button></div></div>';
  }
  var crear=modo==='crear';
  return '<div class="note lg-box"><b>Inicia sesión para usar el sistema</b><br><span class="muted">Con tu correo @utalca.cl, @alumnos.utalca.cl o Gmail.</span>'
    +'<form class="lg-form" data-lg-form>'
    +(crear?'<label class="field"><span class="label">Nombre y apellido</span><input id="lg-nom" autocomplete="name" required></label>':'')
    +'<label class="field"><span class="label">Correo</span><input id="lg-mail" type="email" autocomplete="email" inputmode="email" required></label>'
    +'<label class="field"><span class="label">Contraseña'+(crear?' (mínimo 6 caracteres)':'')+'</span><input id="lg-pass" type="password" autocomplete="'+(crear?'new-password':'current-password')+'" minlength="6" required></label>'
    +'<button class="btn primary" type="submit">'+(crear?'Crear cuenta':'Entrar')+'</button>'
    +'<div class="lg-links"><button class="lg-link" type="button" data-lg="modo">'+(crear?'Ya tengo cuenta: entrar':'¿Primera vez? Crear cuenta')+'</button>'+(crear?'':'<button class="lg-link" type="button" data-lg="olvido">Olvidé mi contraseña</button>')+'</div></form>'
    +'<div class="lg-o"><span>o</span></div><button class="btn lg-g" type="button" data-login>Entrar con Google (Gmail)</button></div>';
};
function errTxt(e){var c=e&&e.code||'';return ({
  'auth/invalid-credential':'Correo o contraseña incorrectos.','auth/wrong-password':'Correo o contraseña incorrectos.','auth/user-not-found':'No hay una cuenta con ese correo. Toca «Crear cuenta».',
  'auth/email-already-in-use':'Ese correo ya tiene cuenta. Entra con tu contraseña o usa «Olvidé mi contraseña».','auth/weak-password':'La contraseña debe tener al menos 6 caracteres.',
  'auth/invalid-email':'El correo no es válido.','auth/too-many-requests':'Demasiados intentos. Espera unos minutos.','auth/operation-not-allowed':'El ingreso con correo aún no está activado en Firebase.',
  'auth/network-request-failed':'Sin conexión. Revisa tu internet.'})[c]||('No se pudo completar: '+(e&&e.message||c));}
function volver(){var r=document.getElementById('root');location.reload();}
var enlace={url:location.origin+location.pathname};
document.addEventListener('submit',function(ev){
  if(!ev.target.hasAttribute('data-lg-form'))return;
  ev.preventDefault();ev.stopPropagation();
  var mail=document.getElementById('lg-mail').value.trim().toLowerCase(),pass=document.getElementById('lg-pass').value;
  var nomEl=document.getElementById('lg-nom'),nom=nomEl?nomEl.value.trim():'';
  if(!dominioOk(mail))return alert('Usa un correo @utalca.cl, @alumnos.utalca.cl o @gmail.com.');
  var btn=ev.target.querySelector('[type=submit]');btn.disabled=true;
  var p=modo==='crear'
    ?auth.createUserWithEmailAndPassword(mail,pass).then(function(r){return r.user.updateProfile({displayName:nom}).then(function(){return r.user.sendEmailVerification(enlace);});})
    :auth.signInWithEmailAndPassword(mail,pass);
  p.then(volver).catch(function(e){btn.disabled=false;alert(errTxt(e));});
},true);
document.addEventListener('click',function(ev){
  var t=ev.target&&ev.target.closest&&ev.target.closest('[data-lg]');if(!t)return;
  ev.preventDefault();ev.stopPropagation();
  var k=t.getAttribute('data-lg');
  if(k==='modo'){modo=modo==='crear'?'entrar':'crear';var b=document.querySelector('.lg-box');if(b)b.outerHTML=window.__loginHTML();return;}
  if(k==='olvido'){var m=(document.getElementById('lg-mail')||{}).value||'';m=prompt('Escribe tu correo para enviarte un enlace y crear una contraseña nueva:',m);if(!m)return;
    auth.sendPasswordResetEmail(m.trim().toLowerCase(),enlace).then(function(){alert('Listo. Revisa tu correo (también «Spam»).');}).catch(function(e){alert(errTxt(e));});return;}
  if(k==='listo'){var u=auth.currentUser;if(!u)return location.reload();u.reload().then(function(){if(auth.currentUser.emailVerified){return auth.currentUser.getIdToken(true).then(function(){location.reload();});}alert('Todavía no aparece verificado. Abre el enlace del correo y vuelve a intentar.');});return;}
  if(k==='reenviar'){var u2=auth.currentUser;if(u2)u2.sendEmailVerification(enlace).then(function(){alert('Correo reenviado.');}).catch(function(e){alert(errTxt(e));});return;}
  if(k==='otra'){auth.signOut().then(function(){location.reload();});}
},true);

/* ---------- usuario ---------- */
var equipoCache=null;
function miEquipo(u){
  if(equipoCache)return equipoCache;
  equipoCache=db.doc('equipo/'+correo(u)).get().then(function(s){return s.exists?(s.data()||{}):null;}).catch(function(){return null;});
  return equipoCache;
}
function esDueno(u){return !!u&&correo(u)===DUENO;}
var user={
  id:function(){return sesion.then(function(u){return u?u.uid:null;});},
  me:function(){return sesion.then(function(u){return u?{name:u.displayName||correo(u),email:correo(u)}:{};});},
  isOwner:function(){return sesion.then(esDueno);},
  canEdit:function(){return sesion.then(function(u){
    if(!u)return false;if(esDueno(u))return true;
    return miEquipo(u).then(function(e){return !!e;});
  });},
  profiles:function(ids){
    var out={};
    return Promise.all((ids||[]).map(function(id){
      return db.doc('perfiles/'+id).get().then(function(s){if(s.exists)out[id]=s.data();}).catch(function(){});
    })).then(function(){return out;});
  }
};

/* Al entrar: guarda nombre visible (para que el taller vea quién reservó) */
sesion.then(function(u){
  if(!u)return;
  db.doc('perfiles/'+u.uid).set({name:u.displayName||correo(u).split('@')[0],actualizado:new Date().toISOString()},{merge:true}).catch(function(){});
  Promise.resolve(esDueno(u)||miEquipo(u).then(function(e){return e&&e.rol==='admin';})).then(function(admin){if(admin)sincronizarEquipo();});
  fichaUsuario(u);
});

/* ---------- Notificaciones en el teléfono (Firebase Cloud Messaging) ----------
   El estudiante acepta una vez; su dispositivo queda en push/{uid} y el script de avisos
   (carpeta avisos/) le envía el recordatorio 1 hora antes del vencimiento. */
var VAPID='BNFA1qQvK-opIxN4g91jMHwuHbmz8Uq64GbvMkRkL_E0lTXfLsP1USYqlVX_MHbP2Udj9EkApOvnLi5QrnIoX9o';
var esIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
var instalada=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
function pushOk(){try{return 'Notification' in window&&'serviceWorker' in navigator&&firebase.messaging&&firebase.messaging.isSupported();}catch(e){return false;}}
function pospuesto(k){try{var t=+localStorage.getItem('sipresta-push-'+k)||0;return Date.now()-t<14*864e5;}catch(e){return false;}}
function posponer(k){try{localStorage.setItem('sipresta-push-'+k,String(Date.now()));}catch(e){}}
var swReg=null;
function registrarPush(u){
  return navigator.serviceWorker.register('firebase-messaging-sw.js').then(function(reg){swReg=reg;
    return firebase.messaging().getToken({vapidKey:VAPID,serviceWorkerRegistration:reg});
  }).then(function(tok){
    if(!tok)return false;
    return db.doc('push/'+u.uid).set({tokens:firebase.firestore.FieldValue.arrayUnion(tok),correo:correo(u),actualizado:new Date().toISOString()},{merge:true}).then(function(){return true;});
  });
}
function avisoPush(html,acciones){
  var d=document.createElement('div');d.className='push-aviso';d.setAttribute('role','dialog');d.setAttribute('aria-label','Avisos en este teléfono');
  d.innerHTML=html+'<div class="push-acc">'+acciones+'</div>';document.body.appendChild(d);return d;
}
function iniciarPush(u){
  if(!u)return;
  if(pushOk()){
    try{firebase.messaging().onMessage(function(p){var n=p.notification||{};if(swReg&&Notification.permission==='granted')swReg.showNotification(n.title||'SIPRESTA',{body:n.body||'',icon:'icono-192.png'});});}catch(e){}
    if(Notification.permission==='granted'){registrarPush(u).catch(function(){});return;}
    if(Notification.permission==='denied'||pospuesto('no'))return;
    setTimeout(function(){
      var d=avisoPush('<b>¿Recibir avisos de tus préstamos?</b><span>Te avisaremos en este teléfono 1 hora, 30 y 15 minutos antes de que venza un préstamo.</span>',
        '<button class="btn small" type="button" data-p="no">Ahora no</button><button class="btn small primary" type="button" data-p="si">Activar</button>');
      d.addEventListener('click',function(e){var b=e.target.closest('[data-p]');if(!b)return;
        if(b.dataset.p==='no'){posponer('no');d.remove();return;}
        b.disabled=true;b.textContent='Activando…';
        Notification.requestPermission().then(function(r){
          if(r!=='granted'){posponer('no');d.remove();return;}
          return registrarPush(u).then(function(ok){d.innerHTML='<b>'+(ok?'Avisos activados':'No se pudo activar')+'</b><span>'+(ok?'Recibirás los recordatorios de tus préstamos en este teléfono.':'Intenta de nuevo más tarde.')+'</span>';setTimeout(function(){d.remove();},3500);});
        }).catch(function(){d.remove();});
      });
    },2500);
  }else if(esIOS&&!instalada&&!pospuesto('ios')){
    setTimeout(function(){
      var d=avisoPush('<b>Recibe avisos en tu iPhone</b><span>Toca <b>Compartir</b> y luego <b>«Agregar a inicio»</b>. Abre SIPRESTA desde ese ícono para activar los avisos de tus préstamos.</span>',
        '<button class="btn small" type="button" data-p="ok">Entendido</button>');
      d.addEventListener('click',function(e){if(e.target.closest('[data-p]')){posponer('ios');d.remove();}});
    },2500);
  }
}
var cssPush=document.createElement('style');
cssPush.textContent='.push-aviso{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(20px + env(safe-area-inset-bottom));z-index:9000;width:min(440px,calc(100vw - 24px));background:var(--surface,#fff);color:var(--ink,#231f20);border:1px solid var(--line,#ddd);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.18);padding:16px 18px;display:flex;flex-direction:column;gap:6px;font-size:15px;line-height:1.4}.push-aviso span{color:var(--muted,#666)}.push-acc{display:flex;gap:8px;justify-content:flex-end;margin-top:6px}@media(max-width:860px){.push-aviso{bottom:calc(84px + env(safe-area-inset-bottom))}}';
document.head.appendChild(cssPush);
sesion.then(iniciarPush);

/* Cada persona que entra queda en la lista de Usuarios del taller.
   Si el taller ya la tenía cargada (por ejemplo desde el CSV de matrícula), se enlaza por correo;
   si no, se crea su ficha con nombre y correo, para que el encargado complete RUN, matrícula y carrera. */
function fichaUsuario(u){
  if(esDueno(u))return;
  var mail=correo(u),dom=mail.split('@')[1]||'';
  miEquipo(u).then(function(e){
    if(e)return;
    return db.collection('usuarios').where('correo','==',mail).limit(1).get().then(function(q){
      var hoy=new Date().toISOString();
      if(q.empty){
        return db.doc('usuarios/'+u.uid).set({nombre:u.displayName||mail.split('@')[0],correo:mail,rol:dom==='utalca.cl'?'docente':'estudiante',
          habilitado:true,creado:hoy,origen:'registro',uid:u.uid,ultimoIngreso:hoy});
      }
      var d=q.docs[0],x=d.data()||{};
      if(x.uid!==u.uid||!x.ultimoIngreso||String(x.ultimoIngreso).slice(0,10)!==hoy.slice(0,10))
        return d.ref.update({uid:u.uid,ultimoIngreso:hoy});
    });
  }).catch(function(e){try{console.warn('SIPRESTA: no se pudo registrar la ficha del usuario',e&&e.message);}catch(_){}});
}

/* Mantiene la colección «equipo» (correo → rol) a partir de los roles asignados en Usuarios.
   Las reglas de seguridad usan «equipo» para saber quién es encargado o administrador. */
function sincronizarEquipo(){
  db.collection('usuarios').onSnapshot(function(us){
    var quiero={};
    us.docs.forEach(function(d){var x=d.data()||{},c=String(x.correo||'').trim().toLowerCase();
      if(c&&(x.rol==='encargado'||x.rol==='admin')&&c!==DUENO)quiero[c]=x.rol;});
    db.collection('equipo').get().then(function(eq){
      var hay={};eq.docs.forEach(function(d){hay[d.id]=(d.data()||{}).rol;});
      Object.keys(quiero).forEach(function(c){if(hay[c]!==quiero[c])db.doc('equipo/'+c).set({rol:quiero[c]}).catch(function(){});});
      Object.keys(hay).forEach(function(c){if(!quiero[c])db.doc('equipo/'+c).delete().catch(function(){});});
    }).catch(function(){});
  },function(){});
}

/* ---------- fotos ---------- */
var fotos={},pidiendo={};
function deCache(id){try{return localStorage.getItem('sipresta-foto-'+id);}catch(e){return null;}}
function aCache(id,v){try{localStorage.setItem('sipresta-foto-'+id,v);}catch(e){}}
window.__fotoSrc=function(id){
  if(fotos[id])return fotos[id];
  var c=deCache(id);if(c){fotos[id]=c;return c;}
  var ph=GIF+'#'+encodeURIComponent(id);
  if(!pidiendo[id]){
    pidiendo[id]=db.doc('fotos/'+id).get().then(function(s){
      var v=s.exists&&(s.data()||{}).data;if(!v)return;
      fotos[id]=v;aCache(id,v);
      document.querySelectorAll('img').forEach(function(im){if(im.getAttribute('src')===ph)im.src=v;});
    }).catch(function(){});
  }
  return ph;
};
function comprimir(blob){
  return new Promise(function(ok,mal){
    var url=URL.createObjectURL(blob),im=new Image();
    im.onload=function(){
      var max=900,w=im.naturalWidth,h=im.naturalHeight,k=Math.min(1,max/Math.max(w,h));
      var cv=document.createElement('canvas');cv.width=Math.round(w*k);cv.height=Math.round(h*k);
      cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);URL.revokeObjectURL(url);
      var q=.78,d=cv.toDataURL('image/jpeg',q);
      while(d.length>600000&&q>.35){q-=.1;d=cv.toDataURL('image/jpeg',q);}
      ok(d);
    };
    im.onerror=function(){URL.revokeObjectURL(url);mal(new Error('imagen'));};
    im.src=url;
  });
}
var assets={
  upload:function(blob){
    return comprimir(blob).then(function(d){
      var ref=db.collection('fotos').doc();
      return ref.set({data:d,creado:new Date().toISOString()}).then(function(){fotos[ref.id]=d;aCache(ref.id,d);return {id:ref.id};});
    });
  }
};

/* ---------- interfaz que espera la app ---------- */
window.claude={use:function(k){
  if(k==='db')return Promise.resolve(db);
  if(k==='user')return Promise.resolve(user);
  if(k==='assets')return user.canEdit().then(function(ok){return ok?assets:null;});
  return Promise.resolve(null);
}};
})();
