export function initLightbox() {
  const galleryImgs = Array.from(
    document.querySelectorAll<HTMLImageElement>('.masonry-galleries img')
  );

  if (galleryImgs.length === 0) return;

  let currentIndex = 0;
  let hideCounterTimer: ReturnType<typeof setTimeout>;

  const overlay = document.createElement('div');
  overlay.id = 'lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const img = document.createElement('img');
  img.className = 'lightbox-img';

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

  overlay.appendChild(closeBtn);
  overlay.appendChild(prevBtn);
  overlay.appendChild(img);
  overlay.appendChild(nextBtn);
  overlay.appendChild(counter);
  document.body.appendChild(overlay);

  function showCounter() {
    counter.classList.add('visible');
    clearTimeout(hideCounterTimer);
    hideCounterTimer = setTimeout(() => counter.classList.remove('visible'), 2000);
  }

  function showImage(index: number) {
    currentIndex = (index + galleryImgs.length) % galleryImgs.length;
    img.src = galleryImgs[currentIndex].src;
    img.alt = galleryImgs[currentIndex].alt;
    counter.textContent = `${currentIndex + 1} / ${galleryImgs.length}`;
    showCounter();
  }

  function open(index: number) {
    showImage(index);
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    clearTimeout(hideCounterTimer);
    counter.classList.remove('visible');
    setTimeout(() => { img.src = ''; }, 250);
  }

  galleryImgs.forEach((galleryImg, i) => {
    galleryImg.addEventListener('click', () => open(i));
  });

  closeBtn.addEventListener('click', close);

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showImage(currentIndex - 1);
  });

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showImage(currentIndex + 1);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
    if (e.key === 'ArrowRight') showImage(currentIndex + 1);
  });

  let touchStartX = 0;
  overlay.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  overlay.addEventListener('touchend', (e) => {
    const delta = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      delta > 0 ? showImage(currentIndex + 1) : showImage(currentIndex - 1);
    }
  });
}
