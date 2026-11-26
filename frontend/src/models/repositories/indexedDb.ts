import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { MainTask } from '../mainTask'
import type { MiniTask } from '../miniTask'
import type { MainTaskRepository, MiniTaskRepository } from './types'

const DB_NAME = 'tarefinhas'
const DB_VERSION = 1

interface TarefinhasDB extends DBSchema {
  mainTasks: {
    key: string
    value: MainTask
  }
  miniTasks: {
    key: string
    value: MiniTask
    indexes: { byMainTaskId: string }
  }
}

function openTarefinhasDB(): Promise<IDBPDatabase<TarefinhasDB>> {
  return openDB<TarefinhasDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('mainTasks', { keyPath: 'id' })
      const miniTasks = db.createObjectStore('miniTasks', { keyPath: 'id' })
      miniTasks.createIndex('byMainTaskId', 'mainTaskId')
    },
  })
}

export function createIndexedDbRepositories(): {
  mainTasks: MainTaskRepository
  miniTasks: MiniTaskRepository
} {
  const dbPromise = openTarefinhasDB()

  const mainTasks: MainTaskRepository = {
    async listAll() {
      return (await dbPromise).getAll('mainTasks')
    },
    async createWithMiniTasks(mainTask, newMiniTasks) {
      const db = await dbPromise
      const tx = db.transaction(['mainTasks', 'miniTasks'], 'readwrite')
      await Promise.all([
        tx.objectStore('mainTasks').add(mainTask),
        ...newMiniTasks.map((miniTask) => tx.objectStore('miniTasks').add(miniTask)),
        tx.done,
      ])
    },
    async deleteWithMiniTasks(mainTaskId) {
      const db = await dbPromise
      const tx = db.transaction(['mainTasks', 'miniTasks'], 'readwrite')
      const miniTaskKeys = await tx.objectStore('miniTasks').index('byMainTaskId').getAllKeys(mainTaskId)
      await Promise.all([
        tx.objectStore('mainTasks').delete(mainTaskId),
        ...miniTaskKeys.map((key) => tx.objectStore('miniTasks').delete(key)),
        tx.done,
      ])
    },
  }

  const miniTasks: MiniTaskRepository = {
    async listAll() {
      return (await dbPromise).getAll('miniTasks')
    },
    async create(miniTask) {
      await (await dbPromise).add('miniTasks', miniTask)
    },
    async update(miniTask) {
      await (await dbPromise).put('miniTasks', miniTask)
    },
    async delete(miniTaskId) {
      await (await dbPromise).delete('miniTasks', miniTaskId)
    },
  }

  return { mainTasks, miniTasks }
}
