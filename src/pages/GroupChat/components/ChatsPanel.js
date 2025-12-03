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

    // local cache of per-group unread counts fetched from API
    const [unreadMap, setUnreadMap] = React.useState({});
    const fetchingRef = React.useRef(false);

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

                // if we already have a cached positive count, skip (unless it's the selected chat)
                if (unreadMap[str] && Number(unreadMap[str]) > 0) return false;
                // if parent already has a positive unread; prefer parent value
                if (parent && Number(parent.unread) > 0) return false;
                return true;
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
        fetchingRef.current = true;

        (async () => {
            try {
                const results = await Promise.allSettled(idsToFetch.map(async (id) => {
                    try {
                        const res = await axiosInstance.get(`/chat/groups/${id}/unread-count`);
                        // If server returns 304 Not Modified there may be no body; try once to bypass caches
                        if (res && res.status === 304) {
                            console.debug('ChatsPanel: unread-count 304 for', id, '- retrying with cacheBuster');
                            try {
                                const res2 = await axiosInstance.get(`/chat/groups/${id}/unread-count`, { params: { _cacheBust: Date.now() }, headers: { 'Cache-Control': 'no-cache' } });
                                if (res2 && res2.status === 200) {
                                    console.debug('ChatsPanel: unread-count cache-bust success for', id, res2.data);
                                    // Use res2 as the response
                                    Object.defineProperty(res, 'data', { value: res2.data, configurable: true });
                                    Object.defineProperty(res, 'status', { value: res2.status, configurable: true });
                                }
                            } catch (e2) {
                                console.warn('ChatsPanel: cache-bust retry failed', id, e2?.response?.status || e2.message || e2);
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
                        return { id, count: 0 };
                    }
                }));

                setUnreadMap(prev => {
                    const next = { ...prev };
                    results.forEach(r => {
                        if (r.status === 'fulfilled' && r.value) {
                            console.log('ChatsPanel: updating unreadMap', r.value.id, 'from', prev[String(r.value.id)], 'to', r.value.count);
                            next[String(r.value.id)] = r.value.count;
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

    // Build view model merging server-provided unread and locally fetched unreadMap
    // Prefer server-provided parent value unless the per-group unreadMap returns a positive count
    const mergedChats = groupChats.map((c, index) => {
        const parentVal = Number(c.unread ?? c.unread_count ?? c.unreadCount ?? 0);
        const fetched = Number(unreadMap[String(c.id)] ?? 0);
        // If this chat is currently selected, set unread to 0 (user is viewing it)
        const isCurrentlySelected = selectedChat === index;
        // Only set to 0 if currently selected, otherwise show actual unread count from server
        // This allows new messages to show unread count even if chat was viewed recently
        const unread = isCurrentlySelected ? 0 : (fetched > 0 ? fetched : parentVal);

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

    const filteredChats = mergedChats.filter(chat => {
        if (!chat) return false;
        const chatName = (chat.name || '').toLowerCase();
        const chatSubject = (chat.subject || '').toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = chatName.includes(searchLower) || chatSubject.includes(searchLower);
        const matchesTab = activeTab === 'all' || (activeTab === 'unread' && chat.unread > 0);
        return matchesSearch && matchesTab;
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
                    {filteredChats.length === 0 ? (
                        <div className="no-chats-container">
                            <img src="/assets/GroupChat.png" alt="No chats" className="no-chats-image" />
                        </div>
                    ) : (
                        filteredChats.map((chat, index) => {
                            const originalIndex = groupChats.findIndex(g => String(g.id) === String(chat.id));
                            return (
                                <ChatItem
                                    key={originalIndex}
                                    chat={chat}
                                    isActive={selectedChat === originalIndex}
                                    onClick={() => {
                                        onChatSelect(originalIndex, { fromPanel: true, unreadCount: Number(chat.unread || 0) });
                                        setUnreadMap(prev => ({ ...prev, [String(chat.id)]: 0 }));
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