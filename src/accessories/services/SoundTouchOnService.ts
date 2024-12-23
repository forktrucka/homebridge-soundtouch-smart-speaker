import {
  Characteristic,
  CharacteristicValue,
  Logging,
  PlatformAccessory,
  Service,
} from 'homebridge';
import { SoundTouchDevice } from '../../devices/SoundTouch/SoundTouchDevice.js';
import { SoundTouchHomebridgePlatform } from '../../platform.js';
import { KeyValue, SourceStatus } from '../../devices/SoundTouch/api/index.js';
import { SoundTouchService } from './ServiceType.js';
import { FormattedLogger } from '../../utils/FormattedLogger.js';

export type SpeakerStatus = 'on' | 'off' | 'unknown';

export class SoundTouchOnService implements SoundTouchService {
  private readonly device: SoundTouchDevice;
  private readonly service: Service;
  private readonly log: FormattedLogger;
  private readonly platform: SoundTouchHomebridgePlatform;
  private characteristic: Characteristic;
  private status: SpeakerStatus;

  constructor(props: {
    device: SoundTouchDevice;
    log: Logging;
    service: Service;
    platform: SoundTouchHomebridgePlatform;
  }) {
    this.service = props.service;
    this.device = props.device;
    this.platform = props.platform;
    this.log = FormattedLogger.create(props.log, this.device);
    this.status = 'unknown';
    this.characteristic = this.service.getCharacteristic(
      this.platform.Characteristic.On
    );

    this.characteristic
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));
  }

  async init(): Promise<void> {
    this.log.debug('initialising on status');
    await this.refresh();
  }

  async refresh(): Promise<void> {
    await this.checkIsOnStatus();
  }

  async setOn(value: CharacteristicValue): Promise<void> {
    const desiredPowerStatus = value as boolean;

    this.log.debug(
      `setting to: ${desiredPowerStatus} current status: ${this.status}`
    );

    try {
      if (desiredPowerStatus && this.status !== 'on') {
        await this.device.api.pressKey(KeyValue.power);
      } else if (!desiredPowerStatus && this.status !== 'off') {
        await this.device.api.pressKey(KeyValue.power);
      }

      const playing = await this.device.api.getNowPlaying();
      this.status = playing?.source === SourceStatus.standBy ? 'off' : 'on';
    } catch (e: unknown) {
      this.log.error('error setting on status', e);
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE
      );
    } finally {
      //give it time before trying to change.
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    // const isOn = await SoundTouchDevice.deviceIsOn(this.device);
    const isOn = this.status === 'on';

    this.log.debug(`${isOn ? 'Is on' : 'Is off'}`);

    return isOn;
  }

  private async checkIsOnStatus() {
    const isOn = await SoundTouchDevice.deviceIsOn(this.device);
    const newStatus = isOn ? 'on' : 'off';

    if (newStatus !== this.status) {
      this.log.debug(`updating status to '${newStatus}' from '${this.status}'`);
      this.status = newStatus;
      if (this.status === 'on') {
        this.characteristic.updateValue(true);
      } else if (this.status !== 'off') {
        this.characteristic.updateValue(false);
      }
    }
  }

  static async create(props: {
    accessory: PlatformAccessory;
    device: SoundTouchDevice;
    platform: SoundTouchHomebridgePlatform;
    service: Service;
  }): Promise<SoundTouchOnService> {
    return new SoundTouchOnService({
      log: props.platform.log,
      ...props,
    });
  }
}
