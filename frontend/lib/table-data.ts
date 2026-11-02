export type Status = 'active' | 'pending' | 'inactive' | 'failed'

export interface TeamMember {
  id: string
  name: string
  email: string
  avatar: string // initials fallback
  role: string
  status: Status
  spend: number
  joined: string // ISO date
  usage: number // 0–100
}

export const teamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Aria Chen',
    email: 'aria.chen@acme.io',
    avatar: 'AC',
    role: 'Product Designer',
    status: 'active',
    spend: 12450.0,
    joined: '2024-03-14',
    usage: 82,
  },
  {
    id: '2',
    name: 'Miles Okafor',
    email: 'miles.o@acme.io',
    avatar: 'MO',
    role: 'Engineering Lead',
    status: 'active',
    spend: 9820.5,
    joined: '2023-11-02',
    usage: 64,
  },
  {
    id: '3',
    name: 'Sofia Marchetti',
    email: 'sofia.m@acme.io',
    avatar: 'SM',
    role: 'Growth Marketer',
    status: 'pending',
    spend: 4310.75,
    joined: '2024-08-21',
    usage: 41,
  },
  {
    id: '4',
    name: 'Kenji Watanabe',
    email: 'kenji.w@acme.io',
    avatar: 'KW',
    role: 'Data Analyst',
    status: 'inactive',
    spend: 0,
    joined: '2023-05-09',
    usage: 0,
  },
  {
    id: '5',
    name: 'Priya Nair',
    email: 'priya.n@acme.io',
    avatar: 'PN',
    role: 'Customer Success',
    status: 'failed',
    spend: 2760.2,
    joined: '2024-01-30',
    usage: 27,
  },
]