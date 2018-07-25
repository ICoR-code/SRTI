all: client server_One_Connection server_Multi_Connection

CXX = g++
CXXFLAGS = -Wall -std=c++11	
client: client.c
	$(CXX) $(CXXFLAGS) client.c -o client
server_One_Connection: server_One_Connection.c
	$(CXX) $(CXXFLAGS) server_One_Connection.c -o server_One_Connection
server_Multi_Connection: server_Multi_Connection.c
	$(CXX) $(CXXFLAGS) server_Multi_Connection.c -o server_Multi_Connection
clean:
	rm ./client 
	rm ./server_One_Connection
	rm ./server_Multi_Connection
