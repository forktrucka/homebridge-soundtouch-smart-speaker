import {
  AccessoryConfig,
  GlobalConfig,
  isVerboseInConfigs,
  PresetConfig,
  SourceConfig,
  VolumeMode,
} from '../../SoundTouchHomeBridgePlatformConfig.js';

import { BaseDevice } from 'homebridge-base-platform';
import type { Logging } from 'homebridge';
import { stringUpperCaseFirst } from '../../utils/index.js';
import { apiNotFoundWithName } from '../../errors.js';
import {
  API,
  APIDiscovery,
  compactMap,
  Info,
  SourceStatus,
} from './api/index.js';

export interface SoundTouchPreset {
  readonly name: string;
  readonly index: number;
}

export interface SoundTouchSource {
  readonly name: string;
  readonly source: string;
  readonly account?: string;
  readonly enabled: boolean;
}

export interface SoundTouchVolumeSettings {
  readonly onValue: number;
  readonly maxValue: number;
  readonly unmuteValue: number;
  readonly mode: VolumeMode;
}

export interface SoundTouchSpeakerPlatformAccessoryProps {
  api: API;
  model: string;
  verbose: boolean;
  pollingInterval?: number | undefined;
  version?: string | undefined;
  volumeSettings: SoundTouchVolumeSettings;
  presets: SoundTouchPreset[];
  sources: SoundTouchSource[];
  id: string;
  name: string;
}

export class SoundTouchDevice implements BaseDevice {
  api: API;
  model: string;
  verbose: boolean;
  pollingInterval?: number | undefined;
  version?: string | undefined;
  volumeSettings: SoundTouchVolumeSettings;
  presets: SoundTouchPreset[];
  sources: SoundTouchSource[];
  id: string;
  name: string;

  constructor(props: SoundTouchSpeakerPlatformAccessoryProps) {
    this.api = props.api;
    this.model = props.model;
    this.verbose = props.verbose;
    this.pollingInterval = props.pollingInterval;
    this.version = props.version;
    this.volumeSettings = props.volumeSettings;
    this.presets = props.presets;
    this.sources = props.sources;
    this.id = props.id;
    this.name = props.name;
  }

  static async searchAllDevices(
    globalConfig: GlobalConfig,
    accessoryConfigs: AccessoryConfig[],
    log: Logging
  ): Promise<SoundTouchDevice[]> {
    const apis = await APIDiscovery.search();
    const resolved = await Promise.all(
      apis.map(async (api) => {
        const info = await api.getInfo();
        if (!info) {
          return Promise.resolve(undefined);
        }
        const accessoryConfig = accessoryConfigs.find(
          (ac) =>
            ac.room === info.name ||
            info.networkInfo.some((i) => i.ipAddress === ac.ip)
        );
        return SoundTouchDevice._deviceFromApi(
          api,
          info,
          globalConfig,
          accessoryConfig || {},
          log
        );
      })
    );
    return resolved.filter((s): s is SoundTouchDevice => !!s);
  }

  static async deviceFromConfig(
    globalConfig: GlobalConfig,
    accessoryConfig: AccessoryConfig,
    log: Logging
  ): Promise<SoundTouchDevice> {
    let api;
    if (accessoryConfig.ip) {
      api = new API(accessoryConfig.ip, accessoryConfig.port);
    } else if (accessoryConfig.room) {
      api = await APIDiscovery.find(accessoryConfig.room);
      if (!api) {
        throw apiNotFoundWithName(accessoryConfig.name || '(undefined)');
      }
    }
    if (!api) {
      throw new Error('Could not find a device');
    }
    const info = await api.getInfo();
    if (!info) {
      throw new Error('Could not find device info');
    }
    return SoundTouchDevice._deviceFromApi(
      api,
      info,
      globalConfig,
      accessoryConfig,
      log
    );
  }

