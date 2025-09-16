import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import { UserContext } from './context/UserContext';
import { toast } from 'react-toastify';
import './Messages.css';

const Messages = () => {
  const { currentUser } = useContext(UserContext);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allMessages, setAllMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationIds, setNotificationIds] = useState(new Set());
  const messagesListRef = useRef(null);
  const wsRef = useRef(null);
  const notificationSound = useRef(new Audio(currentUser?.notificationSound || '/voice/mixkit-access-allowed-tone-2869.wav'));

  const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

  const fetchMessagedUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token yok, lütfen giriş yapın');

      const storedUserId = localStorage.getItem('userId');
      if (!storedUserId || !isValidObjectId(storedUserId)) {
        throw new Error('Geçersiz kullanıcı ID');
      }

      const [msgRes, unreadRes] = await Promise.all([
        axios.get('http://localhost:5500/api/messages', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://localhost:5500/api/messages/unread/count', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(err => {
          console.error('Okunmamış mesaj sayıları alınamadı:', err);
          return { data: {} };
        }),
      ]);

      setAllMessages(msgRes.data);
      setUnreadCounts(unreadRes.data);

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
      setUnreadCounts({});
    }
  }, []);

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

  const markNotificationsAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        'http://localhost:5500/api/notifications/read',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Bildirimler okundu:', response.data);
    } catch (err) {
      console.error('Bildirimler okundu işaretleme hatası:', err);
      if (err.response?.status === 404) {
        console.error('404 Hatası: /api/notifications/read endpointi bulunamadı.');
      }
    }
  };

  const playNotificationSound = async () => {
    if (!soundEnabled) {
      console.log('Ses çalma engellendi: Bildirim sesi kapalı');
      return;
    }
    try {
      await notificationSound.current.play();
      console.log('Bildirim sesi çalındı:', notificationSound.current.src);
    } catch (err) {
      console.error('Ses çalma hatası:', err);
      if (err.name === 'NotAllowedError') {
        toast.warn('Ses izni için sayfaya tıklayın veya toggle butonuna basın!');
      }
    }
  };

  useEffect(() => {
    if (currentUser?.notificationSound) {
      notificationSound.current.src = currentUser.notificationSound;
    }
  }, [currentUser?.notificationSound]);

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

      const ws = new WebSocket('ws://localhost:5500');
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
              const exists = prev.some((msg) => msg._id === message._id);
              if (exists) return prev;
              return [...prev, message];
            });

            if (
              selectedUser &&
              message.sender &&
              message.receiver &&
              (message.sender._id.toString() === selectedUser._id ||
                message.receiver._id.toString() === selectedUser._id)
            ) {
              setMessages((prev) => {
                const exists = prev.some((msg) => msg._id === message._id);
                if (exists) return prev;
                const updated = [...prev, message];
                return updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
              });
              setTimeout(() => {
                if (messagesListRef.current) {
                  messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
                }
              }, 0);
            }

            if (message.receiver._id.toString() === storedUserId && !message.isRead) {
              setUnreadCounts((prev) => {
                const newCount = (prev[message.sender._id] || 0) + 1;
                return { ...prev, [message.sender._id]: newCount };
              });
              playNotificationSound();
            }
          } else if (data.type === 'newNotification') {
            const notification = data.notification;
            if (notificationIds.has(notification._id)) {
              console.log('Duplicate notification ignored:', notification._id);
              return;
            }
            setNotificationIds((prev) => new Set(prev).add(notification._id));
            console.log('New notification received:', notification);
            playNotificationSound();
          } else if (data.type === 'notificationsRead') {
            setNotificationIds(new Set());
            console.log('Notifications marked as read');
          } else if (data.type === 'messagesRead') {
            if (selectedUser && data.by === selectedUser._id) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.receiver._id.toString() === data.by && !msg.isRead
                    ? { ...msg, isRead: true }
                    : msg
                )
              );
              setUnreadCounts((prev) => ({
                ...prev,
                [data.by]: 0,
              }));
            }
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
        }, 5000);
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

  useEffect(() => {
    fetchMessagedUsers();
  }, [fetchMessagedUsers]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessagesForUser(selectedUser);
      markNotificationsAsRead();
    }
  }, [allMessages, selectedUser, fetchMessagesForUser]);

  useEffect(() => {
    if (selectedUser && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'enterChat', chatWith: selectedUser._id }));
      const markAsRead = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.put(
            'http://localhost:5500/api/messages/read',
            { sender: selectedUser._id },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setMessages((prev) =>
            prev.map((msg) =>
              msg.sender._id.toString() === selectedUser._id && !msg.isRead
                ? { ...msg, isRead: true }
                : msg
            )
          );
          setUnreadCounts((prev) => ({
            ...prev,
            [selectedUser._id]: 0,
          }));
          console.log('Mesajlar okundu:', response.data);
        } catch (err) {
          console.error('Okundu işaretleme hatası:', err);
          if (err.response?.status === 404) {
            console.error('404 Hatası: /api/messages/read endpointi bulunamadı.');
          }
        }
      };
      markAsRead();
    }

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'leaveChat' }));
      }
    };
  }, [selectedUser]);

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
        const exists = prev.some((msg) => msg._id === res.data._id);
        if (exists) return prev;
        return [...prev, res.data];
      });
      setText('');
      await fetchMessagedUsers();
    } catch (err) {
      console.error('Mesaj gönderme hatası:', err);
    }
  };

  const goBackToList = () => {
    setSelectedUser(null);
    setMessages([]);
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const newState = !prev;
      console.log('Bildirim sesi toggle edildi:', newState ? 'Açık' : 'Kapalı');
      if (!newState) {
        notificationSound.current.pause();
        notificationSound.current.currentTime = 0;
      }
      return newState;
    });
  };

  return (
    <div className="messages">
      <h1 className="messages-title">Mesajlar</h1>
      {!selectedUser ? (
        <>
          <div className="messages-header">
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
            <button
              className="toggle-button"
              onClick={toggleSound}
              style={{ backgroundColor: soundEnabled ? '#2563eb' : '#6b7280' }}
            >
              Bildirim Sesi: {soundEnabled ? 'Açık' : 'Kapalı'}
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
                  <div className="user-item-content">
                    <img
                      src={user.profilePicture || 'https://via.placeholder.com/40'}
                      alt={user.username}
                      className="user-avatar"
                    />
                    <span className="user-name">{user.username}</span>
                    {unreadCounts[user._id] > 0 && (
                      <span className="unread-badge">{unreadCounts[user._id]}</span>
                    )}
                  </div>
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
                  {msg.sender._id.toString() === localStorage.getItem('userId') && (
                    <span className="message-status">
                      {msg.isRead ? 'Okundu' : 'Gönderildi'}
                    </span>
                  )}
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
