import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import './Messages.css';

const Messages = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allMessages, setAllMessages] = useState([]);
  const messagesListRef = useRef(null);
  const wsRef = useRef(null); // WebSocket referansı

  // ObjectId doğrulama fonksiyonu
  const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

  // Mesajlaşmış kullanıcıları fetch eden fonksiyon
  const fetchMessagedUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token yok, lütfen giriş yapın');

      const storedUserId = localStorage.getItem('userId');
      if (!storedUserId || !isValidObjectId(storedUserId)) {
        throw new Error('Geçersiz kullanıcı ID');
      }

      const msgRes = await axios.get('http://localhost:5500/api/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllMessages(msgRes.data);

      const uniqueUsers = new Map();
      msgRes.data.forEach((msg) => {
        if (msg.sender && msg.sender._id.toString() !== storedUserId) {
          uniqueUsers.set(msg.sender._id.toString(), msg.sender);
        }
        if (msg.receiver && msg.receiver._id.toString() !== storedUserId) {
          uniqueUsers.set(msg.receiver._id.toString(), msg.receiver);
        }
      });

      setUsers(Array.from(uniqueUsers.values()));
    } catch (err) {
      console.error('Mesajlaşmış kullanıcılar fetch hatası:', err);
      setUsers([]);
    }
  }, []);

  // Seçili kullanıcı için mesajları fetch eden fonksiyon
  const fetchMessagesForUser = useCallback(
    async (user) => {
      try {
        const storedUserId = localStorage.getItem('userId');
        const userMessages = allMessages
          .filter(
            (msg) =>
              msg.sender &&
              msg.receiver &&
              ((msg.sender._id?.toString() === user._id &&
                msg.receiver._id?.toString() === storedUserId) ||
                (msg.sender._id?.toString() === storedUserId &&
                  msg.receiver._id?.toString() === user._id))
          )
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        setMessages(userMessages);
        setSelectedUser(user);
        setTimeout(() => {
          if (messagesListRef.current) {
            messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
          }
        }, 0);
      } catch (err) {
        console.error('Mesaj fetch hatası:', err);
      }
    },
    [allMessages]
  );

  // WebSocket bağlantısı
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId || !isValidObjectId(storedUserId)) {
      console.error('WebSocket: Geçersiz veya eksik userId:', storedUserId);
      return;
    }

    console.log('Initializing WebSocket for userId:', storedUserId);
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connectWebSocket = () => {
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.error('WebSocket: Maksimum yeniden bağlanma denemesi aşıldı');
        return;
      }

      const ws = new WebSocket('ws://localhost:3000/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected, userId:', storedUserId);
        reconnectAttempts = 0;
        ws.send(JSON.stringify({ type: 'join', userId: storedUserId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          if (data.type === 'newMessage') {
            const message = data.message;
            setAllMessages((prev) => {
              const updated = [...prev, message];
              // Mesajın zaten var olup olmadığını kontrol et
              const uniqueMessages = updated.filter(
                (msg, index, self) =>
                  index === self.findIndex((m) => m._id === msg._id)
              );
              return uniqueMessages;
            });

            if (
              selectedUser &&
              message.sender &&
              message.receiver &&
              (message.sender._id.toString() === selectedUser._id ||
                message.receiver._id.toString() === selectedUser._id)
            ) {
              setMessages((prev) => {
                const updated = [...prev, message];
                // Mesajın zaten var olup olmadığını kontrol et
                const uniqueMessages = updated.filter(
                  (msg, index, self) =>
                    index === self.findIndex((m) => m._id === msg._id)
                );
                return uniqueMessages.sort(
                  (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
                );
              });
              setTimeout(() => {
                if (messagesListRef.current) {
                  messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
                }
              }, 0);
            }
          } else if (data.type === 'newNotification') {
            console.log('New notification received:', data.notification);
            // Bildirimleri işlemek için gerekirse bir state ekle
          }
        } catch (err) {
          console.error('WebSocket message error:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason);
        reconnectAttempts++;
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            console.log(`Attempting to reconnect WebSocket... (Attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            connectWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      console.log('Cleaning up WebSocket');
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  // Mesajlaşmış kullanıcıları ilk yüklemede fetch et
  useEffect(() => {
    fetchMessagedUsers();
  }, [fetchMessagedUsers]);

  // allMessages değiştiğinde mesajları güncelle
  useEffect(() => {
    if (selectedUser) {
      fetchMessagesForUser(selectedUser);
    }
  }, [allMessages, selectedUser, fetchMessagesForUser]);

  // Arama fonksiyonu
  const handleSearch = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token yok');
      if (!searchQuery.trim()) {
        fetchMessagedUsers();
        return;
      }
      const res = await axios.get(
        `http://localhost:5500/api/users?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUsers(res.data);
    } catch (err) {
      console.error('Arama hatası:', err);
      setUsers([]);
    }
  };

  // Mesaj gönderme fonksiyonu
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!selectedUser || !text.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        'http://localhost:5500/api/messages',
        { text, receiver: selectedUser._id },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAllMessages((prev) => {
        const updated = [...prev, res.data];
        return updated.filter(
          (msg, index, self) =>
            index === self.findIndex((m) => m._id === msg._id)
        );
      });
      setText('');
      await fetchMessagedUsers();
      await axios.post(
        'http://localhost:5500/api/notifications',
        {
          userId: selectedUser._id,
          message: `Yeni mesaj: ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}`,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      console.error('Mesaj gönderme hatası:', err);
    }
  };

  // Geri dönme fonksiyonu
  const goBackToList = () => {
    setSelectedUser(null);
    setMessages([]);
  };

  return (
    <div className="messages">
      <h1 className="messages-title">Mesajlar</h1>
      {!selectedUser ? (
        <>
          <div className="messages-search">
            <input
              type="text"
              className="messages-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Takip ettiklerinden kullanıcı ara..."
            />
            <button className="messages-search-button" onClick={handleSearch}>
              Ara
            </button>
          </div>
          <div className="users-list">
            {users.length > 0 ? (
              users.map((user) => (
                <div
                  key={user._id}
                  className="user-item"
                  onClick={() => fetchMessagesForUser(user)}
                >
                  <img
                    src={user.profilePicture || 'https://via.placeholder.com/40'}
                    alt={user.username}
                    className="user-avatar"
                  />
                  <span className="user-name">{user.username}</span>
                </div>
              ))
            ) : (
              <p className="user-search-no-results">Kullanıcı bulunamadı</p>
            )}
          </div>
        </>
      ) : (
        <div className="chat-area full-screen">
          <div className="chat-header">
            <img
              src={selectedUser.profilePicture || 'https://via.placeholder.com/40'}
              alt={selectedUser.username}
              className="user-avatar"
            />
            <h2 className="chat-title">{selectedUser.username}</h2>
            <button className="back-button" onClick={goBackToList}>
              <FaArrowLeft size={20} />
            </button>
          </div>
          <ul className="messages-list" ref={messagesListRef}>
            {messages.map((msg) =>
              msg.sender && msg.sender._id && msg.receiver && msg.receiver._id ? (
                <li
                  key={msg._id}
                  className={`message-item ${
                    msg.sender._id.toString() === localStorage.getItem('userId')
                      ? 'message-item-sent'
                      : 'message-item-received'
                  }`}
                >
                  <div className="message-content">{msg.text}</div>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ) : null
            )}
          </ul>
          <form onSubmit={sendMessage} className="messages-form">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Mesaj yaz..."
              className="messages-input"
            />
            <button type="submit" className="messages-button">Gönder</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Messages;