  private static async _deviceFromApi(
    api: API,
    info: Info,
    globalConfig: GlobalConfig,
    accessoryConfig: AccessoryConfig,
    log: Logging
  ): Promise<SoundTouchDevice> {
    const displayName = accessoryConfig.name || info.name;
    const isVerbose = isVerboseInConfigs(globalConfig, accessoryConfig);
    const pollingInterval =
      accessoryConfig.pollingInterval || globalConfig.pollingInterval;
    if (isVerbose) {
      log(`[${displayName}] Found device`);
    }
    const component = info.components.find(
      (c) => c.serialNumber.toLowerCase() === info.deviceId.toLowerCase()
    );

    const presets = await SoundTouchDevice._availablePresets(
      api,
      displayName,
      accessoryConfig.presets ?? [],
      globalConfig.presets ?? [],
      isVerbose ? log : undefined
    );
    const sources = await SoundTouchDevice._availableSources(
      api,
      displayName,
      accessoryConfig.sources,
      globalConfig.sources,
      isVerbose ? log : undefined
    );
    const globalVolume = globalConfig.volume || {};
    const accessoryVolume = accessoryConfig.volume || {};
    const onValue = globalVolume.onValue || accessoryVolume.onValue;
    return new SoundTouchDevice({
      api: api,
      name: displayName,
      id: info.deviceId,
      model: info.type,
      version: component ? component.softwareVersion : undefined,
      verbose: isVerbose,
      pollingInterval: pollingInterval,
      volumeSettings: {
        onValue: onValue || -1,
        maxValue: globalVolume.maxValue || accessoryVolume.maxValue || 100,
        unmuteValue:
          globalVolume.unmuteValue ||
          accessoryVolume.unmuteValue ||
          onValue ||
          35,
        mode: globalVolume.mode || accessoryVolume.mode || VolumeMode.lightbulb,
      },
      presets: presets,
      sources: sources,
    });
  }

  static async deviceIsOn(device: SoundTouchDevice): Promise<boolean> {
    try {
      const source = await device.api.getSource();
      switch (source) {
        case SourceStatus.standBy:
          return false;
        case SourceStatus.invalid:
          return true;
        default:
          return true;
      }
    } catch {
      return false;
    }
  }

  private static async _availablePresets(
    api: API,
    deviceName: string,
    accessoryPresets: PresetConfig[],
    globalPresets: PresetConfig[],
    log?: Logging
  ): Promise<SoundTouchPreset[]> {
    const presets = (await api.getPresets()) || [];
    return compactMap(presets, (preset) => {
      const presetConfig = SoundTouchDevice._findConfig(
        (p) => p.index === preset.id,
        accessoryPresets,
        globalPresets
      ) || { index: preset.id };
      if (log !== undefined) {
        log(
          `[${deviceName}] Found preset n°${preset.id} '${preset.contentItem.itemName}' on device`
        );
      }
      if (presetConfig.enabled === false) {
        return undefined;
      }
      return {
        name: presetConfig.name || preset.contentItem.itemName,
        index: preset.id,
      };
    }).filter((s): s is SoundTouchPreset => !!s);
  }

  private static async _availableSources(
    api: API,
    deviceName: string,
    accessorySources?: SourceConfig[],
    globalSources?: SourceConfig[],
    log?: Logging
  ): Promise<SoundTouchSource[]> {
    const sources = await api.getSources();
    if (!sources) {
      throw new Error('Could not find sources');
    }
    const localSources = sources.items.filter((src) => src.isLocal);
    return localSources.map((ls) => {
      if (log !== undefined) {
        log(
          `[${deviceName}] Found local source '${ls.source}' with account '${ls.sourceAccount || ''}' on device`
        );
      }
      const sourceConfig = SoundTouchDevice._findConfig(
        (p) =>
          p.source === ls.source &&
          (p.account !== undefined ? p.account === ls.sourceAccount : true),
        accessorySources,
        globalSources
      ) || { source: ls.source };
      return {
        name:
          sourceConfig.name ||
          `${deviceName} ${ls.name ? ls.name : stringUpperCaseFirst(sourceConfig.source)}`,
        source: sourceConfig.source,
        account: ls.sourceAccount,
        enabled: sourceConfig.enabled !== false,
      };
    });
  }

  private static _findConfig<Config>(
    predicate: (config: Config) => boolean,
    accessoryConfigs?: Config[],
    globalConfigs?: Config[]
  ): Config | undefined {
    const config = accessoryConfigs
      ? accessoryConfigs.find(predicate)
      : undefined;
    if (config !== undefined) {
      return config;
    }
    return globalConfigs ? globalConfigs.find(predicate) : undefined;
  }
}
