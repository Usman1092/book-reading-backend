// src/controllers/category.controller.js

const categoryModel = require('../models/category.model');
const bookModel = require('../models/book.model');
const { slugify } = require('../utils/slugify');

class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.status = 404;
  }
}

async function list(req, res) {
  const categories = await categoryModel.list();
  res.json({ categories });
}

async function getOne(req, res) {
  const category = await categoryModel.findById(req.params.id);
  if (!category) throw new NotFoundError('Category not found.');
  res.json({ category });
}

async function create(req, res) {
  const { name } = req.body;
  const slug = slugify(name);

  const existing = await categoryModel.findBySlug(slug);
  if (existing) {
    const err = new Error('A category with this name already exists.');
    err.status = 409;
    throw err;
  }

  const category = await categoryModel.create({ name, slug });
  res.status(201).json({ category });
}

async function update(req, res) {
  const existing = await categoryModel.findById(req.params.id);
  if (!existing) throw new NotFoundError('Category not found.');

  const { name } = req.body;
  const slug = slugify(name);
  const category = await categoryModel.update(req.params.id, { name, slug });
  res.json({ category });
}

async function remove(req, res) {
  const existing = await categoryModel.findById(req.params.id);
  if (!existing) throw new NotFoundError('Category not found.');
  await categoryModel.remove(req.params.id);
  res.json({ message: 'Category deleted.' });
}

module.exports = { list, getOne, create, update, remove };
