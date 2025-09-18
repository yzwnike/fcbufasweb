import type { Fighters } from '@/types/fighters'
import X from '@/assets/svg/x.svg'
import Instagram from '@/assets/svg/instagram.svg'
import Youtube from '@/assets/svg/youtube.svg'
import TikTok from '@/assets/svg/tiktok.svg'
import Twitch from '@/assets/svg/twitch.svg'
import Kick from '@/assets/svg/kick.svg'

export const FIGHTERS: Fighters[] = [
  {
    // https://laletrade.com/biografias/twitch/18087-albert
    id: 'albert',
    name: 'Albert',
    bio: 'Albert es un jugador veterano de FC Bufas, con su esfuerzo y detalles en el campo se destaca no solo en banda sino en varias funciones con su multiposicionalidad, puedes verlo en cualquier parte del campo.',
    realName: 'Albert Rodríguez',
    gender: 'masculino',
    birthDate: new Date(2005, 2, 30),
    height: 1.76,
    age: 20,
    city: 'Barcelona, España',
    position: "LI",
    country: 'es',
    gallery: true,
    socials: [
      {
        id: 'instagram',
        name: 'Instagram',
        url: 'https://www.instagram.com/alrodo_33',
        label: 'Visitar perfil de Albert en Instagram',
        image: {
          logo: Instagram,
          width: 200,
          height: 200,
        },
      },
    ],
    clips: [
      {
        text: 'Hay que entrenar duro, quiero estar a la altura!',
        url: 'https://www.youtube.com/embed/aOKOUIx8mPU?si=ao2b-RL5rdAkoTXY&amp;clip=Ugkx5nWUXM5WtVO9Bf3Nf3hJ1BkQP_ZY6TO9&amp;clipt=ELTuGxinpBw',
      },
    ],
    workout: {
      videoID: 'dj-4LLi5cck',
      thumbnail: '/images/fighters/workoutThumbnails/perxitaa-thumbnail.webp',
    },
    goles: 0,
    asistencias: 0,
    partidos: 1,
    puntos: 2,
    valor: 25,
    valorTotal: 29000000,
    puntosTotales: 2,
    historialValores: [
      { fecha: new Date("2025-06-01T00:00:00.000Z"), valor: 35000000 },
      { fecha: new Date("2025-07-29T00:00:00.000Z"), valor: 30000000 },
      { fecha: new Date("2025-09-18T01:30:34.000Z"), valor: 29000000 }
    ],
    dorsal: 11,
  },
  {
    // https://www.biografia.de/abby/
    id: 'javo',
    name: 'Javo',
    bio: 'Javo es un centrocampista proveniente de Picacachorras FC, fue traspasado en la temporada 2025-26 por la cifra de 65M de euros(€)',
    realName: 'Javo Ayesta',
    gender: 'masculino',
    birthDate: new Date(2005, 4, 28),
    height: 1.81,
    age: 20,
    position: "MC",
    country: 'es',
    gallery: true,
    city: 'España',
    socials: [
      {
        id: 'instagram',
        name: 'Instagram',
        url: 'https://www.instagram.com/javo.ayestaa/',
        label: 'Visitar perfil de Javo en Instagram',
        image: {
          logo: Instagram,
          width: 200,
          height: 200,
        },
      },
    ],
    clips: [
      {
        text: 'Ganas de Fútbol',
        url: 'https://www.instagram.com/p/DMNlVwvoxoO/?img_index=1',
      },
    ],
    goles: 0,
    asistencias: 0,
    partidos: 0,
    puntos: 0,
    valor: 65,
    valorTotal: 59000000,
    puntosTotales: 0,
    historialValores: [
      { fecha: new Date("2025-06-01T00:00:00.000Z"), valor: 60000000 },
      { fecha: new Date("2025-07-29T00:00:00.000Z"), valor: 60000000 },
      { fecha: new Date("2025-09-18T01:30:34.000Z"), valor: 59000000 }
    ],
    dorsal: 8,
  },
  {
    // https://www.biografia.de/pablo/
    id: 'pablo',
    name: 'Pablo',
    bio: 'Presente en el primer equipo y uno de los co-fundadores del FC Bufas, clave en su posición y fiel al equipo de sus sueños.',
    realName: 'Pablo Vehí Roca',
    gender: 'masculino',
    birthDate: new Date(2005, 3, 3),
    height: 1.87,
    age: 20,
    position: "LD",
    country: 'es',
    gallery: true,
    city: 'Barcelona, Cataluña',
    socials: [
      {
        id: 'instagram',
        name: 'Instagram',
        url: 'https://www.instagram.com/pablovehi/',
        label: 'Visitar perfil de Pablo Elvei en Instagram',
        followers: '',
        image: {
          logo: Instagram,
          width: 200,
          height: 200,
        },
      },
    ],
    clips: [
      {
        text: 'El lateral derecho de moda!',
        url: 'https://www.youtube.com/embed/_A0QFge7TlI?si=lBVhjXJ2Zn7cbrch&amp;clip=Ugkxu-CzMHs-3zLGaFFCGIh-tcPMjImucfAT&amp;clipt=EOnqLRjv0y4',
      },
    ],
    goles: 0,
    asistencias: 0,
    partidos: 1,
    puntos: 5,
    valor: 22,
    valorTotal: 43000000,
    puntosTotales: 5,
    historialValores: [
      { fecha: new Date("2025-06-01T00:00:00.000Z"), valor: 42000000 },
      { fecha: new Date("2025-07-29T00:00:00.000Z"), valor: 40000000 },
      { fecha: new Date("2025-09-18T01:30:34.000Z"), valor: 43000000 }
    ],
    dorsal: 6,
  },
  {
    // https://www.biografia.de/yazawa/
    id: 'yazawa',
    name: 'Yazawa',
    bio: 'Fundador, capitán y presidente de FC Bufas, sin la ayuda de los jugadores veteranos no habría llegado tan lejos, el equipo sigue manteniendose con la portería bien firme gracias a su presencia.',
    realName: 'Nico Vehi (Yazawa)',
    gender: 'masculino',
    birthDate: new Date(2005, 8, 29),
    height: 1.81,
    age: 20,
    position: "POR",
    country: 'es',
    gallery: true,
    city: 'Barcelona, España',
    socials: [
      {
        id: 'instagram',
        name: 'Instagram',
        url: 'https://www.instagram.com/nicovehi/',
        label: 'Visitar perfil de Yazawa en Instagram',
        image: {
          logo: Instagram,
          width: 200,
          height: 200,
        },
      },
      {
        id: 'youtube',
        name: 'Youtube',
        url: 'https://www.youtube.com/@YazawaMusic',
        label: 'Visitar canal de música de Yazawa en Youtube',
        image: {
          logo: Youtube,
          width: 200,
          height: 200,
        },
      },
      {
        id: 'x',
        name: 'X',
        url: 'https://x.com/MisterAstuto',
        label: 'Visitar perfil de Nico en X',
        image: {
          logo: X,
          width: 200,
          height: 200,
        },
      },
    ],
    clips: [
      {
        text: 'A mí este equipo me tiene bailando Danza Espada.',
        url: 'https://www.youtube.com/embed/aOKOUIx8mPU?si=xe0_jPqJ7lBEMNDx&amp;clip=UgkxVZqXUgbXM15VuQBnVAg38-8W2PnL8oqT&amp;clipt=EJDeAxiYhQQ&autoplay=1',
      },
    ],
    goles: 0,
    asistencias: 0,
    partidos: 1,
    puntos: 4,
    valor: 18,
    valorTotal: 42000000,
    puntosTotales: 4,
    historialValores: [
      { fecha: new Date("2025-06-01T00:00:00.000Z"), valor: 45000000 },
      { fecha: new Date("2025-07-29T00:00:00.000Z"), valor: 42000000 },
      { fecha: new Date("2025-09-18T01:30:34.000Z"), valor: 42000000 }
    ],
    dorsal: 7,
  },
  {
    // https://www.biografia.de/viruzz/
    id: 'perma',
    name: 'Perma',
    realName: 'Marc Pemanyer',
    bio: 'Nuevo fichaje en defensa central, Perma aporta solidez y experiencia a la línea defensiva del FC Bufas. Su llegada refuerza la plantilla con su físico imponente y su capacidad de liderazgo.',
    gender: 'masculino',
    birthDate: new Date(2004, 6, 15),
    height: 1.80,
    age: 20,
    position: 'DFC',
    country: 'es',
    city: 'Madrid, España',
    
    gallery: true,
    socials: [
      {
        id: 'instagram',
        name: 'Instagram',
        url: '',
        label: 'Visitar perfil de en Instagram',
        image: {
          logo: Instagram,
          width: 200,
          height: 200,
        },
      },
      
    ],
    clips: [
      {
        text: 'La defensa está más sólida que nunca',
        url: 'https://www.youtube.com/embed/t7r5O_5B-E0?si=1tlrUUKM-18eZlen&amp;clip=UgkxW9ZMSp3ZrKKJGaU3qR9kK2njuf0fgO-w&amp;clipt=EPPv0wQY-5bUBA',
      },
    ],
    goles: 0,
    asistencias: 0,
    partidos: 1,
    puntos: 3,
    valor: 15,
    valorTotal: 52000000,
    puntosTotales: 3,
    historialValores: [
      { fecha: new Date("2025-06-01T00:00:00.000Z"), valor: 55000000 },
      { fecha: new Date("2025-07-29T00:00:00.000Z"), valor: 55000000 },
      { fecha: new Date("2025-09-18T01:30:34.000Z"), valor: 52000000 }
    ],
    dorsal: 4,
  },
  {
    // https://www.biografia.de/mister-flores/
    id: 'mister',
    name: 'Mister',
    bio: 'Central veterano de FC Bufas, Míster es un jugador con gran experiencia y liderazgo en el campo. Su presencia en la defensa es fundamental para el equipo, y su capacidad para organizar la línea defensiva lo convierte en un jugador clave.',
    realName: 'Marc Sánchez (Míster)',
    gender: 'masculino',
    birthDate: new Date(2005, 1, 1),
    height: 1.85,
    age: 20,
    position: "DFC",
    country: 'es',
    gallery: true,
    city: 'Barcelona, España',
    socials: [
      {
        id: 'instagram',
        name: 'Instagram',
        url: 'https://www.instagram.com/marc_sm19_/',
        label: 'Visitar perfil de Míster en Instagram',
        image: {
          logo: Instagram,
          width: 200,
          height: 200,
        },
      },
    ],
    clips: [
      {
        text: 'Womp womp, womp womp.',
        url: 'https://www.youtube.com/embed/qdS_XOZ5kyU?si=ma0Sdomx1JJOyld1&amp;clip=Ugkxd-wfH9H1C-ZaiGBlFn3hZeAk9qQWK48w&amp;clipt=EKjUAhiw-wI',
      },
    ],
    goles: 0,
    asistencias: 0,
    partidos: 1,
    puntos: 2,
    valor: 28,
    valorTotal: 45000000,
    puntosTotales: 2,
    historialValores: [
      { fecha: new Date("2025-06-01T00:00:00.000Z"), valor: 50000000 },
      { fecha: new Date("2025-07-29T00:00:00.000Z"), valor: 48000000 },
      { fecha: new Date("2025-09-18T01:30:34.000Z"), valor: 45000000 }
    ],
    dorsal: 5,
  },
  {
    // https://laletrade.com/biografias/youtuber/espanol/22589-mario
    id: 'mario',
    name: 'Mario',
    realName: 'Mario Roca',
    gender: 'masculino',
    birthDate: new Date(2006, 0, 30),
    height: 1.77,
    age: 19,
    position: "MC",
    country: 'es',
    gallery: true,
    city: 'Barcelona, España',
    bio: 'Miembro veterano de FC Bufas, uno de los jugadores mas carismaticos y creativos con el balón, se ha ganado el cariño de la afición con su visión de juego y su capacidad para crear jugadas de peligro.',
    socials: [
      {
        id: 'instagram',
        name: 'Instagram',
        url: 'https://www.instagram.com/mariiorocaa',
        label: 'Visitar perfil de Mario en Instagram',
        image: {
          logo: Instagram,
          width: 200,
          height: 200,
        },
      },
    ],
    clips: [
      {
        text: 'Este año si pasaré de los 150 puntos no?',
        url: 'https://www.youtube.com/embed/cfpvro5tD7g?si=rjaM5jJdImEtefJ6&amp;clip=UgkxuoAS_mblPPU-wtj4bH3GiLXmVRBAow2b&amp;clipt=EImsAhjj2gI',
      },
    ],
    goles: 0,
    asistencias: 1,
    partidos: 1,
    puntos: 4,
    valor: 32,
    valorTotal: 89000000,
    puntosTotales: 4,
    historialValores: [
      { fecha: new Date("2025-06-01T00:00:00.000Z"), valor: 85000000 },
      { fecha: new Date("2025-07-29T00:00:00.000Z"), valor: 97000000 },
      { fecha: new Date("2025-09-18T01:30:34.000Z"), valor: 89000000 }
    ],
    dorsal: 10,
  },
  {
    // https://www.biografia.de/marcos/
    id: 'marcos',
    name: 'Marcos',
    realName: 'Marcos López',
    gender: 'masculino',
    birthDate: new Date(2005, 8, 7),
    height: 1.84,
    age: 19,
    position: "DC",
    country: 'es',
    gallery: true,
    city: 'Barcelona, España',
    bio: 'Uno de los últimos fichajes de FC Bufas, Marcos es un jugador con gran proyección. Con su llegada al equipo, se espera que aporte su calidad y su capacidad goleadora para ayudar al equipo a alcanzar sus objetivos.',
    socials: [
      {
        id: 'instagram',
        name: 'Instagram',
        url: 'https://www.instagram.com/marcoos_lc_/',
        label: 'Visitar perfil de Marcos en Instagram',
        image: {
          logo: Instagram,
          width: 200,
          height: 200,
        },
      },
    ],
    clips: [
      {
        text: 'Este equipo va cogiendo una forma muy suculenta la verdad.',
        url: 'https://www.youtube.com/embed/cfpvro5tD7g?si=ZcMgqxaAfHxRQb96&amp;clip=UgkxQ5sj8mAkLsReNNl3UPmr5g6CkSbZyERl&amp;clipt=EKjXAhiw_gI',
      },
    ],
    goles: 1,
    asistencias: 0,
    partidos: 1,
    puntos: 6,
    valor: 29,
    valorTotal: 53000000,
    puntosTotales: 6,
    historialValores: [
      { fecha: new Date("2025-06-01T00:00:00.000Z"), valor: 57000000 },
      { fecha: new Date("2025-07-29T00:00:00.000Z"), valor: 51000000 },
      { fecha: new Date("2025-09-18T01:30:34.000Z"), valor: 53000000 }
    ],
    dorsal: 9,
  },
  {
    // https://www.biografia./nico/
    id: 'nicou',
    name: 'Nico',
    bio: 'Nico es un jugador que siempre da el 100% en cada partido. Su dedicación y esfuerzo lo convierten en un jugador clave para el equipo.',
    realName: 'Nico Uriburu',
    gender: 'masculino',
    birthDate: new Date(2005, 3, 28),
    height: 1.73,
    age: 20,
    position: "MD",
    country: 'es',
    gallery: true,
    city: 'España',
    socials: [
      {
        id: 'instagram',
        name: 'Instagram',
        url: 'https://www.instagram.com/nicouriburuu/',
        label: 'Visitar perfil de Nico en Instagram',
        image: {
          logo: Instagram,
          width: 200,
          height: 200,
        },
      },
    ],
    clips: [
      {
        text: 'Este año se prende!',
        url: 'https://www.youtube.com/embed/qdS_XOZ5kyU?si=D8fgVfCSRy_SwZHv&amp;clip=UgkxEmtFin7L3_YLiJW_OyRkmeZtFj53PnkT&amp;clipt=EPWwAhj91wI',
      },
    ],
    goles: 0,
    asistencias: 0,
    partidos: 1,
    puntos: 4,
    valor: 20,
    valorTotal: 54000000,
    puntosTotales: 4,
    historialValores: [
      { fecha: new Date("2025-06-01T00:00:00.000Z"), valor: 56000000 },
      { fecha: new Date("2025-07-29T00:00:00.000Z"), valor: 56000000 },
      { fecha: new Date("2025-09-18T01:30:34.000Z"), valor: 54000000 }
    ],
    dorsal: 14,
  },
  {
    // https://laletrade.com/biografias/youtuber/19752-carlos-belcast
    id: 'fan',
    name: 'Fan',
    bio: 'Fichaje prometedor para el medio campo izquierdo, Fan destaca por su velocidad y regate. Sus ganas de triunfar lo convierten en una apuesta de futuro para el FC Bufas.',
    realName: 'Fan Xu',
    gender: 'masculino',
    birthDate: new Date(2006, 2, 10),
    height: 1.75,
    age: 18,
    position: 'MI',
    gallery: true,
    country: 'fra',
    city: 'China',
    goles: 0,
    asistencias: 0,
    partidos: 1,
    puntos: 3,
    valor: 12,
    valorTotal: 46000000,
    puntosTotales: 3,
    historialValores: [
      { fecha: new Date("2025-06-01T00:00:00.000Z"), valor: 48000000 },
      { fecha: new Date("2025-07-29T00:00:00.000Z"), valor: 48000000 },
      { fecha: new Date("2025-09-18T01:30:34.000Z"), valor: 46000000 }
    ],
    dorsal: 2,
    socials: [
      {
        id: 'instagram',
        name: 'Instagram',
        url: 'https://www.instagram.com/fan.xu_/',
        label: 'Visitar perfil de Fan en Instagram',
        image: {
          logo: Instagram,
          width: 200,
          height: 200,
        },
      },
    ],
    clips: [
      {
        text: 'La banda izquierda tiene nuevo dueño',
        url: 'https://www.youtube.com/embed/NbaFxQiuFek?si=_zo9rym4J9nuprTz&amp;clip=UgkxA55s3XmbPCzb0W3fcV3a5ynwEsfrpWnY&amp;clipt=EMD-DBjIpQ0',
      },
    ],
  },
] as const
