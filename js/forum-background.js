/* Préférence de fond : aucun chargement d'image avant résolution de la session.
   Les visiteurs voient le fond ; les membres retrouvent leur choix enregistré. */
(function () {
  async function applyMemberBackground() {
    const client=window.supabaseClient;
    if(!client)return;
    try {
      const {data:{session},error:authError}=await client.auth.getSession();
      const user=session?.user;
      if(authError){console.warn("Session du fond indisponible :",authError);return;}
      if(!user){document.body.classList.add("forum-image-background");return;}
      const {data,error}=await client.from("profiles").select("forum_image_background").eq("id",user.id).maybeSingle();
      if(error){console.warn("Préférence du fond indisponible :",error);return;}
      document.body.classList.toggle("forum-image-background",data?.forum_image_background!==false);
    } catch(error) {console.warn("Fond du forum :",error);}
  }
  applyMemberBackground();
  window.addEventListener("forum-background-preference-changed",event=>{
    document.body.classList.toggle("forum-image-background",event.detail?.enabled!==false);
  });
})();
