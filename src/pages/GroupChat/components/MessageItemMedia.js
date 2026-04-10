import React from 'react';
import MessageItemAudioPlayer from './MessageItemAudioPlayer';
import { getMediaType, getFileNameFromMedia, ensureFileExtension } from '../utils/messageItemUtils';

function FileIconPlaceholder({ name }) {
  const extension = name?.split('.')?.pop()?.toUpperCase() || 'FILE';
  return <span className="message-media-doc-badge">{extension.length <= 4 ? extension : 'FILE'}</span>;
}

export default function MessageItemMedia({ finalMedia, isOwnMessage, onMediaClick }) {
  if (!Array.isArray(finalMedia) || finalMedia.length === 0) return null;

  return (
    <div className="message-media-list">
      {finalMedia.map((mediaItem) => {
        const mediaUrl = mediaItem?.media_url || mediaItem?.file_url;
        if (!mediaUrl) return null;
        const key = mediaItem.id || mediaUrl;
        const type = getMediaType(mediaItem);

        if (type === 'image') {
          return (
            <img
              key={key}
              src={mediaUrl || undefined}
              alt="chat media"
              className="message-media message-media-image"
              onClick={(e) => {
                e.stopPropagation();
                onMediaClick?.({ media_url: mediaUrl, file_name: mediaItem.file_name || 'Image', media_type: 'image' });
              }}
              style={{ cursor: 'pointer' }}
            />
          );
        }

        if (type === 'video') {
          return (
            <video key={key} className="message-media message-media-video" controls preload="metadata">
              <source src={mediaUrl || undefined} type={mediaItem.file_mime || mediaItem.file_type || 'video/mp4'} />
              Your browser does not support the video tag.
            </video>
          );
        }

        if (type === 'audio') {
          return (
            <MessageItemAudioPlayer
              key={key}
              mediaUrl={mediaUrl}
              mediaItem={mediaItem}
              isOwnMessage={isOwnMessage}
            />
          );
        }

        if (type === 'link' || mediaItem.media_type === 'link') {
          let domainName = '';
          let displayUrl = mediaUrl;
          try {
            const urlObj = new URL(mediaUrl);
            domainName = urlObj.hostname.replace('www.', '');
            if (mediaUrl.length > 60) displayUrl = mediaUrl.substring(0, 57) + '...';
          } catch {
            domainName = 'Link';
          }
          return (
            <a
              key={key}
              href={mediaUrl}
              className="message-media message-media-link"
              target="_blank"
              rel="noopener noreferrer"
              title={mediaUrl}
            >
              <div className="message-link-preview">
                <div className="message-link-info">
                  <div className="message-link-domain">{domainName}</div>
                  <div className="message-link-url">{displayUrl}</div>
                </div>
              </div>
            </a>
          );
        }

        const fileName = getFileNameFromMedia(mediaItem);
        const finalFileName = ensureFileExtension(fileName, mediaItem);

        const handleDownload = async (e) => {
          e.preventDefault();
          try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await fetch(mediaUrl, {
              method: 'GET',
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!response.ok) throw new Error('Failed to download file');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = finalFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          } catch (error) {
            console.error('Error downloading file:', error);
            window.open(mediaUrl, '_blank');
          }
        };

        return (
          <a
            key={key}
            href={mediaUrl}
            className="message-media message-media-doc"
            onClick={handleDownload}
            target="_blank"
            rel="noopener noreferrer"
            download={finalFileName}
            title={finalFileName}
          >
            <FileIconPlaceholder name={finalFileName} />
            <div className="message-media-doc-text">
              <span className="message-media-doc-meta">
                <span className="doc-meta-type">{finalFileName}</span>
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}
