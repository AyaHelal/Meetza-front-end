import React, { useState, useRef, useContext, useEffect } from 'react';
import { Microphone, Headphones, GearSix, Plus } from '@phosphor-icons/react';
import axiosInstance from '../../../API/axiosInstance';
import { AuthContext } from '../../../context/AuthContext';
import { smartToast } from '../../../API/toastManager';
import './UserStatus.css';

const UserStatus = ({ user }) => {
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
    // If photo was recently uploaded, use the stored base64 image
    useEffect(() => {
        // Don't run until AuthContext has finished loading user data
        if (initializing) return;

        // Check if we have a stored photo in sessionStorage from recent upload
        if (userId && !localPhotoUrl) {
            const storedPhoto = sessionStorage.getItem(`userPhoto_${userId}`);
            const storedTimestamp = sessionStorage.getItem(`userPhotoTimestamp_${userId}`);

            if (storedPhoto && storedTimestamp) {
                const timeSinceStored = Date.now() - parseInt(storedTimestamp);
                // Use stored photo if it was stored within the last 10 minutes
                if (timeSinceStored < 10 * 60 * 1000) {
                    console.log('📸 Found stored photo in sessionStorage, using it');
                    setLocalPhotoUrl(storedPhoto);
                    setPhotoKey(`stored-${storedTimestamp}`);
                    return; // Don't proceed with server URL
                } else {
                    // Clean up old stored photo
                    sessionStorage.removeItem(`userPhoto_${userId}`);
                    sessionStorage.removeItem(`userPhotoTimestamp_${userId}`);
                }
            }
        }

        if (basePhotoUrl && !localPhotoUrl) {
            const currentPhotoUpdatedAt = user?.photoUpdatedAt || authUser?.photoUpdatedAt;
            const currentBasePhotoUrl = user?.user_photo || user?.photo || authUser?.user_photo || authUser?.photo;

            console.log('🔄 Page reload - photoUpdatedAt:', currentPhotoUpdatedAt);
            console.log('🔄 Base photo URL:', currentBasePhotoUrl);
            console.log('🔄 User object:', user || authUser);

            if (currentPhotoUpdatedAt && currentBasePhotoUrl) {
                const baseUrl = currentBasePhotoUrl.split('?')[0];

                // Check if photo was updated recently (within last 5 minutes)
                // If so, use more aggressive cache-busting
                const timeSinceUpdate = Date.now() - currentPhotoUpdatedAt;
                const isRecentUpdate = timeSinceUpdate < 5 * 60 * 1000; // 5 minutes

                console.log('🔄 Time since photo update:', Math.round(timeSinceUpdate / 1000), 'seconds');
                console.log('🔄 Is recent update:', isRecentUpdate);

                const timestamp = Date.now();
                const random = Math.random();

                // Create URL with photoUpdatedAt as the main cache-buster
                // For recent updates, use even more aggressive cache-busting
                let serverUrl;
                if (baseUrl.includes('cloudinary.com')) {
                    if (isRecentUpdate) {
                        // For recent updates, add more cache-busting parameters
                        serverUrl = `${baseUrl}?v=${currentPhotoUpdatedAt}&t=${timestamp}&r=${random}&cb=${currentPhotoUpdatedAt}&nocache=${timestamp}&fresh=${timestamp}&updated=${currentPhotoUpdatedAt}`;
                    } else {
                        serverUrl = `${baseUrl}?v=${currentPhotoUpdatedAt}&t=${timestamp}&r=${random}&cb=${currentPhotoUpdatedAt}&nocache=${timestamp}`;
                    }
                } else {
                    serverUrl = `${baseUrl}?v=${currentPhotoUpdatedAt}&t=${timestamp}&r=${random}&cb=${currentPhotoUpdatedAt}`;
                }

                console.log('🔄 Setting URL with photoUpdatedAt:', serverUrl);

                // Set URL with unique key that includes photoUpdatedAt
                setLocalPhotoUrl(serverUrl);
                setPhotoKey(`reload-${currentPhotoUpdatedAt}-${timestamp}-${random}`);

                // For recent updates, do more refresh attempts with longer delays
                // This gives Cloudinary CDN time to propagate the update
                const refreshDelays = isRecentUpdate
                    ? [500, 1000, 2000, 4000, 6000] // More attempts for recent updates
                    : [300, 800, 1500]; // Fewer for older updates

                refreshDelays.forEach((delay, index) => {
                    setTimeout(() => {
                        const refreshTimestamp = Date.now();
                        let refreshUrl;
                        if (baseUrl.includes('cloudinary.com')) {
                            if (isRecentUpdate) {
                                refreshUrl = `${baseUrl}?v=${currentPhotoUpdatedAt}&t=${refreshTimestamp}&r=${Math.random()}&cb=${currentPhotoUpdatedAt}&refresh=${index}&nocache=${refreshTimestamp}&fresh=${refreshTimestamp}`;
                            } else {
                                refreshUrl = `${baseUrl}?v=${currentPhotoUpdatedAt}&t=${refreshTimestamp}&r=${Math.random()}&cb=${currentPhotoUpdatedAt}&refresh=${index}&nocache=${refreshTimestamp}`;
                            }
                        } else {
                            refreshUrl = `${baseUrl}?v=${currentPhotoUpdatedAt}&t=${refreshTimestamp}&r=${Math.random()}&cb=${currentPhotoUpdatedAt}&refresh=${index}`;
                        }
                        setLocalPhotoUrl(refreshUrl);
                        setPhotoKey(`refresh-${currentPhotoUpdatedAt}-${refreshTimestamp}-${Math.random()}`);
                        console.log(`🔄 Refresh attempt ${index + 1} after ${delay}ms`);
                    }, delay);
                });
            } else {
                console.log('⚠️ No photoUpdatedAt or basePhotoUrl found');
                if (currentBasePhotoUrl) {
                    const baseUrl = currentBasePhotoUrl.split('?')[0];
                    setLocalPhotoUrl(`${baseUrl}?t=${Date.now()}&r=${Math.random()}`);
                    setPhotoKey(`${Date.now()}-${Math.random()}`);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initializing]); // Run when initializing completes

    // Force image refresh when photoUpdatedAt or basePhotoUrl changes
    // But don't override if we have a blob URL (which is the new uploaded image)
    useEffect(() => {
        // Only update if we don't have a blob URL (blob URLs are temporary previews of new uploads)
        if (basePhotoUrl && localPhotoUrl && !localPhotoUrl.startsWith('blob:')) {
            const currentPhotoUpdatedAt = user?.photoUpdatedAt || authUser?.photoUpdatedAt;
            if (currentPhotoUpdatedAt) {
                const baseUrl = basePhotoUrl.split('?')[0];
                // Use aggressive cache-busting with multiple parameters
                const serverUrl = `${baseUrl}?v=${currentPhotoUpdatedAt}&t=${Date.now()}&r=${Math.random()}&cb=${Date.now()}`;
                setLocalPhotoUrl(serverUrl);
                setPhotoKey(`${currentPhotoUpdatedAt}-${Date.now()}-${Math.random()}`);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // We'll keep using this blob URL for the entire session
        // Store it in sessionStorage so it persists across page reloads within the same session
        let tempPreviewUrl = null;
        try {
            tempPreviewUrl = URL.createObjectURL(file);
            setLocalPhotoUrl(tempPreviewUrl);
            setPhotoKey(Date.now());

            // Convert blob to base64 and store in sessionStorage as fallback
            // This allows us to restore the image on reload
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                sessionStorage.setItem(`userPhoto_${userId}`, base64String);
                sessionStorage.setItem(`userPhotoTimestamp_${userId}`, Date.now().toString());
                console.log('📸 Stored photo in sessionStorage for session persistence');
            };
            reader.readAsDataURL(file);
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

                // If no photo URL in response, the server has updated the file
                // Cloudinary might create a new URL or update the existing one
                // We'll keep using the blob URL for now and update the timestamp
                // On reload, the cache-busting will force a fresh fetch
                if (!photoUrl) {
                    // Use existing photo URL - Cloudinary might have updated it or created a new one
                    // Since we don't have the new URL, we'll use the existing one with cache-busting
                    const existingPhoto = user?.user_photo || user?.photo || authUser?.user_photo || authUser?.photo;
                    if (existingPhoto) {
                        photoUrl = existingPhoto; // Use existing URL - Cloudinary will serve the updated file
                        console.log('📸 No URL in response, using existing URL with cache-busting:', photoUrl);
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
                console.log('📸 Saving photoUpdatedAt:', photoUpdatedAt);
                console.log('📸 Photo URL:', photoUrl);

                const currentUser = user || authUser;
                const updatedUser = {
                    ...currentUser,
                    // Prioritize user_photo - this is the field that gets updated
                    user_photo: photoUrl || currentUser?.user_photo || currentUser?.photo,
                    // Also update photo field to keep them in sync
                    photo: photoUrl || currentUser?.user_photo || currentUser?.photo,
                    photoUpdatedAt: photoUpdatedAt
                };
                console.log('📸 Updated user object:', updatedUser);

                // Get token from storage
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const rememberMe = localStorage.getItem('remember') === 'true';

                // Update user in context - this will trigger useEffect to update the photo
                loginUser(updatedUser, token, rememberMe);
                console.log('📸 User saved to context with photoUpdatedAt:', photoUpdatedAt);

                // Keep the blob URL active for the entire session
                // Don't switch to server URL - the blob URL is the actual new image
                // Only on a fresh login (not reload) will we use the server URL
                console.log('📸 Keeping blob URL active for session:', tempPreviewUrl);

                // Verify it was saved
                setTimeout(() => {
                    const savedUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
                    console.log('📸 Verified saved user photoUpdatedAt:', savedUser?.photoUpdatedAt);
                    console.log('📸 Verified saved user_photo:', savedUser?.user_photo);
                }, 100);

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
                        key={`photo-${photoKey}-${photoUpdatedAt || ''}`}
                        src={userPhoto}
                        alt={userName}
                        className="status-avatar-img"
                        style={{
                            display: 'block',
                            imageRendering: 'auto'
                        }}
                        crossOrigin="anonymous"
                        loading="eager"
                        onLoad={() => {
                            console.log('✅ Image loaded successfully');
                        }}
                        onError={(e) => {
                            console.error('❌ Image failed to load:', userPhoto);
                            // If image fails to load, try with different cache-busting
                            const baseUrl = userPhoto.split('?')[0];
                            const currentPhotoUpdatedAt = user?.photoUpdatedAt || authUser?.photoUpdatedAt;
                            if (currentPhotoUpdatedAt) {
                                const timestamp = Date.now();
                                let retryUrl;
                                if (baseUrl.includes('cloudinary.com')) {
                                    retryUrl = `${baseUrl}?_a=${timestamp}&v=${currentPhotoUpdatedAt}&retry=${timestamp}&error=${Math.random()}`;
                                } else {
                                    retryUrl = `${baseUrl}?v=${currentPhotoUpdatedAt}&retry=${timestamp}&error=${Math.random()}`;
                                }
                                console.log('🔄 Retrying with URL:', retryUrl);
                                e.target.src = retryUrl;
                            } else {
                                const retryUrl = `${baseUrl}?retry=${Date.now()}&error=${Math.random()}`;
                                e.target.src = retryUrl;
                            }
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

