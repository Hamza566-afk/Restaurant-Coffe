import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyFormat',
  standalone: true
})
export class CurrencyFormatPipe implements PipeTransform {

  transform(
    value: number | string | null | undefined, 
    currencyCode?: string, 
    locale?: string
  ): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const numericValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numericValue)) {
      return '';
    }

    // Default values
    const curr = currencyCode || 'TND';
    const loc = locale || 'ar-TN';

    try {
      // ضبط عدد الأرقام بعد الفاصلة تلقائياً (تونس 3 أرقام، البقية رقمين)
      const fractionDigits = curr.toUpperCase() === 'TND' ? 3 : 2;

      return new Intl.NumberFormat(loc, {
        style: 'currency',
        currency: curr,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
      }).format(numericValue);
    } catch (error) {
      // Fallback في حالة كود عملة أو locale غير معروف
      const fractionDigits = curr.toUpperCase() === 'TND' ? 3 : 2;
      return `${numericValue.toFixed(fractionDigits)} ${curr}`;
    }
  }

}