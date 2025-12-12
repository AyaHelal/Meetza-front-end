import React from 'react';
import { Image, Users, ArrowDown } from '@phosphor-icons/react';
import './GroupInfo.css';

const GroupInfo = ({
    groupInfo,
    activeSection,
    onSelectSection,
    contentSummary,
    mediaSummary,
    memberCount,
    isMobile,
    onCloseMobile
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
            // Toggle: if clicking the same section that's already active, close it
            if (activeSection === key) {
                onSelectSection(null);
            } else {
                onSelectSection(key);
            }
        }
    };

    return (
        <div className="group-info shadow-sm rounded-4 p-3">
            <h4>Group Chat Info</h4>

            {infoItems.map((item, index) => {
                const IconComponent = item.icon;
                const isExpanded = activeSection === item.key;

                return (
                    <div
                        key={index}
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
                );
            })}
        </div>
    );
};

export default GroupInfo;
