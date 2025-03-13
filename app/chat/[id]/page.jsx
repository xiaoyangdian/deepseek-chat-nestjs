"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

export default function ChatPage({ params }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const router = useRouter();
  const { id } = use(params);

  // 测试
  let t1 = {
    role: "assistant",
    content:
      '在 Next.js 中，获取路由参数（如 `?id=1`）的方式取决于你使用的是 **Pages Router**（传统方式）还是 **App Router**（Next.js 13+ 推荐）。以下是两种场景的解决方案：\n\n---\n\n### 方法 1：Pages Router（传统方式，如 `pages/` 目录）\n如果你使用的是 `pages/` 目录的路由模式（Pages Router），可以通过 `getServerSideProps` 或 `getStaticProps` 获取查询参数：\n\n#### 示例代码：通过 `getServerSideProps`\n```javascript\n// pages/post.js\nexport async function getServerSideProps(context) {\n  // 从查询参数中获取 id\n  const { id } = context.query; // 比如 ?id=1 → id = "1"\n\n  // 如果 id 不存在，可以返回 404 或默认值\n  if (!id) {\n    return { notFound: true };\n  }\n\n  // 获取数据（假设这里调用 API）\n  const res = await fetch(`https://api.example.com/post/${id}`);\n  const data = await res.json();\n\n  // 将数据传递给页面组件\n  return { props: { data } };\n}\n\n// 页面组件\nexport default function Post({ data }) {\n  return <div>{data.title}</div>;\n}\n```\n\n#### 参数说明：\n- `context.query` 包含所有查询参数（如 `?id=1&name=foo` → `{ id: "1", name: "foo" }`）。\n- 如果是动态路由（如 `pages/post/[id].js`），则需要通过 `context.params.id` 获取路径参数。\n\n---\n\n### 方法 2：App Router（新方式，如 `app/` 目录）\n如果你使用的是 `app/` 目录的 App Router（Next.js 13+），可以直接通过组件的 `searchParams` 属性或 `useSearchParams` 钩子获取参数：\n\n#### 示例 1：直接通过 `searchParams` 获取\n```javascript\n// app/post/page.js\nexport default function Post({ searchParams }) {\n  const { id } = searchParams; // 比如 ?id=1 → id = "1"\n\n  return <div>Post ID: {id}</div>;\n}\n```\n\n#### 示例 2：服务端组件中通过 `URL` 解析\n```javascript\n// app/post/page.js\nexport default async function Post({ searchParams }) {\n  const { id } = searchParams;\n\n  // 服务端获取数据\n  const res = await fetch(`https://api.example.com/post/${id}`);\n  const data = await res.json();\n\n  return <div>{data.title}</div>;\n}\n```\n\n---\n\n### 关键区别总结：\n| 场景                | Pages Router（`pages/`）          | App Router（`app/`）                |\n|---------------------|----------------------------------|------------------------------------|\n| **获取查询参数**      | `context.query`（在 `getServerSideProps` 中） | `searchParams`（直接传递到组件）      |\n| **动态路径参数**      | `context.params`（如 `[id].js`）   | `params` 属性（如 `app/post/[id]/page.js`） |\n| **客户端获取参数**    | `useRouter().query`（需 `next/router`） | `useSearchParams()`（需 `next/navigation`） |\n\n---\n\n### 注意事项：\n1. **类型转换**：查询参数始终是字符串，需要手动转换为数字（如 `const numId = parseInt(id)`）。\n2. **参数校验**：确保处理参数不存在的情况（如返回 404）。\n3. **安全**：如果参数用于数据库查询，避免 SQL 注入攻击（推荐使用参数化查询）。\n\n希望这些示例能解决你的问题！如果有更具体的场景，可以进一步探讨。',
  };

  // 加载历史记录
  useEffect(() => {
    const loadHistory = async () => {
      const res = await fetch(`/api/chats?id=${id}`);
      const data = await res.json();
      setMessages(data || []);
    };
    if (id) loadHistory();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 添加用户消息
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");
    try {
      // ✅ 使用 Fetch API 发送 POST 请求
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: id, message: input }),
      });

      if (!response.ok) throw new Error("请求失败");

      // ✅ 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      // 处理流式响应
      let buffer = "";
      let assistantMessage = "";
      let shouldRedirect = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // console.log(value);

        // const match = buffer.match(/\{(?:[^{}]|)*\}/);
        // if (!match) break;
        // const jsonStr = match[0];
        // buffer = buffer.slice(match.index + jsonStr.length);
        buffer = decoder.decode(value, { stream: true });
        let arr = buffer.split(",");
        arr.forEach((a1) => {
          try {
            if (!a1) {
              return;
            }
            const data = JSON.parse(a1);
            // ✅ 处理 chatId 跳转逻辑
            if (data.chatId) {
              shouldRedirect = true;
              reader.cancel(); // 停止读取流
              router.push(`/chat/${data.chatId}`);
            }
            if (data.content) {
              console.log("data", data.content);
              assistantMessage += data.content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                return last?.role === "assistant"
                  ? [
                      ...prev.slice(0, -1),
                      { ...last, content: assistantMessage },
                    ]
                  : [...prev, { role: "assistant", content: assistantMessage }];
              });
            }
          } catch (err) {
            console.error("a1", a1);
            console.error("JSON解析错误:", err);
          }
        });
        if (shouldRedirect) break;
      }
    } catch (error) {
      console.error("请求失败:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "请求失败，请重试" },
      ]);
    }
  };

  return (
    <div className="container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
        />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
