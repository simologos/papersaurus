/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');

const Head = require('./Head.js');

const translation = require('../server/translation.js');
const env = require('../server/env.js');
const {idx, getPath} = require('./utils.js');

// Component used to provide same head, header, footer, other scripts to all pages
class Site extends React.Component {
  mobileNavHasOneRow(headerLinks) {
    const hasLanguageDropdown =
      env.translation.enabled && env.translation.enabledLanguages().length > 1;
    const hasOrdinaryHeaderLinks = headerLinks.some(
      (link) => !(link.languages || link.search),
    );
    return !(hasLanguageDropdown || hasOrdinaryHeaderLinks);
  }

  render() {
    const tagline =
      idx(translation, [this.props.language, 'localized-strings', 'tagline']) ||
      this.props.config.tagline;
    const title = this.props.title
      ? `${this.props.title} · ${this.props.config.title}`
      : (!this.props.config.disableTitleTagline &&
          `${this.props.config.title} · ${tagline}`) ||
        this.props.config.title;
    const description = this.props.description || tagline;
    const path = getPath(
      this.props.config.baseUrl + (this.props.url || 'index.html'),
      this.props.config.cleanUrl,
    );
    const url = this.props.config.url + path;
    

    return (
      <html lang={this.props.language}>
        <Head
          config={this.props.config}
          description={description}
          title={title}
          url={url}
          language={this.props.language}
          version={this.props.version}
        />
        <body className={this.props.className}>
          {this.props.children}
        </body>
      </html>
    );
  }
}
module.exports = Site;
