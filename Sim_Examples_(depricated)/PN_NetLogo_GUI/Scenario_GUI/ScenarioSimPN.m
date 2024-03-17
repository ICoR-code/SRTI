function [nodePN,connectivityPN] = ScenarioSimPN(stage)
% < Purpose >
% provides the information that type of nodes, local coordinates(x,y) of nodes 
% and how they were connected
% < output variables >
% for "XX" network that has "numNode" nodes and "numlink" links
% 1. nodeXX[double(numNode x 3)]: [node types, x-coord, y-coord](unit: km)
% for the network doesn't consider segment effect
% 2a. connectivityXX[double(link x 2)]: [starting node, end node]
% for the network consider segment effect
% 2b. connectivityXX[double(link x 4)]: [starting node, end node, length(km), num of segments]
load allNetwork.mat nodePN connectivityPN nodeWN connectivityWN nodeGN connectivityGN
end