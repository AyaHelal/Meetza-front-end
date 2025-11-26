import React from 'react';
import { Image, Link, File, ArrowDown } from '@phosphor-icons/react';
import { categorizeResources } from './utils';
import './GroupInfo.css';

const GroupInfo = ({ groupInfo, expandedSection, setExpandedSection }) => {

    const { photos, links, documents } = categorizeResources(groupInfo?.content?.resources);

    const infoItems = [
        { icon: Image, label: 'Photos', count: photos.length, key: 'photos' },
        { icon: Link, label: 'Links', count: links.length, key: 'links' },
        { icon: File, label: 'Documents', count: documents.length, key: 'documents' }
    ];

    const handleItemClick = (key) => {
        setExpandedSection(expandedSection === key ? null : key);
    };

    return (
        <div className="group-info shadow-sm rounded-4 p-3">
            <h4>Group Chat Info</h4>
            {infoItems.map((item, index) => {
                const IconComponent = item.icon;
                const isExpanded = expandedSection === item.key;
                return (
                    <div key={index} className="info-item" onClick={() => handleItemClick(item.key)}>
                        <span className="info-icon">
                            <IconComponent size={24} />
                        </span>
                        <span>{item.label} ({item.count})</span>
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

