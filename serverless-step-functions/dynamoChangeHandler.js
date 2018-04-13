'use strict';

var aws = require('aws-sdk')

module.exports.process = (event, context, callback) => {
	
	var eventText = JSON.stringify(event, null, 2);
	console.log("Received event:", eventText);
	
	// The provisioning state machine, defined in the resources/Outputs section of serverless.yml
	var provisioningStateMachineArn = process.env.provisioningstatemachine_arn; 
	//console.log("provisioning state machine arn:", provisioningStateMachineArn);
	
	// The deletion state machine, defined in another project 'provisioning-steps-java' and imported in serverless.yml
	var deletionStateMachineArn = process.env.deletionstatemachine_arn; 
	//console.log("deletion state machine arn:", deletionStateMachineArn);
	
	var eventName = event.Records[0].eventName;
	if (eventName.toUpperCase() === "INSERT" || eventName.toUpperCase() === "MODIFY") {
		console.log("An item was inserted or modified");
		
		if (typeof event.Records[0].dynamodb.NewImage.mailboxStatus === "undefined") {
			var newMailboxStatus = 'undefined';
		} else {
			var newMailboxStatus = event.Records[0].dynamodb.NewImage.mailboxStatus.S;
		}
		
		// Handle deletes
		if (newMailboxStatus === "delete-requested") {
			handleDelete(event, deletionStateMachineArn);
			return;
		}
		
		// Make sure this isn't responding to a status update that was caused by kicking off the state machine
		// Only statuses of 'initial' and 'update-requested' are expected values to be dealt with.
		// undefined should not happen, but is left here for testing.
		let allowedStatuses = new Set();
		allowedStatuses.add('initial');
		allowedStatuses.add('update-requested');
		allowedStatuses.add('undefined');
		
		console.log("New mailbox status:", newMailboxStatus);
		if (!allowedStatuses.has(newMailboxStatus)) {
			console.log("New mailbox status not undefined and not in allowed set to proceed. Exiting.");
			return;
		}
		
		handleInsertOrUpdate(event, provisioningStateMachineArn);
	} else if (eventName.toUpperCase() === "REMOVE") {
		// Removals should not happen directly. The deleteMailbox lambda function actually marks the mailbox as 'delete-requested'.
		console.log("A row was deleted. Ignoring...");
	} else {
		console.log("I have no idea what happened.");
		return;
	}
	
	
	const response = {
	  statusCode: 200,
	  body: JSON.stringify({
	    message: 'DynamoChangeHandler: event handled',
	    input: event,
      }),
    };
	callback(null, response);
};



function handleInsertOrUpdate(event, stateMachineArn) {
		
    var inputArr = {};
	inputArr['id'] = event.Records[0].dynamodb.Keys.id.S;
	if (event.Records[0].dynamodb.NewImage.domain) {
		inputArr['domain'] = event.Records[0].dynamodb.NewImage.domain.S;
	}
	if (event.Records[0].dynamodb.NewImage.username) {
		inputArr['username'] = event.Records[0].dynamodb.NewImage.username.S;
	}
	if (event.Records[0].dynamodb.NewImage.mailboxStatus) {
		inputArr['mailboxStatus'] = event.Records[0].dynamodb.NewImage.mailboxStatus.S;
	}
	
    
	// call the provisioning step flow 
	var params = {
	  stateMachineArn: stateMachineArn,
	  input: JSON.stringify(inputArr)
	}
	
	var stepfunctions = new aws.StepFunctions()
	stepfunctions.startExecution(params, function (err, data) {
	    if (err) {
	      console.log('err while executing provisioning step functions')
	    } else {
	      console.log('started execution of provisioning step functions')
	    }
	})
}


function handleDelete(event, stateMachineArn) {
	
	var inputArr = {};
	inputArr['id'] = event.Records[0].dynamodb.Keys.id.S;
	
	if (event.Records[0].dynamodb.NewImage.domain) {
		inputArr['domain'] = event.Records[0].dynamodb.NewImage.domain.S;
	}
	if (event.Records[0].dynamodb.NewImage.username) {
		inputArr['username'] = event.Records[0].dynamodb.NewImage.username.S;
	}
	if (event.Records[0].dynamodb.NewImage.deleteConfirmRequired) {
		inputArr['deleteConfirmRequired'] = event.Records[0].dynamodb.NewImage.deleteConfirmRequired.S;
	}
	
	var params = {
        stateMachineArn: stateMachineArn,
		input: JSON.stringify(inputArr)
	}
			
	var stepfunctions = new aws.StepFunctions()
	stepfunctions.startExecution(params, function (err, data) {
	    if (err) {
		    console.log('err while executing deletion step functions')
		} else {
		    console.log('started execution of deletion step functions')
		}
	})
	
}