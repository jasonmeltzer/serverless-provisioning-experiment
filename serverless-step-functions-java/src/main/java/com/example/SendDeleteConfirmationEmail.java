package com.example;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.apache.log4j.Logger;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

import com.amazonaws.services.stepfunctions.*;
import com.amazonaws.services.stepfunctions.model.*;

import com.amazonaws.services.simpleemail.*;
import com.amazonaws.services.simpleemail.model.*;
import com.amazonaws.regions.Regions;

import com.amazonaws.ClientConfiguration;

import com.serverless.ApiGatewayResponse;
import com.serverless.Response;

import org.json.*;

import java.net.URLEncoder;


public class SendDeleteConfirmationEmail implements RequestHandler<Map<String, Object>, ApiGatewayResponse> {

	private static final Logger LOG = Logger.getLogger(SendDeleteConfirmationEmail.class);
	
	static final String FROM = System.getenv("sesFromAddress");
	static final String SUBJECT = "Mailbox Deletion Confirmation";
	static final String MAILBOXPLACEHOLDER = "MAILBOXPLACEHOLDER";
	static final String APPROVALPLACEHOLDER = "APPROVALPLACEHOLDER";
	static final String REJECTIONPLACEHOLDER = "REJECTIONPLACEHOLDER";
	
	static final String HTMLBODY = "<h1>Mailbox Deletion Confirmation</h1>"
	      + "<p>Deletion of the mailbox " + MAILBOXPLACEHOLDER + " has been requested. "
	      + "To confirm deletion, <a href='APPROVALPLACEHOLDER'>" 
	      + "click here</a>. To reject this request, <a href='REJECTIONPLACEHOLDER'>"
	      + "click here</a>.";
	static final String TEXTBODY = "Deletion of the mailbox " + MAILBOXPLACEHOLDER + " has been requested. "
	      + "To confirm deletion, go to: APPROVALPLACEHOLDER . To reject, go to: REJECTIONPLACEHOLDER .";


	@Override
	public ApiGatewayResponse handleRequest(Map<String, Object> input, Context context) {
		LOG.info("received: " + input);

		Response responseBody = null;
		
		AWSStepFunctionsClientBuilder builder = AWSStepFunctionsClientBuilder.standard();
		builder.setClientConfiguration(new ClientConfiguration().withSocketTimeout(new Integer(System.getenv("socketTimeoutMillis"))));
		AWSStepFunctions stepFunctionsClient = builder.build();
		
		GetActivityTaskRequest taskRequest = new GetActivityTaskRequest();
		taskRequest.setActivityArn(System.getenv("delete_confirmation_activity_arn")); 
		
		try 
		{
			GetActivityTaskResult taskResult = stepFunctionsClient.getActivityTask(taskRequest);
			
			if (taskResult != null && taskResult.getInput() != null && taskResult.getTaskToken() != null) {
				LOG.info("Received task result: " + taskResult.toString());
				
				JSONObject jsonObj = new JSONObject(taskResult.getInput());
			
				sendDeleteConfirmationEmail(
					taskResult.getTaskToken(), 
					jsonObj.getString("id"), 
					jsonObj.getString("domain"), 
					jsonObj.getString("username"),
					jsonObj.getString("deleteConfirmEmailContact"));
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
	
	private void sendDeleteConfirmationEmail(String taskToken, String mailboxId, String domain, String username, String deleteConfirmEmailContact) {
		if (taskToken == null || mailboxId == null || domain == null || username == null) {
			LOG.error("Didn't receive the necessary information to send a confirmation email. Exiting...");
			return;
		}
			
		try {
			String htmlBody = HTMLBODY.
								replace(MAILBOXPLACEHOLDER, username + "@" + domain).
								replace(APPROVALPLACEHOLDER, System.getenv("API_GATEWAY_URL") + "approve/" + URLEncoder.encode(taskToken, "UTF-8")).
								replace(REJECTIONPLACEHOLDER, System.getenv("API_GATEWAY_URL") + "deny/" + URLEncoder.encode(taskToken, "UTF-8"));
			String textBody = TEXTBODY.
					replace(MAILBOXPLACEHOLDER, username + "@" + domain).
					replace(APPROVALPLACEHOLDER, "http://someurl?" + taskToken).
					replace(REJECTIONPLACEHOLDER, "http://someotherurl?" + taskToken);			
			
		    AmazonSimpleEmailService client = 
		          AmazonSimpleEmailServiceClientBuilder.standard()
		            .withRegion(System.getenv("region")).build(); // Use the same region this lambda is running in
		    SendEmailRequest request = new SendEmailRequest()
		          .withDestination(
		              new Destination().withToAddresses(deleteConfirmEmailContact))  // Send the email to the 'deleteConfirmEmailContact' from the DB
		          .withMessage(new Message()
		              .withBody(new Body()
		                  .withHtml(new Content()
		                      .withCharset("UTF-8").withData(htmlBody))
		                  .withText(new Content()
		                      .withCharset("UTF-8").withData(textBody)))
		              .withSubject(new Content()
		                  .withCharset("UTF-8").withData(SUBJECT)))
		          .withSource(FROM);
		    client.sendEmail(request);
		    System.out.println("Email sent!");
		} catch (Exception ex) {
		      System.out.println("The email was not sent. Error message: " 
		          + ex.getMessage());
		}
	}

}
