import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './UserSearch.css';

const UserSearch = () => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  const handleSearch = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const res = await axios.get(`http://localhost:5500/api/users?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Search error:', err.response?.data);
      alert(err.response?.data?.msg || 'Arama başarısız');
    }
  };

  return (
    <div className="user-search">
      <h2 className="user-search-title">Kullanıcı Ara</h2>
      <div className="user-search-form">
        <input
          type="text"
          className="user-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kullanıcı ara (örn: s)"
        />
        <button className="user-search-button" onClick={handleSearch}>
          Search
        </button>
      </div>
      <ul className="user-search-list">
        {users.length > 0 ? (
          users.map(user => (
            <li
              key={user._id}
              className="user-search-item"
              onClick={() => navigate(`/user/${user._id}`)}
            >
              <img
                src={user.profilePicture || 'https://via.placeholder.com/48x48?text=PP'}
                alt={`${user.username}'s profile`}
              />
              <span>{user.username}</span>
            </li>
          ))
        ) : (
          <li className="user-search-no-results">Kullanıcı bulunamadı</li>
        )}
      </ul>
    </div>
  );
};

export default UserSearch;