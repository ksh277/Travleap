// Lightweight event bus for real-time UI updates without creating import cycles

class DataEventManager {
  private listeners: { [key: string]: (() => void)[] } = {};

  subscribe(event: string, callback: () => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event: string) {
    try {
      if (this.listeners[event]) {
        this.listeners[event].forEach(callback => callback());
      }
    } catch (e) {
      // swallow listener errors to avoid breaking unrelated flows
      // consumers should handle their own errors
      console.error('[data-events] listener error', e);
    }
  }
}

export const dataEvents = new DataEventManager();

export const notifyDataChange = {
  listingCreated: () => dataEvents.emit('listing:created'),
  listingUpdated: () => dataEvents.emit('listing:updated'),
  listingDeleted: () => dataEvents.emit('listing:deleted'),
  partnerCreated: () => dataEvents.emit('partner:created'),
  partnerUpdated: () => dataEvents.emit('partner:updated'),
  partnerDeleted: () => dataEvents.emit('partner:deleted'),
  mediaCreated: () => dataEvents.emit('media:created'),
  mediaUpdated: () => dataEvents.emit('media:updated'),
  mediaDeleted: () => dataEvents.emit('media:deleted'),
};

export const refreshAllData = () => {
  dataEvents.emit('listing:updated');
  dataEvents.emit('partner:updated');
};

