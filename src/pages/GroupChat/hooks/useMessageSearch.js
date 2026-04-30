import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { smartToast } from "../../../API/toastManager";
import { searchMessageIds } from "../services/groupChatService";

export const useMessageSearch = (api, groupId, messages, hasMoreMessages, onLoadMoreMessages) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResultIds, setSearchResultIds] = useState([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [activeSearchMessageId, setActiveSearchMessageId] = useState(null);
  
  const messageElsRef = useRef(new Map());
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const searchResultIdSet = useMemo(() => {
    return new Set((searchResultIds || []).map((x) => String(x)));
  }, [searchResultIds]);

  const registerMessageEl = useCallback((id, el) => {
    if (id == null || !el) return;
    messageElsRef.current.set(String(id), el);
  }, []);

  const scrollToMessageId = useCallback((id) => {
    if (id == null) return false;
    const el = messageElsRef.current.get(String(id));
    if (!el) return false;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      return true;
    } catch {
      try {
        el.scrollIntoView();
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  const ensureMessageLoaded = useCallback(
    async (targetId) => {
      if (targetId == null) return false;
      const idStr = String(targetId);
      const already = (messagesRef.current || []).some((m) => String(m?.id) === idStr);
      if (already) return true;
      if (!onLoadMoreMessages) return false;

      for (let i = 0; i < 8; i += 1) {
        if (!hasMoreMessages) return false;
        await onLoadMoreMessages();
        await new Promise((r) => setTimeout(r, 0));
        const found = (messagesRef.current || []).some((m) => String(m?.id) === idStr);
        if (found) return true;
      }
      return false;
    },
    [onLoadMoreMessages, hasMoreMessages]
  );

  const applyActiveSearchIndex = useCallback(
    async (idx) => {
      const ids = Array.isArray(searchResultIds) ? searchResultIds : [];
      if (!ids.length) return;
      const nextIndex = Math.max(0, Math.min(ids.length - 1, idx));
      const msgId = ids[nextIndex];
      
      setActiveSearchIndex(nextIndex);
      setActiveSearchMessageId(msgId);
      
      await ensureMessageLoaded(msgId);
      await new Promise((r) => requestAnimationFrame(() => r()));
      scrollToMessageId(msgId);
    },
    [searchResultIds, ensureMessageLoaded, scrollToMessageId]
  );

  const submitSearch = useCallback(async () => {
    if (!groupId) return;
    const word = String(searchValue || "").trim();
    if (!word) {
      setSearchOpen(false);
      return;
    }

    setSearchLoading(true);
    try {
      const ids = await searchMessageIds(api, groupId, word);
      const normalizedIds = Array.from(new Set((ids || []).map((x) => String(x))));

      if (normalizedIds.length === 0) {
        setSearchResultIds([]);
        setActiveSearchIndex(0);
        setActiveSearchMessageId(null);
        smartToast.info("No matches");
        return;
      }

      setSearchResultIds(normalizedIds);
      await applyActiveSearchIndex(normalizedIds.length - 1);
    } catch (e) {
      smartToast.error(e?.response?.data?.message || "Search failed");
    } finally {
      setSearchLoading(false);
    }
  }, [groupId, searchValue, api, applyActiveSearchIndex]);

  const goToNextSearchResult = useCallback(() => {
    if (!searchResultIds.length) return;
    const next = (activeSearchIndex + 1) % searchResultIds.length;
    applyActiveSearchIndex(next);
  }, [searchResultIds.length, activeSearchIndex, applyActiveSearchIndex]);

  const goToPrevSearchResult = useCallback(() => {
    if (!searchResultIds.length) return;
    const prev = (activeSearchIndex - 1 + searchResultIds.length) % searchResultIds.length;
    applyActiveSearchIndex(prev);
  }, [searchResultIds.length, activeSearchIndex, applyActiveSearchIndex]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchValue("");
    setSearchResultIds([]);
    setActiveSearchIndex(0);
    setActiveSearchMessageId(null);
  }, []);

  return {
    searchOpen,
    setSearchOpen,
    searchValue,
    setSearchValue,
    searchLoading,
    searchResultIds,
    searchResultIdSet,
    activeSearchIndex,
    activeSearchMessageId,
    submitSearch,
    goToNextSearchResult,
    goToPrevSearchResult,
    closeSearch,
    registerMessageEl
  };
};
