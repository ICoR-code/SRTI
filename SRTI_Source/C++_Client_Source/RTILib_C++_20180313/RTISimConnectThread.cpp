/*
	RTISimConnectThread.cpp

	- allows separate dedicated thread for listening to new messages.
*/


#include "stdafx.h"
#include "RTISimConnectThread.h"
#include "RTILib.h"
#include "Version.h"
#include <iostream>
#include <thread>
#include <time.h>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "Ws2_32.lib")
#else
#include <sys/socket.h>
#endif

using namespace std;

//#ifndef CPPADDED
//#define CPPADDED
//#endif

RTILib rtiSim;
SOCKET dedicatedSocket;
std::thread threadObj;
bool isConnected = false;

RTISimConnectThread::RTISimConnectThread()
{
}

RTISimConnectThread::RTISimConnectThread(RTILib newRtiSim, SOCKET newDedicatedSocket) {
	dedicatedSocket = newDedicatedSocket;
	rtiSim = newRtiSim;
	isConnected = true;
}

void run() {
	cout << "currently running thread to listen/read RTI data." << endl;

	string finalMessage = "";
	char recvbuf[2] = { '\0' };
	int iResult = 0;

	time_t start = time(0);
	double passedTime = 0;

	do {
		iResult = recv(dedicatedSocket, recvbuf, 1, 0);
		//issue: 'recv' will return 0 or -1 often, even when still capable of receiving messages, unreliable to check if still connected
		finalMessage = finalMessage + string(recvbuf);
		if (recvbuf[0] == '\n' || recvbuf[0] == '\r' || recvbuf[0] == '\0') {
			if (finalMessage.length() > 2) {
				//cout << "reading message... " << finalMessage << endl;
				rtiSim.receivedMessage(finalMessage);
				finalMessage = "";
			}
		}

	} while (isConnected == true);
	cout << "thread active ended, finalMessage  = " << finalMessage << endl;
}

void RTISimConnectThread::start() {

	std::thread threadObj((run));

	cout << "started thread fine." << endl;

	threadObj.detach();

	cout << " thread was detatched, running on its own now." << endl;
}

void RTISimConnectThread::closeConnection() {
	isConnected = false;
	closesocket(dedicatedSocket);
	WSACleanup();
}

void RTISimConnectThread::printLine(string line) {
	string formatLine = "[" + tag + "] \t" + " --- " + line;
	Version::printSimConsole(formatLine);
	Version::printSimFile(formatLine);
}


RTISimConnectThread::~RTISimConnectThread()
{

}
