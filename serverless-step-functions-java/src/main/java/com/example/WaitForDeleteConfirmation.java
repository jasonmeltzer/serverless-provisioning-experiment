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
		
		ListActivitiesResult listResult = stepFunctionsClient.listActivities(new ListActivitiesRequest());
		LOG.info("Received list result: " + listResult.toString());
		
		GetActivityTaskRequest taskRequest = new GetActivityTaskRequest();
		taskRequest.setActivityArn("arn:aws:states:us-east-1:083440467681:activity:provisioning-steps-java-dev-waitForDeleteConfirmationActivity"); 
        //TODO genericize ARN
		
		try 
		{
			GetActivityTaskResult result = stepFunctionsClient.getActivityTask(taskRequest);
			LOG.info("Received task result: " + result.toString());
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
