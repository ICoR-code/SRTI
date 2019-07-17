#include "stdafx.h"
#include "RTITcpThread.h"
#include "RTILib.h"
#include <thread>
#include <iostream>

using namespace std;

RTILib* rtiSimTcp;

RTITcpThread::RTITcpThread()
{
}

RTITcpThread::RTITcpThread(RTILib* newRTILib) {
	rtiSimTcp = newRTILib;
}

void runTcpThread() {
	while (true) {
		std::this_thread::sleep_for(std::chrono::milliseconds(5000));

		rtiSimTcp->checkTcpMessages();
	}
}

void RTITcpThread::start() {
	std::thread threadObj((runTcpThread));

	cout << "started tcp thread fine." << endl;

	threadObj.detach();

	cout << " tcp thread was detached, running on its own now." << endl;
}


RTITcpThread::~RTITcpThread()
{
}
