/*
	RTISim.cpp
	- if you want a connected sim to receive callback function calls to immediately handle received messages,
		the simulation must extend from this class and implement these two functions.

*/



#include "stdafx.h"
#include "RTISim.h"
#include <string>

using namespace std;

#ifndef CPPADDED
#define CPPADDED
#endif

RTISim::RTISim()
{
}

RTISim::~RTISim()
{
}
