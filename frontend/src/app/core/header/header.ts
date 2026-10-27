import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'c-header',
  templateUrl: './header.html',
})
export class Header {
  auth = inject(AuthService);
  menuOpen = signal(false);
}
