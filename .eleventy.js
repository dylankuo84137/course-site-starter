const i18n = require('eleventy-plugin-i18n');
const translations = {
  'zh-TW': require('./src/_data/i18n/zh-TW.json'),
  'en-US': require('./src/_data/i18n/en-US.json')
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
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));
  eleventyConfig.addFilter("slug", s => (s || '').toString().toLowerCase()
    .replace(/\s+/g,'-').replace(/[^\w\-]+/g,'').replace(/\-\-+/g,'-').replace(/^\-+|\-+$/g,''));
  eleventyConfig.addFilter("formatDate", (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  });
  eleventyConfig.addFilter("nl2br", (str) => {
    if (!str) return '';
    return str.replace(/\r\n|\n|\r/g, '<br>');
  });
  eleventyConfig.addFilter("formatGoogleDoc", (str) => {
    if (!str) return '';
    // Replace multiple consecutive line breaks with paragraph breaks
    let formatted = str.replace(/(\r\n|\n|\r){3,}/g, '</p><p>');
    // Replace double line breaks with paragraph breaks
    formatted = formatted.replace(/(\r\n|\n|\r){2}/g, '</p><p>');
    // Replace single line breaks with <br>
    formatted = formatted.replace(/(\r\n|\n|\r)/g, '<br>');
    // Wrap in paragraph tags
    formatted = '<p>' + formatted + '</p>';
    // Clean up empty paragraphs
    formatted = formatted.replace(/<p><\/p>/g, '');
    formatted = formatted.replace(/<p><br><\/p>/g, '');
    return formatted;
  });
  eleventyConfig.addFilter("jsonLD", (course, site) => {
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
  });
  eleventyConfig.addFilter("truncate", (str, length) => {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length).trim() + '...';
  });
  eleventyConfig.addFilter("flatten", (arr) => {
    return arr.flat();
  });
  eleventyConfig.addFilter("uniq", (arr) => {
    return [...new Set(arr)];
  });
  eleventyConfig.addFilter("map", (arr, prop) => {
    return arr.map(item => item[prop]);
  });
  eleventyConfig.addGlobalData("buildTime", () => new Date().toISOString());

  return {
    dir: { input: "src", output: "_site", includes: "_includes" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    pathPrefix: process.env.ELEVENTY_BASE || "/"
  };
};
