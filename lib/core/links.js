/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const GithubSlugger = require('github-slugger');
const Metadata = require('./metadata.js');

const slugger = new GithubSlugger();

function getSluggedText(fileName) {

    const keys = Object.keys(Metadata);

    for(let i = 0, il = keys.length; i < il; i++){
        const metadata = Metadata[keys[i]];

        if(metadata.permalink.indexOf(fileName) > -1) {          
          slugger.reset();
          return slugger.slug(metadata.title);   
        }
     
    }

    return '';
};

function getLinkFromHref(href) {
    let hash = href.split('#');
  
    if(hash.length > 1) {
        return hash[hash.length -1];
    }
    
    hash = href.split('/');
    
    return getSluggedText(hash[hash.length -1]);
};

function links(md) {
  const originalRender = md.renderer.rules.link_open;

  md.renderer.rules.link_open = function (tokens, idx, options, env) {
    if (!env.slugger) {
      env.slugger = new GithubSlugger();
    }

    const link = tokens[idx];
    // console.log(tokens[idx])
    // console.log(tokens[idx +1])

    if(link.href.indexOf('http') === 0){
        return originalRender(tokens, idx, options, env);
    }

    if (link.href && tokens[idx +1] && tokens[idx +1].content) {      
      return `<a href="#${getLinkFromHref(link.href)}">`;
    }

    return originalRender(tokens, idx, options, env);
  };
}

module.exports = links;
