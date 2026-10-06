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

// État de lecture synchronisé dans Supabase pour être identique sur tous les appareils.
let threadReadUserId = null;
let threadReadStates = {};

async function loadThreadReadStates(threadIds) {
  const ids = [...new Set((threadIds || []).map(Number).filter(Boolean))];
  threadReadStates = {};
  if (!threadReadUserId || !ids.length) return threadReadStates;

  const { data, error } = await getSupabase()
    .from("thread_reads")
    .select("thread_id,last_read_at")
    .eq("user_id", threadReadUserId)
    .in("thread_id", ids);

  if (error) {
    console.error("Erreur chargement états de lecture :", error);
    return threadReadStates;
  }

  for (const row of (data || [])) threadReadStates[row.thread_id] = row.last_read_at;
  return threadReadStates;
}

async function markThreadRead(threadId, lastPostCreatedAt) {
  if (!threadReadUserId || !threadId || !lastPostCreatedAt) return false;

  const { error } = await getSupabase()
    .from("thread_reads")
    .upsert({
      user_id: threadReadUserId,
      thread_id: Number(threadId),
      last_read_at: lastPostCreatedAt
    }, { onConflict: "user_id,thread_id" });

  if (error) {
    console.error("Erreur enregistrement lecture du sujet :", error);
    return false;
  }

  threadReadStates[Number(threadId)] = lastPostCreatedAt;
  return true;
}

function isThreadUnread(threadId, updatedAt) {
  if (!threadId) return false;
  const seen = threadReadStates[Number(threadId)];
  if (!seen) return true;
  if (!updatedAt) return false;

  const updatedMs = new Date(updatedAt).getTime();
  const seenMs = new Date(seen).getTime();
  if (!Number.isFinite(updatedMs) || !Number.isFinite(seenMs)) return true;
  return updatedMs > seenMs;
}

function readDiceHtml(unread, extraClass = "", ownLastPost = false) {
  const src = ownLastPost
    ? "De%20rouge%20post.png"
    : (unread ? "De%20bleu%20non%20lu.png" : "De%20bleu%20lu.png");
  const label = ownLastPost ? "Dernier message publié par vous" : (unread ? "Non lu" : "Lu");
  return '<img class="read-die ' + extraClass + '" src="' + src + '" alt="' + label + '" title="' + label + '">';
}

