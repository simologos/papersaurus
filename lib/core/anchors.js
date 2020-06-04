/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const GithubSlugger = require('github-slugger');
const toSlug = require('./toSlug');

/**
 * The anchors plugin adds GFM-style anchors to headings.
 */
function anchors(md) {
  const originalRender = md.renderer.rules.heading_open;

  md.renderer.rules.heading_open = function (tokens, idx, options, env) {

    if (!env.slugger) {
      env.slugger = new GithubSlugger();
    }
    const slugger = env.slugger;
    const textToken = tokens[idx + 1];

    if (textToken.content) {
      const anchor = toSlug(textToken.content, slugger);
      return `<h${tokens[idx].hLevel}><a id="${anchor}"></a></a>`;
    }

    return originalRender(tokens, idx, options, env);
  };
}

module.exports = anchors;
