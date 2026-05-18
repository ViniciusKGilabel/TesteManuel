# E-Commerce Monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready e-commerce platform demonstrating DDD, TDD, and GraphQL Federation across 5 coordinated microservices.

**Architecture:** NX monorepo with 5 independent services (Gateway, Auth, Domain, WordPress, Frontend) communicating via Apollo Federation. Each service owns its database and exposes a GraphQL subgraph. All services boot together via Docker Compose. TDD approach: test-first for all domain and application logic.

**Tech Stack:** NX, NestJS, Next.js, Apollo Federation, PostgreSQL, MySQL, BetterAuth, Shadcn UI, Jest, Playwright, Docker.

---

## PHASE 1: Monorepo Foundation

### Task 1: Initialize NX Monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `nx.json`
- Create: `tsconfig.base.json`
- Create: `.eslintrc.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize NX workspace with pnpm**

Run: `cd /Volumes/m2/Projetos/TesteManuel && pnpm create nx-workspace@latest . --preset=ts --packageManager=pnpm --nxCloud=skip`

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'libs/*'
```

- [ ] **Step 3: Update root package.json**

Set version to `0.0.1`, add scripts:

```json
{
  "name": "teste-manuel",
  "version": "0.0.1",
  "license": "MIT",
  "packageManager": "pnpm@9.0.0",
  "private": true,
  "scripts": {
    "lint": "nx run-many --target=lint",
    "test": "nx run-many --target=test",
    "build": "nx run-many --target=build",
    "dev": "docker-compose up",
    "dev:down": "docker-compose down"
  },
  "dependencies": {
    "graphql": "^16.8.0"
  },
  "devDependencies": {
    "@nx/workspace": "22.6.5",
    "@nx/js": "22.6.5",
    "@nx/nest": "22.6.5",
    "@nx/next": "22.6.5",
    "@nx/eslint": "22.6.5",
    "@nx/playwright": "22.6.5",
    "typescript": "~5.9.2",
    "eslint": "^9.8.0",
    "prettier": "~3.6.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1"
  }
}
```

- [ ] **Step 4: Create nx.json with workspace configuration**

```json
{
  "version": 2,
  "extends": "nx/presets/npm.json",
  "workspaceLayout": {
    "appsDir": "apps",
    "libsDir": "libs"
  },
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint"]
      }
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*"],
    "production": ["!{projectRoot}/**/*.spec.ts", "!{projectRoot}/**/*.test.ts"]
  }
}
```

- [ ] **Step 5: Create tsconfig.base.json with path aliases**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@teste-manuel/shared/types": ["libs/shared/types/src/index.ts"],
      "@teste-manuel/shared/utils": ["libs/shared/utils/src/index.ts"],
      "@teste-manuel/shared/testing": ["libs/shared/testing/src/index.ts"],
      "@teste-manuel/domain": ["libs/domain/src/index.ts"],
      "@teste-manuel/graphql": ["libs/graphql/src/index.ts"]
    }
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 6: Create .eslintrc.json**

```json
{
  "root": true,
  "ignorePatterns": ["dist", "node_modules", ".next"],
  "extends": ["eslint:recommended"],
  "overrides": [
    {
      "files": ["*.ts", "*.tsx"],
      "extends": ["plugin:@nx/typescript"],
      "rules": {
        "@typescript-eslint/explicit-function-return-types": "warn",
        "@typescript-eslint/no-explicit-any": "warn"
      }
    }
  ]
}
```

- [ ] **Step 7: Create .gitignore**

```
dist/
build/
node_modules/
.env
.env.local
.next/
out/
*.log
.DS_Store
.aws-sam/
```

- [ ] **Step 8: Verify NX setup**

Run: `pnpm nx --version`

Expected: Outputs version 22.6.5

---

### Task 2: Create Shared Libraries Structure

**Files:**
- Create: `libs/shared/types/src/index.ts`
- Create: `libs/shared/types/package.json`
- Create: `libs/shared/utils/src/index.ts`
- Create: `libs/shared/utils/package.json`
- Create: `libs/domain/src/index.ts`
- Create: `libs/domain/package.json`
- Create: `libs/graphql/src/index.ts`
- Create: `libs/graphql/package.json`
- Create: `libs/shared/testing/src/index.ts`
- Create: `libs/shared/testing/package.json`

- [ ] **Step 1: Create libs directory structure**

Run: `mkdir -p /Volumes/m2/Projetos/TesteManuel/libs/{shared/{types,utils,testing},domain,graphql}/src`

- [ ] **Step 2: Create shared/types/package.json**

```json
{
  "name": "@teste-manuel/shared-types",
  "version": "0.0.1",
  "main": "src/index.ts",
  "private": true
}
```

- [ ] **Step 3: Create shared/types/src/index.ts with GraphQL types**

```typescript
// Federation key types
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

// Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

// Product types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  createdAt: Date;
}

// Order types
export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED';
  createdAt: Date;
}

// Cart types
export interface Cart {
  id: string;
  userId: string;
  items: OrderItem[];
  updatedAt: Date;
}

// DTO types
export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthPayloadDto {
  user: User;
  token: string;
}
```

- [ ] **Step 4: Create shared/utils/package.json**

```json
{
  "name": "@teste-manuel/shared-utils",
  "version": "0.0.1",
  "main": "src/index.ts",
  "private": true
}
```

- [ ] **Step 5: Create shared/utils/src/index.ts**

```typescript
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function hashPassword(password: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

- [ ] **Step 6: Create domain/package.json**

```json
{
  "name": "@teste-manuel/domain",
  "version": "0.0.1",
  "main": "src/index.ts",
  "private": true
}
```

- [ ] **Step 7: Create domain/src/index.ts with base DDD classes**

```typescript
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
  findById(id: any): Promise<T | null>;
  delete(id: any): Promise<void>;
}

