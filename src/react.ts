import { Component } from 'react'
import { StateManager } from './state-manager'
import * as PropTypes from 'prop-types'
import { shallowEqual } from './util'

const contextTypes = {
  stateManager: PropTypes.any.isRequired
}

export class Provider extends Component {

  static propTypes = {
    ...contextTypes,
    children: PropTypes.any.isRequired
  }

  static childContextTypes = contextTypes

  stateManager: StateManager<any>

  constructor(props) {
    super(props)
    this.stateManager = props.stateManager
  }
  
  getChildContext() {
    return {
      stateManager: this.stateManager
    }
  }

  render(): any {
    return this.props.children
  }

}

export class Observer extends Component {

  static contextTypes = contextTypes

  stateManager: StateManager<any>

  unsubscribeFromStateManager: Function

  constructor(props, context) {
    super(props, context)
    this.stateManager = context.stateManager
    this.state = this.mapState(this.stateManager.getState())
    this.unsubscribeFromStateManager = this.stateManager.subscribe(
      this.resetComponentState.bind(this))
  }

  mapState(state: any): any {
    return state
  }

  resetComponentState(state) {
    this.setState(() => this.mapState(state))
  }

  componentWillUnmount() {
    this.unsubscribeFromStateManager()
  }

  shouldComponentUpdate(_, nextState) {
    return !shallowEqual(this.state, nextState)
  }

}
