/**
 * E2E journey test — TesteManuel e-commerce
 * Testa toda a jornada do usuário sem depender do MCP Playwright.
 *
 * Uso: node e2e-journey.mjs
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE = 'http://localhost:3000';
const ARTIFACTS = '/Volumes/m2/Projetos/TesteManuel/e2e-artifacts';

mkdirSync(ARTIFACTS, { recursive: true });

const results = [];

function pass(name, detail = '') {
  results.push({ status: 'PASS', name, detail });
  console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`);
}

function fail(name, detail = '') {
  results.push({ status: 'FAIL', name, detail });
  console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
}

function warn(name, detail = '') {
  results.push({ status: 'WARN', name, detail });
  console.log(`  ⚠️  ${name}${detail ? ' — ' + detail : ''}`);
}

async function shot(page, name) {
  await page.screenshot({ path: `${ARTIFACTS}/${name}.png`, fullPage: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. HOMEPAGE
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 1. Homepage');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await shot(page, '01-homepage');

    if (await page.locator('header').isVisible()) pass('Navbar visível');
    else fail('Navbar não encontrada');

    if (await page.getByText('ManuelShop').first().isVisible()) pass('Logo ManuelShop visível');
    else fail('Logo ausente');

    if (await page.getByText('Compre o que').first().isVisible()) pass('Hero section renderizado');
    else fail('Hero section ausente');

    if (await page.getByRole('link', { name: /ver produtos/i }).first().isVisible()) pass('Botão "Ver produtos" visível');
    else fail('CTA principal ausente');

    if (await page.getByText('Frete grátis').first().isVisible()) pass('Features bar visível');
    else warn('Features bar não encontrada');

    if (await page.getByText('Eletrônicos').first().isVisible()) pass('Seção de categorias visível');
    else warn('Categorias não encontradas');

    if (await page.getByText('docker-compose up').first().isVisible()) {
      warn('Produtos em destaque: API desconectada (backend não está rodando)');
    } else {
      const n = await page.locator('.group.relative.bg-white.rounded-2xl').count();
      if (n > 0) pass(`Produtos em destaque carregados (${n} cards)`);
      else warn('Nenhum produto e sem mensagem de API');
    }

    if (await page.getByText('Primeira compra?').first().isVisible()) pass('Banner CTA visível');
    else warn('Banner CTA ausente');

    // ═══════════════════════════════════════════════════════════════════════
    // 2. NAVBAR — links
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 2. Navegação pela Navbar');

    if (await page.locator('nav').getByRole('link', { name: /produtos/i }).isVisible()) pass('Link "Produtos" na navbar');
    else fail('Link "Produtos" ausente');

    if (await page.locator('nav').getByRole('link', { name: /blog/i }).isVisible()) pass('Link "Blog" na navbar');
    else warn('Link "Blog" ausente');

    if (await page.locator('nav').getByRole('link', { name: /meus pedidos/i }).isVisible()) pass('Link "Meus Pedidos" na navbar');
    else fail('Link "Meus Pedidos" ausente');

    // ═══════════════════════════════════════════════════════════════════════
    // 3. PÁGINA DE PRODUTOS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 3. Página de Produtos');
    await page.goto(`${BASE}/products`, { waitUntil: 'networkidle' });
    await shot(page, '02-products-page');

    if (await page.getByRole('heading', { name: /todos os produtos/i }).isVisible()) pass('Título "Todos os produtos" visível');
    else fail('Título ausente na página de produtos');

    const searchInput = page.getByPlaceholder(/buscar produtos/i);
    if (await searchInput.isVisible()) pass('Campo de busca presente');
    else fail('Campo de busca ausente');

    if (await page.locator('select').isVisible()) pass('Select de ordenação presente');
    else warn('Select de ordenação ausente');

    if (await page.getByRole('button', { name: /^todos$/i }).isVisible()) pass('Filter tags visíveis');
    else warn('Filter tags ausentes');

    if (await page.getByText(/docker-compose up/i).first().isVisible()) {
      warn('Produtos: API desconectada — error state correto');
    } else {
      const n = await page.locator('.group.relative.bg-white.rounded-2xl').count();
      if (n > 0) pass(`${n} produtos carregados na listagem`);
      else warn('Zero produtos e sem mensagem de erro');
    }

    await searchInput.fill('iPhone');
    await page.waitForTimeout(300);
    await shot(page, '03-products-search');
    pass('Campo de busca aceita input');
    await searchInput.clear();

    const filterStock = page.getByRole('button', { name: /em estoque/i });
    if (await filterStock.isVisible()) {
      await filterStock.click();
      await page.waitForTimeout(200);
      await shot(page, '04-products-filter');
      pass('Filtro "Em estoque" clicável');
      await page.getByRole('button', { name: /^todos$/i }).click();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. RESPONSIVIDADE MOBILE
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 4. Responsividade Mobile');
    const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const mobilePage = await mobileCtx.newPage();
    await mobilePage.goto(BASE, { waitUntil: 'networkidle' });
    await mobilePage.screenshot({ path: `${ARTIFACTS}/05-mobile-home.png` });
    pass('Homepage renderiza em viewport 375px');

    const menuBtn = mobilePage.getByRole('button', { name: /abrir menu/i });
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await mobilePage.waitForTimeout(300);
      const mobileNav = mobilePage.locator('.md\\:hidden.border-t');
      if (await mobileNav.isVisible()) pass('Menu mobile abre corretamente');
      else warn('Drawer mobile não visível após click');
      await mobilePage.screenshot({ path: `${ARTIFACTS}/06-mobile-menu-open.png` });
    } else {
      warn('Botão menu mobile não encontrado pelo aria-label');
    }
    await mobileCtx.close();

    // ═══════════════════════════════════════════════════════════════════════
    // 5. PÁGINA DE LOGIN
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 5. Página de Login');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await shot(page, '07-login-page');

    // Seletores corretos da login-client.tsx
    const emailInput = page.getByPlaceholder('seu@email.com');
    const passwordInput = page.getByPlaceholder('••••••••');
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible()) pass('Campo e-mail presente');
    else fail('Campo e-mail ausente');

    if (await passwordInput.isVisible()) pass('Campo senha presente');
    else fail('Campo senha ausente — placeholder não encontrado');

    if (await submitBtn.isVisible()) pass('Botão de submit presente');
    else fail('Botão de submit ausente');

    // Validação: campos vazios
    await submitBtn.click();
    await page.waitForTimeout(600);
    const fillError = page.getByText(/preencha todos os campos/i);
    if (await fillError.isVisible()) pass('Validação de campos obrigatórios funciona');
    else warn('Sem mensagem para campos vazios');

    // Submit com credenciais inválidas
    await emailInput.fill('teste@email.com');
    await passwordInput.fill('senha123');
    await submitBtn.click();
    await page.waitForTimeout(3000);
    await shot(page, '08-login-attempt');

    const loginErr = page.getByText(/erro|error|inválid|falhou|preencha|usuário|credencial/i).first();
    if (await loginErr.isVisible()) pass('Feedback de erro de login exibido');
    else warn('Nenhum feedback de erro visível após login inválido');

    // Testar toggle login/cadastro
    const registerTab = page.getByRole('button', { name: /cadastrar/i }).first();
    if (await registerTab.isVisible()) {
      await registerTab.click();
      await page.waitForTimeout(200);
      const nameInput = page.getByPlaceholder('Seu nome');
      if (await nameInput.isVisible()) pass('Modo cadastro: campo "Nome" aparece');
      else warn('Modo cadastro: campo Nome não apareceu');
      await shot(page, '08b-register-mode');
      // Voltar para login
      await page.getByRole('button', { name: /^entrar$/i }).first().click();
    } else {
      warn('Tab de cadastro não encontrada');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. PEDIDOS — gate de autenticação
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 6. Pedidos — gate de autenticação');
    await page.goto(`${BASE}/orders`, { waitUntil: 'networkidle' });
    await shot(page, '09-orders-unauthenticated');

    if (await page.getByText(/faça login|autenticado/i).first().isVisible()) pass('Gate de auth em /orders funciona');
    else fail('/orders deveria exigir login mas não exibe aviso');

    if (await page.getByRole('link', { name: /entrar na conta/i }).first().isVisible()) pass('Link "Entrar na conta" em /orders');
    else warn('Link de login ausente em /orders');

    // ═══════════════════════════════════════════════════════════════════════
    // 7. BLOG
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 7. Blog');
    await page.goto(`${BASE}/blog`, { waitUntil: 'networkidle' });
    await shot(page, '10-blog-page');
    if (await page.locator('main').isVisible()) pass('Blog page carrega sem crash');
    else warn('Blog: main não encontrado');

    // ═══════════════════════════════════════════════════════════════════════
    // 8. 404
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 8. Página 404');
    await page.goto(`${BASE}/rota-inexistente-xyz`, { waitUntil: 'networkidle' });
    await shot(page, '11-not-found');
    if (await page.getByText(/404|não encontrad|not found/i).first().isVisible()) pass('Página 404 funciona');
    else warn('404 não detectada — pode estar usando redirect');

    // ═══════════════════════════════════════════════════════════════════════
    // 9. FOOTER
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 9. Footer');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await shot(page, '12-footer');
    if (await page.locator('footer').isVisible()) pass('Footer presente');
    else warn('Footer não encontrado');

    // ═══════════════════════════════════════════════════════════════════════
    // 10. JORNADA: CTA → Produtos → Carrinho
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 10. Jornada: CTA → Produtos → Carrinho');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const ctaLink = page.getByRole('link', { name: /ver produtos/i }).first();
    await ctaLink.click();
    await page.waitForURL(`${BASE}/products`);
    pass('CTA "Ver produtos" navega para /products');

    await page.goto(BASE, { waitUntil: 'networkidle' });
    const cartBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
    const cartCount = page.locator('span.absolute.-top-1.-right-1');
    if (!(await cartCount.isVisible())) pass('Carrinho inicia vazio (sem badge)');
    else warn('Badge de carrinho visível com carrinho vazio');

    // ═══════════════════════════════════════════════════════════════════════
    // 11. CONSOLE ERRORS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📍 11. Console Errors');
    const expected = ['ApolloError', 'Failed to fetch', 'NetworkError', 'ECONNREFUSED', 'network', 'status of 400', 'status of 404', 'status of 500'];
    const unexpected = consoleErrors.filter((e) => !expected.some((pat) => e.includes(pat)));
    if (unexpected.length === 0) pass('Nenhum erro de console inesperado');
    else warn(`${unexpected.length} erro(s) inesperados`, unexpected.slice(0, 3).join(' | '));

  } finally {
    await browser.close();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RELATÓRIO FINAL
  // ═══════════════════════════════════════════════════════════════════════
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const total = results.length;

  console.log('\n' + '═'.repeat(62));
  console.log('  RELATÓRIO E2E — TesteManuel E-Commerce');
  console.log('═'.repeat(62));
  console.log(`  Total: ${total}  |  ✅ ${passed}  |  ❌ ${failed}  |  ⚠️  ${warned}`);
  console.log('═'.repeat(62));

  if (failed > 0) {
    console.log('\n  ❌ FALHAS:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`    • ${r.name}${r.detail ? ': ' + r.detail : ''}`));
  }
  if (warned > 0) {
    console.log('\n  ⚠️  AVISOS:');
    results.filter(r => r.status === 'WARN').forEach(r => console.log(`    • ${r.name}${r.detail ? ': ' + r.detail : ''}`));
  }

  console.log(`\n  Screenshots: ${ARTIFACTS}/`);
  writeFileSync(`${ARTIFACTS}/report.json`, JSON.stringify({ passed, failed, warned, total, results }, null, 2));

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('\nErro fatal no E2E:', err.message);
  process.exit(1);
});
