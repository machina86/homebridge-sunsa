import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { SunsaPlatform } from './platform';
import { SunsaApi } from './sunsaApi';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class SunsaPlatformAccessory {
  private windowCoveringService: Service;
  private batteryService: Service;
  private positionState: number;
  private currentPosition: number;
  private currentTiltAngle: number;
  private targetPosition: number;
  private lastPosition: number;
  private statusLowBattery: number;
  private batteryLevel: number;

  constructor(
    private readonly platform: SunsaPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly sunsaApi: SunsaApi,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Sunsa')
      .setCharacteristic(this.platform.Characteristic.Model, 'Sunsa Wand')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.device.idDevice.toString());

    // get the windowcovering service if it exists, otherwise create a new windowcovering service
    this.windowCoveringService = this.accessory.getService(this.platform.Service.WindowCovering) ||
      this.accessory.addService(this.platform.Service.WindowCovering);

    // set the service name, this is what is displayed as the default name on the Home app
    // we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.windowCoveringService.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.name);

    // set current position and state at startup
    this.currentPosition = this.getHomekitValue(this.accessory.context.device.position);
    this.currentTiltAngle = this.getTiltAngle(this.accessory.context.device.position);
    this.targetPosition = this.currentPosition;
    this.lastPosition = this.currentPosition;
    this.positionState = 2;

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/WindowCovering

    // create handlers for required window covering characteristics
    this.windowCoveringService.getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .onGet(this.handleCurrentPositionGet.bind(this));

    if (this.accessory.context.device.blindType.value < 3) {
      this.windowCoveringService.getCharacteristic(this.platform.Characteristic.CurrentHorizontalTiltAngle)
        .onGet(this.handleCurrentTiltAngleGet.bind(this));
    } else {
      this.windowCoveringService.getCharacteristic(this.platform.Characteristic.CurrentVerticalTiltAngle)
        .onGet(this.handleCurrentTiltAngleGet.bind(this));
    }

    this.windowCoveringService.getCharacteristic(this.platform.Characteristic.PositionState)
      .onGet(this.handlePositionStateGet.bind(this));

    //set target position to move in increments of 10
    this.windowCoveringService.getCharacteristic(this.platform.Characteristic.TargetPosition)
      .onGet(this.handleTargetPositionGet.bind(this))
      .onSet(this.handleTargetPositionSet.bind(this))
      .setProps({
        minValue: 0,
        maxValue: 100,
        minStep: 10,
      });

    // get the windowcovering service if it exists, otherwise create a new windowcovering service
    this.batteryService = this.accessory.getService(this.platform.Service.Battery) ||
      this.accessory.addService(this.platform.Service.Battery);

    // set the service name, this is what is displayed as the default name on the Home app
    // we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.batteryService.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.name);

    // create handlers for required characteristics
    this.batteryService.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
      .onGet(this.handleStatusLowBatteryGet.bind(this));

    this.batteryService.getCharacteristic(this.platform.Characteristic.BatteryLevel)
      .onGet(this.handleBatteryLevelGet.bind(this));

    this.statusLowBattery = 0;
    this.batteryLevel = parseInt(this.accessory.context.device.batteryPercentage);
    if (this.batteryLevel <= 10) {
      this.statusLowBattery = 1;
    }

    //Poll the device
    setInterval(() => {
      this.sunsaApi.getDevices().then((response) => {
        if (response.devices) {
          response.devices.forEach((device) => {
            if (device.idDevice === this.accessory.context.device.idDevice) {
              this.currentPosition = this.getHomekitValue(device.position);

              //see if the current position matches the last known position
              if (this.lastPosition !== this.currentPosition) {
                this.lastPosition = this.currentPosition;
              } else {
                this.targetPosition = this.currentPosition;
                this.currentTiltAngle = this.getTiltAngle(device.position);
                this.windowCoveringService.getCharacteristic(this.platform.Characteristic.CurrentPosition)
                  .updateValue(this.currentPosition);
                if (this.accessory.context.device.blindType.value < 3) {
                  this.windowCoveringService.getCharacteristic(this.platform.Characteristic.CurrentHorizontalTiltAngle)
                    .updateValue(this.currentTiltAngle);
                } else {
                  this.windowCoveringService.getCharacteristic(this.platform.Characteristic.CurrentVerticalTiltAngle)
                    .updateValue(this.currentTiltAngle);
                }
              }

              //see if current position is differnt from the target position
              if (this.currentPosition > this.lastPosition) {
                this.positionState = 1;
              } else if (this.currentPosition < this.lastPosition) {
                this.positionState = 0;
              } else {
                this.positionState = 2;
              }

              //check battery status
              this.batteryLevel = parseInt(device.batteryPercentage);
              this.batteryService.getCharacteristic(this.platform.Characteristic.BatteryLevel).updateValue(this.batteryLevel);
              if (this.batteryLevel <= 10) {
                this.statusLowBattery = 1;
                this.batteryService.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(this.statusLowBattery);
              }

              //set current position and position state
              this.windowCoveringService.getCharacteristic(this.platform.Characteristic.TargetPosition).updateValue(this.currentPosition);
              this.windowCoveringService.getCharacteristic(this.platform.Characteristic.PositionState).updateValue(this.positionState);
              this.accessory.context.device = device;
            }
          });
        } else {
          this.platform.log.info(response);
        }
      });
    }, 10000);
  }

  /**
   * Handle requests to get the current value of the "Current Position" characteristic
   */
  handleCurrentPositionGet() {
    this.platform.log.debug('Triggered GET CurrentPosition');

    const currentValue = this.currentPosition;

    return currentValue;
  }


  /**
   * Handle requests to get the current value of the "Current Position" characteristic
   */
  handleCurrentTiltAngleGet() {
    this.platform.log.debug('Triggered GET CurrentTiltAngle');

    const currentValue = this.currentTiltAngle;

    return currentValue;
  }


  /**
   * Handle requests to get the current value of the "Position State" characteristic
   */
  handlePositionStateGet() {
    this.platform.log.debug('Triggered GET PositionState');

    const currentValue = this.positionState;

    return currentValue;
  }


  /**
   * Handle requests to get the current value of the "Target Position" characteristic
   */
  handleTargetPositionGet() {
    this.platform.log.debug('Triggered GET TargetPosition');

    // set this to a valid value for TargetPosition
    const currentValue = this.targetPosition;

    return currentValue;
  }

  /**
   * Handle requests to set the "Target Position" characteristic
   */
  handleTargetPositionSet(value) {
    this.platform.log.debug('Triggered SET TargetPosition:' + value);
    this.targetPosition = value;

    const setValue = this.getSunsaValue(value);

    if (value > this.currentPosition) {
      this.positionState = 1;
    } else if (value < this.currentPosition) {
      this.positionState = 0;
    } else {
      this.positionState = 2;
    }
    this.windowCoveringService.getCharacteristic(this.platform.Characteristic.PositionState).updateValue(this.positionState);

    this.sunsaApi.setPosition(setValue, this.accessory.context.device.idDevice).then((response) => {
      if (response.device) {
        this.currentPosition = this.getHomekitValue(response.device.position);
        this.currentTiltAngle = this.getTiltAngle(response.device.position);
        this.targetPosition = this.currentPosition;
        this.lastPosition = this.currentPosition;
        this.positionState = 2;

        this.windowCoveringService.getCharacteristic(this.platform.Characteristic.CurrentPosition).updateValue(this.currentPosition);
        this.windowCoveringService.getCharacteristic(this.platform.Characteristic.PositionState).updateValue(this.positionState);
        this.windowCoveringService.getCharacteristic(this.platform.Characteristic.TargetPosition).updateValue(this.currentPosition);
        if (this.accessory.context.device.blindType.value < 3) {
          this.windowCoveringService.getCharacteristic(this.platform.Characteristic.CurrentHorizontalTiltAngle)
            .updateValue(this.currentTiltAngle);
        } else {
          this.windowCoveringService.getCharacteristic(this.platform.Characteristic.CurrentVerticalTiltAngle)
            .updateValue(this.currentTiltAngle);
        }
      } else {
        this.platform.log.info(response);
      }
    });
  }

  /**
   * Handle requests to get the current value of the "Target Position" characteristic
   */
  handleStatusLowBatteryGet() {
    this.platform.log.debug('Triggered GET StatusLowBattery');

    // set this to a valid value for TargetPosition
    const currentValue = this.statusLowBattery;

    return currentValue;
  }

  /**
   * Handle requests to get the current value of the "Target Position" characteristic
   */
  handleBatteryLevelGet() {
    this.platform.log.debug('Triggered GET BatteryLevel');

    // set this to a valid value for TargetPosition
    const currentValue = this.batteryLevel;

    return currentValue;
  }

  getHomekitValue(value) {
    const homekitValue = Math.sign(value) === -1 ? value * -1 : value;
    let setValue = homekitValue;

    if (homekitValue > 50) {
      setValue = (50 - (homekitValue - 50));
    } else if (setValue < 50) {
      setValue = ((50 - homekitValue) + 50);
    }

    return setValue;
  }

  getSunsaValue(value) {
    const homekitValue = Math.sign(value) === -1 ? value * -1 : value;
    let setValue = homekitValue;

    if (homekitValue > 50) {
      setValue = (50 - (homekitValue - 50));
    } else if (setValue < 50) {
      setValue = ((50 - homekitValue) + 50);
    }

    return setValue * (this.accessory.context.device.defaultSmartHomeDirection.value === 1 ? -1 : 1);
  }

  getTiltAngle(value) {
    const tiltAngle = value * 0.9;

    return tiltAngle;
  }
}
