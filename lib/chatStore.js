import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const CHATS_DIR = path.join(process.cwd(), 'chats')

export class ChatStore {
  constructor() {
    this.ensureDirExists()
  }

  ensureDirExists() {
    if (!fs.existsSync(CHATS_DIR)) {
      fs.mkdirSync(CHATS_DIR, { recursive: true })
    }
  }

  listChats() {
    return fs.readdirSync(CHATS_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        id: file.replace('.json', ''),
        created: fs.statSync(path.join(CHATS_DIR, file)).birthtime,
        
      }))
      .sort((a, b) => b.created - a.created)
  }

  getChat(chatId) {
    const filePath = path.join(CHATS_DIR, `${chatId}.json`)
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath))
  }

  createChat() {
    const chatId = uuidv4()
    this.saveChat(chatId, [])
    return chatId
  }

  saveChat(chatId, messages) {
    const filePath = path.join(CHATS_DIR, `${chatId}.json`)
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2))
  }
}