function [nodeDS,linkDS] = calSeismicDamagePN_2(node,connectivity,nodeDS,linkDS,ga,gv)
%%% nodeDS(number of nodes x 1): 0 - no damage; 1 - failed
numNode = size(node,1);
numLink = size(connectivity,1);
if isempty(nodeDS) || isempty(linkDS)
    nodeDS = zeros(numNode,1);
    linkDS = zeros(numLink,1);
else
%     load DDamgePN.mat nodeDS linkDS
end

load Capacity.mat capacity_node_PN_reduct
capacity_node_PN = capacity_node_PN_reduct;

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