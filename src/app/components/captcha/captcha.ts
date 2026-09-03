import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-captcha',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './captcha.html',
  styleUrls: ['./captcha.css']
})
export class CaptchaComponent implements OnInit {
  captchaCode = '';
  userInput = '';
  @Output() isValid = new EventEmitter<boolean>();

  ngOnInit() {
    this.generateCaptcha();
  }

  generateCaptcha() {
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.captchaCode = code;
    this.userInput = '';
    this.isValid.emit(false);
  }

  validate() {
    const isCorrect = this.userInput.trim().toUpperCase() === this.captchaCode;
    this.isValid.emit(isCorrect);
  }
}