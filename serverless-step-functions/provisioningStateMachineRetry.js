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
                        	console.log("history data: ", JSON.stringify(historyData));
                        	
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
                        				// Set up a new state machine definition with "GoToState" branching execution directly to the failed state
                        				var stateMachineDefinitionObj = JSON.parse(stateMachineDescData.definition);
                        				stateMachineDefinitionObj = setupNewStateMachineDefinitionWithGoToState(stateMachineDefinitionObj, failedStateName); 
                        				var stateMachineDefinitionStr = JSON.stringify(stateMachineDefinitionObj);
                        				
                        				// Create a name for the new state machine
                        			    var newStateMachineName = stateMachineDescData.name + '-with-GoToState';
                        			    
                        			    // Create the new state machine
                        			    var params = {
                                            definition: stateMachineDefinitionStr, 
                                            name: newStateMachineName,
                                            roleArn: stateMachineDescData.roleArn
                                        };
                        			    stepfunctions.createStateMachine(params, function(err, newStateMachineData) {
                        			        if (err) console.log(err, err.stack); 
                        			        else {
                        			        	// TODO: Walk backward through historyData and find the event where
                        			        	// type=TaskStateEntered and step=failedStateName
                        			        	// You should be able to get the original inputs to that step. Then modify it
                        			        	// and kick off the new state machine.
                        			        	
                        			        	
                        			        	
                        			        	// THIS IS WRONG. We don't need the original input to the entire state machine. We need
                        			        	// what was sent to the step that failed (the structure may change along the way.)
                        			        	/*
                        			        	// Get the first event in the history of the original execution (which is at the end of the array)
                        			        	// This should be when the execution started. This will have the original inputs, which we can
                        			        	// use to kick off the new state machine.
                        			        	var firstEvent = historyData.events[historyData.events.length - 1];
                        			        	if (firstEvent.type === "ExecutionStarted") {
                        			        		var originalInput = JSON.parse(firstEvent.executionStartedEventDetails.input);
                        			        		console.log("originalInput", originalInput);
                        			        		
                        			        		startNewStateMachineExecution(newStateMachineData, originalInput);
                        			        	}*/
                        			        	
                        			        	
                        			        }
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

function startNewStateMachineExecution(newStateMachineData, originalInput) {
	// Adjust the original input to include a new variable to force the new
	// state machine to jump to the right state
	originalInput["resuming"] = true;
	
	// Some of the manufactured failures for this state machine are because the input username
	// contain the word 'fail' (to prove this works.) Replace it with 'pass' and retry.
	originalInput["username"] = originalInput["username"].replace("fail", "pass");
	originalInput = JSON.stringify(originalInput);
	
	// Create an execution of the new state machine
	var params = {
        input: originalInput, 
        stateMachineArn: newStateMachineData.stateMachineArn
    };
	stepfunctions.startExecution(params, function(err, newExecutionData) {
	    if (err) console.log(err, err.stack); 
	    else console.log(newExecutionData);
	});
}



function setupNewStateMachineDefinitionWithGoToState(stateMachineDefinitionObj, failedStateName) {
	// A lot more detail about what I'm doing here: https://aws.amazon.com/blogs/compute/resume-aws-step-functions-from-any-state/

	var originalStartAt = stateMachineDefinitionObj.StartAt;
	
	// Create the GoToState with the variable $.resuming.
    // If new state machine is executed with $.resuming = true, then the state machine skips to the failed state.
    // Otherwise, it executes the state machine from the original start state.
	var GoToState = {
			'Type': "Choice", 
			'Choices': [
				{
				    'Variable': "$.resuming", 
				    'Next': originalStartAt,
				    'BooleanEquals': false, 
			    }
			], 
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