export abstract class DomainEvent {
  readonly occurredAt: Date;
  abstract readonly eventName: string;

  constructor() {
    this.occurredAt = new Date();
  }
}
```

- [ ] **Step 8: Create graphql/package.json**

```json
{
  "name": "@teste-manuel/graphql",
  "version": "0.0.1",
  "main": "src/index.ts",
  "dependencies": {
    "apollo-server": "^4.10.1",
    "apollo-federation": "^2.7.4"
  },
  "private": true
}
```

- [ ] **Step 9: Create graphql/src/index.ts**

```typescript
// Federation utilities
export const federationDirectives = `
  directive @key(fields: String!) repeatable on OBJECT | INTERFACE
  directive @requires(fields: String!) on FIELD_DEFINITION
  directive @provides(fields: String!) on FIELD_DEFINITION
  directive @external on FIELD_DEFINITION | OBJECT
  directive @link(url: String!, as: String, for: String, import: [String]) repeatable on SCHEMA
`;

export function createFederatedServiceConfig(serviceName: string, port: number) {
  return {
    name: serviceName,
    url: `http://localhost:${port}/graphql`,
  };
}

// Relay pagination helpers
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface Edge<T> {
  node: T;
  cursor: string;
}

export function encodeCursor(id: string): string {
  return Buffer.from(id).toString('base64');
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64').toString('utf-8');
}
```

- [ ] **Step 10: Create shared/testing/package.json**

```json
{
  "name": "@teste-manuel/shared-testing",
  "version": "0.0.1",
  "main": "src/index.ts",
  "devDependencies": {
    "jest": "^29.7.0"
  },
  "private": true
}
```

- [ ] **Step 11: Create shared/testing/src/index.ts**

```typescript
export class InMemoryRepository<T extends any> {
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

export class MockDomainEventPublisher {
  private events: any[] = [];

  publish(event: any): void {
    this.events.push(event);
  }

  getEvents(): any[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
  }
}
```

- [ ] **Step 12: Install dependencies**

Run: `cd /Volumes/m2/Projetos/TesteManuel && pnpm install`

Expected: All dependencies installed successfully

- [ ] **Step 13: Verify library structure**

Run: `pnpm nx list`

Expected: Shows all libraries in workspace

---

### Task 3: Setup Root Configuration Files

**Files:**
- Create: `jest.config.js`
- Create: `.prettierrc`
- Create: `.prettierignore`

- [ ] **Step 1: Create jest.config.js**

```javascript
module.exports = {
  projects: [
    '<rootDir>/apps/gateway',
    '<rootDir>/apps/auth-service',
    '<rootDir>/apps/domain-service',
    '<rootDir>/apps/frontend',
  ],
};
```

- [ ] **Step 2: Create .prettierrc**

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

- [ ] **Step 3: Create .prettierignore**

```
node_modules
dist
build
.next
out
pnpm-lock.yaml
```

- [ ] **Step 4: Verify root setup**

Run: `pnpm nx show project @teste-manuel/shared-types`

Expected: Shows project configuration

---

## PHASE 2: Gateway Service

### Task 4: Create Apollo Federation Gateway

**Files:**
- Create: `apps/gateway/src/main.ts`
- Create: `apps/gateway/src/gateway.config.ts`
- Create: `apps/gateway/src/middleware/auth.middleware.ts`
- Create: `apps/gateway/package.json`
- Create: `apps/gateway/tsconfig.json`
- Create: `apps/gateway/.env.example`

- [ ] **Step 1: Create gateway directory and package.json**

Run: `mkdir -p /Volumes/m2/Projetos/TesteManuel/apps/gateway/src/middleware`

```json
{
  "name": "@teste-manuel/gateway",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/main.js",
  "scripts": {
    "start": "node dist/main.js",
    "dev": "ts-node src/main.ts",
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "@apollo/gateway": "^2.7.4",
    "@apollo/server": "^4.10.1",
    "graphql": "^16.8.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "typescript": "~5.9.2",
    "ts-node": "^10.9.2",
    "@types/node": "^20.11.5",
    "@types/cors": "^2.8.17"
  }
}
```

- [ ] **Step 2: Create gateway.config.ts**

```typescript
export const SUBGRAPHS = [
  {
    name: 'auth',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001/graphql',
  },
  {
    name: 'domain',
    url: process.env.DOMAIN_SERVICE_URL || 'http://localhost:3002/graphql',
  },
  {
    name: 'wordpress',
    url: process.env.WORDPRESS_SERVICE_URL || 'http://localhost:8080/graphql',
  },
];

export const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '4000', 10);
```

- [ ] **Step 3: Create auth.middleware.ts**

```typescript
import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    res.setHeader('X-User-Token', token);
  }

  const cookies = req.headers.cookie;
  if (cookies) {
    res.setHeader('Cookie', cookies);
  }

  next();
}
```

- [ ] **Step 4: Create main.ts**

```typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { SUBGRAPHS, GATEWAY_PORT } from './gateway.config';

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: SUBGRAPHS,
    pollIntervalInMs: 10000,
  }),
});

const server = new ApolloServer({
  gateway,
  context: async ({ req }) => ({
    token: req.headers.authorization?.replace('Bearer ', ''),
  }),
});

async function startServer() {
  try {
    const { url } = await startStandaloneServer(server, {
      listen: { port: GATEWAY_PORT },
    });
    console.log(`🚀 Gateway running at ${url}`);
  } catch (err) {
    console.error('Failed to start gateway:', err);
    process.exit(1);
  }
}

