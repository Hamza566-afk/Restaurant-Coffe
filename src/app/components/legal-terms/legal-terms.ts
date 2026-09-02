import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-legal-terms',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './legal-terms.html',
  styleUrls: ['./legal-terms.css']
})
export class LegalTermsComponent {
  currentLang: 'fr' | 'ar' | 'en' = 'fr';

  content = {
    fr: {
      title: "Conditions Générales & Propriété Intellectuelle",
      ownershipTitle: "Propriété Exclusive",
      ownershipText: "Cette plate-forme, son code source, son design et ses bases de données sont la propriété exclusive de M. Hamza Hadded.",
      licenseTitle: "Licence d'Utilisation",
      licenseText: "L'inscription vous accorde un droit d'utilisation temporaire et non exclusif pour la gestion de votre établissement.",
      protectionTitle: "Protection Juridique",
      protectionText: "Toute tentative de reproduction, ingénierie inverse (reverse engineering) ou revente est strictement interdite sous peine de poursuites judiciaires.",
      approvalTitle: "Validation du Compte",
      approvalText: "Après acceptation, votre compte sera placé en attente d'activation par l'administrateur.",
      acceptBtn: "J'accepte les conditions et continuer"
    },
    ar: {
      title: "الشروط العامة والملكية الفكرية",
      ownershipTitle: "الملكية الحصرية",
      ownershipText: "هذه المنصة بكافة مكوناتها والكود البرمجي والتصميم هي ملك فكري وحصري للسيد حمزة حداد (Hamza Hadded).",
      licenseTitle: "ترخيص الاستخدام",
      licenseText: "التسجيل يمنحك حق استخدام مؤقت وغير حصري لإدارة منطقتك/مقهالك فقط.",
      protectionTitle: "الحماية القانونية",
      protectionText: "يُحظر تماماً محاولة نسخ الكود أو تفكيكه أو إعادة بيعه، وأي مخالفة تعرض صاحبها للملاحقة القانونية.",
      approvalTitle: "تفعيل الحساب",
      approvalText: "بعد الموافقة، سيتم تحويل حسابك لصفحة الانتظار لحين تفعيله من طرف الإدارة.",
      acceptBtn: "أوافق على الشروط والاستمرار"
    },
    en: {
      title: "Terms of Service & Intellectual Property",
      ownershipTitle: "Exclusive Ownership",
      ownershipText: "This platform, source code, and design are the exclusive property of Mr. Hamza Hadded.",
      licenseTitle: "User License",
      licenseText: "Registration grants a limited, non-exclusive right of use for your business.",
      protectionTitle: "Legal Protection",
      protectionText: "Any attempt to copy, reverse-engineer, or resell this software is strictly prohibited by law.",
      approvalTitle: "Account Approval",
      approvalText: "Upon acceptance, your account will await manual admin activation.",
      acceptBtn: "I Accept Terms and Continue"
    }
  };

  constructor(private router: Router) {}

  setLanguage(lang: 'fr' | 'ar' | 'en') {
    this.currentLang = lang;
  }

  acceptTerms() {
    // 1. تسجّل في الـ LocalStorage أو تبث للـ Backend أن الشروط تم قبولها
    localStorage.setItem('accepted_terms', 'true');
    localStorage.setItem('accepted_at', new Date().toISOString());

    // 2. التوجيه المباشر لصفحة الانتظار
    this.router.navigate(['/waiting-approval']);
  }
}