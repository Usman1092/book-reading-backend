// src/app.js

require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const bookRoutes = require('./routes/book.routes');
const subscriptionPlanRoutes = require('./routes/subscriptionPlan.routes');
const paymentRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');
const meRoutes = require('./routes/me.routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { COVERS_DIR } = require('./services/storage.service');

const app = express();

// --- Security-relevant middleware ---
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true, // required so the httpOnly refresh cookie is sent/received
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Cover images are non-sensitive marketing assets — served read-only as
// static files. Book PDFs are NEVER mounted this way; they only ever go
// through the authenticated page-streaming endpoint (added in Phase 7).
app.use('/covers', express.static(COVERS_DIR, { maxAge: '1d' }));

// --- Routes ---
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/subscription-plans', subscriptionPlanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/me', meRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
