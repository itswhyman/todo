import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { UserProvider } from './context/UserContext';
import Navbar from './Navbar';
import AuthModal from './AuthModal';
import TodoList from './TodoList';
import Messages from './Messages';
import Profile from './Profile';
import UserProfile from './UserProfile';
import UserSearch from './UserSearch';
import ErrorBoundary from './ErrorBoundary';
import './App.css';

function AppContent() {
  const location = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const wsRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    if (token && location.pathname === '/login') {
      window.history.replaceState(null, '', '/');
      window.location.href = '/';
    }
  }, [location.pathname]);

  // Global WebSocket bağlantısı (bildirimler için anlık güncelleme) - URL düzeltildi
  useEffect(() => {
    if (isLoggedIn) {
      const storedUserId = localStorage.getItem('userId');
      const ws = new WebSocket('ws://localhost:5500'); // URL düzeltildi: /ws kaldırıldı
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', userId: storedUserId }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'newNotification') {
          setUnreadNotifications((prev) => prev + 1);
        } else if (data.type === 'notificationsRead') {
          setUnreadNotifications(0);
        }
      };

      return () => {
        ws.close();
      };
    }
  }, [isLoggedIn]);

  return (
    <div className="app">
      <Navbar isLoggedIn={isLoggedIn} setIsAuthModalOpen={setIsAuthModalOpen} unreadNotifications={unreadNotifications} />

      <Routes>
        <Route path="/" element={<TodoList />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile" element={<Profile setIsAuthModalOpen={setIsAuthModalOpen} />} />
        <Route path="/search" element={<UserSearch setIsAuthModalOpen={setIsAuthModalOpen} />} />
        <Route path="/user/:id" element={<UserProfile setIsAuthModalOpen={setIsAuthModalOpen} />} />
        <Route path="*" element={<div>404 - Sayfa bulunamadı</div>} />
      </Routes>

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          setIsLoggedIn={setIsLoggedIn}
        />
      )}

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UserProvider setIsAuthModalOpen={(open) => {}} setIsLoggedIn={(loggedIn) => {}}>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </UserProvider>
    </Router>
  );
}

export default App;