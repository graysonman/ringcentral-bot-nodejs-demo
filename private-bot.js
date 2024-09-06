/*
This is a sample bot application for RingCentral. Learn more about this
app by following the instructions found at the URL below:
https://developers.ringcentral.com/guide/team-messaging/bots/walkthrough/

Copyright: 2021 - RingCentral, Inc.
License: MIT
*/
require('dotenv').config();

var RingCentral = require('@ringcentral/sdk').SDK;

var express = require('express');
var bp      = require('body-parser')
var fs      = require('fs');

// read in config parameters from environment, or .env file
const PORT            = process.env.PORT;
const RINGCENTRAL_CLIENT_ID       = process.env.RINGCENTRAL_CLIENT_ID_PRIVATE;
const RINGCENTRAL_CLIENT_SECRET   = process.env.RINGCENTRAL_CLIENT_SECRET_PRIVATE;
const RINGCENTRAL_SERVER_URL = process.env.RINGCENTRAL_SERVER_URL;
const RINGCENTRAL_OAUTH_REDIRECT_URI = process.env.RINGCENTRAL_OAUTH_REDIRECT_URI
const WEBHOOKS_DELIVERY_ADDRESS = process.env.WEBHOOKS_DELIVERY_ADDRESS

const TOKEN_TEMP_FILE = '.private-bot-auth';
const SUBSCRIPTION_ID_TEMP_FILE = '.private-bot-subscription';

var app = express();

app.use( bp.json() );
app.use( bp.urlencoded({
  extended: true
}));

// Start our server
app.listen(PORT, function () {
  console.log("Bot server listening on port " + PORT);
  loadSavedTokens()
});

// This route handles GET requests to our root ngrok address and responds
// with the same "Ngrok is working message"
app.get('/', function(req, res) {
  res.send('Ngrok is working! Path Hit: ' + req.url);
});

// Instantiate the RingCentral JavaScript SDK
var rcsdk = new RingCentral({
  server: RINGCENTRAL_SERVER_URL,
  clientId: RINGCENTRAL_CLIENT_ID,
  clientSecret: RINGCENTRAL_CLIENT_SECRET,
  redirectUri: RINGCENTRAL_OAUTH_REDIRECT_URI
});

var platform = rcsdk.platform();

// Bot starts/restarts => check if there is a saved token
async function loadSavedTokens(){
  if (fs.existsSync( TOKEN_TEMP_FILE )) {
    console.log( "Load saved access token")
    var savedTokens = JSON.parse( fs.readFileSync( TOKEN_TEMP_FILE ) );
    console.log( "Reuse saved access token")
    await platform.auth().setData( savedTokens );
    if (fs.existsSync( SUBSCRIPTION_ID_TEMP_FILE )){
      var subscriptionId = fs.readFileSync(SUBSCRIPTION_ID_TEMP_FILE)
      checkWebhooksSubscription(subscriptionId)
    }else
      subscribeToEvents()
  }else{
    console.log("Your bot has not been installed or the saved access token was lost!")
    console.log("Login to developers.ringcentral.com, open the bot app and install it by selecting \
    the Bot menu and at the 'General Settings' section, click the 'Add to RingCentral' button.")
    console.log("Note: If the bot was installed, remove it and reinstall to get a new access token")
  }
}


// Handle authentication for a private bot
app.post('/oauth', async function (req, res) {
  console.log("Private bot being installed");
  if (req.body.access_token) {
    res.status(200).send('')
    var tokenObj = platform.auth().data();
    tokenObj.access_token = req.body.access_token;
    tokenObj.token_type = "bearer"
    tokenObj.expires_in = 100000000000;
    tokenObj.refresh_token = 'xxx';
    tokenObj.refresh_token_expires_in = 10000000000;
    await platform.auth().setData(tokenObj);
    console.log( "Save tokens to a local file for reuse" )
    fs.writeFileSync( TOKEN_TEMP_FILE, JSON.stringify( tokenObj ) )

    console.log("Bot installation done")
    console.log("Subscribe to Webhooks notification")
    subscribeToEvents()
  }else{
    res.status(401).end()
  }
});

