import express from 'express';
import prisma from '../config/database.js';
import { protect, authorize } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { canApproveForm, getAllVouchersForForm } from '../middleware/formVoucherHelpers.js';

const router = express.Router();

// @route   GET /api/approvals/biyana
// @desc    Get all pending Biyana forms for approval
// @access  Admin only
router.get('/biyana', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const pendingBiyanas = await prisma.biyana.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
            address: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,
            price: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            email: true,
            signature: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: pendingBiyanas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/biyana/:id/approve
// @desc    Approve a Biyana form (REQUIRES approved voucher)
// @access  Admin only
router.put('/biyana/:id/approve', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const biyana = await prisma.biyana.findUnique({
      where: { id },
    });

    if (!biyana) {
      return res.status(404).json({
        success: false,
        message: 'Biyana form not found',
      });
    }

    if (biyana.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This Biyana form has already been processed',
      });
    }

    // ✅ BUSINESS RULE: Check voucher approval status before approving form
    const voucherCheck = await canApproveForm('BIYANA', id);
    
    if (!voucherCheck.canApprove) {
      return res.status(400).json({
        success: false,
        message: voucherCheck.reason,
        requiresVoucher: true,
        latestVoucher: voucherCheck.latestVoucher,
      });
    }

    // Update Biyana status to APPROVED
    const updatedBiyana = await prisma.biyana.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: req.user.id,
        approvedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            signature: true,
          },
        },
      },
    });

    // Update inventory status to RESERVED after approval
    await prisma.inventory.update({
      where: { id: biyana.plotId },
      data: {
        status: 'RESERVED',
        buyerId: biyana.customerId,
      },
    });

    // Create notification for the form creator
    await createNotification(
      biyana.createdById,
      'APPROVED',
      'Biyana Form Approved',
      `Your Biyana form ${biyana.formNumber} has been approved`,
      biyana.id,
      'BIYANA'
    );

    // Mark the admin's pending approval notification as read
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        relatedId: biyana.id,
        relatedType: 'BIYANA',
        type: 'APPROVAL_PENDING',
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      data: updatedBiyana,
      message: 'Biyana form approved successfully',
      voucherInfo: voucherCheck.latestVoucher,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/biyana/:id/reject
// @desc    Reject a Biyana form
// @access  Admin only
router.put('/biyana/:id/reject', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const biyana = await prisma.biyana.findUnique({
      where: { id },
    });

    if (!biyana) {
      return res.status(404).json({
        success: false,
        message: 'Biyana form not found',
      });
    }

    if (biyana.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This Biyana form has already been processed',
      });
    }

    const updatedBiyana = await prisma.biyana.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: req.user.id,
        approvedAt: new Date(),
        remarks: reason || biyana.remarks,
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            signature: true,
          },
        },
      },
    });

    // Update inventory status back to AVAILABLE when rejected
    await prisma.inventory.update({
      where: { id: biyana.plotId },
      data: { status: 'AVAILABLE' },
    });

    // Create notification for the form creator
    await createNotification(
      biyana.createdById,
      'REJECTED',
      'Biyana Form Rejected',
      `Your Biyana form ${biyana.formNumber} has been rejected${reason ? ': ' + reason : ''}`,
      biyana.id,
      'BIYANA'
    );

    // Mark the admin's pending approval notification as read
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        relatedId: biyana.id,
        relatedType: 'BIYANA',
        type: 'APPROVAL_PENDING',
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      data: updatedBiyana,
      message: 'Biyana form rejected',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/approvals/sale-agreement
