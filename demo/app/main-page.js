var NACamera = require("nativescript-na-camera");
var Observable = require("data/observable").Observable;
var gestures = require("ui/gestures");

var cameraPreview, simulatorPreview, capturePreview;
var page, pageData = new Observable({
  simulatorImage: "http://i.imgur.com/bSkPf1j.jpg",
  simulatorImageLoading: true,
  simulatorDebug: false,
  capturePreview: null,
  cameraAvailable: null,
  torchMode: false,
  flashMode: false,
  cameraPosition: null,
  saveToLibrary: false
});

exports.navigatingTo = function(args) {
  page = args.object;
  page.bindingContext = pageData;
  
  pageData.cameraAvailable = NACamera.devicesAvailable();
  pageData.cameraPosition = NACamera.getDevicePosition();
  
  cameraPreview = page.getViewById("cameraPreview");
  simulatorPreview = page.getViewById("simulatorPreview");
  capturePreview = page.getViewById("capturePreview");
  
  NACamera.start();
  
  if(pageData.simulatorDebug) {
    var simulatorPreviewIndicator = page.getViewById("simulatorPreviewIndicator");
    simulatorPreviewIndicator.bind({
      sourceProperty: "isLoading",
      targetProperty: "busy"
    }, simulatorPreview);
  }
  
  if(page.ios) {
    UIApplication.sharedApplication.setStatusBarStyleAnimated(UIStatusBarStyle.UIStatusBarStyleLightContent, true);
  }
};

exports.capturePhoto = function(args) {
  NACamera.capturePhoto({
    saveToLibrary: pageData.saveToLibrary,
    simulatorDebug: pageData.simulatorDebug,
    simulatorImage: (pageData.simulatorDebug ? simulatorPreview : false)
  }).then(function(image, savedToLibrary) {
    NACamera.stop();
    
    console.log("Photo captured" + (savedToLibrary ? " and saved to library!" : "!"));
    console.log("Photo width/height: " + image.width + "x" + image.height);
    
    pageData.capturePreview = image;
    pageData.saveToLibrary = (!pageData.saveToLibrary ? true : false);
    
    if(page.ios) {
      page.marginTop = 20;
      UIApplication.sharedApplication.setStatusBarHiddenWithAnimation(true, UIStatusBarAnimation.UIStatusBarAnimationSlide);
    }
  });
};

exports.newPhoto = function(args) {
  NACamera.start();
  
  pageData.capturePreview = null;
  pageData.saveToLibrary = false;
  
  if(page.ios) {
    page.marginTop = 0;
    UIApplication.sharedApplication.setStatusBarHiddenWithAnimation(false, UIStatusBarAnimation.UIStatusBarAnimationSlide);
  }
};

exports.saveToLibrary = function(args) {
  if(pageData.saveToLibrary) {
    pageData.saveToLibrary = false;
    NACamera.saveToLibrary(pageData.capturePreview);
    console.log("Photo saved to library!");
  }
};

exports.toggleTorchMode = function(args) {
  pageData.torchMode = NACamera.setTorchMode(!pageData.torchMode ? true : false);
};

exports.toggleFlashMode = function(args) {
  pageData.flashMode = NACamera.setFlashMode(!pageData.flashMode ? true : false);
};

exports.toggleCameraPosition = function(args) {
  NACamera.setDevicePosition(pageData.cameraPosition);
  
  if(NACamera.hasDevicePosition("front") && NACamera.hasDevicePosition("back")) {
    var toggleCameraPosition = page.getViewById("toggleCameraPosition");
    toggleCameraPosition.animate({ rotate: 180, duration: 250 }).then(function() {
      toggleCameraPosition.rotate = 0;
    });
    
    pageData.cameraPosition = NACamera.getDevicePosition();
  }
};