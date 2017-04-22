const frameModule = require("ui/frame");
const builder = require("ui/builder");
const gestures = require("ui/gestures");
const imageSource = require("image-source");
const View = require("ui/core/view").View;
const StackLayout = require("ui/layouts/stack-layout").StackLayout;
const AbsoluteLayout = require("ui/layouts/absolute-layout").AbsoluteLayout;
const colorModule = require("color");

let _session, _device, _input, _output;
let _torchMode = false, _flashMode = false;
const errorCameraDeviceUnavailable = "Error: Camera device unavailable.";
const errorCameraTorchUnavailable = "Error: Camera torch unavailable.";
const errorCameraFlashUnavailable = "Error: Camera flash unavailable.";
const errorAccessToCameraDeniedByUser = "Error: Access to camera denied by user.";
const errorAccessToLibraryDeniedByUser = "Error: Access to library denied by user.";

const NACamera = {};

NACamera.Camera = (function(_super) {
  __extends(Camera, _super);
  function Camera() {
    const _this = _super !== null && _super.apply(this, arguments) || this;

    _this._bounds = null;
    _this._previewLayer = null;
    _this._onFocusDelay = null;
    
    _this._init();

    return _this;
  }
  
  Camera.prototype.onUnloaded = function() {
    if(_device) _session.stopRunning();
  };
  
  Camera.prototype.onLayout = function(left, top, right, bottom) {
    _super.prototype.onLayout.call(this, left, top, right, bottom);
    const nativeView = this.ios;
    
    if(_input) {
      this._bounds = nativeView.bounds;
      this._previewLayer.frame = this._bounds;
      this._previewLayer.position = CGPointMake(CGRectGetMidX(this._bounds), CGRectGetMidY(this._bounds));
      this._previewLayer.connection.videoOrientation = this._videoOrientationFromCurrentDeviceOrientation();
    }
  };

  Camera.prototype.capturePhoto = function(props = {}) {
    const defaults = {
      saveToLibrary: false,
      mirrorCorrection: true,
      playSound: true
    };
    for(let key in defaults) if(!props.hasOwnProperty(key)) props[key] = defaults[key];
    
    return new Promise((resolve, reject) => {
      if(_output) {
        const videoConnection = _output.connections[0];

        videoConnection.videoOrientation = this._videoOrientationFromCurrentDeviceOrientation();

        _output.captureStillImageAsynchronouslyFromConnectionCompletionHandler(videoConnection, (buffer, error) => {
          if(NACamera.getDevicePosition() === "back") props.mirrorCorrection = false;
          
          const imageData = AVCaptureStillImageOutput.jpegStillImageNSDataRepresentation(buffer);
          const image = applyAspectFillImageInRect(UIImage.imageWithData(imageData), this._bounds, props.mirrorCorrection);
          
          if(props.saveToLibrary) UIImageWriteToSavedPhotosAlbum(image, null, null, null);
          if(props.playSound) AudioServicesPlaySystemSound(1108);
          
          resolve(imageSource.fromNativeSource(image), props.saveToLibrary);
        });
      } else {
        console.error("[NACamera.capturePhoto]" + errorCameraDeviceUnavailable);
        reject(errorCameraDeviceUnavailable);
      }
    });
  };
  
  Camera.prototype._init = function() {
    const nativeView = this.ios;
    
    if(typeof _session === "undefined") _session = new AVCaptureSession();
    if(typeof _device === "undefined") _device = deviceWithPosition(AVCaptureDevicePositionBack);
    if(typeof _input === "undefined") _input = AVCaptureDeviceInput.deviceInputWithDeviceError(_device, null);
    
    if(_input) {
      _session.addInput(_input);
      _output = new AVCaptureStillImageOutput();
      _session.addOutput(_output);
      
      this._previewLayer = AVCaptureVideoPreviewLayer.layerWithSession(_session);
      this._previewLayer.videoGravity = AVLayerVideoGravityResizeAspectFill;
      this.nativeView.layer.addSublayer(this._previewLayer);
    }

    enablePinchToZoom(this);
    enableTapToFocus(this);
  };

  Camera.prototype._videoOrientationFromCurrentDeviceOrientation = function() {
    const deviceOrientation = UIApplication.sharedApplication.statusBarOrientation;

    switch(deviceOrientation) {
      case UIInterfaceOrientationPortrait:           return AVCaptureVideoOrientationPortrait;
      case UIInterfaceOrientationLandscapeLeft:      return AVCaptureVideoOrientationLandscapeLeft;
      case UIInterfaceOrientationLandscapeRight:     return AVCaptureVideoOrientationLandscapeRight;
      case UIInterfaceOrientationPortraitUpsideDown: return AVCaptureVideoOrientationPortraitUpsideDown;
    }
  };
  
  return Camera;
})(StackLayout);

