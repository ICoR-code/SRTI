#pragma once

#include "stdafx.h"
#include "RTISimConnectThread.h"
#include "RTILib.h"

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "Ws2_32.lib")
#else
#include <sys/socket.h>
#endif

class RTISimConnectThread
{

private:
	string tag = "RTISimConnectThread";

public:
	RTISimConnectThread();
	RTISimConnectThread(RTILib rtiSim, SOCKET dedicatedSocket);
	void start();
	void closeConnection();
	void setDebugOutput(bool setDebugOut);
	void printLine(string line);
	~RTISimConnectThread();
};

