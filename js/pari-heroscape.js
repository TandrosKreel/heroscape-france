(()=>{'use strict';
const db=window.supabaseClient,$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cards=[],catalogueAll=[],catalogueStamp='',cardsRefreshing=null,members=[],user=null,admin=false,matches=[],armies=[],items=[],votes=[],openPage=0,finishedPage=0,memberPage=0,cardPage=0,playedCardsOnly=false,build=[],tab='encours',mapPhotos=[],photoUploading=false;
const msg=s=>$('bet-status').textContent=s;
const call=async(name,args)=>{const {data,error}=await db.rpc(name,args);if(error)throw error;return data};
const names=()=>new Map(members.map(m=>[m.id,m.username]));
const visibleMatchNumber=id=>{const ordered=[...matches].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)||a.id-b.id);const index=ordered.findIndex(m=>m.id===id);return index>=0?index+1:id;};
const byMatch=id=>armiesByMatch.get(id)||[];
const byArmy=id=>itemsByArmy.get(id)||[];
const voteFor=id=>votesByMatch.get(id)||[];
const matchPoints=m=>m.format;
let armiesByMatch=new Map(),itemsByArmy=new Map(),votesByMatch=new Map();
const indexRows=()=>{armiesByMatch=new Map();itemsByArmy=new Map();votesByMatch=new Map();for(const a of armies){if(!armiesByMatch.has(a.match_id))armiesByMatch.set(a.match_id,[]);armiesByMatch.get(a.match_id).push(a)}for(const a of armiesByMatch.values())a.sort((x,y)=>x.position-y.position);for(const c of items){if(!itemsByArmy.has(c.army_id))itemsByArmy.set(c.army_id,[]);itemsByArmy.get(c.army_id).push(c)}for(const v of votes){if(!votesByMatch.has(v.match_id))votesByMatch.set(v.match_id,[]);votesByMatch.get(v.match_id).push(v)}};

