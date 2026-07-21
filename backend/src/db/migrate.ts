import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate(): Promise<void> {
  console.log('🔄 Iniciando migraciones...');
  
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
  });

  try {
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${config.db.database}`);
    await connection.execute(`USE ${config.db.database}`);

    const migrations = [
      '001_create_users.sql',
      '002_create_host_profiles.sql',
      '003_sp_upsert_google_user.sql',
      '004_create_properties.sql',
      '005_create_amenity_catalog.sql',
      '006_create_property_amenities.sql',
      '007_create_property_photos.sql',
      '008_create_property_videos.sql',
      '009_create_property_translations.sql',
      '010_create_availability_overrides.sql',
      '011_seed_amenity_catalog.sql',
      '012_create_v_search_properties.sql',
      '013_create_v_property_detail.sql',
      '014_create_bookings.sql',
      '015_create_payments.sql',
      '016_create_payouts.sql',
      '017_sp_create_booking.sql',
      '018_sp_cancel_booking.sql',
      '019_sp_expire_pending_bookings.sql',
      '020_v_bookings_detail.sql',
      '021_sp_create_payment_intent.sql',
      '022_sp_confirm_payment.sql',
      '023_sp_process_refund.sql',
      '024_sp_expire_pending_payments.sql',
      '025_sp_approve_host.sql',
      '026_sp_run_payouts.sql',
      '027_v_commission_report.sql',
      '028_sp_create_review.sql',
      '029_sp_reply_review.sql',
      '030_sp_log_email.sql',
      '031_create_platform_settings.sql',
      '032_create_admin_audit_log.sql',
      '033_v_host_dashboard.sql',
      '034_v_admin_kpis.sql',
      '035_sp_log_admin_action.sql',
      '036_create_ical_links.sql',
      '037_create_exchange_rates.sql',
      '038_add_cancellation_columns.sql',
    ];

    for (const file of migrations) {
      console.log(`📁 Ejecutando: ${file}`);
      const sql = readFileSync(join(__dirname, file), 'utf8');
      await connection.query(sql);
      console.log(`✅ ${file} completado`);
    }

    console.log('✅ Todas las migraciones completadas exitosamente');
  } catch (error) {
    console.error('❌ Error en migraciones:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
