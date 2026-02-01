import prisma from '../config/database.js';

/**
 * FORM-VOUCHER APPROVAL WORKFLOW HELPERS
 * 
 * Business Rules:
 * 1. Forms cannot be approved without required voucher
 * 2. Latest voucher must be APPROVED before form approval
 * 3. Rejected vouchers trigger circular loop - new voucher required
 * 4. Historical vouchers preserved for audit
 * 5. Only latest voucher is used for approval decision
 */

/**
 * Get the latest voucher for a form
 * @param {string} formType - 'BIYANA', 'SALES_AGREEMENT', or 'TRANSFER'
 * @param {string} formId - The form ID
 * @returns {Promise<Object|null>} Latest voucher or null
 */
export async function getLatestVoucherForForm(formType, formId) {
  const whereClause = {};
  
  if (formType === 'BIYANA') {
    whereClause.biyanaId = formId;
  } else if (formType === 'SALES_AGREEMENT') {
    whereClause.saleAgreementId = formId;
  } else if (formType === 'TRANSFER') {
    whereClause.transferId = formId;
  }

  const latestVoucher = await prisma.voucher.findFirst({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      approvedBy: {
        select: {
          name: true,
          signature: true,
        },
      },
    },
  });

  return latestVoucher;
}

/**
 * Check if form can be approved based on voucher status
 * @param {string} formType - 'BIYANA', 'SALES_AGREEMENT', or 'TRANSFER'
 * @param {string} formId - The form ID
 * @returns {Promise<{canApprove: boolean, reason: string, latestVoucher: Object|null}>}
 */
export async function canApproveForm(formType, formId) {
  const latestVoucher = await getLatestVoucherForForm(formType, formId);

  // RULE 1: Form cannot be approved without voucher
  if (!latestVoucher) {
    return {
      canApprove: false,
      reason: `No voucher exists for this ${formType.toLowerCase().replace('_', ' ')}. A voucher must be created and approved first.`,
      latestVoucher: null,
    };
  }

  // RULE 2: Latest voucher must be APPROVED
  if (latestVoucher.status === 'PENDING') {
    return {
      canApprove: false,
      reason: `The latest voucher (${latestVoucher.voucherNo}) is still PENDING approval. Please approve the voucher before approving the form.`,
      latestVoucher,
    };
  }

  // RULE 3: If latest voucher is REJECTED, new voucher needed (circular loop)
  if (latestVoucher.status === 'REJECTED') {
    return {
      canApprove: false,
      reason: `The latest voucher (${latestVoucher.voucherNo}) was REJECTED. A new voucher must be created and approved before the form can be approved.`,
      latestVoucher,
    };
  }

  // RULE 4: Voucher is APPROVED - form can be approved
  if (latestVoucher.status === 'APPROVED') {
    return {
      canApprove: true,
      reason: 'Voucher approved - form can now be approved',
      latestVoucher,
    };
  }

  return {
    canApprove: false,
    reason: 'Unknown voucher status',
    latestVoucher,
  };
}

/**
 * Validate payment plan inheritance from Biyana to Sale Agreement
 * @param {Object} biyanaData - Biyana form data
 * @param {Object} saleAgreementData - Sale Agreement data
 * @returns {{isValid: boolean, errors: string[]}}
 */
export function validatePaymentPlanInheritance(biyanaData, saleAgreementData) {
  const errors = [];

  // Check if Biyana exists and has payment plan
  if (!biyanaData) {
    errors.push('No Biyana form found for this plot');
    return { isValid: false, errors };
  }

  // Validate payment plan fields match exactly
  const fieldsToCheck = [
    'pricePerMarla',
    'totalAmount',
    'totalRemaining',
    'lastInstallmentDate',
    'monthlyInstallments',
    'quarterlyInstallments',
    'agreementDuration',
    'monthlyInstallmentAmount',
    'quarterlyInstallmentAmount',
    'installmentType',
  ];

  for (const field of fieldsToCheck) {
    const biyanaValue = biyanaData[field];
    const agreementValue = saleAgreementData[field];

    // Skip null/undefined values
    if (biyanaValue == null && agreementValue == null) continue;

    // Check for mismatch
    if (biyanaValue !== agreementValue) {
      errors.push(
        `Payment plan mismatch: ${field} in Sale Agreement (${agreementValue}) must match Biyana (${biyanaValue})`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get all vouchers for a form (for audit trail)
 * @param {string} formType - 'BIYANA', 'SALES_AGREEMENT', or 'TRANSFER'
 * @param {string} formId - The form ID
 * @returns {Promise<Array>} All vouchers ordered by creation date
 */
export async function getAllVouchersForForm(formType, formId) {
  const whereClause = {};
  
  if (formType === 'BIYANA') {
    whereClause.biyanaId = formId;
  } else if (formType === 'SALES_AGREEMENT') {
    whereClause.saleAgreementId = formId;
  } else if (formType === 'TRANSFER') {
    whereClause.transferId = formId;
  }

  const vouchers = await prisma.voucher.findMany({
    where: whereClause,
    orderBy: { createdAt: 'asc' },
    include: {
      approvedBy: {
        select: {
          name: true,
        },
      },
      createdBy: {
        select: {
          name: true,
        },
      },
    },
  });

  return vouchers;
}

/**
 * Bank account mapping for deposits
 */
export const BANK_ACCOUNTS = {
  'FAYSAL_BANK': {
    name: 'Faysal Bank',
    accountNumber: '3163301000004759',
  },
  'SONERI_BANK': {
    name: 'Soneri Bank',
    accountNumber: '005920012951826',
  },
};

/**
 * Get bank account details
 * @param {string} bankName - Bank name key
 * @returns {Object|null} Bank details or null
 */
export function getBankAccountDetails(bankName) {
  return BANK_ACCOUNTS[bankName] || null;
}

export default {
  getLatestVoucherForForm,
  canApproveForm,
  validatePaymentPlanInheritance,
  getAllVouchersForForm,
  getBankAccountDetails,
  BANK_ACCOUNTS,
};
