classdef PerformancePN < handle
    
    properties
        % input variables
        stage
        timestamp
        nodePN
        connectivityPN
        nodeDSPN % also being output variable
        linkDSPN % also being output variable
        nodeFcnPN
        linkFcnPN
        % output variables
        CLPN
        SRPN_ppl
        SRPN_hhd
        SRPN_area
        
    end
    
    methods
        function obj = PerformancePN()
        end
        
        function Initialize(obj)
        end
        
        function Simulate_0(obj)
            if obj.timestamp <= 1
                PerformancePN_stage_0 = zeros(100,4);
                save PerformancePN.mat PerformancePN_stage_0 
            else
                load PerformancePN.mat PerformancePN_stage_0 
            end
            
            [obj.CLPN,obj.SRPN_ppl,obj.SRPN_hhd,obj.SRPN_area] = PerformanceSimPN...
                (obj.nodePN,obj.connectivityPN,obj.nodeFcnPN,obj.linkFcnPN);
            fprintf(['Publish PerformancePN: stage ',num2str(obj.stage),',  step ',num2str(obj.timestamp),'\n'])
            
            % save performance history
            PerformancePN_stage_0(obj.timestamp,:) = [obj.CLPN,obj.SRPN_ppl,obj.SRPN_hhd,obj.SRPN_area];
            save PerformancePN.mat PerformancePN_stage_0 -append

        end
        
        function Simulate_1(obj)
            if obj.timestamp <= 1
                PerformancePN_stage_1 = zeros(120,4);
                save PerformancePN.mat PerformancePN_stage_1 -append
            else
                load PerformancePN.mat PerformancePN_stage_1
            end

            [obj.CLPN,obj.SRPN_ppl,obj.SRPN_hhd,obj.SRPN_area] = PerformanceSimPN...
                (obj.nodePN,obj.connectivityPN,obj.nodeFcnPN,obj.linkFcnPN);
            fprintf(['Publish PerformancePN: stage ',num2str(obj.stage),',  step ',num2str(obj.timestamp),'\n'])
            
            % save performance history
            PerformancePN_stage_1(obj.timestamp,:) = [obj.CLPN,obj.SRPN_ppl,obj.SRPN_hhd,obj.SRPN_area];
            save PerformancePN.mat PerformancePN_stage_1 -append
        end       
        
%         function Simulate_2(obj)
%             if obj.timestamp <= 1
%                 PerformancePN_stage_2 = zeros(100,4);
%                 save PerformancePN.mat PerformancePN_stage_2 -append
%             else
%                 load PerformancePN.mat PerformancePN_stage_2 
%             end
%             
%             [obj.CLPN,obj.SRPN_ppl,obj.SRPN_hhd,obj.SRPN_area] = PerformanceSimPN...
%                 (obj.nodePN,obj.connectivityPN,obj.nodeFcnPN,obj.linkFcnPN);
%             fprintf(['Publish PerformancePN: stage ',num2str(obj.stage),',  step ',num2str(obj.timestamp),'\n'])
%             
%             % save performance history
%             PerformancePN_stage_2(obj.timestamp,:) = [obj.CLPN,obj.SRPN_ppl,obj.SRPN_hhd,obj.SRPN_area];
%             save PerformancePN.mat PerformancePN_stage_2 -append
% 
%         end
%         
%         function Simulate_3(obj)
%             if obj.timestamp <= 1
%                 PerformancePN_stage_3 = zeros(120,4);
%                 save PerformancePN.mat PerformancePN_stage_3 -append
%             else
%                 load PerformancePN.mat PerformancePN_stage_3
%             end
% 
%             [obj.CLPN,obj.SRPN_ppl,obj.SRPN_hhd,obj.SRPN_area] = PerformanceSimPN...
%                 (obj.nodePN,obj.connectivityPN,obj.nodeFcnPN,obj.linkFcnPN);
%             fprintf(['Publish PerformancePN: stage ',num2str(obj.stage),',  step ',num2str(obj.timestamp),'\n'])
%             
%             % save performance history
%             PerformancePN_stage_3(obj.timestamp,:) = [obj.CLPN,obj.SRPN_ppl,obj.SRPN_hhd,obj.SRPN_area];
%             save PerformancePN.mat PerformancePN_stage_3 -append
%         end   
        
        [CLPN,SR_ppl,SR_hhd,SR_area] = PerformanceSimPN...
            (nodePN,connectivityPN,nodeFcnPN,linkFcnPN)
    end
end