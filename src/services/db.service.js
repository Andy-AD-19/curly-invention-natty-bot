import { JSONFilePreset } from 'lowdb/node'

// Initial database structure
const defaultData = { users: {} }

export const getDb = async () => {
  const db = await JSONFilePreset('data/db.json', defaultData)
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
