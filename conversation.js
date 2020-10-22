var TJBot = require('tjbot');
var config = require('./config');
const VisualRecognitionV3 = require('ibm-watson/visual-recognition/v3');
const { IamAuthenticator } = require('ibm-watson/auth');
const fs = require('fs');
var child_process = require('child_process');

// obtain our credentials from config.js
var credentials = config.credentials;

// obtain user-specific config
var WORKSPACEID = config.workspaceId;

// these are the hardware capabilities that TJ needs for this recipe
var hardware = ['microphone', 'speaker', 'led', 'servo', 'camera'];
if (config.hasCamera == false) {
    hardware = ['microphone', 'speaker', 'led', 'servo'];
}

//Vision

var i = 0;
function launchVision(){
//var filename = 'sample.jpg';
  var filename = 'photos/pic_'+i+'.jpg';
  //var args = ['-vf', '-hf','-w', '960', '-h', '720', '-o', filename, '-t', '1'];
  var args = ['-w', '960', '-h', '720', '-o', filename, '-t', '5'];
  var spawn = child_process.spawn('raspistill', args);
  spawn.on('exit', function(code) {
    console.log('A photo is saved as '+filename+ ' with exit code, ' + code);
    let timestamp = Date.now();
    processImage(filename);
    i++;
  });
}





// obtain TJBot's configuration from config.js
var tjConfig = config.tjConfig;

// instantiate our TJBot!
var tj = new TJBot(hardware, tjConfig, credentials);

console.log("You can ask me to introduce myself or tell you a joke.");
console.log("Try saying, \"" + tj.configuration.robot.name + ", please introduce yourself\" or \"" + tj.configuration.robot.name + ", what can you do?\"");
console.log("You can also say, \"" + tj.configuration.robot.name + ", tell me a joke!\"");


const visualRecognition = new VisualRecognitionV3({
  // See: https://github.com/watson-developer-cloud/node-sdk#authentication
  version: '2018-03-19',
  authenticator: new IamAuthenticator({
    apikey: 'OENJmvIiMfoqwXBHkqkbAIYEgLXtynZtmGN9k7iHnkv5',
  }),
  serviceUrl: 'https://api.us-south.visual-recognition.watson.cloud.ibm.com/instances/2097e450-2137-4b50-81fa-b65855126bcf',
});

/*
function launchVision()
{
  var filename = 'photos/pic_'+i+'.jpg';
  var args = ['-w', '960', '-h', '720', '-o', filename, '-t', '5'];
  var spawn = child_process.spawn('raspistill', args);
  spawn.on('exit', function(code) {
    console.log('A photo is saved as '+filename+ ' with exit code, ' + code);
    let timestamp = Date.now();
    processImage(filename)
    i++;
  });
}*/
function processImage(imagefile){
var params = {
  // An image file (.jpg, .png) or .zip file with images
  imagesFile: fs.createReadStream(imagefile),
};

var resultstring = "The objects I see are " ;
var confidencethreshold = 0.5 ;
visualRecognition
  .classify(params)
  .then(response => {
    //console.log(JSON.stringify(response.result.images[0].classifiers[0].classes, null, 2));
   //.classifiers[0].classes
   
   var r = response.result.images[0].classifiers[0].classes.map(d=>d.class);
   
     for(let i of r)
	{
          //console.log(i);
	 resultstring += i +", ";	
	}
    
   tj.speak(resultstring);   
   console.log(resultstring);
   }).catch(error => console.error(error));
}



// listen for utterances with our attentionWord and send the result to
// the Assistant service
tj.listen(function(msg) {
    // check to see if they are talking to TJBot
    if (msg.toLowerCase().startsWith(tj.configuration.robot.name.toLowerCase())) {
        // remove our name from the message
        var turn = msg.toLowerCase().replace(tj.configuration.robot.name.toLowerCase(), "");
        
        var utterance = turn.toLowerCase();
        
        // send to the assistant service
        tj.converse(WORKSPACEID, utterance, function(response) {
            var spoken = false;
            
            // check if an intent to control the bot was found
            if (response.object.intents != undefined) {
                var intent = response.object.intents[0];
                if (intent != undefined && intent.intent != undefined) {
                    switch (intent.intent) {
                        case "lower-arm":
                            tj.speak(response.description);
                            tj.lowerArm();
                            spoken = true;
                            break;
                        case "raise-arm":
                            tj.speak(response.description);
                            tj.raiseArm();
                            spoken = true;
                            break;
                        case "wave":
                            tj.speak(response.description);
                            tj.wave();
                            spoken = true;
                            break;
                        case "greeting":
                            tj.speak(response.description);
                            tj.wave();
                            spoken = true;
                            break;
                        case "shine":
                            var misunderstood = false;
                            if (response.object.entities != undefined) {
                                var entity = response.object.entities[0];
                                if (entity != undefined && entity.value != undefined) {
                                    var color = entity.value;
                                    tj.speak(response.description);
                                    tj.shine(color);
                                    spoken = true;
                                } else {
                                    misunderstood = true;
                                }
                            } else {
                                misunderstood = true;
                            }
                            
                            if (misunderstood == true) {
                                tj.speak("I'm sorry, I didn't understand your color");
                                spoken = true;
                            }
                            break;
                        case "see":
                            if (config.hasCamera == false) 
                               {
                                tj.speak("I'm sorry, I don't have a camera so I can't see anything");
                                spoken = true;
                               } 
                            else 
                               {  
                           	
			
                                 
                              launchVision();

                               spoken = true;
                            }
                            break;
                        }
						//book section
						case "book":
							  tj.speak(response.description);
							   //run node to display book
                               spoken = true;
                            }
                            break;
                        }
						
                    }
                }
            
                // if we didn't speak a response yet, speak it now
                if (spoken == false) {
                    tj.speak(response.description);
                }
        });
    }
});
