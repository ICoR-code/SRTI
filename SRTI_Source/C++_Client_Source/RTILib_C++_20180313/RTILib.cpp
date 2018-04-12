#include "stdafx.h"
#include "RTISim.h"
#include "RTISimConnectThread.h"
#include <iostream>
#include <string>
#include <cstring>
#include <vector>
#include <deque>
#include <algorithm>
#include <thread>

/*
C++ does not have a single cross-platform standard library for using socket communication:
- programmers would use <winsock2.h> for Windows, and <sys/socket.h> for Linux/Mac, OR
- use BOOST or another 3rd party library for multiple platforms (it itself would handle platform-specific syntax).

Socket is necessary to connect to the RTI, it's logic in C++ may need to be rewritten by user to ensure compatibility with chosen platform.
*/
#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "Ws2_32.lib")
#else
#include <sys/socket.h>
#endif

/* 
	C++ does not have standard JSON parsing library, trying to use "RapidJSON" open-source library
	- http://rapidjson.org/index.html
*/
#include "rapidjson/document.h"
#include "rapidjson/writer.h"
#include "rapidjson/stringbuffer.h"

using namespace std;

#ifndef CPPADDED
#define CPPADDED
#endif


WSADATA wsaData;

RTISim *thisSim;
SOCKET rtiSocket;
SOCKET dedicatedRtiSocket;
RTISimConnectThread readThread;
RTISimConnectThread writeThread;

string simName = "<<default sim name>>";
struct Message {
	
	string name = "";
	string timestamp = "";
	string source = "";
	string content = "";
	string originalMessage = "";
	bool compareTo(Message i, Message j) {
		return (i.timestamp.compare(j.timestamp));
	}
};
//vector<Message> messageQueue;
deque<Message> messageQueue;

RTILib::RTILib(RTISim * rtiSim) {
	thisSim = rtiSim;
	WSAStartup(MAKEWORD(2, 2), &wsaData);
	simName = thisSim->getSimName();
}

RTILib::RTILib()
{
	thisSim = 0;
	WSAStartup(MAKEWORD(2, 2), &wsaData);
	printLine("RTILib() constructor called.");
	
	//sort(v.begin(), v.end(), v[0].compareTo);
}


void RTILib::setSimName(string newName) {
	simName = newName;
}

int RTILib::connect() {
	printLine("asked to connect without a hostName or portNumber... can't really do anything, then.");
	return 0;
}

