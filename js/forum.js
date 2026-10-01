const cats = [
  ["general", "💬", "Général", "Discussions générales autour d'Heroscape"],
  ["regles", "📖", "Règles et questions", "Questions de règles, précisions et aides de jeu"],
  ["scenarios", "⚔️", "Scénarios et parties", "Scénarios, comptes-rendus et idées de parties"],
  ["cartes", "🗺️", "Cartes et VirtualScape", "Maps, créations de cartes et fichiers VirtualScape"],
  ["figurines", "🧙", "Figurines et armées", "Figurines, extensions, armées et stratégies"],
  ["traductions", "FR", "Traductions et ressources VF", "Traductions, aides et ressources francophones"],
  ["tournois", "🏆", "Tournois et rencontres", "Tournois, rencontres et organisation de parties"],
  ["customs", "🛠️", "Customs et créations", "Créations de figurines, cartes et règles maison"]
];

function catName(id) {
  const cat = cats.find(c => c[0] === id);
  return cat ? cat[2] : id;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getTopics() {
  if (!window.supabaseClient) {
    console.error("Supabase n'est pas initialisé.");
    return [];
  }

  const { data, error } = await window.supabaseClient
    .from("topics")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erreur Supabase :", error);
    return [];
  }

  return data || [];
}

async function getReplies(topicId) {
  if (!window.supabaseClient) {
    return [];
  }

  const { data, error } = await window.supabaseClient
    .from("replies")
    .select("*")
    .eq("topic_id", topicId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erreur réponses Supabase :", error);
    return [];
  }

  return data || [];
}

async function addTopic(cat, title, author, body) {
  const { data, error } = await window.supabaseClient
    .from("topics")
    .insert({
      cat: cat,
      title: title,
      author: author,
      body: body
    })
    .select()
    .single();

  if (error) {
    console.error("Erreur création sujet :", error);
    return null;
  }

  return data;
}

async function addReply(topicId, author, body) {
  const { data, error } = await window.supabaseClient
    .from("replies")
    .insert({
      topic_id: topicId,
      author: author,
      body: body
    })
    .select()
    .single();

  if (error) {
    console.error("Erreur création réponse :", error);
    return null;
  }

  return data;
}

const categoriesBox = document.getElementById("categories");

if (categoriesBox) {
  categoriesBox.innerHTML = cats.map(c => `
    <a class="card forumrow" href="categorie.html?cat=${encodeURIComponent(c[0])}">
      <div>
        <h3>${c[1]} ${esc(c[2])}</h3>
        <div class="count">${esc(c[3])}</div>
      </div>
    </a>
  `).join("");
}
