"use client";
import { useEffect, useState, use } from "react";
import ReactMarkdown from "react-markdown";

export default function ChatPage({ params }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const { id } = use(params);

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
      let ischange = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // console.log(value);

        // const match = buffer.match(/\{(?:[^{}]|)*\}/);
        // if (!match) break;
        // const jsonStr = match[0];
        // buffer = buffer.slice(match.index + jsonStr.length);
        buffer = decoder.decode(value, { stream: true });
        let isreason = buffer.includes("reasoning_content__");
        let arr = buffer
          .replace(/reasoning_content__|content__/g, "")
          .split(",");

        if (!isreason && !ischange) {
          ischange = true;
          assistantMessage = "";
        }

        arr.forEach((a1) => {
          let data;
          try {
            if (!a1) {
              return;
            }
            data = a1;
            // data = JSON.parse(a1);
            // ✅ 处理 chatId 跳转逻辑
            if (data.includes("chatId")) {
              shouldRedirect = true;
              reader.cancel(); // 停止读取流
              return;
              // router.push(`/chat/${data.chatId}`);
            }
            assistantMessage += data;
            setMessages((prev) => {
              // console.log("prev", prev);
              const last = prev[prev.length - 1];
              let issame = false;
              if (last?.role === "user") {
                issame = false;
              } else {
                issame =
                  (last?.role == "reason" && isreason) ||
                  (last?.role == "assistant" && !isreason);
              }
              // console.log(last.role, issame);

              let b1 = issame ? prev.slice(0, -1) : prev;
              return [
                ...b1,
                {
                  role: isreason ? "reason" : "assistant",
                  content: assistantMessage,
                },
              ];
            });
          } catch (err) {
            console.error("a1", a1);
            console.error("JSON解析错误:", err);
            // data = { content: a1 };
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

  const [collapsedMessages, setCollapsedMessages] = useState({});

  return (
    <div className="container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <button
              className="toggle-button"
              onClick={() =>
                setCollapsedMessages((prev) => ({ ...prev, [i]: !prev[i] }))
              }
            >
              {collapsedMessages[i] ? "展开" : "收缩"}
            </button>
            {!collapsedMessages[i] && (
              <ReactMarkdown>
                {msg.content.replace(/\n/g, "  \n")}
              </ReactMarkdown>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          style={{ width: "100%", height: "80px" }}
          minLength="2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
        />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
