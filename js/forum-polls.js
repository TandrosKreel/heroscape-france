/* Sondages du forum : édition et vote définitif. */
window.HeroscapePolls=(()=>{
 const db=window.supabaseClient;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const drafts=new WeakMap();
 function editor(host){
  if(!host)return null;
  const wrap=document.createElement('section');wrap.className='forum-poll-editor';
  wrap.innerHTML='<button type="button" class="btn" data-poll-toggle>📊 Ajouter un sondage</button><div data-poll-fields hidden><label>Question du sondage<input data-poll-question maxlength="300" placeholder="Pose ta question…" /></label><div data-poll-options></div><button type="button" class="btn" data-poll-add>+ Ajouter une réponse</button><label>Nombre maximum de réponses par membre<select data-poll-max></select></label><p class="count">2 à 12 réponses. Chaque membre ne peut voter qu’une fois ; son vote est définitif. Dès le premier vote, le sondage est verrouillé.</p><button type="button" class="btn" data-poll-remove>Retirer le sondage</button></div>';
  host.append(wrap);
  const fields=wrap.querySelector('[data-poll-fields]'),options=wrap.querySelector('[data-poll-options]'),max=wrap.querySelector('[data-poll-max]');
  const add=(value='')=>{if(options.children.length>=12)return;const line=document.createElement('div');line.className='forum-poll-option-row';line.innerHTML='<input maxlength="150" placeholder="Réponse '+(options.children.length+1)+'" aria-label="Réponse du sondage"><button type="button" class="btn" aria-label="Supprimer cette réponse">×</button>';line.querySelector('input').value=value;line.querySelector('button').onclick=()=>{if(options.children.length>2){line.remove();refresh()}};options.append(line);refresh()};
  function refresh(){const old=Number(max.value)||1;max.innerHTML=Array.from({length:options.children.length},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+' réponse'+(i?'s':'')+'</option>').join('');max.value=String(Math.min(old,options.children.length));wrap.querySelector('[data-poll-add]').disabled=options.children.length>=12}
  wrap.querySelector('[data-poll-toggle]').onclick=()=>{fields.hidden=!fields.hidden;if(!fields.hidden&&!options.children.length){add();add()}};
  wrap.querySelector('[data-poll-add]').onclick=()=>add();
  wrap.querySelector('[data-poll-remove]').onclick=()=>{fields.hidden=true;options.replaceChildren();wrap.querySelector('[data-poll-question]').value=''};
  const api={get(){if(fields.hidden)return null;const question=wrap.querySelector('[data-poll-question]').value.trim(),answers=[...options.querySelectorAll('input')].map(e=>e.value.trim());if(question.length<3||question.length>300||answers.length<2||answers.some(a=>!a||a.length>150))throw Error('Indique une question (3 à 300 caractères) et au moins deux réponses (150 caractères maximum).');return {question,options:answers,max:Number(max.value)}}};
  drafts.set(wrap,api);return api;
 }
 async function save(postId,poll){if(!poll)return;const {error}=await db.rpc('forum_poll_save',{p_post_id:postId,p_question:poll.question,p_options:poll.options,p_max_choices:poll.max});if(error)throw error}
 async function show(container,postIds,firstPostId=null){
  const ids=[...new Set(postIds.filter(Boolean))];if(firstPostId&&!ids.includes(firstPostId))ids.push(firstPostId);if(!ids.length)return;
  const {data:polls,error}=await db.from('forum_polls').select('*').in('post_id',ids);if(error){console.warn('Sondages :',error);return}
  if(!polls?.length)return;
  const {data:votes,error:voteError}=await db.from('forum_poll_votes').select('poll_id,user_id,selections').in('poll_id',polls.map(p=>p.id));if(voteError){console.warn(voteError);return}
  const {data:auth}=await db.auth.getUser(),uid=auth?.user?.id;
  const {data:postOwners}=await db.from('posts').select('id,user_id').in('id',ids);
  const owners=new Map((postOwners||[]).map(p=>[p.id,p.user_id]));
  for(const poll of polls){
   const target=poll.post_id===firstPostId&&container.querySelector('[data-forum-topic-poll]')?container.querySelector('[data-forum-topic-poll]'):container.querySelector('#post-'+poll.post_id+' .forum-message-body');
   if(!target)continue;
   const rows=(votes||[]).filter(v=>v.poll_id===poll.id),mine=rows.find(v=>v.user_id===uid),locked=rows.length>0;
   const card=document.createElement('section');card.className='forum-poll-card';
   const opts=poll.options;
   const counts=opts.map((_,i)=>rows.filter(v=>v.selections.includes(i)).length),total=rows.length;
   const results=()=>opts.map((o,i)=>'<div class="forum-poll-result"><div class="forum-poll-result-line"><span>'+esc(o)+'</span><strong>'+counts[i]+' ('+(total?Math.round(counts[i]/total*100):0)+' %)</strong></div><div class="forum-poll-track"><div style="width:'+(total?counts[i]/total*100:0)+'%"></div></div></div>').join('');
   card.innerHTML='<div class="forum-poll-title">📊 Sondage</div><h3>'+esc(poll.question)+'</h3><p class="count">'+(poll.max_choices===1?'Une réponse autorisée':'Jusqu’à '+poll.max_choices+' réponses autorisées')+' · '+total+' participant'+(total>1?'s':'')+'</p>'+
    (mine?'<p class="forum-poll-locked">✓ Tu as voté. Ton vote est définitif.</p>'+results():'<form class="forum-poll-vote">'+opts.map((o,i)=>'<label class="forum-poll-choice"><input type="'+(poll.max_choices===1?'radio':'checkbox')+'" name="poll-'+poll.id+'" value="'+i+'"> <span>'+esc(o)+'</span></label>').join('')+'<button type="submit" class="btn">Voter</button><p class="count">Après validation, ton vote ne pourra plus être modifié.</p></form><details class="forum-poll-results"><summary>Voir les résultats</summary>'+results()+'</details>')+
    (uid&&uid===owners.get(poll.post_id)&&!locked?'<button type="button" class="btn" data-poll-edit>Modifier le sondage</button>':'');
   target.prepend(card);
   const form=card.querySelector('form');
   if(form){
    form.onchange=()=>{const checked=[...form.querySelectorAll('input:checked')];if(checked.length>poll.max_choices){checked[checked.length-1].checked=false;alert('Maximum '+poll.max_choices+' réponses.')}};
    form.onsubmit=async e=>{e.preventDefault();const selected=[...form.querySelectorAll('input:checked')].map(x=>Number(x.value));if(!selected.length||selected.length>poll.max_choices)return;if(!confirm('Confirmer ton vote ? Il sera définitif.'))return;const b=form.querySelector('button');b.disabled=true;const {error:err}=await db.rpc('forum_poll_vote',{p_poll_id:poll.id,p_selections:selected});if(err){alert(err.message);b.disabled=false;return}location.reload()};
   }
   card.querySelector('[data-poll-edit]')?.addEventListener('click',async()=>{
    const question=prompt('Question du sondage',poll.question);if(question===null)return;
    const answerText=prompt('Réponses (une par ligne)',poll.options.join('\n'));if(answerText===null)return;
    const answers=answerText.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const max=Number(prompt('Nombre maximum de réponses par membre',String(poll.max_choices)));if(!Number.isInteger(max))return;
    try{await save(poll.post_id,{question,options:answers,max});location.reload()}catch(e){alert(e.message)}
   });
  }
 }
 return {editor,save,show};
})();
