// src/utils/validators.js
const { body, validationResult } = require('express-validator');

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Name must be 2-150 characters.'),
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/\d/)
    .withMessage('Password must contain at least one number.'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

const forgotPasswordRules = [
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
];

const resetPasswordRules = [
  body('token').notEmpty().withMessage('Reset token is required.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/\d/)
    .withMessage('Password must contain at least one number.'),
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
}

module.exports = {
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  validate,
};
