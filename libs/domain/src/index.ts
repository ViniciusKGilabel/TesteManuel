export abstract class Entity<T> {
  protected _id: T;
  protected _createdAt: Date;

  constructor(id: T, createdAt?: Date) {
    this._id = id;
    this._createdAt = createdAt || new Date();
  }

  get id(): T {
    return this._id;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  abstract equals(other: Entity<T>): boolean;
}

export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze(props);
  }

  abstract equals(other: ValueObject<T>): boolean;
}

export abstract class AggregateRoot<T> extends Entity<T> {
  private domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  get events(): DomainEvent[] {
    return this.domainEvents;
  }

  clearEvents(): void {
    this.domainEvents = [];
  }
}

export interface IRepository<T extends AggregateRoot<any>> {
  save(aggregate: T): Promise<void>;
  findById(id: string): Promise<T | null>;
  delete(id: string): Promise<void>;
}

export abstract class DomainEvent {
  readonly occurredAt: Date;
  abstract readonly eventName: string;

  constructor() {
    this.occurredAt = new Date();
  }
}
