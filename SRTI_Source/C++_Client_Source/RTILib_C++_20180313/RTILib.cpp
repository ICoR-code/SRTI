#include "stdafx.h"
#include "RTISim.h"
#include "RTISimConnectThread.h"
#include "RTITcpThread.h"
#include "RTIReconnectThread.h"
#include "Version.h"
#include <iostream>
#include <string>
#include <cstring>
#include <vector>
#include <deque>
#include <algorithm>
#include <thread>

/*
	RTILib.cpp
	- main access point for API functions for simulation to take part in SRTI system.
*/


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


// name of sim (used as identifier on RTI Server side)
string simName = "<<default sim name>>";

// reference to simulation (if applicable)
RTISim *thisSim;
// socket connection to main RTI Server thread, and to dedicated socket to listen/receive direct messages
SOCKET rtiSocket;
SOCKET dedicatedRtiSocket;
// thread for dedicated RTI Server communication
RTISimConnectThread readThread;
// thread to check tcp messages were sent successfully (unlike Java, needs its own "thread" class to call function at regular interval)
RTITcpThread tcpThread;
// thread to check at intervals that connection to RTI Server is (probably) still open (unlike Java, needs its own "thread" class to call function at regular interval)
RTIReconnectThread reconnectThread;

// message queue to store messages until sim retrieves them (used for simulations not implementing "RTISim.java")
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
deque<Message> messageQueue;

// settings properties, as of v054 does not use an external file, but requires calling function to st property from simulation code
int settingsExists = -1;		// -1 => file doesn't exist, 0 = file doesn't exist but defaults are overwritten by RTIServer, 1 = file exists and defaults are overwritten
bool tcpOn = false;
string lastHostName = "";
string lastPortNumber = "";
vector<string> subscribeHistory;
bool serverMessagesReceived = false;

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
}

void RTILib::setTcpOn(bool tcp) {
	settingsExists = 1;
	tcpOn = tcp;

	if (tcpOn == true) {
		tcpThread = RTITcpThread(*this);
		tcpThread.start();
	}
}

void RTILib::setSimName(string newName) {
	simName = newName;
}

void RTILib::setReconnectTimeLimit(long timeLimit) {
	if (timeLimit <= 0)
		return;

	reconnectThread = RTIReconnectThread(*this, timeLimit);
	reconnectThread.start();
}

void RTILib::setServerMessagesReceived(bool set) {
	serverMessagesReceived = set;
}

bool RTILib::getServerMessagesReceived() {
	return serverMessagesReceived;
}

int RTILib::connect() {
	printLine("asked to connect without a hostName or portNumber... can't really do anything, then.");
	return 0;
}

