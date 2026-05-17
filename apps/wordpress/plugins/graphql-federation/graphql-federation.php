<?php
/**
 * Plugin Name: GraphQL Federation
 * Description: Adds Apollo Federation directives to WP-GraphQL types for supergraph composition.
 * Version: 1.1.0
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Register the _Any scalar required by the Apollo Federation spec
add_action( 'graphql_register_types', function() {
    register_graphql_scalar( '_Any', [
        'description'  => 'Federation _Any scalar — accepts arbitrary JSON objects',
        'serialize'    => fn( $v ) => $v,
        'parseValue'   => fn( $v ) => $v,
        'parseLiteral' => fn( $ast ) => $ast->value ?? null,
    ]);
});

// Expose federation _service field (required by Apollo Federation spec)
add_action( 'graphql_register_types', function() {
    register_graphql_object_type( '_Service', [
        'description' => 'Federation service descriptor',
        'fields'      => [
            'sdl' => [
                'type'        => 'String',
                'description' => 'Schema Definition Language representation',
            ],
        ],
    ]);

    register_graphql_field( 'RootQuery', '_service', [
        'type'        => '_Service',
        'description' => 'Apollo Federation service SDL',
        'resolve'     => function() {
            return [ 'sdl' => wp_graphql_federation_get_sdl() ];
        },
    ]);
});

// Expose _entities query for federation entity resolution
add_action( 'graphql_register_types', function() {
    register_graphql_union_type( '_Entity', [
        'typeNames'   => [ 'Post', 'Page', 'Category' ],
        'description' => 'Federation entity union',
        'resolveType' => function( $obj ) {
            if ( $obj instanceof \WP_Post ) {
                return $obj->post_type === 'page' ? 'Page' : 'Post';
            }
            if ( $obj instanceof \WP_Term ) {
                return 'Category';
            }
            return null;
        },
    ]);

    register_graphql_field( 'RootQuery', '_entities', [
        'type'        => [ 'list_of' => '_Entity' ],
        'description' => 'Resolve federation entity references',
        'args'        => [
            'representations' => [
                // [_Any!]! per Apollo Federation spec
                'type'        => [ 'list_of' => '_Any' ],
                'description' => 'Entity representation objects (JSON with __typename + key fields)',
            ],
        ],
        'resolve' => function( $root, $args ) {
            $entities = [];
            foreach ( $args['representations'] ?? [] as $repr ) {
                // Apollo Federation passes representations as already-decoded objects (not JSON strings)
                if ( ! is_array( $repr ) || ! isset( $repr['__typename'] ) ) {
                    $entities[] = null;
                    continue;
                }
                // Key is databaseId (WP integer ID), not the Relay global ID
                $db_id = isset( $repr['databaseId'] ) ? intval( $repr['databaseId'] ) : null;
                if ( ! $db_id ) {
                    $entities[] = null;
                    continue;
                }
                switch ( $repr['__typename'] ) {
                    case 'Post':
                    case 'Page':
                        $entities[] = get_post( $db_id );
                        break;
                    case 'Category':
                        $entities[] = get_term( $db_id, 'category' );
                        break;
                    default:
                        $entities[] = null;
                }
            }
            return $entities;
        },
    ]);
});

function wp_graphql_federation_get_sdl(): string {
    return <<<'SDL'
extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

type Query {
  posts(first: Int, after: String): PostConnection
  pages(first: Int, after: String): PageConnection
  categories(first: Int, after: String): CategoryConnection
}

type Post @key(fields: "databaseId") {
  databaseId: Int!
  title: String
  content: String
  slug: String!
  date: String
  excerpt: String
}

type Page @key(fields: "databaseId") {
  databaseId: Int!
  title: String
  content: String
  slug: String!
}

type Category @key(fields: "databaseId") {
  databaseId: Int!
  name: String!
  slug: String!
}

type PostConnection {
  nodes: [Post]
  pageInfo: WPPageInfo
}

type PageConnection {
  nodes: [Page]
  pageInfo: WPPageInfo
}

type CategoryConnection {
  nodes: [Category]
  pageInfo: WPPageInfo
}

type WPPageInfo {
  hasNextPage: Boolean!
  endCursor: String
}
SDL;
}
