'use strict';

var AWS = require('aws-sdk'),
    documentClient = new AWS.DynamoDB.DocumentClient();

module.exports.avoidNoid = (event, context, callback) => {
	
	 var eventText = JSON.stringify(event, null, 2);
	 console.log("Received event:", eventText);
	
	 var input = JSON.parse(eventText);
	 var inputData = JSON.parse(input.input);
	 
	 var dynamoParams = {
         TableName : process.env.DYNAMODB_TABLE_MBOX,
		 Key:{
		     "id": inputData.id
	     },
		 UpdateExpression: "set mailboxStatus = :s",
		 ExpressionAttributeValues:{
		     ":s": "avoiding-the-noid"
		 },
		 ReturnValues:"UPDATED_NEW"
	 };

	 documentClient.update(dynamoParams, function(err, data){
	     if (err) console.log(err);
	     // else console.log(data);
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
	 
	 
	 callback(null, {"value": Math.random(), "input": JSON.stringify(nextInputArr)} )
};
