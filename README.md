## Introduction

A PDF generator for Docusaurus 1.x documentation pages, based on [Docusaurus](https://docusaurus.io/) and [Puppeteer](https://pptr.dev/).
It's sad but even in 2020, PDF based documentation is still a thing...

This project is build on [Docusaurus](https://docusaurus.io/) 1.x. I basically took the code and modified it to generate PDF's.

### Please note

1. Puppeteer does not yet support individual headers / footers for the cover page. Therefore this package generates a PDF with just uses [easy-pdf-merge](https://www.npmjs.com/package/easy-pdf-merge) See [this SO question](https://stackoverflow.com/questions/55470714/trying-to-hide-first-footer-header-on-pdf-generated-with-puppeteer)

2. Puppeteer does not yet support the generation of TOCs. See [this feature request](https://github.com/puppeteer/puppeteer/issues/1778) and [this Chromium bug](https://bugs.chromium.org/p/chromium/issues/detail?id=840455). Therefore this package generates a PDF, then parses it again to update the page numbers in the TOC. Therefore the pdfFooterParser...


## Installation

Install in your website folder and add the following script to the package.json of your website.

```
"build:pdf": "papersaurus-build",
```

## Configuration

Adapt the siteConfig.js of your website to contain the following keys:

### pdfBuildDir

The directory in your website folder in which the PDF files will be saved. Depending on the usage, it is useful to have this option available. For example if set to ```build```, the PDF are saved next to the (previously) generated website. In this case it is easy to download the PDF files from the web based documentation.

Default: ```print```

### pdfBuildDirCleanUp

If set to true, the directory passed in [pdfBuildDir](#pdfBuildDir) will be removed before generating the PDF files. In case the PDF files should be saved in your ```build``` directory, set this configuration key to false in order to not delete the previously generated static website.

Default: ```true```

### pdfIgnoreDocs

Array of doc ID's to ignore.

### pdfStylesheets

Add the style sheets you would use for printing here. Add the same as in ```stylesheets``` if you want to use the styles used on the docusaurus web page.

### pdfScripts

Add the scripts you would use for printing here. Add the same as in ```scripts``` if you want to use the scripts used on the docusaurus web page.

### pdfCoverPageHeader

String containing HTML code which will be displayed as the header of the cover page.

### pdfCoverPageHeader

String containing HTML code which will be displayed as the footer of the cover page.

### getPdfCoverPage

Function which returns the Cover Page as HTML. Example:

```
getPdfCoverPage: (siteConfig, pageTitle, version) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      
    </head>

      <body>
        <div style="margin: 2cm;">
          <h1 style="color:#005479;font-size:28px;font-family:sans-serif;font-weight:bold">${siteConfig.projectName}<h1>
          <h2 style="color:#005479;font-size:16px;font-family:sans-serif;">${(pageTitle || siteConfig.tagline)}<h2>

          <dl style="font-family:sans-serif;margin-top:10em;display: flex; flex-flow: row; flex-wrap: wrap; width: 600px; overflow: visible;color:#005479;font-size:12px;font-weight:normal;">
            <dt style="margin-top:1em;flex: 0 0 20%; text-overflow: ellipsis; overflow: hidden;">Author:</dt>    
            <dd style="margin-top:1em;flex:0 0 80%; margin-left: auto; text-align: left;text-overflow: ellipsis; overflow: hidden;">Your name</dd>
            <dt style="margin-top:1em;flex: 0 0 20%; text-overflow: ellipsis; overflow: hidden;">Date:</dt>
            <dd style="margin-top:1em;flex:0 0 80%; margin-left: auto; text-align: left;text-overflow: ellipsis; overflow: hidden;">${new Date().toISOString().substring(0,10)}</dd>
          </dl>
        </div>
      </body>

    </html>
  `;
}
```

### getPdfPageHeader

Function which returns the Header of the content pages as HTML. Example:

```
getPdfPageHeader: (siteConfig, pageTitle) => {
    return `
      <div style="justify-content: center;align-items: center;height:2.5cm;display:flex;margin: 0 1.5cm;color: #005479;font-size:9px;font-family:sans-serif;width:100%;">
        <div style="flex-grow: 1; width: 50%; text-align:left;margin-left:-3px">
          <img 
            style='display:block; width:2cm;' 
            id='base64image'                 
            src='data:image/svg+xml;base64, <Your Logo as base64>' 
          />
        </div>
        <span style="flex-grow: 1; width: 50%; text-align:right;">${pageTitle}</span>
      </div>
    `;
  },
```

### getPdfPageFooter

Function which returns the Footer of the content pages as HTML. Example:

```
getPdfPageFooter: (siteConfig, pageTitle) => {
  return `
    <div style="height:1cm;display:flex;margin: 0 1.5cm;color: #005479;font-size:9px;font-family:sans-serif;width:100%;">
      <span style="flex-grow: 1; width: 33%;">© You</span>
      <span style="flex-grow: 1; width: 33%; text-align:center;">${new Date().toISOString().substring(0,10)}</span>
      <span style="flex-grow: 1; width: 33%; text-align:right;">Page <span class='pageNumber'></span> / <span class='totalPages'></span></span>
    </div>`;
},
```

Puppeteer uses classes to inject values at print time. See: https://pptr.dev/#?product=Puppeteer&version=v3.0.4&show=api-pagepdfoptions

### pdfAuthor

String you would like to use as author.

### pdfFooterParser

In order to update the TOC with the correct page numbers, this package has to parse the generated PDF and then manually update the TOC. In order to split the parsed text by pages, a regex expression is used to identify the content footer text. Think of calling jQuery's ```$.text()``` on the footer wrapper. The regular expression must match this text.

Example:

```/© Your Company\d{4}-\d{2}-\d{2}Page \d* \/ \d*/g```

## Limitation

- Just documentations are generated, no pages or blog posts
- No support for translations
