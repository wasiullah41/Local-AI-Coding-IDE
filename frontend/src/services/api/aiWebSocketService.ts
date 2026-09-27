import { useAIStore } from '../../stores/aiStore';

class AIWebSocketService {
  private socket: WebSocket | null = null;

  connect() {
    this.socket = new WebSocket(`ws://${window.location.hostname}:3001/ws`); // Backend port is 3001

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'agent:task_status') {
        useAIStore.getState().setStatus(data.data.status);
      } else if (data.type === 'agent:event') {
        useAIStore.getState().addEvent(data.data);
      }
    };
  }
}

export const aiWebSocketService = new AIWebSocketService();
