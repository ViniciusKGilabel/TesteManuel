<?php
/**
 * Plugin Name: TesteManuel Internal API
 * Description: Internal stock management endpoint for domain-service. Protected by shared secret.
 */

add_action('rest_api_init', function () {
    register_rest_route('tm/v1', '/stock/update', [
        'methods'             => 'POST',
        'callback'            => 'tm_update_stock',
        'permission_callback' => 'tm_check_internal_secret',
    ]);
});

function tm_check_internal_secret(WP_REST_Request $request): bool {
    $secret = defined('TM_INTERNAL_SECRET') ? TM_INTERNAL_SECRET : getenv('WC_INTERNAL_SECRET');
    if (empty($secret)) return false;
    return hash_equals($secret, (string) $request->get_header('X-Internal-Secret'));
}

/**
 * Update stock for a product.
 *
 * Body: { "product_id": "11", "delta": -5 }
 * delta > 0 = add stock, delta < 0 = remove stock
 */
function tm_update_stock(WP_REST_Request $request): WP_REST_Response {
    $product_id = (int) $request->get_param('product_id');
    $delta      = (int) $request->get_param('delta');

    if (!$product_id || $delta === 0) {
        return new WP_REST_Response(['error' => 'product_id and non-zero delta required'], 400);
    }

    $product = wc_get_product($product_id);
    if (!$product) {
        return new WP_REST_Response(['error' => 'product not found'], 404);
    }

    $current = (int) $product->get_stock_quantity();
    $new_qty  = $current + $delta;

    if ($new_qty < 0) {
        return new WP_REST_Response(['error' => 'insufficient stock', 'available' => $current], 409);
    }

    wc_update_product_stock($product, $new_qty, 'set');

    return new WP_REST_Response([
        'product_id'   => $product_id,
        'previous_qty' => $current,
        'new_qty'      => $new_qty,
    ], 200);
}

// Register secret from env so it's available as a constant
add_action('init', function () {
    $secret = getenv('WC_INTERNAL_SECRET');
    if ($secret && !defined('TM_INTERNAL_SECRET')) {
        define('TM_INTERNAL_SECRET', $secret);
    }
});
