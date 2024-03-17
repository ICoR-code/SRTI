classdef Hazard < handle
    
    properties
        % input variables
        stage
        timestamp
        nodePN
%         nodeWN
%         nodeGN
        % output variables
        gaPN
        gvPN
%         gaWN
%         gvWN
%         gaGN
%         gvGN
    end
    
    methods
        function obj = Hazard()
        end
        
        function Initialize(obj)
        end
        
        function Simulate_0(obj) 
            if obj.timestamp == 1
                save received_nodePN.mat
            end
%             [obj.gaPN,obj.gvPN,obj.gaWN,obj.gvWN,obj.gaGN,obj.gvGN] = ...
%                 getGM_1(obj.nodePN,obj.nodeWN,obj.nodeGN,obj.timestamp);
            [obj.gaPN,obj.gvPN] = getGM_1_PN(obj.nodePN,obj.timestamp);
            fprintf(['Publish GM 1: step ',num2str(obj.timestamp),'\n'])
        end
%         function Simulate_2(obj) 
%             [obj.gaPN,obj.gvPN,obj.gaWN,obj.gvWN,obj.gaGN,obj.gvGN] = ...
%                 getGM_2(obj.nodePN,obj.nodeWN,obj.nodeGN,obj.timestamp);
%             fprintf(['Publish GM 2: step ',num2str(obj.timestamp),'\n'])
%         end
%         [gaPN,gvPN,gaWN,gvWN,gaGN,gvGN] = getGM_1 (nodePN,nodeWN,nodeGN,timestamp);
%         [gaPN,gvPN,gaWN,gvWN,gaGN,gvGN] = getGM_2 (nodePN,nodeWN,nodeGN,timestamp);
        [gaPN,gvPN] = getGM_1_PN (nodePN,timestamp);
    end
end