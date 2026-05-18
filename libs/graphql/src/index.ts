export const federationDirectives = `
  directive @key(fields: String!) repeatable on OBJECT | INTERFACE
  directive @requires(fields: String!) on FIELD_DEFINITION
  directive @provides(fields: String!) on FIELD_DEFINITION
  directive @external on FIELD_DEFINITION | OBJECT
  directive @link(url: String!, as: String, for: String, import: [String]) repeatable on SCHEMA
`;

export function createFederatedServiceConfig(serviceName: string, url: string) {
  return {
    name: serviceName,
    url,
  };
}

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
