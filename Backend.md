================================================================================
BACKEND VALIDATOR FIX - Account Number & Slip Number Fields
================================================================================

FILE TO UPDATE:
validators/forms.validator.js

LOCATION:
After the 'bankName' field (around line 297), before 'transactionId'

ADD THESE TWO FIELDS:
--------------------------------------------------------------------------------

  accountNumber: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'Account number must be a string',
    }),

  slipNumber: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'Slip number must be a string',
    }),

--------------------------------------------------------------------------------

COMPLETE SECTION SHOULD LOOK LIKE:
--------------------------------------------------------------------------------

  bankName: Joi.string()
    .when('paymentMethod', {
      is: Joi.valid('BANK_TRANSFER', 'CHEQUE'),
      then: Joi.required(),
      otherwise: Joi.optional().allow('', null),
    })
    .messages({
      'any.required': 'Bank name is required for bank transfers and cheques',
    }),

  accountNumber: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'Account number must be a string',
    }),

  slipNumber: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'Slip number must be a string',
    }),

  transactionId: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'Transaction ID must be a string',
    }),

--------------------------------------------------------------------------------

AFTER UPDATING:
1. Restart your backend server (if running locally)
   OR
2. Commit and push to GitHub to trigger Render redeploy:
   git add validators/forms.validator.js
   git commit -m "Add accountNumber and slipNumber to payment validator"
   git push origin main

3. Wait for Render to redeploy (check Render dashboard for deployment status)

ERROR BEING FIXED:
"Validation failed: accountNumber is not allowed, slipNumber is not allowed"

================================================================================
