import type { KnowledgeDocument, KnowledgeSource } from './source-types'

const profile = {
  name: 'Nelson',
  username: 'LST97',
  email: 'laisiotu1997@gmail.com',
  github: 'https://github.com/lst97',
  linkedIn: 'https://www.linkedin.com/in/lst97/',
  biography: [
    'Nelson is a junior software developer from Hong Kong and a Deakin University Computer Science graduate. His online name LST97 comes from the initials of his Chinese name, Lai Sio Tou, and 97 refers to his birth year, 1997.',
    "His current focus is web development with Next.js, React, and TypeScript, with backend experience in C# and database technologies. His GitHub includes open-source tools and projects such as GNAF Autocomplete and SPHKOSS. SplitTab is Nelson's expense-management app for splitting shared costs. GNAF Autocomplete demo: https://gnaf.lst97.dev. Smartplay HK OSS demo: https://sphkoss.lst97.dev. Nelson has also built an e-commerce site for Best Maker Pty Ltd. Best Maker website: https://www.bestmaker.com.au.",
  ],
  education: [
    'Diploma of Information Technology — Deakin College, completed 2021.',
    'Certificate IV in Information Technology — Deakin College, completed 2021; 85% WAM.',
    'Bachelor of Computer Science — Deakin University, completed 2023; 70% WAM.',
    'Diploma of Automotive Technology — Box Hill Institute of TAFE, completed 2019.',
    'Certificate IV in Automotive — Hoyu Secondary School, completed 2016.',
  ],
  experience: [
    'Team Leader intern, Rotary Club of Melbourne (Mar–May 2023): communicated research outcomes and project progress to club leadership and members, and advocated music and art therapy to support underprivileged youth.',
    'Customer Service contractor, KC Renovation (Mar–Jun 2021): monitored renovation schedules and budgets, checked daily progress, identified issues, communicated project updates to customers, and prepared weekly status reports covering progress and next steps.',
    'Kitchen Hand, ST Zita Cafe (Oct 2021–Jul 2022): supported chefs, line cooks, and service staff with food preparation and storage, adapting to changing duties during busy periods as part of a small team.',
    'Automotive Mechanic placement, Kmart Tyre & Auto Services (Jul 2019–Jan 2020): assisted with general vehicle servicing and repair work as part of a team.',
    'Nelson has also worked in cabinetmaking and Uber delivery driving. He reports 200+ kitchen-hand hours, 50+ cabinetmaking hours, thousands of deliveries, and 13+ blood donations; these are self-reported approximate totals.',
  ],
  interests:
    'Nelson is interested in building practical, maintainable web applications, APIs, and useful tools. His work spans frontend development, full-stack application delivery, database design, authentication, and cloud deployment. He values learning, collaboration, clear customer communication, and careful project coordination.',
} as const

export function createProfileKnowledgeSource(): KnowledgeSource & { listDocuments(): Promise<KnowledgeDocument[]> } {
  const source: KnowledgeSource = {
    type: 'profile',
    async fetch(sourceId): Promise<KnowledgeDocument | null> {
      if (sourceId !== 'operator-profile') return null
      return {
        source: {
          type: 'profile',
          sourceId,
          title: `${profile.name} (${profile.username})`,
          url: profile.github,
        },
        text: [
          ...profile.biography,
          '## Education',
          ...profile.education.map((entry) => `- ${entry}`),
          '## Work experience',
          ...profile.experience.map((entry) => `- ${entry}`),
          '## Professional interests and skills',
          profile.interests,
          `Contact email for enquiries: ${profile.email}`,
          `GitHub profile: ${profile.github}`,
          `LinkedIn profile: ${profile.linkedIn}`,
        ].join('\n\n'),
        isPublic: true,
        sourceUpdatedAt: null,
      }
    },
  }
  return Object.assign(source, {
    listDocuments: async () => {
      const document = await source.fetch('operator-profile')
      return document ? [document] : []
    },
  })
}
