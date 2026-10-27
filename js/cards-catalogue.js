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
function updateRestore(){
 const hidden=edits.filter(e=>e.is_hidden);
 const tools=$('cards-restore-tools');tools.hidden=!hidden.length;
 $('cards-restore-list').innerHTML=hidden.map(e=>'<option value="'+esc(e.id)+'">'+esc(e.name)+' — '+esc(e.general)+'</option>').join('');
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
\nasync function saveEdit(e){
 e.preventDefault();
 if(!admin||!db)return;
 const name=valid($('cards-name').value),general=valid($('cards-general').value),points=Number($('cards-points').value),fr=valid($('cards-fr').value)||null,en=valid($('cards-en').value)||null;
 if(!name||!general||!Number.isInteger(points)||points<0||points>2000){inform('Renseigne un nom, un général et un coût valide.',true);return}
 if((fr&&!safeUrl(fr))||(en&&!safeUrl(en))){inform('Les liens VF et VO doivent commencer par https:// ou http://.',true);return}
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
 const row={name,general,points,points_order,fr,en,is_hidden:false};
 if(editing?._source)row.source_name=editing._source;
 else if(!editing)row.source_name=null;
 $('cards-save').disabled=true;inform('Enregistrement…');
 try{
  const query=editing?db.from('army_card_edits')[editing._editId?'update':'insert'](row):db.from('army_card_edits').insert(row);
  const res=editing&&editing._editId?await query.eq('id',editing._editId):await query;
  if(res.error)throw res.error;
  await loadEdits();merge();render();closeForm();notifyCatalogueChange();
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
 let allowed=false;
 if(db){
  try{
   // Lire la session locale sans bloquer l'interface ni le chargement des cartes.
   const {data:sessionData,error:sessionError}=await db.auth.getSession();
   if(sessionError)throw sessionError;
   const uid=sessionData?.session?.user?.id;
   if(uid){
    const {data:profile,error:profileError}=await db.from('profiles').select('role,can_manage_cards').eq('id',uid).maybeSingle();
    if(profileError)throw profileError;
    allowed=profile?.role==='admin'||profile?.role==='cards_admin'||profile?.can_manage_cards===true;
   }
  }catch(err){console.warn('Droits de gestion des cartes non vérifiés :',err)}
 }
 if(check!==adminCheckSerial)return;
 admin=allowed;
 $('cards-admin-open').hidden=!admin;
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

q.addEventListener('input',render);g.addEventListener('change',render);band.addEventListener('change',render);
$('cards-tab-armies').addEventListener('click',()=>switchView(false));
$('cards-tab-glyphes').addEventListener('click',()=>switchView(true));
$('cards-admin-open').addEventListener('click',()=>openForm());
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