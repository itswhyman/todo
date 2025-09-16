import React, { createContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

export const UserContext = createContext();

export const UserProvider = ({ children, setIsAuthModalOpen, setIsLoggedIn }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [alertShown, setAlertShown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');

      if (!token || !userId) {
        if (!alertShown) {
          toast.error('Hesap açmalısınız!');
          setAlertShown(true);
        }
        setIsLoggedIn(false);
        setCurrentUser(null);
        if (location.pathname !== '/login') {
          setIsAuthModalOpen(true);
          navigate('/', { replace: true });
        }
        return null;
      }

      const res = await axios.get(`http://localhost:5500/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCurrentUser(res.data);
      setIsLoggedIn(true);
      return res.data;
    } catch (err) {
      console.error('Kullanıcı yükleme hatası:', err);
      toast.error('Profil yüklenemedi: Sunucu hatası');
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      setCurrentUser(null);
      setIsLoggedIn(false);
      if (!alertShown) {
        toast.error('Hesap açmalısınız!');
        setAlertShown(true);
      }
      if (location.pathname !== '/login') {
        setIsAuthModalOpen(true);
        navigate('/', { replace: true });
      }
      return null;
    }
  }, [navigate, location.pathname, setIsAuthModalOpen, setIsLoggedIn, alertShown]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, fetchCurrentUser, setIsLoggedIn }}>
      {children}
    </UserContext.Provider>
  );
};
