type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP' | string;

interface FormatPriceOptions {
  currency?: CurrencyCode;
  locale?: string;
  isMinorUnit?: boolean;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
}

const CURRENCY_LOCALE_MAP: Record<string, string> = {
  AED: 'en-AE',
  SAR: 'en-SA',
  USD: 'en-US',
  INR: 'en-IN',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

/**
 * Formats a monetary value safely.
 * @param value The value from the database
 * @param options Configuration for currency, locale, and unit conversion
 */
export function formatPrice(
  value: number,
  options: FormatPriceOptions = {}
): string {
  const {
    currency = 'AED',
    locale = CURRENCY_LOCALE_MAP[currency.toUpperCase()] || 'en-US',
    isMinorUnit = false, // Default to false for existing decimal-based mock JSON data
    maximumFractionDigits,
    minimumFractionDigits,
  } = options;

  let decimalValue = value;
  if (isMinorUnit) {
    const exponent = getCurrencyExponent(currency);
    decimalValue = value / Math.pow(10, exponent);
  }

  const maxDigits = maximumFractionDigits ?? 2;
  const minDigits = minimumFractionDigits ?? (maximumFractionDigits === 0 ? 0 : 2);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    }).format(decimalValue);
  } catch (error) {
    console.error('Failed to format currency:', error);
    return `${currency.toUpperCase()} ${decimalValue.toFixed(2)}`;
  }
}

function getCurrencyExponent(currency: string): number {
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'CLP', 'VND'];
  const threeDecimalCurrencies = ['BHD', 'JOD', 'KWD', 'OMR'];
  
  const upperCurrency = currency.toUpperCase();
  if (zeroDecimalCurrencies.includes(upperCurrency)) return 0;
  if (threeDecimalCurrencies.includes(upperCurrency)) return 3;
  return 2;
}
