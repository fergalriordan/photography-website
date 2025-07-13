document.addEventListener('DOMContentLoaded', function() {
    // Find all destination sections
    const sections = document.querySelectorAll('section[class*="scroll-mt-16"]');
    
    sections.forEach(section => {
      const container = section.querySelector('.scroll-container') as HTMLElement;
      const leftArrow = section.querySelector('.scroll-arrow-left') as HTMLElement;
      const rightArrow = section.querySelector('.scroll-arrow-right') as HTMLElement;
      
      if (!container || !leftArrow || !rightArrow) return;
      
      function updateArrows() {
        const { scrollLeft, scrollWidth, clientWidth } = container as HTMLElement;
        
        // More generous tolerance for snap behavior
        const startTolerance = 10;
        const endTolerance = 10;
        
        const isAtStart = scrollLeft <= startTolerance;
        const isAtEnd = scrollLeft >= scrollWidth - clientWidth - endTolerance;
        
        // Debug logging (remove this later)
        console.log('Scroll values:', { scrollLeft, scrollWidth, clientWidth, isAtStart, isAtEnd });
        
        // Show left arrow only if NOT at start (there's content to scroll back to)
        if (isAtStart) {
          leftArrow.style.opacity = '0';
        } else {
          leftArrow.style.opacity = '1';
        }
        
        // Show right arrow only if NOT at end (there's content to scroll forward to)
        if (isAtEnd) {
          rightArrow.style.opacity = '0';
        } else {
          rightArrow.style.opacity = '1';
        }
      }
      
      // Initial check
      updateArrows();
      
      // Update on scroll
      container.addEventListener('scroll', updateArrows);
      
      // Handle resize
      window.addEventListener('resize', updateArrows);
    });
  });