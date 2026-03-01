/**
 * Message routing utility for handling chrome.runtime messages
 */

import { Message, MessageResponse } from '../../shared/types/messages';

type MessageHandler<T extends Message> = (
  message: T,
  sender: chrome.runtime.MessageSender
) => Promise<MessageResponse<T>>;

export class MessageRouter {
  private handlers: Map<string, MessageHandler<any>> = new Map();

  /**
   * Register a message handler
   */
  register<T extends Message>(
    type: T['type'],
    handler: MessageHandler<T>
  ): void {
    this.handlers.set(type, handler);
  }

  /**
   * Handle incoming message
   */
  async handle(
    message: Message,
    sender: chrome.runtime.MessageSender
  ): Promise<any> {
    const handler = this.handlers.get(message.type);

    if (!handler) {
      console.error(`No handler registered for message type: ${message.type}`);
      return { success: false, error: 'Unknown message type' };
    }

    try {
      return await handler(message, sender);
    } catch (error) {
      console.error(`Error handling message ${message.type}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Setup listener for chrome.runtime.onMessage
   */
  listen(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Handle message asynchronously
      this.handle(message, sender)
        .then(sendResponse)
        .catch(error => {
          console.error('Message handling failed:', error);
          sendResponse({ success: false, error: 'Internal error' });
        });

      // Return true to indicate async response
      return true;
    });
  }
}
