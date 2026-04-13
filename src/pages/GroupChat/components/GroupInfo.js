import React, { Fragment } from 'react';
import { Image, Users, ArrowDown, SignOut } from '@phosphor-icons/react';
import './GroupInfo.css';

const GroupInfo = ({
    groupInfo,
    activeSection,
    onSelectSection,
    contentSummary,
    mediaSummary,
    memberCount,
    isMobile,
    onCloseMobile,
    showLeaveGroup = false,
    onLeaveGroup,
    leaveLoading = false,
}) => {
    const contentCount = (contentSummary?.photos?.length || 0)
        + (contentSummary?.links?.length || 0)
        + (contentSummary?.documents?.length || 0)
        + (contentSummary?.audio?.length || 0);

    const mediaCount = (mediaSummary?.images?.length || 0)
        + (mediaSummary?.videos?.length || 0)
        + (mediaSummary?.audio?.length || 0)
        + (mediaSummary?.files?.length || 0)
        + (mediaSummary?.links?.length || 0);

    const membersTotal = typeof memberCount === 'number'
        ? memberCount
        : (groupInfo?.members?.length || 0);

    const infoItems = [
        {
            icon: Image,
            label: 'Contents',
            key: 'contents',
            count: contentCount
        },
        {
            icon: Image,
            label: 'Media',
            key: 'media',
            count: mediaCount
        },
        {
            icon: Users,
            label: 'Members',
            key: 'members',
            count: membersTotal
        }
    ];

    const handleItemClick = (key) => {
        if (onSelectSection) {
            if (activeSection === key) {
                onSelectSection(null);
            } else {
                onSelectSection(key);
            }
        }
    };

    return (
        <div className="group-info shadow-sm rounded-4 p-3">
            <div className="group-info-header d-flex align-items-center justify-content-between gap-2 flex-wrap">
                <h4 className="group-info-title mb-0">Group Chat Info</h4>
            </div>

            <div className="group-info-scroll">
                {infoItems.map((item) => {
                    const IconComponent = item.icon;
                    const isExpanded = activeSection === item.key;

                    return (
                        <Fragment key={item.key}>
                            <div
                                className="info-item"
                                onClick={() => handleItemClick(item.key)}
                            >
                                <span className="info-icon">
                                    <IconComponent size={24} />
                                </span>

                                <span>
                                    {item.label} ({item.count})
                                </span>

                                <span className={`info-arrow ${isExpanded ? 'rotated' : ''}`}>
                                    <ArrowDown size={32} />
                                </span>
                            </div>

                            {item.key === 'members' && showLeaveGroup && onLeaveGroup ? (
                                <button
                                    type="button"
                                    className="group-info-leave-row"
                                    title="Leave group"
                                    aria-label="Leave group"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLeaveGroup();
                                    }}
                                    disabled={leaveLoading}
                                >
                                    <span className="group-info-leave-row-icon" aria-hidden>
                                        <SignOut size={24} weight="bold" />
                                    </span>
                                    <span className="group-info-leave-row-label">Leave group</span>
                                </button>
                            ) : null}
                        </Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default GroupInfo;
