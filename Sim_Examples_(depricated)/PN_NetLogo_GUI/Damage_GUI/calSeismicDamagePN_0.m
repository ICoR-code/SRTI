function [nodeDS,linkDS] = calSeismicDamagePN_0(node,connectivity,nodeDS,linkDS,ga,gv)
%%% nodeDS(number of nodes x 1): 0 - no damage; 1 - failed
numNode = size(node,1);
numLink = size(connectivity,1);
if isempty(nodeDS) || isempty(linkDS)
    nodeDS = zeros(numNode,1);
    linkDS = zeros(numLink,1);
else
%     load DDamgePN.mat nodeDS linkDS
end
%% determine the capacity of each components at beginning
% if exist('Capacity.mat','file') == 2
%     load Capacity.mat
%     if exist('capacity_node_PN','var')
%         loadCapacityGood = true;
%     else
%         loadCapacityGood = false;
%     end
% else
%     loadCapacityGood = false;
%     save Capacity.mat loadCapacityGood
% end
% 
% if ~loadCapacityGood
%     % parameters for fragility curve
%     medianSupply = [0.11,0.15,0.2,0.47]; %PGA(g)
%     betaSupply = [0.5,0.45,0.35,0.40];%[0,0,0,0];%
%     medianConsump = [0.15,0.29,0.45,0.9]; %PGA(g)
%     betaConsump = [0.7,0.55,0.45,0.45];%[0,0,0,0];%
%     capacity_node_PN = zeros(numNode,size(medianSupply,2));
%     
%     for i = 1:numNode
%         if node(i,1) == 1 % Supply: Gate Station
%             capacity_node_PN(i,:) = lognrnd(log(medianSupply),betaSupply);
%         elseif node(i,1) == 3 % Consumption: 12kv & 23kv Substation
%             capacity_node_PN(i,:) = lognrnd(log(medianConsump),betaConsump);
%         end
%     end
%     save Capacity.mat capacity_node_PN -append
% end
load Capacity.mat capacity_node_PN


%% Simulate Direct Damage (DD) based on IM
% [row,col] = find(capacity_node_PN~=0 && capacity_node_PN < ga);
% nodeDS(row,col) = 1;
for i = 1:numNode
    if capacity_node_PN(i,1)~=0
        tempDS = 0;
        if capacity_node_PN(i,1) <= ga(i) && ga(i) < capacity_node_PN(i,2)
            tempDS = 1;
        elseif capacity_node_PN(i,2) <= ga(i) && ga(i) < capacity_node_PN(i,3)
            tempDS = 2;
        elseif capacity_node_PN(i,3) <= ga(i) && ga(i) < capacity_node_PN(i,4)
            tempDS = 3;
        elseif capacity_node_PN(i,4) <= ga(i)
            tempDS = 4;
        end
        if tempDS > nodeDS(i)
            nodeDS(i) = tempDS;
        end
    end
    
end

% save DDamgePN.mat nodeDS linkDS
end