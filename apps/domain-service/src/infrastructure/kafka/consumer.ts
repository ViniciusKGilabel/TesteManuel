import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { IReserveStockHandler } from '../../application/handlers/ReserveStockHandler';
import { IReleaseStockHandler } from '../../application/handlers/ReleaseStockHandler';
import { IStockProducer } from './producer';
import { KafkaEnvelope, OrderPlacedPayload, StockReleaseRequestedPayload } from './types';

const TOPICS = ['order.placed', 'stock.release.requested'] as const;

export class StockConsumer {
  private readonly consumer: Consumer;

  constructor(
    private readonly brokers: string,
    private readonly groupID: string,
    private readonly reserveStockHandler: IReserveStockHandler,
    private readonly releaseStockHandler: IReleaseStockHandler,
    private readonly producer: IStockProducer,
  ) {
    const kafka = new Kafka({
      clientId: 'domain-service-consumer',
      brokers: brokers.split(','),
    });
    this.consumer = kafka.consumer({ groupId: groupID });
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topics: [...TOPICS], fromBeginning: false });
    console.log(`[kafka] consumer started topics=${JSON.stringify(TOPICS)} brokers=${this.brokers} group=${this.groupID}`);

    await this.consumer.run({
      eachMessage: async ({ topic, message }: EachMessagePayload) => {
        if (!message.value) return;
        try {
          await this.dispatch(topic, message.value);
        } catch (err) {
          console.error(`[kafka] dispatch error topic=${topic} offset=${message.offset}`, err);
        }
      },
    });
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect();
  }

  async dispatch(topic: string, data: Buffer | string): Promise<void> {
    const envelope: KafkaEnvelope = JSON.parse(data.toString());

    switch (topic) {
      case 'order.placed': {
        const p = envelope.payload as OrderPlacedPayload;
        const result = await this.reserveStockHandler.handle({
          orderID: p.order_id,
          items: p.items.map((i) => ({ productId: i.product_id, quantity: i.quantity })),
        });
        if (result.success) {
          try {
            await this.producer.publishStockReserved(p.order_id);
          } catch (err) {
            // Stock is reserved in DB but downstream was not notified — order is now stuck.
            // Log with enough context for an operator to manually trigger stock.reserved.
            console.error(
              JSON.stringify({
                event: 'stock_reserved_publish_failed',
                order_id: p.order_id,
                error: err instanceof Error ? err.message : String(err),
              }),
            );
            throw err;
          }
        } else {
          await this.producer.publishStockReservationFailed(p.order_id, result.reason);
        }
        break;
      }

      case 'stock.release.requested': {
        const p = envelope.payload as StockReleaseRequestedPayload;
        await this.releaseStockHandler.handle({
          orderID: p.order_id,
          items: p.items.map((i) => ({ productId: i.product_id, quantity: i.quantity })),
        });
        break;
      }

      default:
        break;
    }
  }
}
