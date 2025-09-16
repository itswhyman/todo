import React, { useState, useContext } from 'react';
import Modal from 'react-modal';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from './context/UserContext';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, setIsLoggedIn }) => {
  const { fetchCurrentUser } = useContext(UserContext);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    if (!formData.email || !formData.password || (!isLogin && !formData.username)) {
      const msg = 'Form alanları eksik';
      toast.error(msg);
      setError(msg);
      setIsSubmitting(false);
      return;
    }

    try {
      const endpoint = isLogin ? '/login' : '/signup';
      const submitData = isLogin
        ? { email: formData.email, password: formData.password }
        : { username: formData.username, email: formData.email, password: formData.password };

      const res = await axios.post(`http://localhost:5500/api${endpoint}`, submitData, {
        headers: { 'Content-Type': 'application/json' },
      });

      const { token, user } = res.data;
      if (!token || !user?.id) throw new Error('Geçersiz yanıt');

      localStorage.setItem('token', token);
      localStorage.setItem('userId', user.id);

      await fetchCurrentUser();
      setIsLoggedIn(true);
      onClose();
      toast.success(isLogin ? 'Başarılı giriş!' : 'Başarılı kayıt!');

      const from = location.state?.from || '/';
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Auth error:', err.response?.data || err.message);
      const msg = err.response?.data?.msg || 'Sunucu hatası';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

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
      <h2 className="auth-modal-title">{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</h2>
      {error && <p className="auth-error">{error}</p>}
      <form onSubmit={handleSubmit} className="auth-modal-form">
        {!isLogin && <input type="text" name="username" placeholder="Kullanıcı Adı" value={formData.username} onChange={handleChange} />}
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} />
        <input type="password" name="password" placeholder="Şifre" value={formData.password} onChange={handleChange} />
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'İşleniyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}</button>
      </form>
      <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); setFormData({ username: '', email: '', password: '' }); }}>
        {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
      </button>
    </Modal>
  );
};

export default AuthModal;