function showTab(t){if(t==='cartes')void refreshCards().catch(e=>console.warn('Actualisation des cartes :',e));tab=t;document.querySelectorAll('.bet-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));document.querySelectorAll('.bet-panel').forEach(p=>p.hidden=p.id!=='bet-'+t);location.hash=t;render()}
document.querySelectorAll('.bet-tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
$('bet-member-mode').addEventListener('change',()=>{memberPage=0;render()});
function setCatalogue(c){
 const nextStamp=JSON.stringify(c.all.map(x=>[x.catalog_id,x.name,x.general,x.points,x.points_order,x.is_hidden]));
 if(nextStamp===catalogueStamp)return false;
 const oldIds=cards.map(card=>card.catalog_id);
 cards=c.active;catalogueAll=c.all;catalogueStamp=nextStamp;
 for(const army of build)for(const selected of army.cards)if(selected.index!==null){
  const previousId=oldIds[selected.index];
  const nextIndex=cards.findIndex(card=>card.catalog_id===previousId);
  selected.index=nextIndex>=0?nextIndex:null;
 }
 return true;
}
async function refreshCards(){
 if(cardsRefreshing)return cardsRefreshing;
 cardsRefreshing=(async()=>{
  const changed=setCatalogue(await window.HeroscapeCards.load(db));
  if(changed)render();
  return changed;
 })();
 try{return await cardsRefreshing}finally{cardsRefreshing=null}
}
async function load(){
 const notice=$('pari-access-notice'),privateContent=$('pari-private-content');
 const {data:authData,error:authError}=await db.auth.getUser();
 const currentUser=authData?.user;
 if(authError||!currentUser){
  notice.innerHTML='🔒 Le Pari Heroscape est réservé aux membres connectés du forum. <a href="index.html" style="color:#f5d58c;text-decoration:underline">Retour au forum pour se connecter</a>.';
  return false;
 }
 const {data:memberProfile,error:profileError}=await db.from('profiles').select('id,posting_blocked').eq('id',currentUser.id).maybeSingle();
 if(profileError||!memberProfile){
  notice.textContent='🔒 Accès réservé aux membres du forum. Votre profil de membre n’a pas pu être vérifié.';
  return false;
 }
 if(memberProfile.posting_blocked){
  privateContent.hidden=true;
  notice.textContent='🔒 Votre accès au Pari Heroscape est bloqué. Contactez un administrateur du forum pour toute question.';
  return false;
 }
 privateContent.hidden=false;notice.hidden=true;
 const [u,c,m,ms,as,cs,vs]=await Promise.all([user?Promise.resolve({data:{user}}):db.auth.getUser(),window.HeroscapeCards.load(db),members.length?Promise.resolve({data:members}):db.from('profiles').select('id,username,role,can_moderate'),db.from('bet_matches').select('*').order('created_at',{ascending:false}),db.from('bet_armies').select('*'),db.from('bet_army_cards').select('*'),db.from('bet_votes').select('*')]);
 for(const x of [m,ms,as,cs,vs])if(x.error)throw x.error;
 user=u.data.user;members=m.data||[];admin=members.some(x=>x.id===user?.id&&(x.role==='admin'||x.role==='moderator'||x.can_moderate===true));
 setCatalogue(c);
 matches=ms.data||[];armies=as.data||[];items=cs.data||[];votes=vs.data||[];indexRows();render();
 return true;
}
async function reloadVotes(){const {data,error}=await db.from('bet_votes').select('*');if(error)throw error;votes=data||[];indexRows();render()}

const canonicalCardName=name=>name==='10th Regiment of Footh'?'10th Regiment of Foot':name;
const isDeltaBuild=()=>$('bet-scoring-format').value==='delta';
const cardOptions=()=>cards.map((c,i)=>'<option value="'+i+'">'+esc(c.name)+(isDeltaBuild()?'':' ('+c.points+' pts)')+'</option>').join('');
function buildRender(){
 const sorted=cards.map((card,index)=>({card,index})).sort((a,b)=>a.card.name.localeCompare(b.card.name,'fr',{sensitivity:'base'}));
 $('bet-build').innerHTML=build.map((a,i)=>'<div class="bet-build-army" style="--army-accent:var(--bet-army-'+(i%6+1)+')"><div class="bet-army-heading"><h4>Armée '+(i+1)+'</h4><button data-remove-army="'+i+'">Supprimer l’armée</button></div><label class="bet-army-name-row">Nom de l’armée <input type="text" maxlength="80" data-army-name="'+i+'" placeholder="Ex. Les Vikings de Tarn" value="'+esc(a.army_name||'')+'"></label><label class="bet-player-row">Joueur <select data-player="'+i+'"><option value="">Non membre du forum</option>'+members.map(m=>'<option value="'+esc(m.id)+'" '+(a.member_id===m.id?'selected':'')+'>'+esc(m.username)+'</option>').join('')+'</select></label>'+a.cards.map((c,j)=>'<div class="bet-build-card"><div class="bet-card-picker"><input type="text" inputmode="search" autocomplete="off" spellcheck="false" data-card-search="'+i+':'+j+'" placeholder="Chercher une figurine (ex. Tarn)" value="'+esc(c.index===null?'':cards[c.index]?.name||'')+'" aria-label="Nom de la figurine"><select size="5" class="bet-card-list" data-card-list="'+i+':'+j+'" aria-label="Choisir une figurine"></select></div><label class="bet-quantity-label">Qté <input type="number" min="1" max="50" value="'+c.quantity+'" data-qty="'+i+':'+j+'"></label><button class="bet-remove-card" data-remove-card="'+i+':'+j+'" title="Retirer cette figurine">×</button></div>').join('')+'<div class="bet-build-footer">'+(isDeltaBuild()?'':'<strong>Total : '+a.cards.reduce((sum,c)=>sum+(c.index===null?0:cards[c.index].points*c.quantity),0)+' points</strong>')+'<button data-add-card="'+i+'">+ Figurine</button></div></div>').join('');
 document.querySelectorAll('[data-army-name]').forEach(e=>e.addEventListener('input',()=>{build[+e.dataset.armyName].army_name=e.value}));
 document.querySelectorAll('[data-player]').forEach(e=>e.onchange=()=>build[+e.dataset.player].member_id=e.value);
 document.querySelectorAll('[data-card-search]').forEach(e=>{
  const [i,j]=e.dataset.cardSearch.split(':').map(Number),list=document.querySelector('[data-card-list="'+i+':'+j+'"]');
  const refresh=()=>{const term=e.value.trim().toLocaleLowerCase('fr');const found=sorted.filter(x=>x.card.name.toLocaleLowerCase('fr').includes(term));list.replaceChildren();for(const x of found){const o=document.createElement('option');o.value=String(x.index);o.textContent=x.card.name+(isDeltaBuild()?'':' ('+x.card.points+' pts)');list.appendChild(o)}if(!found.length){const o=document.createElement('option');o.textContent='Aucune figurine trouvée';o.disabled=true;list.appendChild(o)}list.hidden=false;list.size=4;list.selectedIndex=-1};
  refresh();
  e.addEventListener('focus',refresh);
  e.addEventListener('input',()=>{build[i].cards[j].index=null;refresh();if(!isDeltaBuild())e.closest('.bet-build-army').querySelector('.bet-build-footer strong').textContent='Total : '+build[i].cards.reduce((sum,c)=>sum+(c.index===null?0:cards[c.index].points*c.quantity),0)+' points'});
  list.addEventListener('change',()=>{if(!list.value||list.selectedOptions[0]?.disabled)return;build[i].cards[j].index=Number(list.value);buildRender()});
  e.addEventListener('keydown',event=>{if(event.key==='Escape')e.blur();if(event.key==='Enter'&&!list.hidden){event.preventDefault();const first=[...list.options].find(x=>!x.disabled);if(first){build[i].cards[j].index=Number(first.value);buildRender()}}});
 });
 document.querySelectorAll('[data-qty]').forEach(e=>e.onchange=()=>{const [i,j]=e.dataset.qty.split(':').map(Number);build[i].cards[j].quantity=Math.max(1,Math.min(50,+e.value||1));buildRender()});
 document.querySelectorAll('[data-add-card]').forEach(e=>e.onclick=()=>{build[+e.dataset.addCard].cards.push({index:null,quantity:1});buildRender();document.querySelector('[data-card-search="'+e.dataset.addCard+':'+(build[+e.dataset.addCard].cards.length-1)+'"]')?.focus()});
 document.querySelectorAll('[data-remove-card]').forEach(e=>e.onclick=()=>{const [i,j]=e.dataset.removeCard.split(':').map(Number);build[i].cards.splice(j,1);buildRender()});
 document.querySelectorAll('[data-remove-army]').forEach(e=>e.onclick=()=>{if(build.length<=2)return;build.splice(+e.dataset.removeArmy,1);$('bet-format-choice').value='custom';$('bet-custom-format-row').hidden=false;$('bet-format').value=Array(build.length).fill('1').join('vs');buildRender()});
}
function renderMapPhotos(){
 $('bet-photo-preview').innerHTML=mapPhotos.map((p,i)=>'<div class="bet-photo-thumb"><img src="'+esc(p.url)+'" alt="Photo de la map"><button type="button" data-remove-photo="'+i+'" aria-label="Retirer cette photo">×</button></div>').join('');
 document.querySelectorAll('[data-remove-photo]').forEach(b=>b.onclick=()=>{mapPhotos.splice(+b.dataset.removePhoto,1);renderMapPhotos()});
}
$('bet-upload-photo').onclick=()=>{if(!photoUploading&&mapPhotos.length<8)$('bet-photo-file').click();else if(mapPhotos.length>=8)msg('Maximum de 8 photos par partie.')};
$('bet-photo-file').addEventListener('change',async event=>{
 const file=event.target.files?.[0];event.target.value='';if(!file)return;
 if(!user){msg('Connecte-toi pour ajouter une photo.');return}
 if(mapPhotos.length>=8){msg('Maximum de 8 photos par partie.');return}
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){msg('Choisis une image JPG, PNG ou WebP de moins de 8 Mo.');return}
 photoUploading=true;$('bet-upload-photo').disabled=true;msg('Préparation de la photo…');
 try{
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.78));
  if(!blob||blob.size>2*1024*1024)throw Error('Image trop volumineuse après compression.');
  const path=user.id+'/'+crypto.randomUUID()+'.webp';
  msg('Envoi de la photo…');
  const {error}=await db.storage.from('forum-images').upload(path,blob,{contentType:'image/webp',upsert:false});
  if(error)throw error;
  const url=db.storage.from('forum-images').getPublicUrl(path).data.publicUrl;
  mapPhotos.push({url,path});renderMapPhotos();msg('Photo ajoutée. Tu peux en ajouter une autre.');
 }catch(error){msg('Envoi impossible : '+error.message)}
 finally{photoUploading=false;$('bet-upload-photo').disabled=false}
});
const emptyArmy=()=>({member_id:'',army_name:'',cards:[{index:null,quantity:1}]});
const formatCounts=value=>{if(!/^[0-9]+(vs[0-9]+)+$/i.test(value))return null;const counts=value.toLowerCase().split('vs').map(Number);const total=counts.reduce((a,b)=>a+b,0);return counts.every(n=>n>=1)&&total>=2&&total<=20?counts:null};
const applyFormat=(value,resize=true)=>{const counts=formatCounts(value);if(!counts){msg('Format invalide : utilise par exemple 1vs1, 2vs2 ou 2vs3 (20 armées maximum).');return false}
 $('bet-format').value=counts.join('vs');if(resize){const total=counts.reduce((a,b)=>a+b,0);while(build.length<total)build.push(emptyArmy());if(build.length>total)build.length=total;buildRender()}msg('');return true};
