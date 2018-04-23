'use strict';

var AWS = require('aws-sdk'),
    documentClient = new AWS.DynamoDB.DocumentClient();
const stepfunctions = new AWS.StepFunctions(/*{apiVersion: '2016-11-23'}*/);
var moment = require('moment');

module.exports.retry = (event, context, callback) => {
	
    var eventText = JSON.stringify(event, null, 2);
	console.log("Received event:", eventText);
	
	var input = JSON.parse(eventText);

	// The provisioning state machine, defined in the resources/Outputs section of serverless.yml
    var provisioningStateMachineArn = process.env.provisioningstatemachine_arn; 
    
    // An empty state machine, defined in serverless.yml, which will be filled in. We could create a new one,
    // but filling in the details of an existing one is easier because CloudFormation can clean it up when we 
    // tear things down.
    var retryStateMachineArn = process.env.retrystatemachine_arn; 

    var params = {
        stateMachineArn: provisioningStateMachineArn,
        statusFilter: "FAILED"
	 };    
    
    // Get failed executions of the state machine
    stepfunctions.listExecutions(params, function(err, executionData) {
        if (err) console.log(err, err.stack); 
        else {
        	// Loop through the failed executions 
        	// We are only interested in the ones that failed in the last 30 minutes for the purposes of this demonstration
        	// In a real-world scenario it would make more sense to keep track of which executions have been retried and store that 
        	// information somewhere so we don't accidentally redo one more than once, but that's unnecessary to demonstrate the idea here.
            if (executionData.executions.length > 0) {
        	    for (var i = 0; i < executionData.executions.length; i++) {
        	    	var execution = executionData.executions[i];
        	    	
        	    	// Check that the current execution occurred in the last 30 minutes, otherwise skip it
        	    	var currentTime = moment();
        	    	var executionTime = moment(execution.stopDate);
        	    	if (currentTime.diff(executionTime, 'm') > 30)
        	    		continue;
       
                    var params = {
                    	executionArn: execution.executionArn, 
                    	maxResults: 0,
                    	reverseOrder: true
                    };
                    			 
                    // get the history for this particular execution of the state machine
                    stepfunctions.getExecutionHistory(params, function(err, historyData) {
                    	if (err) console.log(err, err.stack);
                    	else {                        	
                        	// find the step that caused the failure
                        	var failedStateName = findFailedState(historyData);	
                        	if (failedStateName != null) {
                        		var params = {
                                    stateMachineArn: provisioningStateMachineArn
                        		};
                        		
                        		stepfunctions.describeStateMachine(params, function(err, stateMachineDescData) {
                        			if (err) console.log(err, err.stack); 
                        			else if (stateMachineDescData == null) 
                        				console.log("Did not get back state machine details for arn", provisioningStateMachineArn);
                        			else { 
                        				// Set up a new state machine definition with "GoToState" branching execution directly to the failed state
                        				var stateMachineDefinitionObj = JSON.parse(stateMachineDescData.definition);
                        				stateMachineDefinitionObj = setupNewStateMachineDefinitionWithGoToState(
                        						                        stateMachineDefinitionObj, failedStateName); 
                        				var stateMachineDefinitionStr = JSON.stringify(stateMachineDefinitionObj);
                        			    
                        			    // Update the retry state machine, which is originally deployed with an empty definition but may
                        				// have been changed in past executions of this lambda. This isn't a great design -- multiple invocations
                        				// of this lambda might compete to modify this state machine's definition. This will work for demo purposes.
                        			    var params = {
                        			        stateMachineArn: retryStateMachineArn,
                                            definition: stateMachineDefinitionStr, 
                                            roleArn: stateMachineDescData.roleArn
                                        };
                        			    console.log(params);
                        			    stepfunctions.updateStateMachine(params, function(err, newStateMachineData) {
                        			        if (err) console.log(err, err.stack); 
                        			        else {
                        			        	// TODO: Walk backward through historyData and find the event where
                        			        	// type=TaskStateEntered and step=failedStateName
                        			        	// You should be able to get the original inputs to that step. Then modify it
                        			        	// and kick off the new state machine.
                        			        	var originalInputObj = getOriginalInput(historyData, failedStateName);
                        			        	if (originalInputObj == null) {
                        			        		console.log("Couldn't find original input for failed state");
                        			        	} else {
                        			        		startNewStateMachineExecution(originalInputObj, retryStateMachineArn);
                        			        	}
                        			        	
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

function startNewStateMachineExecution(originalInputObj, stateMachineArn) {
	// Adjust the original input to include a new variable to force the new
	// state machine to jump to the right state
	originalInputObj["resuming"] = true;
	
	// Some of the manufactured failures for this state machine are because the input username
	// contain the word 'fail' (to prove this works.) Replace it with 'pass' and retry.
	// (The structure of the original input contains a clause called "input".)
	var inputObj = JSON.parse(originalInputObj["input"]);
	inputObj["username"] = inputObj["username"].replace("fail", "pass");
	originalInputObj["input"] = JSON.stringify(inputObj);
	
	var newInput = JSON.stringify(originalInputObj);
	
	// Create an execution of the new state machine
	var params = {
        input: newInput, 
        stateMachineArn: stateMachineArn
    };
	stepfunctions.startExecution(params, function(err, newExecutionData) {
	    if (err) {
	    	console.log(err, err.stack); 
	    }
	    else {
	    	console.log("Successfully executed new state machine", newExecutionData);
	    }
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


function findFailedState(historyData) {
 
 	// Doublecheck that the execution actually failed
 	if (historyData.events.length < 1 || historyData.events[0].type !== 'ExecutionFailed') {
 		console.log('Execution did not end with an ExecutionFailed event', executionArn);
 	} else {
 		// Walk back to the state BEFORE the one of type 'FailStateEntered' 
 		// (the one that actually caused the failure before transitioning to failure)
 		for (var i = 0; i < historyData.events.length; i++) {
 		    if (historyData.events[i].type === 'FailStateEntered') {
 		    	// get the next event in the list (they appear in reverse order) and return its state name
 		    	return historyData.events[i+1].stateExitedEventDetails.name;
 			}
 		}
 			
 	}
 	return null;
}

/* Get the original input to a given failed state name within a particular execution history */
function getOriginalInput(historyData, failedStateName) {
	// Walk backward through historyData and find the event where
	// type=TaskStateEntered and step=failedStateName
	if (historyData != null && historyData.events.length > 0) {
		for (var i = 0; i < historyData.events.length; i++) {
			if (historyData.events[i].stateEnteredEventDetails != null &&
			    historyData.events[i].stateEnteredEventDetails.name	=== failedStateName && 
			    historyData.events[i].type === 'TaskStateEntered') {
 		    	return JSON.parse(historyData.events[i].stateEnteredEventDetails.input);
 			}
		}
	}
		
	return null;
}