int RTILib::connect(string hostName, string portNumber) {
	printLine("trying to connect now...");

	//Using Winsock for sockets: https://msdn.microsoft.com/en-us/library/ms738545(VS.85).aspx
	struct addrinfo *result = NULL, *ptr = NULL, hints;
	ZeroMemory(&hints, sizeof(hints));
	hints.ai_family = AF_UNSPEC;
	hints.ai_socktype = SOCK_STREAM;
	hints.ai_protocol = IPPROTO_TCP;
	int iResult = getaddrinfo(hostName.c_str(), portNumber.c_str(), &hints, &result);
	if (iResult != 0) {
		printLine("Socket connection failed, errno = " + iResult);
		return -1;
	}

	rtiSocket = INVALID_SOCKET;
	ptr = result;
	rtiSocket = socket(ptr->ai_family, ptr->ai_socktype, ptr->ai_protocol);
	if (rtiSocket == INVALID_SOCKET) {
		printLine("Error at socket(): " + WSAGetLastError());
		freeaddrinfo(result);
		WSACleanup();
		return -1;
	}
	
	iResult = ::connect(rtiSocket, ptr->ai_addr, (int)ptr->ai_addrlen);
	if (iResult == SOCKET_ERROR) {
		closesocket(rtiSocket);
		rtiSocket = INVALID_SOCKET;
	}
	freeaddrinfo(result);
	if (rtiSocket == INVALID_SOCKET) {
		printLine("Unable to connect to server.");
		WSACleanup();
		return -1;
	}

	string firstMessage = "";
	string dedicatedHost = "";
	string dedicatedPort = "";

	char recvbuf[2] = { '\0' };

	do {
		iResult = recv(rtiSocket, recvbuf, 1, 0);
		if (iResult > 0) {
			//printLine("Received message: " + string(recvbuf));
			if (recvbuf[0] == '\n' || recvbuf[0] == '\r' || recvbuf[0] == '\0') {
				if (recvbuf[0] == '\n') {
					//printLine("\\n was sent...");
				}
				if (recvbuf[0] == '\r') {
					//printLine("\\r was sent...");
				}
				if (recvbuf[0] == '\0') {
					//printLine("\\0 was sent...");
				}
				if (dedicatedHost == "") {
					dedicatedHost = firstMessage;
					firstMessage = "";
				}
				else {
					dedicatedPort = firstMessage;
					firstMessage = "";
					if (dedicatedPort.length() > 1) {
						iResult = 0;
					}
				}
			}
			else {
				firstMessage = firstMessage + string(recvbuf);
			}

			for (int i = 0; i < 2; i++) {
				recvbuf[i] = '\0';
			}
		}
		else if (iResult == 0) {
			printLine("Socket connection was closed.");
		}
		else {
			printLine("recv failed.");
		}
	} while (iResult > 0);



	printLine("RTI reached. Now connecting to dedicated communication socket: " + dedicatedHost + " " + dedicatedPort);

	struct addrinfo *dedicatedResult = NULL, *dedicatedPtr = NULL, dedicatedHints;
	ZeroMemory(&dedicatedHints, sizeof(dedicatedHints));
	hints.ai_family = AF_UNSPEC;
	hints.ai_socktype = SOCK_STREAM;
	hints.ai_protocol = IPPROTO_TCP;
	iResult = getaddrinfo(dedicatedHost.c_str(), dedicatedPort.c_str(), &dedicatedHints, &dedicatedResult);
	if (iResult != 0) {
		printLine("Socket connection failed, errno = " + iResult);
		return -1;
	}
	dedicatedRtiSocket = INVALID_SOCKET;
	dedicatedPtr = dedicatedResult;
	dedicatedRtiSocket = socket(dedicatedPtr->ai_family, dedicatedPtr->ai_socktype, dedicatedPtr->ai_protocol);
	if (dedicatedRtiSocket == INVALID_SOCKET) {
		printLine("Error at socket(): " + WSAGetLastError());
		freeaddrinfo(dedicatedResult);
		WSACleanup();
		return -1;
	}
	iResult = ::connect(dedicatedRtiSocket, dedicatedPtr->ai_addr, (int)dedicatedPtr->ai_addrlen);
	if (iResult == SOCKET_ERROR) {
		closesocket(dedicatedRtiSocket);
		dedicatedRtiSocket = INVALID_SOCKET;
	}
	freeaddrinfo(dedicatedResult);
	if (dedicatedRtiSocket == INVALID_SOCKET) {
		printLine("Unable to connect to server.");
		WSACleanup();
		return -1;
	}

	readThread = RTISimConnectThread(*this, dedicatedRtiSocket);
	readThread.start();


	string jsonContent;
	rapidjson::StringBuffer bufferOut;
	bufferOut.Clear();
	rapidjson::Writer<rapidjson::StringBuffer> writerOut(bufferOut);
	rapidjson::Document document;
	rapidjson::Value jsonContent1(rapidjson::kObjectType);
	rapidjson::Value jsonSimName(simName.c_str(), document.GetAllocator());
	jsonContent1.AddMember("simName", jsonSimName, document.GetAllocator());
	jsonContent1.Accept(writerOut);

	publish("RTI_InitializeSim", bufferOut.GetString());

	return 0;
}

int RTILib::disconnect() {
	readThread.closeConnection();
	return 0;
}

