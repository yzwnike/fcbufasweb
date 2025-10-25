import type { APIRoute } from 'astro';

// Store active connections
const connections = new Set<WritableStreamDefaultWriter>();

// Broadcast a notification to all connected clients
export function broadcastCardNotification(username: string, cardData: any) {
  const message = {
    type: 'card_obtained',
    username,
    card: {
      id: cardData.id,
      player_name: cardData.player?.name || 'Jugador',
      image_path: cardData.image_path || cardData.card?.image_path,
      special_type: cardData.special_type || cardData.card?.special_type,
      rarity: cardData.rarity || cardData.card?.rarity
    },
    timestamp: Date.now()
  };
  
  const data = `data: ${JSON.stringify(message)}\n\n`;
  
  // Send to all connected clients
  connections.forEach(writer => {
    writer.write(new TextEncoder().encode(data)).catch(() => {
      // Remove broken connections
      connections.delete(writer);
    });
  });
}

export const GET: APIRoute = async () => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const writer = controller as any;
      
      // Add this connection to active connections
      connections.add(writer);
      
      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));
      
      // Keep alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch {
          clearInterval(keepAlive);
          connections.delete(writer);
        }
      }, 30000);
      
      // Cleanup on close
      return () => {
        clearInterval(keepAlive);
        connections.delete(writer);
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
