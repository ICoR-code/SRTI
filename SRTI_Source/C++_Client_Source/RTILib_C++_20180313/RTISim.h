#include <string>
#include "stdafx.h"

using namespace std;

#pragma once
class RTISim
{
public:
	RTISim();
	virtual void receivedMessage(string messageName, string content, string timestamp, string fromSim) = 0;
	virtual string getSimName() = 0;
	~RTISim();
};