int RTILib::subscribeTo(string messageName) {
	rapidjson::StringBuffer bufferOut;
	bufferOut.Clear();
	rapidjson::Writer<rapidjson::StringBuffer> writerOut(bufferOut);
	rapidjson::Document document;

	rapidjson::Value jsonContent(rapidjson::kObjectType);
	rapidjson::Value jsonMessageName(messageName.c_str(), document.GetAllocator());
	jsonContent.AddMember("subscribeTo", jsonMessageName, document.GetAllocator());
	jsonContent.Accept(writerOut);

	publish("RTI_SubscribeTo", bufferOut.GetString());
	return 0;
}

int RTILib::subscribeToAll() {
	publish("RTI_SubscribeToAll", "");
	return 0;
}

int RTILib::subscribeToAllPlusHistory() {
	publish("RTI_SubscribeToAllPlusHistory", "");
	return 0;
}

int RTILib::publishTo(string messageName) {
	// not used yet... currently, all sims have unrestricted access to publish any message without qualifications
	return 0;
}

int RTILib::publish(string name, string content) {
	int iSendResult = 0;
	string message = "";
	
	rapidjson::StringBuffer bufferOut;
	bufferOut.Clear();
	rapidjson::Writer<rapidjson::StringBuffer> writerOut(bufferOut);
	rapidjson::Document document;

	rapidjson::Value jsonTotal(rapidjson::kObjectType);
	rapidjson::Value jsonNameString(name.c_str(), document.GetAllocator());
	jsonTotal.AddMember("name", jsonNameString, document.GetAllocator());
	
	rapidjson::Value jsonContentString(content.c_str(), document.GetAllocator());
	jsonTotal.AddMember("content", jsonContentString, document.GetAllocator());

	long long timestamp = std::chrono::time_point_cast<std::chrono::milliseconds>(std::chrono::system_clock::now()).time_since_epoch().count();
	rapidjson::Value jsonTimestampString(to_string(timestamp).c_str(), document.GetAllocator());
	jsonTotal.AddMember("timestamp",jsonTimestampString, document.GetAllocator());

	rapidjson::Value jsonSimName(simName.c_str(), document.GetAllocator());
	jsonTotal.AddMember("source", jsonSimName, document.GetAllocator());

	jsonTotal.Accept(writerOut);
	message = bufferOut.GetString();
	


	printLine("Trying to publish message now: " + message);

	int messageSize = message.length() + 1;
	char recvbuf[1] = { '\0' };
	for (int i = 0; i < message.length(); i++) {
		recvbuf[0] = message[i];
		iSendResult = send(dedicatedRtiSocket, recvbuf, 1, 0);
		if (iSendResult <= 0) {
			printLine("Error when trying to send message at " + to_string(i));
			printLine("Error was = " + to_string(iSendResult));
			return -1;
		}
	}
	recvbuf[0] = '\n';
	iSendResult = send(dedicatedRtiSocket, recvbuf, 1, 0);
	if (iSendResult <= 0) {
		printLine("Error when trying to send message at very end.");
		printLine("Error was = " + to_string(iSendResult));
		//closesocket(dedicatedRtiSocket);
		//WSACleanup();
		return -1;
	}

	printLine("Successfully published message.");

	return 0;
}

int RTILib::receivedMessaage(string message) {
	string name = "";
	string content = "";
	string timestamp = "";
	string source = "";

	rapidjson::StringStream s(message.c_str());
	rapidjson::Document document;
	document.ParseStream(s);

	name = document["name"].GetString();
	content = document["content"].GetString();
	timestamp = document["timestamp"].GetString();
	source = document["fromSim"].GetString();

	if (thisSim != 0) {
		thisSim->receivedMessage(name, content, timestamp, source);
	}
	else {
		Message newMessage;
		newMessage.name = name;
		newMessage.content = content;
		newMessage.timestamp = timestamp;
		newMessage.source = source;
		newMessage.originalMessage = message;
		messageQueue.push_back(newMessage);
		printLine("Received new message, messageQueue now has this many: " + messageQueue.size());
	}

	return 0;
}

string RTILib::getNextMessage() {
	string returnString = "";
	printLine("getNextMessage() called...");

	if (messageQueue.empty() == true) {
		returnString = "";
		printLine("getNextMessage is null.");
	}
	else {
		returnString = messageQueue.front().originalMessage;
		messageQueue.pop_front();
	}

	return returnString;
}

