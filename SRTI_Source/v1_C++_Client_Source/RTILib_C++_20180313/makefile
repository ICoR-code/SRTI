EXEC = RTITEST
SHAREDLIB = SRTI_v1_00_01.dll
CXX = g++
CXXFLAGS = -Wall -std=c++11
SOURCES = RTILib.cpp stdafx.cpp RTISim.cpp RTISimConnectThread.cpp RTITcpThread.cpp RTIReconnectThread.cpp Version.cpp
OBJECTS = $(SOURCES:.cpp=.o)
LIBS = -lws2_32


all: $(EXEC)

$(EXEC): $(SHAREDLIB)
	$(CXX) $(CXXFLAGS) -c RTILibC20180313.cpp
	$(CXX) $(CXXFLAGS) -o $(EXEC) RTILibC20180313.o -L. $(SHAREDLIB) $(LIBS)
$(SHAREDLIB):$(OBJECTS)
	$(CXX) $(CXXFLAGS) -shared -o $(SHAREDLIB) $(OBJECTS) $(LIBS)
.cpp.o:
	$(CXX) $(CXXFLAGS) -c $<

.PHONY: all clean

clean:
	del *.o
	del *.dll
	del $(EXEC).exe

#RTILibC20180313.cpp 