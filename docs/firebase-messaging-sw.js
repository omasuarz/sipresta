importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
// Configuración pública del proyecto Firebase de SIPRESTA (no es secreta; la seguridad la dan las reglas de Firestore)
self.SIPRESTA_FIREBASE = {
  apiKey: "AIzaSyBhtKUpGYgtyvhmFo5pNBqXVVv9OcQYDS4",
  authDomain: "sipresta-talca.firebaseapp.com",
  projectId: "sipresta-talca",
  storageBucket: "sipresta-talca.firebasestorage.app",
  messagingSenderId: "475931437876",
  appId: "1:475931437876:web:2cf5d2378b03c209509361"
};

firebase.initializeApp(self.SIPRESTA_FIREBASE);
firebase.messaging();
self.addEventListener('notificationclick',function(e){e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(l){for(var i=0;i<l.length;i++){if('focus' in l[i])return l[i].focus();}return clients.openWindow('./');}));});
