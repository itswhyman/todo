import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './Navbar';
import AuthModal from './AuthModal';
import TodoList from './TodoList';
import Messages from './Messages';
import Profile from './Profile';
import UserSearch from './UserSearch';
import './App.css';

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // LocalStorage token kontrolü (giriş sonrası state'i koru)
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);  // Token varsa true
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app">
        <Navbar isLoggedIn={isLoggedIn} setIsAuthModalOpen={setIsAuthModalOpen} />
        <Routes>
          <Route path="/" element={<TodoList />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/profile" element={<Profile setIsAuthModalOpen={setIsAuthModalOpen} />} />
          <Route path="/search" element={<UserSearch />} />
        </Routes>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} setIsLoggedIn={setIsLoggedIn} />
      </div>
    </Router>
  );
}

export default App;