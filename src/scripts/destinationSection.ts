document.addEventListener('DOMContentLoaded', function () {
  const sections = document.querySelectorAll('section[class*="scroll-mt-16"]');

  sections.forEach(section => {
    const container = section.querySelector('.scroll-container') as HTMLElement;
    const leftArrow = section.querySelector('[data-arrow="prev"]') as HTMLElement;
    const rightArrow = section.querySelector('[data-arrow="next"]') as HTMLElement;

    if (!container || !leftArrow || !rightArrow) return;

    const images = Array.from(container.querySelectorAll('img')) as HTMLElement[];

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

      // Find current image (the closest snapped one)
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
});
