function [CLPN,SR_ppl,SR_hhd,SR_area] = PerformanceSimPN(nodePN,connectivityPN,nodeFcnPN,linkFcnPN)

% if step == 1
%     nodeDS_0 = zeros(size(nodePN,1),1);
%     linkDS_0 = zeros(size(connectivityPN,1),1);
%     [NG_0_PN] = calNumConnectedG(nodePN,connectivityPN,nodeDS_0,linkDS_0);
%     save allNetwork.mat NG_0_PN -append
% else
%     load allNetwork.mat NG_0_PN
% end
load allNetwork.mat NG_0_PN
[NG_PN] = calNumConnectedG(nodePN,connectivityPN,nodeFcnPN,linkFcnPN);
% calculate CL
CLPN = 1-mean(NG_PN./NG_0_PN);
% calculate service ratio
load trackData.mat trackData
[SR_ppl,SR_hhd,SR_area] = calServiceRatioPN(nodePN,NG_PN,trackData);
% [SRPN] = calServiceRatio(nodePN,connectivityPN,nodeDSPN,nodeFcnPN,linkFcnPN);
end

function [SR_ppl,SR_hhd,SR_area] = calServiceRatioPN(nodePN,NG_PN,trackData)
numG = length(find(nodePN(:,1)==1)) + length(find(nodePN(:,1)==2));
numD = length(find(nodePN(:,1)==3));
%% Load Tracts Data
% load trackData.mat trackData
totalPopulation = sum(trackData(:,2),1);
totalHousehold = sum(trackData(:,3),1);
totalArea = sum(trackData(:,4),1);
outSerPopulation = 0; % population that suffer power outage
outSerHousehold = 0; % Household that suffer power outage
outSerArea = 0; % Area that suffer power outage

nonFcnNode = find(NG_PN == 0)+numG;
for i = 1:size(nonFcnNode,1)
    nonFcnTrack = find(trackData(:,5)== nonFcnNode(i));
    outSerPopulation = outSerPopulation + sum(trackData(nonFcnTrack,2),1);
    outSerHousehold = outSerHousehold + sum(trackData(nonFcnTrack,3),1);
    outSerArea = outSerArea + sum(trackData(nonFcnTrack,4),1);
end
% Calculate Service Population Ratio
SR_ppl = 1 - outSerPopulation/totalPopulation;
% Calculate Service Households Ratio
SR_hhd = 1 - outSerHousehold/totalHousehold;
% Calculate Service Area Ratio
SR_area = 1 - outSerArea/totalArea;
end