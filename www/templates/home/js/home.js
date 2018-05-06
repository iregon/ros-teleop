angular.module('starter.controllers')

.controller('HomeCtrl', function($scope) {
    
    $scope.forward = function () {
        console.log("avanti");   
        document.getElementById('startstopicon').setAttribute('src', RECORD_OFF);     
    }

    $scope.backward = function () {
        console.log("indietro");        
        document.getElementById('startstopicon').setAttribute('src', RECORD_ON);
    }

    $scope.left = function () {
        console.log("sinistra");        
    }

    $scope.right = function () {
        console.log("destra");        
    }

    $scope.videoStream = function () {
        document.getElementById('startstopicon').setAttribute('src', RECORD_OFF);        
        
        // request access to the video camera and start the video stream
        var hasRunOnce = false,
            video        = document.querySelector('#video'),
            canvas       = document.querySelector('#canvas'),
            width = 640,
            height,           // calculated once video stream size is known
            cameraStream;
        
        
        function cameraOn() {
            navigator.getMedia = ( navigator.getUserMedia ||
                                    navigator.webkitGetUserMedia ||
                                    navigator.mozGetUserMedia ||
                                    navigator.msGetUserMedia);
        
            navigator.getMedia(
                {
                    video: true,
                    audio: false
                },
                function(stream) {
                    cameraStream = stream;
                    if (navigator.mozGetUserMedia) {
                        video.mozSrcObject = stream;
                    } 
                    else {
                        var vendorURL = window.URL || window.webkitURL;
                        video.src = vendorURL.createObjectURL(stream);
                    }
                    video.play();
                },
                function(err) {
                    console.log("An error occured! " + err);
                    window.alert("An error occured! " + err);
                }
            );
        }
        
        function cameraOff() {
            cameraStream.stop();
            hasRunOnce = false;
            takepicture();       // blank the screen to prevent last image from staying
        }
        
        // function that is run once scale the height of the video stream to match the configured target width
        video.addEventListener('canplay', function(ev){
            if (!hasRunOnce) {
                height = video.videoHeight / (video.videoWidth/width);
                video.setAttribute('width', width);
                video.setAttribute('height', height);
                canvas.setAttribute('width', width);
                canvas.setAttribute('height', height);
                hasRunOnce = true;
            }
        }, false);
        
        // function that is run by trigger several times a second
        // takes snapshot of video to canvas, encodes the images as base 64 and sends it to the ROS topic
        function takepicture() {
            canvas.width = width;
            canvas.height = height;
        
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);   
        
            var data = canvas.toDataURL('image/jpeg');
            var imageMessage = new ROSLIB.Message({
                format : "jpeg",
                data : data.replace("data:image/jpeg;base64,", "")
            });
        
            imageTopic.publish(imageMessage);
        }
        
        function imusnapshot() {
            var beta_radian = ((beta + 360) / 360 * 2 * Math.PI) % (2 * Math.PI);
            var gamma_radian = ((gamma + 360) / 360 * 2 * Math.PI) % (2 * Math.PI);
            var alpha_radian = ((alpha + 360) / 360 * 2 * Math.PI) % (2 * Math.PI);
            var eurlerpose = new THREE.Euler(beta_radian, gamma_radian, alpha_radian);
            var quaternionpose = new THREE.Quaternion;
            quaternionpose.setFromEuler(eurlerpose);
        
            var imuMessage = new ROSLIB.Message({
                header : {
                    frame_id : "world"
                },
                orientation : {
                    x : quaternionpose.x,
                    y : quaternionpose.y,
                    z : quaternionpose.z,
                    w : quaternionpose.w
                },
                orientation_covariance : [0,0,0,0,0,0,0,0,0],
                angular_velocity : {
                    x : vbeta,
                    y : vgamma,
                    z : valpha,
                },
                angular_velocity_covariance  : [0,0,0,0,0,0,0,0,0],
                linear_acceleration : {
                    x : x,
                    y : y,
                    z : z,
                },
                linear_acceleration_covariance  : [0,0,0,0,0,0,0,0,0],
            });
        
            imuTopic.publish(imuMessage);
        }
        // turning on and off the timer that triggers sending pictures and imu information several times a second
        startstopicon.addEventListener('click', function(ev){
            if(cameraTimer == null) {
                ros.connect("ws://" + window.location.hostname + ":9090");
                cameraOn();
                cameraTimer = setInterval(function(){
                    takepicture();
                }, 250);       // publish an image 4 times per second
                imuTimer = setInterval(function(){
                    imusnapshot();
                }, 100);       // publish an IMU message 10 times per second
                document.getElementById('startstopicon').setAttribute('src', RECORD_ON);
            } 
            else {
                ros.close();
                cameraOff();
                clearInterval(cameraTimer);
                clearInterval(imuTimer);
                document.getElementById('startstopicon').setAttribute('src', RECORD_OFF);
                cameraTimer = null;
                imuTimer = null;
            }
        }, false);        
    }
});