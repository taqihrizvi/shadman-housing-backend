import Joi from 'joi';

export const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must only contain alphanumeric characters',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username must not exceed 30 characters',
      'any.required': 'Username is required',
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
      'any.required': 'Password is required',
    }),
  
  role: Joi.string()
    .valid('ADMIN', 'MANAGER')
    .default('MANAGER')
    .messages({
      'any.only': 'Role must be either ADMIN or MANAGER',
    }),
  
  fullName: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Full name must be at least 3 characters',
      'string.max': 'Full name must not exceed 100 characters',
      'any.required': 'Full name is required',
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .required()
    .messages({
      'any.required': 'Email or username is required',
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
});
