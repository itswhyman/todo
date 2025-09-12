import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Messages.css';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [receiverId, setReceiverId] = useState('');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5500/api/messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5500/api/messages', { text, receiver: receiverId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages([...messages, res.data]);
      setText('');
    } catch (err) {
      alert('Error sending message');
    }
  };

  return (
    <div className="messages">
      <h1 className="messages-title">Messages</h1>
      <div className="messages-container">
        <ul className="messages-list">
          {messages.map(msg => (
            <li key={msg._id} className={`message-item ${msg.sender._id === localStorage.getItem('userId') ? 'message-item-sent' : 'message-item-received'}`}>
              <strong>{msg.sender.username}:</strong> {msg.text}
            </li>
          ))}
        </ul>
        <form onSubmit={sendMessage} className="messages-form">
          <input
            type="text"
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            placeholder="Receiver ID"
            className="messages-input"
          />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message..."
            className="messages-input"
          />
          <button type="submit" className="messages-button">Send</button>
        </form>
      </div>
    </div>
  );
};

export default Messages;