// @desc    Get all pending Sale Agreements for approval
// @access  Admin only
router.get('/sale-agreement', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const pendingAgreements = await prisma.saleAgreement.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,
            price: true,
            biyanaForms: {
              where: {
                status: 'APPROVED',
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
              select: {
                tokenAmount: true,
                downPayment: true,
                totalAmount: true,
                pricePerMarla: true,
                totalRemaining: true,
                monthlyInstallments: true,
                quarterlyInstallments: true,
                monthlyInstallmentAmount: true,
                quarterlyInstallmentAmount: true,
                installmentType: true,
                lastInstallmentDate: true,
                agreementDuration: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: pendingAgreements,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/sale-agreement/:id/approve
// @desc    Approve a Sale Agreement (REQUIRES approved voucher & payment plan validation)
// @access  Admin only
router.put('/sale-agreement/:id/approve', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const agreement = await prisma.saleAgreement.findUnique({
      where: { id },
      include: {
        plot: true
      }
    });

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Sale Agreement not found',
      });
    }

    if (agreement.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This Sale Agreement has already been processed',
      });
    }

    // ✅ BUSINESS RULE: Check voucher approval status before approving form
    const voucherCheck = await canApproveForm('SALES_AGREEMENT', id);
    
    if (!voucherCheck.canApprove) {
      return res.status(400).json({
        success: false,
        message: voucherCheck.reason,
        requiresVoucher: true,
        latestVoucher: voucherCheck.latestVoucher,
      });
    }

    // Payment plan validation removed - no longer required to match Biyana form

    // Check if this is for a transferred plot
    const relatedTransfer = await prisma.transferForm.findFirst({
      where: {
        plotId: agreement.plotId,
        toCustomerId: agreement.customerId,
        status: { in: ['APPROVED', 'COMPLETED'] } // Check both statuses
      }
    });

    // Process in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Archive any existing active/approved agreements for this plot (except the current one being approved)
      const existingAgreements = await tx.saleAgreement.findMany({
        where: {
          plotId: agreement.plotId,
          id: { not: id },
          isArchived: false,
          status: 'APPROVED' // Only archive previously approved agreements
        }
      });

      if (existingAgreements.length > 0) {
        // Archive all existing agreements for this plot
        await tx.saleAgreement.updateMany({
          where: {
            plotId: agreement.plotId,
            id: { not: id },
            isArchived: false,
            status: 'APPROVED'
          },
          data: {
            isArchived: true,
            isActive: false
          }
        });
      }

      // Update Sale Agreement status to APPROVED
      const updatedAgreement = await tx.saleAgreement.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: req.user.id,
          approvedAt: new Date(),
        },
        include: {
          customer: {
            select: {
              name: true,
              fatherName: true,
              cnic: true,
              phone: true,
            },
          },
          plot: {
            select: {
              plotNo: true,
              project: true,
              size: true,
            },
          },
          createdBy: {
            select: {
              name: true,
            },
          },
          approvedBy: {
            select: {
              name: true,
              signature: true,
            },
          },
        },
      });

      // If there's a related transfer, complete it and change plot status back to SOLD
      if (relatedTransfer) {
        // Archive the old sale agreement (the one that was locked during transfer)
        // Try multiple methods to find the old agreement
        let oldAgreement = await tx.saleAgreement.findFirst({
          where: {
            plotId: agreement.plotId,
            isLocked: true,
            transferId: relatedTransfer.id
          }
        });

        // If not found by transferId, try using previousSaleAgreementId from transfer
        if (!oldAgreement && relatedTransfer.previousSaleAgreementId) {
          oldAgreement = await tx.saleAgreement.findUnique({
            where: { id: relatedTransfer.previousSaleAgreementId }
          });
        }

        // If still not found, try finding any locked agreement for this plot
        if (!oldAgreement) {
          oldAgreement = await tx.saleAgreement.findFirst({
            where: {
              plotId: agreement.plotId,
              isLocked: true,
              isArchived: false
            }
          });
        }

        if (oldAgreement) {
          await tx.saleAgreement.update({
            where: { id: oldAgreement.id },
            data: {
              isArchived: true,
              isActive: false,
              transferId: relatedTransfer.id // Ensure transferId is set
            }
          });
        }

        // Complete the transfer
        await tx.transferForm.update({
          where: { id: relatedTransfer.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            newSaleAgreementId: agreement.id
          }
        });

        // Update inventory status to SOLD (from TRANSFERRED)
        await tx.inventory.update({
          where: { id: agreement.plotId },
          data: {
            status: 'SOLD',
            soldDate: new Date(),
          },
        });

        // Create notification for transfer creator
        await createNotification(
          relatedTransfer.createdById,
          'APPROVED',
          'Transfer Completed',
          `Plot transfer ${relatedTransfer.transferNumber} has been completed. Plot ${agreement.plot.plotNo} is now SOLD to the new owner.`,
          relatedTransfer.id,
          'TRANSFER'
        );
      } else {
        // Normal sale agreement - Update inventory status to SOLD
        await tx.inventory.update({
          where: { id: agreement.plotId },
          data: {
            status: 'SOLD',
            soldDate: new Date(),
          },
        });
      }

      // Create notification for the form creator
      await createNotification(
        agreement.createdById,
        'APPROVED',
        'Sale Agreement Approved',
        `Your Sale Agreement ${agreement.agreementNumber} has been approved`,
        agreement.id,
        'SALE_AGREEMENT'
      );

      // Mark the admin's pending approval notification as read
      await tx.notification.updateMany({
        where: {
          userId: req.user.id,
          relatedId: agreement.id,
          relatedType: 'SALE_AGREEMENT',
          type: 'APPROVAL_PENDING',
          read: false,
        },
        data: {
          read: true,
        },
      });

      return { updatedAgreement, archivedCount: existingAgreements.length };
    });

    let message = 'Sale Agreement approved';
    if (relatedTransfer) {
      message = 'Sale Agreement approved and transfer completed. Plot status changed to SOLD.';
    }
    if (result.archivedCount > 0) {
      message += ` ${result.archivedCount} previous agreement(s) moved to archive.`;
    }

    res.json({
      success: true,
      data: result.updatedAgreement,
      message: message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/sale-agreement/:id/reject
// @desc    Reject a Sale Agreement
// @access  Admin only
router.put('/sale-agreement/:id/reject', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const agreement = await prisma.saleAgreement.findUnique({
      where: { id },
    });

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Sale Agreement not found',
      });
    }

    if (agreement.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This Sale Agreement has already been processed',
      });
    }

    const updatedAgreement = await prisma.saleAgreement.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: req.user.id,
        approvedAt: new Date(),
        terms: reason ? `${agreement.terms}\n\nRejection Reason: ${reason}` : agreement.terms,
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            signature: true,
          },
        },
      },
    });

    // Update inventory status back to AVAILABLE when rejected
    await prisma.inventory.update({
      where: { id: agreement.plotId },
      data: { status: 'AVAILABLE', buyerId: null },
    });

    // Create notification for the form creator
    await createNotification(
      agreement.createdById,
      'REJECTED',
      'Sale Agreement Rejected',
      `Your Sale Agreement ${agreement.formNumber} has been rejected${reason ? ': ' + reason : ''}`,
      agreement.id,
      'SALE_AGREEMENT'
    );

    // Mark the admin's pending approval notification as read
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        relatedId: agreement.id,
        relatedType: 'SALE_AGREEMENT',
        type: 'APPROVAL_PENDING',
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      data: updatedAgreement,
      message: 'Sale Agreement rejected',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/approvals/transfer