// Request access to camera
NACamera.requestCameraAccess = function() {
  return new Promise((resolve, reject) => {
    const status = AVCaptureDevice.authorizationStatusForMediaType(AVMediaTypeVideo);

    if(status === AVAuthorizationStatusAuthorized) {
      resolve(true);
    } else if(status === AVAuthorizationStatusNotDetermined) {
      AVCaptureDevice.requestAccessForMediaTypeCompletionHandler(AVMediaTypeVideo, granted => {
        if(granted) {
          resolve(true);
        } else {
          reject(false);
        }
      });
    } else {
      // console.error(new Error("[NACamera.requestAccess]", errorAccessToCameraDeniedByUser));
      reject(false);
    }
  });
};

// Request access to library
NACamera.requestLibraryAccess = function() {
  return new Promise((resolve, reject) => {
    const status = PHPhotoLibrary.authorizationStatus();

    if(status === PHAuthorizationStatusAuthorized) {
      resolve(true);
    } else if(status === PHAuthorizationStatusNotDetermined) {
      PHPhotoLibrary.requestAuthorization(authStatus => {
        if(authStatus === PHAuthorizationStatusAuthorized) {
          resolve(true);
        } else {
          reject(false);
        }
      });
    } else {
      // console.error(new Error("[NACamera.requestAccess]", errorAccessToLibraryDeniedByUser));
      reject(false);
    }
  });
};

// Start/stop camera
NACamera.start = function() {
  if(_device) _session.startRunning();
    else console.error("[NACamera.start]", errorCameraDeviceUnavailable);
};

NACamera.stop = function() {
  if(_device) _session.stopRunning();
    else console.error("[NACamera.stop]", errorCameraDeviceUnavailable);
};

// Save to library
NACamera.saveToLibrary = function(image) {
  UIImageWriteToSavedPhotosAlbum(image.ios, null, null, null);
  return true;
};

// Get device state
NACamera.devicesAvailable = function() {
  const devices = AVCaptureDevice.devicesWithMediaType(AVMediaTypeVideo);
  return (devices.count > 0 ? true : false);
};