string RTILib::getNextMessage(int millisToWait) {
	string returnString = "";
	printLine("getNextMessage() called...");
	for (int i = 0; i < millisToWait; i += 10) {
		if (messageQueue.empty() == false) {
			break;
		}
		std::this_thread::sleep_for(std::chrono::milliseconds(10));
	}

	if (messageQueue.empty() == true) {
		returnString = "";
		printLine("getNextMessage is null.");
	}
	else {
		returnString = messageQueue.front().originalMessage;
		messageQueue.pop_front();
	}

	return returnString;
}

string RTILib::getNextMessage(string messageName) {
	string returnString = "";

	printLine("getNextMessage() called...");

	if (messageQueue.empty() == true) {
		returnString = "";
		printLine("getNextMessage is null.");
	}
	else {
		for (int i = 0; i < messageQueue.size(); i++){
			if (messageQueue.at(i).name.compare(messageName) == 0) {
				returnString = messageQueue.at(i).originalMessage;
				messageQueue.erase(messageQueue.begin() + i);
				break;
			}
		}
		printLine("getNextMessage was NOT null.");
	}


	return returnString;
}

string RTILib::getNextMessage(string messageName, int millisToWait) {
	string returnString = "";

	printLine("getNextMessage() called...");

	for (int i = 0; i < millisToWait; i += 10) {
		if (messageQueue.empty() == false) {
			for (int j = 0; j < messageQueue.size(); j++) {
				if (messageQueue.at(j).name.compare(messageName) == 0) {
					returnString = messageQueue.at(j).originalMessage;
					messageQueue.erase(messageQueue.begin() + j);
					break;
				}
			}
		}
		std::this_thread::sleep_for(std::chrono::milliseconds(10));
	}

	return returnString;
}

string RTILib::waitForNextMessage() {
	string returnString = "";

	printLine("Will immeidately return message if there is one in the message buffer, else will wait until the queue gets a value.");

	while (messageQueue.empty() == true) {

	}
	returnString = messageQueue.front().originalMessage;
	messageQueue.pop_front();

	return returnString;
}

string RTILib::getJsonObject(string name, string content) {
	string returnString = "";

	printLine("asked to read jsonValue from content (" + content + ")");

	rapidjson::StringStream s(content.c_str());
	rapidjson::Document document;
	document.ParseStream(s);

	if (document.HasMember(name.c_str()) == true) {
		//we are making assumption that all values are strictly sent as "string" type, whether or not it is most efficient.
		returnString = document[name.c_str()].GetString();
	}

	return returnString;
}

string RTILib::getJsonString(string name, string content) {
	string returnString = "";

	rapidjson::StringStream s(content.c_str());
	rapidjson::Document document;
	document.ParseStream(s);

	if (document.HasMember(name.c_str()) == true) {
		//we are making assumption that all values are strictly sent as "string" type, whether or not it is most efficient.
		returnString = document[name.c_str()].GetString();
	}

	return returnString;
}

/*
	Unlike Java version, C++ is unable to return an array type,
	instead it must return a pointer address to the first value.
*/
string* RTILib::getJsonArray(string content) {
	//static string returnString[10];

	rapidjson::StringStream s(content.c_str());
	rapidjson::Document document;
	document.ParseStream(s);

	string* returnString = new string[document.Size()];

	for (int i = 0; i < document.Size(); i++) {
		returnString[i] = document[i].GetString();
	}

	return returnString;
}

string RTILib::getStringNoQuotes(string content) {
	string returnString = "";

	int numOfQuotes = 0;
	for (int i = 0; i < content.length(); i++){
		if (content.at(i) == '\"') {
			numOfQuotes++;
		}
	}
	if (numOfQuotes >= 2) {
		returnString = content.substr(1, content.length() - 2);
	}
	else {
		returnString = content;
	}

	return returnString;
}

