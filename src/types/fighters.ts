import type { Social } from '@/types/social'

type fighterId =
  | 'peereira'
  | 'perxitaa'
  | 'javo'
  | 'pablo'
  | 'gaspi'
  | 'rivaldios'
  | 'andoni'
  | 'viruzz'
  | 'alana'
  | 'grefg'
  | 'westcol'
  | 'arigeli'
  | 'tomas'
  | 'carlos'

type fighterName =
  | 'Peereira'
  | 'Perxitaa'
  | 'Javo'
  | 'pablo'
  | 'Gaspi'
  | 'Rivaldios'
  | 'Andoni'
  | 'Viruzz'
  | 'Alana'
  | 'Grefg'
  | 'Westcol'
  | 'Arigeli'
  | 'Tomás'
  | 'Carlos'

interface Clips {
  text: string
}

export interface Fighters {
  id: fighterId
  name: fighterName
  fightName?: string
  city?: string
  realName: string
  gender: 'masculino' | 'femenino' | 'otro'
  targetWeight?: number
  targetGloves?: string
  birthDate: Date
  height: number
  age: number
  position: string
  country: string
  gallery?: boolean
  versus: fighterId
  socials: Social[]
  clips: Clips[]
  workout?: {
    videoID: string
    thumbnail: string
  }
  bio: string
}
