var frameModule = require("ui/frame");
var builder = require("ui/builder");
var gestures = require("ui/gestures");
var imageSource = require("image-source");
var View = require("ui/core/view").View;
var StackLayout = require("ui/layouts/stack-layout").StackLayout;

var NACamera = {};
var _bounds, _session, _device, _input, _output, _previewLayer;
var _torchMode = false, _flashMode = false;
var errorCameraDeviceUnavailable = "Error: Camera device unavailable.";
var errorCameraTorchUnavailable = "Error: Camera torch unavailable.";
var errorCameraFlashUnavailable = "Error: Camera flash unavailable.";

NACamera.Camera = (function(_super) {
  __extends(Camera, _super);
  function Camera() {
    _super.call(this);
    
    this.constructView();
  }
  
  Camera.prototype.constructView = function() {
    _this = this;
    _nativeView = this.ios;
    
    _session = new AVCaptureSession();
    
    _device = deviceWithPosition(AVCaptureDevicePositionBack);
    _input = AVCaptureDeviceInput.deviceInputWithDeviceError(_device, null);
    
    if(_input) {
      _session.addInput(_input);
      
      _output = new AVCaptureStillImageOutput();
      _session.addOutput(_output);
      
      _previewLayer = AVCaptureVideoPreviewLayer.layerWithSession(_session);
      _previewLayer.videoGravity = AVLayerVideoGravityResizeAspectFill;
      _nativeView.layer.addSublayer(_previewLayer);
    }
  };
  
  Camera.prototype.onLoaded = function() {
    _this = this;
    _nativeView = this.ios;
    
    enablePinchToZoom(this);
  };
  
  Camera.prototype.onUnloaded = function() {
    if(_device) _session.stopRunning();
  };
  
  Camera.prototype.onLayout = function(left, top, right, bottom) {
    _this = this;
    _nativeView = this.ios;
    
    if(_input) {
      _bounds = _nativeView.bounds;
      _previewLayer.frame = _bounds;
      _previewLayer.position = CGPointMake(CGRectGetMidX(_bounds), CGRectGetMidY(_bounds));
    }
  };
  
  return Camera;
})(StackLayout);

// Start/stop camera
NACamera.start = function() {
  if(_device) _session.startRunning();
    else console.error("[NACamera.start] " + errorCameraDeviceUnavailable);
};

NACamera.stop = function() {
  if(_device) _session.stopRunning();
    else console.error("[NACamera.stop] " + errorCameraDeviceUnavailable);
};

// Capture photo
NACamera.capturePhoto = function(props = {}) {
  var defaults = {
    saveToLibrary: false,
    playSound: true,
    simulatorDebug: false,
    simulatorImage: ""
  };
  for(var key in defaults) if(!props.hasOwnProperty(key)) props[key] = defaults[key];
  
  return new Promise(function(resolve, reject) {
    if(_output) {
      var videoConnection = _output.connections[0];

      _output.captureStillImageAsynchronouslyFromConnectionCompletionHandler(videoConnection, function(buffer, error) {
        var imageData = AVCaptureStillImageOutput.jpegStillImageNSDataRepresentation(buffer);
        var image = applyAspectFillImageInRect(UIImage.imageWithData(imageData), _bounds);
        
        if(props.saveToLibrary) UIImageWriteToSavedPhotosAlbum(image, null, null, null);
        if(props.playSound) AudioServicesPlaySystemSound(144);
        
        resolve(imageSource.fromNativeSource(image), props.saveToLibrary);
      });
    } else if(props.simulatorDebug) {
      var image = applyAspectFillImageInRect(props.simulatorImage.ios.image, props.simulatorImage.ios.bounds);
      
      if(props.saveToLibrary) UIImageWriteToSavedPhotosAlbum(image, null, null, null);
      if(props.playSound) AudioServicesPlaySystemSound(144);
      resolve(imageSource.fromNativeSource(image), props.saveToLibrary);
    } else {
      console.error("[NACamera.capturePhoto]" + errorCameraDeviceUnavailable);
      reject(errorCameraDeviceUnavailable);
    }
  });
};

// Save to library
NACamera.saveToLibrary = function(image) {
  UIImageWriteToSavedPhotosAlbum(image.ios, null, null, null);
  return true;
};

// Get device state
NACamera.devicesAvailable = function() {
  var devices = AVCaptureDevice.devicesWithMediaType(AVMediaTypeVideo);
  return (devices.count > 0 ? true : false);
};

