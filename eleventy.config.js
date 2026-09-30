module.exports = function (eleventyConfig) {
  // Preserve the approved complete HTML pages without old layouts or data.
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.ignores.add('src/404.html');
  for (const file of ['404.html', '_headers', '_redirects', 'robots.txt', 'sitemap.xml', 'llms.txt', 'agents.md']) {
    eleventyConfig.addPassthroughCopy({ [`src/${file}`]: file });
  }
  return {
    dir: { input: 'src', output: '_site' },
    templateFormats: ['html'],
    htmlTemplateEngine: false,
    markdownTemplateEngine: false
  };
};
