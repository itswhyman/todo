import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ isLoggedIn, setIsAuthModalOpen }) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">TodoApp</Link>
        <div className="navbar-links">
          <Link to="/search">Search</Link>
          <Link to="/messages">Messages</Link>
          <Link to="/profile">Profile</Link>
          {!isLoggedIn ? (
            <button onClick={() => setIsAuthModalOpen(true)} className="navbar-button">Login</button>
          ) : (
            <button className="navbar-button">Logout</button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;