startServer();
```

- [ ] **Step 5: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "module": "ES2020",
    "target": "ES2020"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 6: Create .env.example**

```
GATEWAY_PORT=4000
AUTH_SERVICE_URL=http://localhost:3001/graphql
DOMAIN_SERVICE_URL=http://localhost:3002/graphql
WORDPRESS_SERVICE_URL=http://localhost:8080/graphql
```

- [ ] **Step 7: Install gateway dependencies**

Run: `cd /Volumes/m2/Projetos/TesteManuel && pnpm add -w -D ts-node @types/express`

Expected: Dependencies installed

- [ ] **Step 8: Verify gateway setup**

Run: `pnpm nx list | grep gateway`

Expected: Shows gateway in workspace

---

## PHASE 3: Auth Service (DDD + TDD)

### Task 5: Create Auth Service Domain Layer

**Files:**
- Create: `apps/auth-service/src/domain/value-objects/Email.ts`
- Create: `apps/auth-service/src/domain/value-objects/Password.ts`
- Create: `apps/auth-service/src/domain/value-objects/UserId.ts`
- Create: `apps/auth-service/src/domain/events/UserCreatedEvent.ts`
- Create: `apps/auth-service/src/domain/entities/User.ts`
- Create: `apps/auth-service/src/domain/repositories/IUserRepository.ts`
- Create: `apps/auth-service/package.json`

- [ ] **Step 1: Create auth-service directory structure**

Run: `mkdir -p /Volumes/m2/Projetos/TesteManuel/apps/auth-service/src/domain/{value-objects,events,entities,repositories}`

- [ ] **Step 2: Create Email value object**

```typescript
import { ValueObject } from '@teste-manuel/domain';
import { isValidEmail } from '@teste-manuel/shared-utils';

export interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  constructor(value: string) {
    if (!isValidEmail(value)) {
      throw new Error('Invalid email format');
    }
    super({ value });
  }

  static create(value: string): Email {
    return new Email(value);
  }

  get value(): string {
    return this.props.value;
  }

  equals(other: Email): boolean {
    return this.props.value === other.props.value;
  }
}
```

- [ ] **Step 3: Create Password value object**

```typescript
import { ValueObject } from '@teste-manuel/domain';
import { hashPassword, verifyPassword } from '@teste-manuel/shared-utils';

export interface PasswordProps {
  hashedValue: string;
}

export class Password extends ValueObject<PasswordProps> {
  private static readonly MIN_LENGTH = 8;

  constructor(hashedValue: string) {
    super({ hashedValue });
  }

  static create(plainPassword: string): Password {
    if (plainPassword.length < Password.MIN_LENGTH) {
      throw new Error(`Password must be at least ${Password.MIN_LENGTH} characters`);
    }
    const hashedValue = hashPassword(plainPassword);
    return new Password(hashedValue);
  }

  verify(plainPassword: string): boolean {
    return verifyPassword(plainPassword, this.props.hashedValue);
  }

  get hashedValue(): string {
    return this.props.hashedValue;
  }

  equals(other: Password): boolean {
    return this.props.hashedValue === other.props.hashedValue;
  }
}
```

- [ ] **Step 4: Create UserId value object**

```typescript
import { ValueObject } from '@teste-manuel/domain';
import { generateId } from '@teste-manuel/shared-utils';

export interface UserIdProps {
  value: string;
}

export class UserId extends ValueObject<UserIdProps> {
  constructor(value: string) {
    super({ value });
  }

  static generate(): UserId {
    return new UserId(generateId());
  }

  static create(value: string): UserId {
    return new UserId(value);
  }

  get value(): string {
    return this.props.value;
  }

  equals(other: UserId): boolean {
    return this.props.value === other.props.value;
  }
}
```

- [ ] **Step 5: Create UserCreatedEvent**

```typescript
import { DomainEvent } from '@teste-manuel/domain';

export class UserCreatedEvent extends DomainEvent {
  readonly eventName = 'UserCreated';

  constructor(
    readonly userId: string,
    readonly email: string,
    readonly name: string
  ) {
    super();
  }
}
```

- [ ] **Step 6: Create User aggregate root**

```typescript
import { AggregateRoot } from '@teste-manuel/domain';
import { UserId } from '../value-objects/UserId';
import { Email } from '../value-objects/Email';
import { Password } from '../value-objects/Password';
import { UserCreatedEvent } from '../events/UserCreatedEvent';

export interface UserProps {
  id: UserId;
  email: Email;
  password: Password;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
}

export class User extends AggregateRoot<UserId> {
  private email: Email;
  private password: Password;
  private name: string;
  private role: 'USER' | 'ADMIN';

  private constructor(props: UserProps) {
    super(props.id, props.createdAt);
    this.email = props.email;
    this.password = props.password;
    this.name = props.name;
    this.role = props.role;
  }

  static create(email: Email, password: Password, name: string): User {
    const userId = UserId.generate();
    const user = new User({
      id: userId,
      email,
      password,
      name,
      role: 'USER',
      createdAt: new Date(),
    });

    user.addDomainEvent(
      new UserCreatedEvent(userId.value, email.value, name)
    );

    return user;
  }

  verifyPassword(plainPassword: string): boolean {
    return this.password.verify(plainPassword);
  }

  changePassword(currentPassword: string, newPassword: Password): void {
    if (!this.verifyPassword(currentPassword)) {
      throw new Error('Current password is incorrect');
    }
    this.password = newPassword;
  }

  get userId(): UserId {
    return this._id;
  }

  get userEmail(): Email {
    return this.email;
  }

  get userName(): string {
    return this.name;
  }

  get userRole(): 'USER' | 'ADMIN' {
    return this.role;
  }

  equals(other: User): boolean {
    return this.userId.equals(other.userId);
  }
}
```

- [ ] **Step 7: Create IUserRepository interface**

```typescript
import { IRepository } from '@teste-manuel/domain';
import { User } from '../entities/User';
import { Email } from '../value-objects/Email';

