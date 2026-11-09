(function(){
"use strict";
const root=document.getElementById("app");
const routes=["home","projects","about","contact"];
let site=null,lang=localStorage.getItem("sv-lang")==="en"?"en":"it";
const t=(it,en)=>lang==="en"?en:it;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const url=(page,project)=>"?page="+encodeURIComponent(page)+(project?"&project="+encodeURIComponent(project):"");
const imageError='this.onerror=null;this.parentElement.classList.add("missing-photo")';

/* STEP 1: Preload and decode Home photographs without replacing the visible one. */
const homePhotoCache=new Map();
let homeViewId=0;
let homeSwitching=false;
let homeWanted=null;
function preloadHomePhoto(src){
 if(homePhotoCache.has(src))return homePhotoCache.get(src);
 const img=new Image();
 const ready=new Promise((resolve,reject)=>{
  img.onload=()=>{
   if(typeof img.decode==="function")img.decode().catch(()=>{}).then(()=>resolve(img));
   else resolve(img);
  };
  img.onerror=()=>reject(new Error("Home photo unavailable"));
 });
 homePhotoCache.set(src,ready);
 ready.catch(()=>{if(homePhotoCache.get(src)===ready)homePhotoCache.delete(src);});
 img.src=src;
 return ready;
}
function preloadAllHomePhotos(){
 if(site&&Array.isArray(site.homeImages)){
  for(const src of site.homeImages)preloadHomePhoto(src).catch(()=>{});
 }
}
function homeStepBase(){
 return Number.isInteger(homeWanted)?homeWanted:Number(sessionStorage.getItem("sv-home-slide")||0);
}

const navItem=(page,label,active)=>'<a href="'+url(page)+'" data-link'+(active?' class="active" aria-current="page"':'')+'>'+label+'</a>';
function getRoute(){const q=new URLSearchParams(location.search);return{page:routes.includes(q.get("page"))?q.get("page"):"home",project:q.get("project")||"",preview:q.get("preview")==="1"};}
function rail(page){return '<aside class="site-rail"><a class="brand" href="'+url("home")+'" aria-label="Sara Valleri Architetti — Home"><img src="'+(page==="home"?"./assets/logo-white.svg":"./assets/logo-black.svg")+'" alt="Sara Valleri Architetti"></a><nav class="rail-links" aria-label="'+t("Navigazione principale","Main navigation")+'">'+navItem("projects",t("Projects","Projects"),page==="projects")+navItem("about","About",page==="about")+navItem("contact","Contact",page==="contact")+'<a href="https://www.instagram.com/svarchitetti/" target="_blank" rel="noopener noreferrer">Instagram</a></nav><div class="rail-bottom"><button type="button" class="lang" data-lang="it" aria-pressed="'+(lang==="it")+'">IT</button><span class="faded">/</span><button type="button" class="lang" data-lang="en" aria-pressed="'+(lang==="en")+'">EN</button></div><span class="credit">© '+new Date().getFullYear()+' Sara Valleri Architetti</span></aside>';}
function home(){
 const images=site.homeImages||[];
 let i=Number(sessionStorage.getItem("sv-home-slide")||0);
 if(!Number.isInteger(i)||i<0||i>=images.length)i=0;
 const img=images[i]||"";
 const total=String(images.length).padStart(2,"0");
 return '<section class="home-page" data-home-index="'+i+'" aria-label="'+t("Galleria fotografica Home","Home photo gallery")+'">'
 +'<img class="home-img is-current" src="'+esc(img)+'" alt="'+t("Architettura e interni — fotografia","Architecture and interiors — photograph")+' '+(i+1)+'" fetchpriority="high">'
 +'<div class="home-carousel" role="group" aria-label="'+t("Naviga le quattro immagini","Navigate the four photographs")+'">'
 +'<div class="home-counter" aria-live="polite">'+String(i+1).padStart(2,"0")+' <span>/</span> '+total+'</div>'
 +'<div class="home-pager">'+images.map((v,k)=>'<button type="button" class="home-dot'+(k===i?' is-active':'')+'" data-hero="'+k+'" aria-label="'+t("Vai alla foto ","Go to photo ")+(k+1)+'" aria-pressed="'+(k===i)+'"></button>').join("")+'</div>'
 +'<button type="button" class="home-arrow" data-home-step="-1" aria-label="'+t("Foto precedente","Previous photo")+'">←</button>'
 +'<button type="button" class="home-arrow" data-home-step="1" aria-label="'+t("Foto successiva","Next photo")+'">→</button>'
 +'</div></section>';
}
function goHomeSlide(index){
 if(!site||getRoute().page!=="home"||!Number.isFinite(index))return;
 const count=site.homeImages.length;
 if(!count)return;
 homeWanted=(index%count+count)%count;
 if(!homeSwitching)advanceHomeSlide();
}
function advanceHomeSlide(){
 const frame=document.querySelector(".home-page");
 if(!frame||!site||getRoute().page!=="home"||homeSwitching)return;
 const current=Number(frame.dataset.homeIndex||0);
 const next=homeWanted;
 if(!Number.isInteger(next)||next===current)return;
 homeSwitching=true;
 const viewId=homeViewId;
 const src=site.homeImages[next];
 preloadHomePhoto(src).then(()=>{
  if(viewId!==homeViewId||!frame.isConnected||getRoute().page!=="home")return;
  if(homeWanted!==next){
   homeSwitching=false;
   advanceHomeSlide();
   return;
  }
  const outgoing=frame.querySelector(".home-img.is-current");
  if(!outgoing){homeSwitching=false;return;}
  const incoming=document.createElement("img");
  incoming.className="home-img home-img-incoming";
  incoming.src=src;
  incoming.alt=t("Architettura e interni — fotografia","Architecture and interiors — photograph")+" "+(next+1);
  frame.insertBefore(incoming,frame.querySelector(".home-carousel"));
  let completed=false;
  function complete(){
   if(completed)return;
   completed=true;
   if(viewId!==homeViewId||!frame.isConnected)return;
   outgoing.remove();
   incoming.className="home-img is-current";
   frame.dataset.homeIndex=String(next);
   sessionStorage.setItem("sv-home-slide",String(next));
   homeSwitching=false;
   if(homeWanted!==next)advanceHomeSlide();
  }
  incoming.addEventListener("transitionend",event=>{
   if(event.target===incoming&&event.propertyName==="opacity")complete();
  });
  const counter=frame.querySelector(".home-counter");
  if(counter)counter.innerHTML=String(next+1).padStart(2,"0")+' <span>/</span> '+String(site.homeImages.length).padStart(2,"0");
  frame.querySelectorAll(".home-dot").forEach((dot,i)=>{
   dot.classList.toggle("is-active",i===next);
   dot.setAttribute("aria-pressed",String(i===next));
  });
  // Leave the previous photo fully opaque until the new one is decoded and rendered.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(viewId===homeViewId&&frame.isConnected)incoming.classList.add("is-visible");
  }));
  // Also finish if motion is disabled or the tab is in the background.
  setTimeout(complete,800);
 }).catch(()=>{
  if(viewId!==homeViewId)return;
  homeSwitching=false;
  homeWanted=Number(frame.dataset.homeIndex||0);
 });
}
function cover(p){return '<span class="cover-frame"><img src="'+esc(p.cover)+'" alt="'+esc(p.title)+' — '+t("copertina progetto","project cover")+'" loading="lazy" onerror=\''+imageError+'\'></span>';}
function overview(){return '<section class="overview"><div class="topline"><h1 class="section-heading">'+t("PROGETTI","PROJECTS")+'</h1><span class="eyebrow">01 — 05</span></div><div class="project-grid">'+site.projects.map(p=>'<a class="project-card" data-link href="'+url("projects",p.id)+'" aria-label="'+t("Apri il progetto","Open project")+' '+esc(p.title)+'">'+cover(p)+'<div class="project-meta"><strong>'+esc(p.title)+'</strong><small>'+esc(p.city)+' / '+esc(p.year)+'</small></div></a>').join("")+'</div><div class="more">'+t("Architettura, interni, residenziale.","Architecture, interiors, residential.")+'</div></section>';}
function detail(p){const next=site.projects[(site.projects.indexOf(p)+1)%site.projects.length];const imgs=p.images&&p.images.length?p.images:[p.cover];return '<article class="project-view"><div class="gallery">'+imgs.map((s,i)=>'<figure class="gallery-figure"><img src="'+esc(s)+'" alt="'+esc(p.title)+' — '+t("fotografia","photograph")+' '+(i+1)+'" '+(i?"loading=lazy":"fetchpriority=high")+' onerror=\''+imageError+'\'></figure>').join("")+'</div><aside class="project-info"><a class="back" data-link href="'+url("projects")+'">← '+t("Tutti i progetti","All projects")+'</a><h1>'+esc(p.title)+'</h1><div class="info-meta">'+esc(p.city)+' · '+esc(p.year)+'<br>'+esc(t(p.kindIt,p.kindEn))+'<br>'+t("Committente privato","Private client")+'</div><div class="info-desc">'+esc(t(p.descriptionIt,p.descriptionEn))+'</div><div class="info-footer">'+t("Fotografie","Photography")+': Elena Pegurri<br><a class="next-link" data-link href="'+url("projects",next.id)+'">'+t("Progetto successivo","Next project")+' → '+esc(next.title)+'</a></div></aside></article>';}
function about(){
 const bio1=t("Sono un’architetta freelance con sede a Milano, laureata in Architettura al Politecnico di Milano. Mi occupo di progettazione architettonica e interior design, con particolare attenzione agli spazi residenziali.","I am a freelance architect based in Milan. I graduated in Architecture from Politecnico di Milano and work in architectural design and interior design, with a particular focus on residential spaces.");
 const bio2=t("Nel mio lavoro cerco un equilibrio tra sensibilità estetica, funzionalità e cura del dettaglio, dando forma ad ambienti essenziali, armoniosi e pensati su misura. Il mio percorso professionale è legato anche a SV Architetti, a Milano.","In my work, I seek a balance between aesthetic sensitivity, functionality and attention to detail, creating essential, harmonious spaces tailored to each project. My professional path is also connected with SV Architetti in Milan.");
 return '<section class="simple-page about-page"><div class="about-layout"><figure class="about-visual"><img class="about-image" src="./assets/images/about/portrait.webp" alt="Sara Valleri Architetti"><figcaption class="caption">Sara Valleri Architetti — Milano</figcaption></figure><aside class="about-copy"><h1 class="section-heading">ABOUT</h1><h2>Sara Valleri</h2><p>'+esc(bio1)+'</p><p>'+esc(bio2)+'</p></aside></div></section>';
}
function contact(){
 return '<section class="simple-page contact-page contact-editorial">'
  +'<div class="contact-layout">'
  +'<figure class="contact-visual"><img class="contact-image" src="./assets/images/contact/sara-contact.webp" alt="'+t("Immagine per i contatti di Sara Valleri Architetti","Image for Sara Valleri Architetti contact page")+'" fetchpriority="high"><figcaption class="caption">Sara Valleri Architetti — Milano</figcaption></figure>'
  +'<div class="contact-copy">'
  +'<h1 class="section-heading">CONTACT</h1>'
  +'<div class="contact-editorial-main">'
  +'<a class="editorial-email" href="mailto:sara@svarchitetti.com">sara@svarchitetti.com</a>'
  +'<a class="editorial-instagram" href="https://www.instagram.com/svarchitetti/" target="_blank" rel="noopener noreferrer">Instagram</a>'
  +'</div>'
  +'<div class="contact-editorial-meta"><p>Sara Valleri</p><p>P. IVA 04362550164</p><p>'+t("Milano · Italia","Milan · Italy")+'</p></div>'
  +'</div></div>'
  +'</section>';
}
function render(scroll=true){if(!site)return;homeViewId++;homeSwitching=false;homeWanted=null;document.body.classList.toggle("is-home",getRoute().page==="home");document.documentElement.lang=lang;const r=getRoute(),p=site.projects.find(v=>v.id===r.project);let body=r.page==="home"?home(r.preview):r.page==="about"?about():r.page==="contact"?contact():p?detail(p):overview();root.innerHTML=rail(r.page)+'<main class="site-main" id="main">'+body+'</main>';document.title=(p?p.title+" — ":r.page!=="home"?r.page.charAt(0).toUpperCase()+r.page.slice(1)+" — ":"")+"Sara Valleri Architetti";if(r.page==="home"){const frame=document.querySelector(".home-page");homeWanted=Number(frame?.dataset.homeIndex||0);preloadAllHomePhotos();}if(scroll)window.scrollTo({top:0,behavior:"instant"});}
document.addEventListener("click",ev=>{const language=ev.target.closest("[data-lang]");if(language){lang=language.getAttribute("data-lang");localStorage.setItem("sv-lang",lang);render(false);return;}const pic=ev.target.closest("[data-hero]");if(pic){goHomeSlide(Number(pic.getAttribute("data-hero")));return;}const step=ev.target.closest("[data-home-step]");if(step){goHomeSlide(homeStepBase()+Number(step.getAttribute("data-home-step")));return;}const a=ev.target.closest("a[data-link],a.brand");if(a&&a.origin===location.origin){ev.preventDefault();history.pushState(null,"",a.getAttribute("href"));render();}});
let lastHomeWheel=0;
window.addEventListener("wheel",ev=>{
 if(!site||getRoute().page!=="home"||Math.abs(ev.deltaY)<14||ev.ctrlKey)return;
 ev.preventDefault();
 const now=Date.now();if(now-lastHomeWheel<720)return;
 lastHomeWheel=now;
 goHomeSlide(homeStepBase()+(ev.deltaY>0?1:-1));
},{passive:false});
window.addEventListener("keydown",ev=>{
 if(!site||getRoute().page!=="home"||ev.altKey||ev.ctrlKey||ev.metaKey||["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName))return;
 const delta={"ArrowRight":1,"ArrowDown":1,"ArrowLeft":-1,"ArrowUp":-1}[ev.key];
 if(!delta)return;
 ev.preventDefault();goHomeSlide(homeStepBase()+delta);
});
let homeTouchStart=null;
window.addEventListener("touchstart",ev=>{
 if(getRoute().page!=="home"||ev.target.closest(".site-rail"))return;
 homeTouchStart={x:ev.changedTouches[0].clientX,y:ev.changedTouches[0].clientY};
},{passive:true});
window.addEventListener("touchend",ev=>{
 if(!homeTouchStart||getRoute().page!=="home")return;
 const dx=ev.changedTouches[0].clientX-homeTouchStart.x,dy=ev.changedTouches[0].clientY-homeTouchStart.y;
 homeTouchStart=null;
 if(Math.max(Math.abs(dx),Math.abs(dy))<55)return;
 const delta=Math.abs(dx)>Math.abs(dy)?(dx<0?1:-1):(dy<0?1:-1);
 goHomeSlide(homeStepBase()+delta);
},{passive:true});
window.addEventListener("popstate",()=>render());
fetch("./config/site.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("Missing site data");return r.json();}).then(x=>{site=x;render();}).catch(()=>{root.innerHTML='<p class="loading">Impossibile caricare la configurazione del sito. / Site configuration unavailable.</p>';});
})();