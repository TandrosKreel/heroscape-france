/* Shared BBCode visual editor helpers reused from topic page. */
const SMILEYS = window.HEROSCAPE_SMILEYS || {};
function renderSmileys(text) {
  return esc(text).replace(/\[smiley:([a-z0-9_]+)\]/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(SMILEYS, key)
      ? '<img class="forum-inline-smiley" src="' + SMILEYS[key] + '" alt="Smiley ' + key + '">'
      : match
  );
}
function renderInlineMarkup(text) {
  const colors = ["#ffffff","#cbd5e1","#111827","#facc15","#f97316","#ef4444","#ec4899","#a855f7","#6366f1","#3b82f6","#22c55e","#14b8a6"];
  const fonts = ["Arial","Georgia","monospace","cursive","fantasy"];
  let result = renderSmileys(text);
  const styles = [
    ["b", "strong"], ["i", "em"], ["s", "del"]
  ];
  for (const [tag, html] of styles) {
    const re = new RegExp("\\[" + tag + "\\]([\\s\\S]*?)\\[\\/" + tag + "\\]", "gi");
    result = result.replace(re, "<" + html + ">$1</" + html + ">");
  }
  result = result.replace(/\[size=([1-5])\]([\s\S]*?)\[\/size\]/gi,
    (_, n, content) => '<span class="forum-size-' + n + '">' + content + '</span>');
  result = result.replace(/\[color=(#[0-9a-f]{6})\]([\s\S]*?)\[\/color\]/gi,
    (whole, color, content) => colors.includes(color.toLowerCase()) ?
      '<span style="color:' + color + '">' + content + '</span>' : whole);
  result = result.replace(/\[font=([1-5])\]([\s\S]*?)\[\/font\]/gi,
    (_, n, content) => '<span style="font-family:' + fonts[Number(n)-1] + '">' + content + '</span>');
  result = result.replace(/\[align=(left|center|right)\]([\s\S]*?)\[\/align\]/gi,
    (_, alignment, content) => '<div style="text-align:' + alignment + '">' + content + '</div>');
  result = result.replace(/\[url=(https?:\/\/[^\]\s]{1,500})\]([\s\S]*?)\[\/url\]/gi,
    (_, url, label) => '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer nofollow">' + label + '</a>');
  // Les anciens messages peuvent contenir des balises imbriquées : effectuer
  // plusieurs passes pour convertir les styles internes avant les styles externes.
  for (let pass = 0; pass < 12; pass++) {
    const previous = result;
    result = result.replace(/\[(b|i|s)\]((?:(?!\[(?:b|i|s)\]).)*?)\[\/\1\]/gis,
      (_,tag,body) => '<' + ({b:'strong',i:'em',s:'del'})[tag.toLowerCase()] + '>' + body + '</' + ({b:'strong',i:'em',s:'del'})[tag.toLowerCase()] + '>');
    result = result.replace(/\[(size|font|color|align)=([^\]\r\n]+)\]((?:(?!\[(?:size|font|color|align)=).)*?)\[\/\1\]/gis,
      (full,tag,val,body) => {
        tag=tag.toLowerCase();
        if(tag==='size' && /^[1-5]$/.test(val)) return '<span class="forum-size-'+val+'">'+body+'</span>';
        if(tag==='font' && /^[1-5]$/.test(val)) return '<span style="font-family:'+fonts[Number(val)-1]+'">'+body+'</span>';
        if(tag==='color' && colors.includes(val.toLowerCase())) return '<span style="color:'+val+'">'+body+'</span>';
        if(tag==='align' && /^(left|center|right)$/.test(val)) return '<div style="text-align:'+val+'">'+body+'</div>';
        return full;
      });
    if(result===previous) break;
  }
  return result;
}
function renderMessageImages(html) {
  // Uniquement les images du bucket public dédié, sous le chemin de l'utilisateur.
  const base = window.supabaseClient?.storage.from("forum-images").getPublicUrl("placeholder").data.publicUrl;
  if (!base) return html;
  const prefix = base.slice(0, -("placeholder".length));
  return html.replace(/\[image=([0-9a-f-]{36}\/[a-z0-9-]+\.webp)\]/gi, (_, path) =>
    '<a class="forum-image-link" href="' + prefix + path + '" target="_blank" rel="noopener noreferrer">' +
    '<img class="forum-post-image" src="' + prefix + path + '" alt="Photo jointe au message" loading="lazy"></a>');
}
function renderForumMessage(text) {
  // Harmoniser également les messages publiés avant cette correction.
  const source=String(text||"").replace(/(\[image=[0-9a-f-]{36}\/[a-z0-9-]+\.webp\])\n+(?=\S)/gi, "$1");
  // Supprimer les sauts de ligne automatiques entre une citation et une image.
  const normalizedSource=source.replace(/\[\/quote\][\t \r\n]+(?=\[image=[0-9a-f-]{36}\/[a-z0-9-]+\.webp\])/gi, "[/quote]");
  const root={author:null,parts:[]},stack=[root];
  const tokens=/\[quote(?:=([^\]\r\n]{1,80}))?\]|\[\/quote\]/gi;
  let cursor=0,match;
  while((match=tokens.exec(normalizedSource))!==null){
    if(match.index>cursor)stack[stack.length-1].parts.push({text:normalizedSource.slice(cursor,match.index)});
    if(/^\[\/quote\]/i.test(match[0])){
      if(stack.length>1){const completed=stack.pop();stack[stack.length-1].parts.push({quote:completed});}
      else stack[0].parts.push({text:match[0]});
    } else stack.push({author:(match[1]||"").trim().replace(/^["']|["']$/g,""),parts:[]});
    cursor=tokens.lastIndex;
  }
  if(cursor<normalizedSource.length)stack[stack.length-1].parts.push({text:normalizedSource.slice(cursor)});
  while(stack.length>1){
    const incomplete=stack.pop();
    stack[stack.length-1].parts.push({text:"[quote"+(incomplete.author?"="+incomplete.author:"")+"]"});
    stack[stack.length-1].parts.push(...incomplete.parts);
  }
  // Les balises de couleur/police peuvent englober une citation.
  // Remplacer d'abord chaque citation par un jeton neutre, puis analyser
  // les mises en forme sur le message entier avant de restaurer les citations.
  const draw=node=>{
    const quotations=[];
    const whole=node.parts.map(part=>{
      if(Object.prototype.hasOwnProperty.call(part,"text"))return part.text;
      const q=part.quote;
      const html='<blockquote class="forum-quote"><strong>'+
        (q.author?esc(q.author)+' a écrit :':'Citation :')+
        '</strong><div>'+draw(q)+'</div></blockquote>';
      const token="FORUMQUOTETOKEN"+quotations.length+"END";
      quotations.push(html);
      return token;
    }).join("");
    return renderInlineMarkup(whole).replace(/FORUMQUOTETOKEN(\d+)END/g,
      (match,index)=>quotations[Number(index)]||match);
  };
  return renderMessageImages(draw(root));
}

// Reconstruit un éditeur visuel à partir d'un ancien message BBCode.

// Contrôles partagés entre rédaction et modification : sélection et saisie au curseur.
function setupForumFormatting(editor, toolbar) {
  let saved = null;
  const commands = {b:"bold",i:"italic",s:"strikeThrough"};
  const inside = range => range && editor.contains(range.commonAncestorContainer);
  function remember() {
    const sel=window.getSelection();
    if(sel.rangeCount && inside(sel.getRangeAt(0))) saved=sel.getRangeAt(0).cloneRange();
  }
  function restore() {
    editor.focus();
    const sel=window.getSelection();
    if(saved && inside(saved)){sel.removeAllRanges();sel.addRange(saved);}
    else if(!sel.rangeCount || !inside(sel.getRangeAt(0))){
      const r=document.createRange();r.selectNodeContents(editor);r.collapse(false);
      sel.removeAllRanges();sel.addRange(r);
    }
  }
  function refresh() {
    const sel=window.getSelection();
    if(!sel.rangeCount || !inside(sel.getRangeAt(0)))return;
    const node=sel.anchorNode?.nodeType===Node.TEXT_NODE?sel.anchorNode.parentElement:sel.anchorNode;
    for(const [key,command] of Object.entries(commands)){
      const btn=toolbar.querySelector('[data-format="'+key+'"]');
      if(!btn)continue;
      const active=document.queryCommandState(command);
      btn.classList.toggle("is-active",active);btn.setAttribute("aria-pressed",String(active));
    }
    for(const [attr,selector,defaultValue] of [["data-forum-size","[data-size]","3"],["data-forum-font","[data-font]","1"],["data-forum-color","[data-color]",""]]){
      const control=toolbar.querySelector(selector);
      if(control)control.value=node?.closest?.("["+attr+"]")?.getAttribute(attr)||defaultValue;
    }
    const align=node?.closest?.("[data-forum-align]")?.dataset.forumAlign||editor.dataset.forumAlign||"left";
    toolbar.querySelectorAll("[data-align]").forEach(btn=>{
      const active=btn.dataset.align===align;
      btn.classList.toggle("is-active",active);btn.setAttribute("aria-pressed",String(active));
    });
  }
  editor.addEventListener("keyup",()=>{remember();refresh();});
  editor.addEventListener("mouseup",()=>{remember();refresh();});
  editor.addEventListener("touchend",remember);
  editor.addEventListener("input",()=>{remember();refresh();});
  toolbar.addEventListener("pointerdown",event=>{
    remember();
    if(event.target.closest("button"))event.preventDefault();
  });
  toolbar.querySelectorAll("[data-format]").forEach(btn=>btn.addEventListener("click",()=>{
    restore();
    const selection=window.getSelection();
    const range=selection.getRangeAt(0);
    const command=commands[btn.dataset.format];
    document.execCommand(command,false,null);
    if(!range.collapsed){
      // Conserver le texte sélectionné pour enchaîner plusieurs commandes.
      const sel=window.getSelection();
      if(sel.rangeCount && !sel.isCollapsed)saved=sel.getRangeAt(0).cloneRange();
    }
    remember();refresh();
  }));
  for(const [selector,attribute] of [["[data-size]","data-forum-size"],["[data-font]","data-forum-font"],["[data-color]","data-forum-color"]]){
    const control=toolbar.querySelector(selector);
    if(!control)continue;
    control.addEventListener("pointerdown",remember);
    control.addEventListener("change",()=>{
      const value=control.value;if(!value)return;
      restore();
      const range=window.getSelection().getRangeAt(0);
      const span=document.createElement("span");span.setAttribute(attribute,value);
      if(range.collapsed)span.appendChild(document.createTextNode("\\u200b"));
      else span.appendChild(range.extractContents());
      range.insertNode(span);
      const next=document.createRange();next.selectNodeContents(span);
      if(range.collapsed)next.collapse(false);
      const sel=window.getSelection();sel.removeAllRanges();sel.addRange(next);
      saved=next.cloneRange();refresh();
    });
  }
  toolbar.querySelectorAll("[data-align]").forEach(btn=>btn.addEventListener("click",()=>{
    restore();
    document.execCommand({left:"justifyLeft",center:"justifyCenter",right:"justifyRight"}[btn.dataset.align],false,null);
    remember();refresh();
  }));
  refresh();
}


function openForumLinkDialog(insert,selected="") {
  const overlay=document.createElement("div");overlay.className="forum-link-overlay";
  const form=document.createElement("form");form.className="forum-link-dialog";
  form.setAttribute("role","dialog");form.setAttribute("aria-modal","true");
  form.innerHTML='<h3>Insérer un lien</h3><label>Adresse de la page web<input name="url" type="url" required maxlength="500" placeholder="https://www.heroscapers.com/"></label><label>Texte à afficher sur le forum<input name="label" type="text" maxlength="300" placeholder="ici"></label><p>Exemple : « Vous pouvez le trouver ici », où seul « ici » est cliquable.</p><div class="forum-link-actions"><button type="button" data-cancel>Annuler</button><button type="submit">Insérer le lien</button></div>';
  form.elements.label.value=selected;
  const close=()=>overlay.remove();
  form.querySelector("[data-cancel]").addEventListener("click",close);
  overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
  form.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();close();}});
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const url=form.elements.url.value.trim();
    if(!url.startsWith("https://")&&!url.startsWith("http://")){form.elements.url.setCustomValidity("Adresse https:// requise");form.elements.url.reportValidity();return;}
    insert(url,form.elements.label.value.trim()||url);close();
  });
  overlay.append(form);document.body.append(overlay);form.elements.url.focus();
}

