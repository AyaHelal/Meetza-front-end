import React from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import axiosInstance from '../../../API/axiosInstance';
import ChatItem from './ChatItem';
import './ChatsPanel.css';

const ChatsPanel = ({
    groupChats,
    selectedChat,
    onChatSelect,
    isMobile,
    showMainChat,
    activeNav,
    setActiveNav
}) => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeTab, setActiveTab] = React.useState('all');
    const [unreadGroups, setUnreadGroups] = React.useState([]);
    const [loadingUnread, setLoadingUnread] = React.useState(false);

    // local cache of per-group unread counts fetched from API
    const [unreadMap, setUnreadMap] = React.useState({});
    const fetchingRef = React.useRef(false);
    const endpointExistsRef = React.useRef(true); // Track if unread-count endpoint exists

    // Cache for last message previews (for media messages)
    const [messagePreviews, setMessagePreviews] = React.useState({});
    const fetchingPreviewsRef = React.useRef(false);
    const fetchedPreviewsRef = React.useRef(new Set()); // Track which groups have been fetched

    // Fetch unread counts for group IDs that don't already have a non-zero value in the parent
    React.useEffect(() => {
        if (!groupChats || groupChats.length === 0) return;
        // build list of ids to fetch: always fetch for currently selected chat to ensure fresh data
        // For other chats, prefer gaps where parent's unread is missing or zero
        const idsToFetch = groupChats
            .map(g => g?.id)
            .filter(Boolean)
            .filter(id => {
                const str = String(id);
                const parent = groupChats.find(g => String(g.id) === str);
                const isCurrentlySelected = selectedChat !== null &&
                    groupChats[selectedChat] &&
                    String(groupChats[selectedChat].id) === str;

                // Always fetch for currently selected chat to ensure fresh data
                if (isCurrentlySelected) return true;

                // Always fetch unread counts to detect new messages, even if we have cached values
                // This ensures we get fresh data when new messages arrive
                // Only skip if parent has a positive unread AND we have a matching cached value
                // (to avoid unnecessary requests when we already have fresh data)
                if (parent && Number(parent.unread) > 0 && unreadMap[str] && Number(unreadMap[str]) === Number(parent.unread)) {
                    return false; // We already have matching fresh data
                }
                return true; // Fetch to get fresh data
            });

        if (idsToFetch.length === 0) return;

        // Make sure we have an auth token — unread-count is typically a protected endpoint
        let token = localStorage.getItem('token');
        if (!token) token = sessionStorage.getItem('token');
        if (!token) {
            console.warn('ChatsPanel: no auth token found - skipping unread-count fetch');
            fetchingRef.current = false;
            return;
        }
        console.debug('ChatsPanel: will fetch unread-count for ids', idsToFetch);
        if (fetchingRef.current) return; // avoid parallel fetches

        // Skip if endpoint doesn't exist (we got 404s before)
        if (!endpointExistsRef.current) {
            console.debug('ChatsPanel: Skipping unread-count fetch - endpoint returns 404');
            return;
        }

        fetchingRef.current = true;

        (async () => {
            try {
                const results = await Promise.allSettled(idsToFetch.map(async (id) => {
                    try {
                        // Always use cache-busting to ensure we get fresh data, especially for new messages
                        const cacheBuster = Date.now();
                        const res = await axiosInstance.get(`/chat/groups/${id}/unread-count`, { 
                            params: { _cacheBust: cacheBuster }, 
                            headers: { 
                                'Cache-Control': 'no-cache, no-store, must-revalidate',
                                'Pragma': 'no-cache',
                                'Expires': '0'
                            } 
                        });
                        // If server returns 304 Not Modified, try again with a new cache buster
                        if (res && res.status === 304) {
                            console.debug('ChatsPanel: unread-count 304 for', id, '- retrying with new cacheBuster');
                            try {
                                const res2 = await axiosInstance.get(`/chat/groups/${id}/unread-count`, { 
                                    params: { _cacheBust: Date.now() }, 
                                    headers: { 
                                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                                        'Pragma': 'no-cache',
                                        'Expires': '0'
                                    } 
                                });
                                if (res2 && res2.status === 200) {
                                    console.debug('ChatsPanel: unread-count cache-bust success for', id, res2.data);
                                    // Use res2 as the response
                                    Object.defineProperty(res, 'data', { value: res2.data, configurable: true });
                                    Object.defineProperty(res, 'status', { value: res2.status, configurable: true });
                                }
                            } catch (e2) {
                                // Silently handle cache-bust retry failures
                                if (e2?.response?.status !== 404) {
                                    console.warn('ChatsPanel: cache-bust retry failed', id, e2?.response?.status || e2.message || e2);
                                }
                            }
                        }
                        const payload = res?.data;
                        let c = 0;
                        // payload may be empty if server replied 304; handle gracefully
                        if (payload) {
                            // Support multiple response shapes used by different backends
                            if (typeof payload.data === 'number') c = payload.data;
                            else if (payload.data && typeof payload.data.count === 'number') c = payload.data.count;
                            else if (payload.data && typeof payload.data.unread === 'number') c = payload.data.unread;
                            else if (payload.data && typeof payload.data.unread_count === 'number') c = payload.data.unread_count;
                            else if (payload.data && typeof payload.data.unreadCount === 'number') c = payload.data.unreadCount;
                            else if (typeof payload.count === 'number') c = payload.count;
                            else c = Number(payload.data) || 0;
                        }
                        console.log(`ChatsPanel: Unread count for group ${id}:`, { payload, parsedCount: c });
                        return { id, count: c };
                    } catch (e) {
                        // Silently handle 404 errors (endpoint might not exist)
                        if (e?.response?.status === 404) {
                            // Mark endpoint as not existing if we get 404
                            endpointExistsRef.current = false;
                        } else if (e?.response?.status !== 404) {
                            console.warn(`ChatsPanel: Error fetching unread-count for group ${id}:`, e?.response?.status || e?.message);
                        }
                        return { id, count: 0 };
                    }
                }));

                setUnreadMap(prev => {
                    const next = { ...prev };
                    results.forEach(r => {
                        if (r.status === 'fulfilled' && r.value) {
                            const groupIdStr = String(r.value.id);
                            const newCount = r.value.count;
                            // Always update unreadMap with the latest value from API
                            // The merging logic will handle whether to show it or not
                            // This allows new messages to show badges even if chat was previously read
                            console.log('ChatsPanel: updating unreadMap', r.value.id, 'from', prev[groupIdStr], 'to', newCount);
                            next[groupIdStr] = newCount;
                        }
                    });
                    return next;
                });
            } catch (e) {
                console.warn('Error fetching unread-counts in ChatsPanel', e);
            } finally {
                fetchingRef.current = false;
            }
        })();
    }, [groupChats, unreadMap, selectedChat]);

    // Clear unreadMap for currently selected chat to ensure badge disappears immediately
    React.useEffect(() => {
        if (selectedChat !== null && groupChats[selectedChat]) {
            const selectedChatId = String(groupChats[selectedChat].id);
            setUnreadMap(prev => {
                if (prev[selectedChatId] > 0) {
                    console.log(`ChatsPanel: Clearing unreadMap for selected chat ${selectedChatId}`);
                    return { ...prev, [selectedChatId]: 0 };
                }
                return prev;
            });
        }
    }, [selectedChat, groupChats]);

    // Fetch unread groups from API when unread tab is active
    React.useEffect(() => {
        if (activeTab === 'unread') {
            const fetchUnreadGroups = async () => {
                setLoadingUnread(true);
                try {
                    const response = await axiosInstance.get('/chat/groups/unread');
                    console.log('Unread groups API response:', response.data);

                    // Handle different response formats
                    let groupsData = [];
                    if (response.data) {
                        if (response.data.success && response.data.data) {
                            groupsData = Array.isArray(response.data.data) ? response.data.data : [];
                        } else if (Array.isArray(response.data)) {
                            groupsData = response.data;
                        } else if (response.data.groups && Array.isArray(response.data.groups)) {
                            groupsData = response.data.groups;
                        } else if (response.data.data && Array.isArray(response.data.data)) {
                            groupsData = response.data.data;
                        }
                    }

                    console.log('Parsed unread groups:', groupsData);
                    setUnreadGroups(groupsData);
                } catch (error) {
                    console.error('Error fetching unread groups:', error);
                    setUnreadGroups([]);
                } finally {
                    setLoadingUnread(false);
                }
            };

            fetchUnreadGroups();
        } else {
            // Clear unread groups when switching to 'all' tab
            setUnreadGroups([]);
        }
    }, [activeTab]);

    // Fetch last message for groups that don't have last_message or subject
    React.useEffect(() => {
        if (!groupChats || groupChats.length === 0) return;
        if (fetchingPreviewsRef.current) return;

        // Find groups that need preview fetching (have last_message_at but no last_message/subject)
        const groupsToFetch = groupChats.filter(chat => {
            const chatIdStr = String(chat.id);
            const hasDate = chat.last_message_at || chat.date || chat.last_message_time;
            const hasMessage = chat.last_message && chat.last_message.trim();
            const hasSubject = chat.subject && chat.subject.trim() &&
                chat.subject !== 'No messages yet' &&
                chat.subject !== 'Media attachment';
            const alreadyFetched = fetchedPreviewsRef.current.has(chatIdStr);

            return hasDate && !hasMessage && !hasSubject && !alreadyFetched;
        });

        if (groupsToFetch.length === 0) return;

        fetchingPreviewsRef.current = true;
        console.log('📥 Fetching last messages for groups:', groupsToFetch.map(g => g.id));

        (async () => {
            try {
                const results = await Promise.allSettled(
                    groupsToFetch.map(async (chat) => {
                        try {
                            const res = await axiosInstance.get(`/chat/groups/${chat.id}/messages?limit=1`);
                            if (res?.data?.success && res.data.data && res.data.data.length > 0) {
                                const lastMsg = res.data.data[0];

                                // Check if message has text
                                if (lastMsg.message && lastMsg.message.trim()) {
                                    return { id: chat.id, preview: lastMsg.message };
                                }

                                // Check if message has media
                                if (lastMsg.media && Array.isArray(lastMsg.media) && lastMsg.media.length > 0) {
                                    const media = lastMsg.media[0];
                                    const mediaType = media?.media_type || media?.file_type || '';
                                    const mediaUrl = media?.media_url || media?.file_url || '';

                                    let preview = '📎 Attachment';

                                    if (mediaType) {
                                        const type = String(mediaType).toLowerCase();
                                        if (type.includes('image') || type === 'photo') {
                                            preview = '📷 Photo';
                                        } else if (type.includes('video')) {
                                            preview = '🎥 Video';
                                        } else if (type.includes('audio') || type === 'voice' || type === 'voice_note') {
                                            preview = '🎤 Audio';
                                        } else if (type.includes('file') || type === 'document') {
                                            preview = '📄 Document';
                                        }
                                    } else if (mediaUrl) {
                                        // Try to determine from URL extension
                                        const urlMatch = mediaUrl.match(/\.([a-z0-9]+)(\?|$)/i);
                                        const extension = urlMatch ? urlMatch[1].toLowerCase() : '';

                                        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'avif'].includes(extension)) {
                                            preview = '📷 Photo';
                                        } else if (['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(extension)) {
                                            preview = '🎥 Video';
                                        } else if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm'].includes(extension)) {
                                            preview = '🎤 Audio';
                                        } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(extension)) {
                                            preview = '📄 Document';
                                        }
                                    }

                                    return { id: chat.id, preview };
                                }
                            }
                            return { id: chat.id, preview: null };
                        } catch (err) {
                            console.warn(`⚠️ Failed to fetch last message for group ${chat.id}:`, err);
                            return { id: chat.id, preview: null };
                        }
                    })
                );

                const newPreviews = {};
                results.forEach(result => {
                    if (result.status === 'fulfilled' && result.value) {
                        const chatIdStr = String(result.value.id);
                        fetchedPreviewsRef.current.add(chatIdStr);
                        if (result.value.preview) {
                            newPreviews[chatIdStr] = result.value.preview;
                        }
                    }
                });

                if (Object.keys(newPreviews).length > 0) {
                    setMessagePreviews(prev => ({ ...prev, ...newPreviews }));
                }
            } catch (e) {
                console.warn('Error fetching message previews:', e);
            } finally {
                fetchingPreviewsRef.current = false;
            }
        })();
    }, [groupChats]); // Removed messagePreviews from dependencies to avoid infinite loop

    // Prefer server-provided parent value unless the per-group unreadMap returns a positive count
    const mergedChats = groupChats.map((c, index) => {
        const parentVal = Number(c.unread ?? c.unread_count ?? c.unreadCount ?? 0);
        const fetched = Number(unreadMap[String(c.id)] ?? 0);
        const isCurrentlySelected = selectedChat === index;
        
        // Priority logic for unread count:
        // 1. If currently selected, always show 0
        // 2. If fetched > 0 (from unreadMap API), use it (most up-to-date from API)
        //    This allows new messages to show badges even if parentVal is 0
        // 3. If parentVal > 0, use it (from GroupChat refresh)
        // 4. If parentVal === 0 and fetched === 0, show 0 (chat was read, no new messages)
        // 5. Otherwise, default to 0
        let unread;
        if (isCurrentlySelected) {
            unread = 0;
        } else if (fetched > 0) {
            // Fetched has a positive value from API - use it (new messages arrived)
            // This takes priority over parentVal to ensure badges show for new messages
            unread = fetched;
        } else if (parentVal > 0) {
            // Parent has a positive value, use it (it's more up-to-date from GroupChat)
            unread = parentVal;
        } else if (parentVal === 0 && fetched === 0) {
            // Both are 0 - chat was read and no new messages
            unread = 0;
        } else {
            // Default to 0
            unread = 0;
        }

        // Debug log for unread count merging
        if (parentVal !== fetched || parentVal > 0 || fetched > 0) {
            console.log(`ChatsPanel mergedChats for group ${c.id}:`, {
                parentVal,
                fetched,
                isCurrentlySelected,
                finalUnread: unread,
                originalChat: c
            });
        }

        return { ...c, unread };
    });

    // Use unread groups from API when unread tab is active, otherwise use mergedChats
    const chatsToDisplay = activeTab === 'unread' ? unreadGroups : mergedChats;

    const filteredChats = chatsToDisplay.filter(chat => {
        if (!chat) return false;
        const chatName = (chat.name || chat.group_name || '').toLowerCase();
        const chatSubject = (chat.subject || '').toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = chatName.includes(searchLower) || chatSubject.includes(searchLower);
        return matchesSearch;
    });


    return (
        <>
            <div className={`chats-panel rounded-4 shadow-sm ${isMobile && showMainChat ? 'mobile-hidden' : ''}`}>
                <div className="chats-header">
                    <h2 className="fw-semibold">Group Chats</h2>
                </div>
                <div className="chats-search">
                    <MagnifyingGlass size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="chats-tabs">
                    <button
                        className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All
                    </button>
                    <button
                        className={`tab ${activeTab === 'unread' ? 'active' : ''}`}
                        onClick={() => setActiveTab('unread')}
                    >
                        Unread
                    </button>
                </div>
                <div className="chats-list">
                    {loadingUnread && activeTab === 'unread' ? (
                        <div className="no-chats-container">
                            <p>Loading unread groups...</p>
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="no-chats-container">
                            <img src="/assets/GroupChat.png" alt="No chats" className="no-chats-image" />
                        </div>
                    ) : (
                        filteredChats.map((chat, index) => {
                            // Find the original index in groupChats array
                            const chatId = chat.id || chat.group_id;
                            const originalIndex = groupChats.findIndex(g => String(g.id) === String(chatId));

                            // Format date properly
                            let formattedDate = '';
                            const dateField = chat.date || chat.last_message_at || chat.last_message_time || chat.updated_at;
                            if (dateField) {
                                try {
                                    const dateObj = new Date(dateField);
                                    if (!isNaN(dateObj.getTime())) {
                                        formattedDate = dateObj.toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'short'
                                        });
                                    }
                                } catch (e) {
                                    console.warn('Error formatting date:', e);
                                }
                            }

                            // Get preview from cache if available
                            const cachedPreview = messagePreviews[String(chatId)];

                            // Format chat data to match ChatItem expected structure
                            const formattedChat = {
                                ...chat,
                                name: chat.name || chat.group_name,
                                subject: cachedPreview || chat.subject || chat.last_message || 'No messages yet',
                                avatar: chat.avatar || (chat.name || chat.group_name)?.charAt(0)?.toUpperCase() || 'G',
                                avatarImage: chat.avatarImage || chat.group_photo || chat.photo,
                                date: formattedDate || chat.date || '',
                                unread: chat.unread ?? chat.unread_count ?? chat.unreadCount ?? 0
                            };

                            return (
                                <ChatItem
                                    key={chatId || index}
                                    chat={formattedChat}
                                    isActive={selectedChat === originalIndex && originalIndex !== -1}
                                    onClick={() => {
                                        if (originalIndex !== -1) {
                                            onChatSelect(originalIndex, { fromPanel: true, unreadCount: Number(formattedChat.unread || 0) });
                                            setUnreadMap(prev => ({ ...prev, [String(chatId)]: 0 }));
                                        } else {
                                            // If chat not found in groupChats, we might need to refresh the list
                                            console.warn('Chat not found in groupChats, ID:', chatId);
                                        }
                                    }}
                                />
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
};

export default ChatsPanel;