import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { errorMsg } from '../../../../core/services/api.service';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-register',
  templateUrl: './register.html',
})
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  d = { nombre: '', dni: '', correo: '', telefono: '', password: '' };
  error = signal(''); loading = signal(false);

  submit() {
    this.error.set(''); this.loading.set(true);
    this.auth.register(this.d).subscribe({
      next: () => this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('redirect') || '/trip/my-trips'),
      error: (e) => { this.error.set(errorMsg(e)); this.loading.set(false); },
    });
  }
}
