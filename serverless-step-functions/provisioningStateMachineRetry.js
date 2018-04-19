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
    
    // Get failed executions of the state machine
    stepfunctions.listExecutions(params, function(err, executionData) {
        if (err) console.log(err, err.stack); 
        else {
        	console.log("Failed Execution List:", executionData); 
        	// Loop through the failed executions
            if (executionData.executions.length > 0) {
        	    for (var i = 0; i < executionData.executions.length; i++) {
        	    	var execution = executionData.executions[i];
       
                    var params = {
                    	executionArn: execution.executionArn, 
                    	maxResults: 0,
                    	reverseOrder: true
                    };
                    			 
                    // get the history for this particular execution of the state machine
                    stepfunctions.getExecutionHistory(params, function(err, historyData) {
                    	if (err) console.log(err, err.stack);
                    	else {
                    		console.log("Failed Execution History:", historyData);
                        	
                        	// find the step that caused the failure
                        	var failedStateName = findFailedState(err, historyData);	
                        	if (failedStateName != null) {
                        		var params = {
                                    stateMachineArn: provisioningStateMachineArn
                        		};
                        		
                        		stepfunctions.describeStateMachine(params, function(err, stateMachineDescData) {
                        			if (err) console.log(err, err.stack); 
                        			else if (stateMachineDescData == null) console.log("Did not get back state machine details for arn", provisioningStateMachineArn);
                        			else { 
                        				console.log("State Machine Description: ", stateMachineDescData);   
                        				
                        				// Set up a new state machine definition with "GoToState" branching execution directly to the failed state
                        				var stateMachineDefinitionObj = JSON.parse(stateMachineDescData.definition);
                        				stateMachineDefinitionObj = setupNewStateMachineDefinitionWithGoToState(stateMachineDefinitionObj, failedStateName);
                        				console.log("NEW State Machine definition: ", stateMachineDefinitionObj); 
                        				
                        				// Create a name for the new state machine
                        			    var newStateMachineName = stateMachineDescData.name + '-with-GoToState';
                        			    
                        			    // Create the new state machine
                        			    var params = {
                                            definition: JSON.stringify(stateMachineDefinitionObj), 
                                            name: newStateMachineName,
                                            roleArn: stateMachineDescData.roleArn
                                        };
                        			    stepfunctions.createStateMachine(params, function(err, data) {
                        			        if (err) console.log(err, err.stack); // an error occurred
                        			        else     console.log(data);           // successful response
                        			    });
                        			}
                        		});
                        	} else {
                        		console.log ("couldn't find fail state for execution arn:", execution.executionArn);
                        	}	
                    	}
                    	
                    });
                }
            }     
        }
      
    });    

	callback(null, {} );
};


function setupNewStateMachineDefinitionWithGoToState(stateMachineDefinitionObj, failedStateName) {
	// A lot more detail about what I'm doing here: https://aws.amazon.com/blogs/compute/resume-aws-step-functions-from-any-state/

	var originalStartAt = stateMachineDefinitionObj.StartAt;
	
	// Create the GoToState with the variable $.resuming.
    // If new state machine is executed with $.resuming = true, then the state machine skips to the failed state.
    // Otherwise, it executes the state machine from the original start state.
	var GoToState = {
			'Type': "Choice", 
			'Choices': [{
				'Variable': "$.resuming", 
				'Next': originalStartAt,
				'BooleanEquals': "False", 
			}], 
			'Default': failedStateName
	}
	
	// Add new GoToState to State List
	stateMachineDefinitionObj.States['GoToState'] = GoToState;
	
	// Reset the start point to be the new GoToState
	stateMachineDefinitionObj.StartAt = 'GoToState';
	
	return stateMachineDefinitionObj;
}


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
 			    	return data.events[i+1].stateExitedEventDetails.name;
 				}
 			}
 				
 		}
 		return null;
 	}
}
