/* Pagination compacte et saut direct de page pour les catégories et sujets. */
(function(){
  function numbers(total){
    if(total<=5)return Array.from({length:total},(_,i)=>i+1);
    return [1,2,3,null,total-1,total];
  }
  function links(total,current,url,extraClass=''){
    if(total<=1)return '';
    return numbers(total).map(n=>{
      if(n!==null)return '<a class="'+(n===current?'active ':'')+extraClass+'" href="'+url(n)+'"'+(n===current?' aria-current="page"':'')+'>'+n+'</a>';
      return '<form class="pagination-jump" data-page-total="'+total+'" data-page-url="'+encodeURIComponent(url('__PAGE__'))+'" aria-label="Aller directement à une page"><input type="number" min="1" max="'+total+'" step="1" inputmode="numeric" aria-label="Numéro de page" placeholder="…" title="Saisir un numéro de page puis appuyer sur Entrée" required><button type="submit" title="Valider le numéro de page" aria-label="Valider le numéro de page">↵</button></form>';
    }).join('');
  }
  document.addEventListener('submit',function(event){
    const form=event.target.closest('.pagination-jump');
    if(!form)return;
    event.preventDefault();
    const input=form.querySelector('input'),total=Number(form.dataset.pageTotal),raw=input.value.trim(),page=Number(raw);
    if(!/^\d+$/.test(raw)||!Number.isSafeInteger(page)||page<1||page>total){input.value='';input.focus();return}
    if(window.confirm('Aller à la page '+page+' du forum ?')){
      const template=decodeURIComponent(form.dataset.pageUrl);
      window.location.assign(template.replace('__PAGE__',String(page)));
    }else{input.value='';input.focus()}
  });
  window.heroscapePagination={links};
})();
