import type { Network } from '../types';

export interface NetworkConfig {
  id: Network;
  name: string;
  tag: string;
  symbol: string;
  color: string;
  activeHalo: string;
  addressPrefix: string;
  sampleAddress: string;
}

export const NETWORKS: Record<Network, NetworkConfig> = {
  TRON: {
    id: 'TRON',
    name: 'TRON',
    tag: 'TRC-20',
    symbol: 'USDT',
    color: '#FF2438',
    activeHalo: 'rgba(255, 36, 56, 0.4)',
    addressPrefix: 'T',
    sampleAddress: 'TX4a8e9K...19b2',
  },
  ETHEREUM: {
    id: 'ETHEREUM',
    name: 'ETHEREUM',
    tag: 'ERC-20',
    symbol: 'ETH',
    color: '#22D3EE',
    activeHalo: 'rgba(34, 211, 238, 0.45)',
    addressPrefix: '0x',
    sampleAddress: '0x82fa91...7a21',
  },
  SOLANA: {
    id: 'SOLANA',
    name: 'SOLANA',
    tag: 'SOL',
    symbol: 'SOL',
    color: '#00E676',
    activeHalo: 'rgba(0, 230, 118, 0.4)',
    addressPrefix: '',
    sampleAddress: '9K3m2X8...7F4d',
  },
};
