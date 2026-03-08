import { useMemo } from "react";
import {
  extractMessageLinksFromMessages,
  combineBackendAndMessageLinks,
} from "../utils/mainChatMessageUtils";

/**
 * messageLinks, allLinks, and mediaTabResources derived from messages and groupMediaItems.
 */
export function useMainChatMediaLinks(messages, groupMediaItems) {
  const messageLinks = useMemo(
    () => extractMessageLinksFromMessages(messages),
    [messages]
  );

  const allLinks = useMemo(
    () =>
      combineBackendAndMessageLinks(
        groupMediaItems?.links || [],
        messageLinks
      ),
    [groupMediaItems?.links, messageLinks]
  );

  const mediaTabResources = useMemo(
    () => ({
      photos: [...(groupMediaItems?.images || [])],
      videos: [...(groupMediaItems?.videos || [])],
      audio: [...(groupMediaItems?.audio || [])],
      links: allLinks,
      documents: [...(groupMediaItems?.files || [])],
    }),
    [groupMediaItems, allLinks]
  );

  return { messageLinks, allLinks, mediaTabResources };
}
