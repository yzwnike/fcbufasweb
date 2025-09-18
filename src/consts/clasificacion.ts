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
    puntos: 3,
    partidosJugados: 1,
    ganados: 1,
    empatados: 0,
    perdidos: 0,
    golesFavor: 7,
    golesContra: 2,
    diferencia: 5,
    ultimosPartidos: []
  },
  {
    posicion: 2,
    nombre: "Shample FC",
    puntos: 3,
    partidosJugados: 1,
    ganados: 1,
    empatados: 0,
    perdidos: 0,
    golesFavor: 5,
    golesContra: 0,
    diferencia: 5,
    ultimosPartidos: []
  },
  {
    posicion: 3,
    nombre: "Pitis FC",
    puntos: 3,
    partidosJugados: 1,
    ganados: 1,
    empatados: 0,
    perdidos: 0,
    golesFavor: 5,
    golesContra: 1,
    diferencia: 4,
    ultimosPartidos: []
  },
  {
    posicion: 4,
    nombre: "Vers Le Bas",
    puntos: 3,
    partidosJugados: 1,
    ganados: 1,
    empatados: 0,
    perdidos: 0,
    golesFavor: 2,
    golesContra: 1,
    diferencia: 1,
    ultimosPartidos: []
  },
  {
    posicion: 5,
    nombre: "Watergang Fc",
    puntos: 1,
    partidosJugados: 1,
    ganados: 0,
    empatados: 1,
    perdidos: 0,
    golesFavor: 3,
    golesContra: 3,
    diferencia: 0,
    ultimosPartidos: []
  },
  {
    posicion: 6,
    nombre: "Tulas Fc",
    puntos: 1,
    partidosJugados: 1,
    ganados: 0,
    empatados: 1,
    perdidos: 0,
    golesFavor: 3,
    golesContra: 3,
    diferencia: 0,
    ultimosPartidos: []
  },
  {
    posicion: 7,
    nombre: "Al-Khasino",
    puntos: 0,
    partidosJugados: 1,
    ganados: 0,
    empatados: 0,
    perdidos: 1,
    golesFavor: 1,
    golesContra: 2,
    diferencia: -1,
    ultimosPartidos: []
  },
  {
    posicion: 8,
    nombre: "Fc Bufas",
    puntos: 0,
    partidosJugados: 1,
    ganados: 0,
    empatados: 0,
    perdidos: 1,
    golesFavor: 1,
    golesContra: 5,
    diferencia: -4,
    ultimosPartidos: []
  },
  {
    posicion: 9,
    nombre: "Stm Nuls",
    puntos: 0,
    partidosJugados: 1,
    ganados: 0,
    empatados: 0,
    perdidos: 1,
    golesFavor: 2,
    golesContra: 7,
    diferencia: -5,
    ultimosPartidos: []
  },
  {
    posicion: 10,
    nombre: "Eternas Promseas FC",
    puntos: 0,
    partidosJugados: 1,
    ganados: 0,
    empatados: 0,
    perdidos: 1,
    golesFavor: 0,
    golesContra: 5,
    diferencia: -5,
    ultimosPartidos: []
  }
]
