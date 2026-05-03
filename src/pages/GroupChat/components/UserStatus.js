import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UserPhoto from '../../../components/UserPhoto/UserPhoto';
import MeetingAwayMediaToolbar from '../../../components/MeetingAwayMediaToolbar/MeetingAwayMediaToolbar';
import { AuthContext } from '../../../context/AuthContext';
import './UserStatus.css';

const UserStatus = ({ user, activeMeetingId, activeGroupId }) => {
    const { user: authUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const userName = user?.name || authUser?.name;
    
    const showReturnToMeeting = activeMeetingId && location.pathname !== '/meetings';

    const handleReturnToMeeting = (e) => {
        e?.stopPropagation?.();
        if (!activeMeetingId) return;
        navigate('/meetings', {
            state: { meetingId: activeMeetingId, groupId: activeGroupId || null },
        });
    };

    return (
        <div className={`user-status ${activeMeetingId ? 'user-status-expanded' : ''}`}>
            <UserPhoto 
                user={user} 
                variant="status" 
                size="medium"
                className="status-user-photo"
                allowUpload={false}
                onClick={() => navigate('/profile')}
            />
            <div className="status-info">
                <div className="status-name">{userName}</div>
                <div className="status-online-row">
                    <span className="status-online">{user?.status || 'Online'}</span>
                    <div className="status-icons ps-0">
                        <MeetingAwayMediaToolbar
                            variant="inline"
                            showSpeaker
                            showReturn={showReturnToMeeting}
                            onReturn={handleReturnToMeeting}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserStatus;