string RTILib::getMessageName(string originalMessage) {
	string returnString = "";

	rapidjson::StringStream s(originalMessage.c_str());
	rapidjson::Document document;
	document.ParseStream(s);
	if (document.HasMember("name") == true) {
		returnString = document["name"].GetString();
	}

	return returnString;
}

string RTILib::getMessageTimestamp(string originalMessage) {
	string returnString = "";

	rapidjson::StringStream s(originalMessage.c_str());
	rapidjson::Document document;
	document.ParseStream(s);
	if (document.HasMember("timestamp") == true) {
		returnString = document["timestamp"].GetString();
	}

	return returnString;
}

string RTILib::getMessageSource(string originalMessage) {
	string returnString = "";

	rapidjson::StringStream s(originalMessage.c_str());
	rapidjson::Document document;
	document.ParseStream(s);
	if (document.HasMember("source") == true) {
		returnString = document["source"].GetString();
	}

	return returnString;
}

string RTILib::getMessageContent(string originalMessage) {
	string returnString = "";

	rapidjson::StringStream s(originalMessage.c_str());
	rapidjson::Document document;
	document.ParseStream(s);
	if (document.HasMember("content") == true) {
		returnString = document["content"].GetString();
	}

	return returnString;
}

string RTILib::setJsonObject(string originalJson, string nameNewObject, string contentNewObject) {
	string returnString = "";

	rapidjson::StringStream s(originalJson.c_str());
	rapidjson::Document document;
	document.ParseStream(s);

	rapidjson::StringBuffer bufferOut;
	bufferOut.Clear();
	rapidjson::Writer<rapidjson::StringBuffer> writerOut(bufferOut);

	rapidjson::Value jsonAdd(rapidjson::kObjectType);
	rapidjson::Value jsonContentString(contentNewObject.c_str(), document.GetAllocator());
	rapidjson::Value jsonNameString(nameNewObject.c_str(), document.GetAllocator());
	document.AddMember(jsonNameString, jsonContentString, document.GetAllocator());

	document.Accept(writerOut);
	returnString = bufferOut.GetString();

	return returnString;
}

/* note: 'to_string(var)' is available as of C++11, older systems may be unable to compile this script.*/

string RTILib::setJsonObject(string originalJson, string nameNewObject, int contentNewObject) {
	return setJsonObject(originalJson, nameNewObject, to_string(contentNewObject));
}

string RTILib::setJsonObject(string originalJson, string nameNewObject, float contentNewObject) {
	return setJsonObject(originalJson, nameNewObject, to_string(contentNewObject));
}

string RTILib::setJsonObject(string originalJson, string nameNewObject, long contentNewObject) {
	return setJsonObject(originalJson, nameNewObject, to_string(contentNewObject));
}

string RTILib::setJsonObject(string originalJson, string nameNewObject, double contentNewObject) {
	return setJsonObject(originalJson, nameNewObject, to_string(contentNewObject));
}

string RTILib::setJsonObject(string originalJson, string nameNewObject, char contentNewObject) {
	return setJsonObject(originalJson, nameNewObject, to_string(contentNewObject));
}

string RTILib::setJsonObject(string originalJson, string nameNewObject, bool contentNewObject) {
	return setJsonObject(originalJson, nameNewObject, to_string(contentNewObject));
}



string version = "v0.43";
void RTILib::printVersion() {
	printLine("SRTI Version - " + version);
}

bool debugOut = false;
void RTILib::setDebugOutput(bool setDebugOut) {
	debugOut = setDebugOut;

	if (&readThread != nullptr) {
		readThread.setDebugOutput(debugOut);
	} 
	if (&writeThread != nullptr) {
		writeThread.setDebugOutput(debugOut);
	}
	
}

string tag = "RTILib";
void RTILib::printLine(string line) {
	if (debugOut == false)
		return;

	auto time = std::chrono::system_clock::now();
	auto since_epoch = time.time_since_epoch();
	auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(since_epoch);
	long long now = millis.count();

	cout << now << " [" << tag << "] --- " << line << endl;
}

RTILib::~RTILib()
{

}








