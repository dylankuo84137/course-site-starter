/**
 * Innovation Highlights Slider
 * Horizontal scroll with keyboard and button navigation
 */

(function() {
  'use strict';

  const slider = document.getElementById('innovation-slider');
  if (!slider) return;

  const navLeft = document.querySelector('.home-innovation-nav-left');
  const navRight = document.querySelector('.home-innovation-nav-right');

  function scrollSlider(direction) {
    const cardWidth = 420; // 400px card + 20px gap
    slider.scrollBy({
      left: direction * cardWidth,
      behavior: 'smooth'
    });
  }

  if (navLeft) {
    navLeft.addEventListener('click', () => scrollSlider(-1));
  }

  if (navRight) {
    navRight.addEventListener('click', () => scrollSlider(1));
  }

  // Keyboard navigation
  slider.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollSlider(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollSlider(1);
    }
  });

  slider.setAttribute('tabindex', '0');
})();
