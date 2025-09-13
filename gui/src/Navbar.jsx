import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightToBracket } from "@fortawesome/free-solid-svg-icons";
import { faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { faHome, faSearch, faEnvelope, faUser } from '@fortawesome/free-solid-svg-icons';
import { faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import './Navbar.css';

const Navbar = ({ isLoggedIn, setIsAuthModalOpen }) => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.reload(); // Logout sonrası state sıfırlama
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-link">
          <FontAwesomeIcon icon={faHome} title="Ana Sayfa" /> {/* Ev ikonu, todolar için */}
        </Link>
        <Link to="/" className="navbar-logo">TodoApp</Link>
        <div className="navbar-links">
          {isLoggedIn ? (
            <>
              <Link to="/search" className="navbar-link">
                <FontAwesomeIcon icon={faSearch} title="Search" /> {/* Büyüteç ikonu */}
              </Link>
              <Link to="/messages" className="navbar-link">
                <FontAwesomeIcon icon={faEnvelope} title="Messages" /> {/* Mesaj ikonu */}
              </Link>
              <Link to="/profile" className="navbar-link">
                <FontAwesomeIcon icon={faUser} title="Profile" /> {/* Profil ikonu */}
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