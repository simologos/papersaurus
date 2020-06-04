/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const fs = require('fs');
const SideNav = require('./nav/SideNav.js');
const Metadata = require('./metadata.js');

const OnPageNav = require('./nav/OnPageNav.js');
const readCategories = require('../server/readCategories.js');

let languages;

const CWD = process.cwd();
if (fs.existsSync(`${CWD}/languages.js`)) {
  languages = require(`${CWD}/languages.js`);
} else {
  languages = [
    {
      enabled: true,
      name: 'English',
      tag: 'en',
    },
  ];
}

class DocsSidebar extends React.Component {
  render() {
    const {category, sidebar, title} = this.props.metadata;

    if (!category) {
      return null;
    }

    return (
      <>
        <h1 className="ignoreCounter">Contents</h1>
        <OnPageNav rawContent={this.props.content} />
      </>
    );
  }
}

module.exports = DocsSidebar;