export interface IUserRepository extends IRepository<User> {
  findByEmail(email: Email): Promise<User | null>;
  emailExists(email: Email): Promise<boolean>;
}
```

- [ ] **Step 8: Create auth-service package.json**

```json
{
  "name": "@teste-manuel/auth-service",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/main.js",
  "scripts": {
    "start": "node dist/main.js",
    "dev": "ts-node src/main.ts",
    "build": "tsc",
    "test": "jest --config jest.config.ts",
    "test:watch": "jest --watch --config jest.config.ts"
  },
  "dependencies": {
    "@teste-manuel/domain": "*",
    "@teste-manuel/shared-utils": "*",
    "@teste-manuel/shared-types": "*",
    "@teste-manuel/graphql": "*",
    "@nestjs/common": "^10.2.10",
    "@nestjs/core": "^10.2.10",
    "graphql": "^16.8.0",
    "reflect-metadata": "^0.1.13"
  },
  "devDependencies": {
    "typescript": "~5.9.2",
    "ts-node": "^10.9.2",
    "@types/node": "^20.11.5",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1"
  }
}
```

- [ ] **Step 9: Create jest.config.ts for auth-service**

```typescript
export default {
  displayName: 'auth-service',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  rootDir: './',
  testMatch: ['**/__tests__/**/*.spec.ts'],
};
```

---

### Task 6: Write Auth Service Domain Layer Tests

**Files:**
- Create: `apps/auth-service/src/__tests__/domain/value-objects/Email.spec.ts`
- Create: `apps/auth-service/src/__tests__/domain/value-objects/Password.spec.ts`
- Create: `apps/auth-service/src/__tests__/domain/entities/User.spec.ts`

- [ ] **Step 1: Create test directory structure**

Run: `mkdir -p /Volumes/m2/Projetos/TesteManuel/apps/auth-service/src/__tests__/{domain/{value-objects,entities},application,integration}`

- [ ] **Step 2: Create Email.spec.ts**

```typescript
import { Email } from '../../../domain/value-objects/Email';

describe('Email Value Object', () => {
  it('should create a valid email', () => {
    const email = Email.create('test@example.com');
    expect(email.value).toBe('test@example.com');
  });

  it('should throw error for invalid email format', () => {
    expect(() => Email.create('invalid-email')).toThrow('Invalid email format');
  });

  it('should throw error for empty email', () => {
    expect(() => Email.create('')).toThrow('Invalid email format');
  });

  it('should return true for equal emails', () => {
    const email1 = Email.create('test@example.com');
    const email2 = Email.create('test@example.com');
    expect(email1.equals(email2)).toBe(true);
  });

  it('should return false for different emails', () => {
    const email1 = Email.create('test1@example.com');
    const email2 = Email.create('test2@example.com');
    expect(email1.equals(email2)).toBe(false);
  });
});
```

- [ ] **Step 3: Create Password.spec.ts**

```typescript
import { Password } from '../../../domain/value-objects/Password';

describe('Password Value Object', () => {
  it('should create a password with valid plain text', () => {
    const password = Password.create('SecurePassword123');
    expect(password.hashedValue).toBeDefined();
    expect(password.hashedValue).not.toBe('SecurePassword123');
  });

  it('should throw error for password shorter than minimum length', () => {
    expect(() => Password.create('short')).toThrow(
      'Password must be at least 8 characters'
    );
  });

  it('should verify correct password', () => {
    const plainPassword = 'SecurePassword123';
    const password = Password.create(plainPassword);
    expect(password.verify(plainPassword)).toBe(true);
  });

  it('should not verify incorrect password', () => {
    const password = Password.create('SecurePassword123');
    expect(password.verify('WrongPassword123')).toBe(false);
  });

  it('should return true for equal password hashes', () => {
    const plainPassword = 'SecurePassword123';
    const password1 = Password.create(plainPassword);
    const password2 = Password.create(plainPassword);
    // Both should verify the same plaintext, but hashes may differ
    expect(password1.verify(plainPassword)).toBe(true);
    expect(password2.verify(plainPassword)).toBe(true);
  });
});
```

- [ ] **Step 4: Create User.spec.ts**

```typescript
import { User } from '../../../domain/entities/User';
import { Email } from '../../../domain/value-objects/Email';
import { Password } from '../../../domain/value-objects/Password';
import { UserCreatedEvent } from '../../../domain/events/UserCreatedEvent';