$('bet-format-choice').onchange=()=>{const custom=$('bet-format-choice').value==='custom';$('bet-custom-format-row').hidden=!custom;if(custom){$('bet-format').focus();return}applyFormat($('bet-format-choice').value)};
$('bet-format').addEventListener('input',()=>{if($('bet-format-choice').value==='custom'&&formatCounts($('bet-format').value))applyFormat($('bet-format').value)});
$('bet-format').addEventListener('change',()=>{if($('bet-format-choice').value==='custom')applyFormat($('bet-format').value)});
$('bet-add').onclick=async()=>{if(!user){msg('Connecte-toi pour créer une partie.');return}try{await refreshCards()}catch(e){msg('Catalogue non actualisé : '+e.message);return}$('bet-form').hidden=false;$('bet-title').value='';$('bet-title').focus();mapPhotos=[];renderMapPhotos();build=[emptyArmy(),emptyArmy()];$('bet-format-choice').value='1vs1';$('bet-custom-format-row').hidden=true;applyFormat('1vs1')};
$('bet-cancel-form').onclick=()=>$('bet-form').hidden=true;
$('bet-army-add').onclick=()=>{if(build.length>=20)return;build.push(emptyArmy());const format=Array(build.length).fill('1').join('vs');$('bet-format-choice').value='custom';$('bet-custom-format-row').hidden=false;$('bet-format').value=format;buildRender()};
$('bet-save').onclick=async()=>{try{
  await refreshCards();
 const format=$('bet-format').value.trim(),title=$('bet-title').value.trim(),photos=mapPhotos.map(p=>p.url);if(title.length<3||title.length>120){$('bet-title').focus();throw Error('Donne un titre à la partie (3 à 120 caractères).')}if(photoUploading)throw Error('Attends la fin de l’envoi de la photo.');
 if(!/^\d+(vs\d+)+$/i.test(format))throw Error('Format attendu : 1vs1, 2vs2, 1vs1vs1…');
 const counts=format.toLowerCase().split('vs').map(Number);if(counts.some(x=>x<1)||counts.reduce((a,b)=>a+b,0)!==build.length)throw Error('Le format doit correspondre au nombre d’armées.');
 if(build.length<2||build.some(a=>!a.cards.length||a.cards.some(c=>c.index===null)))throw Error('Sélectionne une figurine valide dans chaque ligne de chaque armée.');
 if(photos.some(x=>!/^https:\/\//i.test(x)))throw Error('Les photos doivent avoir une URL HTTPS.');

 await call('bet_create_with_title',{p_title:title,p_scoring_format:$('bet-scoring-format').value,p_format:format,p_map:$('bet-map').value,p_photos:photos,p_armies:build.map(a=>({member_id:a.member_id,army_name:(a.army_name||'').trim(),cards:a.cards.map(c=>({name:cards[c.index].name,catalog_id:cards[c.index].catalog_id,points:isDeltaBuild()?0:cards[c.index].points,quantity:c.quantity}))}))});
 $('bet-form').hidden=true;mapPhotos=[];renderMapPhotos();msg('Partie créée.');openPage=0;window.scrollTo({top:0,behavior:'smooth'});await load();
 }catch(e){msg(e.message);window.scrollTo({top:0,behavior:'smooth'})}};
$('bet-scoring-format').addEventListener('change',()=>{$('bet-scoring-hint').textContent=isDeltaBuild()?'Point Delta : les coûts des figurines et le total des armées ne sont pas affichés.':'Standard : coûts et totaux des armées affichés.';buildRender()});
const pointsOf=a=>byArmy(a.id).reduce((s,c)=>s+c.points*c.quantity,0);
const armyVoteLabel=a=>'Armée '+a.position+(a.army_name?' : '+a.army_name:'');
const matchHTML=(m)=>{const aa=byMatch(m.id),vv=voteFor(m.id),mine=vv.find(v=>v.user_id===user?.id),participant=aa.some(a=>a.member_id===user?.id),winner=aa.filter(a=>a.is_winner),maxVote=Math.floor(aa.length/2),score=m.status==='finished';
 const armyHTML=aa.map((a,i)=>'<div class="bet-army"><h4>Armée '+a.position+'</h4>'+(a.army_name?'<p class="bet-army-custom-name">'+esc(a.army_name)+'</p>':'')+'<p class="bet-played-by"><span>Joué par</span> <strong>'+esc(a.player_name)+'</strong></p><ul>'+byArmy(a.id).map(c=>'<li>'+esc(c.card_name)+(c.quantity>1?' ×'+c.quantity:'')+(score?' — '+cardScore(c.card_name,m.scoring_format||'standard',c.catalog_id):'')+'</li>').join('')+'</ul>'+(m.scoring_format==='delta'?'':'<p>'+pointsOf(a)+' points</p>')+(score?'<p class="bet-result">'+(m.is_draw?'Égalité':a.is_winner?'Vainqueur':'Vaincu')+'</p>':'')+'</div>').join('<div class="bet-vs" aria-label="contre"><span>VS</span></div>');
 const counts=aa.map(a=>({army:a,count:vv.filter(v=>v.army_ids.includes(a.id)).length})),totalChoices=counts.reduce((n,x)=>n+x.count,0);
 const voteSummary='<section class="bet-voting'+(score?' bet-voting-finished':'')+'"><div class="bet-vote-heading"><div><h4>🗳️ Les paris</h4><span class="bet-vote-subtitle">'+(score?'Résultats des pronostics':'Choisissez votre pronostic')+'</span></div><div class="bet-vote-total"><strong>'+vv.length+'</strong><span>vote'+(vv.length>1?'s':'')+' au total</span></div></div>'+(score?'':'<div class="bet-vote-switch"><button type="button" class="bet-vote-tab active" data-vote-view="choose" data-vote-match="'+m.id+'">Voter</button><button type="button" class="bet-vote-tab" data-vote-view="results" data-vote-match="'+m.id+'">Voir les votes</button></div><div class="bet-vote-panel" data-vote-panel="choose" data-vote-match="'+m.id+'">')+''+(score?'':user&&!participant?'<p class="bet-vote-help">Sélectionnez jusqu’à '+maxVote+' armée'+(maxVote>1?'s':'')+'. Vous pouvez modifier ou retirer votre vote.</p><div class="bet-vote-choices">'+aa.map(a=>'<label class="bet-vote-tile"><input type="checkbox" data-vote="'+m.id+'" value="'+a.id+'" '+(mine?.army_ids.includes(a.id)?'checked':'')+'><span class="bet-vote-tile-text"><strong>Armée '+a.position+'</strong>'+(a.army_name?'<em class="bet-vote-army-name">'+esc(a.army_name)+'</em>':'')+'<small>'+esc(a.player_name)+'</small></span><span class="bet-vote-tick">✓</span></label>').join('')+'</div><div class="bet-vote-buttons"><button data-save-vote="'+m.id+'">Enregistrer mon vote</button><button data-clear-vote="'+m.id+'">Retirer mon vote</button></div>':'<p class="bet-vote-help">'+(participant?'Vous participez à cette partie : vous ne pouvez pas voter.':'Connectez-vous pour participer aux votes.')+'</p>')+(score?'':'</div>')+'<div class="bet-vote-panel" data-vote-panel="results" data-vote-match="'+m.id+'"'+(score?'':' hidden')+'><p class="bet-vote-help">Répartition des '+totalChoices+' choix exprimés par '+vv.length+' membre'+(vv.length>1?'s':'')+'.</p><div class="bet-vote-bars">'+counts.map(x=>'<div class="bet-vote-bar-row"><div class="bet-vote-bar-label"><strong>'+esc(armyVoteLabel(x.army))+'</strong><span>'+x.count+' vote'+(x.count>1?'s':'')+' · '+(totalChoices?Math.round(100*x.count/totalChoices):0)+' %</span></div><div class="bet-vote-track" role="meter" aria-label="Votes pour l’armée '+x.army.position+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+(totalChoices?Math.round(100*x.count/totalChoices):0)+'"><div class="bet-vote-fill" style="width:'+(totalChoices?100*x.count/totalChoices:0)+'%"></div></div></div>').join('')+'</div><details class="bet-voter-list" '+(score?'open':'')+'><summary>Votes des membres</summary><div>'+ (vv.length?vv.map(v=>{const ok=!m.is_draw&&v.army_ids.length>0&&v.army_ids.every(id=>winner.some(a=>a.id===id));return '<p><strong>'+esc(names().get(v.user_id)||'Membre supprimé')+'</strong> : '+v.army_ids.map(id=>{const a=aa.find(a=>a.id===id);return a?esc(armyVoteLabel(a)):'Armée ?'}).join(', ')+(score?' — '+(ok?'✓ Réussi':'✗ Raté'):'')+'</p>'}).join(''):'Aucun vote pour le moment.')+'</div></details></div></section>';
 return '<article class="card" id="match-'+m.id+'"><h3>'+'Partie #'+visibleMatchNumber(m.id)+' — '+esc(m.title||'Partie historique #'+visibleMatchNumber(m.id))+' <span class="bet-scoring-tag">'+(m.scoring_format==='delta'?'Point Delta':'Standard')+'</span></h3><p class="bet-meta">Format : '+esc(m.format)+' · Publiée le '+new Date(m.created_at).toLocaleString('fr-FR')+' par '+esc(names().get(m.creator_id)||'Membre supprimé')+'</p><div class="bet-armies">'+armyHTML+'</div>'+((m.map_description?.trim()||m.map_photos?.length)?'<h4 class="bet-map-info-title">🗺️ Infos sur la map</h4>':'')+(m.map_description?.trim()?'<p class="bet-map-description">'+esc(m.map_description)+'</p>':'')+(m.map_photos?.length?'<div class="bet-map-images">'+m.map_photos.filter(x=>/^https:\/\//.test(x)).map(x=>'<a href="'+esc(x)+'" target="_blank" rel="noopener"><img src="'+esc(x)+'" alt="Photo de la map" loading="lazy"></a>').join('')+'</div>':'')+voteSummary+'<div class="bet-actions">'+(!score&&(m.creator_id===user?.id||admin)?'<button type="button" data-edit-map="'+m.id+'">🗺️ Modifier la map</button>':'')+(!score&&m.creator_id===user?.id?'<button data-finish="'+m.id+'">Mettre fin à la partie</button><button data-delete="'+m.id+'">Annuler la partie</button>':'')+(admin&&(score||m.creator_id!==user?.id)?'<button data-delete="'+m.id+'">Supprimer (modération)</button>':'')+'</div><div class="bet-comments-wrap" style="margin-top:12px"><button type="button" data-comments-toggle="'+m.id+'">💬 Commentaires</button><section data-comments-panel="'+m.id+'" hidden style="margin-top:12px;padding:12px;border:1px solid #777;border-radius:9px"></section></div><div data-map-editor="'+m.id+'" hidden></div><div data-finish-editor="'+m.id+'" hidden></div></article>'};
function editMap(id){
 const m=matches.find(x=>x.id===id);
 if(!m||m.status!=='open'||!(m.creator_id===user?.id||admin))return;
 const host=document.querySelector('[data-map-editor="'+id+'"]');
 if(!host)return;
 host.hidden=false;
 let photos=[...(m.map_photos||[])];
 host.innerHTML='<div class="bet-finish-box"><h4>🗺️ Modifier les informations de la map</h4><label>Description de la map<textarea data-map-text rows="4" maxlength="3000" style="display:block;width:100%;box-sizing:border-box;margin:8px 0;padding:10px;border-radius:7px"></textarea></label><div data-map-images></div><label>Ajouter une photo (JPG, PNG ou WebP, 8 Mo maximum)<input data-map-file type="file" accept="image/jpeg,image/png,image/webp"></label><p data-map-feedback role="status"></p><button type="button" data-map-save>Enregistrer la map</button> <button type="button" data-map-cancel>Annuler</button></div>';
 const input=host.querySelector('[data-map-text]'),feedback=host.querySelector('[data-map-feedback]'),fileInput=host.querySelector('[data-map-file]'),save=host.querySelector('[data-map-save]');
 input.value=m.map_description||'';
 const draw=()=>{host.querySelector('[data-map-images]').innerHTML=photos.map((url,i)=>'<div class="bet-photo-thumb"><img src="'+esc(url)+'" alt="Photo de la map"><button type="button" data-map-remove="'+i+'" aria-label="Retirer cette photo">×</button></div>').join('');host.querySelectorAll('[data-map-remove]').forEach(b=>b.onclick=()=>{photos.splice(Number(b.dataset.mapRemove),1);draw()})};
 draw();
 host.querySelector('[data-map-cancel]').onclick=()=>{host.hidden=true;host.innerHTML=''};
 fileInput.onchange=async()=>{
  const file=fileInput.files?.[0];fileInput.value='';if(!file)return;
  if(photos.length>=8){feedback.textContent='Maximum de 8 photos.';return}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){feedback.textContent='Image invalide ou supérieure à 8 Mo.';return}
  save.disabled=true;fileInput.disabled=true;feedback.textContent='Envoi de la photo…';
  try{
   const bitmap=await createImageBitmap(file),scale=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.78));
   if(!blob||blob.size>2*1024*1024)throw Error('Image trop volumineuse après compression.');
   const path=user.id+'/'+crypto.randomUUID()+'.webp';
   const {error}=await db.storage.from('forum-images').upload(path,blob,{contentType:'image/webp',upsert:false});
   if(error)throw error;
   photos.push(db.storage.from('forum-images').getPublicUrl(path).data.publicUrl);draw();feedback.textContent='Photo ajoutée. Enregistre pour confirmer les modifications.';
  }catch(e){feedback.textContent='Envoi impossible : '+e.message}
  finally{save.disabled=false;fileInput.disabled=false}
 };
 save.onclick=async()=>{
  save.disabled=true;feedback.textContent='Enregistrement…';
  try{await call('bet_update_map',{p_match:id,p_map:input.value.trim(),p_photos:photos});msg('Informations de la map mises à jour.');await load()}
  catch(e){feedback.textContent='Enregistrement impossible : '+e.message;save.disabled=false}
 };
}
function finishEditor(id){
 const m=matches.find(x=>x.id===id),aa=byMatch(id);if(!m)return;
 const host=document.querySelector('[data-finish-editor="'+id+'"]');if(!host)return;
 host.hidden=false;
 host.innerHTML='<div class="bet-finish-box"><h4>🏆 Résultat de la partie</h4><p>Choisissez le résultat de chaque armée. Les autres résultats s’adaptent automatiquement.</p><div class="bet-finish-options">'+aa.map(a=>'<div class="bet-finish-army"><strong>'+esc(a.army_name||'Armée '+a.position)+'</strong><small>Joué par '+esc(a.player_name||'Non membre du forum')+'</small><div class="bet-finish-choice" data-result-army="'+a.id+'"><button type="button" data-result="win">🏆 Victoire</button><button type="button" data-result="loss">Défaite</button><button type="button" data-result="draw">Égalité</button></div></div>').join('')+'</div><div class="bet-finish-buttons"><button type="button" data-confirm-finish="'+id+'" disabled>Confirmer le résultat</button><button type="button" data-cancel-finish="'+id+'">Annuler</button></div></div>';
 const results=new Map;
 const redraw=()=>{host.querySelectorAll('[data-result-army]').forEach(el=>{const state=results.get(+el.dataset.resultArmy);el.querySelectorAll('[data-result]').forEach(b=>{b.classList.toggle('selected',b.dataset.result===state);b.setAttribute('aria-pressed',String(b.dataset.result===state))})});host.querySelector('[data-confirm-finish]').disabled=results.size!==aa.length};
 host.querySelectorAll('[data-result-army] button').forEach(b=>b.onclick=()=>{
  const idArmy=+b.closest('[data-result-army]').dataset.resultArmy,value=b.dataset.result;
  if(value==='draw'){aa.forEach(a=>results.set(a.id,'draw'))}
  else if(aa.length===2){results.set(idArmy,value);results.set(aa.find(a=>a.id!==idArmy).id,value==='win'?'loss':'win')}
  else {results.set(idArmy,value);if([...results.values()].includes('draw'))results.forEach((v,k)=>{if(v==='draw')results.delete(k)})}
  redraw();
 });
 host.querySelector('[data-cancel-finish]').onclick=()=>{host.hidden=true;host.innerHTML=''};
 host.querySelector('[data-confirm-finish]').onclick=async()=>{
  if(results.size!==aa.length)return;
  const values=[...results.values()],draw=values.every(x=>x==='draw');
  if(!draw&&(values.includes('draw')||!values.includes('win')||!values.includes('loss'))){msg('Sélectionne au moins une victoire et une défaite, ou une égalité générale.');return}
  if(!confirm('Confirmer le résultat définitif de la partie ?'))return;
  const button=host.querySelector('[data-confirm-finish]');button.disabled=true;
  try{await call('bet_finish',{p_match:id,p_winners:draw?[]:aa.filter(a=>results.get(a.id)==='win').map(a=>a.id),p_draw:draw});msg('Partie terminée et statistiques actualisées.');window.scrollTo({top:0,behavior:'smooth'});await load()}
  catch(e){msg(e.message);button.disabled=false}
 };
 redraw();
}
function cardScores(scoringFormat='all'){
 const map=new Map();
 for(const m of matches.filter(x=>x.status==='finished'&&(scoringFormat==='all'||(x.scoring_format||'standard')===scoringFormat)))
  for(const a of byMatch(m.id))for(const c of byArmy(a.id)){
   const id=c.catalog_id||'base:'+canonicalCardName(c.card_name);
   const x=map.get(id)||{name:canonicalCardName(c.card_name),wins:0,draws:0,losses:0};
   if(m.is_draw)x.draws++;else if(a.is_winner)x.wins++;else x.losses++;
   map.set(id,x);
  }
 const known=new Set();
 const output=catalogueAll.map(c=>{
  const id=c.catalog_id;known.add(id);
  const x=map.get(id)||{wins:0,draws:0,losses:0};
  const total=x.wins+x.draws+x.losses;
  return {...x,name:c.name,catalog_id:id,is_hidden:!!c.is_hidden,total,rate:total?100*x.wins/total:0};
 }).filter(x=>!x.is_hidden||x.total>0);
 for(const [id,x] of map)if(!known.has(id)){
  const total=x.wins+x.draws+x.losses;
  output.push({...x,catalog_id:id,is_hidden:true,total,rate:total?100*x.wins/total:0});
 }
 return output;
}
function cardScore(name,scoringFormat='all',catalogId=null){
 const id=catalogId||'base:'+canonicalCardName(name);
 const s=cardScores(scoringFormat).find(x=>x.catalog_id===id);
 return s?s.wins+'-'+s.draws+'-'+s.losses+' ('+s.rate.toFixed(1)+' %)':'0-0-0';
}
function memberScores(scoringFormat='all'){const map=new Map;for(const m of matches.filter(x=>x.status==='finished'&&(scoringFormat==='all'||(x.scoring_format||'standard')===scoringFormat))){const aa=byMatch(m.id);if(aa.length!==2||!/^1\s*vs\s*1$/i.test(String(m.format||'').trim()))continue;const wins=aa.filter(a=>a.is_winner).map(a=>a.id),pts=1;for(const v of voteFor(m.id)){const x=map.get(v.user_id)||{id:v.user_id,good:0,bad:0,points:0};const good=!m.is_draw&&v.army_ids.length>0&&v.army_ids.every(id=>wins.includes(id));if(good){x.good++;x.points+=pts}else x.bad++;map.set(v.user_id,x)}}return [...map.values()].map(x=>({...x,rate:100*x.good/(x.good+x.bad)}))}
function playedMemberScores(scoringFormat='all'){
 const map=new Map();
 for(const m of matches.filter(x=>x.status==='finished'&&(scoringFormat==='all'||(x.scoring_format||'standard')===scoringFormat))){
  const participants=byMatch(m.id).filter(a=>a.member_id);
  const seen=new Set();
  for(const a of participants){
   if(seen.has(a.member_id))continue;
   seen.add(a.member_id);
   const x=map.get(a.member_id)||{id:a.member_id,wins:0,draws:0,losses:0,total:0};
   if(m.is_draw)x.draws++;
   else if(a.is_winner)x.wins++;
   else x.losses++;
   x.total++;
   map.set(a.member_id,x);
  }
 }
 return [...map.values()].map(x=>({...x,rate:x.total?100*x.wins/x.total:0}));
}
function pages(el,page,total,callback){$(el).innerHTML='<div class="bet-pagination"><button '+(page?'':'disabled')+' data-prev>← Précédent</button> Page '+(page+1)+' / '+Math.max(1,Math.ceil(total))+' <button '+((page+1)*1<total?'':'disabled')+' data-next>Suivant →</button></div>';$(el).querySelector('[data-prev]').onclick=()=>callback(page-1);$(el).querySelector('[data-next]').onclick=()=>callback(page+1)}
function render(){if(!cards.length)return;
 commentsOpen.clear();

 const chronological=(a,b)=>new Date(a.created_at)-new Date(b.created_at)||a.id-b.id;
 if(tab==='encours'){
 const open=matches.filter(m=>m.status==='open').sort(chronological);
 openPage=Math.min(openPage,Math.max(0,Math.ceil(open.length/4)-1));
 $('bet-open-list').innerHTML=open.slice().reverse().slice(openPage*4,(openPage+1)*4).map(m=>matchHTML(m)).join('')||'<p>Aucune partie en cours.</p>';
 pages('bet-open-pagination',openPage,open.length/4,p=>{openPage=p;render()});
 }
 if(tab==='terminees'){
 const finished=matches.filter(m=>m.status==='finished').sort(chronological);
 finishedPage=Math.min(finishedPage,Math.max(0,Math.ceil(finished.length/4)-1));
 $('bet-finished-list').innerHTML=finished.slice().reverse().slice(finishedPage*4,(finishedPage+1)*4).map(m=>matchHTML(m)).join('')||'<p>Aucune partie terminée.</p>';
 pages('bet-finished-pagination',finishedPage,finished.length/4,p=>{finishedPage=p;render()});
 }
 if(tab==='participants'||tab==='cartes'){
 const playedMode=$('bet-member-mode').value==='played';
 let ms=tab==='participants'?(playedMode?playedMemberScores($('bet-member-scoring-format').value):memberScores($('bet-member-scoring-format').value)):[],sort=$('bet-member-sort').value,dir=$('bet-member-direction').value==='asc'?1:-1;
 if(tab==='participants'){
  const sortOptions=playedMode?[['rate','Pourcentage de victoires'],['total','Parties jouées'],['wins','Victoires'],['draws','Égalités'],['losses','Défaites']]:[['rate','Pourcentage de réussite'],['points','Points'],['good','Paris justes'],['bad','Paris ratés']];
  const sel=$('bet-member-sort'),current=sel.value;
  sel.innerHTML=sortOptions.map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('');
  sel.value=sortOptions.some(x=>x[0]===current)?current:'rate';
  sort=sel.value;
 }
 ms.sort((a,b)=>dir*(a[sort]-b[sort])||String(a.id).localeCompare(String(b.id)));
 memberPage=Math.min(memberPage,Math.max(0,Math.ceil(ms.length/20)-1));

 const statTiles=(rows,kind)=>'<div class="bet-stats-summary">'+(kind==='cards'?'<button type="button" class="bet-summary-filter'+(!playedCardsOnly?' active':'')+'" data-card-filter="all" aria-pressed="'+(!playedCardsOnly)+'"><small>Cartes disponibles</small><strong>'+rows.length+'</strong></button><button type="button" class="bet-summary-filter'+(playedCardsOnly?' active':'')+'" data-card-filter="played" aria-pressed="'+playedCardsOnly+'"><small>Cartes jouées</small><strong>'+rows.filter(x=>x.total>0).length+'</strong></button>' :playedMode?'<div><small>Joueurs</small><strong>'+rows.length+'</strong></div><div><small>Parties disputées</small><strong>'+rows.reduce((n,x)=>n+x.total,0)+'</strong></div><div><small>Victoires</small><strong>'+rows.reduce((n,x)=>n+x.wins,0)+'</strong></div>':'<div><small>Pronostiqueurs</small><strong>'+rows.length+'</strong></div><div><small>Paris réalisés</small><strong>'+rows.reduce((n,x)=>n+x.good+x.bad,0)+'</strong></div><div><small>Pronostics réussis</small><strong>'+rows.reduce((n,x)=>n+x.good,0)+'</strong></div>')+'</div>';
 const bar=(w,d,l)=>{const n=w+d+l;return '<div class="bet-result-track" aria-label="Victoires, égalités et défaites"><span style="width:'+(n?100*w/n:0)+'%;background:#4fba80"></span><span style="width:'+(n?100*d/n:0)+'%;background:#e2b54a"></span><span style="width:'+(n?100*l/n:0)+'%;background:#d46a6a"></span></div>'};
 if(tab==='participants'){
  $('bet-member-stats').innerHTML=statTiles(ms,'members')+'<div class="bet-stats-grid">'+ms.slice(memberPage*20,(memberPage+1)*20).map(x=>playedMode?
   '<article class="bet-stat-tile"><div class="bet-stat-title"><span class="bet-stat-symbol">🏆</span><strong>'+esc(names().get(x.id)||'Membre supprimé')+'</strong><b>'+x.total+' partie'+(x.total>1?'s':'')+'</b></div><div class="bet-stat-big">'+x.rate.toFixed(1)+' % <small>de victoires</small></div>'+bar(x.wins,x.draws,x.losses)+'<div class="bet-stat-details"><span>✓ '+x.wins+' victoire'+(x.wins>1?'s':'')+'</span><span>＝ '+x.draws+' égalité'+(x.draws>1?'s':'')+'</span><span>✕ '+x.losses+' défaite'+(x.losses>1?'s':'')+'</span></div></article>':
   '<article class="bet-stat-tile"><div class="bet-stat-title"><span class="bet-stat-symbol">🎯</span><strong>'+esc(names().get(x.id)||'Membre supprimé')+'</strong><b>'+x.points+' pts</b></div><div class="bet-stat-big">'+x.rate.toFixed(1)+' % <small>de paris réussis</small></div>'+bar(x.good,0,x.bad)+'<div class="bet-stat-details"><span>✓ '+x.good+' justes</span><span>✕ '+x.bad+' ratés</span></div></article>').join('')+'</div>';
  pages('bet-member-pagination',memberPage,ms.length/20,p=>{memberPage=p;render()});
 }

 if(tab==='cartes'){
 let cs=cardScores($('bet-card-scoring-format').value),term=$('bet-card-search').value.trim().toLowerCase();cs=cs.filter(x=>(!playedCardsOnly||x.total>0)&&x.name.toLowerCase().includes(term));sort=$('bet-card-sort').value;dir=$('bet-card-direction').value==='asc'?1:-1;cs.sort((a,b)=>dir*(a[sort]-b[sort])||a.name.localeCompare(b.name,'fr'));cardPage=Math.min(cardPage,Math.max(0,Math.ceil(cs.length/50)-1));
 $('bet-card-stats').innerHTML=statTiles(cardScores($('bet-card-scoring-format').value),'cards')+'<p class="bet-stats-count">'+cs.length+' carte(s) trouvée(s)</p><div class="bet-stats-grid">'+cs.slice(cardPage*50,(cardPage+1)*50).map(x=>'<article class="bet-stat-tile"><div class="bet-stat-title"><span class="bet-stat-symbol">⚔️</span>'+(x.is_hidden?'<span>'+esc(x.name)+'</span>':'<a href="cartes-armee.html?carte='+encodeURIComponent(x.name)+'">'+esc(x.name)+'</a>')+'</div>'+(x.total?'<div class="bet-stat-big">'+x.rate.toFixed(1)+' % <small>de victoires</small></div>':'<div class="bet-stat-unused">Jamais jouée</div>')+bar(x.wins,x.draws,x.losses)+'<div class="bet-stat-details"><span>🟢 '+x.wins+' V</span><span>🟡 '+x.draws+' N</span><span>🔴 '+x.losses+' D</span></div></article>').join('')+'</div>';pages('bet-card-pagination',cardPage,cs.length/50,p=>{cardPage=p;render()});
 }
 }
 $('bet-card-scoring-format').onchange=()=>{cardPage=0;render()};
 $('bet-member-scoring-format').onchange=()=>{memberPage=0;render()};
 document.querySelectorAll('[data-card-filter]').forEach(b=>b.onclick=()=>{const next=b.dataset.cardFilter==='played';if(playedCardsOnly!==next){playedCardsOnly=next;cardPage=0;render()}});
 document.querySelectorAll('[data-vote-view]').forEach(button=>button.onclick=()=>{const match=button.dataset.voteMatch,view=button.dataset.voteView;document.querySelectorAll('[data-vote-view][data-vote-match="'+match+'"]').forEach(b=>b.classList.toggle('active',b.dataset.voteView===view));document.querySelectorAll('[data-vote-panel][data-vote-match="'+match+'"]').forEach(panel=>panel.hidden=panel.dataset.votePanel!==view)});
 document.querySelectorAll('.bet-vote-tile input[data-vote]').forEach(input=>input.addEventListener('change',()=>{if(!input.checked)return;const id=+input.dataset.vote;const limit=Math.floor(byMatch(id).length/2);const selected=[...document.querySelectorAll('.bet-vote-tile input[data-vote="'+id+'"]:checked')];if(selected.length>limit){for(const other of selected){if(other!==input){other.checked=false;if([...document.querySelectorAll('.bet-vote-tile input[data-vote="'+id+'"]:checked')].length<=limit)break}}}}));
 document.querySelectorAll('[data-save-vote]').forEach(b=>b.onclick=async()=>{const id=+b.dataset.saveVote,aa=byMatch(id),chosen=[...document.querySelectorAll('[data-vote="'+id+'"]:checked')].map(x=>+x.value);if(chosen.length>Math.floor(aa.length/2)){msg('Trop de votes sélectionnés.');return}try{await call('bet_cast_vote',{p_match:id,p_armies:chosen});msg('Vote enregistré.');await reloadVotes()}catch(e){msg(e.message)}});
 document.querySelectorAll('[data-clear-vote]').forEach(b=>b.onclick=async()=>{try{await call('bet_cast_vote',{p_match:+b.dataset.clearVote,p_armies:[]});msg('Vote retiré.');await reloadVotes()}catch(e){msg(e.message)}});
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Supprimer définitivement cette partie et ses statistiques ?'))return;try{await call('bet_delete',{p_match:+b.dataset.delete});msg('Partie supprimée.');await load()}catch(e){msg(e.message)}});
 document.querySelectorAll('[data-finish]').forEach(b=>b.onclick=()=>finishEditor(+b.dataset.finish));
 document.querySelectorAll('[data-edit-map]').forEach(b=>b.onclick=()=>editMap(+b.dataset.editMap));
}

// Commentaires courts et paginés, chargés uniquement à l'ouverture d'une partie.
const commentsOpen=new Set(),commentPages=new Map();
async function showComments(id,page=0){
 const panel=document.querySelector('[data-comments-panel="'+id+'"]');
 if(!panel)return;
 panel.hidden=false;commentsOpen.add(id);commentPages.set(id,page);
 panel.textContent='Chargement des commentaires…';
 const {data,error,count}=await db.from('bet_comments').select('id,user_id,body,created_at',{count:'exact'}).eq('match_id',id).order('created_at',{ascending:true}).order('id',{ascending:true}).range(page*10,page*10+9);
 if(error){panel.textContent='Impossible de charger les commentaires : '+error.message;return}
 const total=Math.max(1,Math.ceil((count||0)/10));
 panel.innerHTML='<h4 style="margin:0 0 12px">Commentaires ('+(count||0)+')</h4>'+
 (data.length?data.map(c=>'<div style="padding:9px 0;border-bottom:1px solid #777"><strong>'+esc(names().get(c.user_id)||'Membre supprimé')+'</strong> <small>'+esc(new Date(c.created_at).toLocaleString('fr-FR'))+'</small><p style="white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0">'+esc(c.body)+'</p>'+(admin?'<button type="button" data-comment-delete="'+c.id+'">Supprimer</button>':'')+'</div>').join(''):'<p>Aucun commentaire pour cette partie.</p>')+
 '<div class="bet-pagination" style="margin:12px 0"><button type="button" data-comment-page="'+(page-1)+'" '+(page===0?'disabled':'')+'>← Précédent</button> Page '+(page+1)+' / '+total+' <button type="button" data-comment-page="'+(page+1)+'" '+(page+1>=total?'disabled':'')+'>Suivant →</button></div>'+
 '<form data-comment-form><label for="bet-comment-'+id+'">Ton commentaire</label><textarea id="bet-comment-'+id+'" maxlength="600" rows="3" required style="display:block;width:100%;box-sizing:border-box;margin:8px 0" placeholder="une courte analyse stratégique ou un commentaire pertinent..."></textarea><div style="display:flex;justify-content:space-between;align-items:center"><small data-comment-counter>0 / 600 caractères</small><button type="submit">Publier</button></div><small>3 commentaires maximum par partie sur 24 heures.</small></form>';
 panel.querySelectorAll('[data-comment-page]').forEach(b=>b.onclick=()=>showComments(id,Number(b.dataset.commentPage)));
 const area=panel.querySelector('textarea'),counter=panel.querySelector('[data-comment-counter]');
 area.oninput=()=>{counter.textContent=area.value.length+' / 600 caractères'};
 panel.querySelector('form').onsubmit=async e=>{
  e.preventDefault();const body=area.value.trim();if(!body||body.length>600)return;
  const btn=panel.querySelector('[type="submit"]');btn.disabled=true;
  const {error:saveError}=await db.from('bet_comments').insert({match_id:id,user_id:user.id,body});
  if(saveError){alert('Commentaire non publié : '+saveError.message);btn.disabled=false;return}
  const {count:newCount}=await db.from('bet_comments').select('id',{count:'exact',head:true}).eq('match_id',id);
  await showComments(id,Math.max(0,Math.ceil((newCount||1)/10)-1));
 };
 panel.querySelectorAll('[data-comment-delete]').forEach(b=>b.onclick=async()=>{
  if(!confirm('Supprimer ce commentaire ?'))return;
  const {error:deleteError}=await db.from('bet_comments').delete().eq('id',Number(b.dataset.commentDelete));
  if(deleteError){alert(deleteError.message);return}
  await showComments(id,page);
 });
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-comments-toggle]');if(!b)return;
 const id=Number(b.dataset.commentsToggle),panel=document.querySelector('[data-comments-panel="'+id+'"]');
 if(!panel)return;
 if(!panel.hidden){panel.hidden=true;commentsOpen.delete(id)}
 else void showComments(id,commentPages.get(id)||0);
});

