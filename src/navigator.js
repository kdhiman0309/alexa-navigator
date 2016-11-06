// This code sample shows how to call and receive external rest service data, within your skill Lambda code.

// var AWS = require('aws-sdk');

var http = require('http');

var locations = { "home": { "address" : "Avalon La Jolla Colony, 7205 Charmant Drive, San Diego, CA 92122", "lat" : 32.86291060000001, "lng" : -117.2290153 } , "ucsd": { "address" : "9500 Gilman Dr, La Jolla, CA 92093", "lat" : 32.87694860000001, "lng": -117.2355329 }
    ,

    "ralphs" : {
        "address": "8657 Villa La Jolla Dr, La Jolla, CA 92037"

    }

};

exports.handler = function( event, context ) {
    var say = "";
    var shouldEndSession = false;
    var sessionAttributes = {};
    var myState = "";
    var output = 0;
    var rank = 0;

    if (event.session.attributes) {
        sessionAttributes = event.session.attributes;
    }

    if (event.request.type === "LaunchRequest") {
        say = "Hi! Welcome to navigator. Are you going somewhere?";
        context.succeed({sessionAttributes: sessionAttributes, response: buildSpeechletResponse(say, shouldEndSession) });

    } else {
        var IntentName = event.request.intent.name;

        if (IntentName === "FromToIntent") {

            var from = event.request.intent.slots.From.value;
            var to = event.request.intent.slots.To.value;
            if (from && to) {

                from = from.toLowerCase();
                to = to.toLowerCase();


                // call external rest service over https post
                var post_data = {"usstate": myState};

                var post_options = {
                    host:  'maps.googleapis.com',
                    //port: '8080',
                    path: encodeURI('/maps/api/directions/json?origin='+locations[from]["address"]+'&destination='+locations[to]["address"]+'&API_KEY=AIzaSyB6Goi4qJQz7j0q77tF6LES0sQTjrKh--M&mode=transit'),
                    method: 'GET',
                    } ;

                var post_req = http.request(post_options, function(res) {
                    res.setEncoding('utf8');
                    var returnData = "";
                    res.on('data', function (chunk) {
                        returnData += chunk;
                        console.log("***********"+returnData);
                    });
                    res.on('end', function () {
                        // returnData: {"usstate":"Delaware","attributes":[{"population":900000},{"rank":45}]}

                        output = JSON.parse(returnData)
                        output = output["routes"][0]["legs"][0]["steps"];

                        var info = "No bus found";
                        for(var i=0; i<output.length; i++) {
                            var cur = output[i];
                            if(cur["travel_mode"]==="TRANSIT") {
                                var fromstop = cur["transit_details"]["departure_stop"]["name"];
                                var frombustime= cur["transit_details"]["departure_time"]["text"];
                                var frombusnum = cur["transit_details"]["line"]["short_name"];
                                var frombusname = cur["transit_details"]["line"]["name"];
                                var curtime = new Date();

                                var startTime = new Date();
                                var parts = frombustime.match(/(\d+):(\d+)(am|pm)/);
                                if (parts) {
                                    var hours = parseInt(parts[1]),
                                        minutes = parseInt(parts[2]),
                                        tt = parts[3];
                                    if (tt === 'pm' && hours < 12) hours += 12;
                                    startTime.setHours(hours, minutes, 0, 0);
                                }
                                var nowtime = Date.parse(frombustime);
                                var remtime = (startTime.getTime() - curtime.getTime())/60000000;
                                console.log(remtime);
                                info = "Next bus " + frombusnum + " " + frombusname+ " from " + fromstop + " at " + frombustime;
                                info = info.replace("&","and");
                                break;
                            }
                        }

                        say = info;

                        // add the state to a session.attributes array
                        if (!sessionAttributes.requestList) {
                            sessionAttributes.requestList = [];
                        }
                        sessionAttributes.requestList.push(myState);

                        // This line concludes the lambda call.  Move this line to within any asynchronous callbacks that return and use data.
                        context.succeed({sessionAttributes: sessionAttributes, response: buildSpeechletResponse(say, shouldEndSession) });

                    });
                });
                post_req.end();

            }

        } else if (IntentName === "AMAZON.StopIntent" || IntentName === "AMAZON.CancelIntent") {
            say = "You asked for " + sessionAttributes.requestList.toString() + ". Thanks for playing!";
            shouldEndSession = true;
            context.succeed({sessionAttributes: sessionAttributes, response: buildSpeechletResponse(say, shouldEndSession) });


        } else if (IntentName === "AMAZON.HelpIntent" ) {
            say = "Just say the name of a U.S. State, such as Massachusetts or California."
            context.succeed({sessionAttributes: sessionAttributes, response: buildSpeechletResponse(say, shouldEndSession) });

        }
    }
};

function buildSpeechletResponse(say, shouldEndSession) {
    return {
        outputSpeech: {
            type: "SSML",
            ssml: "<speak>" + say + "</speak>"
        },
        reprompt: {
            outputSpeech: {
                type: "SSML",
                ssml: "<speak>Please try again. " + say + "</speak>"
            }
        },
        card: {
            type: "Simple",
            title: "My Card Title",
            content: "My Card Content, displayed on the Alexa App or alexa.amazon.com"
        },
        shouldEndSession: shouldEndSession
    };
}