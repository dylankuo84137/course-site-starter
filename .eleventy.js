const i18n = require('eleventy-plugin-i18n');
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
  Object.entries(utilityFilters).forEach(([name, fn]) => {
    eleventyConfig.addFilter(name, fn);
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
