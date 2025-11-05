/**
 * Course Filters - Simple filtering system for course index page
 * Filters by grade, domain, teacher and text search
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const gradeFilter = document.getElementById('gradeFilter');
    const domainFilter = document.getElementById('domainFilter');
    const teacherFilter = document.getElementById('teacherFilter');
    const searchInput = document.getElementById('searchInput');
    const resetBtn = document.getElementById('resetFilters');
    const coursesGrid = document.getElementById('coursesGrid');
    const resultsCount = document.getElementById('resultsCount');
    const noResults = document.getElementById('noResults');

    if (!coursesGrid) return;

    const courseCards = Array.from(coursesGrid.querySelectorAll('.course-card'));

    // Build filter options from course data
    const grades = new Set();
    const domains = new Set();
    const teachers = new Set();

    courseCards.forEach(card => {
      const grade = card.dataset.grade;
      const domain = card.dataset.domain;
      const teacher = card.dataset.teacher;

      if (grade) grades.add(grade);
      if (domain) domains.add(domain);
      if (teacher) teachers.add(teacher);
    });

    // Populate filter dropdowns
    populateSelect(gradeFilter, Array.from(grades).sort((a, b) => {
      // Sort numerically if both are numbers
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    }));
    populateSelect(domainFilter, Array.from(domains).sort());
    populateSelect(teacherFilter, Array.from(teachers).sort());

    // Attach event listeners
    if (gradeFilter) gradeFilter.addEventListener('change', applyFilters);
    if (domainFilter) domainFilter.addEventListener('change', applyFilters);
    if (teacherFilter) teacherFilter.addEventListener('change', applyFilters);
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);

    // Initial count
    updateResultsCount(courseCards.length);

    // Listen for language change events
    document.addEventListener('languageChanged', function() {
      // Re-translate the results count with current visible count
      const visibleCount = document.querySelectorAll('.course-card:not([style*="display: none"])').length;
      updateResultsCount(visibleCount);
    });

    function populateSelect(select, values) {
      if (!select) return;

      values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = formatFilterLabel(value);
        select.appendChild(option);
      });
    }

    function formatFilterLabel(value) {
      // Convert slug format to readable text
      return value
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    function applyFilters() {
      const selectedGrade = gradeFilter?.value || 'all';
      const selectedDomain = domainFilter?.value || 'all';
      const selectedTeacher = teacherFilter?.value || 'all';
      const searchTerm = searchInput?.value.toLowerCase().trim() || '';

      let visibleCount = 0;

      courseCards.forEach(card => {
        const cardGrade = card.dataset.grade || '';
        const cardDomain = card.dataset.domain || '';
        const cardTeacher = card.dataset.teacher || '';

        // Get searchable text from card content
        const cardText = card.textContent.toLowerCase();

        // Check if card matches all filters
        const gradeMatch = selectedGrade === 'all' || cardGrade === selectedGrade;
        const domainMatch = selectedDomain === 'all' || cardDomain === selectedDomain;
        const teacherMatch = selectedTeacher === 'all' || cardTeacher === selectedTeacher;
        const searchMatch = !searchTerm || cardText.includes(searchTerm);

        const isVisible = gradeMatch && domainMatch && teacherMatch && searchMatch;

        if (isVisible) {
          card.style.display = '';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      updateResultsCount(visibleCount);
      toggleNoResults(visibleCount === 0);
    }

    function resetFilters() {
      if (gradeFilter) gradeFilter.value = 'all';
      if (domainFilter) domainFilter.value = 'all';
      if (teacherFilter) teacherFilter.value = 'all';
      if (searchInput) searchInput.value = '';

      applyFilters();
    }

    function updateResultsCount(count) {
      if (!resultsCount) return;

      // Get current language preference
      let lang = 'zh-TW';
      try {
        lang = localStorage.getItem('preferredLang') || window.__CURRENT_LANG__ || 'zh-TW';
      } catch (e) {
        lang = window.__CURRENT_LANG__ || 'zh-TW';
      }

      const i18n = window.__I18N_DATA__;

      let message = `顯示 ${count} 個課程`; // Default Chinese

      if (i18n && i18n[lang] && i18n[lang].filters) {
        message = i18n[lang].filters.showing_results.replace('{count}', count);
      }

      resultsCount.textContent = message;
      // Store the count for later translation updates
      resultsCount.setAttribute('data-count', count);
    }

    function toggleNoResults(show) {
      if (!noResults) return;

      if (show) {
        noResults.classList.remove('hidden');
        coursesGrid.style.display = 'none';
      } else {
        noResults.classList.add('hidden');
        coursesGrid.style.display = '';
      }
    }
  }
})();
