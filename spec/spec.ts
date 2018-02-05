
let StateManager = require('../lib/index').StateManager

describe('State manager', function () {
  const initialState = { todos: [] }
  let stateMgr

  function addTodo(state, newTodo) {
    return {
      ...state,
      todos: [...state.todos, newTodo]
    }
  }

  function addTodoAsync(state, newTodo) {
    return Promise.resolve(addTodo(state, newTodo))
  }

  const todo1 = { text: 'todo 1', completed: false }
  const todo2 = { text: 'todo 2', completed: true }

  beforeEach(()=> {
    stateMgr = new StateManager(initialState)
  })

  it('should allow to get state of a created update function', () => {
    expect(stateMgr.getState().todos).toEqual([])
  })

  it('should update state on action', () => {
    stateMgr.do(addTodo, todo1)
    expect(stateMgr.getState().todos[0]).toEqual(todo1)
  })

  it('should wrap the executions of a action', () => {
    const wrapped = stateMgr.will(addTodo, todo1)
    wrapped()
    expect(stateMgr.getState().todos[0]).toEqual(todo1)
  })

  it('should allow actions to return a promise', (done) => {
    stateMgr.do(addTodoAsync, todo1).then(() => {
      expect(stateMgr.getState().todos[0]).toEqual(todo1)
      done()
    })
  })

  it('should allow subscriptions', (done) => {
    const loadTodos = (state) => Promise.resolve({ ...state, todos: [todo2] })

    const unsubscribe = stateMgr.subscribe((state) => {
      expect(state.todos[0]).toEqual(todo2)
      unsubscribe()
      done()
    })

    stateMgr.do(loadTodos)
  })

})