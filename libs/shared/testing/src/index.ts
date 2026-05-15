export class InMemoryRepository<T> {
  private items: Map<string, T> = new Map();

  async save(id: string, item: T): Promise<void> {
    this.items.set(id, item);
  }

  async findById(id: string): Promise<T | null> {
    return this.items.get(id) || null;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async findAll(): Promise<T[]> {
    return Array.from(this.items.values());
  }

  clear(): void {
    this.items.clear();
  }
}

import { DomainEvent } from '@teste-manuel/domain';

export class MockDomainEventPublisher {
  private events: DomainEvent[] = [];

  publish(event: DomainEvent): void {
    this.events.push(event);
  }

  getEvents(): DomainEvent[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
  }
}
