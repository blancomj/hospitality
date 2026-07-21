import { ref, computed } from 'vue'
import api from '@/lib/api'

export interface ExchangeRate {
  currencyCode: string
  rateToCop: number
  updatedAt: string
}

export interface CurrencyInfo {
  code: string
  symbol: string
  name: string
  locale: string
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'COP', symbol: '$', name: 'Peso colombiano', locale: 'es-CO' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
]

const STORAGE_KEY = 'preferred_currency'
const RATES_CACHE_KEY = 'exchange_rates_cache'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

const currentCurrency = ref<string>(
  localStorage.getItem(STORAGE_KEY) || 'COP'
)

const rates = ref<ExchangeRate[]>([])
const isLoading = ref(false)

const loadCachedRates = (): boolean => {
  try {
    const cached = localStorage.getItem(RATES_CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_TTL) {
        rates.value = data
        return true
      }
    }
  } catch {}
  return false
}

const saveRatesToCache = (data: ExchangeRate[]) => {
  localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({
    data,
    timestamp: Date.now(),
  }))
}

export const useCurrency = () => {
  const fetchRates = async () => {
    if (loadCachedRates()) return

    isLoading.value = true
    try {
      const response = await api.get('/exchange-rates')
      rates.value = response.data.rates
      saveRatesToCache(response.data.rates)
    } catch (error) {
      console.error('Error fetching exchange rates:', error)
      // Use fallback rates if API fails
      if (rates.value.length === 0) {
        rates.value = [
          { currencyCode: 'COP', rateToCop: 1, updatedAt: new Date().toISOString() },
          { currencyCode: 'USD', rateToCop: 4200, updatedAt: new Date().toISOString() },
          { currencyCode: 'EUR', rateToCop: 4500, updatedAt: new Date().toISOString() },
        ]
      }
    } finally {
      isLoading.value = false
    }
  }

  const getRate = (currencyCode: string): number => {
    const rate = rates.value.find(r => r.currencyCode === currencyCode)
    return rate?.rateToCop || 1
  }

  const convertFromCOP = (amountInCOP: number, targetCurrency: string): number => {
    const rate = getRate(targetCurrency)
    if (rate <= 0) return 0
    return Math.round((amountInCOP / rate) * 100) / 100
  }

  const formatPrice = (priceInCOP: number, currencyCode?: string): string => {
    const targetCurrency = currencyCode || currentCurrency.value
    const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === targetCurrency)
    
    if (!currencyInfo) {
      return `$${new Intl.NumberFormat('es-CO').format(priceInCOP)}`
    }

    if (targetCurrency === 'COP') {
      return `$${new Intl.NumberFormat(currencyInfo.locale).format(priceInCOP)}`
    }

    const converted = convertFromCOP(priceInCOP, targetCurrency)
    return new Intl.NumberFormat(currencyInfo.locale, {
      style: 'currency',
      currency: targetCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(converted)
  }

  const formatPriceWithCOP = (priceInCOP: number, showBoth?: boolean): string => {
    if (currentCurrency.value === 'COP' || !showBoth) {
      return formatPrice(priceInCOP)
    }

    const converted = formatPrice(priceInCOP, currentCurrency.value)
    const copFormatted = `$${new Intl.NumberFormat('es-CO').format(priceInCOP)}`
    return `${converted} (~${copFormatted})`
  }

  const setCurrency = (currency: string) => {
    currentCurrency.value = currency
    localStorage.setItem(STORAGE_KEY, currency)
  }

  const currentCurrencyInfo = computed(() => 
    SUPPORTED_CURRENCIES.find(c => c.code === currentCurrency.value) || SUPPORTED_CURRENCIES[0]
  )

  // Initialize rates on first use
  if (rates.value.length === 0) {
    fetchRates()
  }

  return {
    currentCurrency: computed(() => currentCurrency.value),
    currentCurrencyInfo,
    supportedCurrencies: SUPPORTED_CURRENCIES,
    rates: computed(() => rates.value),
    isLoading: computed(() => isLoading.value),
    fetchRates,
    getRate,
    convertFromCOP,
    formatPrice,
    formatPriceWithCOP,
    setCurrency,
  }
}
