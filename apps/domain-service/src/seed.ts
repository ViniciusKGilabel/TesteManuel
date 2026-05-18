import 'reflect-metadata';
import { Pool } from 'pg';
import { PostgresProductRepository } from './infrastructure/postgres/ProductRepository';
import { CreateProductHandler } from './application/handlers/CreateProductHandler';
import { CreateProductCommand } from './application/commands/CreateProductCommand';

const PRODUCTS: CreateProductCommand[] = [
  new CreateProductCommand('iPhone 15 Pro', 'Smartphone Apple com chip A17 Pro, câmera de 48MP e tela Super Retina XDR de 6,1"', 7999.99, 15, 'BRL'),
  new CreateProductCommand('MacBook Air M3', 'Notebook ultrafino com chip M3, 8GB de memória unificada, SSD 256GB e até 18h de bateria', 9499.00, 8, 'BRL'),
  new CreateProductCommand('Samsung Galaxy S24 Ultra', 'Smartphone Android com IA Galaxy, S Pen integrada, câmera de 200MP e tela AMOLED 6,8"', 6999.90, 22, 'BRL'),
  new CreateProductCommand('AirPods Pro (2ª geração)', 'Fones in-ear com cancelamento ativo de ruído, áudio espacial adaptativo e case MagSafe USB-C', 1999.00, 35, 'BRL'),
  new CreateProductCommand('iPad Air M2 11"', 'Tablet com chip M2, tela Liquid Retina 11", compatível com Apple Pencil Pro e Magic Keyboard Folio', 5299.00, 12, 'BRL'),
  new CreateProductCommand('Sony WH-1000XM5', 'Headphone over-ear com cancelamento de ruído líder de mercado, 30h de bateria e carga rápida', 2199.90, 18, 'BRL'),
  new CreateProductCommand('Dell XPS 15 (2024)', 'Notebook premium com Intel Core Ultra 9, NVIDIA RTX 4070, 32GB RAM e tela OLED 3,5K de 15,6"', 14999.00, 5, 'BRL'),
  new CreateProductCommand('Apple Watch Series 10', 'Smartwatch com a maior tela já vista num Apple Watch, monitoramento avançado de saúde e bateria de todo o dia', 3799.00, 27, 'BRL'),
  new CreateProductCommand('Nintendo Switch 2', 'Console híbrido de nova geração com tela LCD maior, suporte a 4K na TV e Joy-Con aprimorados com vibração HD', 4299.00, 3, 'BRL'),
  new CreateProductCommand('Logitech MX Master 3S', 'Mouse sem fio premium com scroll MagSpeed silencioso, sensor 8K DPI e conexão para até 3 dispositivos', 649.90, 50, 'BRL'),
];

async function seed(): Promise<void> {
  const connectionString =
    process.env.DATABASE_URL ?? 'postgresql://domain_user:domain_pass@localhost:5433/domain_db';

  const pool = new Pool({ connectionString });
  const repo = new PostgresProductRepository(pool);

  await repo.migrate();

  const existing = await repo.count();
  if (existing > 0) {
    console.log(`[seed] ${existing} produto(s) já existem — nenhuma alteração.`);
    await pool.end();
    return;
  }

  const handler = new CreateProductHandler(repo);
  for (const cmd of PRODUCTS) {
    const dto = await handler.handle(cmd);
    console.log(`[seed] ✓ ${dto.name} — R$ ${dto.price.toFixed(2)} | estoque: ${dto.stock}`);
  }

  console.log(`\n[seed] ${PRODUCTS.length} produtos inseridos com sucesso.`);
  await pool.end();
}

seed().catch((err) => {
  console.error('[seed] erro fatal:', err);
  process.exit(1);
});
