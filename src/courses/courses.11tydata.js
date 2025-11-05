module.exports = {
  // Generate pages for both languages
  eleventyComputed: {
    // Provide current language based on page context
    currentLang: (data) => {
      return data.lang || data.pageLang || 'zh-TW';
    }
  }
};
