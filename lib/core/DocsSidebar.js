/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const OnPageNav = require('./nav/OnPageNav.js');

class DocsSidebar extends React.Component {
  render() {
    const {category} = this.props.metadata;

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
