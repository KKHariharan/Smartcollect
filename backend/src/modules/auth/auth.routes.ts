import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rate-limit';
import { validate } from '../../middleware/validate';
import * as authController from './auth.controller';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from './auth.dto';

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate a user and receive access/refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);

router.post(
  '/refresh',
  authRateLimiter,
  validate({ body: refreshTokenSchema }),
  authController.refresh,
);

router.post('/logout', authenticate, authController.logout);

router.post(
  '/forgot-password',
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);

router.post(
  '/reset-password',
  authRateLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
);

router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);

/**
 * @openapi
 * /auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get the authenticated user's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile retrieved }
 *       401: { description: Unauthorized }
 *   patch:
 *     tags: [Auth]
 *     summary: Update the authenticated user's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile updated }
 */
router.get('/profile', authenticate, authController.getProfile);
router.patch(
  '/profile',
  authenticate,
  validate({ body: updateProfileSchema }),
  authController.updateProfile,
);

export default router;
