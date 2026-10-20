(()=>{'use strict';
let basePromise=null;
const sort=(a,b)=>a.general.localeCompare(b.general,'fr')||a.points-b.points||Number(a.points_order||0)-Number(b.points_order||0)||a.name.localeCompare(b.name,'fr');
const idOf=card=>card.catalog_id||(card._source?'base:'+card._source:'custom:'+card.id);
function merge(base,edits){
 const overrides=new Map(edits.filter(e=>e.source_name).map(e=>[e.source_name,e]));
 const all=base.map(b=>{const e=overrides.get(b.name);return {...b,...(e||{}),_source:b.name,_editId:e?.id||null,catalog_id:'base:'+b.name}});
 all.push(...edits.filter(e=>!e.source_name).map(e=>({...e,_source:null,_editId:e.id,catalog_id:'custom:'+e.id})));
 all.sort(sort);return {active:all.filter(c=>!c.is_hidden),all};
}
async function load(db){
 if(!basePromise)basePromise=fetch('data/cards.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Catalogue introuvable');return r.json()}).catch(err=>{basePromise=null;throw err});
 const base=await basePromise;
 if(!db)throw Error('Connexion indisponible');
 const {data,error}=await db.from('army_card_edits').select('id,source_name,name,general,points,points_order,fr,en,is_hidden');
 if(error)throw Error('Synchronisation indisponible : '+error.message);
 return {base,edits:data||[],...merge(base,data||[])};
}
window.HeroscapeCards={merge,load,idOf,sort};
})();