// @desc    Get all pending Transfer forms for approval
// @access  Admin only
router.get('/transfer', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const pendingTransfers = await prisma.transferForm.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        fromCustomer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        toCustomer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: pendingTransfers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/transfer/:id/approve
// @desc    Approve a Transfer form (REQUIRES approved transfer fee voucher)
// @access  Admin only
router.put('/transfer/:id/approve', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const transfer = await prisma.transferForm.findUnique({
      where: { id },
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer form not found',
      });
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This Transfer form has already been processed',
      });
    }

    // ✅ BUSINESS RULE: Check voucher approval status before approving transfer
    const voucherCheck = await canApproveForm('TRANSFER', id);
    
    if (!voucherCheck.canApprove) {
      return res.status(400).json({
        success: false,
        message: voucherCheck.reason,
        requiresVoucher: true,
        latestVoucher: voucherCheck.latestVoucher,
      });
    }

    // Update Transfer status to APPROVED only
    // The old sale agreement should NOT be modified here
    // It will be locked when the transfer is actually processed in /api/transfer/:id/approve
    const updatedTransfer = await prisma.transferForm.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: req.user.id,
        approvedAt: new Date(),
      },
      include: {
        fromCustomer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        toCustomer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            signature: true,
          },
        },
      },
    });

    // Update plot status to TRANSFERRED and change buyer
    await prisma.inventory.update({
      where: { id: transfer.plotId },
      data: {
        status: 'TRANSFERRED',
        buyerId: transfer.toCustomerId,
      },
    });

    // Lock the previous sale agreement
    if (transfer.previousSaleAgreementId) {
      await prisma.saleAgreement.update({
        where: { id: transfer.previousSaleAgreementId },
        data: {
          isLocked: true,
          isActive: false,
          transferId: transfer.id,
          remarks: `Locked due to plot transfer ${transfer.transferNumber}`,
        },
      });
    }

    // Create notification for the form creator
    await createNotification(
      transfer.createdById,
      'APPROVED',
      'Transfer Form Approved',
      `Transfer form ${transfer.transferNumber} has been approved. Please create a new sale agreement for the new owner.`,
      transfer.id,
      'TRANSFER'
    );

    // Mark the admin's pending approval notification as read
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        relatedId: transfer.id,
        relatedType: 'TRANSFER',
        type: 'APPROVAL_PENDING',
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      data: updatedTransfer,
      message: 'Transfer form approved successfully. Please create a new sale agreement for the new owner.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/transfer/:id/reject
