EXEC = RTITEST
CXX = g++
CXXFLAGS = -Wall -std=c++11
# SOURCES = RTILibC20180313.cpp RTILib.cpp stdafx.cpp RTISim.cpp RTISimConnectThread.cpp
# OBJECTS = $(SOURCES:.cpp=.o)
# LIBS = -lws2_32


all: $(EXEC) 

# $(EXEC): $(OBJECTS)
# 	$(CXX) $(CXXFLAGS) -o $(EXEC) $(OBJECTS) $(LIBS)

$(EXEC):RTILibC20180313.o RTISimConnectThread.o RTILib.o Version.o RTITcpThread.o RTIReconnectThread.o
	$(CXX) $(CXXFLAGS) -pthread RTILibC20180313.o RTISimConnectThread.o RTILib.o Version.o RTITcpThread.o RTIReconnectThread.o -o $(EXEC)
RTIReconnectThread.o: RTIReconnectThread.cpp
	$(CXX) $(CXXFLAGS) -c RTIReconnectThread.cpp -o RTIReconnectThread.o
RTITcpThread.o: RTITcpThread.cpp
	$(CXX) $(CXXFLAGS) -c RTITcpThread.cpp -o RTITcpThread.o
Version.o: Version.cpp
	$(CXX) $(CXXFLAGS) -c Version.cpp -o Version.o
RTILibC20180313.o: RTILibC20180313.cpp
	$(CXX) $(CXXFLAGS) -c RTILibC20180313.cpp -o RTILibC20180313.o
RTISimConnectThread.o: RTISimConnectThread.cpp
	$(CXX) $(CXXFLAGS) -c RTISimConnectThread.cpp -o RTISimConnectThread.o
RTILib.o: RTILib.cpp
	$(CXX) $(CXXFLAGS) -c RTILib.cpp -o RTILib.o

.PHONY:all clean

clean:
	rm ./*.o
	rm $(EXEC)