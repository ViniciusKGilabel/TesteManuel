import { Kafka, Producer } from 'kafkajs';

export class StockProducer {
  private readonly producer: Producer;

  constructor(private readonly brokers: string) {
    const kafka = new Kafka({
      clientId: 'domain-service-producer',
      brokers: brokers.split(','),
    });
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async publishStockReserved(orderID: string): Promise<void> {
    await this.send('stock.reserved', orderID, {
      saga_id: `order-${orderID}`,
      event_type: 'stock.reserved',
      timestamp: new Date().toISOString(),
      payload: { order_id: orderID },
    });
  }

  async publishStockReservationFailed(orderID: string, reason: string): Promise<void> {
    await this.send('stock.reservation.failed', orderID, {
      saga_id: `order-${orderID}`,
      event_type: 'stock.reservation.failed',
      timestamp: new Date().toISOString(),
      payload: { order_id: orderID, reason },
    });
  }

  private async send(topic: string, key: string, msg: object): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(msg) }],
    });
  }
}
