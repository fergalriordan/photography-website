import { initMasonry, recalcGrid } from './masonry';
import { initLightbox } from './lightbox';

export default function initPhotoCollage() {
  const init = () => {
    initMasonry();
    initLightbox('.masonry-columns img');

    const btn = document.getElementById('showMoreBtn');
    const photoGrid = document.getElementById('photoGrid') as HTMLElement | null;

    if (btn && photoGrid) {
      let expanded = false;

      btn.addEventListener('click', () => {
        expanded = !expanded;
        const lazyPhotos = photoGrid.querySelectorAll<HTMLElement>('[data-lazy]');

        if (expanded) {
          lazyPhotos.forEach(img => (img.style.display = ''));
          recalcGrid(photoGrid);
          btn.textContent = 'Show Less';
          btn.setAttribute('aria-expanded', 'true');
        } else {
          lazyPhotos.forEach(img => (img.style.display = 'none'));
          btn.textContent = 'Show More';
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
