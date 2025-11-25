import React from 'react';
import { Image, Link, File, ArrowDown } from '@phosphor-icons/react';
import './GroupInfo.css';

const GroupInfo = () => {
    const infoItems = [
        { icon: Image, label: 'Photos' },
        { icon: Link, label: 'Links' },
        { icon: File, label: 'Documents' }
    ];

    return (
        <div className="group-info shadow-sm rounded-4 p-3">
            <h4>Group Chat Info</h4>
            {infoItems.map((item, index) => {
                const IconComponent = item.icon;
                return (
                    <div key={index} className="info-item">
                        <span className="info-icon">
                            <IconComponent size={24} />
                        </span>
                        <span>{item.label}</span>
                        <span className="info-arrow">
                            <ArrowDown size={32} />
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default GroupInfo;

