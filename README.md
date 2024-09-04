# RingCentral LunchBot

This repository contains a fully functional RingCentral team messaging bot. It is used to post lunch suggestions based on messages sent to a channel. This was part of the base messaging bot RingCentral provides and below is the links to their framework.

For complete step-by-step instructions on how to build a bot for RingCentral using the code in this repository, please consult the [RingCentral Developer Guide](http://developers.ringcentral.com/guide/team-messaging/bots/walkthrough/).

## Features

This sample implementation is a basic framework for building a bot. That framework includes the following:

* A rudimentary system to respond to keywords transmitted to the bot, and ignore messages posted by the bot
* WebHooks subscription code to maintain active subscriptions for team messaging events
* A cache for auth credentials for private bots

## Prerequisites

* [ngrok](https://ngrok.com/download) - a tool that lets you create a secure tunnel to your localhost
* [RingCentral developer account](https://developer.ringcentral.com)


