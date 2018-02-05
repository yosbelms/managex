import { isThenable, append, remove } from './util'

export type Action<State> = (state, ...args: any[]) => (State | Promise<State>)

export type ActionExecutor<State> = (
  stateManager: StateManager<State>,
  action: Action<State>,
  args: any[]
) => (State | Promise<State>)

/** Manages a state */
export class StateManager<State> {

  private currentListeners: Function[] = []

  private nextListeners: Function[] = []

  private state: State

  private executeAction: ActionExecutor<State>

  constructor(state: State, executeAction: ActionExecutor<State> = defaultExecuteAction) {
    this.setState(state)
    this.executeAction = executeAction
  }

  static from(state: any, execute) {
    return new StateManager(state, execute)
  }

  /** Sets a new state */
  setState(state: State) {
    this.state = Object.freeze(state)
  }
  
  /** Returns the current state */
  getState() {
    return this.state
  }

  /** Executes an function passing the current state as the
  first argument followed by `args` as the rest of arguments */
  do(func: Action<State>, ...args: any[]) {
    const newState = this.executeAction(this, func, args)
    const updateState = (_newState) => {
      this.setState(_newState)
      this.notifyListeners(this.state, [func, args])
      return this.state
    }

    return (isThenable(newState)
      ? (newState as Promise<State>).then(updateState)
      : updateState(newState))
  }

  /** Return a function that executes the provided function passing
  the current state as the first argument and `args` as the rest of arguments */
  will(func: Action<State>, ...args: any[]) {
    return () => this.do(func, ...args)
  }

  /** Adds a listener to the state manager that will execute after each state update,
  returns a function that unsubscribes the recently subscribed listener if executed */
  subscribe(listener: Function) {
    this.nextListeners = append(this.nextListeners, listener)
    return () => this.unsubscribe(listener)
  }

  /** Removes a listener from the state manager */
  private unsubscribe(listener: Function) {
    this.nextListeners = remove(this.currentListeners, listener)
  }

  /** Executes all subscribed currentListeners passing the provided state as argument */
  private notifyListeners(newState: State, args: any[]) {
    this.currentListeners = this.nextListeners
    this.currentListeners.forEach(listener => {
      listener(newState, args)
    })
  }
}

/** Executes an action */
function defaultExecuteAction<State>(
  stateManager: StateManager<State>,
  action: Action<State>,
  args: any[]
): (State | Promise<State>) {
  return action(stateManager.getState(), ...args)
}
