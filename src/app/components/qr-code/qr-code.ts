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
   * 🌐 يُرجع الـ Base URL الحالي للفرونتاند
   */
  private getAppBaseUrl(): string {
    const origin = this.document.location.origin; // يرجع ديريكت https://restaurant-coffe-two.vercel.app أو localhost
    return origin;
  }

  /** 🎯 الرابط الديناميكي للـ QR (عميل أو سرفور) القادم من الباكاند أو المولّد ديناميكياً */
  generateDynamicQrUrl(table: Table, target: 'client' | 'server'): string {
    const subdomain = this.auth.getUser()?.shop?.subdomain ?? '';

    if (target === 'client') {
      // 1. إذا الباكاند بعث qr_code_url جاهز نستعملوه مباشرة
      if (table.qr_code_url) {
        return table.qr_code_url;
      }
      // 2. Fallback ديناميكي يتكيف مع Vercel و Localhost
      return `${this.getAppBaseUrl()}/menu?shop=${subdomain}&table_id=${table.table_number}`;
    } else {
      if (table.server_qr_code_url) {
        return table.server_qr_code_url;
      }
      return `${this.getAppBaseUrl()}/server/table/${table.table_number}`;
    }
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
   * 🗑️ حذف طاولة
   */
  deleteTable(id: number): void {
    console.log('🗑️ Deleting table:', id);
    console.log('📡 Sending DELETE request for table:', id);

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