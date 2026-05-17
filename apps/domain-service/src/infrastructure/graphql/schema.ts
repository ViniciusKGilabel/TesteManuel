import { parse } from 'graphql';

export const typeDefs = parse(`#graphql
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Product @key(fields: "id") {
    id: ID!
    name: String!
    description: String!
    price: Float!
    currency: String!
    stock: Int!
  }

  type Query {
    products: [Product!]!
    product(id: ID!): Product
  }
`);
