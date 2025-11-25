import React from 'react';
import { Microphone, Headphones, GearSix } from '@phosphor-icons/react';
import './UserStatus.css';

const UserStatus = ({ user }) => {
    return (
        <div className="user-status">
            <div className="status-avatar">{user.initials}</div>
            <div className="status-info">
                <div className="status-name">{user.name}</div>
                <div className="status-online-row">
                    <span className="status-online">{user.status}</span>
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

