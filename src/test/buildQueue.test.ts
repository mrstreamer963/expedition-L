import { describe, it, expect } from 'vitest'
import { BuildQueue, BuildTask } from '../game/entities/building'

function makeTask(overrides: Partial<BuildTask> = {}): BuildTask {
  return {
    id: 'task-1',
    type: 'wall',
    x: 5,
    y: 5,
    reservedBy: null,
    ...overrides,
  }
}

describe('BuildQueue', () => {
  it('add increases length', () => {
    const queue = new BuildQueue()
    queue.add(makeTask())
    expect(queue.length).toBe(1)
  })

  it('pop returns and removes first task (FIFO order)', () => {
    const queue = new BuildQueue()
    const task1 = makeTask({ id: 'task-1', x: 1, y: 1 })
    const task2 = makeTask({ id: 'task-2', x: 2, y: 2 })
    queue.add(task1)
    queue.add(task2)

    const first = queue.pop()
    expect(first?.id).toBe('task-1')
    expect(queue.length).toBe(1)

    const second = queue.pop()
    expect(second?.id).toBe('task-2')
    expect(queue.length).toBe(0)
  })

  it('peek returns first task without removing', () => {
    const queue = new BuildQueue()
    const task = makeTask()
    queue.add(task)

    const result = queue.peek()
    expect(result?.id).toBe(task.id)
    expect(queue.length).toBe(1)
  })

  it('pop returns null from empty queue', () => {
    const queue = new BuildQueue()
    expect(queue.pop()).toBeNull()
  })

  it('toJSON returns tasks array', () => {
    const queue = new BuildQueue()
    queue.add(makeTask({ id: 'task-1', type: 'wall' }))
    queue.add(makeTask({ id: 'task-2', type: 'bed' }))

    const json = queue.toJSON()
    expect(json.tasks).toHaveLength(2)
    expect(json.tasks[0].id).toBe('task-1')
    expect(json.tasks[1].id).toBe('task-2')
  })
})


