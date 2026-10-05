// ============================================================
// HEROSCAPE FRANCE
// Forum partagé avec Supabase
// ============================================================


// ------------------------------------------------------------
// 1. CATÉGORIES — chargées dynamiquement depuis Supabase
// ------------------------------------------------------------

let cats = [];
let categoriesPromise = null;

async function loadCategories(force = false) {
  if (!force && cats.length) return cats;
  if (!force && categoriesPromise) return categoriesPromise;

  categoriesPromise = (async () => {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, name, description, icon, display_order")
      .order("display_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      console.error("Erreur chargement catégories :", error);
      return [];
    }

    cats = (data || []).map(cat => [
      cat.slug,
      cat.icon || "💬",
      cat.name,
      cat.description || "",
      cat.id
    ]);

    return cats;
  })();

  const result = await categoriesPromise;
  categoriesPromise = null;
  return result;
}

async function getCategoryBySlug(slug) {
  await loadCategories();
  return cats.find(c => c[0] === slug) || null;
}

async function getCategoryById(id) {
  await loadCategories();
  return cats.find(c => c[4] === Number(id)) || null;
}

async function catName(slug) {
  const cat = await getCategoryBySlug(slug);
  return cat ? cat[2] : slug;
}

async function catId(slug) {
  const cat = await getCategoryBySlug(slug);
  return cat ? cat[4] : null;
}

async function catSlug(id) {
  const cat = await getCategoryById(id);
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
// 2 bis. SÉCURITÉ DES SESSIONS
// ------------------------------------------------------------

const SESSION_INACTIVITY_MS = 24 * 60 * 60 * 1000;
const SESSION_ACTIVITY_KEY = "heroscape_last_activity";

function currentSessionId(session) {
  try {
    const payload = JSON.parse(atob(session.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.session_id || null;
  } catch (_) {
    return null;
  }
}

async function enforceForumSession() {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    localStorage.removeItem(SESSION_ACTIVITY_KEY);
    return;
  }

  const now = Date.now();
  const lastActivity = Number(localStorage.getItem(SESSION_ACTIVITY_KEY) || 0);

  if (lastActivity && now - lastActivity > SESSION_INACTIVITY_MS) {
    localStorage.removeItem(SESSION_ACTIVITY_KEY);
    await supabase.auth.signOut();
    window.location.replace("connexion.html?v=20261005-3&reason=inactive");
    return;
  }

  const sessionId = currentSessionId(session);
  if (sessionId) {
    const { data: valid, error } = await supabase.rpc("is_current_forum_session", {
      p_session_id: sessionId
    });

    // Si la fonction n'est pas encore installée, le forum reste utilisable.
    if (!error && valid === false) {
      localStorage.removeItem(SESSION_ACTIVITY_KEY);
      // Déconnexion locale uniquement : une déconnexion globale invaliderait
      // aussi la nouvelle session qui doit rester active sur l'autre appareil.
      await supabase.auth.signOut({ scope: "local" });
      window.location.replace("connexion.html?v=20261005-3&reason=other-device");
      return;
    }
  }

  // Une visite/actualisation du forum renouvelle les 24 h d'inactivité.
  localStorage.setItem(SESSION_ACTIVITY_KEY, String(now));
}

enforceForumSession();

// ------------------------------------------------------------
// 3. UTILISATEUR CONNECTÉ
// ------------------------------------------------------------

async function getCurrentUser() {
  const supabase = getSupabase();

  if (!supabase) {
    return null;
  }

  // getSession() permet de détecter proprement un visiteur anonyme
  // sans provoquer l'erreur normale "Auth session missing!" de getUser().
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Erreur session Supabase :", error);
    return null;
  }

  if (!session) {
    return null;
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Erreur utilisateur Supabase :", userError);
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
    const categoryId = await catId(category);

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
    cat: (await catSlug(thread.category_id)),
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

  const categoryId = await catId(category);

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
  (async () => {
    categoriesBox.innerHTML = '<div class="empty">Chargement des catégories…</div>';
    const loadedCats = await loadCategories();
    categoriesBox.innerHTML = loadedCats.length ? loadedCats.map(c => `
      <a
        class="card forumrow"
        href="categorie.html?cat=${encodeURIComponent(c[0])}"
      >
        <div>
          <h3>${c[1]} ${esc(c[2])}</h3>
          <div class="count">${esc(c[3])}</div>
        </div>
      </a>
    `).join("") : '<div class="empty">Aucune catégorie disponible.</div>';
  })();
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
    '<a class="account-icon account-message-icon" href="messages.html" title="Messages privés" aria-label="Messages privés">✉<span class="message-badge" data-message-badge hidden></span></a>' +
    '<a class="account-icon" href="notifications.html" title="Notifications" aria-label="Notifications">🔔</a>' +
    '<button class="account-logout" type="button" data-global-logout>Se déconnecter</button>';
  account.querySelector("[data-global-logout]")?.addEventListener("click", logout);
  const { count: unreadCount, error: unreadError } = await window.supabaseClient
    .from("private_messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", profile.id)
    .eq("is_read", false)
    .eq("recipient_deleted", false);
  const badge = account.querySelector("[data-message-badge]");
  if (!unreadError && badge && unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    badge.hidden = false;
  }
}
document.addEventListener("DOMContentLoaded", renderGlobalAccount);
