-- ============================================
-- Migración 045: Agregar columnas faltantes a payouts
-- CONSTRUESCALA Hospitality
-- ============================================

ALTER TABLE payouts
  ADD COLUMN wompi_payout_reference VARCHAR(100) AFTER status,
  ADD COLUMN paid_at TIMESTAMP NULL AFTER wompi_payout_reference;
