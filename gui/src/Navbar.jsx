import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightToBracket, faUserPlus, faHome, faSearch, faEnvelope, faUser, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import './Navbar.css';

const Navbar = ({ isLoggedIn, setIsAuthModalOpen, unreadNotifications }) => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.reload();
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-link">
          <FontAwesomeIcon icon={faHome} title="Ana Sayfa" />
        </Link>
        <Link to="/" className="navbar-logo">TodoApp</Link>
        <div className="navbar-links">
          {isLoggedIn ? (
            <>
              <Link to="/search" className="navbar-link">
                <FontAwesomeIcon icon={faSearch} title="Search" />
              </Link>
              <Link to="/messages" className="navbar-link notification-wrapper">
                <FontAwesomeIcon icon={faEnvelope} title="Messages" />
                {unreadNotifications > 0 && (
                  <span className="notification-badge">{unreadNotifications}</span>
                )}
              </Link>
              <Link to="/profile" className="navbar-link">
                <FontAwesomeIcon icon={faUser} title="Profile" />
              </Link>
              <button onClick={handleLogout} className="navbar-button">
                <FontAwesomeIcon icon={faSignOutAlt} />
              </button>
            </>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="navbar-button">
              <FontAwesomeIcon icon={faRightToBracket} /> / <FontAwesomeIcon icon={faUserPlus} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;