['bet-member-sort','bet-member-direction','bet-card-search','bet-card-sort','bet-card-direction'].forEach(id=>$(id).addEventListener(id==='bet-card-search'?'input':'change',()=>{memberPage=0;cardPage=0;render()}));
// Mises à jour légères : évènements temps réel, retour sur l'onglet et changements locaux.
if(db){
 db.channel('bet-army-card-catalogue').on('postgres_changes',{event:'*',schema:'public',table:'army_card_edits'},()=>{void refreshCards().catch(e=>console.warn('Actualisation des cartes :',e))}).subscribe();
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshCards().catch(e=>console.warn('Actualisation des cartes :',e))});
window.addEventListener('focus',()=>{void refreshCards().catch(e=>console.warn('Actualisation des cartes :',e))});
window.addEventListener('storage',e=>{if(e.key==='heroscape-cards-updated')void refreshCards().catch(err=>console.warn('Actualisation des cartes :',err))});
load().then(allowed=>{
 if(!allowed)return;
 const requested=Number(new URLSearchParams(location.search).get('match'));
 const found=requested?matches.find(m=>m.id===requested):null;
 let selected=['encours','terminees','participants','cartes'].includes(location.hash.slice(1))?location.hash.slice(1):'encours';
 if(found){
  selected=found.status==='finished'?'terminees':'encours';
  const same=matches.filter(m=>m.status===found.status).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||b.id-a.id);
  const page=Math.max(0,Math.floor(same.findIndex(m=>m.id===requested)/4));
  if(selected==='terminees')finishedPage=page;else openPage=page;
 }
 showTab(selected);
 if(found)requestAnimationFrame(()=>document.getElementById('match-'+requested)?.scrollIntoView({block:'start'}));
}).catch(e=>msg('Erreur de chargement : '+e.message));
})();