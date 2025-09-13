import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPen, faGear } from '@fortawesome/free-solid-svg-icons';
import './Profile.css';

const Profile = ({ setIsAuthModalOpen }) => {
  const [user, setUser] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editData, setEditData] = useState({ username: '', password: '', profilePicture: '', file: null });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAuthModalOpen(true);
        return;
      }
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const res = await axios.get(`http://localhost:5500/api/user/${decoded.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setIsAdmin(decoded.isAdmin || false);
      setEditData({ username: res.data.username, password: '', profilePicture: res.data.profilePicture || '', file: null });
    } catch (err) {
      console.log('Profile yüklenemedi:', err.message);
      alert('Profil yüklenemedi: ' + err.message);
    }
  };

  const fetchFollowers = async () => {
    try {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const res = await axios.get(`http://localhost:5500/api/user/${decoded.id}/followers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowers(res.data || []);
      setShowFollowersModal(true);
    } catch (err) {
      console.warn('Takipçiler yüklenemedi (endpoint yok, varsayılan boş):', err.message);
      setFollowers([]);
      setShowFollowersModal(true);
    }
  };

  const fetchFollowing = async () => {
    try {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const res = await axios.get(`http://localhost:5500/api/user/${decoded.id}/following`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowing(res.data || []);
      setShowFollowingModal(true);
    } catch (err) {
      console.warn('Takip edilenler yüklenemedi (endpoint yok, varsayılan boş):', err.message);
      setFollowing([]);
      setShowFollowingModal(true);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const res = await axios.get(`http://localhost:5500/api/user/${decoded.id}/blocked`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlockedUsers(res.data || []);
      setShowBlockedModal(true);
    } catch (err) {
      console.warn('Engellenenler yüklenemedi (endpoint yok, varsayılan boş):', err.message);
      setBlockedUsers([]);
      setShowBlockedModal(true);
    }
  };

  const handleBlockUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5500/api/user/${userId}/block`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Kullanıcı engellendi');
      fetchProfile();
    } catch (err) {
      console.log('Engelleme başarısız:', err.message);
      alert('Engelleme başarısız: ' + err.message);
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5500/api/user/${userId}/unblock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlockedUsers(blockedUsers.filter(user => user._id !== userId));
      alert('Kullanıcının engeli kaldırıldı');
    } catch (err) {
      console.log('Engel kaldırma başarısız:', err.message);
      alert('Engel kaldırma başarısız: ' + err.message);
    }
  };

  const handleBanUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5500/api/user/${userId}/ban`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Kullanıcı banlandı');
      fetchProfile();
    } catch (err) {
      console.log('Banlama başarısız:', err.message);
      alert('Banlama başarısız: ' + err.message);
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5500/api/user/${userId}/unban`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Ban kaldırıldı');
      fetchProfile();
    } catch (err) {
      console.log('Ban kaldırma başarısız:', err.message);
      alert('Ban kaldırma başarısız: ' + err.message);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const formData = new FormData();
      formData.append('username', editData.username);
      if (editData.password) formData.append('password', editData.password);
      if (editData.file) formData.append('file', editData.file);
      else if (editData.profilePicture) formData.append('profilePicture', editData.profilePicture);

      const res = await axios.put(`http://localhost:5500/api/user/${decoded.id}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('Profil güncellendi');
      setShowEditModal(false);
      fetchProfile();
    } catch (err) {
      alert('Güncelleme başarısız: ' + err.message);
    }
  };

  const handleEditChange = (e) => {
    if (e.target.name === 'file') {
      setEditData({ ...editData, file: e.target.files[0], profilePicture: '' });
    } else {
      setEditData({ ...editData, [e.target.name]: e.target.value, file: null });
    }
  };

  if (!user) return <div className="profile-loading">Loading... (veya login ol)</div>;

  return (
    <div className="profile">
      <div className="profile-header">
        <div className="profile-photo">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt="Profile Photo" className="profile-img" />
          ) : (
            <FontAwesomeIcon icon={faUser} className="profile-avatar" size="5x" />
          )}
        </div>
        <div className="profile-user-info">
          <h1 className="profile-username">{user.username}</h1>
          <div className="profile-stats">
            <div className="profile-stat" onClick={fetchFollowing}>
              <strong>Following:</strong> {user.followingCount || 0}
            </div>
            <div className="profile-stat" onClick={fetchFollowers}>
              <strong>Followers:</strong> {user.followersCount || 0}
            </div>
          </div>
        </div>
        <div className="profile-actions">
          <FontAwesomeIcon icon={faPen} className="profile-action-icon" onClick={() => setShowEditModal(true)} title="Düzenle" />
          <FontAwesomeIcon icon={faGear} className="profile-action-icon" onClick={() => alert('Ayarlar yakında')} title="Ayarlar" />
        </div>
      </div>
      <div className="profile-bio">
        <p>{user.bio || 'Bio yok'}</p>
      </div>

      {isAdmin && (
        <div className="ban-user-section">
          <input
            type="text"
            placeholder="Banlamak için kullanıcı ID'si girin"
            id="banUserId"
            className="ban-user-input"
          />
          <button
            onClick={() => handleBanUser(document.getElementById('banUserId').value)}
            className="ban-user-button"
          >
            Banla
          </button>
          <button
            onClick={() => handleUnbanUser(document.getElementById('banUserId').value)}
            className="unban-user-button"
          >
            Banı Kaldır
          </button>
        </div>
      )}

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="modal-overlay" onClick={() => setShowFollowersModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Takipçiler</h2>
            <ul>
              {followers.length > 0 ? (
                followers.map((follower, index) => (
                  <li key={index}>
                    {follower.username}
                    <button onClick={() => handleBlockUser(follower._id)}>Engelle</button>
                    {isAdmin && <button onClick={() => handleBanUser(follower._id)}>Banla</button>}
                  </li>
                ))
              ) : (
                <li>Kullanıcı bulunamadı</li>
              )}
            </ul>
            <button onClick={() => setShowFollowersModal(false)}>Kapat</button>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className="modal-overlay" onClick={() => setShowFollowingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Takip Edilenler</h2>
            <ul>
              {following.length > 0 ? (
                following.map((followed, index) => (
                  <li key={index}>
                    {followed.username}
                    <button onClick={() => handleBlockUser(followed._id)}>Engelle</button>
                    {isAdmin && <button onClick={() => handleBanUser(followed._id)}>Banla</button>}
                  </li>
                ))
              ) : (
                <li>Kullanıcı bulunamadı</li>
              )}
            </ul>
            <button onClick={() => setShowFollowingModal(false)}>Kapat</button>
          </div>
        </div>
      )}

      {/* Blocked Users Modal */}
      {showBlockedModal && (
        <div className="modal-overlay" onClick={() => setShowBlockedModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Engellenen Kullanıcılar</h2>
            <ul>
              {blockedUsers.length > 0 ? (
                blockedUsers.map((blocked, index) => (
                  <li key={index}>
                    {blocked.username}
                    <button onClick={() => handleUnblockUser(blocked._id)}>Engeli Kaldır</button>
                    {isAdmin && <button onClick={() => handleUnbanUser(blocked._id)}>Ban Kaldır</button>}
                  </li>
                ))
              ) : (
                <li>Kullanıcı bulunamadı</li>
              )}
            </ul>
            <button onClick={() => setShowBlockedModal(false)}>Kapat</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Profil Düzenle</h2>
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label>Kullanıcı Adı:</label>
                <input
                  type="text"
                  name="username"
                  value={editData.username}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Yeni Şifre (boş bırakırsan değişmez):</label>
                <input
                  type="password"
                  name="password"
                  value={editData.password}
                  onChange={handleEditChange}
                  placeholder="Yeni şifre girin"
                />
              </div>
              <div className="form-group">
                <label>Profil Resmi URL (veya dosya seçin):</label>
                <input
                  type="url"
                  name="profilePicture"
                  value={editData.profilePicture}
                  onChange={handleEditChange}
                  placeholder="https://example.com/image.jpg"
                />
                <input
                  type="file"
                  name="file"
                  accept="image/*"
                  onChange={handleEditChange}
                />
              </div>
              <div className="modal-buttons">
                <button type="submit">Kaydet</button>
                <button type="button" onClick={() => setShowEditModal(false)}>İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;