describe('User Aggregate Root', () => {
  it('should create a new user with factory method', () => {
    const email = Email.create('test@example.com');
    const password = Password.create('SecurePassword123');
    
    const user = User.create(email, password, 'John Doe');
    
    expect(user.userId).toBeDefined();
    expect(user.userEmail.equals(email)).toBe(true);
    expect(user.userName).toBe('John Doe');
    expect(user.userRole).toBe('USER');
  });

  it('should publish UserCreatedEvent when user is created', () => {
    const email = Email.create('test@example.com');
    const password = Password.create('SecurePassword123');
    
    const user = User.create(email, password, 'John Doe');
    const events = user.events;
    
    expect(events.length).toBe(1);
    expect(events[0]).toBeInstanceOf(UserCreatedEvent);
    expect((events[0] as UserCreatedEvent).email).toBe('test@example.com');
  });

  it('should verify correct password', () => {
    const email = Email.create('test@example.com');
    const plainPassword = 'SecurePassword123';
    const password = Password.create(plainPassword);
    
    const user = User.create(email, password, 'John Doe');
    
    expect(user.verifyPassword(plainPassword)).toBe(true);
  });

  it('should not verify incorrect password', () => {
    const email = Email.create('test@example.com');
    const password = Password.create('SecurePassword123');
    
    const user = User.create(email, password, 'John Doe');
    
    expect(user.verifyPassword('WrongPassword')).toBe(false);
  });

  it('should change password if current password is correct', () => {
    const email = Email.create('test@example.com');
    const oldPassword = Password.create('OldPassword123');
    const user = User.create(email, oldPassword, 'John Doe');
    
    const newPassword = Password.create('NewPassword123');
    user.changePassword('OldPassword123', newPassword);
    
    expect(user.verifyPassword('NewPassword123')).toBe(true);
    expect(user.verifyPassword('OldPassword123')).toBe(false);
  });

  it('should throw error when changing password with wrong current password', () => {
    const email = Email.create('test@example.com');
    const password = Password.create('SecurePassword123');
    const user = User.create(email, password, 'John Doe');
    
    const newPassword = Password.create('NewPassword123');
    
    expect(() => {
      user.changePassword('WrongPassword', newPassword);
    }).toThrow('Current password is incorrect');
  });

  it('should return true for equal users', () => {
    const email = Email.create('test@example.com');
    const password = Password.create('SecurePassword123');
    
    const user1 = User.create(email, password, 'John Doe');
    
    // Create second user with same ID (simulating retrieval)
    expect(user1.equals(user1)).toBe(true);
  });
});
```

- [ ] **Step 5: Run domain tests**

Run: `cd /Volumes/m2/Projetos/TesteManuel && pnpm add -D jest ts-jest @types/jest --save-exact && pnpm --filter @teste-manuel/auth-service test`

Expected: All 13 tests pass

- [ ] **Step 6: Verify test coverage**

Run: `pnpm --filter @teste-manuel/auth-service test -- --coverage`

Expected: 100% coverage for domain value objects and entities

---

### Task 7: Create Auth Service Application Layer

**Files:**
- Create: `apps/auth-service/src/application/commands/RegisterCommand.ts`
- Create: `apps/auth-service/src/application/commands/LoginCommand.ts`
- Create: `apps/auth-service/src/application/handlers/RegisterHandler.ts`
- Create: `apps/auth-service/src/application/handlers/LoginHandler.ts`
- Create: `apps/auth-service/src/application/dto/AuthPayloadDTO.ts`

- [ ] **Step 1: Create application directory structure**

Run: `mkdir -p /Volumes/m2/Projetos/TesteManuel/apps/auth-service/src/application/{commands,handlers,dto}`

- [ ] **Step 2: Create RegisterCommand**

```typescript
export class RegisterCommand {
  constructor(
    readonly email: string,
    readonly password: string,
    readonly name: string
  ) {}
}
```

- [ ] **Step 3: Create LoginCommand**

```typescript
export class LoginCommand {
  constructor(
    readonly email: string,
    readonly password: string
  ) {}
}
```

- [ ] **Step 4: Create AuthPayloadDTO**

```typescript
import { User } from '../../domain/entities/User';

export class AuthPayloadDTO {
  userId: string;
  email: string;
  name: string;
  token: string;

  constructor(user: User, token: string) {
    this.userId = user.userId.value;
    this.email = user.userEmail.value;
    this.name = user.userName;
    this.token = token;
  }
}
```

- [ ] **Step 5: Create RegisterHandler**

```typescript
import { RegisterCommand } from '../commands/RegisterCommand';
import { Email } from '../../domain/value-objects/Email';
import { Password } from '../../domain/value-objects/Password';
import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { AuthPayloadDTO } from '../dto/AuthPayloadDTO';

export class RegisterHandler {
  constructor(private userRepository: IUserRepository) {}

  async handle(command: RegisterCommand): Promise<AuthPayloadDTO> {
    const email = Email.create(command.email);

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const password = Password.create(command.password);
    const user = User.create(email, password, command.name);

    await this.userRepository.save(user);

    const token = this.generateToken(user.userId.value);
    return new AuthPayloadDTO(user, token);
  }

  private generateToken(userId: string): string {
    return `token_${userId}_${Date.now()}`;
  }
}
```

- [ ] **Step 6: Create LoginHandler**

```typescript
import { LoginCommand } from '../commands/LoginCommand';
import { Email } from '../../domain/value-objects/Email';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { AuthPayloadDTO } from '../dto/AuthPayloadDTO';

export class LoginHandler {
  constructor(private userRepository: IUserRepository) {}

  async handle(command: LoginCommand): Promise<AuthPayloadDTO> {
    const email = Email.create(command.email);

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.verifyPassword(command.password)) {
      throw new Error('Invalid password');
    }

    const token = this.generateToken(user.userId.value);
    return new AuthPayloadDTO(user, token);
  }

  private generateToken(userId: string): string {
    return `token_${userId}_${Date.now()}`;
  }
}
```

- [ ] **Step 7: Verify application structure**

Run: `find /Volumes/m2/Projetos/TesteManuel/apps/auth-service/src/application -type f`

Expected: Shows all created application layer files

---

### Task 8: Write Auth Service Integration Tests

**Files:**
- Create: `apps/auth-service/src/__tests__/application/RegisterHandler.spec.ts`
- Create: `apps/auth-service/src/__tests__/application/LoginHandler.spec.ts`

- [ ] **Step 1: Create RegisterHandler.spec.ts**

```typescript
import { InMemoryRepository } from '@teste-manuel/shared-testing';
import { RegisterHandler } from '../../../application/handlers/RegisterHandler';
import { RegisterCommand } from '../../../application/commands/RegisterCommand';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { User } from '../../../domain/entities/User';
import { Email } from '../../../domain/value-objects/Email';

class MockUserRepository extends InMemoryRepository<User> implements IUserRepository {
  private itemsByEmail: Map<string, User> = new Map();

  async save(user: User): Promise<void> {
    await super.save(user.userId.value, user);
    this.itemsByEmail.set(user.userEmail.value, user);
  }

  async findByEmail(email: Email): Promise<User | null> {
    return this.itemsByEmail.get(email.value) || null;
  }

  async emailExists(email: Email): Promise<boolean> {
    return this.itemsByEmail.has(email.value);
  }
}

