import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { errorMsg } from '../../../../core/services/api.service';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-login',
  templateUrl: './login.html',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  correo = ''; password = '';
  error = signal(''); loading = signal(false);

  submit() {
    this.error.set(''); this.loading.set(true);
    this.auth.login(this.correo, this.password).subscribe({
      next: () => this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('redirect') || '/trip/my-trips'),
      error: (e) => { this.error.set(errorMsg(e)); this.loading.set(false); },
    });
  }
  get redirectParams() { const r = this.route.snapshot.queryParamMap.get('redirect'); return r ? { redirect: r } : {}; }
}
