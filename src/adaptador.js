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
});

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
