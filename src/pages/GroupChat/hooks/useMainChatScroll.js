import { useRef, useState, useEffect, useLayoutEffect } from "react";

const SCROLL_THRESHOLD = 100;

/**
 * Scroll state and refs for the messages container. Attach messagesContainerRef and messagesEndRef to the scrollable div and the sentinel.
 */
export function useMainChatScroll(messages, groupId, showMainChat, isMobile) {
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const isUserAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const lastOpenedGroupIdRef = useRef(null);
  const pendingInitialScrollRef = useRef(false);

  const checkIfAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    return container.scrollHeight - container.scrollTop - container.clientHeight < SCROLL_THRESHOLD;
  };

  const scrollToBottom = (force = false, instant = false) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (!force && !isUserAtBottom) return;
    if (instant) {
      requestAnimationFrame(() => {
        if (container) container.scrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => setIsUserAtBottom(checkIfAtBottom());
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    isUserAtBottomRef.current = isUserAtBottom;
  }, [isUserAtBottom]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleLoad = () => {
      if (!isUserAtBottomRef.current) return;
      requestAnimationFrame(() => {
        const c = messagesContainerRef.current;
        if (c) c.scrollTop = Math.max(0, c.scrollHeight - c.clientHeight);
      });
    };
    container.addEventListener("load", handleLoad, true);
    return () => container.removeEventListener("load", handleLoad, true);
  }, []);

  useEffect(() => {
    const currentLen = messages.length;
    const prevLen = prevMessagesLengthRef.current;
    if (currentLen > prevLen && isUserAtBottom) scrollToBottom(true);
    prevMessagesLengthRef.current = currentLen;
  }, [messages, isUserAtBottom]);

  useEffect(() => {
    if (!(showMainChat || !isMobile) || !groupId) return;
    const isNewGroup = String(lastOpenedGroupIdRef.current) !== String(groupId);
    if (isNewGroup) lastOpenedGroupIdRef.current = groupId;
    if (!isNewGroup && isMobile && !showMainChat) return;
    const run = () => {
      const container = messagesContainerRef.current;
      if (!container) return;
      container.scrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      setIsUserAtBottom(true);
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
    const t1 = setTimeout(run, 50);
    const t2 = setTimeout(run, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [showMainChat, isMobile, groupId]);

  useEffect(() => {
    if ((showMainChat || !isMobile) && groupId) pendingInitialScrollRef.current = true;
  }, [groupId, showMainChat, isMobile]);

  useLayoutEffect(() => {
    if (!pendingInitialScrollRef.current) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    const run = () => {
      const c = messagesContainerRef.current;
      if (!c) return;
      c.scrollTop = Math.max(0, c.scrollHeight - c.clientHeight);
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      setIsUserAtBottom(true);
    };
    requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });
    const t1 = setTimeout(run, 100);
    const t2 = setTimeout(run, 400);
    const t3 = setTimeout(run, 1000);
    const t4 = setTimeout(() => {
      pendingInitialScrollRef.current = false;
    }, 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [messages, groupId]);

  return {
    messagesContainerRef,
    messagesEndRef,
    isUserAtBottom,
    scrollToBottom,
    pendingInitialScrollRef,
  };
}
