import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPen, faGear, faLock } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { UserContext } from './context/UserContext';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

const Profile = ({ setIsAuthModalOpen }) => {
  const { currentUser, fetchCurrentUser } = useContext(UserContext);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editData, setEditData] = useState({ username: '', bio: '', profilePicture: '', file: null, preview: null });
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      setIsAdmin(currentUser.isAdmin || false);
      setEditData({
        username: currentUser.username,
        bio: currentUser.bio || '',
        profilePicture: currentUser.profilePicture || '',
        file: null,
        preview: currentUser.profilePicture || null,
      });
      setLoading(false);
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const decoded = JSON.parse(atob(token.split('.')[1]));
          setUserId(decoded.id);
        } else {
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Token çözümleme hatası:', err);
        navigate('/login', { replace: true });
      }
    } else {
      setLoading(true);
    }
  }, [currentUser, navigate]);

  const fetchFollowers = async () => {
    try {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const res = await axios.get(`http://localhost:5500/api/users/${decoded.id}/followers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Followers Response:', res.data); // Hata ayıklama için
      setFollowers(res.data || []);
      setShowFollowersModal(true);
    } catch (err) {
      console.error('Fetch followers error:', err.response?.data || err.message);
      toast.warn('Takipçiler yüklenemedi: ' + (err.response?.data?.msg || err.message));
      setFollowers([]);
      setShowFollowersModal(true);
    }
  };

  const fetchFollowing = async () => {
    try {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const res = await axios.get(`http://localhost:5500/api/users/${decoded.id}/following`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Following Response:', res.data); // Hata ayıklama için
      setFollowing(res.data || []);
      setShowFollowingModal(true);
    } catch (err) {
      console.error('Fetch following error:', err.response?.data || err.message);
      toast.warn('Takip edilenler yüklenemedi: ' + (err.response?.data?.msg || err.message));
      setFollowing([]);
      setShowFollowingModal(true);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const res = await axios.get(`http://localhost:5500/api/users/${decoded.id}/blocked`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBlockedUsers(res.data || []);
      setShowBlockedModal(true);
    } catch (err) {
      toast.warn('Engellenenler yüklenemedi: ' + (err.response?.data?.msg || err.message));
      setBlockedUsers([]);
      setShowBlockedModal(true);
    }
  };

  const handleBlockUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5500/api/users/${userId}/block`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Kullanıcı engellendi');
      await fetchCurrentUser();
    } catch (err) {
      toast.error('Engelleme başarısız: ' + (err.response?.data?.msg || err.message));
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5500/api/users/${userId}/unblock`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBlockedUsers(blockedUsers.filter(user => user._id !== userId));
      toast.success('Kullanıcının engeli kaldırıldı');
    } catch (err) {
      toast.error('Engel kaldırma başarısız: ' + (err.response?.data?.msg || err.message));
    }
  };

  const handleBanUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5500/api/users/${userId}/ban`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Kullanıcı banlandı');
      await fetchCurrentUser();
    } catch (err) {
      toast.error('Banlama başarısız: ' + (err.response?.data?.msg || err.message));
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5500/api/users/${userId}/unban`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Ban kaldırıldı');
      await fetchCurrentUser();
    } catch (err) {
      toast.error('Ban kaldırma başarısız: ' + (err.response?.data?.msg || err.message));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const formData = new FormData();
      formData.append('username', editData.username);
      formData.append('bio', editData.bio);
      if (editData.file) {
        if (!['image/jpeg', 'image/png', 'image/gif'].includes(editData.file.type)) {
          throw new Error('Sadece JPEG, PNG veya GIF dosyaları kabul edilir');
        }
        if (editData.file.size > 5 * 1024 * 1024) {
          throw new Error('Dosya boyutu 5MB\'dan büyük olamaz');
        }
        formData.append('file', editData.file);
      } else if (editData.profilePicture) {
        formData.append('profilePicture', editData.profilePicture);
      }

      await axios.put(`http://localhost:5500/api/users/${decoded.id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Profil güncellendi');
      setShowEditModal(false);
      await fetchCurrentUser();
    } catch (err) {
      const errorMsg =
        err.response?.data?.msg ||
        err.message ||
        'Sunucu hatası, lütfen dosya formatını (JPEG/PNG/GIF) veya boyutunu (max 5MB) kontrol edin';
      toast.error(`Güncelleme başarısız: ${errorMsg}`);
    }
  };

  const handleEditChange = (e) => {
    if (e.target.name === 'file') {
      const file = e.target.files[0];
      if (file) {
        if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
          toast.error('Sadece JPEG, PNG veya GIF dosyaları kabul edilir');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Dosya boyutu 5MB\'dan büyük olamaz');
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditData({ ...editData, file, profilePicture: '', preview: reader.result });
        };
        reader.readAsDataURL(file);
      } else {
        setEditData({ ...editData, file: null, preview: currentUser.profilePicture || null });
      }
    } else {
      setEditData({ ...editData, [e.target.name]: e.target.value, file: null });
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      console.log('Sending password change request:', {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      });
      await axios.put(`http://localhost:5500/api/users/${decoded.id}/password`, {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Şifre başarıyla değiştirildi');
      setPasswordData({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
      setShowPasswordModal(false);
      setShowSettingsModal(true);
    } catch (err) {
      toast.error('Şifre değiştirme başarısız: ' + (err.response?.data?.msg || err.message));
      console.error('Password change error:', err.response?.data || err);
    }
  };

  const handlePasswordChangeInput = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  if (loading) return <div className="profile-loading">Yükleniyor...</div>;
  if (!currentUser || !userId) return <div className="profile-loading">Kullanıcı bulunamadı</div>;

  return (
    <div className="profile">
      <div className="profile-header">
        <div className="profile-photo">
          {currentUser.profilePicture ? (
            <img src={currentUser.profilePicture} alt="Profile Photo" className="profile-img" />
          ) : (
            <FontAwesomeIcon icon={faUser} className="profile-avatar" size="5x" />
          )}
        </div>
        <div className="profile-user-info">
          <h1 className="profile-username">{currentUser.username}</h1>
          <div className="profile-stats">
            <div className="profile-stat" onClick={fetchFollowing}>
              <strong>Following:</strong> {currentUser.followingCount || 0}
            </div>
            <div className="profile-stat" onClick={fetchFollowers}>
              <strong>Followers:</strong> {currentUser.followersCount || 0}
            </div>
          </div>
          <div className="profile-actions">
            <FontAwesomeIcon
              icon={faPen}
              className="profile-action-icon"
              onClick={() => setShowEditModal(true)}
              title="Düzenle"
            />
            <FontAwesomeIcon
              icon={faGear}
              className="profile-action-icon"
              onClick={() => setShowSettingsModal(true)}
              title="Ayarlar"
            />
          </div>
        </div>
      </div>
      <div className="profile-bio">
        <p>{currentUser.bio || 'Bio yok'}</p>
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

      {showFollowersModal && (
        <div className="modal-overlay" onClick={() => setShowFollowersModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Takipçiler</h2>
            <ul>
              {followers.length > 0 ? (
                followers.map((follower, index) => (
                  <li key={index} onClick={() => navigate(`/user/${follower._id}`)} style={{ cursor: 'pointer' }}>
                    {follower.username}
                    <button onClick={(e) => {
                      e.stopPropagation();
                      handleBlockUser(follower._id);
                    }}>Engelle</button>
                    {isAdmin && <button onClick={(e) => {
                      e.stopPropagation();
                      handleBanUser(follower._id);
                    }}>Banla</button>}
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

      {showFollowingModal && (
        <div className="modal-overlay" onClick={() => setShowFollowingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Takip Edilenler</h2>
            <ul>
              {following.length > 0 ? (
                following.map((followed, index) => (
                  <li key={index} onClick={() => navigate(`/user/${followed._id}`)} style={{ cursor: 'pointer' }}>
                    {followed.username}
                    <button onClick={(e) => {
                      e.stopPropagation();
                      handleBlockUser(followed._id);
                    }}>Engelle</button>
                    {isAdmin && <button onClick={(e) => {
                      e.stopPropagation();
                      handleBanUser(followed._id);
                    }}>Banla</button>}
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

      {showBlockedModal && (
        <div className="modal-overlay" onClick={() => setShowBlockedModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Engellenen Kullanıcılar</h2>
            <ul>
              {blockedUsers.length > 0 ? (
                blockedUsers.map((blocked, index) => (
                  <li key={index} onClick={() => navigate(`/user/${blocked._id}`)} style={{ cursor: 'pointer' }}>
                    {blocked.username}
                    <button onClick={(e) => {
                      e.stopPropagation();
                      handleUnblockUser(blocked._id);
                    }}>Engeli Kaldır</button>
                    {isAdmin && <button onClick={(e) => {
                      e.stopPropagation();
                      handleUnbanUser(blocked._id);
                    }}>Ban Kaldır</button>}
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

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Profil Düzenle</h2>
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label>Profil Resmi:</label>
                <input
                  type="file"
                  name="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleEditChange}
                />
                <input
                  type="url"
                  name="profilePicture"
                  value={editData.profilePicture}
                  onChange={handleEditChange}
                  placeholder="https://example.com/image.jpg"
                />
                {editData.preview && (
                  <div className="profile-preview">
                    <img src={editData.preview} alt="Preview" className="profile-preview-img" />
                  </div>
                )}
              </div>
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
                <label>Bio:</label>
                <input
                  type="text"
                  name="bio"
                  value={editData.bio}
                  onChange={handleEditChange}
                  placeholder="Bio metni girin"
                />
              </div>
              <div className="modal-buttons">
                <button type="submit">Kaydet</button>
                <button type="button" onClick={() => setShowEditModal(false)}>
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Ayarlar</h2>
            <div className="settings-options">
              <button
                className="user-profile-button user-profile-follow"
                onClick={() => {
                  setShowPasswordModal(true);
                  setShowSettingsModal(false);
                }}
              >
                Şifre Değiştir
              </button>
              <button
                className="user-profile-button user-profile-message"
                onClick={() => toast.info('Hesap ayarları yakında')}
              >
                Hesap Ayarları
              </button>
              <button
                className="user-profile-button user-profile-block"
                onClick={() => toast.info('Gizlilik ayarları yakında')}
              >
                Gizlilik
              </button>
            </div>
            <div className="modal-buttons">
              <button type="button" onClick={() => setShowSettingsModal(false)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Şifre Değiştir</h2>
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label>Eski Şifre:</label>
                <input
                  type="password"
                  name="oldPassword"
                  value={passwordData.oldPassword}
                  onChange={handlePasswordChangeInput}
                  required
                />
              </div>
              <div className="form-group">
                <label>Yeni Şifre:</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChangeInput}
                  required
                />
              </div>
              <div className="form-group">
                <label>Yeni Şifreyi Onaylayın:</label>
                <input
                  type="password"
                  name="confirmNewPassword"
                  value={passwordData.confirmNewPassword}
                  onChange={handlePasswordChangeInput}
                  required
                />
              </div>
              <div className="modal-buttons">
                <button type="submit">Değiştir</button>
                <button type="button" onClick={() => setShowPasswordModal(false)}>
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;