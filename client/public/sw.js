self.addEventListener('push', event => {
  let data={title:'VarYok',body:'Yeni bir okul bildiriminiz var.',url:'/'};
  try{data={...data,...event.data.json()};}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/varyok-icon.png',badge:'/varyok-icon.png',tag:'dersteyim-school',data:{url:'/'}}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{const found=windows.find(w=>new URL(w.url).origin===self.location.origin);return found?found.focus():clients.openWindow('/');}));});
// No student or authentication data is cached offline.
