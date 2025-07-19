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
    position: "MI",
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
  },
  {
    // https://www.biografia.de/viruzz/
    id: 'proximamente2',
    name: 'Próximo Fichaje',
    realName: '',
    bio: '',
    gender: 'masculino',
    birthDate: new Date(2000, 1, 1),
    country: 'por',
    city: '',
    
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
        text: 'Cual será el próximo fichaje?...',
        url: 'https://www.youtube.com/embed/t7r5O_5B-E0?si=1tlrUUKM-18eZlen&amp;clip=UgkxW9ZMSp3ZrKKJGaU3qR9kK2njuf0fgO-w&amp;clipt=EPPv0wQY-5bUBA',
      },
      
    ],
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
  },
  {
    // https://www.biografia.de/aznar/
    id: 'aznar',
    name: 'Aznar',
    bio: 'El jugador con mas ganas y resistencia en el campo, Aznar es un jugador que siempre da el 100% en cada partido. Su dedicación y esfuerzo lo convierten en un jugador clave para el equipo.',
    realName: 'Paul Aznar',
    gender: 'masculino',
    birthDate: new Date(2005, 3, 28),
    height: 1.73,
    age: 20,
    position: "DC",
    country: 'fra',
    gallery: true,
    city: 'Francia',
    socials: [
      {
        id: 'instagram',
        name: 'Instagram',
        url: 'https://www.instagram.com/paul_aznar/',
        label: 'Visitar perfil de Aznar en Instagram',
        image: {
          logo: Instagram,
          width: 200,
          height: 200,
        },
      },
      {
        id: 'x',
        name: 'X',
        url: 'https://x.com/AznatePaul',
        label: 'Visitar perfil de Aznar en X',
        image: {
          logo: X,
          width: 200,
          height: 200,
        },
      },
    ],
    clips: [
      {
        text: 'Oye banda, este año se prende!',
        url: 'https://www.youtube.com/embed/qdS_XOZ5kyU?si=D8fgVfCSRy_SwZHv&amp;clip=UgkxEmtFin7L3_YLiJW_OyRkmeZtFj53PnkT&amp;clipt=EPWwAhj91wI',
      },
    ],
  },
  {
    // https://laletrade.com/biografias/youtuber/19752-carlos-belcast
    id: 'proximamente1',
    name: 'Próximo Fichaje',
    bio: '',
    realName: '',
    gender: 'masculino',
    birthDate: new Date(2000, 1, 1),
    gallery: true,
    country: 'por',
    city: '',
    socials: [
      {
        id: 'instagram',
        name: 'Instagram',
        url: '',
        label: 'Visitar perfil de Carlos en Instagram',
        followers: '5.1M',
        image: {
          logo: Instagram,
          width: 200,
          height: 200,
        },
      },
    ],
    clips: [
      {
        text: 'Cual será',
        url: 'https://www.youtube.com/embed/NbaFxQiuFek?si=_zo9rym4J9nuprTz&amp;clip=UgkxA55s3XmbPCzb0W3fcV3a5ynwEsfrpWnY&amp;clipt=EMD-DBjIpQ0',
      },
    ],
  },
] as const
