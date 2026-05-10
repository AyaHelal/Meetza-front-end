import React, { useContext } from 'react';
import { VideoCamera, Microphone, MicrophoneSlash, VideoCameraSlash, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { useNavigate, useLocation } from 'react-router-dom';
import UserPhoto from '../../../components/UserPhoto/UserPhoto';
import { AuthContext } from '../../../context/AuthContext';
import { useMediaContext } from '../../../context/MediaContext';
import './UserStatus.css';

const UserStatus = ({ user, activeMeetingId, activeGroupId }) => {
    const { user: authUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const userName = user?.name || authUser?.name;
    
    // Get media controls from MediaContext
    const { audioMuted, videoMuted, meetingSpeakerMuted, setMeetingSpeakerMuted, toggleAudio, toggleVideo } = useMediaContext();

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
                allowUpload={false}
                onClick={() => navigate('/profile')}
            />
            <div className="status-info">
                <div className="status-name">{userName}</div>
                <div className="status-online-row">
                    <span className="status-online">{user?.status || 'Online'}</span>
                    <div className="status-icons ps-0">
                        {/* Always show mic and camera controls */}
                        <button
                            type="button"
                            className={`status-icon status-mic ${!audioMuted ? 'active' : ''} ${!activeMeetingId ? 'disabled' : ''}`}
                            onClick={() => {
                                if (activeMeetingId) toggleAudio();
                            }}
                            disabled={!activeMeetingId}
                            aria-label={audioMuted ? "Unmute microphone" : "Mute microphone"}
                            title={!activeMeetingId ? "Join a meeting to use microphone" : (audioMuted ? "Unmute microphone" : "Mute microphone")}
                        >
                            {audioMuted ? <MicrophoneSlash size={20} /> : <Microphone size={20} weight="fill" />}
                        </button>
                        <button
                            type="button"
                            className={`status-icon status-camera ${!videoMuted ? 'active' : ''} ${!activeMeetingId ? 'disabled' : ''}`}
                            onClick={() => {
                                if (activeMeetingId) toggleVideo();
                            }}
                            disabled={!activeMeetingId}
                            aria-label={videoMuted ? "Turn on camera" : "Turn off camera"}
                            title={!activeMeetingId ? "Join a meeting to use camera" : (videoMuted ? "Turn on camera" : "Turn off camera")}
                        >
                            {videoMuted ? <VideoCameraSlash size={20} /> : <VideoCamera size={20} weight="fill" />}
                        </button>
                        {showReturnToMeeting && (
                            <button
                                type="button"
                                className={`status-icon status-speaker ${!meetingSpeakerMuted ? 'active' : ''}`}
                                onClick={() => setMeetingSpeakerMuted((m) => !m)}
                                title={meetingSpeakerMuted ? "Playing the meeting audio" : "mute the meeting sound"}
                                aria-label={meetingSpeakerMuted ? "Unmute meeting sound" : "Mute meeting sound"}
                            >
                                {meetingSpeakerMuted ? <SpeakerSlash size={20} /> : <SpeakerHigh size={20} weight="fill" />}
                            </button>
                        )}
                        {/* Show "Return to meeting" button if in a meeting but not on meeting page */}
                        {showReturnToMeeting && (
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
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserStatus;

