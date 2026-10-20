/* Activité réelle sur le site, fenêtre glissante de cinq minutes. */
(()=>{'use strict';
const db=window.supabaseClient;if(!db)return;
const list=document.getElementById('forum-online-members');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lastInteraction=Date.now(),lastPing=0,pinging=false,currentUserId=null;
const active=()=>document.visibilityState==='visible'&&document.hasFocus()&&Date.now()-lastInteraction<5*60*1000;
const ping=async()=>{
 if(!active()||pinging||Date.now()-lastPing<60*1000)return;
 pinging=true;
 try{const {data:{user}}=await db.auth.getUser();if(user){currentUserId=user.id;const {error}=await db.rpc('forum_presence_ping');if(!error)lastPing=Date.now()}}
 catch(e){console.warn('Présence forum :',e)}finally{pinging=false}
};
const touch=()=>{lastInteraction=Date.now();ping()};
['pointerdown','keydown','touchstart','scroll'].forEach(name=>document.addEventListener(name,touch,{passive:true}));
window.addEventListener('focus',touch);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)touch()});
const refresh=async()=>{
 if(!list||document.hidden)return;
 const {data,error}=await db.rpc('forum_online_members');
 if(error){list.textContent='Impossible de charger les membres actifs.';return}
 list.innerHTML=data?.length?'<div class="forum-online-list">'+data.map(p=>(p.user_id===currentUserId?'<span class="forum-online-member"><span class="forum-online-dot" aria-hidden="true"></span>'+esc(p.username)+' (vous)</span>':'<button type="button" class="forum-online-member" data-forum-chat-user="'+esc(p.user_id)+'" data-forum-chat-name="'+esc(p.username)+'" title="Discuter avec '+esc(p.username)+'"><span class="forum-online-dot" aria-hidden="true"></span>'+esc(p.username)+'</button>')).join('')+'</div>':'<p class="forum-online-empty">Aucun membre actif pour le moment.</p>';
};
touch();refresh();
setInterval(()=>{ping();refresh()},30*1000);
})();
