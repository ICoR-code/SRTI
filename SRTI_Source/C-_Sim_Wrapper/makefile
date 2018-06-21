EXEC = simulation
CXX = g++
CXXFLAGS = -Wall -std=c++11
LIBSOURCES := RTILib.cpp stdafx.cpp RTISim.cpp RTISimConnectThread.cpp
# LIBDIR := ../C++_Client_Source/RTILIB_C++_20180313/
VPATH = ../C++_Client_Source/RTILib_C++_20180313/
LIB := $(addprefix $(VPATH), $(LIBSOURCES))
LIBOBJECTS = $(LIB:.cpp=.o)
# SOURCES := wrapper.cpp $(LIBSOURCES)
# OBJECTS := $(SOURCES:.cpp=.o)
OBJECTS = pressure_sim.o wrapper.o $(LIBOBJECTS)
LIBS := -lws2_32


all: $(EXEC)

.SECONDEXPANSION:

$(LIBOBJECTS) : $$(patsubst %.o, %.cpp, $$@)
	$(CXX) -c -o $@ $(CFLAGS) $<

$(EXEC): $(OBJECTS)
	$(CXX) $(CXXFLAGS) -o $(EXEC) $(OBJECTS) $(LIBS)

.cpp.o:
	$(CXX) $(CXXFLAGS) -c $<
#
# RTILib.o: RTILib.cpp
# 	$(CXX) $(CXXFLAGS) -c $<





.PHONY: all clean

clean:
	del *.o
	del $(EXEC).exe
