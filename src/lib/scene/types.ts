import type { Layout } from '../layout';

export interface LiquidFrame { layers: readonly { color: number; d: string }[] }
export interface SceneBubble {
  id: number; x: number; y: number; radius: number; innerRadius: number; color: number; group: number;
}
export type LiquidRenderer = (layout: Layout, screen: 'menu' | 'game', time: number) => LiquidFrame;
export type BubbleRenderer = (layout: Layout, screen: 'menu' | 'game', time: number) => readonly SceneBubble[];
export type VesselRenderer = (layout: Layout, screen: 'menu' | 'game') => { wet: string; dry: string; rim?: string; transpose: boolean };
