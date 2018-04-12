#pragma once
#include "RTISim.h"
#include <string>
//#include <vector>
//#include <deque>



using namespace std;

class RTILib
{
private:

public:

	RTILib();
	RTILib(RTISim * rtiSim);
	void setSimName(string newName);
	int connect();
	int connect(string hostName, string portNumber);
	int disconnect();
	int subscribeTo(string messageName);
	int subscribeToAll();
	int subscribeToAllPlusHistory();
	int publishTo(string messageName);
	int publish(string name, string content);
	int receivedMessaage(string message);
	string getNextMessage();
	string getNextMessage(int millisToWait);
	string getNextMessage(string messageName);
	string getNextMessage(string messageName, int millisToWait);
	string waitForNextMessage();
	string getJsonObject(string name, string content);
	string getJsonString(string name, string content);
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
	void printLine(string line);
	~RTILib();
};