// Torch mode
NACamera.setTorchMode = function(condition) {
  if(typeof condition !== "undefined" && _device && _device.hasTorch) {
    _device.lockForConfiguration(null);
    
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


/* INTERNAL FUNCTIONS
==================================== */
// Camera with position
function deviceWithPosition(position) {
  const devices = AVCaptureDevice.devicesWithMediaType(AVMediaTypeVideo);
  
  for(let i = 0; i < devices.count; i++) if(devices[i].position == position) return devices[i];
  return null;
}

// Apply AspectFill ratio on captured photo
function applyAspectFillImageInRect(image, bounds, mirror = false) {
  const minSize = Math.min(image.size.width, image.size.height);
  const aspectRatio = Math.min(minSize / bounds.size.width, minSize / bounds.size.height);
  const width = Math.round(bounds.size.width * aspectRatio);
  const height = Math.round(bounds.size.height * aspectRatio);
  const rect = { origin: { x: 0, y: 0 }, size: { width: width, height: height } };
  
  const renderView = UIView.alloc().initWithFrame(rect);
  const imageView = UIImageView.alloc().init();
  
  imageView.image = image;
  imageView.contentMode = UIViewContentModeScaleAspectFill;
  imageView.frame = rect; // This somehow needs to be set after imageView.contentMode
  imageView.clipsToBounds = true;
  renderView.addSubview(imageView);
  
  if(mirror) imageView.transform = CGAffineTransformMakeScale(-1, 1);
  
  UIGraphicsBeginImageContext(rect.size);
  const context = UIGraphicsGetCurrentContext();
  renderView.layer.renderInContext(context);
  const newImage = UIGraphicsGetImageFromCurrentImageContext();
  UIGraphicsEndImageContext();
//  const imageData = UIImageJPEGRepresentation(newImage, 1);
  
  return newImage;
//  return UIImage.imageWithData(imageData);
}

// Pinch to zoom
function enablePinchToZoom(_this) {
  let lastZoomFactor = 1;
  let zoomFactor;
  
  _this.on("pinch", e => {
    if(_device) {
      if(e.state === 1) {
        clearTimeout(_this._onFocusDelay);
        lastZoomFactor = _device.videoZoomFactor;
      } else if(e.state === 2) {
        zoomFactor = (() => {
          let value = lastZoomFactor * e.scale;
          value = Math.min(_device.activeFormat.videoMaxZoomFactor, value);
          return Math.max(1, value);
        })();

        _device.lockForConfiguration(null);
        _device.videoZoomFactor = zoomFactor;
        _device.unlockForConfiguration();
      } else if(e.state === 3) {
        lastZoomFactor = zoomFactor;
      }
    } else {
      if(e.state === 1) {
        clearTimeout(_this._onFocusDelay);
        console.error(errorCameraDeviceUnavailable);
      }
    }
  });
}

// Tap to focus
function enableTapToFocus(_this) {
  const focusPoint = {};
  
  const focusCircle = new AbsoluteLayout();
  const focusCircleSize = 48;
  focusCircle.width = focusCircle.height = focusCircleSize + 8;
  focusCircle.horizontalAlignment = "left";
  focusCircle.opacity = 0;
  focusCircle.clipToBounds = false;
  focusCircle.ios.layer.shadowColor = new colorModule.Color("#000000").ios.CGColor;
  focusCircle.ios.layer.shadowOffset = CGSizeZero;
  focusCircle.ios.layer.shadowOpacity = 0.25;
  focusCircle.ios.layer.shadowRadius = 2;
  
  const focusCircleOuter = new StackLayout();
  focusCircleOuter.width = focusCircleOuter.height = focusCircleSize;
  focusCircleOuter.marginTop = focusCircleOuter.marginLeft = 4;
  focusCircleOuter.borderWidth = 1;
  focusCircleOuter.borderColor = "#ffffff";
  focusCircleOuter.borderRadius = focusCircleSize / 2;
  
  const focusCircleInner = new StackLayout();
  focusCircleInner.width = focusCircleInner.height = focusCircleSize - 6;
  focusCircleInner.marginTop = focusCircleInner.marginLeft = 7;
  focusCircleInner.backgroundColor = new colorModule.Color(128, 255, 255, 255);
  focusCircleInner.borderRadius = focusCircleInner.width / 2;
  focusCircleInner.scaleX = focusCircleInner.scaleY = 0.01;
  
  focusCircle.addChild(focusCircleOuter);
  focusCircle.addChild(focusCircleInner);
  _this.addChild(focusCircle);
  
  let animateFocusTimeout;
  const animateFocusCircle = function() {
    if(animateFocusTimeout) clearTimeout(animateFocusTimeout);
    
    focusCircle.translateX = focusPoint.x - (focusCircle.width / 2);
    focusCircle.translateY = focusPoint.y - (focusCircle.width / 2);
    focusCircle.scaleX = focusCircle.scaleY = 0.01;
    focusCircleInner.scaleX = focusCircleInner.scaleY = 0.01;
    focusCircleInner.opacity = 1;
    
    const duration = 250;
    const props = { opacity: 1, scale: { x: 1.2, y: 1.2 }, translate: { x: focusCircle.translateX, y: focusCircle.translateY }, duration: duration };
    
    focusCircle.animate(props).then(function() {
      props.scale = { x: 1, y: 1 };
      focusCircle.animate(props).then(function() {
        animateFocusTimeout = setTimeout(function() { focusCircle.opacity = 0; }, duration);
      });
    });
    
    focusCircleInner.animate({ scale: { x: 1, y: 1 }, duration: duration }).then(function() {
      focusCircleInner.animate({ opacity: 0, duration: duration });
    });
  };
  
  _this.on("touch", e => {
    if(e.action === "down" && e.getPointerCount() === 1) {
      focusPoint.x = e.getX();
      focusPoint.y = e.getY();
      
      _this._onFocusDelay = setTimeout(function() {
        animateFocusCircle();
        
        if(_device) {
          if(_device.focusPointOfInterest && _device.isFocusModeSupported(AVCaptureFocusModeAutoFocus)) {
            _device.lockForConfiguration(null);
            
            _device.focusPointOfInterest = CGPointMake(focusPoint.x, focusPoint.y);
            _device.focusMode = AVCaptureFocusModeAutoFocus;
            
            if(_device.isExposureModeSupported(AVCaptureExposureModeAutoExpose))
              _device.exposureMode = AVCaptureExposureModeAutoExpose;
            
            _device.unlockForConfiguration();
          }
        } else {
          console.error(errorCameraDeviceUnavailable);
        }
      }, 200);
    }
    
    if(e.action === "move" && _this._onFocusDelay) clearTimeout(_this._onFocusDelay);
  });
};