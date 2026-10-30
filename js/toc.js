/**
 * Table of Contents Generator
 * Automatically generates a TOC from h2 and h3 headings
 * Highlights current section on scroll
 */

(function () {
  'use strict';

  const tocList = document.getElementById('toc-list');
  const article = document.querySelector('.prose-content');

  if (!tocList || !article) return;

  // Find all h2 and h3 headings in the article
  const headings = article.querySelectorAll('h2, h3');

  if (headings.length === 0) {
    // No headings found, hide TOC
    const tocContainer = document.getElementById('prose-toc');
    if (tocContainer) {
      tocContainer.style.display = 'none';
    }
    return;
  }

  // Generate TOC
  const tocItems = [];
  headings.forEach((heading, index) => {
    // Create ID if it doesn't exist
    if (!heading.id) {
      const text = heading.textContent.trim();
      // Create slug from heading text
      const slug = text
        .toLowerCase()
        .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, '-') // Handle Chinese characters
        .replace(/^-+|-+$/g, '');
      heading.id = slug || `heading-${index}`;
    }

    const level = heading.tagName.toLowerCase();
    const text = heading.textContent.trim();
    const id = heading.id;

    const li = document.createElement('li');
    li.className = `toc-${level}`;

    const a = document.createElement('a');
    a.href = `#${id}`;
    a.textContent = text;
    a.dataset.target = id;

    li.appendChild(a);
    tocItems.push({ element: li, heading: heading });
  });

  // Append all TOC items to the list
  tocItems.forEach(item => {
    tocList.appendChild(item.element);
  });

  // Scroll spy: highlight current section
  let currentActive = null;

  function updateActiveLink() {
    const scrollPos = window.scrollY + 100; // Offset for header

    let closestHeading = null;
    let closestDistance = Infinity;

    headings.forEach(heading => {
      const rect = heading.getBoundingClientRect();
      const headingTop = window.scrollY + rect.top;
      const distance = Math.abs(scrollPos - headingTop);

      if (scrollPos >= headingTop && distance < closestDistance) {
        closestDistance = distance;
        closestHeading = heading;
      }
    });

    if (closestHeading && closestHeading.id !== currentActive) {
      // Remove previous active
      const prevActive = tocList.querySelector('a.active');
      if (prevActive) {
        prevActive.classList.remove('active');
      }

      // Set new active
      const newActive = tocList.querySelector(`a[data-target="${closestHeading.id}"]`);
      if (newActive) {
        newActive.classList.add('active');
        currentActive = closestHeading.id;
      }
    }
  }

  // Smooth scroll on TOC link click
  tocList.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      const targetId = e.target.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        const offset = 80; // Account for sticky header
        const targetPos = targetElement.getBoundingClientRect().top + window.scrollY - offset;

        window.scrollTo({
          top: targetPos,
          behavior: 'smooth'
        });

        // Update URL without jumping
        history.pushState(null, null, `#${targetId}`);
      }
    }
  });

  // Throttle scroll events for performance
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(updateActiveLink, 50);
  }, { passive: true });

  // Initial active state
  updateActiveLink();

  // Update on hash change (e.g., browser back/forward)
  window.addEventListener('hashchange', updateActiveLink);
})();
