import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { ChatStore } from '@/lib/chatStore'

const openai = new OpenAI({
    baseURL: process.env.DEEPSEEK_API_BASE,
    apiKey: process.env.DEEPSEEK_API_KEY,
})

export async function POST(req) {
    const { chatId, message } = await req.json()
    const store = new ChatStore()

    try {
        console.log('请求', message);

        // 获取或创建对话
        let messages = chatId ? store.getChat(chatId) : []
        console.log('message', messages);
        if (!messages) messages = []

        // 添加用户消息
        messages.push({ role: 'user', content: message })

        // 流式响应
        const stream = await openai.chat.completions.create({
            messages,
            model: "deepseek-reasoner",
            max_tokens: 1000,
            stream: true,
        })

        // 创建响应流
        const encoder = new TextEncoder()
        const readableStream = new ReadableStream({
            async start(controller) {
                let assistantReply = ''
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || ''
                    if (content) {
                        console.log(content);
                        assistantReply += content
                        controller.enqueue(encoder.encode(`${JSON.stringify({ content })},`))
                    }

                }

                // 保存完整对话
                messages.push({ role: 'assistant', content: assistantReply })
                const finalChatId = chatId || store.createChat()
                store.saveChat(finalChatId, messages)
                console.log('最新messages', messages);
                controller.enqueue(encoder.encode(`{"chatId": "${finalChatId}"}`))
                controller.close()
            }
        })

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        })

    } catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

export async function GET(req) {


}