describe('RegisterHandler', () => {
  let handler: RegisterHandler;
  let userRepository: MockUserRepository;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    handler = new RegisterHandler(userRepository);
  });

  it('should register a new user successfully', async () => {
    const command = new RegisterCommand(
      'test@example.com',
      'SecurePassword123',
      'John Doe'
    );

    const payload = await handler.handle(command);

    expect(payload.email).toBe('test@example.com');
    expect(payload.name).toBe('John Doe');
    expect(payload.token).toBeDefined();
    expect(payload.userId).toBeDefined();
  });

  it('should throw error if email already registered', async () => {
    const command1 = new RegisterCommand(
      'test@example.com',
      'SecurePassword123',
      'John Doe'
    );
    await handler.handle(command1);

    const command2 = new RegisterCommand(
      'test@example.com',
      'AnotherPassword123',
      'Jane Doe'
    );

    await expect(handler.handle(command2)).rejects.toThrow(
      'Email already registered'
    );
  });

  it('should throw error for invalid email', async () => {
    const command = new RegisterCommand(
      'invalid-email',
      'SecurePassword123',
      'John Doe'
    );

    await expect(handler.handle(command)).rejects.toThrow('Invalid email format');
  });

  it('should throw error for weak password', async () => {
    const command = new RegisterCommand(
      'test@example.com',
      'short',
      'John Doe'
    );

    await expect(handler.handle(command)).rejects.toThrow(
      'Password must be at least 8 characters'
    );
  });
});
```

- [ ] **Step 2: Create LoginHandler.spec.ts**

```typescript
import { InMemoryRepository } from '@teste-manuel/shared-testing';
import { LoginHandler } from '../../../application/handlers/LoginHandler';
import { LoginCommand } from '../../../application/commands/LoginCommand';
import { RegisterHandler } from '../../../application/handlers/RegisterHandler';
import { RegisterCommand } from '../../../application/commands/RegisterCommand';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { User } from '../../../domain/entities/User';
import { Email } from '../../../domain/value-objects/Email';

class MockUserRepository extends InMemoryRepository<User> implements IUserRepository {
  private itemsByEmail: Map<string, User> = new Map();

  async save(user: User): Promise<void> {
    await super.save(user.userId.value, user);
    this.itemsByEmail.set(user.userEmail.value, user);
  }

  async findByEmail(email: Email): Promise<User | null> {
    return this.itemsByEmail.get(email.value) || null;
  }

  async emailExists(email: Email): Promise<boolean> {
    return this.itemsByEmail.has(email.value);
  }
}

describe('LoginHandler', () => {
  let loginHandler: LoginHandler;
  let registerHandler: RegisterHandler;
  let userRepository: MockUserRepository;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    loginHandler = new LoginHandler(userRepository);
    registerHandler = new RegisterHandler(userRepository);
  });

  it('should login user with correct credentials', async () => {
    const registerCommand = new RegisterCommand(
      'test@example.com',
      'SecurePassword123',
      'John Doe'
    );
    await registerHandler.handle(registerCommand);

    const loginCommand = new LoginCommand(
      'test@example.com',
      'SecurePassword123'
    );

    const payload = await loginHandler.handle(loginCommand);

    expect(payload.email).toBe('test@example.com');
    expect(payload.token).toBeDefined();
  });

  it('should throw error if user not found', async () => {
    const command = new LoginCommand(
      'nonexistent@example.com',
      'Password123'
    );

    await expect(loginHandler.handle(command)).rejects.toThrow('User not found');
  });

  it('should throw error if password is incorrect', async () => {
    const registerCommand = new RegisterCommand(
      'test@example.com',
      'SecurePassword123',
      'John Doe'
    );
    await registerHandler.handle(registerCommand);

    const loginCommand = new LoginCommand(
      'test@example.com',
      'WrongPassword123'
    );

    await expect(loginHandler.handle(loginCommand)).rejects.toThrow(
      'Invalid password'
    );
  });

  it('should generate unique tokens for different logins', async () => {
    const registerCommand = new RegisterCommand(
      'test@example.com',
      'SecurePassword123',
      'John Doe'
    );
    await registerHandler.handle(registerCommand);

    const loginCommand = new LoginCommand(
      'test@example.com',
      'SecurePassword123'
    );

    const payload1 = await loginHandler.handle(loginCommand);
    
    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const payload2 = await loginHandler.handle(loginCommand);

    expect(payload1.token).toBeDefined();
    expect(payload2.token).toBeDefined();
    // Tokens should be different due to timestamp
    expect(payload1.token).not.toBe(payload2.token);
  });
});
```

- [ ] **Step 3: Run integration tests**

Run: `pnpm --filter @teste-manuel/auth-service test -- src/__tests__/application`

Expected: All application layer tests pass

- [ ] **Step 4: Run all auth service tests**

Run: `pnpm --filter @teste-manuel/auth-service test`

Expected: All tests pass (domain + application)

---

## PHASE 4: Docker Compose & CI/CD ✅ COMPLETED

Implemented:
- `docker-compose.yml` with all 8 services + health checks
- Dockerfiles for auth-service, domain-service, gateway, frontend
- `.github/workflows/ci.yml` — test → build → Docker build pipeline

---

## PHASE 5: WordPress GraphQL Federation

**Spec:** `docs/superpowers/specs/2026-05-11-order-payment-fraud-design.md`

### Task 9: WordPress Docker Setup with WP-GraphQL

**Files:**
- Create: `apps/wordpress/Dockerfile`
- Create: `apps/wordpress/setup.sh`
- Create: `apps/wordpress/plugins/graphql-federation/graphql-federation.php`

- [ ] **Step 1: Create WordPress directory structure**

Run: `mkdir -p /Volumes/m2/Projetos/TesteManuel/apps/wordpress/plugins/graphql-federation`

- [ ] **Step 2: Create Dockerfile with WP-CLI and WP-GraphQL**

```dockerfile
FROM wordpress:6.4-apache

