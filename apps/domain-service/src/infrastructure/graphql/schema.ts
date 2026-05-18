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

  type CartLineItem {
    productId: ID!
    quantity: Int!
    unitPrice: Float!
  }

  type Cart {
    id: ID!
    userId: ID!
    items: [CartLineItem!]!
    total: Float!
  }

  input AddToCartInput {
    userId: ID!
    productId: ID!
    quantity: Int!
    unitPrice: Float!
  }

  type Query {
    products: [Product!]!
    product(id: ID!): Product
    _health: Boolean
  }

  type Mutation {
    addToCart(input: AddToCartInput!): Cart!
  }
`);
