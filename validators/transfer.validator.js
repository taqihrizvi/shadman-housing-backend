import { body, param } from 'express-validator';

export const createTransferValidator = [
  body('plotId')
    .notEmpty().withMessage('Plot ID is required')
    .isUUID().withMessage('Invalid plot ID format'),
  
  body('fromCustomerId')
    .notEmpty().withMessage('Current owner customer ID is required')
    .isUUID().withMessage('Invalid customer ID format'),
  
  body('toCustomerId')
    .notEmpty().withMessage('New owner customer ID is required')
    .isUUID().withMessage('Invalid customer ID format'),
  
  body('transferAmount')
    .notEmpty().withMessage('Transfer amount is required')
    .isFloat({ min: 0 }).withMessage('Transfer amount must be a positive number'),
  
  body('transferFee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Transfer fee must be a positive number'),
  
  body('reason')
    .optional()
    .isString().withMessage('Reason must be a string')
    .trim()
];

export const approveTransferValidator = [
  param('id')
    .isUUID().withMessage('Invalid transfer ID format')
];

export const rejectTransferValidator = [
  param('id')
    .isUUID().withMessage('Invalid transfer ID format'),
  
  body('reason')
    .optional()
    .isString().withMessage('Reason must be a string')
    .trim()
];

export const completeTransferValidator = [
  param('id')
    .isUUID().withMessage('Invalid transfer ID format'),
  
  body('newSaleAgreementId')
    .notEmpty().withMessage('New sale agreement ID is required')
    .isUUID().withMessage('Invalid sale agreement ID format')
];