// @desc    Reject a Transfer form
// @access  Admin only
router.put('/transfer/:id/reject', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const transfer = await prisma.transferForm.findUnique({
      where: { id },
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer form not found',
      });
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This Transfer form has already been processed',
      });
    }

    const updatedTransfer = await prisma.transferForm.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: req.user.id,
        reason: reason ? `${transfer.reason || ''}\n\nRejection Reason: ${reason}` : transfer.reason,
      },
      include: {
        fromCustomer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        toCustomer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            signature: true,
          },
        },
      },
    });

    // Create notification for the form creator
    await createNotification(
      transfer.createdById,
      'REJECTED',
      'Transfer Form Rejected',
      `Transfer form ${transfer.transferNumber} has been rejected${reason ? ': ' + reason : ''}`,
      transfer.id,
      'TRANSFER'
    );

    // Mark the admin's pending approval notification as read
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        relatedId: transfer.id,
        relatedType: 'TRANSFER',
        type: 'APPROVAL_PENDING',
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      data: updatedTransfer,
      message: 'Transfer form rejected',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/approvals/stats
// @desc    Get approval statistics
// @access  Admin only
router.get('/stats', protect, authorize('ADMIN'), async (req, res) => {
  try {
    // Optimized query using groupBy to reduce database connections
    const [biyanaCounts, agreementCounts, transferCounts, voucherCounts] = await Promise.all([
      prisma.biyana.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.saleAgreement.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.transferForm.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.voucher.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    // Helper function to extract counts
    const getCounts = (data) => {
      const pending = data.find(d => d.status === 'PENDING')?._count.id || 0;
      const approved = data.find(d => d.status === 'APPROVED')?._count.id || 0;
      const rejected = data.find(d => d.status === 'REJECTED')?._count.id || 0;
      return { pending, approved, rejected, total: pending + approved + rejected };
    };

    res.json({
      success: true,
      data: {
        forms: getCounts(biyanaCounts),
        agreements: getCounts(agreementCounts),
        transfers: getCounts(transferCounts),
        payments: getCounts(voucherCounts),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/approvals/payments
// @desc    Get all pending payment vouchers for approval
// @access  Admin only
router.get('/payments', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const pendingPayments = await prisma.voucher.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: pendingPayments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/payments/:id/approve
// @desc    Approve a payment voucher
// @access  Admin only
router.put('/payments/:id/approve', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Payment voucher not found',
      });
    }

    if (voucher.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This payment voucher has already been processed',
      });
    }

    // Update voucher status to APPROVED
    const updatedVoucher = await prisma.voucher.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: req.user.id,
        approvedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            signature: true,
          },
        },
      },
    });

    // Create notification for the form creator
    await createNotification(
      voucher.createdById,
      'APPROVED',
      'Payment Approved',
      `Your payment voucher ${voucher.voucherNumber} has been approved`,
      voucher.id,
      'PAYMENT'
    );

    // Mark the admin's pending approval notification as read
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        relatedId: voucher.id,
        relatedType: 'PAYMENT',
        type: 'APPROVAL_PENDING',
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      data: updatedVoucher,
      message: 'Payment voucher approved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/approvals/payments/:id/reject
// @desc    Reject a payment voucher (triggers circular loop - new voucher required)
// @access  Admin only
router.put('/payments/:id/reject', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Payment voucher not found',
      });
    }

    if (voucher.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This payment voucher has already been processed',
      });
    }

    // ✅ BUSINESS RULE: Rejected voucher triggers circular loop
    // - Voucher is marked REJECTED (read-only, cannot be reused)
    // - Form remains PENDING
    // - User must create NEW voucher
    const updatedVoucher = await prisma.voucher.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: req.user.id,
        approvedAt: new Date(),
        rejectionReason: reason || 'No reason provided',
      },
      include: {
        customer: {
          select: {
            name: true,
            fatherName: true,
            cnic: true,
            phone: true,
          },
        },
        plot: {
          select: {
            plotNo: true,
            project: true,
            size: true,

          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
            signature: true,
          },
        },
      },
    });

    // Create notification for the form creator
    await createNotification(
      voucher.createdById,
      'REJECTED',
      'Payment Rejected - New Voucher Required',
      `Your payment voucher ${voucher.voucherNo} has been rejected. Please create a new voucher. Reason: ${reason || 'No reason provided'}`,
      voucher.id,
      'PAYMENT'
    );

    // Mark the admin's pending approval notification as read
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        relatedId: voucher.id,
        relatedType: 'PAYMENT',
        type: 'APPROVAL_PENDING',
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
      data: updatedVoucher,
      message: 'Payment voucher rejected. A new voucher must be created and approved.',
      requiresNewVoucher: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
