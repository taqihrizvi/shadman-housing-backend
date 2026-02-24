import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/security.js';
import Joi from 'joi';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/signatures'));
    },
    filename: (req, file, cb) => {
        let fileName = `signature-${Date.now()}`;
        if (req.body && req.body.name) {
            fileName = req.body.name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase() + '-sign';
        }
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, fileName + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

const router = express.Router();

const createUserSchema = Joi.object({
    name: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('ADMIN', 'MANAGER').required(),
    signature: Joi.any().optional().allow(null, ''),
});

const updateUserSchema = Joi.object({
    name: Joi.string().min(3).max(100),
    email: Joi.string().email(),
    role: Joi.string().valid('ADMIN', 'MANAGER'),
    isActive: Joi.boolean(),
    signature: Joi.any().optional().allow(null, ''),
});

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/', protect, authorize('ADMIN'), async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.json({
            success: true,
            data: users,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// @route   POST /api/users
// @desc    Create a new user
// @access  Private (Admin only)
router.post('/', protect, authorize('ADMIN'), upload.single('signature'), validateRequest(createUserSchema), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists',
            });
        }

        let signaturePath = null;
        if (req.file) {
            signaturePath = `/signatures/${req.file.filename}`;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                ...(signaturePath && { signature: signaturePath }),
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
            },
        });

        res.status(201).json({
            success: true,
            data: user,
            message: 'User created successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// @route   PUT /api/users/:id
// @desc    Update a user
// @access  Private (Admin only)
router.put('/:id', protect, authorize('ADMIN'), upload.single('signature'), validateRequest(updateUserSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, isActive } = req.body;

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        let signaturePath = undefined;
        if (req.file) {
            signaturePath = `/signatures/${req.file.filename}`;
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                name: name !== undefined ? name : user.name,
                email: email !== undefined ? email : user.email,
                role: role !== undefined ? role : user.role,
                isActive: isActive !== undefined ? isActive : user.isActive,
                ...(signaturePath && { signature: signaturePath }),
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
            },
        });

        res.json({
            success: true,
            data: updatedUser,
            message: 'User updated successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete a user (Deactivate)
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;

        // Don't allow deleting self
        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account',
            });
        }

        await prisma.user.update({
            where: { id },
            data: { isActive: false },
        });

        res.json({
            success: true,
            message: 'User deactivated successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

export default router;
