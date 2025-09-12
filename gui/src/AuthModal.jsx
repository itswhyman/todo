import React, { useState } from 'react';
import Modal from 'react-modal';
import axios from 'axios';
import './AuthModal.css';

Modal.setAppElement('#root');

const AuthModal = ({ isOpen, onClose, setIsLoggedIn }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/login' : '/signup';
      const res = await axios.post(`http://localhost:5500/api${endpoint}`, formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.user.id);
      setIsLoggedIn(true);
      onClose();
    } catch (err) {
      alert(err.response.data.msg);
    }
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} className="auth-modal">
      <h2 className="auth-modal-title">{isLogin ? 'Login' : 'Signup'}</h2>
      <form onSubmit={handleSubmit} className="auth-modal-form">
        {!isLogin && (
          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="auth-modal-input"
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="auth-modal-input"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="auth-modal-input"
          required
        />
        <button type="submit" className="auth-modal-button">Submit</button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)} className="auth-modal-switch">
        Switch to {isLogin ? 'Signup' : 'Login'}
      </button>
    </Modal>
  );
};

export default AuthModal;