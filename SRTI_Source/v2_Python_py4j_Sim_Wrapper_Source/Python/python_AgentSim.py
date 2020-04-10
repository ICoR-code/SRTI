#import random;

class AgentSim:
        def InitializeAgent(self):
            return 0;

        name = "Example Agent 1";
        north = 0;
        east = 0;
        south = 0;
        west = 0;
        latestX = 0;
        latestY = 0;

        def UpdateAgentMove(self):
            randomChoice = 1;#randint(1,5);

            if (randomChoice == 1 and self.north >= 0):
                self.latestY = self.latestY - 1;
            elif (randomChoice == 2 and self.east >= 0):
                self.latestX = self.latestX + 1;
            elif (randomChoice == 3 and self.south >= 0):
                self.latestY = self.latestY + 1;
            elif (randomChoice == 4 and self.west >= 0):
                self.latestX = self.latestX - 1;
            elif (self.north >= 0):
                self.latestY = self.latestY - 1;
            elif (self.east >= 0):
                self.latestX = self.latestX + 1;
            elif (self.south >= 0):
                self.latestY = self.latestY + 1;
            elif (self.west >= 0):
                self.latestX = self.latestX - 1;
            
            return 0;
