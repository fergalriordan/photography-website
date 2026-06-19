export function initLightbox(selector = '.masonry-galleries img') {
  const galleryImgs = Array.from(
    document.querySelectorAll<HTMLImageElement>(selector)
  );

  if (galleryImgs.length === 0) return;

  let currentIndex = 0;
  let isAnimating = false;
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

  const slotImgs: HTMLImageElement[] = [];
  const slots: HTMLDivElement[] = [];

  for (let i = 0; i < 3; i++) {
    const slide = document.createElement('div') as HTMLDivElement;
    slide.className = 'lightbox-slide';
    const img = document.createElement('img');
    img.className = 'lightbox-img';
    slotImgs.push(img);
    slots.push(slide);
    slide.appendChild(img);
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

  overlay.appendChild(container);
  overlay.appendChild(closeBtn);
  overlay.appendChild(prevBtn);
  overlay.appendChild(nextBtn);
  overlay.appendChild(counter);
  document.body.appendChild(overlay);

  function getItem(index: number) {
    return galleryImgs[(index + galleryImgs.length) % galleryImgs.length];
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

  // Rotate slot roles so the just-visible slot becomes center — its src is
  // never touched. Only the newly-offscreen slot gets a src update.
  function completeNavigation(direction: 1 | -1) {
    if (direction > 0) {
      const oldLeft = leftSlot;
      leftSlot = centerSlot;
      centerSlot = rightSlot;
      rightSlot = oldLeft;
      currentIndex = (currentIndex + 1) % galleryImgs.length;
      slotImgs[rightSlot].src = getItem(currentIndex + 1).src;
      slotImgs[rightSlot].alt = getItem(currentIndex + 1).alt;
    } else {
      const oldRight = rightSlot;
      rightSlot = centerSlot;
      centerSlot = leftSlot;
      leftSlot = oldRight;
      currentIndex = (currentIndex - 1 + galleryImgs.length) % galleryImgs.length;
      slotImgs[leftSlot].src = getItem(currentIndex - 1).src;
      slotImgs[leftSlot].alt = getItem(currentIndex - 1).alt;
    }
    // Both style changes land in the same paint — no intermediate frame.
    setOrders();
    resetTrack();
    showCounter();
    isAnimating = false;
  }

  function navigateWithAnimation(direction: 1 | -1) {
    if (isAnimating) return;
    isAnimating = true;
    track.style.transition = 'transform 0.3s ease';
    track.style.transform = direction > 0 ? 'translateX(-66.666%)' : 'translateX(0%)';
    track.addEventListener('transitionend', () => completeNavigation(direction), { once: true });
  }

  function open(index: number) {
    currentIndex = index;
    leftSlot = 0; centerSlot = 1; rightSlot = 2;
    slotImgs[0].src = getItem(currentIndex - 1).src;
    slotImgs[0].alt = getItem(currentIndex - 1).alt;
    slotImgs[1].src = getItem(currentIndex).src;
    slotImgs[1].alt = getItem(currentIndex).alt;
    slotImgs[2].src = getItem(currentIndex + 1).src;
    slotImgs[2].alt = getItem(currentIndex + 1).alt;
    setOrders();
    resetTrack();
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    showCounter();
  }

  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    clearTimeout(hideCounterTimer);
    counter.classList.remove('visible');
    setTimeout(() => { slotImgs.forEach(img => { img.src = ''; }); }, 250);
  }

  galleryImgs.forEach((img, i) => {
    img.addEventListener('click', () => open(i));
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateWithAnimation(-1); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateWithAnimation(1); });

  slots.forEach(slot => {
    slot.addEventListener('click', (e) => {
      if (e.target === slot) close();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') navigateWithAnimation(-1);
    if (e.key === 'ArrowRight') navigateWithAnimation(1);
  });

  let touchStartX = 0;
  let hasDragged = false;
  let isPinching = false;

  container.addEventListener('touchstart', (e) => {
    if (isAnimating) return;
    if (e.touches.length > 1) {
      isPinching = true;
      return;
    }
    isPinching = false;
    touchStartX = e.touches[0].clientX;
    hasDragged = false;
    track.style.transition = 'none';
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (isAnimating) return;
    if (e.touches.length > 1) {
      // Second finger joined — treat as pinch, abort any swipe in progress.
      isPinching = true;
      track.style.transition = 'none';
      track.style.transform = 'translateX(-33.333%)';
      hasDragged = false;
      return;
    }
    if (isPinching) return;
    const deltaX = e.touches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 10) hasDragged = true;
    track.style.transform = `translateX(calc(-33.333% + ${deltaX}px))`;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) isPinching = false;
    if (isAnimating || !hasDragged || isPinching) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;

    if (Math.abs(deltaX) > 50) {
      isAnimating = true;
      const direction: 1 | -1 = deltaX < 0 ? 1 : -1;
      track.style.transition = 'transform 0.3s ease';
      track.style.transform = direction > 0 ? 'translateX(-66.666%)' : 'translateX(0%)';
      track.addEventListener('transitionend', () => completeNavigation(direction), { once: true });
    } else {
      track.style.transition = 'transform 0.25s ease';
      track.style.transform = 'translateX(-33.333%)';
    }
  });

  container.addEventListener('touchcancel', () => {
    isPinching = false;
    if (!isAnimating) {
      track.style.transition = 'transform 0.25s ease';
      track.style.transform = 'translateX(-33.333%)';
    }
  });
}