function enhanceForumQuote(quote) {
  const header=quote.querySelector(":scope > strong");
  const body=quote.querySelector(":scope > div");
  if(!header||!body)return;
  header.contentEditable="false";
  header.classList.add("forum-quote-author");
  header.title="Appuyez pour changer le nom de la personne citée";
  header.setAttribute("role","button");
  header.setAttribute("tabindex","0");
  header.setAttribute("aria-label","Modifier l'auteur de la citation");
  const rename=()=>{
    const current=quote.dataset.quoteAuthor||"";
    const answer=prompt("Nom de la personne citée (facultatif) :",current);
    if(answer===null)return;
    quote.dataset.quoteAuthor=answer.trim().replace(/[\\[\\]\\r\\n]/g,"").slice(0,80);
    header.textContent=quote.dataset.quoteAuthor?quote.dataset.quoteAuthor+" a écrit :":"Citation sans auteur";
    body.focus();
  };
  header.addEventListener("click",rename);
  header.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();rename();}});
  if(!body.textContent.trim()) {
    quote.classList.add("forum-quote-draft");
    body.dataset.placeholder="Écrivez ici les paroles que vous souhaitez citer…";
  }
  body.setAttribute("aria-label","Contenu de la citation : écrivez ici le texte cité");
  // La citation reste éditable, mais peut être retirée indépendamment du message.
  if(!quote.querySelector(":scope > .forum-quote-remove")){
    const remove=document.createElement("button");
    remove.type="button";remove.className="forum-quote-remove";
    remove.textContent="×";remove.title="Supprimer cette citation";
    remove.setAttribute("aria-label","Supprimer cette citation");
    remove.contentEditable="false";
    remove.addEventListener("mousedown",event=>event.preventDefault());
    remove.addEventListener("click",event=>{
      event.preventDefault();event.stopPropagation();
      const parent=quote.parentNode;
      if(!parent)return;
      const next=quote.nextSibling;
      quote.remove();
      if(parent.isContentEditable){
        const selection=window.getSelection(),range=document.createRange();
        if(next)range.setStartBefore(next);
        else { const trailing=document.createElement("div");trailing.appendChild(document.createElement("br"));parent.appendChild(trailing);range.selectNodeContents(trailing); }
        range.collapse(true);selection.removeAllRanges();selection.addRange(range);
        parent.dispatchEvent(new Event("input",{bubbles:true}));
      }
    });
    quote.appendChild(remove);
  }
}

