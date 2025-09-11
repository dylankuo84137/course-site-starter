module.exports = function(eleventyConfig) {
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

  return {
    dir: { input: "src", output: "_site", includes: "_includes" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    pathPrefix: process.env.ELEVENTY_BASE || "/"
  };
};
