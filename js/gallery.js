(function(){
  function qs(s,el){return (el||document).querySelector(s)}
  function qsa(s,el){return Array.from((el||document).querySelectorAll(s))}
  function createOverlay(){
    let o=qs('.lightbox-root');if(o)return o;
    o=document.createElement('div');o.className='lightbox-root lightbox hidden';
    o.innerHTML='<button class="lightbox-close" aria-label="Close">×</button><img class="lightbox-img" alt=""><button class="lightbox-prev" aria-label="Previous">‹</button><button class="lightbox-next" aria-label="Next">›</button>';
    document.body.appendChild(o);return o;
  }
  function setupLightbox(){
    const overlay=createOverlay(),img=qs('.lightbox-img',overlay),
      btnC=qs('.lightbox-close',overlay),btnP=qs('.lightbox-prev',overlay),btnN=qs('.lightbox-next',overlay);
    let items=qsa('.gallery-item'),current=-1;
    function refresh(){items=qsa('.gallery-item')}
    function setSrc(el){
      const id=el.getAttribute('data-id');const primary=el.getAttribute('data-full')||`https://drive.google.com/thumbnail?id=${id}&sz=w2000`;
      let triedUC=false;img.onerror=function(){if(!triedUC&&id){triedUC=true;img.src=`https://drive.google.com/uc?id=${id}&export=view`;}else{img.onerror=null;}};img.src=primary;
    }
    function show(i){refresh();if(!items.length)return;current=(i+items.length)%items.length;const it=items[current];setSrc(it);img.alt=it.getAttribute('data-title')||'';overlay.classList.remove('hidden');document.body.style.overflow='hidden'}
    function hide(){overlay.classList.add('hidden');document.body.style.overflow='';img.src='';current=-1}
    function prev(){if(current>=0)show(current-1)} function next(){if(current>=0)show(current+1)}
    document.addEventListener('click',e=>{const el=e.target.closest('.gallery-item');if(!el)return;e.preventDefault();const i=parseInt(el.getAttribute('data-index')||'-1',10);const idx=isNaN(i)||i<0?qsa('.gallery-item').indexOf(el):i;show(idx)});
    btnC.addEventListener('click',hide);btnP.addEventListener('click',prev);btnN.addEventListener('click',next);
    overlay.addEventListener('click',e=>{if(e.target===overlay)hide()});
    document.addEventListener('keydown',e=>{if(overlay.classList.contains('hidden'))return;if(e.key==='Escape')hide();if(e.key==='ArrowLeft')prev();if(e.key==='ArrowRight')next();});
  }
  function setupFilter(){
    document.addEventListener('input',e=>{
      if(!e.target.matches('#quick-filter'))return;
      const root=e.target.closest('main')||document;const items=qsa('.gallery-item',root);const imgs=items.map(b=>b.querySelector('img'));
      const tokens=(e.target.value||'').trim().toLowerCase().split(/\s+/).filter(Boolean);
      items.forEach((btn,i)=>{const hay=[(imgs[i]&&imgs[i].alt||'').toLowerCase(),(btn.getAttribute('data-tags')||'').toLowerCase(),(btn.getAttribute('data-title')||'').toLowerCase()].join(' ');
        const ok=tokens.every(t=>hay.includes(t));btn.style.display=ok?'':'none';});
    });
  }
  window.setupGallery=function(){setupLightbox();setupFilter()};
})();