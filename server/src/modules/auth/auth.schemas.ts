import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Пароль має містити щонайменше 8 символів')
  .max(72, 'Пароль занадто довгий');

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s()-]{9,20}$/, 'Некоректний номер телефону');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Вкажіть ім’я').max(80),
  email: z.string().trim().toLowerCase().email('Некоректний email'),
  phone: phoneSchema.optional().or(z.literal('')),
  password,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Некоректний email'),
  password: z.string().min(1, 'Введіть пароль'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Некоректний email'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Некоректний токен'),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Введіть поточний пароль'),
  newPassword: password,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Вкажіть ім’я').max(80),
  phone: phoneSchema.optional().or(z.literal('')),
  email: z.string().trim().toLowerCase().email('Некоректний email'),
});
