import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
        v7_fetcherPersist: true,
        v7_normalizeFormMethod: true,
        v7_partialHydration: true,
        v7_skipActionErrorRevalidation: true,
      }}
    >
      <UserProvider setIsAuthModalOpen={setIsAuthModalOpen} setIsLoggedIn={setIsLoggedIn}>
        <ErrorBoundary>
          <div className="app">
            <Navbar isLoggedIn={isLoggedIn} setIsAuthModalOpen={setIsAuthModalOpen} />
            <Routes>
              <Route path="/" element={<TodoList />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/profile" element={<Profile setIsAuthModalOpen={setIsAuthModalOpen} />} />
              <Route path="/search" element={<UserSearch setIsAuthModalOpen={setIsAuthModalOpen} />} />
              <Route path="/user/:id" element={<UserProfile setIsAuthModalOpen={setIsAuthModalOpen} />} />
            </Routes>
            <AuthModal
              isOpen={isAuthModalOpen}
              onClose={() => setIsAuthModalOpen(false)}
              setIsLoggedIn={setIsLoggedIn}
            />
            <ToastContainer position="top-right" autoClose={3000} />
          </div>
        </ErrorBoundary>
      </UserProvider>
    </Router>
  );
}

export default App;