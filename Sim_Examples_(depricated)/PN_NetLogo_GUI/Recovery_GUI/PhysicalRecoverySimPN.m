function [nodeDSPN,linkDSPN,recoveryNodePN,recoveryLinkPN] ...
    = PhysicalRecoverySimPN(newDamage,nodePN,nodeDSPN,linkDSPN,...
    recoveryNodePN,recoveryLinkPN, totalResourse)
%% if new damage occurs, re-estimate expected recovery time and required resourse and budget per day
if newDamage <= 1  % new damage occurs
    recoveryNodePN = zeros(size(nodePN,1),3);
    %recoveryNodePN = [required resourse(units/day),required budget(units/day),expected remaining recovery time(day)]
    for i = 1:size(nodePN,1)
        %% without uncertainty
%                 if nodeDSPN(i) == 1 % 1 – slight/minor
%                     if nodePN(i,1) == 1 % Gate Station
%                         recoveryNodePN(i,:) = [1,1,1];
%                     elseif nodePN(i,1) == 3 % 23kv Substation & 12kv Substation
%                         recoveryNodePN(i,:) = [1,1,1];
%                     elseif nodePN(i,1) == 4 % transshipment
%         
%                     end
%                 elseif nodeDSPN(i) == 2 % 2 – moderate
%                     if nodePN(i,1) == 1 % Gate Station
%                         recoveryNodePN(i,:) = [1,1,3];
%                     elseif nodePN(i,1) == 3 % 23kv Substation & 12kv Substation
%                         recoveryNodePN(i,:) = [1,1,3];
%                     elseif nodePN(i,1) == 4 % transshipment
%                         recoveryNodePN(i,:) = [1,1,1];
%                     end
%                 elseif nodeDSPN(i) == 3 % 3 – extensive
%                     if nodePN(i,1) == 1 % Gate Station
%                         recoveryNodePN(i,:) = [1,1,7];
%                     elseif nodePN(i,1) == 3 % 23kv Substation & 12kv Substation
%                         recoveryNodePN(i,:) = [1,1,7];
%                     elseif nodePN(i,1) == 4 % transshipment
%                         recoveryNodePN(i,:) = [1,1,round(normrnd(3,1.5))];
%                     end
%                 elseif nodeDSPN(i) == 4 % 4 – complete
%                     if nodePN(i,1) == 1 % Gate Station
%                         recoveryNodePN(i,:) = [1,1,30];
%                     elseif nodePN(i,1) == 3 % 23kv Substation & 12kv Substation
%                         recoveryNodePN(i,:) = [1,1,30];
%                     elseif nodePN(i,1) == 4 % transshipment
%                         recoveryNodePN(i,:) = [1,1,7];
%                     end
%                 end
        
        if nodeDSPN(i) == 1 % 1 – slight/minor
            if nodePN(i,1) == 1 % Gate Station
                recoveryNodePN(i,:) = [1,1,round(normrnd(1,0.5))];
            elseif nodePN(i,1) == 3 % 23kv Substation & 12kv Substation
                recoveryNodePN(i,:) = [1,1,round(normrnd(1,0.5))];
            elseif nodePN(i,1) == 4 % transshipment
                
            end
        elseif nodeDSPN(i) == 2 % 2 – moderate
            if nodePN(i,1) == 1 % Gate Station
                recoveryNodePN(i,:) = [1,1,round(normrnd(3,1.5))];
            elseif nodePN(i,1) == 3 % 23kv Substation & 12kv Substation
                recoveryNodePN(i,:) = [1,1,round(normrnd(3,1.5))];
            elseif nodePN(i,1) == 4 % transshipment
                recoveryNodePN(i,:) = [1,1,round(normrnd(1,0.5))];
            end
        elseif nodeDSPN(i) == 3 % 3 – extensive
            if nodePN(i,1) == 1 % Gate Station
                recoveryNodePN(i,:) = [1,1,round(normrnd(7,3.5))];
            elseif nodePN(i,1) == 3 % 23kv Substation & 12kv Substation
                recoveryNodePN(i,:) = [1,1,round(normrnd(7,3.5))];
            elseif nodePN(i,1) == 4 % transshipment
                recoveryNodePN(i,:) = [1,1,round(normrnd(3,1.5))];
            end
        elseif nodeDSPN(i) == 4 % 4 – complete
            if nodePN(i,1) == 1 % Gate Station
                recoveryNodePN(i,:) = [1,1,round(normrnd(30,15))];
            elseif nodePN(i,1) == 3 % 23kv Substation & 12kv Substation
                recoveryNodePN(i,:) = [1,1,round(normrnd(30,15))];
            elseif nodePN(i,1) == 4 % transshipment
                recoveryNodePN(i,:) = [1,1,round(normrnd(7,3.5))];
            end
        end
    end
% save PhysRecoveryPN.mat nodeDSPN linkDSPN recoveryNodePN recoveryLinkPN
else % no new damage, the reconstruction process advances one day
    %     totalNeededResourse = sum(recoveryNodePN(find(recoveryNodePN(:,3)~=0),1));
    %     totalNeededBudget = sum(recoveryNodePN(find(recoveryNodePN(:,3)~=0),2));
%     load PhysRecoveryPN.mat nodeDSPN linkDSPN recoveryNodePN recoveryLinkPN
    nodeNeedReconstruct = find(recoveryNodePN(:,3)>0);
    if ~isempty(nodeNeedReconstruct)
        j = 1;
        while (totalResourse >0 && j <= size(nodeNeedReconstruct,1))
            recoveryNodePN(nodeNeedReconstruct(j),3) = recoveryNodePN(nodeNeedReconstruct(j),3)-1;
            totalResourse = totalResourse - recoveryNodePN(nodeNeedReconstruct(j),1);
            %totalBudget = totalBudget - recoveryNodePN(nodeNeedReconstruct(j),2);
            %         if recoveryNodePN(nodeNeedReconstruct(j),3) <= 0
            %             nodeDSPN(nodeNeedReconstruct(j)) = 0;
            %         end
            j = j + 1;
        end
        nodeDSPN(recoveryNodePN(:,3)<=0) = 0;
    end
end
% save PhysRecoveryPN.mat nodeDSPN linkDSPN recoveryNodePN recoveryLinkPN
end

