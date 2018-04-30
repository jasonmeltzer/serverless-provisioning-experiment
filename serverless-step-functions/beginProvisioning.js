'use strict';

var AWS = require('aws-sdk'),
    documentClient = new AWS.DynamoDB.DocumentClient(); 

const awsXRay = require('aws-xray-sdk');
const awsSdk = awsXRay.captureAWS(require('aws-sdk'));

module.exports.begin = (event, context, callback) => {
	
	 var eventText = JSON.stringify(event, null, 2);
	 console.log("Received event:", eventText);
	
	 
	 var input = JSON.parse(eventText);
	 
	 var dynamoParams = {
	     TableName : process.env.DYNAMODB_TABLE_MBOX,
	     Key:{
	         "id": input.id
         },
	     UpdateExpression: "set mailboxStatus = :s",
	     ExpressionAttributeValues:{
	         ":s": "provisioning-started"
	     },
	     ReturnValues:"UPDATED_NEW"
	 };

	 documentClient.update(dynamoParams, function(err, data){
	     if (err) console.log(err);
		// else console.log(data);
	 });

	
	 // input for the next step in the state machine
	 var nextInputArr = {};
	 nextInputArr['id'] = event.id;
	 if (event.domain) {
		 nextInputArr['domain'] = event.domain;
	 }
	 if (event.username) {
		 nextInputArr['username'] = event.username;
	 }
	 
	 const response = {
         statusCode: 200,
         input: JSON.stringify(nextInputArr),
	 };
	 
     callback(null, response);
};

