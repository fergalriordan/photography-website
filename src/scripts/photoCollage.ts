export default function initPhotoCollage() {
  const init = () => {
    const btn = document.getElementById('showMoreBtn');
    const lazyPhotos = document.getElementById('lazyPhotos');

    if (btn && lazyPhotos) {
      btn.addEventListener('click', () => {
        const isHidden = lazyPhotos.classList.contains('hidden');
        if (isHidden) {
          lazyPhotos.classList.remove('hidden');
          btn.textContent = 'Show Less';
          btn.setAttribute('aria-expanded', 'true');
        } else {
          lazyPhotos.classList.add('hidden');
          btn.textContent = 'Show More';
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    }
  };

  // Run immediately if DOM is already loaded, otherwise wait for it
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// Auto-initialize
initPhotoCollage();