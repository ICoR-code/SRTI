EXEC = RTITEST
CXX = g++
CXXFLAGS = -Wall -std=c++11
SOURCES = RTILibC20180313.cpp RTILib.cpp stdafx.cpp RTISim.cpp RTISimConnectThread.cpp
OBJECTS = $(SOURCES:.cpp=.o)
LIBS = -lws2_32


all: $(EXEC)

$(EXEC): $(OBJECTS)
	$(CXX) $(CXXFLAGS) -o $(EXEC) $(OBJECTS) $(LIBS)

.cpp.o:
	$(CXX) $(CXXFLAGS) -c $<

.PHONY: all clean

clean:
	del *.o
	del $(EXEC).exe
