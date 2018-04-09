'use strict';

var aws = require('aws-sdk')

module.exports.process = (event, context, callback) => {
	
	var eventText = JSON.stringify(event, null, 2);
	console.log("Received event:", eventText);
	
	// The provisioning state machine, defined in the resources/Outputs section of serverless.yml
	var provisioningStateMachineArn = process.env.provisioningstatemachine_arn; 
	console.log("provisioning state machine arn:", provisioningStateMachineArn);
	
	// The deletion state machine, defined in another project 'provisioning-steps-java' and imported in serverless.yml
	var deletionStateMachineArn = process.env.deletionstatemachine_arn; 
	console.log("deletion state machine arn:", deletionStateMachineArn);
	
	var eventName = event.Records[0].eventName;
	if (eventName.toUpperCase() === "INSERT") {
		console.log("A new row appeared");
		handleInsertOrUpdate(event, provisioningStateMachineArn);
	} else if (eventName.toUpperCase() === "MODIFY") {
		console.log("Someone changed something")
		handleInsertOrUpdate(event, provisioningStateMachineArn);
	} else if (eventName.toUpperCase() === "REMOVE") {
		console.log("Someone deleted some stuff")
		handleDelete(event, deletionStateMachineArn);
	} else {
		console.log("I have no idea what happened.")
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
	
	// Make sure this isn't responding to a status update that was caused by kicking off the state machine
	// Only statuses of 'initial' and 'update-requested' are expected values to be dealt with.
	// undefined should not happen, but is left here for testing.
	if (typeof event.Records[0].dynamodb.NewImage.mailboxStatus === "undefined") {
		var newMailboxStatus = 'undefined';
	} else {
		var newMailboxStatus = event.Records[0].dynamodb.NewImage.mailboxStatus.S;
	}
	let allowedStatuses = new Set();
	allowedStatuses.add('initial');
	allowedStatuses.add('update-requested');
	allowedStatuses.add('undefined');
	
	console.log("New mailbox status:", newMailboxStatus);
	if (!allowedStatuses.has(newMailboxStatus)) {
		console.log("New mailbox status not undefined and not in allowed set to proceed. Exiting.");
		return;
	}
		
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
	
	if (event.Records[0].dynamodb.OldImage.domain) {
		inputArr['domain'] = event.Records[0].dynamodb.OldImage.domain.S;
	}
	if (event.Records[0].dynamodb.OldImage.username) {
		inputArr['username'] = event.Records[0].dynamodb.OldImage.username.S;
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