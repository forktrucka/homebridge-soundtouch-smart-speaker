import { SoundTouchService } from './ServiceType.js';
import {
  Characteristic,
  CharacteristicValue,
  Logging,
  Nullable,
  PlatformAccessory,
  Service,
} from 'homebridge';
import { SoundTouchDevice } from '../../devices/SoundTouch/SoundTouchDevice.js';
import { SoundTouchHomebridgePlatform } from '../../platform.js';
import { FormattedLogger } from '../../utils/FormattedLogger.js';

export class SoundTouchVolumeService implements SoundTouchService {
  // private interaction?: InteractionStrategy;
  private service: Service;
  private platform: SoundTouchHomebridgePlatform;
  private log: FormattedLogger;
  private device: SoundTouchDevice;
  private characteristic: Characteristic;

  constructor({
    // interaction,
    service,
    platform,
    log,
    device,
  }: {
    // interaction?: InteractionStrategy;
    accessory: PlatformAccessory;
    device: SoundTouchDevice;
    platform: SoundTouchHomebridgePlatform;
    service: Service;
    log: Logging;
  }) {
    // this.interaction = interaction;
    this.service = service;
    this.platform = platform;
    this.device = device;
    this.log = FormattedLogger.create(log, device);
    this.characteristic = this.service.getCharacteristic(
      this.platform.Characteristic.Volume
    );
    this.characteristic
      .onSet(this.setVolume.bind(this))
      .onGet(this.getVolume.bind(this));
  }

  async init(): Promise<void> {
    this.log.debug('initialising volume');
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const volume = await this.device.api.getVolume();
    const updatedVolume = volume?.actual ?? 0;

    if (this.characteristic.value !== updatedVolume) {
      this.log.debug('volume: %s%', updatedVolume);
      this.characteristic.updateValue(updatedVolume);
    }
  }

  async getVolume(): Promise<Nullable<CharacteristicValue>> {
    this.log.debug('getting volume status');
    const volume = await this.device.api.getVolume();

    return volume?.actual ?? 0;
  }

  async setVolume(value: CharacteristicValue): Promise<void> {
    this.log.debug('setting volume status');
    const volume = value as number;
    const volumeCharacteristic = this.service.getCharacteristic(
      this.platform.Characteristic.Volume
    );

    const secureVolume = this.secureVolume(volumeCharacteristic, {
      newValue: volume,
      oldValue: (volumeCharacteristic.value as number) ?? 0,
    });

    if (secureVolume === undefined) {
      return;
    }

    volumeCharacteristic.updateValue(volume);

    await this.device.api.setVolume(volume);
  }

  private secureVolume(
    characteristic: Characteristic,
    change: { newValue: number; oldValue: number }
  ): number | undefined {
    const maxValue = characteristic.props.maxValue;
    if (change.newValue === maxValue && change.oldValue <= maxValue / 2) {
      return Math.max(change.oldValue, this.device.volumeSettings.unmuteValue);
    }
    return undefined;
  }

  static async create({
    ...props
  }: {
    // type: SpeakerType;
    accessory: PlatformAccessory;
    device: SoundTouchDevice;
    platform: SoundTouchHomebridgePlatform;
    service: Service;
  }) {
    return new SoundTouchVolumeService({
      log: props.platform.log,
      ...props,
    });
  }
}
