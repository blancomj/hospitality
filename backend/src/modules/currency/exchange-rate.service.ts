import pool from '../../db/connection.js';

const FREE_API_URL = 'https://api.exchangerate-api.com/v4/latest/COP';

export interface ExchangeRate {
  currencyCode: string;
  rateToCop: number;
  updatedAt: Date;
}

export const getExchangeRates = async (): Promise<ExchangeRate[]> => {
  const [rows] = await pool.execute(
    'SELECT currency_code, rate_to_cop, updated_at FROM exchange_rates ORDER BY currency_code'
  );
  return (rows as any[]).map(row => ({
    currencyCode: row.currency_code,
    rateToCop: parseFloat(row.rate_to_cop),
    updatedAt: row.updated_at,
  }));
};

export const getExchangeRate = async (currencyCode: string): Promise<ExchangeRate | null> => {
  const [rows] = await pool.execute(
    'SELECT currency_code, rate_to_cop, updated_at FROM exchange_rates WHERE currency_code = ?',
    [currencyCode.toUpperCase()]
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  return {
    currencyCode: row.currency_code,
    rateToCop: parseFloat(row.rate_to_cop),
    updatedAt: row.updated_at,
  };
};

export const convertFromCOP = (amountInCOP: number, rateToCOP: number): number => {
  if (rateToCOP <= 0) return 0;
  return Math.round((amountInCOP / rateToCOP) * 100) / 100;
};

export const fetchAndUpdateRates = async (): Promise<boolean> => {
  try {
    const response = await fetch(FREE_API_URL);
    if (!response.ok) {
      console.error('Failed to fetch exchange rates:', response.statusText);
      return false;
    }

    const data = await response.json() as { rates: Record<string, number> };
    const rates = data.rates;

    // The API returns rates relative to 1 COP
    // We need to invert: if 1 USD = 4200 COP, then rate_to_cop = 4200
    const currenciesToUpdate = ['USD', 'EUR'];

    for (const currency of currenciesToUpdate) {
      if (rates[currency]) {
        // rates[currency] = how many units of currency per 1 COP
        // We want: how many COP per 1 unit of currency
        const rateToCOP = 1 / rates[currency];
        await pool.execute(
          `INSERT INTO exchange_rates (currency_code, rate_to_cop) 
           VALUES (?, ?) 
           ON DUPLICATE KEY UPDATE rate_to_cop = ?`,
          [currency, rateToCOP, rateToCOP]
        );
      }
    }

    console.log('✅ Exchange rates updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating exchange rates:', error);
    return false;
  }
};