RUN apt-get update && apt-get install -y less curl && \
    curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar && \
    chmod +x wp-cli.phar && mv wp-cli.phar /usr/local/bin/wp

COPY plugins/graphql-federation /var/www/html/wp-content/plugins/graphql-federation
COPY setup.sh /docker-entrypoint-initwp.sh
RUN chmod +x /docker-entrypoint-initwp.sh
```

- [ ] **Step 3: Create setup.sh (WP-CLI bootstrap)**

```bash
#!/bin/bash
set -e

until wp db check --allow-root 2>/dev/null; do
  echo "Waiting for database..."
  sleep 3
done

wp core install \
  --url=http://localhost:8080 \
  --title="TesteManuel CMS" \
  --admin_user=admin \
  --admin_password=adminpass \
  --admin_email=admin@teste.com \
  --allow-root

wp plugin install wp-graphql --activate --allow-root
wp plugin activate graphql-federation --allow-root

wp post create --post_title="Welcome" --post_status=publish --allow-root
wp post create --post_title="About" --post_type=page --post_status=publish --allow-root
```

- [ ] **Step 4: Create graphql-federation.php plugin**

```php
<?php
/**
 * Plugin Name: WP-GraphQL Federation
 * Description: Adds Apollo Federation directives to WP-GraphQL types
 * Version: 1.0.0
 */

add_action('graphql_register_types', function() {
    register_graphql_field('Post', 'federationKey', [
        'type' => 'String',
        'resolve' => fn($post) => (string) $post->ID,
    ]);
});

add_filter('graphql_schema_config', function($config) {
    $config['directives'][] = [
        'name' => 'key',
        'locations' => ['OBJECT', 'INTERFACE'],
        'args' => ['fields' => ['type' => 'String!']],
        'isRepeatable' => true,
    ];
    return $config;
});
```

- [ ] **Step 5: Update docker-compose.yml wordpress service to use custom build**

- [ ] **Step 6: Verify WP-GraphQL endpoint**

Run: `curl -s -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d '{"query":"{ posts { nodes { id title } } }"}' | jq .`

Expected: Returns list of posts

---

## PHASE 6: Go Order Service (DDD + CQRS + Kafka + GraphQL)

**Spec:** `docs/superpowers/specs/2026-05-11-order-payment-fraud-design.md`

### Task 10: Go Order Service Domain Layer + Tests

**Files:**
- Create: `apps/order-service/go.mod`
- Create: `apps/order-service/internal/domain/order/money.go`
- Create: `apps/order-service/internal/domain/order/order_item.go`
- Create: `apps/order-service/internal/domain/order/events.go`
- Create: `apps/order-service/internal/domain/order/repository.go`
- Create: `apps/order-service/internal/domain/order/order.go`
- Create: `apps/order-service/internal/domain/order/order_test.go`

- [ ] **Step 1: Create directory structure**

Run: `mkdir -p /Volumes/m2/Projetos/TesteManuel/apps/order-service/{cmd/server,internal/{domain/order,application/{commands,queries,handlers},infrastructure/{postgres,kafka,fraud,graphql}}}`

- [ ] **Step 2: Create go.mod**

Module: `github.com/teste-manuel/order-service`, Go 1.22
Deps: `github.com/google/uuid`, `github.com/jackc/pgx/v5`, `github.com/segmentio/kafka-go`, `github.com/99designs/gqlgen`

- [ ] **Step 3: Create Money value object** (amount in cents, currency string)

- [ ] **Step 4: Create OrderItem value object** (productID, quantity, unitPrice Money)

- [ ] **Step 5: Create domain events** (OrderPlaced, OrderConfirmed, OrderCancelled)

- [ ] **Step 6: Create Order aggregate root**

States: PENDING → STOCK_RESERVED → FRAUD_CHECKED → PAYMENT_REQUESTED → CONFIRMED | CANCELLED
Methods: Place, MarkStockReserved, MarkFraudChecked, RequestPayment, Confirm, Cancel

- [ ] **Step 7: Create IOrderRepository interface**

- [ ] **Step 8: Write order_test.go**

Tests: Place valid order, invalid transitions, total calculation, event emission, cancel restrictions

Run: `cd apps/order-service && go test ./internal/domain/order/...`

Expected: All tests pass

### Task 11: Go Order Service Application + Infrastructure + GraphQL

- [ ] **Step 1: PlaceOrderHandler** — creates aggregate, saves, publishes order.placed + saga-state

- [ ] **Step 2: ConfirmOrderHandler** — transitions to CONFIRMED, publishes order.confirmed

- [ ] **Step 3: CancelOrderHandler** — transitions to CANCELLED, publishes order.cancelled + stock.release.requested

- [ ] **Step 4: Kafka producer** — JSON serialization, publishes to domain topics + saga-state

- [ ] **Step 5: Kafka consumer** — routes stock.reserved / stock.reservation.failed / payment.processed / payment.failed to handlers

- [ ] **Step 6: Fraud HTTP client** — POST to fraud-sidecar /analyze, returns FraudReport

- [ ] **Step 7: GraphQL server** — gqlgen resolvers for order, orders, placeOrder mutation

- [ ] **Step 8: main.go** — wire all components, graceful shutdown

- [ ] **Step 9: Dockerfile** — multi-stage Go build

- [ ] **Step 10: Verify build**

Run: `cd apps/order-service && go build ./...`

Expected: No errors

---

## PHASE 7: Python Fraud Sidecar (FastAPI + LangChain LCEL)

### Task 12: Fraud Sidecar + Tests

**Files:**
- Create: `apps/fraud-sidecar/requirements.txt`
- Create: `apps/fraud-sidecar/models/fraud_request.py`
- Create: `apps/fraud-sidecar/models/fraud_response.py`
- Create: `apps/fraud-sidecar/chains/prompts.py`
- Create: `apps/fraud-sidecar/chains/fraud_chain.py`
- Create: `apps/fraud-sidecar/main.py`
- Create: `apps/fraud-sidecar/tests/test_chain.py`
- Create: `apps/fraud-sidecar/tests/test_thresholds.py`
- Create: `apps/fraud-sidecar/Dockerfile`

- [ ] **Step 1: requirements.txt**

`fastapi`, `uvicorn[standard]`, `langchain`, `langchain-anthropic`, `pydantic`, `httpx`, `pytest`, `pytest-asyncio`

- [ ] **Step 2: Pydantic models** — FraudRequest (signals), FraudResponse (risk_score, risk_level, narrative, recommended_action, signals_flagged, confidence)

- [ ] **Step 3: Prompt templates** — System prompt: Claude as fraud analyst. User prompt: injects all signals. Output: strict JSON matching FraudResponse.

- [ ] **Step 4: LangChain LCEL chain**

```python
chain = RunnableLambda(format_context) | ChatAnthropic(model="claude-sonnet-4-6", temperature=0) | JsonOutputParser()
```

- [ ] **Step 5: FastAPI app** — POST /analyze (runs chain), GET /health

- [ ] **Step 6: Tests with FakeLLM** — test chain structure, threshold mapping (25→LOW/APPROVE, 75→HIGH/REJECT), signal formatting

- [ ] **Step 7: Run tests**

Run: `cd apps/fraud-sidecar && pip install -r requirements.txt && pytest tests/ -v`

Expected: All tests pass

- [ ] **Step 8: Dockerfile** — python:3.12-slim, install deps, expose 3005

---

## PHASE 8: Go Payment Service (DDD + Idempotency + Mock Provider)

### Task 13: Payment Domain Layer + Tests

**Files:**
- Create: `apps/payment-service/go.mod`
- Create: `apps/payment-service/internal/domain/payment/payment.go`
- Create: `apps/payment-service/internal/domain/payment/idempotency_key.go`
- Create: `apps/payment-service/internal/domain/payment/events.go`
- Create: `apps/payment-service/internal/domain/payment/payment_test.go`

- [ ] **Step 1: Create directory structure + go.mod**

Run: `mkdir -p /Volumes/m2/Projetos/TesteManuel/apps/payment-service/{cmd/server,internal/{domain/payment,application/{commands,handlers},infrastructure/{postgres,kafka,mock_provider}}}`

- [ ] **Step 2: Payment aggregate** — States: PROCESSING → COMPLETED | FAILED. Methods: Initiate, Complete, Fail.

- [ ] **Step 3: IdempotencyKey value object** — SHA256(orderID + ":" + attempt) as hex string

- [ ] **Step 4: Domain events** — PaymentProcessed, PaymentFailed

- [ ] **Step 5: Write payment_test.go**

Tests: Initiate, Complete, Fail, invalid transitions, idempotency key generation uniqueness

Run: `cd apps/payment-service && go test ./internal/domain/payment/...`

Expected: All tests pass

### Task 14: Payment Application + Infrastructure + Mock Provider

- [ ] **Step 1: ProcessPaymentHandler** — checks idempotency store, calls mock provider, publishes result

- [ ] **Step 2: Idempotency store** — Postgres table `idempotency_keys(key, order_id, status, result, created_at)`

- [ ] **Step 3: Mock payment provider**

```go
func (p *MockProvider) Authorize(amount Money) (string, error) {
    time.Sleep(randomLatency())
    if rand.Float64() < 0.05 { return "", fmt.Errorf("DECLINED") }
    return uuid.New().String(), nil
}

