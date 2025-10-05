let isInitialized = false;

export default function initDestinationSection() {
  // Prevent multiple initializations
  if (isInitialized) return;
  isInitialized = true;

  const init = () => {
    const sections = document.querySelectorAll('section[class*="scroll-mt-16"]');

    sections.forEach(section => {
      const containerEl = section.querySelector('.scroll-container');
      const leftArrowEl = section.querySelector('[data-arrow="prev"]');
      const rightArrowEl = section.querySelector('[data-arrow="next"]');

      // Ensure all required elements exist and are HTMLElements
      if (!(containerEl instanceof HTMLElement) ||
          !(leftArrowEl instanceof HTMLElement) ||
          !(rightArrowEl instanceof HTMLElement)) return;

      const container = containerEl;
      const leftArrow = leftArrowEl;
      const rightArrow = rightArrowEl;

      const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];

      // CRITICAL: Reset scroll position to start
      container.scrollLeft = 0;

      // Overlay functionality
      const overlayEl = section.querySelector('.overlay-text');
      const galleryBtnEl = section.querySelector('.gallery-button');

      if (overlayEl instanceof HTMLElement && galleryBtnEl instanceof HTMLElement) {
        const overlay = overlayEl;
        const galleryButton = galleryBtnEl;
        const startTolerance = 10;

        const showOverlay = () => {
          overlay.style.opacity = '1';
          overlay.style.transform = 'translate(0, 0)';
          galleryButton.style.opacity = '0';
        };

        const hideOverlay = () => {
          overlay.style.opacity = '0';
          overlay.style.transform = 'translate(0, 1rem)';
          galleryButton.style.opacity = '1';
        };

        const updateOverlayVisibility = () => {
          const isAtStart = container.scrollLeft <= startTolerance;
          if (isAtStart) {
            showOverlay();
          } else {
            hideOverlay();
          }
        };

        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              // Force scroll to start when section becomes visible
              container.scrollLeft = 0;
              setTimeout(() => updateOverlayVisibility(), 200);
            } else {
              overlay.style.opacity = '0';
              overlay.style.transform = 'translate(0, 1rem)';
              galleryButton.style.opacity = '0';
            }
          });
        }, {
          threshold: 0.3,
          rootMargin: '0px 0px -10% 0px'
        });

        container.addEventListener('scroll', updateOverlayVisibility);
        observer.observe(section);

        // Initial state
        updateOverlayVisibility();
      }

      function updateArrows() {
        const { scrollLeft, scrollWidth, clientWidth } = container;

        const startTolerance = 10;
        const endTolerance = 10;

        const isAtStart = scrollLeft <= startTolerance;
        const isAtEnd = scrollLeft >= scrollWidth - clientWidth - endTolerance;

        leftArrow.style.opacity = isAtStart ? '0' : '1';
        rightArrow.style.opacity = isAtEnd ? '0' : '1';
      }

      function scrollToSnap(forward: boolean) {
        const currentScrollLeft = container.scrollLeft;

        let closestIndex = 0;
        let minDiff = Infinity;

        images.forEach((img, idx) => {
          const imgLeft = img.offsetLeft;
          const diff = Math.abs(imgLeft - currentScrollLeft);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = idx;
          }
        });

        let targetIndex = forward
          ? Math.min(closestIndex + 1, images.length - 1)
          : Math.max(closestIndex - 1, 0);

        const targetScrollLeft = images[targetIndex].offsetLeft;

        container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      }

      leftArrow.addEventListener('click', () => scrollToSnap(false));
      rightArrow.addEventListener('click', () => scrollToSnap(true));

      updateArrows();
      container.addEventListener('scroll', updateArrows);
      window.addEventListener('resize', updateArrows);
    });

    // Prevent browser scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  };

  // Run immediately if DOM is already loaded, otherwise wait for it
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}