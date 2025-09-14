import React, { useState, useContext } from 'react';
import Modal from 'react-modal';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom'; // Yönlendirme için eklendi
import { UserContext } from './context/UserContext';
import './AuthModal.css';

Modal.setAppElement('#root');

const AuthModal = ({ isOpen, onClose, setIsLoggedIn }) => {
  const { fetchCurrentUser } = useContext(UserContext);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate(); // Yönlendirme için

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // Frontend validation
    if (!formData.email || !formData.password) {
      setError('Email ve şifre gerekli');
      toast.error('Email ve şifre gerekli');
      return;
    }
    if (!isLogin && !formData.username) {
      setError('Kullanıcı adı gerekli');
      toast.error('Kullanıcı adı gerekli');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Geçersiz email formatı');
      toast.error('Geçersiz email formatı');
      return;
    }
    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalı');
      toast.error('Şifre en az 6 karakter olmalı');
      return;
    }
    try {
      const submitData = isLogin
        ? { email: formData.email, password: formData.password }
        : { username: formData.username, email: formData.email, password: formData.password };
      console.log('Frontend submit data:', submitData); // Debug
      const endpoint = isLogin ? '/login' : '/signup';
      const res = await axios.post(`http://localhost:5500/api${endpoint}`, submitData, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Auth response data:', res.data); // Debug response
      const { token, user } = res.data;
      if (!token || !user.id) throw new Error('Geçersiz yanıt, token veya userId eksik');
      localStorage.setItem('token', token);
      localStorage.setItem('userId', user.id); // Sadece id string'ini sakla
      console.log('Stored userId:', user.id); // Saklanan userId'yi logla
      await fetchCurrentUser();
      setIsLoggedIn(true);
      onClose();
      toast.success(isLogin ? 'Başarılı giriş!' : 'Başarılı kayıt!');
      navigate('/'); // Giriş veya kayıt sonrası ana sayfaya yönlendir
    } catch (err) {
      console.log('Frontend auth error:', err.response?.data); // Hata debug
      const msg = err.response?.data?.msg || 'Sunucu hatası';
      setError(msg);
      toast.error('Hata: ' + msg);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} className="auth-modal">
      <h2 className="auth-modal-title">{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</h2>
      {error && <p className="auth-error">{error}</p>}
      <form onSubmit={handleSubmit} className="auth-modal-form">
        {!isLogin && (
          <input
            type="text"
            name="username"
            placeholder="Kullanıcı Adı (en az 3 karakter)"
            value={formData.username}
            onChange={handleChange}
            className="auth-modal-input"
            required
            minLength="3"
          />
        )}
        <input
          type="email"
          name="email"
          placeholder="Email (örnek: user@example.com)"
          value={formData.email}
          onChange={handleChange}
          className="auth-modal-input"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Şifre (en az 6 karakter)"
          value={formData.password}
          onChange={handleChange}
          className="auth-modal-input"
          required
          minLength="6"
        />
        <button type="submit" className="auth-modal-button">
          {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setIsLogin(!isLogin);
          setError('');
          setFormData({ username: '', email: '', password: '' });
        }}
        className="auth-modal-switch"
      >
        {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
      </button>
    </Modal>
  );
};

export default AuthModal;