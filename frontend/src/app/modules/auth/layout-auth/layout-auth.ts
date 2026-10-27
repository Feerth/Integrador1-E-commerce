import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet, RouterLink],
  selector: 'app-layout-auth',
  templateUrl: './layout-auth.html',
  styleUrl: './layout-auth.scss',
})
export class LayoutAuth {}
