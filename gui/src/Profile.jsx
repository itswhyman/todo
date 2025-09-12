import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const res = await axios.get(`http://localhost:5500/api/user/${decoded.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  if (!user) return <div className="profile-loading">Loading...</div>;

  return (
    <div className="profile">
      <h1 className="profile-title">Profile</h1>
      <img src="https://via.placeholder.com/150" alt="Avatar" className="profile-avatar" />
      <p className="profile-info"><strong>Username:</strong> {user.username}</p>
      <p className="profile-info"><strong>Email:</strong> {user.email}</p>
    </div>
  );
};

export default Profile;