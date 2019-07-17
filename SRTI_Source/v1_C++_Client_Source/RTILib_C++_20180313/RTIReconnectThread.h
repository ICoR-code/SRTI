#pragma once
#include "RTILib.h"

class RTIReconnectThread
{
public:
	RTIReconnectThread();
	RTIReconnectThread(RTILib* rtiLib, long timeLimit);
	void start();
	~RTIReconnectThread();
};
