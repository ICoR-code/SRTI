#pragma once
#include "stdafx.h"
#include "RTISim.h"
#include <iostream>

class RTISimExample :
	public RTISim
{
public:
	RTISimExample();
	void receivedMessage(string messageName, string content, string timestamp, string fromSim);
	string getSimName();
	~RTISimExample();
};

