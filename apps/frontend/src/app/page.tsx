export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-4">E-Commerce Platform</h1>
      <p className="text-gray-600">
        Powered by GraphQL Federation, DDD, and Next.js
      </p>
      <nav className="mt-8 flex gap-4">
        <a href="/products" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Products
        </a>
        <a href="/orders" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          My Orders
        </a>
      </nav>
    </main>
  );
}
