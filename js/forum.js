// ============================================================
// HEROSCAPE FRANCE
// Forum partagé avec Supabase
// ============================================================


// ------------------------------------------------------------
// 1. CATÉGORIES
// Le dernier nombre correspond à l'ID dans Supabase.
// ------------------------------------------------------------

const cats = [
  ["general", "💬", "Général", "Discussions générales autour d'Heroscape", 1],
  ["news", "📰", "Les News d'Heroscape", "Les dernières nouvelles et actualités autour d'Heroscape", 9],
  ["regles", "📖", "Règles et questions", "Questions de règles, précisions et aides de jeu", 2],
  ["scenarios", "⚔️", "Scénarios et parties", "Scénarios, comptes-rendus et idées de parties", 3],
  ["cartes", "🗺️", "Cartes et VirtualScape", "Maps, créations de cartes et fichiers VirtualScape", 4],
  ["figurines", "🧙", "Figurines et armées", "Figurines, extensions, armées et stratégies", 5],
  ["traductions", "FR", "Traductions et ressources VF", "Traductions, aides et ressources francophones", 6],
  ["tournois", "🏆", "Tournois et rencontres", "Tournois, rencontres et organisation de parties", 7],
  ["customs", "🛠️", "Customs et créations", "Créations de figurines, cartes et règles maison", 8]
];


// ------------------------------------------------------------
// 2. OUTILS
// ------------------------------------------------------------

function catName(slug) {
  const cat = cats.find(c => c[0] === slug);
  return cat ? cat[2] : slug;
}

function catId(slug) {
  const cat = cats.find(c => c[0] === slug);
  return cat ? cat[4] : null;
}

function catSlug(id) {
  const cat = cats.find(c => c[4] === Number(id));
  return cat ? cat[0] : null;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSupabase() {
  if (!window.supabaseClient) {
    console.error("Supabase n'est pas initialisé.");
    return null;
  }

  return window.supabaseClient;
}


// ------------------------------------------------------------
// 3. UTILISATEUR CONNECTÉ
// ------------------------------------------------------------

async function getCurrentUser() {
  const supabase = getSupabase();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Erreur utilisateur Supabase :", error);
    return null;
  }

  return user;
}

async function getCurrentProfile() {
  const supabase = getSupabase();

  if (!supabase) {
    return null;
  }

  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, role, created_at")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Erreur profil Supabase :", error);
    return null;
  }

  return data;
}

async function getMessageCounts() {
  const supabase = getSupabase();
  if (!supabase) return {};
  const { data, error } = await supabase.from("posts").select("user_id");
  if (error) { console.error("Erreur comptage messages :", error); return {}; }
  const counts = {};
  (data || []).forEach(post => { counts[post.user_id] = (counts[post.user_id] || 0) + 1; });
  return counts;
}

async function getSignatures(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await getSupabase().from("profiles").select("id, signature").in("id", ids);
  if (error) return {};
  const signatures = {};
  (data || []).forEach(profile => { signatures[profile.id] = profile.signature || ""; });
  return signatures;
}


// ------------------------------------------------------------
// 4. SUJETS
// ------------------------------------------------------------

async function getTopics(category = null) {
  const supabase = getSupabase();

  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("threads")
    .select(`
      id,
      category_id,
      user_id,
      title,
      is_locked,
      is_pinned,
      created_at,
      updated_at,
      profiles (
        username,
        avatar_url
      )
    `)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (category) {
    const categoryId = catId(category);

    if (!categoryId) {
      console.error("Catégorie inconnue :", category);
      return [];
    }

    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erreur chargement sujets :", error);
    return [];
  }

  // Compatibilité avec l'ancienne interface du site.
  return (data || []).map(thread => ({
    ...thread,
    cat: catSlug(thread.category_id),
    author: thread.profiles?.username || "Membre"
  }));
}


// ------------------------------------------------------------
// 5. MESSAGES D'UN SUJET
// ------------------------------------------------------------

async function getReplies(topicId) {
  const supabase = getSupabase();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("posts")
    .select(`
      id,
      thread_id,
      user_id,
      content,
      created_at,
      updated_at,
      profiles (
        username,
        avatar_url
      )
    `)
    .eq("thread_id", topicId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erreur chargement messages :", error);
    return [];
  }

  // Compatibilité avec l'ancienne interface du site.
  return (data || []).map(post => ({
    ...post,
    topic_id: post.thread_id,
    body: post.content,
    author: post.profiles?.username || "Membre",
    avatar_url: post.profiles?.avatar_url || ""
  }));
}


// ------------------------------------------------------------
// 6. CRÉER UN SUJET
// ------------------------------------------------------------

