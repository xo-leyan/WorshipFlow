export interface BgPreset { id: string; name: string; animated: boolean }
export const PRESETS: BgPreset[] = [
  { id: 'aurora', name: 'Aurora', animated: true },
  { id: 'bokeh', name: 'Drifting light', animated: true },
  { id: 'stars', name: 'Starfield', animated: true },
  { id: 'waves', name: 'Ocean waves', animated: true },
  { id: 'rays', name: 'Light rays', animated: true },
  { id: 'embers', name: 'Rising embers', animated: true },
  { id: 'midnight', name: 'Midnight violet', animated: false },
  { id: 'sunrise', name: 'Sunrise glory', animated: false },
  { id: 'ocean', name: 'Deep ocean', animated: false },
  { id: 'forest', name: 'Forest dawn', animated: false },
  { id: 'gold', name: 'Royal gold', animated: false },
  { id: 'rose', name: 'Rose dusk', animated: false },
]
