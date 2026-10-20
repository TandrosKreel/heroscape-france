/* Catalogue local + ajustements Supabase. Les écritures sont protégées par RLS administrateur. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=s=>{try{const u=new URL(String(s||''));return /^https?:$/.test(u.protocol)?u.href:''}catch{return ''}};
const db=window.supabaseClient;
let base=[],edits=[],all=[],admin=false,editing=null;
let adminCheckSerial=0;
const q=$('q'),g=$('g'),band=$('band'),box=$('cards'),status=$('cards-status'),panel=$('cards-admin-panel'),form=$('cards-admin-form'),notice=$('cards-admin-notice');
const sortCards=(a,b)=>a.general.localeCompare(b.general,'fr')||a.points-b.points||Number(a.points_order||0)-Number(b.points_order||0)||a.name.localeCompare(b.name,'fr');
const valid=s=>String(s??'').trim();
const inform=(message,error=false)=>{notice.textContent=message;notice.style.color=error?'#ffaaaa':'#b7e5c7'};
function merge(){
 const overrides=new Map(edits.filter(e=>e.source_name).map(e=>[e.source_name,e]));
 all=base.map(b=>{const e=overrides.get(b.name);return e?{...b,...e,_source:b.name,_editId:e.id}: {...b,_source:b.name,_editId:null}}).filter(x=>!x.is_hidden);
 all.push(...edits.filter(e=>!e.source_name&&!e.is_hidden).map(e=>({...e,_source:null,_editId:e.id})));
 all.sort(sortCards);
}
function render(){
 const generals=[...new Set(all.map(x=>x.general))].sort((a,b)=>a.localeCompare(b,'fr'));
 const selected=g.value;
 g.innerHTML='<option value="">Tous les généraux</option>'+generals.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 g.value=selected;
 const term=q.value.trim().toLocaleLowerCase('fr');
 const filtered=all.filter(x=>{
  const cost=!band.value||(band.value==='lt100'&&x.points<100)||(band.value==='100to149'&&x.points>=100&&x.points<150)||(band.value==='gte150'&&x.points>=150);
  return cost&&(!term||x.name.toLocaleLowerCase('fr').includes(term))&&(!g.value||x.general===g.value);
 });
 status.textContent=filtered.length+' carte'+(filtered.length>1?'s':'')+' affichée'+(filtered.length>1?'s':'')+'.';
 const link=(url,label)=>safeUrl(url)?'<a class="btn" href="'+esc(safeUrl(url))+'" target="_blank" rel="noopener noreferrer">'+label+'</a>':'<span>'+label+' indisponible</span>';
 box.innerHTML=generals.map(general=>{
  const list=filtered.filter(x=>x.general===general);
  if(!list.length)return '';
  return '<section class="general-section"><h2>'+esc(general)+' <span class="section-count">('+list.length+')</span></h2><div class="army-grid">'+list.map(x=>{
   const key=x._source?'base:'+x._source:'custom:'+x.id;
   return '<article class="card army-card"><h3>'+esc(x.name)+'</h3><p class="army-meta">'+esc(x.points)+' points</p><div class="army-actions">'+link(x.fr,'🇫🇷 VF')+link(x.en,'🇬🇧 English')+'</div>'+(admin?'<button class="cards-edit-btn" type="button" data-card-key="'+esc(key)+'">Modifier / supprimer</button>':'')+'</article>';
  }).join('')+'</div></section>';
 }).join('');
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
 panel.scrollIntoView({behavior:'smooth',block:'start'});
}
function closeForm(){panel.hidden=true;editing=null;inform('')}
async function loadEdits(){
 if(!db)return;
 const {data,error}=await db.from('army_card_edits').select('id,source_name,name,general,points,points_order,fr,en,is_hidden');
 if(error){console.warn('Cartes : modifications indisponibles',error);return}
 edits=data||[];
}
async function saveEdit(e){
 e.preventDefault();
 if(!admin||!db)return;
 const name=valid($('cards-name').value),general=valid($('cards-general').value),points=Number($('cards-points').value),fr=valid($('cards-fr').value)||null,en=valid($('cards-en').value)||null;
 if(!name||!general||!Number.isInteger(points)||points<0||points>2000){inform('Renseigne un nom, un général et un coût valide.',true);return}
 if((fr&&!safeUrl(fr))||(en&&!safeUrl(en))){inform('Les liens VF et VO doivent commencer par https:// ou http://.',true);return}
 if(!editing&&all.some(x=>x.name.toLocaleLowerCase('fr')===name.toLocaleLowerCase('fr'))){inform('Une carte porte déjà ce nom.',true);return}
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
  await loadEdits();merge();render();closeForm();
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
  }else res=await db.from('army_card_edits').delete().eq('id',item._editId);
  if(res.error)throw res.error;
  await loadEdits();merge();render();closeForm();
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
    const {data:profile,error:profileError}=await db.from('profiles').select('role').eq('id',uid).maybeSingle();
    if(profileError)throw profileError;
    allowed=profile?.role==='admin';
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
  merge();render();
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
 await loadEdits();merge();render();updateRestore();inform('Carte restaurée.');
});
box.addEventListener('click',e=>{const b=e.target.closest('[data-card-key]');if(!b||!admin)return;const card=all.find(x=>(x._source?'base:'+x._source:'custom:'+x.id)===b.dataset.cardKey);if(card)openForm(card)});
init();
})();