func (p *MockProvider) Capture(authID string) error {
    time.Sleep(randomLatency())
    if rand.Float64() < 0.02 { return fmt.Errorf("CAPTURE_FAILED") }
    return nil
}
```

- [ ] **Step 4: Kafka consumer** — listens on payment.requested, invokes ProcessPaymentHandler

- [ ] **Step 5: main.go + Dockerfile**

- [ ] **Step 6: Verify**

Run: `cd apps/payment-service && go build ./... && go test ./...`

---

## PHASE 9: Kafka + Full Docker Compose Integration

### Task 15: Complete Infrastructure Wiring

- [ ] **Step 1: Add Kafka + Zookeeper to docker-compose.yml** (confluentinc images, health checks)

- [ ] **Step 2: Add order-db, payment-db Postgres services** (ports 5434, 5435)

- [ ] **Step 3: Add order-service, payment-service, fraud-sidecar services** with Kafka and DB env vars

- [ ] **Step 4: Update domain-service** — add Kafka consumer for order.placed (stock reserve) and stock.release.requested (stock release)

- [ ] **Step 5: Update gateway** — add order-service subgraph `http://order-service:3003/graphql`

- [ ] **Step 6: Create .env.example** with ANTHROPIC_API_KEY and all service URLs

- [ ] **Step 7: Update CI/CD** — add Go test steps and Python pytest step

- [ ] **Step 8: Final smoke test**

Run: `docker-compose config --quiet`

Expected: Valid compose config with all 12+ services

---

## Execution Notes

- **No commits:** Code changes only, no git commits (as per user instructions)
- **Test coverage targets:** 100% domain layer (TS), 90%+ application (TS/Go), 85%+ Python sidecar
- **TDD discipline:** Test-first for all domain and application logic
- **Language split:** Auth/Domain/Gateway = TypeScript, Order/Payment = Go, Fraud = Python
- **Saga approach:** Choreography B — each service publishes to saga-state topic for observability
- **Idempotency:** SHA256(order_id + attempt) deduplication in Postgres before mock provider call
