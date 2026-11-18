
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

  d = {
    nombre: '',
    dni: '',
    correo: '',
    telefono: '',
    password: '',
  };

  error = signal('');
  loading = signal(false);

  submit() {
    this.error.set('');

    // Validar DNI: exactamente 8 dígitos numéricos
    if (!/^\d{8}$/.test(this.d.dni.trim())) {
      this.error.set('El DNI debe contener exactamente 8 dígitos numéricos.');
      return;
    }

    // Validar teléfono: exactamente 9 dígitos numéricos
    if (!/^\d{9}$/.test(this.d.telefono.trim())) {
      this.error.set('El teléfono debe contener exactamente 9 dígitos numéricos.');
      return;
    }

    // Evitar envíos duplicados
    if (this.loading()) {
      return;
    }

    this.loading.set(true);

    this.auth.register({
      ...this.d,
      dni: this.d.dni.trim(),
      telefono: this.d.telefono.trim(),
    }).subscribe({
      next: () => {
        this.router.navigateByUrl(
          this.route.snapshot.queryParamMap.get('redirect') || '/trip/my-trips'
        );
      },
      error: (e) => {
        this.error.set(errorMsg(e));
        this.loading.set(false);
      },
    });
  }
}
