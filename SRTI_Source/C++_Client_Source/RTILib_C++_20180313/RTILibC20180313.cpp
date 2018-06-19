// RTILibC20180313.cpp : Defines the entry point for the console application.
/*
	This is an example class that shows how one can use the original C++ source files
	to reference RTILib to connect to an SRTI system.

	WARNING: For testing, this one class has two possible instances of RTILib, to simulate 2 clients from the same class.
	This causes errors (possibly because of static functions?) where the 2 clients read the same message concurrently,
	and each will "steal" characters from the other, causing incomplete messages to appear to be received and errors occurring.
	If using this class, only use 1 RTILib instance at a time.
*/

#include "stdafx.h"
#include "RTILib.h"
#include <iostream>
#include <time.h>

using namespace std;


int main()
{
	cout << "This is to test RTILib (in C++)." << endl;

	//RTILib testLib = RTILib();
	//testLib.setSimName("RTIC++Test_20180313");
	//testLib.connect("35.3.75.185", "4200");

	RTILib testLib2 = RTILib();
	testLib2.setDebugOutput(true);
	testLib2.setSimName("RTIC++TestAgain_20180313");
	testLib2.connect("localhost", "55137");
	testLib2.subscribeTo("StoreStatus");
	int totalTime = 0;

	int iResult = 0;
	long passedTime = 0;
	long timeToSendMessage = time(0);
	long start = time(0);
	do {
		passedTime = difftime(time(0), start);
		if (passedTime > 20) {
			iResult = -5;
		}

		//if (difftime(time(0), timeToSendMessage) > 1) {
		//	timeToSendMessage = time(0);
		//	string sendMessage = "";
		//	sendMessage = testLib.setJsonObject("", "Number", "" + passedTime);
		//	cout << "Sending message... " << sendMessage << endl;
		//	testLib.publish("ExampleMessage", sendMessage);
		//}

		string receivedMessage = testLib2.getNextMessage("StoreStatus");
		if (receivedMessage.length() > 2) {
			cout << "MESSAGE = " << receivedMessage << endl;
			string receivedContent = testLib2.getMessageContent(receivedMessage);
			cout << "MESSAGE CONTENT = " << receivedContent << endl;
			string receivedNumber = testLib2.getJsonObject("NumOfFood", receivedContent);
			cout << "I RECEIVED " << receivedNumber << endl;
		}
	} while (iResult > -2);


	//testLib.disconnect();
	testLib2.disconnect();

	cout << "End RTILib (in C++)." << endl;
    return 0;
}
