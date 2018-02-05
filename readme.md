# Managex

Predictable state manager with zero boilerplate, where actions are just functions with built-in support for asynchronous operations and promises. It can be described in the three fundamental principles of Redux but requires less boilerplate while let you to focus in application related concerns.

```tsx
import {StateManager} from 'managex'

// initialize state manager
const state = {count: 0}
const stateManager = new StateManager(state)

// action
const increment = async (state, x) => state.count + x

// execute actions
stateManager.do(increment, 1).then(state => {
  expect(state.count).toBe(2)
})
```

### The three fundamental principles of Redux

1. Single source of truth
2. State is read-only
3. Changes are made with pure functions

My team needed to quickly adopt a predictable state manager. Since the adoption of Redux requires to deal with _Actions_, _Actions Creators_, _Reducers_, _Combined Reducers_, _Middlewares_, and a few more _clever-named_ concepts, most of them comming from functional programming. I thought such adoption would be faster if we introduce a tool that sinthetizes those 3 fundamental principles in something more simple, with boring names, and less boilerplate.

*Managex* it just about a _State Manager_ and plain functions called _Actions_ .

## The state manager

The state manager holds the appliction state. It is the responsible of updating the application state by wrapping the actions execution, and notifying to the listeners after each state update.

```tsx
const sm = StateManager.from(INITIAL_STATE)
// alternatively
const sm = new StateManager(INITIAL_STATE)
```

## Reacting to state changes

The state can be observed by subscribing a listener to the state manager.

```tsx
const sm = StateManager.from(INITIAL_STATE)

sm.subscribe((newState) => {
  console.log(newState)
})
```

The `subscribe` method returns a function that will unsubscribe the added listener if executed.

```tsx
const unsubscribe = sm.subscribe((newState) => {
  console.log(newState)
  unsubscribe()
})
```

## Actions

Actions are plain functions that receives the state as the first argument. The rest of arguments are passed trough `do` and `will` methods of the state manager.

```tsx
const INITIAL_STATE = {
  count: 1
}

function add(state, x) {
  return {
    ...state,
    count: state.count + x
  }
}

sm.do(add, 3)

// sm.getState().count == 4
```

The `will` method returns a functions that commits the provided action when executed.

```tsx
const deferredAction = sm.will(add, 3)
deferredAction() // execute

// sm.getState().count == 4
```

## Promises and asynchronous actions

Actions can be asynchronous or return a Promise. The state manager will handle either case updating the state when appropiated.

```tsx
const INITIAL_STATE = {
  count: 1
}

async function add(state, x) {
  return {
    ...state,
    count: state.count + x
  }
}

sm.do(add, 3).then(() => {
  //sm.getState().count == 4
})
```

## Usage with React

*Managex* comes with built-in React integration. It has few primitives:

  * `Provider`, is a React component that takes a state manager and injects it to each descendant through React contexts.
  * `Observer`s are React components aware of the state manager.

To use `Observer`s you need to implement a special method called `mapState` that tells how to transform the application state to the React component state. Example:

```tsx
import {Observer} from 'managex'

class TodoList extends Observer {
  mapState(state) {
    return {
      todos: state.todos
    }
  }

  render() {
    return <ul>{this.state.todos.map(todo => <TodoItem name={todo.name} />)}</ul>
  }
}
```

The `StateManager` instance in provided as a property in each observer component. It can be referenced as `stateManager`.

```tsx
import {Observer} from 'managex'

class TodoList extends Observer {
  ...

  renderTodos() {
    return this.state.todos.map(todo => (
      <TodoItem
        name={todo.name}
        onClick={() => this.stateManager.do(completeTodo, todo.id)}
      />
    ))
  }

  ...
}
```

Example integrating `Provider` and `Observer`:

```tsx
import {Component} from 'react'
import {Provider, Observer} from 'managex'

// action
function toggleTodo(state, todoId) {
  return {
    ...state,
    todos: state.todos.map(todo => {
      if (todo.id === todoId) todo.completed = !todo.completed
      return todo
    })
  }
}

// component
class TodoItem extends Component {
  render(props) {
    return (
      <li>
        {props.name}
        <button onClick={props.onToggle}></button>
      </li>
    )
  }
}

// observer
class TodoList extends Observer {
  mapState(state) {
    return {
      todos: state.todos
    }
  }

  renderTodos() {
    const sm = this.stateManager

    return this.state.todos.map(todo => (
      <TodoItem
        name={todo.name}
        onToggle={sm.will(toggleTodo, todo.id)}
      />
    ))
  }

  render() {
    return <ul>{this.renderTodos()}</ul>
  }
}

const sm = StateManager.from({
  todos: [
    {id: 1, name: 'Buy some groceries'},
    {id: 2, name: 'Buy more groceries'}
  ]
})

ReactDOM.render(
  <Provider stateManager={sm}>
    <TodoList />
  </Provider>,
  document.getElementById('app-root')
)
```

## Batching actions

*Managex* is very simple and flexible enough to be adapeted to your application requirements. Executing several actions with *Managex* is just about composing functions.

```tsx
function add(state, x) {
  return {
    ...state,
    num: state.num + x
  }
}

function mult(state, x) {
  return {
    ...state,
    num: state.num * x
  }
}

function addAndMult(state, x, y) {
  return mult(add(state, x), y)
}

sm.do(addAndMult, 2, 3)
```

### Custom action execution

*Managex* lets you customize the way actions are executed. The custom action executor can be provided at the time of instancing a new state manager. The default `executeAction` implementation looks like the following:

```tsx
function executeAction(stateManager, action, args) {
  return action(stateManager.getState(), ...args)
}

// providing the action executor
const sm = StateManager.from(INITIAL_STATE, executeAction)
```

Example of providing a custom action executor with crash reporting:

```tsx
function reportCrash(err, action) {
  console.error('Caught an exception!', err)
  Raven.captureException(err, {
    extra: {
      action: action.toString()
      state: store.getState()
    }
  })
  throw err
}

// custom action executor
function executeAction(stateManager, action, args) {
  try {
    let result = action(stateManager.getState(), ...args)
    // suport promises
    if (result && typeof result.then === 'function') {
      result.catch((err) => reportCrash(err, action))
    }
    return result
  } catch(err) {
    reportCrash(err, action)
  }
}

const sm = StateManager.from(INITIAL_STATE, executeAction)
```

Alternatively you can make the `executeAction` asynchonous:

```tsx
async function executeAction(stateManager, action, args) {
  try {
    return await action(stateManager.getState(), ...args)
  } catch(err) {
    reportCrash(err, action)
  }
}
```

MIT (c) Yosbel Marín