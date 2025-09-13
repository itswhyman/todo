import React, { createContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export const UserContext = createContext();

export const UserProvider = ({ children, setIsAuthModalOpen, setIsLoggedIn }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAuthModalOpen(true);
        setIsLoggedIn(false);
        navigate('/login');
        return null;
      }
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const res = await axios.get(`http://localhost:5500/api/user/${decoded.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser(res.data);
      setIsLoggedIn(true);
      return res.data;
    } catch (err) {
      console.error('Fetch current user error:', err); // Hata takibi için
      console.log('Current user:', currentUser);
      toast.error('Profil yüklenemedi: ' + (err.response?.data?.msg || err.message));
      setIsLoggedIn(false);
      setCurrentUser(null);
      return null;
    }
  }, [navigate, setIsAuthModalOpen, setIsLoggedIn]);

  // Sayfa yüklendiğinde fetchCurrentUser'u otomatik çağır
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, fetchCurrentUser, setIsLoggedIn }}>
      {children}
    </UserContext.Provider>
  );
};