#include "stdafx.h"
#include "RTILib.h"
#include "RTISim.h"
#include "RTISimConnectThread.h"
#include <iostream>
#include <string>
#include <cstring>
#include <vector>
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
//void printLine(string line);




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
	string fromSim = "";
	string content = "";
	string originalMessage = "";
	bool compareTo(Message i, Message j) {
		return (i.timestamp.compare(j.timestamp));
	}
};
vector<Message> messageQueue;

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

	publish("RTI_InitializeSim", "");
	/*iResult = send(ConnectSocket, "Hello nurse!", (int)strlen("Hello nurse!"), 0);
	if (iResult == SOCKET_ERROR) {
		return -1;
	}*/



	return 0;
}

int RTILib::disconnect() {
	return 0;
}

int RTILib::subscribeTo(string messageName) {
	return 0;
}

int RTILib::subscribeToAll() {
	return 0;
}

int RTILib::subscribeToAllPlusHistory() {
	return 0;
}

int RTILib::publishTo(string messageName) {
	return 0;
}

int RTILib::publish(string name, string content) {
	int iSendResult = 0;
	string message = "";
	string messageStart = "{";
	string messageName = "\"name\":\"RTI_InitializeSim\",";
	string messageContent = "\"content\":\"{\\\"simName\\\":\\\"testCSim05\\\"}\",";
	string messageTimestamp = "\"timestamp\":\"12019112143\",";
	string messageFromSim = "\"fromSim\":\"testCSim05\"";
	string messageEnd = "}";
	message = messageStart + messageName + messageContent + messageTimestamp + messageFromSim + messageEnd;
	
	rapidjson::StringBuffer bufferOut;
	bufferOut.Clear();
	rapidjson::Writer<rapidjson::StringBuffer> writerOut(bufferOut);

	rapidjson::Document d;
	
	//!!!! BELOW works... only can output as string if it parsed from a string???
	//d.Parse<0>(" { \"x\" : \"0.01\", \"y\" :\"0.02\" , \"z\" : \"0.03\"} ");
	//d.Accept(writerOut);

	rapidjson::Value jsonContent;
	char *buffer = &content[0];
	jsonContent.SetString(buffer, content.length(), d.GetAllocator());

	jsonContent.AddMember("content", content, d.GetAllocator());
	//!!! BELOW crashes at "...Accept(writerOut);" , cannot test by viewing string output unless this part is resolved.
	//jsonContent.Accept(writerOut);

	//d.SetObject();
	
	//rapidjson::Value jsonContent;
	//char *buffer = &content[0];
	//jsonContent.SetString(buffer, content.length(), d.GetAllocator());

	/*jsonContent.Accept(bufferOut);
	printLine("The following is what was saved in Document d(part 1):");
	printLine(bufferOut.GetString());
	jsonContent.Accept(bufferOut);
	printLine("The following is what was saved in Value jsonContent(part 1)");
	printLine(bufferOut.GetString());

	d.AddMember("content", content, d.GetAllocator());
	jsonContent.AddMember("content", content, d.GetAllocator());

	d.Accept(bufferOut);
	printLine("The following is what was saved in Document d(part 2):");
	printLine(bufferOut.GetString());
	jsonContent.Accept(bufferOut);
	printLine("The following is what was saved in Value jsonContent(part 2)");
	printLine(bufferOut.GetString());*/
	
	
	

	printLine("Trying to publish message now: " + message);

	int messageSize = message.length() + 1;
	char recvbuf[1] = { '\0' };
	for (int i = 0; i < message.length(); i++) {
		recvbuf[0] = message[i];
		iSendResult = send(dedicatedRtiSocket, recvbuf, 1, 0);
		//cout << iSendResult << " " << recvbuf[0] << endl;
		if (iSendResult <= 0) {
			printLine("Error when trying to send message at " + to_string(i));
			printLine("Error was = " + to_string(iSendResult));
			//closesocket(dedicatedRtiSocket);
			//WSACleanup();
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
	return 0;
}

string RTILib::getNextMessage() {
	string returnString = "";
	return returnString;
}

string RTILib::getNextMessage(int millisToWait) {
	string returnString = "";
	return returnString;
}

string RTILib::getNextMessage(string messageName) {
	string returnString = "";
	return returnString;
}

string RTILib::getNextMessage(string messageName, int millisToWait) {
	string returnString = "";
	return returnString;
}

string RTILib::waitForNextMessage() {
	string returnString = "";
	return returnString;
}

string RTILib::getJsonObject(string name, string content) {
	string returnString = "";
	return returnString;
}

string RTILib::getJsonString(string name, string content) {
	string returnString = "";
	return returnString;
}

/*
	Unlike Java version, C++ is unable to return an array type,
	instead it must return a pointer address to the first value.
*/
string* RTILib::getJsonArray(string content) {
	static string returnString[10];
	return returnString;
}

string RTILib::getStringNoQuotes(string content) {
	string returnString = "";
	return returnString;
}

string RTILib::getMessageName(string originalMessage) {
	string returnString = "";
	return returnString;
}

string RTILib::getMessageTimestamp(string originalMessage) {
	string returnString = "";
	return returnString;
}

string RTILib::getMessageFromSim(string originalMessage) {
	string returnString = "";
	return returnString;
}

string RTILib::getMessageContent(string originalMessage) {
	string returnString = "";
	return returnString;
}

string RTILib::setJsonObject(string originalJson, string nameNewObject, string contentNewObject) {
	string returnString = "";
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

}

bool debugOut = false;
void RTILib::setDebugOutput(bool setDebugOut) {

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








