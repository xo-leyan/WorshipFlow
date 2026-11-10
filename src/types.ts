export type SectionType = 'verse' | 'chorus' | 'pre-chorus' | 'bridge' | 'ending' | 'intro' | 'tag'
export interface SongSection { type: SectionType; content: string; label?: string }
export interface SongSummary {
  id: number; title: string; artist: string; category: string; language: string; favorite: number; section_count: number
}
export interface Song {
  id: number; title: string; artist: string; category: string; language: string; favorite: number; sections: SongSection[]
}
export const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: 'verse', label: 'Verse' }, { value: 'chorus', label: 'Chorus' }, { value: 'pre-chorus', label: 'Pre-chorus' },
  { value: 'bridge', label: 'Bridge' }, { value: 'ending', label: 'Ending' }, { value: 'intro', label: 'Intro' }, { value: 'tag', label: 'Tag' },
]
export const DEFAULT_CATEGORIES = ['Praise', 'Worship', 'Hymn', 'Offering', 'Communion', 'Christmas', 'Easter']

export interface SlideStyle {
  fontSize: number; fontFamily: string; align: 'left' | 'center' | 'right'
  color: string; bgColor: string; bgImage: string; bgVideo: string; bgPreset: string; dim: number; shadow: boolean; label?: string
}
export interface Slide {
  key: number; kind: 'song' | 'bible' | 'announcement' | 'image' | 'video' | 'blank'
  source_id: number | null; content: string; style: SlideStyle
}
export interface PresentationSummary { id: number; name: string; updated_at: string; slide_count: number }
export const FONTS = ['Segoe UI', 'Arial', 'Verdana', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Impact', 'Courier New']
export const BASE_STYLE: SlideStyle = {
  fontSize: 64, fontFamily: 'Segoe UI', align: 'center', color: '#ffffff', bgColor: '#10131f', bgImage: '', bgVideo: '', bgPreset: '', dim: 0, shadow: true,
}
