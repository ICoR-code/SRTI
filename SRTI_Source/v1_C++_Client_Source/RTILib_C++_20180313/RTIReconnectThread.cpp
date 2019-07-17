#include "stdafx.h"
#include "RTIReconnectThread.h"
#include <thread>
#include <iostream>

using namespace std;

RTILib* rtiSimReconnect;
long timeLimit;

RTIReconnectThread::RTIReconnectThread() {

}

RTIReconnectThread::RTIReconnectThread(RTILib* newRtiLib, long newTimeLimit)
{
	rtiSimReconnect = newRtiLib;
	timeLimit = newTimeLimit;
}

void runReconnectThread() {
	while (true) {
		std::this_thread::sleep_for(std::chrono::milliseconds(timeLimit));

		if (rtiSimReconnect->getServerMessagesReceived() == false) {
			rtiSimReconnect->reconnect();
		}

		rtiSimReconnect->setServerMessagesReceived(false);
	}
}

void RTIReconnectThread::start() {
	std::thread threadObj((runReconnectThread));

	cout << "started tcp thread fine." << endl;

	threadObj.detach();

	cout << " tcp thread was detached, running on its own now." << endl;
}



RTIReconnectThread::~RTIReconnectThread()
{
}
