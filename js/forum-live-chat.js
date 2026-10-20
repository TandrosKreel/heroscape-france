/* Chat temporaire entre membres actifs : texte uniquement, par onglet navigateur. */
(()=>{'use strict';
const db=window.supabaseClient;if(!db)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tokenKey='heroscape-live-chat-token';
let token=sessionStorage.getItem(tokenKey);
if(!token){token=crypto.randomUUID();sessionStorage.setItem(tokenKey,token)}
let me=null,peer=null,peerName='',opened=false,unread=false,lastMessage=0,requesting=false,heartbeatAt=0,activeAt=Date.now(),online=false;
const host=document.createElement('aside');host.className='forum-chat';host.hidden=true;host.innerHTML='<button class="forum-chat-launch" type="button" hidden></button><div class="forum-chat-window" hidden><div class="forum-chat-head"><strong class="forum-chat-name"></strong><span class="forum-chat-status"></span><button class="forum-chat-close" type="button" title="Fermer le chat" aria-label="Fermer">×</button></div><div class="forum-chat-messages" aria-live="polite"></div><form class="forum-chat-form"><input class="forum-chat-input" type="text" maxlength="1000" autocomplete="off" placeholder="Écrire un message…" aria-label="Message texte"><button type="submit">Envoyer</button></form></div>';
document.body.appendChild(host);
const launch=host.querySelector('.forum-chat-launch'),win=host.querySelector('.forum-chat-window'),log=host.querySelector('.forum-chat-messages'),form=host.querySelector('form'),input=host.querySelector('input'),status=host.querySelector('.forum-chat-status');
const save=()=>{if(peer)sessionStorage.setItem('heroscape-chat-peer',JSON.stringify({id:peer,name:peerName,opened}));else sessionStorage.removeItem('heroscape-chat-peer')};
const display=()=>{host.hidden=!peer;win.hidden=!peer||!opened;launch.hidden=!peer||opened;launch.textContent=(unread?'● Nouveau message · ':'Discussion avec ')+peerName;host.querySelector('.forum-chat-name').textContent=peerName;save()};
const select=(id,name,expand=true)=>{if(!me||id===me||!id)return;peer=id;peerName=name||'Membre';opened=expand;unread=false;lastMessage=0;log.replaceChildren();display();if(expand)input.focus();refresh()};
const rpc=(name,args)=>db.rpc(name,args);
const heartbeat=async()=>{if(!me||document.hidden||Date.now()-activeAt>5*60*1000||Date.now()-heartbeatAt<18000)return;const {error}=await rpc('forum_chat_heartbeat',{p_token:token});if(!error)heartbeatAt=Date.now()};
const refresh=async()=>{if(!me||requesting||document.hidden)return;requesting=true;try{
 await heartbeat();
 const {data,error}=await rpc('forum_chat_inbox',{p_token:token});if(error){status.textContent='Connexion au chat interrompue';return;}
 const msgs=data||[];
 if(!peer){const incoming=msgs.filter(m=>m.recipient_id===me);if(incoming.length){const m=incoming[incoming.length-1];const names=await db.from('profiles').select('username').eq('id',m.sender_id).maybeSingle();select(m.sender_id,names.data?.username||'Membre',false);unread=true;display()}}
 if(peer){
  const subset=msgs.filter(m=>m.sender_id===peer||m.recipient_id===peer);
  const latest=subset.length?Number(subset[subset.length-1].id):0;
  if(latest!==lastMessage){
   log.innerHTML=subset.map(m=>'<p class="forum-chat-bubble '+(m.sender_id===me?'mine':'theirs')+'">'+esc(m.body)+'</p>').join('');
   log.scrollTop=log.scrollHeight;
   if(latest>lastMessage&&subset.some(m=>m.sender_id===peer&&Number(m.id)>lastMessage)&&!opened){unread=true;display()}
   lastMessage=latest;
  }
  const {data:isOnline,error:onlineError}=await rpc('forum_chat_online',{p_user:peer});
  if(!onlineError){online=!!isOnline;status.textContent=online?'En ligne':'Hors ligne';input.disabled=!online;form.querySelector('button').disabled=!online}else{status.textContent='Connexion instable';}
 }
 }finally{requesting=false}};
host.querySelector('.forum-chat-close').onclick=()=>{opened=false;unread=false;display()};
launch.onclick=()=>{opened=true;unread=false;display();input.focus();refresh()};
form.onsubmit=async e=>{e.preventDefault();const body=input.value.trim();if(!body||!peer||!online)return;const button=form.querySelector('button');button.disabled=true;const {error}=await rpc('forum_chat_send',{p_token:token,p_to:peer,p_body:body});button.disabled=false;if(error){status.textContent=error.message;return}input.value='';await refresh()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-forum-chat-user]');if(b){e.preventDefault();select(b.dataset.forumChatUser,b.dataset.forumChatName)}});
['pointerdown','keydown','touchstart','scroll'].forEach(ev=>document.addEventListener(ev,()=>{activeAt=Date.now()},{passive:true}));
window.addEventListener('focus',()=>{activeAt=Date.now();heartbeatAt=0;refresh()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){activeAt=Date.now();heartbeatAt=0;refresh()}});
db.auth.getUser().then(async({data:{user}})=>{if(!user)return;me=user.id;try{const saved=JSON.parse(sessionStorage.getItem('heroscape-chat-peer')||'null');if(saved?.id&&saved.id!==me){peer=saved.id;peerName=saved.name;opened=!!saved.opened;display()}}catch(e){}await heartbeat();await refresh()});
setInterval(refresh,2500);
})();