app.post('/webhook-callback', async function (req, res) {
  var validationToken = req.get('Validation-Token');
  if (validationToken) {
    console.log('Verifying webhook token.');
    res.setHeader('Validation-Token', validationToken);
  } else if (req.body.event == "/restapi/v1.0/subscription/~?threshold=60&interval=15") {
    console.log("Renewing subscription ID: " + req.body.subscriptionId);
    renewSubscription(req.body.subscriptionId);
  } else if (req.body.body.eventType == "PostAdded") {
    var body = req.body.body
    console.log(req.body)
    console.log("Received user's message: " + body.text);
    if (req.body.ownerId == body.creatorId) {
      console.log("Ignoring message posted by bot.");
      //catch other bots responses and closes when a poll is made
    } else if(body.creatorId === "1058339032"){
      send_message( body.groupId, "Man I hate that other bot. He always doesn't let me choose. :(" )
      setTimeout(() => process.exit(0), 5000);
      //anything that comes through as null ignore
    } else if(body.text === null){
      return;
    } else if (
      // Check for any keywords related to lunch or food
      ["lunch", "food", "meal", "eat", "dine", "dining"].some(word => body.text.toLowerCase().includes(word)) && 
    
      // Check if creatorId matches or if the text includes specific words
      (body.creatorId === "3284473020" || 
       ["any", "suggestion", "what", "discussion", "idea", "recommend", "option", "pick", "decide"].some(word => body.text.toLowerCase().includes(word)))
    ) {
      if (body.text.includes("docs.google")) {
        send_message( body.groupId, "Man I was really hoping for Ruth Chris today..." )
        return
      }
      const restaurants = [
        "Five Guys",
        "Starbird",
        "Cheese Steak Shop",
        "Luigis",
        "Chipotle",
        "Back 40",
        "Habit",
        "Round Table",
        "Wing Stop",
        "Panda Express",
        "Los Panchos",
        "Lunch at 1350",
        "Kinders",
        "Hawaiian",
        "Diggers",
        "Hot Boys"
      ];

      // Randomly select a restaurant from the array
      const randomIndex = Math.floor(Math.random() * restaurants.length);
      const lunchIdea = restaurants[randomIndex];

      send_message( body.groupId, lunchIdea )
    } else if(
      (body.text.includes("lunch") || body.text.includes("Lunch")) && 
      (body.text.includes("friday")||body.text.includes("Friday"))){
        send_message( body.groupId, "We should change it to have lunch every Friday!" )
    } 

  } else if (req.body.body.eventType == 'Delete'){
    console.log('Bot is being uninstalled by a user => clean up resources')
    // Bot is being uninstalled by a user => clean up resouce
    // clear local file/database
    fs.unlinkSync(TOKEN_TEMP_FILE)
    fs.unlinkSync(SUBSCRIPTION_ID_TEMP_FILE)
  } else if (req.body.body.eventType == 'GroupJoined'){
    console.log('Bot is being installed by a user')
  } else {
    console.log("Event type:", req.body.body.eventType)
    console.log(req.body.body)
  }
  res.status(200).end();
});

// Method to Subscribe for events notification.
async function subscribeToEvents(){
  console.log("Subscribing to posts and groups events")
  var requestData = {
    eventFilters: [
      "/restapi/v1.0/glip/posts", // Team Messaging (a.k.a Glip) events.
      "/restapi/v1.0/glip/groups", // Team Messaging (a.k.a Glip) events.
      "/restapi/v1.0/account/~/extension/~", // Subscribe for this event to detect when a bot is installed and uninstalled
      "/restapi/v1.0/subscription/~?threshold=60&interval=15" // For subscription renewal
    ],
    deliveryMode: {
      transportType: "WebHook",
      address: WEBHOOKS_DELIVERY_ADDRESS
    },
    expiresIn: 604799
  };
  try {
    var resp = await platform.post('/restapi/v1.0/subscription', requestData)
    var jsonObj = await resp.json()
    console.log('Team Messaging events notifications subscribed successfully.');
    fs.writeFileSync( SUBSCRIPTION_ID_TEMP_FILE, jsonObj.id )
    console.log('Your bot is ready for conversations ...');
  }catch (e) {
    console.error('Team Messaging events notifications subscription failed. ', e);
    throw e;
  }
}

async function renewSubscription(id){
  console.log("Auto subscription renewal");
  try{
    var resp = await platform.post(`/restapi/v1.0/subscription/${id}/renew`)
    var jsonObj = await resp.json()
    console.log("Subscription renewed. Next renewal:" + jsonObj.expirationTime);
  }catch(e) {
    console.log("Subscription renewal failed: ", e);
    throw e;
  }
}

// Check Webhook subscription status
async function checkWebhooksSubscription(subscriptionId) {
  try {
    var resp = await platform.get(`/restapi/v1.0/subscription/${subscriptionId}`)
    var jsonObj = await resp.json()
    if (jsonObj.status == 'Active') {
      console.log("Webhooks subscription is still active.")
      console.log('Your bot is ready for conversations ...');
    }else{
      fs.unlinkSync(SUBSCRIPTION_ID_TEMP_FILE)
      console.log("Webhooks subscription status", jsonObj.status)
      console.log("Create new Webhooks subscription")
      subscribeToEvents()
    }
  }catch(e) {
    console.error(e.message);
    throw e;
  }
}

// Post a message to a chat
async function send_message( groupId, message ) {
  console.log("Posting response to group: " + groupId);
  try {
    await platform.post(`/restapi/v1.0/glip/chats/${groupId}/posts`, {
      "text": message
    })
  }catch(e) {
    console.log(e)
  }
}