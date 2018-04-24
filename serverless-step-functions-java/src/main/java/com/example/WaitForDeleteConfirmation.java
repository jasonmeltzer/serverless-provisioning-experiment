package com.example;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.apache.log4j.Logger;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

import com.amazonaws.services.stepfunctions.*;
import com.amazonaws.services.stepfunctions.model.*;

import com.amazonaws.ClientConfiguration;

import com.serverless.ApiGatewayResponse;
import com.serverless.Response;



public class WaitForDeleteConfirmation implements RequestHandler<Map<String, Object>, ApiGatewayResponse> {

	private static final Logger LOG = Logger.getLogger(WaitForDeleteConfirmation.class);


	@Override
	public ApiGatewayResponse handleRequest(Map<String, Object> input, Context context) {
		LOG.info("received: " + input);

		Response responseBody = null;
		
		AWSStepFunctionsClientBuilder builder = AWSStepFunctionsClientBuilder.standard();
		builder.setClientConfiguration(new ClientConfiguration().withSocketTimeout(1000));
		AWSStepFunctions stepFunctionsClient = builder.build();
		
		GetActivityTaskRequest taskRequest = new GetActivityTaskRequest();
		taskRequest.setActivityArn(System.getenv("delete_confirmation_activity_arn")); 

		try 
		{
			GetActivityTaskResult result = stepFunctionsClient.getActivityTask(taskRequest);
			LOG.info("Received task result: " + result.toString());
			
			// Randomly decide whether to send back a success or failure, for now. These will later become part of
			// REST endpoints that send a success or failure based on a link click in an email.
			if ((new java.util.Random()).nextBoolean()) 
			{
				LOG.info("Sending task success");
				SendTaskSuccessRequest taskSuccessRequest = new SendTaskSuccessRequest().withTaskToken(result.getTaskToken()).withOutput("{}");
				stepFunctionsClient.sendTaskSuccess(taskSuccessRequest);
			} 
			else 
			{
				LOG.info("Sending task failure");
				SendTaskFailureRequest taskFailureRequest = new SendTaskFailureRequest().withTaskToken(result.getTaskToken()).withError("TaskFAIL");
				stepFunctionsClient.sendTaskFailure(taskFailureRequest);
			}
			
		}
		catch (com.amazonaws.SdkClientException e) // read timeout is expected if there aren't any events pending
		{
			LOG.info("No tasks available");
		}
		
		
		Map<String, String> headers = new HashMap<>();
		headers.put("X-Powered-By", "AWS Lambda & Serverless");
		headers.put("Content-Type", "application/json");
		return ApiGatewayResponse.builder()
				.setStatusCode(200)
				.setObjectBody(responseBody)
				.setHeaders(headers)
				.build();
	}

}
