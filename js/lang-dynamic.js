// Dynamic language rewriting for course pages
// This script allows language preference to persist across navigation
// without requiring duplicate page generation
(function() {
  // Get i18n data embedded in the page
  const i18nData = window.__I18N_DATA__;
  const currentLang = window.__CURRENT_LANG__ || 'zh-TW';
  const defaultLang = window.__DEFAULT_LANG__ || 'zh-TW';

  if (!i18nData) return;

  const normalizePagePath = function(path) {
    if (!path) {
      return '/';
    }
    let normalized = path;
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    normalized = normalized.replace(/\/+$/, '');
    return normalized === '' ? '/' : normalized;
  };

  const langSpecificPages = (
    window.__LANG_SPECIFIC_PAGES__ && window.__LANG_SPECIFIC_PAGES__.length
      ? window.__LANG_SPECIFIC_PAGES__
      : ['/ai-guide/']
  ).map(normalizePagePath);

  function getSavedLang() {
    try {
      return localStorage.getItem('preferredLang');
    } catch (e) {
      return null;
    }
  }

  function setSavedLang(lang) {
    try {
      localStorage.setItem('preferredLang', lang);
    } catch (e) {
      // Silently fail
    }
  }

  // Build a reverse lookup map: text -> i18n key path
  function buildTextMap(obj, lang, prefix = '') {
    const map = new Map();

    function traverse(o, path) {
      if (typeof o === 'string') {
        map.set(o, path);
      } else if (o && typeof o === 'object') {
        for (const key in o) {
          traverse(o[key], path ? path + '.' + key : key);
        }
      }
    }

    traverse(obj[lang], '');
    return map;
  }

  // Get value from i18n object by dot-notation key
  function getI18nValue(obj, path) {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      value = value && value[key];
    }
    return value;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Replace text content in the DOM
  function replaceText(fromLang, toLang) {
    // Build map of old text -> key paths
    const fromMap = buildTextMap(i18nData, fromLang);

    // Create a TreeWalker to find all text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip script and style tags
          if (node.parentElement.tagName === 'SCRIPT' ||
              node.parentElement.tagName === 'STYLE') {
            return NodeFilter.FILTER_REJECT;
          }
          // Skip language switcher to avoid replacing its label
          if (node.parentElement.closest('.language-switcher') ||
              node.parentElement.closest('#lang-toggle') ||
              node.parentElement.closest('.lang-menu') ||
              node.parentElement.closest('.lang-option')) {
            return NodeFilter.FILTER_REJECT;
          }
          // Only process nodes with actual text content
          if (node.textContent.trim().length > 0) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    const replacements = [];
    let node;

    // Collect all text nodes that need replacement
    while (node = walker.nextNode()) {
      const text = node.textContent.trim();
      if (fromMap.has(text)) {
        const keyPath = fromMap.get(text);
        const newText = getI18nValue(i18nData[toLang], keyPath);
        if (newText) {
          replacements.push({ node, newText });
        }
      }
    }

    // Apply all replacements
    replacements.forEach(({ node, newText }) => {
      node.textContent = node.textContent.replace(node.textContent.trim(), newText);
    });

    // Translate elements with data-i18n attribute
    const i18nElements = document.querySelectorAll('[data-i18n]');
    i18nElements.forEach(function(el) {
      const keyPath = el.getAttribute('data-i18n');
      const newText = getI18nValue(i18nData[toLang], keyPath);
      if (newText) {
        el.textContent = newText;
      }
    });

    // Translate placeholder attributes
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(function(el) {
      const keyPath = el.getAttribute('data-i18n-placeholder');
      const newText = getI18nValue(i18nData[toLang], keyPath);
      if (newText) {
        el.setAttribute('placeholder', newText);
      }
    });

    // Update HTML lang attribute
    const htmlLangMap = {
      'zh-TW': 'zh-Hant',
      'en-US': 'en-US'
    };
    document.documentElement.setAttribute('lang', htmlLangMap[toLang] || 'zh-Hant');

    // Update page title if it uses i18n
    const titleMap = buildTextMap(i18nData, fromLang);
    const currentTitle = document.title;
    if (titleMap.has(currentTitle)) {
      const keyPath = titleMap.get(currentTitle);
      const newTitle = getI18nValue(i18nData[toLang], keyPath);
      if (newTitle) {
        document.title = newTitle;
      }
    }

    // Update navigation links to language-specific versions
    updateNavigationLinks(toLang);

    // Dispatch language changed event for other modules
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: toLang } }));

    // Reinitialize Pagefind search with new language
    if (window.__initPagefind && typeof window.__initPagefind === 'function') {
      // Wait a brief moment to ensure DOM is updated
      setTimeout(function() {
        window.__initPagefind();
      }, 100);
    }
  }

  // Translate course switcher dropdown
  function translateCourseSwitcher(toLang) {
    const options = document.querySelectorAll('[data-course-switcher-i18n]');
    options.forEach(option => {
      const i18nJSON = option.getAttribute('data-course-switcher-i18n');
      if (i18nJSON) {
        try {
          const i18nData = JSON.parse(i18nJSON);
          if (i18nData[toLang] && i18nData[toLang].title) {
            option.textContent = i18nData[toLang].title;
          }
        } catch (e) {
          // Silently fail on parse error
        }
      }
    });
  }

  // Translate course content with data attributes
  function translateCourseContent(toLang) {
    // Find all course cards with i18n data
    const courseCards = document.querySelectorAll('[data-course-i18n]');

    courseCards.forEach(function(card) {
      const i18nJSON = card.getAttribute('data-course-i18n');
      if (!i18nJSON) {
        return;
      }

      try {
        const i18nData = JSON.parse(i18nJSON);
        const targetLang = toLang || 'zh-TW';
        const translations = i18nData[targetLang];

        if (!translations) {
          return;
        }

        // Translate each element within the card
        const elements = card.querySelectorAll('[data-i18n-course]');
        elements.forEach(function(el) {
          const field = el.getAttribute('data-i18n-course');
          if (translations[field]) {
            let text = translations[field];

            // Apply truncation if data-truncate attribute exists
            const truncateLength = el.getAttribute('data-truncate');
            if (truncateLength) {
              const maxLength = parseInt(truncateLength, 10);
              if (text.length > maxLength) {
                text = text.substring(0, maxLength).trim() + '...';
              }
            }

            el.textContent = text;
          }
        });

        const listElements = card.querySelectorAll('[data-i18n-course-list]');
        listElements.forEach(function(listEl) {
          const field = listEl.getAttribute('data-i18n-course-list');
          const items = translations[field];
          if (Array.isArray(items)) {
            listEl.innerHTML = items
              .map(item => `<li>${escapeHtml(item)}</li>`)
              .join('');
          }
        });
      } catch (e) {
        // Silently handle parsing errors
      }
    });
  }

  function updateLangOnlyElements(activeLang) {
    const langSpecificElements = document.querySelectorAll('[data-lang-only]');
    langSpecificElements.forEach(function(el) {
      const attr = el.getAttribute('data-lang-only');
      if (!attr) {
        return;
      }

      const targets = attr.split(',').map(function(lang) {
        return lang.trim();
      }).filter(Boolean);

      if (targets.length === 0) {
        return;
      }

      const shouldShow = targets.indexOf(activeLang) !== -1;
      el.hidden = !shouldShow;
      if (shouldShow) {
        el.removeAttribute('aria-hidden');
      } else {
        el.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // Update language switcher label
  // Note: The label shows the CURRENT language name (e.g., when page is in English, show "English")
  function updateLanguageSwitcher(toLang) {
    const langButton = document.getElementById('lang-toggle');
    if (langButton) {
      const langLabel = langButton.querySelector('.lang-label');
      if (langLabel) {
        const labels = {
          'zh-TW': '繁體中文',
          'en-US': 'English'
        };
        // Show the current language label
        langLabel.textContent = labels[toLang] || labels['zh-TW'];
      }

      // Update aria-label to show what will happen when clicked (switch to other language)
      const switchToText = i18nData[toLang]?.lang?.switch_to;
      if (switchToText) {
        langButton.setAttribute('aria-label', switchToText);
        langButton.setAttribute('title', switchToText);
      }
    }

    // Update language menu active state
    const langOptions = document.querySelectorAll('.lang-option');
    langOptions.forEach(function(option) {
      const optionLang = option.getAttribute('data-lang');
      if (optionLang === toLang) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
  }

  // Update navigation links to point to language-specific versions
  function updateNavigationLinks(toLang) {
    const basePath = window.__BASE_PATH__ || '/';
    const normBase = basePath.replace(/\/+$/, '');

    // Find all navigation links
    const navLinks = document.querySelectorAll('nav a[href], .mobile-menu-panel a[href]');

    navLinks.forEach(function(link) {
      const href = link.getAttribute('href');
      if (!href) return;

      // Check if this is a language-specific page
      for (let i = 0; i < langSpecificPages.length; i++) {
        const page = langSpecificPages[i];
        const pageSuffix = page === '/' ? '/' : page + '/';
        const zhHref = normBase + pageSuffix;
        const enHref = normBase + '/en-US' + pageSuffix;
        const bareZhHref = pageSuffix;
        const bareEnHref = '/en-US' + pageSuffix;

        const matchesLangSpecific = (
          href === zhHref ||
          href === bareZhHref ||
          href === enHref ||
          href === bareEnHref
        );

        if (matchesLangSpecific) {
          if (toLang === 'en-US') {
            link.setAttribute('href', enHref);
          } else {
            link.setAttribute('href', zhHref);
          }
          break;
        }
      }
    });
  }

  // Check if we're on a language-specific homepage
  const currentPath = window.location.pathname;
  const basePath = window.__BASE_PATH__ || '/';

  // Normalize paths for comparison
  const normPath = currentPath.replace(/\/+$/, '');
  const normBase = basePath.replace(/\/+$/, '');

  // Check if on language-specific homepage: /, /zh-TW/, or /en-US/
  const langPageMatch = normPath.match(new RegExp('^' + normBase + '/(en-US|zh-TW)$'));
  const isDefaultHomepage = (normPath === normBase || normPath === '');
  const isHomepage = langPageMatch || isDefaultHomepage;

  const savedLang = getSavedLang();
  let appliedLang = currentLang;

  if (isHomepage) {
    // On homepage, translate course content if needed
    if (savedLang && savedLang !== currentLang) {
      translateCourseContent(savedLang);
      translateCourseSwitcher(savedLang);
      replaceText(currentLang, savedLang);
      updateLanguageSwitcher(savedLang);
      appliedLang = savedLang;
    }

    // Update navigation links based on language preference
    updateNavigationLinks(appliedLang);

    // Set data-user-lang attribute for CSS-based content switching
    document.documentElement.setAttribute('data-user-lang', appliedLang);

    // Mark language as ready on homepage
    document.documentElement.setAttribute('data-lang-ready', 'true');
  } else {
    if (savedLang && savedLang !== currentLang) {
      // Execute immediately - no delay needed since we set lang attribute in <head>
      // This prevents FOUC by working synchronously before first paint
      translateCourseContent(savedLang);
      translateCourseSwitcher(savedLang);
      replaceText(currentLang, savedLang);
      updateLanguageSwitcher(savedLang);
      appliedLang = savedLang;
    }

    // Update navigation links based on language preference
    updateNavigationLinks(appliedLang);

    // Set data-user-lang attribute for CSS-based content switching
    document.documentElement.setAttribute('data-user-lang', appliedLang);

    // Mark language as ready to show content
    document.documentElement.setAttribute('data-lang-ready', 'true');
  }

  updateLangOnlyElements(appliedLang);
})();
