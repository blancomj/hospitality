import mysql from 'mysql2/promise';
import dns from 'dns';
import { promisify } from 'util';
import { config } from '../config/index.js';

const dnsLookup = promisify(dns.lookup);

// Resolve hostname to IPv4 at module load time
let resolvedHost = config.db.host;

try {
  const result = await dnsLookup(config.db.host, { family: 4 });
  resolvedHost = result.address;
  console.log(`[DB] Resolved ${config.db.host} -> ${resolvedHost} (IPv4)`);
} catch {
  console.warn(`[DB] DNS lookup failed, using original hostname: ${config.db.host}`);
}

const pool = mysql.createPool({
  host: resolvedHost,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
