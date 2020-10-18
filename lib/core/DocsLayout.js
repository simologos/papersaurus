/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const classNames = require('classnames');
const path = require('path');
const React = require('react');
const url = require('url');

const Doc = require('./Doc.js');
const DocsSidebar = require('./DocsSidebar.js');
const Site = require('./Site.js');
const translation = require('../server/translation.js');
const {idx} = require('./utils.js');

// component used to generate whole webpage for docs, including sidebar/header/footer
class DocsLayout extends React.Component {
  getRelativeURL = (from, to) => {
    const extension = this.props.config.cleanUrl ? '' : '.html';
    const relativeHref = path
      .relative(`${from}.html`, `${to}.html`)
      .replace('\\', '/')
      .replace(/^\.\.\//, '')
      .replace(/\.html$/, extension);
    return url.resolve(
      `${this.props.config.baseUrl}${this.props.metadata.permalink}`,
      relativeHref,
    );
  };

  render() {
    const metadata = this.props.metadata;
    const content = this.props.children;
    const i18n = translation[metadata.language];
    const id = metadata.localized_id;
    const defaultTitle = metadata.title;
    let DocComponent = Doc;

    if (this.props.Doc) {
      DocComponent = this.props.Doc;
    }
    
    const title =
      idx(i18n, ['localized-strings', 'docs', id, 'title']) || defaultTitle;
    const hasOnPageNav = this.props.config.onPageNav === 'separate';

    return (
      <Site
        config={this.props.config}
        className={classNames('sideNavVisible', {
          separateOnPageNav: hasOnPageNav,
        })}
        title={title}
        description={metadata.description || content.trim().split('\n')[0]}
        language={metadata.language}
        version={metadata.version}
        metadata={metadata}>
        <>          
          <DocsSidebar
            collapsible={false}
            content={content}
            metadata={metadata}
          />
          
          <DocComponent
            metadata={metadata}
            content={content}
            config={this.props.config}
            source={metadata.source}
            hideTitle={metadata.hide_title}
            title={title}
            version={metadata.version}
            language={metadata.language}
          />            
        </>
      </Site>
    );
  }
}
module.exports = DocsLayout;
