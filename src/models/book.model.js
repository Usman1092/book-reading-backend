// src/models/book.model.js

const pool = require('../config/db');

const SORTABLE_COLUMNS = {
  newest: 'b.created_at DESC',
  oldest: 'b.created_at ASC',
  title_asc: 'b.title ASC',
  title_desc: 'b.title DESC',
};

// Public-facing list: only active books, with search/filter/sort/pagination.
// Never exposes pdf_path — that's an internal detail, not client-facing data.
async function listPublic({ search, categoryId, sort, page = 1, pageSize = 20 }) {
  const conditions = ['b.is_active = true'];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(b.title ILIKE $${params.length} OR b.author ILIKE $${params.length})`);
  }
  if (categoryId) {
    params.push(categoryId);
    conditions.push(`b.category_id = $${params.length}`);
  }

  const orderBy = SORTABLE_COLUMNS[sort] || SORTABLE_COLUMNS.newest;
  const offset = (Math.max(page, 1) - 1) * pageSize;

  params.push(pageSize, offset);
  const limitParamIdx = params.length - 1;
  const offsetParamIdx = params.length;

  const { rows } = await pool.query(
    `SELECT b.id, b.title, b.author, b.description, b.cover_path, b.page_count,
            b.created_at, c.id AS category_id, c.name AS category_name
     FROM books b
     LEFT JOIN categories c ON c.id = b.category_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ${orderBy}
     LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
    params
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM books b WHERE ${conditions.join(' AND ')}`,
    params.slice(0, params.length - 2)
  );

  return { books: rows, total: Number(countRows[0].count), page, pageSize };
}

async function findByIdPublic(id) {
  const { rows } = await pool.query(
    `SELECT b.id, b.title, b.author, b.description, b.cover_path, b.page_count,
            b.is_active, b.created_at, c.id AS category_id, c.name AS category_name
     FROM books b LEFT JOIN categories c ON c.id = b.category_id
     WHERE b.id = $1`,
    [id]
  );
  return rows[0] || null;
}

// Admin-facing: includes pdf_path, is_active, etc.
async function findByIdAdmin(id) {
  const { rows } = await pool.query(
    `SELECT b.*, c.name AS category_name
     FROM books b LEFT JOIN categories c ON c.id = b.category_id
     WHERE b.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ title, author, description, categoryId, coverPath, pdfPath, pageCount }) {
  const { rows } = await pool.query(
    `INSERT INTO books (title, author, description, category_id, cover_path, pdf_path, page_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [title, author, description, categoryId || null, coverPath, pdfPath, pageCount]
  );
  return rows[0];
}

async function update(id, fields) {
  const allowed = ['title', 'author', 'description', 'category_id', 'cover_path', 'pdf_path', 'page_count', 'is_active'];
  const setClauses = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      params.push(fields[key]);
      setClauses.push(`${key} = $${params.length}`);
    }
  }
  if (setClauses.length === 0) return findByIdAdmin(id);

  params.push(id);
  const { rows } = await pool.query(
    `UPDATE books SET ${setClauses.join(', ')}, updated_at = now()
     WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
}

async function remove(id) {
  await pool.query('DELETE FROM books WHERE id = $1', [id]);
}

module.exports = { listPublic, findByIdPublic, findByIdAdmin, create, update, remove };
