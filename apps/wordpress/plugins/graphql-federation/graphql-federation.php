<?php
/**
 * Plugin Name: GraphQL Federation
 * Description: Adds Apollo Federation directives to WP-GraphQL types for supergraph composition.
 * Version: 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

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
                'type'        => [ 'list_of' => 'String' ],
                'description' => 'JSON-encoded entity representations',
            ],
        ],
        'resolve' => function( $root, $args ) {
            $entities = [];
            foreach ( $args['representations'] ?? [] as $repr_json ) {
                $repr = json_decode( $repr_json, true );
                if ( ! $repr || ! isset( $repr['__typename'], $repr['id'] ) ) {
                    $entities[] = null;
                    continue;
                }
                $id = intval( $repr['id'] );
                switch ( $repr['__typename'] ) {
                    case 'Post':
                    case 'Page':
                        $entities[] = get_post( $id );
                        break;
                    case 'Category':
                        $entities[] = get_term( $id, 'category' );
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
type Post @key(fields: "id") {
  id: ID!
  title: String!
  content: String!
  slug: String!
  date: String!
}

type Page @key(fields: "id") {
  id: ID!
  title: String!
  content: String!
  slug: String!
}

type Category @key(fields: "id") {
  id: ID!
  name: String!
  slug: String!
}
SDL;
}
