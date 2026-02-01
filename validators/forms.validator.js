import Joi from 'joi';

export const biyanaSchema = Joi.object({
  customerId: Joi.string()
    .required()
    .messages({
      'any.required': 'Customer ID is required',
    }),
  
  plotId: Joi.string()
    .required()
    .messages({
      'any.required': 'Plot ID is required',
    }),
  
  tokenAmount: Joi.number()
    .positive()
    .max(999999999)
    .required()
    .messages({
      'number.base': 'Token amount must be a number',
      'number.positive': 'Token amount must be positive',
      'number.max': 'Token amount is too large',
      'any.required': 'Token amount is required',
    }),
  
  downPayment: Joi.number()
    .min(0)
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Down payment must be a number',
      'number.min': 'Down payment cannot be negative',
    }),
  
  pricePerMarla: Joi.number()
    .positive()
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Price per marla must be a number',
      'number.positive': 'Price per marla must be positive',
    }),
  
  totalAmount: Joi.number()
    .positive()
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Total amount must be a number',
      'number.positive': 'Total amount must be positive',
    }),
  
  totalRemaining: Joi.number()
    .positive()
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Total remaining must be a number',
      'number.positive': 'Total remaining must be positive',
    }),
  
  lastInstallmentDate: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'Last installment date must be a string',
    }),
  
  monthlyInstallments: Joi.number()
    .integer()
    .min(0)
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Monthly installments must be a number',
      'number.integer': 'Monthly installments must be an integer',
    }),
  
  quarterlyInstallments: Joi.number()
    .integer()
    .min(0)
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Quarterly installments must be a number',
      'number.integer': 'Quarterly installments must be an integer',
    }),
  
  agreementDuration: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'Agreement duration must be a string',
    }),
  
  monthlyInstallmentAmount: Joi.number()
    .positive()
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Monthly installment amount must be a number',
      'number.positive': 'Monthly installment amount must be positive',
    }),
  
  quarterlyInstallmentAmount: Joi.number()
    .positive()
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Quarterly installment amount must be a number',
      'number.positive': 'Quarterly installment amount must be positive',
    }),
  
  installmentType: Joi.string()
    .valid('MONTHLY_ONLY', 'MONTHLY_AND_QUARTERLY')
    .optional()
    .default('MONTHLY_ONLY')
    .messages({
      'any.only': 'Installment type must be MONTHLY_ONLY or MONTHLY_AND_QUARTERLY',
    }),
  
  date: Joi.date()
    .required()
    .messages({
      'date.base': 'Invalid date format',
      'any.required': 'Date is required',
    }),
  
  notes: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Notes must not exceed 500 characters',
    }),
});

export const saleAgreementSchema = Joi.object({
  customerId: Joi.string()
    .required()
    .messages({
      'any.required': 'Customer ID is required',
    }),
  
  plotId: Joi.string()
    .required()
    .messages({
      'any.required': 'Plot ID is required',
    }),
  
  totalAmount: Joi.number()
    .positive()
    .max(999999999)
    .required()
    .messages({
      'number.base': 'Total amount must be a number',
      'number.positive': 'Total amount must be positive',
      'number.max': 'Total amount is too large',
      'any.required': 'Total amount is required',
    }),
  
  downPayment: Joi.number()
    .positive()
    .max(Joi.ref('totalAmount'))
    .required()
    .messages({
      'number.base': 'Down payment must be a number',
      'number.positive': 'Down payment must be positive',
      'number.max': 'Down payment cannot exceed total amount',
      'any.required': 'Down payment is required',
    }),
  
  paymentPlan: Joi.string()
    .valid('INSTALLMENT_12', 'INSTALLMENT_24', 'INSTALLMENT_36', 'FULL_PAYMENT')
    .required()
    .messages({
      'any.only': 'Invalid payment plan',
      'any.required': 'Payment plan is required',
    }),
  
  installmentMonths: Joi.number()
    .integer()
    .min(0)
    .max(240)
    .optional()
    .messages({
      'number.base': 'Installment months must be a number',
      'number.integer': 'Installment months must be a whole number',
      'number.min': 'Installment months must be at least 0',
      'number.max': 'Installment months cannot exceed 240 (20 years)',
    }),
  
  agreementDate: Joi.date()
    .required()
    .messages({
      'date.base': 'Invalid agreement date',
      'any.required': 'Agreement date is required',
    }),
  
  possessionDate: Joi.date()
    .optional()
    .allow(null)
    .messages({
      'date.base': 'Invalid possession date',
    }),
  
  terms: Joi.string()
    .max(1000)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Terms must not exceed 1000 characters',
    }),
  
  notes: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Notes must not exceed 500 characters',
    }),
});

export const paymentSchema = Joi.object({
  saleAgreementId: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'any.required': 'Sale agreement ID is required',
    }),
  
  customerId: Joi.string()
    .required()
    .messages({
      'any.required': 'Customer ID is required',
    }),
  
  plotId: Joi.string()
    .required()
    .messages({
      'any.required': 'Plot ID is required',
    }),
  
  amount: Joi.number()
    .positive()
    .max(999999999)
    .required()
    .messages({
      'number.base': 'Amount must be a number',
      'number.positive': 'Amount must be positive',
      'number.max': 'Amount is too large',
      'any.required': 'Amount is required',
    }),
  
  paymentDate: Joi.date()
    .max('now')
    .optional()
    .messages({
      'date.base': 'Invalid payment date',
      'date.max': 'Payment date cannot be in the future',
    }),
  
  date: Joi.date()
    .max('now')
    .optional()
    .messages({
      'date.base': 'Invalid date',
      'date.max': 'Date cannot be in the future',
    }),
  
  paymentMethod: Joi.string()
    .valid('BANK_DEPOSIT', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE')
    .required()
    .messages({
      'any.only': 'Payment method must be BANK_DEPOSIT, BANK_TRANSFER, CHEQUE, or ONLINE',
      'any.required': 'Payment method is required',
    }),
  
  chequeNumber: Joi.string()
    .when('paymentMethod', {
      is: 'CHEQUE',
      then: Joi.required(),
      otherwise: Joi.optional().allow('', null),
    })
    .messages({
      'any.required': 'Cheque number is required when payment method is CHEQUE',
    }),
  
  bankName: Joi.string()
    .when('paymentMethod', {
      is: Joi.valid('BANK_TRANSFER', 'CHEQUE'),
      then: Joi.required(),
      otherwise: Joi.optional().allow('', null),
    })
    .messages({
      'any.required': 'Bank name is required for bank transfers and cheques',
    }),
  
  transactionId: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'Transaction ID must be a string',
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Description must not exceed 500 characters',
    }),
  
  type: Joi.string()
    .valid('RECEIPT', 'PAYMENT')
    .optional()
    .messages({
      'any.only': 'Type must be RECEIPT or PAYMENT',
    }),
  
  formType: Joi.string()
    .optional()
    .messages({
      'string.base': 'Form type must be a valid string',
    }),
  
  notes: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Notes must not exceed 500 characters',
    }),
});
