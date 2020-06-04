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
  const pjson = require(`${CWD}/package.json`);
  const join = path.join;
  const merge = require('easy-pdf-merge');
  const pdf = require('pdf-parse');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const sideBars = require(`${CWD}/sideBars.json`);
  const toSlug = require('../core/toSlug.js');

  const server = require('./start.js');
  server.startServer();

  const pdfFooterRegex = new RegExp(siteConfig.pdfFooterParser);

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
    await contentPage.goto('http://localhost:3000/servicenow-integration/');
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
      process.exit();
    }

    console.log(`Create PDF for ${data.name}`);

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

  // create the folder path for a file if it does not exist, then write the file
  function writeFileAndCreateFolder(file, content, version, toc = [], title='') {
    
    mkdirp.sync(path.dirname(file));

    cache.push({
      toc,
      content,
      title,
      version,
      name: file.replace('.html', '')
    });

    if(!isRunning){
      isRunning = true;
      createPdf();
    }
  }

  console.log('generate.js triggered...');

  const buildDir = join(CWD, 'print');
  fs.removeSync(join(CWD, 'print'));

  readMetadata.generateMetadataDocs();
  const Metadata = require('../core/metadata.js');

  var docsByGuide = {};

  function prepareGuides(obj) {
    for (var x in obj) {
      if (Array.isArray(obj[x])) {

        if(siteConfig.pdfIgnoreDocs && Array.isArray(siteConfig.pdfIgnoreDocs)){
          docsByGuide[x] = obj[x].filter(e => !siteConfig.pdfIgnoreDocs.includes(e));
          continue;
        }

        docsByGuide[x] = obj[x];

      } else if (typeof obj[x] === 'object') {
        prepareGuides(obj[x])
      }
    }
  }

  function replaceInGuideById(id, file) {
    for (var x in docsByGuide) {
      var i = docsByGuide[x].indexOf(id);
      if(docsByGuide[x].indexOf(id) > -1){
        docsByGuide[x][i] = file
      }
    }
  }
  
  prepareGuides(sideBars);

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
      siteConfig.pdfIgnoreDocs.includes(metadata.id)
    ){
      return;
    }

    if(metadata.version !== 'next') {
      return;
    }

    let rawContent = metadataUtils.extractMetadata(file).rawContent;
    rawContent = `\n\n# ${metadata.title}\n\n ${rawContent}`;
    replaceInGuideById(id, rawContent);
    const str = docs.getMarkup(rawContent, mdToHtml, metadata, siteConfig);

    const guideToc = mdToc(rawContent).json;
    
    const targetFile = join(buildDir, metadata.permalink);    

    writeFileAndCreateFolder(targetFile, str, pjson.version, guideToc, metadata.title);

    // generate english page redirects when languages are enabled
    const redirectMarkup = docs.getRedirectMarkup(metadata, siteConfig);
    if (!redirectMarkup) {
      return;
    }
    const docsPart = `${siteConfig.docsUrl ? `${siteConfig.docsUrl}/` : ''}`;
    const redirectFile = join(
      buildDir,
      metadata.permalink.replace(
        new RegExp(`^${docsPart}en`),
        siteConfig.docsUrl,
      ),
    );
    writeFileAndCreateFolder(redirectFile, redirectMarkup);
  });

  let completeDoc = '';
  for(var x in docsByGuide) {
    const guide = docsByGuide[x].join('');
    completeDoc = `${completeDoc} \n ${guide}`;

    const guideToc = mdToc(guide).json;
    
    const str = docs.getMarkup(docsByGuide[x].join(''), mdToHtml, {
      id: toSlug(x),
      title: x,
      source: `${x}.md`,
      permalink: path.normalize(`${buildDir}/docs/${toSlug(x)}.html`),
      localized_id: toSlug(x),
      language: 'en',
      sidebar: 'docs',
      category: 'Guides',
      subcategory: null,
      order: 1
    }, siteConfig);
    writeFileAndCreateFolder(path.normalize(`${buildDir}/docs/${toSlug(x)}.html`), str, pjson.version, guideToc, x);
  }

  const finalToc = mdToc(completeDoc).json;

  const str = docs.getMarkup(completeDoc, mdToHtml, {
    id: toSlug(siteConfig.projectName),
    title: siteConfig.projectName,
    source: `${x}.md`,
    permalink: `${buildDir}/docs/${toSlug(siteConfig.projectName)}.html`,
    localized_id: toSlug(siteConfig.projectName),
    language: 'en',
    sidebar: 'docs',
    category: 'Documentation',
    subcategory: null,
    order: 1
  }, siteConfig);
  
  writeFileAndCreateFolder(
    path.normalize(`${buildDir}/docs/${toSlug(siteConfig.projectName)}.html`), 
    str, 
    pjson.version,
    finalToc, 
    siteConfig.projectName
  );
}

module.exports = execute;
