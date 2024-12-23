import type { PlatformConfig } from 'homebridge';

export interface BasePlatformConfig extends PlatformConfig {
  readonly global?: BaseGlobalConfig;
}

export interface BaseGlobalConfig {
  readonly verbose?: boolean;
}

export function isVerboseInConfigs(...configs: BaseGlobalConfig[]): boolean {
  let isVerbose = false;
  for (const config of configs) {
    if (config && config.verbose !== undefined) {
      isVerbose = config.verbose;
    }
  }
  return isVerbose;
}

export interface GlobalConfig extends BaseGlobalConfig {
  readonly pollingInterval?: number;
  readonly volume?: VolumeConfig;
  readonly presets?: PresetConfig[];
  readonly sources?: SourceConfig[];
}

export enum VolumeMode {
  none = 'none',
  lightbulb = 'lightbulb',
  speaker = 'speaker',
}

export interface VolumeConfig {
  readonly onValue?: number;
  readonly maxValue?: number;
  readonly unmuteValue?: number;
  readonly mode?: VolumeMode;
}

export interface AccessoryConfig extends GlobalConfig {
  readonly name?: string;
  readonly room?: string;
  readonly ip?: string;
  readonly port?: number;
}

export interface PresetConfig {
  readonly name?: string;
  readonly index: number;
  readonly enabled?: boolean;
}

export interface SourceConfig {
  readonly name?: string;
  readonly source: string; // PRODUCT, BLUETOOTH, ...
  readonly account?: string; // TV, HDMI_1, ...
  readonly enabled?: boolean;
}

export interface SoundTouchHomeBridgePlatformConfig extends BasePlatformConfig {
  readonly discoverAllAccessories?: boolean;
  readonly accessories?: AccessoryConfig[];
  readonly global?: GlobalConfig;
}
