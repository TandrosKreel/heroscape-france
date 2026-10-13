/* Choix de fond du forum : visiteurs = image, membres = préférence du profil. */
(function () {
  document.body.classList.add("forum-image-background");
  async function applyMemberBackground() {
    const client=window.supabaseClient;
    if(!client)return;
    try {
      const {data:{user},error:authError}=await client.auth.getUser();
      if(authError||!user){document.body.classList.add("forum-image-background");return;}
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
