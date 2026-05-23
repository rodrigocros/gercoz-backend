import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: 'http://localhost:3000', credentials: true } })
export class OrdersGateway {
  @WebSocketServer()
  server: Server;

  emitOrderCreated(restaurantId: string, order: any): void {
    this.server.to(`restaurant:${restaurantId}:kds`).emit('order:created', order);
  }

  emitStatusChanged(restaurantId: string, order: any): void {
    this.server.to(`restaurant:${restaurantId}:pdv`).emit('order:status_changed', order);
  }
}
