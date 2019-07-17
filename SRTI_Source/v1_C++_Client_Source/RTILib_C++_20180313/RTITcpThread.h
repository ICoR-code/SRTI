#pragma once

#include "RTILib.h"

class RTITcpThread
{
public:
	RTITcpThread();
	RTITcpThread(RTILib* newRTILib);
	void start();
	~RTITcpThread();
};

