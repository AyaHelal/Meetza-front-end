import React from 'react';
import { Paperclip, UserCircle } from '@phosphor-icons/react';
import './MeetingRightSidebar.css';

const MeetingRightSidebar = () => {
    // Sample data - you can make this dynamic later
    const participants = [
        { name: 'Farida Emad', status: 'Online' },
        { name: 'Farida Emad', status: 'Online' },
        { name: 'Farida Emad', status: 'Online' },
        { name: 'Farida Emad', status: 'Offline' },
    ];

    return (
        <div className="meeting-right-sidebar px-2">
            {/* Video Description Card */}
            <div className="video-description-card p-4">
                <div>
                    <h3 className="video-description-title fw-semibold">Video Description</h3>
                    <p className="video-description-subtitle">All about attract not chasing</p>
                </div>

                <div className="video-description-items">
                    <div className="description-item">
                        <Paperclip size={20} weight="regular" className="item-icon" />
                        <span>Lecture 101</span>
                    </div>
                    <div className="description-item">
                        <Paperclip size={20} weight="regular" className="item-icon" />
                        <span>Lecture 101</span>
                    </div>
                </div>

                <p className="video-description-text">
                    Stories we talk about from poem the rider about
                </p>
            </div>

            {/* Participate Card */}
            <div className="participate-card">
                <h3 className="participate-title fw-semibold">Participate</h3>
                <div className="participants-list ">
                    {participants.map((participant, index) => (
                        <div key={index} className="participant-item">
                            <div className="participant-avatar">
                                <UserCircle size={40} weight="fill" />
                            </div>
                            <div className="participant-info">
                                <span className="participant-name fw-semibold">{participant.name}</span>
                                <span className={`participant-status ${participant.status.toLowerCase()}`}>
                                    {participant.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MeetingRightSidebar;

