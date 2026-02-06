// Event emitter for real-time message notifications
// Tracks connected clients by userId
// Emits events: 'new_message', 'message_read'

export type MessageEventType = 'new_message' | 'message_read';

export interface MessageEventData {
  type: MessageEventType;
  message: {
    id: string;
    content: string;
    createdAt: Date | string;
    senderId: string;
    receiverId: string;
    read: boolean;
    sender: {
      id: string;
      firstName: string;
      lastName: string;
      avatar: string | null;
      role?: string;
    };
    receiver: {
      id: string;
      firstName: string;
      lastName: string;
      avatar: string | null;
      role?: string;
    };
    booking?: {
      id: string;
      service: { name: string };
    } | null;
  };
}

type EventCallback = (event: MessageEventData) => void;

class MessageEventEmitter {
  private clients: Map<string, Set<EventCallback>>;

  constructor() {
    this.clients = new Map();
  }

  /**
   * Subscribe a client to receive message events for a specific user
   * @param userId The user ID to subscribe for
   * @param callback Function to call when an event occurs
   * @returns Unsubscribe function
   */
  subscribe(userId: string, callback: EventCallback): () => void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.clients.get(userId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.clients.delete(userId);
        }
      }
    };
  }

  /**
   * Emit an event to all connected clients for a specific user
   * @param userId The user ID to emit to
   * @param event The event data to send
   */
  emit(userId: string, event: MessageEventData): void {
    const callbacks = this.clients.get(userId);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in message event callback:', error);
        }
      });
    }
  }

  /**
   * Get the number of connected clients for a user
   * @param userId The user ID to check
   * @returns Number of connected clients
   */
  getClientCount(userId: string): number {
    return this.clients.get(userId)?.size || 0;
  }

  /**
   * Get total number of connected clients across all users
   * @returns Total number of connections
   */
  getTotalConnections(): number {
    let total = 0;
    this.clients.forEach((callbacks) => {
      total += callbacks.size;
    });
    return total;
  }
}

// Singleton instance
export const messageEvents = new MessageEventEmitter();

/**
 * Helper function to emit a new message event to the receiver
 * @param receiverId The ID of the message receiver
 * @param message The message data
 */
export function emitNewMessage(
  receiverId: string,
  message: MessageEventData['message']
): void {
  messageEvents.emit(receiverId, {
    type: 'new_message',
    message,
  });
}

/**
 * Helper function to emit a message read event to the sender
 * @param senderId The ID of the original message sender
 * @param message The message that was read
 */
export function emitMessageRead(
  senderId: string,
  message: MessageEventData['message']
): void {
  messageEvents.emit(senderId, {
    type: 'message_read',
    message,
  });
}
