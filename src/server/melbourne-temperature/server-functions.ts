import { createServerFn } from '@tanstack/react-start'

import { melbourneTemperatureReader } from './runtime'

// `strict: false` because the header renders `—` when this is null: an
// open-meteo outage must degrade the one decorative number, not the page.
export const getMelbourneTemperatureServerFn = createServerFn({ method: 'GET', strict: false }).handler(() =>
  melbourneTemperatureReader.getTemperature(),
)
