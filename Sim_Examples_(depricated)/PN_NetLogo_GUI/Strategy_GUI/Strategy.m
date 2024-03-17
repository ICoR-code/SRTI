classdef Strategy < handle
    
    properties
        % input variables
        stage
        timestamp
        CLPN
%         CLWN
%         CLGN
        % output variables
        resourcePN
%         resourceWN
%         resourceGN
    end
    
    methods
        function obj = Strategy()
        end
        
        function Initialize(obj)
        end
        
        function Simulate(obj) 
%             [obj.resourcePN,obj.resourceWN,obj.resourceGN] = allocateResource(obj.CLPN,obj.CLWN,obj.CLGN);
            [obj.resourcePN] = 15;
            fprintf(['Publish Strategy: stage ',num2str(obj.stage),', step ',num2str(obj.timestamp),'\n'])
%             if obj.timestamp == 1
%                 Initial_Performance = [obj.CLPN,obj.CLWN,obj.CLGN];
%                 save Strategy.mat Initial_Performance
%             end
        end
%         [resourcePN,resourceWN,resourceGN] = allocateResource(CLPN,CLWN,CLGN);
    end
end