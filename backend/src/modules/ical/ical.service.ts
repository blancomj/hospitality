import pool from '../../db/connection.js';
import { config } from '../../config/index.js';

interface IcalEvent {
  uid: string;
  start: string;
  end: string;
  summary: string;
}

interface IcalLink {
  id: number;
  property_id: number;
  source_name: string;
  ical_url: string;
  last_synced_at: string | null;
  sync_status: string;
  error_message: string | null;
  created_at: string;
}

export function generateIcalExport(
  propertyId: number,
  icalToken: string,
  bookings: Array<{ start_date: string; end_date: string; status: string }>
): string {
  const baseUrl = config.frontendUrl;
  const calUrl = `${baseUrl}/api/v1/properties/${propertyId}/ical/${icalToken}.ics`;

  let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CONSTRUESCALA//Hospitality//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Propiedad ${propertyId}
X-WR-TIMEZONE:America/Bogota`;

  bookings.forEach((booking, index) => {
    const startDate = booking.start_date.replace(/-/g, '');
    const endDate = booking.end_date.replace(/-/g, '');
    
    ical += `
BEGIN:VEVENT
DTSTART;VALUE=DATE:${startDate}
DTEND;VALUE=DATE:${endDate}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
UID:booking-${booking.start_date}-${booking.end_date}-${propertyId}@construescala.com
SUMMARY:Reservado
DESCRIPTION:Estado: ${booking.status}
STATUS:CONFIRMED
END:VEVENT`;
  });

  ical += `
END:VCALENDAR`;

  return ical;
}

export async function getPropertyIcalLinks(
  propertyId: number
): Promise<IcalLink[]> {
  const [rows] = await pool.execute(
    'SELECT * FROM ical_links WHERE property_id = ? ORDER BY created_at DESC',
    [propertyId]
  );
  return rows as IcalLink[];
}

export async function addIcalLink(
  propertyId: number,
  sourceName: string,
  icalUrl: string
): Promise<IcalLink> {
  const [result] = await pool.execute(
    'INSERT INTO ical_links (property_id, source_name, ical_url) VALUES (?, ?, ?)',
    [propertyId, sourceName, icalUrl]
  );

  const insertId = (result as any).insertId;
  const [rows] = await pool.execute(
    'SELECT * FROM ical_links WHERE id = ?',
    [insertId]
  );

  return (rows as IcalLink[])[0];
}

export async function removeIcalLink(
  linkId: number,
  propertyId: number
): Promise<void> {
  await pool.execute(
    'DELETE FROM ical_links WHERE id = ? AND property_id = ?',
    [linkId, propertyId]
  );
}

export async function syncAllIcalLinks(): Promise<{
  synced: number;
  failed: number;
  blockedDates: number;
}> {
  const [links] = await pool.execute(
    'SELECT * FROM ical_links WHERE sync_status != "error" OR last_synced_at IS NULL'
  );

  let synced = 0;
  let failed = 0;
  let totalBlocked = 0;

  for (const link of links as IcalLink[]) {
    try {
      const events = await fetchAndParseIcal(link.ical_url);
      
      if (events.length > 0) {
        const [result] = await pool.execute(
          'CALL sp_sync_ical_events(?, ?, ?)',
          [link.property_id, link.ical_url, JSON.stringify(events)]
        );
        totalBlocked += (result as any)[0][0].blocked_dates;
      } else {
        await pool.execute(
          "UPDATE ical_links SET last_synced_at = NOW(), sync_status = 'synced' WHERE id = ?",
          [link.id]
        );
      }
      
      synced++;
    } catch (error: any) {
      console.error(`Error syncing iCal link ${link.id}:`, error);
      await pool.execute(
        "UPDATE ical_links SET sync_status = 'error', error_message = ? WHERE id = ?",
        [error.message || 'Unknown error', link.id]
      );
      failed++;
    }
  }

  return { synced, failed, blockedDates: totalBlocked };
}

async function fetchAndParseIcal(url: string): Promise<IcalEvent[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch iCal: ${response.status}`);
  }

  const text = await response.text();
  return parseIcal(text);
}

function parseIcal(text: string): IcalEvent[] {
  const events: IcalEvent[] = [];
  const lines = text.split(/\r?\n/);
  
  let currentEvent: Partial<IcalEvent> | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.uid && currentEvent.start && currentEvent.end) {
        events.push(currentEvent as IcalEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('DTSTART')) {
        const dateMatch = line.match(/(\d{8})/);
        if (dateMatch) {
          const d = dateMatch[1];
          currentEvent.start = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
        }
      } else if (line.startsWith('DTEND')) {
        const dateMatch = line.match(/(\d{8})/);
        if (dateMatch) {
          const d = dateMatch[1];
          currentEvent.end = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
        }
      } else if (line.startsWith('UID:')) {
        currentEvent.uid = line.substring(4);
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8);
      }
    }
  }

  return events;
}
