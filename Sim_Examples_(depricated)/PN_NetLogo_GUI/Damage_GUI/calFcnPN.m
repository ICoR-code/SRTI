function [nodeFcnPN,linkFcnPN] = calFcnPN(nodeDSPN,linkDSPN)
%% Functionality check (direct damage)
nodeFcnPN = zeros(size(nodeDSPN,1),1);  % 0: functionality is good
linkFcnPN = zeros(size(linkDSPN,1),1);  % 1: no function
nodeFcnPN(nodeDSPN>2)=1;  %% 3 – extensive; 4 – complete; -->lose function
linkFcnPN(sum(linkDSPN,2)>0)=1;
end