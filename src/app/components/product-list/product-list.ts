import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product, ProductSize } from '../../services/product';
import { CategoryService, Category } from '../../services/category';
import { LanguageService } from '../../services/language.service';
import { AIService, ParsedProduct, ParseMenuResponse } from '../../services/ai.service';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

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
  private aiService = inject(AIService);
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

  /** الـ Variable المرتبطة بحقل إضافة تصنيف جديد سريع من الواجهة */
  newCategoryName = '';

  /** 🆕 الـ Modal الخاص بتعديل اسم التصنيف */
  showCategoryModal = signal(false);
  categoryIdToEdit = signal<number | null>(null);
  categoryNameEditing = signal<string>('');

  /** 🤖 AI State Signals & Properties */
  isGeneratingImage = signal(false);
  showAiModal = signal(false);
  aiTab = signal<'ocr' | 'chat'>('ocr');
  isParsingMenu = signal(false);
  isImporting = signal(false);
  isGeneratingBulkImages = signal(false);
  imageGenProgress = signal({ current: 0, total: 0 });
  parsedProducts = signal<ParsedProduct[]>([]);
  chatMessages = signal<ChatMessage[]>([
    { sender: 'ai', text: 'أهلاً بك! أنا مساعدك الذكي. كيف أستطيع مساعدتك اليوم في إدارة مقهاك؟' }
  ]);
  chatInput = '';
  isChatting = signal(false);

  /** 🆕 Toast للتنبيهات */
  toastMessage = signal<string>('');
  toastType = signal<'success' | 'error'>('success');
  private toastTimeout: any = null;

  /** الـ Form Model المرتبط بالمودال عبر [(ngModel)] */
  formModel: Product = this.emptyFormModel();

  /** 🆕 Product Sizes / Variants state */
  sizesEnabled = signal<boolean>(false);
  formSizes = signal<ProductSize[]>([]);

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

  addNewCategory(): void {
    if (!this.newCategoryName.trim()) return;

    this.categoryService.addCategory(this.newCategoryName.trim()).subscribe({
      next: (newCat) => {
        this.categories.update(current => [...current, newCat]);
        if (this.formModel.category_id === 0) {
          this.formModel.category_id = newCat.id;
        }
        this.newCategoryName = '';
        this.showToast('Catégorie ajoutée avec succès', 'success');
      },
      error: () => {
        this.showToast('Erreur lors de l\'ajout de la catégorie', 'error');
      }
    });
  }

  openEditCategory(cat: Category): void {
    this.categoryIdToEdit.set(cat.id);
    this.categoryNameEditing.set(cat.name);
    this.showCategoryModal.set(true);
  }

  saveCategoryEdit(): void {
    const id = this.categoryIdToEdit();
    const name = this.categoryNameEditing()?.trim();
    if (id === null || !name) return;

    this.categoryService.updateCategory(id, name).subscribe({
      next: (updated) => {
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

  deleteCategory(cat: Category): void {
    const confirmMsg = `Êtes-vous sûr de vouloir supprimer la catégorie '${cat.name}' ?`;
    if (!confirm(confirmMsg)) return;

    this.categoryService.deleteCategory(cat.id).subscribe({
      next: () => {
        this.categories.update(list => list.filter(c => c.id !== cat.id));
        if (this.selectedCategory() === this.toStr(cat.id)) {
          this.selectedCategory.set('all');
        }
        this.showToast('Catégorie supprimée avec succès', 'success');
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Impossible de supprimer cette catégorie car elle contient des produits.';
        this.showToast(msg, 'error');
      }
    });
  }

  clearAllProducts(): void {
    const confirmMsg = 'Êtes-vous sûr de vouloir supprimer TOUS les produits ? Cette action est irréversible !';
    if (!confirm(confirmMsg)) return;

    this.productService.clearAllProducts().subscribe({
      next: () => {
        this.products.set([]);
        this.showToast('Tous les produits ont été supprimés', 'success');
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Erreur lors de la suppression de tous les produits';
        this.showToast(msg, 'error');
      }
    });
  }

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

  // ─── AI Service Actions ───────────────────────────────

  /** 1. توليد صورة للمنتج بالـ AI */
  generateAIImage(): void {
    if (!this.formModel.name?.trim()) {
      this.showToast('Veuillez d\'abord saisir le nom du produit', 'error');
      return;
    }

    this.isGeneratingImage.set(true);

    if (this.editMode() && this.formModel.id) {
      this.productService.generateProductImage(this.formModel.id).subscribe({
        next: (res: any) => {
          if (res.success && res.product?.image_url) {
            this.previewUrl.set(res.product.image_url);
            this.formModel.image_url = res.product.image_url;
            this.showToast('Image générée et enregistrée avec succès', 'success');
          } else {
            this.showToast('Erreur lors de la génération', 'error');
          }
          this.isGeneratingImage.set(false);
        },
        error: () => {
          this.showToast('Erreur lors de la génération de l\'image', 'error');
          this.isGeneratingImage.set(false);
        }
      });
    } else {
      this.aiService.generateProductImage(this.formModel.name).subscribe({
        next: (res) => {
          if (res.success && res.image_url) {
            this.previewUrl.set(res.image_url);
            this.showToast('Image générée avec succès', 'success');
          }
          this.isGeneratingImage.set(false);
        },
        error: () => {
          this.showToast('Erreur lors de la génération de l\'image', 'error');
          this.isGeneratingImage.set(false);
        }
      });
    }
  }

  /** 2. فتح وإغلاق مودال الـ AI Assistant */
  openAiAssistantModal(): void {
    this.showAiModal.set(true);
  }

  closeAiModal(): void {
    this.showAiModal.set(false);
    this.parsedProducts.set([]);
  }

  /** 3. قراءة ورقة المينيو بالأي آي وعرضها في Editable Table */
  onMenuImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.isParsingMenu.set(true);

      this.aiService.parseMenu(file).subscribe({
        next: (res: ParseMenuResponse) => {
          if (res.success && res.products) {
            const productsWithSelection = res.products.map((p: ParsedProduct) => ({ ...p, selected: true }));
            this.parsedProducts.set(productsWithSelection);
            this.showToast('Menu analysé avec succès! Vérifiez les éléments ci-dessous.', 'success');
          }
          this.isParsingMenu.set(false);
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? 'Erreur lors de la lecture du menu';
          this.showToast(msg, 'error');
          this.isParsingMenu.set(false);
        }
      });
    }
  }

  addParsedRow(): void {
    this.parsedProducts.update(list => [
      ...list,
      { name: '', price: 0, category: 'Général', selected: true }
    ]);
  }

  removeParsedProduct(index: number): void {
    this.parsedProducts.update(list => list.filter((_, i) => i !== index));
  }

  /** 4. حفظ المنتجات المستخرجة في قاعدة البيانات ثم توليد الصور متسلسلاً */
  confirmImportAndGenerateImages(): void {
    const selected = this.parsedProducts().filter(p => p.selected && p.name.trim() !== '');
    if (selected.length === 0) {
      this.showToast('Veuillez sélectionner au moins un produit valide', 'error');
      return;
    }

    this.isImporting.set(true);

    this.aiService.confirmImport(selected).subscribe({
      next: (res) => {
        this.isImporting.set(false);
        if (res.success && res.products) {
          this.loadProducts();
          this.loadCategories();
          this.showToast(`${res.products.length} produits enregistrés! Génération des images en cours...`, 'success');
          
          // بدء توليد الصور للمنتجات المضافة متسلسلاً
          this.generateImagesForImportedProducts(res.products);
        }
      },
      error: (err) => {
        this.isImporting.set(false);
        const msg = err?.error?.message ?? 'Erreur lors de l\'enregistrement des produits';
        this.showToast(msg, 'error');
      }
    });
  }

  /** 5. 🚀 توليد الصور بشكل متسلسل واحد تلو الآخر لكل المنتجات المستوردة */
  async generateImagesForImportedProducts(createdProducts: Product[]): Promise<void> {
    this.isGeneratingBulkImages.set(true);
    this.imageGenProgress.set({ current: 0, total: createdProducts.length });

    for (let i = 0; i < createdProducts.length; i++) {
      const product = createdProducts[i];
      this.imageGenProgress.set({ current: i + 1, total: createdProducts.length });

      try {
        await new Promise<void>((resolve) => {
          this.productService.generateProductImage(product.id).subscribe({
            next: (res: any) => {
              if (res.success && res.product) {
                this.products.update(list =>
                  list.map(p => p.id === product.id ? res.product : p)
                );
              }
              resolve();
            },
            error: () => resolve() // الاستمرار حتى في حالة حدوث خطأ في منتج معين
          });
        });
      } catch (err) {
        console.error(`Error generating image for ${product.name}`, err);
      }
    }

    this.isGeneratingBulkImages.set(false);
    this.closeAiModal();
    this.showToast('Toutes les images ont été générées et enregistrées avec succès !', 'success');
  }

  /** 6. إرسال رسالة للشات مع المساعد الذكي */
  sendChatMessage(): void {
    if (!this.chatInput.trim() || this.isChatting()) return;

    const userText = this.chatInput.trim();
    this.chatMessages.update(msgs => [...msgs, { sender: 'user', text: userText }]);
    this.chatInput = '';
    this.isChatting.set(true);

    this.aiService.chat(userText, { products_count: this.products().length }).subscribe({
      next: (res) => {
        if (res.success) {
          this.chatMessages.update(msgs => [...msgs, { sender: 'ai', text: res.reply }]);
        }
        this.isChatting.set(false);
      },
      error: () => {
        this.chatMessages.update(msgs => [...msgs, { sender: 'ai', text: 'عذراً، حدث خطأ أثناء الاتصال بالمساعد الذكي.' }]);
        this.isChatting.set(false);
      }
    });
  }

  // ─── Helpers for template ─────────────────────────────

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
    
    if (this.categories().length > 0) {
      this.formModel.category_id = this.categories()[0].id;
    }

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
    this.sizesEnabled.set(false);
    this.formSizes.set([]);
  }

  addSizeRow(): void {
    this.formSizes.update(rows => [...rows, { size_name: '', price: 0 }]);
  }

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
    if (!this.formModel.name?.trim()) {
      this.showToast('Le nom du produit est obligatoire', 'error');
      return;
    }

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
    formData.append('is_featured', this.formModel.is_featured ? '1' : '0');
    formData.append('is_hero', this.formModel.is_hero ? '1' : '0');

    if (this.sizesEnabled()) {
      const sizes = this.formSizes()
        .filter(s => (s.size_name ?? '').trim() !== '')
        .map(s => ({ size_name: s.size_name.trim(), price: Number(s.price) || 0 }));
      formData.append('sizes', JSON.stringify(sizes));
    } else {
      formData.append('sizes', JSON.stringify([]));
    }

    if (this.selectedFile()) {
      formData.append('image', this.selectedFile()!);
    }

    if (this.loading()) return;
    this.loading.set(true);

    if (this.editMode()) {
      formData.append('_method', 'PUT');

      this.productService.updateProduct(this.formModel.id, formData).subscribe({
        next: () => {
          this.loading.set(false);
          this.loadProducts();
          this.closeModal();
          this.showToast('Produit mis à jour avec succès', 'success');
        },
        error: (err) => {
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
          this.showToast('Produit ajouté avec succès', 'success');
        },
        error: (err) => {
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