import React, { useState } from 'react';
import axios from 'axios';
import './UserSearch.css';

const UserSearch = () => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5500/api/users?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="user-search">
      <h1 className="user-search-title">Search Users</h1>
      <form onSubmit={handleSearch} className="user-search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search username..."
          className="user-search-input"
        />
        <button type="submit" className="user-search-button">Search</button>
      </form>
      <ul className="user-search-list">
        {users.map(user => (
          <li key={user._id} className="user-search-item">
            <span>{user.username} - {user.email}</span>
            <button className="user-search-message">Message</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserSearch;