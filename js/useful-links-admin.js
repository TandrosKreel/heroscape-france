/* Liens utiles : lecture publique, ajout/modification/suppression réservés aux administrateurs (RLS Supabase). */
(()=>{'use strict';
const db=window.supabaseClient;
const $=id=>document.getElementById(id);
const grid=$('useful-links-grid'),panel=$('useful-links-admin-panel'),form=$('useful-links-form'),notice=$('useful-links-notice'),status=$('useful-links-status');
if(!grid||!db)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=s=>{try{const u=new URL(String(s||''));return /^https?:$/.test(u.protocol)?u.href:''}catch{return ''}};
let links=[],admin=false,editingId=null,authSerial=0,loading=null,loaded=false;
const message=(text,error=false)=>{notice.textContent=text;notice.style.color=error?'#ffb9b9':'#bce6c2'};
const close=()=>{panel.hidden=true;editingId=null;form.reset();message('')};
function open(item=null){
 if(!admin)return;
 editingId=item?.id??null;
 $('useful-links-form-heading').textContent=item?'Modifier ce lien':'Ajouter un lien utile';
 $('useful-links-title').value=item?.title??'';
 $('useful-links-url').value=item?.url??'';
 $('useful-links-description').value=item?.description??'';
 $('useful-links-cta').value=item?.cta??'Ouvrir le lien ↗';
 panel.hidden=false;
 panel.scrollIntoView({behavior:'smooth',block:'start'});
 $('useful-links-title').focus({preventScroll:true});
}
function render(){
 if(!loaded)return;
 const cards=links.map(item=>{
  const url=safeUrl(item.url);
  const title='<h3>'+esc(item.title)+'</h3>';
  const description='<p>'+esc(item.description)+'</p>';
  const cta=url?'<span class="link-cta">'+esc(item.cta)+'</span>':'';
  // Même carte entièrement cliquable que sur la page d'origine pour les visiteurs.
  if(!admin&&url)return '<a class="card useful-link useful-link-entry" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+title+description+cta+'</a>';
  return '<article class="card useful-link useful-link-entry">'+title+description+
   (url?'<a class="link-cta" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(item.cta)+'</a>':'')+
   (admin?'<div class="useful-link-admin-actions"><button type="button" data-edit="'+item.id+'">Modifier</button><button type="button" class="useful-link-delete" data-delete="'+item.id+'">Supprimer</button></div>':'')+
   '</article>';
 });
 // Les deux liens initiaux et les nouveaux proviennent tous de Supabase.
 // Garder les six cases historiques : les cases libres restent "Futur lien".
 const empty=Math.max(0,6-links.length);
 if(admin)cards.push('<button type="button" id="useful-links-add" class="card useful-link useful-link-add" aria-label="Ajouter un lien utile"><span class="useful-link-add-icon">＋</span><span>Ajouter un lien utile</span></button>');
 for(let i=0;i<Math.max(0,empty-(admin?1:0));i++)cards.push('<div class="card useful-link placeholder-link"><h3>＋ Futur lien</h3><p>Emplacement réservé pour une prochaine ressource Heroscape.</p></div>');
 grid.innerHTML=cards.join('');
 grid.hidden=false;
 status.textContent='';
}
async function load(){
 if(loading)return loading;
 loading=(async()=>{
  const {data,error}=await db.from('useful_links').select('id,title,description,url,cta').order('id',{ascending:true});
  if(error)throw error;
  links=data||[];
  loaded=true;
  render();
 })();
 try{await loading}finally{loading=null}
}
async function checkAdmin(){
 const serial=++authSerial;
 try{
  const {data,error}=await db.auth.getSession();
  if(error)throw error;
  const uid=data?.session?.user?.id;
  let allowed=false;
  if(uid){
   const {data:profile,error:profileError}=await db.from('profiles').select('role').eq('id',uid).maybeSingle();
   if(profileError)throw profileError;
   allowed=profile?.role==='admin';
  }
  if(serial!==authSerial)return;
  admin=allowed;
  if(!admin)close();
  render();
 }catch(err){console.warn('Vérification des droits Liens utiles :',err)}
}
grid.addEventListener('click',async event=>{
 const add=event.target.closest('#useful-links-add');
 if(add){open();return}
 const edit=event.target.closest('[data-edit]');
 if(edit){open(links.find(item=>String(item.id)===edit.dataset.edit));return}
 const del=event.target.closest('[data-delete]');
 if(!del||!admin)return;
 const item=links.find(item=>String(item.id)===del.dataset.delete);
 if(!item||!confirm('Supprimer définitivement le lien « '+item.title+' » ?'))return;
 del.disabled=true;
 const {error}=await db.from('useful_links').delete().eq('id',item.id);
 if(error){alert('Suppression impossible : '+error.message);del.disabled=false;return}
 if(editingId===item.id)close();
 try{await load()}catch(err){alert('Actualisation impossible : '+err.message)}
});
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(!admin)return;
 const title=$('useful-links-title').value.trim(),url=safeUrl($('useful-links-url').value.trim());
 const description=$('useful-links-description').value.trim(),cta=$('useful-links-cta').value.trim();
 if(title.length<2||title.length>100||!url||url.length>2000||description.length>600||cta.length<2||cta.length>100){
  message('Vérifie le titre, l’adresse du site (https://), la description et le texte du bouton.',true);return;
 }
 const submit=$('useful-links-submit');submit.disabled=true;
 const values={title,url,description,cta};
 const query=editingId===null?db.from('useful_links').insert(values):db.from('useful_links').update(values).eq('id',editingId);
 try{
  const {error}=await query;
  if(error)throw error;
  close();
  await load();
 }catch(err){message('Enregistrement impossible : '+err.message,true)}
 finally{submit.disabled=false}
});
$('useful-links-cancel').addEventListener('click',close);
if(db.auth?.onAuthStateChange)db.auth.onAuthStateChange(()=>{setTimeout(()=>{void checkAdmin()},0)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void load().catch(err=>console.warn('Liens utiles :',err))});
void load().catch(err=>{console.warn('Liens utiles :',err);status.textContent='Impossible de charger les liens pour le moment. Réessaie en actualisant la page.'});
void checkAdmin();
})();