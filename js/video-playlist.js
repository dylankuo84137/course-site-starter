(function(){
  function parseVideos(wrapper){
    try{
      const raw = wrapper.getAttribute('data-videos') || '[]';
      return JSON.parse(raw);
    }catch(e){
      console.warn('[video-playlist] Failed to parse data-videos payload', e);
      return [];
    }
  }

  function selectNote(wrapper, video){
    if(!video) return '';
    if(video.kind === 'drive'){
      let note = wrapper.getAttribute('data-drive-note') || '';
      if(video.mimeType === 'video/quicktime'){
        const movNote = wrapper.getAttribute('data-mov-note') || '';
        note = [note, movNote].filter(Boolean).join(' ');
      }
      return note.trim();
    }
    return '';
  }

  function updateActive(buttons, targetIndex){
    buttons.forEach(btn => {
      const idx = parseInt(btn.getAttribute('data-video-index'), 10);
      if(idx === targetIndex){
        btn.classList.add('is-active');
      }else{
        btn.classList.remove('is-active');
      }
    });
  }

  function setup(wrapper){
    const videos = parseVideos(wrapper);
    if(!videos.length) return;
    const frame = wrapper.querySelector('[data-video-frame]');
    const titleEl = wrapper.querySelector('[data-video-title]');
    const noteEl = wrapper.querySelector('[data-video-note]');
    const buttons = Array.from(wrapper.querySelectorAll('[data-video-index]'));
    let currentIndex = 0;

    function render(index){
      const video = videos[index];
      if(!video) return;
      currentIndex = index;
      if(frame && video.embedUrl){
        frame.src = video.embedUrl;
        frame.title = video.title || 'Course video';
      }
      if(titleEl){
        titleEl.textContent = video.title || '';
      }
      if(noteEl){
        const note = selectNote(wrapper, video);
        if(note){
          noteEl.textContent = note;
          noteEl.removeAttribute('hidden');
        } else {
          noteEl.textContent = '';
          noteEl.setAttribute('hidden', 'hidden');
        }
      }
      updateActive(buttons, index);
    }

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-video-index'), 10);
        if(!Number.isNaN(idx) && idx !== currentIndex){
          render(idx);
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-video-playlist]').forEach(setup);
  });
})();
