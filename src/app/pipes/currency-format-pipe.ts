import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Pipe({
  name: 'currencyFormat',
  standalone: true
})
export class CurrencyFormatPipe implements PipeTransform {
  private languageService = inject(LanguageService);

  transform(
    value: number | string | null | undefined, 
    currencyCode?: string, 
    langCode?: string
  ): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    let numericValue: number;
    if (typeof value === 'string') {
      numericValue = parseFloat(value.replace(',', '.'));
    } else {
      numericValue = value;
    }

    if (isNaN(numericValue)) {
      return '';
    }

    const curr = (currencyCode || 'TND').toUpperCase();
    const isAr = langCode ? langCode.startsWith('ar') : this.languageService.isRtl();

    // عدد الأرقام بعد الفاصلة
    const fractionDigits = curr === 'TND' ? 3 : 2;

    // تنسيق الرقم بـ en-US دائماً لضمان الأرقام اللاتينية العادية (0-9)
    const formattedNumber = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(numericValue);

    // جلب رمز العملة المترجم من LanguageService
    const symbol = this.languageService.getCurrencySymbol(curr);

    // إذا كانت العربية تظهر "5.50 ر.س" وإذا غير ذلك تظهر "SAR 5.50"
    return isAr ? `${formattedNumber} ${symbol}` : `${symbol} ${formattedNumber}`;
  }
}