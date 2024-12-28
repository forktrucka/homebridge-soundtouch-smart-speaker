import { SoundTouchSpeakerCharacteristic } from './ServiceType.js';
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
import { VolumeMode } from '../../SoundTouchHomeBridgePlatformConfig.js';

export class SoundTouchSpeakerVolumeCharacteristic
  implements SoundTouchSpeakerCharacteristic
{
  private service: Service;
  private platform: SoundTouchHomebridgePlatform;
  private log: FormattedLogger;
  private device: SoundTouchDevice;
  private characteristic: Characteristic;

  constructor({
    service,
    platform,
    log,
    device,
    speakerType,
  }: {
    accessory: PlatformAccessory;
    device: SoundTouchDevice;
    platform: SoundTouchHomebridgePlatform;
    service: Service;
    log: Logging;
    speakerType: Omit<keyof VolumeMode, 'none'>;
  }) {
    this.service = service;
    this.platform = platform;
    this.device = device;
    this.log = FormattedLogger.create(log, device);

    if (speakerType === VolumeMode.none) {
      throw new Error(
        'Speaker type cannot be none for a volume characteristic to be used'
      );
    }

    if (speakerType === VolumeMode.speaker) {
      this.characteristic = this.service.getCharacteristic(
        this.platform.Characteristic.Volume
      );
    } else {
      this.characteristic = this.service.getCharacteristic(
        this.platform.Characteristic.Brightness
      );
    }

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

    this.log.debug(
      'current volume: %s. vs. actual: %s',
      this.characteristic.value,
      volume?.actual
    );

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

    this.log.debug('old - %s. new - %s', this.characteristic.value, volume);

    const secureVolume = this.secureVolume(this.characteristic, {
      newValue: volume,
      oldValue: this.characteristic.value as number,
    });

    if (secureVolume !== undefined) {
      this.log.debug('no new volume');
      await this.device.api.setVolume(secureVolume);
      return;
    }

    await this.device.api.setVolume(volume);
  }

  private secureVolume(
    characteristic: Characteristic,
    change: { newValue: number; oldValue: number }
  ): number | undefined {
    const maxValue = characteristic.props.maxValue; // 100

    if (change.newValue === maxValue && change.oldValue <= maxValue / 2) {
      // old - 32, new - 32
      return Math.max(change.oldValue, this.device.volumeSettings.unmuteValue);
    }
    return undefined;
  }

  static async create({
    ...props
  }: {
    accessory: PlatformAccessory;
    device: SoundTouchDevice;
    platform: SoundTouchHomebridgePlatform;
    service: Service;
    speakerType: Omit<keyof VolumeMode, 'none'>;
  }) {
    return new SoundTouchSpeakerVolumeCharacteristic({
      log: props.platform.log,
      ...props,
    });
  }
}
