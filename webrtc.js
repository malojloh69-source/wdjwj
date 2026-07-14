window.OTSWebRTC=(()=>{
 let ws,pc,channel;
 const ice={iceServers:[{urls:"stun:stun.l.google.com:19302"}]};
 function connect(room,host){
  return new Promise(resolve=>{
   ws=new WebSocket(host||"ws://localhost:3000");
   ws.onopen=()=>ws.send(JSON.stringify({type:"join",room}));
   ws.onmessage=async e=>{
    const m=JSON.parse(e.data);
    if(m.type==="signal"){
     const d=m.data;
     if(d.sdp) await pc.setRemoteDescription(d.sdp);
     if(d.candidate) await pc.addIceCandidate(d.candidate);
    }
    if(m.type==="joined"){
     pc=new RTCPeerConnection(ice);
     pc.onicecandidate=e=>e.candidate&&ws.send(JSON.stringify({type:"signal",data:{candidate:e.candidate}}));
     pc.ondatachannel=e=>{channel=e.channel;resolve({channel})};
     if(m.initiator){
      channel=pc.createDataChannel("deal");
      channel.onopen=()=>resolve({channel});
      let offer=await pc.createOffer(); await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({type:"signal",data:{sdp:pc.localDescription}}));
     }
    }
   };
  });
 }
 return {connect,send(d){if(channel?.readyState==='open')channel.send(JSON.stringify(d))}};
})();
