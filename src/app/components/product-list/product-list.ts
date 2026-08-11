import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product, ProductSize } from '../../services/product';
import { CategoryService, Category } from '../../services/category'; // 🚀 تثبت من مسار الـ Service حسب الـ Terminal
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-list.html',
  styleUrls: ['./product-list.css']
})
export class ProductListComponent implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  protected languageService = inject(LanguageService);
  protected t = (key: string): string => this.languageService.t(key);

  /** القوائم التفاعلية */
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);

  /** علامات حالة الواجهة */
  loading = signal(false);
  showModal = signal(false);
  editMode = signal(false);
  selectedCategory = signal<string>('all');
  
  /** حقل البحث */
  searchTerm = signal<string>('');

  /** إدارة الصور المعروضة والمرفوعة */
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);

/** الـ Variable المرتبطة بحقل إضافة تصنيف جديد سريع م الواجهة */
  newCategoryName = '';

  /** 🆕 الـ Modal الخاص بتعديل اسم التصنيف */
  showCategoryModal = signal(false);
  categoryIdToEdit = signal<number | null>(null);
  categoryNameEditing = signal<string>('');

  /** 🆕 Toast bậc للتنبيهات (أخطاء 422 وغيرها) */
  toastMessage = signal<string>('');
  toastType = signal<'success' | 'error'>('success');
  private toastTimeout: any = null;

  /** الـ Form Model المرتبط بالمودال عبر [(ngModel)] */
  formModel: Product = this.emptyFormModel();

  /** 🆕 Product Sizes / Variants state */
  sizesEnabled = signal<boolean>(false);               // Toggle for variations on/off
  formSizes = signal<ProductSize[]>([]);               // Dynamic size rows

  // ─── Lifecycle ────────────────────────────────────────

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  // ─── Data fetching ────────────────────────────────────

  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        
        // حماية: إذا فما تصنيفات وجينا نصنعوا منتج جديد، نحطو الـ ID متاع أول تصنيف كقيمة افتراضية
        if (data.length > 0 && !this.editMode()) {
          this.formModel.category_id = data[0].id;
        }
      },
      error: () => this.categories.set([])
    });
  }

  loadProducts(): void {
    this.loading.set(true);
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.products.set([]);
        this.loading.set(false);
      },
    });
  }

  // ─── Management of Categories ─────────────────────────

  /** دالة لإرسال التصنيف الجديد للـ Backend وتحديث الواجهة فوراً */
  addNewCategory(): void {
    if (!this.newCategoryName.trim()) return;

    this.categoryService.addCategory(this.newCategoryName.trim()).subscribe({
      next: (newCat) => {
        // تحديث الـ Signal متاع الـ categories ديناميكياً
        this.categories.update(current => [...current, newCat]);
        
        // إذا كان الـ Form Model مازال ما عندوش تصنيف (كان 0)، نعطوه الـ ID الجديد ديريكت
        if (this.formModel.category_id === 0) {
          this.formModel.category_id = newCat.id;
        }
        
        this.newCategoryName = ''; // تفريغ الحقل
      },
error: () => {
        alert('حدث خطأ أثناء إضافة التصنيف، يرجى التأكد من الـ Shop ID أو المحاولة لاحقاً.');
      }
    });
  }

  /** 🆕 فتح الـ Modal لتعديل اسم التصنيف (زر القلم) */
  openEditCategory(cat: Category): void {
    this.categoryIdToEdit.set(cat.id);
    this.categoryNameEditing.set(cat.name);
    this.showCategoryModal.set(true);
  }

  /** 🆕 حفظ الاسم المعدّل للتصنيف (PUT) وتحديث الـ Signal */
  saveCategoryEdit(): void {
    const id = this.categoryIdToEdit();
    const name = this.categoryNameEditing()?.trim();
    if (id === null || !name) return;

    this.categoryService.updateCategory(id, name).subscribe({
      next: (updated) => {
        // تحديث التصنيف في الـ Signal
        this.categories.update(list => list.map(c => (c.id === updated.id ? { ...c, ...updated } : c)));
        this.showCategoryModal.set(false);
        this.showToast('Catégorie renommée avec succès', 'success');
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Erreur lors de la modification de la catégorie';
        this.showToast(msg, 'error');
      }
    });
  }

  /** 🆕 حذف تصنيف مع تأكيد ومعالجة خطأ 422 (إذا فيه منتجات) */
  deleteCategory(cat: Category): void {
    const confirmMsg = `Êtes-vous sûr de vouloir supprimer la catégorie '${cat.name}' ?`;
    if (!confirm(confirmMsg)) return;

    this.categoryService.deleteCategory(cat.id).subscribe({
      next: () => {
        // إزالة التصنيف من الـ Signal
        this.categories.update(list => list.filter(c => c.id !== cat.id));
        // إذا كنا نفلتر عليه، نرجع للكل
        if (this.selectedCategory() === this.toStr(cat.id)) {
          this.selectedCategory.set('all');
        }
        this.showToast('Catégorie supprimée avec succès', 'success');
      },
      error: (err) => {
        // معالجة 422: التصنيف يحتوي منتجات
        const msg = err?.error?.message
          ?? 'Impossible de supprimer cette catégorie car elle contient des produits.';
        this.showToast(msg, 'error');
      }
    });
  }

  /** 🆕 حذف جميع المنتجات (زر Clear All) مع تأكيد صارم */
  clearAllProducts(): void {
    const confirmMsg = 'Êtes-vous sûr de vouloir supprimer TOUS les produits ? Cette action est irréversible !';
    if (!confirm(confirmMsg)) return;

    this.productService.clearAllProducts().subscribe({
      next: () => {
        // تفريغ الـ Signal فوراً
        this.products.set([]);
        this.showToast('Tous les produits ont été supprimés', 'success');
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Erreur lors de la suppression de tous les produits';
        this.showToast(msg, 'error');
      }
    });
  }

  /** 🆕 إظهار Toast مؤقت (نجاح/خطأ) */
  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set('');
    }, 4000);
  }

  // ─── Helpers for template ─────────────────────────────

  /** دالة الفلترة المشتركة */
  getFilteredProducts(): Product[] {
    const catFilter = this.selectedCategory();
    const search = this.searchTerm().toLowerCase().trim();

    return this.products().filter(product => {
      const matchesCategory = catFilter === 'all' || product.category_id === Number(catFilter);
      const matchesSearch = !search || product.name.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }

  getProductCountByCategory(catId: number | string): number {
    if (catId === 'all') {
      return this.products().length;
    }
    return this.products().filter(p => p.category_id === Number(catId)).length;
  }

  getCategoryName(id: number): string {
    const found = this.categories().find(c => c.id === id);
    return found ? found.name : 'غير مصنف';
  }

  toStr(val: number): string {
    return String(val);
  }

  // ─── Image Upload Handling ────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile.set(file);

      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  // ─── Modal actions ────────────────────────────────────

openAddModal(): void {
    this.editMode.set(false);
    this.formModel = this.emptyFormModel();
    
    // إعطاء قيمة الـ category_id لأول عنصر موجود ديناميكياً إذا متوفر
    if (this.categories().length > 0) {
      this.formModel.category_id = this.categories()[0].id;
    }

    // 🆕 Reset size variants (default OFF, no sizes)
    this.sizesEnabled.set(false);
    this.formSizes.set([]);

    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.showModal.set(true);
  }

  openEditModal(product: Product): void {
    this.editMode.set(true);
    this.formModel = { ...product };
    
    if (product.image_url) {
      this.previewUrl.set(product.image_url);
    } else {
      this.previewUrl.set(null);
    }
    
    // 🆕 Pre-populate size variants if the product has any
    const existingSizes = product.sizes && product.sizes.length > 0 ? product.sizes : [];
    this.sizesEnabled.set(existingSizes.length > 0);
    this.formSizes.set(existingSizes.map(s => ({ ...s })));
    
    this.selectedFile.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    // 🆕 Reset size state when closing
    this.sizesEnabled.set(false);
    this.formSizes.set([]);
  }

  // 🆕 Add an empty size row (when toggle is ON)
  addSizeRow(): void {
    this.formSizes.update(rows => [...rows, { size_name: '', price: 0 }]);
  }

  // 🆕 Remove a size row by index
  removeSizeRow(index: number): void {
    this.formSizes.update(rows => rows.filter((_, i) => i !== index));
  }

  setCategoryFilter(catId: string): void {
    this.selectedCategory.set(catId);
  }

  // ─── CRUD operations ──────────────────────────────────

  toggleActive(product: Product): void {
    const nextStatus = !product.is_active;

    this.products.update(list =>
      list.map(p => (p.id === product.id ? { ...p, is_active: nextStatus } : p))
    );

    const formData = new FormData();
    formData.append('_method', 'PUT'); 
    formData.append('name', product.name);
    formData.append('price', String(product.price));
    formData.append('category_id', String(product.category_id));
    formData.append('is_active', nextStatus ? '1' : '0');

    this.productService.updateProduct(product.id, formData).subscribe({
      error: () => this.loadProducts(),
    });
  }

saveProduct(): void {
    // ── 1. Name is required — otherwise log & abort ─────────────────
    if (!this.formModel.name?.trim()) {
      console.error('Form invalid: name is empty', this.formModel);
      this.showToast('Le nom du produit est obligatoire', 'error');
      return;
    }

    // ── 2. Handle price when Size Variations are ENABLED ────────────
    //    If sizes are on, the single price is optional: use the first
    //    size price (or 0) so the backend `nullable` rule passes.
    let priceValue = this.formModel.price;
    if (this.sizesEnabled()) {
      const first = this.formSizes()[0];
      priceValue = (first && Number(first.price)) ? Number(first.price) : 0;
    }

const formData = new FormData();
    formData.append('name', this.formModel.name);
    formData.append('category_id', String(this.formModel.category_id));
    formData.append('price', String(priceValue ?? 0));
    formData.append('description', this.formModel.description || '');
    formData.append('is_active', this.formModel.is_active ? '1' : '0');

    // ⭐ Featured toggle (can be multiple)
    formData.append('is_featured', this.formModel.is_featured ? '1' : '0');

    // 👑 Hero toggle (single per shop — backend enforces uniqueness)
    formData.append('is_hero', this.formModel.is_hero ? '1' : '0');

    // 🆕 Append size variants as JSON string when toggle is ON
    if (this.sizesEnabled()) {
      const sizes = this.formSizes()
        .filter(s => (s.size_name ?? '').trim() !== '')
        .map(s => ({ size_name: s.size_name.trim(), price: Number(s.price) || 0 }));
      formData.append('sizes', JSON.stringify(sizes));
    } else {
      // Toggle OFF → send empty sizes to clear any existing variants on update
      formData.append('sizes', JSON.stringify([]));
    }

    if (this.selectedFile()) {
      formData.append('image', this.selectedFile()!);
    }

    console.log('Submitting product form...', formData);

    // ── 3. Guard against double-submission ──────────────────────────
    if (this.loading()) return;
    this.loading.set(true);

    if (this.editMode()) {
      formData.append('_method', 'PUT');

      this.productService.updateProduct(this.formModel.id, formData).subscribe({
        next: () => {
          this.loading.set(false);
          this.loadProducts();
          this.closeModal();
        },
        error: (err) => {
          console.error('API Error:', err);
          this.loading.set(false);
          this.showToast(err?.error?.message ?? 'Erreur lors de la mise à jour', 'error');
        },
      });
    } else {
      this.productService.addProduct(formData).subscribe({
        next: () => {
          this.loading.set(false);
          this.loadProducts();
          this.closeModal();
        },
        error: (err) => {
          console.error('API Error:', err);
          this.loading.set(false);
          this.showToast(err?.error?.message ?? 'Erreur lors de l\'ajout du produit', 'error');
        },
      });
    }
  }

  deleteProduct(product: Product): void {
    if (!confirm(`تأكيد حذف "${product.name}"؟`)) return;

    this.products.update(list => list.filter(p => p.id !== product.id));

    this.productService.deleteProduct(product.id).subscribe({
      error: () => this.loadProducts(),
    });
  }

  // ─── Private helpers ──────────────────────────────────

private emptyFormModel(): Product {
    return {
      id: 0,
      name: '',
      category_id: 0,
      price: 0,
      is_active: true,
      is_featured: false,
      is_hero: false,
      image_path: null,
      image_url: null,
      description: null,
    };
  }
}
