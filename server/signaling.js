const WebSocket = require('ws');
const wss = new WebSocket.Server({port:3000});
const rooms = new Map();
function send(ws,msg){ if(ws.readyState===1) ws.send(JSON.stringify(msg)); }
wss.on('connection', ws=>{
 ws.on('message', raw=>{
  let m; try{m=JSON.parse(raw)}catch(e){return}
  if(m.type==='join'){
   ws.room=m.room;
   if(!rooms.has(m.room)) rooms.set(m.room,[]);
   const list=rooms.get(m.room); list.push(ws);
   send(ws,{type:'joined',initiator:list.length===1});
   list.filter(x=>x!==ws).forEach(x=>send(x,{type:'peer'}));
  }
  if(m.type==='signal'){
   (rooms.get(ws.room)||[]).filter(x=>x!==ws).forEach(x=>send(x,{type:'signal',data:m.data}));
  }
 });
 ws.on('close',()=>{if(ws.room&&rooms.has(ws.room)) rooms.set(ws.room,rooms.get(ws.room).filter(x=>x!==ws));});
});
console.log('OTS FanPay signaling :3000');
