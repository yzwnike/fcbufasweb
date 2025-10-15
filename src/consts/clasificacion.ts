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
    nombre: "Pitis FC",
    puntos: 12,
    partidosJugados: 4,
    ganados: 4,
    empatados: 0,
    perdidos: 0,
    golesFavor: 23,
    golesContra: 9,
    diferencia: 14,
    ultimosPartidos: []
  },
  {
    posicion: 2,
    nombre: "Shample FC",
    puntos: 9,
    partidosJugados: 4,
    ganados: 3,
    empatados: 0,
    perdidos: 1,
    golesFavor: 18,
    golesContra: 8,
    diferencia: 10,
    ultimosPartidos: []
  },
  {
    posicion: 3,
    nombre: "Vers Le Bas",
    puntos: 9,
    partidosJugados: 4,
    ganados: 3,
    empatados: 0,
    perdidos: 1,
    golesFavor: 17,
    golesContra: 11,
    diferencia: 6,
    ultimosPartidos: []
  },
  {
    posicion: 4,
    nombre: "FC Tractores",
    puntos: 7,
    partidosJugados: 4,
    ganados: 2,
    empatados: 1,
    perdidos: 1,
    golesFavor: 19,
    golesContra: 14,
    diferencia: 5,
    ultimosPartidos: []
  },
  {
    posicion: 5,
    nombre: "Fc Bufas",
    puntos: 6,
    partidosJugados: 4,
    ganados: 2,
    empatados: 0,
    perdidos: 2,
    golesFavor: 18,
    golesContra: 13,
    diferencia: 5,
    ultimosPartidos: []
  },
  {
    posicion: 6,
    nombre: "Watergang Fc",
    puntos: 5,
    partidosJugados: 4,
    ganados: 1,
    empatados: 2,
    perdidos: 1,
    golesFavor: 13,
    golesContra: 14,
    diferencia: -1,
    ultimosPartidos: []
  },
  {
    posicion: 7,
    nombre: "Al-Khasino",
    puntos: 4,
    partidosJugados: 4,
    ganados: 1,
    empatados: 1,
    perdidos: 2,
    golesFavor: 11,
    golesContra: 15,
    diferencia: -4,
    ultimosPartidos: []
  },
  {
    posicion: 8,
    nombre: "Stm Nuls",
    puntos: 3,
    partidosJugados: 4,
    ganados: 1,
    empatados: 0,
    perdidos: 3,
    golesFavor: 12,
    golesContra: 21,
    diferencia: -9,
    ultimosPartidos: []
  },
  {
    posicion: 9,
    nombre: "Tulas Fc",
    puntos: 2,
    partidosJugados: 4,
    ganados: 0,
    empatados: 2,
    perdidos: 2,
    golesFavor: 9,
    golesContra: 15,
    diferencia: -6,
    ultimosPartidos: []
  },
  {
    posicion: 10,
    nombre: "Eternas Promesas FC",
    puntos: 0,
    partidosJugados: 4,
    ganados: 0,
    empatados: 0,
    perdidos: 4,
    golesFavor: 5,
    golesContra: 25,
    diferencia: -20,
    ultimosPartidos: []
  }
]
