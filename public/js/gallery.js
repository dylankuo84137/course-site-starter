(function(){
  function qs(sel, el){ return (el||document).querySelector(sel); }
  function qsa(sel, el){ return Array.from((el||document).querySelectorAll(sel)); }

  function createOverlay(){
    let overlay = qs('.lightbox-root');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'lightbox-root lightbox hidden';
    overlay.innerHTML = '<button class="lightbox-close" aria-label="Close">×</button><img class="lightbox-img" alt=""><button class="lightbox-prev" aria-label="Previous">‹</button><button class="lightbox-next" aria-label="Next">›</button>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function setupLightbox(){
    const overlay = createOverlay();
    const img = qs('.lightbox-img', overlay);
    const btnClose = qs('.lightbox-close', overlay);
    const btnPrev = qs('.lightbox-prev', overlay);
    const btnNext = qs('.lightbox-next', overlay);

    let items = qsa('.gallery-item');
    let current = -1;
    function refresh(){ items = qsa('.gallery-item'); }

    function setImgSrcWithFallback(el){
      const id = el.getAttribute('data-id');
      const primary = el.getAttribute('data-full') || `https://drive.google.com/thumbnail?id=${id}&sz=w2000`;
      let triedUC = false;
      img.onerror = function(){
        if (!triedUC && id) { triedUC = true; img.src = `https://drive.google.com/uc?id=${id}&export=view`; }
        else { img.onerror = null; }
      };
      img.src = primary;
    }

    function show(idx){
      refresh();
      if (!items.length) return;
      current = (idx + items.length) % items.length;
      const it = items[current];
      setImgSrcWithFallback(it);
      img.alt = it.getAttribute('data-title') || '';
      overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
    function hide(){ overlay.classList.add('hidden'); document.body.style.overflow=''; img.src=''; current=-1; }
    function prev(){ if(current>=0) show(current-1); }
    function next(){ if(current>=0) show(current+1); }

    document.addEventListener('click', (e)=>{
      const el = e.target.closest('.gallery-item');
      if (!el) return;
      e.preventDefault();
      const i = parseInt(el.getAttribute('data-index') || '-1', 10);
      const idx = isNaN(i) || i < 0 ? qsa('.gallery-item').indexOf(el) : i;
      show(idx);
    });

    btnClose.addEventListener('click', hide);
    btnPrev.addEventListener('click', prev);
    btnNext.addEventListener('click', next);
    overlay.addEventListener('click', (e)=>{ if(e.target === overlay) hide(); });
    document.addEventListener('keydown', (e)=>{
      if(overlay.classList.contains('hidden')) return;
      if(e.key === 'Escape') hide();
      if(e.key === 'ArrowLeft') prev();
      if(e.key === 'ArrowRight') next();
    });
  }

  function setupFilter(){
    document.addEventListener('input', (e)=>{
      if (!e.target.matches('#quick-filter')) return;
      const gridRoot = e.target.closest('main') || document;
      const items = qsa('.gallery-item', gridRoot);
      const imgs = items.map(b => b.querySelector('img'));
      const raw = (e.target.value || '').trim().toLowerCase();
      const tokens = raw.split(/\s+/).filter(Boolean);
      items.forEach((btn, i)=>{
        const hay = [
          (imgs[i] && imgs[i].getAttribute('alt') || '').toLowerCase(),
          (btn.getAttribute('data-tags') || '').toLowerCase(),
          (btn.getAttribute('data-title') || '').toLowerCase()
        ].join(' ');
        const ok = tokens.every(t => hay.includes(t));
        btn.style.display = ok ? '' : 'none';
      });
    });
  }

  window.setupGallery = function(){
    setupLightbox();
    setupFilter();
  };
})();