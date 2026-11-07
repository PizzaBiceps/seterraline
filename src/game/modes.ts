import type { Country, Mode } from './engine';
/** New modes register presentation and answer-choice behavior without changing match rules. */
export interface ModeDefinition { id: Mode; title: string; surface: 'map' | 'choices'; prompt: (country: Country) => string; instruction: string; }
export const MODES: Record<Mode, ModeDefinition> = {
 countries: { id: 'countries', title: 'World', surface: 'map', prompt: country => country.name, instruction: 'Click a country on the map. Scroll to zoom, drag to explore.' },
 flags: { id: 'flags', title: 'Flags', surface: 'choices', prompt: () => 'Whose flag is this?', instruction: 'Every flag tells a story. Choose the country it belongs to.' },
 'flag-map': { id: 'flag-map', title: 'Flag → Country', surface: 'map', prompt: () => 'Locate this flag', instruction: 'Click the country that matches the flag.' },
};
