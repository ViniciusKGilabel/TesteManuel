'use client';

import { useQuery } from '@apollo/client';
import { GET_MY_ORDERS } from '../../graphql/queries/orders';

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function OrdersPage() {
  const userId = 'current-user-id';
  const { data, loading, error } = useQuery<{ orders: Order[] }>(GET_MY_ORDERS, {
    variables: { userId },
  });

  if (loading) return <div className="p-8">Loading orders...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error.message}</div>;

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>
      {data?.orders.length === 0 && (
        <p className="text-gray-600">No orders yet. Start shopping!</p>
      )}
      <div className="space-y-4">
        {data?.orders.map((order) => (
          <div key={order.id} className="border rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-mono text-sm text-gray-500">#{order.id}</p>
                <p className="text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[order.status] || ''}`}>
                {order.status}
              </span>
            </div>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.productId} × {item.quantity}</span>
                  <span>R$ {item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-3 pt-3 flex justify-end">
              <span className="font-bold">Total: R$ {order.total.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
