import { JSONFilePreset } from 'lowdb/node'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.resolve(__dirname, '../../data/db.json')

console.log('DB path:', dbPath)

const defaultData = { users: {} }

export const getDb = async () => {
  const db = await JSONFilePreset(dbPath, defaultData)
  return db
}

export const getUserState = async (chatId) => {
  const db = await getDb()
  return db.data.users[chatId] || null
}

export const saveUserState = async (chatId, state) => {
  const db = await getDb()
  db.data.users[chatId] = state
  await db.write()
}

export const clearUserState = async (chatId) => {
  const db = await getDb()
  delete db.data.users[chatId]
  await db.write()
}
