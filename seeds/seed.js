// seeds/seed.js
// Idempotent-ish demo data: safe to re-run against a fresh database.
// Run AFTER migrations: node seeds/seed.js
//
// NOTE: pdf_path values below point at placeholder filenames. Drop real,
// legally-usable (public-domain) PDF files at these paths under your
// configured PDF_STORAGE_ROOT before testing the reader end-to-end —
// this script only seeds the database rows, not the binary files.

const bcrypt = require('bcrypt');
const pool = require('../src/config/db');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Roles (idempotent — already inserted by migration 001, kept here defensively) ---
    await client.query(`
      INSERT INTO roles (name) VALUES ('user'), ('admin')
      ON CONFLICT (name) DO NOTHING;
    `);
    const { rows: roles } = await client.query('SELECT id, name FROM roles');
    const roleId = Object.fromEntries(roles.map((r) => [r.name, r.id]));

    // --- Demo accounts ---
    const adminPasswordHash = await bcrypt.hash('AdminPass#123', 12);
    const userPasswordHash = await bcrypt.hash('UserPass#123', 12);

    const { rows: adminRows } = await client.query(
      `INSERT INTO users (name, email, password_hash, role_id)
       VALUES ('Wisdom Admin', 'admin@wisdom.local', $1, $2)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [adminPasswordHash, roleId.admin]
    );
    const adminId = adminRows[0].id;

    const { rows: userRows } = await client.query(
      `INSERT INTO users (name, email, password_hash, role_id)
       VALUES ('Demo Reader', 'reader@wisdom.local', $1, $2)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [userPasswordHash, roleId.user]
    );
    const userId = userRows[0].id;

    const { rows: pendingUserRows } = await client.query(
      `INSERT INTO users (name, email, password_hash, role_id)
       VALUES ('Pending Applicant', 'pending@wisdom.local', $1, $2)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [userPasswordHash, roleId.user]
    );
    const pendingUserId = pendingUserRows[0].id;

    // --- Categories ---
    const categoryNames = [
      ['Fiction', 'fiction'],
      ['Science', 'science'],
      ['History', 'history'],
      ['Philosophy', 'philosophy'],
      ['Self-Development', 'self-development'],
    ];
    const categoryIds = {};
    for (const [name, slug] of categoryNames) {
      const { rows } = await client.query(
        `INSERT INTO categories (name, slug) VALUES ($1, $2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [name, slug]
      );
      categoryIds[slug] = rows[0].id;
    }

    // --- Books (public-domain sample titles; page_count is illustrative —
    //     replace with the real extracted count when you upload actual PDFs) ---
    const books = [
      {
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        description: 'A classic of English literature (public domain).',
        category: 'fiction',
        pdf_path: 'books/pride-and-prejudice.pdf',
        cover_path: 'covers/pride-and-prejudice.jpg',
        page_count: 279,
      },
      {
        title: 'The Origin of Species',
        author: 'Charles Darwin',
        description: 'Foundational work of evolutionary biology (public domain).',
        category: 'science',
        pdf_path: 'books/origin-of-species.pdf',
        cover_path: 'covers/origin-of-species.jpg',
        page_count: 502,
      },
      {
        title: 'Meditations',
        author: 'Marcus Aurelius',
        description: 'Stoic philosophy reflections (public domain).',
        category: 'philosophy',
        pdf_path: 'books/meditations.pdf',
        cover_path: 'covers/meditations.jpg',
        page_count: 168,
      },
      {
        title: 'The Art of War',
        author: 'Sun Tzu',
        description: 'Classic strategy text (public domain).',
        category: 'self-development',
        pdf_path: 'books/the-art-of-war.pdf',
        cover_path: 'covers/the-art-of-war.jpg',
        page_count: 88,
      },
    ];

    const bookIds = {};
    for (const b of books) {
      const { rows } = await client.query(
        `INSERT INTO books (title, author, description, category_id, cover_path, pdf_path, page_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [b.title, b.author, b.description, categoryIds[b.category], b.cover_path, b.pdf_path, b.page_count]
      );
      bookIds[b.title] = rows[0].id;
    }

    // --- Subscription plan ---
    const { rows: planRows } = await client.query(
      `INSERT INTO subscription_plans (name, price, duration_days, benefits)
       VALUES ('Wisdom Monthly', 999.00, 30, 'Unlimited access to every book in the library for 30 days.')
       RETURNING id`
    );
    const planId = planRows[0].id;

    // --- Sample payment (approved) + resulting active subscription for demo user ---
    await client.query(
      `INSERT INTO payments (user_id, plan_id, method, reference_number, amount, status, reviewed_by, reviewed_at)
       VALUES ($1, $2, 'easypaisa', 'EP-DEMO-0001', 999.00, 'approved', $3, now())`,
      [userId, planId, adminId]
    );
    await client.query(
      `INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status)
       VALUES ($1, $2, now(), now() + interval '30 days', 'active')`,
      [userId, planId]
    );

    await client.query(
      `INSERT INTO payments (user_id, plan_id, method, reference_number, amount, status)
       VALUES ($1, $2, 'bank_transfer', 'BT-DEMO-0002', 999.00, 'pending')`,
      [pendingUserId, planId]
    );

    // --- Sample book_access: one ACTIVE 20-day grant, one EXPIRED grant ---
    await client.query(
      `INSERT INTO book_access (user_id, book_id, granted_by, start_date, end_date, status)
       VALUES ($1, $2, $3, now(), now() + interval '20 days', 'active')`,
      [userId, bookIds['The Art of War'], adminId]
    );
    await client.query(
      `INSERT INTO book_access (user_id, book_id, granted_by, start_date, end_date, status)
       VALUES ($1, $2, $3, now() - interval '25 days', now() - interval '5 days', 'expired')`,
      [userId, bookIds['Meditations'], adminId]
    );

    // --- Sample reading progress ---
    await client.query(
      `INSERT INTO reading_progress (user_id, book_id, last_page, percent)
       VALUES ($1, $2, 37, ROUND(37.0 / 88 * 100, 2))
       ON CONFLICT (user_id, book_id) DO UPDATE SET last_page = EXCLUDED.last_page, percent = EXCLUDED.percent`,
      [userId, bookIds['The Art of War']]
    );

    await client.query('COMMIT');
    console.log('Seed complete.');
    console.log('Demo admin login: admin@wisdom.local / AdminPass#123');
    console.log('Demo user login:  reader@wisdom.local / UserPass#123');
    console.log('Pending-payment demo user: pending@wisdom.local / UserPass#123 (has a payment awaiting admin review)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
