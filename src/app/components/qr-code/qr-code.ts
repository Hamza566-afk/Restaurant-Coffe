import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { LanguageService } from '../../services/language.service';
import { AuthService } from '../../services/auth';
import { TableService, Table } from '../../services/table';

@Component({
  selector: 'app-qr-code',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent],
  templateUrl: './qr-code.html',
  styleUrl: './qr-code.css',
})
export class QrCode implements OnInit {
  protected languageService = inject(LanguageService);
  protected t = (key: string): string => this.languageService.t(key);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly tableService = inject(TableService);

  /** المسار العمومي للمنيو (موجود في AppRoutes: { path: 'menu' }) */
  private readonly menuPath = '/menu';

  tables = signal<Table[]>([]);

  // متغيّرات الـ Form
  addMode = signal<'bulk' | 'single'>('bulk');
  numberOfTables = signal<number | null>(null);
  specificTableNumber = signal<number | null>(null);

  // رسائل التنبيه
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  ngOnInit(): void {
    this.loadTables();
  }

  loadTables(): void {
    this.tableService.getTables().subscribe({
      next: (res) => {
        if (res.success) this.tables.set(res.data);
      },
      error: (err) => {
        console.error('Error fetching tables:', err);
        this.errorMessage.set(this.t('qr.errorLoadTables'));
      },
    });
  }

  addTables(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    let payload: Record<string, unknown> = {};
    if (this.addMode() === 'bulk') {
      if (!this.numberOfTables() || this.numberOfTables()! < 1) {
        this.errorMessage.set(this.t('qr.errorInvalidNumber'));
        return;
      }
      payload['number_of_tables'] = this.numberOfTables();
    } else {
      if (!this.specificTableNumber() || this.specificTableNumber()! < 1) {
        this.errorMessage.set(this.t('qr.errorInvalidNumber'));
        return;
      }
      payload['table_number'] = this.specificTableNumber();
    }

    this.tableService.addTables(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage.set(res.message);
          this.numberOfTables.set(null);
          this.specificTableNumber.set(null);
          this.loadTables();
        }
      },
      error: (err) => {
        if (err.error && err.error.message) {
          this.errorMessage.set(err.error.message);
        } else {
          this.errorMessage.set(this.t('qr.errorAddTables'));
        }
      },
    });
  }

  /**
   * 🌐 يُرجع الـ Base URL الخاص بالـ Shop بناءً على:
   *  - Subdomain المالك المُسجّل دخوله عبر AuthService
   *  - البيئة الحالية: Dev (localhost) vs Production (cafesaas.com)
   */
  private getShopBaseUrl(): string {
    const subdomain = this.auth.getUser()?.shop?.subdomain ?? '';

    const hostname = this.document.location.hostname;
    const isLocalhost =
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '127.0.0.1';

    return isLocalhost
      ? `http://${subdomain}.localhost:4200`
      : `https://${subdomain}.cafesaas.com`;
  }

  /** 🎯 رابط المنيو الخاص بالحريف: `{shop_base_url}/menu?table_id={tableNumber}` */
  getCustomerMenuUrl(tableNumber: number | string): string {
    const table = encodeURIComponent(String(tableNumber));
    return `${this.getShopBaseUrl()}${this.menuPath}?table_id=${table}`;
  }

  /** 🎯 الرابط الديناميكي للـ QR (عميل أو سرفور) */
  generateDynamicQrUrl(table: Table, target: 'client' | 'server'): string {
    if (target === 'client') {
      return this.getCustomerMenuUrl(table.table_number);
    }
    return `${this.getShopBaseUrl()}/server/table/${table.table_number}`;
  }

  /**
   * ⬇️ تحميل صورة الـ QR بدقة عالية (512px) مع تعطيل التنعيم
   */
  downloadQr(table: Table, target: 'client' | 'server'): void {
    const type = target === 'client' ? 'menu' : 'server';
    const filename = `table_${table.table_number}_${type}.png`;
    const elementId = `qr-${target}-${table.id}`;
    const qrElement = this.document.getElementById(elementId);
    const canvas = qrElement?.querySelector('canvas') as HTMLCanvasElement | null;

    if (canvas) {
      const exportSize = 512;
      const highRes = this.document.createElement('canvas');
      highRes.width = exportSize;
      highRes.height = exportSize;
      const ctx = highRes.getContext('2d');

      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(canvas, 0, 0, exportSize, exportSize);

        const link = this.document.createElement('a');
        link.href = highRes.toDataURL('image/png');
        link.download = filename;
        link.click();
        return;
      }
    }

    // Fallback: مولّد خارجي بجودة عالية
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(this.generateDynamicQrUrl(table, target))}`;
    window.open(url, '_blank');
  }

  /**
   * 🗑️ حذف طاولة:
   *  - تأكيد قبل الحذف (مترجم باللغة الحالية)
   *  - حذف عبر TableService (نفس الأصل + Sanctum cookie auth)
   *  - إزالة الكارت ديناميكياً من الـ Signal فور النجاح (بدون إعادة تحميل)
   *  - معالجة الأخطاء برسالة واضحة (مثلاً: الطاولة عليها طلبات نشطة)
   */
deleteTable(id: number): void {
    console.log('🗑️ Deleting table:', id);
    console.log('📡 Sending DELETE request for table:', id);

    this.tableService.deleteTable(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage.set(res.message);
          // 🆕 إزالة الكارت فوراً من الـ Signal دون طلب الـ API من جديد
          this.tables.update(list => list.filter(t => t.id !== id));
        }
      },
      error: (err) => {
        // رسالة من الباكند (مثل: يوجد طلبات نشطة) أو رسالة عامة
        const message = err?.error?.message;
        this.errorMessage.set(message ?? this.t('qr.errorDeleteTables'));
      },
    });
  }
}
