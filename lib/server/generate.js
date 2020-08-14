/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

async function execute() {
  const puppeteer = require('puppeteer');
  const commander = require('commander');
  commander
    .option('--skip-image-compression')
    .option('--skip-next-release')
    .parse(process.argv);
  require('../write-translations.js');
  const metadataUtils = require('./metadataUtils');
  const docs = require('./docs');
  const CWD = process.cwd();
  const fs = require('fs-extra');
  const readMetadata = require('./readMetadata.js');
  const path = require('path');
  const mkdirp = require('mkdirp');
  const mdToc = require('markdown-toc');
  const loadConfig = require('./config.js');
  const siteConfig = loadConfig(`${CWD}/siteConfig.js`);
  const pkg = loadConfig(`${CWD}/package.json`);
  let versions;
  try {
    versions = require(`${CWD}/versions.json`);
  } catch (e){
    console.log('no versions.js found. Continue.')
  }
  const join = path.join;
  const merge = require('easy-pdf-merge');
  const pdf = require('pdf-parse');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'] });
  const sideBars = require(`${CWD}/sideBars.json`);
  const toSlug = require('../core/toSlug.js');

  const server = require('./start.js');

  const serverAddress = await server.startServer();

  const pdfFooterRegex = new RegExp(siteConfig.pdfFooterParser);

  console.log('generate.js triggered...');

  const buildDir = join(CWD, siteConfig.pdfBuildDir || 'print', siteConfig.projectName);

  if(siteConfig.pdfBuildDirCleanUp) {
    fs.removeSync(join(CWD, siteConfig.pdfBuildDir || 'print'));
  }
  
  const readFilesSync = (dir) => {
    const files = [];
  
    fs.readdirSync(dir).forEach(filename => {
      const name = path.parse(filename).name;
      const ext = path.parse(filename).ext;
      const filepath = path.resolve(dir, filename);
      const stat = fs.statSync(filepath);
      const isFile = stat.isFile();
  
      if (isFile) files.push({ filepath, name, ext, stat });
    });
  
    return files;
  }


  const escapeHeaderRegex = (header) => {
    return header
    // escape all regex reserved characters
    .replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
    // replace white-spaces to allow line breaks
    .replace(/\s/g, '(\\s|\\s\\n)');
  }

  const pdfHeaderRegex = [
    (h1) => new RegExp(`^\\d+\\s{2}${escapeHeaderRegex(h1)}$`, 'gm'),
    (h2) => new RegExp(`^\\d+\\.\\d+\\s{2}${escapeHeaderRegex(h2)}$`, 'gm'),
    (h3) => new RegExp(`^\\d+\\.\\d+\.\\d+\\s{2}${escapeHeaderRegex(h3)}$`, 'gm')
  ];

  const getHtmlWithAbsoluteLinks = (html, version) => {

    if(versions && version === versions[0]) {
      version = '';
    }

    if(version){
      version = `${version}/`;
    }

    return html.replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/g, function(matched, p1, p2) {
      if(p2.indexOf('http') === 0){
        // ignore already external links
        return matched;
      }
      
      if(p2.indexOf('#') === 0) {
        // ignore anchor links. because we don't know in which file
        // they are. Plus they will allways work (but can have multiple targets when merging)
        return matched;
      }

      if(p2.indexOf('.') === 0) {
        // this is some kind of a manually created link.
        return matched;
      }
      
      if(p2.indexOf(siteConfig.baseUrl) === 0){
        return matched.replace(p2, `${siteConfig.url}${p2}`);
      }

      return matched.replace(p2, `${siteConfig.url}${siteConfig.baseUrl}docs/${version}${p2}`);
    });
  };

  const cache = [];
  let isRunning = false;

  const getPageWithFixedToc = (tocList, pdfContent, htmlContent) => {
    if(!tocList || !Array.isArray(tocList)) {
      return htmlContent;
    }

    const pdfPages = pdfContent.split(pdfFooterRegex);

    if(!pdfPages.length) {      
      return htmlContent;
    }

    let pageIndex = 0;

    tocList.forEach(e => {

      if(e.lvl > 3){
        return;
      }

      for( ; pageIndex < pdfPages.length; pageIndex++) {
        
        const regex = pdfHeaderRegex[e.lvl -1](e.content);
        
        if(!regex.test(pdfPages[pageIndex])) {
          continue;
        }

        htmlContent = htmlContent.replace(
          '<span class="pageNumber">_</span>', 
          `<span class="pageNumber">${pageIndex}</span>`
        );

        break;
      }
    });

    return htmlContent;
  }

  const mergeMultiplePDF = (pdfFiles, name) => {
    return new Promise((resolve, reject) => {
      merge(pdfFiles, name, function(err){

        if(err){
          console.log(err);
          reject(err)
        }

        resolve()
      });
    });
  };

  const createPdfContent = async function(path, content, title) {
    const contentPage = await browser.newPage();    

    await contentPage.goto(serverAddress);
    await contentPage.setContent(content);
    await contentPage.pdf({
      path,
      format: "A4",
      headerTemplate: siteConfig.getPdfPageHeader(siteConfig, title),
      footerTemplate: siteConfig.getPdfPageFooter(siteConfig, title),
      displayHeaderFooter: true,
      printBackground: true,
      scale: 1,
      margin: {
        top: "5cm",
        right: "2cm",
        bottom: "2.3cm",
        left: "2cm"
      }
    });    
    await contentPage.close();
  }

  const createPdf = async function() {   
    
    const data = cache.pop();

    if(!data) {
      browser.close();

      // move the stable merged guides one level up
      
      if (versions && fs.existsSync(path.normalize(`${buildDir}/docs/${versions[0]}`))) {
        const currentGuides = readFilesSync(path.normalize(`${buildDir}/docs/${versions[0]}`));
    
        currentGuides.forEach(e => {
          fs.renameSync(e.filepath, path.normalize(`${buildDir}/docs/${e.name}.pdf`));
        });
    
        fs.rmdirSync(path.normalize(`${buildDir}/docs/${versions[0]}`));
      }

      process.exit();
    }

    console.log(`Create PDF for ${data.name}, with version ${data.version}`);

    const coverPage = await browser.newPage();
    await coverPage.setContent(siteConfig.getPdfCoverPage(siteConfig, data.title, data.version));
    await coverPage.pdf({
      format: "A4",
      path: `${data.name}.title.pdf`,
      headerTemplate: siteConfig.pdfCoverPageHeader,
      footerTemplate: siteConfig.pdfCoverPageFooter,
      displayHeaderFooter: true,
      printBackground: true,
      margin: {
        top: "10cm",
        right: "0",
        bottom: "3cm",
        left: "0"
      }
    });    

    await coverPage.close();

    await createPdfContent(`${data.name}.content.raw.pdf`, data.content, data.title);

    let dataBuffer = fs.readFileSync(`${data.name}.content.raw.pdf`); 
    const parsedData = await pdf(dataBuffer);

    data.content = getPageWithFixedToc(data.toc, parsedData.text, data.content);
    await createPdfContent(`${data.name}.content.pdf`, data.content, data.title);

    await mergeMultiplePDF([`${data.name}.title.pdf`, `${data.name}.content.pdf`], `${data.name}.pdf` );

    fs.unlinkSync(`${data.name}.title.pdf`);
    fs.unlinkSync(`${data.name}.content.raw.pdf`);
    fs.unlinkSync(`${data.name}.content.pdf`);

    await createPdf();
  }

  const parseVersionFromVersionedSidebar = (fileName) => {
    var f = fileName.split('-');
    f.pop();
    f.shift();
    return f.join('');
  };

  // create the folder path for a file if it does not exist, then write the file
  function writeFileAndCreateFolder(file, content, version, toc = [], title='') {

    // return;
    
    mkdirp.sync(path.dirname(file));    

    let localVersion = version;

    if(!versions && pkg.version) {
      localVersion = pkg.version;
    }

    cache.push({
      toc,
      content,
      title,
      version: localVersion,
      name: file.replace('.html', '')
    });

    if(!isRunning){
      isRunning = true;
      createPdf();
    }
  }

  readMetadata.generateMetadataDocs();
  const Metadata = require('../core/metadata.js');

  var docsByGuide = {};

  function prepareGuides(obj, version) {
    if(!docsByGuide[version]){
      docsByGuide[version] = {};
    }

    for (var x in obj) {
      if (Array.isArray(obj[x])) {

        if(siteConfig.pdfIgnoreDocs && Array.isArray(siteConfig.pdfIgnoreDocs)){
          docsByGuide[version][x] = obj[x].filter(e => !siteConfig.pdfIgnoreDocs.find(f => e.indexOf(f) > -1));
          continue;
        }

        docsByGuide[version][x] = obj[x];

      } else if (typeof obj[x] === 'object') {
        prepareGuides(obj[x], version);
      }
    }
  }

  function replaceInGuideById(id, file, version = '') {
    for (var x in docsByGuide[version]) {
      var i = docsByGuide[version][x].indexOf(id);
      if(docsByGuide[version][x].indexOf(id) > -1){
        docsByGuide[version][x][i] = file
      }
    }
  }

  function replaceRelativeAssetsPaths(md, version) {
    const location = siteConfig.docsUrl
    ? `${siteConfig.baseUrl}${siteConfig.docsUrl}`
    : siteConfig.baseUrl.substring(0, siteConfig.baseUrl.length - 1);

    let fencedBlock = false;
    const lines = md.split('\n').map((line) => {
      if (line.trim().startsWith('```')) {
        fencedBlock = !fencedBlock;
      }
      return fencedBlock
        ? line
        : line.replace(/\]\(\.{1,2}\/assets\//g, `](${location}/${version}/assets/`);
    });
    return lines.join('\n');
  }
  
  if(versions) {
    prepareGuides(sideBars, 'next');
  } else {    
    prepareGuides(sideBars, '');
  }

  // Todo use the sidebar field from the metadata.
  if (fs.existsSync(`${CWD}/versioned_sidebars`)) {
    const versionedSidebars = readFilesSync(`${CWD}/versioned_sidebars`);

    versionedSidebars.forEach(e => {
      const content = fs.readFileSync(e.filepath);
      const version = parseVersionFromVersionedSidebar(e.name);

      try {        
        prepareGuides(JSON.parse(content), version)
      } catch(e){
        console.error(`unable to parse`)
      }
    });
  }

  // create html files for all docs by going through all doc ids
  const mdToHtml = metadataUtils.mdToHtml(Metadata, siteConfig);
  Object.keys(Metadata).forEach((id) => {
    const metadata = Metadata[id];
    const file = docs.getFile(metadata);
    if (!file) {
      return;
    }

    if(
      siteConfig.pdfIgnoreDocs && 
      Array.isArray(siteConfig.pdfIgnoreDocs) &&
      (
        siteConfig.pdfIgnoreDocs.includes(metadata.original_id) ||
        siteConfig.pdfIgnoreDocs.includes(metadata.original_id)
      )
    ) {
      return;
    }

    let rawContent = metadataUtils.extractMetadata(file).rawContent;
    rawContent = replaceRelativeAssetsPaths(`\n\n# ${metadata.title}\n\n ${rawContent}`, metadata.version);
    
    replaceInGuideById(id, rawContent, metadata.version);
    const str = getHtmlWithAbsoluteLinks(docs.getMarkup(rawContent, mdToHtml, metadata, siteConfig), metadata.version);

    const guideToc = mdToc(rawContent).json;
    
    const targetFile = join(buildDir, metadata.permalink);
    
    writeFileAndCreateFolder(targetFile, str, metadata.version, guideToc, metadata.title);

    // // generate english page redirects when languages are enabled
    // const redirectMarkup = docs.getRedirectMarkup(metadata, siteConfig);
    // if (!redirectMarkup) {
    //   return;
    // }
    // const docsPart = `${siteConfig.docsUrl ? `${siteConfig.docsUrl}/` : ''}`;
    // const redirectFile = join(
    //   buildDir,
    //   metadata.permalink.replace(
    //     new RegExp(`^${docsPart}en`),
    //     siteConfig.docsUrl,
    //   ),
    // );
    // writeFileAndCreateFolder(redirectFile, redirectMarkup);
  });

  for(var v in docsByGuide){

    let completeDoc = '';

    for(var x in docsByGuide[v]) {
      const guide = docsByGuide[v][x].join('');
      completeDoc = `${completeDoc} \n ${guide}`;
  
      const guideToc = mdToc(guide).json;
      
      const str = getHtmlWithAbsoluteLinks(docs.getMarkup(docsByGuide[v][x].join(''), mdToHtml, {
        id: toSlug(x),
        title: x,
        source: `${x}.md`,
        permalink: path.normalize(`${buildDir}/docs/${v}/${toSlug(x)}.html`),
        localized_id: toSlug(x),
        language: 'en',
        sidebar: 'docs',
        category: 'Guides',
        subcategory: null,
        order: 1,
        version: v
      }, siteConfig),v);
      writeFileAndCreateFolder(path.normalize(`${buildDir}/docs/${v}/${toSlug(x)}.html`), str, v, guideToc, x);
    }
  
    const finalToc = mdToc(completeDoc).json;
  
    const str = getHtmlWithAbsoluteLinks(docs.getMarkup(completeDoc, mdToHtml, {
      id: toSlug(siteConfig.projectName),
      title: siteConfig.projectName,
      source: `${x}.md`,
      permalink: `${buildDir}/docs/${v}/${toSlug(siteConfig.projectName)}.html`,
      localized_id: toSlug(siteConfig.projectName),
      language: 'en',
      sidebar: 'docs',
      category: 'Documentation',
      subcategory: null,
      order: 1,
      version: v
    }, siteConfig), v);
    
    writeFileAndCreateFolder(
      path.normalize(`${buildDir}/docs/${v}/${toSlug(siteConfig.projectName)}.html`), 
      str, 
      v,
      finalToc, 
      siteConfig.projectName
    );
  }
}

process.on('uncaughtException', function (err) {
  console.log(err);
  process.abort();
});

process.on('unhandledRejection', err => {
  console.log(err);
  process.abort();
});

module.exports = execute;
