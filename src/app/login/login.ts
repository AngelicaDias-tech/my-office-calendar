import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,

    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatSlideToggleModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login implements OnInit {
  /* ======================================================
     BASIC STATE
     ====================================================== */

  // Stores the username typed by the user
  username: string = '';

  // Controls whether dark mode is enabled
  isDarkMode = false;

  /* ======================================================
     CONSTRUCTOR
     ====================================================== */

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  /* ======================================================
     LIFECYCLE
     ====================================================== */

  ngOnInit(): void {
    // Retrieve saved theme preference
    const savedTheme = localStorage.getItem('theme');

    // Set dark mode state based on stored value
    this.isDarkMode = savedTheme === 'dark';

    // Apply dark mode class if needed
    if (this.isDarkMode) {
      document.body.classList.add('dark-mode');
    }
  }

  /* ======================================================
     THEME HANDLING
     ====================================================== */

  /**
   * Toggles dark/light mode and persists the choice.
   */
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
     AUTHENTICATION
     ====================================================== */

  /**
   * Handles user login.
   * Stores username and redirects to the dashboard.
   */
  login(): void {
    const trimmedName = this.username.trim();

    // Validate input
    if (trimmedName) {
      localStorage.setItem('username', trimmedName);
      this.router.navigate(['/dashboard']);
    } else {
      // Show error message if input is empty
      this.snackBar.open('Please enter a valid name.', 'Close', {
        duration: 3000,
      });
    }
  }
}
