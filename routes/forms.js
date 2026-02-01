import express from 'express';
import prisma from '../config/database.js';
import { protect } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { validateRequest } from '../middleware/security.js';
import { biyanaSchema, saleAgreementSchema, paymentSchema } from '../validators/forms.validator.js';

const router = express.Router();

// Generate form numbers
const generateFormNumber = async (prefix) => {
  const year = new Date().getFullYear();
  const lastForm = await (
    prefix === 'BF' ? prisma.biyana :
    prefix === 'SA' ? prisma.saleAgreement :
    prisma.transferForm
  ).findFirst({
    orderBy: { createdAt: 'desc' },
  });
  
  let number = 1;
  if (lastForm) {
    const lastNumber = parseInt(lastForm[
      prefix === 'BF' ? 'formNumber' :
      prefix === 'SA' ? 'agreementNumber' :
      'transferNumber'
    ].split('-')[2]);
    number = lastNumber + 1;
  }
  
  return `${prefix}-${year}-${String(number).padStart(4, '0')}`;
};

// ============ BIYANA ROUTES ============

// @route   GET /api/forms/biyana
// @desc    Get all biyana forms
// @access  Private
router.get('/biyana', protect, async (req, res) => {
  try {
    const biyanas = await prisma.biyana.findMany({
      include: {
        customer: { select: { name: true, fatherName: true, cnic: true, phone: true, address: true } },
        plot: { select: { plotNo: true, project: true, size: true, price: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true, signature: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: biyanas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/forms/biyana
// @desc    Create biyana form
// @access  Private
router.post('/biyana', protect, validateRequest(biyanaSchema), async (req, res) => {
  try {
    // Log incoming data for debugging
    console.log('Biyana form data received:', JSON.stringify(req.body, null, 2));
    
    // Validate agreement date vs last installment date
    if (req.body.lastInstallmentDate) {
      const agreementDate = new Date();
      const lastInstallmentDate = new Date(req.body.lastInstallmentDate);
      
      if (agreementDate >= lastInstallmentDate) {
        return res.status(400).json({
          success: false,
          message: 'Agreement date must be before the last installment date'
        });
      }
    }
    
    const formNumber = await generateFormNumber('BF');
    
    const biyanaData = {
      ...req.body,
      formNumber,
      status: 'PENDING', // Set status as PENDING for approval
      createdById: req.user.id,
    };

    const biyana = await prisma.biyana.create({
      data: biyanaData,
    });

    // Update plot status to PENDING when form is submitted
    await prisma.inventory.update({
      where: { id: req.body.plotId },
      data: { status: 'PENDING' },
    });

    // Notify all admins about the new pending approval
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    
    for (const admin of admins) {
      await createNotification(
        admin.id,
        'APPROVAL_PENDING',
        'New Biyana Approval',
        `New Biyana form ${formNumber} submitted for approval`,
        biyana.id,
        'BIYANA'
      );
    }

    res.status(201).json({
      success: true,
      data: biyana,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============ SALE AGREEMENT ROUTES ============

// @route   GET /api/forms/sale-agreement
// @desc    Get all sale agreements
// @access  Private
router.get('/sale-agreement', protect, async (req, res) => {
  try {
    const agreements = await prisma.saleAgreement.findMany({
      include: {
        customer: { select: { name: true, fatherName: true, cnic: true, phone: true, address: true } },
        plot: { 
          select: { 
            plotNo: true, 
            project: true, 
            size: true,
            buyer: { select: { id: true, name: true, fatherName: true, cnic: true, phone: true, address: true } }
          } 
        },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate total paid (downPayment + biyana + vouchers) for each agreement
    const agreementsWithPayments = await Promise.all(
      agreements.map(async (agreement) => {
        // Get APPROVED vouchers only for this plot (regardless of customer)
        const vouchers = await prisma.voucher.findMany({
          where: {
            plotId: agreement.plotId,
            type: 'RECEIPT',
            status: 'APPROVED',
          },
        });
        
        // Get APPROVED biyana only
        const biyana = await prisma.biyana.findFirst({
          where: {
            plotId: agreement.plotId,
            status: 'APPROVED',
          },
        });
        
        const vouchersTotal = vouchers.reduce((sum, v) => sum + v.amount, 0);
        const biyanaAmount = biyana?.tokenAmount || 0;
        const totalPaid = agreement.downPayment + biyanaAmount + vouchersTotal;
        
        return {
          ...agreement,
          currentOwner: agreement.plot?.buyer, // Current owner from inventory
          originalCustomer: agreement.customer, // Original customer from agreement
          totalPaid,
          vouchersTotal,
          biyanaAmount,
          pendingAmount: agreement.totalAmount - totalPaid,
        };
      })
    );

    res.json({
      success: true,
      data: agreementsWithPayments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/forms/sale-agreement/:id
// @desc    Get sale agreement by ID
// @access  Private
router.get('/sale-agreement/:id', protect, async (req, res) => {
  try {
    const agreement = await prisma.saleAgreement.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        plot: {
          include: {
            buyer: true, // Current owner
          },
        },
        createdBy: { select: { name: true, signature: true } },
        witnesses: true,
      },
    });

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Sale agreement not found',
      });
    }

    // Get vouchers and biyana for payment calculations (APPROVED only)
    // Filter by plot only - payments are tied to the plot, not the customer
    const vouchers = await prisma.voucher.findMany({
      where: {
        plotId: agreement.plotId,
        type: 'RECEIPT',
        status: 'APPROVED',
      },
    });
    
    const biyana = await prisma.biyana.findFirst({
      where: {
        plotId: agreement.plotId,
        status: 'APPROVED',
      },
      select: {
        tokenAmount: true,
        totalAmount: true,
        pricePerMarla: true,
        monthlyInstallments: true,
        quarterlyInstallments: true,
        monthlyInstallmentAmount: true,
        quarterlyInstallmentAmount: true,
        agreementDuration: true,
        installmentType: true,
      },
    });
    
    const vouchersTotal = vouchers.reduce((sum, v) => sum + v.amount, 0);
    const biyanaAmount = biyana?.tokenAmount || 0;
    const totalPaid = agreement.downPayment + biyanaAmount + vouchersTotal;

    res.json({
      success: true,
      data: {
        ...agreement,
        currentOwner: agreement.plot?.buyer, // Current owner from inventory
        originalCustomer: agreement.customer, // Original customer from agreement
        totalPaid,
        vouchersTotal,
        biyanaAmount,
        pendingAmount: agreement.totalAmount - totalPaid,
        // Include biyana data for sale agreement display
        biyana: biyana ? {
          totalAmount: biyana.totalAmount,
          pricePerMarla: biyana.pricePerMarla,
          totalRemaining: biyana.totalRemaining,
          monthlyInstallments: biyana.monthlyInstallments,
          quarterlyInstallments: biyana.quarterlyInstallments,
          monthlyInstallmentAmount: biyana.monthlyInstallmentAmount,
          quarterlyInstallmentAmount: biyana.quarterlyInstallmentAmount,
          agreementDuration: biyana.agreementDuration,
          lastInstallmentDate: biyana.lastInstallmentDate,
          installmentType: biyana.installmentType,
        } : null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/forms/sale-agreement
// @desc    Create sale agreement
// @access  Private
router.post('/sale-agreement', protect, validateRequest(saleAgreementSchema), async (req, res) => {
  try {
    // Validate agreement date vs calculated last installment date
    if (req.body.paymentPlan && req.body.paymentPlan !== 'FULL_PAYMENT') {
      const agreementDate = new Date(req.body.agreementDate);
      
      // Calculate last installment date based on payment plan
      let installmentMonths = 0;
      if (req.body.paymentPlan === 'INSTALLMENT_12') installmentMonths = 12;
      else if (req.body.paymentPlan === 'INSTALLMENT_24') installmentMonths = 24;
      else if (req.body.paymentPlan === 'INSTALLMENT_36') installmentMonths = 36;
      
      if (installmentMonths > 0) {
        const lastInstallmentDate = new Date(agreementDate);
        lastInstallmentDate.setMonth(lastInstallmentDate.getMonth() + installmentMonths);
        
        if (agreementDate >= lastInstallmentDate) {
          return res.status(400).json({
            success: false,
            message: 'Agreement date must be before the last installment date'
          });
        }
      }
    }
    
    const agreementNumber = await generateFormNumber('SA');
    
    // Convert paymentPlan to installmentMonths
    let installmentMonths = null;
    let monthlyAmount = null;
    
    if (req.body.paymentPlan) {
      const plan = req.body.paymentPlan;
      if (plan === 'INSTALLMENT_12') {
        installmentMonths = 12;
      } else if (plan === 'INSTALLMENT_24') {
        installmentMonths = 24;
      } else if (plan === 'INSTALLMENT_36') {
        installmentMonths = 36;
      } else if (plan === 'FULL_PAYMENT') {
        installmentMonths = 0;
      }
      
      // Calculate monthly amount if installments
      if (installmentMonths > 0) {
        const remainingAmount = req.body.totalAmount - req.body.downPayment;
        monthlyAmount = remainingAmount / installmentMonths;
      }
    }
    
    const agreementData = {
      customerId: req.body.customerId,
      plotId: req.body.plotId,
      totalAmount: req.body.totalAmount,
      downPayment: req.body.downPayment,
      installmentMonths,
      monthlyAmount,
      agreementDate: req.body.agreementDate,
      possessionDate: req.body.possessionDate || null,
      terms: req.body.terms,
      agreementNumber,
      status: 'PENDING', // Set to PENDING, will be APPROVED by admin later
      createdById: req.user.id,
    };

    const agreement = await prisma.saleAgreement.create({
      data: agreementData,
    });

    // Update inventory status to RESERVED (not SOLD until approval)
    await prisma.inventory.update({
      where: { id: req.body.plotId },
      data: {
        status: 'RESERVED',
        buyerId: req.body.customerId,
      },
    });

    // Notify all admins about the new pending approval
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    
    for (const admin of admins) {
      await createNotification(
        admin.id,
        'APPROVAL_PENDING',
        'New Sale Agreement Approval',
        `New Sale Agreement ${agreementNumber} submitted for approval`,
        agreement.id,
        'SALE_AGREEMENT'
      );
    }

    // Don't update customer's total investment until approval

    res.status(201).json({
      success: true,
      data: agreement,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============ TRANSFER FORM ROUTES ============

// @route   GET /api/forms/transfer
// @desc    Get all transfer forms
// @access  Private
router.get('/transfer', protect, async (req, res) => {
  try {
    const transfers = await prisma.transferForm.findMany({
      include: {
        plot: { select: { plotNo: true, project: true, size: true } },
        fromCustomer: { select: { name: true, fatherName: true, cnic: true, phone: true, address: true } },
        toCustomer: { select: { name: true, fatherName: true, cnic: true, phone: true, address: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: transfers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/forms/transfer
// @desc    Create transfer form
// @access  Private
router.post('/transfer', protect, async (req, res) => {
  try {
    const transferNumber = await generateFormNumber('TF');
    
    const transferData = {
      plotId: req.body.plotId,
      fromCustomerId: req.body.fromCustomerId,
      toCustomerId: req.body.toCustomerId,
      transferAmount: req.body.transferAmount,
      transferFee: req.body.transferFee,
      transferDate: new Date(req.body.date),
      reason: req.body.remarks,
      transferNumber,
      status: 'PENDING',
      createdById: req.user.id,
    };

    const transfer = await prisma.transferForm.create({
      data: transferData,
    });

    // Notify all admins about the new pending approval
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    
    for (const admin of admins) {
      await createNotification(
        admin.id,
        'APPROVAL_PENDING',
        'New Transfer Form Approval',
        `New Transfer Form ${transferNumber} submitted for approval`,
        transfer.id,
        'TRANSFER'
      );
    }

    res.status(201).json({
      success: true,
      data: transfer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/forms/transfer/:id/approve
// @desc    Approve transfer form
// @access  Private
router.put('/transfer/:id/approve', protect, async (req, res) => {
  try {
    const transfer = await prisma.transferForm.findUnique({
      where: { id: req.params.id },
    });
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer form not found',
      });
    }

    const updatedTransfer = await prisma.transferForm.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedById: req.user.id,
      },
    });

    // Update inventory buyer
    await prisma.inventory.update({
      where: { id: transfer.plotId },
      data: {
        buyerId: transfer.toCustomerId,
      },
    });

    // Customers updated (totalInvestment field removed from schema)

    res.json({
      success: true,
      data: updatedTransfer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
