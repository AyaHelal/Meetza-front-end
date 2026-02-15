import React, { useContext } from 'react';
import { VideoCamera, GearSix } from '@phosphor-icons/react';
import { useNavigate, useLocation } from 'react-router-dom';
import UserPhoto from '../../../components/UserPhoto/UserPhoto';
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
        <div className={`user-status ${showReturnToMeeting ? 'user-status-expanded' : ''}`}>
            <UserPhoto 
                user={user} 
                variant="status" 
                size="medium"
                className="status-user-photo"
            />
            <div className="status-info">
                <div className="status-name">{userName}</div>
                <div className="status-online-row">
                    <span className="status-online">{user?.status || 'Online'}</span>
                    <div className="status-icons ps-0">
                        {showReturnToMeeting ? (
                            <button
                                type="button"
                                className="status-icon status-return-to-meeting"
                                onClick={handleReturnToMeeting}
                                aria-label="Return to meeting"
                                title="Return to meeting"
                            >
                                <VideoCamera size={20} weight="fill" />
                                <span className="status-return-label">Return to meeting</span>
                            </button>
                        ) : null}
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

