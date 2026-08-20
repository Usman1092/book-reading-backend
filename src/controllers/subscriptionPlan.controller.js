// src/controllers/subscriptionPlan.controller.js

const planModel = require('../models/subscriptionPlan.model');

class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.status = 404;
  }
}

async function listPublic(req, res) {
  const plans = await planModel.listActive();
  res.json({ plans });
}

async function listAdmin(req, res) {
  const plans = await planModel.listAll();
  res.json({ plans });
}

async function create(req, res) {
  const { name, price, durationDays, benefits } = req.body;
  const plan = await planModel.create({ name, price, durationDays, benefits });
  res.status(201).json({ plan });
}

async function update(req, res) {
  const existing = await planModel.findById(req.params.id);
  if (!existing) throw new NotFoundError('Plan not found.');

  const { name, price, durationDays, benefits, isActive } = req.body;
  const plan = await planModel.update(req.params.id, { name, price, durationDays, benefits, isActive });
  res.json({ plan });
}

module.exports = { listPublic, listAdmin, create, update };
