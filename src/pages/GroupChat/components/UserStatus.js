import React, { useState, useRef, useContext } from 'react';
import { Microphone, Headphones, GearSix, Plus } from '@phosphor-icons/react';
import axiosInstance from '../../../API/axiosInstance';
import { AuthContext } from '../../../context/AuthContext';
import { smartToast } from '../../../API/toastManager';
import './UserStatus.css';

const UserStatus = ({ user }) => {
    const { user: authUser, loginUser } = useContext(AuthContext);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    
    const userId = user?.id || authUser?.id;
    const userPhoto = user?.photo || user?.user_photo || authUser?.photo || authUser?.user_photo;
    const userName = user?.name || authUser?.name;
    const userInitials = user?.initials || (userName?.charAt(0)?.toUpperCase() || 'U');

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

        try {
            const formData = new FormData();
            formData.append('user_photo', file);

            console.log('📤 Sending PATCH request to /user/' + userId);
            console.log('📤 FormData contents:', {
                hasUserPhoto: formData.has('user_photo'),
                file: file.name,
                fileSize: file.size,
                fileType: file.type
            });
            
            const response = await axiosInstance.patch(`/user/${userId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            console.log('📥 PATCH /user/' + userId + ' Response:', {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: response.data,
                fullResponse: response
            });

            if (response.data) {
                console.log('📸 Photo upload response data:', response.data);
                console.log('📸 Response data type:', typeof response.data);
                console.log('📸 Response data keys:', Object.keys(response.data || {}));
                
                // Try different possible field names and nested structures for the photo URL
                let photoUrl = response.data.user_photo || 
                              response.data.photo || 
                              response.data.data?.user_photo || 
                              response.data.data?.photo || 
                              response.data.user?.user_photo || 
                              response.data.user?.photo ||
                              response.data.profile_photo ||
                              response.data.avatar;
                
                console.log('📸 Extracted photo URL from PATCH response:', photoUrl);
                
                if (!photoUrl) {
                    console.warn('⚠️ Photo URL not found in PATCH response. Available fields:', response.data);
                }
                
                // Update user in context with the photo URL from PATCH response
                const updatedUser = {
                    ...authUser,
                    photo: photoUrl || authUser?.photo,
                    user_photo: photoUrl || authUser?.user_photo
                };
                
                console.log('📸 Updated user object:', updatedUser);
                
                // Get token from storage
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const rememberMe = localStorage.getItem('remember') === 'true';
                
                // Update user in context
                loginUser(updatedUser, token, rememberMe);
                
                smartToast.success('Profile photo updated successfully');
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            smartToast.error(error?.response?.data?.message || 'Failed to upload photo');
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
                        src={userPhoto} 
                        alt={userName} 
                        className="status-avatar-img"
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

