const fs = require('node:fs');
const path = require('node:path');

const outputDirectory = path.resolve('_site');
const basePath = '/preview-maatwerkkunststof';

function addBasePath(url) {
  if (!url.startsWith('/') || url.startsWith('//')) {
    return url;
  }
  return `${basePath}${url}`;
}

function rewriteHtml(content) {
  return content.replace(
    /\b(href|src|action|poster|imagesrc|srcset|imagesrcset)\s*=\s*(["'])(.*?)\2/gi,
    (attribute, name, quote, value) => {
      const rewritten = value.replace(/(^|,\s*)(\/(?!\/)[^,\s]*)/g, (_match, separator, url) => {
        return `${separator}${addBasePath(url)}`;
      });
      return `${name}=${quote}${rewritten}${quote}`;
    }
  );
}

function rewriteCss(content) {
  return content.replace(
    /url\((\s*)(["']?)(\/(?!\/)[^)"']+)\2(\s*)\)/gi,
    (_match, leadingSpace, quote, url, trailingSpace) => {
      return `url(${leadingSpace}${quote}${addBasePath(url)}${quote}${trailingSpace})`;
    }
  );
}

function processDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      processDirectory(entryPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (extension !== '.html' && extension !== '.css') {
      continue;
    }

    const rewrite = extension === '.html' ? rewriteHtml : rewriteCss;
    fs.writeFileSync(entryPath, rewrite(fs.readFileSync(entryPath, 'utf8')));
  }
}

if (!fs.existsSync(outputDirectory)) {
  throw new Error(`Build output directory does not exist: ${outputDirectory}`);
}

processDirectory(outputDirectory);
