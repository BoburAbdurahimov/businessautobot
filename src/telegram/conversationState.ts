/**
 * Simple in-memory conversation state manager
 */

export type ConversationState = {
    action: 'ADD_CLIENT' | 'SEARCH_CLIENT' | 'ADD_PRODUCT' | 'ADD_PAYMENT' | 'ADD_ORDER' | 'ADD_COMMENT' | 'EDIT_ORDER_ITEM_QTY' | 'EDIT_PAYMENT_AMOUNT' | 'EDIT_CLIENT_NAME' | 'EDIT_CLIENT_PHONE' | 'EDIT_CLIENT_ADDRESS' | 'EDIT_PRODUCT_STOCK' | 'EDIT_PRODUCT_NAME' | 'EDIT_PRODUCT_PRICE' | null;
    data?: any;
    step?: string; // Track which step we're on
};

const conversations = new Map<number, ConversationState>();

export function setConversationState(userId: number, state: ConversationState): void {
    conversations.set(userId, state);
}

export function getConversationState(userId: number): ConversationState | undefined {
    return conversations.get(userId);
}

export function clearConversationState(userId: number): void {
    conversations.delete(userId);
}
