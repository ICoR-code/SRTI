#include "stdafx.h"
#include "RTISimConnectThread.h"
#include "RTILib.h"
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

/*
class DisplayThread {
public:
	SOCKET ConnectSocket;
	bool threadActive = true;
	int total = 0;
	string finalMessage = "";
	void operator()() {

	}

	void run() {
		cout << "starting thread to listen/read RTI data." << endl;

		ConnectSocket = dedicatedSocket;
		char recvbuf[2] = { '\0' };
		int iResult = 0;

		do {
			iResult = recv(ConnectSocket, recvbuf, 1, 0);
			finalMessage = finalMessage + string(recvbuf);
			cout << "(I received something) = " << finalMessage << endl;
		} while (iResult > 0);
		cout << "thread active ended, finalMessage  = " << finalMessage << endl;
	}

};*/

SOCKET dedicatedSocket;
std::thread threadObj;

RTISimConnectThread::RTISimConnectThread()
{
}

RTISimConnectThread::RTISimConnectThread(RTILib rtiSim, SOCKET newDedicatedSocket) {
	dedicatedSocket = newDedicatedSocket;
}

void run() {
	cout << "currently running thread to listen/read RTI data." << endl;

	//ConnectSocket = dedicatedSocket;
	string finalMessage = "";
	char recvbuf[2] = { '\0' };
	int iResult = 0;

	time_t start = time(0);
	double passedTime = 0;

	
	do {
		iResult = recv(dedicatedSocket, recvbuf, 1, 0);
		finalMessage = finalMessage + string(recvbuf);
		passedTime = difftime(time(0), start);
		if (passedTime > 5) {
			iResult = -5;
		}
		//cout << "(I received something) = " << finalMessage << " , latest error message =  " << iResult << endl;
	} while (iResult > -2);
	cout << "thread active ended, finalMessage  = " << finalMessage << endl;
	//closesocket(dedicatedSocket);
	//WSACleanup();
}

void RTISimConnectThread::start() {
	//std::bind(&run, this);
	//DisplayThread newThread = DisplayThread();
	std::thread threadObj((run));
	//threadObj = ((run));

	cout << "started thread fine." << endl;
	
	threadObj.detach();
	//threadObj.join();

	cout << " thread was joined, it must have finished." << endl;
	//threadObj.~thread();
}






RTISimConnectThread::~RTISimConnectThread()
{

	//threadObj.join();
}
