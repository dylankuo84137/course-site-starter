module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "public": "/" });
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));
  eleventyConfig.addFilter("slug", s => (s || '').toString().toLowerCase()
    .replace(/\s+/g,'-').replace(/[^\w\-]+/g,'').replace(/\-\-+/g,'-').replace(/^\-+|\-+$/g,''));

  return {
    dir: { input: "src", output: "_site", includes: "_includes" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    pathPrefix: process.env.ELEVENTY_BASE || "/"
  };
};
