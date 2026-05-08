import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FeriadosService } from '../feriados.services';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, MatIconModule],
  templateUrl: './history.html',
  styleUrls: ['./history.css'],
})
export class History implements OnInit {
  /* ======================================================
     BASIC STATE
     ====================================================== */

  username: string = '';
  presenceDays: string[] = [];
  holidays: string[] = [];

  /* ======================================================
     CHART STATE
     ====================================================== */

  monthlyPercentages: number[] = [];
  barChartData: any;

  barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          autoSkip: false,
          maxRotation: 30,
          minRotation: 30,
          font: { size: 11 },
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: { display: false },
        ticks: {
          callback: (value: any) => `${value}%`,
        },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  /* ======================================================
     CONSTRUCTOR
     ====================================================== */

  constructor(
    private router: Router,
    private feriadosService: FeriadosService,
  ) {}

  /* ======================================================
     LIFECYCLE
     ====================================================== */

  ngOnInit(): void {
    this.loadPresenceDays();
  }

  /* ======================================================
     DATA LOADING
     ====================================================== */

  /**
   * Loads presence data from localStorage and
   * fetches holidays before rendering the chart.
   */
  loadPresenceDays(): void {
    this.username = localStorage.getItem('username') || '';

    this.presenceDays = JSON.parse(
      localStorage.getItem(`presence_${this.username}`) || '[]',
    );

    const year = new Date().getFullYear();

    this.feriadosService.getFeriados(year).subscribe((data) => {
      this.holidays = data.map((f) => f.date);
      this.updateChartData();
    });
  }

  /* ======================================================
     CHART BUILDING
     ====================================================== */

  /**
   * Prepares chart data and datasets.
   */
  updateChartData(): void {
    this.monthlyPercentages = this.calculateMonthlyPercentages();

    this.barChartData = {
      labels: [
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
      ],
      datasets: [
        {
          data: this.monthlyPercentages,
          backgroundColor: this.getBarColors(),
          borderRadius: 6,
        },
      ],
    };
  }

  /* ======================================================
     ATTENDANCE CALCULATION
     ====================================================== */

  /**
   * Calculates monthly attendance percentage
   * using the same rules as the Dashboard.
   */
  calculateMonthlyPercentages(): number[] {
    const percentages = new Array(12).fill(0);
    const year = new Date().getFullYear();
    const presenceByMonth = new Array(12).fill(0);

    // Count valid presences per month (same logic as Dashboard)
    this.presenceDays.forEach((day) => {
      const [y, m, d] = day.split('-').map(Number);
      const date = new Date(y, m - 1, d);

      // Ignore other years
      if (date.getFullYear() !== year) return;

      // Ignore weekends (Dashboard rule)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return;

      // Do NOT filter holidays here (must match Dashboard behavior)
      presenceByMonth[date.getMonth()]++;
    });

    // Calculate percentage per month
    for (let month = 0; month < 12; month++) {
      const goal = this.getMonthlyGoal(year, month);

      if (goal === 0) {
        percentages[month] = 0;
        continue;
      }

      const percent = Math.round((presenceByMonth[month] / goal) * 100);

      percentages[month] = Math.min(percent, 100);
    }

    return percentages;
  }

  /**
   * Retrieves the monthly goal calculated by the Dashboard.
   * History never recalculates the goal.
   */
  getMonthlyGoal(year: number, month: number): number {
    const stored = localStorage.getItem(`presenceGoal_${year}_${month}`);
    return stored ? Number(stored) : 0;
  }

  /* ======================================================
     VISUAL HELPERS
     ====================================================== */

  /**
   * Returns bar colors based on month status.
   */
  getBarColors(): string[] {
    const currentMonth = new Date().getMonth();

    return this.monthlyPercentages.map((value, index) => {
      // Current month
      if (index === currentMonth) {
        return value === 100 ? '#1e8e5a' : '#6a1b9a';
      }

      // Past months
      if (index < currentMonth) {
        return value === 100 ? '#1e8e5a' : '#f28b82';
      }

      // Future months
      return '#e0e0e0';
    });
  }

  /* ======================================================
     NAVIGATION
     ====================================================== */

  /**
   * Navigates back to the Dashboard page.
   */
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
