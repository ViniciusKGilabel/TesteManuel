import { gql } from '@apollo/client';

export const GET_MY_ORDERS = gql`
  query GetMyOrders($userId: ID!) {
    orders(userId: $userId) {
      id
      status
      total
      createdAt
      items {
        productId
        quantity
        unitPrice
        subtotal
      }
    }
  }
`;

export const PLACE_ORDER = gql`
  mutation PlaceOrder($userId: ID!, $items: [OrderItemInput!]!) {
    placeOrder(userId: $userId, items: $items) {
      id
      status
      total
    }
  }
`;