async function addTopic(category, title, author, body) {
  const supabase = getSupabase();

  if (!supabase) {
    return null;
  }

  const user = await getCurrentUser();

  if (!user) {
    alert("Tu dois être connecté pour créer un sujet.");
    window.location.href = "connexion.html";
    return null;
  }

  const categoryId = catId(category);

  if (!categoryId) {
    console.error("Catégorie inconnue :", category);
    return null;
  }

  const cleanTitle = String(title ?? "").trim();
  const cleanBody = String(body ?? "").trim();

  if (cleanTitle.length < 3 || cleanTitle.length > 200) {
    alert("Le titre doit contenir entre 3 et 200 caractères.");
    return null;
  }

  if (cleanBody.length < 1 || cleanBody.length > 20000) {
    alert("Le message doit contenir entre 1 et 20 000 caractères.");
    return null;
  }

  // Création du sujet.
  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .insert({
      category_id: categoryId,
      user_id: user.id,
      title: cleanTitle
    })
    .select()
    .single();

  if (threadError) {
    console.error("Erreur création sujet :", threadError);
    return null;
  }

  // Création du premier message.
  const { error: postError } = await supabase
    .from("posts")
    .insert({
      thread_id: thread.id,
      user_id: user.id,
      content: cleanBody
    });

  if (postError) {
    console.error("Erreur création premier message :", postError);

    // Évite de conserver un sujet vide si le premier message échoue.
    const { error: deleteError } = await supabase
      .from("threads")
      .delete()
      .eq("id", thread.id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error(
        "Impossible de supprimer le sujet incomplet :",
        deleteError
      );
    }

    return null;
  }

  return {
    ...thread,
    cat: category
  };
}


// ------------------------------------------------------------
// 7. RÉPONDRE À UN SUJET
// ------------------------------------------------------------

async function addReply(topicId, author, body) {
  const supabase = getSupabase();

  if (!supabase) {
    return null;
  }

  const user = await getCurrentUser();

  if (!user) {
    alert("Tu dois être connecté pour répondre.");
    window.location.href = "connexion.html";
    return null;
  }

  const cleanBody = String(body ?? "").trim();

  if (cleanBody.length < 1 || cleanBody.length > 20000) {
    alert("Le message doit contenir entre 1 et 20 000 caractères.");
    return null;
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      thread_id: Number(topicId),
      user_id: user.id,
      content: cleanBody
    })
    .select()
    .single();

  if (error) {
    console.error("Erreur création réponse :", error);
    return null;
  }

  // Met à jour la date d'activité du sujet.
  const { error: updateError } = await supabase
    .from("threads")
    .update({
      updated_at: new Date().toISOString()
    })
    .eq("id", Number(topicId));

  if (updateError) {
    console.error(
      "Erreur mise à jour de la date du sujet :",
      updateError
    );
  }

  return {
    ...data,
    topic_id: data.thread_id,
    body: data.content
  };
}


// ------------------------------------------------------------
// 8. DÉCONNEXION
// ------------------------------------------------------------

async function logout() {
  const supabase = getSupabase();

  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Erreur déconnexion :", error);
    return;
  }

  window.location.href = "index.html";
}


// ------------------------------------------------------------
// 9. AFFICHAGE DES CATÉGORIES SUR LA PAGE D'ACCUEIL
// ------------------------------------------------------------

const categoriesBox = document.getElementById("categories");

if (categoriesBox) {
  categoriesBox.innerHTML = cats.map(c => `
    <a
      class="card forumrow"
      href="categorie.html?cat=${encodeURIComponent(c[0])}"
    >
      <div>
        <h3>${c[1]} ${esc(c[2])}</h3>
        <div class="count">${esc(c[3])}</div>
      </div>
    </a>
  `).join("");
}


// ------------------------------------------------------------
// 10. BLOC COMPTE COMMUN À TOUTES LES PAGES
// ------------------------------------------------------------
async function renderGlobalAccount() {
  const headerContainer = document.querySelector("header .container");
  if (!headerContainer) return;
  let account = document.getElementById("account");
  if (!account) {
    account = document.createElement("div");
    account.id = "account";
    account.className = "account-panel global-account";
    headerContainer.appendChild(account);
  } else {
    account.classList.add("account-panel","global-account");
  }
  const profile = await getCurrentProfile();
  if (!profile) {
    account.innerHTML = '<a class="btn compact-login" href="connexion.html">Connexion</a>';
    return;
  }
  const avatar = profile.avatar_url
    ? '<img class="account-avatar" src="' + esc(profile.avatar_url) + '" alt="">'
    : '<span class="account-avatar account-avatar-default">' + esc((profile.username || "M").charAt(0).toUpperCase()) + '</span>';
  account.innerHTML =
    '<a class="account-user" href="profil.html" title="Mon profil">' + avatar + '<strong>' + esc(profile.username) + '</strong></a>' +
    '<a class="account-icon" href="messages.html" title="Messages privés" aria-label="Messages privés">✉</a>' +
    '<a class="account-icon" href="notifications.html" title="Notifications" aria-label="Notifications">🔔</a>' +
    '<a class="account-icon" href="profil.html" title="Paramètres du profil" aria-label="Paramètres">⚙</a>' +
    '<button class="account-logout" type="button" data-global-logout>Se déconnecter</button>';
  account.querySelector("[data-global-logout]")?.addEventListener("click", logout);
}
document.addEventListener("DOMContentLoaded", renderGlobalAccount);
