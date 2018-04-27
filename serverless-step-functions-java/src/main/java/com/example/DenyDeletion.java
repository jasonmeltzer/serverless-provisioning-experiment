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

import java.net.URLDecoder;


public class DenyDeletion implements RequestHandler<Map<String, Object>, ApiGatewayResponse> {

	private static final Logger LOG = Logger.getLogger(DenyDeletion.class);

	@Override
	public ApiGatewayResponse handleRequest(Map<String, Object> input, Context context) {
		LOG.info("received: " + input);
		
		if (input != null && input.get("pathParameters") != null) {
			Map pathParameters = (Map)input.get("pathParameters");
			if (pathParameters.get("taskToken") != null) {
				try {
					AWSStepFunctionsClientBuilder builder = AWSStepFunctionsClientBuilder.standard();
					builder.setClientConfiguration(new ClientConfiguration().withSocketTimeout(1000));
					AWSStepFunctions stepFunctionsClient = builder.build();
				
					String taskToken = URLDecoder.decode((String)pathParameters.get("taskToken"), "UTF-8");
				
					LOG.info("Sending task failure for token " + taskToken);
					SendTaskFailureRequest taskFailureRequest = 
							new SendTaskFailureRequest().withTaskToken(taskToken).withError("DeleteRejected");
					stepFunctionsClient.sendTaskFailure(taskFailureRequest);
				} catch (Exception e) {
					LOG.error("Could not send task success for token", e);
				}
			}
			
		}

		Response responseBody = new Response("Denial received!");

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
