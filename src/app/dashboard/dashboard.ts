import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { FeriadosService } from '../feriados.services';

/* ======================================================
   Calendar cell model.
   Optional properties allow padding days in the grid.
   Modelo da célula do calendário.
   Propriedades opcionais permitem dias de preenchimento (padding) na grade.
   ====================================================== */
type CalendarCell = {
  date?: number; // Day number (1..31)
  fullDate?: string; // Full date in 'YYYY-MM-DD' format
};

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,

    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatProgressBarModule,
    MatIconModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatSnackBarModule,

    ZXingScannerModule,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  /* ======================================================
     BASIC STATE
     ESTADO BÁSICO
     ====================================================== */

  username: string;
  greetingMessage: string = '';

  /* ======================================================
     CALENDAR STATE
     ESTADO DO CALENDÁRIO
    🔹 qual mês está sendo exibido
    🔹 qual ano está ativo
    🔹 quais dias existem naquele mês
    🔹 quais dias estão marcados como presença
     ====================================================== */

  weekStart: 'sun' | 'mon' = 'sun';

  currentMonth!: number; // 0 = January
  currentYear!: number;
  currentMonthName: string = '';

  daysInMonth: CalendarCell[] = [];
  presenceDays: string[] = [];

  presencePercentage: number = 0;
  presenceGoal: number = 0;

  feriados: string[] = [];

  /* ======================================================
     UI STATE
     ====================================================== */

  isDarkMode = false;
  showScanner = false;

  /* ======================================================
     COMPUTED PROPERTIES
     ====================================================== */

  // Weekday labels shown in the calendar header
  get weekDays(): string[] {
    return this.weekStart === 'mon'
      ? ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
      : ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  }

  /* ======================================================
     CONSTRUCTOR
     ====================================================== */

  constructor(
    private feriadosService: FeriadosService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {
    // Load username from localStorage
    this.username = localStorage.getItem('username') || 'User';

    // Personalized greeting (first visit vs returning user)
    const visitedKey = `visited_${this.username}`;
    const visited = localStorage.getItem(visitedKey);

    this.greetingMessage = visited
      ? `Good to see you back, ${this.username}!`
      : `Welcome, ${this.username}!`;

    if (!visited) {
      localStorage.setItem(visitedKey, 'true');
    }
  }

  /* ======================================================
     LIFECYCLE
     ====================================================== */

  ngOnInit(): void {
    // Restore theme preference
    const savedTheme = localStorage.getItem('theme');
    this.isDarkMode = savedTheme === 'dark';

    if (this.isDarkMode) {
      document.body.classList.add('dark-mode');
    }

    // Initialize current month and year
    const today = new Date();
    this.currentMonth = today.getMonth();
    this.currentYear = today.getFullYear();

    // Load initial data
    this.updateCalendar();
    this.loadPresence();
    this.loadFeriados();
  }

  /* ======================================================
     THEME
     ====================================================== */

  toggleDarkMode(isChecked: boolean): void {
    this.isDarkMode = isChecked;

    if (isChecked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }

  /* ======================================================
     CALENDAR DATA
     ====================================================== */

  loadFeriados(): void {
    this.feriadosService.getFeriados(this.currentYear).subscribe((data) => {
      this.feriados = data.map((item) => item.date);
      this.calculateGoal();
      this.updatePercentage();
    });
  }

  updateCalendar(): void {
    this.currentMonthName = this.getMonthName(this.currentMonth);
    this.daysInMonth = this.generateDays(this.currentMonth, this.currentYear);
    this.calculateGoal();
    this.updatePercentage();
  }

  getMonthName(month: number): string {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[month];
  }

  generateDays(month: number, year: number): CalendarCell[] {
    const cells: CalendarCell[] = [];

    const firstWeekday = new Date(year, month, 1).getDay();
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({});
    }

    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ date: d, fullDate });
    }

    return cells;
  }

  changeMonth(direction: number): void {
    this.currentMonth += direction;

    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }

    this.updateCalendar();
    this.loadFeriados();
  }

  /* ======================================================
     ATTENDANCE CALCULATION
     ====================================================== */

  calculateGoal(): void {
    const businessDays = this.daysInMonth
      .filter((cell) => !!cell.fullDate)
      .filter((cell) => {
        const [y, m, d] = cell!.fullDate!.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isHoliday = this.feriados.includes(cell!.fullDate!);
        return !isWeekend && !isHoliday;
      }).length;

    this.presenceGoal = Math.ceil(businessDays * 0.4);

    localStorage.setItem(
      `presenceGoal_${this.currentYear}_${this.currentMonth}`,
      String(this.presenceGoal),
    );
  }

  updatePercentage(): void {
    const marked = this.getCurrentMonthPresenceCount();

    if (this.presenceGoal === 0) {
      this.presencePercentage = 0;
      return;
    }

    const percentage = Math.round((marked / this.presenceGoal) * 100);
    this.presencePercentage = Math.min(percentage, 100);
  }

  /* ======================================================
     PRESENCE STORAGE
     ====================================================== */

  savePresence(): void {
    localStorage.setItem(
      `presence_${this.username}`,
      JSON.stringify(this.presenceDays),
    );
  }

  loadPresence(): void {
    this.presenceDays = JSON.parse(
      localStorage.getItem(`presence_${this.username}`) || '[]',
    );
  }

  getCurrentMonthPresenceCount(): number {
    return this.presenceDays.filter((day) => {
      const [year, month] = day.split('-').map(Number);
      return year === this.currentYear && month === this.currentMonth + 1;
    }).length;
  }

  /* ======================================================
     DATE HELPERS
     ====================================================== */

  private getTodayStringLocal(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  isFutureDay(day?: string): boolean {
    if (!day) return false;
    return day > this.getTodayStringLocal();
  }

  isWeekend(day?: string): boolean {
    if (!day) return false;
    const [y, m, d] = day.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getDay() === 0 || date.getDay() === 6;
  }

  isToday(day?: string): boolean {
    return day === this.getTodayStringLocal();
  }

  canToggleDay(day?: string): boolean {
    if (!day) return false;
    return !this.isFutureDay(day) && !this.isWeekend(day);
  }

  /* ======================================================
     USER ACTIONS
     ====================================================== */

  togglePresence(day: string): void {
    if (!this.canToggleDay(day)) return;

    const index = this.presenceDays.indexOf(day);
    index > -1
      ? this.presenceDays.splice(index, 1)
      : this.presenceDays.push(day);

    this.savePresence();
    this.updatePercentage();
  }

  handleQrCode(qrCode: string): void {
    this.showScanner = false;

    if (!qrCode.startsWith('office-presence:')) {
      this.snackBar.open('QR Code inválido!', 'OK', { duration: 3000 });
      return;
    }

    const today = this.getTodayStringLocal();

    if (this.isWeekend(today)) {
      this.snackBar.open('Presença não permitida em finais de semana.', 'OK', {
        duration: 3000,
      });
      return;
    }

    if (!this.presenceDays.includes(today)) {
      this.presenceDays.push(today);
      this.savePresence();
      this.updatePercentage();
      this.snackBar.open('Presença registrada com sucesso!', 'OK', {
        duration: 3000,
      });
    }
  }

  openHistory() {
    this.router.navigate(['/history']);
  }

  logout(): void {
    localStorage.removeItem('username');
    window.location.href = '/login';
  }
}
