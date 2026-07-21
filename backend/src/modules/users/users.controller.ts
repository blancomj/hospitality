import { Request, Response } from 'express';
import pool from '../../db/connection.js';
import { z } from 'zod';
import { UserRow, HostProfileRow } from '../../types/index.js';

const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(150).optional(),
  phone: z.string().max(20).optional(),
  locale: z.enum(['es', 'en']).optional(),
});

const becomeHostSchema = z.object({
  legalName: z.string().min(1, 'El nombre legal es requerido').max(200),
  documentId: z.string().min(1, 'El número de documento es requerido').max(50),
  bankName: z.string().min(1, 'El nombre del banco es requerido').max(100),
  bankAccountNumber: z.string().min(1, 'El número de cuenta es requerido').max(50),
  bankAccountType: z.enum(['savings', 'checking'], {
    errorMap: () => ({ message: 'Tipo de cuenta debe ser savings o checking' }),
  }),
});

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<UserRow[]>(
      `SELECT id, email, full_name, avatar_url, role, phone, locale, 
              id_verified, fast_response, created_at
       FROM users WHERE id = ?`,
      [req.user!.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const user = rows[0];

    let hostProfile = null;
    if (user.role === 'host' || user.role === 'admin') {
      const [profileRows] = await pool.execute<HostProfileRow[]>(
        `SELECT legal_name, document_id, bank_name, bank_account_number, 
                bank_account_type, commission_rate, approval_status, created_at
         FROM host_profiles WHERE user_id = ?`,
        [user.id]
      );
      
      if (profileRows.length > 0) {
        const profile = profileRows[0];
        hostProfile = {
          legalName: profile.legal_name,
          documentId: profile.document_id,
          bankName: profile.bank_name,
          bankAccountNumber: profile.bank_account_number,
          bankAccountType: profile.bank_account_type,
          commissionRate: profile.commission_rate,
          approvalStatus: profile.approval_status,
          createdAt: profile.created_at,
        };
      }
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        role: user.role,
        phone: user.phone,
        locale: user.locale,
        idVerified: user.id_verified,
        fastResponse: user.fast_response,
        createdAt: user.created_at,
      },
      hostProfile,
    });
  } catch (error) {
    console.error('Error en getMe:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const updates: string[] = [];
    const values: any[] = [];

    if (data.fullName !== undefined) {
      updates.push('full_name = ?');
      values.push(data.fullName);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone);
    }
    if (data.locale !== undefined) {
      updates.push('locale = ?');
      values.push(data.locale);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    values.push(req.user!.id);

    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [rows] = await pool.execute<UserRow[]>(
      `SELECT id, email, full_name, avatar_url, role, phone, locale, 
              id_verified, fast_response, created_at
       FROM users WHERE id = ?`,
      [req.user!.id]
    );

    const user = rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        role: user.role,
        phone: user.phone,
        locale: user.locale,
        idVerified: user.id_verified,
        fastResponse: user.fast_response,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Datos inválidos',
        details: error.errors,
      });
      return;
    }
    console.error('Error en updateMe:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const becomeHost = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = becomeHostSchema.parse(req.body);

    const [existing] = await pool.execute(
      'SELECT user_id FROM host_profiles WHERE user_id = ?',
      [req.user!.id]
    );

    if ((existing as any[]).length > 0) {
      res.status(409).json({ 
        error: 'Ya tienes un perfil de propietario',
        code: 'HOST_PROFILE_EXISTS' 
      });
      return;
    }

    await pool.execute(
      `INSERT INTO host_profiles (user_id, legal_name, document_id, bank_name, bank_account_number, bank_account_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user!.id,
        data.legalName,
        data.documentId,
        data.bankName,
        data.bankAccountNumber,
        data.bankAccountType,
      ]
    );

    await pool.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      ['host', req.user!.id]
    );

    res.status(201).json({
      message: 'Perfil de propietario creado. Pendiente de aprobación por el administrador.',
      hostProfile: {
        legalName: data.legalName,
        documentId: data.documentId,
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountType: data.bankAccountType,
        approvalStatus: 'pending_approval',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Datos inválidos',
        details: error.errors,
      });
      return;
    }
    console.error('Error en becomeHost:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateHostProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const [existing] = await pool.execute(
      'SELECT user_id FROM host_profiles WHERE user_id = ?',
      [req.user!.id]
    );

    if ((existing as any[]).length === 0) {
      res.status(404).json({ 
        error: 'No tienes un perfil de propietario',
        code: 'HOST_PROFILE_NOT_FOUND' 
      });
      return;
    }

    const { legalName, documentId, bankName, bankAccountNumber, bankAccountType } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (legalName !== undefined) {
      updates.push('legal_name = ?');
      values.push(legalName);
    }
    if (documentId !== undefined) {
      updates.push('document_id = ?');
      values.push(documentId);
    }
    if (bankName !== undefined) {
      updates.push('bank_name = ?');
      values.push(bankName);
    }
    if (bankAccountNumber !== undefined) {
      updates.push('bank_account_number = ?');
      values.push(bankAccountNumber);
    }
    if (bankAccountType !== undefined) {
      updates.push('bank_account_type = ?');
      values.push(bankAccountType);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    values.push(req.user!.id);

    await pool.execute(
      `UPDATE host_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
      values
    );

    res.json({ message: 'Perfil de propietario actualizado' });
  } catch (error) {
    console.error('Error en updateHostProfile:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
