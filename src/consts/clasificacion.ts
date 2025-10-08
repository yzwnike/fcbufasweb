export interface EquipoClasificacion {
  posicion: number
  nombre: string
  puntos: number
  partidosJugados: number
  ganados: number
  empatados: number
  perdidos: number
  golesFavor: number
  golesContra: number
  diferencia: number
  ultimosPartidos: string[]
}

export const clasificacion: EquipoClasificacion[] = [
  {
    posicion: 1,
    nombre: "FC Tractores",
    puntos: 7,
    partidosJugados: 3,
    ganados: 2,
    empatados: 1,
    perdidos: 0,
    golesFavor: 17,
    golesContra: 11,
    diferencia: 6,
    ultimosPartidos: []
  },
  {
    posicion: 2,
    nombre: "Shample FC",
    puntos: 6,
    partidosJugados: 3,
    ganados: 2,
    empatados: 0,
    perdidos: 1,
    golesFavor: 15,
    golesContra: 6,
    diferencia: 9,
    ultimosPartidos: []
  },
  {
    posicion: 3,
    nombre: "Pitis FC",
    puntos: 6,
    partidosJugados: 2,
    ganados: 2,
    empatados: 0,
    perdidos: 0,
    golesFavor: 11,
    golesContra: 6,
    diferencia: 5,
    ultimosPartidos: []
  },
  {
    posicion: 4,
    nombre: "Vers Le Bas",
    puntos: 6,
    partidosJugados: 3,
    ganados: 2,
    empatados: 0,
    perdidos: 1,
    golesFavor: 14,
    golesContra: 9,
    diferencia: 5,
    ultimosPartidos: []
  },

  {
    posicion: 5,
    nombre: "Al-Khasino",
    puntos: 4,
    partidosJugados: 3,
    ganados: 1,
    empatados: 1,
    perdidos: 1,
    golesFavor: 8,
    golesContra: 8,
    diferencia: 0,
    ultimosPartidos: []
  },
  {
    posicion: 6,
    nombre: "Fc Bufas",
    puntos: 3,
    partidosJugados: 3,
    ganados: 1,
    empatados: 0,
    perdidos: 2,
    golesFavor: 14,
    golesContra: 10,
    diferencia: 4,
    ultimosPartidos: []
  },
  {
    posicion: 7,
    nombre: "Stm Nuls",
    puntos: 3,
    partidosJugados: 3,
    ganados: 1,
    empatados: 0,
    perdidos: 2,
    golesFavor: 9,
    golesContra: 17,
    diferencia: -8,
    ultimosPartidos: []
  },
  {
    posicion: 8,
    nombre: "Watergang Fc",
    puntos: 2,
    partidosJugados: 2,
    ganados: 0,
    empatados: 2,
    perdidos: 0,
    golesFavor: 8,
    golesContra: 8,
    diferencia: 0,
    ultimosPartidos: []
  },
  {
    posicion: 9,
    nombre: "Tulas Fc",
    puntos: 2,
    partidosJugados: 3,
    ganados: 0,
    empatados: 2,
    perdidos: 1,
    golesFavor: 7,
    golesContra: 12,
    diferencia: -5,
    ultimosPartidos: []
  },
  {
    posicion: 10,
    nombre: "Eternas Promseas FC",
    puntos: 0,
    partidosJugados: 3,
    ganados: 0,
    empatados: 0,
    perdidos: 3,
    golesFavor: 4,
    golesContra: 20,
    diferencia: -16,
    ultimosPartidos: []
  }
]
