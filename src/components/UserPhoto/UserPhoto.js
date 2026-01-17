import React, { useState, useRef, useContext, useEffect } from 'react';
import { Plus } from '@phosphor-icons/react';
import axiosInstance from '../../API/axiosInstance';
import { AuthContext } from '../../context/AuthContext';
import { smartToast } from '../../API/toastManager';
import './UserPhoto.css';

/**
 * Reusable UserPhoto component that handles photo display and upload
 * Can be used in UserStatus, mobile sidebar, or anywhere else
 * Any update here will automatically reflect everywhere it's used
 */
const UserPhoto = ({ 
  user, 
  size = 'medium', 
  showName = false, 
  className = '',
  onClick,
  variant = 'default' // 'default', 'sidebar', 'status'
}) => {
  const { user: authUser, loginUser, initializing } = useContext(AuthContext);
  const [isUploading, setIsUploading] = useState(false);
  const [photoKey, setPhotoKey] = useState(Date.now());
  const [localPhotoUrl, setLocalPhotoUrl] = useState(null);
  const fileInputRef = useRef(null);

  const userId = user?.id || authUser?.id;
  // Prioritize user_photo over photo since user_photo is the updated field
  const basePhotoUrl = user?.user_photo || user?.photo || authUser?.user_photo || authUser?.photo;
  const photoUpdatedAt = user?.photoUpdatedAt || authUser?.photoUpdatedAt;

  // Use local photo URL if available (for immediate updates), otherwise use context photo with cache-busting
  const userPhoto = localPhotoUrl || (basePhotoUrl ? (photoUpdatedAt ? `${basePhotoUrl.split('?')[0]}?v=${photoUpdatedAt}` : `${basePhotoUrl.split('?')[0]}?t=${Date.now()}`) : null);
  const userName = user?.name || authUser?.name;
  const userInitials = user?.initials || (userName?.charAt(0)?.toUpperCase() || 'U');

  // On page reload, check for stored photo in sessionStorage first
  useEffect(() => {
    if (initializing) return;

    if (userId && !localPhotoUrl) {
      const storedPhoto = sessionStorage.getItem(`userPhoto_${userId}`);
      const storedTimestamp = sessionStorage.getItem(`userPhotoTimestamp_${userId}`);

      if (storedPhoto && storedTimestamp) {
        const timeSinceStored = Date.now() - parseInt(storedTimestamp);
        if (timeSinceStored < 10 * 60 * 1000) {
          setLocalPhotoUrl(storedPhoto);
          setPhotoKey(`stored-${storedTimestamp}`);
          return;
        } else {
          sessionStorage.removeItem(`userPhoto_${userId}`);
          sessionStorage.removeItem(`userPhotoTimestamp_${userId}`);
        }
      }
    }

    // Force image refresh when photoUpdatedAt or basePhotoUrl changes
    if (basePhotoUrl && photoUpdatedAt) {
      const baseUrl = basePhotoUrl.split('?')[0];
      const timestamp = Date.now();
      const random = Math.random();
      let serverUrl = `${baseUrl}?v=${photoUpdatedAt}&t=${timestamp}&r=${random}&cb=${photoUpdatedAt}`;
      setPhotoKey(`refresh-${photoUpdatedAt}-${timestamp}-${random}`);
    }
  }, [photoUpdatedAt, basePhotoUrl, user?.photoUpdatedAt, authUser?.photoUpdatedAt, userId, initializing, localPhotoUrl]);

  const handlePhotoClick = () => {
    if (onClick) {
      onClick();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      smartToast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      smartToast.error('Image size should be less than 5MB');
      return;
    }

    if (!userId) {
      smartToast.error('User ID not found');
      return;
    }

    setIsUploading(true);

    // Create preview URL for immediate display
    const tempPreviewUrl = URL.createObjectURL(file);
    setLocalPhotoUrl(tempPreviewUrl);

    try {
      // Store in sessionStorage for persistence across reloads
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        sessionStorage.setItem(`userPhoto_${userId}`, base64String);
        sessionStorage.setItem(`userPhotoTimestamp_${userId}`, Date.now().toString());
      };
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append('user_photo', file);

      const response = await axiosInstance.patch(`/user/${userId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Check if the upload was successful (status 200-299)
      const isSuccess = response.status >= 200 && response.status < 300;
      
      if (response.data && isSuccess) {
        let photoUrl = response.data.user_photo ||
          response.data.photo ||
          response.data.data?.user_photo ||
          response.data.data?.photo ||
          response.data.user?.user_photo ||
          response.data.user?.photo ||
          response.data.profile_photo ||
          response.data.avatar;

        // If we can't find the photo URL in the response, check existing photo or try to fetch updated user
        if (!photoUrl) {
          const existingPhoto = user?.user_photo || user?.photo || authUser?.user_photo || authUser?.photo;
          if (existingPhoto) {
            photoUrl = existingPhoto;
          } else {
            // Upload was successful but no URL in response - try to fetch updated user data
            try {
              console.log('Upload successful but no photo URL in response. Fetching updated user data...');
              const userResponse = await axiosInstance.get(`/user/${userId}`);
              const fetchedUser = userResponse.data?.user || userResponse.data?.data || userResponse.data;
              
              photoUrl = fetchedUser?.user_photo || 
                        fetchedUser?.photo || 
                        fetchedUser?.profile_photo || 
                        fetchedUser?.avatar;
              
              if (photoUrl) {
                console.log('Successfully fetched photo URL from updated user data');
              } else {
                // Still no URL, but upload was successful - keep local preview
                console.log('Photo uploaded successfully but URL not available yet. Keeping local preview.');
                // Don't show error - upload was successful, photo will be available on refresh
              }
            } catch (fetchError) {
              console.log('Could not fetch updated user data, but upload was successful:', fetchError);
              // Don't show error - upload was successful
            }
          }
        }

        const photoUpdatedAt = Date.now();
        const currentUser = user || authUser;
        
        // If we have a photoUrl, use it. Otherwise, keep the local preview URL temporarily
        // The local preview will be replaced when the user data refreshes or on page reload
        const finalPhotoUrl = photoUrl || tempPreviewUrl || currentUser?.user_photo || currentUser?.photo;
        
        const updatedUser = {
          ...currentUser,
          user_photo: finalPhotoUrl,
          photo: finalPhotoUrl,
          photoUpdatedAt: photoUpdatedAt
        };

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const rememberMe = localStorage.getItem('remember') === 'true';

        loginUser(updatedUser, token, rememberMe);
        smartToast.success('Profile photo updated successfully');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      smartToast.error(error?.response?.data?.message || 'Failed to upload photo');
      if (tempPreviewUrl) {
        URL.revokeObjectURL(tempPreviewUrl);
        setLocalPhotoUrl(null);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Size classes
  const sizeClasses = {
    small: 'user-photo-small',
    medium: 'user-photo-medium',
    large: 'user-photo-large'
  };

  const containerClass = `user-photo-container ${sizeClasses[size]} ${className} ${variant === 'sidebar' ? 'user-photo-sidebar' : ''} ${variant === 'status' ? 'user-photo-status' : ''}`;

  return (
    <div className={containerClass}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <div
        className="user-photo-avatar-container"
        onClick={handlePhotoClick}
        style={{ cursor: isUploading ? 'wait' : 'pointer' }}
        title={isUploading ? 'Uploading...' : 'Click to change photo'}
      >
        <div className="user-photo-avatar">
          {userPhoto ? (
            <img
              key={`photo-${photoKey}-${photoUpdatedAt || ''}`}
              src={userPhoto}
              alt={userName}
              className="user-photo-img"
              crossOrigin="anonymous"
              loading="eager"
              onError={(e) => {
                e.target.style.display = 'none';
                const span = e.target.parentElement.querySelector('.user-photo-initials');
                if (span) span.style.display = 'flex';
              }}
            />
          ) : null}
          <span
            className="user-photo-initials"
            style={{
              display: userPhoto ? 'none' : 'flex',
            }}
          >
            {isUploading ? '...' : userInitials}
          </span>
        </div>
        <div className="user-photo-overlay">
          <Plus size={variant === 'sidebar' ? 18 : variant === 'status' ? 24 : 16} weight="bold" />
        </div>
        {isUploading && (
          <div className="user-photo-loading">
            <div className="spinner"></div>
          </div>
        )}
      </div>
      {showName && userName && (
        <div className="user-photo-name">{userName}</div>
      )}
    </div>
  );
};

export default UserPhoto;

