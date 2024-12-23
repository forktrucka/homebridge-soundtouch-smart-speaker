import { SoundTouchService } from './ServiceType.js';
import { Logging, PlatformAccessory } from 'homebridge';
import { SoundTouchDevice } from '../../devices/SoundTouch/SoundTouchDevice.js';
import { SoundTouchHomebridgePlatform } from '../../platform.js';
import { FormattedLogger } from '../../utils/FormattedLogger.js';

export class SoundTouchInformationService implements SoundTouchService {
  private platform: SoundTouchHomebridgePlatform;
  private accessory: PlatformAccessory;
  private device: SoundTouchDevice;
  private log: FormattedLogger;

  constructor(props: {
    device: SoundTouchDevice;
    log: Logging;
    accessory: PlatformAccessory;
    platform: SoundTouchHomebridgePlatform;
  }) {
    this.platform = props.platform;
    this.accessory = props.accessory;
    this.device = props.device;
    this.log = FormattedLogger.create(props.log, this.device);
  }

  async init(): Promise<void> {
    this.log.debug('initialising info');

    const informationService = this.accessory.getService(
      this.platform.Service.AccessoryInformation
    );
    if (!informationService) {
      throw new Error('No information service found');
    }
    informationService
      .setCharacteristic(this.platform.Characteristic.Name, this.device.name)
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Bose')
      .setCharacteristic(this.platform.Characteristic.Model, this.device.model)
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.device.id
      );
    if (this.device.version) {
      informationService.setCharacteristic(
        this.platform.Characteristic.FirmwareRevision,
        this.device.version
      );
    }
  }

  static async create(props: {
    accessory: PlatformAccessory;
    device: SoundTouchDevice;
    platform: SoundTouchHomebridgePlatform;
  }): Promise<SoundTouchInformationService> {
    const log = props.platform.log;
    return new SoundTouchInformationService({ log, ...props });
  }
}
