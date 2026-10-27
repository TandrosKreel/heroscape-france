/* Catalogue local + ajustements Supabase. Les écritures sont protégées par RLS administrateur. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=s=>{try{const u=new URL(String(s||''));return /^https?:$/.test(u.protocol)?u.href:''}catch{return ''}};
const db=window.supabaseClient;
let base=[],edits=[],all=[],admin=false,editing=null;
let specials={glyphes:[],sans_general:[]};
let illustrations={};
let adminCheckSerial=0;
const q=$('q'),g=$('g'),band=$('band'),box=$('cards'),status=$('cards-status'),panel=$('cards-admin-panel'),form=$('cards-admin-form'),notice=$('cards-admin-notice');
const sortCards=(a,b)=>a.general.localeCompare(b.general,'fr')||a.points-b.points||Number(a.points_order||0)-Number(b.points_order||0)||a.name.localeCompare(b.name,'fr');
const valid=s=>String(s??'').trim();
const inform=(message,error=false)=>{notice.textContent=message;notice.style.color=error?'#ffaaaa':'#b7e5c7'};
function merge(){all=window.HeroscapeCards.merge(base,edits).active;}
const notifyCatalogueChange=()=>{try{localStorage.setItem('heroscape-cards-updated',String(Date.now()))}catch{}};
const variantKey=name=>'heroscape-vf-illustration:'+name;
const variantsFor=card=>{
 const variants=illustrations[card.name];
 // Une modification administrative du lien VF doit toujours primer sur les illustrations du catalogue.
 return Array.isArray(variants)&&variants.length>1&&variants[0].fr===card.fr?variants:[];
};
const selectedVariant=(name,variants)=>{
 try{const index=Number(localStorage.getItem(variantKey(name)));return Number.isInteger(index)&&index>=0&&index<variants.length?index:0}catch{return 0}
};

function render(){
 const generals=[...new Set([...all.map(x=>x.general),...specials.sans_general.map(x=>x.general)])].sort((a,b)=>a.localeCompare(b,'fr'));
 const selected=g.value;
 g.innerHTML='<option value="">Tous les généraux</option>'+generals.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 g.value=selected;
 const term=q.value.trim().toLocaleLowerCase('fr');
 const filtered=all.filter(x=>{
  const cost=!band.value||(band.value==='lt100'&&x.points<100)||(band.value==='100to149'&&x.points>=100&&x.points<150)||(band.value==='gte150'&&x.points>=150);
  return cost&&(!term||x.name.toLocaleLowerCase('fr').includes(term))&&(!g.value||x.general===g.value);
 });
 const specialFiltered=specials.sans_general.filter(x=>!band.value&&(!term||x.name.toLocaleLowerCase('fr').includes(term))&&(!g.value||x.general===g.value));
 const total=filtered.length+specialFiltered.length;
 status.textContent=total+' carte'+(total>1?'s':'')+' affichée'+(total>1?'s':'')+'.';
 const link=(url,label,variantLink=false)=>safeUrl(url)?'<a class="btn"'+(variantLink?' data-vf-variant-link':'')+' href="'+esc(safeUrl(url))+'" target="_blank" rel="noopener noreferrer">'+label+'</a>':'<span>'+label+' indisponible</span>';
 box.innerHTML=generals.map(general=>{
  const list=filtered.filter(x=>x.general===general);
  if(!list.length)return '';
  return '<section class="general-section"><h2>'+esc(general)+' <span class="section-count">('+list.length+')</span></h2><div class="army-grid">'+list.map(x=>{
   const key=x._source?'base:'+x._source:'custom:'+x.id;
   const variants=variantsFor(x);
   const selected=variants.length?selectedVariant(x.name,variants):0;
   const vf=variants.length?variants[selected].fr:x.fr;
   const picker=variants.length?'<div class="vf-variants"><p class="vf-variants-title">Choisir une illustration VF</p><div class="vf-variants-list" role="group" aria-label="Illustrations VF de '+esc(x.name)+'">'+variants.map((v,i)=>'<button type="button" class="vf-variant-option'+(i===selected?' is-selected':'')+'" data-variant-name="'+esc(x.name)+'" data-variant-index="'+i+'" aria-pressed="'+(i===selected?'true':'false')+'" aria-label="'+esc(x.name+' — '+v.label)+'"><img src="'+esc(safeUrl(v.miniature))+'" alt="" loading="lazy" decoding="async"><span>'+esc(v.label)+'</span></button>').join('')+'</div></div>':'';
   return '<article class="card army-card"><h3>'+esc(x.name)+'</h3><p class="army-meta">'+esc(x.points)+' points</p><div class="army-actions">'+link(vf,'🇫🇷 VF',!!variants.length)+link(x.en,'🇬🇧 English')+'</div>'+picker+(admin?'<button class="cards-edit-btn" type="button" data-card-key="'+esc(key)+'">Modifier / supprimer</button>':'')+'</article>';
  }).join('')+'</div></section>';
 }).join('')+(specialFiltered.length?'<section class="general-section"><h2>Sans Général <span class="section-count">('+specialFiltered.length+')</span></h2><div class="army-grid">'+specialFiltered.map(x=>'<article class="card army-card"><h3>'+esc(x.name)+'</h3><p class="army-meta">'+esc(x.type||'Objet de terrain')+'</p><div class="army-actions">'+link(x.fr,'🇫🇷 VF')+'</div></article>').join('')+'</div></section>':'');
}
function renderGlyphes(){
 const target=$('cards-glyphes');if(!target)return;
 const glyphes=specials.glyphes||[];
 const link=url=>safeUrl(url)?'<a class="btn" href="'+esc(safeUrl(url))+'" target="_blank" rel="noopener noreferrer">🇫🇷 VF</a>':'<span>VF indisponible</span>';
 target.innerHTML=glyphes.map(x=>'<article class="card army-card"><h3>'+esc(x.name)+'</h3><p class="army-meta">'+esc(x.type||'Glyphe')+'</p><div class="army-actions">'+link(x.fr)+'</div></article>').join('');
 $('cards-glyphes-status').textContent=glyphes.length+' glyphe'+(glyphes.length>1?'s':'')+' ou équipement'+(glyphes.length>1?'s':'')+' dans la bibliothèque.';
}
function switchView(showGlyphes){
 $('cards-armies-view').hidden=showGlyphes;
 $('cards-glyphes-view').hidden=!showGlyphes;
 $('cards-tab-armies').setAttribute('aria-selected',String(!showGlyphes));
 $('cards-tab-glyphes').setAttribute('aria-selected',String(showGlyphes));
}
function fillPlacement(){
 const el=$('cards-place-after'),value=el.value;
 el.innerHTML='<option value="">Classement automatique par points</option>'+all.map(x=>'<option value="'+esc(x._source?'base:'+x._source:'custom:'+x.id)+'">Après '+esc(x.name)+' — '+esc(x.general)+' ('+esc(x.points)+' pts)</option>').join('');
 el.value=value;
}
function updateManageList(){
 const search=$('cards-manage-search').value.trim().toLocaleLowerCase('fr');
 const select=$('cards-manage-list'),previous=select.value;
 const matches=all.filter(x=>x.name.toLocaleLowerCase('fr').includes(search));
 select.innerHTML=matches.map(x=>'<option value="'+esc(x._source?'base:'+x._source:'custom:'+x.id)+'">'+esc(x.name)+' — '+esc(x.general)+' ('+esc(x.points)+' pts)</option>').join('');
 if(matches.some(x=>(x._source?'base:'+x._source:'custom:'+x.id)===previous))select.value=previous;
 $('cards-manage-hide').disabled=!matches.length;
 $('cards-manage-status').textContent=matches.length?matches.length+' carte(s) disponibles.':'Aucune carte correspondante.';
}
function updateRestore(){
 const hidden=edits.filter(e=>e.is_hidden);
 const tools=$('cards-restore-tools');
 $('cards-hidden-open').textContent='Cartes masquées et suppression définitive ('+hidden.length+')';
 if(!hidden.length){$('cards-hidden-open').setAttribute('aria-expanded',String(!tools.hidden));}
 updateManageList();
 $('cards-restore-list').innerHTML=hidden.length?hidden.map(e=>'<option value="'+esc(e.id)+'">'+esc(e.name)+' — '+esc(e.general)+'</option>').join(''):'<option value="">Aucune carte masquée</option>';
 $('cards-restore-empty').hidden=hidden.length>0;
 $('cards-restore-list').disabled=hidden.length===0;
 $('cards-restore').disabled=hidden.length===0;
 $('cards-permanent-delete').disabled=hidden.length===0||!hidden.some(e=>!e.source_name);
}
function openForm(card=null){
 editing=card;
 panel.hidden=false;
 $('cards-form-title').textContent=card?'Modifier une carte':'Ajouter une carte';
 $('cards-name').value=card?.name||'';
 $('cards-general').value=card?.general||'Aquilla';
 $('cards-points').value=card?.points??'';
 $('cards-fr').value=card?.fr||'';
 $('cards-en').value=card?.en||'';
 $('cards-fr-url-row').hidden=true;
 $('cards-en-url-row').hidden=true;
 $('cards-fr-remove-row').hidden=!card;
 $('cards-en-remove-row').hidden=!card;
 $('cards-remove-fr').checked=false;
 $('cards-remove-en').checked=false;
 $('cards-remove-fr').disabled=!card;
 $('cards-remove-en').disabled=!card;
 $('cards-fr').disabled=false;$('cards-en').disabled=false;
 $('cards-fr-file').disabled=false;$('cards-en-file').disabled=false;
 $('cards-place-after').hidden=!!card;
 $('cards-place-label').hidden=!!card;
 $('cards-delete').hidden=!card;
 $('cards-cancel').hidden=false;
 fillPlacement();
 updateRestore();
 inform('');
 $('cards-fr-file').value='';$('cards-en-file').value='';$('cards-history').hidden=!card;if(card)void showCardHistory(card);
 panel.scrollIntoView({behavior:'smooth',block:'start'});
}
function closeForm(){panel.hidden=true;editing=null;inform('')}
async function loadEdits(){
 if(!db)return;
 const {data,error}=await db.from('army_card_edits').select('id,source_name,name,general,points,points_order,fr,en,is_hidden');
 if(error){console.warn('Cartes : modifications indisponibles',error);return}
 edits=data||[];
}
async function uploadCardFile(file){
 if(!file)return null;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15*1024*1024)throw Error('Image invalide ou supérieure à 15 Mo.');
 const {data:{user},error:userError}=await db.auth.getUser();if(userError||!user)throw Error('Connexion requise.');
 const bitmap=await createImageBitmap(file);
 const canvas=document.createElement('canvas'),scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
 canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.88));
 if(!blob||blob.size>5*1024*1024)throw Error('Image trop volumineuse après conversion.');
 const path=user.id+'/'+crypto.randomUUID()+'.webp';
 const {error}=await db.storage.from('army-cards').upload(path,blob,{contentType:'image/webp',upsert:false});
 if(error)throw error;
 return db.storage.from('army-cards').getPublicUrl(path).data.publicUrl;
}
async function showCardHistory(card){
 const el=$('cards-history');el.hidden=false;el.textContent='Chargement de l’historique…';
 if(!card?._editId){el.textContent='Aucune modification enregistrée pour cette carte.';return}
 const {data,error}=await db.from('army_card_history').select('action,changed_at,actor_id,old_data,new_data').eq('card_id',card._editId).order('changed_at',{ascending:false}).limit(30);
 if(error){el.textContent='Historique indisponible : '+error.message;return}
 const ids=[...new Set((data||[]).map(x=>x.actor_id).filter(Boolean))];
 let names={};if(ids.length){const result=await db.from('profiles').select('id,username').in('id',ids);if(!result.error)names=Object.fromEntries((result.data||[]).map(x=>[x.id,x.username]));}
 el.innerHTML='<h4>Historique des modifications</h4>'+(data||[]).map(x=>'<p>'+esc(new Date(x.changed_at).toLocaleString('fr-FR'))+' — '+esc(names[x.actor_id]||'Compte inconnu')+' — '+esc(({INSERT:'Ajout',UPDATE:'Modification',DELETE:'Suppression'})[x.action]||x.action)+'</p>').join('')||'Aucun historique.';
}

async function saveEdit(e){
 e.preventDefault();
 if(!admin||!db)return;
 const name=valid($('cards-name').value),general=valid($('cards-general').value),points=Number($('cards-points').value),fr=valid($('cards-fr').value)||null,en=valid($('cards-en').value)||null;
 if(!name||!general||!Number.isInteger(points)||points<0||points>2000){inform('Renseigne un nom, un général et un coût valide.',true);return}
 if((fr&&!safeUrl(fr))||(en&&!safeUrl(en))){inform('Les liens historiques VF et VO doivent être valides.',true);return}
 if(!editing&&!$('cards-fr-file').files[0]){inform('Sélectionne une image VF à importer pour créer la carte.',true);return}
 if(all.some(x=>x.name.toLocaleLowerCase('fr')===name.toLocaleLowerCase('fr')&&(!editing||x.catalog_id!==editing.catalog_id))){inform('Une carte porte déjà ce nom.',true);return}
 let points_order=editing?Number(editing.points_order):9999;
 if(!editing){
  const after=$('cards-place-after').value;
  if(after){
   const selected=all.find(x=>(x._source?'base:'+x._source:'custom:'+x.id)===after);
   if(selected){
    if(selected.general!==general){inform('Pour insérer après cette carte, sélectionne le même général.',true);return}
    const siblings=all.filter(x=>x.general===general&&x.points===points).sort(sortCards);
    const later=siblings.filter(x=>Number(x.points_order)>Number(selected.points_order)).sort(sortCards)[0];
    points_order=later?(Number(selected.points_order)+Number(later.points_order))/2:Number(selected.points_order)+0.5;
    if(points<selected.points){inform('Le coût doit être au moins celui de la carte précédente pour conserver le classement.',true);return}
    const next=all.filter(x=>x.general===general).sort(sortCards).find((x,i,arr)=>arr[i-1]===selected);
    if(next&&points>next.points){inform('Le coût dépasse celui de la carte suivante : choisis un autre emplacement.',true);return}
   }
  }else{const same=all.filter(x=>x.general===general&&x.points===points);points_order=same.length?Math.max(...same.map(x=>Number(x.points_order)||0))+1:9999}
 }
 const removeFr=!!editing&&$('cards-remove-fr').checked,removeEn=!!editing&&$('cards-remove-en').checked;
 if(removeFr&&$('cards-fr-file').files[0]||removeEn&&$('cards-en-file').files[0]){inform('Décoche le retrait du lien avant de choisir une nouvelle image pour cette langue.',true);return}
 const row={name,general,points,points_order,fr:removeFr?null:fr,en:removeEn?null:en,is_hidden:false};
 if(editing?._source)row.source_name=editing._source;
 else if(!editing)row.source_name=null;
 $('cards-save').disabled=true;inform('Enregistrement…');
 try{
  if(removeFr)row.fr=null;
  if(removeEn)row.en=null;
  if($('cards-fr-file').files[0])row.fr=await uploadCardFile($('cards-fr-file').files[0]);
  if($('cards-en-file').files[0])row.en=await uploadCardFile($('cards-en-file').files[0]);
  const query=editing?db.from('army_card_edits')[editing._editId?'update':'insert'](row):db.from('army_card_edits').insert(row);
  const res=editing&&editing._editId?await query.eq('id',editing._editId).select('id,fr,en'):await query.select('id,fr,en');
  if(res.error)throw res.error;
  if(!res.data?.length)throw Error('Aucune modification enregistrée dans Supabase. Vérifie les autorisations du compte.');
  await loadEdits();merge();render();updateRestore();closeForm();notifyCatalogueChange();
  const savedCard=[...box.querySelectorAll('.army-card')].find(el=>el.querySelector('h3')?.textContent===name);
  if(savedCard){savedCard.scrollIntoView({behavior:'smooth',block:'center'});savedCard.style.outline='2px solid #d6ac4f';setTimeout(()=>{savedCard.style.outline=''},3500)}
  status.textContent+=' Modification enregistrée pour '+name+' — liens actualisés.';
 }catch(err){inform('Impossible d’enregistrer : '+(err.message||'erreur'),true)}
 finally{$('cards-save').disabled=false}
}
async function deleteEdit(){
 if(!admin||!editing||!db)return;
 const item=editing;
 if(!confirm('Supprimer « '+item.name+' » du catalogue visible ?'))return;
 $('cards-delete').disabled=true;inform('Suppression…');
 try{
  let res;
  if(item._source){
   const row={source_name:item._source,name:item.name,general:item.general,points:item.points,points_order:item.points_order,fr:item.fr||null,en:item.en||null,is_hidden:true};
   res=item._editId?await db.from('army_card_edits').update({is_hidden:true}).eq('id',item._editId):await db.from('army_card_edits').insert(row);
  }else res=await db.from('army_card_edits').update({is_hidden:true}).eq('id',item._editId);
  if(res.error)throw res.error;
  await loadEdits();merge();render();closeForm();notifyCatalogueChange();
 }catch(err){inform('Impossible de supprimer : '+(err.message||'erreur'),true)}
 finally{$('cards-delete').disabled=false}
}
async function refreshAdmin(){
 const check=++adminCheckSerial;
 let allowed=false,profileRoleIsCreator=false;
 if(db){
  try{
   // Lire la session locale sans bloquer l'interface ni le chargement des cartes.
   const {data:sessionData,error:sessionError}=await db.auth.getSession();
   if(sessionError)throw sessionError;
   const uid=sessionData?.session?.user?.id;
   if(uid){
    const {data:profile,error:profileError}=await db.from('profiles').select('role,can_manage_cards,username').eq('id',uid).maybeSingle();
    if(profileError)throw profileError;
    allowed=profile?.role==='admin'||profile?.role==='cards_admin'||profile?.can_manage_cards===true;
    profileRoleIsCreator=profile?.username==='Tandros Kreel';
   }
  }catch(err){console.warn('Droits de gestion des cartes non vérifiés :',err)}
 }
 if(check!==adminCheckSerial)return;
 admin=allowed;
 vfMigrationCreator=allowed&&profileRoleIsCreator;
 $('cards-vf-migration').hidden=!vfMigrationCreator;
 $('cards-admin-open').hidden=!admin;
 $('cards-hidden-open').hidden=!admin;
 if(!admin){$('cards-restore-tools').hidden=true;$('cards-hidden-open').setAttribute('aria-expanded','false');}
 if(!admin&&editing)closeForm();
 if(all.length)render();
}
async function init(){
 try{
  const response=await fetch('data/cards.json');if(!response.ok)throw Error('Catalogue introuvable');
  base=await response.json();
  try{
   const extraResponse=await fetch('data/cartes-speciales.json');
   if(extraResponse.ok){const data=await extraResponse.json();if(Array.isArray(data.glyphes)&&Array.isArray(data.sans_general))specials=data;}
  }catch(err){console.warn('Cartes spéciales indisponibles',err)}
  try{
   const variantsResponse=await fetch('data/cartes-illustrations.json');
   if(variantsResponse.ok){
    const data=await variantsResponse.json();
    if(data&&typeof data==='object'&&!Array.isArray(data))illustrations=data;
   }
  }catch(err){console.warn('Illustrations VF alternatives indisponibles',err)}
  merge();render();renderGlyphes();
  // Les commandes administrateur ne doivent pas attendre la requête du catalogue Supabase.
  void refreshAdmin();
  void loadEdits().then(()=>{merge();render()}).catch(err=>console.warn('Catalogue Supabase indisponible :',err));
  const requested=new URLSearchParams(location.search).get('carte');
  if(requested){q.value=requested;render();const card=[...document.querySelectorAll('.army-card')].find(el=>el.querySelector('h3')?.textContent===requested);if(card){card.id='carte-recherchee';card.scrollIntoView({block:'center'});card.style.outline='2px solid var(--gold)'}}
 }catch(err){console.error(err);status.textContent='Impossible de charger le catalogue.'}
}
if(db){
 // Si la session arrive après le catalogue, réévaluer les droits sans recharger la page.
 db.auth.onAuthStateChange(()=>{setTimeout(()=>{void refreshAdmin()},0)});
}


let vfMigrationCreator=false,vfMigrationBusy=false,vfMigrationStop=false;
const vfMigrationFailed=new Set();
const vfMigrationLog=[];
const vfMigrationPrefix='https://yhpazuslssejitmneqgs.supabase.co/storage/v1/object/public/army-cards/';
function vfMigrationCandidates(){
 const byName=new Map(edits.filter(x=>x.source_name).map(x=>[x.source_name,x]));
 return base.filter(x=>{
  const e=byName.get(x.name),url=e?e.fr:x.fr;
  return !!url&&!url.startsWith(vfMigrationPrefix)&&!vfMigrationFailed.has(x.name);
 });
}
function vfMigrationStatus(message){
 const el=$('cards-vf-migration-status');
 if(el)el.textContent=message;
}
async function vfMigrationBatch(automatic=false){
 if(!vfMigrationCreator||vfMigrationBusy||!db)return;
 vfMigrationBusy=true;const button=$('cards-vf-migration-run');button.disabled=true;
 let completed=0,failed=0;
 try{
  const candidates=vfMigrationCandidates().slice(0,automatic?Infinity:10);
  const progress=$('cards-vf-migration-progress');
  progress.hidden=!automatic;progress.max=Math.max(1,candidates.length);progress.value=0;
  if(!candidates.length){vfMigrationStatus('Toutes les images VF référencées sont migrées ou déjà hébergées dans Supabase. Les références sans VF restent à traiter séparément.');return}
  for(const card of candidates){
   if(vfMigrationStop)break;
   const previous=edits.find(e=>e.source_name===card.name);
   const source=previous?previous.fr:card.fr;
   vfMigrationStatus('Migration '+(completed+failed+1)+'/'+candidates.length+' : '+card.name);
   try{
    const response=await fetch(source,{mode:'cors',cache:'no-store'});
    if(!response.ok)throw Error('Téléchargement HTTP '+response.status);
    const blob=await response.blob();
    if(blob.size>15*1024*1024)throw Error('Image de plus de 15 Mo');
    const type=blob.type.split(';')[0];
    if(!['image/webp','image/png','image/jpeg'].includes(type))throw Error('Format non reconnu : '+type);
    const file=new File([blob],card.name+'.'+(type==='image/png'?'png':type==='image/jpeg'?'jpg':'webp'),{type});
    const newUrl=await uploadCardFile(file);
    const check=await fetch(newUrl,{cache:'no-store'});
    if(!check.ok||!(check.headers.get('content-type')||'').startsWith('image/'))throw Error('Vérification de la copie impossible');
    const row=previous?{fr:newUrl}:{source_name:card.name,name:card.name,general:card.general,points:card.points,points_order:card.points_order,fr:newUrl,en:card.en||null,is_hidden:false};
    const result=previous?await db.from('army_card_edits').update(row).eq('id',previous.id):await db.from('army_card_edits').insert(row);
    if(result.error)throw result.error;
    vfMigrationLog.push({name:card.name,status:'migré',previous:source,current:newUrl});
    completed++;
    await loadEdits();merge();
   }catch(err){
    failed++;vfMigrationFailed.add(card.name);vfMigrationLog.push({name:card.name,status:'échec',previous:source,error:String(err.message||err)});
   }
   progress.value=completed+failed;
  }
  render();notifyCatalogueChange();
  vfMigrationStatus((vfMigrationStop?'Traitement arrêté. ':'Lot terminé. ')+completed+' migrées, '+failed+' échecs. '+vfMigrationCandidates().length+' VF restantes (hors échecs). Aucun original supprimé.');
 }finally{vfMigrationBusy=false;button.disabled=false;$('cards-vf-migration-auto').disabled=false;$('cards-vf-migration-stop').hidden=true;vfMigrationStop=false;}
}
$('cards-vf-migration-auto').addEventListener('click',()=>{
 if(vfMigrationBusy||!vfMigrationCreator)return;
 if(!confirm('Migrer automatiquement toutes les VF restantes ? Les originaux seront conservés et chaque image vérifiée.'))return;
 vfMigrationStop=false;$('cards-vf-migration-auto').disabled=true;$('cards-vf-migration-stop').hidden=false;
 void vfMigrationBatch(true).catch(err=>vfMigrationStatus('Migration interrompue : '+err.message));
});
$('cards-vf-migration-stop').addEventListener('click',()=>{vfMigrationStop=true;vfMigrationStatus('Arrêt demandé : fin de la carte en cours…')});
$('cards-vf-migration-run').addEventListener('click',()=>{void vfMigrationBatch().catch(err=>vfMigrationStatus('Migration interrompue : '+err.message))});
$('cards-vf-migration-report').addEventListener('click',()=>{
 const blob=new Blob([JSON.stringify(vfMigrationLog,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='rapport-migration-vf.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});

q.addEventListener('input',render);g.addEventListener('change',render);band.addEventListener('change',render);
$('cards-tab-armies').addEventListener('click',()=>switchView(false));
$('cards-tab-glyphes').addEventListener('click',()=>switchView(true));
$('cards-admin-open').addEventListener('click',()=>openForm());
$('cards-manage-search').addEventListener('input',updateManageList);
$('cards-manage-hide').addEventListener('click',async()=>{
 if(!admin||!db)return;
 const key=$('cards-manage-list').value;
 const card=all.find(x=>(x._source?'base:'+x._source:'custom:'+x.id)===key);
 if(!card)return;
 if(!confirm('Masquer « '+card.name+' » du catalogue visible ? La carte pourra être restaurée.'))return;
 const button=$('cards-manage-hide');button.disabled=true;
 try{
  let res;
  if(card._source){
   const row={source_name:card._source,name:card.name,general:card.general,points:card.points,points_order:card.points_order,fr:card.fr||null,en:card.en||null,is_hidden:true};
   res=card._editId?await db.from('army_card_edits').update({is_hidden:true}).eq('id',card._editId):await db.from('army_card_edits').insert(row);
  }else{
   if(!card._editId)throw Error('Identifiant de carte introuvable.');
   res=await db.from('army_card_edits').update({is_hidden:true}).eq('id',card._editId);
  }
  if(res.error)throw res.error;
  await loadEdits();merge();render();updateRestore();inform('Carte masquée. Elle reste restaurable.');notifyCatalogueChange();
 }catch(err){inform('Impossible de masquer : '+(err.message||'erreur'),true);updateManageList()}
 finally{button.disabled=!$('cards-manage-list').options.length}
});
$('cards-hidden-open').addEventListener('click',()=>{
 if(!admin)return;
 const tools=$('cards-restore-tools'),show=tools.hidden;
 tools.hidden=!show;
 $('cards-hidden-open').setAttribute('aria-expanded',String(show));
 if(show)tools.scrollIntoView({behavior:'smooth',block:'nearest'});
});
for(const [checkbox,urlId,fileId] of [['cards-remove-fr','cards-fr','cards-fr-file'],['cards-remove-en','cards-en','cards-en-file']]){
 $(checkbox).addEventListener('change',()=>{if($(checkbox).checked){$(urlId).value='';$(fileId).value='';}$(urlId).disabled=$(checkbox).checked;$(fileId).disabled=$(checkbox).checked;});
}
$('cards-cancel').addEventListener('click',closeForm);
form.addEventListener('submit',saveEdit);
$('cards-delete').addEventListener('click',deleteEdit);
$('cards-restore').addEventListener('click',async()=>{
 if(!admin||!db)return;
 const id=$('cards-restore-list').value;
 if(!id)return;
 const {error}=await db.from('army_card_edits').update({is_hidden:false}).eq('id',id);
 if(error){inform('Restauration impossible : '+error.message,true);return}
 await loadEdits();merge();render();updateRestore();inform('Carte restaurée.');notifyCatalogueChange();
});
$('cards-permanent-delete').addEventListener('click',async()=>{
 if(!admin||!db)return;
 const id=$('cards-restore-list').value,card=edits.find(e=>e.id===id);
 if(!card||card.source_name){inform('Seules les cartes ajoutées sur le site peuvent être supprimées définitivement.',true);return}
 if(!confirm('Supprimer définitivement « '+card.name+' » ? Cette action est irréversible. Les cartes utilisées dans Pari Heroscape sont protégées.'))return;
 const confirmation=prompt('Pour confirmer, écris SUPPRIMER en majuscules :');
 if(confirmation!=='SUPPRIMER')return;
 const button=$('cards-permanent-delete');button.disabled=true;inform('Vérification des parties et suppression…');
 try{
  const {data,error}=await db.rpc('permanently_delete_custom_army_card',{p_card_id:id});
  if(error)throw error;
  const urls=(data||[]).flatMap(x=>[x.fr_url,x.en_url]).filter(Boolean);
  const prefix=db.storage.from('army-cards').getPublicUrl('PLACEHOLDER').data.publicUrl.split('PLACEHOLDER')[0];
  const paths=[...new Set(urls.filter(url=>url.startsWith(prefix)).map(url=>decodeURIComponent(url.slice(prefix.length).split('?')[0])))];
  let warning='';
  if(paths.length){
   const {data:otherCards,error:checkError}=await db.from('army_card_edits').select('fr,en');
   if(checkError)warning=' Vérifie les images dans Supabase : nettoyage non confirmé.';
   else{
    const referenced=new Set((otherCards||[]).flatMap(x=>[x.fr,x.en]));
    const unused=paths.filter(path=>!referenced.has(prefix+path));
    if(unused.length){const {error:storageError}=await db.storage.from('army-cards').remove(unused);if(storageError)warning=' La fiche est supprimée, mais certaines images n’ont pas pu être effacées.'}
   }
  }
  await loadEdits();merge();render();updateRestore();inform('Carte supprimée définitivement. Son historique reste conservé.'+warning,!!warning);notifyCatalogueChange();
 }catch(err){inform('Suppression impossible : '+(err.message||'erreur'),true)}
 finally{button.disabled=false}
});
box.addEventListener('click',e=>{
 const option=e.target.closest('[data-variant-name]');
 if(option){
  const name=option.dataset.variantName,index=Number(option.dataset.variantIndex);
  const card=all.find(x=>x.name===name),variants=card?variantsFor(card):[];
  if(!Number.isInteger(index)||index<0||index>=variants.length)return;
  const chosenUrl=safeUrl(variants[index].fr);
  if(!chosenUrl)return;
  try{localStorage.setItem(variantKey(name),String(index))}catch{}
  const article=option.closest('.army-card');
  const vfLink=article?.querySelector('[data-vf-variant-link]');
  if(vfLink)vfLink.href=chosenUrl;
  article?.querySelectorAll('[data-variant-name]').forEach(button=>{
   const selected=button===option;
   button.classList.toggle('is-selected',selected);
   button.setAttribute('aria-pressed',String(selected));
  });
  return;
 }
 const b=e.target.closest('[data-card-key]');if(!b||!admin)return;
 const card=all.find(x=>(x._source?'base:'+x._source:'custom:'+x.id)===b.dataset.cardKey);if(card)openForm(card);
});
init();
})();