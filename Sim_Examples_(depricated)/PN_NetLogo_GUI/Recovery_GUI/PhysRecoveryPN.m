classdef PhysRecoveryPN < handle
    
    properties
        % input variables
        stage
        timestamp
        nodePN
        connectivityPN
        nodeDSPN
        linkDSPN
        nodeFcnPN
        linkFcnPN
        resourcePN
        % output variables
%         nodeDSPN_out
%         linkDSPN_out
        recoveryNodePN
        recoveryLinkPN
    end
    
    methods
        function obj = PhysRecoveryPN()
        end
        
        function Initialize(obj)
%             save initial_obj_PN.mat obj
            fprintf(['Publish Initial InterRecoveryPN: stage ',num2str(obj.stage),', step ',num2str(obj.timestamp),'\n'])
        end
        function Update(obj)
%             obj.nodeDSPN_out = obj.nodeDSPN;
%             obj.linkDSPN_out = obj.linkDSPN;
            [obj.nodeFcnPN,obj.linkFcnPN] = calFcnPN(obj.nodeDSPN,obj.linkDSPN);
            fprintf(['Update RecoveryPN: stage ',num2str(obj.stage),', step ',num2str(obj.timestamp),'\n'])
        end
        function Simulate(obj)
            if obj.timestamp <= 1
                save initial_obj_PN.mat
            end
            [obj.nodeDSPN,obj.linkDSPN,obj.recoveryNodePN,obj.recoveryLinkPN] ...
                = PhysicalRecoverySimPN(obj.timestamp,obj.nodePN,obj.nodeDSPN,obj.linkDSPN,...
                obj.recoveryNodePN,obj.recoveryLinkPN,obj.resourcePN);
%             obj.nodeDSPN = obj.nodeDSPN_out;
%             obj.linkDSPN = obj.linkDSPN_out;
            [obj.nodeFcnPN,obj.linkFcnPN] = calFcnPN(obj.nodeDSPN,obj.linkDSPN);
            fprintf(['Publish PhysRecoveryPN: stage ',num2str(obj.stage),', step ',num2str(obj.timestamp),'\n'])
        end
        [nodeDSPN,linkDSPN,recoveryNodePN,recoveryLinkPN] ...
            = PhysicalRecoverySimPN(newDamage,nodePN,nodeDSPN,linkDSPN,...
            recoveryNodePN,recoveryLinkPN,totalResourse)
    end
end