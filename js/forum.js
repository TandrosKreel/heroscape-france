
const cats = [
 ["general","💬","Général","Discussions générales autour d'Heroscape"],
 ["regles","📖","Règles et questions","Questions de règles, précisions et aides de jeu"],
 ["scenarios","⚔️","Scénarios et parties","Scénarios, comptes-rendus et idées de parties"],
 ["cartes","🗺️","Cartes et VirtualScape","Maps, créations de cartes et fichiers VirtualScape"],
 ["figurines","🧙","Figurines et armées","Figurines, extensions, armées et stratégies"],
 ["traductions","🇫🇷","Traductions et ressources VF","Traductions, aides et ressources francophones"],
 ["tournois","🏆","Tournois et rencontres","Tournois, rencontres et organisation de parties"],
 ["customs","🛠️","Customs et créations","Créations de figurines, cartes et règles maison"]
];
const seed = [
 {id:1,cat:"general",title:"Bienvenue sur le forum Heroscape France",author:"Admin",date:"Archive",body:"Bienvenue dans la reconstruction du forum. Cette discussion sert de point de départ pour les échanges."},
 {id:2,cat:"regles",title:"Questions sur les règles",author:"Admin",date:"Archive",body:"Espace prévu pour poser les questions de règles et partager les précisions utiles."},
 {id:3,cat:"scenarios",title:"Vos scénarios et comptes-rendus",author:"Admin",date:"Archive",body:"Partagez ici vos scénarios et racontez vos parties."}
];
function getTopics(){let x=localStorage.getItem("hs_topics"); if(!x){localStorage.setItem("hs_topics",JSON.stringify(seed));return seed} return JSON.parse(x)}
function catName(id){return cats.find(c=>c[0]===id)?.[2]||id}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
const box=document.getElementById("categories");
if(box) box.innerHTML=cats.map(c=>`<a class="card forumrow" href="categorie.html?cat=${c[0]}"><div><h3>${c[1]} ${c[2]}</h3><div class="count">${c[3]}</div></div><div class="icon">›</div></a>`).join("");
