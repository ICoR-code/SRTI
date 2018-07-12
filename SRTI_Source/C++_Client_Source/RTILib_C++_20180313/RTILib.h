#pragma once
#include "RTISim.h"
#include <string>
#include "rapidjson/document.h"
//#include <vector>
//#include <deque>



using namespace std;

class RTILib
{
private:

public:

	RTILib();
	RTILib(RTISim * rtiSim);
	void setTcpOn(bool tcp);
	void setSimName(string newName);
	void setReconnectTimeLimit(long timeLimit);
	bool getServerMessagesReceived();
	void setServerMessagesReceived(bool reset);
	int connect();
	int connect(string hostName, string portNumber);
	int reconnect();
	int reconnect(string lastMessageName, string lastMessageContent);
	int disconnect();
	int subscribeTo(string messageName);
	int subscribeToMessagePlusHistory(string messageName);
	int subscribeToMessagePlusLatest(string messageName);
	int subscribeToAll();
	int subscribeToAllPlusHistory();
	int publishTo(string messageName);
	int publish(string name, string content);
	int publish(string name, rapidjson::Value & content);
	int sendWithoutAddingToTcp(string name, string content, string timestamp, string source);
	int receivedMessage(string message);
	int setTcpResponse(bool setResponse, string message);
	int handleTcpResponse(string name, string content, string timestamp, string source, string message);
	int checkTcpMessages();
	string getNextMessage();
	string getNextMessage(int millisToWait);
	string getNextMessage(string messageName);
	string getNextMessage(string messageName, int millisToWait);
	string waitForNextMessage();
	string getJsonObject(string name, string content);
	string getJsonString(string name, string content);
	string getJsonStringFast(string name, string content);
	string* getJsonArray(string content);
	string getStringNoQuotes(string content);
	string getMessageName(string originalMessage);
	string getMessageTimestamp(string originalMessage);
	string getMessageSource(string originalMessage);
	string getMessageContent(string originalMessage);
	string setJsonObject(string originalJson, string nameNewObject, int contentNewObject);
	string setJsonObject(string originalJson, string nameNewObject, float contentNewObject);
	string setJsonObject(string originalJson, string nameNewObject, long contentNewObject);
	string setJsonObject(string originalJson, string nameNewObject, double contentNewObject);
	string setJsonObject(string originalJson, string nameNewObject, char contentNewObject);
	string setJsonObject(string originalJson, string nameNewObject, bool contentNewObject);
	string setJsonObject(string originalJson, string nameNewObject, string contentNewObject);
	void printVersion();
	void setDebugOutput(bool setDebugOut);
	void setDebugFileOutput(bool setDebugOut);
	void printLine(string line);
	~RTILib();
};