// Torch mode
NACamera.setTorchMode = function(condition) {
  if(typeof condition !== "undefined" && _device && _device.hasTorch) {
    _device.lockForConfiguration(null);
//    _session.beginConfiguration();
    
    if(condition === true) {
      _device.torchMode = AVCaptureTorchModeOn;
      _torchMode = true;
      return true;
    } else if(condition === false) {
      _device.torchMode = AVCaptureTorchModeOff;
      _torchMode = false;
      return false;
    }
    
    _device.unlockForConfiguration();
//    _session.commitConfiguration();
  } else {
    console.error("[NACamera.setTorchMode] " + errorCameraTorchUnavailable);
    _torchMode = false;
    return false;
  }
};

NACamera.getTorchMode = function() {
  return _torchMode;
};

NACamera.hasTorchMode = function() {
  return (_device && _device.hasTorch ? true : false);
};

// Flash mode
NACamera.setFlashMode = function(condition) {
  if(typeof condition !== "undefined" && _device && _device.hasFlash) {
    _device.lockForConfiguration(null);
//    _session.beginConfiguration();
    
    if(condition === true) {
      _device.flashMode = AVCaptureFlashModeOn;
      _flashMode = true;
      return true;
    } else if(condition === false) {
      _device.flashMode = AVCaptureFlashModeOff;
      _flashMode = false;
      return false;
    }
    
    _device.unlockForConfiguration();
//    _session.commitConfiguration();
  } else {
    console.error("[NACamera.setFlashMode] " + errorCameraFlashUnavailable);
    _flashMode = false;
    return false;
  }
};

NACamera.getFlashMode = function() {
  return _flashMode;
};

NACamera.hasFlashMode = function() {
  return (_device && _device.hasFlash ? true : false);
};

// Camera position
NACamera.setDevicePosition = function(position) {
  if(typeof position !== "undefined" && _device) {
    _session.removeInput(_input);
    
    if(_device.position == AVCaptureDevicePositionBack) {
      _device = deviceWithPosition(AVCaptureDevicePositionFront);
    } else {
      _device = deviceWithPosition(AVCaptureDevicePositionBack);
    }
    
    _input = AVCaptureDeviceInput.alloc().initWithDeviceError(_device, null);
    
    if(_input) {
      _session.addInput(_input);
      return true;
    } else {
      console.error("[NACamera.setCameraPosition] " + errorCameraDeviceUnavailable);
      return false;
    }
  } else {
    console.error("[NACamera.setCameraPosition] " + errorCameraDeviceUnavailable);
    return false;
  }
};

NACamera.getDevicePosition = function() {
  if(_device) {
    if(_device.position == AVCaptureDevicePositionBack) return "back";
      else if(_device.position == AVCaptureDevicePositionFront) return "front";
  }
  return null;
};

NACamera.hasDevicePosition = function(position) {
  if(position === "back") position = AVCaptureDevicePositionBack;
    else if(position === "front") position = AVCaptureDevicePositionFront;
    else position = null;
  
  return (position && deviceWithPosition(position) ? true : false);
};

module.exports = NACamera;


/* INTERNAL METHODS
==================================== */
// Camera with position
var deviceWithPosition = function(position) {
  var devices = AVCaptureDevice.devicesWithMediaType(AVMediaTypeVideo);
  
  for(var i = 0; i < devices.count; i++) if(devices[i].position == position) return devices[i];
  return null;
};

// Apply AspectFill ratio on captured photo
var applyAspectFillImageInRect = function(image, bounds) {
  var minSize = Math.min(image.size.width, image.size.height);
  var aspectRatio = Math.min(minSize / bounds.size.width, minSize / bounds.size.height);
  var width = Math.round(bounds.size.width * aspectRatio);
  var height = Math.round(bounds.size.height * aspectRatio);
  var rect = { origin: { x: 0, y: 0 }, size: { width: width, height: height } };
  
  var renderView = UIView.alloc().initWithFrame(rect);
  var imageView = UIImageView.alloc().initWithFrame(renderView.bounds);
  
  imageView.image = image;
  imageView.contentMode = UIViewContentModeScaleAspectFill;
  renderView.addSubview(imageView);
  
  UIGraphicsBeginImageContext(rect.size);
  var context = UIGraphicsGetCurrentContext();
  renderView.layer.renderInContext(context);
  var newImage = UIGraphicsGetImageFromCurrentImageContext();
  UIGraphicsEndImageContext();
//  var imageData = UIImageJPEGRepresentation(newImage, 1);
  
  return newImage;
//  return UIImage.imageWithData(imageData);
};

// Pinch to zoom
var enablePinchToZoom = function(view) {
  view.on(gestures.GestureTypes.pinch, function(e) {
    console.log(e.scale);
    console.log(e.state);
  });
};