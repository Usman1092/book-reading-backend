// src/models/category.model.js

const pool = require('../config/db');

async function list() {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.slug, c.created_at,
            COUNT(b.id) FILTER (WHERE b.is_active) AS book_count
     FROM categories c
     LEFT JOIN books b ON b.category_id = c.id
     GROUP BY c.id
     ORDER BY c.name ASC`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findBySlug(slug) {
  const { rows } = await pool.query('SELECT * FROM categories WHERE slug = $1', [slug]);
  return rows[0] || null;
}

async function create({ name, slug }) {
  const { rows } = await pool.query(
    'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING *',
    [name, slug]
  );
  return rows[0];
}

async function update(id, { name, slug }) {
  const { rows } = await pool.query(
    `UPDATE categories SET name = $1, slug = $2, updated_at = now()
     WHERE id = $3 RETURNING *`,
    [name, slug, id]
  );
  return rows[0] || null;
}

async function remove(id) {
  await pool.query('DELETE FROM categories WHERE id = $1', [id]);
}

module.exports = { list, findById, findBySlug, create, update, remove };
