import React, { useState, useEffect } from "react";
import { Microphone, Play, Plus, Trash, Image as ImageIcon, Link as LinkIcon, FileText, DownloadSimple, X, Video, CaretDown, CaretUp } from "@phosphor-icons/react";
import { File } from "lucide-react";
import { categorizeResources } from "./utils";
import { getDownloadFileName, getFileExtensionForLabel, getInitials } from "../utils/mainChatMessageUtils";
import { getUserByEmail, joinGroup, deleteMembership, getGroupMemberships, deleteResource, addResource, addLinkResource } from "../../Groups/services/groupsService";
import { smartToast } from "../../../API/toastManager";
import { ConfirmDeleteModal } from "../../../components/shared/ConfirmDeleteModal";
import { useRef } from "react";

function ResourceGrid({ items, onMediaClick, onContextMenu, onTouchStart, onTouchEnd }) {
  return (
    <div className="expanded-items">
      {items.length === 0 && <p className="empty-state">No items yet.</p>}
      {items.map((item, index) => {
        const url = item.media_url || item.file_url;
        const isImage =
          /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url) ||
          item.media_type?.startsWith("image") ||
          item.file_type?.startsWith("image/");
        const isVideo =
          /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(url) ||
          item.media_type?.startsWith("video") ||
          item.file_type?.startsWith("video/");
        const isAudio =
          /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(url) ||
          item.media_type?.startsWith("audio") ||
          item.media_type === "voice" ||
          item.media_type === "voice_note" ||
          item.file_type?.startsWith("audio/");
        return (
          <div
            key={item.id || index}
            className={`media-item ${isImage ? "media-item-photo" : isVideo ? "media-item-video" : isAudio ? "media-item-audio" : ""}`}
            onClick={() => onMediaClick(item)}
            onContextMenu={(e) => onContextMenu && onContextMenu(e, item)}
            onTouchStart={(e) => onTouchStart && onTouchStart(e, item)}
            onTouchEnd={onTouchEnd}
            onTouchMove={onTouchEnd}
          >
            {isImage ? (
              <img src={url || undefined} className="expanded-photo" alt={item.file_name || "media"} />
            ) : isVideo ? (
              <div className="video-thumbnail">
                <video src={url || undefined} className="expanded-video" preload="metadata">
                  Your browser does not support the video tag.
                </video>
                <div className="video-play-overlay">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="white" opacity="0.9">
                    <path d="M18 32V16l12 8-12 8z" />
                  </svg>
                </div>
              </div>
            ) : isAudio ? (
              <div className="voice-note-card">
                <div className="voice-note-header">
                  <div className="voice-note-icon-wrapper">
                    <Microphone size={20} weight="fill" />
                  </div>
                  <div className="voice-note-title">
                    <span className="voice-note-label">Voice Note</span>
                    <span className="voice-note-filename">{item.file_name || "Recording"}</span>
                  </div>
                </div>
                <div className="voice-note-waveform">
                  {Array.from({ length: 40 }, (_, i) => (
                    <div
                      key={i}
                      className="voice-note-bar"
                      style={{ height: `${20 + Math.random() * 60}%`, animationDelay: `${i * 0.05}s` }}
                    />
                  ))}
                </div>
                <div className="voice-note-play-button">
                  <Play size={16} weight="fill" />
                </div>
              </div>
            ) : (
              <div className="media-placeholder">
                <File size={24} />
                <span>{item.file_name || "Media"}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LinkList({ items, onContextMenu, onTouchStart, onTouchEnd }) {
  return (
    <div className="expanded-items expanded-links">
      {items.length === 0 && <p className="empty-state">No links yet.</p>}
      {items.map((item, index) => (
        <a
          key={item.id || index}
          href={item.media_url || item.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="link-item"
          onClick={(e) => {
            e.preventDefault();
            window.open(item.media_url || item.file_url, "_blank", "noopener,noreferrer");
          }}
          onContextMenu={(e) => onContextMenu && onContextMenu(e, item)}
          onTouchStart={(e) => onTouchStart && onTouchStart(e, item)}
          onTouchEnd={onTouchEnd}
          onTouchMove={onTouchEnd}
        >
          <span className="link-title">{item.file_name}</span>
          <span className="link-url" title={item.original_url || item.media_url || item.file_url}>
            {item.original_url || item.media_url || item.file_url}
          </span>
        </a>
      ))}
    </div>
  );
}

function DocumentList({ items, onContextMenu, onTouchStart, onTouchEnd }) {
  return (
    <div className="expanded-items documents-grid">
      {items.length === 0 && <p className="empty-state">No documents yet.</p>}
      {items.map((item, index) =>
        item.media_type === "audio" ? (
          <div 
            key={item.id || index} 
            className="document-item audio-item"
            onContextMenu={(e) => onContextMenu && onContextMenu(e, item)}
            onTouchStart={(e) => onTouchStart && onTouchStart(e, item)}
            onTouchEnd={onTouchEnd}
            onTouchMove={onTouchEnd}
          >
            <audio controls src={item.media_url || item.file_url || undefined} />
            <span>{item.file_name || "Audio"}</span>
          </div>
        ) : (
          (() => {
            const fileName = getDownloadFileName(item);
            const fileUrl = item.file_url || item.media_url;
            const handleDownload = async (e) => {
              e.preventDefault();
              try {
                const token = localStorage.getItem("token") || sessionStorage.getItem("token");
                const response = await fetch(fileUrl, {
                  method: "GET",
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!response.ok) throw new Error("Failed to download file");
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error("Error downloading file:", error);
                window.open(fileUrl, "_blank");
              }
            };
            return (
              <a
                key={item.id || index}
                href={fileUrl}
                onClick={handleDownload}
                onContextMenu={(e) => onContextMenu && onContextMenu(e, item)}
                onTouchStart={(e) => onTouchStart && onTouchStart(e, item)}
                onTouchEnd={onTouchEnd}
                onTouchMove={onTouchEnd}
                target="_blank"
                rel="noopener noreferrer"
                className="document-item document-square"
                title={fileName}
              >
                <div className="document-icon">
                  <span className="document-extension">{getFileExtensionForLabel(fileName)}</span>
                </div>
                <div className="document-name">{fileName}</div>
              </a>
            );
          })()
        )
      )}
    </div>
  );
}

function TabbedSection({ source, tabValue, onTabChange, onMediaClick, onContextMenu, onTouchStart, onTouchEnd, isAdmin, onUploadFile, onAddLink }) {
  return (
    <div className="expanded-section">
      <div className="tabs-header-container">
        <div className="tabs-header">
          <button className={`tab-item ${tabValue === "media" ? "active" : ""}`} onClick={() => onTabChange("media")}>
            Media
          </button>
          <button className={`tab-item ${tabValue === "audios" ? "active" : ""}`} onClick={() => onTabChange("audios")}>
            Audios
          </button>
          <button className={`tab-item ${tabValue === "links" ? "active" : ""}`} onClick={() => onTabChange("links")}>
            Links
          </button>
          <button className={`tab-item ${tabValue === "documents" ? "active" : ""}`} onClick={() => onTabChange("documents")}>
            Documents
          </button>
        </div>
        {isAdmin && (
          <div className="admin-actions-resources">
            <button 
              className="admin-action-btn upload-btn"
              onClick={onUploadFile}
            >
              <Plus size={18} weight="bold" /> Upload File
            </button>
            <button 
              className="admin-action-btn add-link-btn"
              onClick={onAddLink}
            >
              <LinkIcon size={18} weight="bold" /> Add Link
            </button>
          </div>
        )}
      </div>
      {tabValue === "media" && <ResourceGrid items={[...(source?.photos || []), ...(source?.videos || [])]} onMediaClick={onMediaClick} onContextMenu={onContextMenu} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} />}
      {tabValue === "audios" && <ResourceGrid items={source?.audio || []} onMediaClick={onMediaClick} onContextMenu={onContextMenu} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} />}
      {tabValue === "links" && <LinkList items={source?.links} onContextMenu={onContextMenu} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} />}
      {tabValue === "documents" && <DocumentList items={source?.documents} onContextMenu={onContextMenu} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} />}
    </div>
  );
}

export default function MainChatExpandedSection({
  activeSection,
  expandedSection,
  groupMembers,
  groupInfo,
  mediaTabResources,
  mediaTab,
  setMediaTab,
  contentResources,
  contentTab,
  setContentTab,
  onMediaClick,
  groupId,
  userRole,
  currentUserEmail,
  onCloseSection,
}) {
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  const [showDeleteResourceModal, setShowDeleteResourceModal] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState(null);
  const [isDeletingResource, setIsDeletingResource] = useState(false);

  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });
  const touchTimer = useRef(null);
  const fileInputRef = useRef(null);

  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const normalizedUserRole = (userRole || "").toString().trim().toLowerCase();
  const isAdmin = normalizedUserRole === "administrator" || normalizedUserRole === "super_admin" || normalizedUserRole === "super-admin";

  const [membershipMap, setMembershipMap] = useState({});

  useEffect(() => {
    const fetchMembershipMap = async () => {
      if (isAdmin && activeSection === "members" && groupId) {
        try {
          const res = await getGroupMemberships();
          // The API might return the array in res.data.data or res.data
          const allGroups = res.data?.data || res.data || [];
          
          if (Array.isArray(allGroups)) {
            const map = {};
            // Find the current group's data in the global list
            const currentGroupData = allGroups.find(g => String(g.group_id || g.id) === String(groupId));
            
            if (currentGroupData?.members && Array.isArray(currentGroupData.members)) {
              currentGroupData.members.forEach(m => {
                if (m.member_id && m.membership_id) {
                  map[String(m.member_id)] = String(m.membership_id);
                }
              });
              setMembershipMap(map);
            }
          }
        } catch (err) {
          console.error("Error fetching memberships mapping:", err);
        }
      }
    };
    fetchMembershipMap();
  }, [isAdmin, activeSection, groupId, groupMembers]);

  const handleDeleteMember = async () => {
    // Lookup the correct membership ID from our mapping
    const mId = membershipMap[String(memberToDelete?.id)];
    if (!mId) {
      smartToast.error("This member cannot be removed (e.g., Administrator or ID not found)");
      return;
    }
    setIsDeletingMember(true);
    try {
      await deleteMembership(mId);
      smartToast.success("Member removed successfully");
      setShowDeleteModal(false);
      // Refresh to update list
      window.location.reload();
    } catch (error) {
      console.error("Failed to remove member:", error);
      smartToast.error(error.response?.data?.message || "Failed to remove member");
    } finally {
      setIsDeletingMember(false);
    }
  };

  const handleContextMenu = (e, item) => {
    if (!isAdmin) return;
    if (e.preventDefault) e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  const handleTouchStart = (e, item) => {
    if (!isAdmin) return;
    const touch = e.touches[0];
    const coords = { x: touch.clientX, y: touch.clientY };
    
    if (touchTimer.current) clearTimeout(touchTimer.current);
    
    touchTimer.current = setTimeout(() => {
      handleContextMenu({ 
        clientX: coords.x, 
        clientY: coords.y 
      }, item);
      touchTimer.current = null;
    }, 600); // 600ms long press
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
  };

  const handleClick = () => {
    if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false });
  };

  useEffect(() => {
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  const handleDeleteResource = async () => {
    if (!resourceToDelete?.id || !groupInfo?.content?.id) {
      smartToast.error("Missing resource or content ID");
      return;
    }
    setIsDeletingResource(true);
    try {
      await deleteResource(groupInfo.content.id, resourceToDelete.id);
      smartToast.success("Resource deleted successfully");
      setShowDeleteResourceModal(false);
      // Give the toast a second to be seen before reloading
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Failed to delete resource:", error);
      smartToast.error(error.response?.data?.message || "Failed to delete resource");
    } finally {
      setIsDeletingResource(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      smartToast.error("Please enter an email address");
      return;
    }
    if (!groupId) {
      smartToast.error("Group ID is missing");
      return;
    }

    setIsAdding(true);
    try {
      // 1. Fetch user by email
      const userRes = await getUserByEmail(newMemberEmail.trim());
      const userData = userRes?.data?.data || userRes?.data;

      if (!userData?.id) {
        smartToast.error("User with this email not found");
        setIsAdding(false);
        return;
      }

      // Optional: Check if user is already a member could be done here or handled by API

      // 2. Add to group
      await joinGroup(groupId, userData.id);
      smartToast.success("Member added successfully!");
      setShowAddMemberModal(false);
      setNewMemberEmail("");
      
      // Auto-refresh the page to show new member (or we could use a refetch prop if available)
      window.location.reload(); 
    } catch (error) {
      console.error("Failed to add member:", error);
      const errorMsg = error.response?.data?.message || "Failed to add member. Please check if the user is already in the group.";
      smartToast.error(errorMsg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!groupInfo?.content?.id) {
      smartToast.error("Group content ID not found");
      return;
    }

    setIsUploading(true);
    try {
      await addResource(groupInfo.content.id, file);
      smartToast.success("File uploaded successfully");
      window.location.reload();
    } catch (error) {
      console.error("Failed to upload file:", error);
      smartToast.error(error.response?.data?.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddLinkResource = async () => {
    if (!newLinkUrl.trim()) {
      smartToast.error("Please enter a URL");
      return;
    }

    if (!groupInfo?.content?.id) {
      smartToast.error("Group content ID not found");
      return;
    }

    setIsSubmittingLink(true);
    try {
      await addLinkResource(groupInfo.content.id, newLinkUrl.trim());
      smartToast.success("Link added successfully");
      setShowAddLinkModal(false);
      setNewLinkUrl("");
      window.location.reload();
    } catch (error) {
      console.error("Failed to add link:", error);
      smartToast.error(error.response?.data?.message || "Failed to add link");
    } finally {
      setIsSubmittingLink(false);
    }
  };
  const members = Array.isArray(groupMembers) ? groupMembers : [];
  const { photos, links, documents } = groupInfo?.content?.resources
    ? categorizeResources(groupInfo.content.resources)
    : { photos: [], links: [], documents: [], audio: [] };

  if (activeSection) {
    if (activeSection === "members") {
      const sortedMembers = [...members].sort((a, b) => {
        if (a.role === "Administrator" && b.role !== "Administrator") return -1;
        if (a.role !== "Administrator" && b.role === "Administrator") return 1;
        return 0;
      });
      return (
        <div className="expanded-section1">
          <div className="members-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0 }}>Members ({members.length})</h4>
            {isAdmin && (
              <button 
                className="add-member-btn-plus"
                onClick={() => setShowAddMemberModal(true)}
                style={{
                  background: '#0076EA',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                title="Add Member"
              >
                <Plus size={20} weight="bold" />
              </button>
            )}
          </div>
          <div className="members-list">
            {sortedMembers.map((member) => (
              <div key={member.id} className="member-item">
                {member.user_photo ? (
                  <img src={member.user_photo || undefined} alt={member.name} className="member-avatar" />
                ) : (
                  <div className="member-avatar-fallback">{getInitials(member.name || member.email || "U")}</div>
                )}
                <div>
                  <h5>{member.name}</h5>
                  <p>{member.email}</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`member-role ${member.role === "Administrator" ? "admin-role" : ""}`}>{member.role}</span>
                  {isAdmin && member.email !== currentUserEmail && member.role !== "Administrator" && (
                    <button 
                      className="delete-member-btn"
                      onClick={() => {
                        setMemberToDelete(member);
                        setShowDeleteModal(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ff4d4f',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fff1f0'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      title="Remove Member"
                    >
                      <Trash size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <ConfirmDeleteModal
            show={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteMember}
            title="Remove Member"
            message={`Are you sure you want to remove ${memberToDelete?.name || 'this member'} from the group?`}
            confirming={isDeletingMember}
          />

          {/* Add Member Modal */}
          {showAddMemberModal && (
            <div 
              className="add-member-modal-overlay"
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '20px'
              }}
              onClick={() => setShowAddMemberModal(false)}
            >
              <div 
                className="add-member-modal"
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  width: '100%',
                  maxWidth: '400px',
                  padding: '24px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Add New Member</h3>
                  <button 
                    onClick={() => setShowAddMemberModal(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>Member Email</label>
                  <input 
                    type="email"
                    placeholder="Enter email address"
                    className="form-control"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      outline: 'none'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddMember();
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => setShowAddMemberModal(false)}
                    className="btn btn-light"
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#f5f5f5', border: 'none' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddMember}
                    disabled={isAdding}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#0076EA', color: 'white', border: 'none' }}
                  >
                    {isAdding ? "Adding..." : "Add Member"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    let expandedContentBody = null;

    if (activeSection === "media") {
      expandedContentBody = (
        <>
          <div className="media-header">
            <h4>Media, Links and Docs</h4>
          </div>
          <TabbedSection 
            source={mediaTabResources} 
            tabValue={mediaTab} 
            onTabChange={setMediaTab} 
            onMediaClick={onMediaClick} 
            onContextMenu={null}
            onTouchStart={null}
            onTouchEnd={null}
            isAdmin={isAdmin}
            onUploadFile={handleUploadClick}
            onAddLink={() => setShowAddLinkModal(true)}
          />
        </>
      );
    } else if (expandedSection === "contents") {
      expandedContentBody = (
        <>
          <div className="media-header">
            <h4>Group Resources</h4>
            <button className="close-btn" onClick={onCloseSection}>
              <X size={24} />
            </button>
          </div>
          <TabbedSection 
            source={contentResources} 
            tabValue={contentTab} 
            onTabChange={setContentTab} 
            onMediaClick={onMediaClick} 
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            isAdmin={isAdmin}
            onUploadFile={handleUploadClick}
            onAddLink={() => setShowAddLinkModal(true)}
          />
        </>
      );
    } else {
      expandedContentBody = (
        <TabbedSection 
          source={contentResources} 
          tabValue={contentTab} 
          onTabChange={setContentTab} 
          onMediaClick={onMediaClick} 
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          isAdmin={isAdmin}
          onUploadFile={handleUploadClick}
          onAddLink={() => setShowAddLinkModal(true)}
        />
      );
    }

    return (
      <div className="expanded-section1" onClick={handleClick}>
        {expandedContentBody}
        {contextMenu.visible && (
          <div 
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: '8px',
              padding: '4px 0',
              zIndex: 1000000,
              minWidth: '120px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => {
                setResourceToDelete(contextMenu.item);
                setShowDeleteResourceModal(true);
                setContextMenu({ ...contextMenu, visible: false });
              }}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                color: '#ff4d4f',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Trash size={16} />
              Delete
            </button>
          </div>
        )}
        <ConfirmDeleteModal
          show={showDeleteResourceModal}
          onClose={() => setShowDeleteResourceModal(false)}
          onConfirm={handleDeleteResource}
          title="Delete Resource"
          message="Are you sure you want to permanently delete this resource?"
          confirming={isDeletingResource}
        />

        {/* Hidden File Input */}
        <input 
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Add Link Modal */}
        {showAddLinkModal && (
          <div 
            className="add-member-modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '20px'
            }}
            onClick={() => setShowAddLinkModal(false)}
          >
            <div 
              className="add-member-modal"
              style={{
                background: 'white',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '400px',
                padding: '24px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
              }}
              onClick={(e) => { e.stopPropagation(); }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Add External Link</h3>
                <button 
                  onClick={() => setShowAddLinkModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>Link URL</label>
                <input 
                  type="url"
                  placeholder="https://example.com"
                  className="form-control"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    outline: 'none'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddLinkResource();
                  }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowAddLinkModal(false)}
                  className="btn btn-light"
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#f5f5f5', border: 'none' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddLinkResource}
                  disabled={isSubmittingLink}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#00DC85', color: 'white', border: 'none' }}
                >
                  {isSubmittingLink ? "Adding..." : "Add Link"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Loading Overlay for upload */}
        {isUploading && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001
          }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Uploading...</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!expandedSection) return null;
  let items = [];
  let title = "";
  switch (expandedSection) {
    case "photos":
      items = photos;
      title = "Photos";
      break;
    case "links":
      items = links;
      title = "Links";
      break;
    case "documents":
      items = documents;
      title = "Documents";
      break;
    default:
      return null;
  }
  return (
    <div className="expanded-section">
      <h4>{title}</h4>
      <div className={`expanded-items ${expandedSection === "links" ? "expanded-links" : ""}`}>
        {items.length === 0 ? (
          <p>No {title.toLowerCase()} available.</p>
        ) : (
          items.map((item, index) => (
            <div key={index} className="expanded-item">
              {expandedSection === "photos" && (
                <img
                  src={item.file_url || undefined}
                  alt={item.file_name || "Photo"}
                  className="expanded-photo"
                  onClick={() => onMediaClick(item)}
                />
              )}
              {expandedSection === "links" && (
                <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="link-item">
                  {item.file_url}
                </a>
              )}
              {expandedSection === "documents" && (
                <a href={item.file_url} download={getDownloadFileName(item)} target="_blank" rel="noopener noreferrer">
                  {item.file_name || getDownloadFileName(item)}
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
