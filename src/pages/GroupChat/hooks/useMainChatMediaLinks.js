import { useMemo } from "react";
import {
  extractMessageLinksFromMessages,
  buildChatOnlyMediaTabResources,
} from "../utils/mainChatMessageUtils";

/**
 * messageLinks, allLinks, and mediaTabResources from chat messages only
 * (excludes group content / group_media uploads — those appear under Group Resources).
 */
export function useMainChatMediaLinks(messages) {
  const mediaTabResources = useMemo(
    () => buildChatOnlyMediaTabResources(messages),
    [messages]
  );

  const messageLinks = useMemo(
    () => extractMessageLinksFromMessages(messages),
    [messages]
  );

  const allLinks = useMemo(() => mediaTabResources.links, [mediaTabResources]);

  return { messageLinks, allLinks, mediaTabResources };
}
