import React from 'react';

/**
 * Legacy context support thanks to:
 * this post : https://gazedash.com/all/how-to-support-legacy-react-context/
 * this post was only missing info about `childContextTypes` which I got from here:
 * https://reactjs.org/docs/legacy-context.html
 */
export const createLegacyContextSupport = (contextTypes) => {
  const LegacyContextSupport = class extends React.Component {
    getChildContext() {
      return this.props.context;
    }

    render() {
      return this.props.children;
    }
  }

  LegacyContextSupport.contextTypes = contextTypes;
  LegacyContextSupport.childContextTypes = contextTypes;
  return LegacyContextSupport;
}
