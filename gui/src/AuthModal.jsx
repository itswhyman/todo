import React, { useState, useContext } from 'react';
import Modal from 'react-modal';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from './context/UserContext';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, setIsLoggedIn }) => {
  const { fetchCurrentUser } = useContext(UserContext);
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
  const [formData, setFormData] = useState({ username: '', email: '', password: '', newPassword: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      let res;
      if (mode === 'login' || mode === 'signup') {
        if (!formData.email || !formData.password || (mode === 'signup' && !formData.username)) {
          throw new Error('Form alanları eksik');
        }

        const endpoint = mode === 'login' ? '/login' : '/signup';
        const submitData = mode === 'login'
          ? { email: formData.email, password: formData.password }
          : { username: formData.username, email: formData.email, password: formData.password };

        res = await axios.post(`http://localhost:5500/api${endpoint}`, submitData, {
          headers: { 'Content-Type': 'application/json' },
        });

        const { token, user } = res.data;
        if (!token || !user?.id) throw new Error('Geçersiz yanıt');

        localStorage.setItem('token', token);
        localStorage.setItem('userId', user.id);

        await fetchCurrentUser();
        setIsLoggedIn(true);
        onClose();
        toast.success(mode === 'login' ? 'Başarılı giriş!' : 'Başarılı kayıt!');
        const from = location.state?.from || '/';
        navigate(from, { replace: true });

      } else if (mode === 'forgot') {
        if (!formData.email || !formData.newPassword) {
          throw new Error('Email ve yeni şifre gerekli');
        }

        await axios.post('http://localhost:5500/api/forgot-password', {
          email: formData.email,
          newPassword: formData.newPassword,
        }, { headers: { 'Content-Type': 'application/json' } });

        toast.success('Şifre başarıyla değiştirildi! Giriş yapabilirsiniz.');
        setMode('login');
        setFormData({ username: '', email: '', password: '', newPassword: '' });
      }

    } catch (err) {
      console.error('Auth error:', err.response?.data || err.message);
      const msg = err.response?.data?.msg || err.message || 'Sunucu hatası';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="auth-modal"
      overlayClassName="auth-overlay"
      shouldCloseOnOverlayClick={true}
      closeTimeoutMS={200}
      ariaHideApp={false}
    >
      <h2 className="auth-modal-title">
        {mode === 'login' ? 'Giriş Yap' : mode === 'signup' ? 'Kayıt Ol' : 'Şifremi Unuttum'}
      </h2>

      {error && <p className="auth-error">{error}</p>}

      <form onSubmit={handleSubmit} className="auth-modal-form">
        {mode === 'signup' && (
          <input
            type="text"
            name="username"
            placeholder="Kullanıcı Adı"
            value={formData.username}
            onChange={handleChange}
          />
        )}

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
        />

        {mode === 'login' && (
          <input
            type="password"
            name="password"
            placeholder="Şifre"
            value={formData.password}
            onChange={handleChange}
          />
        )}

        {mode === 'signup' && (
          <input
            type="password"
            name="password"
            placeholder="Şifre"
            value={formData.password}
            onChange={handleChange}
          />
        )}

        {mode === 'forgot' && (
          <input
            type="password"
            name="newPassword"
            placeholder="Yeni Şifre"
            value={formData.newPassword}
            onChange={handleChange}
          />
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'İşleniyor...'
            : mode === 'login'
            ? 'Giriş Yap'
            : mode === 'signup'
            ? 'Kayıt Ol'
            : 'Şifreyi Sıfırla'}
        </button>
      </form>

      {mode === 'login' && (
        <button
          type="button"
          className="auth-modal-switch"
          onClick={() => setMode('forgot')}
        >
          Şifremi Unuttum
        </button>
      )}

      <button
        type="button"
        className="auth-modal-switch"
        onClick={() => {
          setMode(mode === 'login' ? 'signup' : 'login');
          setError('');
          setFormData({ username: '', email: '', password: '', newPassword: '' });
        }}
      >
        {mode === 'login'
          ? 'Hesabım yok'
          : mode === 'signup'
          ? 'Hesabım var'
          : 'Girişe dön'}
      </button>
    </Modal>
  );
};

export default AuthModal;
