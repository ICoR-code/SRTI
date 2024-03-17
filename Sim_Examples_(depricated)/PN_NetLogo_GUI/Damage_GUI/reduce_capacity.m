function reduce_capacity(nodeDS,linkDS)

load Capacity.mat capacity_node_PN
%% check if the component is under reconstruction and reduce capacity
capacityReduction = [0.9,0.8,0.6,0.5];
% capacityReduction = [1,1,1,1];
    nodeUnderReconstruct = find(nodeDS > 0);
%     linkUnderReconstruct = find(recoveryLinkPN(:,3)>0);
%     capacity_node_PN(nodeUnderReconstruct,:) = capacity_node_PN(nodeUnderReconstruct,:)*capacityReduction;
for i = 1:size(nodeUnderReconstruct,1)
    if nodeDS(nodeUnderReconstruct(i)) == 1
    capacity_node_PN(nodeUnderReconstruct(i),:) = capacity_node_PN(nodeUnderReconstruct(i),:)*capacityReduction(1);
    elseif nodeDS(nodeUnderReconstruct(i)) == 2
    capacity_node_PN(nodeUnderReconstruct(i),:) = capacity_node_PN(nodeUnderReconstruct(i),:)*capacityReduction(2);
    elseif nodeDS(nodeUnderReconstruct(i)) == 3
    capacity_node_PN(nodeUnderReconstruct(i),:) = capacity_node_PN(nodeUnderReconstruct(i),:)*capacityReduction(3);
    elseif nodeDS(nodeUnderReconstruct(i)) == 4
    capacity_node_PN(nodeUnderReconstruct(i),:) = capacity_node_PN(nodeUnderReconstruct(i),:)*capacityReduction(4);
    end
end
capacity_node_PN_reduct = capacity_node_PN;
save Capacity.mat capacity_node_PN_reduct -append
end