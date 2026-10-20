(()=>{'use strict';
const db=window.supabaseClient,$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cards=[],members=[],user=null,admin=false,matches=[],armies=[],items=[],votes=[],openPage=0,finishedPage=0,memberPage=0,cardPage=0,playedCardsOnly=false,build=[],tab='encours',mapPhotos=[],photoUploading=false;
const msg=s=>$('bet-status').textContent=s;
const call=async(name,args)=>{const {data,error}=await db.rpc(name,args);if(error)throw error;return data};
const names=()=>new Map(members.map(m=>[m.id,m.username]));
const byMatch=id=>armiesByMatch.get(id)||[];
const byArmy=id=>itemsByArmy.get(id)||[];
const voteFor=id=>votesByMatch.get(id)||[];
const matchPoints=m=>m.format;
let armiesByMatch=new Map(),itemsByArmy=new Map(),votesByMatch=new Map();
const indexRows=()=>{armiesByMatch=new Map();itemsByArmy=new Map();votesByMatch=new Map();for(const a of armies){if(!armiesByMatch.has(a.match_id))armiesByMatch.set(a.match_id,[]);armiesByMatch.get(a.match_id).push(a)}for(const a of armiesByMatch.values())a.sort((x,y)=>x.position-y.position);for(const c of items){if(!itemsByArmy.has(c.army_id))itemsByArmy.set(c.army_id,[]);itemsByArmy.get(c.army_id).push(c)}for(const v of votes){if(!votesByMatch.has(v.match_id))votesByMatch.set(v.match_id,[]);votesByMatch.get(v.match_id).push(v)}};

function showTab(t){tab=t;document.querySelectorAll('.bet-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));document.querySelectorAll('.bet-panel').forEach(p=>p.hidden=p.id!=='bet-'+t);location.hash=t;render()}
document.querySelectorAll('.bet-tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
async function load(){
 const [u,c,m,ms,as,cs,vs]=await Promise.all([user?Promise.resolve({data:{user}}):db.auth.getUser(),cards.length?Promise.resolve(cards):fetch('data/cards.json').then(x=>x.json()),members.length?Promise.resolve({data:members}):db.from('profiles').select('id,username,role'),db.from('bet_matches').select('*').order('created_at',{ascending:false}),db.from('bet_armies').select('*'),db.from('bet_army_cards').select('*'),db.from('bet_votes').select('*')]);
 for(const x of [m,ms,as,cs,vs])if(x.error)throw x.error;
 user=u.data.user;members=m.data||[];admin=members.some(x=>x.id===user?.id&&x.role==='admin');cards=c;matches=ms.data||[];armies=as.data||[];items=cs.data||[];votes=vs.data||[];indexRows();render();
}
async function reloadVotes(){const {data,error}=await db.from('bet_votes').select('*');if(error)throw error;votes=data||[];indexRows();render()}

const canonicalCardName=name=>name==='10th Regiment of Footh'?'10th Regiment of Foot':name;
const cardOptions=()=>cards.map((c,i)=>'<option value="'+i+'">'+esc(c.name)+' ('+c.points+' pts)</option>').join('');
function buildRender(){
 const sorted=cards.map((card,index)=>({card,index})).sort((a,b)=>a.card.name.localeCompare(b.card.name,'fr',{sensitivity:'base'}));
 $('bet-build').innerHTML=build.map((a,i)=>'<div class="bet-build-army" style="--army-accent:var(--bet-army-'+(i%6+1)+')"><div class="bet-army-heading"><h4>Armée '+(i+1)+'</h4><button data-remove-army="'+i+'">Supprimer l’armée</button></div><label class="bet-army-name-row">Nom de l’armée <input type="text" maxlength="80" data-army-name="'+i+'" placeholder="Ex. Les Vikings de Tarn" value="'+esc(a.army_name||'')+'"></label><label class="bet-player-row">Joueur <select data-player="'+i+'"><option value="">Non membre du forum</option>'+members.map(m=>'<option value="'+esc(m.id)+'" '+(a.member_id===m.id?'selected':'')+'>'+esc(m.username)+'</option>').join('')+'</select></label>'+a.cards.map((c,j)=>'<div class="bet-build-card"><div class="bet-card-picker"><input type="text" inputmode="search" autocomplete="off" spellcheck="false" data-card-search="'+i+':'+j+'" placeholder="Chercher une figurine (ex. Tarn)" value="'+esc(c.index===null?'':cards[c.index]?.name||'')+'" aria-label="Nom de la figurine"><select size="5" class="bet-card-list" data-card-list="'+i+':'+j+'" aria-label="Choisir une figurine"></select></div><label class="bet-quantity-label">Qté <input type="number" min="1" max="50" value="'+c.quantity+'" data-qty="'+i+':'+j+'"></label><button class="bet-remove-card" data-remove-card="'+i+':'+j+'" title="Retirer cette figurine">×</button></div>').join('')+'<div class="bet-build-footer"><strong>Total : '+a.cards.reduce((sum,c)=>sum+(c.index===null?0:cards[c.index].points*c.quantity),0)+' points</strong><button data-add-card="'+i+'">+ Figurine</button></div></div>').join('');
 document.querySelectorAll('[data-army-name]').forEach(e=>e.addEventListener('input',()=>{build[+e.dataset.armyName].army_name=e.value}));
 document.querySelectorAll('[data-player]').forEach(e=>e.onchange=()=>build[+e.dataset.player].member_id=e.value);
 document.querySelectorAll('[data-card-search]').forEach(e=>{
  const [i,j]=e.dataset.cardSearch.split(':').map(Number),list=document.querySelector('[data-card-list="'+i+':'+j+'"]');
  const refresh=()=>{const term=e.value.trim().toLocaleLowerCase('fr');const found=sorted.filter(x=>x.card.name.toLocaleLowerCase('fr').includes(term));list.replaceChildren();for(const x of found){const o=document.createElement('option');o.value=String(x.index);o.textContent=x.card.name+' ('+x.card.points+' pts)';list.appendChild(o)}if(!found.length){const o=document.createElement('option');o.textContent='Aucune figurine trouvée';o.disabled=true;list.appendChild(o)}list.hidden=false;list.size=4;list.selectedIndex=-1};
  refresh();
  e.addEventListener('focus',refresh);
  e.addEventListener('input',()=>{build[i].cards[j].index=null;refresh();e.closest('.bet-build-army').querySelector('.bet-build-footer strong').textContent='Total : '+build[i].cards.reduce((sum,c)=>sum+(c.index===null?0:cards[c.index].points*c.quantity),0)+' points'});
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
$('bet-add').onclick=()=>{if(!user){msg('Connecte-toi pour créer une partie.');return}$('bet-form').hidden=false;mapPhotos=[];renderMapPhotos();build=[emptyArmy(),emptyArmy()];$('bet-format-choice').value='1vs1';$('bet-custom-format-row').hidden=true;applyFormat('1vs1')};
$('bet-cancel-form').onclick=()=>$('bet-form').hidden=true;
$('bet-army-add').onclick=()=>{if(build.length>=20)return;build.push(emptyArmy());const format=Array(build.length).fill('1').join('vs');$('bet-format-choice').value='custom';$('bet-custom-format-row').hidden=false;$('bet-format').value=format;buildRender()};
$('bet-save').onclick=async()=>{try{
 const format=$('bet-format').value.trim(),photos=mapPhotos.map(p=>p.url);if(photoUploading)throw Error('Attends la fin de l’envoi de la photo.');
 if(!/^\d+(vs\d+)+$/i.test(format))throw Error('Format attendu : 1vs1, 2vs2, 1vs1vs1…');
 const counts=format.toLowerCase().split('vs').map(Number);if(counts.some(x=>x<1)||counts.reduce((a,b)=>a+b,0)!==build.length)throw Error('Le format doit correspondre au nombre d’armées.');
 if(build.length<2||build.some(a=>!a.cards.length||a.cards.some(c=>c.index===null)))throw Error('Sélectionne une figurine valide dans chaque ligne de chaque armée.');
 if(photos.some(x=>!/^https:\/\//i.test(x)))throw Error('Les photos doivent avoir une URL HTTPS.');
 const chosen=build.map(a=>a.member_id).filter(Boolean);if(new Set(chosen).size!==chosen.length)throw Error('Un membre ne peut contrôler deux armées.');
 await call('bet_create',{p_format:format,p_map:$('bet-map').value,p_photos:photos,p_armies:build.map(a=>({member_id:a.member_id,army_name:(a.army_name||'').trim(),cards:a.cards.map(c=>({name:cards[c.index].name,points:cards[c.index].points,quantity:c.quantity}))}))});
 $('bet-form').hidden=true;mapPhotos=[];renderMapPhotos();msg('Partie créée.');await load();
 }catch(e){msg(e.message)}};
const pointsOf=a=>byArmy(a.id).reduce((s,c)=>s+c.points*c.quantity,0);
const matchHTML=(m,openNumber=null)=>{const aa=byMatch(m.id),vv=voteFor(m.id),mine=vv.find(v=>v.user_id===user?.id),participant=aa.some(a=>a.member_id===user?.id),winner=aa.filter(a=>a.is_winner),maxVote=Math.floor(aa.length/2),score=m.status==='finished';
 const armyHTML=aa.map((a,i)=>'<div class="bet-army"><h4>Armée '+a.position+'</h4>'+(a.army_name?'<p class="bet-army-custom-name">'+esc(a.army_name)+'</p>':'')+'<p class="bet-played-by"><span>Joué par</span> <strong>'+esc(a.player_name)+'</strong></p><ul>'+byArmy(a.id).map(c=>'<li>'+esc(c.card_name)+(c.quantity>1?' ×'+c.quantity:'')+(score?' — '+cardScore(c.card_name):'')+'</li>').join('')+'</ul><p>'+pointsOf(a)+' points</p>'+(score?'<p class="bet-result">'+(m.is_draw?'Égalité':a.is_winner?'Vainqueur':'Vaincu')+'</p>':'')+'</div>').join('<div class="bet-vs" aria-label="contre"><span>VS</span></div>');
 const counts=aa.map(a=>({army:a,count:vv.filter(v=>v.army_ids.includes(a.id)).length})),totalChoices=counts.reduce((n,x)=>n+x.count,0);
 const voteSummary='<section class="bet-voting"><div class="bet-vote-heading"><div><h4>🗳️ Les paris</h4><span class="bet-vote-subtitle">'+(score?'Résultats des pronostics':'Choisissez votre pronostic')+'</span></div><div class="bet-vote-total"><strong>'+vv.length+'</strong><span>vote'+(vv.length>1?'s':'')+' au total</span></div></div>'+(score?'<h4 class="bet-finished-votes-title">Votes</h4>':'<div class="bet-vote-switch"><button type="button" class="bet-vote-tab active" data-vote-view="choose" data-vote-match="'+m.id+'">Voter</button><button type="button" class="bet-vote-tab" data-vote-view="results" data-vote-match="'+m.id+'">Voir les votes</button></div><div class="bet-vote-panel" data-vote-panel="choose" data-vote-match="'+m.id+'">')+''+(score?'<div class="bet-vote-result-banner">'+(m.is_draw?'Partie terminée : égalité':'Partie terminée : '+winner.map(a=>'Armée '+a.position).join(', '))+'</div>':user&&!participant?'<p class="bet-vote-help">Sélectionnez jusqu’à '+maxVote+' armée'+(maxVote>1?'s':'')+'. Vous pouvez modifier ou retirer votre vote.</p><div class="bet-vote-choices">'+aa.map(a=>'<label class="bet-vote-tile"><input type="checkbox" data-vote="'+m.id+'" value="'+a.id+'" '+(mine?.army_ids.includes(a.id)?'checked':'')+'><span class="bet-vote-tile-text"><strong>Armée '+a.position+'</strong>'+(a.army_name?'<em class="bet-vote-army-name">'+esc(a.army_name)+'</em>':'')+'<small>'+esc(a.player_name)+'</small></span><span class="bet-vote-tick">✓</span></label>').join('')+'</div><div class="bet-vote-buttons"><button data-save-vote="'+m.id+'">Enregistrer mon vote</button><button data-clear-vote="'+m.id+'">Retirer mon vote</button></div>':'<p class="bet-vote-help">'+(participant?'Vous participez à cette partie : vous ne pouvez pas voter.':'Connectez-vous pour participer aux votes.')+'</p>')+(score?'':'</div>')+'<div class="bet-vote-panel" data-vote-panel="results" data-vote-match="'+m.id+'"'+(score?'':' hidden')+'><p class="bet-vote-help">Répartition des '+totalChoices+' choix exprimés par '+vv.length+' membre'+(vv.length>1?'s':'')+'.</p><div class="bet-vote-bars">'+counts.map(x=>'<div class="bet-vote-bar-row"><div class="bet-vote-bar-label"><strong>Armée '+x.army.position+'</strong><span>'+x.count+' vote'+(x.count>1?'s':'')+' · '+(totalChoices?Math.round(100*x.count/totalChoices):0)+' %</span></div><div class="bet-vote-track"><div class="bet-vote-fill" style="width:'+(totalChoices?100*x.count/totalChoices:0)+'%"></div></div></div>').join('')+'</div><details class="bet-voter-list" '+(score?'open':'')+'><summary>Votes des membres</summary><div>'+ (vv.length?vv.map(v=>{const ok=!m.is_draw&&v.army_ids.length>0&&v.army_ids.every(id=>winner.some(a=>a.id===id));return '<p><strong>'+esc(names().get(v.user_id)||'Membre supprimé')+'</strong> : '+v.army_ids.map(id=>'Armée '+(aa.find(a=>a.id===id)?.position||'?')).join(', ')+(score?' — '+(ok?'✓ Réussi':'✗ Raté'):'')+'</p>'}).join(''):'Aucun vote pour le moment.')+'</div></details></div></section>';
 return '<article class="card" id="match-'+m.id+'"><h3>'+(openNumber!==null?'Partie '+openNumber:'Partie #'+m.id)+' — '+esc(m.format)+'</h3><p class="bet-meta">Publiée le '+new Date(m.created_at).toLocaleString('fr-FR')+' par '+esc(names().get(m.creator_id)||'Membre supprimé')+'</p><div class="bet-armies">'+armyHTML+'</div>'+((m.map_description?.trim()||m.map_photos?.length)?'<h4 class="bet-map-info-title">🗺️ Infos sur la map</h4>':'')+(m.map_description?.trim()?'<p class="bet-map-description">'+esc(m.map_description)+'</p>':'')+(m.map_photos?.length?'<div class="bet-map-images">'+m.map_photos.filter(x=>/^https:\/\//.test(x)).map(x=>'<a href="'+esc(x)+'" target="_blank" rel="noopener"><img src="'+esc(x)+'" alt="Photo de la map" loading="lazy"></a>').join('')+'</div>':'')+voteSummary+'<div class="bet-actions">'+(!score&&m.creator_id===user?.id?'<button data-finish="'+m.id+'">Mettre fin à la partie</button><button data-delete="'+m.id+'">Annuler la partie</button>':'')+(admin&&(score||m.creator_id!==user?.id)?'<button data-delete="'+m.id+'">Supprimer (admin)</button>':'')+'</div><div data-finish-editor="'+m.id+'" hidden></div></article>'};
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
  try{await call('bet_finish',{p_match:id,p_winners:draw?[]:aa.filter(a=>results.get(a.id)==='win').map(a=>a.id),p_draw:draw});msg('Partie terminée et statistiques actualisées.');await load()}
  catch(e){msg(e.message);button.disabled=false}
 };
 redraw();
}
function cardScores(){const map=new Map;for(const m of matches.filter(x=>x.status==='finished'))for(const a of byMatch(m.id))for(const c of byArmy(a.id)){const name=canonicalCardName(c.card_name);const x=map.get(name)||{name,wins:0,draws:0,losses:0};if(m.is_draw)x.draws++;else if(a.is_winner)x.wins++;else x.losses++;map.set(name,x)}return cards.map(c=>{const x=map.get(c.name)||{name:c.name,wins:0,draws:0,losses:0};const total=x.wins+x.draws+x.losses;return {...x,total,rate:total?100*x.wins/total:0}})}
function cardScore(name){const s=cardScores().find(x=>x.name===canonicalCardName(name));return s?s.wins+'-'+s.draws+'-'+s.losses+' ('+s.rate.toFixed(1)+' %)':'0-0-0'}
function memberScores(){const map=new Map;for(const m of matches.filter(x=>x.status==='finished')){const aa=byMatch(m.id),wins=aa.filter(a=>a.is_winner).map(a=>a.id),pts=aa.length>=3&&aa.length%2===1?2:1;for(const v of voteFor(m.id)){const x=map.get(v.user_id)||{id:v.user_id,good:0,bad:0,points:0};const good=!m.is_draw&&v.army_ids.length>0&&v.army_ids.every(id=>wins.includes(id));if(good){x.good++;x.points+=pts}else x.bad++;map.set(v.user_id,x)}}return [...map.values()].map(x=>({...x,rate:100*x.good/(x.good+x.bad)}))}
function pages(el,page,total,callback){$(el).innerHTML='<div class="bet-pagination"><button '+(page?'':'disabled')+' data-prev>← Précédent</button> Page '+(page+1)+' / '+Math.max(1,Math.ceil(total))+' <button '+((page+1)*1<total?'':'disabled')+' data-next>Suivant →</button></div>';$(el).querySelector('[data-prev]').onclick=()=>callback(page-1);$(el).querySelector('[data-next]').onclick=()=>callback(page+1)}
function render(){if(!cards.length)return;
 const chronological=(a,b)=>new Date(a.created_at)-new Date(b.created_at)||a.id-b.id;
 if(tab==='encours'){
 const open=matches.filter(m=>m.status==='open').sort(chronological);
 const openNumbers=new Map(open.map((m,i)=>[m.id,i+1]));
 openPage=Math.min(openPage,Math.max(0,Math.ceil(open.length/4)-1));
 $('bet-open-list').innerHTML=open.slice().reverse().slice(openPage*4,(openPage+1)*4).map(m=>matchHTML(m,openNumbers.get(m.id))).join('')||'<p>Aucune partie en cours.</p>';
 pages('bet-open-pagination',openPage,open.length/4,p=>{openPage=p;render()});
 }
 if(tab==='terminees'){
 const finished=matches.filter(m=>m.status==='finished').sort(chronological);
 const finishedNumbers=new Map(finished.map((m,i)=>[m.id,i+1]));
 finishedPage=Math.min(finishedPage,Math.max(0,Math.ceil(finished.length/4)-1));
 $('bet-finished-list').innerHTML=finished.slice().reverse().slice(finishedPage*4,(finishedPage+1)*4).map(m=>matchHTML(m,finishedNumbers.get(m.id))).join('')||'<p>Aucune partie terminée.</p>';
 pages('bet-finished-pagination',finishedPage,finished.length/4,p=>{finishedPage=p;render()});
 }
 if(tab==='participants'||tab==='cartes'){
 let ms=tab==='participants'?memberScores():[],sort=$('bet-member-sort').value,dir=$('bet-member-direction').value==='asc'?1:-1;ms.sort((a,b)=>dir*(a[sort]-b[sort])||a.id.localeCompare(b.id));memberPage=Math.min(memberPage,Math.max(0,Math.ceil(ms.length/20)-1));

 const statTiles=(rows,kind)=>'<div class="bet-stats-summary">'+(kind==='cards'?'<button type="button" class="bet-summary-filter'+(!playedCardsOnly?' active':'')+'" data-card-filter="all" aria-pressed="'+(!playedCardsOnly)+'"><small>Cartes disponibles</small><strong>'+rows.length+'</strong></button><button type="button" class="bet-summary-filter'+(playedCardsOnly?' active':'')+'" data-card-filter="played" aria-pressed="'+playedCardsOnly+'"><small>Cartes jouées</small><strong>'+rows.filter(x=>x.total>0).length+'</strong></button>':'<div><small>Pronostiqueurs</small><strong>'+rows.length+'</strong></div><div><small>Paris réalisés</small><strong>'+rows.reduce((n,x)=>n+x.good+x.bad,0)+'</strong></div><div><small>Pronostics réussis</small><strong>'+rows.reduce((n,x)=>n+x.good,0)+'</strong></div>')+'</div>';
 const bar=(w,d,l)=>{const n=w+d+l;return '<div class="bet-result-track" aria-label="Victoires, égalités et défaites"><span style="width:'+(n?100*w/n:0)+'%;background:#4fba80"></span><span style="width:'+(n?100*d/n:0)+'%;background:#e2b54a"></span><span style="width:'+(n?100*l/n:0)+'%;background:#d46a6a"></span></div>'};
 if(tab==='participants')$('bet-member-stats').innerHTML=statTiles(ms,'members')+'<div class="bet-stats-grid">'+ms.slice(memberPage*20,(memberPage+1)*20).map(x=>'<article class="bet-stat-tile"><div class="bet-stat-title"><span class="bet-stat-symbol">🎯</span><strong>'+esc(names().get(x.id)||'Membre supprimé')+'</strong><b>'+x.points+' pts</b></div><div class="bet-stat-big">'+x.rate.toFixed(1)+' % <small>de paris réussis</small></div>'+bar(x.good,0,x.bad)+'<div class="bet-stat-details"><span>✓ '+x.good+' justes</span><span>✕ '+x.bad+' ratés</span></div></article>').join('')+'</div>';if(tab==='participants')pages('bet-member-pagination',memberPage,ms.length/20,p=>{memberPage=p;render()});
 if(tab==='cartes'){
 let cs=cardScores(),term=$('bet-card-search').value.trim().toLowerCase();cs=cs.filter(x=>(!playedCardsOnly||x.total>0)&&x.name.toLowerCase().includes(term));sort=$('bet-card-sort').value;dir=$('bet-card-direction').value==='asc'?1:-1;cs.sort((a,b)=>dir*(a[sort]-b[sort])||a.name.localeCompare(b.name,'fr'));cardPage=Math.min(cardPage,Math.max(0,Math.ceil(cs.length/50)-1));
 $('bet-card-stats').innerHTML=statTiles(cardScores(),'cards')+'<p class="bet-stats-count">'+cs.length+' carte(s) trouvée(s)</p><div class="bet-stats-grid">'+cs.slice(cardPage*50,(cardPage+1)*50).map(x=>'<article class="bet-stat-tile"><div class="bet-stat-title"><span class="bet-stat-symbol">⚔️</span><a href="cartes-armee.html?carte='+encodeURIComponent(x.name)+'">'+esc(x.name)+'</a></div>'+(x.total?'<div class="bet-stat-big">'+x.rate.toFixed(1)+' % <small>de victoires</small></div>':'<div class="bet-stat-unused">Jamais jouée</div>')+bar(x.wins,x.draws,x.losses)+'<div class="bet-stat-details"><span>🟢 '+x.wins+' V</span><span>🟡 '+x.draws+' N</span><span>🔴 '+x.losses+' D</span></div></article>').join('')+'</div>';pages('bet-card-pagination',cardPage,cs.length/50,p=>{cardPage=p;render()});
 }
 }
 document.querySelectorAll('[data-card-filter]').forEach(b=>b.onclick=()=>{const next=b.dataset.cardFilter==='played';if(playedCardsOnly!==next){playedCardsOnly=next;cardPage=0;render()}});
 document.querySelectorAll('[data-vote-view]').forEach(button=>button.onclick=()=>{const match=button.dataset.voteMatch,view=button.dataset.voteView;document.querySelectorAll('[data-vote-view][data-vote-match="'+match+'"]').forEach(b=>b.classList.toggle('active',b.dataset.voteView===view));document.querySelectorAll('[data-vote-panel][data-vote-match="'+match+'"]').forEach(panel=>panel.hidden=panel.dataset.votePanel!==view)});
 document.querySelectorAll('.bet-vote-tile input[data-vote]').forEach(input=>input.addEventListener('change',()=>{if(!input.checked)return;const id=+input.dataset.vote;const limit=Math.floor(byMatch(id).length/2);const selected=[...document.querySelectorAll('.bet-vote-tile input[data-vote="'+id+'"]:checked')];if(selected.length>limit){for(const other of selected){if(other!==input){other.checked=false;if([...document.querySelectorAll('.bet-vote-tile input[data-vote="'+id+'"]:checked')].length<=limit)break}}}}));
 document.querySelectorAll('[data-save-vote]').forEach(b=>b.onclick=async()=>{const id=+b.dataset.saveVote,aa=byMatch(id),chosen=[...document.querySelectorAll('[data-vote="'+id+'"]:checked')].map(x=>+x.value);if(chosen.length>Math.floor(aa.length/2)){msg('Trop de votes sélectionnés.');return}try{await call('bet_cast_vote',{p_match:id,p_armies:chosen});msg('Vote enregistré.');await reloadVotes()}catch(e){msg(e.message)}});
 document.querySelectorAll('[data-clear-vote]').forEach(b=>b.onclick=async()=>{try{await call('bet_cast_vote',{p_match:+b.dataset.clearVote,p_armies:[]});msg('Vote retiré.');await reloadVotes()}catch(e){msg(e.message)}});
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Supprimer définitivement cette partie et ses statistiques ?'))return;try{await call('bet_delete',{p_match:+b.dataset.delete});msg('Partie supprimée.');await load()}catch(e){msg(e.message)}});
 document.querySelectorAll('[data-finish]').forEach(b=>b.onclick=()=>finishEditor(+b.dataset.finish));
}
['bet-member-sort','bet-member-direction','bet-card-search','bet-card-sort','bet-card-direction'].forEach(id=>$(id).addEventListener(id==='bet-card-search'?'input':'change',()=>{memberPage=0;cardPage=0;render()}));
load().then(()=>showTab(['encours','terminees','participants','cartes'].includes(location.hash.slice(1))?location.hash.slice(1):'encours')).catch(e=>msg('Erreur de chargement : '+e.message));
})();