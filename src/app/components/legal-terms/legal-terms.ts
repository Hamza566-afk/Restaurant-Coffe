import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LanguageService, Language } from '../../services/language.service'; // ثبت في المسار حسب مشروعك

@Component({
  selector: 'app-legal-terms',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './legal-terms.html',
  styleUrls: ['./legal-terms.css']
})
export class LegalTermsComponent {
  readonly langService = inject(LanguageService);
  private router = inject(Router);

  setLanguage(lang: Language): void {
    this.langService.setLanguage(lang);
  }

  acceptTerms(): void {
    localStorage.setItem('accepted_terms', 'true');
    localStorage.setItem('accepted_at', new Date().toISOString());

    this.router.navigate(['/waiting-approval']);
  }
}