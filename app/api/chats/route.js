import { NextResponse } from 'next/server'
import { ChatStore } from '@/lib/chatStore'

export async function GET(req) {
  try {
    const store = new ChatStore()
    const chats = store.listChats()
    const id  = req.url.split('?id=')[1]
    console.log(req.url);
    if (id) {
      console.log(store.getChat(id));
    }

    return NextResponse.json(store.getChat(id))
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load chat list' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const store = new ChatStore()
    const chatId = store.createChat()
    return NextResponse.json({ id: chatId }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create new chat' },
      { status: 500 }
    )
  }
}