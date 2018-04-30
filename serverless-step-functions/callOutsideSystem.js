'use strict';

var AWS = require('aws-sdk'),
    documentClient = new AWS.DynamoDB.DocumentClient();

const awsXRay = require('aws-xray-sdk');
const awsSdk = awsXRay.captureAWS(require('aws-sdk'));

module.exports.call = (event, context, callback) => {
	
	 var eventText = JSON.stringify(event, null, 2);
	 console.log("Received event:", eventText);
	
	 var input = JSON.parse(eventText);
	 var inputData = JSON.parse(input.input);
	 
	 // The intention of this function is to simulate calling out to an outside system.
	 // Another goal is to use it to demonstrate how to handle retries, and to output a value used to make a 'choice'
	 // in a state machine.
	 // In order to force retries, we'll make the function fail sometimes.
	 if (inputData.username && inputData.username.indexOf("fail1") > -1) { // Simulate failure if username contains 'fail1'
		 var error = new Error('Failed when calling external system');
		 error.name = 'external-failure';
		 callback(error);
	 } else if (inputData.username && inputData.username.indexOf("fail2") > -1) { // Simulate a misc failure if username contains 'fail2'
	     callback("some other error");
	 }
	 
	 
	 var dynamoParams = {
         TableName : process.env.DYNAMODB_TABLE_MBOX,
		 Key:{
		     "id": inputData.id
	     },
		 UpdateExpression: "set mailboxStatus = :s",
		 ExpressionAttributeValues:{
		     ":s": "calling-outside-system"
		 },
		 ReturnValues:"UPDATED_NEW"
	 };

	 documentClient.update(dynamoParams, function(err, data){
	     if (err) console.log(err);
	 });
	 
	 // input for the next step in the state machine
	 var nextInputArr = {};
	 nextInputArr['id'] = inputData.id;
	 if (inputData.domain) {
		 nextInputArr['domain'] = inputData.domain;
	 }
	 if (inputData.username) {
		 nextInputArr['username'] = inputData.username;
	 }
	 
	 // Give back a random number so that the state machine can do something with it to demonstrate a "choice"
	 callback(null, {"value": Math.random(), "input": JSON.stringify(nextInputArr)} )
};