int RTILib::connect(string hostName, string portNumber) {
	printLine("trying to connect now...");

	lastHostName = hostName;
	lastPortNumber = portNumber;

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

	serverMessagesReceived = true;

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

int RTILib::reconnect() {
	printLine("trying to reconnect now...");

	//Using Winsock for sockets: https://msdn.microsoft.com/en-us/library/ms738545(VS.85).aspx
	struct addrinfo *result = NULL, *ptr = NULL, hints;
	ZeroMemory(&hints, sizeof(hints));
	hints.ai_family = AF_UNSPEC;
	hints.ai_socktype = SOCK_STREAM;
	hints.ai_protocol = IPPROTO_TCP;
	int iResult = getaddrinfo(lastHostName.c_str(), lastPortNumber.c_str(), &hints, &result);
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

	vector<string>::iterator it = subscribeHistory.begin();
	while (it != subscribeHistory.end()) {

		rapidjson::StringBuffer bufferOut;
		bufferOut.Clear();
		rapidjson::Writer<rapidjson::StringBuffer> writerOut(bufferOut);
		rapidjson::Document document;

		rapidjson::Value jsonContent(rapidjson::kObjectType);
		rapidjson::Value jsonMessageName((*it).c_str(), document.GetAllocator());
		jsonContent.AddMember("subscribeTo", jsonMessageName, document.GetAllocator());
		jsonContent.Accept(writerOut);

		publish("RTI_SubscribeToMessagePlusLatest", bufferOut.GetString());
	}

	return 0;
}

int RTILib::reconnect(string lastMessageName, string lastMessageContent) {
	reconnect();
	publish(lastMessageName, lastMessageContent);
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

	subscribeHistory.push_back(messageName);
	return 0;
}

int RTILib::subscribeToMessagePlusHistory(string messageName) {
	rapidjson::StringBuffer bufferOut;
	bufferOut.Clear();
	rapidjson::Writer<rapidjson::StringBuffer> writerOut(bufferOut);
	rapidjson::Document document;

	rapidjson::Value jsonContent(rapidjson::kObjectType);
	rapidjson::Value jsonMessageName(messageName.c_str(), document.GetAllocator());
	jsonContent.AddMember("subscribeTo", jsonMessageName, document.GetAllocator());
	jsonContent.Accept(writerOut);

	publish("RTI_SubscribeToMessagePlusHistory", bufferOut.GetString());

	subscribeHistory.push_back(messageName);
	return 0;
}

int RTILib::subscribeToMessagePlusLatest(string messageName) {

	rapidjson::StringBuffer bufferOut;
	bufferOut.Clear();
	rapidjson::Writer<rapidjson::StringBuffer> writerOut(bufferOut);
	rapidjson::Document document;

	rapidjson::Value jsonContent(rapidjson::kObjectType);
	rapidjson::Value jsonMessageName(messageName.c_str(), document.GetAllocator());
	jsonContent.AddMember("subscribeTo", jsonMessageName, document.GetAllocator());
	jsonContent.Accept(writerOut);

	publish("RTI_SubscribeToMessagePlusLatest", bufferOut.GetString());

	subscribeHistory.push_back(messageName);

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

	string tcpOnString = "";
	if (tcpOn == true) {
		tcpOnString = "true";
	}
	else {
		tcpOnString = "false";
	}
	rapidjson::Value jsonTcpOn(tcpOnString.c_str(), document.GetAllocator());
	jsonTotal.AddMember("tcp", jsonTcpOn, document.GetAllocator());

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
		return -1;
	}

	printLine("Successfully published message.");

	if (name.compare("RTI_ReceivedMessage") != 0){
		handleTcpResponse(name, content, to_string(timestamp).c_str(), simName, message);
	}

	return 0;
}

int RTILib::sendWithoutAddingToTcp(string name, string content, string timestamp, string source) {

	printLine("\t\t\t PUBLISH THIS: " + name);

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

	rapidjson::Value jsonTimestampString(timestamp.c_str(), document.GetAllocator());
	jsonTotal.AddMember("timestamp", jsonTimestampString, document.GetAllocator());

	rapidjson::Value jsonSimName(source.c_str(), document.GetAllocator());
	jsonTotal.AddMember("source", jsonSimName, document.GetAllocator());

	string tcpOnString = "";
	if (tcpOn == true) {
		tcpOnString = "true";
	}
	else {
		tcpOnString = "false";
	}
	rapidjson::Value jsonTcpOn(tcpOnString.c_str(), document.GetAllocator());
	jsonTotal.AddMember("tcp", jsonTcpOn, document.GetAllocator());

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
		return -1;
	}

	printLine("Successfully published message.");

	return 0;
}

