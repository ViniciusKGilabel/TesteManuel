import { gql } from '@apollo/client';

export const GET_POSTS = gql`
  query GetPosts($first: Int) {
    posts(first: $first) {
      nodes {
        databaseId
        title
        excerpt
        slug
        date
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_POST = gql`
  query GetPost($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      databaseId
      title
      content
      slug
      date
    }
  }
`;
