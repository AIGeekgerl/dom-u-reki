(() => {
 const CFG={resizeDebounceMs:250,carousel:{cards:{desk:3,tab:2.2,mob:1.15},gapRem:{desk:1.2,tab:1.1,mob:1},edgePx:2},swipe:{cards:{startPx:8,part:0.2,maxPx:80}},bp:{mob:768,tab:993,touch:1024},clickDistance:8,swipeDistance:70};
 const L={viewer:'Просмотр фотографий',prev:'Предыдущее фото',next:'Следующее фото',prevThumbs:'Предыдущие миниатюры',nextThumbs:'Следующие миниатюры',close:'Закрыть',photo:'Фотография',menu:'Открыть меню',closeMenu:'Закрыть меню'};
(() => {

  function init() {
    const updaters = [];
    const number = (value, fallback, minimum) => {
      const parsed = Number(value);
      return value !== undefined && value !== '' && Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
    };

    document.querySelectorAll('[data-carousel]').forEach((carousel) => {
      const viewport = carousel.querySelector('.c-view');
      const track = carousel.querySelector('.c-track');
      const prevBtn = carousel.querySelector('[data-prev]');
      const nextBtn = carousel.querySelector('[data-next]');
      const slides = track ? Array.from(track.children) : [];
      if (!viewport || !track || !slides.length) {
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
      }

      let index = 0, gap = 0, slideWidth = 0, maxIndex = 0;
      let baseGridWidth = 0, maxOffset = 0, currentOffset = 0;
      let hasFraction = false, fullBleed = false, enabled = true;
      let pointer = null, startX = 0, startY = 0, dragX = 0;
      let horizontal = false, cancelClick = false;

      function resetDrag() {
        if (pointer !== null && viewport.hasPointerCapture(pointer)) viewport.releasePointerCapture(pointer);
        pointer = null;
        horizontal = false;
        dragX = 0;
        viewport.classList.remove('drag');
      }

      function update(animated = true) {
        if (!enabled) return;
        const width = window.innerWidth;
        const center = width <= CFG.bp.tab && hasFraction && index > 0 ? (baseGridWidth - slideWidth) / 2 : 0;
        currentOffset = Math.max(0, Math.min(index * (slideWidth + gap) - center, maxOffset));
        track.classList.toggle('moving', animated);
        track.style.setProperty('--carousel-offset', `${dragX - currentOffset}px`);
        if (prevBtn) prevBtn.disabled = index <= 0 || maxOffset === 0;
        if (nextBtn) nextBtn.disabled = index >= maxIndex || currentOffset >= maxOffset;

        slides.forEach((slide, i) => {
          const start = i * (slideWidth + gap);
          const left = currentOffset - dragX;
          const outside = !fullBleed && width > CFG.bp.tab &&
            (start + slideWidth <= left + CFG.carousel.edgePx || start >= left + baseGridWidth - CFG.carousel.edgePx);
          slide.classList.toggle('off', outside);
          slide.inert = outside;
        });
      }

      function setSizes() {
        resetDrag();
        const width = window.innerWidth;
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const until = number(carousel.dataset.carouselUntil, Infinity, 1);
        enabled = width <= until;
        carousel.classList.toggle('static', !enabled);
        carousel.classList.remove('full');
        for (const name of ['--view-inset', '--view-width', '--slide-width']) carousel.style.removeProperty(name);
        if (!enabled) {
          index = 0;
          track.style.removeProperty('--carousel-offset');
          track.classList.remove('moving');
          carousel.style.setProperty('--gap', `${number(carousel.dataset.gapDesk, CFG.carousel.gapRem.desk, 0)}rem`);
          slides.forEach((slide) => { slide.classList.remove('off'); slide.inert = false; });
          if (prevBtn) prevBtn.disabled = true;
          if (nextBtn) nextBtn.disabled = true;
          return;
        }
        const branch = width <= CFG.bp.mob ? 'mob' : width <= CFG.bp.tab ? 'tab' : 'desk';
        const suffix = branch[0].toUpperCase() + branch.slice(1);
        const cards = number(carousel.dataset['cards' + suffix], CFG.carousel.cards[branch], 1);
        const gapRem = number(carousel.dataset['gap' + suffix], CFG.carousel.gapRem[branch], 0);
        gap = gapRem * rem;
        hasFraction = !Number.isInteger(cards);
        fullBleed = width > CFG.bp.tab && hasFraction;
        carousel.style.setProperty('--gap', `${gapRem}rem`);
        baseGridWidth = viewport.clientWidth;
        if (fullBleed) {
          const body = document.body.getBoundingClientRect();
          const view = viewport.getBoundingClientRect();
          carousel.style.setProperty('--view-inset', `${view.left - body.left}px`);
          carousel.style.setProperty('--view-width', `${body.width}px`);
          carousel.classList.add('full');
        }
        const visible = fullBleed ? Math.floor(cards) : cards;
        slideWidth = Math.max(0, (baseGridWidth - gap * (visible - 1)) / visible);
        carousel.style.setProperty('--slide-width', `${slideWidth}px`);
        maxOffset = Math.max(0, slides.length * slideWidth + (slides.length - 1) * gap - baseGridWidth);
        maxIndex = width <= CFG.bp.tab && hasFraction ? slides.length - 1 : Math.max(0, Math.ceil(slides.length - visible));
        index = Math.min(index, maxIndex);
        update(false);
      }

      function goTo(next) {
        if (!enabled) return;
        index = Math.max(0, Math.min(next, maxIndex));
        update();
      }
      prevBtn?.addEventListener('click', () => goTo(index - 1));
      nextBtn?.addEventListener('click', () => goTo(index + 1));

      viewport.addEventListener('pointerdown', (event) => {
        cancelClick = false;
        if (!enabled || maxOffset === 0 || pointer !== null || event.button !== 0 || !event.isPrimary) return;
        if (window.innerWidth <= CFG.bp.touch) {
          const gallery = event.target.closest('[data-gallery]');
          const images = gallery?.querySelector('.g-images');
          if (images?.children.length > 1 && images.parentElement.contains(event.target)) return;
        }
        pointer = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        dragX = 0;
        horizontal = false;
      });

      window.addEventListener('pointermove', (event) => {
        if (event.pointerId !== pointer) return;
        const x = event.clientX - startX, y = event.clientY - startY;
        if (!horizontal) {
          if (Math.abs(y) > CFG.swipe.cards.startPx && Math.abs(y) >= Math.abs(x)) { resetDrag(); return; }
          if (Math.abs(x) <= CFG.swipe.cards.startPx) return;
          horizontal = true;
          cancelClick = true;
          viewport.setPointerCapture(pointer);
          viewport.classList.add('drag');
        }
        event.preventDefault();
        dragX = x;
        update(false);
      }, { passive: false });

      const finish = (event) => {
        if (event.pointerId !== pointer) return;
        const saved = dragX;
        const step = slideWidth + gap;
        const threshold = Math.min(CFG.swipe.cards.maxPx, step * CFG.swipe.cards.part);
        const count = event.type === 'pointercancel' || Math.abs(saved) <= threshold ? 0 : Math.max(1, Math.round(Math.abs(saved) / step));
        resetDrag();
        goTo(index + (saved < 0 ? count : -count));
      };
      window.addEventListener('pointerup', finish);
      window.addEventListener('pointercancel', finish);
      viewport.addEventListener('click', (event) => {
        if (cancelClick && event.detail) {
          event.preventDefault();
          event.stopPropagation();
          cancelClick = false;
        }
      }, true);
      track.addEventListener('dragstart', (event) => event.preventDefault());
      setSizes();
      updaters.push(setSizes);
    });

    let timer;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => updaters.forEach((update) => update()), CFG.resizeDebounceMs);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

(() => {

  function init() {
    const galleries = document.querySelectorAll('main');
    if (!galleries.length) return;

    let dialog, stageImg, thumbPanel, strip, track, prev, next;
    let links = [];
    let thumbs = [];
    let index = 0;

    function makeButton(className, label, onClick) {
      const button = document.createElement('button');
      button.type = 'button';
      if (className) button.className = className;
      button.setAttribute('aria-label', label);
      button.addEventListener('click', onClick);
      return button;
    }

    function build() {
      dialog = document.createElement('dialog');
      dialog.className = 'photo-viewer';
      dialog.setAttribute('aria-label', L.viewer);

      const stage = document.createElement('div');
      stage.className = 'stage';
      const picture = document.createElement('picture');
      stageImg = document.createElement('img');
      picture.appendChild(stageImg);
      prev = makeButton('v-arrow prev', L.prev, () => show(index - 1));
      next = makeButton('v-arrow next', L.next, () => show(index + 1));
      stage.append(prev, picture, next);

      thumbPanel = document.createElement('div');
      thumbPanel.className = 'thumbs';
      strip = document.createElement('div');
      strip.className = 'view';
      track = document.createElement('div');
      track.className = 'track';
      strip.appendChild(track);
      const scrollThumbs = (direction) => strip.scrollBy({
        left: direction * strip.clientWidth,
        behavior: 'smooth'
      });
      thumbPanel.append(
        makeButton('v-arrow prev', L.prevThumbs, () => scrollThumbs(-1)),
        strip,
        makeButton('v-arrow next', L.nextThumbs, () => scrollThumbs(1))
      );
      dialog.append(makeButton('close', L.close, () => dialog.close()), stage, thumbPanel);

      dialog.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        if (event.key === 'ArrowLeft') show(index - 1);
        if (event.key === 'ArrowRight') show(index + 1);
      });

      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const box = dialog.getBoundingClientRect();
        const outside = event.clientX < box.left || event.clientX > box.right ||
          event.clientY < box.top || event.clientY > box.bottom;
        if (outside) dialog.close();
      });

      let startX = 0, startY = 0;
      picture.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        startX = event.clientX;
        startY = event.clientY;
        picture.setPointerCapture(event.pointerId);
      });
      picture.addEventListener('pointerup', (event) => {
        if (!picture.hasPointerCapture(event.pointerId)) return;
        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;
        if (Math.abs(deltaX) > CFG.swipeDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
          show(deltaX < 0 ? index + 1 : index - 1);
        }
        picture.releasePointerCapture(event.pointerId);
      });
      picture.addEventListener('dragstart', (event) => event.preventDefault());
      document.body.appendChild(dialog);
    }

    function setPhotos(photos) {
      links = photos;
      thumbs = links.map((link, i) => {
        const button = makeButton('', `${L.photo} ${i + 1}`, () => show(i));
        const image = link.querySelector('img').cloneNode();
        image.alt = '';
        image.removeAttribute('title');
        button.appendChild(image);
        return button;
      });
      track.replaceChildren(...thumbs);
      strip.scrollLeft = 0;
      prev.hidden = next.hidden = thumbPanel.hidden = links.length < 2;
    }

    function show(i) {
      index = (i + links.length) % links.length;
      const source = links[index].querySelector('img');
      stageImg.src = links[index].href;
      stageImg.alt = source.alt;
      stageImg.title = source.title;
      stageImg.width = Number(source.getAttribute('width'));
      stageImg.height = Number(source.getAttribute('height'));
      thumbs.forEach((thumb, n) => thumb.setAttribute('aria-pressed', String(n === index)));
      thumbs[index].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }

    galleries.forEach((gallery) => {
      const photos = Array.from(gallery.querySelectorAll('a.photo'));
      if (!photos.length) return;
      let gridX = 0;

      gallery.addEventListener('pointerdown', (event) => { gridX = event.clientX; });
      photos.forEach((link, i) => {
        link.addEventListener('click', (event) => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          if (event.detail && Math.abs(event.clientX - gridX) > CFG.clickDistance) return;
          if (!dialog) build();
          if (links !== photos) setPhotos(photos);
          dialog.showModal();
          show(i);
        });
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

(() => {
 const header=document.querySelector('header > div');
 const nav=document.querySelector('nav');
 const query=matchMedia('(width <= '+CFG.bp.tab+'px)');
 let toggle;
 function closeMenu(){nav.classList.remove('open');if(toggle){toggle.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label',L.menu)}}
 function setMobile(){
  if(query.matches&&!toggle){toggle=document.createElement('button');toggle.type='button';toggle.className='menu-toggle';toggle.setAttribute('aria-label',L.menu);toggle.setAttribute('aria-expanded','false');header.append(toggle);toggle.addEventListener('click',()=>{const open=!nav.classList.contains('open');nav.classList.toggle('open',open);toggle.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?L.closeMenu:L.menu)})}
  if(!query.matches&&toggle){closeMenu();toggle.remove();toggle=null}
 }
 query.addEventListener('change',setMobile);setMobile();
 nav.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu()});
 document.addEventListener('click',event=>{if(!event.target.closest('header'))closeMenu()});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu()});
 const video=document.querySelector('[data-video]'),play=document.querySelector('[data-video-toggle]'),sound=document.querySelector('[data-video-sound]');
 function videoState(){play.textContent=video.paused?play.dataset.play:play.dataset.pause;sound.textContent=video.muted?sound.dataset.off:sound.dataset.on}
 play.addEventListener('click',()=>{if(video.paused)video.play().catch(()=>videoState());else video.pause()});
 sound.addEventListener('click',()=>{video.muted=!video.muted;videoState()});
 ['play','pause','volumechange'].forEach(name=>video.addEventListener(name,videoState));videoState();
 if(matchMedia('(prefers-reduced-motion:reduce)').matches){video.pause();videoState()}
})();

})();