int RTILib::receivedMessage(string message) {
	string name = "";
	string content = "";
	string timestamp = "";
	string source = "";
	string tcp = "";

	serverMessagesReceived = true;

	rapidjson::StringStream s(message.c_str());
	rapidjson::Document document;
	document.ParseStream(s);

	name = document["name"].GetString();
	content = document["content"].GetString();
	timestamp = document["timestamp"].GetString();
	if (document.HasMember("source")) {
		source = document["source"].GetString();
	}
	if (document.HasMember("tcp")) {
		tcp = document["tcp"].GetString();
	}

	if (name.compare("RTI_ReceivedMessage") == 0) {
		setTcpResponse(true, content);
		return 0;
	}

	if (settingsExists == -1) {
		if (tcp.compare("true") == 0) {
			tcpOn = true;
			settingsExists = 0;
			publish("RTI_ReceivedMessage", message);

			tcpThread = RTITcpThread(*this);
			tcpThread.start();
		}
	}
	else {
		if (tcp.compare("true") == 0) {
			publish("RTI_ReceivedMessage", message);
		}
	}

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

struct MessageReceived {
	int sendAttempts = 0;
	bool messageReceived = false;
	string name = "";
	string content = "";
	string timestamp = "";
	string source = "";
	string message = "";
	long originalTimeSent = 0;
};
vector<MessageReceived> tcpMessageBuffer;
bool tcpMessageBufferAvailable = true;
int RTILib::setTcpResponse(bool setResponse, string message) {

	while (tcpMessageBufferAvailable == false) {
		std::this_thread::sleep_for(std::chrono::milliseconds(100));
	}

	tcpMessageBufferAvailable = false;
	vector<MessageReceived>::iterator it = tcpMessageBuffer.begin();
	while (it != tcpMessageBuffer.end()) {

		if ((*it).message.compare(message) == 0) {
			it = tcpMessageBuffer.erase(it);
		}
		else {
			it++;
		}
	}
	tcpMessageBufferAvailable = true;

	return 0;
}

int RTILib::handleTcpResponse(string name, string content, string timestamp, string source, string message) {
	if (tcpOn == false) {
		return 0;
	}

	MessageReceived newMessage;
	newMessage.sendAttempts = 1;
	newMessage.messageReceived = false;
	newMessage.name = name;
	newMessage.content = content;
	newMessage.timestamp = timestamp;
	newMessage.source = source;
	newMessage.message = message;
	newMessage.originalTimeSent = std::chrono::time_point_cast<std::chrono::milliseconds>(std::chrono::system_clock::now()).time_since_epoch().count();

	while (tcpMessageBufferAvailable == false) {
		std::this_thread::sleep_for(std::chrono::milliseconds(100));
	}

	tcpMessageBufferAvailable = false;
	tcpMessageBuffer.push_back(newMessage);
	tcpMessageBufferAvailable = true;

	return 0;
}

int RTILib::checkTcpMessages() {

	if (tcpMessageBuffer.empty() == true) {
		return 0;
	}

	while (tcpMessageBufferAvailable == false) {
		std::this_thread::sleep_for(std::chrono::milliseconds(100));
	}

	tcpMessageBufferAvailable = false;

	vector<MessageReceived>::iterator it = tcpMessageBuffer.begin();
	while (it != tcpMessageBuffer.end()) {

		if ((*it).sendAttempts >= 3) {
			reconnect((*it).name, (*it).content);
			it = tcpMessageBuffer.erase(it);
		}
		else {
			it++;
		}
	}

	vector<MessageReceived>::reverse_iterator ir;
	for (ir = tcpMessageBuffer.rbegin(); ir != tcpMessageBuffer.rend(); ir++){
		long currentTime = std::chrono::time_point_cast<std::chrono::milliseconds>(std::chrono::system_clock::now()).time_since_epoch().count();
		if ((currentTime - (*ir).originalTimeSent) > 3000) {
			(*ir).sendAttempts++;
			sendWithoutAddingToTcp((*ir).name, (*ir).content, (*ir).timestamp, (*ir).source);
		}
	}

	tcpMessageBufferAvailable = true;

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

string RTILib::getJsonStringFast(string name, string content) {
	string returnString = "";

	if (content == "") {
		return returnString;
	}

	size_t positionName = content.find(name);
	if (positionName == string::npos) {
		return returnString;
	}
	else {
		size_t positionObject = positionName + 2;	// ":
		string substring = content.substr(positionObject, string::npos);
		size_t endIndex = 0;
		if (substring.at(0) == '[') {
			endIndex = substring.find("],");
			if (endIndex == string::npos) {
				endIndex = substring.find("]}");
			}
		}
		else if (substring.at(0) == '\"') {
			endIndex = substring.find("\"}");
			if (endIndex == string::npos) {
				endIndex = substring.find("\"}");
			}
		}
		if (endIndex == string::npos) {
			return returnString;
		}
		else {
			returnString = substring.substr(0, endIndex + 1);
			returnString = getStringNoQuotes(returnString);
			printLine("asked to read jsonValue for " + name + " " + returnString);
		}
	}

	return returnString;
}

/*
	Unlike Java version, C++ is unable to return an array type,
	instead it must return a pointer address to the first value.
*/
string* RTILib::getJsonArray(string content) {
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

// string setJsonArray(string originalJson, string nameNewObject, stringp[ contentNewArray)
// not implemented yet...

void RTILib::printVersion() {
	printLine("SRTI Version - " + Version::GetVersion());
}

void RTILib::setDebugOutput(bool setDebugOut) {
	Version::setDebugSimConsole(setDebugOut);
}

void RTILib::setDebugFileOutput(bool setFileDebugOut) {
	Version::setDebugSimFile(setFileDebugOut);
}


string tag = "RTILib";
void RTILib::printLine(string line) {
	string formatLine = "[" + tag + "] \t" + " --- " + line;
	Version::printSimConsole(formatLine);
	Version::printSimFile(formatLine);
}

RTILib::~RTILib()
{

}








