'use strict';

var AWS = require('aws-sdk'),
    documentClient = new AWS.DynamoDB.DocumentClient();
const stepfunctions = new AWS.StepFunctions({apiVersion: '2016-11-23'});

module.exports.retry = (event, context, callback) => {
	
    var eventText = JSON.stringify(event, null, 2);
	console.log("Received event:", eventText);
	
	var input = JSON.parse(eventText);

	// The provisioning state machine, defined in the resources/Outputs section of serverless.yml
    var provisioningStateMachineArn = process.env.provisioningstatemachine_arn; 

    var params = {
        stateMachineArn: provisioningStateMachineArn,
        statusFilter: "FAILED"
	 };    
    
    // Get executions of the state machine
    stepfunctions.listExecutions(params, function(err, data) {
        if (err) console.log(err, err.stack); 
        else {
        	console.log("Failed Execution History:", data); 
        	// Loop through the failed executions
            if (data.executions.length > 0) {
        	    for (var i = 0; i < data.executions.length; i++) {
                    console.log(data.executions[i].executionArn);
       
                    var params = {
                    	    executionArn: data.executions[i].executionArn, 
                    		maxResults: 0,
                    		reverseOrder: true
                    };
                    			 
                    // get the history for this particular execution of the state machine
                    stepfunctions.getExecutionHistory(params, function(err, historyData) {
                    	// find the step that caused the failure
                    	var failedState = findFailedState(err, historyData);	
                    	if (failedState != null) console.log("found fail state", failedState);
                    	else                     console.log("no state found");
                    });
                   
                }
            }     
        }
      
    });    

	callback(null, {} );
};


function findFailedState(err, data) {
	if (err) {
     	console.log(err, err.stack); 
     	return null;
 	}
 	else { 
 		console.log(data);          
 		    
 		// Doublecheck that the execution actually failed
 		if (data.events.length < 1 || data.events[0].type !== 'ExecutionFailed') {
 			console.log('Execution did not end with an ExecutionFailed event', executionArn);
 		} else {
 			// Walk back to the state BEFORE the one of type 'FailStateEntered' 
 			// (the one that actually caused the failure before transitioning to failure)
 			for (var i = 0; i < data.events.length; i++) {
 			    if (data.events[i].type === 'FailStateEntered') {
 			    	// get the next event in the list (they appear in reverse order) and return its state name
 			    	//console.log(data.events[i+1].stateExitedEventDetails.name);
 			    	return data.events[i+1].stateExitedEventDetails.name;
 				}
 			}
 				
 		}
 		return null;
 	}
}
