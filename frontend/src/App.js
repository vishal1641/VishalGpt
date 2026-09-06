import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

function App() {
  // ==============================
  // STATE
  // ==============================

  const [question, setQuestion] = useState("");

  const [messages, setMessages] = useState([]);

  const [loading, setLoading] = useState(false);

  const [chats, setChats] = useState([]);

  const [currentChatId, setCurrentChatId] = useState(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ==============================
  // LOAD CHAT HISTORY
  // ==============================

  useEffect(() => {
    const savedChats = localStorage.getItem("vishalgpt_chats");

    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats);

        setChats(parsedChats);
      } catch (error) {
        console.error("Could not load chat history:", error);
      }
    }
  }, []);

  // ==============================
  // SAVE CHAT HISTORY
  // ==============================

  useEffect(() => {
    localStorage.setItem("vishalgpt_chats", JSON.stringify(chats));
  }, [chats]);

  // ==============================
  // CREATE CHAT TITLE
  // ==============================

  const createChatTitle = (text) => {
    const cleanedText = text.replace(/\s+/g, " ").trim();

    if (cleanedText.length <= 40) {
      return cleanedText;
    }

    return cleanedText.substring(0, 40) + "...";
  };

  // ==============================
  // NEW CHAT
  // ==============================

  const newChat = () => {
    setCurrentChatId(null);

    setMessages([]);

    setQuestion("");

    setSidebarOpen(false);
  };

  // ==============================
  // SELECT OLD CHAT
  // ==============================

  const selectChat = (chat) => {
    setCurrentChatId(chat.id);

    setMessages(chat.messages);

    setQuestion("");

    setSidebarOpen(false);
  };

  // ==============================
  // DELETE CHAT
  // ==============================

  const deleteChat = (chatId) => {
    const updatedChats = chats.filter((chat) => chat.id !== chatId);

    setChats(updatedChats);

    // If deleting currently open chat
    if (chatId === currentChatId) {
      setCurrentChatId(null);

      setMessages([]);

      setQuestion("");
    }
  };

  // ==============================
  // UPDATE CURRENT CHAT
  // ==============================

  const updateCurrentChat = (chatId, updatedMessages) => {
    setChats((prevChats) => {
      return prevChats.map((chat) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: updatedMessages,
          };
        }

        return chat;
      });
    });
  };

  // ==============================
  // ASK QUESTION
  // ==============================

  const askQuestion = async (customQuestion = null) => {
    const currentQuestion = customQuestion !== null ? customQuestion : question;

    if (!currentQuestion.trim() || loading) {
      return;
    }

    const trimmedQuestion = currentQuestion.trim();

    // ==================================
    // CREATE NEW CHAT IF NEEDED
    // ==================================

    let chatId = currentChatId;

    if (!chatId) {
      chatId = Date.now().toString();

      setCurrentChatId(chatId);

      const newChatObject = {
        id: chatId,

        title: createChatTitle(trimmedQuestion),

        messages: [],
      };

      setChats((prevChats) => [newChatObject, ...prevChats]);
    }

    // ==================================
    // USER MESSAGE
    // ==================================

    const userMessage = {
      role: "user",

      content: trimmedQuestion,
    };

    const assistantMessage = {
      role: "assistant",

      content: "",
    };

    const updatedMessages = [...messages, userMessage, assistantMessage];

    setMessages(updatedMessages);

    // Update chat immediately
    updateCurrentChat(chatId, updatedMessages);

    setQuestion("");

    setLoading(true);

    try {
      // ==================================
      // CALL FASTAPI
      // ==================================

      const response = await fetch("https://vishalgpt.onrender.com//chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          question: trimmedQuestion,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // ==================================
      // READ RESPONSE
      // ==================================

      const contentType = response.headers.get("content-type") || "";

      let assistantMessageText = "";

      // ==================================
      // NORMAL JSON RESPONSE
      // ==================================

      if (contentType.includes("application/json")) {
        const data = await response.json();

        let answer = data.answer;

        // Handle array response
        if (Array.isArray(answer)) {
          answer = answer.join("");
        }

        assistantMessageText = String(answer || "");
      }

      // ==================================
      // STREAMING / TEXT RESPONSE
      // ==================================
      else {
        const reader = response.body.getReader();

        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, {
            stream: true,
          });

          assistantMessageText += chunk;

          const streamingMessages = [
            ...messages,
            userMessage,
            {
              role: "assistant",

              content: assistantMessageText,
            },
          ];

          setMessages(streamingMessages);

          updateCurrentChat(chatId, streamingMessages);
        }
      }

      // ==================================
      // FINAL MESSAGE
      // ==================================

      const finalMessages = [
        ...messages,
        userMessage,
        {
          role: "assistant",

          content: assistantMessageText,
        },
      ];

      setMessages(finalMessages);

      updateCurrentChat(chatId, finalMessages);
    } catch (error) {
      console.error(error);

      const errorMessages = [
        ...messages,
        userMessage,
        {
          role: "assistant",

          content: "Something went wrong while connecting to VishalGPT.",
        },
      ];

      setMessages(errorMessages);

      updateCurrentChat(chatId, errorMessages);
    }

    setLoading(false);
  };

  // ==============================
  // KEYBOARD HANDLER
  // ==============================

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      askQuestion();
    }
  };

  // ==============================
  // SUGGESTIONS
  // ==============================

  const suggestionClick = (text) => {
    askQuestion(text);
  };

  // ==============================
  // COPY MESSAGE
  // ==============================

  const copyMessage = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Could not copy message:", error);
    }
  };

  // ==============================
  // SUGGESTION DATA
  // ==============================

  const suggestions = [
    {
      title: "Education",
      text: "What is Vishal's educational background?",
    },

    {
      title: "Skills",
      text: "What are Vishal's technical skills?",
    },

    {
      title: "Projects",
      text: "Tell me about Vishal's projects.",
    },

    {
      title: "Experience",
      text: "Tell me about Vishal's experience.",
    },
  ];

  // ==============================
  // UI
  // ==============================

  return (
    <div className="app">
      {/* =================================
                MOBILE OVERLAY
            ================================= */}

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =================================
                SIDEBAR
            ================================= */}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        {/* Logo */}

        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">V</div>

            <span>VishalGPT</span>
          </div>

          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        {/* New Chat */}

        <button className="new-chat-button" onClick={newChat}>
          <span className="new-chat-icon">+</span>

          <span>New chat</span>
        </button>
        <a
          href="https://vishalgpt.onrender.com/download-resume"
          className="download-resume"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>↓</span>
          Download Resume
        </a>

        {/* Chat History */}

        <div className="history-section">
          <div className="history-title">Recent chats</div>

          <div className="chat-list">
            {chats.length === 0 ? (
              <div className="empty-history">No conversations yet</div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`chat-history-item ${
                    chat.id === currentChatId ? "active-chat" : ""
                  }`}
                  onClick={() => selectChat(chat)}
                >
                  <div className="chat-history-content">
                    <span className="chat-history-icon">◇</span>

                    <span className="chat-title">{chat.title}</span>
                  </div>

                  <button
                    className="delete-chat-button"
                    onClick={(e) => {
                      e.stopPropagation();

                      deleteChat(chat.id);
                    }}
                    title="Delete chat"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Bottom */}

        <div className="sidebar-bottom">
          <div className="connection-card">
            <div className="connection-icon">✓</div>

            <div>
              <div className="connection-title">Resume connected</div>

              <div className="connection-subtitle">Vishal's resume</div>
            </div>
          </div>

          <div className="online-status">
            <span className="status-dot" />
            AI Online
          </div>
        </div>
      </aside>

      {/* =================================
                MAIN AREA
            ================================= */}

      <main className="main">
        {/* =================================
                    TOP BAR
                ================================= */}

        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)}>
            ☰
          </button>

          <div className="mobile-brand">
            <div className="brand-icon">V</div>

            <span>VishalGPT</span>
          </div>

          <div className="topbar-right">
            <span className="top-status-dot" />

            <span>Online</span>
          </div>
        </header>

        {/* =================================
                    CONTENT
                ================================= */}

        <div className="content">
          {/* =================================
                        WELCOME SCREEN
                    ================================= */}

          {messages.length === 0 ? (
            <div className="welcome-container">
              <div className="welcome-icon">V</div>

              <h1>
                What would you like
                <br />
                to know about Vishal?
              </h1>

              <p className="welcome-subtitle">
                Ask anything about Vishal's education, skills, projects, and
                experience.
              </p>

              <div className="suggestions">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.title}
                    className="suggestion-card"
                    onClick={() => suggestionClick(suggestion.text)}
                  >
                    <div className="suggestion-title">{suggestion.title}</div>

                    <div className="suggestion-text">{suggestion.text}</div>

                    <span className="suggestion-arrow">→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* =================================
                            CHAT
                        ================================= */

            <div className="chat-container">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`message-row ${
                    message.role === "user" ? "user-row" : "assistant-row"
                  }`}
                >
                  {/* Avatar */}

                  <div
                    className={`message-avatar ${
                      message.role === "user"
                        ? "user-avatar"
                        : "assistant-avatar"
                    }`}
                  >
                    {message.role === "user" ? "U" : "V"}
                  </div>

                  {/* Message */}

                  <div className="message-content">
                    <div className="message-name">
                      {message.role === "user" ? "You" : "VishalGPT"}
                    </div>

                    <div className="message-text">
                      {message.role === "assistant" ? (
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      ) : (
                        message.content
                      )}

                      {/* Streaming cursor */}

                      {loading &&
                        index === messages.length - 1 &&
                        message.role === "assistant" && (
                          <span className="typing-cursor">▌</span>
                        )}
                    </div>

                    {/* Copy button */}

                    {message.role === "assistant" && message.content && (
                      <button
                        className="copy-button"
                        onClick={() => copyMessage(message.content)}
                      >
                        ⧉ Copy
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =================================
                    INPUT AREA
                ================================= */}

        <div className="input-area">
          <div className="input-wrapper">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask something about Vishal..."
              rows={1}
              disabled={loading}
            />

            <button
              className={`send-button ${
                question.trim() && !loading ? "send-active" : ""
              }`}
              onClick={() => askQuestion()}
              disabled={!question.trim() || loading}
            >
              {loading ? <span className="loading-spinner" /> : "↑"}
            </button>
          </div>

          <div className="input-footer">
            VishalGPT can only answer questions based on Vishal's resume.
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
