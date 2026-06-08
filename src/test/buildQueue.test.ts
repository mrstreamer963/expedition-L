import { describe, it, expect } from 'vitest'
import { BuildQueue, BuildTask } from '../game/entities/building'
import { WorkGiver } from '../game/colony/workGiver'

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

describe('WorkGiver', () => {
  it('reserve succeeds on unreserved task and sets reservedBy', () => {
    const giver = new WorkGiver()
    const task = makeTask()
    const result = giver.reserve(task, 'colonist-1')
    expect(result).toBe(true)
    expect(task.reservedBy).toBe('colonist-1')
  })

  it('reserve fails on already reserved task', () => {
    const giver = new WorkGiver()
    const task = makeTask({ reservedBy: 'colonist-1' })
    const result = giver.reserve(task, 'colonist-2')
    expect(result).toBe(false)
    expect(task.reservedBy).toBe('colonist-1')
  })

  it('release clears reservation', () => {
    const giver = new WorkGiver()
    const task = makeTask({ reservedBy: 'colonist-1' })
    giver.release(task)
    expect(task.reservedBy).toBeNull()
  })
})
