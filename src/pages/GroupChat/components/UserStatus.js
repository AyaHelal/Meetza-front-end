import React, { useState, useRef, useContext, useEffect } from 'react';
import { Microphone, Headphones, GearSix, Plus } from '@phosphor-icons/react';
import axiosInstance from '../../../API/axiosInstance';
import { AuthContext } from '../../../context/AuthContext';
import { smartToast } from '../../../API/toastManager';
import './UserStatus.css';

const UserStatus = ({ user }) => {
    const { user: authUser, loginUser } = useContext(AuthContext);
    const [isUploading, setIsUploading] = useState(false);
    const [photoKey, setPhotoKey] = useState(Date.now());
    const [localPhotoUrl, setLocalPhotoUrl] = useState(null);
    const fileInputRef = useRef(null);
    
    const userId = user?.id || authUser?.id;
    const basePhotoUrl = user?.photo || user?.user_photo || authUser?.photo || authUser?.user_photo;
    const photoUpdatedAt = user?.photoUpdatedAt || authUser?.photoUpdatedAt;
    
    // Use local photo URL if available (for immediate updates), otherwise use context photo with cache-busting
    const userPhoto = localPhotoUrl || (basePhotoUrl ? (photoUpdatedAt ? `${basePhotoUrl.split('?')[0]}?v=${photoUpdatedAt}` : `${basePhotoUrl.split('?')[0]}?t=${Date.now()}`) : null);
    const userName = user?.name || authUser?.name;
    const userInitials = user?.initials || (userName?.charAt(0)?.toUpperCase() || 'U');

    // Force image refresh when photoUpdatedAt or basePhotoUrl changes
    // But don't override if we have a blob URL (which is the new uploaded image)
    useEffect(() => {
        // Only update if we don't have a blob URL (blob URLs are temporary previews of new uploads)
        if (basePhotoUrl && (!localPhotoUrl || !localPhotoUrl.startsWith('blob:'))) {
            const currentPhotoUpdatedAt = user?.photoUpdatedAt || authUser?.photoUpdatedAt;
            if (currentPhotoUpdatedAt) {
                const newPhotoUrl = `${basePhotoUrl.split('?')[0]}?v=${currentPhotoUpdatedAt}`;
                setLocalPhotoUrl(newPhotoUrl);
                setPhotoKey(currentPhotoUpdatedAt);
            }
        }
    }, [photoUpdatedAt, basePhotoUrl, user?.photoUpdatedAt, authUser?.photoUpdatedAt]);

    const handlePhotoClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            smartToast.error('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            smartToast.error('Image size should be less than 5MB');
            return;
        }

        if (!userId) {
            smartToast.error('User ID not found');
            return;
        }

        setIsUploading(true);
        
        // Create a preview URL from the uploaded file - this is the NEW image
        // We'll keep using this blob URL since it's definitely the updated photo
        let tempPreviewUrl = null;
        try {
            tempPreviewUrl = URL.createObjectURL(file);
            setLocalPhotoUrl(tempPreviewUrl);
            setPhotoKey(Date.now());
        } catch (previewError) {
            console.warn('Could not create preview URL:', previewError);
        }

        try {
            const formData = new FormData();
            formData.append('user_photo', file);
            
            const response = await axiosInstance.patch(`/user/${userId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data) {
                // Try different possible field names and nested structures for the photo URL
                let photoUrl = response.data.user_photo || 
                              response.data.photo || 
                              response.data.data?.user_photo || 
                              response.data.data?.photo || 
                              response.data.user?.user_photo || 
                              response.data.user?.photo ||
                              response.data.profile_photo ||
                              response.data.avatar;
                
                // If no photo URL in response, use existing photo URL with cache-busting
                // The server updates the file at the same URL, so we just need to force reload
                if (!photoUrl) {
                    // Use existing photo URL - the server has updated the file at this URL
                    const existingPhoto = user?.photo || user?.user_photo || authUser?.photo || authUser?.user_photo;
                    if (existingPhoto) {
                        photoUrl = existingPhoto; // Use existing URL since server updated the file there
                    } else {
                        console.error('No existing photo URL found');
                        smartToast.error('Failed to update photo: No photo URL available');
                        setIsUploading(false);
                        if (tempPreviewUrl) {
                            URL.revokeObjectURL(tempPreviewUrl);
                            setLocalPhotoUrl(null);
                        }
                        return;
                    }
                }
                
                // Add cache-busting timestamp to photo URL
                const photoUpdatedAt = Date.now();
                
                // The temporary preview blob URL (tempPreviewUrl) already contains the NEW image
                // We'll keep using it instead of fetching from server, which might serve cached image
                // The blob URL from the uploaded file is guaranteed to be the new image
                
                // Keep the blob URL active - don't revoke it or fetch from server
                // The blob URL is the actual new image the user just uploaded
                // We'll update the context so other components know the photo was updated
                
                // Update user in context with the photo URL from PATCH response
                // Use the current user (from prop or context) as base
                const currentUser = user || authUser;
                const updatedUser = {
                    ...currentUser,
                    photo: photoUrl || currentUser?.photo,
                    user_photo: photoUrl || currentUser?.user_photo,
                    photoUpdatedAt: photoUpdatedAt
                };
                
                // Get token from storage
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const rememberMe = localStorage.getItem('remember') === 'true';
                
                // Update user in context - this will trigger useEffect to update the photo
                loginUser(updatedUser, token, rememberMe);
                
                // Don't override the blob URL - it's the fresh image
                // The blob URL from forceImageReload is already set and will display the fresh image
                
                smartToast.success('Profile photo updated successfully');
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            smartToast.error(error?.response?.data?.message || 'Failed to upload photo');
            // Clean up temporary preview on error
            if (tempPreviewUrl) {
                URL.revokeObjectURL(tempPreviewUrl);
            }
            // Reset to original photo
            setLocalPhotoUrl(null);
        } finally {
            setIsUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="user-status">
            <div className="status-avatar-container" onClick={handlePhotoClick}>
                {userPhoto ? (
                    <img 
                        key={`photo-${photoKey}`}
                        src={userPhoto}
                        alt={userName} 
                        className="status-avatar-img"
                        style={{ 
                            display: 'block',
                            imageRendering: 'auto'
                        }}
                        crossOrigin="anonymous"
                        onError={(e) => {
                            console.error('Image failed to load:', userPhoto);
                            // If image fails to load, try with different cache-busting
                            const baseUrl = userPhoto.split('?')[0];
                            const retryUrl = `${baseUrl}?retry=${Date.now()}&error=${Math.random()}`;
                            e.target.src = retryUrl;
                        }}
                    />
                ) : (
                    <div className="status-avatar">{userInitials}</div>
                )}
                <div className="status-avatar-overlay">
                    <Plus size={20} weight="bold" />
                </div>
                {isUploading && (
                    <div className="status-avatar-loading">
                        <div className="spinner"></div>
                    </div>
                )}
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
            <div className="status-info">
                <div className="status-name">{userName}</div>
                <div className="status-online-row">
                    <span className="status-online">{user?.status || 'Online'}</span>
                    <div className="status-icons ps-4">
                        <div className="status-icon">
                            <Microphone size={20} />
                        </div>
                        <div className="status-icon">
                            <Headphones size={20} />
                        </div>
                        <div className="status-icon">
                            <GearSix size={20} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserStatus;

