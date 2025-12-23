import React, { useContext } from 'react';
import { Microphone, Headphones, GearSix } from '@phosphor-icons/react';
import UserPhoto from '../../../components/UserPhoto/UserPhoto';
import { AuthContext } from '../../../context/AuthContext';
import './UserStatus.css';

const UserStatus = ({ user }) => {
    const { user: authUser } = useContext(AuthContext);
    const userName = user?.name || authUser?.name;

    return (
        <div className="user-status">
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

