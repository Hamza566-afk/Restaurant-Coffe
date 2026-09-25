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

  tables = signal<Table[]>([]);
  loading = signal<boolean>(true); // ⬅️ Signal الـ Loading

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
    this.loading.set(true);
    this.tableService.getTables().subscribe({
      next: (res) => {
        if (res.success) this.tables.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching tables:', err);
        this.errorMessage.set(this.t('qr.errorLoadTables'));
        this.loading.set(false);
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
   * 🌐 يُرجع الـ Base URL الحالي للفرونتاند
   */
  private getAppBaseUrl(): string {
    return this.document.location.origin;
  }

  /** 🎯 توليد الرابط الصحيح الخاص بالمنيو والسيرفر */
  generateDynamicQrUrl(table: Table, target: 'client' | 'server'): string {
    const baseUrl = this.getAppBaseUrl();
    const shopSubdomain = this.auth.getUser()?.shop?.subdomain;
    const shopId = table.shop_id || this.auth.getUser()?.shop?.id;

    if (target === 'client') {
      if (shopSubdomain) {
        return `${baseUrl}/menu?shop=${encodeURIComponent(shopSubdomain)}&table=${table.table_number}`;
      }
      if (shopId) {
        return `${baseUrl}/menu?shop_id=${shopId}&table=${table.table_number}`;
      }
      return `${baseUrl}/menu?table=${table.table_number}`;
    }

    if (shopId) {
      return `${baseUrl}/server/table/${shopId}/${table.table_number}/checkout`;
    }

    return `${baseUrl}/server/table/${table.table_number}/checkout`;
  }

  /**
   * ⬇️ تحميل صورة الـ QR
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

    const url = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(this.generateDynamicQrUrl(table, target))}`;
    window.open(url, '_blank');
  }

  /**
   * 🗑️ حذف طاولة
   */
  deleteTable(id: number): void {
    this.tableService.deleteTable(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage.set(res.message);
          this.tables.update(list => list.filter(t => t.id !== id));
        }
      },
      error: (err) => {
        const message = err?.error?.message;
        this.errorMessage.set(message ?? this.t('qr.errorDeleteTables'));
      },
    });
  }
}