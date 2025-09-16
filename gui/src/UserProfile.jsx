import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { debounce } from 'lodash';
import { UserContext } from './context/UserContext';
import './Profile.css';

const UserProfile = ({ setIsAuthModalOpen }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, fetchCurrentUser } = useContext(UserContext);
  const [user, setUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAuthModalOpen(true);
        navigate('/login');
        return;
      }
      const decoded = JSON.parse(atob(token.split('.')[1]));
      if (decoded.id === id) {
        navigate('/profile', { replace: true });
        return;
      }
      const res = await axios.get(`http://localhost:5500/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
      setIsFollowing(res.data.followers?.some(f => f._id === decoded.id) || false);
      setIsBlocked(res.data.blockedByCurrentUser || false);
      setLoading(false);
    } catch (err) {
      toast.error('Profil yüklenemedi: ' + (err.response?.data?.msg || err.message));
      setLoading(false);
    }
  };

  const fetchFollowers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5500/api/users/${id}/followers`, {
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
      const res = await axios.get(`http://localhost:5500/api/users/${id}/following`, {
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

  const handleFollowToggle = debounce(async () => {
    setIsLoadingFollow(true);
    try {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const endpoint = isFollowing ? `/users/${id}/unfollow` : `/users/${id}/follow`;
      await axios.post(`http://localhost:5500/api${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const newFollowingState = !isFollowing;
      setIsFollowing(newFollowingState);

      // Optimistic update
      setUser(prev => ({
        ...prev,
        followersCount: newFollowingState ? prev.followersCount + 1 : prev.followersCount - 1,
      }));

      // Kendi profilini güncelle
      await fetchCurrentUser();
      // Backend'den viewed user'ı yeniden fetch et
      await fetchUserProfile();

      toast.success(newFollowingState ? 'Takip edildi' : 'Takip bırakıldı');
    } catch (err) {
      if (err.response?.data?.msg === 'Zaten takip ediyorsunuz') {
        setIsFollowing(true);
      } else if (err.response?.data?.msg === 'Zaten takip etmiyorsunuz') {
        setIsFollowing(false);
      }
      await fetchUserProfile();
      toast.error('Takip işlemi başarısız: ' + (err.response?.data?.msg || err.message));
    } finally {
      setIsLoadingFollow(false);
    }
  }, 300);

  const handleMessage = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5500/api/messages`,
        { text: `Merhaba ${user.username}!`, receiver: id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate('/messages');
      toast.success('Mesaj gönderildi, konuşma sayfasına yönlendiriliyorsun');
    } catch (err) {
      toast.error('Mesaj gönderilemedi: ' + (err.response?.data?.msg || err.message));
    }
  };

  const handleBlockToggle = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = isBlocked ? `/users/${id}/unblock` : `/users/${id}/block`;
      await axios.post(`http://localhost:5500/api${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsBlocked(!isBlocked);
      await fetchUserProfile();
      toast.success(isBlocked ? 'Engel kaldırıldı' : 'Kullanıcı engellendi');
    } catch (err) {
      toast.error('Engelleme işlemi başarısız: ' + (err.response?.data?.msg || err.message));
    }
  };

  if (loading) return <div className="profile-loading">Yükleniyor...</div>;
  if (!user) return <div className="profile-loading">Kullanıcı bulunamadı</div>;

  return (
    <div className="profile">
      <div className="profile-header">
        <div className="profile-photo">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt={`${user.username}'s profile`} className="profile-img" />
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
          <div className="user-profile-actions">
            <button
              className="user-profile-button user-profile-follow"
              onClick={handleFollowToggle}
              disabled={isLoadingFollow}
            >
              {isLoadingFollow ? 'Yükleniyor...' : isFollowing ? 'Takibi Bırak' : 'Takip Et'}
            </button>
            <button className="user-profile-button user-profile-message" onClick={handleMessage}>
              Mesaj Gönder
            </button>
            <button className="user-profile-button user-profile-block" onClick={handleBlockToggle}>
              {isBlocked ? 'Engeli Kaldır' : 'Engelle'}
            </button>
          </div>
        </div>
      </div>
      <div className="profile-bio">
        <p>{user.bio || 'Bio yok'}</p>
      </div>

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
                      handleBlockToggle(follower._id);
                    }}>Engelle</button>
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
                      handleBlockToggle(followed._id);
                    }}>Engelle</button>
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
    </div>
  );
};

export default UserProfile;