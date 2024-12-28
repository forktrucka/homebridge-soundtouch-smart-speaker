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
import { PlayStatus } from '../../devices/SoundTouch/api/index.js';

export class SoundTouchSpeakerCurrentMediaCharacteristic
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
  }: {
    accessory: PlatformAccessory;
    device: SoundTouchDevice;
    platform: SoundTouchHomebridgePlatform;
    service: Service;
    log: Logging;
  }) {
    this.service = service;
    this.platform = platform;
    this.device = device;
    this.log = FormattedLogger.create(log, device);
    this.characteristic = this.service.getCharacteristic(
      this.platform.Characteristic.CurrentMediaState
    );
    this.characteristic.onGet(this.getMedia.bind(this));
  }

  async init(): Promise<void> {
    this.log.debug('initialising current media state');
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const nowPlaying = await this.device.api.getNowPlaying();

    if (!nowPlaying?.playStatus) {
      return;
    }
    const current = this.convertPlayState(nowPlaying.playStatus);
    if (this.characteristic.value !== current) {
      this.log.debug(
        'new current media status: %s - %s',
        current,
        nowPlaying?.playStatus
      );
      this.characteristic.updateValue(current);
    }
  }

  async getMedia(): Promise<Nullable<CharacteristicValue>> {
    this.log.debug('getting current media status');
    const nowPlaying = await this.device.api.getNowPlaying();
    return nowPlaying?.playStatus
      ? this.convertPlayState(nowPlaying.playStatus)
      : this.platform.Characteristic.CurrentMediaState.STOP;
  }

  private convertPlayState(status: PlayStatus): 0 | 1 | 2 | 3 | 4 | 5 {
    switch (status) {
      case PlayStatus.play:
        return this.platform.Characteristic.CurrentMediaState.PLAY;
      case PlayStatus.buffering:
        return this.platform.Characteristic.CurrentMediaState.LOADING;
      case PlayStatus.stop:
        return this.platform.Characteristic.CurrentMediaState.STOP;
      case PlayStatus.pause:
        return this.platform.Characteristic.CurrentMediaState.PAUSE;
      default:
        return this.platform.Characteristic.CurrentMediaState.STOP;
    }
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
    return new SoundTouchSpeakerCurrentMediaCharacteristic({
      log: props.platform.log,
      ...props,
    });
  }
}
