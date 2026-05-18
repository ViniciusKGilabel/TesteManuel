import { useState, useEffect } from 'react';
import { fetchWooProducts, type WooProduct } from '@/lib/woocommerce';

interface UseProductsResult {
  products: WooProduct[];
  loading: boolean;
  error: boolean;
}

export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchWooProducts()
      .then((data) => {
        if (data.length === 0) setError(true);
        setProducts(data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return { products, loading, error };
}
