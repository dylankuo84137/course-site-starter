const i18n = require('eleventy-plugin-i18n');
const markdownIt = require('markdown-it');
const materialHelpers = require('./src/_data/materialHelpers.js');
const courseHelpers = require('./src/_data/courseHelpers.js');
const translations = {
  'zh-TW': require('./src/_data/i18n/zh-TW.json'),
  'en-US': require('./src/_data/i18n/en-US.json')
};

// Utility functions for filters
const utilityFilters = {
  slug: s => (s || '').toString().toLowerCase()
    .replace(/\s+/g,'-').replace(/[^\w\-]+/g,'').replace(/\-\-+/g,'-').replace(/^\-+|\-+$/g,''),
  
  formatDate: (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },
  
  nl2br: (str) => {
    if (!str) return '';
    return str.replace(/\r\n|\n|\r/g, '<br>');
  },
  
  formatGoogleDoc: (str) => {
    if (!str) return '';
    let formatted = str.replace(/(\r\n|\n|\r){3,}/g, '</p><p>');
    formatted = formatted.replace(/(\r\n|\n|\r){2}/g, '</p><p>');
    formatted = formatted.replace(/(\r\n|\n|\r)/g, '<br>');
    formatted = '<p>' + formatted + '</p>';
    formatted = formatted.replace(/<p><\/p>/g, '');
    formatted = formatted.replace(/<p><br><\/p>/g, '');
    return formatted;
  },
  
  jsonLD: (course, site) => {
    if (!course) return '';
    const baseUrl = site?.url || '';
    const schema = {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": course.title,
      "description": course.overview || `${course.title} - ${course.unit}`,
      "provider": {
        "@type": "EducationalOrganization",
        "name": site?.footer_org || "Waldorf Education",
        "url": baseUrl
      },
      "educationalLevel": course.grade,
      "teaches": course.unit,
      "courseCode": course.slug,
      "instructor": {
        "@type": "Person",
        "name": course.teacher
      },
      "hasCourseInstance": {
        "@type": "CourseInstance",
        "courseMode": "onsite",
        "courseWorkload": course.semester
      }
    };
    if (course.tags && course.tags.length > 0) {
      schema.keywords = course.tags.join(', ');
    }
    return JSON.stringify(schema, null, 2);
  },
  
  truncate: (str, length) => {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length).trim() + '...';
  },
  
  flatten: (arr) => arr.flat(),
  uniq: (arr) => [...new Set(arr)],
  map: (arr, prop) => arr.map(item => item[prop]),
  autoLink: (str) => {
    if (!str) return '';
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    return str.replace(urlRegex, (match) => {
      const safeUrl = match.replace(/"/g, '&quot;');
      return `<a class="auto-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${match}</a>`;
    });
  },

  /**
   * Format innovation content from plain text Google Docs
   * Detects headings from plain text patterns and converts to semantic HTML
   *
   * Heading patterns:
   * - H2: 一、 二、 1. 2. (main sections with punctuation)
   * - H3: （一） (1) (parenthetical numbers)
   * - H4: Short standalone lines (<40 chars) followed by empty line
   */
  formatInnovation: (str) => {
    if (!str) return '';

    // Normalize line endings
    const text = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split into lines
    const lines = text.split('\n');
    const output = [];
    let i = 0;

    // Helper function to check if line is a heading
    const isHeading = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      // H2: Chinese/Arabic numerals with顿号 or period (一、 二、 1. 2.)
      if (/^[一二三四五六七八九十百千萬\d]+[、.]\s*.+/.test(trimmed)) return 'h2';
      // H3: Parenthetical numbers (（一） (1) (a))
      if (/^[（(][一二三四五六七八九十\d]+[）)]\s*.+/.test(trimmed)) return 'h3';
      return false;
    };

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';

      // Skip empty lines (they'll be used for paragraph spacing)
      if (!trimmed) {
        i++;
        continue;
      }

      // Check for headings FIRST
      const headingType = isHeading(line);
      if (headingType === 'h2') {
        output.push(`<h2>${trimmed}</h2>`);
        i++;
        continue;
      }

      if (headingType === 'h3') {
        output.push(`<h3>${trimmed}</h3>`);
        i++;
        continue;
      }

      // H4: Short standalone line (<40 chars) followed by empty line
      if (trimmed.length < 40 && nextLine === '' && i + 1 < lines.length) {
        // Check if next non-empty line exists (not end of document)
        let hasNextContent = false;
        for (let j = i + 2; j < lines.length; j++) {
          if (lines[j].trim()) {
            hasNextContent = true;
            break;
          }
        }
        if (hasNextContent) {
          output.push(`<h4>${trimmed}</h4>`);
          i++;
          continue;
        }
      }

      // Regular paragraph: collect consecutive non-empty, non-heading lines
      const paragraphLines = [];
      while (i < lines.length) {
        const currentLine = lines[i];
        const currentTrimmed = currentLine.trim();

        // Stop if we hit an empty line or a heading
        if (!currentTrimmed || isHeading(currentLine)) {
          break;
        }

        paragraphLines.push(currentTrimmed);
        i++;
      }

      if (paragraphLines.length > 0) {
        // Join lines with space for natural text flow
        const paragraphText = paragraphLines.join(' ');
        output.push(`<p>${paragraphText}</p>`);
      }
    }

    return output.join('\n');
  }
};

module.exports = function(eleventyConfig) {
  // i18n configuration
  eleventyConfig.addPlugin(i18n, {
    translations,
    fallbackLocales: {
      'en-US': 'zh-TW'
    }
  });

  // Add translation filter (shorthand for i18n filter)
  eleventyConfig.addFilter("t", function(key, lang) {
    // Default to zh-TW if no language specified
    const locale = lang || 'zh-TW';
    const keys = key.split('.');
    let value = translations[locale];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  });

  eleventyConfig.addPassthroughCopy({ "public": "/" });
  
  // Register utility filters
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));
  // JSON string escape for raw JSON templates (no HTML encoding)
  eleventyConfig.addFilter("jsonstr", (v) => {
    if (v === null || v === undefined) return 'null';
    return JSON.stringify(String(v));
  });
  Object.entries(utilityFilters).forEach(([name, fn]) => {
    eleventyConfig.addFilter(name, fn);
  });

  // Markdown filter for rendering markdown in templates
  const md = markdownIt({
    html: true,
    linkify: true,
    typographer: true
  });
  eleventyConfig.addFilter("markdown", function(content) {
    return md.render(content || "");
  });

  // Split filter for string splitting
  eleventyConfig.addFilter("split", function(str, separator) {
    if (typeof str !== "string") return [];
    return str.split(separator);
  });

  eleventyConfig.addGlobalData("buildTime", () => new Date().toISOString());
  eleventyConfig.addGlobalData("materialHelpers", materialHelpers);
  eleventyConfig.addGlobalData("courseHelpers", courseHelpers);

  return {
    dir: { input: "src", output: "_site", includes: "_includes" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    pathPrefix: process.env.ELEVENTY_BASE || "/"
  };
};
