import express from 'express';
import prisma from '../config/database.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/transfer
 * @desc    Create a new transfer request
 * @access  Private (Agent/Admin)
 * @workflow:
 * 1. Validate plot is SOLD
 * 2. Create transfer record
 * 3. Change plot status to TRANSFERRED
 * 4. Lock old sale agreement
 * 5. Update plot buyer to new customer
 */
router.post('/', protect, async (req, res) => {
  try {
    const {
      plotId,
      fromCustomerId,
      toCustomerId,
      transferAmount,
      transferFee = 0,
      transferType = 'GENERAL',
      reason
    } = req.body;

    // Validate required fields
    if (!plotId || !fromCustomerId || !toCustomerId || !transferAmount) {
      return res.status(400).json({
        success: false,
        message: 'Plot ID, from customer, to customer, and transfer amount are required'
      });
    }

    // Validate that transferor and transferee are not the same person
    if (fromCustomerId === toCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'Transferor and Transferee cannot be the same person'
      });
    }

    // Check if plot exists and is SOLD
    const plot = await prisma.inventory.findUnique({
      where: { id: plotId },
      include: {
        buyer: true,
        saleAgreements: {
          where: {
            customerId: fromCustomerId,
            isActive: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!plot) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found'
      });
    }

    if (plot.status !== 'SOLD') {
      return res.status(400).json({
        success: false,
        message: 'Only SOLD plots can be transferred. Plot must have an approved sale agreement.'
      });
    }

    if (plot.buyerId !== fromCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'Plot does not belong to the specified current owner'
      });
    }

    // Ensure there's an active sale agreement for the current owner
    const activeSaleAgreement = plot.saleAgreements[0];
    if (!activeSaleAgreement || activeSaleAgreement.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Plot must have an approved sale agreement before it can be transferred. Please create and approve a sale agreement first.'
      });
    }

    // Check if there's already a pending transfer for this plot
    const pendingTransfer = await prisma.transferForm.findFirst({
      where: {
        plotId,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    if (pendingTransfer) {
      return res.status(400).json({
        success: false,
        message: 'There is already a pending transfer for this plot'
      });
    }

    // Calculate total amount paid against the plot (regardless of who paid)
    // This includes: biyana + down payment + all payment vouchers
    
    // 1. Get biyana amount for this plot
    const biyanaForm = await prisma.biyana.findFirst({
      where: {
        plotId,
        status: 'APPROVED'
      }
    });
    const biyanaAmount = biyanaForm?.tokenAmount || 0;

    // 2. Get down payment from sale agreement
    const downPayment = activeSaleAgreement?.downPayment || 0;

    // 3. Get all payment vouchers for this plot
    const payments = await prisma.voucher.findMany({
      where: {
        plotId,
        type: 'PAYMENT',
        status: 'APPROVED'
      }
    });
    const paymentsTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);

    const totalPaid = biyanaAmount + downPayment + paymentsTotal;

    console.log('Total Paid Calculation:', {
      biyana: biyanaAmount,
      downPayment: downPayment,
      payments: paymentsTotal,
      total: totalPaid,
      transferAmount: transferAmount
    });

    // Validate transfer amount matches total paid for the plot
    if (transferAmount !== totalPaid) {
      return res.status(400).json({
        success: false,
        message: `Transfer amount (Rs ${transferAmount.toLocaleString()}) must equal the total amount paid for this plot (Rs ${totalPaid.toLocaleString()}). Breakdown: Token Rs ${biyanaAmount.toLocaleString()} + Down Payment Rs ${downPayment.toLocaleString()} + Payments Rs ${paymentsTotal.toLocaleString()} = Rs ${totalPaid.toLocaleString()}`
      });
    }

    // Verify to customer exists
    const toCustomer = await prisma.customer.findUnique({
      where: { id: toCustomerId }
    });

    if (!toCustomer) {
      return res.status(404).json({
        success: false,
        message: 'New customer not found'
      });
    }

    // Generate transfer number
    const count = await prisma.transferForm.count();
    const transferNumber = `TRF-${String(count + 1).padStart(6, '0')}`;

    // Create transfer form in a transaction
    const transfer = await prisma.$transaction(async (tx) => {
      // Create transfer record
      const newTransfer = await tx.transferForm.create({
        data: {
          transferNumber,
          plotId,
          fromCustomerId,
          toCustomerId,
          transferAmount,
          transferFee,
          transferType,
          reason,
          status: 'PENDING',
          previousSaleAgreementId: activeSaleAgreement.id, // Guaranteed to exist due to validation above
          createdById: req.user.id
        },
        include: {
          plot: true,
          fromCustomer: true,
          toCustomer: true,
          createdBy: {
            select: { name: true, email: true }
          }
        }
      });

      return newTransfer;
    });

    // Create notifications for admins (outside transaction to avoid timeout)
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true }
      });

      const notificationPromises = admins.map(admin =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'APPROVAL_PENDING',
            relatedType: 'TRANSFER',
            relatedId: transfer.id,
            title: 'New Transfer Request',
            message: `Transfer request for plot ${transfer.plot.plotNo} from ${transfer.fromCustomer.name} to ${transfer.toCustomer.name} is pending approval`
          }
        })
      );

      await Promise.all(notificationPromises);
    } catch (notifError) {
      // Log notification error but don't fail the request
      console.error('Failed to create notifications:', notifError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Transfer request created successfully',
      data: transfer
    });

  } catch (error) {
    console.error('Create transfer error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/transfer/:id/approve
 * @desc    Approve transfer request
 * @access  Private (Admin only)
 * @workflow:
 * 1. Update transfer status to APPROVED
 * 2. Change plot status to TRANSFERRED
 * 3. Lock old sale agreement
 * 4. Update plot buyer to new customer
 * 5. Note: Plot stays TRANSFERRED until new sale agreement is approved
 */
router.put('/:id/approve', protect, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can approve transfers'
      });
    }

    const { id } = req.params;

    // Get transfer with related data
    const transfer = await prisma.transferForm.findUnique({
      where: { id },
      include: {
        plot: {
          include: {
            buyer: true
          }
        },
        toCustomer: true
      }
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer request not found'
      });
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Transfer is already ${transfer.status.toLowerCase()}`
      });
    }

    // Approve transfer and update plot in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update transfer status
      const approvedTransfer = await tx.transferForm.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: req.user.id,
          approvedAt: new Date()
        },
        include: {
          plot: true,
          fromCustomer: true,
          toCustomer: true,
          approvedBy: {
            select: { name: true, email: true, signature: true }
          }
        }
      });

      // Update plot status to TRANSFERRED and change buyer
      await tx.inventory.update({
        where: { id: transfer.plotId },
        data: {
          status: 'TRANSFERRED',
          buyerId: transfer.toCustomerId
        }
      });

      // Lock the previous sale agreement
      if (transfer.previousSaleAgreementId) {
        await tx.saleAgreement.update({
          where: { id: transfer.previousSaleAgreementId },
          data: {
            isLocked: true,
            isActive: false,
            transferId: transfer.id,
            remarks: `Locked due to plot transfer ${transfer.transferNumber}`
          }
        });
      }

      return approvedTransfer;
    });

    // Create notification outside transaction
    try {
      await prisma.notification.create({
        data: {
          userId: result.createdById,
          type: 'APPROVED',
          relatedType: 'TRANSFER',
          relatedId: result.id,
          title: 'Transfer Approved',
          message: `Transfer ${result.transferNumber} for plot ${result.plot.plotNo} has been approved. Please create a new sale agreement for the new owner.`
        }
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError.message);
    }

    res.json({
      success: true,
      message: 'Transfer approved successfully. Plot status changed to TRANSFERRED. Please create a new sale agreement for the new owner.',
      data: result
    });

  } catch (error) {
    console.error('Approve transfer error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/transfer/:id/reject
 * @desc    Reject transfer request
 * @access  Private (Admin only)
 */
router.put('/:id/reject', protect, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can reject transfers'
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const transfer = await prisma.transferForm.findUnique({
      where: { id }
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer request not found'
      });
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Transfer is already ${transfer.status.toLowerCase()}`
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const rejectedTransfer = await tx.transferForm.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedById: req.user.id,
          reason: reason || transfer.reason
        },
        include: {
          plot: true,
          fromCustomer: true,
          toCustomer: true
        }
      });

      return rejectedTransfer;
    });

    // Create notification outside transaction
    try {
      await prisma.notification.create({
        data: {
          userId: result.createdById,
          type: 'REJECTED',
          relatedType: 'TRANSFER',
          relatedId: result.id,
          title: 'Transfer Rejected',
          message: `Transfer ${result.transferNumber} has been rejected. ${reason || ''}`
        }
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError.message);
    }

    res.json({
      success: true,
      message: 'Transfer rejected',
      data: result
    });

  } catch (error) {
    console.error('Reject transfer error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/transfer/:id/complete
 * @desc    Mark transfer as completed (when new sale agreement is approved)
 * @access  Private (System - called when new sale agreement is approved)
 * @workflow:
 * 1. Verify new sale agreement exists and is approved
 * 2. Update transfer status to COMPLETED
 * 3. Change plot status back to SOLD
 */
router.put('/:id/complete', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { newSaleAgreementId } = req.body;

    if (!newSaleAgreementId) {
      return res.status(400).json({
        success: false,
        message: 'New sale agreement ID is required'
      });
    }

    const transfer = await prisma.transferForm.findUnique({
      where: { id },
      include: { plot: true }
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    if (transfer.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Transfer must be approved before completion'
      });
    }

    // Verify the new sale agreement
    const newAgreement = await prisma.saleAgreement.findUnique({
      where: { id: newSaleAgreementId }
    });

    if (!newAgreement) {
      return res.status(404).json({
        success: false,
        message: 'New sale agreement not found'
      });
    }

    if (newAgreement.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'New sale agreement must be approved before completing transfer'
      });
    }

    if (newAgreement.plotId !== transfer.plotId) {
      return res.status(400).json({
        success: false,
        message: 'Sale agreement plot does not match transfer plot'
      });
    }

    if (newAgreement.customerId !== transfer.toCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'Sale agreement customer does not match new owner'
      });
    }

    // Complete the transfer
    const result = await prisma.$transaction(async (tx) => {
      // Update transfer
      const completedTransfer = await tx.transferForm.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          newSaleAgreementId
        },
        include: {
          plot: true,
          fromCustomer: true,
          toCustomer: true
        }
      });

      // Change plot status back to SOLD
      await tx.inventory.update({
        where: { id: transfer.plotId },
        data: {
          status: 'SOLD'
        }
      });

      return completedTransfer;
    });

    res.json({
      success: true,
      message: 'Transfer completed successfully. Plot status changed back to SOLD.',
      data: result
    });

  } catch (error) {
    console.error('Complete transfer error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/transfer
 * @desc    Get all transfer requests
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { status, plotId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (plotId) where.plotId = plotId;

    const transfers = await prisma.transferForm.findMany({
      where,
      include: {
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,
            price: true
          }
        },
        fromCustomer: {
          select: {
            name: true,
            cnic: true,
            phone: true
          }
        },
        toCustomer: {
          select: {
            name: true,
            cnic: true,
            phone: true
          }
        },
        createdBy: {
          select: { name: true, email: true }
        },
        approvedBy: {
          select: { name: true, email: true, signature: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: transfers
    });

  } catch (error) {
    console.error('Get transfers error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/transfer/:id
 * @desc    Get transfer by ID
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const transfer = await prisma.transferForm.findUnique({
      where: { id },
      include: {
        plot: {
          include: {
            buyer: true
          }
        },
        fromCustomer: true,
        toCustomer: true,
        createdBy: {
          select: { name: true, email: true }
        },
        approvedBy: {
          select: { name: true, email: true, signature: true }
        }
      }
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    res.json({
      success: true,
      data: transfer
    });

  } catch (error) {
    console.error('Get transfer error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
