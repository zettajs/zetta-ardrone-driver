var util = require('util');
var Device = require('zetta').Device;
var arDrone = require('ar-drone');
var throttle = require('throttle-event');

var ArDrone = module.exports = function(ip) {
  Device.call(this);
  this.ip = ip;
  this.options = {
    movementSpeed : 0.7,
    movementTime : 300
  };
  this._client = null;
};
util.inherits(ArDrone, Device);

ArDrone.prototype.init = function(config) {
  config
    .type('ardrone')
    .state('landed')
    .name('ArDrone ' + this.ip)
    .when('landed', { allow: ['take-off','blink'] })
    .when('flying', { allow: ['stop','land', 'front', 'back', 'up', 'down', 'left', 'right', 'flip', 'blink', 'clockwise', 'counter-clockwise'] })
    .map('stop', this.stop)
    .map('take-off', this.takeOff)
    .map('land', this.land)
    .map('up', this.up)
    .map('down', this.down)
    .map('left', this.left)
    .map('right', this.right)
    .map('front', this.front)
    .map('back', this.back)
    .map('blink', this.blink)
    .map('flip', this.flip)
    .map('clockwise', this.clockwise)
    .map('counter-clockwise', this.counterClockwise)
    .monitor('batteryLevel')
    .monitor('gyroscope')
    .monitor('accelerometer');
  
  this._client = arDrone.createClient({ ip : this.ip });
  this._client.disableEmergency();
  this._client.config('general:navdata_demo', 'FALSE');
  this._client.on('navdata', throttle(50, this.onNavData.bind(this)));
};

ArDrone.prototype.onNavData = function(data) {
  if (data.droneState.lowBattery == 1) {
    this.state = 'low-battery';
    if (this.state === 'flying') {
      this.land();
    }
  } else {
    this.state = (data.droneState.flying == 0) ? 'landed' : 'flying';
  }
  
  if (data.rawMeasures) {
    this.batteryLevel = data.rawMeasures.batteryMilliVolt;
  }

  if (data.physMeasures) {
    
    function formatXYZ(val) {
      return {
        x: +val.x.toFixed(3),
        y: +val.y.toFixed(3),
        z: +val.z.toFixed(3)
      };
    }

    this.gyroscope = formatXYZ(data.physMeasures.gyroscopes);
    this.accelerometer = formatXYZ(data.physMeasures.accelerometers);
  }
};

ArDrone.prototype.blink = function(cb) {
  this._client.animateLeds('doubleMissile', 5, 1);
  cb();
};

ArDrone.prototype.flip = function(cb) {
  this._client.animate('flipLeft', 1000);
  cb();
};

ArDrone.prototype.takeOff = function(cb) {
  this.state = 'flying';
  this._client.takeoff(function() {
    cb();
  });
};

ArDrone.prototype.land = function(cb) {
  var self = this;
  this._client.land(function() {
    self.state = 'landed';
    cb();
  });
};

ArDrone.prototype.stop = function(cb) {
  this._client.stop(function() {
    cb();
  });
};

ArDrone.prototype._timedCall = function(func, cb, time) {
  var self = this;
  var state = this.state;
  this.state = func;
  this._client[func](this.options.movementSpeed);
  setTimeout(function() {
    self._client.stop();
    self.state = state;
    cb();
  }, (time || this.options.movementTime) );
};

ArDrone.prototype.up = function(cb) {
  this._timedCall('up', cb);
};

ArDrone.prototype.down = function(cb) {
  this._timedCall('down', cb);
};

ArDrone.prototype.right = function(cb) {
  this._timedCall('right', cb);
};

ArDrone.prototype.left = function(cb) {
  this._timedCall('left', cb);
};

ArDrone.prototype.front = function(cb) {
  this._timedCall('front', cb);
};

ArDrone.prototype.back = function(cb) {
  this._timedCall('back', cb);
};

ArDrone.prototype.clockwise = function(cb) {
  this._timedCall('clockwise', cb);
};

ArDrone.prototype.counterClockwise = function(cb) {
  this._timedCall('counterClockwise', cb);
};
