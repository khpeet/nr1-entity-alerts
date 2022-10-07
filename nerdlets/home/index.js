import React from 'react';
import { nerdlet } from 'nr1';
import Entities from './entities';

export default class HomeNerdlet extends React.Component {

  constructor(props) {
    super(props);
    this.state = {};

    nerdlet.setConfig({
      timePicker: false
    })
  }

  render() {
    return <Entities />;
  }
}