function restoreForumVisualFormatting(wrapper) {
  wrapper.querySelectorAll(".forum-size-1,.forum-size-2,.forum-size-3,.forum-size-4,.forum-size-5").forEach(el => {
    const match = el.className.match(/forum-size-([1-5])/);
    if (match) el.dataset.forumSize = match[1];
  });
  wrapper.querySelectorAll("span[style],div[style]").forEach(el => {
    const font = el.style.fontFamily.toLowerCase().replace(/["']/g,"");
    const fonts = ["arial","georgia","monospace","cursive","fantasy"];
    if (font) {
      const index = fonts.findIndex(f => font.startsWith(f));
      if (index >= 0) el.dataset.forumFont = String(index + 1);
    }
    if (el.style.color) {
      const colors = el.style.color.match(/[0-9]+/g);
      if (colors?.length === 3) el.dataset.forumColor = "#" + colors.map(n => Number(n).toString(16).padStart(2,"0")).join("");
    }
    if (el.style.textAlign) el.dataset.forumAlign = el.style.textAlign;
  });
}

function loadForumVisualContent(editor, source) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderForumMessage(source);
  wrapper.querySelectorAll("blockquote.forum-quote").forEach(quote => {
    const header = quote.querySelector("strong");
    const label = header?.textContent || "";
    quote.dataset.quoteAuthor = label.endsWith(" a écrit :") ? label.slice(0,-" a écrit :".length) : "";
    enhanceForumQuote(quote);
  });
  restoreForumVisualFormatting(wrapper);
  wrapper.querySelectorAll("img.forum-post-image").forEach(img => {
    const match = img.src.match(/([0-9a-f-]{36}\/[a-z0-9-]+\.webp)$/i);
    if (match) { img.dataset.forumImage = match[1]; img.contentEditable = "false"; img.closest("a.forum-image-link")?.replaceWith(img); }
  });
  wrapper.querySelectorAll("img.forum-inline-smiley").forEach(img => {
    const match = img.alt.match(/^Smiley (.+)$/);
    if (match) { img.dataset.smiley = match[1]; img.contentEditable = "false"; }
  });
  editor.replaceChildren(...Array.from(wrapper.childNodes));
}

// Convertit uniquement les éléments visuels autorisés en BBCode, sans conserver de HTML utilisateur.
function serializeForumEditor(editor) {
  const walk = node => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.replace(/\u200b/g,"");
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node;
    if (el.matches("img[data-smiley]")) return "[smiley:" + el.dataset.smiley + "]";
    if (el.matches("img[data-forum-image]")) return "[image=" + el.dataset.forumImage + "]\n";
    if (el.matches("br")) return "\n";
    if (el.matches("blockquote[data-quote-author]")) {
      const content = Array.from(el.children).find(child => child.tagName === "DIV");
      const author = el.dataset.quoteAuthor.replace(/[\[\]\r\n]/g,"");
      // Tant que le contenu cité n'est pas édité, conserver son BBCode original
      // pour éviter toute perte de police/couleur lors d'une conversion HTML.
      const quotedBody = content ? walkChildren(content) : "";
      return "[quote" + (author ? "=" + author : "") + "]\n" + quotedBody + "\n[/quote]\n";
    }
    let content = walkChildren(el);
    for (const [attr,tag,allowed] of [
      ["data-forum-size","size",/^[1-5]$/],
      ["data-forum-font","font",/^[1-5]$/],
      ["data-forum-color","color",/^#[0-9a-f]{6}$/i],
      ["data-forum-align","align",/^(left|center|right)$/]
    ]) {
      const value=el.getAttribute(attr);
      if(value && allowed.test(value)) content="["+tag+"="+value+"]"+content+"[/"+tag+"]";
    }
    if (el.matches("strong,b") || el.style.fontWeight === "bold" || Number(el.style.fontWeight) >= 600)
      content="[b]"+content+"[/b]";
    if (el.matches("em,i") || el.style.fontStyle === "italic")
      content="[i]"+content+"[/i]";
    if (el.matches("del,s,strike") || el.style.textDecorationLine.includes("line-through"))
      content="[s]"+content+"[/s]";
    if (el.matches("a[href]") && el.href.startsWith("http"))
      content="[url="+el.href+"]"+content+"[/url]";
    if (el.matches("div,p")) return content + "\n";
    return content;
  };
  // Un éditeur contenteditable peut contenir du texte nu suivi d'un DIV/P
  // (retour Entrée sur Android). La séparation visuelle doit être sauvegardée.
  const walkChildren = el => {
    const nodes = Array.from(el.childNodes);
    let result = "";
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (i > 0 && node.nodeType === Node.ELEMENT_NODE &&
          node.matches("div,p") && result && !result.endsWith("\n")) {
        result += "\n";
      }
      result += walk(node);
    }
    return result;
  };
  let text = walkChildren(editor).trim();
  // Le paragraphe vide créé automatiquement après une image ne doit pas
  // ajouter une ligne blanche supplémentaire dans le message publié.
  text = text.replace(/(\[image=[0-9a-f-]{36}\/[a-z0-9-]+\.webp\])\n{2}(?=\S)/gi, "$1\n");
  // Android peut afficher un retour à la ligne entre deux fragments
  // contenteditable sans créer de BR/DIV dans le DOM. innerText conserve
  // ces séparations visuelles : les reporter dans le BBCode sans toucher
  // aux balises de mise en forme.
  if (!editor.querySelector("blockquote,[data-forum-image],a[href]")) {
    const visual = (editor.innerText || "").replace(/\r\n?/g, "\n").trim();
    const tagPattern = /\[(?:\/?(?:b|i|s|size|font|color|align)(?:=[^\]\r\n]+)?)\]/gi;
    const plain = text.replace(tagPattern, "");
    if (visual.includes("\n") && plain.replace(/\n/g, "") === visual.replace(/\n/g, "")) {
      const pieces = text.split(/(\[(?:\/?(?:b|i|s|size|font|color|align)(?:=[^\]\r\n]+)?)\])/gi);
      let position = 0;
      let reconstructed = "";
      for (const piece of pieces) {
        if (tagPattern.test(piece) && piece.match(/^\[(?:\/?(?:b|i|s|size|font|color|align))/i)) {
          reconstructed += piece;
        } else {
          for (const character of piece) {
            if (character === "\n") {
              if (visual[position] === "\n") { reconstructed += "\n"; position++; }
              continue;
            }
            while (visual[position] === "\n") { reconstructed += "\n"; position++; }
            reconstructed += character;
            position++;
          }
        }
        tagPattern.lastIndex = 0;
      }
      text = reconstructed;
    }
  }
  return editor.dataset.forumAlign && editor.dataset.forumAlign !== "left" ? "[align=" + editor.dataset.forumAlign + "]" + text + "[/align]" : text;
}

