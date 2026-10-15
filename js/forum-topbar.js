/* Barre de navigation commune : déplacer les éléments existants sans les recréer. */
document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector("body > header");
  const nav = header?.querySelector("nav");
  if (!header || !nav || document.querySelector(".forum-topbar")) return;

  const bar = document.createElement("div");
  bar.className = "forum-topbar";
  const inner = document.createElement("div");
  inner.className = "forum-topbar-inner";
  bar.appendChild(inner);
  document.body.insertBefore(bar, header);
  inner.appendChild(nav);

  let account = document.getElementById("account");
  if (!account) {
    account = document.createElement("div");
    account.id = "account";
    account.className = "account-panel global-account";
  }
  account.classList.add("account-panel", "global-account");
  inner.appendChild(account);

  // Le bouton de lecture appartient au contenu du forum, pas à la barre flottante.
  const moveReadAction = () => {
    const action = account.querySelector("[data-mark-all-read]");
    const main = document.querySelector("main");
    if (!action || !main) return;
    let slot = main.querySelector(".forum-read-actions");
    if (!slot) {
      slot = document.createElement("div");
      slot.className = "forum-read-actions";
      const hero = main.querySelector(".hero");
      if (hero) hero.insertAdjacentElement("afterend", slot);
      else main.prepend(slot);
    }
    slot.appendChild(action);
  };
  new MutationObserver(moveReadAction).observe(account, {childList:true});
  moveReadAction();
});