async function getThreadLastAuthors(threadIds) {
  const ids = [...new Set((threadIds || []).map(Number).filter(Boolean))];
  if (!ids.length) return {};
  const supabase = getSupabase();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("posts")
    .select("thread_id,user_id,created_at")
    .in("thread_id", ids)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur dernier auteur des sujets :", error);
    return {};
  }

  const result = {};
  for (const post of (data || [])) {
    if (!(post.thread_id in result)) result[post.thread_id] = post.user_id;
  }
  return result;
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

  threadReadUserId = user?.id || null;
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
  const result = [];
  for (const thread of (data || [])) {
    result.push({
      ...thread,
      cat: await catSlug(thread.category_id),
      author: thread.profiles?.username || "Membre"
    });
  }
  return result;
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
  const { data: firstPost, error: postError } = await supabase
    .from("posts")
    .insert({
      thread_id: thread.id,
      user_id: user.id,
      content: cleanBody
    })
    .select("created_at")
    .single();

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

  // Un sujet que l'utilisateur vient lui-même de publier est déjà lu pour lui.
  await markThreadRead(thread.id, firstPost.created_at);

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

  // Met à jour la date d'activité avec la date réelle du message enregistrée par Supabase.
  // Ainsi tous les comptes comparent exactement la même horloge serveur.
  const { error: updateError } = await supabase
    .from("threads")
    .update({
      updated_at: data.created_at
    })
    .eq("id", Number(topicId));

  if (updateError) {
    console.error(
      "Erreur mise à jour de la date du sujet :",
      updateError
    );
  }

  // Le message que l'utilisateur vient lui-même de publier ne doit pas rendre le sujet non lu.
  await markThreadRead(Number(topicId), data.created_at);

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
      <div class="card forumrow category-${esc(c[0])}">
        <a class="category-icon category-nav-link" href="categorie.html?cat=${encodeURIComponent(c[0])}" aria-label="Ouvrir la catégorie ${esc(c[2])}">${c[1]}</a>
        <div class="category-content">
          <a class="category-title-link category-nav-link" href="categorie.html?cat=${encodeURIComponent(c[0])}"><h3>${esc(c[2])}</h3></a>
          <div class="count">${esc(c[3])}</div>
          <div class="category-last-activity" data-category-activity="${esc(c[0])}"></div>
        </div>
      </div>
    `).join("") : '<div class="empty">Aucune catégorie disponible.</div>';

    const user = await getCurrentUser();
    if (user && loadedCats.length) {
      const { data: threads } = await getSupabase()
        .from("threads")
        .select("id,category_id,user_id,created_at,updated_at");
      const threadIds = (threads || []).map(t => t.id);
      await loadThreadReadStates(threadIds);
      const lastAuthors = await getThreadLastAuthors(threadIds);
      const { data: latestPosts } = threadIds.length ? await getSupabase()
        .from("posts")
        .select("id,thread_id,user_id,created_at,profiles(username)")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false }) : { data: [] };

      const latestPostByThread = {};
      for (const post of (latestPosts || [])) {
        if (!latestPostByThread[post.thread_id]) latestPostByThread[post.thread_id] = post;
      }

      for (const cat of loadedCats) {
        const catThreads = (threads || []).filter(t => Number(t.category_id) === Number(cat[4]));
        const hasUnread = catThreads.some(t => isThreadUnread(
          t.id,
          latestPostByThread[t.id]?.created_at || t.updated_at || t.created_at
        ));
        // Le sujet affiché comme dernière activité doit être choisi à partir du
        // dernier message réel, pas de threads.updated_at qui peut être décalé.
        const latestThread = [...catThreads].sort((a, b) => {
          const aDate = latestPostByThread[a.id]?.created_at || a.created_at;
          const bDate = latestPostByThread[b.id]?.created_at || b.created_at;
          return new Date(bDate) - new Date(aDate);
        })[0];
        const slot = categoriesBox.querySelector('[data-category-activity="' + CSS.escape(cat[0]) + '"]');
        if (!slot || !latestThread) continue;

        const latestPost = latestPostByThread[latestThread.id];
        const latestAuthor = latestPost?.user_id || lastAuthors[latestThread.id] || latestThread.user_id;
        const ownLastPost = latestAuthor === user.id && !hasUnread;
        const authorName = latestPost?.profiles?.username || (latestAuthor === user.id ? "vous" : "Membre");
        const activityDate = latestPost?.created_at || latestThread.updated_at || latestThread.created_at;
        const formattedDate = new Intl.DateTimeFormat("fr-FR", {
          day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"
        }).format(new Date(activityDate));

        const lastMessageUrl = "sujet.html?id=" + encodeURIComponent(latestThread.id) + (latestPost?.id ? "#post-" + encodeURIComponent(latestPost.id) : "#last-message");
        slot.innerHTML =
          '<a class="category-last-link" href="' + lastMessageUrl + '" title="Aller au dernier message">' +
          readDiceHtml(hasUnread, "category-activity-die", ownLastPost) +
          '<span class="category-activity-text">Posté par <strong>' + esc(authorName) + '</strong> à ' + esc(formattedDate) + '</span></a>';
      }
    }
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
  const pageName = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const isForumHome = pageName === "" || pageName === "index.html";
  const isCategoryPage = pageName === "categorie.html";
  const readActionLabel = isForumHome
    ? "Marquer tous les messages comme lus"
    : (isCategoryPage ? "Marquer tous ces sujets comme lus" : "");

  account.innerHTML =
    '<a class="account-user" href="profil.html" title="Mon profil">' + avatar + '<strong>' + esc(profile.username) + '</strong></a>' +
    '<a class="account-icon account-message-icon" href="messages.html" title="Messages privés" aria-label="Messages privés">✉<span class="message-badge" data-message-badge hidden></span></a>' +
    '<a class="account-icon" href="notifications.html" title="Notifications" aria-label="Notifications">🔔</a>' +
    '<button class="account-logout" type="button" data-global-logout>Se déconnecter</button>' +
    (readActionLabel ? '<button class="mark-all-read" type="button" data-mark-all-read>' + readActionLabel + '</button>' : '');
  account.querySelector("[data-global-logout]")?.addEventListener("click", logout);
  account.querySelector("[data-mark-all-read]")?.addEventListener("click", async () => {
    const button = account.querySelector("[data-mark-all-read]");
    if (button) button.disabled = true;

    let topics = [];
    if (isForumHome) {
      topics = await getTopics();
    } else if (isCategoryPage) {
      const slug = new URLSearchParams(location.search).get("cat");
      topics = slug ? await getTopics(slug) : [];
    }

    const topicIds = topics.map(topic => topic.id);
    const latestPostsByThread = {};
    if (topicIds.length) {
      const { data: latestPosts } = await getSupabase()
        .from("posts")
        .select("thread_id,created_at")
        .in("thread_id", topicIds)
        .order("created_at", { ascending: false });
      for (const post of (latestPosts || [])) {
        if (!latestPostsByThread[post.thread_id]) latestPostsByThread[post.thread_id] = post;
      }
    }

    for (const topic of topics) {
      await markThreadRead(
        topic.id,
        latestPostsByThread[topic.id]?.created_at || topic.updated_at || topic.created_at
      );
    }

    if (button) {
      button.textContent = isCategoryPage ? "Tous ces sujets sont lus" : "Tous les messages sont lus";
    }
    setTimeout(() => location.reload(), 450);
  });
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
