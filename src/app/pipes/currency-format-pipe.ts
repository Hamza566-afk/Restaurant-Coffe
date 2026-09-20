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

    // تبديل الفاصلة (,) بالنقطة (.) وتحويل النص إلى رقم صحيح
    let numericValue: number;
    if (typeof value === 'string') {
      const sanitized = value.replace(',', '.');
      numericValue = parseFloat(sanitized);
    } else {
      numericValue = value;
    }

    if (isNaN(numericValue)) {
      return '';
    }

    // العملة الافتراضية
    const curr = currencyCode || 'TND';

    // استخدام 'en-US' دائماً لتثبيت الأرقام اللاتينية (0-9) ومنع تحولها إلى أرقام هندية
    const formattingLocale = 'en-US';

    try {
      // تحديد عدد الأرقام بعد الفاصلة (تونس 3 أرقام، باقي العملات مثل SAR ورقمين)
      const fractionDigits = curr.toUpperCase() === 'TND' ? 3 : 2;

      const formattedNumber = new Intl.NumberFormat(formattingLocale, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
      }).format(numericValue);

      // إرجاع النتيجة بالشكل الصحيح: "SAR 5.50" أو "TND 5.500"
      return `${curr} ${formattedNumber}`;
    } catch (error) {
      // Fallback في حالة وجود خطأ
      const fractionDigits = curr.toUpperCase() === 'TND' ? 3 : 2;
      return `${curr} ${numericValue.toFixed(fractionDigits)}`;
    }
  }

}