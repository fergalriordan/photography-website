export function initLightbox(selector = '.photo-columns img') {
  const galleryImgs = Array.from(
    document.querySelectorAll<HTMLImageElement>(selector)
  );

  if (galleryImgs.length === 0) return;

  let currentIndex = 0;
  // Direction of the slide animation in flight, or 0 when the track is at rest.
  let pendingDirection: 0 | 1 | -1 = 0;
  let hideCounterTimer: ReturnType<typeof setTimeout>;

  // Which DOM slot index currently plays each role.
  // After each navigation we rotate these rather than copying image srcs.
  let leftSlot = 0, centerSlot = 1, rightSlot = 2;

  const overlay = document.createElement('div');
  overlay.id = 'lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const container = document.createElement('div');
  container.className = 'lightbox-container';

  const track = document.createElement('div');
  track.className = 'lightbox-track';

  // Each slot holds whichever photo element setSlot() last moved into it.
  const slots: HTMLDivElement[] = [];

  for (let i = 0; i < 3; i++) {
    const slide = document.createElement('div') as HTMLDivElement;
    slide.className = 'lightbox-slide';
    slots.push(slide);
    track.appendChild(slide);
  }

  container.appendChild(track);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'lightbox-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close');

  const prevBtn = document.createElement('button');
  prevBtn.className = 'lightbox-prev';
  prevBtn.innerHTML = '&#8249;';
  prevBtn.setAttribute('aria-label', 'Previous image');

  const nextBtn = document.createElement('button');
  nextBtn.className = 'lightbox-next';
  nextBtn.innerHTML = '&#8250;';
  nextBtn.setAttribute('aria-label', 'Next image');

  const counter = document.createElement('span');
  counter.className = 'lightbox-counter';

  // Optional "<Name> Gallery →" link, shown only for images that carry
  // data-gallery-slug/label (the homepage collage). Stays visible the whole
  // time the lightbox is open, unlike the auto-hiding counter.
  const galleryLink = document.createElement('a');
  galleryLink.className = 'lightbox-gallery-link';
  galleryLink.addEventListener('click', (e) => e.stopPropagation());

  overlay.appendChild(container);
  overlay.appendChild(closeBtn);
  overlay.appendChild(prevBtn);
  overlay.appendChild(nextBtn);
  overlay.appendChild(galleryLink);
  overlay.appendChild(counter);
  document.body.appendChild(overlay);

  function getItem(index: number) {
    return galleryImgs[(index + galleryImgs.length) % galleryImgs.length];
  }

  // One <img> per photo, created on first use and kept. Slots are filled by
  // moving these elements in rather than changing a src: a src change leaves
  // the old pixels on screen until the new file arrives (a fast swipe could
  // slide in the photo from two steps back), and re-setting a src makes the
  // browser revalidate the file with the host, so a preloaded photo still
  // waited a round trip. A moved element is already fetched and decoded.
  const photoEls = new Map<string, HTMLImageElement>();

  function getPhotoEl(index: number) {
    const { src, alt } = getItem(index);
    let img = photoEls.get(src);
    if (!img) {
      img = document.createElement('img');
      img.className = 'lightbox-img';
      img.alt = alt;
      img.decoding = 'async';
      img.src = src;
      photoEls.set(src, img);
    }
    return img;
  }

  function setSlot(slot: number, index: number) {
    let img = getPhotoEl(index);
    // A gallery of under three photos needs one photo in two slots at once.
    if (img.parentElement && img.parentElement !== slots[slot]) {
      img = img.cloneNode() as HTMLImageElement;
    }
    // Stay hidden until decoded, so a slot never shows a half-loaded photo.
    if (!img.complete) {
      img.classList.add('loading');
      const reveal = () => img.classList.remove('loading');
      img.decode().then(reveal, reveal);
    }
    slots[slot].replaceChildren(img);
  }

  // Start fetching a few photos beyond the neighbouring slots, so the next
  // slot is usually ready before a fast swiper gets there. Gallery photos load
  // lazily on the page, so most aren't fetched yet.
  const PRELOAD_DISTANCE = 3;

  function preloadAround(index: number) {
    for (let d = 2; d <= PRELOAD_DISTANCE; d++) {
      getPhotoEl(index + d);
      getPhotoEl(index - d);
    }
  }

  function setOrders() {
    slots[leftSlot].style.order = '0';
    slots[centerSlot].style.order = '1';
    slots[rightSlot].style.order = '2';
  }

  function resetTrack() {
    track.style.transition = 'none';
    track.style.transform = 'translateX(-33.333%)';
  }

  function showCounter() {
    counter.textContent = `${currentIndex + 1} / ${galleryImgs.length}`;
    counter.classList.add('visible');
    clearTimeout(hideCounterTimer);
    hideCounterTimer = setTimeout(() => counter.classList.remove('visible'), 2000);
  }

  function updateGalleryLink() {
    const { gallerySlug, galleryLabel } = getItem(currentIndex).dataset;
    // The persistent link needs clear space below the image; without it the
    // image can use the full height (see .has-gallery-link in global.css).
    overlay.classList.toggle('has-gallery-link', Boolean(gallerySlug && galleryLabel));
    if (gallerySlug && galleryLabel) {
      galleryLink.href = `/galleries/${gallerySlug}`;
      galleryLink.textContent = `${galleryLabel} Gallery →`;
      galleryLink.classList.add('visible');
    } else {
      galleryLink.classList.remove('visible');
    }
  }

  // Rotate slot roles so the just-visible slot becomes center — its src is
  // never touched. Only the newly-offscreen slot gets a src update.
  function completeNavigation(direction: 1 | -1) {
    if (direction > 0) {
      const oldLeft = leftSlot;
      leftSlot = centerSlot;
      centerSlot = rightSlot;
      rightSlot = oldLeft;
      currentIndex = (currentIndex + 1) % galleryImgs.length;
      setSlot(rightSlot, currentIndex + 1);
    } else {
      const oldRight = rightSlot;
      rightSlot = centerSlot;
      centerSlot = leftSlot;
      leftSlot = oldRight;
      currentIndex = (currentIndex - 1 + galleryImgs.length) % galleryImgs.length;
      setSlot(leftSlot, currentIndex - 1);
    }
    // Both style changes land in the same paint — no intermediate frame.
    setOrders();
    resetTrack();
    showCounter();
    updateGalleryLink();
    preloadAround(currentIndex);
    pendingDirection = 0;
  }

  // Track position as a px offset from rest (centre slot in view); negative
  // shows the next slot. One slide is one container width.
  function trackOffset() {
    const tx = new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
    return tx + container.clientWidth;
  }

  function setTrackOffset(px: number, transition = 'none') {
    track.style.transition = transition;
    track.style.transform = `translateX(calc(-33.333% + ${px}px))`;
  }

  // Freeze the track where it is on screen right now, so an arrow click or key
  // press can take over mid-animation instead of being ignored. A slide in flight is
  // completed on the spot (slots rotated) and its offset re-expressed against
  // the new centre slot, so nothing visibly jumps. Returns that offset.
  function settleTrack() {
    let offset = trackOffset();
    if (pendingDirection) {
      const direction = pendingDirection;
      completeNavigation(direction);
      offset += direction * container.clientWidth;
    }
    setTrackOffset(offset);
    return offset;
  }

  function slideTo(direction: 1 | -1) {
    const from = settleTrack();
    const to = -direction * container.clientWidth;
    // Already there: no transition would run, so no transitionend would fire.
    if (Math.abs(to - from) < 1) {
      completeNavigation(direction);
      return;
    }
    void track.offsetWidth; // commit the settled position so the slide starts from it
    pendingDirection = direction;
    setTrackOffset(to, 'transform 0.3s ease');
  }

  function snapBack() {
    setTrackOffset(0, 'transform 0.25s ease');
  }

  track.addEventListener('transitionend', (e) => {
    if (e.target === track && pendingDirection) completeNavigation(pendingDirection);
  });

  function open(index: number) {
    currentIndex = index;
    pendingDirection = 0; // drop a slide still in flight from a previous close
    leftSlot = 0; centerSlot = 1; rightSlot = 2;
    setSlot(0, currentIndex - 1);
    setSlot(1, currentIndex);
    setSlot(2, currentIndex + 1);
    preloadAround(currentIndex);
    setOrders();
    resetTrack();
    overlay.classList.add('active');
    lockScroll();
    showCounter();
    updateGalleryLink();
  }

  // Pin the page in place while open. `overflow: hidden` alone doesn't stop
  // touch scrolling on iOS Safari, so the page could drift behind the lightbox
  // (most visibly while panning a pinch-zoomed image).
  let lockedScrollY = 0;

  function lockScroll() {
    lockedScrollY = window.scrollY;
    Object.assign(document.body.style, {
      position: 'fixed', top: `-${lockedScrollY}px`, left: '0', right: '0', overflow: 'hidden',
    });
  }

  function unlockScroll() {
    Object.assign(document.body.style, { position: '', top: '', left: '', right: '', overflow: '' });
    window.scrollTo({ top: lockedScrollY, behavior: 'instant' });
  }

  function close() {
    overlay.classList.remove('active');
    unlockScroll();
    clearTimeout(hideCounterTimer);
    counter.classList.remove('visible');
    galleryLink.classList.remove('visible');
  }

  galleryImgs.forEach((img, i) => {
    img.addEventListener('click', () => open(i));
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); slideTo(-1); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); slideTo(1); });

  slots.forEach(slot => {
    slot.addEventListener('click', (e) => {
      if (e.target === slot) close();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') slideTo(-1);
    if (e.key === 'ArrowRight') slideTo(1);
  });

  let touchStartX = 0;
  // Track offset when the finger landed: non-zero if it caught a snap-back.
  let dragBase = 0;
  // True for a gesture that must not swipe: a pinch, a touch while the page is
  // pinch-zoomed (a one-finger drag then pans the zoomed view), or a touch
  // that lands while a slide is still in flight.
  let ignoreGesture = false;

  // Pinch-zoom is the browser's own (it scales the visual viewport), so read
  // the zoom level from there. A small tolerance absorbs rounding at 1x.
  const isPageZoomed = () => (window.visualViewport?.scale ?? 1) > 1.01;

  container.addEventListener('touchstart', (e) => {
    // Swipes mid-slide are dropped rather than taking over (unlike arrow clicks
    // and keys): catching a slide in flight made rapid swiping jittery on
    // phones, likely because the position read back from a compositor-run
    // transition lags what's on screen. This caps the pace at one per slide.
    if (e.touches.length > 1 || isPageZoomed() || pendingDirection) {
      ignoreGesture = true;
      return;
    }
    ignoreGesture = false;
    touchStartX = e.touches[0].clientX;
    dragBase = settleTrack();
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) {
      // Second finger joined — treat as pinch, abort any swipe in progress.
      if (!ignoreGesture) setTrackOffset(0);
      ignoreGesture = true;
      return;
    }
    if (ignoreGesture) return;
    const deltaX = e.touches[0].clientX - touchStartX;
    setTrackOffset(dragBase + deltaX);
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (e.touches.length === 0 && ignoreGesture) {
      ignoreGesture = false;
      return;
    }
    if (ignoreGesture || e.touches.length > 0) return;
    // Decide by the finger's own travel, not the track position, so a swipe
    // that caught a snap-back isn't biased by where the track was.
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX < -50) slideTo(1);
    else if (deltaX > 50) slideTo(-1);
    else snapBack();
  });

  container.addEventListener('touchcancel', () => {
    ignoreGesture = false;
    if (!pendingDirection) snapBack();
  });
}
