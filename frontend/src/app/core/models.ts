export interface Cliente { id: string; nombre: string; dni: string; correo: string; telefono: string; }
export interface AuthResponse { token: string; cliente: Cliente; }

export interface CategoriaVuelo { categoria: string; disponibles: number; precio: number | null; }
export interface Vuelo {
  codigo: string; fecha: string; horaSalida: string; horaLlegadaEstimada: string;
  origen: string; destino: string; estado: string; modeloAvion: string;
  categorias: CategoriaVuelo[]; reservable: boolean;
}

export interface Checkin { reservaCodigo: string; fecha: string; puerta: string; grupo: string; }
export interface Viaje {
  codigo: string; vueloCodigo: string; fecha: string; ruta: string; asiento: string; categoria: string; estado: string;
  vuelo: Vuelo | null; checkin: Checkin | null; checkinAbierto: boolean; checkinMotivo: string | null;
}

export interface MovimientoEquipaje { estado: string; fecha: string | null; punto: string | null; observacion: string | null; }
export interface Equipaje {
  codigo: string; pasajero: string; categoriaPeso: string; estado: string; observaciones: string | null;
  vuelo: { codigo: string; origen: string; destino: string; fecha: string; horaSalida: string; horaLlegadaEstimada: string; estado: string };
  historial: MovimientoEquipaje[];
}
