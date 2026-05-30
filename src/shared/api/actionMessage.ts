export const CONTEXTPACK_ACTION_CLICKED_MESSAGE_TYPE =
  'contextpackai:action-clicked' as const;

export interface ContextPackActionClickedMessage {
  requestedAt: number;
  tabId?: number;
  type: typeof CONTEXTPACK_ACTION_CLICKED_MESSAGE_TYPE;
  windowId?: number;
}
